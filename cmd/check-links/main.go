package main

import (
	"encoding/json"
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// linkLocation records where a URL was found.
type linkLocation struct {
	File     string
	Line     int
	LinkText string // markdown link text, empty for bare URLs
}

// checkResult holds the outcome of checking one URL.
type checkResult struct {
	Status  string `json:"status"`  // "OK", "WARN", "FAIL"
	File    string `json:"file"`    // source file path
	Line    int    `json:"line"`    // line number
	URL     string `json:"url"`     // the checked URL
	Message string `json:"message"` // human-readable detail
}

// arXiv API response types
type arxivFeed struct {
	Entries []arxivEntry `xml:"entry"`
}

type arxivEntry struct {
	Title string `xml:"title"`
}

// CrossRef API response types
type crossrefResponse struct {
	Message struct {
		Title []string `json:"title"`
	} `json:"message"`
}

var (
	// Matches [text](url) with support for one level of balanced parens in URL
	mdLinkRe = regexp.MustCompile(`\[([^\]]*)\]\(((?:[^()]*|\([^()]*\))*)\)`)
	// Matches bare https:// URLs
	bareURLRe = regexp.MustCompile(`https?://[^\s<>\[\]"` + "`" + `]+`)
	// arXiv abstract URL pattern
	arxivIDRe = regexp.MustCompile(`arxiv\.org/abs/(\d{4}\.\d{4,5}(?:v\d+)?)`)
	// DOI URL pattern
	doiRe = regexp.MustCompile(`doi\.org/(10\..+)`)
)

func main() {
	filesFlag := flag.String("files", "", "comma-separated file paths to check (PR mode)")
	outputFlag := flag.String("output", "", "write JSON results to this file")
	flag.Parse()

	files, err := collectFiles(*filesFlag)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error collecting files: %v\n", err)
		os.Exit(1)
	}

	if len(files) == 0 {
		fmt.Println("no files to check")
		os.Exit(0)
	}

	// Extract all URLs with their locations
	urlLocs := make(map[string][]linkLocation)
	for _, f := range files {
		locs, err := extractURLs(f)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error reading %s: %v\n", f, err)
			continue
		}
		for url, ll := range locs {
			urlLocs[url] = append(urlLocs[url], ll...)
		}
	}

	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	var results []checkResult
	hasFail := false

	for url, locs := range urlLocs {
		res := checkURL(client, url, locs)
		results = append(results, res...)
		for _, r := range res {
			if r.Status == "FAIL" {
				hasFail = true
			}
		}
	}

	// Print human-readable output
	for _, r := range results {
		fmt.Printf("%-5s %s:%d  %s  — %s\n", r.Status, r.File, r.Line, r.URL, r.Message)
	}

	// Write JSON output if requested
	if *outputFlag != "" {
		data, err := json.MarshalIndent(results, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "error marshaling JSON: %v\n", err)
			os.Exit(1)
		}
		if err := os.WriteFile(*outputFlag, data, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "error writing output file: %v\n", err)
			os.Exit(1)
		}
	}

	if hasFail {
		os.Exit(1)
	}
}

// collectFiles returns the list of markdown files to check.
func collectFiles(filesFlag string) ([]string, error) {
	if filesFlag != "" {
		parts := strings.Split(filesFlag, ",")
		var files []string
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				files = append(files, p)
			}
		}
		return files, nil
	}

	// Scan all content/blog/*.md, excluding translations
	entries, err := os.ReadDir("content/blog")
	if err != nil {
		return nil, fmt.Errorf("failed to read content/blog: %w", err)
	}

	var files []string
	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		if strings.HasSuffix(name, ".de.md") || strings.HasSuffix(name, ".es.md") {
			continue
		}
		if name == "_index.md" || strings.HasPrefix(name, "_index.") {
			continue
		}
		files = append(files, filepath.Join("content/blog", name))
	}
	return files, nil
}

// extractURLs reads a markdown file and returns a map of URL -> locations.
func extractURLs(filePath string) (map[string][]linkLocation, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]linkLocation)
	lines := strings.Split(string(data), "\n")

	for i, line := range lines {
		lineNum := i + 1

		// Extract markdown links: [text](url)
		for _, match := range mdLinkRe.FindAllStringSubmatch(line, -1) {
			linkText := match[1]
			url := strings.TrimSpace(match[2])
			url = cleanURL(url)
			if shouldSkipURL(url) {
				continue
			}
			result[url] = append(result[url], linkLocation{
				File:     filePath,
				Line:     lineNum,
				LinkText: linkText,
			})
		}

		// Extract bare URLs not already inside markdown links
		// Remove markdown link constructs first to avoid double-counting
		stripped := mdLinkRe.ReplaceAllString(line, "")
		for _, match := range bareURLRe.FindAllString(stripped, -1) {
			url := cleanBareURL(match)
			if shouldSkipURL(url) {
				continue
			}
			result[url] = append(result[url], linkLocation{
				File:     filePath,
				Line:     lineNum,
				LinkText: "",
			})
		}
	}

	return result, nil
}

// cleanURL trims whitespace from a URL extracted from a markdown link.
func cleanURL(url string) string {
	return strings.TrimSpace(url)
}

// cleanBareURL strips trailing punctuation that is likely a markdown artifact.
func cleanBareURL(url string) string {
	// Strip trailing characters that are unlikely to be part of a URL
	for len(url) > 0 {
		last := url[len(url)-1]
		if last == ')' || last == ']' || last == ',' || last == '.' || last == ';' || last == ':' || last == '!' || last == '?' {
			url = url[:len(url)-1]
		} else {
			break
		}
	}
	return url
}

// shouldSkipURL returns true for URLs that should not be checked.
func shouldSkipURL(url string) bool {
	if url == "" {
		return true
	}
	// Fragment-only links
	if strings.HasPrefix(url, "#") {
		return true
	}
	// Relative URLs (no scheme)
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		return true
	}
	// Non-routable or example hosts that will never resolve in CI
	lower := strings.ToLower(url)
	for _, pattern := range []string{
		"://localhost",
		"://127.0.0.1",
		"://[::1]",
		"://169.254.",      // link-local (AWS metadata endpoint examples)
		"://example.com",
		"://example.org",
		"://example.net",
		".example.com",
	} {
		if strings.Contains(lower, pattern) {
			return true
		}
	}
	// Private repositories that are correct but not publicly accessible
	for _, prefix := range []string{
		"https://github.com/5queezer/hrafn/",
		"https://github.com/5queezer/gemma-sae/",
	} {
		if strings.HasPrefix(url, prefix) {
			return true
		}
	}
	return false
}

// checkURL performs HTTP and metadata checks for a URL, returning results for each location.
func checkURL(client *http.Client, url string, locs []linkLocation) []checkResult {
	// HTTP check with a real User-Agent (Wikipedia and others block bare Go clients)
	req, reqErr := http.NewRequest("GET", url, nil)
	var statusCode int
	var statusText string
	if reqErr != nil {
		statusCode = 0
		statusText = reqErr.Error()
	} else {
		req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; vasudev-link-checker/1.0; +https://vasudev.xyz)")
		resp, err := client.Do(req)
		if err != nil {
			statusCode = 0
			statusText = err.Error()
		} else {
			statusCode = resp.StatusCode
			statusText = resp.Status
			resp.Body.Close()
		}
	}

	httpOK := statusCode >= 200 && statusCode < 300

	var results []checkResult

	for _, loc := range locs {
		r := checkResult{
			File: loc.File,
			Line: loc.Line,
			URL:  url,
		}

		// 403 means the URL exists but the server blocks automated checks
		if statusCode == 403 {
			r.Status = "WARN"
			r.Message = "403 Forbidden (site blocks automated checks)"
			results = append(results, r)
			continue
		}

		if !httpOK {
			r.Status = "FAIL"
			if statusCode == 0 {
				r.Message = fmt.Sprintf("connection error: %s", statusText)
			} else {
				r.Message = statusText
			}
			results = append(results, r)
			continue
		}

		// HTTP is OK, check metadata for arXiv/DOI if link text is available
		r.Status = "OK"
		r.Message = statusText

		if loc.LinkText != "" {
			if warn := checkArxivTitle(client, url, loc.LinkText); warn != "" {
				r.Status = "WARN"
				r.Message = warn
			} else if warn := checkDOITitle(client, url, loc.LinkText); warn != "" {
				r.Status = "WARN"
				r.Message = warn
			}
		}

		results = append(results, r)
	}

	return results
}

// checkArxivTitle checks if the URL is an arXiv link and verifies the title.
// Returns a warning message or empty string.
func checkArxivTitle(client *http.Client, url, linkText string) string {
	id := extractArxivID(url)
	if id == "" {
		return ""
	}

	// Rate limit: 1s delay before arXiv API calls
	time.Sleep(1 * time.Second)

	apiURL := fmt.Sprintf("https://export.arxiv.org/api/query?id_list=%s", id)
	resp, err := client.Get(apiURL)
	if err != nil {
		return fmt.Sprintf("arXiv API error: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Sprintf("arXiv API read error: %v", err)
	}

	var feed arxivFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return fmt.Sprintf("arXiv XML parse error: %v", err)
	}

	if len(feed.Entries) == 0 {
		return "arXiv paper not found"
	}

	arxivTitle := normalizeWhitespace(feed.Entries[0].Title)
	if !fuzzyMatch(linkText, arxivTitle) {
		return fmt.Sprintf("title mismatch: expected %q, got %q", arxivTitle, linkText)
	}

	return ""
}

// checkDOITitle checks if the URL is a DOI link and verifies the title.
// Returns a warning message or empty string.
func checkDOITitle(client *http.Client, url, linkText string) string {
	doi := extractDOI(url)
	if doi == "" {
		return ""
	}

	apiURL := fmt.Sprintf("https://api.crossref.org/works/%s", doi)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return fmt.Sprintf("DOI API request error: %v", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Sprintf("DOI API error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Sprintf("DOI API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Sprintf("DOI API read error: %v", err)
	}

	var cr crossrefResponse
	if err := json.Unmarshal(body, &cr); err != nil {
		return fmt.Sprintf("DOI JSON parse error: %v", err)
	}

	if len(cr.Message.Title) == 0 {
		return "DOI title not found"
	}

	doiTitle := cr.Message.Title[0]
	if !fuzzyMatch(linkText, doiTitle) {
		return fmt.Sprintf("title mismatch: expected %q, got %q", doiTitle, linkText)
	}

	return ""
}

// extractArxivID extracts an arXiv paper ID from a URL, or returns empty string.
func extractArxivID(url string) string {
	m := arxivIDRe.FindStringSubmatch(url)
	if len(m) < 2 {
		return ""
	}
	return m[1]
}

// extractDOI extracts a DOI from a doi.org URL, or returns empty string.
func extractDOI(url string) string {
	m := doiRe.FindStringSubmatch(url)
	if len(m) < 2 {
		return ""
	}
	return m[1]
}

// fuzzyMatch performs case-insensitive substring matching.
// Returns true if either string contains the other, or if they are equal ignoring case.
func fuzzyMatch(a, b string) bool {
	al := strings.ToLower(normalizeWhitespace(a))
	bl := strings.ToLower(normalizeWhitespace(b))
	if al == bl {
		return true
	}
	return strings.Contains(al, bl) || strings.Contains(bl, al)
}

// normalizeWhitespace collapses runs of whitespace into single spaces and trims.
func normalizeWhitespace(s string) string {
	fields := strings.Fields(s)
	return strings.Join(fields, " ")
}

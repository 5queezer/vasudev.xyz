package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

// graphData mirrors the top-level structure of graph.json.
type graphData struct {
	Directed   bool              `json:"directed"`
	Multigraph bool              `json:"multigraph"`
	Graph      json.RawMessage   `json:"graph"`
	Nodes      []json.RawMessage `json:"nodes"`
	Links      json.RawMessage   `json:"links"`
}

// nodePatch holds the fields we read/write per node.
type nodePatch struct {
	Community     *int   `json:"community"`
	CommunityName string `json:"community_name,omitempty"`
}

var communityRe = regexp.MustCompile(`^### Community (\d+) - "(.+)"`)
var headingRe = regexp.MustCompile(`^#{1,6}\s+(.+)$`)

// heading stores a parsed markdown heading with its position and Hugo anchor.
type heading struct {
	line   int
	anchor string
}

// hugoAnchor converts heading text to the anchor ID Hugo/Goldmark generates.
func hugoAnchor(text string) string {
	var b strings.Builder
	prev := '-'
	for _, r := range strings.ToLower(text) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			prev = r
		} else if prev != '-' {
			b.WriteByte('-')
			prev = '-'
		}
	}
	return strings.Trim(b.String(), "-")
}

// parseHeadings extracts all headings from a markdown file along with their
// line numbers and Hugo-compatible anchors.
func parseHeadings(mdPath string) ([]heading, []string, error) {
	data, err := os.ReadFile(mdPath)
	if err != nil {
		return nil, nil, err
	}
	lines := strings.Split(string(data), "\n")
	var headings []heading
	inFrontMatter := false
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if i == 0 && trimmed == "---" {
			inFrontMatter = true
			continue
		}
		if inFrontMatter {
			if trimmed == "---" {
				inFrontMatter = false
			}
			continue
		}
		m := headingRe.FindStringSubmatch(trimmed)
		if m != nil {
			headings = append(headings, heading{
				line:   i,
				anchor: hugoAnchor(m[1]),
			})
		}
	}
	return headings, lines, nil
}

// findAnchorForConcept finds the heading anchor that best covers where a
// concept label first appears in the markdown body (after front matter).
func findAnchorForConcept(label string, headings []heading, lines []string) string {
	if len(headings) == 0 {
		return ""
	}
	needle := strings.ToLower(label)
	// Strip parenthetical suffixes for matching, e.g.
	// "Dream Engine (LLM Memory Consolidation)" -> "dream engine"
	if idx := strings.Index(needle, " ("); idx > 0 {
		needle = needle[:idx]
	}

	// Skip past front matter.
	startLine := 0
	if len(lines) > 0 && strings.TrimSpace(lines[0]) == "---" {
		for j := 1; j < len(lines); j++ {
			if strings.TrimSpace(lines[j]) == "---" {
				startLine = j + 1
				break
			}
		}
	}

	for i := startLine; i < len(lines); i++ {
		if strings.Contains(strings.ToLower(lines[i]), needle) {
			// Find the heading that precedes this line.
			best := ""
			for _, h := range headings {
				if h.line <= i {
					best = h.anchor
				} else {
					break
				}
			}
			if best != "" {
				return best
			}
		}
	}
	return ""
}

func parseCommunityNames(reportPath string) (map[int]string, error) {
	f, err := os.Open(reportPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	names := make(map[int]string)
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		m := communityRe.FindStringSubmatch(scanner.Text())
		if m == nil {
			continue
		}
		id, _ := strconv.Atoi(m[1])
		names[id] = m[2]
	}
	return names, scanner.Err()
}

func run(graphifyDir, output string) error {
	graphPath := filepath.Join(graphifyDir, "graph.json")
	reportPath := filepath.Join(graphifyDir, "GRAPH_REPORT.md")

	names, err := parseCommunityNames(reportPath)
	if err != nil {
		return fmt.Errorf("reading report: %w", err)
	}

	raw, err := os.ReadFile(graphPath)
	if err != nil {
		return fmt.Errorf("reading graph: %w", err)
	}

	var data graphData
	if err := json.Unmarshal(raw, &data); err != nil {
		return fmt.Errorf("parsing graph: %w", err)
	}

	patched := 0
	for i, nodeRaw := range data.Nodes {
		var p nodePatch
		if err := json.Unmarshal(nodeRaw, &p); err != nil {
			continue
		}
		if p.Community == nil {
			continue
		}
		name, ok := names[*p.Community]
		if !ok {
			continue
		}

		// Merge community_name into the existing node object.
		var obj map[string]any
		if err := json.Unmarshal(nodeRaw, &obj); err != nil {
			continue
		}
		obj["community_name"] = name
		updated, err := json.Marshal(obj)
		if err != nil {
			continue
		}
		data.Nodes[i] = updated
		patched++
	}

	// Enrich concept nodes with source_anchor by scanning blog markdown files.
	type mdCache struct {
		headings []heading
		lines    []string
	}
	mdFiles := make(map[string]*mdCache)
	anchored := 0

	for i, nodeRaw := range data.Nodes {
		var obj map[string]any
		if err := json.Unmarshal(nodeRaw, &obj); err != nil {
			continue
		}
		ft, _ := obj["file_type"].(string)
		if ft != "concept" {
			continue
		}
		// Skip concepts that already link externally.
		if _, hasURL := obj["source_url"]; hasURL {
			continue
		}
		sf, _ := obj["source_file"].(string)
		if !strings.HasPrefix(sf, "content/blog/") {
			continue
		}
		label, _ := obj["label"].(string)
		if label == "" {
			continue
		}

		md, ok := mdFiles[sf]
		if !ok {
			h, l, err := parseHeadings(sf)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Warning: could not parse %s: %v\n", sf, err)
				md = &mdCache{}
			} else {
				md = &mdCache{headings: h, lines: l}
			}
			mdFiles[sf] = md
		}

		// Try matching by label first, then by ID fragment as fallback.
		anchor := findAnchorForConcept(label, md.headings, md.lines)
		if anchor == "" {
			nid, _ := obj["id"].(string)
			if parts := strings.SplitN(nid, "__", 2); len(parts) == 2 {
				idLabel := strings.ReplaceAll(parts[1], "_", " ")
				anchor = findAnchorForConcept(idLabel, md.headings, md.lines)
			}
		}
		if anchor == "" {
			continue
		}
		obj["source_anchor"] = anchor
		updated, err := json.Marshal(obj)
		if err != nil {
			continue
		}
		data.Nodes[i] = updated
		anchored++
	}

	out, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling output: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(output), 0o755); err != nil {
		return fmt.Errorf("creating output dir: %w", err)
	}
	if err := os.WriteFile(output, append(out, '\n'), 0o644); err != nil {
		return fmt.Errorf("writing output: %w", err)
	}

	fmt.Printf("Synced %d nodes (%d patched with community names from %d communities, %d enriched with anchors) -> %s\n",
		len(data.Nodes), patched, len(names), anchored, output)
	return nil
}

func main() {
	graphifyDir := flag.String("graphify-dir", "graphify-out", "directory containing graphify output")
	output := flag.String("output", "static/data/graph.json", "output path for enriched graph.json")
	flag.Parse()

	if err := run(*graphifyDir, *output); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

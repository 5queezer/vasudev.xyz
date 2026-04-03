package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	openRouterURL = "https://openrouter.ai/api/v1/chat/completions"
	model         = "openrouter/free"
)

type chatRequest struct {
	Model    string        `json:"model"`
	Messages []chatMessage `json:"messages"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func main() {
	contentDir := flag.String("content-dir", "content/blog", "path to blog content directory")
	languages := flag.String("languages", "de,es", "comma-separated target languages")
	flag.Parse()

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "OPENROUTER_API_KEY environment variable is required")
		os.Exit(1)
	}

	langs := strings.Split(*languages, ",")

	entries, err := os.ReadDir(*contentDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read content dir: %v\n", err)
		os.Exit(1)
	}

entries:
	for _, entry := range entries {
		name := entry.Name()
		if !strings.HasSuffix(name, ".md") {
			continue
		}
		if name == "_index.md" || strings.HasPrefix(name, "_index.") {
			continue
		}
		// Skip translated files
		for _, lang := range langs {
			if strings.HasSuffix(name, "."+lang+".md") {
				continue entries
			}
		}

		srcPath := filepath.Join(*contentDir, name)
		slug := strings.TrimSuffix(name, ".md")

		srcData, err := os.ReadFile(srcPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to read %s: %v\n", srcPath, err)
			continue
		}

		hash := contentHash(srcData)

		for _, lang := range langs {
			targetName := slug + "." + lang + ".md"
			targetPath := filepath.Join(*contentDir, targetName)

			if existingData, err := os.ReadFile(targetPath); err == nil {
				if extractFrontMatterField(existingData, "translationHash") == hash {
					fmt.Printf("skip %s (up to date)\n", targetName)
					continue
				}
			}

			fmt.Printf("translating %s -> %s\n", name, targetName)

			frontMatter, body := splitFrontMatterAndBody(srcData)
			translatedTitle := translateText(apiKey, extractFrontMatterField(srcData, "title"), lang, true)
			translatedDesc := translateText(apiKey, extractFrontMatterField(srcData, "description"), lang, true)
			translatedBody := translateText(apiKey, body, lang, false)

			if translatedTitle == "" || translatedDesc == "" {
				fmt.Fprintf(os.Stderr, "title/description translation failed for %s -> %s, skipping\n", name, lang)
				continue
			}
			if translatedBody == "" {
				fmt.Fprintf(os.Stderr, "body translation failed for %s -> %s, skipping\n", name, lang)
				continue
			}

			output := buildTranslatedFile(frontMatter, translatedTitle, translatedDesc, hash, translatedBody)
			if err := os.WriteFile(targetPath, []byte(output), 0644); err != nil {
				fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", targetPath, err)
				continue
			}
			fmt.Printf("wrote %s\n", targetName)
		}
	}
}

func contentHash(data []byte) string {
	h := sha256.Sum256(data)
	return fmt.Sprintf("%x", h[:16]) // 32 hex chars, enough to detect changes
}

func splitFrontMatterAndBody(data []byte) (frontMatter string, body string) {
	content := string(data)
	if !strings.HasPrefix(content, "---\n") {
		return "", content
	}
	end := strings.Index(content[4:], "\n---\n")
	if end == -1 {
		return "", content
	}
	return content[:end+8], content[end+8:]
}

func extractFrontMatterField(data []byte, field string) string {
	content := string(data)
	if !strings.HasPrefix(content, "---\n") {
		return ""
	}
	end := strings.Index(content[4:], "\n---\n")
	if end == -1 {
		return ""
	}
	fm := content[4 : 4+end]
	for _, line := range strings.Split(fm, "\n") {
		if strings.HasPrefix(line, field+":") {
			val := strings.TrimPrefix(line, field+":")
			val = strings.TrimSpace(val)
			val = strings.Trim(val, "\"")
			return val
		}
	}
	return ""
}

func buildTranslatedFile(originalFM, title, description, hash, body string) string {
	var b strings.Builder

	// Rewrite front matter with translated title/description and hash
	lines := strings.Split(originalFM, "\n")
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "title:"):
			b.WriteString(fmt.Sprintf("title: \"%s\"\n", strings.ReplaceAll(title, "\"", "\\\"")))
		case strings.HasPrefix(line, "description:"):
			b.WriteString(fmt.Sprintf("description: \"%s\"\n", strings.ReplaceAll(description, "\"", "\\\"")))
		case strings.HasPrefix(line, "translationHash:"):
			// Skip old hash, we add a new one below
		case line == "---" && b.Len() > 0:
			b.WriteString(fmt.Sprintf("translationHash: \"%s\"\n", hash))
			b.WriteString("---\n")
		default:
			b.WriteString(line)
			b.WriteString("\n")
		}
	}

	b.WriteString(body)
	return b.String()
}

func translateText(apiKey, text, lang string, isShort bool) string {
	if strings.TrimSpace(text) == "" {
		return ""
	}

	langName := map[string]string{
		"de": "German",
		"es": "Spanish",
	}[lang]
	if langName == "" {
		langName = lang
	}

	systemPrompt := fmt.Sprintf(`You are a professional translator. Translate the following text from English to %s.
Rules:
- Preserve all Markdown formatting, code blocks, links, and HTML tags exactly as they are.
- Do not translate proper nouns, project names, GitHub URLs, or code.
- Do not translate text inside code blocks (backtick-fenced or indented).
- Do not add any commentary or explanation. Output only the translated text.
- Keep the same tone and style as the original.`, langName)

	if isShort {
		systemPrompt += "\n- This is a short text (title or description). Return only the translated string, no quotes."
	}

	req := chatRequest{
		Model: model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: text},
		},
	}

	body, err := json.Marshal(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to marshal request: %v\n", err)
		return ""
	}

	client := &http.Client{Timeout: 5 * time.Minute}

	// Retry with backoff
	var result string
	for attempt := 0; attempt < 4; attempt++ {
		if attempt > 0 {
			wait := time.Duration(1<<uint(attempt)) * time.Second
			fmt.Fprintf(os.Stderr, "retrying in %v...\n", wait)
			time.Sleep(wait)
		}

		httpReq, err := http.NewRequest("POST", openRouterURL, bytes.NewReader(body))
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to create request: %v\n", err)
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)

		resp, err := client.Do(httpReq)
		if err != nil {
			fmt.Fprintf(os.Stderr, "request failed: %v\n", err)
			continue
		}

		respBody, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to read response: %v\n", err)
			continue
		}

		if resp.StatusCode != 200 {
			fmt.Fprintf(os.Stderr, "API returned %d: %s\n", resp.StatusCode, string(respBody))
			continue
		}

		var chatResp chatResponse
		if err := json.Unmarshal(respBody, &chatResp); err != nil {
			fmt.Fprintf(os.Stderr, "failed to parse response: %v\n", err)
			continue
		}

		if chatResp.Error != nil {
			fmt.Fprintf(os.Stderr, "API error: %s\n", chatResp.Error.Message)
			continue
		}

		if len(chatResp.Choices) > 0 {
			result = strings.TrimSpace(chatResp.Choices[0].Message.Content)
			break
		}
	}

	return result
}

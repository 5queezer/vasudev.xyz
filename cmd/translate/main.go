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
	defaultAPIURL = "https://openrouter.ai/api/v1/chat/completions"
	defaultModel  = "openrouter/free"
	maxAttempts   = 4
)

var httpClientFactory = func() *http.Client {
	return &http.Client{Timeout: 5 * time.Minute}
}

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

	apiURL := os.Getenv("LLM_API_URL")
	if apiURL == "" {
		apiURL = defaultAPIURL
	}
	llmModels := resolveModelCandidates(
		os.Getenv("LLM_MODEL"),
		os.Getenv("LLM_MODEL_FALLBACKS"),
		os.Getenv("LLM_MODELS"),
	)
	apiKey := os.Getenv("LLM_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("OPENROUTER_API_KEY")
	}
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "LLM_API_KEY (or OPENROUTER_API_KEY) environment variable is required")
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
			title := extractFrontMatterField(srcData, "title")
			translatedTitle := translateText(apiURL, llmModels, apiKey, title, lang, true)
			translatedDesc := translateText(apiURL, llmModels, apiKey, extractFrontMatterField(srcData, "description"), lang, true)

			if translatedTitle == "" || translatedDesc == "" {
				fmt.Fprintf(os.Stderr, "title/description translation failed for %s -> %s, skipping\n", name, lang)
				continue
			}

			// Chunk the body and translate incrementally
			srcChunks := splitBodyIntoChunks(body)
			newHashes := make([]string, len(srcChunks))
			for i, c := range srcChunks {
				newHashes[i] = chunkHash(c)
			}

			// Load existing translated chunks if target file exists
			var oldHashes []string
			var oldChunks []string
			if existingData, err := os.ReadFile(targetPath); err == nil {
				oldHashes = extractChunkHashes(existingData)
				_, existingBody := splitFrontMatterAndBody(existingData)
				oldChunks = splitBodyIntoChunks(existingBody)
			}

			translatedChunks := make([]string, len(srcChunks))
			failed := false
			for i, srcChunk := range srcChunks {
				// Reuse existing translation if chunk hash matches
				if i < len(oldHashes) && i < len(oldChunks) && oldHashes[i] == newHashes[i] {
					translatedChunks[i] = oldChunks[i]
					fmt.Printf("  chunk %d/%d: reused (unchanged)\n", i+1, len(srcChunks))
					continue
				}

				prev := ""
				if i > 0 {
					prev = srcChunks[i-1]
				}
				next := ""
				if i < len(srcChunks)-1 {
					next = srcChunks[i+1]
				}

				translated := translateChunk(apiURL, llmModels, apiKey, title, prev, srcChunk, next, lang)
				if translated == "" {
					fmt.Fprintf(os.Stderr, "chunk %d/%d translation failed for %s -> %s, skipping file\n", i+1, len(srcChunks), name, lang)
					failed = true
					break
				}
				translatedChunks[i] = translated
				fmt.Printf("  chunk %d/%d: translated\n", i+1, len(srcChunks))
			}
			if failed {
				continue
			}

			translatedBody := strings.Join(translatedChunks, "\n")

			output := buildTranslatedFile(frontMatter, translatedTitle, translatedDesc, hash, newHashes, translatedBody)
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

func buildTranslatedFile(originalFM, title, description, hash string, chunkHashes []string, body string) string {
	var b strings.Builder

	// Rewrite front matter with translated title/description, hash, and chunk hashes
	lines := strings.Split(originalFM, "\n")
	for _, line := range lines {
		switch {
		case strings.HasPrefix(line, "title:"):
			b.WriteString(fmt.Sprintf("title: \"%s\"\n", strings.ReplaceAll(title, "\"", "\\\"")))
		case strings.HasPrefix(line, "description:"):
			b.WriteString(fmt.Sprintf("description: \"%s\"\n", strings.ReplaceAll(description, "\"", "\\\"")))
		case strings.HasPrefix(line, "translationHash:"):
			// Skip old hash, we add a new one below
		case strings.HasPrefix(line, "chunkHashes:"):
			// Skip old chunk hashes, we add new ones below
		case line == "---" && b.Len() > 0:
			b.WriteString(fmt.Sprintf("translationHash: \"%s\"\n", hash))
			if len(chunkHashes) > 0 {
				b.WriteString(fmt.Sprintf("chunkHashes: \"%s\"\n", strings.Join(chunkHashes, ",")))
			}
			b.WriteString("---\n")
		default:
			b.WriteString(line)
			b.WriteString("\n")
		}
	}

	b.WriteString(body)
	return b.String()
}

func translateText(apiURL string, llmModels []string, apiKey, text, lang string, isShort bool) string {
	return translateTextWithContext(apiURL, llmModels, apiKey, text, lang, isShort, "")
}

func translateTextWithContext(apiURL string, llmModels []string, apiKey, text, lang string, isShort bool, contextHint string) string {
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
- Keep the same tone and style as the original.
- For Wikipedia links: replace "en.wikipedia.org" with the %s-language Wikipedia (e.g. "%s.wikipedia.org"). Verify the target article exists in that language. If no equivalent article exists, keep the English Wikipedia link unchanged.`, langName, lang, lang)

	if isShort {
		systemPrompt += "\n- This is a short text (title or description). Return only the translated string, no quotes."
	}

	if contextHint != "" {
		systemPrompt += "\n\nContext for this section (do NOT translate this context, use it only for reference):\n" + contextHint
	}

	client := httpClientFactory()

	for modelIndex, llmModel := range llmModels {
		req := chatRequest{
			Model: llmModel,
			Messages: []chatMessage{
				{Role: "system", Content: systemPrompt},
				{Role: "user", Content: text},
			},
		}

		body, err := json.Marshal(req)
		if err != nil {
			fmt.Fprintf(os.Stderr, "failed to marshal request for model %s: %v\n", llmModel, err)
			continue
		}

		for attempt := 0; attempt < maxAttempts; attempt++ {
			if attempt > 0 {
				wait := time.Duration(1<<uint(attempt)) * time.Second
				fmt.Fprintf(os.Stderr, "retrying model %s in %v...\n", llmModel, wait)
				time.Sleep(wait)
			}

			httpReq, err := http.NewRequest("POST", apiURL, bytes.NewReader(body))
			if err != nil {
				fmt.Fprintf(os.Stderr, "failed to create request for model %s: %v\n", llmModel, err)
				continue
			}
			httpReq.Header.Set("Content-Type", "application/json")
			httpReq.Header.Set("Authorization", "Bearer "+apiKey)

			resp, err := client.Do(httpReq)
			if err != nil {
				fmt.Fprintf(os.Stderr, "request failed for model %s: %v\n", llmModel, err)
				continue
			}

			respBody, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				fmt.Fprintf(os.Stderr, "failed to read response for model %s: %v\n", llmModel, err)
				continue
			}

			if resp.StatusCode != http.StatusOK {
				fmt.Fprintf(os.Stderr, "model %s returned %d: %s\n", llmModel, resp.StatusCode, string(respBody))
				if shouldFallbackModel(resp.StatusCode, respBody) && modelIndex < len(llmModels)-1 {
					fmt.Fprintf(os.Stderr, "falling back from %s to %s\n", llmModel, llmModels[modelIndex+1])
					break
				}
				continue
			}

			var chatResp chatResponse
			if err := json.Unmarshal(respBody, &chatResp); err != nil {
				fmt.Fprintf(os.Stderr, "failed to parse response for model %s: %v\n", llmModel, err)
				continue
			}

			if chatResp.Error != nil {
				fmt.Fprintf(os.Stderr, "API error for model %s: %s\n", llmModel, chatResp.Error.Message)
				if shouldFallbackModel(resp.StatusCode, []byte(chatResp.Error.Message)) && modelIndex < len(llmModels)-1 {
					fmt.Fprintf(os.Stderr, "falling back from %s to %s\n", llmModel, llmModels[modelIndex+1])
					break
				}
				continue
			}

			if len(chatResp.Choices) > 0 {
				return strings.TrimSpace(chatResp.Choices[0].Message.Content)
			}
		}
	}

	return ""
}

func resolveModelCandidates(primary, fallbacks, models string) []string {
	if ordered := uniqueModels(parseModelList(models)); len(ordered) > 0 {
		return ordered
	}

	ordered := []string{strings.TrimSpace(primary)}
	if ordered[0] == "" {
		ordered[0] = defaultModel
	}
	ordered = append(ordered, parseModelList(fallbacks)...)
	return uniqueModels(ordered)
}

func parseModelList(raw string) []string {
	split := strings.FieldsFunc(raw, func(r rune) bool {
		return r == ',' || r == '\n'
	})
	models := make([]string, 0, len(split))
	for _, item := range split {
		if trimmed := strings.TrimSpace(item); trimmed != "" {
			models = append(models, trimmed)
		}
	}
	return models
}

func uniqueModels(models []string) []string {
	seen := make(map[string]struct{}, len(models))
	ordered := make([]string, 0, len(models))
	for _, model := range models {
		model = strings.TrimSpace(model)
		if model == "" {
			continue
		}
		if _, ok := seen[model]; ok {
			continue
		}
		seen[model] = struct{}{}
		ordered = append(ordered, model)
	}
	return ordered
}

// splitBodyIntoChunks splits a markdown body into chunks at ## headings.
// The first chunk is everything before the first ## heading (intro).
// Each subsequent chunk starts with a ## heading line.
func splitBodyIntoChunks(body string) []string {
	lines := strings.Split(body, "\n")
	var chunks []string
	var current []string

	for _, line := range lines {
		if strings.HasPrefix(line, "## ") && len(current) > 0 {
			chunks = append(chunks, strings.Join(current, "\n"))
			current = nil
		}
		current = append(current, line)
	}
	if len(current) > 0 {
		chunks = append(chunks, strings.Join(current, "\n"))
	}
	return chunks
}

func chunkHash(text string) string {
	h := sha256.Sum256([]byte(text))
	return fmt.Sprintf("%x", h[:8]) // 16 hex chars per chunk
}

// headSnippet returns up to maxLen runes from the start of text.
func headSnippet(text string, maxLen int) string {
	text = strings.TrimSpace(text)
	runes := []rune(text)
	if len(runes) <= maxLen {
		return text
	}
	return string(runes[:maxLen])
}

// tailSnippet returns up to maxLen runes from the end of text.
func tailSnippet(text string, maxLen int) string {
	text = strings.TrimSpace(text)
	runes := []rune(text)
	if len(runes) <= maxLen {
		return text
	}
	return string(runes[len(runes)-maxLen:])
}

// extractChunkHashes parses the chunkHashes field from front matter.
// The field is stored as a comma-separated list of hex strings.
func extractChunkHashes(data []byte) []string {
	val := extractFrontMatterField(data, "chunkHashes")
	if val == "" {
		return nil
	}
	parts := strings.Split(val, ",")
	hashes := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			hashes = append(hashes, trimmed)
		}
	}
	return hashes
}

// translateChunk translates a single chunk with context from neighbors.
// Context is passed via the system prompt so the model does not translate it.
func translateChunk(apiURL string, llmModels []string, apiKey string, title string, prevChunk, chunk, nextChunk string, lang string) string {
	var ctx strings.Builder
	ctx.WriteString(fmt.Sprintf("This is a section from a blog post titled \"%s\".", title))
	if prevChunk != "" {
		ctx.WriteString(fmt.Sprintf("\nThe preceding section ends with: ...%s", tailSnippet(prevChunk, 100)))
	}
	if nextChunk != "" {
		ctx.WriteString(fmt.Sprintf("\nThe following section starts with: %s...", headSnippet(nextChunk, 100)))
	}

	return translateTextWithContext(apiURL, llmModels, apiKey, chunk, lang, false, ctx.String())
}

func shouldFallbackModel(statusCode int, body []byte) bool {
	if statusCode == http.StatusTooManyRequests || statusCode >= http.StatusInternalServerError {
		return true
	}

	lower := strings.ToLower(string(body))
	return strings.Contains(lower, "rate-limit") ||
		strings.Contains(lower, "rate limited") ||
		strings.Contains(lower, "temporarily rate-limited") ||
		strings.Contains(lower, "provider returned error")
}

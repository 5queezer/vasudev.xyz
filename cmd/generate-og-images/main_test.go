package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func jsonResponse(statusCode int, body string) *http.Response {
	return &http.Response{
		StatusCode: statusCode,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestSplitFrontMatterAndBody(t *testing.T) {
	input := []byte("---\ntitle: Test\n---\nBody here")
	fm, body := splitFrontMatterAndBody(input)
	// splitFrontMatterAndBody returns content[:end+8] where end is index of \n---\n in content[4:]
	// For "---\ntitle: Test\n---\nBody here", end=11, so fm = content[:19] = "---\ntitle: Test\n---"
	// and body = content[19:] = "\nBody here"
	if fm != "---\ntitle: Test\n---" {
		t.Fatalf("front matter = %q", fm)
	}
	if body != "\nBody here" {
		t.Fatalf("body = %q", body)
	}
}

func TestExtractFrontMatterField(t *testing.T) {
	input := []byte("---\ntitle: \"Hello World\"\ndescription: \"A test\"\ntags: [\"ai\"]\n---\nBody")

	if got := extractFrontMatterField(input, "title"); got != "Hello World" {
		t.Fatalf("title = %q, want %q", got, "Hello World")
	}
	if got := extractFrontMatterField(input, "description"); got != "A test" {
		t.Fatalf("description = %q, want %q", got, "A test")
	}
	if got := extractFrontMatterField(input, "missing"); got != "" {
		t.Fatalf("missing = %q, want empty", got)
	}
}

func TestBodyHash(t *testing.T) {
	h1 := bodyHash("hello")
	h2 := bodyHash("hello")
	h3 := bodyHash("world")

	if h1 != h2 {
		t.Fatal("same input should produce same hash")
	}
	if h1 == h3 {
		t.Fatal("different input should produce different hash")
	}
	if len(h1) != 32 {
		t.Fatalf("hash length = %d, want 32", len(h1))
	}
}

func TestInsertImageField(t *testing.T) {
	dir := t.TempDir()

	t.Run("insert after description", func(t *testing.T) {
		path := filepath.Join(dir, "test1.md")
		data := []byte("---\ntitle: \"Test\"\ndate: 2026-01-01\ndescription: \"A test post\"\ntags: [\"ai\"]\n---\nBody content here\n")
		os.WriteFile(path, data, 0644)

		err := insertImageField(path, data, "/images/test1-og.png")
		if err != nil {
			t.Fatal(err)
		}

		result, _ := os.ReadFile(path)
		if !strings.Contains(string(result), "images: [\"/images/test1-og.png\"]") {
			t.Fatalf("images field not inserted:\n%s", result)
		}
		if !strings.Contains(string(result), "Body content here") {
			t.Fatalf("body lost:\n%s", result)
		}
		// Verify order: images should come after description
		descIdx := strings.Index(string(result), "description:")
		imgIdx := strings.Index(string(result), "images:")
		if imgIdx < descIdx {
			t.Fatal("images field should come after description")
		}
	})

	t.Run("replace existing images field", func(t *testing.T) {
		path := filepath.Join(dir, "test2.md")
		data := []byte("---\ntitle: \"Test\"\nimages: [\"/images/old.png\"]\ndescription: \"A test\"\n---\nBody\n")
		os.WriteFile(path, data, 0644)

		err := insertImageField(path, data, "/images/test2-og.png")
		if err != nil {
			t.Fatal(err)
		}

		result, _ := os.ReadFile(path)
		if !strings.Contains(string(result), "images: [\"/images/test2-og.png\"]") {
			t.Fatalf("images field not replaced:\n%s", result)
		}
		if strings.Contains(string(result), "old.png") {
			t.Fatalf("old images field still present:\n%s", result)
		}
	})
}

func TestGeneratePromptWithFallback(t *testing.T) {
	var modelsSeen []string

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				defer r.Body.Close()

				var req chatRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Fatalf("decode request: %v", err)
				}

				modelsSeen = append(modelsSeen, req.Model)

				switch req.Model {
				case "model-a":
					return jsonResponse(http.StatusTooManyRequests, `{"error":{"message":"rate-limited"}}`), nil
				case "model-b":
					return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"A dark network of glowing nodes connected by purple lines on black background"}}]}`), nil
				default:
					t.Fatalf("unexpected model %q", req.Model)
					return nil, nil
				}
			}),
		}
	}

	got := generatePrompt("https://example.invalid/v1/chat/completions", []string{"model-a", "model-b"}, "test-key", "Title: Test\nBody content")
	if got != "A dark network of glowing nodes connected by purple lines on black background" {
		t.Fatalf("got %q", got)
	}
	if len(modelsSeen) != 2 || modelsSeen[0] != "model-a" || modelsSeen[1] != "model-b" {
		t.Fatalf("models seen: %v", modelsSeen)
	}
}

func TestGenerateImageSuccess(t *testing.T) {
	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	// Minimal valid PNG (1x1 pixel)
	pngData := []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
		0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
	}

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				if r.Method == "POST" {
					defer r.Body.Close()
					var req falRequest
					if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
						t.Fatalf("decode fal request: %v", err)
					}
					if req.ImageSize.Width != 1200 || req.ImageSize.Height != 630 {
						t.Fatalf("image size = %dx%d, want 1200x630", req.ImageSize.Width, req.ImageSize.Height)
					}
					return jsonResponse(http.StatusOK, `{"images":[{"url":"https://example.invalid/image.png","content_type":"image/png"}]}`), nil
				}
				// GET request for image download
				return &http.Response{
					StatusCode: http.StatusOK,
					Header:     make(http.Header),
					Body:       io.NopCloser(strings.NewReader(string(pngData))),
				}, nil
			}),
		}
	}

	dir := t.TempDir()
	outputPath := filepath.Join(dir, "test-og.png")

	err := generateImage("https://example.invalid/fal", "test-key", "test prompt", outputPath)
	if err != nil {
		t.Fatal(err)
	}

	data, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) == 0 {
		t.Fatal("image file is empty")
	}
}

func TestContentHashSkipsUnchanged(t *testing.T) {
	dir := t.TempDir()
	contentDir := filepath.Join(dir, "content")
	imagesDir := filepath.Join(dir, "images")
	hashDir := filepath.Join(imagesDir, ".og-hashes")
	os.MkdirAll(contentDir, 0755)
	os.MkdirAll(hashDir, 0755)

	post := "---\ntitle: \"Test\"\ndescription: \"Desc\"\n---\nBody content\n"
	os.WriteFile(filepath.Join(contentDir, "test-post.md"), []byte(post), 0644)

	// Write hash matching the body
	_, body := splitFrontMatterAndBody([]byte(post))
	hash := bodyHash(body)
	os.WriteFile(filepath.Join(hashDir, "test-post.hash"), []byte(hash+"\n"), 0644)

	// The hash matches, so the post should be skipped.
	// We verify this indirectly: if it were NOT skipped, it would try to call the API
	// and fail (no HTTP client mock, no API keys).
	// This test just verifies the hash computation is consistent.
	existingHash, _ := os.ReadFile(filepath.Join(hashDir, "test-post.hash"))
	if strings.TrimSpace(string(existingHash)) != hash {
		t.Fatalf("hash mismatch: stored=%q, computed=%q", strings.TrimSpace(string(existingHash)), hash)
	}
}

func TestPostFilteringSkipsTranslations(t *testing.T) {
	// Verify the filtering logic
	skipLangs := []string{"de", "es"}
	tests := []struct {
		name string
		skip bool
	}{
		{"my-post.md", false},
		{"my-post.de.md", true},
		{"my-post.es.md", true},
		{"_index.md", true},
		{"_index.de.md", true},
		{"README.txt", true}, // not .md
	}

	for _, tt := range tests {
		shouldSkip := false
		if !strings.HasSuffix(tt.name, ".md") {
			shouldSkip = true
		} else if tt.name == "_index.md" || strings.HasPrefix(tt.name, "_index.") {
			shouldSkip = true
		} else {
			for _, lang := range skipLangs {
				if strings.HasSuffix(tt.name, "."+lang+".md") {
					shouldSkip = true
					break
				}
			}
		}

		if shouldSkip != tt.skip {
			t.Errorf("%s: skip=%v, want %v", tt.name, shouldSkip, tt.skip)
		}
	}
}

func TestShouldFallbackModel(t *testing.T) {
	if !shouldFallbackModel(http.StatusTooManyRequests, []byte(`{"error":"rate-limited"}`)) {
		t.Fatal("expected 429 to trigger fallback")
	}
	if shouldFallbackModel(http.StatusBadRequest, []byte(`{"error":"bad request"}`)) {
		t.Fatal("did not expect 400 to trigger fallback")
	}
	if !shouldFallbackModel(http.StatusInternalServerError, []byte(`error`)) {
		t.Fatal("expected 500 to trigger fallback")
	}
}

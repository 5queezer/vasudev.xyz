package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestResolveModelCandidatesFromExplicitList(t *testing.T) {
	got := resolveModelCandidates(
		"qwen/qwen3.6-plus:free",
		"minimax/minimax-m2.7",
		" qwen/qwen3.6-plus:free,\n nvidia/nemotron-3-nano-30b-a3b:free , qwen/qwen3.6-plus:free ",
	)

	want := []string{
		"qwen/qwen3.6-plus:free",
		"nvidia/nemotron-3-nano-30b-a3b:free",
	}

	assertStringSlicesEqual(t, got, want)
}

func TestResolveModelCandidatesFromPrimaryAndFallbacks(t *testing.T) {
	got := resolveModelCandidates(
		"qwen/qwen3.6-plus:free",
		"nvidia/nemotron-3-nano-30b-a3b:free, minimax/minimax-m2.7",
		"",
	)

	want := []string{
		"qwen/qwen3.6-plus:free",
		"nvidia/nemotron-3-nano-30b-a3b:free",
		"minimax/minimax-m2.7",
	}

	assertStringSlicesEqual(t, got, want)
}

func TestTranslateTextFallsBackOnRateLimit(t *testing.T) {
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
				case "qwen/qwen3.6-plus:free":
					return jsonResponse(http.StatusTooManyRequests, `{"error":{"message":"provider rate-limited"}}`), nil
				case "nvidia/nemotron-3-nano-30b-a3b:free":
					return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Hallo Welt"}}]}`), nil
				default:
					t.Fatalf("unexpected model %q", req.Model)
					return nil, nil
				}
			}),
		}
	}

	got := translateText(
		"https://example.invalid/v1/chat/completions",
		[]string{"qwen/qwen3.6-plus:free", "nvidia/nemotron-3-nano-30b-a3b:free"},
		"test-key",
		"Hello world",
		"de",
		true,
	)

	if got != "Hallo Welt" {
		t.Fatalf("translateText() = %q, want %q", got, "Hallo Welt")
	}

	wantModels := []string{
		"qwen/qwen3.6-plus:free",
		"nvidia/nemotron-3-nano-30b-a3b:free",
	}
	assertStringSlicesEqual(t, modelsSeen, wantModels)
}

func TestShouldFallbackModel(t *testing.T) {
	if !shouldFallbackModel(http.StatusTooManyRequests, []byte(`{"error":"rate-limited"}`)) {
		t.Fatal("expected 429 to trigger fallback")
	}
	if shouldFallbackModel(http.StatusBadRequest, []byte(`{"error":"bad request"}`)) {
		t.Fatal("did not expect 400 to trigger fallback")
	}
}

func TestSplitBodyIntoChunks(t *testing.T) {
	body := "Intro paragraph.\n\n## Section One\n\nContent one.\n\n## Section Two\n\nContent two.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 3 {
		t.Fatalf("expected 3 chunks, got %d: %v", len(chunks), chunks)
	}

	if !strings.HasPrefix(chunks[0], "Intro") {
		t.Errorf("chunk 0 should start with Intro, got %q", chunks[0][:20])
	}
	if !strings.HasPrefix(chunks[1], "## Section One") {
		t.Errorf("chunk 1 should start with ## Section One, got %q", chunks[1][:20])
	}
	if !strings.HasPrefix(chunks[2], "## Section Two") {
		t.Errorf("chunk 2 should start with ## Section Two, got %q", chunks[2][:20])
	}
}

func TestSplitBodyIntoChunksNoHeadings(t *testing.T) {
	body := "Just a simple post with no headings.\n\nAnother paragraph.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 1 {
		t.Fatalf("expected 1 chunk, got %d", len(chunks))
	}
	if chunks[0] != body {
		t.Errorf("single chunk should equal original body")
	}
}

func TestSplitBodyRoundTrip(t *testing.T) {
	body := "Intro.\n\n## A\n\nAlpha.\n\n## B\n\nBeta.\n"
	chunks := splitBodyIntoChunks(body)
	reassembled := strings.Join(chunks, "\n")
	if reassembled != body {
		t.Fatalf("round trip mismatch:\ngot:  %q\nwant: %q", reassembled, body)
	}
}

func TestChunkHashDeterministic(t *testing.T) {
	h1 := chunkHash("hello world")
	h2 := chunkHash("hello world")
	if h1 != h2 {
		t.Fatalf("same input should produce same hash: %q vs %q", h1, h2)
	}
	h3 := chunkHash("different content")
	if h1 == h3 {
		t.Fatal("different input should produce different hash")
	}
}

func TestExtractChunkHashes(t *testing.T) {
	data := []byte("---\ntitle: \"Test\"\nchunkHashes: \"abc123,def456,789ghi\"\n---\nBody.\n")
	hashes := extractChunkHashes(data)
	want := []string{"abc123", "def456", "789ghi"}
	assertStringSlicesEqual(t, hashes, want)
}

func TestExtractChunkHashesEmpty(t *testing.T) {
	data := []byte("---\ntitle: \"Test\"\n---\nBody.\n")
	hashes := extractChunkHashes(data)
	if len(hashes) != 0 {
		t.Fatalf("expected no hashes, got %v", hashes)
	}
}

func TestBuildTranslatedFileIncludesChunkHashes(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, "Translated", "Beschreibung", "abc123", []string{"h1", "h2", "h3"}, "body")
	if !strings.Contains(output, "chunkHashes: \"h1,h2,h3\"") {
		t.Fatalf("output should contain chunkHashes, got:\n%s", output)
	}
	if !strings.Contains(output, "translationHash: \"abc123\"") {
		t.Fatalf("output should contain translationHash, got:\n%s", output)
	}
}

func TestHeadAndTailSnippet(t *testing.T) {
	text := "Hello, this is a longer text for testing snippets."
	head := headSnippet(text, 10)
	if head != "Hello, thi" {
		t.Errorf("headSnippet(10) = %q, want %q", head, "Hello, thi")
	}
	tail := tailSnippet(text, 10)
	want := "snippets."
	if tail != want {
		wantAlt := text[len(text)-10:]
		if tail != wantAlt {
			t.Errorf("tailSnippet(10) = %q, want %q", tail, wantAlt)
		}
	}

	// Short text returns full string
	short := "Hi"
	if headSnippet(short, 10) != "Hi" {
		t.Errorf("headSnippet should return full short text")
	}
	if tailSnippet(short, 10) != "Hi" {
		t.Errorf("tailSnippet should return full short text")
	}

	// Multi-byte characters: rune-based slicing must not split UTF-8
	multibyte := "Über pratyāhāra und dhyāna"
	h := headSnippet(multibyte, 4)
	if h != "Über" {
		t.Errorf("headSnippet multibyte = %q, want %q", h, "Über")
	}
	tl := tailSnippet(multibyte, 6)
	if tl != "dhyāna" {
		t.Errorf("tailSnippet multibyte = %q, want %q", tl, "dhyāna")
	}
}

func TestTranslateChunkContextInSystemPrompt(t *testing.T) {
	apiCalls := 0
	var capturedSystem, capturedUser string

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				defer r.Body.Close()
				apiCalls++

				var req chatRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Fatalf("decode request: %v", err)
				}

				capturedSystem = req.Messages[0].Content
				capturedUser = req.Messages[len(req.Messages)-1].Content

				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Translated chunk"}}]}`), nil
			}),
		}
	}

	chunk := "## Changed Section\n\nNew content here."
	result := translateChunk(
		"https://example.invalid/v1/chat/completions",
		[]string{"test-model"},
		"test-key",
		"Test Post",
		"previous chunk",
		chunk,
		"next chunk",
		"de",
	)

	if result == "" {
		t.Fatal("translateChunk returned empty")
	}
	if apiCalls != 1 {
		t.Fatalf("expected 1 API call, got %d", apiCalls)
	}

	// Context must be in the system prompt, not in the user message
	if !strings.Contains(capturedSystem, "Test Post") {
		t.Error("system prompt should contain the post title as context")
	}
	if !strings.Contains(capturedSystem, "previous chunk") {
		t.Error("system prompt should contain preceding section snippet")
	}
	if !strings.Contains(capturedSystem, "next chunk") {
		t.Error("system prompt should contain following section snippet")
	}

	// User message should be only the chunk, no preamble
	if capturedUser != chunk {
		t.Errorf("user message should be the chunk only, got %q", capturedUser)
	}
}

func TestSplitBodyIntoChunksEmpty(t *testing.T) {
	chunks := splitBodyIntoChunks("")
	if len(chunks) != 1 {
		t.Fatalf("empty body should produce 1 empty chunk, got %d", len(chunks))
	}
	if chunks[0] != "" {
		t.Errorf("single chunk of empty body should be empty string, got %q", chunks[0])
	}
}

func TestSplitBodyIntoChunksStartsWithHeading(t *testing.T) {
	// Body with no intro text before the first ## heading
	body := "## First Section\n\nContent.\n\n## Second Section\n\nMore content.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 2 {
		t.Fatalf("expected 2 chunks, got %d: %v", len(chunks), chunks)
	}
	if !strings.HasPrefix(chunks[0], "## First Section") {
		t.Errorf("chunk 0 should start with ## First Section, got %q", chunks[0])
	}
	if !strings.HasPrefix(chunks[1], "## Second Section") {
		t.Errorf("chunk 1 should start with ## Second Section, got %q", chunks[1])
	}
}

func TestSplitBodyIntoChunksH3NotSplit(t *testing.T) {
	// ### sub-headings should NOT cause a new chunk
	body := "## Main Section\n\n### SubSection\n\nContent.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 1 {
		t.Fatalf("### heading should not split chunks, got %d: %v", len(chunks), chunks)
	}
	if !strings.Contains(chunks[0], "### SubSection") {
		t.Errorf("chunk should contain the ### heading, got %q", chunks[0])
	}
}

func TestSplitBodyIntoChunksConsecutiveHeadings(t *testing.T) {
	// Two ## headings with no content between them
	body := "## A\n\n## B\n\nContent B.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 2 {
		t.Fatalf("expected 2 chunks for consecutive headings, got %d", len(chunks))
	}
	if chunks[0] != "## A\n" {
		t.Errorf("first chunk should be heading line only, got %q", chunks[0])
	}
}

func TestChunkHashLength(t *testing.T) {
	h := chunkHash("some text")
	// 8 bytes = 16 hex characters
	if len(h) != 16 {
		t.Errorf("chunkHash should be 16 hex chars, got %d: %q", len(h), h)
	}
}

func TestChunkHashEmptyString(t *testing.T) {
	h := chunkHash("")
	if len(h) != 16 {
		t.Errorf("chunkHash of empty string should still be 16 hex chars, got %d: %q", len(h), h)
	}
}

func TestHeadSnippetExactLength(t *testing.T) {
	text := "Hello"
	// exactly at boundary: len == maxLen
	got := headSnippet(text, 5)
	if got != "Hello" {
		t.Errorf("headSnippet at exact boundary: got %q, want %q", got, "Hello")
	}
}

func TestTailSnippetExactLength(t *testing.T) {
	text := "Hello"
	got := tailSnippet(text, 5)
	if got != "Hello" {
		t.Errorf("tailSnippet at exact boundary: got %q, want %q", got, "Hello")
	}
}

func TestHeadSnippetEmptyString(t *testing.T) {
	got := headSnippet("", 10)
	if got != "" {
		t.Errorf("headSnippet of empty string should return empty, got %q", got)
	}
}

func TestTailSnippetEmptyString(t *testing.T) {
	got := tailSnippet("", 10)
	if got != "" {
		t.Errorf("tailSnippet of empty string should return empty, got %q", got)
	}
}

func TestHeadSnippetTrimsLeadingWhitespace(t *testing.T) {
	got := headSnippet("   abc", 3)
	if got != "abc" {
		t.Errorf("headSnippet should trim leading whitespace before slicing, got %q", got)
	}
}

func TestTailSnippetTrimsTrailingWhitespace(t *testing.T) {
	got := tailSnippet("abc   ", 3)
	if got != "abc" {
		t.Errorf("tailSnippet should trim trailing whitespace before slicing, got %q", got)
	}
}

func TestExtractChunkHashesSingleEntry(t *testing.T) {
	data := []byte("---\ntitle: \"Test\"\nchunkHashes: \"onlyone\"\n---\nBody.\n")
	hashes := extractChunkHashes(data)
	if len(hashes) != 1 || hashes[0] != "onlyone" {
		t.Fatalf("expected [onlyone], got %v", hashes)
	}
}

func TestExtractChunkHashesWithWhitespace(t *testing.T) {
	// Hashes with surrounding spaces should be trimmed
	data := []byte("---\ntitle: \"Test\"\nchunkHashes: \" aaa , bbb , ccc \"\n---\nBody.\n")
	hashes := extractChunkHashes(data)
	want := []string{"aaa", "bbb", "ccc"}
	assertStringSlicesEqual(t, hashes, want)
}

func TestBuildTranslatedFileEmptyChunkHashes(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, "Translated", "Beschreibung", "abc123", []string{}, "body")
	if strings.Contains(output, "chunkHashes:") {
		t.Fatalf("output should not contain chunkHashes when slice is empty, got:\n%s", output)
	}
	if !strings.Contains(output, "translationHash: \"abc123\"") {
		t.Fatalf("output should still contain translationHash, got:\n%s", output)
	}
}

func TestBuildTranslatedFileReplacesExistingChunkHashes(t *testing.T) {
	// FM already has chunkHashes from a previous run - should be replaced
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\nchunkHashes: \"old1,old2\"\ntranslationHash: \"oldhash\"\n---\n"
	output := buildTranslatedFile(fm, "New Title", "New Desc", "newhash", []string{"new1", "new2", "new3"}, "body")
	if strings.Contains(output, "old1") || strings.Contains(output, "old2") {
		t.Fatalf("output should replace old chunk hashes, got:\n%s", output)
	}
	if !strings.Contains(output, "chunkHashes: \"new1,new2,new3\"") {
		t.Fatalf("output should contain new chunk hashes, got:\n%s", output)
	}
	if strings.Contains(output, "oldhash") {
		t.Fatalf("output should replace old translationHash, got:\n%s", output)
	}
	if !strings.Contains(output, "translationHash: \"newhash\"") {
		t.Fatalf("output should contain new translationHash, got:\n%s", output)
	}
}

func TestBuildTranslatedFileEscapesQuotesInTitle(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, `Title with "quotes"`, "Desc", "hash", nil, "body")
	if !strings.Contains(output, `title: "Title with \"quotes\""`) {
		t.Fatalf("title with quotes should be escaped, got:\n%s", output)
	}
}

func TestBuildTranslatedFileEscapesQuotesInDescription(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, "Title", `Desc with "quotes" here`, "hash", nil, "body")
	if !strings.Contains(output, `description: "Desc with \"quotes\" here"`) {
		t.Fatalf("description with quotes should be escaped, got:\n%s", output)
	}
}

func TestTranslateTextWithContextAppendsContextHint(t *testing.T) {
	var capturedSystem string

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
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Translated"}}]}`), nil
			}),
		}
	}

	translateTextWithContext(
		"https://example.invalid/v1/chat/completions",
		[]string{"test-model"},
		"test-key",
		"Hello world",
		"de",
		false,
		"some context hint",
	)

	if !strings.Contains(capturedSystem, "some context hint") {
		t.Errorf("system prompt should contain the context hint, got:\n%s", capturedSystem)
	}
}

func TestTranslateTextWithContextEmptyHintNotAppended(t *testing.T) {
	var capturedSystem string

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
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Translated"}}]}`), nil
			}),
		}
	}

	translateTextWithContext(
		"https://example.invalid/v1/chat/completions",
		[]string{"test-model"},
		"test-key",
		"Hello world",
		"de",
		false,
		"",
	)

	if strings.Contains(capturedSystem, "Context for this section") {
		t.Errorf("system prompt should not contain context block when hint is empty, got:\n%s", capturedSystem)
	}
}

func TestTranslateChunkNoPrevNoNext(t *testing.T) {
	var capturedSystem string

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
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Übersetzt"}}]}`), nil
			}),
		}
	}

	result := translateChunk(
		"https://example.invalid/v1/chat/completions",
		[]string{"test-model"},
		"test-key",
		"My Post",
		"", // no prev
		"## Only Section\n\nContent.",
		"", // no next
		"de",
	)

	if result == "" {
		t.Fatal("translateChunk should return non-empty for valid response")
	}

	// Title context should still be present
	if !strings.Contains(capturedSystem, "My Post") {
		t.Error("system prompt should contain the post title")
	}
	// No neighbor snippets
	if strings.Contains(capturedSystem, "preceding section") {
		t.Error("system prompt should not mention preceding section when prevChunk is empty")
	}
	if strings.Contains(capturedSystem, "following section") {
		t.Error("system prompt should not mention following section when nextChunk is empty")
	}
}

func TestTranslateChunkOnlyPrev(t *testing.T) {
	var capturedSystem string

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
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Übersetzt"}}]}`), nil
			}),
		}
	}

	translateChunk(
		"https://example.invalid/v1/chat/completions",
		[]string{"test-model"},
		"test-key",
		"My Post",
		"previous chunk content",
		"## Last Section\n\nFinal content.",
		"", // no next
		"de",
	)

	if !strings.Contains(capturedSystem, "preceding section") {
		t.Error("system prompt should mention preceding section when prevChunk is non-empty")
	}
	if strings.Contains(capturedSystem, "following section") {
		t.Error("system prompt should not mention following section when nextChunk is empty")
	}
}

func TestTranslateChunkTailSnippetUsedForPrev(t *testing.T) {
	// Long prevChunk: only the tail (last 100 runes) should appear in context
	longPrev := strings.Repeat("x", 200) + "UNIQUE_TAIL"
	var capturedSystem string

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
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"Übersetzt"}}]}`), nil
			}),
		}
	}

	translateChunk(
		"https://example.invalid/v1/chat/completions",
		[]string{"test-model"},
		"test-key",
		"My Post",
		longPrev,
		"## Section\n\nContent.",
		"",
		"de",
	)

	if !strings.Contains(capturedSystem, "UNIQUE_TAIL") {
		t.Error("system prompt should contain the tail of the previous chunk")
	}
	// Beginning of longPrev should NOT appear (it's too far back)
	if strings.Contains(capturedSystem, strings.Repeat("x", 200)) {
		t.Error("system prompt should not contain the full previous chunk prefix")
	}
}

func escaped(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "\"", "\\\"")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}

func assertStringSlicesEqual(t *testing.T, got, want []string) {
	t.Helper()

	if len(got) != len(want) {
		t.Fatalf("len mismatch: got %d (%v), want %d (%v)", len(got), got, len(want), want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("element %d mismatch: got %q, want %q (full got=%v want=%v)", i, got[i], want[i], got, want)
		}
	}
}

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
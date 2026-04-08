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

func escaped(s string) string {
	s = strings.ReplaceAll(s, "\\", "\\\\")
	s = strings.ReplaceAll(s, "\"", "\\\"")
	s = strings.ReplaceAll(s, "\n", "\\n")
	return s
}

func TestSplitBodyIntoChunksEmpty(t *testing.T) {
	chunks := splitBodyIntoChunks("")
	// Empty body: either no chunks or a single empty chunk is acceptable; must not panic
	for _, c := range chunks {
		if c != "" {
			t.Errorf("expected only empty chunks for empty input, got %q", c)
		}
	}
}

func TestSplitBodyIntoChunksStartsWithHeading(t *testing.T) {
	// No intro text – body starts directly with a ## heading
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

func TestSplitBodyIntoChunksDoesNotSplitOnH3(t *testing.T) {
	// ### and #### headings must NOT create new chunks
	body := "Intro.\n\n### Sub-heading\n\nContent.\n\n#### Sub-sub\n\nMore.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 1 {
		t.Fatalf("### and #### should not split; expected 1 chunk, got %d: %v", len(chunks), chunks)
	}
}

func TestSplitBodyIntoChunksDoesNotSplitOnHashHashNoSpace(t *testing.T) {
	// "##NoSpace" should NOT be treated as a section split
	body := "Intro.\n\n##NoSpace heading\n\nContent.\n"
	chunks := splitBodyIntoChunks(body)

	if len(chunks) != 1 {
		t.Fatalf("##NoSpace should not split; expected 1 chunk, got %d: %v", len(chunks), chunks)
	}
}

func TestChunkHashLength(t *testing.T) {
	h := chunkHash("some text")
	// 8 bytes → 16 hex characters
	if len(h) != 16 {
		t.Errorf("expected hash length 16, got %d (%q)", len(h), h)
	}
}

func TestChunkHashEmptyString(t *testing.T) {
	h := chunkHash("")
	if len(h) != 16 {
		t.Errorf("empty string hash should still be 16 hex chars, got %d (%q)", len(h), h)
	}
	// Calling twice should be deterministic
	if chunkHash("") != h {
		t.Error("empty string hash is not deterministic")
	}
}

func TestHeadSnippetEmptyAndZero(t *testing.T) {
	if got := headSnippet("", 10); got != "" {
		t.Errorf("headSnippet empty input: got %q, want \"\"", got)
	}
	if got := headSnippet("hello", 0); got != "" {
		t.Errorf("headSnippet maxLen=0: got %q, want \"\"", got)
	}
}

func TestTailSnippetEmptyAndZero(t *testing.T) {
	if got := tailSnippet("", 10); got != "" {
		t.Errorf("tailSnippet empty input: got %q, want \"\"", got)
	}
	if got := tailSnippet("hello", 0); got != "" {
		t.Errorf("tailSnippet maxLen=0: got %q, want \"\"", got)
	}
}

func TestHeadSnippetTrimsLeadingWhitespace(t *testing.T) {
	// headSnippet trims space before slicing
	got := headSnippet("  hello world  ", 5)
	if got != "hello" {
		t.Errorf("headSnippet should trim leading space before slicing; got %q, want %q", got, "hello")
	}
}

func TestTailSnippetTrimsTrailingWhitespace(t *testing.T) {
	// tailSnippet trims space before slicing
	got := tailSnippet("  hello world  ", 5)
	if got != "world" {
		t.Errorf("tailSnippet should trim trailing space before slicing; got %q, want %q", got, "world")
	}
}

func TestExtractChunkHashesSingleHash(t *testing.T) {
	data := []byte("---\nchunkHashes: \"onlyone\"\n---\n")
	hashes := extractChunkHashes(data)
	if len(hashes) != 1 || hashes[0] != "onlyone" {
		t.Fatalf("expected [\"onlyone\"], got %v", hashes)
	}
}

func TestExtractChunkHashesSpacesAroundCommas(t *testing.T) {
	data := []byte("---\nchunkHashes: \"aaa , bbb , ccc\"\n---\n")
	hashes := extractChunkHashes(data)
	want := []string{"aaa", "bbb", "ccc"}
	assertStringSlicesEqual(t, hashes, want)
}

func TestBuildTranslatedFileNoChunkHashes(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, "Translated", "Desc", "hash1", nil, "body text")
	if strings.Contains(output, "chunkHashes:") {
		t.Errorf("output should NOT contain chunkHashes when slice is nil:\n%s", output)
	}
	if !strings.Contains(output, "translationHash: \"hash1\"") {
		t.Errorf("output should still contain translationHash:\n%s", output)
	}
}

func TestBuildTranslatedFileEmptyChunkHashes(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, "Translated", "Desc", "hash1", []string{}, "body text")
	if strings.Contains(output, "chunkHashes:") {
		t.Errorf("output should NOT contain chunkHashes when slice is empty:\n%s", output)
	}
}

func TestBuildTranslatedFileReplacesExistingChunkHashes(t *testing.T) {
	// The front matter already has chunkHashes; it must be replaced, not duplicated
	fm := "---\ntitle: \"T\"\ndescription: \"D\"\nchunkHashes: \"old1,old2\"\ntranslationHash: \"oldhash\"\n---\n"
	output := buildTranslatedFile(fm, "T", "D", "newhash", []string{"new1", "new2"}, "body")

	// Old values must be gone
	if strings.Contains(output, "old1") || strings.Contains(output, "old2") {
		t.Errorf("old chunkHashes must be replaced, got:\n%s", output)
	}
	if strings.Contains(output, "oldhash") {
		t.Errorf("old translationHash must be replaced, got:\n%s", output)
	}
	// New values must be present
	if !strings.Contains(output, "chunkHashes: \"new1,new2\"") {
		t.Errorf("new chunkHashes missing:\n%s", output)
	}
	if !strings.Contains(output, "translationHash: \"newhash\"") {
		t.Errorf("new translationHash missing:\n%s", output)
	}
}

func TestBuildTranslatedFileEscapesQuotesInTitle(t *testing.T) {
	fm := "---\ntitle: \"Original\"\ndescription: \"Desc\"\n---\n"
	output := buildTranslatedFile(fm, `Title with "quotes"`, "Desc", "h", []string{"x"}, "body")
	if !strings.Contains(output, `title: "Title with \"quotes\""`) {
		t.Errorf("quotes in title should be escaped, got:\n%s", output)
	}
}

func TestTranslateTextWithContextEmptyTextNoAPICall(t *testing.T) {
	called := false

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				called = true
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"x"}}]}`), nil
			}),
		}
	}

	result := translateTextWithContext("https://example.invalid/v1", []string{"m"}, "k", "   ", "de", false, "")
	if result != "" {
		t.Errorf("expected empty result for whitespace-only text, got %q", result)
	}
	if called {
		t.Error("API should not be called for empty/whitespace text")
	}
}

func TestTranslateTextWithContextNoContextHint(t *testing.T) {
	var capturedSystem string

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				defer r.Body.Close()
				var req chatRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Fatalf("decode: %v", err)
				}
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"result"}}]}`), nil
			}),
		}
	}

	translateTextWithContext("https://example.invalid/v1", []string{"m"}, "k", "hello", "de", false, "")
	if strings.Contains(capturedSystem, "Context for this section") {
		t.Error("system prompt should NOT contain context section when contextHint is empty")
	}
}

func TestTranslateTextWithContextHintAppearsInSystemPrompt(t *testing.T) {
	var capturedSystem string

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				defer r.Body.Close()
				var req chatRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Fatalf("decode: %v", err)
				}
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"result"}}]}`), nil
			}),
		}
	}

	translateTextWithContext("https://example.invalid/v1", []string{"m"}, "k", "hello", "de", false, "unique-context-hint-xyz")
	if !strings.Contains(capturedSystem, "unique-context-hint-xyz") {
		t.Error("context hint should appear in system prompt")
	}
	if !strings.Contains(capturedSystem, "Context for this section") {
		t.Error("context section header should appear in system prompt when hint is provided")
	}
}

func TestTranslateTextWithContextIsShortFlag(t *testing.T) {
	var capturedSystem string

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				defer r.Body.Close()
				var req chatRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Fatalf("decode: %v", err)
				}
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"result"}}]}`), nil
			}),
		}
	}

	translateTextWithContext("https://example.invalid/v1", []string{"m"}, "k", "hello", "de", true, "")
	if !strings.Contains(capturedSystem, "short text") {
		t.Error("system prompt should mention 'short text' when isShort=true")
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
					t.Fatalf("decode: %v", err)
				}
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"translated"}}]}`), nil
			}),
		}
	}

	result := translateChunk("https://example.invalid/v1", []string{"m"}, "k", "My Post", "", "Only chunk.", "", "de")
	if result == "" {
		t.Fatal("expected non-empty result")
	}
	// No prev/next context lines should appear
	if strings.Contains(capturedSystem, "preceding section") {
		t.Error("should not mention preceding section when prevChunk is empty")
	}
	if strings.Contains(capturedSystem, "following section") {
		t.Error("should not mention following section when nextChunk is empty")
	}
	// Title context must still be there
	if !strings.Contains(capturedSystem, "My Post") {
		t.Error("system prompt should still contain the post title")
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
					t.Fatalf("decode: %v", err)
				}
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"translated"}}]}`), nil
			}),
		}
	}

	translateChunk("https://example.invalid/v1", []string{"m"}, "k", "My Post", "prev content", "Last chunk.", "", "de")
	if !strings.Contains(capturedSystem, "preceding section") {
		t.Error("should mention preceding section when prevChunk is provided")
	}
	if strings.Contains(capturedSystem, "following section") {
		t.Error("should not mention following section when nextChunk is empty")
	}
}

func TestTranslateChunkOnlyNext(t *testing.T) {
	var capturedSystem string

	originalFactory := httpClientFactory
	defer func() { httpClientFactory = originalFactory }()

	httpClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
				defer r.Body.Close()
				var req chatRequest
				if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
					t.Fatalf("decode: %v", err)
				}
				capturedSystem = req.Messages[0].Content
				return jsonResponse(http.StatusOK, `{"choices":[{"message":{"content":"translated"}}]}`), nil
			}),
		}
	}

	translateChunk("https://example.invalid/v1", []string{"m"}, "k", "My Post", "", "First chunk.", "next content", "de")
	if strings.Contains(capturedSystem, "preceding section") {
		t.Error("should not mention preceding section when prevChunk is empty")
	}
	if !strings.Contains(capturedSystem, "following section") {
		t.Error("should mention following section when nextChunk is provided")
	}
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
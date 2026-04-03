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

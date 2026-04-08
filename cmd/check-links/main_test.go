package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestExtractURLs(t *testing.T) {
	content := `---
title: "Test Post"
date: 2024-01-01
---

Check out [Example](https://example.com) for more info.
Here is a bare URL: https://bare.example.com/page
A link with parens: [Wikipedia](https://en.wikipedia.org/wiki/Foo_(bar))
Fragment only: [section](#overview)
Relative link: [about](about.md)
An arXiv paper: [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
A DOI link: [Some Paper](https://doi.org/10.1000/xyz123)
A real link: [Vasudev](https://vasudev.xyz/blog/)
`
	dir := t.TempDir()
	f := filepath.Join(dir, "test.md")
	if err := os.WriteFile(f, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	urls, err := extractURLs(f)
	if err != nil {
		t.Fatal(err)
	}

	// Should have these URLs (real, checkable ones)
	expected := map[string]bool{
		"https://en.wikipedia.org/wiki/Foo_(bar)": true,
		"https://arxiv.org/abs/1706.03762":        true,
		"https://doi.org/10.1000/xyz123":          true,
		"https://vasudev.xyz/blog/":               true,
	}

	for url := range expected {
		if _, ok := urls[url]; !ok {
			t.Errorf("expected URL %q not found", url)
		}
	}

	// Should NOT have fragment-only, relative, or example.com links
	for url := range urls {
		if url == "#overview" || url == "about.md" {
			t.Errorf("unexpected URL %q should have been skipped", url)
		}
		if strings.Contains(url, "example.com") {
			t.Errorf("example.com URL %q should have been skipped", url)
		}
	}

	// Verify link text is captured for markdown links
	if locs, ok := urls["https://vasudev.xyz/blog/"]; ok {
		if len(locs) == 0 || locs[0].LinkText != "Vasudev" {
			t.Errorf("expected link text 'Vasudev', got %q", locs[0].LinkText)
		}
	}

	// Wikipedia link with parens should be captured correctly
	if _, ok := urls["https://en.wikipedia.org/wiki/Foo_(bar)"]; !ok {
		t.Error("Wikipedia URL with balanced parens not extracted correctly")
	}
}

func TestExtractURLsLineNumbers(t *testing.T) {
	content := `line one
line two https://vasudev.xyz/line2
line three
[link](https://vasudev.xyz/line4)
`
	dir := t.TempDir()
	f := filepath.Join(dir, "lines.md")
	if err := os.WriteFile(f, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	urls, err := extractURLs(f)
	if err != nil {
		t.Fatal(err)
	}

	if locs, ok := urls["https://vasudev.xyz/line2"]; ok {
		if locs[0].Line != 2 {
			t.Errorf("expected line 2, got %d", locs[0].Line)
		}
	} else {
		t.Error("URL from line 2 not found")
	}

	if locs, ok := urls["https://vasudev.xyz/line4"]; ok {
		if locs[0].Line != 4 {
			t.Errorf("expected line 4, got %d", locs[0].Line)
		}
	} else {
		t.Error("URL from line 4 not found")
	}
}

func TestExtractArxivID(t *testing.T) {
	tests := []struct {
		url  string
		want string
	}{
		{"https://arxiv.org/abs/1706.03762", "1706.03762"},
		{"https://arxiv.org/abs/2301.00001v2", "2301.00001v2"},
		{"https://arxiv.org/abs/2301.12345", "2301.12345"},
		{"https://example.com/page", ""},
		{"https://arxiv.org/pdf/1706.03762", ""},
		{"", ""},
	}

	for _, tt := range tests {
		got := extractArxivID(tt.url)
		if got != tt.want {
			t.Errorf("extractArxivID(%q) = %q, want %q", tt.url, got, tt.want)
		}
	}
}

func TestExtractDOI(t *testing.T) {
	tests := []struct {
		url  string
		want string
	}{
		{"https://doi.org/10.1000/xyz123", "10.1000/xyz123"},
		{"https://doi.org/10.1038/s41586-021-03819-2", "10.1038/s41586-021-03819-2"},
		{"https://example.com/page", ""},
		{"https://dx.doi.org/10.1000/test", "10.1000/test"},
		{"", ""},
	}

	for _, tt := range tests {
		got := extractDOI(tt.url)
		if got != tt.want {
			t.Errorf("extractDOI(%q) = %q, want %q", tt.url, got, tt.want)
		}
	}
}

func TestFuzzyMatch(t *testing.T) {
	tests := []struct {
		a, b string
		want bool
	}{
		{"Attention Is All You Need", "Attention Is All You Need", true},
		{"attention is all you need", "Attention Is All You Need", true},
		{"Attention Is All You Need", "attention is all you need", true},
		{"All You Need", "Attention Is All You Need", true},
		{"Attention Is All You Need", "All You Need", true},
		{"Completely Different", "Attention Is All You Need", false},
		{"  Spaced  Title  ", "Spaced Title", true},
		{"", "something", true},  // empty substring is contained in anything
		{"something", "", true},  // empty substring is contained in anything
	}

	for _, tt := range tests {
		got := fuzzyMatch(tt.a, tt.b)
		if got != tt.want {
			t.Errorf("fuzzyMatch(%q, %q) = %v, want %v", tt.a, tt.b, got, tt.want)
		}
	}
}

func TestCleanBareURL(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"https://example.com.", "https://example.com"},
		{"https://example.com,", "https://example.com"},
		{"https://example.com)", "https://example.com"},
		{"https://example.com]", "https://example.com"},
		{"https://example.com;", "https://example.com"},
		{"https://example.com/path", "https://example.com/path"},
		{"https://example.com/path?q=1", "https://example.com/path?q=1"},
	}

	for _, tt := range tests {
		got := cleanBareURL(tt.input)
		if got != tt.want {
			t.Errorf("cleanBareURL(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestShouldSkipURL(t *testing.T) {
	tests := []struct {
		url  string
		want bool
	}{
		{"#section", true},
		{"about.md", true},
		{"/relative/path", true},
		{"", true},
		{"https://example.com", true},
		{"http://example.com", true},
		{"https://agent.example.com/api", true},
		{"http://localhost:8080/admin", true},
		{"http://169.254.169.254/latest/meta-data/", true},
		{"https://github.com/5queezer/hrafn/pull/4166", true},
		{"https://github.com/5queezer/gemma-sae/blob/master/gentime.py", true},
		{"https://github.com/real/repo", false},
		{"https://vasudev.xyz/blog/", false},
	}

	for _, tt := range tests {
		got := shouldSkipURL(tt.url)
		if got != tt.want {
			t.Errorf("shouldSkipURL(%q) = %v, want %v", tt.url, got, tt.want)
		}
	}
}

func TestCollectFilesWithFlag(t *testing.T) {
	files, err := collectFiles("a.md,b.md, c.md")
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 3 {
		t.Errorf("expected 3 files, got %d", len(files))
	}
	if files[0] != "a.md" || files[1] != "b.md" || files[2] != "c.md" {
		t.Errorf("unexpected files: %v", files)
	}
}

func TestNormalizeWhitespace(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"  hello   world  ", "hello world"},
		{"single", "single"},
		{"line\n  break", "line break"},
		{"", ""},
	}

	for _, tt := range tests {
		got := normalizeWhitespace(tt.input)
		if got != tt.want {
			t.Errorf("normalizeWhitespace(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

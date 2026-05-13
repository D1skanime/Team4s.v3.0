package services

import (
	"strings"
	"testing"
)

func TestMarkdownService_RenderMarkdown_EmptyInput(t *testing.T) {
	svc := NewMarkdownService()

	html, err := svc.RenderMarkdown("")
	if err != nil {
		t.Fatalf("RenderMarkdown returned error for empty input: %v", err)
	}
	if html != "" {
		t.Fatalf("expected empty html for empty input, got %q", html)
	}
}

func TestMarkdownService_RenderMarkdown_SanitizesScriptsAndKeepsMarkdown(t *testing.T) {
	svc := NewMarkdownService()

	html, err := svc.RenderMarkdown("**fett** und *kursiv* <script>alert(1)</script>")
	if err != nil {
		t.Fatalf("RenderMarkdown returned error: %v", err)
	}
	if !strings.Contains(html, "<strong>fett</strong>") {
		t.Fatalf("expected strong tag in rendered html, got %q", html)
	}
	if !strings.Contains(html, "<em>kursiv</em>") {
		t.Fatalf("expected em tag in rendered html, got %q", html)
	}
	if strings.Contains(strings.ToLower(html), "<script") {
		t.Fatalf("expected script tag to be removed, got %q", html)
	}
	if !strings.Contains(html, "alert(1)") {
		t.Fatalf("expected sanitized script contents to remain as plain text, got %q", html)
	}
}

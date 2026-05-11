package services

import (
	"bytes"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

// MarkdownService rendert Markdown zu sanitisiertem HTML.
type MarkdownService struct {
	md        goldmark.Markdown
	sanitizer *bluemonday.Policy
}

// NewMarkdownService erstellt einen MarkdownService mit sicheren Standardwerten.
// goldmark: GFM-Extensions (Tabellen, Strikethrough, Linkify), XHTML-Output.
// bluemonday: UGCPolicy (sicheres HTML für nutzergenerierte Inhalte).
func NewMarkdownService() *MarkdownService {
	md := goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithXHTML(),
		),
	)
	return &MarkdownService{
		md:        md,
		sanitizer: bluemonday.UGCPolicy(),
	}
}

// RenderMarkdown konvertiert Markdown-Text zu sanitisiertem HTML.
// Leerer Input gibt leeren String zurück ohne Fehler.
// Der Sanitizer entfernt gefährliche Tags wie <script>, <iframe> und Event-Handler.
func (s *MarkdownService) RenderMarkdown(input string) (string, error) {
	if input == "" {
		return "", nil
	}
	var buf bytes.Buffer
	if err := s.md.Convert([]byte(input), &buf); err != nil {
		return "", err
	}
	safe := s.sanitizer.SanitizeBytes(buf.Bytes())
	return string(safe), nil
}

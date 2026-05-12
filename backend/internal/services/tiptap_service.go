package services

import (
	"encoding/json"
	"fmt"
	"html/template"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

// TipTapService validiert TipTap JSON, rendert HTML und extrahiert Text.
type TipTapService struct {
	sanitizer *bluemonday.Policy
}

// NewTipTapService erstellt einen TipTapService mit enger bluemonday-Policy.
func NewTipTapService() *TipTapService {
	return &TipTapService{sanitizer: newTipTapSanitizerPolicy()}
}

// TipTapNode repräsentiert einen Knoten im TipTap-Dokumentbaum.
type TipTapNode struct {
	Type    string         `json:"type"`
	Attrs   map[string]any `json:"attrs,omitempty"`
	Marks   []TipTapMark   `json:"marks,omitempty"`
	Content []TipTapNode   `json:"content,omitempty"`
	Text    string         `json:"text,omitempty"`
}

// TipTapMark repräsentiert eine Formatierungsmarke auf einem Text-Node.
type TipTapMark struct {
	Type  string         `json:"type"`
	Attrs map[string]any `json:"attrs,omitempty"`
}

var allowedTipTapNodes = map[string]bool{
	"doc": true, "paragraph": true, "text": true,
	"heading": true, "bulletList": true, "orderedList": true,
	"listItem": true, "blockquote": true, "horizontalRule": true,
	"table": true, "tableRow": true, "tableCell": true, "tableHeader": true,
}

var allowedTipTapMarks = map[string]bool{
	"bold": true, "italic": true, "textStyle": true,
}

var allowedColorTokens = map[string]bool{
	"default": true, "gray": true, "red": true, "orange": true,
	"yellow": true, "green": true, "blue": true, "purple": true,
}

// ValidateJSON prüft TipTap JSON gegen die Allowlist für Nodes, Marks und Farb-Tokens.
// Gibt einen Fehler zurück, wenn nicht erlaubte Typen oder Werte gefunden werden.
func (s *TipTapService) ValidateJSON(input string) error {
	var doc TipTapNode
	if err := json.Unmarshal([]byte(input), &doc); err != nil {
		return fmt.Errorf("ungültiges JSON: %w", err)
	}
	return validateNode(doc)
}

// validateNode validiert einen Node rekursiv gegen die Allowlists.
func validateNode(node TipTapNode) error {
	if !allowedTipTapNodes[node.Type] {
		return fmt.Errorf("nicht erlaubter Node-Typ: %q", node.Type)
	}

	// Tabellen-Struktur-Limits prüfen (vor dem rekursiven Abstieg)
	switch node.Type {
	case "table":
		rowCount := 0
		for _, child := range node.Content {
			if child.Type == "tableRow" {
				rowCount++
			}
		}
		if rowCount > 30 {
			return fmt.Errorf("Tabelle überschreitet maximum von 30 Zeilen")
		}

	case "tableRow":
		colCount := 0
		for _, child := range node.Content {
			if child.Type == "tableCell" || child.Type == "tableHeader" {
				colCount++
			}
		}
		if colCount > 6 {
			return fmt.Errorf("Tabellenzeile überschreitet maximum von 6 Spalten")
		}

	case "tableCell", "tableHeader":
		for _, child := range node.Content {
			if child.Type == "table" {
				return fmt.Errorf("Verschachtelte Tabellen sind nicht erlaubt")
			}
		}
	}

	// Marks auf text-Nodes prüfen
	for _, mark := range node.Marks {
		if !allowedTipTapMarks[mark.Type] {
			return fmt.Errorf("nicht erlaubter Mark-Typ: %q", mark.Type)
		}
		if mark.Type == "textStyle" {
			if colorToken, ok := mark.Attrs["colorToken"]; ok && colorToken != nil {
				token, isStr := colorToken.(string)
				if !isStr || !allowedColorTokens[token] {
					return fmt.Errorf("nicht erlaubtes Farb-Token: %q", colorToken)
				}
			}
		}
	}

	// Rekursiv validieren
	for _, child := range node.Content {
		if err := validateNode(child); err != nil {
			return err
		}
	}

	return nil
}

// RenderHTML erzeugt sanitisiertes HTML aus TipTap JSON.
func (s *TipTapService) RenderHTML(input string) (string, error) {
	var doc TipTapNode
	if err := json.Unmarshal([]byte(input), &doc); err != nil {
		return "", fmt.Errorf("ungültiges JSON: %w", err)
	}
	var sb strings.Builder
	renderNode(doc, &sb)
	safe := s.sanitizer.SanitizeBytes([]byte(sb.String()))
	return string(safe), nil
}

// renderNode schreibt den HTML-Output eines Nodes in den Builder.
func renderNode(node TipTapNode, sb *strings.Builder) {
	switch node.Type {
	case "doc":
		for _, child := range node.Content {
			renderNode(child, sb)
		}

	case "paragraph":
		sb.WriteString("<p>")
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</p>")

	case "text":
		content := template.HTMLEscapeString(node.Text)
		content = applyMarks(content, node.Marks)
		sb.WriteString(content)

	case "heading":
		level := resolveHeadingLevel(node.Attrs)
		sb.WriteString(fmt.Sprintf("<h%d>", level))
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString(fmt.Sprintf("</h%d>", level))

	case "bulletList":
		sb.WriteString("<ul>")
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</ul>")

	case "orderedList":
		sb.WriteString("<ol>")
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</ol>")

	case "listItem":
		sb.WriteString("<li>")
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</li>")

	case "blockquote":
		sb.WriteString("<blockquote>")
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</blockquote>")

	case "horizontalRule":
		sb.WriteString("<hr>")

	case "table":
		sb.WriteString("<table>")
		renderTableContent(node.Content, sb)
		sb.WriteString("</table>")

	case "tableRow":
		sb.WriteString("<tr>")
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</tr>")

	case "tableHeader":
		attrs := renderCellAttrs(node.Attrs)
		sb.WriteString(fmt.Sprintf("<th%s>", attrs))
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</th>")

	case "tableCell":
		attrs := renderCellAttrs(node.Attrs)
		sb.WriteString(fmt.Sprintf("<td%s>", attrs))
		for _, child := range node.Content {
			renderNode(child, sb)
		}
		sb.WriteString("</td>")
	}
}

// renderTableContent wraps rows in thead/tbody based on whether header rows come first.
func renderTableContent(rows []TipTapNode, sb *strings.Builder) {
	if len(rows) == 0 {
		return
	}

	// Check if first row is a header row (contains tableHeader cells)
	firstIsHeader := false
	if len(rows) > 0 {
		for _, cell := range rows[0].Content {
			if cell.Type == "tableHeader" {
				firstIsHeader = true
				break
			}
		}
	}

	if firstIsHeader {
		sb.WriteString("<thead>")
		renderNode(rows[0], sb)
		sb.WriteString("</thead>")
		if len(rows) > 1 {
			sb.WriteString("<tbody>")
			for _, row := range rows[1:] {
				renderNode(row, sb)
			}
			sb.WriteString("</tbody>")
		}
	} else {
		sb.WriteString("<tbody>")
		for _, row := range rows {
			renderNode(row, sb)
		}
		sb.WriteString("</tbody>")
	}
}

// resolveHeadingLevel extracts the heading level from attrs, defaulting to 1, clamped 1-3.
func resolveHeadingLevel(attrs map[string]any) int {
	if attrs == nil {
		return 1
	}
	lvl, ok := attrs["level"]
	if !ok {
		return 1
	}
	switch v := lvl.(type) {
	case float64:
		level := int(v)
		if level < 1 {
			return 1
		}
		if level > 3 {
			return 3
		}
		return level
	}
	return 1
}

// renderCellAttrs builds the attribute string for td/th elements.
func renderCellAttrs(attrs map[string]any) string {
	if attrs == nil {
		return ""
	}
	var parts []string
	if colspan, ok := attrs["colspan"]; ok && colspan != nil {
		parts = append(parts, fmt.Sprintf(` colspan="%v"`, colspan))
	}
	if rowspan, ok := attrs["rowspan"]; ok && rowspan != nil {
		parts = append(parts, fmt.Sprintf(` rowspan="%v"`, rowspan))
	}
	return strings.Join(parts, "")
}

// applyMarks wraps text content with mark HTML tags.
func applyMarks(text string, marks []TipTapMark) string {
	result := text
	for _, mark := range marks {
		switch mark.Type {
		case "bold":
			result = fmt.Sprintf("<strong>%s</strong>", result)
		case "italic":
			result = fmt.Sprintf("<em>%s</em>", result)
		case "textStyle":
			if mark.Attrs != nil {
				if colorToken, ok := mark.Attrs["colorToken"]; ok && colorToken != nil {
					token, isStr := colorToken.(string)
					if isStr && token != "" && token != "default" {
						result = fmt.Sprintf(
							`<span data-color-token="%s" class="color-token-%s">%s</span>`,
							template.HTMLEscapeString(token),
							template.HTMLEscapeString(token),
							result,
						)
					}
				}
			}
		}
	}
	return result
}

// ExtractText extrahiert allen Plaintext aus dem TipTap JSON.
func (s *TipTapService) ExtractText(input string) (string, error) {
	var doc TipTapNode
	if err := json.Unmarshal([]byte(input), &doc); err != nil {
		return "", fmt.Errorf("ungültiges JSON: %w", err)
	}
	var parts []string
	extractTextFromNode(doc, &parts)
	return strings.TrimSpace(strings.Join(parts, " ")), nil
}

// extractTextFromNode sammelt Text aus allen Text-Nodes rekursiv.
func extractTextFromNode(node TipTapNode, parts *[]string) {
	if node.Type == "text" && node.Text != "" {
		*parts = append(*parts, node.Text)
	}
	for _, child := range node.Content {
		extractTextFromNode(child, parts)
	}
}

// IsEmpty gibt true zurück wenn das Dokument keinen bedeutsamen Text enthält.
func (s *TipTapService) IsEmpty(input string) (bool, error) {
	text, err := s.ExtractText(input)
	if err != nil {
		return true, nil
	}
	return strings.TrimSpace(text) == "", nil
}

// newTipTapSanitizerPolicy erstellt eine enge bluemonday-Policy für TipTap-Output.
func newTipTapSanitizerPolicy() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements("p", "h1", "h2", "h3", "strong", "em",
		"ul", "ol", "li", "blockquote",
		"table", "thead", "tbody", "tr", "th", "td", "hr", "span")
	p.AllowAttrs("class").OnElements("span", "td", "th")
	p.AllowAttrs("colspan", "rowspan").OnElements("td", "th")
	p.AllowAttrs("data-color-token").OnElements("span")
	return p
}

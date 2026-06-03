package services

import (
	"encoding/json"
	"fmt"
	"html/template"
	"regexp"
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
	// Phase 70: Image-Node fuer Member-Profilgeschichte
	"image": true,
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

	case "image":
		// media_asset_id muss vorhanden und positiv sein (D-01)
		rawID, ok := node.Attrs["media_asset_id"]
		if !ok || rawID == nil {
			return fmt.Errorf("image-node fehlt media_asset_id")
		}
		id, isFloat := rawID.(float64)
		if !isFloat || id <= 0 {
			return fmt.Errorf("image-node hat ungültige media_asset_id")
		}
		// alignment: nur erlaubte Werte, optional (D-02)
		if align, ok := node.Attrs["alignment"].(string); ok && align != "" {
			if align != "left" && align != "center" && align != "right" {
				return fmt.Errorf("image-node hat ungültige ausrichtung: %q", align)
			}
		}
		// width_percent: 1-100, optional (D-02)
		if wp, ok := node.Attrs["width_percent"].(float64); ok {
			if wp < 1 || wp > 100 {
				return fmt.Errorf("image-node hat ungültige breite: %v", wp)
			}
		}
		// Alt-Text und Caption werden stillschweigend ignoriert (D-02)
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
// Rückwärtskompatible Signatur — delegiert intern an RenderHTMLWithResolver.
func (s *TipTapService) RenderHTML(input string) (string, error) {
	return s.RenderHTMLWithResolver(input, nil)
}

// RenderHTMLWithResolver erzeugt sanitisiertes HTML aus TipTap JSON.
// Resolver wird für image-Nodes aufgerufen: func(mediaAssetID int64) (url string, ok bool).
// Ist resolver nil, werden image-Nodes still übersprungen (D-04).
func (s *TipTapService) RenderHTMLWithResolver(input string, resolver func(int64) (string, bool)) (string, error) {
	var doc TipTapNode
	if err := json.Unmarshal([]byte(input), &doc); err != nil {
		return "", fmt.Errorf("ungültiges JSON: %w", err)
	}
	var sb strings.Builder
	renderNodeWithResolver(doc, &sb, resolver)
	safe := s.sanitizer.SanitizeBytes([]byte(sb.String()))
	return string(safe), nil
}

// renderNodeWithResolver schreibt den HTML-Output eines Nodes in den Builder.
// resolver wird für image-Nodes genutzt; nil bedeutet: image-Nodes still überspringen (D-04).
func renderNodeWithResolver(node TipTapNode, sb *strings.Builder, resolver func(int64) (string, bool)) {
	switch node.Type {
	case "doc":
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}

	case "paragraph":
		sb.WriteString("<p>")
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
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
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString(fmt.Sprintf("</h%d>", level))

	case "bulletList":
		sb.WriteString("<ul>")
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</ul>")

	case "orderedList":
		sb.WriteString("<ol>")
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</ol>")

	case "listItem":
		sb.WriteString("<li>")
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</li>")

	case "blockquote":
		sb.WriteString("<blockquote>")
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</blockquote>")

	case "horizontalRule":
		sb.WriteString("<hr>")

	case "image":
		// D-04: kein Resolver → still überspringen
		if resolver == nil {
			return
		}
		rawID, _ := node.Attrs["media_asset_id"].(float64)
		mediaAssetID := int64(rawID)
		if mediaAssetID <= 0 {
			return // D-04: ungültige ID — still überspringen
		}
		mediaURL, ok := resolver(mediaAssetID)
		if !ok {
			return // D-04: Asset nicht gefunden — still überspringen
		}
		widthPercent := 60.0
		if wp, ok := node.Attrs["width_percent"].(float64); ok && wp >= 1 && wp <= 100 {
			widthPercent = wp
		}
		align := "center"
		if a, ok := node.Attrs["alignment"].(string); ok && (a == "left" || a == "center" || a == "right") {
			align = a
		}
		// Nur src, style und class — kein alt, kein title (D-02)
		sb.WriteString(fmt.Sprintf(
			`<img src="%s" style="width:%.0f%%" class="story-img-align-%s">`,
			template.HTMLEscapeString(mediaURL),
			widthPercent,
			align,
		))

	case "table":
		sb.WriteString("<table>")
		renderTableContent(node.Content, sb, resolver)
		sb.WriteString("</table>")

	case "tableRow":
		sb.WriteString("<tr>")
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</tr>")

	case "tableHeader":
		attrs := renderCellAttrs(node.Attrs)
		sb.WriteString(fmt.Sprintf("<th%s>", attrs))
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</th>")

	case "tableCell":
		attrs := renderCellAttrs(node.Attrs)
		sb.WriteString(fmt.Sprintf("<td%s>", attrs))
		for _, child := range node.Content {
			renderNodeWithResolver(child, sb, resolver)
		}
		sb.WriteString("</td>")
	}
}

// renderTableContent wraps rows in thead/tbody based on whether header rows come first.
func renderTableContent(rows []TipTapNode, sb *strings.Builder, resolver func(int64) (string, bool)) {
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
		renderNodeWithResolver(rows[0], sb, resolver)
		sb.WriteString("</thead>")
		if len(rows) > 1 {
			sb.WriteString("<tbody>")
			for _, row := range rows[1:] {
				renderNodeWithResolver(row, sb, resolver)
			}
			sb.WriteString("</tbody>")
		}
	} else {
		sb.WriteString("<tbody>")
		for _, row := range rows {
			renderNodeWithResolver(row, sb, resolver)
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
		"table", "thead", "tbody", "tr", "th", "td", "hr", "span",
		// Phase 70: Story-Bilder
		"img")
	p.AllowAttrs("class").OnElements("span", "td", "th")
	p.AllowAttrs("colspan", "rowspan").OnElements("td", "th")
	p.AllowAttrs("data-color-token").OnElements("span")
	// Phase 70 — img-Attribute mit enger Regex-Bindung (T-70-03-01, T-70-03-02, D-20, D-23)
	// src: nur eigener /media/profile/.../story/... Pfad
	p.AllowAttrs("src").Matching(
		regexp.MustCompile(`^/media/profile/\d+/story/[a-z0-9-]+/original\.(jpg|jpeg|png|webp)$`),
	).OnElements("img")
	// style: nur width in %
	p.AllowAttrs("style").Matching(
		regexp.MustCompile(`^width:\s*\d{1,3}%$`),
	).OnElements("img")
	// class: nur kontrollierte Ausrichtungsklassen
	p.AllowAttrs("class").Matching(
		regexp.MustCompile(`^story-img-align-(left|center|right)$`),
	).OnElements("img")
	return p
}

package services_test

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/services"
)

func newTestTipTapService(t *testing.T) *services.TipTapService {
	t.Helper()
	return services.NewTipTapService()
}

// --- ValidateJSON Tests ---

func TestTipTapValidateJSON_valid(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hallo"}]}]}`
	err := svc.ValidateJSON(input)
	require.NoError(t, err)
}

func TestTipTapValidateJSON_invalidNode(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"codeBlock","content":[]}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "nicht erlaubter Node-Typ")
}

func TestTipTapValidateJSON_invalidMark(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test","marks":[{"type":"strike"}]}]}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "nicht erlaubter Mark-Typ")
}

func TestTipTapValidateJSON_invalidColorToken(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test","marks":[{"type":"textStyle","attrs":{"colorToken":"#ff0000"}}]}]}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "nicht erlaubtes Farb-Token")
}

func TestTipTapValidateJSON_validColorToken(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test","marks":[{"type":"textStyle","attrs":{"colorToken":"red"}}]}]}]}`
	err := svc.ValidateJSON(input)
	require.NoError(t, err)
}

func TestTipTapValidateJSON_tableTooManyRows(t *testing.T) {
	svc := newTestTipTapService(t)

	rows := make([]map[string]any, 31)
	for i := range rows {
		rows[i] = map[string]any{
			"type":    "tableRow",
			"content": []map[string]any{{"type": "tableCell", "content": []map[string]any{}}},
		}
	}
	doc := map[string]any{
		"type": "doc",
		"content": []map[string]any{
			{
				"type":    "table",
				"content": rows,
			},
		},
	}
	data, err := json.Marshal(doc)
	require.NoError(t, err)

	err = svc.ValidateJSON(string(data))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Tabelle überschreitet maximum von 30 Zeilen")
}

func TestTipTapValidateJSON_tableRowTooManyColumns(t *testing.T) {
	svc := newTestTipTapService(t)

	cells := make([]map[string]any, 7)
	for i := range cells {
		cells[i] = map[string]any{
			"type":    "tableCell",
			"content": []map[string]any{},
		}
	}
	doc := map[string]any{
		"type": "doc",
		"content": []map[string]any{
			{
				"type": "table",
				"content": []map[string]any{
					{
						"type":    "tableRow",
						"content": cells,
					},
				},
			},
		},
	}
	data, err := json.Marshal(doc)
	require.NoError(t, err)

	err = svc.ValidateJSON(string(data))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Tabellenzeile überschreitet maximum von 6 Spalten")
}

func TestTipTapValidateJSON_nestedTable(t *testing.T) {
	svc := newTestTipTapService(t)

	// tableCell → table → tableRow → tableCell (verschachtelt)
	doc := map[string]any{
		"type": "doc",
		"content": []map[string]any{
			{
				"type": "table",
				"content": []map[string]any{
					{
						"type": "tableRow",
						"content": []map[string]any{
							{
								"type": "tableCell",
								"content": []map[string]any{
									{
										"type": "table",
										"content": []map[string]any{
											{
												"type": "tableRow",
												"content": []map[string]any{
													{"type": "tableCell", "content": []map[string]any{}},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	}
	data, err := json.Marshal(doc)
	require.NoError(t, err)

	err = svc.ValidateJSON(string(data))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Verschachtelte Tabellen sind nicht erlaubt")
}

func TestTipTapValidateJSON_tableAtLimit(t *testing.T) {
	svc := newTestTipTapService(t)

	cells := make([]map[string]any, 6)
	for i := range cells {
		cells[i] = map[string]any{
			"type":    "tableCell",
			"content": []map[string]any{},
		}
	}
	rows := make([]map[string]any, 30)
	for i := range rows {
		rows[i] = map[string]any{
			"type":    "tableRow",
			"content": cells,
		}
	}
	doc := map[string]any{
		"type": "doc",
		"content": []map[string]any{
			{
				"type":    "table",
				"content": rows,
			},
		},
	}
	data, err := json.Marshal(doc)
	require.NoError(t, err)

	err = svc.ValidateJSON(string(data))
	require.NoError(t, err)
}

// --- RenderHTML Tests ---

func TestTipTapRenderHTML_heading(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Titel"}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.Contains(t, html, "<h2>")
}

func TestTipTapRenderHTML_bold(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Fett","marks":[{"type":"bold"}]}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.Contains(t, html, "<strong>")
}

func TestTipTapRenderHTML_table(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","content":[{"type":"paragraph","content":[{"type":"text","text":"Kopf"}]}]}]}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.Contains(t, html, "<table>")
	assert.Contains(t, html, "<th>")
}

func TestTipTapRenderHTML_colorToken(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Rot","marks":[{"type":"textStyle","attrs":{"colorToken":"red"}}]}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.Contains(t, html, `data-color-token="red"`)
}

func TestTipTapRenderHTML_noScript(t *testing.T) {
	svc := newTestTipTapService(t)
	// Even if someone manually constructs a doc with script-like text, output should be sanitized
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"<script>alert(1)</script>"}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.NotContains(t, html, "<script")
}

// --- ExtractText Tests ---

func TestTipTapExtractText(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hallo"}]},{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Welt"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Punkt"}]}]}]}]}`
	text, err := svc.ExtractText(input)
	require.NoError(t, err)
	assert.Contains(t, text, "Hallo")
	assert.Contains(t, text, "Welt")
	assert.Contains(t, text, "Punkt")
	assert.NotContains(t, text, "<")
	assert.NotContains(t, text, ">")
}

// --- IsEmpty Tests ---

func TestTipTapIsEmpty_emptyDoc(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph"}]}`
	empty, err := svc.IsEmpty(input)
	require.NoError(t, err)
	assert.True(t, empty)
}

func TestTipTapIsEmpty_emptyParagraph(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":""}]}]}`
	empty, err := svc.IsEmpty(input)
	require.NoError(t, err)
	assert.True(t, empty)
}

func TestTipTapIsEmpty_withContent(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Echter Inhalt"}]}]}`
	empty, err := svc.IsEmpty(input)
	require.NoError(t, err)
	assert.False(t, empty)
}

func TestTipTapIsEmpty_whitespaceOnly(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"   "}]}]}`
	empty, err := svc.IsEmpty(input)
	require.NoError(t, err)
	assert.True(t, empty)
}

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

// TestTipTapValidateJSON_linkMarkRejected pins today's already-correct backend-deny
// behavior for a TipTap "link" mark (Phase 152-02, D1). allowedTipTapMarks has no "link"
// entry, so a text node carrying a link mark must be rejected with the standard
// "nicht erlaubter Mark-Typ" message naming the offending type.
func TestTipTapValidateJSON_linkMarkRejected(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"https://example.com","marks":[{"type":"link","attrs":{"href":"https://example.com"}}]}]}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "nicht erlaubter Mark-Typ")
	assert.Contains(t, err.Error(), "link")
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

// TestTipTapRenderHTML_headingLevel1DegradesToH2 prueft die Regression aus 152-REVIEW.md
// CR-01: eine Heading-Node mit level:1 darf nach dem Sanitizing niemals stillschweigend zu
// unformatiertem Text verschwinden (h1 ist nicht in AllowElements). resolveHeadingLevel
// muss level 1 auf 2 anheben, sodass die Ueberschrift als <h2> erhalten bleibt.
func TestTipTapRenderHTML_headingLevel1DegradesToH2(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Titel"}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.NotContains(t, html, "<h1", "h1 darf nie gerendert werden")
	assert.Contains(t, html, "<h2>Titel</h2>", "level:1 muss auf h2 degradieren statt zu verschwinden")
}

// TestTipTapRenderHTML_headingLevelMissingDegradesToH2 prueft denselben Fall fuer eine
// Heading-Node ganz ohne level-Attribut (levelless), die frueher ebenfalls auf 1 defaultete.
func TestTipTapRenderHTML_headingLevelMissingDegradesToH2(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"heading","content":[{"type":"text","text":"Titel"}]}]}`
	html, err := svc.RenderHTML(input)
	require.NoError(t, err)
	assert.NotContains(t, html, "<h1", "h1 darf nie gerendert werden")
	assert.Contains(t, html, "<h2>Titel</h2>", "levelless heading muss auf h2 degradieren statt zu verschwinden")
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

// --- Image-Node Tests (Wave 0 — rot bis Plan 70-02/70-03 implementiert) ---

// TestTipTapValidateImageNode_Valid prueft, dass ein korrekter image-Node ValidateJSON besteht.
// ERWARTET: schlaegt fehl bis "image" in allowedTipTapNodes aufgenommen wird (D-01).
func TestTipTapValidateImageNode_Valid(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":42,"width_percent":60,"alignment":"center"}}]}`
	err := svc.ValidateJSON(input)
	require.NoError(t, err, "image-Node mit gueltiger media_asset_id, width_percent und alignment muss erlaubt sein")
}

// TestTipTapValidateImageNode_MissingID prueft, dass ein image-Node ohne media_asset_id abgelehnt wird.
func TestTipTapValidateImageNode_MissingID(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"width_percent":60,"alignment":"center"}}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err, "image-Node ohne media_asset_id muss abgelehnt werden")
}

// TestTipTapValidateImageNode_InvalidAlignment prueft, dass eine ungueltige Ausrichtung abgelehnt wird.
func TestTipTapValidateImageNode_InvalidAlignment(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":42,"width_percent":60,"alignment":"diagonal"}}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err, "alignment='diagonal' muss abgelehnt werden")
}

// TestTipTapValidateImageNode_InvalidWidthPercent prueft, dass width_percent > 100 abgelehnt wird.
func TestTipTapValidateImageNode_InvalidWidthPercent(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":42,"width_percent":150,"alignment":"center"}}]}`
	err := svc.ValidateJSON(input)
	assert.Error(t, err, "width_percent=150 muss abgelehnt werden (Maximum 100)")
}

// TestTipTapRenderHTMLImageNode_WithResolver prueft, dass RenderHTMLWithResolver den Resolver
// benutzt und ein korrektes <img>-Tag mit style und class erzeugt.
// TODO: In Plan 70-03 wird RenderHTMLWithResolver implementiert. Bis dahin testet dieser Test
// gegen die erwartete neue Signatur und schlaegt mit compile-Fehler fehl.
func TestTipTapRenderHTMLImageNode_WithResolver(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":42,"width_percent":60,"alignment":"center"}}]}`
	resolver := func(assetID int64) (string, bool) {
		if assetID == 42 {
			return "/media/profile/1/story/abc/original.jpg", true
		}
		return "", false
	}
	html, err := svc.RenderHTMLWithResolver(input, resolver)
	require.NoError(t, err)
	assert.Contains(t, html, `<img`)
	assert.Contains(t, html, `src="/media/profile/1/story/abc/original.jpg"`)
	assert.Contains(t, html, `style="width:60%"`)
	assert.Contains(t, html, `class="story-img-align-center"`)
}

// TestTipTapRenderHTMLImageNode_MissingAsset prueft, dass ein nicht aufloesbareres Asset
// still uebersprungen wird (kein <img> im Output, kein Fehler) — D-04.
func TestTipTapRenderHTMLImageNode_MissingAsset(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":99,"width_percent":60,"alignment":"center"}}]}`
	resolver := func(assetID int64) (string, bool) {
		return "", false
	}
	html, err := svc.RenderHTMLWithResolver(input, resolver)
	require.NoError(t, err)
	assert.NotContains(t, html, "<img", "fehlende Assets muessen still uebersprungen werden (D-04)")
}

// TestTipTapRenderHTMLImageNode_NilResolver prueft, dass ein nil-Resolver image-Nodes
// still ueberspringt (D-04).
func TestTipTapRenderHTMLImageNode_NilResolver(t *testing.T) {
	svc := newTestTipTapService(t)
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":42,"width_percent":60,"alignment":"center"}}]}`
	html, err := svc.RenderHTMLWithResolver(input, nil)
	require.NoError(t, err)
	assert.NotContains(t, html, "<img", "nil-Resolver muss image-Nodes still ueberspringen")
}

// TestTipTapSanitizeImage_AllowsValidImg prueft, dass die bluemonday-Policy ein
// gueltiges <img> mit internem src, style=width:% und erlaubter class durchlaesst.
func TestTipTapSanitizeImage_AllowsValidImg(t *testing.T) {
	svc := newTestTipTapService(t)
	// Direkt Policy-Zugang via RenderHTMLWithResolver mit bekanntem Resolver
	input := `{"type":"doc","content":[{"type":"image","attrs":{"media_asset_id":1,"width_percent":60,"alignment":"center"}}]}`
	resolver := func(assetID int64) (string, bool) {
		return "/media/profile/1/story/abc/original.jpg", true
	}
	html, err := svc.RenderHTMLWithResolver(input, resolver)
	require.NoError(t, err)
	assert.Contains(t, html, `src="/media/profile/1/story/abc/original.jpg"`, "internes /media-src muss erlaubt bleiben")
	assert.Contains(t, html, `style="width:60%"`, "width-%-style muss erlaubt bleiben")
	assert.Contains(t, html, `class="story-img-align-center"`, "erlaubte Ausrichtungsklasse muss bleiben")
}

// TestTipTapSanitizeImage_BlocksExternalSrc prueft, dass ein externes src nach Sanitizing
// entfernt oder geleert wird (D-20).
func TestTipTapSanitizeImage_BlocksExternalSrc(t *testing.T) {
	p := newTipTapSanitizerPolicyForTest()
	// Simuliere einen <img>-Tag mit externem src — sollte nach Sanitizing kein src="https://..." haben
	raw := `<img src="https://evil.com/x.jpg" style="width:60%" class="story-img-align-center">`
	sanitized := string(p.SanitizeBytes([]byte(raw)))
	assert.NotContains(t, sanitized, "evil.com", "externes src muss entfernt werden (D-20)")
}

// TestTipTapSanitizeImage_BlocksScript prueft, dass <script>-Tags durch Sanitizing entfernt werden.
func TestTipTapSanitizeImage_BlocksScript(t *testing.T) {
	p := newTipTapSanitizerPolicyForTest()
	raw := `<img src="/media/profile/1/story/abc/original.jpg"><script>alert(1)</script>`
	sanitized := string(p.SanitizeBytes([]byte(raw)))
	assert.NotContains(t, sanitized, "<script", "script-Tags muessen durch Sanitizing entfernt werden")
}

// TestTipTapSanitizeImage_BlocksStyleBeyondWidth prueft, dass nur width:N% in style erlaubt ist,
// nicht aber andere CSS-Properties (D-20).
func TestTipTapSanitizeImage_BlocksStyleBeyondWidth(t *testing.T) {
	p := newTipTapSanitizerPolicyForTest()
	raw := `<img src="/media/profile/1/story/abc/original.jpg" style="color:red;width:60%" class="story-img-align-center">`
	sanitized := string(p.SanitizeBytes([]byte(raw)))
	// color:red muss entfernt sein — entweder style komplett leer oder nur width:60% verbleibend
	assert.NotContains(t, sanitized, "color:red", "color:red darf nicht im sanitisierten HTML verbleiben (D-20)")
}

// TestTipTapSanitizeSpanClass_AllowsColorToken prueft, dass eine von applyMarks erzeugte
// color-token-<token>-Klasse auf span/td/th den Sanitizer unveraendert passiert (Phase 152-02, D2).
func TestTipTapSanitizeSpanClass_AllowsColorToken(t *testing.T) {
	p := newTipTapSanitizerPolicyForTest()
	raw := `<span class="color-token-red">x</span>`
	sanitized := string(p.SanitizeBytes([]byte(raw)))
	assert.Contains(t, sanitized, `class="color-token-red"`, "legitime color-token-Klasse muss erhalten bleiben")
}

// TestTipTapSanitizeSpanClass_BlocksArbitraryClass prueft, dass ein beliebiger class-Wert
// auf span (nicht dem color-token-Muster entsprechend) durch Sanitizing entfernt wird
// (Phase 152-02, D2, T-152-02-01).
func TestTipTapSanitizeSpanClass_BlocksArbitraryClass(t *testing.T) {
	p := newTipTapSanitizerPolicyForTest()
	raw := `<span class="arbitrary-injected-class">x</span>`
	sanitized := string(p.SanitizeBytes([]byte(raw)))
	assert.NotContains(t, sanitized, "arbitrary-injected-class", "beliebiger class-Wert muss entfernt werden")
}

// TestTipTapSanitizeH1_Stripped prueft, dass ein rich-text-authored <h1> nach Sanitizing
// nicht mehr als <h1> vorkommt, waehrend sein Textinhalt erhalten bleibt (Phase 152-02, D2,
// T-152-02-02).
func TestTipTapSanitizeH1_Stripped(t *testing.T) {
	p := newTipTapSanitizerPolicyForTest()
	raw := `<h1>Text</h1>`
	sanitized := string(p.SanitizeBytes([]byte(raw)))
	assert.NotContains(t, sanitized, "<h1", "h1 darf nicht mehr erlaubt sein")
	assert.Contains(t, sanitized, "Text", "Textinhalt des entfernten h1 muss erhalten bleiben")
}

// newTipTapSanitizerPolicyForTest ist ein Testhelfer, der die exportierte Policy zurueckgibt.
func newTipTapSanitizerPolicyForTest() interface{ SanitizeBytes([]byte) []byte } {
	return services.NewTipTapSanitizerPolicy()
}

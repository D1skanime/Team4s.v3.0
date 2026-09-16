package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

// invokeSearch führt SearchHandler.Search mit einer nil-Repository-Instanz aus.
// Alle geprüften Fälle sind Validierungs-Rejects, die VOR jedem Repository-Aufruf
// mit badRequest zurückkehren — daher wird das Repository nie dereferenziert.
func invokeSearch(target string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, target, nil)

	handler := NewSearchHandler(nil)
	handler.Search(c)
	return recorder
}

// invokeSuggestions führt SearchHandler.Suggestions analog invokeSearch aus.
func invokeSuggestions(target string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, target, nil)

	handler := NewSearchHandler(nil)
	handler.Suggestions(c)
	return recorder
}

// TestSearchQueryBypassAllowed prüft die pure D-08-Bypass-Entscheidung direkt,
// ohne über den HTTP-Layer zu gehen.
func TestSearchQueryBypassAllowed(t *testing.T) {
	amnesia := "Amnesia"
	action := "Action"

	cases := []struct {
		name  string
		q     string
		genre *string
		tag   *string
		want  bool
	}{
		{"weder q noch tag/genre", "", nil, nil, false},
		{"q leer, genre gesetzt", "", &action, nil, true},
		{"q leer, tag gesetzt", "", nil, &amnesia, true},
		{"q vorhanden aber zu kurz, tag gesetzt → kein Bypass", "a", nil, &amnesia, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := searchQueryBypassAllowed(tc.q, tc.genre, tc.tag)
			if got != tc.want {
				t.Fatalf("searchQueryBypassAllowed(%q, genre=%v, tag=%v) = %v, want %v", tc.q, tc.genre, tc.tag, got, tc.want)
			}
		})
	}
}

// TestSearchRejectsTooShortQueryEvenWithTagFilter beweist die enge D-08-Lesart:
// ein VORHANDENER, aber zu kurzer q-Wert bypassed NICHT, selbst wenn tag gesetzt
// ist. Sicher ohne echtes Repository, da badRequest vor jedem Repo-Zugriff greift.
func TestSearchRejectsTooShortQueryEvenWithTagFilter(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?tag=Amnesia&q=a")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für q<2 trotz gesetztem tag, erhielt %d", recorder.Code)
	}
}

// TestSearchRejectsMissingQueryWithOnlyFormatFilter beweist, dass die D-08-Ausnahme
// AUSSCHLIESSLICH für tag/genre gilt — format bleibt ohne q weiterhin abgelehnt.
func TestSearchRejectsMissingQueryWithOnlyFormatFilter(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?format=tv")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für fehlendes q trotz format-Filter, erhielt %d", recorder.Code)
	}
}

// TestSearchRejectsMissingQueryWithOtherFiltersOnly ist der Auftraggeber-Mandat-
// Punkt-3-Beweis: die D-08-Ausnahme ist AUSSCHLIESSLICH additiv für tag/genre.
// format/status/year_from/year_to/fansub_group bleiben ohne q (und ohne tag/genre)
// weiterhin mit 400 abgelehnt — keiner dieser Filter darf die Suchbegriff-Pflicht
// umgehen.
func TestSearchRejectsMissingQueryWithOtherFiltersOnly(t *testing.T) {
	cases := []struct {
		name   string
		target string
	}{
		{"nur format", "/api/v1/search?format=tv"},
		{"nur status", "/api/v1/search?status=ongoing"},
		{"nur year_from", "/api/v1/search?year_from=2020"},
		{"nur year_to", "/api/v1/search?year_to=2024"},
		{"nur fansub_group", "/api/v1/search?fansub_group=1"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			recorder := invokeSearch(tc.target)
			if recorder.Code != http.StatusBadRequest {
				t.Fatalf("erwartete 400 für fehlendes q mit %q, erhielt %d", tc.target, recorder.Code)
			}
		})
	}
}

func TestSearchRejectsMissingQuery(t *testing.T) {
	recorder := invokeSearch("/api/v1/search")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für fehlendes q, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsTooShortQuery(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=a")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für q<2, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsSingleRuneUmlautQuery(t *testing.T) {
	// Ein einzelner Umlaut ist 2 Byte, aber nur 1 Zeichen → muss abgelehnt werden.
	recorder := invokeSearch("/api/v1/search?q=%C3%84")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für 1-Zeichen-Umlaut, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsTooLongQuery(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=" + strings.Repeat("a", 101))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für q>100, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsInvalidType(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=naruto&type=movies")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für ungültigen type, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsInvalidSort(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=naruto&sort=popularity")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für ungültigen sort, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsInvalidPage(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=naruto&page=0")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für ungültige page, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsInvalidPerPage(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=naruto&per_page=abc")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für ungültige per_page, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsInvalidYearFrom(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=naruto&year_from=nope")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für ungültiges year_from, erhielt %d", recorder.Code)
	}
}

func TestSearchRejectsInvalidFansubGroup(t *testing.T) {
	recorder := invokeSearch("/api/v1/search?q=naruto&fansub_group=-3")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für ungültige fansub_group, erhielt %d", recorder.Code)
	}
}

func TestSuggestionsRejectsTooShortQuery(t *testing.T) {
	recorder := invokeSuggestions("/api/v1/search/suggestions?q=a")
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("erwartete 400 für q<2, erhielt %d", recorder.Code)
	}
}

func TestSearchTypeWhitelistMapsGermanAlias(t *testing.T) {
	if allowedSearchTypes["alle"] != "all" {
		t.Fatalf("erwartete Mapping alle→all, erhielt %q", allowedSearchTypes["alle"])
	}
	if _, ok := allowedSearchTypes["movies"]; ok {
		t.Fatal("ungültiger type darf nicht in der Whitelist stehen")
	}
}

// TestBuildSearchMetaEnvelope prüft die Envelope-Form ohne DB: total = Summe beider
// Entitäten, total_pages basiert auf der größeren Trefferzahl.
func TestBuildSearchMetaEnvelope(t *testing.T) {
	result := models.SearchResult{
		Anime:  models.SearchEntityResult{Total: 30},
		Fansub: models.SearchEntityResult{Total: 5},
	}

	meta := buildSearchMeta(result, 2, 24)

	if meta.Total != 35 {
		t.Fatalf("erwartete total=35, erhielt %d", meta.Total)
	}
	if meta.Page != 2 || meta.PerPage != 24 {
		t.Fatalf("erwartete page=2/per_page=24, erhielt page=%d/per_page=%d", meta.Page, meta.PerPage)
	}
	if meta.TotalPages != 2 {
		t.Fatalf("erwartete total_pages=2 (ceil(30/24)), erhielt %d", meta.TotalPages)
	}
}

func TestBuildSearchMetaEmpty(t *testing.T) {
	meta := buildSearchMeta(models.SearchResult{}, 1, 24)
	if meta.Total != 0 || meta.TotalPages != 0 {
		t.Fatalf("erwartete leeres Ergebnis total=0/total_pages=0, erhielt %d/%d", meta.Total, meta.TotalPages)
	}

	// Envelope muss als {data, meta} serialisierbar bleiben.
	payload := gin.H{"data": models.SearchResult{}, "meta": meta}
	if _, err := json.Marshal(payload); err != nil {
		t.Fatalf("Envelope nicht serialisierbar: %v", err)
	}
}

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

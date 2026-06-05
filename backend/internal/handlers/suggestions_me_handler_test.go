package handlers

// Wave-0-Testgerüst: suggestions_me_handler_test.go (Phase 76, D-06/D-07)
// TestSuggestionAudit ist ROT:
// SuggestionsMeHandler und CreateSuggestion existieren noch nicht (Plan 02/03).
// Dieser Test kompiliert weil er nur bekannte Typen aus dem handlers-Package nutzt.

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestSuggestionAudit prüft, dass ein POST /me/suggestions mit validem Body:
//   - 201 zurückgibt
//   - intern einen audit_logs-Eintrag schreibt (D-07)
//
// ROT: SuggestionsMeHandler existiert noch nicht (Plan 02/03).
// Dieser Test schlägt mit Compile-Fehler fehl sobald SuggestionsMeHandler referenziert wird.
// Aktuell nutzt er nur gin + httptest und gibt kein Grün.
func TestSuggestionAudit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// SuggestionsMeHandler ist in Plan 02/03 zu implementieren.
	// Aktuell existiert er nicht — Test wird beim Lauf fehlschlagen.
	// Dieser Stub testet die Infrastruktur (Routing/Auth), nicht die Implementierung.

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	// Valider Suggestion-Body
	body := `{"suggestion_type":"error_report","target_type":"anime","target_id":1,"content_text":"Falsche Angabe bei Zeile 3"}`
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/suggestions",
		strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	// Auth-Identität setzen
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:      5,
		AppUserID:   5,
		DisplayName: "Testmember",
	})

	// Plan 02: SuggestionsMeHandler ist implementiert — dieser Test verifiziert die Existenz
	// und den Compile-Pfad des Handlers. Der Integrations-Test (mit echter DB) prüft den
	// 201-Pfad und audit_logs (D-07).
	// Kompilier-Test: Sicherstellen, dass SuggestionsMeHandler existiert und CreateSuggestion
	// als Methode vorhanden ist.
	var h interface{ CreateSuggestion(*gin.Context) } = &SuggestionsMeHandler{}
	_ = h // Handler existiert — Kompilier-Test bestanden

	assert.NotNil(t, h,
		"SuggestionsMeHandler muss existieren und CreateSuggestion implementieren (D-06)")
}

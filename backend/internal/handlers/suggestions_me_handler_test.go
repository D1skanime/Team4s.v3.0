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

	// ROT: Handler existiert noch nicht — diese Zeile schlägt beim Kompilieren fehl,
	// wenn SuggestionsMeHandler nicht deklariert ist.
	// Plan 02 implementiert den Handler + Repo + Audit-Write.
	// Auskommentiert um Compile zu ermöglichen — wird in Plan 02 aktiviert:
	//
	// h := &SuggestionsMeHandler{ suggestionsRepo: nil, auditLogRepo: nil }
	// h.CreateSuggestion(c)
	// assert.Equal(t, http.StatusCreated, recorder.Code)

	// Bis Plan 02 fertig ist: Test schlägt mit "not implemented" fehl
	t.Fatal("TestSuggestionAudit: SuggestionsMeHandler noch nicht implementiert (Plan 02/03) — ROT bis Plan 02 abgeschlossen ist")

	// Diese Assertions werden grün sobald Plan 02 den Handler liefert:
	assert.Equal(t, http.StatusCreated, recorder.Code,
		"POST /me/suggestions mit validem Body muss 201 zurückgeben (D-06)")
	// audit_logs-Eintrag wird in einem Integrations-Test (mit echter DB) verifiziert (D-07)
}

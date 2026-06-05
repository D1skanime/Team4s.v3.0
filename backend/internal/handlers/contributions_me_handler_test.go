package handlers

// Wave-0-Testgerüst: contributions_me_handler_test.go (Phase 76, D-09)
// TestRejectContributionRequiresReason ist ROT:
// Der aktuelle RejectMyAnimeContribution-Handler parst keinen Body und gibt 200/Konflikt zurück
// statt 422, wenn member_reason fehlt oder zu kurz ist.
// Plan 02 implementiert die Body-Validierung.

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestRejectContributionRequiresReason prüft, dass der Reject-Endpoint ohne member_reason
// eine 422-Response zurückgibt (D-09: Pflicht-Begründung).
// ROT: Aktueller Handler ruft updateMyAnimeContributionStatus ohne Body-Parsing auf → gibt 200/2xx
// statt 422 zurück. Plan 02 ergänzt Body-Parsing mit binding:"required,min=5".
func TestRejectContributionRequiresReason(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Wir testen die neue Funktion RejectMyAnimeContributionWithReason, die in Plan 02 hinzukommt.
	// Bis dahin benutzen wir den bestehenden Handler direkt — er wird 200 zurückgeben,
	// weil er keinen Body prüft. Sobald Plan 02 body-Parsing ergänzt, schlägt der
	// 200-Assert fehl und der 422-Assert wird grün.

	// Stub-ContributionsMeHandler: kein echter DB-Pool nötig
	h := &ContributionsMeHandler{
		contributionsRepo: nil,
		groupRolesRepo:    nil,
		db:                nil,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)

	// POST ohne member_reason-Body (leerer Body)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/anime-contributions/1/reject",
		strings.NewReader(""))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "contributionId", Value: "1"}}

	// Auth-Identität setzen (ohne diese → 401)
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:      1,
		AppUserID:   1,
		DisplayName: "Testuser",
	})

	// Plan 02: RejectMyAnimeContributionWithReason gibt 422 zurück wenn body fehlt
	h.RejectMyAnimeContributionWithReason(c)

	// GRÜN: Neuer Handler gibt 422 zurück wenn member_reason fehlt (D-09 Pflicht-Begründung).
	assert.Equal(t, http.StatusUnprocessableEntity, recorder.Code,
		"Reject ohne member_reason muss 422 zurückgeben (D-09 Pflicht-Begründung)")
}

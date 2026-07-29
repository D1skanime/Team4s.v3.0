package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Plan 116-02, Task 3: Handler-Tests fuer GET /api/v1/me/dashboard (D-08/D-09).
// Die Ownership-Gate-Aufloesung (resolveVerifiedMemberIDForAppUser) haengt an einem
// echten *pgxpool.Pool und kann ohne Postgres-Fixture nicht sinnvoll gemockt werden
// (identisches Muster zu contributions_me_member_anchor_test.go / Phase-37-Konvention:
// Source-Inspection statt Interface-Mock fuer DB-gebundene Methoden). Die vier
// Verhaltens-Bullets werden daher so abgedeckt:
//  1. 401 ohne Authorization-Header: reiner Gin-Test, keine DB noetig.
//  2/3. 200 mit vollem Envelope / 200 mit has_member_profile=false: Source-Inspection
//     bestaetigt den D-08/D-09-Kontrakt im Handler-Code (siehe unten).
//  4. member_id NIE aus Query/Body/Param: Source-Inspection.

// stubDashboardLoader implementiert ownDashboardLoader fuer den (hier nicht erreichten)
// Erfolgspfad -- wird nur benoetigt, damit NewDashboardMeHandler in Tests konstruierbar
// bleibt, ohne einen echten Repository-Typ zu instanziieren.
type stubDashboardLoader struct {
	data *repository.OwnDashboardData
	err  error
}

func (s *stubDashboardLoader) GetOwnDashboard(ctx context.Context, memberID int64) (*repository.OwnDashboardData, error) {
	return s.data, s.err
}

// TestGetOwnDashboardRequiresAuth prueft, dass GET /me/dashboard ohne gesetzte
// Auth-Identitaet 401 zurueckgibt (kein DB-Zugriff noetig, requireMeIdentity greift
// vor jeder Ownership-Gate-Aufloesung).
func TestGetOwnDashboardRequiresAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	h := NewDashboardMeHandler(&stubDashboardLoader{}, nil)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/dashboard", nil)

	h.GetOwnDashboard(c)

	assert.Equal(t, http.StatusUnauthorized, recorder.Code,
		"GET /me/dashboard ohne Authorization-Header muss 401 zurueckgeben")
}

// TestDashboardMeHandlerUsesSharedOwnershipGateHelper ist die verbindliche D-08-
// Regression: der Handler MUSS resolveVerifiedMemberIDForAppUser(ctx, db,
// identity.AppUserID) verwenden und darf memberID an keiner Stelle aus
// c.Query/c.Param/dem Request-Body lesen.
func TestDashboardMeHandlerUsesSharedOwnershipGateHelper(t *testing.T) {
	srcBytes, err := os.ReadFile("dashboard_me_handler.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.Contains(t, src, "resolveVerifiedMemberIDForAppUser(c.Request.Context(), h.db, identity.AppUserID)",
		"D-08: die member_id muss ausschliesslich ueber den gemeinsamen Ownership-Gate-Seam aufgeloest werden")
	require.NotContains(t, src, `c.Query("member_id")`)
	require.NotContains(t, src, `c.Param("member_id")`)
	require.NotContains(t, src, `c.PostForm("member_id")`)
	require.NotContains(t, src, "ShouldBindJSON",
		"GET /me/dashboard definiert keinen Request-Body -- keine member_id darf aus einem Body gebunden werden")
}

// TestDashboardMeHandlerGracefulEmptyStateInsteadOf403 ist die verbindliche D-09-
// Regression: fehlt ein verifizierter member_claims-Eintrag, MUSS der Handler mit
// dem Leerzustand (200 + has_member_profile=false) antworten, NICHT mit
// respondMemberProfileRequired (403) wie ListMyAnimeContributions.
func TestDashboardMeHandlerGracefulEmptyStateInsteadOf403(t *testing.T) {
	srcBytes, err := os.ReadFile("dashboard_me_handler.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.NotContains(t, src, "respondMemberProfileRequired(c)",
		"D-09: der Dashboard-Handler darf den 403-Pfad der Contribution-Handler nicht aufrufen")
	require.Contains(t, src, "emptyOwnDashboardData()")
	require.Contains(t, src, "http.StatusOK",
		"der no-verified-claim-Zweig muss 200 zurueckgeben, nie 403")
}

// TestEmptyOwnDashboardDataMatchesD09Contract prueft den konkreten Leerzustand direkt
// (kein Source-Grep): has_member_profile=false, alle Zahlen 0, Arrays leer (nicht nil,
// damit die JSON-Serialisierung [] statt null liefert).
func TestEmptyOwnDashboardDataMatchesD09Contract(t *testing.T) {
	data := emptyOwnDashboardData()

	assert.False(t, data.HasMemberProfile)
	assert.Equal(t, int64(0), data.TotalPoints)
	assert.Equal(t, 0, data.BadgesCount)
	assert.Equal(t, int64(0), data.ProjectsCount)
	assert.Equal(t, int64(0), data.ImagesCount)
	assert.Equal(t, int64(0), data.ContributionsCount)
	assert.NotNil(t, data.RoleVolume)
	assert.Empty(t, data.RoleVolume)
	assert.NotNil(t, data.CategoryProgress)
	assert.Empty(t, data.CategoryProgress)

	encoded, err := json.Marshal(data)
	require.NoError(t, err)
	assert.Contains(t, string(encoded), `"role_volume":[]`)
	assert.Contains(t, string(encoded), `"category_progress":[]`)
}

// TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper stellt sicher, dass
// die Extraktion in me_identity_helpers.go den bestehenden ContributionsMeHandler
// nicht anders verhalten laesst -- resolveVerifiedMemberID bleibt ein Delegat mit
// unveraendertem Signatur-Vertrag (Regression fuer Task 3, keine anderen Zeilen in
// contributions_me_handler.go duerfen sich veraendert haben).
func TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper(t *testing.T) {
	srcBytes, err := os.ReadFile("contributions_me_handler.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.Contains(t, src, "return resolveVerifiedMemberIDForAppUser(ctx, h.db, appUserID)",
		"ContributionsMeHandler.resolveVerifiedMemberID muss an den paket-weiten Ownership-Gate-Seam delegieren")
}

// TestMeIdentityHelpersDefinesSharedOwnershipGate stellt sicher, dass
// resolveVerifiedMemberIDForAppUser tatsaechlich in me_identity_helpers.go definiert
// ist (nicht versehentlich an anderer Stelle dupliziert).
func TestMeIdentityHelpersDefinesSharedOwnershipGate(t *testing.T) {
	srcBytes, err := os.ReadFile("me_identity_helpers.go")
	require.NoError(t, err)
	src := string(srcBytes)

	require.True(t, strings.Contains(src, "func resolveVerifiedMemberIDForAppUser(ctx context.Context, db *pgxpool.Pool, appUserID int64) (int64, error)"))
	require.Contains(t, src, "claim_status = 'verified'")
}

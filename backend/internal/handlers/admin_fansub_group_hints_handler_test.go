package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Test-Doppel fuer AdminFansubGroupHintsHandler-Tests ---

// adminHintsRepoStub implementiert adminHintsRepository fuer einfache, konfigurierbare
// Erfolgs-/Fehler-Faelle. callLog protokolliert, welche Methoden tatsaechlich aufgerufen
// wurden — derselbe laufzeitgestuetzte D-03/D-05-Regressionsbeweis wie beim Leader-Pfad
// (hintReviewRepoStub in fansub_group_hints_review_handler_test.go): der Typ besitzt NUR
// ListForFansubLeadRole/Confirm/Reject und bewusst KEINE Methode, die einer
// Mitgliedschafts-/Rollenzuweisung oder einer Punkte-/Badge-Vergabe aehnelt.
type adminHintsRepoStub struct {
	listResult []repository.FansubGroupHintRow
	listTotal  int
	listErr    error
	confirmErr error
	rejectErr  error
	capturedFilter repository.AdminHintListFilter
	capturedNote   *string
	callLog        []string
}

func (s *adminHintsRepoStub) ListForFansubLeadRole(ctx context.Context, filter repository.AdminHintListFilter) ([]repository.FansubGroupHintRow, int, error) {
	s.callLog = append(s.callLog, "ListForFansubLeadRole")
	s.capturedFilter = filter
	return s.listResult, s.listTotal, s.listErr
}

func (s *adminHintsRepoStub) Confirm(ctx context.Context, hintID, actorAppUserID int64) error {
	s.callLog = append(s.callLog, "Confirm")
	return s.confirmErr
}

func (s *adminHintsRepoStub) Reject(ctx context.Context, hintID, actorAppUserID int64, decisionNote *string) error {
	s.callLog = append(s.callLog, "Reject")
	s.capturedNote = decisionNote
	return s.rejectErr
}

// stubAdminFansubGroupHintsAuthzRepo implementiert die requirePlatformAdminIdentity-Minimal-
// schnittstelle (capabilityAuthzRepo). isPlatformAdmin steuert, ob die Identity im Test als
// Plattform-Admin erkannt wird.
type stubAdminFansubGroupHintsAuthzRepo struct {
	isPlatformAdmin bool
}

func (s *stubAdminFansubGroupHintsAuthzRepo) AppUserHasGlobalRole(_ context.Context, _ int64, _ string) (bool, error) {
	return s.isPlatformAdmin, nil
}

// buildAdminFansubGroupHintsHandler baut einen AdminFansubGroupHintsHandler mit Stubs.
func buildAdminFansubGroupHintsHandler(isPlatformAdmin bool, repo *adminHintsRepoStub, audit *auditReviewStub) *AdminFansubGroupHintsHandler {
	return NewAdminFansubGroupHintsHandler(&stubAdminFansubGroupHintsAuthzRepo{isPlatformAdmin: isPlatformAdmin}, repo, audit)
}

// setAdminFansubGroupHintsTestAuth setzt eine gueltige AuthIdentity im Gin-Kontext
// (AppUserID > 0, Status aktiv) — requirePlatformAdminIdentity liest diese per
// middleware.CommentAuthIdentityFromContext.
func setAdminFansubGroupHintsTestAuth(c *gin.Context, appUserID int64) {
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:        appUserID,
		AppUserID:     appUserID,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Testadmin",
	})
}

// --- ListHints ---

// TestAdminFansubGroupHints_ListHints_RequiresPlatformAdmin beweist den D-01-Enforcement-
// Punkt: ein Leader der Zielgruppe (ohne globale platform_admin-Rolle) wird hier ebenfalls
// mit 403 abgelehnt — die Leader-Capability aus dem gruppen-gescopten Pfad spielt fuer diese
// NEUE Admin-Route keine Rolle.
func TestAdminFansubGroupHints_ListHints_RequiresPlatformAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &adminHintsRepoStub{}
	handler := buildAdminFansubGroupHintsHandler(false, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/fansub-group-hints", nil)
	setAdminFansubGroupHintsTestAuth(c, 42)

	handler.ListHints(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if len(repo.callLog) != 0 {
		t.Fatalf("ListForFansubLeadRole darf bei 403 nicht aufgerufen werden, callLog=%v", repo.callLog)
	}
}

// TestAdminFansubGroupHints_ListHints_Success beweist, dass die Liste bei erfolgreicher
// Plattform-Admin-Pruefung durchgereicht wird und das Antwortformat (data/meta) dem
// AdminClaimsListHandler-Vorbild entspricht.
func TestAdminFansubGroupHints_ListHints_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	role := "fansub_lead"
	rows := []repository.FansubGroupHintRow{
		{ID: 1, Status: "open", RequestedRoleCode: &role},
		{ID: 2, Status: "open", RequestedRoleCode: &role},
	}
	repo := &adminHintsRepoStub{listResult: rows, listTotal: 2}
	handler := buildAdminFansubGroupHintsHandler(true, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/fansub-group-hints?status=open&fansub_group_id=5", nil)
	setAdminFansubGroupHintsTestAuth(c, 1)

	handler.ListHints(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Data []repository.FansubGroupHintRow `json:"data"`
		Meta struct {
			Total  int `json:"total"`
			Limit  int `json:"limit"`
			Offset int `json:"offset"`
		} `json:"meta"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("JSON dekodieren: %v", err)
	}
	if len(resp.Data) != 2 || resp.Meta.Total != 2 {
		t.Fatalf("erwartet 2 Zeilen mit total=2, erhalten data=%d total=%d", len(resp.Data), resp.Meta.Total)
	}
	if repo.capturedFilter.Status == nil || *repo.capturedFilter.Status != "open" {
		t.Fatalf("status-Filter wurde nicht korrekt an ListForFansubLeadRole weitergegeben: %+v", repo.capturedFilter)
	}
	if repo.capturedFilter.TargetFansubGroupID == nil || *repo.capturedFilter.TargetFansubGroupID != 5 {
		t.Fatalf("fansub_group_id-Filter wurde nicht korrekt weitergegeben: %+v", repo.capturedFilter)
	}
}

// --- ConfirmHint ---

// TestAdminFansubGroupHints_ConfirmHint_Success beweist Erfolg UND den D-03/D-05-
// Regressionsbeweis: am Repository-Doppel wird ausschliesslich "Confirm" protokolliert,
// exakt wie beim Leader-Pfad, weil beide Handler durch denselben decideFansubGroupHint-
// Helfer entscheiden.
func TestAdminFansubGroupHints_ConfirmHint_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &adminHintsRepoStub{}
	handler := buildAdminFansubGroupHintsHandler(true, repo, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/7/confirm", nil)
	c.Params = gin.Params{{Key: "hid", Value: "7"}}
	setAdminFansubGroupHintsTestAuth(c, 1)

	handler.ConfirmHint(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if audit.writeCount < 1 || audit.lastEvent != "fansub_group_hint.confirmed" {
		t.Fatalf("Audit-Eintrag fehlt oder falsches EventType: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}
	if len(repo.callLog) != 1 || repo.callLog[0] != "Confirm" {
		t.Fatalf("erwartet genau einen Confirm-Aufruf ohne Seiteneffekt, callLog=%v", repo.callLog)
	}
}

// TestAdminFansubGroupHints_ConfirmHint_RejectsNonPlatformAdmin beweist den zentralen
// D-01-Enforcement-Punkt dieses Plans: selbst ein Leader der Zielgruppe (hier simuliert durch
// isPlatformAdmin=false — das Repository haette ohnehin keinen CanForFansubGroup-Pfad)
// wird ueber DIESE Route mit 403 abgelehnt, nicht durchgewunken.
func TestAdminFansubGroupHints_ConfirmHint_RejectsNonPlatformAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &adminHintsRepoStub{}
	handler := buildAdminFansubGroupHintsHandler(false, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/7/confirm", nil)
	c.Params = gin.Params{{Key: "hid", Value: "7"}}
	setAdminFansubGroupHintsTestAuth(c, 42)

	handler.ConfirmHint(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if len(repo.callLog) != 0 {
		t.Fatalf("Confirm darf bei 403 nicht aufgerufen werden, callLog=%v", repo.callLog)
	}
}

func TestAdminFansubGroupHints_ConfirmHint_AlreadyDecidedReturnsNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &adminHintsRepoStub{confirmErr: repository.ErrNotFound}
	handler := buildAdminFansubGroupHintsHandler(true, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/999/confirm", nil)
	c.Params = gin.Params{{Key: "hid", Value: "999"}}
	setAdminFansubGroupHintsTestAuth(c, 1)

	handler.ConfirmHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("erwartet 404, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
}

// --- RejectHint ---

func TestAdminFansubGroupHints_RejectHint_WithNote(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &adminHintsRepoStub{}
	handler := buildAdminFansubGroupHintsHandler(true, repo, audit)

	body := `{"decision_note":"Bitte zuerst Rueckfrage an den Absender stellen."}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/7/reject", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "hid", Value: "7"}}
	setAdminFansubGroupHintsTestAuth(c, 1)

	handler.RejectHint(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if repo.capturedNote == nil || *repo.capturedNote != "Bitte zuerst Rueckfrage an den Absender stellen." {
		t.Fatalf("decision_note nicht korrekt weitergegeben: %v", repo.capturedNote)
	}
	if audit.writeCount < 1 || audit.lastEvent != "fansub_group_hint.rejected" {
		t.Fatalf("Audit-Eintrag fehlt oder falsches EventType: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}
}

func TestAdminFansubGroupHints_RejectHint_WithoutNotePersistsNil(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &adminHintsRepoStub{}
	handler := buildAdminFansubGroupHintsHandler(true, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/7/reject", nil)
	c.Params = gin.Params{{Key: "hid", Value: "7"}}
	setAdminFansubGroupHintsTestAuth(c, 1)

	handler.RejectHint(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if repo.capturedNote != nil {
		t.Fatalf("decision_note sollte nil sein, ist aber: %q", *repo.capturedNote)
	}
}

func TestAdminFansubGroupHints_RejectHint_RejectsNonPlatformAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &adminHintsRepoStub{}
	handler := buildAdminFansubGroupHintsHandler(false, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/7/reject", nil)
	c.Params = gin.Params{{Key: "hid", Value: "7"}}
	setAdminFansubGroupHintsTestAuth(c, 42)

	handler.RejectHint(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if len(repo.callLog) != 0 {
		t.Fatalf("Reject darf bei 403 nicht aufgerufen werden, callLog=%v", repo.callLog)
	}
}

func TestAdminFansubGroupHints_RejectHint_AlreadyDecidedReturnsNotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &adminHintsRepoStub{rejectErr: repository.ErrNotFound}
	handler := buildAdminFansubGroupHintsHandler(true, repo, &auditReviewStub{})

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansub-group-hints/999/reject", nil)
	c.Params = gin.Params{{Key: "hid", Value: "999"}}
	setAdminFansubGroupHintsTestAuth(c, 1)

	handler.RejectHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("erwartet 404, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
}

package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Stubs für ContributionReviewHandler-Tests ---

// reviewRepoStub implementiert das ReviewRepository-Interface für Tests.
type reviewRepoStub struct {
	listResult    []repository.GroupProposalRow
	listErr       error
	confirmErr    error
	rejectErr     error
	capturedNote  *string
}

func (s *reviewRepoStub) ListProposedByGroup(ctx context.Context, fansubGroupID int64) ([]repository.GroupProposalRow, error) {
	return s.listResult, s.listErr
}

func (s *reviewRepoStub) Confirm(ctx context.Context, contributionID, actorAppUserID int64) error {
	return s.confirmErr
}

func (s *reviewRepoStub) Reject(ctx context.Context, contributionID, actorAppUserID int64, reviewNote *string) error {
	s.capturedNote = reviewNote
	return s.rejectErr
}

// reviewPermissionSvcStub steuert das Ergebnis von CanForFansubGroup.
type reviewPermissionSvcStub struct {
	allowed bool
}

func (s *reviewPermissionSvcStub) CanForFansubGroup(
	ctx context.Context,
	actor permissions.Actor,
	action permissions.Action,
	fansubID int64,
) (permissions.Result, error) {
	if s.allowed {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

// auditReviewStub fängt Write-Aufrufe ab, ohne etwas zu persistieren.
type auditReviewStub struct {
	writeCount int
	lastEvent  string
}

func (s *auditReviewStub) Write(ctx context.Context, entry repository.AuditLogEntry) error {
	s.writeCount++
	s.lastEvent = entry.EventType
	return nil
}

// setReviewTestAuth setzt eine gültige AuthIdentity im Gin-Kontext (AppUserID > 0).
func setReviewTestAuth(c *gin.Context, appUserID int64) {
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:      appUserID, // Legacy-UserID muss > 0 sein
		AppUserID:   appUserID,
		DisplayName: "Testleader",
	})
}

// buildReviewHandler baut einen ContributionReviewHandler mit Stubs.
func buildReviewHandler(perm *reviewPermissionSvcStub, repo *reviewRepoStub, audit *auditReviewStub) *ContributionReviewHandler {
	return NewContributionReviewHandler(repo, perm, audit)
}

// --- TestListProposals ---

func TestListProposals_RequiresLeaderOrAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: false},
		&reviewRepoStub{},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/fansubs/1/contribution-proposals", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	setReviewTestAuth(c, 42)

	handler.ListProposals(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d", rec.Code)
	}
}

func TestListProposals_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	note := "Toller Beitrag"
	rows := []repository.GroupProposalRow{
		{ID: 10, FansubGroupMemberID: 5, MemberDisplayName: "Hanako", AnimeID: 99, AnimeTitle: "Testanime", RoleCodes: []string{"tl"}, Note: &note},
	}
	audit := &auditReviewStub{}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		&reviewRepoStub{listResult: rows},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/fansubs/1/contribution-proposals", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	setReviewTestAuth(c, 42)

	handler.ListProposals(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Data []repository.GroupProposalRow `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("JSON dekodieren: %v", err)
	}
	if len(resp.Data) != 1 || resp.Data[0].ID != 10 {
		t.Fatalf("unerwartete Daten: %+v", resp.Data)
	}
}

// --- TestConfirmProposal ---

func TestConfirmProposal_RequiresLeaderOrAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: false},
		&reviewRepoStub{},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/contribution-proposals/7/confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "cid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.ConfirmProposal(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d", rec.Code)
	}
}

func TestConfirmProposal_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &reviewRepoStub{confirmErr: nil}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/contribution-proposals/7/confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "cid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.ConfirmProposal(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if audit.writeCount < 1 || audit.lastEvent != "anime_contribution.confirmed" {
		t.Fatalf("Audit-Eintrag fehlt oder falsches EventType: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}
}

func TestConfirmProposal_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		&reviewRepoStub{confirmErr: repository.ErrNotFound},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/contribution-proposals/999/confirm", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "cid", Value: "999"}}
	setReviewTestAuth(c, 42)

	handler.ConfirmProposal(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("erwartet 404, erhalten %d", rec.Code)
	}
}

// --- TestRejectProposal ---

func TestRejectProposal_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &reviewRepoStub{rejectErr: nil}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	body := `{"review_note":"Unvollständige Angaben"}`
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/contribution-proposals/7/reject", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "cid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.RejectProposal(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if repo.capturedNote == nil || *repo.capturedNote != "Unvollständige Angaben" {
		t.Fatalf("review_note nicht korrekt weitergegeben: %v", repo.capturedNote)
	}
	if audit.writeCount < 1 || audit.lastEvent != "anime_contribution.rejected" {
		t.Fatalf("Audit-Eintrag fehlt oder falsches EventType: count=%d, event=%q", audit.writeCount, audit.lastEvent)
	}
}

func TestRejectProposal_WithoutNote(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	repo := &reviewRepoStub{rejectErr: nil}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		repo,
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/contribution-proposals/7/reject", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "cid", Value: "7"}}
	setReviewTestAuth(c, 42)

	handler.RejectProposal(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d — body: %s", rec.Code, rec.Body.String())
	}
	if repo.capturedNote != nil {
		t.Fatalf("review_note sollte nil sein, ist aber: %q", *repo.capturedNote)
	}
}

func TestRejectProposal_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	audit := &auditReviewStub{}
	handler := buildReviewHandler(
		&reviewPermissionSvcStub{allowed: true},
		&reviewRepoStub{rejectErr: repository.ErrNotFound},
		audit,
	)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/fansubs/1/contribution-proposals/999/reject", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}, {Key: "cid", Value: "999"}}
	setReviewTestAuth(c, 42)

	handler.RejectProposal(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("erwartet 404, erhalten %d", rec.Code)
	}
}

// Sicherstellen, dass errors-Paket verwendet wird (verhindert Compiler-Fehler bei
// Dateien, die errors.Is nur indirekt nutzen).
var _ = errors.New

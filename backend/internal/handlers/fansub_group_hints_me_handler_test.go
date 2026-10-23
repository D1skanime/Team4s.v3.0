package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Stubs für FansubGroupHintsMeHandler-Tests ---

type hintRepoStub struct {
	createResult   *repository.FansubGroupHintRow
	createErr      error
	capturedInput  repository.HintInput
	captured       bool
}

func (s *hintRepoStub) CreateHint(ctx context.Context, input repository.HintInput) (*repository.FansubGroupHintRow, error) {
	s.capturedInput = input
	s.captured = true
	return s.createResult, s.createErr
}

// buildTestHintHandler baut einen FansubGroupHintsMeHandler mit Stubs, ohne echte DB.
func buildTestHintHandler(hintRepo HintRepository, rolesRepo RolesRepository, memberResolver MemberResolver) *FansubGroupHintsMeHandler {
	return &FansubGroupHintsMeHandler{
		hintRepo:       hintRepo,
		rolesRepo:      rolesRepo,
		memberResolver: memberResolver,
	}
}

func newHintTestContext(body string, appUserID int64, setAuth bool) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/me/fansub-group-hints", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	if setAuth {
		setTestAuthIdentity(c, appUserID)
	}
	return c, rec
}

func TestFansubGroupHint_CreateHint_RequiresAuth(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":1,"related_anime_id":2}`, 0, false)

	h.CreateHint(c)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_CorrectionSucceeds(t *testing.T) {
	repo := &hintRepoStub{createResult: &repository.FansubGroupHintRow{ID: 1, HintType: fansubGroupHintTypeCorrection}}
	h := buildTestHintHandler(repo, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":5,"related_anime_id":7,"note":"Rolle fehlt"}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected %d, got %d (body=%s)", http.StatusCreated, rec.Code, rec.Body.String())
	}
	if !repo.captured {
		t.Fatalf("expected CreateHint to be called")
	}
	if repo.capturedInput.SenderAppUserID != 42 {
		t.Fatalf("expected sender_app_user_id to come from identity (42), got %d", repo.capturedInput.SenderAppUserID)
	}
	if repo.capturedInput.TargetFansubGroupID != 5 {
		t.Fatalf("expected target_fansub_group_id 5, got %d", repo.capturedInput.TargetFansubGroupID)
	}
	if repo.capturedInput.RelatedAnimeID == nil || *repo.capturedInput.RelatedAnimeID != 7 {
		t.Fatalf("expected related_anime_id 7, got %v", repo.capturedInput.RelatedAnimeID)
	}
}

func TestFansubGroupHint_CreateHint_MembershipRequestWithFansubLeadRoleSucceeds(t *testing.T) {
	repo := &hintRepoStub{createResult: &repository.FansubGroupHintRow{ID: 2, HintType: fansubGroupHintTypeMembershipRequest}}
	h := buildTestHintHandler(repo, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"membership_request","target_fansub_group_id":5,"requested_role_code":"fansub_lead"}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected %d, got %d (body=%s)", http.StatusCreated, rec.Code, rec.Body.String())
	}
	if repo.capturedInput.RequestedRoleCode == nil || *repo.capturedInput.RequestedRoleCode != "fansub_lead" {
		t.Fatalf("expected requested_role_code fansub_lead, got %v", repo.capturedInput.RequestedRoleCode)
	}
}

func TestFansubGroupHint_CreateHint_MembershipRequestWithoutRoleSucceeds(t *testing.T) {
	repo := &hintRepoStub{createResult: &repository.FansubGroupHintRow{ID: 3, HintType: fansubGroupHintTypeMembershipRequest}}
	h := buildTestHintHandler(repo, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"membership_request","target_fansub_group_id":5}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected %d, got %d (body=%s)", http.StatusCreated, rec.Code, rec.Body.String())
	}
}

func TestFansubGroupHint_CreateHint_MissingHintTypeReturns400(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":5}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_UnknownHintTypeReturns400(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"something_else","target_fansub_group_id":5}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_CorrectionWithoutAnimeReturns422(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":5}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected %d, got %d", http.StatusUnprocessableEntity, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintMissingAnimeMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintMissingAnimeMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_MembershipRequestWithAnimeReturns422(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"membership_request","target_fansub_group_id":5,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected %d, got %d", http.StatusUnprocessableEntity, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintUnexpectedAnimeMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintUnexpectedAnimeMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_CorrectionWithRoleCodeReturns422(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":5,"related_anime_id":9,"requested_role_code":"timer"}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected %d, got %d", http.StatusUnprocessableEntity, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintUnexpectedRoleMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintUnexpectedRoleMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_InvalidRequestedRoleCodeReturns400(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: false}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"membership_request","target_fansub_group_id":5,"requested_role_code":"not_a_real_role"}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected %d, got %d", http.StatusBadRequest, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_SenderAppUserIDAlwaysFromIdentityNeverFromBody(t *testing.T) {
	// Das Request-DTO hat gar kein sender_app_user_id-Feld -- ein im Body mitgesendeter
	// Fremd-Wert wird beim Binden schlicht ignoriert (kein Feld zum Binden vorhanden).
	// Dieser Test belegt, dass trotz eines im Body enthaltenen "sender_app_user_id":999
	// am Ende exakt identity.AppUserID im Repository ankommt (BOLA-Schutz).
	repo := &hintRepoStub{createResult: &repository.FansubGroupHintRow{ID: 4}}
	h := buildTestHintHandler(repo, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":5,"related_anime_id":9,"sender_app_user_id":999}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected %d, got %d (body=%s)", http.StatusCreated, rec.Code, rec.Body.String())
	}
	if repo.capturedInput.SenderAppUserID != 42 {
		t.Fatalf("expected sender_app_user_id to be identity's 42, got %d (BOLA-Regression!)", repo.capturedInput.SenderAppUserID)
	}
}

func TestFansubGroupHint_CreateHint_RepositoryConflictReturns409(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{createErr: repository.ErrConflict}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":5,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected %d, got %d", http.StatusConflict, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintConflictMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintConflictMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_RepositoryNotFoundReturns404(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{createErr: repository.ErrNotFound}, &rolesRepoStub{exists: true}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":999,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_NoVerifiedMemberReturns404(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &rolesRepoStub{exists: true}, &memberResolverStub{err: repository.ErrNotFound})
	c, rec := newHintTestContext(`{"hint_type":"correction","target_fansub_group_id":5,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != "kein verifizierter Member-Account verknüpft" {
		t.Fatalf("expected donor-verbatim message, got %q", msg)
	}
}

package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// errListSentHintsStub ist ein generischer Repository-Fehler für den ListSentHints-500-Test.
var errListSentHintsStub = errors.New("stub: repository-fehler")

// --- Stubs für FansubGroupHintsMeHandler-Tests ---

type hintRepoStub struct {
	createResult  *repository.FansubGroupHintRow
	createErr     error
	capturedInput repository.HintInput
	captured      bool

	// listBySenderResult/-Err stub ListBySender (D-18); capturedSenderAppUserID
	// speichert das tatsächlich übergebene Argument, damit die Tests beweisen können,
	// dass es exakt der Auth-Identität entspricht, niemals einem Client-Wert.
	listBySenderResult       []repository.FansubGroupHintRow
	listBySenderErr          error
	capturedSenderAppUserID  int64
	listBySenderCalled       bool
}

func (s *hintRepoStub) CreateHint(ctx context.Context, input repository.HintInput) (*repository.FansubGroupHintRow, error) {
	s.capturedInput = input
	s.captured = true
	return s.createResult, s.createErr
}

func (s *hintRepoStub) ListBySender(ctx context.Context, senderAppUserID int64) ([]repository.FansubGroupHintRow, error) {
	s.capturedSenderAppUserID = senderAppUserID
	s.listBySenderCalled = true
	return s.listBySenderResult, s.listBySenderErr
}

// buildTestHintHandler baut einen FansubGroupHintsMeHandler mit Stubs, ohne echte DB.
func buildTestHintHandler(hintRepo HintRepository, memberResolver MemberResolver) *FansubGroupHintsMeHandler {
	return &FansubGroupHintsMeHandler{
		hintRepo:       hintRepo,
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

// newHintGetTestContext baut einen GET-Request-Kontext für ListSentHints -- bewusst ohne
// jeden Query-/Path-Parameter für eine Absender-ID, da D-18s IDOR-Schutz genau darauf
// beruht, dass es kein solches Feld zum Binden/Lesen gibt.
func newHintGetTestContext(appUserID int64, setAuth bool) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/me/fansub-group-hints", nil)
	if setAuth {
		setTestAuthIdentity(c, appUserID)
	}
	return c, rec
}

func TestFansubGroupHint_ListSentHints_RequiresAuth(t *testing.T) {
	repo := &hintRepoStub{}
	h := buildTestHintHandler(repo, &memberResolverStub{memberID: 10})
	c, rec := newHintGetTestContext(0, false)

	h.ListSentHints(c)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, rec.Code)
	}
	if repo.listBySenderCalled {
		t.Fatalf("expected ListBySender to never be called without auth")
	}
}

func TestFansubGroupHint_ListSentHints_ReturnsCallersOwnHints(t *testing.T) {
	repo := &hintRepoStub{listBySenderResult: []repository.FansubGroupHintRow{{ID: 1}, {ID: 2}}}
	h := buildTestHintHandler(repo, &memberResolverStub{memberID: 10})
	c, rec := newHintGetTestContext(42, true)

	h.ListSentHints(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected %d, got %d (body=%s)", http.StatusOK, rec.Code, rec.Body.String())
	}
	if !repo.listBySenderCalled {
		t.Fatalf("expected ListBySender to be called")
	}
	// Beweis des IDOR-Schutzes (T-191-28): das übergebene Argument ist exakt
	// identity.AppUserID -- es existiert kein Request-Parameter, aus dem ein anderer Wert
	// stammen könnte.
	if repo.capturedSenderAppUserID != 42 {
		t.Fatalf("expected sender_app_user_id to come from identity (42), got %d", repo.capturedSenderAppUserID)
	}
	if !strings.Contains(rec.Body.String(), `"id":1`) || !strings.Contains(rec.Body.String(), `"id":2`) {
		t.Fatalf("expected response to contain the stub's rows, got %s", rec.Body.String())
	}
}

func TestFansubGroupHint_ListSentHints_RepositoryErrorReturns500(t *testing.T) {
	repo := &hintRepoStub{listBySenderErr: errListSentHintsStub}
	h := buildTestHintHandler(repo, &memberResolverStub{memberID: 10})
	c, rec := newHintGetTestContext(42, true)

	h.ListSentHints(c)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected %d, got %d", http.StatusInternalServerError, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_RequiresAuth(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":1,"related_anime_id":2}`, 0, false)

	h.CreateHint(c)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_CorrectionSucceeds(t *testing.T) {
	repo := &hintRepoStub{createResult: &repository.FansubGroupHintRow{ID: 1}}
	h := buildTestHintHandler(repo, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":5,"related_anime_id":7,"note":"Rolle fehlt"}`, 42, true)

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

func TestFansubGroupHint_CreateHint_MissingAnimeReturns422(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":5}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected %d, got %d", http.StatusUnprocessableEntity, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintMissingAnimeMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintMissingAnimeMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_SenderAppUserIDAlwaysFromIdentityNeverFromBody(t *testing.T) {
	// Das Request-DTO hat gar kein sender_app_user_id-Feld -- ein im Body mitgesendeter
	// Fremd-Wert wird beim Binden schlicht ignoriert (kein Feld zum Binden vorhanden).
	// Dieser Test belegt, dass trotz eines im Body enthaltenen "sender_app_user_id":999
	// am Ende exakt identity.AppUserID im Repository ankommt (BOLA-Schutz).
	repo := &hintRepoStub{createResult: &repository.FansubGroupHintRow{ID: 4}}
	h := buildTestHintHandler(repo, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":5,"related_anime_id":9,"sender_app_user_id":999}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected %d, got %d (body=%s)", http.StatusCreated, rec.Code, rec.Body.String())
	}
	if repo.capturedInput.SenderAppUserID != 42 {
		t.Fatalf("expected sender_app_user_id to be identity's 42, got %d (BOLA-Regression!)", repo.capturedInput.SenderAppUserID)
	}
}

func TestFansubGroupHint_CreateHint_RepositoryConflictReturns409(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{createErr: repository.ErrConflict}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":5,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected %d, got %d", http.StatusConflict, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintConflictMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintConflictMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_RepositoryNotFoundReturns404(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{createErr: repository.ErrNotFound}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":999,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rec.Code)
	}
}

func TestFansubGroupHint_CreateHint_InvalidAnimeFansubContextReturns404(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{createErr: repository.ErrInvalidAnimeFansubContext}, &memberResolverStub{memberID: 10})
	c, rec := newHintTestContext(`{"target_fansub_group_id":29,"related_anime_id":2}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != fansubGroupHintInvalidContextMessage {
		t.Fatalf("expected message %q, got %q", fansubGroupHintInvalidContextMessage, msg)
	}
}

func TestFansubGroupHint_CreateHint_NoVerifiedMemberReturns404(t *testing.T) {
	h := buildTestHintHandler(&hintRepoStub{}, &memberResolverStub{err: repository.ErrNotFound})
	c, rec := newHintTestContext(`{"target_fansub_group_id":5,"related_anime_id":9}`, 42, true)

	h.CreateHint(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected %d, got %d", http.StatusNotFound, rec.Code)
	}
	if msg := decodeErrorMessage(t, rec.Body.Bytes()); msg != "kein verifizierter Member-Account verknüpft" {
		t.Fatalf("expected donor-verbatim message, got %q", msg)
	}
}

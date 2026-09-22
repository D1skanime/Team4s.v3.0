package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeAnimeCreateRepo is a minimal, in-memory adminAnimeCreateRepository fake used to prove the
// save-time AniSearch duplicate guard (165-03/D-20) without a running database.
type fakeAnimeCreateRepo struct {
	findDuplicate *models.AdminAnimeSourceMatch
	// findDuplicateOnRecheck, when set, is returned starting from the SECOND FindAnimeBySource
	// call onward instead of findDuplicate -- simulates the GAP-06/D-30 (165-18) race window where
	// the pre-check finds nothing, but a competing insert lands between the pre-check and this
	// request's own insert, so the post-conflict re-lookup DOES find a match.
	findDuplicateOnRecheck *models.AdminAnimeSourceMatch
	findErr                error
	findCalls              int
	createCalls            int
	createErr              error
	createResult           *models.AdminAnimeItem
}

func (f *fakeAnimeCreateRepo) FindAnimeBySource(_ context.Context, _ string) (*models.AdminAnimeSourceMatch, error) {
	f.findCalls++
	if f.findErr != nil {
		return nil, f.findErr
	}
	if f.findCalls > 1 && f.findDuplicateOnRecheck != nil {
		return f.findDuplicateOnRecheck, nil
	}
	return f.findDuplicate, nil
}

func (f *fakeAnimeCreateRepo) CreateAnime(_ context.Context, input models.AdminAnimeCreateInput, _ int64) (*models.AdminAnimeItem, error) {
	f.createCalls++
	if f.createErr != nil {
		return nil, f.createErr
	}
	if f.createResult != nil {
		return f.createResult, nil
	}
	return &models.AdminAnimeItem{ID: 501, Title: input.Title, Type: input.Type, ContentType: input.ContentType, Status: input.Status}, nil
}

func newCreateAnimeTestRouter(handler *AdminContentHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/api/v1/admin/anime", withTestAdminIdentity(), handler.CreateAnime)
	return router
}

func TestCreateAnime_RechecksAniSearchDuplicateBeforeInsert(t *testing.T) {
	fake := &fakeAnimeCreateRepo{
		findDuplicate: &models.AdminAnimeSourceMatch{AnimeID: 84, Title: "Serial Experiments Lain"},
	}
	handler := &AdminContentHandler{
		authzRepo:       stubAdminRoleChecker{allowed: true},
		adminRoleName:   "admin",
		animeCreateRepo: fake,
	}

	router := newCreateAnimeTestRouter(handler)

	requestBody := `{"title":"Serial Experiments Lain","type":"tv","content_type":"anime","status":"ongoing","cover_image":"cover.webp","source":"anisearch:12345"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Data models.AdminAnimeAniSearchEnrichmentRedirectResult `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.Mode != "redirect" {
		t.Fatalf("expected redirect mode, got %#v", payload.Data)
	}
	if payload.Data.AniSearchID != "12345" {
		t.Fatalf("expected anisearch id 12345, got %#v", payload.Data)
	}
	if payload.Data.ExistingAnimeID != 84 {
		t.Fatalf("expected existing_anime_id 84, got %#v", payload.Data)
	}
	if payload.Data.ExistingTitle != "Serial Experiments Lain" {
		t.Fatalf("expected existing_title to be preserved, got %#v", payload.Data)
	}
	if payload.Data.RedirectPath != "/admin/anime/84/edit" {
		t.Fatalf("unexpected redirect_path: %#v", payload.Data)
	}

	if fake.createCalls != 0 {
		t.Fatalf("expected CreateAnime to never be called on a guard hit, got %d calls", fake.createCalls)
	}
	if fake.findCalls != 1 {
		t.Fatalf("expected exactly one FindAnimeBySource call, got %d", fake.findCalls)
	}
}

// TestCreateAnime_RepoConflictErrorReturns409NotInternalError proves the D-30/165-18 hardening:
// even though the pre-check above finds no duplicate (simulating the race window between the
// pre-check and the actual insert), a repository.ErrConflict surfaced by CreateAnime itself is
// mapped to the SAME 409 redirect shape, never a generic 500. This is the defense-in-depth layer
// for GAP-06's original bug (an unhandled unique-violation surfacing as HTTP 500).
func TestCreateAnime_RepoConflictErrorReturns409NotInternalError(t *testing.T) {
	fake := &fakeAnimeCreateRepo{
		findDuplicate: nil, // pre-check passes -- no duplicate found yet
		findDuplicateOnRecheck: &models.AdminAnimeSourceMatch{
			AnimeID: 84, Title: "Serial Experiments Lain",
		}, // race-window winner found by the post-conflict re-lookup
		createErr: repository.ErrConflict,
	}
	handler := &AdminContentHandler{
		authzRepo:       stubAdminRoleChecker{allowed: true},
		adminRoleName:   "admin",
		animeCreateRepo: fake,
	}

	router := newCreateAnimeTestRouter(handler)

	requestBody := `{"title":"Serial Experiments Lain","type":"tv","content_type":"anime","status":"ongoing","cover_image":"cover.webp","source":"anisearch:12345"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d with body %s", recorder.Code, recorder.Body.String())
	}

	var payload struct {
		Data models.AdminAnimeAniSearchEnrichmentRedirectResult `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Data.Mode != "redirect" {
		t.Fatalf("expected redirect mode, got %#v", payload.Data)
	}
	if payload.Data.AniSearchID != "12345" {
		t.Fatalf("expected anisearch id 12345, got %#v", payload.Data)
	}

	if fake.createCalls != 1 {
		t.Fatalf("expected CreateAnime to be called exactly once, got %d", fake.createCalls)
	}
	if fake.findCalls != 2 {
		t.Fatalf("expected exactly two FindAnimeBySource calls (pre-check + post-conflict lookup), got %d", fake.findCalls)
	}
}

func TestCreateAnime_NonAniSearchCreateNeverCallsFindAnimeBySource(t *testing.T) {
	fake := &fakeAnimeCreateRepo{}
	handler := &AdminContentHandler{
		authzRepo:       stubAdminRoleChecker{allowed: true},
		adminRoleName:   "admin",
		animeCreateRepo: fake,
	}

	router := newCreateAnimeTestRouter(handler)

	requestBody := `{"title":"Manual Draft","type":"tv","content_type":"anime","status":"ongoing","cover_image":"cover.webp"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if fake.findCalls != 0 {
		t.Fatalf("expected non-AniSearch create to add zero FindAnimeBySource calls, got %d", fake.findCalls)
	}
	if fake.createCalls != 1 {
		t.Fatalf("expected CreateAnime to be called exactly once, got %d", fake.createCalls)
	}
}

// jellyfinOnlyCreateNeverTriggersGuard is a regression companion proving a Jellyfin-linked
// (non-AniSearch) source also adds zero FindAnimeBySource calls, matching D-12's requirement that
// the guard cost nothing on the manual/Jellyfin-only create path.
func TestCreateAnime_JellyfinOnlySourceNeverCallsFindAnimeBySource(t *testing.T) {
	fake := &fakeAnimeCreateRepo{}
	handler := &AdminContentHandler{
		authzRepo:       stubAdminRoleChecker{allowed: true},
		adminRoleName:   "admin",
		animeCreateRepo: fake,
	}

	router := newCreateAnimeTestRouter(handler)

	requestBody := `{"title":"Naruto","type":"tv","content_type":"anime","status":"ongoing","cover_image":"cover.webp","source":"jellyfin:series-99"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if fake.findCalls != 0 {
		t.Fatalf("expected jellyfin-only create to add zero FindAnimeBySource calls, got %d", fake.findCalls)
	}
	if fake.createCalls != 1 {
		t.Fatalf("expected CreateAnime to be called exactly once, got %d", fake.createCalls)
	}
}

func TestCreateAnime_DuplicateLookupErrorReturnsInternalError(t *testing.T) {
	fake := &fakeAnimeCreateRepo{
		findErr: context.DeadlineExceeded,
	}
	handler := &AdminContentHandler{
		authzRepo:       stubAdminRoleChecker{allowed: true},
		adminRoleName:   "admin",
		animeCreateRepo: fake,
	}

	router := newCreateAnimeTestRouter(handler)

	requestBody := `{"title":"Serial Experiments Lain","type":"tv","content_type":"anime","status":"ongoing","cover_image":"cover.webp","source":"anisearch:12345"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/anime", strings.NewReader(requestBody))
	req.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d with body %s", recorder.Code, recorder.Body.String())
	}
	if fake.createCalls != 0 {
		t.Fatalf("expected CreateAnime to never be called when the re-check errors, got %d calls", fake.createCalls)
	}
}

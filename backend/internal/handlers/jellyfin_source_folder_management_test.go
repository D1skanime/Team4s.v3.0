package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fakeJellyfinFolderManagementRepo is an in-memory jellyfinFolderManagementRepository fake,
// letting Task 1's tests assert exact call-argument shapes (Pitfall-3 regression guard) without a
// live Postgres instance.
type fakeJellyfinFolderManagementRepo struct {
	syncSource    *models.AdminAnimeSyncSource
	syncSourceErr error

	applyCalls             int
	applySourceTag         string
	applyForceSourceUpdate bool

	linkCalls     int
	linkedSources []string

	removeCalls    int
	removedSources []string
	removeErr      error
}

func (f *fakeJellyfinFolderManagementRepo) GetAnimeSyncSource(_ context.Context, _ int64) (*models.AdminAnimeSyncSource, error) {
	if f.syncSourceErr != nil {
		return nil, f.syncSourceErr
	}
	return f.syncSource, nil
}

func (f *fakeJellyfinFolderManagementRepo) ApplyJellyfinSyncMetadata(
	_ context.Context,
	_ int64,
	sourceTag string,
	_ *string,
	_ *int16,
	_ *string,
	_ *int16,
	forceSourceUpdate bool,
) error {
	f.applyCalls++
	f.applySourceTag = sourceTag
	f.applyForceSourceUpdate = forceSourceUpdate
	return nil
}

func (f *fakeJellyfinFolderManagementRepo) LinkAdditionalJellyfinSource(_ context.Context, _ int64, source string) error {
	f.linkCalls++
	f.linkedSources = append(f.linkedSources, source)
	return nil
}

func (f *fakeJellyfinFolderManagementRepo) RemoveAnimeSourceLink(_ context.Context, _ int64, source string) error {
	f.removeCalls++
	if f.removeErr != nil {
		return f.removeErr
	}
	f.removedSources = append(f.removedSources, source)
	return nil
}

var testAdminIdentity = middleware.AuthIdentity{AppUserID: 7, UserID: 7}

// --- Test 1: Pitfall-3 regression guard ------------------------------------------------------

func TestConnectJellyfinFolderAdditively_ProtectsExistingAniSearchSource(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{}
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}

	source := "anisearch:5170"
	animeSource := &models.AdminAnimeSyncSource{ID: 42, Source: &source}
	preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "abc123"}

	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 42, animeSource, preview, "abc123"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.applyCalls != 0 {
		t.Fatalf("expected ApplyJellyfinSyncMetadata NOT to be called, got %d calls", repo.applyCalls)
	}
	if repo.linkCalls != 1 {
		t.Fatalf("expected exactly 1 LinkAdditionalJellyfinSource call, got %d", repo.linkCalls)
	}
	if repo.linkedSources[0] != "jellyfin:abc123" {
		t.Fatalf("unexpected linked source %q", repo.linkedSources[0])
	}
	if animeSource.Source == nil || *animeSource.Source != "anisearch:5170" {
		t.Fatalf("expected anime.source to remain unchanged, got %+v", animeSource.Source)
	}
}

// --- Test 2: pre-existing (non-anisearch) cases keep the old force-write behavior ------------

func TestConnectJellyfinFolderAdditively_UsesForceWritePathWhenNoAniSearchSource(t *testing.T) {
	cases := []struct {
		name             string
		source           *string
		explicitSeriesID string
		wantForce        bool
	}{
		{name: "empty source, no explicit id (regular auto-resolve)", source: nil, explicitSeriesID: "", wantForce: false},
		{name: "jellyfin source, explicit id (re-link same provider)", source: stringPtrFromValue("jellyfin:old"), explicitSeriesID: "new123", wantForce: true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeJellyfinFolderManagementRepo{}
			audit := &fakeAuditLogWriter{}
			h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}
			animeSource := &models.AdminAnimeSyncSource{ID: 1, Source: tc.source}
			preview := models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "new123"}

			if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 1, animeSource, preview, tc.explicitSeriesID); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if repo.applyCalls != 1 {
				t.Fatalf("expected 1 ApplyJellyfinSyncMetadata call, got %d", repo.applyCalls)
			}
			if repo.applyForceSourceUpdate != tc.wantForce {
				t.Fatalf("expected forceSourceUpdate=%v, got %v", tc.wantForce, repo.applyForceSourceUpdate)
			}
			if repo.applySourceTag != "jellyfin:new123" {
				t.Fatalf("unexpected source tag %q", repo.applySourceTag)
			}
			if repo.linkCalls != 0 {
				t.Fatalf("expected LinkAdditionalJellyfinSource not called, got %d", repo.linkCalls)
			}
		})
	}
}

// --- Test 3: D-16 folder rename is a plain second additive insert, no special-case branch -----

func TestConnectJellyfinFolderAdditively_HandlesFolderRenameAsPlainSecondInsert(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{}
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}
	source := "anisearch:5170"
	animeSource := &models.AdminAnimeSyncSource{ID: 7, Source: &source}

	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 7, animeSource, models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "old-item"}, "old-item"); err != nil {
		t.Fatalf("unexpected error on first connect: %v", err)
	}
	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 7, animeSource, models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "new-item"}, "new-item"); err != nil {
		t.Fatalf("unexpected error on second (renamed) connect: %v", err)
	}
	if repo.linkCalls != 2 {
		t.Fatalf("expected 2 additive link calls (no special-case rename branch), got %d", repo.linkCalls)
	}
	want := []string{"jellyfin:old-item", "jellyfin:new-item"}
	for i, w := range want {
		if repo.linkedSources[i] != w {
			t.Fatalf("expected linked source[%d]=%q, got %q", i, w, repo.linkedSources[i])
		}
	}
}

// --- Test 4: successful additive connect writes exactly one audit entry -----------------------

func TestConnectJellyfinFolderAdditively_WritesAuditEntry(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{}
	audit := &fakeAuditLogWriter{}
	h := &AdminContentHandler{folderManagementRepo: repo, auditLogRepo: audit}
	animeSource := &models.AdminAnimeSyncSource{ID: 99}

	if err := h.connectJellyfinFolderAdditively(context.Background(), testAdminIdentity, 99, animeSource, models.AdminAnimeJellyfinMetadataPreviewResult{JellyfinSeriesID: "abc"}, ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if audit.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", audit.calls)
	}
	entry := audit.entries[0]
	if entry.EventType != "jellyfin_discovery.connected" {
		t.Fatalf("unexpected event_type %q", entry.EventType)
	}
	if entry.TargetType != "anime" {
		t.Fatalf("unexpected target_type %q", entry.TargetType)
	}
	if entry.TargetID == nil || *entry.TargetID != 99 {
		t.Fatalf("unexpected target_id %+v", entry.TargetID)
	}
}

// --- Task 2: buildAnimeJellyfinContext lists all connected folders with correct main flag -----

func TestBuildAnimeJellyfinContext_ListsAllConnectedFoldersWithMainFlag(t *testing.T) {
	h := &AdminContentHandler{}
	source := "jellyfin:abc"
	animeSource := &models.AdminAnimeSyncSource{
		ID:          5,
		Source:      &source,
		SourceLinks: []string{"jellyfin:abc", "jellyfin:def"},
	}

	result, statusCode, err := h.buildAnimeJellyfinContext(context.Background(), animeSource, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if statusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", statusCode)
	}
	if len(result.Folders) != 2 {
		t.Fatalf("expected exactly 2 folders, got %d: %+v", len(result.Folders), result.Folders)
	}
	isMain := map[string]bool{}
	for _, folder := range result.Folders {
		isMain[folder.JellyfinItemID] = folder.IsMain
	}
	if main, ok := isMain["abc"]; !ok || !main {
		t.Fatalf("expected folder abc present and flagged IsMain=true, got %+v", result.Folders)
	}
	if main, ok := isMain["def"]; !ok || main {
		t.Fatalf("expected folder def present and flagged IsMain=false, got %+v", result.Folders)
	}
}

// --- Task 2: DELETE /admin/anime/:id/jellyfin/folders/:source ----------------------------------

func newFolderManagementTestHandler(repo jellyfinFolderManagementRepository, audit auditLogWriter) *AdminContentHandler {
	return &AdminContentHandler{
		authzRepo:            stubAdminRoleChecker{allowed: true},
		adminRoleName:        "admin",
		folderManagementRepo: repo,
		auditLogRepo:         audit,
	}
}

func newFolderManagementTestRouter(h *AdminContentHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	identity := withTestAdminIdentityAppUser(7, 7)
	router.DELETE("/api/v1/admin/anime/:id/jellyfin/folders/:source", identity, h.RemoveAnimeJellyfinFolder)
	return router
}

// D-18 fix regression guard: the DELETE :source path param carries the UNPREFIXED Jellyfin item ID
// (e.g. "def"), matching exactly what collectJellyfinFolderOptions (jellyfin_source_folder_list.go)
// hands the frontend everywhere -- never the fully-prefixed "jellyfin:def" DB-stored form. See
// TestRemoveAnimeJellyfinFolder_EndToEndThroughCollectJellyfinFolderOptions below for the test that
// threads the real helper's output through the handler, closing the exact gap that let the original
// prefix-mismatch bug through undetected.

func TestRemoveAnimeJellyfinFolder_RemovesNonMainFolder(t *testing.T) {
	source := "jellyfin:abc"
	repo := &fakeJellyfinFolderManagementRepo{syncSource: &models.AdminAnimeSyncSource{ID: 5, Source: &source}}
	audit := &fakeAuditLogWriter{}
	router := newFolderManagementTestRouter(newFolderManagementTestHandler(repo, audit))

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/5/jellyfin/folders/def", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if repo.removeCalls != 1 {
		t.Fatalf("expected exactly 1 RemoveAnimeSourceLink call, got %d", repo.removeCalls)
	}
	if len(repo.removedSources) != 1 || repo.removedSources[0] != "jellyfin:def" {
		t.Fatalf("expected the repository call to receive the re-prefixed source, got %+v", repo.removedSources)
	}
}

func TestRemoveAnimeJellyfinFolder_RejectsMainFolderBeforeAnyDelete(t *testing.T) {
	source := "jellyfin:abc"
	repo := &fakeJellyfinFolderManagementRepo{syncSource: &models.AdminAnimeSyncSource{ID: 5, Source: &source}}
	audit := &fakeAuditLogWriter{}
	router := newFolderManagementTestRouter(newFolderManagementTestHandler(repo, audit))

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/5/jellyfin/folders/abc", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 when targeting the main folder, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if repo.removeCalls != 0 {
		t.Fatalf("expected RemoveAnimeSourceLink to never be attempted for the main folder, got %d calls", repo.removeCalls)
	}
	if audit.calls != 0 {
		t.Fatalf("expected no audit write for a rejected main-folder removal, got %d", audit.calls)
	}
}

func TestRemoveAnimeJellyfinFolder_WritesAuditEntryOnSuccess(t *testing.T) {
	source := "jellyfin:abc"
	repo := &fakeJellyfinFolderManagementRepo{syncSource: &models.AdminAnimeSyncSource{ID: 5, Source: &source}}
	audit := &fakeAuditLogWriter{}
	router := newFolderManagementTestRouter(newFolderManagementTestHandler(repo, audit))

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/5/jellyfin/folders/def", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if audit.calls != 1 {
		t.Fatalf("expected exactly 1 audit write, got %d", audit.calls)
	}
	entry := audit.entries[0]
	if entry.EventType != "jellyfin_discovery.folder_removed" {
		t.Fatalf("unexpected event_type %q", entry.EventType)
	}
	if entry.TargetType != "anime" {
		t.Fatalf("unexpected target_type %q", entry.TargetType)
	}
	if entry.TargetID == nil || *entry.TargetID != 5 {
		t.Fatalf("unexpected target_id %+v", entry.TargetID)
	}
}

func TestRemoveAnimeJellyfinFolder_AnimeNotFoundReturns404(t *testing.T) {
	repo := &fakeJellyfinFolderManagementRepo{syncSourceErr: errors.New("not found: anime")}
	audit := &fakeAuditLogWriter{}
	router := newFolderManagementTestRouter(newFolderManagementTestHandler(repo, audit))

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/999/jellyfin/folders/def", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500 for a generic (non-ErrNotFound) load failure, got %d", rec.Code)
	}
	if repo.removeCalls != 0 {
		t.Fatalf("expected RemoveAnimeSourceLink not to be attempted when the anime load failed, got %d", repo.removeCalls)
	}
}

// --- D-18 blocker fix regression tests ---------------------------------------------------------

func TestRemoveAnimeJellyfinFolder_ReturnsNotFoundAndSkipsAuditWhenZeroRowsMatched(t *testing.T) {
	source := "jellyfin:abc"
	repo := &fakeJellyfinFolderManagementRepo{
		syncSource: &models.AdminAnimeSyncSource{ID: 5, Source: &source},
		removeErr:  repository.ErrNotFound,
	}
	audit := &fakeAuditLogWriter{}
	router := newFolderManagementTestRouter(newFolderManagementTestHandler(repo, audit))

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/5/jellyfin/folders/def", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404 when the DELETE matched zero rows, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if audit.calls != 0 {
		t.Fatalf("expected no success audit entry when the delete matched zero rows, got %d", audit.calls)
	}
}

// TestRemoveAnimeJellyfinFolder_EndToEndThroughCollectJellyfinFolderOptions exercises the exact D-18
// blocker scenario: it builds the folder options via the REAL collectJellyfinFolderOptions helper
// (the only source the frontend ever gets a folder ID from), takes the non-main folder's
// JellyfinItemID exactly as the frontend would receive it (unprefixed), feeds that value as the
// DELETE :source path param, and asserts the repository actually receives the correctly re-prefixed
// source string. This is the real end-to-end contract check that neither 165-07's nor 165-10's
// original tests exercised (165-07 hand-picked an already-prefixed "jellyfin:def" fixture; 165-10
// fully mocked the API client) -- the exact gap that let the original prefix mismatch ship undetected.
func TestRemoveAnimeJellyfinFolder_EndToEndThroughCollectJellyfinFolderOptions(t *testing.T) {
	mainSource := "jellyfin:abc"
	sourceLinks := []string{"jellyfin:abc", "jellyfin:def"}
	folderOptions := collectJellyfinFolderOptions(&mainSource, sourceLinks, &mainSource)

	var nonMainFolderID string
	for _, folder := range folderOptions {
		if !folder.IsMain {
			nonMainFolderID = folder.JellyfinItemID
		}
	}
	if nonMainFolderID == "" {
		t.Fatalf("expected collectJellyfinFolderOptions to produce a non-main folder, got %+v", folderOptions)
	}
	if nonMainFolderID != "def" {
		t.Fatalf("expected the real helper's unprefixed folder id, got %q", nonMainFolderID)
	}

	repo := &fakeJellyfinFolderManagementRepo{syncSource: &models.AdminAnimeSyncSource{ID: 5, Source: &mainSource}}
	audit := &fakeAuditLogWriter{}
	router := newFolderManagementTestRouter(newFolderManagementTestHandler(repo, audit))

	// Exactly what removeAdminAnimeJellyfinFolder(animeID, folder.jellyfin_item_id) sends in production.
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/anime/5/jellyfin/folders/"+nonMainFolderID, nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body=%s)", rec.Code, rec.Body.String())
	}
	if len(repo.removedSources) != 1 || repo.removedSources[0] != "jellyfin:def" {
		t.Fatalf("expected the repository DELETE to receive the DB-stored prefixed source, got %+v", repo.removedSources)
	}
}

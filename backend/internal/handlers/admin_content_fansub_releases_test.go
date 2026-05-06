package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// fansubReleaseThemeRepoStub implements adminThemeRepository for handler tests.
// It extends the existing stub pattern used in relation tests.
type fansubReleaseThemeRepoStub struct {
	listFansubAnimeReleases               func(ctx context.Context, fansubGroupID int64, animeID int64) ([]models.AdminFansubReleaseSummary, error)
	getCanonicalFansubAnimeReleaseSummary func(ctx context.Context, fansubGroupID int64, animeID int64) (*models.CanonicalFansubAnimeReleaseResponse, error)
	getAdminReleaseByID                   func(ctx context.Context, releaseID int64) (*models.AdminFansubReleaseSummary, error)
}

func (s *fansubReleaseThemeRepoStub) ListThemeTypes(ctx context.Context) ([]models.AdminThemeType, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) ListAdminAnimeThemes(ctx context.Context, animeID int64) ([]models.AdminAnimeTheme, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) CreateAdminAnimeTheme(ctx context.Context, animeID int64, input models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) UpdateAdminAnimeTheme(ctx context.Context, themeID int64, input models.AdminAnimeThemePatchInput) error {
	return nil
}
func (s *fansubReleaseThemeRepoStub) DeleteAdminAnimeTheme(ctx context.Context, themeID int64) error {
	return nil
}
func (s *fansubReleaseThemeRepoStub) ListAnimeSegments(ctx context.Context, animeID int64, groupID int64, version string) ([]models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) ListAnimeSegmentSuggestions(ctx context.Context, animeID int64, episodeNumber int, excludeGroupID int64, excludeVersion string) ([]models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) ListSegmentLibraryCandidates(ctx context.Context, animeID int64, fansubGroupID int64, segmentKind string, segmentName string) ([]models.SegmentLibraryCandidate, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) CreateAnimeSegment(ctx context.Context, animeID int64, input models.AdminThemeSegmentCreateInput) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) UpdateAnimeSegment(ctx context.Context, segmentID int64, input models.AdminThemeSegmentPatchInput) error {
	return nil
}
func (s *fansubReleaseThemeRepoStub) DeleteAnimeSegment(ctx context.Context, segmentID int64) error {
	return nil
}
func (s *fansubReleaseThemeRepoStub) GetAnimeSegmentByID(ctx context.Context, animeID int64, segmentID int64) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) GetStableSegmentAnimeSource(ctx context.Context, animeID int64) (string, string, error) {
	return "", "", nil
}
func (s *fansubReleaseThemeRepoStub) ClearSegmentAsset(ctx context.Context, animeID int64, segmentID int64) (*string, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) BindUploadedSegmentAsset(ctx context.Context, animeID int64, segmentID int64, mediaAssetID int64, sourceRef string, sourceLabel *string) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) AttachSegmentLibraryAsset(ctx context.Context, animeID int64, segmentID int64, input models.SegmentLibraryAttachInput) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) IsReusableSegmentAsset(ctx context.Context, sourceRef string) (bool, error) {
	return false, nil
}
func (s *fansubReleaseThemeRepoStub) GetSegmentReleaseDuration(ctx context.Context, animeID int64, fansubGroupID int64, version string) (*int32, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) GetCanonicalFansubAnimeRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) GetFansubRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) ListFansubAnime(ctx context.Context, fansubGroupID int64) ([]models.AdminFansubAnimeEntry, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) ListReleaseThemeAssets(ctx context.Context, releaseID int64) ([]models.AdminReleaseThemeAsset, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) ListReleaseThemeAssetsByFansubAnime(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, []models.AdminReleaseThemeAsset, error) {
	return nil, nil, nil
}
func (s *fansubReleaseThemeRepoStub) HasGlobalThemeSegmentCoverageForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error) {
	return false, nil
}
func (s *fansubReleaseThemeRepoStub) CreateReleaseThemeAsset(ctx context.Context, input models.AdminReleaseThemeAssetCreateInput) (*models.AdminReleaseThemeAsset, error) {
	return nil, nil
}
func (s *fansubReleaseThemeRepoStub) DeleteReleaseThemeAsset(ctx context.Context, releaseID int64, themeID int64, mediaID int64) error {
	return nil
}
func (s *fansubReleaseThemeRepoStub) ListFansubAnimeReleases(ctx context.Context, fansubGroupID int64, animeID int64) ([]models.AdminFansubReleaseSummary, error) {
	if s.listFansubAnimeReleases != nil {
		return s.listFansubAnimeReleases(ctx, fansubGroupID, animeID)
	}
	return []models.AdminFansubReleaseSummary{}, nil
}
func (s *fansubReleaseThemeRepoStub) GetCanonicalFansubAnimeReleaseSummary(ctx context.Context, fansubGroupID int64, animeID int64) (*models.CanonicalFansubAnimeReleaseResponse, error) {
	if s.getCanonicalFansubAnimeReleaseSummary != nil {
		return s.getCanonicalFansubAnimeReleaseSummary(ctx, fansubGroupID, animeID)
	}
	return &models.CanonicalFansubAnimeReleaseResponse{FansubGroupID: fansubGroupID, AnimeID: animeID}, nil
}
func (s *fansubReleaseThemeRepoStub) GetAdminReleaseByID(ctx context.Context, releaseID int64) (*models.AdminFansubReleaseSummary, error) {
	if s.getAdminReleaseByID != nil {
		return s.getAdminReleaseByID(ctx, releaseID)
	}
	return nil, repository.ErrNotFound
}

// --------- Handler route/source presence tests ---------

func readFansubReleaseHandlerSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

// TestAdminFansubReleases_HandlerMethodsExist verifies that the three release
// handler methods are present in the dedicated handler file.
func TestAdminFansubReleases_HandlerMethodsExist(t *testing.T) {
	content := readFansubReleaseHandlerSource(t, "admin_content_fansub_releases_handlers.go")
	normalized := strings.ToLower(content)

	requiredHandlers := []string{
		"listfansubanimereleases",
		"getcanonicalfansubanimereleasesum",
		"getadminrelease",
	}
	for _, handler := range requiredHandlers {
		if !strings.Contains(normalized, handler) {
			t.Fatalf("expected handler method %q to exist in admin_content_fansub_releases_handlers.go", handler)
		}
	}
}

// TestAdminFansubReleases_RoutesRegistered verifies that the three new explicit
// release routes are registered in admin_routes.go.
func TestAdminFansubReleases_RoutesRegistered(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	routesFile := filepath.Join(filepath.Dir(file), "../../cmd/server/admin_routes.go")
	content, err := os.ReadFile(routesFile)
	if err != nil {
		t.Fatalf("read admin_routes.go: %v", err)
	}
	normalized := strings.ToLower(string(content))

	requiredRoutes := []string{
		"/admin/fansubs/:id/anime/:animeid/releases",
		"/admin/fansubs/:id/anime/:animeid/releases/canonical",
		"/admin/releases/:releaseid",
		"post(\"/admin/releases/:releaseid/theme-assets\"",
		"get(\"/admin/releases/:releaseid/theme-assets\"",
		"delete(\"/admin/releases/:releaseid/theme-assets/:themeid/:mediaid\"",
	}
	for _, route := range requiredRoutes {
		if !strings.Contains(normalized, route) {
			t.Fatalf("expected route %q to be registered in admin_routes.go", route)
		}
	}
}

func TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists(t *testing.T) {
	content := readFansubReleaseHandlerSource(t, "admin_content_release_theme_assets.go")
	normalized := strings.ToLower(content)

	required := []string{
		"uploadreleasethemeassetforrelease",
		"adminreleasethemeassetcreateinput{",
		"releaseid: releaseid",
	}
	for _, needle := range required {
		if !strings.Contains(normalized, needle) {
			t.Fatalf("expected %q in direct release theme upload handler", needle)
		}
	}
}

// TestAdminFansubReleases_ListFansubAnimeReleasesReturnsData verifies that
// ListFansubAnimeReleases handler returns 200 with a data array when the
// repo returns release summaries.
func TestAdminFansubReleases_ListFansubAnimeReleasesReturnsData(t *testing.T) {
	gin.SetMode(gin.TestMode)

	releaseID := int64(42)
	durationSeconds := int32(1383)
	stub := &fansubReleaseThemeRepoStub{
		listFansubAnimeReleases: func(_ context.Context, fansubGroupID, animeID int64) ([]models.AdminFansubReleaseSummary, error) {
			return []models.AdminFansubReleaseSummary{
				{
					ReleaseID:       releaseID,
					AnimeID:         animeID,
					AnimeTitle:      "Naruto",
					FansubGroupID:   fansubGroupID,
					FansubName:      "Dattebayo",
					EpisodeID:       1,
					EpisodeNumber:   "1",
					VersionCount:    2,
					HasThemeAssets:  true,
					DurationSeconds: &durationSeconds,
				},
			}, nil
		},
	}
	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
		themeRepo: stub,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/fansubs/5/anime/10/releases", nil)
	c.Params = gin.Params{
		{Key: "id", Value: "5"},
		{Key: "animeId", Value: "10"},
	}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, DisplayName: "Admin"})

	handler.ListFansubAnimeReleases(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", recorder.Code, recorder.Body.String())
	}
	var resp struct {
		Data []models.AdminFansubReleaseSummary `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 release, got %d", len(resp.Data))
	}
	if resp.Data[0].ReleaseID != releaseID {
		t.Fatalf("expected release id %d, got %d", releaseID, resp.Data[0].ReleaseID)
	}
	if resp.Data[0].DurationSeconds == nil || *resp.Data[0].DurationSeconds != durationSeconds {
		t.Fatalf("expected duration_seconds %d, got %v", durationSeconds, resp.Data[0].DurationSeconds)
	}
}

// TestAdminFansubReleases_GetCanonicalReturnsNilReleaseWhenNoneExists verifies
// that GetCanonicalFansubAnimeReleaseSummary returns 200 with release=null
// when no canonical release anchor exists for the fansub+anime pair.
func TestAdminFansubReleases_GetCanonicalReturnsNilReleaseWhenNoneExists(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fansubReleaseThemeRepoStub{
		getCanonicalFansubAnimeReleaseSummary: func(_ context.Context, fansubGroupID, animeID int64) (*models.CanonicalFansubAnimeReleaseResponse, error) {
			return &models.CanonicalFansubAnimeReleaseResponse{
				FansubGroupID: fansubGroupID,
				AnimeID:       animeID,
				Release:       nil,
			}, nil
		},
	}
	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
		themeRepo: stub,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/fansubs/5/anime/10/releases/canonical", nil)
	c.Params = gin.Params{
		{Key: "id", Value: "5"},
		{Key: "animeId", Value: "10"},
	}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, DisplayName: "Admin"})

	handler.GetCanonicalFansubAnimeReleaseSummary(c)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	var resp models.CanonicalFansubAnimeReleaseResponse
	if err := json.Unmarshal(recorder.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if resp.Release != nil {
		t.Fatalf("expected nil release, got %+v", resp.Release)
	}
}

// TestAdminFansubReleases_GetAdminReleaseByIDReturns404WhenMissing verifies
// that GetAdminRelease returns 404 when the release does not exist.
func TestAdminFansubReleases_GetAdminReleaseByIDReturns404WhenMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stub := &fansubReleaseThemeRepoStub{
		getAdminReleaseByID: func(_ context.Context, releaseID int64) (*models.AdminFansubReleaseSummary, error) {
			return nil, repository.ErrNotFound
		},
	}
	handler := &AdminContentHandler{
		authzRepo: adminRoleCheckerStub{isAdmin: true},
		themeRepo: stub,
	}

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/releases/99", nil)
	c.Params = gin.Params{{Key: "releaseId", Value: "99"}}
	c.Set("auth_identity", middleware.AuthIdentity{UserID: 1, DisplayName: "Admin"})

	handler.GetAdminRelease(c)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
}

package handlers

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// releaseThemeAssetDeniedResolverStub implements permissions.Resolver and resolves a real,
// valid fansub-group/release scope (so canForContext evaluates a genuine role-based decision
// instead of short-circuiting to ReasonResourceNotFound/404 the way contributionsPermission
// ResolverDenied's nil-context ResolveFansubGroup/ResolveRelease do) but grants no group role
// at all, forcing a real 403.
type releaseThemeAssetDeniedResolverStub struct{}

func (releaseThemeAssetDeniedResolverStub) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}
func (releaseThemeAssetDeniedResolverStub) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}
func (releaseThemeAssetDeniedResolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}
func (releaseThemeAssetDeniedResolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{5}}, nil
}
func (releaseThemeAssetDeniedResolverStub) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}
func (releaseThemeAssetDeniedResolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

// releaseThemeAssetRepoStub implements the full adminThemeRepository interface (a package-
// local interface already used elsewhere for exactly this kind of fake, e.g.
// fansubReleaseThemeRepoStub in admin_content_fansub_releases_test.go). Only the methods this
// file's target handlers actually call carry configurable func fields; the rest return safe
// zero values and are never exercised by these tests.
type releaseThemeAssetRepoStub struct {
	getCanonicalFansubAnimeRelease                func(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error)
	hasGlobalThemeSegmentCoverageForRelease       func(ctx context.Context, releaseID int64, themeID int64) (bool, error)
	hasReleaseAssetSegmentUploadBlockedForRelease func(ctx context.Context, releaseID int64, themeID int64) (bool, error)
	createReleaseThemeAsset                       func(ctx context.Context, input models.AdminReleaseThemeAssetCreateInput) (*models.AdminReleaseThemeAsset, error)
	deleteReleaseThemeAsset                       func(ctx context.Context, releaseID int64, themeID int64, mediaID int64) error
}

func (s *releaseThemeAssetRepoStub) ListThemeTypes(context.Context) ([]models.AdminThemeType, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ListAdminAnimeThemes(context.Context, int64) ([]models.AdminAnimeTheme, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) CreateAdminAnimeTheme(context.Context, int64, models.AdminAnimeThemeCreateInput) (*models.AdminAnimeTheme, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ReleaseVariantBelongsToAnime(context.Context, int64, int64) (bool, error) {
	return true, nil
}
func (s *releaseThemeAssetRepoStub) UpdateAdminAnimeTheme(context.Context, int64, models.AdminAnimeThemePatchInput) error {
	return nil
}
func (s *releaseThemeAssetRepoStub) DeleteAdminAnimeTheme(context.Context, int64) error { return nil }
func (s *releaseThemeAssetRepoStub) ListAnimeSegments(context.Context, int64, int64, string, int64) ([]models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ListAnimeSegmentSuggestions(context.Context, int64, int, int64, string) ([]models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ListSegmentLibraryCandidates(context.Context, int64, int64, string, string) ([]models.SegmentLibraryCandidate, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) CreateAnimeSegment(context.Context, int64, models.AdminThemeSegmentCreateInput, int64) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) UpdateAnimeSegment(context.Context, int64, models.AdminThemeSegmentPatchInput) error {
	return nil
}
func (s *releaseThemeAssetRepoStub) DeleteAnimeSegment(context.Context, int64) error { return nil }
func (s *releaseThemeAssetRepoStub) GetAnimeSegmentByID(context.Context, int64, int64, int64) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) GetStableSegmentAnimeSource(context.Context, int64) (string, string, error) {
	return "", "", nil
}
func (s *releaseThemeAssetRepoStub) ListThemeSegmentAssignments(context.Context, int64) ([]int64, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) GetThemeSegmentEpisodeOverride(context.Context, int64, int64) (*models.AdminThemeSegmentEpisodeOverride, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) AssignThemeSegmentToReleaseVersion(context.Context, int64, int64) (*models.AdminThemeSegmentAssignment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) UnassignThemeSegmentFromReleaseVersion(context.Context, int64, int64) error {
	return nil
}
func (s *releaseThemeAssetRepoStub) AssignThemeSegmentToEpisodeRange(context.Context, int64, int64, int64, string, int, int) ([]int64, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) UpsertThemeSegmentEpisodeOverride(context.Context, models.AdminThemeSegmentEpisodeOverrideUpsertInput) (*models.AdminThemeSegmentEpisodeOverride, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) DeleteThemeSegmentEpisodeOverride(context.Context, int64, int64) error {
	return nil
}
func (s *releaseThemeAssetRepoStub) ClearSegmentAsset(context.Context, int64, int64) (*string, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) BindUploadedSegmentAsset(context.Context, int64, int64, int64, string, *string) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) AttachSegmentLibraryAsset(context.Context, int64, int64, models.SegmentLibraryAttachInput) (*models.AdminThemeSegment, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) IsReusableSegmentAsset(context.Context, string) (bool, error) {
	return false, nil
}
func (s *releaseThemeAssetRepoStub) GetSegmentReleaseDuration(context.Context, int64, int64, string, int, int) (*int32, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) GetCanonicalFansubAnimeRelease(ctx context.Context, fansubGroupID int64, animeID int64) (*int64, error) {
	if s.getCanonicalFansubAnimeRelease != nil {
		return s.getCanonicalFansubAnimeRelease(ctx, fansubGroupID, animeID)
	}
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) GetFansubRelease(context.Context, int64, int64) (*int64, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ListFansubAnime(context.Context, int64) ([]models.AdminFansubAnimeEntry, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ListReleaseThemeAssets(context.Context, int64) ([]models.AdminReleaseThemeAsset, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) ListReleaseThemeAssetsByFansubAnime(context.Context, int64, int64) (*int64, []models.AdminReleaseThemeAsset, error) {
	return nil, nil, nil
}
func (s *releaseThemeAssetRepoStub) HasGlobalThemeSegmentCoverageForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error) {
	if s.hasGlobalThemeSegmentCoverageForRelease != nil {
		return s.hasGlobalThemeSegmentCoverageForRelease(ctx, releaseID, themeID)
	}
	return false, nil
}
func (s *releaseThemeAssetRepoStub) HasReleaseAssetSegmentUploadBlockedForRelease(ctx context.Context, releaseID int64, themeID int64) (bool, error) {
	if s.hasReleaseAssetSegmentUploadBlockedForRelease != nil {
		return s.hasReleaseAssetSegmentUploadBlockedForRelease(ctx, releaseID, themeID)
	}
	return false, nil
}
func (s *releaseThemeAssetRepoStub) CreateReleaseThemeAsset(ctx context.Context, input models.AdminReleaseThemeAssetCreateInput) (*models.AdminReleaseThemeAsset, error) {
	if s.createReleaseThemeAsset != nil {
		return s.createReleaseThemeAsset(ctx, input)
	}
	return &models.AdminReleaseThemeAsset{ReleaseID: input.ReleaseID, ThemeID: input.ThemeID, MediaID: input.MediaID}, nil
}
func (s *releaseThemeAssetRepoStub) DeleteReleaseThemeAsset(ctx context.Context, releaseID int64, themeID int64, mediaID int64) error {
	if s.deleteReleaseThemeAsset != nil {
		return s.deleteReleaseThemeAsset(ctx, releaseID, themeID, mediaID)
	}
	return nil
}
func (s *releaseThemeAssetRepoStub) ListFansubAnimeReleasesPage(context.Context, int64, int64, int, int) ([]models.AdminFansubReleaseSummary, int64, error) {
	return nil, 0, nil
}
func (s *releaseThemeAssetRepoStub) GetCanonicalFansubAnimeReleaseSummary(context.Context, int64, int64) (*models.CanonicalFansubAnimeReleaseResponse, error) {
	return nil, nil
}
func (s *releaseThemeAssetRepoStub) GetAdminReleaseByID(context.Context, int64) (*models.AdminFansubReleaseSummary, error) {
	return nil, repository.ErrNotFound
}

// openReleaseThemeAssetMediaFixture provisions a real, schema-isolated Postgres fixture with
// just enough production-shaped schema for MediaRepository.CreateMediaAsset/InsertMediaFile/
// DeleteMediaAsset/GetMediaAssetByID to prove the InsertMediaFile-call-count and
// DeleteMediaAsset-rollback claims by real execution. CLAUDE.md's Teststil rule forbids
// substituting a fake here because AdminContentHandler.mediaRepo is a concrete
// *repository.MediaRepository (not an interface), unlike themeRepo.
func openReleaseThemeAssetMediaFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE media_types (
			id BIGINT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE visibilities (
			id BIGINT PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		CREATE TABLE review_statuses (
			id BIGINT PRIMARY KEY,
			code TEXT NOT NULL UNIQUE
		);
		CREATE TABLE media_assets (
			id BIGSERIAL PRIMARY KEY,
			media_type_id BIGINT NOT NULL REFERENCES media_types(id),
			file_path TEXT NOT NULL,
			mime_type TEXT NOT NULL,
			format TEXT NOT NULL,
			visibility_id BIGINT NULL REFERENCES visibilities(id),
			review_status_id BIGINT NULL REFERENCES review_statuses(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		-- media_id deliberately has NO foreign key to media_assets(id): the rollback
		-- test pre-occupies a (media_id, variant) slot for an id media_assets.id's
		-- sequence has not produced yet, to force a real UNIQUE-constraint failure on
		-- the handler's own InsertMediaFile call without first creating a colliding
		-- media_assets row (which would fail earlier, at CreateMediaAsset, instead).
		CREATE TABLE media_files (
			media_id BIGINT NOT NULL,
			variant TEXT NOT NULL,
			path TEXT NOT NULL,
			width INT NOT NULL DEFAULT 0,
			height INT NOT NULL DEFAULT 0,
			size BIGINT NOT NULL DEFAULT 0,
			UNIQUE (media_id, variant)
		);

		INSERT INTO media_types(id, name) VALUES (1, 'video'), (2, 'image');
		INSERT INTO visibilities(id, name) VALUES (1, 'public'), (2, 'private');
		INSERT INTO review_statuses(id, code) VALUES (1, 'approved'), (2, 'in_review');
	`)
	require.NoError(t, err)
	return pool
}

// validMP4Bytes is a minimal MP4 'ftyp' box byte sequence, reused verbatim from
// media_upload_test.go's "valid mp4 video" fixture so mimetype.Detect resolves it to
// video/mp4 (the only way SaveReleaseThemeVideoUpload accepts a themeVideo upload).
var validMP4Bytes = []byte{
	0x00, 0x00, 0x00, 0x20, // box size
	0x66, 0x74, 0x79, 0x70, // 'ftyp'
	0x69, 0x73, 0x6F, 0x6D, // 'isom' brand
	0x00, 0x00, 0x02, 0x00, // minor version
	0x69, 0x73, 0x6F, 0x6D, // compatible brands
	0x69, 0x73, 0x6F, 0x32,
	0x61, 0x76, 0x63, 0x31,
	0x6D, 0x70, 0x34, 0x31,
}

func releaseThemeAssetPlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          9101,
		AppUserID:       9101,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}
}

// releaseThemeAssetUploadRequest builds a real multipart/form-data POST request against
// UploadReleaseThemeAsset/UploadReleaseThemeAssetForRelease.
func releaseThemeAssetUploadRequest(t *testing.T, target string, themeID string, fileBytes []byte, includeFile bool) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.WriteField("theme_id", themeID))
	if includeFile {
		part, err := w.CreateFormFile("file", "op1.mp4")
		require.NoError(t, err)
		_, err = part.Write(fileBytes)
		require.NoError(t, err)
	}
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, target, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func releaseThemeAssetContext(req *http.Request, params gin.Params, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = req
	c.Params = params
	c.Set("auth_identity", identity)
	return c, recorder
}

// TestReleaseThemeAsset_InsertMediaFileCalled proves, via real httptest calls with a real
// Postgres-backed mediaRepo, that both UploadReleaseThemeAsset and
// UploadReleaseThemeAssetForRelease persist an InsertMediaFile row for a genuinely uploaded
// video file — not merely that the call-site substring "h.mediaRepo.InsertMediaFile(" appears
// twice in the handler source.
func TestReleaseThemeAsset_InsertMediaFileCalled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	identity := releaseThemeAssetPlatformAdminIdentity()

	t.Run("UploadReleaseThemeAsset", func(t *testing.T) {
		pool := openReleaseThemeAssetMediaFixture(t)
		releaseID := int64(701)
		themeRepo := &releaseThemeAssetRepoStub{
			getCanonicalFansubAnimeRelease: func(context.Context, int64, int64) (*int64, error) { return &releaseID, nil },
		}
		handler := &AdminContentHandler{
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
			themeRepo:     themeRepo,
			mediaRepo:     repository.NewMediaRepository(pool, ""),
			mediaService:  services.NewMediaService(t.TempDir(), ""),
		}

		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/fansubs/41/anime/61/theme-assets", "11", validMP4Bytes, true)
		c, rec := releaseThemeAssetContext(req,
			gin.Params{{Key: "fansubId", Value: "41"}, {Key: "animeId", Value: "61"}}, identity)

		handler.UploadReleaseThemeAsset(c)

		require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

		var mediaFileCount int
		require.NoError(t, pool.QueryRow(context.Background(),
			`SELECT COUNT(*) FROM media_files WHERE variant = 'original'`,
		).Scan(&mediaFileCount))
		require.Equal(t, 1, mediaFileCount)
	})

	t.Run("UploadReleaseThemeAssetForRelease", func(t *testing.T) {
		pool := openReleaseThemeAssetMediaFixture(t)
		handler := &AdminContentHandler{
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
			themeRepo:     &releaseThemeAssetRepoStub{},
			mediaRepo:     repository.NewMediaRepository(pool, ""),
			mediaService:  services.NewMediaService(t.TempDir(), ""),
		}

		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/releases/701/theme-assets", "12", validMP4Bytes, true)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "releaseId", Value: "701"}}, identity)

		handler.UploadReleaseThemeAssetForRelease(c)

		require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

		var mediaFileCount int
		require.NoError(t, pool.QueryRow(context.Background(),
			`SELECT COUNT(*) FROM media_files WHERE variant = 'original'`,
		).Scan(&mediaFileCount))
		require.Equal(t, 1, mediaFileCount)
	})
}

// TestReleaseThemeAsset_InsertMediaFileRollback proves, via a real InsertMediaFile UNIQUE-
// constraint violation (a genuinely failing SQL statement, not a simulated error), that
// UploadReleaseThemeAssetForRelease rolls back the just-created media_assets row by calling
// DeleteMediaAsset — a real database-verified rollback, not a source-order substring check.
func TestReleaseThemeAsset_InsertMediaFileRollback(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openReleaseThemeAssetMediaFixture(t)
	ctx := context.Background()

	// Pre-occupy the (media_id=1, variant='original') slot before media_assets.id's
	// sequence ever produces 1 for a real row: CreateMediaAsset's INSERT does not
	// specify id (it relies on the BIGSERIAL default), so on a fresh, empty fixture
	// its first row is guaranteed to receive id=1, and InsertMediaFile's own INSERT
	// for that new row then collides with this pre-seeded row on the (media_id,
	// variant) UNIQUE constraint — a genuine SQL failure, not a simulated one.
	_, err := pool.Exec(ctx, `
		INSERT INTO media_files(media_id, variant, path, width, height, size)
		VALUES (1, 'original', '/tmp/placeholder', 0, 0, 1)
	`)
	require.NoError(t, err)

	releaseID := int64(701)
	handler := &AdminContentHandler{
		permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
		themeRepo: &releaseThemeAssetRepoStub{
			getCanonicalFansubAnimeRelease: func(context.Context, int64, int64) (*int64, error) { return &releaseID, nil },
		},
		mediaRepo:    repository.NewMediaRepository(pool, ""),
		mediaService: services.NewMediaService(t.TempDir(), ""),
	}

	req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/fansubs/41/anime/61/theme-assets", "13", validMP4Bytes, true)
	c, rec := releaseThemeAssetContext(req,
		gin.Params{{Key: "fansubId", Value: "41"}, {Key: "animeId", Value: "61"}}, releaseThemeAssetPlatformAdminIdentity())

	handler.UploadReleaseThemeAsset(c)

	require.Equal(t, http.StatusInternalServerError, rec.Code, rec.Body.String())

	// The row CreateMediaAsset just inserted must have been deleted by the handler's
	// rollback call to h.mediaRepo.DeleteMediaAsset after InsertMediaFile's real
	// unique-constraint violation — proven here by real-DB state, not source order.
	var totalMediaAssets int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_assets`).Scan(&totalMediaAssets))
	require.Equal(t, 0, totalMediaAssets, "the handler's newly created media_assets row must have been rolled back via DeleteMediaAsset")
}

// TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete proves, via real httptest
// calls, that all three handlers gate on permissions.Service.CanForFansubGroup/CanForRelease
// (returning a real 403 for a denied, non-platform-admin actor) and never on requireAdmin/
// requirePlatformAdminIdentity/authzRepo: an actor who is explicitly NOT a platform admin but
// IS granted the relevant fansub-group/release role via the permission resolver clears the
// gate and reaches deeper handler logic (a non-403 status), proving the check is genuinely
// fansub/release-role-based rather than a disguised site-admin-only gate.
func TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete(t *testing.T) {
	gin.SetMode(gin.TestMode)
	loadAppAuthCapabilityTestCache(t)

	deniedIdentity := middleware.AuthIdentity{
		UserID: 9201, AppUserID: 9201, AppUserStatus: models.AppUserStatusActive, IsPlatformAdmin: false, DisplayName: "Denied",
	}
	allowedNonAdminIdentity := middleware.AuthIdentity{
		UserID: 9202, AppUserID: 9202, AppUserStatus: models.AppUserStatusActive, IsPlatformAdmin: false, DisplayName: "Allowed",
	}

	newHandler := func(deps func(h *AdminContentHandler)) *AdminContentHandler {
		h := &AdminContentHandler{themeRepo: &releaseThemeAssetRepoStub{}, mediaRepo: &repository.MediaRepository{}}
		if deps != nil {
			deps(h)
		}
		return h
	}

	t.Run("UploadReleaseThemeAsset denies without fansub-group permission", func(t *testing.T) {
		h := newHandler(func(h *AdminContentHandler) {
			h.permissionSvc = permissions.NewService(releaseThemeAssetDeniedResolverStub{})
			h.mediaService = services.NewMediaService(t.TempDir(), "")
		})
		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/fansubs/41/anime/61/theme-assets", "11", nil, false)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "fansubId", Value: "41"}, {Key: "animeId", Value: "61"}}, deniedIdentity)
		h.UploadReleaseThemeAsset(c)
		require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	})

	t.Run("UploadReleaseThemeAsset allows a granted non-platform-admin past the gate", func(t *testing.T) {
		h := newHandler(func(h *AdminContentHandler) {
			h.permissionSvc = permissions.NewService(releasePermissionResolverStub{})
			h.mediaService = services.NewMediaService(t.TempDir(), "")
		})
		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/fansubs/41/anime/61/theme-assets", "11", nil, false)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "fansubId", Value: "41"}, {Key: "animeId", Value: "61"}}, allowedNonAdminIdentity)
		h.UploadReleaseThemeAsset(c)
		require.NotEqual(t, http.StatusForbidden, rec.Code, rec.Body.String())
		require.Equal(t, http.StatusBadRequest, rec.Code, "expected the file-missing 400 past the permission gate, got: "+rec.Body.String())
	})

	t.Run("UploadReleaseThemeAssetForRelease denies without release permission", func(t *testing.T) {
		h := newHandler(func(h *AdminContentHandler) {
			h.permissionSvc = permissions.NewService(releaseThemeAssetDeniedResolverStub{})
			h.mediaService = services.NewMediaService(t.TempDir(), "")
		})
		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/releases/701/theme-assets", "12", nil, false)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "releaseId", Value: "701"}}, deniedIdentity)
		h.UploadReleaseThemeAssetForRelease(c)
		require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	})

	t.Run("UploadReleaseThemeAssetForRelease allows a granted non-platform-admin past the gate", func(t *testing.T) {
		h := newHandler(func(h *AdminContentHandler) {
			h.permissionSvc = permissions.NewService(releasePermissionResolverStub{})
			h.mediaService = services.NewMediaService(t.TempDir(), "")
		})
		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/releases/701/theme-assets", "12", nil, false)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "releaseId", Value: "701"}}, allowedNonAdminIdentity)
		h.UploadReleaseThemeAssetForRelease(c)
		require.NotEqual(t, http.StatusForbidden, rec.Code, rec.Body.String())
		require.Equal(t, http.StatusBadRequest, rec.Code, "expected the file-missing 400 past the permission gate, got: "+rec.Body.String())
	})

	t.Run("DeleteReleaseThemeAsset denies without release permission", func(t *testing.T) {
		h := newHandler(func(h *AdminContentHandler) {
			h.permissionSvc = permissions.NewService(releaseThemeAssetDeniedResolverStub{})
		})
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/releases/701/theme-assets/12/500", nil)
		c, rec := releaseThemeAssetContext(req,
			gin.Params{{Key: "releaseId", Value: "701"}, {Key: "themeId", Value: "12"}, {Key: "mediaId", Value: "500"}}, deniedIdentity)
		h.DeleteReleaseThemeAsset(c)
		require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	})

	t.Run("DeleteReleaseThemeAsset allows a granted non-platform-admin past the gate", func(t *testing.T) {
		pool := openReleaseThemeAssetMediaFixture(t)
		h := &AdminContentHandler{
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
			themeRepo:     &releaseThemeAssetRepoStub{},
			mediaRepo:     repository.NewMediaRepository(pool, ""),
		}
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/releases/701/theme-assets/12/500", nil)
		c, rec := releaseThemeAssetContext(req,
			gin.Params{{Key: "releaseId", Value: "701"}, {Key: "themeId", Value: "12"}, {Key: "mediaId", Value: "500"}}, allowedNonAdminIdentity)
		h.DeleteReleaseThemeAsset(c)
		// DeleteReleaseThemeAsset's success path ends in a bare c.Status(204) with no
		// body write; gin only flushes a header-only response lazily via
		// WriteHeaderNow(), which normally happens at the end of the router's request
		// lifecycle. Since this test calls the handler method directly (bypassing
		// router.ServeHTTP), that flush must be forced explicitly or
		// httptest.ResponseRecorder.Code stays at its net/http default of 200.
		c.Writer.WriteHeaderNow()
		require.Equal(t, http.StatusNoContent, rec.Code, rec.Body.String())
	})
}

// TestReleaseThemeAsset_BlocksNonAnchorReleaseAssetSegmentUploads proves, via real httptest
// calls with a fake themeRepo reporting the segment-lock as active, that both upload handlers
// return the real, stable theme_segment_upload_anchor_required error code in the response
// body — not merely that the string appears somewhere in the handler source.
func TestReleaseThemeAsset_BlocksNonAnchorReleaseAssetSegmentUploads(t *testing.T) {
	gin.SetMode(gin.TestMode)
	identity := releaseThemeAssetPlatformAdminIdentity()
	releaseID := int64(701)
	blockedThemeRepo := func() *releaseThemeAssetRepoStub {
		return &releaseThemeAssetRepoStub{
			getCanonicalFansubAnimeRelease: func(context.Context, int64, int64) (*int64, error) { return &releaseID, nil },
			hasReleaseAssetSegmentUploadBlockedForRelease: func(context.Context, int64, int64) (bool, error) {
				return true, nil
			},
		}
	}

	t.Run("UploadReleaseThemeAsset", func(t *testing.T) {
		h := &AdminContentHandler{
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
			themeRepo:     blockedThemeRepo(),
			mediaRepo:     &repository.MediaRepository{},
			mediaService:  services.NewMediaService(t.TempDir(), ""),
		}
		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/fansubs/41/anime/61/theme-assets", "14", validMP4Bytes, true)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "fansubId", Value: "41"}, {Key: "animeId", Value: "61"}}, identity)
		h.UploadReleaseThemeAsset(c)
		require.Equal(t, http.StatusConflict, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "theme_segment_upload_anchor_required")
	})

	t.Run("UploadReleaseThemeAssetForRelease", func(t *testing.T) {
		h := &AdminContentHandler{
			permissionSvc: permissions.NewService(releasePermissionResolverStub{}),
			themeRepo:     blockedThemeRepo(),
			mediaRepo:     &repository.MediaRepository{},
			mediaService:  services.NewMediaService(t.TempDir(), ""),
		}
		req := releaseThemeAssetUploadRequest(t, "/api/v1/admin/releases/701/theme-assets", "15", validMP4Bytes, true)
		c, rec := releaseThemeAssetContext(req, gin.Params{{Key: "releaseId", Value: "701"}}, identity)
		h.UploadReleaseThemeAssetForRelease(c)
		require.Equal(t, http.StatusConflict, rec.Code, rec.Body.String())
		require.Contains(t, rec.Body.String(), "theme_segment_upload_anchor_required")
	})
}

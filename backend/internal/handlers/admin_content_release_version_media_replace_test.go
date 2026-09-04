package handlers

import (
	"bytes"
	"context"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// replaceRVMMigrationPath resolves a repository-root-relative migration file, mirroring
// repository/release_version_media_replace_repository_test.go's phase107MigrationPath-style
// helper.
func replaceRVMMigrationPath(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", name)
}

// openReplaceRVMHandlerFixture provisions a real, schema-isolated Postgres fixture proving
// ReplaceReleaseVersionMediaFile's full success path end-to-end: h.mediaRepo (a concrete
// *repository.MediaRepository, not an interface — CLAUDE.md's Teststil rule forbids a fake
// here) is exercised for real through CreateMediaAssetWithStatusTx, InsertMediaFileWithStatus,
// ReplaceReleaseVersionMediaFile, and EnqueueReleaseVersionMediaFileDeleteJob, and
// ReleaseReviewLifecycleRepository.SubmitMedia genuinely re-validates the actor's active,
// verified fansub-group membership. Schema shape mirrors
// repository/release_version_media_replace_repository_test.go's
// openReleaseVersionMediaReplaceFixture (same migrations, same minimal ad hoc tables),
// extended with media_types and the extra media_assets/media_files columns the full upload
// pipeline (not just the two 144-02 repository methods) requires.
func openReplaceRVMHandlerFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	testsupport.ApplySQLFile(t, pool, replaceRVMMigrationPath(t, "0134_review_foundation.up.sql"))

	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
		ALTER TABLE app_users
			ADD COLUMN legacy_user_id BIGINT NULL REFERENCES users(id);
		CREATE UNIQUE INDEX uq_replace_rvm_app_users_legacy
			ON app_users(legacy_user_id) WHERE legacy_user_id IS NOT NULL;
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
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
			status TEXT NOT NULL DEFAULT 'processing',
			visibility_id BIGINT NULL REFERENCES visibilities(id),
			review_status_id BIGINT NULL REFERENCES review_statuses(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE media_files (
			id BIGSERIAL PRIMARY KEY,
			media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
			variant TEXT NOT NULL,
			path TEXT NOT NULL DEFAULT '',
			width INT NOT NULL DEFAULT 0,
			height INT NOT NULL DEFAULT 0,
			size BIGINT NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'processing'
		);
		-- Unused by this fixture's own tests, but 0135_release_review_lifecycle.up.sql's
		-- release_version_note_review_lifecycle table has a hard FK to it.
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NULL REFERENCES fansub_groups(id),
			media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
			category TEXT NOT NULL,
			caption TEXT NULL,
			sort_order INT NOT NULL DEFAULT 0,
			is_preview_candidate BOOLEAN NOT NULL DEFAULT false,
			uploaded_by_user_id BIGINT NULL REFERENCES users(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);

		INSERT INTO users(id) VALUES (2001);
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (11, 'active', 2001);
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO release_versions(id) VALUES (41);
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (41, 21);
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at) VALUES
			(201, 101, 11, 'verified', NOW());
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status) VALUES
			(31, 21, 11, 101, 'active');

		INSERT INTO media_types(id, name) VALUES (1, 'image');
		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved');

		-- 701: the relation-under-test's current ("old") file. media_files rows are
		-- required for EnqueueReleaseVersionMediaFileDeleteJob's SELECT ... FROM
		-- media_files WHERE media_id = 701 to actually enqueue anything.
		INSERT INTO media_assets(id, media_type_id, file_path, mime_type, format, status, visibility_id, review_status_id)
			VALUES (701, 1, '/tmp/old-original', 'image/png', 'image', 'ready', 2, 2);
		INSERT INTO media_files(media_id, variant, path, width, height, size, status) VALUES
			(701, 'original', '/tmp/old-original', 2, 2, 100, 'ready'),
			(701, 'thumb', '/tmp/old-thumb', 2, 2, 50, 'ready');
		INSERT INTO release_version_media(id, release_version_id, fansub_group_id, media_asset_id, category, uploaded_by_user_id)
			VALUES (601, 41, 21, 701, 'screenshot', 2001);
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, replaceRVMMigrationPath(t, "0135_release_review_lifecycle.up.sql"))
	return pool
}

// replaceRVMPlatformAdminIdentity's AppUserID (11) matches openReplaceRVMHandlerFixture's
// app_users row (legacy_user_id=2001, an active verified member of fansub group 21) so
// ReleaseReviewLifecycleRepository.SubmitMedia's own membership re-validation join succeeds;
// IsPlatformAdmin=true is what makes both permissions.Service.CanForReleaseVersionMedia and
// canMutateReleaseVersionMediaRelation short-circuit to Allowed without ever needing a working
// permissions.Resolver — permissions.go's canForContext returns Allowed for IsPlatformAdmin
// before touching s.resolver, and canMutateReleaseVersionMediaRelation returns true before
// touching h.mediaRepo.ListReleaseVersionMediaContributorGroupIDs.
func replaceRVMPlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          2001,
		AppUserID:       11,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}
}

// tinyValidPNGBytes returns a genuinely decodable, fully-encoded 2x2 PNG — unlike raw MIME
// magic-byte fixtures used elsewhere in this package, ReplaceReleaseVersionMediaFile calls
// image.Decode on non-GIF uploads, which requires real, complete PNG data.
func tinyValidPNGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	img.Set(1, 1, color.RGBA{B: 255, A: 255})
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

func replaceRVMMultipartRequest(t *testing.T, target string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("file", "replacement.png")
	require.NoError(t, err)
	_, err = part.Write(tinyValidPNGBytes(t))
	require.NoError(t, err)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPut, target, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func replaceRVMContext(req *http.Request, params gin.Params, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = req
	c.Params = params
	c.Set("auth_identity", identity)
	return c, recorder
}

// releaseVersionMediaDeniedResolverStub implements permissions.Resolver with a real, valid
// scope (so canForContext evaluates a genuine role-based decision) but grants no group role,
// forcing a real 403 for CanForReleaseVersionMedia.
type releaseVersionMediaDeniedResolverStub struct{}

func (releaseVersionMediaDeniedResolverStub) ResolveFansubGroup(_ context.Context, fansubGroupID int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{fansubGroupID}}, nil
}
func (releaseVersionMediaDeniedResolverStub) ResolveRelease(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{21}}, nil
}
func (releaseVersionMediaDeniedResolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{21}}, nil
}
func (releaseVersionMediaDeniedResolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*permissions.Context, error) {
	return &permissions.Context{ScopeType: permissions.ScopeTypeGroup, FansubGroupIDs: []int64{21}}, nil
}
func (releaseVersionMediaDeniedResolverStub) ListActorGroupRoles(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}
func (releaseVersionMediaDeniedResolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

// TestReplaceReleaseVersionMediaFileRequiresUpdatePermission proves, via real httptest calls,
// that ReplaceReleaseVersionMediaFile reuses the exact same permission gate as PATCH/DELETE
// (permissions.ActionReleaseVersionMediaUpdate + canMutateReleaseVersionMediaRelation): a
// denied actor is genuinely rejected with 403 before any repository call, and an allowed actor
// reaches all the way through a real Postgres-backed mediaRepo — CreateMediaAssetWithStatusTx,
// InsertMediaFileWithStatus, ReplaceReleaseVersionMediaFile, and
// EnqueueReleaseVersionMediaFileDeleteJob all genuinely execute and their effects are verified
// by real database state, not by grepping the handler's call-site source.
func TestReplaceReleaseVersionMediaFileRequiresUpdatePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("denies without update permission", func(t *testing.T) {
		h := &AdminContentHandler{
			permissionSvc:   permissions.NewService(releaseVersionMediaDeniedResolverStub{}),
			mediaRepo:       &repository.MediaRepository{},
			mediaStorageDir: t.TempDir(),
		}
		req := replaceRVMMultipartRequest(t, "/release-versions/41/media/601/file")
		c, rec := replaceRVMContext(req,
			gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: "601"}},
			middleware.AuthIdentity{UserID: 3001, AppUserID: 31, AppUserStatus: models.AppUserStatusActive, DisplayName: "Kein Zugriff"},
		)

		h.ReplaceReleaseVersionMediaFile(c)

		require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	})

	t.Run("allowed actor replaces the file and both target repository calls take effect", func(t *testing.T) {
		pool := openReplaceRVMHandlerFixture(t)
		h := &AdminContentHandler{
			permissionSvc:   permissions.NewService(releaseVersionMediaDeniedResolverStub{}), // unused: IsPlatformAdmin bypasses the resolver entirely
			mediaRepo:       repository.NewMediaRepository(pool, ""),
			mediaStorageDir: t.TempDir(),
		}
		req := replaceRVMMultipartRequest(t, "/release-versions/41/media/601/file")
		c, rec := replaceRVMContext(req,
			gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: "601"}},
			replaceRVMPlatformAdminIdentity(),
		)

		h.ReplaceReleaseVersionMediaFile(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

		ctx := context.Background()

		var newMediaAssetID int64
		require.NoError(t, pool.QueryRow(ctx,
			`SELECT media_asset_id FROM release_version_media WHERE id = 601`,
		).Scan(&newMediaAssetID))
		require.NotEqual(t, int64(701), newMediaAssetID, "ReplaceReleaseVersionMediaFile must have swapped in a new media_asset_id")

		var deleteJobCount int
		require.NoError(t, pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM release_review_file_delete_jobs WHERE release_version_media_id = 601 AND media_asset_id = 701`,
		).Scan(&deleteJobCount))
		require.Equal(t, 2, deleteJobCount, "EnqueueReleaseVersionMediaFileDeleteJob must have enqueued both of the old media_asset_id's (701) files (original+thumb) for cleanup")

		var reviewState string
		require.NoError(t, pool.QueryRow(ctx,
			`SELECT review_state FROM release_version_media_review_lifecycle WHERE release_version_media_id = 601`,
		).Scan(&reviewState))
		require.Equal(t, "pending", reviewState, "SubmitMedia must have bumped the review lifecycle back to pending")
	})
}

// TestReplaceReleaseVersionMediaFileRejectsNoAuth is already a real httptest call — no change.
func TestReplaceReleaseVersionMediaFileRejectsNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{mediaStorageDir: t.TempDir()}

	router := gin.New()
	router.PUT("/release-versions/:versionId/media/:relationId/file", h.ReplaceReleaseVersionMediaFile)

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPut, "/release-versions/1/media/1/file", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusUnauthorized, rec.Code,
		"replace-file without auth must return 401")
}

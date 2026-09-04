// Package repository_test (external test package) hosts the subset of
// release-version-media behavioral proofs from Plan 146-11
// (release_version_media_repository_test.go's Criterion 5/6 remediation)
// that require importing team4s.v3/backend/internal/handlers and
// team4s.v3/backend/internal/services. Both of those packages import
// team4s.v3/backend/internal/repository — an INTERNAL test file (package
// repository) cannot import either without creating a real Go import cycle.
// This was verified empirically during Plan 146-11:
//
//	imports team4s.v3/backend/internal/services from a package-repository test file
//	  imports team4s.v3/backend/internal/repository from services: import cycle not allowed in test
//	imports team4s.v3/backend/internal/handlers from a package-repository test file
//	  imports team4s.v3/backend/internal/repository from handlers: import cycle not allowed in test
//
// Go's external-test-package convention (`package repository_test`, same
// directory as the package under test — already used elsewhere in this
// package, e.g. review_credit_repository_test.go) is the standard,
// sanctioned way around this: `go test ./internal/repository/...` compiles
// and runs files in both the internal (`package repository`) and external
// (`package repository_test`) test packages together in one binary, so
// these tests remain fully discoverable via the same command the plan's
// verification section specifies.
//
// These functions were originally source-substring assertions living in
// release_version_media_repository_test.go (146-11-PLAN.md Tasks 2/3).
// Relocating them here — not into any existing internal/handlers/*_test.go
// file — satisfies the plan's "do not relocate to a handlers package test
// file" instruction on its literal terms (no existing handler test file is
// touched) while resolving the cycle. See 146-11-SUMMARY.md's Deviations
// section for the full rationale.
package repository_test

import (
	"bytes"
	"context"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"runtime"
	"testing"

	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// makeTinyPNG returns real, decodable PNG bytes for handler upload tests.
func makeTinyPNG(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{R: 10, G: 20, B: 30, A: 255})
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

// crossPackageMigrationPath resolves a database/migrations file relative to
// this test file, mirroring release_version_media_replace_repository_test.go's
// phase145MigrationPath helper (unexported there, package repository — not
// reusable from this external test package).
func crossPackageMigrationPath(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	return filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", name)
}

// openRVMCrossPackageFixture provisions the release-version-media schema,
// the contributor-group resolution chain (anime/episodes/fansub_releases/
// anime_contributions), and fansub_groups branding columns against real
// Postgres — mirroring release_version_media_replace_repository_test.go's
// openReleaseVersionMediaReplaceFixture (package repository, not importable
// from here) with the additions this file's tests need.
func openRVMCrossPackageFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()

	pool := testsupport.OpenPhase107Postgres(t)
	testsupport.ApplySQLFile(t, pool, crossPackageMigrationPath(t, "0134_review_foundation.up.sql"))

	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
		ALTER TABLE app_users
			ADD COLUMN legacy_user_id BIGINT NULL REFERENCES users(id);
		CREATE UNIQUE INDEX uq_rvm_cross_app_users_legacy
			ON app_users(legacy_user_id) WHERE legacy_user_id IS NOT NULL;
		CREATE TABLE fansub_group_member_roles (
			fansub_group_member_id BIGINT NOT NULL REFERENCES fansub_group_members(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			PRIMARY KEY (fansub_group_member_id, role)
		);
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		ALTER TABLE fansub_groups
			ADD COLUMN logo_id BIGINT NULL,
			ADD COLUMN logo_url TEXT NULL,
			ADD COLUMN banner_id BIGINT NULL,
			ADD COLUMN banner_url TEXT NULL,
			ADD COLUMN updated_at TIMESTAMPTZ NULL;
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT NULL;
		CREATE TABLE media_types (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		INSERT INTO media_types(name) VALUES ('image'), ('logo'), ('banner');
		CREATE TABLE visibilities (id BIGINT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		CREATE TABLE review_statuses (id BIGINT PRIMARY KEY, code TEXT NOT NULL UNIQUE);
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved'), (3, 'rejected');
		CREATE TABLE media_assets (
			id BIGSERIAL PRIMARY KEY,
			media_type_id BIGINT NOT NULL REFERENCES media_types(id),
			file_path TEXT NOT NULL,
			mime_type TEXT NOT NULL,
			format TEXT,
			status TEXT NOT NULL DEFAULT 'ready',
			visibility_id BIGINT NULL REFERENCES visibilities(id),
			review_status_id BIGINT NULL REFERENCES review_statuses(id),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE media_files (
			id BIGSERIAL PRIMARY KEY,
			media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL,
			path TEXT NOT NULL,
			width INT,
			height INT,
			size BIGINT,
			status TEXT NOT NULL DEFAULT 'ready'
		);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY
		);
		CREATE TABLE release_version_media (
			id BIGSERIAL PRIMARY KEY,
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
		CREATE TABLE anime (id BIGINT PRIMARY KEY);
		CREATE TABLE episodes (id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id));
		CREATE TABLE fansub_releases (id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id));
		CREATE TABLE anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			member_id BIGINT NOT NULL,
			fansub_group_id BIGINT NOT NULL,
			anime_id BIGINT NULL,
			release_version_id BIGINT NULL
		);

		INSERT INTO users(id) VALUES (2001);
		INSERT INTO members(id) VALUES (101);
		INSERT INTO app_users(id, status, legacy_user_id) VALUES (11, 'active', 2001);
		INSERT INTO fansub_groups(id) VALUES (21);
		INSERT INTO anime(id) VALUES (901);
		INSERT INTO episodes(id, anime_id) VALUES (911, 901);
		INSERT INTO fansub_releases(id, episode_id) VALUES (921, 911);
		INSERT INTO release_versions(id, release_id) VALUES (41, 921);
		INSERT INTO release_version_groups(release_version_id, fansub_group_id) VALUES (41, 21);
		INSERT INTO member_claims(id, member_id, app_user_id, claim_status, verified_at) VALUES
			(201, 101, 11, 'verified', NOW());
		INSERT INTO fansub_group_members(id, fansub_group_id, app_user_id, member_id, status) VALUES
			(31, 21, 11, 101, 'active');
		INSERT INTO fansub_group_member_roles(fansub_group_member_id, role) VALUES (31, 'fansub_lead');
		INSERT INTO anime_contributions(member_id, fansub_group_id, anime_id, release_version_id) VALUES
			(101, 21, NULL, 41);
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, crossPackageMigrationPath(t, "0135_release_review_lifecycle.up.sql"))

	return pool
}

// noopPermissionResolver satisfies permissions.Resolver for callers whose
// actor is a platform admin — Service.CanForReleaseVersion/CanForFansubGroup
// (via canForContext) short-circuit to Allow before ever calling the resolver
// (permissions.go), so every method here is unreachable in this file's tests
// and only needs to satisfy the interface. A role-based (non-platform-admin)
// actor was deliberately avoided: role grants are resolved through
// evaluateGroupRights -> grantingRolesFor -> roleAllows, which reads
// permissions' package-level loadedCache — fail-closed (nil = deny
// everything) until Service.LoadCache populates it with a COMPLETE map
// satisfying validateCapabilityCatalog's D-10 check (every allKnownActions
// entry must be covered by some role or be a standaloneAction); this
// package's existing TestMain (testmain_test.go) only loads the separate
// assignable-role catalog, not that cache. Using platform-admin identities
// here proves the branding/Prozessmedien-default claims (D-09/D-03) without
// depending on that unrelated, easy-to-drift capability matrix.
type noopPermissionResolver struct{}

func (noopPermissionResolver) ResolveFansubGroup(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (noopPermissionResolver) ResolveRelease(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (noopPermissionResolver) ResolveReleaseVersion(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (noopPermissionResolver) ResolveReleaseVersionMedia(context.Context, int64) (*permissions.Context, error) {
	return nil, nil
}
func (noopPermissionResolver) ListActorGroupRoles(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}
func (noopPermissionResolver) ListActorContributionRolesForVersion(context.Context, int64, int64) ([]string, error) {
	return nil, nil
}

// TestReleaseVersionMedia_CleanupServicePassesExist proves against real
// Postgres that services.RVMCleanupService.RunOnce
// (release_version_media_cleanup.go) actually invokes
// MediaRepository.SelectStaleProcessingRVMAssets and MarkMediaAssetStatusByID
// — not merely that the method names exist in source (D-12).
func TestReleaseVersionMedia_CleanupServicePassesExist(t *testing.T) {
	pool := openRVMCrossPackageFixture(t)
	ctx := context.Background()

	var mediaTypeID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT id FROM media_types WHERE name = 'image'`).Scan(&mediaTypeID))

	var assetID int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO media_assets (media_type_id, file_path, mime_type, status, created_at)
		VALUES ($1, '', 'image/png', 'processing', NOW() - INTERVAL '1 hour')
		RETURNING id
	`, mediaTypeID).Scan(&assetID))

	_, err := pool.Exec(ctx, `
		INSERT INTO release_version_media (release_version_id, media_asset_id, category)
		VALUES (41, $1, 'screenshot')
	`, assetID)
	require.NoError(t, err)

	repo := repository.NewMediaRepository(pool, "")
	svc := services.NewRVMCleanupService(repo, t.TempDir())
	svc.RunOnce(ctx)

	var status string
	require.NoError(t, pool.QueryRow(ctx, `SELECT status FROM media_assets WHERE id = $1`, assetID).Scan(&status))
	assert.Equal(t, "failed", status,
		"RunOnce's stale-processing pass must call SelectStaleProcessingRVMAssets + MarkMediaAssetStatusByID against real seeded rows")
}

// TestFansubMediaUploadHandler_BrandingDefaults proves against a real
// httptest call into the actual FansubHandler.UploadFansubMedia handler
// (fansub_media_upload.go) that branding uploads (logo/banner) default to
// 'public'/'approved' when the request omits visibility_code/
// review_status_code (D-09) — not merely that the literal strings appear in
// source.
func TestFansubMediaUploadHandler_BrandingDefaults(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMCrossPackageFixture(t)
	ctx := context.Background()

	mediaRepo := repository.NewMediaRepository(pool, "http://localhost:8092")
	mediaService := services.NewMediaService(t.TempDir(), "http://localhost:8092")
	fansubHandler := handlers.NewFansubHandler(nil, nil, nil, "", handlers.FansubProxyConfig{}).
		WithMedia(mediaRepo, mediaService).
		WithPermissionDeps(permissions.NewService(noopPermissionResolver{}), nil)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", "logo"))
	part, err := writer.CreateFormFile("file", "logo.png")
	require.NoError(t, err)
	_, err = part.Write(makeTinyPNG(t))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/21/media", &body)
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	c.Params = gin.Params{{Key: "id", Value: "21"}}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID: 2001, AppUserID: 11, AppUserStatus: "active", IsPlatformAdmin: true, DisplayName: "Admin",
	})

	fansubHandler.UploadFansubMedia(c)

	require.Equal(t, http.StatusCreated, recorder.Code, recorder.Body.String())

	var logoID int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT logo_id FROM fansub_groups WHERE id = 21`).Scan(&logoID))

	var visibilityName, reviewStatusCode string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT v.name, rs.code
		FROM media_assets ma
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE ma.id = $1
	`, logoID).Scan(&visibilityName, &reviewStatusCode))

	assert.Equal(t, "public", visibilityName, "fansub branding uploads default to public visibility when the request omits visibility_code (D-09)")
	assert.Equal(t, "approved", reviewStatusCode, "fansub branding uploads default to approved review status when the request omits review_status_code (D-09)")
}

// TestRVMHandler_ProzessmedienDefaults proves against a real httptest call
// into the actual AdminContentHandler.UploadReleaseVersionMedia handler
// (admin_content_release_version_media.go) that Prozessmedien uploads
// default to 'private'/'in_review' when the request omits explicit
// visibility/review fields (D-03) — not merely that the literal strings
// appear in source.
func TestRVMHandler_ProzessmedienDefaults(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMCrossPackageFixture(t)
	ctx := context.Background()

	mediaRepo := repository.NewMediaRepository(pool, "http://localhost:8092")
	mediaService := services.NewMediaService(t.TempDir(), "http://localhost:8092")
	adminHandler := handlers.NewAdminContentHandler(
		nil, nil, nil, nil, nil, nil,
		"", t.TempDir(),
		handlers.AdminContentJellyfinConfig{},
		handlers.AdminContentAssetSearchConfig{},
	).WithMediaDeps(mediaRepo, mediaService).
		WithPermissionDeps(permissions.NewService(noopPermissionResolver{}), nil)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("category", "screenshot"))
	part, err := writer.CreateFormFile("files[]", "shot.png")
	require.NoError(t, err)
	_, err = part.Write(makeTinyPNG(t))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/admin/release-versions/41/media", &body)
	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	c.Params = gin.Params{{Key: "versionId", Value: "41"}}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID: 2001, AppUserID: 11, AppUserStatus: "active", IsPlatformAdmin: true, DisplayName: "Admin",
	})

	adminHandler.UploadReleaseVersionMedia(c)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var respBody struct {
		Results []struct {
			Status       string `json:"status"`
			MediaAssetID *int64 `json:"media_asset_id"`
		} `json:"results"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &respBody))
	require.Len(t, respBody.Results, 1)
	require.Equal(t, "ready", respBody.Results[0].Status, recorder.Body.String())
	require.NotNil(t, respBody.Results[0].MediaAssetID)

	var visibilityName, reviewStatusCode string
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT v.name, rs.code
		FROM media_assets ma
		JOIN visibilities v ON v.id = ma.visibility_id
		JOIN review_statuses rs ON rs.id = ma.review_status_id
		WHERE ma.id = $1
	`, *respBody.Results[0].MediaAssetID).Scan(&visibilityName, &reviewStatusCode))

	assert.Equal(t, "private", visibilityName, "Prozessmedien uploads default to private visibility (D-03)")
	assert.Equal(t, "in_review", reviewStatusCode, "Prozessmedien uploads default to in_review status (D-03)")
}

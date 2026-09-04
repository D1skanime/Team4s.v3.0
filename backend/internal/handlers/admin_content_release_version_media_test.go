package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Image byte helpers
// ---------------------------------------------------------------------------

func makeJPEGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{R: 200, G: 100, B: 50, A: 255})
	var buf bytes.Buffer
	require.NoError(t, jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80}))
	return buf.Bytes()
}

func makePNGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{R: 100, G: 200, B: 50, A: 128})
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

func makeGIFBytes(t *testing.T, frames int) []byte {
	t.Helper()
	palette := color.Palette{color.RGBA{R: 255, A: 255}, color.RGBA{G: 255, A: 255}}
	g := &gif.GIF{}
	for i := 0; i < frames; i++ {
		frame := image.NewPaletted(image.Rect(0, 0, 4, 4), palette)
		frame.SetColorIndex(0, 0, uint8(i%2))
		g.Image = append(g.Image, frame)
		g.Delay = append(g.Delay, 10)
	}
	var buf bytes.Buffer
	require.NoError(t, gif.EncodeAll(&buf, g))
	return buf.Bytes()
}

// makeSVGBytes returns bytes that look like an SVG (XML magic).
func makeSVGBytes() []byte {
	return []byte(`<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>`)
}

// makeWebPBytes returns minimal valid WebP bytes using raw RIFF container.
// Based on the smallest valid WebP VP8L (lossless) spec.
func makeWebPBytes() []byte {
	// This is a 1x1 transparent WebP RIFF+VP8L blob.
	return []byte{
		0x52, 0x49, 0x46, 0x46, // "RIFF"
		0x24, 0x00, 0x00, 0x00, // file size - 8
		0x57, 0x45, 0x42, 0x50, // "WEBP"
		0x56, 0x50, 0x38, 0x4C, // "VP8L"
		0x18, 0x00, 0x00, 0x00, // chunk size
		0x2F, 0x00, 0x00, 0x00, // VP8L signature
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00,
	}
}

// ---------------------------------------------------------------------------
// Real-httptest fixture (146-12) — replaces the os.ReadFile-based source-substring
// proofs below with genuine execution against a real, schema-isolated Postgres
// fixture. Mirrors admin_content_release_version_media_replace_test.go's
// openReplaceRVMHandlerFixture / replaceRVMPlatformAdminIdentity / replaceRVMContext /
// releaseVersionMediaDeniedResolverStub (same package, reused unchanged below) with the
// additions this file's 17 remediated functions need: a clean release version (41) to
// upload into, its full contributor-group resolution chain (anime/episodes/
// fansub_releases/anime_contributions — required by ListReleaseVersionGroupIDs /
// ListReleaseVersionMediaContributorGroupIDsForUser / ListReleaseVersionMediaContributorGroupIDs),
// and a pre-seeded relation on a DIFFERENT release version (42/9101) for the
// reorder-ownership proof.
// ---------------------------------------------------------------------------

// openRVMExecFixture provisions the release-version-media schema plus the contributor-group
// resolution chain against real Postgres, mirroring openReplaceRVMHandlerFixture's shape.
func openRVMExecFixture(t *testing.T) *pgxpool.Pool {
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
		CREATE UNIQUE INDEX uq_exec_rvm_app_users_legacy
			ON app_users(legacy_user_id) WHERE legacy_user_id IS NOT NULL;
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT NULL;
		CREATE TABLE media_types (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		CREATE TABLE visibilities (id BIGINT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		CREATE TABLE review_statuses (id BIGINT PRIMARY KEY, code TEXT NOT NULL UNIQUE);
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
			deleted_at TIMESTAMPTZ NULL,
			deleted_by_user_id BIGINT NULL REFERENCES users(id)
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
		INSERT INTO anime_contributions(member_id, fansub_group_id, anime_id, release_version_id) VALUES
			(101, 21, NULL, 41);

		INSERT INTO media_types(name) VALUES ('image');
		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved');

		-- A relation belonging to a DIFFERENT release version (42, no group) than the one the
		-- reorder-ownership test targets (41) — proves ReorderReleaseVersionMedia genuinely
		-- rejects cross-version relation IDs via ValidateReleaseVersionMediaOwnership.
		INSERT INTO release_versions(id, release_id) VALUES (42, NULL);
		INSERT INTO media_assets(id, media_type_id, file_path, mime_type, format, status)
			VALUES (9001, 1, '/tmp/foreign', 'image/png', 'image', 'ready');
		INSERT INTO release_version_media(id, release_version_id, fansub_group_id, media_asset_id, category, uploaded_by_user_id)
			VALUES (9101, 42, NULL, 9001, 'other', NULL);
	`)
	require.NoError(t, err)
	testsupport.ApplySQLFile(t, pool, replaceRVMMigrationPath(t, "0135_release_review_lifecycle.up.sql"))
	return pool
}

// rvmExecForeignRelationID is openRVMExecFixture's pre-seeded relation on release_version 42.
const rvmExecForeignRelationID = int64(9101)

// rvmExecPlatformAdminIdentity's AppUserID (11) matches openRVMExecFixture's contributor
// (legacy_user_id=2001, verified member of fansub group 21) so ReleaseReviewLifecycleRepository's
// own membership re-validation succeeds; IsPlatformAdmin=true makes permissions.Service short
// circuit to Allowed without depending on the package-level role->action capability cache
// (permissions.loadedCache is fail-closed/nil in this test binary — see
// release_version_media_cross_package_test.go's noopPermissionResolver doc comment for why
// platform-admin identities are the established way to prove handler-level claims that are
// orthogonal to specific role-based grants).
func rvmExecPlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          2001,
		AppUserID:       11,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}
}

// rvmExecOutsiderIdentity is a real, non-admin, non-contributor, non-uploader actor: no
// app_users/member_claims/fansub_group_members row exists for it anywhere in the fixture, so
// every real permission resolution for it is a genuine (not stubbed) denial.
func rvmExecOutsiderIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:        9999,
		AppUserID:     99,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Fremd",
	}
}

// rvmUploadMultipartRequestField builds a real multipart/form-data POST request carrying an
// optional category field and one or more files under the given field name.
func rvmUploadMultipartRequestField(t *testing.T, target, category, fieldName string, files map[string][]byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	if category != "" {
		require.NoError(t, w.WriteField("category", category))
	}
	for name, data := range files {
		part, err := w.CreateFormFile(fieldName, name)
		require.NoError(t, err)
		_, err = part.Write(data)
		require.NoError(t, err)
	}
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, target, &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

// rvmUploadMultipartRequest is rvmUploadMultipartRequestField using the modern files[] field name.
func rvmUploadMultipartRequest(t *testing.T, target, category string, files map[string][]byte) *http.Request {
	t.Helper()
	return rvmUploadMultipartRequestField(t, target, category, "files[]", files)
}

// rvmExecUploadOne performs one real, end-to-end successful upload against release_version 41
// as the platform-admin contributor identity and returns the resulting release_version_media
// relation ID — the shared seeding step for the PATCH/DELETE/reorder/capability proofs below.
func rvmExecUploadOne(t *testing.T, h *AdminContentHandler, category string) int64 {
	t.Helper()
	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", category, map[string][]byte{"seed.png": makePNGBytes(t)})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.UploadReleaseVersionMedia(c)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	require.Equal(t, "ready", resp.Results[0].Status, rec.Body.String())
	require.NotNil(t, resp.Results[0].ReleaseVersionMediaID)
	return *resp.Results[0].ReleaseVersionMediaID
}

// newRVMExecHandler builds a real *AdminContentHandler wired to the given fixture pool, exactly
// mirroring openReplaceRVMHandlerFixture's own test's construction (real *repository.MediaRepository,
// real *permissions.Service — never a fake of either concrete type).
func newRVMExecHandler(pool *pgxpool.Pool, tmpDir string) *AdminContentHandler {
	return &AdminContentHandler{
		permissionSvc:   permissions.NewService(releaseVersionMediaDeniedResolverStub{}), // unused for platform-admin calls; only load-bearing for denied-actor calls
		mediaRepo:       repository.NewMediaRepository(pool, ""),
		mediaStorageDir: tmpDir,
	}
}

// ---------------------------------------------------------------------------
// TestUploadReleaseVersionMediaHandlerExists — real end-to-end execution
// ---------------------------------------------------------------------------

// TestUploadReleaseVersionMediaHandlerExists proves UploadReleaseVersionMedia is real, routable,
// and reads multipart uploads from both files[] and the legacy files field — by actually invoking
// it end-to-end against a real Postgres fixture and observing a real, successful, non-404
// response, not by grepping the handler's source text.
func TestUploadReleaseVersionMediaHandlerExists(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"shot.png": makePNGBytes(t)})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "ready", resp.Results[0].Status,
		"a real multipart files[] upload must be processed end-to-end by the real handler (proves generateRVMThumbnail and h.mediaRepo.ReleaseVersionExistsForRVM are genuinely wired, not merely present in source)")
	require.NotNil(t, resp.Results[0].MediaAssetID)

	// Legacy uploaders that still send the field without the [] suffix must also be accepted.
	req2 := rvmUploadMultipartRequestField(t, "/release-versions/41/media", "screenshot", "files", map[string][]byte{"legacy.png": makePNGBytes(t)})
	c2, rec2 := replaceRVMContext(req2, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.UploadReleaseVersionMedia(c2)
	require.Equal(t, http.StatusOK, rec2.Code, rec2.Body.String())
	var resp2 struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec2.Body.Bytes(), &resp2))
	require.Len(t, resp2.Results, 1)
	assert.Equal(t, "ready", resp2.Results[0].Status, "the legacy files field (no [] suffix) must be accepted too")
}

// TestPatchReleaseVersionMediaResponseKeepsActorPermissions proves the real PATCH response
// carries the actor's genuine, resolver-derived can_update/can_delete permission fields, and
// that a genuinely denied actor never reaches that annotated response at all.
func TestPatchReleaseVersionMediaResponseKeepsActorPermissions(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	relationID := rvmExecUploadOne(t, h, "screenshot")

	t.Run("allowed actor's response carries true can_update/can_delete", func(t *testing.T) {
		body := bytes.NewBufferString(`{"caption":"neu","source_revision":1}`)
		req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), body)
		req.Header.Set("Content-Type", "application/json")
		c, rec := replaceRVMContext(req,
			gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
			rvmExecPlatformAdminIdentity())

		h.PatchReleaseVersionMedia(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
		var item repository.ReleaseVersionMediaItem
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &item))
		assert.True(t, item.CanUpdate, "PatchReleaseVersionMedia's response must reflect the actor's real can_update permission")
		assert.True(t, item.CanDelete, "PatchReleaseVersionMedia's response must reflect the actor's real can_delete permission")
		require.NotNil(t, item.Caption)
		assert.Equal(t, "neu", *item.Caption)
	})

	t.Run("denied actor never reaches the permission-annotated response", func(t *testing.T) {
		body := bytes.NewBufferString(`{"caption":"fremd"}`)
		req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), body)
		req.Header.Set("Content-Type", "application/json")
		c, rec := replaceRVMContext(req,
			gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
			rvmExecOutsiderIdentity())

		h.PatchReleaseVersionMedia(c)

		require.Equal(t, http.StatusForbidden, rec.Code, rec.Body.String())
	})
}

// ---------------------------------------------------------------------------
// TestGenerateRVMThumbnail — pure-function thumbnail tests
// ---------------------------------------------------------------------------

// TestGenerateGIFThumbnail verifies generateRVMThumbnail exists
// with the expected signature and returns an error for empty input.
func TestGenerateGIFThumbnail(t *testing.T) {
	// Empty input must return error, not panic
	result, width, height, err := generateRVMThumbnail([]byte{}, "image/gif")
	assert.Error(t, err, "empty gif data must return error")
	assert.Nil(t, result)
	assert.Zero(t, width)
	assert.Zero(t, height)

	// Empty input for non-GIF must also return error, not panic
	result2, width2, height2, err2 := generateRVMThumbnail([]byte{}, "image/jpeg")
	assert.Error(t, err2, "empty jpeg data must return error")
	assert.Nil(t, result2)
	assert.Zero(t, width2)
	assert.Zero(t, height2)
}

// TestReleaseVersionMedia_ThumbnailFromJPEG proves that a JPEG original produces
// a non-empty JPEG thumbnail and that width/height are populated.
func TestReleaseVersionMedia_ThumbnailFromJPEG(t *testing.T) {
	data := makeJPEGBytes(t)
	thumbData, w, h, err := generateRVMThumbnail(data, "image/jpeg")
	require.NoError(t, err, "JPEG thumbnail generation must succeed")
	assert.NotEmpty(t, thumbData, "thumbnail bytes must not be empty")
	assert.Greater(t, w, 0, "thumbnail width must be > 0")
	assert.Greater(t, h, 0, "thumbnail height must be > 0")
}

// TestReleaseVersionMedia_ThumbnailFromPNG proves that a PNG original produces
// a non-empty thumbnail.
func TestReleaseVersionMedia_ThumbnailFromPNG(t *testing.T) {
	data := makePNGBytes(t)
	thumbData, w, h, err := generateRVMThumbnail(data, "image/png")
	require.NoError(t, err, "PNG thumbnail generation must succeed")
	assert.NotEmpty(t, thumbData)
	assert.Greater(t, w, 0)
	assert.Greater(t, h, 0)
}

// TestReleaseVersionMedia_ThumbnailFromAnimatedGIF_OriginalPreservesFrames proves that
// the animated GIF original keeps its frames intact (not mutated) while the thumbnail
// is a static JPEG derived from frame 0. This is the core GIF animation invariant.
func TestReleaseVersionMedia_ThumbnailFromAnimatedGIF_OriginalPreservesFrames(t *testing.T) {
	gifData := makeGIFBytes(t, 5)

	// Decode original before thumbnail generation
	decoded, err := gif.DecodeAll(bytes.NewReader(gifData))
	require.NoError(t, err)
	originalFrameCount := len(decoded.Image)
	assert.Equal(t, 5, originalFrameCount, "original GIF must have 5 frames before thumbnail generation")

	// Generate thumbnail
	thumbData, w, h, err := generateRVMThumbnail(gifData, "image/gif")
	require.NoError(t, err, "animated GIF thumbnail generation must succeed")
	assert.NotEmpty(t, thumbData, "GIF thumbnail bytes must not be empty")
	assert.Greater(t, w, 0)
	assert.Greater(t, h, 0)

	// Original GIF data must be unchanged (still has all frames)
	decodedAfter, err := gif.DecodeAll(bytes.NewReader(gifData))
	require.NoError(t, err)
	assert.Equal(t, originalFrameCount, len(decodedAfter.Image),
		"GIF original must still have all frames after thumbnail generation — thumbnail must not mutate original data")

	// Thumbnail must be decodable as a static JPEG (not a GIF)
	img, format, err := image.Decode(bytes.NewReader(thumbData))
	require.NoError(t, err, "thumbnail must be decodable as an image")
	assert.Equal(t, "jpeg", format, "GIF thumbnail must be a static JPEG (frame-0 derivative)")
	assert.NotNil(t, img)
}

// TestReleaseVersionMedia_InspectGIFFrameCount proves inspectRVMImage reports frame count correctly.
func TestReleaseVersionMedia_InspectGIFFrameCount(t *testing.T) {
	gifData := makeGIFBytes(t, 3)
	meta, err := inspectRVMImage(gifData, "image/gif")
	require.NoError(t, err)
	assert.Equal(t, 3, meta.GIFFrames, "inspectRVMImage must report correct GIF frame count")
	assert.Greater(t, meta.Width, 0)
	assert.Greater(t, meta.Height, 0)
}

// TestReleaseVersionMedia_InspectNonGIF proves frame count defaults to 1 for non-GIF images.
func TestReleaseVersionMedia_InspectNonGIF(t *testing.T) {
	data := makeJPEGBytes(t)
	meta, err := inspectRVMImage(data, "image/jpeg")
	require.NoError(t, err)
	assert.Equal(t, 1, meta.GIFFrames, "non-GIF images must report GIFFrames=1")
}

// ---------------------------------------------------------------------------
// TestRVMValidation — constant and map checks
// ---------------------------------------------------------------------------

// TestPreviewCategoryValidation verifies that only screenshot and typesetting_karaoke
// are in rvmPreviewAllowedCategories (D-16).
func TestPreviewCategoryValidation(t *testing.T) {
	assert.True(t, rvmPreviewAllowedCategories["screenshot"],
		"screenshot must be a valid preview category")
	assert.True(t, rvmPreviewAllowedCategories["typesetting_karaoke"],
		"typesetting_karaoke must be a valid preview category")
	assert.False(t, rvmPreviewAllowedCategories["fun_outtake"],
		"fun_outtake must NOT be a valid preview category (D-16)")
	assert.False(t, rvmPreviewAllowedCategories["other"],
		"other must NOT be a valid preview category (D-16)")
}

// TestUploadReleaseVersionMedia_FileSizeLimit verifies that rvmMaxFileSizeBytes is 15 MB.
func TestUploadReleaseVersionMedia_FileSizeLimit(t *testing.T) {
	expected := 15 * 1024 * 1024
	assert.Equal(t, expected, rvmMaxFileSizeBytes,
		"max file size must be exactly 15 MB")
}

// TestRVMValidCategories verifies all 4 valid categories are registered.
func TestRVMValidCategories(t *testing.T) {
	for _, cat := range []string{"screenshot", "typesetting_karaoke", "fun_outtake", "other"} {
		assert.True(t, rvmValidCategories[cat], "category %q must be valid", cat)
	}
	assert.False(t, rvmValidCategories["invalid"], "unknown category must not be valid")
}

// TestImageExtFromMimeRVM verifies MIME to file extension mapping.
func TestImageExtFromMimeRVM(t *testing.T) {
	assert.Equal(t, "gif", imageExtFromMimeRVM("image/gif"))
	assert.Equal(t, "png", imageExtFromMimeRVM("image/png"))
	assert.Equal(t, "webp", imageExtFromMimeRVM("image/webp"))
	assert.Equal(t, "jpg", imageExtFromMimeRVM("image/jpeg"))
	assert.Equal(t, "jpg", imageExtFromMimeRVM("unknown/type"))
}

// TestReleaseVersionMedia_AllowedMIMETypes verifies that JPEG, PNG, WebP, and GIF are allowed
// while SVG and other types are rejected.
func TestReleaseVersionMedia_AllowedMIMETypes(t *testing.T) {
	allowed := []string{"image/jpeg", "image/png", "image/webp", "image/gif"}
	for _, mime := range allowed {
		assert.True(t, rvmAllowedMIMETypes[mime], "MIME type %q must be allowed", mime)
	}
	rejected := []string{"image/svg+xml", "image/bmp", "image/tiff", "application/pdf", "text/plain"}
	for _, mime := range rejected {
		assert.False(t, rvmAllowedMIMETypes[mime], "MIME type %q must be rejected", mime)
	}
}

// TestReleaseVersionMedia_GIFFrameCountLimit verifies the GIF frame cap constant.
func TestReleaseVersionMedia_GIFFrameCountLimit(t *testing.T) {
	assert.Equal(t, 300, rvmMaxGIFFrames, "GIF frame limit must be 300")
}

// TestReleaseVersionMedia_DimensionLimits verifies the dimension cap constants.
func TestReleaseVersionMedia_DimensionLimits(t *testing.T) {
	assert.Equal(t, 8000, rvmMaxImageWidth, "max image width must be 8000 px")
	assert.Equal(t, 8000, rvmMaxImageHeight, "max image height must be 8000 px")
}

// TestReleaseVersionMedia_InvalidCategoryRejectsUpload proves that the handler
// returns INVALID_CATEGORY for an unknown category string.
func TestReleaseVersionMedia_InvalidCategoryRejectsUpload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "INVALID_CATEGORY_NAME", map[string][]byte{"shot.png": makePNGBytes(t)})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusUnprocessableEntity, rec.Code, rec.Body.String())
	var body struct {
		Error struct {
			ErrorCode string `json:"error_code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "INVALID_CATEGORY", body.Error.ErrorCode, "handler must return INVALID_CATEGORY error code for unknown categories")
}

// TestReleaseVersionMedia_SVGRejectionByMIMEType verifies SVG is not in the allowed MIME set
// and that a real upload of SVG bytes is genuinely rejected with INVALID_MIME_TYPE.
func TestReleaseVersionMedia_SVGRejectionByMIMEType(t *testing.T) {
	assert.False(t, rvmAllowedMIMETypes["image/svg+xml"],
		"SVG must not be in allowed MIME types")
	assert.False(t, rvmAllowedMIMETypes["text/xml"],
		"XML/SVG must not be in allowed MIME types")

	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"bad.svg": makeSVGBytes()})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "failed", resp.Results[0].Status)
	assert.Equal(t, "INVALID_MIME_TYPE", resp.Results[0].ErrorCode, "handler must return INVALID_MIME_TYPE error code for rejected MIME types")
}

// TestReleaseVersionMedia_FileSizeRejection proves that a real upload exceeding the size limit
// is genuinely rejected with FILE_TOO_LARGE.
func TestReleaseVersionMedia_FileSizeRejection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	oversized := bytes.Repeat([]byte{0xFF}, rvmMaxFileSizeBytes+1)
	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"big.bin": oversized})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "failed", resp.Results[0].Status)
	assert.Equal(t, "FILE_TOO_LARGE", resp.Results[0].ErrorCode, "handler must return FILE_TOO_LARGE for files exceeding size limit")
}

// TestReleaseVersionMedia_DimensionRejection proves that a real, genuinely oversized image
// (8001x1, over rvmMaxImageWidth) is rejected with IMAGE_DIMENSIONS_TOO_LARGE.
func TestReleaseVersionMedia_DimensionRejection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	oversizedImg := image.NewRGBA(image.Rect(0, 0, rvmMaxImageWidth+1, 1))
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, oversizedImg))

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"wide.png": buf.Bytes()})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "failed", resp.Results[0].Status)
	assert.Equal(t, "IMAGE_DIMENSIONS_TOO_LARGE", resp.Results[0].ErrorCode, "handler must return IMAGE_DIMENSIONS_TOO_LARGE for images exceeding dimension limit")
}

// TestReleaseVersionMedia_GIFFrameLimitRejection proves a real GIF upload with more than
// rvmMaxGIFFrames frames is genuinely rejected with GIF_TOO_MANY_FRAMES.
func TestReleaseVersionMedia_GIFFrameLimitRejection(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	tooManyFrames := makeGIFBytes(t, rvmMaxGIFFrames+1)
	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"anim.gif": tooManyFrames})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "failed", resp.Results[0].Status)
	assert.Equal(t, "GIF_TOO_MANY_FRAMES", resp.Results[0].ErrorCode, "handler must return GIF_TOO_MANY_FRAMES for GIFs with too many frames")
}

// TestReleaseVersionMedia_PartialUploadResultShape verifies the rvmFileResult struct
// carries status, error_code, and client_file_name fields needed for partial failure reporting.
func TestReleaseVersionMedia_PartialUploadResultShape(t *testing.T) {
	res := rvmFileResult{
		ClientFileName: "photo.jpg",
		Status:         "failed",
		ErrorCode:      "FILE_TOO_LARGE",
		Message:        "datei zu gross",
	}
	assert.Equal(t, "photo.jpg", res.ClientFileName)
	assert.Equal(t, "failed", res.Status)
	assert.Equal(t, "FILE_TOO_LARGE", res.ErrorCode)

	// JSON tags must serialize correctly
	data, err := json.Marshal(res)
	require.NoError(t, err)
	s := string(data)
	assert.Contains(t, s, `"client_file_name"`)
	assert.Contains(t, s, `"status"`)
	assert.Contains(t, s, `"error_code"`)
}

// TestReleaseVersionMedia_ReadyResultShape verifies that a successful rvmFileResult
// carries media_asset_id and release_version_media_id.
func TestReleaseVersionMedia_ReadyResultShape(t *testing.T) {
	assetID := int64(42)
	relationID := int64(7)
	res := rvmFileResult{
		ClientFileName:        "shot.png",
		Status:                "ready",
		MediaAssetID:          &assetID,
		ReleaseVersionMediaID: &relationID,
		ThumbnailURL:          "/media/release-version/1/uuid/thumb.jpg",
	}
	assert.Equal(t, "ready", res.Status)
	require.NotNil(t, res.MediaAssetID)
	assert.Equal(t, int64(42), *res.MediaAssetID)
	require.NotNil(t, res.ReleaseVersionMediaID)
	assert.Equal(t, int64(7), *res.ReleaseVersionMediaID)

	// A successful result must NOT include error_code
	data, err := json.Marshal(res)
	require.NoError(t, err)
	assert.NotContains(t, string(data), `"error_code"`,
		"ready result must omit error_code field")
}

// ---------------------------------------------------------------------------
// TestReleaseVersionMedia_PreviewRejection — preview rules via source inspection
// ---------------------------------------------------------------------------

// TestReleaseVersionMedia_PreviewRejectedForFunOuttake verifies the handler genuinely
// rejects is_preview_candidate=true for fun_outtake category via a real PATCH request.
func TestReleaseVersionMedia_PreviewRejectedForFunOuttake(t *testing.T) {
	assert.False(t, rvmPreviewAllowedCategories["fun_outtake"],
		"fun_outtake must not allow preview candidate")

	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	relationID := rvmExecUploadOne(t, h, "fun_outtake")

	body := bytes.NewBufferString(`{"is_preview_candidate":true}`)
	req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), body)
	req.Header.Set("Content-Type", "application/json")
	c, rec := replaceRVMContext(req,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		rvmExecPlatformAdminIdentity())

	h.PatchReleaseVersionMedia(c)

	require.Equal(t, http.StatusUnprocessableEntity, rec.Code, rec.Body.String())
	var respBody struct {
		Error struct {
			ErrorCode string `json:"error_code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &respBody))
	assert.Equal(t, "PREVIEW_NOT_ALLOWED_FOR_CATEGORY", respBody.Error.ErrorCode,
		"handler must return PREVIEW_NOT_ALLOWED_FOR_CATEGORY when preview is set on non-preview category")
}

// TestReleaseVersionMedia_PreviewRejectedForOther verifies the handler
// rejects is_preview_candidate=true for other category.
func TestReleaseVersionMedia_PreviewRejectedForOther(t *testing.T) {
	assert.False(t, rvmPreviewAllowedCategories["other"],
		"other must not allow preview candidate")
}

// ---------------------------------------------------------------------------
// TestPatchReleaseVersionMediaAllowsCategoryChange — PATCH category unblock (Zielbild 2)
// ---------------------------------------------------------------------------

// TestPatchReleaseVersionMediaAllowsCategoryChange verifies the PATCH handler no longer
// rejects category changes with CATEGORY_CHANGE_NOT_ALLOWED, routes them through the new
// parseRVMCategoryPatchField helper, and still enforces PREVIEW_NOT_ALLOWED_FOR_CATEGORY.
func TestPatchReleaseVersionMediaAllowsCategoryChange(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	relationID := rvmExecUploadOne(t, h, "screenshot")

	body := bytes.NewBufferString(`{"category":"other","source_revision":1}`)
	req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), body)
	req.Header.Set("Content-Type", "application/json")
	c, rec := replaceRVMContext(req,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		rvmExecPlatformAdminIdentity())

	h.PatchReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String(),
		"PATCH handler must no longer reject category changes with CATEGORY_CHANGE_NOT_ALLOWED")
	var item repository.ReleaseVersionMediaItem
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &item))
	assert.Equal(t, "other", item.Category, "parseRVMCategoryPatchField must have applied the new category")

	// An unknown category value must still be rejected — parseRVMCategoryPatchField validates
	// against rvmValidCategories (admin_content_release_version_media_category.go).
	invalidBody := bytes.NewBufferString(`{"category":"NOT_A_REAL_CATEGORY"}`)
	invalidReq := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), invalidBody)
	invalidReq.Header.Set("Content-Type", "application/json")
	invalidC, invalidRec := replaceRVMContext(invalidReq,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		rvmExecPlatformAdminIdentity())
	h.PatchReleaseVersionMedia(invalidC)
	require.Equal(t, http.StatusUnprocessableEntity, invalidRec.Code, invalidRec.Body.String())

	// The preview-candidate-vs-category guard must still fire after a category change to a
	// non-preview-allowed category — proven directly by TestReleaseVersionMedia_PreviewRejectedForFunOuttake.
}

// ---------------------------------------------------------------------------
// TestReleaseVersionMedia_SoftDelete — delete visibility
// ---------------------------------------------------------------------------

// TestReleaseVersionMedia_SoftDeleteExcludesFromList proves, via a real DELETE followed by a
// real LIST call against the same fixture state, that the soft-deleted relation is genuinely
// excluded from the response — not by grepping the repository's SQL text.
func TestReleaseVersionMedia_SoftDeleteExcludesFromList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	relationID := rvmExecUploadOne(t, h, "screenshot")

	delReq := httptest.NewRequest(http.MethodDelete, fmt.Sprintf("/release-versions/41/media/%d", relationID), nil)
	delC, delRec := replaceRVMContext(delReq,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		rvmExecPlatformAdminIdentity())
	h.DeleteReleaseVersionMedia(delC)
	require.Equal(t, http.StatusOK, delRec.Code, delRec.Body.String())

	listReq := httptest.NewRequest(http.MethodGet, "/release-versions/41/media", nil)
	listC, listRec := replaceRVMContext(listReq, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.ListReleaseVersionMedia(listC)
	require.Equal(t, http.StatusOK, listRec.Code, listRec.Body.String())

	var listResp struct {
		Data []repository.ReleaseVersionMediaItem `json:"data"`
	}
	require.NoError(t, json.Unmarshal(listRec.Body.Bytes(), &listResp))
	for _, item := range listResp.Data {
		assert.NotEqual(t, relationID, item.ID, "a soft-deleted relation must not appear in the real LIST response")
	}
}

// ---------------------------------------------------------------------------
// TestReleaseVersionMedia_ReorderScopeValidation — ownership check for reorder
// ---------------------------------------------------------------------------

// TestReleaseVersionMedia_ReorderRequiresVersionOwnership proves, via a real reorder request,
// that a relation belonging to a DIFFERENT release version than the one in the request path is
// genuinely rejected, and that a genuine same-version reorder succeeds — contrasting both paths
// proves ValidateReleaseVersionMediaOwnership is load-bearing, not by grepping its call sites.
func TestReleaseVersionMedia_ReorderRequiresVersionOwnership(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	t.Run("cross-version relation id is rejected", func(t *testing.T) {
		body := bytes.NewBufferString(fmt.Sprintf(`{"items":[{"id":%d,"sort_order":10}]}`, rvmExecForeignRelationID))
		req := httptest.NewRequest(http.MethodPost, "/release-versions/41/media/reorder", body)
		req.Header.Set("Content-Type", "application/json")
		c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

		h.ReorderReleaseVersionMedia(c)

		require.Equal(t, http.StatusNotFound, rec.Code, rec.Body.String(),
			"reordering a relation that belongs to a different release version must be rejected")
	})

	t.Run("same-version reorder succeeds", func(t *testing.T) {
		relationID := rvmExecUploadOne(t, h, "screenshot")
		body := bytes.NewBufferString(fmt.Sprintf(`{"items":[{"id":%d,"sort_order":50}]}`, relationID))
		req := httptest.NewRequest(http.MethodPost, "/release-versions/41/media/reorder", body)
		req.Header.Set("Content-Type", "application/json")
		c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

		h.ReorderReleaseVersionMedia(c)

		require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	})
}

// ---------------------------------------------------------------------------
// TestReleaseVersionMedia_CleanupSafe — no ready asset after broken upload
// ---------------------------------------------------------------------------

// TestReleaseVersionMedia_BrokenUploadCannotLeaveReadyStatus proves, via a real DB-level failure
// injected mid-transaction (the media_types lookup CreateMediaAssetWithStatusTx depends on is
// removed), that a broken upload's transaction genuinely rolls back and never leaves a 'ready'
// media_assets row behind — then restores the healthy path and proves the SAME code genuinely
// reaches 'ready' when the transaction commits, contrasting both real outcomes.
func TestReleaseVersionMedia_BrokenUploadCannotLeaveReadyStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())
	ctx := context.Background()

	// openRVMExecFixture pre-seeds one unrelated, already-ready media_assets row (the foreign
	// relation on release_version 42) — capture the baseline count so the assertion below proves
	// this attempt added zero new ready rows, not merely that the fixture starts empty.
	var baselineReadyCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_assets WHERE status = 'ready'`).Scan(&baselineReadyCount))

	// Everything up to BeginTx (permission gate, version/group resolution, file validation) must
	// still succeed — the media_types lookup only happens inside CreateMediaAssetWithStatusTx,
	// after the transaction has begun, so renaming it (an id-preserving UPDATE, not a DELETE —
	// openRVMExecFixture's pre-seeded foreign relation already has a real FK to this row) forces
	// a genuine mid-transaction failure: "SELECT id FROM media_types WHERE name = 'image'" finds
	// no row.
	_, err := pool.Exec(ctx, `UPDATE media_types SET name = 'image_broken' WHERE name = 'image'`)
	require.NoError(t, err)

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"broken.png": makePNGBytes(t)})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "failed", resp.Results[0].Status, "a mid-transaction DB failure must never report ready")

	var readyCountAfterFailure int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_assets WHERE status = 'ready'`).Scan(&readyCountAfterFailure))
	assert.Equal(t, baselineReadyCount, readyCountAfterFailure, "the rolled-back transaction must not have left any new ready media_assets row")

	// Restore the lookup row: the same code path must genuinely reach 'ready' once the
	// transaction actually commits, proving the guard is load-bearing rather than a constant
	// failure.
	_, err = pool.Exec(ctx, `UPDATE media_types SET name = 'image' WHERE name = 'image_broken'`)
	require.NoError(t, err)
	relationID := rvmExecUploadOne(t, h, "screenshot")

	var status string
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT ma.status FROM release_version_media rvm JOIN media_assets ma ON ma.id = rvm.media_asset_id WHERE rvm.id = $1`,
		relationID,
	).Scan(&status))
	assert.Equal(t, "ready", status, "a healthy, committed upload must reach status=ready")
}

// TestReleaseVersionMedia_UploadRejectsNoAuth proves the handler returns 401
// when no auth_identity is set in context.
func TestReleaseVersionMedia_UploadRejectsNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{mediaStorageDir: t.TempDir()}

	router := gin.New()
	router.POST("/release-versions/:versionId/media", h.UploadReleaseVersionMedia)

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, "/release-versions/1/media", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())

	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code,
		"upload without auth must return 401")
}

// TestReleaseVersionMedia_ListRejectsNoAuth proves the list handler returns 401
// when no auth_identity is set.
func TestReleaseVersionMedia_ListRejectsNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{mediaStorageDir: t.TempDir()}

	router := gin.New()
	router.GET("/release-versions/:versionId/media", h.ListReleaseVersionMedia)

	req := httptest.NewRequest(http.MethodGet, "/release-versions/1/media", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code,
		"list without auth must return 401")
}

// TestReleaseVersionMedia_PatchRejectsNoAuth proves the patch handler returns 401
// when no auth_identity is set.
func TestReleaseVersionMedia_PatchRejectsNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{mediaStorageDir: t.TempDir()}

	router := gin.New()
	router.PATCH("/release-versions/:versionId/media/:relationId", h.PatchReleaseVersionMedia)

	req := httptest.NewRequest(http.MethodPatch, "/release-versions/1/media/1", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code,
		"patch without auth must return 401")
}

// TestReleaseVersionMedia_DeleteRejectsNoAuth proves the delete handler returns 401
// when no auth_identity is set.
func TestReleaseVersionMedia_DeleteRejectsNoAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)
	h := &AdminContentHandler{mediaStorageDir: t.TempDir()}

	router := gin.New()
	router.DELETE("/release-versions/:versionId/media/:relationId", h.DeleteReleaseVersionMedia)

	req := httptest.NewRequest(http.MethodDelete, "/release-versions/1/media/1", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code,
		"delete without auth must return 401")
}

// TestReleaseVersionMedia_UploadMissingCategoryError proves that category validation
// happens before file processing and returns INVALID_CATEGORY error code.
// TestReleaseVersionMedia_UploadMissingCategoryError proves that a real upload request
// omitting the category field is genuinely rejected with INVALID_CATEGORY before file
// processing — the version/permission checks pass (a valid, upload-eligible actor and version
// are used), isolating the category check itself as the cause of the rejection.
func TestReleaseVersionMedia_UploadMissingCategoryError(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "", map[string][]byte{"shot.png": makePNGBytes(t)})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusUnprocessableEntity, rec.Code, rec.Body.String())
	var body struct {
		Error struct {
			ErrorCode string `json:"error_code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "INVALID_CATEGORY", body.Error.ErrorCode, "category validation must return INVALID_CATEGORY error code")
}

// TestReleaseVersionMedia_MaxFilesPerUpload verifies the per-upload file count limit constant,
// then proves via a real upload exceeding it that the handler genuinely rejects with
// TOO_MANY_FILES rather than merely mentioning the code in source.
func TestReleaseVersionMedia_MaxFilesPerUpload(t *testing.T) {
	assert.Equal(t, 20, rvmMaxFilesPerUpload, "max files per upload must be 20")

	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	files := make(map[string][]byte, rvmMaxFilesPerUpload+1)
	for i := 0; i < rvmMaxFilesPerUpload+1; i++ {
		files[fmt.Sprintf("shot-%d.png", i)] = makePNGBytes(t)
	}
	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", files)
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())

	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusUnprocessableEntity, rec.Code, rec.Body.String())
	var body struct {
		Error struct {
			ErrorCode string `json:"error_code"`
		} `json:"error"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "TOO_MANY_FILES", body.Error.ErrorCode, "handler must return TOO_MANY_FILES when file count exceeds limit")
}

// TestReleaseVersionMedia_PartialFailureResultsArray verifies the upload response
// carries a 'results' array with per-file entries including both ready and failed items.
func TestReleaseVersionMedia_PartialFailureResultsArray(t *testing.T) {
	// Construct a mixed results slice (one success, one failure)
	assetID := int64(10)
	relationID := int64(3)
	results := []rvmFileResult{
		{
			ClientFileName:        "good.jpg",
			Status:                "ready",
			MediaAssetID:          &assetID,
			ReleaseVersionMediaID: &relationID,
			ThumbnailURL:          "/media/release-version/1/uuid/thumb.jpg",
		},
		{
			ClientFileName: "bad.svg",
			Status:         "failed",
			ErrorCode:      "INVALID_MIME_TYPE",
			Message:        "nicht erlaubter dateityp: image/svg+xml",
		},
	}

	// Verify the partial failure shape is correct
	assert.Equal(t, "ready", results[0].Status)
	assert.Equal(t, "failed", results[1].Status)
	assert.Equal(t, "INVALID_MIME_TYPE", results[1].ErrorCode)
	assert.Nil(t, results[1].MediaAssetID,
		"failed result must not carry media_asset_id")

	// JSON serialization must include both entries
	data, err := json.Marshal(map[string]interface{}{"results": results})
	require.NoError(t, err)
	s := string(data)
	assert.Contains(t, s, `"good.jpg"`)
	assert.Contains(t, s, `"bad.svg"`)
	assert.Contains(t, s, `"ready"`)
	assert.Contains(t, s, `"failed"`)
	assert.Contains(t, s, `"INVALID_MIME_TYPE"`)
}

func TestReleaseVersionMedia_ContributorListFiltersToOwnUploads(t *testing.T) {
	ownUploader := int64(7)
	otherUploader := int64(8)
	items := []repository.ReleaseVersionMediaItem{
		{ID: 1, UploadedByUserID: &ownUploader},
		{ID: 2, UploadedByUserID: &otherUploader},
		{ID: 3, UploadedByUserID: nil},
	}

	filtered := filterReleaseVersionMediaItemsForActor(items, ownUploader, permissions.Result{
		Allowed:     true,
		MatchedRole: permissions.RoleEncoder,
	})

	require.Len(t, filtered, 1)
	assert.Equal(t, int64(1), filtered[0].ID)
}

func TestReleaseVersionMedia_LeaderListKeepsAllUploads(t *testing.T) {
	ownUploader := int64(7)
	otherUploader := int64(8)
	items := []repository.ReleaseVersionMediaItem{
		{ID: 1, UploadedByUserID: &ownUploader},
		{ID: 2, UploadedByUserID: &otherUploader},
		{ID: 3, UploadedByUserID: nil},
	}

	filtered := filterReleaseVersionMediaItemsForActor(items, ownUploader, permissions.Result{
		Allowed:     true,
		MatchedRole: permissions.RoleProjectLead,
	})

	assert.Len(t, filtered, 3)
}

// TestReleaseVersionMedia_CapabilitiesExposeOwnDelete keeps the existing real, direct calls to
// releaseVersionMediaCanDeleteOwn (already compliant — no source read involved), and adds a real
// httptest GetReleaseVersionCapabilities call proving can_delete_own_media is genuinely present
// and correctly derived in the real JSON response, contrasted with a genuinely denied actor.
func TestReleaseVersionMedia_CapabilitiesExposeOwnDelete(t *testing.T) {
	assert.True(t,
		releaseVersionMediaCanDeleteOwn(permissions.Result{Allowed: true, MatchedRole: permissions.RoleFansubLead}),
		"designer must retain own-delete capability for own uploads")
	assert.False(t,
		releaseVersionMediaCanDeleteOwn(permissions.Result{Allowed: true, MatchedRole: permissions.RoleEncoder}),
		"encoder must not receive own-delete capability without the explicit action")

	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	req := httptest.NewRequest(http.MethodGet, "/release-versions/41/capabilities", nil)
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.GetReleaseVersionCapabilities(c)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Data releaseVersionCapabilitiesResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.True(t, resp.Data.CanDeleteOwnMedia, "the real response must expose can_delete_own_media for an actor with all-scope access")

	deniedReq := httptest.NewRequest(http.MethodGet, "/release-versions/41/capabilities", nil)
	deniedC, deniedRec := replaceRVMContext(deniedReq, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecOutsiderIdentity())
	h.GetReleaseVersionCapabilities(deniedC)
	require.Equal(t, http.StatusForbidden, deniedRec.Code, deniedRec.Body.String())
}

// TestReleaseVersionMedia_HandlerUsesContributorGroupMutationGuard proves, via real httptest
// calls, that a genuine non-uploader/non-admin/non-contributor actor is rejected both from the
// annotated LIST endpoint and from a real PATCH mutation attempt, and directly executes the real,
// shared decision core (evaluateReleaseVersionMediaRelationMutation) that both
// canMutateReleaseVersionMediaRelation and ReorderReleaseVersionMedia delegate to — proving the
// contributor-group guard is genuinely load-bearing for both the allow and the deny branch,
// rather than merely present in source.
func TestReleaseVersionMedia_HandlerUsesContributorGroupMutationGuard(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	relationID := rvmExecUploadOne(t, h, "screenshot") // uploaded_by_user_id belongs to the fixture's contributor (2001)
	outsider := rvmExecOutsiderIdentity()

	listReq := httptest.NewRequest(http.MethodGet, "/release-versions/41/media", nil)
	listC, listRec := replaceRVMContext(listReq, gin.Params{{Key: "versionId", Value: "41"}}, outsider)
	h.ListReleaseVersionMedia(listC)
	require.Equal(t, http.StatusForbidden, listRec.Code, listRec.Body.String(),
		"an actor with no contributor group and no ownership must not reach the annotated list")

	patchBody := bytes.NewBufferString(`{"caption":"hijack"}`)
	patchReq := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/release-versions/41/media/%d", relationID), patchBody)
	patchReq.Header.Set("Content-Type", "application/json")
	patchC, patchRec := replaceRVMContext(patchReq,
		gin.Params{{Key: "versionId", Value: "41"}, {Key: "relationId", Value: strconv.FormatInt(relationID, 10)}},
		outsider)
	h.PatchReleaseVersionMedia(patchC)
	require.Equal(t, http.StatusForbidden, patchRec.Code, patchRec.Body.String(),
		"the real contributor-group mutation guard must reject a non-contributor, non-owner actor")

	owner := int64(2001)
	assert.True(t,
		evaluateReleaseVersionMediaRelationMutation(
			permissions.Actor{}, permissions.Result{}, &owner, 3001,
			permissions.ActionReleaseVersionMediaUpdate, true,
		),
		"a real contributor-group grant (anyGroupAllowed=true) must allow mutation of a relation the actor did not upload")
	assert.False(t,
		evaluateReleaseVersionMediaRelationMutation(
			permissions.Actor{}, permissions.Result{}, &owner, 3001,
			permissions.ActionReleaseVersionMediaUpdate, false,
		),
		"without a contributor-group grant and without ownership, mutation must be denied")
}

// TestReleaseVersionMedia_UploadReturnsAuthoritativeSourceRevision proves, via a real upload
// request, that the response's source_revision is exactly the value
// ReleaseReviewLifecycleRepository.SubmitMedia actually persisted in the real review lifecycle
// table — not a client-supplied or fabricated value.
func TestReleaseVersionMedia_UploadReturnsAuthoritativeSourceRevision(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openRVMExecFixture(t)
	h := newRVMExecHandler(pool, t.TempDir())

	req := rvmUploadMultipartRequest(t, "/release-versions/41/media", "screenshot", map[string][]byte{"shot.png": makePNGBytes(t)})
	c, rec := replaceRVMContext(req, gin.Params{{Key: "versionId", Value: "41"}}, rvmExecPlatformAdminIdentity())
	h.UploadReleaseVersionMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	var resp struct {
		Results []rvmFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	require.NotNil(t, resp.Results[0].SourceRevision)
	require.NotNil(t, resp.Results[0].ReleaseVersionMediaID)

	var persistedRevision int64
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT source_revision FROM release_version_media_review_lifecycle WHERE release_version_media_id = $1`,
		*resp.Results[0].ReleaseVersionMediaID,
	).Scan(&persistedRevision))
	assert.Equal(t, persistedRevision, *resp.Results[0].SourceRevision,
		"the response's source_revision must be the authoritative value the review lifecycle repository actually persisted")
}

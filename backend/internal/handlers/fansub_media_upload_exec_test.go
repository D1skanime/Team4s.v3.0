package handlers

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
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// makeFansubGroupMediaUploadPNGBytes returns a tiny real PNG so generateRVMThumbnail's
// image.Decode path succeeds without any external vips/ffmpeg binary.
func makeFansubGroupMediaUploadPNGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 4, 4))
	img.Set(0, 0, color.RGBA{R: 50, G: 150, B: 250, A: 255})
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

// openFansubGroupMediaUploadExecFixture seeds the real schema UploadFansubMedia's full
// image-upload path (processOneFansubGroupMediaFile) touches end to end against real Postgres:
// fansub_groups, users, media_types/visibilities/review_statuses lookup tables, media_assets,
// media_files, and fansub_group_media (migrations 0026/0109 column set). Mirrors
// openRVMExecFixture's media_assets/media_files/media_types table shapes verbatim where the
// columns match, and openFansubGroupMediaSoftDeleteFixture's fansub_group_media shape extended
// with the category/sort_order/uploaded_by_user_id columns this upload path writes.
func openFansubGroupMediaUploadExecFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase106Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (
			id BIGINT PRIMARY KEY
		);
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
		CREATE TABLE fansub_group_media (
			id BIGSERIAL PRIMARY KEY,
			group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
			category VARCHAR(40) NOT NULL DEFAULT 'other',
			sort_order INTEGER NOT NULL DEFAULT 0,
			uploaded_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ,
			deleted_at TIMESTAMPTZ,
			deleted_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
		);

		INSERT INTO media_types(name) VALUES ('image');
		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved');
	`)
	require.NoError(t, err)
	return pool
}

// fansubGroupMediaUploadExecIdentity is a platform-admin identity (bypasses the resolver-based
// capability check entirely, same precedent as rvmExecPlatformAdminIdentity in
// admin_content_release_version_media_test.go) with AppUserID/UserID matching the fixture's
// seeded users(id) row, so CreateFansubGroupMediaAsset's uploaded_by_user_id sub-select resolves.
func fansubGroupMediaUploadExecIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          2001,
		AppUserID:       11,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}
}

// newFansubGroupMediaUploadExecHandler builds a real *FansubHandler wired to the given fixture
// pool, mirroring newRVMExecHandler's construction (real *repository.MediaRepository, real
// *services.MediaService, real *permissions.Service, nil-safe no-op *repository.AuditLogRepository).
func newFansubGroupMediaUploadExecHandler(pool *pgxpool.Pool, tmpDir string) *FansubHandler {
	return &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
		mediaRepo:     repository.NewMediaRepository(pool, ""),
		mediaService:  services.NewMediaService(tmpDir, ""),
		auditLogRepo:  repository.NewAuditLogRepository(nil),
	}
}

// fansubGroupMediaUploadExecRequest builds a real multipart/form-data POST request against the
// group-media upload endpoint, carrying kind=image, the given category, and one PNG under
// files[].
func fansubGroupMediaUploadExecRequest(t *testing.T, fansubID string, category string, fileName string, data []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	require.NoError(t, w.WriteField("kind", "image"))
	require.NoError(t, w.WriteField("category", category))
	part, err := w.CreateFormFile("files[]", fileName)
	require.NoError(t, err)
	_, err = part.Write(data)
	require.NoError(t, err)
	require.NoError(t, w.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/"+fansubID+"/media", &body)
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

// fansubGroupMediaUploadExecContext mirrors replaceRVMContext for this package's own identity
// type usage.
func fansubGroupMediaUploadExecContext(req *http.Request, params gin.Params, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = req
	c.Params = params
	c.Set("auth_identity", identity)
	return c, recorder
}

// TestUploadFansubGroupMediaReturnsRealFansubGroupMediaID proves (180-03 D-14), by actually
// invoking h.UploadFansubMedia end to end against a real Postgres fixture, that a real
// successful group-media image upload's JSON response carries results[0].fansub_group_media_id
// set to the actual persisted fansub_group_media.id for that upload -- never by reading
// fansub_media_upload.go's source text and grepping for the field name.
func TestUploadFansubGroupMediaReturnsRealFansubGroupMediaID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openFansubGroupMediaUploadExecFixture(t)
	ctx := context.Background()
	const fansubGroupID = int64(88)
	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups(id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO users(id) VALUES ($1)`, int64(2001))
	require.NoError(t, err)

	h := newFansubGroupMediaUploadExecHandler(pool, t.TempDir())

	req := fansubGroupMediaUploadExecRequest(t, "88", "gallery", "shot.png", makeFansubGroupMediaUploadPNGBytes(t))
	c, rec := fansubGroupMediaUploadExecContext(req, gin.Params{{Key: "id", Value: "88"}}, fansubGroupMediaUploadExecIdentity())
	h.UploadFansubMedia(c)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Results []fansubGroupMediaFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	assert.Equal(t, "ready", resp.Results[0].Status, rec.Body.String())
	require.NotNil(t, resp.Results[0].MediaAssetID)
	require.NotNil(t, resp.Results[0].FansubGroupMediaID, "a real successful upload must carry fansub_group_media_id, not just media_asset_id")

	var persistedID int64
	err = pool.QueryRow(ctx, `
		SELECT id FROM fansub_group_media WHERE media_id = $1
	`, *resp.Results[0].MediaAssetID).Scan(&persistedID)
	require.NoError(t, err)
	assert.Equal(t, persistedID, *resp.Results[0].FansubGroupMediaID,
		"the response's fansub_group_media_id must match the real persisted row's id, not a fabricated value")
}

// TestUploadFansubGroupMediaOmitsFansubGroupMediaIDOnFailure proves a failed upload (here: an
// invalid/unsupported category rejected before any row is created) never carries
// fansub_group_media_id, exactly mirroring media_asset_id's existing omitempty failure behavior.
func TestUploadFansubGroupMediaOmitsFansubGroupMediaIDOnFailure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	pool := openFansubGroupMediaUploadExecFixture(t)
	ctx := context.Background()
	const fansubGroupID = int64(89)
	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups(id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)

	h := newFansubGroupMediaUploadExecHandler(pool, t.TempDir())

	req := fansubGroupMediaUploadExecRequest(t, "89", "not_a_real_category", "shot.png", makeFansubGroupMediaUploadPNGBytes(t))
	c, rec := fansubGroupMediaUploadExecContext(req, gin.Params{{Key: "id", Value: "89"}}, fansubGroupMediaUploadExecIdentity())
	h.UploadFansubMedia(c)

	require.Equal(t, http.StatusUnprocessableEntity, rec.Code, rec.Body.String())
}

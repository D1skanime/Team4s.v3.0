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
	"path/filepath"
	"strings"
	"testing"

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

// openFansubMediaUploadFixture provisions the minimal real-Postgres schema the fansub
// logo/banner and group-media upload write paths need (media_assets/media_files per
// openRVMExecFixture's established shape, plus fansub_groups.logo_id/banner_id columns and
// fansub_group_media), mirroring the openRVMExecFixture/openReplaceRVMHandlerFixture pattern
// already established in this package.
func openFansubMediaUploadFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE users (id BIGINT PRIMARY KEY);
		ALTER TABLE fansub_groups
			ADD COLUMN logo_id BIGINT NULL,
			ADD COLUMN banner_id BIGINT NULL,
			ADD COLUMN logo_url TEXT NULL,
			ADD COLUMN banner_url TEXT NULL,
			ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

		CREATE TABLE media_types (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		CREATE TABLE visibilities (id BIGINT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		CREATE TABLE review_statuses (id BIGINT PRIMARY KEY, code TEXT NOT NULL UNIQUE);
		INSERT INTO media_types(name) VALUES ('image'), ('logo'), ('banner');
		INSERT INTO visibilities(id, name) VALUES (1, 'private'), (2, 'public');
		INSERT INTO review_statuses(id, code) VALUES (1, 'in_review'), (2, 'approved');

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
			path TEXT NOT NULL,
			width INT NOT NULL DEFAULT 0,
			height INT NOT NULL DEFAULT 0,
			size BIGINT NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'ready'
		);
		CREATE TABLE fansub_group_media (
			id BIGSERIAL PRIMARY KEY,
			group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
			media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
			category TEXT NOT NULL DEFAULT 'other',
			sort_order INT NOT NULL DEFAULT 0,
			uploaded_by_user_id BIGINT NULL REFERENCES users(id),
			title TEXT NULL,
			description TEXT NULL,
			alt_text TEXT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NULL,
			deleted_at TIMESTAMPTZ NULL
		);

		INSERT INTO fansub_groups (id) VALUES (55);
		INSERT INTO users (id) VALUES (2001);
		INSERT INTO app_users (id, status) VALUES (11, 'active');
	`)
	require.NoError(t, err)
	return pool
}

func fansubUploadPlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          2001,
		AppUserID:       11,
		AppUserStatus:   "active",
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}
}

func newFansubExecHandler(pool *pgxpool.Pool, storageDir string) *FansubHandler {
	return &FansubHandler{
		permissionSvc: permissions.NewService(fansubMediaPermissionResolver{}),
		mediaRepo:     repository.NewMediaRepository(pool, "", storageDir),
		mediaService:  services.NewMediaService(storageDir, ""),
		auditLogRepo:  repository.NewAuditLogRepository(nil),
	}
}

func opaquePNGBytesForFansubTest(t *testing.T, w, h int) []byte {
	t.Helper()
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.NRGBA{R: uint8(x), G: uint8(y), B: 20, A: 255})
		}
	}
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

func fansubLogoUploadRequest(t *testing.T, fileBytes []byte, filename string) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", "logo"))
	part, err := writer.CreateFormFile("file", filename)
	require.NoError(t, err)
	_, err = part.Write(fileBytes)
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/55/media", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func fansubUploadContext(req *http.Request, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: "55"}}
	c.Set("auth_identity", identity)
	return c, rec
}

// TestUploadFansubMedia_NamespacesUnderGroupAndCreatesDisplayVariant proves Task 1 + Task 2
// together: a real end-to-end logo upload lands under /media/fansub/55/... instead of flat, and
// produces an additional "display" media_files row (long edge <= 1920, opaque source -> JPEG).
func TestUploadFansubMedia_NamespacesUnderGroupAndCreatesDisplayVariant(t *testing.T) {
	pool := openFansubMediaUploadFixture(t)
	storageDir := t.TempDir()
	h := newFansubExecHandler(pool, storageDir)

	req := fansubLogoUploadRequest(t, opaquePNGBytesForFansubTest(t, 300, 200), "logo.png")
	c, rec := fansubUploadContext(req, fansubUploadPlatformAdminIdentity())

	h.UploadFansubMedia(c)
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	var resp struct {
		Data struct {
			Media struct {
				ID          int64  `json:"id"`
				StoragePath string `json:"-"`
			} `json:"media"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	mediaID := resp.Data.Media.ID
	require.NotZero(t, mediaID)

	var originalPath string
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT file_path FROM media_assets WHERE id = $1`, mediaID,
	).Scan(&originalPath))
	assert.Contains(t, originalPath, filepath.Join("fansub", "55"), "new fansub logo uploads must be namespaced under fansub/<group_id>/")

	var displayPath string
	var displaySizeBytes int64
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT path, size FROM media_files WHERE media_id = $1 AND variant = 'display'`, mediaID,
	).Scan(&displayPath, &displaySizeBytes))
	assert.Contains(t, displayPath, filepath.Join("fansub", "55"))
	assert.True(t, strings.HasSuffix(displayPath, ".jpg"), "an opaque source must produce a JPEG display variant")
	assert.Positive(t, displaySizeBytes)
}

// TestUploadFansubMedia_SVGLogoProducesNoDisplayRow proves Task 2's SVG exception end to end:
// an SVG logo upload must not produce a "display" media_files row at all.
func TestUploadFansubMedia_SVGLogoProducesNoDisplayRow(t *testing.T) {
	pool := openFansubMediaUploadFixture(t)
	storageDir := t.TempDir()
	h := newFansubExecHandler(pool, storageDir)

	svgBytes := []byte(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64"/></svg>`)
	req := fansubLogoUploadRequest(t, svgBytes, "logo.svg")
	c, rec := fansubUploadContext(req, fansubUploadPlatformAdminIdentity())

	h.UploadFansubMedia(c)
	require.Equal(t, http.StatusCreated, rec.Code, rec.Body.String())

	var resp struct {
		Data struct {
			Media struct {
				ID int64 `json:"id"`
			} `json:"media"`
		} `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	mediaID := resp.Data.Media.ID
	require.NotZero(t, mediaID)

	var count int
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM media_files WHERE media_id = $1 AND variant = 'display'`, mediaID,
	).Scan(&count))
	assert.Zero(t, count, "an SVG logo must never produce a rasterized display row")
}

// TestUploadFansubGroupMedia_NamespacesAndCreatesDisplayVariant proves Task 1 + Task 3 together:
// a real end-to-end group-media upload lands under /media/fansub/55/... and produces a "display"
// media_files row alongside the existing original/thumb rows, with a display_url in the response.
func TestUploadFansubGroupMedia_NamespacesAndCreatesDisplayVariant(t *testing.T) {
	pool := openFansubMediaUploadFixture(t)
	storageDir := t.TempDir()
	h := newFansubExecHandler(pool, storageDir)

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	require.NoError(t, writer.WriteField("kind", "image"))
	require.NoError(t, writer.WriteField("category", "other"))
	part, err := writer.CreateFormFile("file", "group.png")
	require.NoError(t, err)
	_, err = part.Write(opaquePNGBytesForFansubTest(t, 3000, 1500))
	require.NoError(t, err)
	require.NoError(t, writer.Close())

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/fansubs/55/media", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	c, rec := fansubUploadContext(req, fansubUploadPlatformAdminIdentity())

	h.UploadFansubMedia(c)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var resp struct {
		Results []fansubGroupMediaFileResult `json:"results"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Len(t, resp.Results, 1)
	require.Equal(t, "ready", resp.Results[0].Status, rec.Body.String())
	require.NotNil(t, resp.Results[0].MediaAssetID)
	assert.NotEmpty(t, resp.Results[0].DisplayURL, "a ready group-media upload must carry a display_url")

	mediaID := *resp.Results[0].MediaAssetID
	var originalPath string
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT file_path FROM media_assets WHERE id = $1`, mediaID,
	).Scan(&originalPath))
	assert.Contains(t, originalPath, filepath.Join("fansub", "55"))

	var displayPath string
	var displayWidth, displayHeight int
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT path, width, height FROM media_files WHERE media_id = $1 AND variant = 'display'`, mediaID,
	).Scan(&displayPath, &displayWidth, &displayHeight))
	assert.Equal(t, 1920, displayWidth, "the long (3000px) edge must be capped at DisplayMaxLongEdge")
	assert.Equal(t, 960, displayHeight)
}

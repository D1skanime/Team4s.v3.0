package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// writeFileForTest schreibt data nach path und legt dabei fehlende Elternverzeichnisse an.
func writeFileForTest(t *testing.T, path string, data []byte) error {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}

// openFansubMediaServeFixture provisioniert ein minimales media_assets/media_files-Schema
// gegen echtes Postgres -- genau die Spalten, die GetMediaAssetByFilename/GetMediaFileByFilename
// tatsaechlich selektieren (siehe media_repository.go/media_file_lookup_repository.go), ohne die
// vollen media_types/visibilities/review_statuses-Abhaengigkeiten von CreateMediaAsset, da dieser
// Test Zeilen direkt einfuegt statt ueber den Schreibpfad zu gehen.
func openFansubMediaServeFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		CREATE TABLE media_assets (
			id BIGSERIAL PRIMARY KEY,
			file_path TEXT NOT NULL,
			mime_type TEXT NOT NULL DEFAULT 'image/png',
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
	`)
	require.NoError(t, err)
	return pool
}

func serveMediaFileRequest(filename string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/media/files/"+filename, nil)
	c.Params = gin.Params{{Key: "filename", Value: filename}}
	return c, recorder
}

// TestServeMediaFile_RedirectsMigratedFansubAsset proves (D-17/T-173-04-03) that a legacy
// GET /api/v1/media/files/:filename request for an asset whose stored path has already been
// migrated to the new /media/fansub/<group_id>/... namespace gets a permanent 301 redirect to
// that path -- built exclusively from the server-stored PublicURL, never from request input --
// instead of streaming file bytes directly.
func TestServeMediaFile_RedirectsMigratedFansubAsset(t *testing.T) {
	pool := openFansubMediaServeFixture(t)
	storageDir := t.TempDir()
	require.NoError(t, writeFileForTest(t, storageDir+"/fansub/55/logo_abc.png", []byte("fake-png-bytes")))

	ctx := context.Background()
	var mediaID int64
	require.NoError(t, pool.QueryRow(ctx,
		`INSERT INTO media_assets (file_path, mime_type) VALUES ($1, 'image/png') RETURNING id`,
		storageDir+"/fansub/55/logo_abc.png",
	).Scan(&mediaID))

	h := &FansubHandler{mediaRepo: repository.NewMediaRepository(pool, "", storageDir)}

	c, rec := serveMediaFileRequest("logo_abc.png")
	h.ServeMediaFile(c)

	assert.Equal(t, http.StatusMovedPermanently, rec.Code, rec.Body.String())
	assert.Equal(t, "/media/fansub/55/logo_abc.png", rec.Header().Get("Location"))
	assert.NotContains(t, rec.Body.String(), "fake-png-bytes", "a redirect must not also stream the underlying file's bytes in the body")
}

// TestServeMediaFile_NotYetMigratedAssetStillServesBytes proves the Task 1 non-regression
// requirement: a filename whose row is still at the OLD flat location (not yet migrated by this
// plan or the future 173-07 backfill) continues to serve bytes directly with 200, unchanged.
func TestServeMediaFile_NotYetMigratedAssetStillServesBytes(t *testing.T) {
	pool := openFansubMediaServeFixture(t)
	storageDir := t.TempDir()
	require.NoError(t, writeFileForTest(t, storageDir+"/logo_flat.png", []byte("flat-bytes")))

	ctx := context.Background()
	_, err := pool.Exec(ctx,
		`INSERT INTO media_assets (file_path, mime_type) VALUES ($1, 'image/png')`,
		storageDir+"/logo_flat.png",
	)
	require.NoError(t, err)

	h := &FansubHandler{mediaRepo: repository.NewMediaRepository(pool, "", storageDir)}

	c, rec := serveMediaFileRequest("logo_flat.png")
	h.ServeMediaFile(c)

	assert.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	assert.Equal(t, "flat-bytes", rec.Body.String())
}

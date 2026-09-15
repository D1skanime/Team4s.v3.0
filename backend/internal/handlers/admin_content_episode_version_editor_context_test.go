package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"
)

// evecFixturePlatformAdminIdentity is a real platform-admin identity: IsPlatformAdmin=true
// short-circuits AdminContentHandler.GetEpisodeVersionEditorContext's actor.IsPlatformAdmin
// branch without needing permissionSvc/auditLogRepo wired on the test handler at all.
func evecFixturePlatformAdminIdentity() middleware.AuthIdentity {
	return middleware.AuthIdentity{
		UserID:          4001,
		AppUserID:       4001,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Fixture-Admin",
	}
}

// openEVECFixture opens the shared Phase-117 Postgres fixture and extends its minimal stub
// schema with exactly the columns/tables GetAnimeSyncSource's plain (non-V2) branch and
// EpisodeVersionRepository.GetByID/ListDateNeighbors reference, then seeds a single
// Jellyfin-bound anime/episode/release/variant row.
func openEVECFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)

	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		ALTER TABLE anime
			ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '',
			ADD COLUMN IF NOT EXISTS title_de TEXT,
			ADD COLUMN IF NOT EXISTS title_en TEXT,
			ADD COLUMN IF NOT EXISTS source TEXT,
			ADD COLUMN IF NOT EXISTS folder_name TEXT,
			ADD COLUMN IF NOT EXISTS year SMALLINT,
			ADD COLUMN IF NOT EXISTS max_episodes SMALLINT,
			ADD COLUMN IF NOT EXISTS description TEXT,
			ADD COLUMN IF NOT EXISTS cover_image TEXT;
		ALTER TABLE release_variants
			ADD COLUMN IF NOT EXISTS video_quality TEXT,
			ADD COLUMN IF NOT EXISTS resolution TEXT,
			ADD COLUMN IF NOT EXISTS subtitle_type TEXT,
			ADD COLUMN IF NOT EXISTS crc32 TEXT,
			ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL,
			ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ NULL;
		ALTER TABLE release_versions ADD COLUMN IF NOT EXISTS production_started_on TIMESTAMPTZ NULL;
		ALTER TABLE fansub_groups
			ADD COLUMN IF NOT EXISTS slug TEXT,
			ADD COLUMN IF NOT EXISTS logo_url TEXT;
		CREATE TABLE IF NOT EXISTS release_variant_episodes (
			release_variant_id BIGINT REFERENCES release_variants(id),
			episode_id BIGINT REFERENCES episodes(id),
			position INT NOT NULL DEFAULT 0
		);
		CREATE TABLE IF NOT EXISTS anime_source_links (
			anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
			source TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (anime_id, source)
		);

		INSERT INTO anime (id, title, source, folder_name) VALUES
			(301, 'Fixture-Anime', 'jellyfin:series-401', '/data/anime/FixtureFallback');
		INSERT INTO episodes (id, anime_id, episode_number) VALUES (3001, 301, '1');
		INSERT INTO fansub_releases (id, episode_id) VALUES (3101, 3001);
		INSERT INTO release_versions (id, release_id) VALUES (3201, 3101);
		INSERT INTO release_variants (id, release_version_id) VALUES (3301, 3201);
	`)
	require.NoError(t, err)
	return pool
}

// evecFixtureHandler builds an AdminContentHandler wired against the fixture pool, with the
// given Jellyfin base URL/API key (empty strings model the "not configured" case).
func evecFixtureHandler(pool *pgxpool.Pool, jellyfinBaseURL, jellyfinAPIKey string) *AdminContentHandler {
	return &AdminContentHandler{
		repo:               repository.NewAdminContentRepository(pool),
		episodeVersionRepo: repository.NewEpisodeVersionRepository(pool),
		jellyfinBaseURL:    jellyfinBaseURL,
		jellyfinAPIKey:     jellyfinAPIKey,
		httpClient:         http.DefaultClient,
	}
}

func evecFixtureRequest(h *AdminContentHandler) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/episode-versions/3301/editor-context", nil)
	c.Params = gin.Params{{Key: "versionId", Value: "3301"}}
	c.Set("auth_identity", evecFixturePlatformAdminIdentity())
	h.GetEpisodeVersionEditorContext(c)
	return w
}

// TestEpisodeVersionEditorContextJellyfinUnauthorizedDegradesInsteadOf500 proves subtest (1):
// a Jellyfin 401 while configured must still return 200 with the folder_name fallback and
// jellyfin_enrichment_degraded=true, never a blanket 500.
func TestEpisodeVersionEditorContextJellyfinUnauthorizedDegradesInsteadOf500(t *testing.T) {
	pool := openEVECFixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "invalid-key")
	rec := evecFixtureRequest(h)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var response struct {
		Data models.EpisodeVersionEditorContext `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotNil(t, response.Data.AnimeFolderPath)
	require.Equal(t, "/data/anime/FixtureFallback", *response.Data.AnimeFolderPath)
	require.True(t, response.Data.JellyfinEnrichmentDegraded)
}

// TestEpisodeVersionEditorContextJellyfinSucceedsStaysNotDegraded proves subtest (2): the
// passing Jellyfin case is byte-identical to pre-plan behavior, with degraded staying false.
func TestEpisodeVersionEditorContextJellyfinSucceedsStaysNotDegraded(t *testing.T) {
	pool := openEVECFixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[{"Id":"series-401","Path":"D:\\Anime\\TV\\FixtureSeries"}]}`))
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "valid-key")
	rec := evecFixtureRequest(h)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var response struct {
		Data models.EpisodeVersionEditorContext `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotNil(t, response.Data.AnimeFolderPath)
	require.Equal(t, `D:\Anime\TV\FixtureSeries`, *response.Data.AnimeFolderPath)
	require.False(t, response.Data.JellyfinEnrichmentDegraded)
}

// TestEpisodeVersionEditorContextJellyfinNotConfiguredStaysNotDegraded proves subtest (3): the
// not-configured case is unchanged and must never report degraded=true.
func TestEpisodeVersionEditorContextJellyfinNotConfiguredStaysNotDegraded(t *testing.T) {
	pool := openEVECFixture(t)

	h := evecFixtureHandler(pool, "", "")
	rec := evecFixtureRequest(h)
	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())

	var response struct {
		Data models.EpisodeVersionEditorContext `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotNil(t, response.Data.AnimeFolderPath)
	require.Equal(t, "/data/anime/FixtureFallback", *response.Data.AnimeFolderPath)
	require.False(t, response.Data.JellyfinEnrichmentDegraded)
}

// TestEpisodeVersionEditorContextScanDegradesTo502OnSameUpstreamFailure proves subtest (4):
// scanEpisodeVersionFolder, the one other real caller of the shared resolver, must degrade to
// a clear German 502 instead of a blanket 500 for the same upstream 401, as a side effect of
// the central resolveEpisodeVersionFolderPath fix -- no separate code change needed there.
func TestEpisodeVersionEditorContextScanDegradesTo502OnSameUpstreamFailure(t *testing.T) {
	pool := openEVECFixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "invalid-key")
	_, statusCode, err := h.scanEpisodeVersionFolder(context.Background(), 3301)
	require.Equal(t, http.StatusBadGateway, statusCode)
	require.EqualError(t, err, "ordner konnte nicht synchronisiert werden")
}

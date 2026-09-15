package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"team4s.v3/backend/internal/permissions"
	"testing"
	"time"

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

func TestEpisodeVersionEditorContextSelectedFileAndContributor(t *testing.T) {
	loadAppAuthCapabilityTestCache(t)
	for _, contributor := range []bool{false, true} {
		for _, alternate := range []bool{false, true} {
			for _, knownDuration := range []bool{false, true} {
				t.Run(fmt.Sprintf("contributor=%t/alternate=%t/duration=%t", contributor, alternate, knownDuration), func(t *testing.T) {
					pool := openVersionHydrationFixture(t)
					if !knownDuration {
						_, err := pool.Exec(context.Background(), `UPDATE release_variants SET duration_seconds=NULL WHERE id=3301`)
						require.NoError(t, err)
					}
					if alternate {
						_, err := pool.Exec(context.Background(), `UPDATE stream_sources SET metadata=jsonb_set(metadata,'{jellyfin_source,media_source_id}','"source-b"') WHERE external_id='item-a'`)
						require.NoError(t, err)
					}
					before := hydrationState(t, pool)
					exact, series := 0, 0
					server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						if r.URL.Query().Get("Ids") == "series-401" {
							series++
							fmt.Fprint(w, `{"Items":[{"Id":"series-401","Path":"/data/anime/FixtureFallback"}]}`)
							return
						}
						exact++
						require.Equal(t, "item-a", r.URL.Query().Get("Ids"))
						require.Equal(t, jellyfinSourceFields+",Chapters", r.URL.Query().Get("Fields"))
						fmt.Fprint(w, `{"Items":[{"Id":"item-a","Type":"Episode","SeriesId":"series-401","Path":"/data/anime/FixtureFallback/a.mkv","Chapters":[{"Name":"Own A","StartPositionTicks":12980470000}],"MediaSources":[{"Id":"source-b","Path":"/data/anime/FixtureFallback/b.mkv","Size":222,"RunTimeTicks":15000000000,"MediaStreams":[]},{"Id":"source-a","Path":"/data/anime/FixtureFallback/a.mkv","Size":111,"RunTimeTicks":14000000000,"MediaStreams":[]}]}],"TotalRecordCount":1}`)
					}))
					defer server.Close()
					h := evecFixtureHandler(pool, server.URL, "fixture-key")
					h.permissionSvc = permissions.NewService(contributionsPermissionResolverAllowed{})
					rec := evecChapterRequest(h, contributor, true)
					require.Equal(t, 200, rec.Code, rec.Body.String())
					var response struct {
						Data models.EpisodeVersionEditorContext `json:"data"`
					}
					require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
					file := response.Data.SelectedFile
					require.NotNil(t, file)
					size := int64(111)
					duration := int32(1400)
					name := "a.mkv"
					if alternate {
						size = 222
						duration = 1500
						name = "b.mkv"
					}
					require.Equal(t, name, file.FileName)
					require.Equal(t, &size, file.FileSizeBytes)
					require.NotNil(t, file.ChapterHints)
					if alternate {
						require.Nil(t, *file.ChapterHints)
					} else {
						require.Len(t, *file.ChapterHints, 1)
						require.Equal(t, int64(1298047), (*file.ChapterHints)[0].StartMS)
					}
					if knownDuration {
						duration = 1200
					}
					require.Equal(t, &duration, response.Data.Version.DurationSeconds)
					require.Equal(t, 1, exact)
					if contributor {
						require.Zero(t, series)
					} else {
						require.Equal(t, 1, series)
					}
					require.False(t, response.Data.JellyfinEnrichmentDegraded)
					if contributor {
						require.Empty(t, file.Path)
						require.Empty(t, file.MediaItemID)
						require.Nil(t, file.MediaSourceID)
						require.Nil(t, file.StreamURL)
						for _, secret := range []string{"/data/anime", "source-a", "source-b", "item-a", "old.invalid", "fixture-key", "media_source_id", "stream_url"} {
							require.NotContains(t, rec.Body.String(), secret)
						}
					}
					require.Equal(t, before, hydrationState(t, pool))
				})
			}
		}
	}
}

func evecChapterRequest(h *AdminContentHandler, contributor, authenticated bool) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin/episode-versions/3301/editor-context", nil)
	c.Params = gin.Params{{Key: "versionId", Value: "3301"}}
	if authenticated {
		identity := evecFixturePlatformAdminIdentity()
		if contributor {
			identity.IsPlatformAdmin = false
			identity.UserID = 4002
			identity.AppUserID = 4002
		}
		c.Set("auth_identity", identity)
	}
	h.GetEpisodeVersionEditorContext(c)
	return w
}

func TestEpisodeVersionEditorContextChapterFailuresRemainUsable(t *testing.T) {
	for _, scenario := range []string{"401", "403", "503", "timeout", "network", "wrong item", "wrong series", "outside path", "lost binding", "not configured"} {
		t.Run(scenario, func(t *testing.T) {
			pool := openVersionHydrationFixture(t)
			exact := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Query().Get("Ids") == "series-401" {
					fmt.Fprint(w, `{"Items":[{"Id":"series-401","Path":"/data/anime/FixtureFallback"}]}`)
					return
				}
				exact++
				switch scenario {
				case "401":
					w.WriteHeader(401)
					return
				case "403":
					w.WriteHeader(403)
					return
				case "503":
					w.WriteHeader(503)
					return
				case "timeout":
					time.Sleep(50 * time.Millisecond)
				}
				id, series, path, source := "item-a", "series-401", "/data/anime/FixtureFallback/a.mkv", "source-a"
				switch scenario {
				case "wrong item":
					id = "wrong"
				case "wrong series":
					series = "other"
				case "outside path":
					path = "/private/a.mkv"
				case "lost binding":
					source = "gone"
					path = "/data/anime/FixtureFallback/gone.mkv"
				}
				fmt.Fprintf(w, `{"Items":[{"Id":%q,"Type":"Episode","SeriesId":%q,"Path":%q,"Chapters":[],"MediaSources":[{"Id":%q,"Path":%q,"Size":111,"MediaStreams":[]}]}]}`, id, series, path, source, path)
			}))
			defer server.Close()
			h := evecFixtureHandler(pool, server.URL, "fixture-key")
			if scenario == "timeout" {
				h.httpClient = &http.Client{Timeout: 10 * time.Millisecond}
			}
			if scenario == "network" {
				server.Close()
			}
			if scenario == "not configured" {
				h.jellyfinBaseURL = ""
			}
			rec := evecChapterRequest(h, false, true)
			require.Equal(t, 200, rec.Code)
			var response struct {
				Data models.EpisodeVersionEditorContext `json:"data"`
			}
			require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
			require.Nil(t, response.Data.SelectedFile)
			require.Equal(t, scenario != "not configured", response.Data.JellyfinEnrichmentDegraded)
			if scenario != "network" && scenario != "not configured" {
				require.Equal(t, 1, exact)
			}
		})
	}
}

func TestEpisodeVersionContributorContextDeniedBeforeProviderRead(t *testing.T) {
	loadAppAuthCapabilityTestCache(t)
	h := &AdminContentHandler{permissionSvc: permissions.NewService(contributionsPermissionResolverDenied{})}
	require.Equal(t, 403, evecChapterRequest(h, true, true).Code)
	require.Equal(t, 401, evecChapterRequest(h, true, false).Code)
}

func TestEpisodeVersionMediaFilesSelectedSizeWithoutChapters(t *testing.T) {
	item := jellyfinSourceTestItem(t, strings.Replace(jellyfinCoherentSourceFixture, `"Id":"item"`, `"Id":"item","Type":"Episode","SeriesId":"series","Chapters":[]`, 1))
	size := int64(222)
	item.MediaSources[0].Size = &size
	files, err := buildEpisodeVersionMediaFiles([]jellyfinEpisodeItem{item}, "series", nil, map[string]models.JellyfinSourceSnapshot{"item": {MediaSourceID: "b"}}, func(string) *string { return nil })
	require.NoError(t, err)
	require.Len(t, files, 1)
	require.Equal(t, &size, files[0].FileSizeBytes)
	require.Nil(t, files[0].ChapterHints)
}

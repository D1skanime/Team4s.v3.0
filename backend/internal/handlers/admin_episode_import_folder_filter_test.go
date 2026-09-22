package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

// TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes
// proves the GAP-07 fix (165-UAT.md): given a two-folder anime (main folder
// A = jellyfin:series-401, additionally-connected folder B =
// jellyfin:series-402), an explicit jellyfin_series_id=series-402 preview
// request returns B's own episodes -- not an empty list, which was the
// pre-fix behavior because loadEpisodeImportMediaCandidates unconditionally
// filtered by the MAIN folder's path (contextResult.FolderPath) even though
// listJellyfinEpisodes already scoped the fetch server-side to series-402.
func TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes(t *testing.T) {
	pool := openEVECFixture(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime_source_links (anime_id, source) VALUES (301, 'jellyfin:series-402')
	`)
	require.NoError(t, err)

	itemsRequests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/Shows/series-402/Episodes":
			_, _ = w.Write([]byte(`{"Items":[{
				"Id":"ep-B-1",
				"SeriesId":"series-402",
				"Name":"Folder B Episode 1",
				"Path":"/media/Anime/FolderB/Folder B - 01.mkv",
				"IndexNumber":1,
				"MediaSources":[{"Id":"ep-B-1","Path":"/media/Anime/FolderB/Folder B - 01.mkv","Container":"mkv"}]
			}],"TotalRecordCount":1}`))
		case "/Items":
			itemsRequests++
			require.Equal(t, "series-402", r.URL.Query().Get("Ids"))
			_, _ = w.Write([]byte(`{"Items":[{"Id":"series-402","Path":"/media/Anime/FolderB"}]}`))
		default:
			t.Fatalf("unexpected jellyfin path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{"jellyfin_series_id":"series-402"}`)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Equal(t, 1, itemsRequests, "getJellyfinSeriesByID must be called exactly once, not per-episode")

	var response struct {
		Data models.EpisodeImportPreviewResult `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotEmpty(t, response.Data.MediaCandidates, "expected folder B's own episodes, not an empty list")
	require.Equal(t, "ep-B-1", response.Data.MediaCandidates[0].MediaItemID)
}

// TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged proves Test 2:
// the SAME two-folder anime, called with jellyfin_series_id omitted (the
// main-folder auto-resolve path), still returns exactly the same
// media_candidates as before this plan -- main-folder behavior is
// byte-identical, and no extra /Items call is made for this case (Test 3).
func TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged(t *testing.T) {
	pool := openEVECFixture(t)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime_source_links (anime_id, source) VALUES (301, 'jellyfin:series-402')
	`)
	require.NoError(t, err)

	itemsRequests := 0
	episodesRequests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/Shows/series-401/Episodes":
			episodesRequests++
			_, _ = w.Write([]byte(`{"Items":[{
				"Id":"ep-A-1",
				"SeriesId":"series-401",
				"Name":"Folder A Episode 1",
				"Path":"/data/anime/FixtureFallback/Folder A - 01.mkv",
				"IndexNumber":1,
				"MediaSources":[{"Id":"ep-A-1","Path":"/data/anime/FixtureFallback/Folder A - 01.mkv","Container":"mkv"}]
			}],"TotalRecordCount":1}`))
		case "/Items":
			itemsRequests++
			_, _ = w.Write([]byte(`{"Items":[]}`))
		default:
			t.Fatalf("unexpected jellyfin path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{}`)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Equal(t, 1, episodesRequests, "expected exactly one /Shows/series-401/Episodes fetch")
	require.Zero(t, itemsRequests, "main-folder path must not trigger any extra /Items lookup (no new upstream traffic)")

	var response struct {
		Data models.EpisodeImportPreviewResult `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotEmpty(t, response.Data.MediaCandidates, "expected folder A's own episodes")
	require.Equal(t, "ep-A-1", response.Data.MediaCandidates[0].MediaItemID)
}

// TestPreviewEpisodeImport_ExplicitMainFolderIDStaysUnchanged proves that an
// explicit jellyfin_series_id equal to the main folder's own ID (not just
// "omitted") is treated identically to the omitted case -- no extra /Items
// lookup, same media_candidates as the auto-resolve path.
func TestPreviewEpisodeImport_ExplicitMainFolderIDStaysUnchanged(t *testing.T) {
	pool := openEVECFixture(t)

	itemsRequests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/Shows/series-401/Episodes":
			_, _ = w.Write([]byte(`{"Items":[{
				"Id":"ep-A-1",
				"SeriesId":"series-401",
				"Name":"Folder A Episode 1",
				"Path":"/data/anime/FixtureFallback/Folder A - 01.mkv",
				"IndexNumber":1,
				"MediaSources":[{"Id":"ep-A-1","Path":"/data/anime/FixtureFallback/Folder A - 01.mkv","Container":"mkv"}]
			}],"TotalRecordCount":1}`))
		case "/Items":
			itemsRequests++
			_, _ = w.Write([]byte(`{"Items":[]}`))
		default:
			t.Fatalf("unexpected jellyfin path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{"jellyfin_series_id":"series-401"}`)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Zero(t, itemsRequests, "explicit main-folder id must not trigger any extra /Items lookup")

	var response struct {
		Data models.EpisodeImportPreviewResult `json:"data"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &response))
	require.NotEmpty(t, response.Data.MediaCandidates)
}

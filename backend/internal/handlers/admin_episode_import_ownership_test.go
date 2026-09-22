package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

// TestRejectUnownedJellyfinSeriesID_RejectsIDNotInAllowList proves Test 3: a
// requested series ID absent from the allow-list writes a fail-closed HTTP
// 400 with a German ownership message directly to a httptest-backed
// gin.Context, and reports true so the caller returns immediately.
func TestRejectUnownedJellyfinSeriesID_RejectsIDNotInAllowList(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)

	h := &AdminContentHandler{}
	rejected := h.rejectUnownedJellyfinSeriesID(c, "xyz", []models.JellyfinFolderOption{{JellyfinItemID: "abc", IsMain: true}})

	require.True(t, rejected)
	require.Equal(t, http.StatusBadRequest, rec.Code)
	require.Contains(t, rec.Body.String(), "nicht mit diesem Anime verbunden")
}

// TestRejectUnownedJellyfinSeriesID_AllowsEmptyRequestedID proves that an
// empty requestedSeriesID (today's single-folder auto-resolve path, using
// contextResult.JellyfinSeriesID instead of a client override) performs no
// check and writes no response.
func TestRejectUnownedJellyfinSeriesID_AllowsEmptyRequestedID(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)

	h := &AdminContentHandler{}
	rejected := h.rejectUnownedJellyfinSeriesID(c, "", nil)

	require.False(t, rejected)
	require.Zero(t, rec.Body.Len())
}

// previewEpisodeImportOwnershipRequest drives the full PreviewEpisodeImport
// handler through httptest/gin.CreateTestContext against a real Postgres
// fixture pool, exactly like evecFixtureRequest's sibling helpers in
// admin_content_episode_version_editor_context_test.go.
func previewEpisodeImportOwnershipRequest(h *AdminContentHandler, animeID string, body string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Params = gin.Params{{Key: "id", Value: animeID}}
	c.Request = httptest.NewRequest(http.MethodPost, "/admin/anime/"+animeID+"/episode-import/preview", strings.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("auth_identity", evecFixturePlatformAdminIdentity())
	h.PreviewEpisodeImport(c)
	return rec
}

// TestPreviewEpisodeImport_RejectsUnownedJellyfinSeriesIDBeforeAnyJellyfinCall
// proves Test 4: a jellyfin_series_id present in the request body but absent
// from both source.Source and source.SourceLinks of the target anime returns
// HTTP 400, and the fake Jellyfin server's request counter stays exactly 0 --
// the rejection happens strictly before any Jellyfin HTTP call
// (RESEARCH.md Pitfall 5).
func TestPreviewEpisodeImport_RejectsUnownedJellyfinSeriesIDBeforeAnyJellyfinCall(t *testing.T) {
	pool := openEVECFixture(t)
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[]}`))
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{"jellyfin_series_id":"unauthorized-series"}`)

	require.Equal(t, http.StatusBadRequest, rec.Code, rec.Body.String())
	require.Contains(t, rec.Body.String(), "nicht mit diesem Anime verbunden")
	require.Zero(t, requests, "must not call Jellyfin before the ownership guard rejects")
}

// TestPreviewEpisodeImport_NoRequestedSeriesIDBehavesUnchanged proves Test 5:
// the single-folder auto-resolve path (no jellyfin_series_id in the request
// body, today's 4/4 bestandsanime scenario) is byte-for-byte unchanged by the
// new guard -- the fake Jellyfin server still receives exactly the same
// single fetch as before this change.
func TestPreviewEpisodeImport_NoRequestedSeriesIDBehavesUnchanged(t *testing.T) {
	pool := openEVECFixture(t)
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		require.Equal(t, "/Shows/series-401/Episodes", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[]}`))
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{}`)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Equal(t, 1, requests, "expected exactly the same single Jellyfin fetch as before this change")
}

// TestPreviewEpisodeImport_SingleFolderOwnedSeriesIDPassesGuard proves the
// fix for the false-rejection bug: loadEpisodeImportContext nil's `folders`
// for display whenever an anime has exactly one connected Jellyfin folder
// (D-14), but the ownership guard must always see the real, un-nil'd list.
// Before the fix, a single-folder anime (301 / "jellyfin:series-401") whose
// caller explicitly sends its OWN, correctly-owned jellyfin_series_id was
// wrongly rejected as "nicht mit diesem Anime verbunden" because the guard
// was fed the same nil'd field the D-14 display simplification produces.
func TestPreviewEpisodeImport_SingleFolderOwnedSeriesIDPassesGuard(t *testing.T) {
	pool := openEVECFixture(t)
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		require.Equal(t, "/Shows/series-401/Episodes", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Items":[]}`))
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{"jellyfin_series_id":"series-401"}`)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Equal(t, 1, requests, "expected the guard to allow the anime's own single connected folder")
}

// TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard proves
// Test 6: a jellyfin_series_id present in source_links (the multi-folder
// case) passes the ownership guard and proceeds to loadEpisodeImportMediaCandidates
// as before. Since GAP-07 (165-14), a genuinely non-main folder selection also
// triggers exactly one resolveEpisodeImportFolderFilterPath lookup (GET
// /Items?Ids=series-402) before the episode fetch -- both requests are
// asserted here by routing on path instead of asserting a single request.
func TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard(t *testing.T) {
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
		case "/Shows/series-402/Episodes":
			episodesRequests++
			_, _ = w.Write([]byte(`{"Items":[]}`))
		case "/Items":
			itemsRequests++
			require.Equal(t, "series-402", r.URL.Query().Get("Ids"))
			_, _ = w.Write([]byte(`{"Items":[{"Id":"series-402","Path":"/media/Anime/series-402"}]}`))
		default:
			t.Fatalf("unexpected jellyfin path %s", r.URL.Path)
		}
	}))
	defer server.Close()

	h := evecFixtureHandler(pool, server.URL, "test-key")
	h.authzRepo = adminRoleCheckerStub{isAdmin: true}
	rec := previewEpisodeImportOwnershipRequest(h, "301", `{"jellyfin_series_id":"series-402"}`)

	require.Equal(t, http.StatusOK, rec.Code, rec.Body.String())
	require.Equal(t, 1, episodesRequests, "expected the guard to allow a genuinely connected folder and proceed to Jellyfin")
	require.Equal(t, 1, itemsRequests, "expected exactly one folder-filter-path lookup for the non-main folder (GAP-07)")
}

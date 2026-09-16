package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"testing"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
)

func TestJellyfinSourceEnumerationIdentityAndAliases(t *testing.T) {
	item := jellyfinSourceTestItem(t, `{"Id":"owner","Type":"Episode","SeriesId":"series","IndexNumber":2,"ParentIndexNumber":1,"Path":"/anime/a.mkv","MediaSources":[{"Id":"a","Path":"/anime/a.mkv","MediaStreams":[]},{"Id":"b","Path":"/anime/b.mp4","MediaStreams":[]},{"Id":"c","Path":"/anime/c.mkv","MediaStreams":[]}]}`)
	alias := item
	alias.ID = "b"
	alias.Path = "/anime/b.mp4"
	alias.MediaSources = []jellyfinMediaSource{item.MediaSources[1]}
	for _, tc := range []struct {
		name  string
		items []jellyfinEpisodeItem
		count int
	}{
		{"one item three", []jellyfinEpisodeItem{item}, 3},
		{"one item one", []jellyfinEpisodeItem{alias}, 1},
		{"standalone alias", []jellyfinEpisodeItem{item, alias}, 3},
	} {
		t.Run(tc.name, func(t *testing.T) {
			sources, err := enumerateJellyfinMediaSources(tc.items, "/anime", nil)
			require.NoError(t, err)
			require.Len(t, sources, tc.count)
			slices.Reverse(tc.items)
			for i := range tc.items {
				slices.Reverse(tc.items[i].MediaSources)
			}
			reversed, err := enumerateJellyfinMediaSources(tc.items, "/anime", nil)
			require.NoError(t, err)
			pairs := func(in []jellyfinImportSource) []models.JellyfinSourceKey {
				out := []models.JellyfinSourceKey{}
				for _, s := range in {
					out = append(out, models.JellyfinSourceKey{ItemID: s.Item.ID, SourceID: s.Source.Snapshot.MediaSourceID})
				}
				return out
			}
			require.Equal(t, pairs(sources), pairs(reversed))
			for _, source := range sources {
				if source.Source.Snapshot.MediaSourceID == "b" && len(tc.items) > 1 {
					require.Equal(t, "b", source.Item.ID)
				}
			}
		})
	}
}

func TestJellyfinSourceEnumerationRejectsContradictoryAliases(t *testing.T) {
	for _, scenario := range []string{"missing ID", "duplicate ID", "changed path", "changed episode", "changed series"} {
		t.Run(scenario, func(t *testing.T) {
			item := jellyfinSourceTestItem(t, `{"Id":"item","SeriesId":"series","IndexNumber":1,"Path":"/anime/a","MediaSources":[{"Id":"source","Path":"/anime/a","MediaStreams":[]}]}`)
			alias := item
			alias.ID = "alias"
			alias.MediaSources = append([]jellyfinMediaSource(nil), item.MediaSources...)
			switch scenario {
			case "missing ID":
				alias.MediaSources[0].ID = ""
			case "duplicate ID":
				alias.MediaSources = append(alias.MediaSources, alias.MediaSources[0])
			case "changed path":
				alias.MediaSources[0].Path = "/anime/b"
			case "changed episode":
				n := 2
				alias.IndexNumber = &n
			case "changed series":
				alias.SeriesID = "foreign"
			}
			_, err := enumerateJellyfinMediaSources([]jellyfinEpisodeItem{item, alias}, "/anime", nil)
			require.Error(t, err)
		})
	}
	item := jellyfinSourceTestItem(t, `{"Id":"item","Path":"/anime/same","MediaSources":[{"Id":"a","Path":"/anime/same","MediaStreams":[]},{"Id":"b","Path":"/anime/same","MediaStreams":[]}]}`)
	sources, err := enumerateJellyfinMediaSources([]jellyfinEpisodeItem{item}, "/anime", nil)
	require.NoError(t, err)
	require.Len(t, sources, 2, "a shared path never collapses distinct provider source IDs")
}

func TestEpisodeImportSourceCoverageSiblingAndUnresolved(t *testing.T) {
	candidates := []models.EpisodeImportMediaCandidate{
		{MediaItemID: "owner", MediaSourceID: "a", FileName: "a.mkv", JellyfinItemIDs: []string{"owner"}},
		{MediaItemID: "b", MediaSourceID: "b", FileName: "b.mp4", JellyfinItemIDs: []string{"owner", "b"}},
	}
	for _, row := range []models.EpisodeImportMappingRow{
		{MediaItemID: "owner", MediaSourceID: "a"},
		{MediaItemID: "owner", FileName: "a.mkv"},
	} {
		filtered, err := filterAlreadyMappedCandidates(candidates, models.EpisodeImportExistingCoverage{Mappings: []models.EpisodeImportMappingRow{row}})
		require.NoError(t, err)
		require.Len(t, filtered, 1)
		require.Equal(t, "b", filtered[0].MediaSourceID)
	}
	filtered, err := filterAlreadyMappedCandidates(candidates, models.EpisodeImportExistingCoverage{Mappings: []models.EpisodeImportMappingRow{{MediaItemID: "owner", FileName: "b.mp4"}}})
	require.NoError(t, err)
	require.Len(t, filtered, 1)
	require.Equal(t, "a", filtered[0].MediaSourceID)
	for _, filename := range []string{"", "wrong.mkv"} {
		_, err = filterAlreadyMappedCandidates(candidates, models.EpisodeImportExistingCoverage{Mappings: []models.EpisodeImportMappingRow{{MediaItemID: "owner", FileName: filename}}})
		require.Error(t, err)
	}
}

func TestEpisodeImportSourceRehydratesSiblingPairsWithOneItemRequest(t *testing.T) {
	item := jellyfinSourceTestItem(t, `{"Id":"owner","Type":"Episode","SeriesId":"series","Path":"/anime/a.mkv","MediaSources":[{"Id":"a","Path":"/anime/a.mkv","MediaStreams":[]},{"Id":"b","Path":"/anime/b.mp4","MediaStreams":[]}]}`)
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		require.Equal(t, "owner", r.URL.Query().Get("Ids"))
		json.NewEncoder(w).Encode(map[string]any{"Items": []jellyfinEpisodeItem{item}, "TotalRecordCount": 1})
	}))
	defer server.Close()
	spy := &episodeImportSourceRepoSpy{}
	h := &AdminContentHandler{jellyfinBaseURL: server.URL, jellyfinAPIKey: "test", httpClient: server.Client(), episodeImportRepo: spy}
	in := models.EpisodeImportApplyInput{Mappings: []models.EpisodeImportMappingRow{
		{MediaItemID: "owner", MediaSourceID: "a", Status: models.EpisodeImportMappingStatusConfirmed},
		{MediaItemID: "owner", MediaSourceID: "b", Status: models.EpisodeImportMappingStatusConfirmed},
	}}
	series := "series"
	folder := "/anime"
	got, status, err := h.rehydrateEpisodeImportSources(context.Background(), in, models.EpisodeImportContextResult{JellyfinSeriesID: &series, FolderPath: &folder})
	require.NoError(t, err)
	require.Equal(t, 200, status)
	require.Len(t, got.MediaCandidates, 2)
	require.Equal(t, "a.mkv", got.MediaCandidates[0].FileName)
	require.Equal(t, "b.mp4", got.MediaCandidates[1].FileName)
	require.Equal(t, 1, requests)
	require.Equal(t, 1, spy.bindingCalls)
	require.Equal(t, []string{"owner"}, spy.ids)
	in.Mappings[1].MediaSourceID = "foreign"
	_, status, err = h.rehydrateEpisodeImportSources(context.Background(), in, models.EpisodeImportContextResult{JellyfinSeriesID: &series, FolderPath: &folder})
	require.Error(t, err)
	require.Equal(t, 409, status)
}

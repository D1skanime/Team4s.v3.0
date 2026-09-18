package repository_test

import (
	"context"
	"encoding/json"
	"net/url"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

// episode_version_public_writes_test.go holds the write-path and raw-query
// compatibility/release-name tests that were split out of
// episode_version_public_integration_test.go to stay under CLAUDE.md's 450-line
// production-file cap (164-10, GAP-11). All helpers/fixtures (openEpisodeVersionPublicFixture,
// episodePublicRequest, assertPublicBudget, ...) remain defined in the sibling file.

func TestEpisodeVersionPublicFullAssignmentAndWrites(t *testing.T) {
	pool, _ := openEpisodeVersionPublicFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	for _, includeFansubs := range []bool{true, false} {
		data, err := repo.ListGroupedByAnimeID(ctx, 1, true, includeFansubs)
		require.NoError(t, err)
		for _, episode := range data.Episodes {
			for _, v := range episode.Versions {
				if v.ID == 100 {
					require.EqualValues(t, 1, v.SegmentCount)
					require.True(t, v.HasSegmentAsset)
				}
				if v.ID == 101 {
					require.EqualValues(t, 1, v.SegmentCount)
					require.False(t, v.HasSegmentAsset)
				}
			}
		}
	}
	item, err := repo.GetByID(ctx, 100)
	require.NoError(t, err)
	encoded, err := json.Marshal(item)
	require.NoError(t, err)
	var fields map[string]any
	require.NoError(t, json.Unmarshal(encoded, &fields))
	for _, key := range []string{"id", "variant_id", "release_version_id", "release_version", "fansub_groups", "media_provider", "media_item_id", "covered_episode_numbers", "video_quality", "subtitle_type", "crc32", "production_started_on", "release_date", "stream_url", "segment_count", "has_segment_asset", "duration_seconds", "created_at", "updated_at"} {
		require.Contains(t, fields, key)
	}
	require.EqualValues(t, 100, fields["variant_id"])
	require.EqualValues(t, 10, fields["release_version_id"])
	require.EqualValues(t, 1, item.SegmentCount)
	require.True(t, item.HasSegmentAsset)
	counts, err := repo.ListGroupedByAnimeID(ctx, 1, false, false)
	require.NoError(t, err)
	for _, episode := range counts.Episodes {
		require.NotNil(t, episode.Versions)
		require.Empty(t, episode.Versions)
		require.Nil(t, episode.DefaultVersionID)
	}
	title, quality, subtitle, crc, stream := "Created release.mkv", "1080p", "softsub", "1234ABCD", "https://fixture.invalid/created"
	date := time.Date(2021, 2, 3, 0, 0, 0, 0, time.UTC)
	duration := int32(1441)
	created, err := repo.Create(ctx, models.EpisodeVersionCreateInput{AnimeID: 1, EpisodeNumber: 2, Title: &title, MediaProvider: "jellyfin", MediaItemID: "created", VideoQuality: &quality, SubtitleType: &subtitle, CRC32: &crc, StreamURL: &stream, ReleaseDate: &date, DurationSeconds: &duration})
	require.NoError(t, err)
	require.Equal(t, "created", created.MediaItemID)
	require.Equal(t, &crc, created.CRC32)
	require.Equal(t, &duration, created.DurationSeconds)
	encoded, err = json.Marshal(created)
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(encoded, &fields))
	require.EqualValues(t, created.ID, fields["variant_id"])
	require.NotEqual(t, fields["variant_id"], fields["release_version_id"])
	title = "Changed title"
	started := date.AddDate(0, 0, -1)
	patched, err := repo.Update(ctx, created.ID, models.EpisodeVersionPatchInput{Title: models.OptionalString{Set: true, Value: &title}, ProductionStartedOn: models.OptionalTime{Set: true, Value: &started}})
	require.NoError(t, err)
	require.Equal(t, &title, patched.Title)
	require.Equal(t, &crc, patched.CRC32)
	require.Equal(t, &stream, patched.StreamURL)
	require.True(t, patched.ProductionStartedOn.Equal(started))
}

func TestEpisodeVersionPublicRawQueryCompatibility(t *testing.T) {
	pool, tr := openEpisodeVersionPublicFixture(t)
	for _, suffix := range []string{"", "?ignored=%ZZ", "?includeVersions=true&includeFansubs=true&ignored=%ZZ"} {
		_, full := episodePublicRequest(t, pool, "/anime/1/episodes"+suffix, 200)
		require.NotEmpty(t, full.Data.Episodes)
	}
	_, first := episodePublicRequest(t, pool, "/anime/4/episodes?projection=public&limit=24&ignored=%ZZ", 200)
	require.NotNil(t, first.Data.Pagination.NextCursor)
	tr.reset()
	_, second := episodePublicRequest(t, pool, "/anime/4/episodes?projection=public&limit=24&cursor="+url.QueryEscape(*first.Data.Pagination.NextCursor)+"&ignored=%ZZ", 200)
	require.NotEqual(t, first.Data.Episodes[0].Versions[0]["variant_id"], second.Data.Episodes[0].Versions[0]["variant_id"])
	assertPublicBudget(t, tr, 24)
}

// TestEpisodeVersionPublicReleaseNameDefaultFormat is 164-08's GAP-02 behavior test:
// publicEpisodeQuery's new release_name field must never surface a raw filename, must
// pass through a genuinely group-entered title verbatim, and must otherwise compute
// the exact "<Episodentitel> · (<Gruppe(n)>) · <Version>" default (coop-capable).
func TestEpisodeVersionPublicReleaseNameDefaultFormat(t *testing.T) {
	pool, tr := openEpisodeVersionPublicFixture(t)
	tr.reset()
	_, page := episodePublicRequest(t, pool, "/anime/9/episodes?projection=public&limit=24", 200)
	require.Len(t, page.Data.Episodes, 1)
	require.Len(t, page.Data.Episodes[0].Versions, 4)
	byReleaseVersionID := make(map[int64]map[string]any, 4)
	for _, v := range page.Data.Episodes[0].Versions {
		byReleaseVersionID[int64(v["release_version_id"].(float64))] = v
	}
	const soloDefault = "Gap Zwei Episode · (Solo Gruppe) · v1"
	// Test 1: title equals a variant's filename -> computed default, never the filename.
	require.Equal(t, soloDefault, byReleaseVersionID[9001]["release_name"])
	// Test 2: empty title -> computed default.
	require.Equal(t, soloDefault, byReleaseVersionID[9002]["release_name"])
	// Test 3: a genuine group-entered title (not a filename, not a video extension) -> verbatim.
	require.Equal(t, "Special Edition", byReleaseVersionID[9003]["release_name"])
	// Test 4: single-group format is exactly the soloDefault shape above.
	// Test 5: NULL title, two groups -> coop default, ' × '-joined, ORDER BY fg.name, fg.id.
	require.Equal(t, "Gap Zwei Episode · (Coop Gruppe A × Coop Gruppe B) · v1", byReleaseVersionID[9004]["release_name"])
	assertPublicBudget(t, tr, 24)
}

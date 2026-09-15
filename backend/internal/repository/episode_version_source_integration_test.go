package repository_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
)

func versionSourceText(s string) *string { return &s }
func versionSourceSnapshot(id, path string, complete bool) *models.JellyfinSourceSnapshot {
	return &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: id, SourcePath: path, StreamsComplete: complete,
		AudioTracks: []models.JellyfinAudioTrack{{Index: 1, Codec: "flac"}}, SubtitleTracks: []models.JellyfinSubtitleTrack{{Index: 2, Codec: "ass"}}}
}
func versionSourceFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool, _ := openEpisodeVersionPublicFixture(t)
	raw, err := json.Marshal(versionSourceSnapshot("source-a", "/anime/a.mkv", true))
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `ALTER TABLE stream_sources ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
 UPDATE release_variants SET filename='a.mkv',container='matroska',video_codec='hevc',audio_codec='flac' WHERE id=100;
 DELETE FROM release_streams WHERE id=3;`)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `UPDATE stream_sources SET metadata=jsonb_build_object('jellyfin_source',$1::jsonb,'unrelated',true) WHERE id=2`, raw)
	require.NoError(t, err)
	return pool
}
func versionSourceState(t *testing.T, pool *pgxpool.Pool) map[string]string {
	t.Helper()
	result := map[string]string{}
	for _, table := range []string{"fansub_releases", "release_versions", "release_variants", "release_streams", "stream_sources", "release_variant_episodes", "release_version_groups"} {
		var raw string
		require.NoError(t, pool.QueryRow(context.Background(), fmt.Sprintf("SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]')::text FROM %s x", table)).Scan(&raw))
		result[table] = raw
	}
	return result
}
func TestEpisodeVersionSourceMetadataPatchesRetainTechnicalFields(t *testing.T) {
	pool := versionSourceFixture(t)
	ctx := context.Background()
	repo := repository.NewEpisodeVersionRepository(pool)
	duration := int32(1250)
	for _, patch := range []models.EpisodeVersionPatchInput{
		{Title: models.OptionalString{Set: true, Value: versionSourceText("Human title")}},
		{VideoQuality: models.OptionalString{Set: true, Value: versionSourceText("720p")}},
		{SubtitleType: models.OptionalString{Set: true, Value: versionSourceText("hardsub")}},
		{CRC32: models.OptionalString{Set: true, Value: versionSourceText("1234ABCD")}},
		{DurationSeconds: models.OptionalInt32{Set: true, Value: &duration}},
		{ReleaseDate: models.OptionalTime{Set: true}},
	} {
		_, err := repo.Update(ctx, 100, patch)
		require.NoError(t, err)
		var filename, container string
		require.NoError(t, pool.QueryRow(ctx, "SELECT filename,container FROM release_variants WHERE id=100").Scan(&filename, &container))
		require.Equal(t, "a.mkv", filename)
		require.Equal(t, "matroska", container)
		bindings, err := repository.NewEpisodeImportRepository(pool).GetJellyfinSourceBindings(ctx, []string{"own"})
		require.NoError(t, err)
		require.Equal(t, "source-a", bindings["own"].MediaSourceID)
		require.Len(t, bindings["own"].SubtitleTracks, 1)
	}
}
func TestEpisodeVersionSourceCreateDoesNotUseHumanTitleAsFilename(t *testing.T) {
	pool := versionSourceFixture(t)
	item, err := repository.NewEpisodeVersionRepository(pool).Create(context.Background(), models.EpisodeVersionCreateInput{
		AnimeID: 1, EpisodeNumber: 2, MediaProvider: "external", MediaItemID: "manual", Title: versionSourceText("Release title.mkv")})
	require.NoError(t, err)
	var filename, container *string
	require.NoError(t, pool.QueryRow(context.Background(), "SELECT filename,container FROM release_variants WHERE id=$1", item.VariantID).Scan(&filename, &container))
	require.Nil(t, filename)
	require.Nil(t, container)
}
func TestEpisodeVersionSourceRelinkAtomicAndIncompleteGuard(t *testing.T) {
	for _, scenario := range []string{"complete B", "empty B", "incomplete B", "incomplete same A", "same item different source"} {
		t.Run(scenario, func(t *testing.T) {
			pool := versionSourceFixture(t)
			ctx := context.Background()
			repo := repository.NewEpisodeVersionRepository(pool)
			next := versionSourceSnapshot("source-b", "/anime/b.webm", true)
			patch := models.EpisodeVersionPatchInput{MediaItemID: models.OptionalString{Set: true, Value: versionSourceText("item-b")}, MediaSourceID: models.OptionalString{Set: true, Value: versionSourceText("source-b")},
				Title: models.OptionalString{Set: true, Value: versionSourceText("Operator title")}, JellyfinSource: next, FileName: versionSourceText("b.webm"), Container: versionSourceText("webm"), VideoCodec: versionSourceText("vp9"), AudioCodec: versionSourceText("opus")}
			if scenario == "empty B" {
				next.AudioTracks = []models.JellyfinAudioTrack{}
				next.SubtitleTracks = []models.JellyfinSubtitleTrack{}
				patch.VideoCodec = nil
				patch.AudioCodec = nil
				patch.Container = nil
			}
			if scenario == "incomplete B" {
				next.StreamsComplete = false
			}
			if scenario == "same item different source" {
				patch.MediaItemID.Value = versionSourceText("own")
			}
			if scenario == "incomplete same A" {
				patch.MediaItemID.Value = versionSourceText("own")
				patch.MediaSourceID.Value = versionSourceText("source-a")
				next = versionSourceSnapshot("source-a", "/anime/a.mkv", false)
				patch.JellyfinSource = next
				patch.FileName = nil
				patch.Container = nil
				patch.VideoCodec = nil
				patch.AudioCodec = nil
			}
			before := versionSourceState(t, pool)
			item, err := repo.Update(ctx, 100, patch)
			if scenario == "incomplete B" || scenario == "same item different source" {
				require.ErrorIs(t, err, repository.ErrConflict)
				require.Equal(t, before, versionSourceState(t, pool))
				return
			}
			require.NoError(t, err)
			require.Equal(t, patch.Title.Value, item.Title)
			var filename, container, video, audio *string
			require.NoError(t, pool.QueryRow(ctx, "SELECT filename,container,video_codec,audio_codec FROM release_variants WHERE id=100").Scan(&filename, &container, &video, &audio))
			if scenario == "incomplete same A" {
				require.Equal(t, versionSourceText("a.mkv"), filename)
				require.Equal(t, versionSourceText("matroska"), container)
				require.Equal(t, versionSourceText("flac"), audio)
			} else {
				require.Equal(t, patch.FileName, filename)
				require.Equal(t, patch.Container, container)
				require.Equal(t, patch.VideoCodec, video)
				require.Equal(t, patch.AudioCodec, audio)
			}
			var other int
			require.NoError(t, pool.QueryRow(ctx, "SELECT count(*) FROM release_streams WHERE variant_id=10 AND stream_source_id=1").Scan(&other))
			require.Equal(t, 1, other)
			bindings, err := repository.NewEpisodeImportRepository(pool).GetJellyfinSourceBindings(ctx, []string{*patch.MediaItemID.Value})
			require.NoError(t, err)
			require.True(t, bindings[*patch.MediaItemID.Value].StreamsComplete)
			require.Equal(t, before["release_version_groups"], versionSourceState(t, pool)["release_version_groups"])
		})
	}
}

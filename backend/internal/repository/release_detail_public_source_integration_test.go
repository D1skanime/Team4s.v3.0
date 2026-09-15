package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
	"team4s.v3/backend/internal/models"
)

// One fixture is shared by public projection and the internal source selection
// assertions. All rows are created only in the guarded unique test schema.
func openPublicTechnicalSourceFixture(t *testing.T) (*pgxpool.Pool, *jellyfinBindingQueryCounter) {
	t.Helper()
	base := openJellyfinSourceFixture(t)
	ctx := context.Background()
	_, err := base.Exec(ctx, `
 ALTER TABLE release_variants ADD COLUMN IF NOT EXISTS resolution TEXT,ADD COLUMN IF NOT EXISTS video_quality TEXT,ADD COLUMN IF NOT EXISTS container TEXT,
 ADD COLUMN IF NOT EXISTS video_codec TEXT,ADD COLUMN IF NOT EXISTS audio_codec TEXT,ADD COLUMN IF NOT EXISTS subtitle_type TEXT;
 ALTER TABLE release_streams ADD COLUMN IF NOT EXISTS audio_language_id BIGINT,ADD COLUMN IF NOT EXISTS subtitle_language_id BIGINT;
 CREATE TABLE IF NOT EXISTS languages(id BIGINT PRIMARY KEY,code TEXT,name TEXT);
 INSERT INTO languages VALUES(1,'ja','Japanisch'),(2,'de','Deutsch'),(3,'en','Englisch');
 INSERT INTO anime(id) VALUES(1);
 INSERT INTO episodes(id,anime_id,episode_number) VALUES(1,1,'1'),(2,1,'2');
 INSERT INTO fansub_groups(id,name) VALUES(1,'A'),(2,'B');
 INSERT INTO fansub_releases(id,episode_id) VALUES(1,1),(2,2);
 INSERT INTO release_versions(id,release_id) VALUES(10,1),(20,2);
 INSERT INTO release_version_groups VALUES(10,1),(10,2),(20,2);
 INSERT INTO release_variants(id,release_version_id,duration_seconds,resolution,container,video_codec,audio_codec,subtitle_type)
 VALUES(100,10,1500,'1080p','mkv','h264','stale-aac','softsub'),
 (200,10,1600,'720p','mp4','h265','aac','hardsub'),
 (50,20,1700,'480p','avi','xvid','mp3','hardsub');
 INSERT INTO stream_sources(id,provider_type,external_id,url) VALUES(1000,'jellyfin','item-a','https://private.invalid/a'),(2000,'jellyfin','item-b','https://private.invalid/b'),(3000,'external','foreign','https://private.invalid/c');
 INSERT INTO release_streams(id,variant_id,stream_source_id,audio_language_id,subtitle_language_id)
 VALUES(100,100,1000,1,2),(1,200,2000,2,3),(2,50,3000,3,3);
 `)
	require.NoError(t, err)
	index := int32(3)
	ja, de, en := "ja", "de", "en"
	binding := models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "source-a", SourcePath: "/private/a.mkv", StreamsComplete: true, SelectedAudioIndex: &index,
		AudioTracks:    []models.JellyfinAudioTrack{{Index: 1, Codec: "ac3", Language: &en}, {Index: 3, Codec: "flac", Language: &ja}},
		SubtitleTracks: []models.JellyfinSubtitleTrack{{Index: 4, Codec: "srt", Language: &de, DisplayTitle: "Deutsch Full", IsDefault: true}, {Index: 7, Codec: "ass", IsForced: true}}}
	setPublicSourceBinding(t, base, &binding)
	counter := &jellyfinBindingQueryCounter{}
	cfg := base.Config()
	cfg.ConnConfig.Tracer = counter
	cfg.MaxConns = 1
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	require.NoError(t, pool.Ping(ctx))
	counter.count, counter.rows = 0, 0
	return pool, counter
}
func setPublicSourceBinding(t *testing.T, pool *pgxpool.Pool, binding *models.JellyfinSourceSnapshot) {
	t.Helper()
	raw, err := json.Marshal(binding)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `UPDATE stream_sources SET metadata=jsonb_build_object('jellyfin_source',$1::jsonb) WHERE id=1000`, raw)
	require.NoError(t, err)
}
func TestPublicReleaseTechnicalSourceCoherentSnapshot(t *testing.T) {
	pool, counter := openPublicTechnicalSourceFixture(t)
	facts, tracks, err := NewReleaseDetailPublicRepository(pool, "").loadReleaseTechnical(context.Background(), 10)
	require.NoError(t, err)
	require.Equal(t, 1, counter.count, "scalars and binding must share one SQL snapshot")
	require.EqualValues(t, 1, counter.rows)
	require.Equal(t, "mkv", *facts.Container)
	require.Equal(t, "h264", *facts.VideoCodec)
	require.Equal(t, "1080p", *facts.Resolution)
	require.EqualValues(t, 1500, *facts.DurationSeconds)
	require.Equal(t, "flac", *facts.AudioCodec)
	require.Equal(t, "ja", *facts.AudioLanguage)
	require.Equal(t, "softsub", *facts.SubtitleType)
	require.Len(t, tracks, 2)
	require.Equal(t, "de", *tracks[0].Language)
	require.Equal(t, "Deutsch Full", tracks[0].Label)
	require.Equal(t, "srt", *tracks[0].Format)
	require.True(t, tracks[0].Default)
	require.False(t, tracks[0].Forced)
	require.Nil(t, tracks[1].Language)
	require.Equal(t, "ass", *tracks[1].Format)
	require.Equal(t, "Untertitel 7", tracks[1].Label)
	require.True(t, tracks[1].Forced)
	require.False(t, tracks[1].Default)
	raw, err := json.Marshal(struct {
		Facts  publicReleaseTechnical
		Tracks []PublicReleaseSubtitleTrack
	}{facts, tracks})
	require.NoError(t, err)
	for _, private := range []string{"source-a", "item-a", "private.invalid", "/private"} {
		require.NotContains(t, string(raw), private)
	}
}
func TestPublicReleaseTechnicalSourceEmptyUnknownAndAbsent(t *testing.T) {
	for _, mode := range []string{"empty", "unknown", "absent", "missing variant"} {
		t.Run(mode, func(t *testing.T) {
			pool, counter := openPublicTechnicalSourceFixture(t)
			version := int64(10)
			switch mode {
			case "absent":
				setPublicSourceBinding(t, pool, nil)
			case "missing variant":
				version = 999
			case "empty":
				setPublicSourceBinding(t, pool, &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "source-a", StreamsComplete: true, AudioTracks: []models.JellyfinAudioTrack{}, SubtitleTracks: []models.JellyfinSubtitleTrack{}})
			case "unknown":
				index := int32(3)
				setPublicSourceBinding(t, pool, &models.JellyfinSourceSnapshot{Version: 1, MediaSourceID: "source-a", StreamsComplete: true, SelectedAudioIndex: &index, AudioTracks: []models.JellyfinAudioTrack{{Index: 3, Codec: "flac"}}, SubtitleTracks: []models.JellyfinSubtitleTrack{{Index: 7, Codec: "ass"}}})
			}
			counter.count, counter.rows = 0, 0
			facts, tracks, err := NewReleaseDetailPublicRepository(pool, "").loadReleaseTechnical(context.Background(), version)
			require.NoError(t, err)
			require.Equal(t, 1, counter.count)
			require.NotNil(t, tracks)
			switch mode {
			case "absent":
				require.Equal(t, "ja", *facts.AudioLanguage)
				require.Equal(t, "stale-aac", *facts.AudioCodec)
				require.Len(t, tracks, 1)
				require.Equal(t, "de", *tracks[0].Language)
				require.Equal(t, "Deutsch", tracks[0].Label)
				require.Nil(t, tracks[0].Format, "softsub is a classification, not a codec")
			case "unknown":
				require.Nil(t, facts.AudioLanguage)
				require.Equal(t, "flac", *facts.AudioCodec)
				require.Len(t, tracks, 1)
				require.Nil(t, tracks[0].Language)
			default:
				require.Nil(t, facts.AudioLanguage)
				require.Nil(t, facts.AudioCodec)
				require.Empty(t, tracks)
			}
		})
	}
}
func TestPublicReleaseTechnicalSourceStatementBudget(t *testing.T) {
	pool, counter := openPublicTechnicalSourceFixture(t)
	for _, count := range []int{0, 1, 201} {
		binding := sourceFixtureSnapshot("source-a", "/private/a.mkv", true)
		binding.SubtitleTracks = []models.JellyfinSubtitleTrack{}
		for i := 0; i < count; i++ {
			binding.SubtitleTracks = append(binding.SubtitleTracks, models.JellyfinSubtitleTrack{Index: int32(i), Codec: "ass", DisplayTitle: fmt.Sprint("Track ", i)})
		}
		setPublicSourceBinding(t, pool, &binding)
		counter.count, counter.rows = 0, 0
		_, tracks, err := NewReleaseDetailPublicRepository(pool, "").loadReleaseTechnical(context.Background(), 10)
		require.NoError(t, err)
		require.Len(t, tracks, count)
		require.Equal(t, 1, counter.count)
		require.EqualValues(t, 1, counter.rows)
		t.Logf("%d subtitle tracks: %d SQL statement, %d returned row", count, counter.count, counter.rows)
	}
}

// Test-only bridge lets the external repository integration package reuse the
// exact public fixture and projection without importing services into repository
// (services already imports repository). It creates no production API.
func OpenPublicTechnicalSourceFixtureForTest(t *testing.T) *pgxpool.Pool {
	pool, _ := openPublicTechnicalSourceFixture(t)
	return pool
}
func PublicTechnicalSourceForTest(ctx context.Context, pool *pgxpool.Pool, versionID int64) (*PublicReleaseDetail, error) {
	facts, tracks, err := NewReleaseDetailPublicRepository(pool, "").loadReleaseTechnical(ctx, versionID)
	if err != nil {
		return nil, err
	}
	return &PublicReleaseDetail{ReleaseVersionID: versionID, DurationSeconds: facts.DurationSeconds, Resolution: facts.Resolution,
		Container: facts.Container, VideoCodec: facts.VideoCodec, AudioCodec: facts.AudioCodec, AudioLanguage: facts.AudioLanguage,
		SubtitleType: facts.SubtitleType, SubtitleTracks: tracks}, nil
}

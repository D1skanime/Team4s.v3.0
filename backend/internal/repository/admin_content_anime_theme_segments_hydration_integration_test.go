package repository_test

import (
	"context"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestGetAnimeSegmentByID_HydratesPlaybackForRequestedReleaseVersion beweist gegen eine echte,
// isolierte Postgres-Instanz das Plan-117-04-Task-1-Akzeptanzkriterium: fuer ein Segment mit zwei
// Zuweisungen (A, B) liefert GetAnimeSegmentByID(ctx, animeID, segID, currentReleaseVersionID=B)
// playback_release_variant_id, das zur Variante von B gehoert, nicht zu A -- und umgekehrt.
// currentReleaseVersionID=0 (kein Editor-Kontext) behaelt das bisherige Fallback-Verhalten bei
// (liefert deterministisch irgendeine der beiden Zeilen, ohne Fehler).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.
func TestGetAnimeSegmentByID_HydratesPlaybackForRequestedReleaseVersion(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := repository.NewAdminContentRepository(pool)

	const (
		animeID         = int64(1)
		episodeOneID    = int64(1)
		episodeTwoID    = int64(2)
		fansubGroupID   = int64(1)
		fansubReleaseA  = int64(1)
		fansubReleaseB  = int64(2)
		releaseVersionA = int64(10)
		releaseVersionB = int64(20)
		variantAID      = int64(100)
		variantBID      = int64(200)
		streamSourceA   = int64(1000)
		streamSourceB   = int64(2000)
		releaseStreamA  = int64(1)
		releaseStreamB  = int64(2)
		themeTypeID     = int64(1)
		themeID         = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $3, 1, '1'), ($2, $3, 2, '2')
	`, episodeOneID, episodeTwoID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $3), ($2, $4)
	`, fansubReleaseA, fansubReleaseB, episodeOneID, episodeTwoID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $3, 'v1'), ($2, $4, 'v1')
	`, releaseVersionA, releaseVersionB, fansubReleaseA, fansubReleaseB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $3), ($2, $3)
	`, releaseVersionA, releaseVersionB, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_variants (id, release_version_id, duration_seconds) VALUES ($1, $3, 1500), ($2, $4, 1600)
	`, variantAID, variantBID, releaseVersionA, releaseVersionB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO stream_sources (id, provider_type, external_id, url)
		VALUES ($1, 'jellyfin', 'ext-A', 'https://jellyfin.example/a'), ($2, 'jellyfin', 'ext-B', 'https://jellyfin.example/b')
	`, streamSourceA, streamSourceB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_streams (id, variant_id, stream_source_id) VALUES ($1, $3, $5), ($2, $4, $6)
	`, releaseStreamA, releaseStreamB, variantAID, variantBID, streamSourceA, streamSourceB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	startEpisode := 1
	endEpisode := 2
	startTime := "00:01:00"
	endTime := "00:01:30"
	version := "v1"

	segment, err := repo.CreateAnimeSegment(ctx, animeID, models.AdminThemeSegmentCreateInput{
		ThemeID:       themeID,
		FansubGroupID: ptrInt64(fansubGroupID),
		Version:       version,
		StartEpisode:  &startEpisode,
		EndEpisode:    &endEpisode,
		StartTime:     &startTime,
		EndTime:       &endTime,
	}, releaseVersionA)
	require.NoError(t, err)
	segmentID := segment.ID

	_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionB)
	require.NoError(t, err)
	// Ein echter Patch loest syncThemeSegmentPlaybackSourceTx fuer BEIDE Zuweisungen aus, sodass
	// zwei theme_segment_playback_sources-Zeilen mit unterschiedlichen release_variant_id existieren.
	require.NoError(t, repo.UpdateAnimeSegment(ctx, segmentID, models.AdminThemeSegmentPatchInput{Version: &version}))

	t.Run("currentReleaseVersionID=B liefert die Playback-Variante von B, nicht von A", func(t *testing.T) {
		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, releaseVersionB)
		require.NoError(t, err)
		require.NotNil(t, got.PlaybackVariantID)
		require.Equal(t, variantBID, *got.PlaybackVariantID,
			"GetAnimeSegmentByID(..., currentReleaseVersionID=B) darf NICHT die Variante von A liefern")
	})

	t.Run("currentReleaseVersionID=A liefert die Playback-Variante von A, nicht von B", func(t *testing.T) {
		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, releaseVersionA)
		require.NoError(t, err)
		require.NotNil(t, got.PlaybackVariantID)
		require.Equal(t, variantAID, *got.PlaybackVariantID,
			"GetAnimeSegmentByID(..., currentReleaseVersionID=A) darf NICHT die Variante von B liefern")
	})

	t.Run("currentReleaseVersionID=0 (kein Editor-Kontext) faellt auf eine deterministische Zeile zurueck", func(t *testing.T) {
		got, err := repo.GetAnimeSegmentByID(ctx, animeID, segmentID, 0)
		require.NoError(t, err)
		require.NotNil(t, got.PlaybackVariantID, "Fallback muss weiterhin irgendeine hydrierte Zeile liefern")
	})
}

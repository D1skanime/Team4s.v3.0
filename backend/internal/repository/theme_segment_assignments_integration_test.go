package repository

import (
	"context"
	"errors"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/stretchr/testify/require"
)

// TestThemeSegmentAssignmentsAndOverrides runs the Assignment/Override CRUD
// against a real, isolated Postgres schema (Phase 117 Wave 0 -- VALIDATION.md
// explicitly requires this instead of the pre-existing string-pattern tests
// in segment_playback_resolution_test.go). Skips cleanly when
// TEAM4S_PHASE117_TEST_DSN is unset.
func TestThemeSegmentAssignmentsAndOverrides(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)

	const (
		animeID             = int64(1)
		episodeID           = int64(1)
		fansubGroupID       = int64(1)
		fansubReleaseID     = int64(1)
		releaseVersionA     = int64(10)
		releaseVersionB     = int64(20)
		releaseVersionThird = int64(30) // niemals zugewiesen -- fuer den Konflikt-Testfall
		themeTypeID         = int64(1)
		themeID             = int64(1)
	)

	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, 1, '1')`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, fansubReleaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $4, 'v1'), ($2, $4, 'v1'), ($3, $4, 'v1')
	`, releaseVersionA, releaseVersionB, releaseVersionThird, fansubReleaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $4), ($2, $4), ($3, $4)
	`, releaseVersionA, releaseVersionB, releaseVersionThird, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	var segmentID int64
	err = pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 1, 1)
		RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentID)
	require.NoError(t, err)

	t.Run("assign shared segment to two release versions", func(t *testing.T) {
		_, err := repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionB)
		require.NoError(t, err)

		// idempotent: repeated assignment of the same pair is not an error and
		// does not create a duplicate row.
		_, err = repo.AssignThemeSegmentToReleaseVersion(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)

		ids, err := repo.ListThemeSegmentAssignments(ctx, segmentID)
		require.NoError(t, err)
		require.ElementsMatch(t, []int64{releaseVersionA, releaseVersionB}, ids)
	})

	t.Run("override applies only to its own release version, no cross-talk", func(t *testing.T) {
		override, err := repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
			ThemeSegmentID:   segmentID,
			ReleaseVersionID: releaseVersionA,
			StartTime:        "00:01:30",
			EndTime:          "00:03:00",
		})
		require.NoError(t, err)
		require.Equal(t, "00:01:30", override.StartTime)
		require.Equal(t, "00:03:00", override.EndTime)

		got, err := repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)
		require.Equal(t, "00:01:30", got.StartTime)
		require.Equal(t, "00:03:00", got.EndTime)

		_, err = repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionB)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrNotFound))
	})

	t.Run("override for an unassigned release version is rejected, not silently created", func(t *testing.T) {
		_, err := repo.UpsertThemeSegmentEpisodeOverride(ctx, models.AdminThemeSegmentEpisodeOverrideUpsertInput{
			ThemeSegmentID:   segmentID,
			ReleaseVersionID: releaseVersionThird,
			StartTime:        "00:00:10",
			EndTime:          "00:00:20",
		})
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrConflict))
	})

	t.Run("unassign cascades and deletes the override (DB-level proof)", func(t *testing.T) {
		err := repo.UnassignThemeSegmentFromReleaseVersion(ctx, segmentID, releaseVersionA)
		require.NoError(t, err)

		_, err = repo.GetThemeSegmentEpisodeOverride(ctx, segmentID, releaseVersionA)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrNotFound))
	})
}

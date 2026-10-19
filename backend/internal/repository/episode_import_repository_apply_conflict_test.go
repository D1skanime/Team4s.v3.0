package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
)

// TestApplyEpisodeImportConflict proves D-12's apply-loop per-row continuation
// (187-05 Task 1): a batch apply with one guard-rejected mapping (a
// dependents-having group replace, or an empty-group reduction) is counted as
// a Conflicts++ row with a ConflictDetails entry, and does NOT abort the
// other mappings in the same apply call -- the previous hard
// `return nil, err` behavior would have aborted the whole batch.
func TestApplyEpisodeImportConflict(t *testing.T) {
	t.Run("dependents-having group replace is a per-row conflict, other mappings still apply", func(t *testing.T) {
		pool := openEpisodeImportReleaseGroupsGuardFixture(t)
		ctx := context.Background()
		repo := NewEpisodeImportRepository(pool, sourceFixtureCrewSeeder{})

		groupC := int64(90)
		_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id, name, slug) VALUES ($1, 'GroupC', 'conflict-group-c')`, groupC)
		require.NoError(t, err)
		memberID := int64(900)
		_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
		require.NoError(t, err)

		// Step 1: establish the two pre-existing releases that mapping B and
		// mapping C will target in the batch under test, both initially on the
		// fixture's group id=1 ("Group").
		setupInput := models.EpisodeImportApplyInput{
			AnimeID: 1,
			CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
				{EpisodeNumber: 2}, {EpisodeNumber: 3},
			},
			MediaCandidates: []models.EpisodeImportMediaCandidate{
				gap24MediaCandidate("conflict-item-b", "conflict-source-b", "conflict-b.mkv"),
				gap24MediaCandidate("conflict-item-c", "conflict-source-c", "conflict-c.mkv"),
			},
			Mappings: []models.EpisodeImportMappingRow{
				{MediaItemID: "conflict-item-b", MediaSourceID: "conflict-source-b", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{2}, FansubGroups: gap24FansubGroup()},
				{MediaItemID: "conflict-item-c", MediaSourceID: "conflict-source-c", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{3}, FansubGroups: gap24FansubGroup()},
			},
		}
		setupResult, err := repo.Apply(ctx, setupInput)
		require.NoError(t, err)
		require.EqualValues(t, 2, setupResult.VersionsCreated)

		// Give mapping B's release_version a real dependent on group id=1 so a
		// replace is blocked (D-07/D-08) -- mapping C stays dependent-free.
		var releaseVersionBID int64
		require.NoError(t, pool.QueryRow(ctx, `
			SELECT rv.id
			FROM release_versions rv
			JOIN fansub_releases fr ON fr.id = rv.release_id
			JOIN episodes e ON e.id = fr.episode_id
			WHERE e.anime_id = 1 AND e.number = 2
		`).Scan(&releaseVersionBID))
		_, err = pool.Exec(ctx, `
			INSERT INTO release_role_credit_lifecycles (release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status)
			VALUES ($1, $2, $3, 'timing', 1, 'pending')
		`, releaseVersionBID, int64(1), memberID)
		require.NoError(t, err)

		// Step 2: one apply call with 3 mappings -- a brand-new/unaffected row,
		// a replace-blocked row, and a same-group/unaffected row.
		batchInput := models.EpisodeImportApplyInput{
			AnimeID: 1,
			CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{
				{EpisodeNumber: 1}, {EpisodeNumber: 2}, {EpisodeNumber: 3},
			},
			MediaCandidates: []models.EpisodeImportMediaCandidate{
				gap24MediaCandidate("conflict-item-a", "conflict-source-a", "conflict-a.mkv"),
				gap24MediaCandidate("conflict-item-b", "conflict-source-b", "conflict-b.mkv"),
				gap24MediaCandidate("conflict-item-c", "conflict-source-c", "conflict-c.mkv"),
			},
			Mappings: []models.EpisodeImportMappingRow{
				{MediaItemID: "conflict-item-a", MediaSourceID: "conflict-source-a", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{1}, FansubGroups: gap24FansubGroup()},
				{MediaItemID: "conflict-item-b", MediaSourceID: "conflict-source-b", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{2}, FansubGroups: []models.SelectedFansubGroupInput{{ID: &groupC}}},
				{MediaItemID: "conflict-item-c", MediaSourceID: "conflict-source-c", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{3}, FansubGroups: gap24FansubGroup()},
			},
		}
		result, err := repo.Apply(ctx, batchInput)
		require.NoError(t, err, "a guard-rejected row in the batch must not abort the whole apply call")
		require.EqualValues(t, 1, result.VersionsCreated, "mapping A creates a brand-new release")
		require.EqualValues(t, 1, result.VersionsUpdated, "mapping C updates unaffected, same-group")
		require.EqualValues(t, 1, result.Conflicts, "mapping B's replace is blocked and counted as a conflict")
		require.EqualValues(t, 0, result.Skipped)
		require.EqualValues(t, 3, result.VersionsCreated+result.VersionsUpdated+result.Skipped+result.Conflicts, "every mapping must be accounted for")
		require.Len(t, result.ConflictDetails, 1)
		require.Equal(t, "conflict-item-b", result.ConflictDetails[0].MediaItemID)
		require.Equal(t, "conflict-source-b", result.ConflictDetails[0].MediaSourceID)
		require.NotEmpty(t, result.ConflictDetails[0].Reason)

		// mapping B's release must still carry its original group unchanged --
		// the rejected replace must not have partially written anything.
		var stillGroup1 bool
		require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM release_version_groups WHERE release_version_id = $1 AND fansub_group_id = $2)`, releaseVersionBID, int64(1)).Scan(&stillGroup1))
		require.True(t, stillGroup1, "the dependents-having group must survive the rejected replace")
		var hasGroupC bool
		require.NoError(t, pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM release_version_groups WHERE release_version_id = $1 AND fansub_group_id = $2)`, releaseVersionBID, groupC).Scan(&hasGroupC))
		require.False(t, hasGroupC, "the rejected replacement group must not have been written")
	})

	t.Run("zero-groups reduction is a per-row conflict, not a hard abort", func(t *testing.T) {
		pool := openEpisodeImportReleaseGroupsGuardFixture(t)
		ctx := context.Background()
		repo := NewEpisodeImportRepository(pool, sourceFixtureCrewSeeder{})

		setupInput := models.EpisodeImportApplyInput{
			AnimeID:           1,
			CanonicalEpisodes: []models.EpisodeImportCanonicalEpisode{{EpisodeNumber: 1}},
			MediaCandidates:   []models.EpisodeImportMediaCandidate{gap24MediaCandidate("conflict-zero-item", "conflict-zero-source", "conflict-zero.mkv")},
			Mappings: []models.EpisodeImportMappingRow{
				{MediaItemID: "conflict-zero-item", MediaSourceID: "conflict-zero-source", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{1}, FansubGroups: gap24FansubGroup()},
			},
		}
		_, err := repo.Apply(ctx, setupInput)
		require.NoError(t, err)

		batchInput := setupInput
		batchInput.Mappings = []models.EpisodeImportMappingRow{
			{MediaItemID: "conflict-zero-item", MediaSourceID: "conflict-zero-source", Status: models.EpisodeImportMappingStatusConfirmed, TargetEpisodeNumbers: []int32{1}, FansubGroups: []models.SelectedFansubGroupInput{}},
		}
		result, err := repo.Apply(ctx, batchInput)
		require.NoError(t, err, "an empty-group reduction must not abort the apply call")
		require.EqualValues(t, 1, result.Conflicts)
		require.EqualValues(t, 0, result.VersionsCreated+result.VersionsUpdated+result.Skipped)
		require.Len(t, result.ConflictDetails, 1)
		require.Equal(t, "conflict-zero-item", result.ConflictDetails[0].MediaItemID)
		require.NotEmpty(t, result.ConflictDetails[0].Reason)
	})
}

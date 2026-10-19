package repository

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRowsIdempotently supersedes
// the deleted source-grep test TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows
// (formerly in episode_version_repository_write_helpers_test.go): moving
// upsertReleaseVersionGroupsForSync out of that file into this one made the old
// test's file-path-coupled strings.Index assertions permanently false regardless
// of any logic change, and CLAUDE.md's Teststil rule forbids extending that
// source-grep pattern. This test proves the SAME write guarantee the old test
// only asserted by string match -- N real junction rows written, and an
// identical second call is idempotent (ON CONFLICT ... DO NOTHING) -- against a
// real Postgres fixture instead of reading this file's own source.
func TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRowsIdempotently(t *testing.T) {
	pool := testsupport.OpenPhase187Postgres(t)
	ctx := context.Background()

	const (
		releaseVersionID = int64(31)
		groupA           = int64(41)
		groupB           = int64(42)
		animeID          = int64(61)
	)
	_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1), ($2)`, groupA, groupB)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx)

	selection := []resolvedImportFansubGroup{{ID: groupA}, {ID: groupB}}

	require.NoError(t, upsertReleaseVersionGroupsForSync(ctx, tx, releaseVersionID, selection))

	var count int
	require.NoError(t, tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID).Scan(&count))
	require.Equal(t, 2, count, "N member groups must write N junction rows")

	// Re-running the identical selection must be a pure no-op (ON CONFLICT DO
	// NOTHING idempotency) -- not a duplicate-key error, not a changed count.
	require.NoError(t, upsertReleaseVersionGroupsForSync(ctx, tx, releaseVersionID, selection))

	require.NoError(t, tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID).Scan(&count))
	require.Equal(t, 2, count, "re-running the identical selection must not change the row count")
}

func selectedFansubGroupInputFor(groupID int64) models.SelectedFansubGroupInput {
	return models.SelectedFansubGroupInput{ID: &groupID}
}

func releaseVersionGroupCount(t *testing.T, ctx context.Context, tx pgx.Tx, releaseVersionID int64) int {
	t.Helper()
	var count int
	require.NoError(t, tx.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_groups WHERE release_version_id = $1`, releaseVersionID).Scan(&count))
	return count
}

func releaseVersionGroupExists(t *testing.T, ctx context.Context, tx pgx.Tx, releaseVersionID, fansubGroupID int64) bool {
	t.Helper()
	var exists bool
	require.NoError(t, tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM release_version_groups WHERE release_version_id = $1 AND fansub_group_id = $2)`, releaseVersionID, fansubGroupID).Scan(&exists))
	return exists
}

// TestSyncEpisodeVersionSelectedGroups_GuardBehavior proves the Plan-02
// behavior table (D-01/D-02/D-06/D-07/D-08/D-09/D-10/D-11/D-14): the editor
// group-sync write path must reject an empty-groups reduction and a
// dependents-having removal BEFORE issuing any DELETE/INSERT, while a
// dependents-free removal and the already-empty no-op both still succeed
// exactly as before.
func TestSyncEpisodeVersionSelectedGroups_GuardBehavior(t *testing.T) {
	pool := testsupport.OpenPhase187Postgres(t)
	ctx := context.Background()

	// The Phase-187 fixture's fansub_groups stand-in (shared with Plan 01) is
	// deliberately minimal (id-only, see createPhase107Prerequisites): no test
	// up to now needed to resolve a fansub group BY ID through
	// resolveMemberGroupsForSync/lookupImportFansubGroupByID, which selects
	// slug and name. Extend it here with exactly those two columns, mirroring
	// openEVECFixture's established "extend the shared base fixture with the
	// columns this code path reads" precedent.
	_, err := pool.Exec(ctx, `
		ALTER TABLE fansub_groups ADD COLUMN IF NOT EXISTS slug TEXT, ADD COLUMN IF NOT EXISTS name TEXT;
		ALTER TABLE anime_fansub_groups ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS notes TEXT;
	`)
	require.NoError(t, err)

	t.Run("reducing a non-empty release to zero groups is rejected and issues no DELETE", func(t *testing.T) {
		const (
			releaseVersionID = int64(101)
			groupID          = int64(141)
			animeID          = int64(161)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, groupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, groupID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		err = syncEpisodeVersionSelectedGroups(ctx, tx, releaseVersionID, animeID, nil, nil, true)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrReleaseVersionGroupsEmpty))
		require.Equal(t, 1, releaseVersionGroupCount(t, ctx, tx, releaseVersionID), "no DELETE must run once the empty-reduction guard rejects the patch")
	})

	t.Run("a release that already has zero groups stays a no-op", func(t *testing.T) {
		const (
			releaseVersionID = int64(102)
			animeID          = int64(162)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		err = syncEpisodeVersionSelectedGroups(ctx, tx, releaseVersionID, animeID, nil, nil, true)
		require.NoError(t, err)
		require.Equal(t, 0, releaseVersionGroupCount(t, ctx, tx, releaseVersionID))
	})

	t.Run("removing a partner group with real dependents is rejected and the row survives", func(t *testing.T) {
		const (
			releaseVersionID = int64(103)
			keptGroupID      = int64(143)
			removedGroupID   = int64(144)
			animeID          = int64(163)
			memberID         = int64(153)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug, name) VALUES ($1, 'kept-143', 'Kept'), ($2, 'removed-144', 'Removed')`, keptGroupID, removedGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
				($1, $2), ($1, $3)
		`, releaseVersionID, keptGroupID, removedGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_role_credit_lifecycles (
				release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status
			) VALUES ($1, $2, $3, 'timing', 1, 'pending')
		`, releaseVersionID, removedGroupID, memberID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		fansubGroups := []models.SelectedFansubGroupInput{selectedFansubGroupInputFor(keptGroupID)}
		err = syncEpisodeVersionSelectedGroups(ctx, tx, releaseVersionID, animeID, fansubGroups, nil, true)
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrGroupHasDependents))

		var depErr *GroupHasDependentsError
		require.True(t, errors.As(err, &depErr))
		require.Equal(t, removedGroupID, depErr.FansubGroupID)
		require.True(t, depErr.Summary.HasAny())

		require.True(t, releaseVersionGroupExists(t, ctx, tx, releaseVersionID, removedGroupID), "the dependents-having group's row must survive the rejected patch")
	})

	t.Run("removing a partner group with zero dependents still succeeds (D-01 regression)", func(t *testing.T) {
		const (
			releaseVersionID = int64(104)
			keptGroupID      = int64(145)
			removedGroupID   = int64(146)
			animeID          = int64(164)
		)
		_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug, name) VALUES ($1, 'kept-145', 'Kept'), ($2, 'removed-146', 'Removed')`, keptGroupID, removedGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
				($1, $2), ($1, $3)
		`, releaseVersionID, keptGroupID, removedGroupID)
		require.NoError(t, err)

		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		fansubGroups := []models.SelectedFansubGroupInput{selectedFansubGroupInputFor(keptGroupID)}
		err = syncEpisodeVersionSelectedGroups(ctx, tx, releaseVersionID, animeID, fansubGroups, nil, true)
		require.NoError(t, err)

		require.True(t, releaseVersionGroupExists(t, ctx, tx, releaseVersionID, keptGroupID))
		require.False(t, releaseVersionGroupExists(t, ctx, tx, releaseVersionID, removedGroupID), "the dependents-free removed group's row must be gone")
	})
}

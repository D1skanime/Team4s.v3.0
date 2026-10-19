package repository

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

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

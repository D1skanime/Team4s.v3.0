package repository

// Phase 187, Plan 01 (D-01, D-06, D-07, D-08, D-09, D-13, D-14): proves the
// group-change dependents guard against a real Postgres fixture
// (testsupport.OpenPhase187Postgres), not a hand-rolled Go fake -- real FK/
// CASCADE/RESTRICT behavior from migration 0137 is exactly what later plans
// (02/03/04/05) depend on being correct here.

import (
	"context"
	"errors"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// openPhase187TracedPoolOnSameSchema opens a SECOND *pgxpool.Pool against the
// same DSN/schema fixturePool (testsupport.OpenPhase187Postgres) is scoped to,
// with a queryCounter wired in as its pgx.QueryTracer -- mirrors
// segment_origin_query_budget_test.go's openTracedPoolOnSameSchema precedent.
// Only queries issued through the RETURNED pool are counted; fixturePool's own
// seeding traffic is not.
func openPhase187TracedPoolOnSameSchema(t *testing.T, fixturePool *pgxpool.Pool, dsn string) (*queryCounter, *pgxpool.Pool) {
	t.Helper()

	var schema string
	require.NoError(t, fixturePool.QueryRow(context.Background(), `SELECT current_schema()`).Scan(&schema))

	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse TEAM4S_PHASE187_TEST_DSN")
	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO "+pgx.Identifier{schema}.Sanitize())
		return err
	}

	tracedPool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open traced pool on schema %q", schema)

	var effectiveSchemas []string
	require.NoError(t, tracedPool.QueryRow(context.Background(), `SELECT current_schemas(false)`).Scan(&effectiveSchemas))
	require.Equalf(t, []string{schema}, effectiveSchemas,
		"traced pool must be scoped to the exact same isolated schema as the fixture pool")

	return counter, tracedPool
}

func TestReleaseVersionGroupGuardCountDependents(t *testing.T) {
	pool := testsupport.OpenPhase187Postgres(t)
	ctx := context.Background()

	const (
		releaseVersionNoDependents  = int64(1)
		releaseVersionWithCredit    = int64(2)
		releaseVersionWithMediaNote = int64(3)
		fansubGroupID               = int64(41)
		memberID                    = int64(51)
	)

	_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1), ($2), ($3)`,
		releaseVersionNoDependents, releaseVersionWithCredit, releaseVersionWithMediaNote)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
			($1, $4), ($2, $4), ($3, $4)
	`, releaseVersionNoDependents, releaseVersionWithCredit, releaseVersionWithMediaNote, fansubGroupID)
	require.NoError(t, err)

	t.Run("zero dependents plus an inherited empty snapshot does not count (D-01/D-09)", func(t *testing.T) {
		_, err := pool.Exec(ctx, `
			INSERT INTO release_crew_snapshots (release_version_id, fansub_group_id, snapshot_mode)
			VALUES ($1, $2, 'inherited')
		`, releaseVersionNoDependents, fansubGroupID)
		require.NoError(t, err)

		summary, err := countReleaseVersionGroupDependents(ctx, pool, releaseVersionNoDependents, fansubGroupID)
		require.NoError(t, err)
		require.False(t, summary.HasAny(), "an inherited-mode snapshot row with no linked credit must not count as a dependent")
		require.Equal(t, int32(0), summary.Credits)
		require.Equal(t, int32(0), summary.Media)
		require.Equal(t, int32(0), summary.Notes)
	})

	t.Run("one credit lifecycle row counts regardless of sole-vs-partner group (D-07)", func(t *testing.T) {
		_, err := pool.Exec(ctx, `
			INSERT INTO release_role_credit_lifecycles (
				release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status
			) VALUES ($1, $2, $3, 'timing', 1, 'pending')
		`, releaseVersionWithCredit, fansubGroupID, memberID)
		require.NoError(t, err)

		summary, err := countReleaseVersionGroupDependents(ctx, pool, releaseVersionWithCredit, fansubGroupID)
		require.NoError(t, err)
		require.True(t, summary.HasAny())
		require.GreaterOrEqual(t, summary.Credits, int32(1))
	})

	t.Run("non-deleted media and notes count, deleted ones do not (D-08)", func(t *testing.T) {
		_, err := pool.Exec(ctx, `INSERT INTO contributor_roles (id, name) VALUES (1, 'Encode')`)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_media (id, release_version_id, fansub_group_id, category, deleted_at)
			VALUES
				(1, $1, $2, 'screenshot', NULL),
				(2, $1, $2, 'screenshot', NOW())
		`, releaseVersionWithMediaNote, fansubGroupID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `
			INSERT INTO release_version_notes (id, release_version_id, fansub_group_id, member_id, role_id, status, deleted_at)
			VALUES
				(1, $1, $2, $3, 1, 'draft', NULL),
				(2, $1, $2, $3, 1, 'draft', NOW())
		`, releaseVersionWithMediaNote, fansubGroupID, memberID)
		require.NoError(t, err)

		summary, err := countReleaseVersionGroupDependents(ctx, pool, releaseVersionWithMediaNote, fansubGroupID)
		require.NoError(t, err)
		require.True(t, summary.HasAny())
		require.Equal(t, int32(1), summary.Media, "only the non-deleted media row must count")
		require.Equal(t, int32(1), summary.Notes, "only the non-deleted note row must count")
	})
}

func TestReleaseVersionGroupGuardGetReleaseVersionGroupDependentsWrapper(t *testing.T) {
	pool := testsupport.OpenPhase187Postgres(t)
	ctx := context.Background()

	const (
		releaseVersionID = int64(10)
		fansubGroupID    = int64(41)
		memberID         = int64(51)
	)
	_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_role_credit_lifecycles (
			release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status
		) VALUES ($1, $2, $3, 'timing', 1, 'pending')
	`, releaseVersionID, fansubGroupID, memberID)
	require.NoError(t, err)

	repo := NewEpisodeVersionRepository(pool)
	summary, err := repo.GetReleaseVersionGroupDependents(ctx, releaseVersionID, fansubGroupID)
	require.NoError(t, err)
	require.True(t, summary.HasAny())
	require.GreaterOrEqual(t, summary.Credits, int32(1))
}

func TestDiffRemovedReleaseVersionGroupIDs(t *testing.T) {
	tests := []struct {
		name    string
		current []int64
		new     []int64
		want    []int64
	}{
		{name: "pure add", current: []int64{1, 2}, new: []int64{1, 2, 3}, want: []int64{}},
		{name: "partner removed", current: []int64{1, 2}, new: []int64{1}, want: []int64{2}},
		{name: "replace", current: []int64{1}, new: []int64{2}, want: []int64{1}},
		{name: "both empty", current: []int64{}, new: []int64{}, want: []int64{}},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := diffRemovedReleaseVersionGroupIDs(tc.current, tc.new)
			require.ElementsMatch(t, tc.want, got)
		})
	}
}

func TestEnsureReleaseVersionGroupsNotReducedToEmpty(t *testing.T) {
	tests := []struct {
		name         string
		currentCount int
		newCount     int
		wantErr      error
	}{
		{name: "reduced to empty is rejected", currentCount: 2, newCount: 0, wantErr: ErrReleaseVersionGroupsEmpty},
		{name: "already empty stays allowed", currentCount: 0, newCount: 0, wantErr: nil},
		{name: "unchanged single group is allowed", currentCount: 1, newCount: 1, wantErr: nil},
		{name: "adding a first group is allowed", currentCount: 0, newCount: 1, wantErr: nil},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := ensureReleaseVersionGroupsNotReducedToEmpty(tc.currentCount, tc.newCount)
			if tc.wantErr == nil {
				require.NoError(t, err)
				return
			}
			require.ErrorIs(t, err, tc.wantErr)
		})
	}
}

func TestEnsureRemovedReleaseVersionGroupsHaveNoDependents(t *testing.T) {
	pool := testsupport.OpenPhase187Postgres(t)
	ctx := context.Background()

	const (
		releaseVersionID   = int64(20)
		groupWithoutDeps   = int64(41)
		groupWithDeps      = int64(42)
		nonExistentGroupID = int64(999)
		memberID           = int64(51)
	)
	_, err := pool.Exec(ctx, `INSERT INTO release_versions (id) VALUES ($1)`, releaseVersionID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1), ($2)`, groupWithoutDeps, groupWithDeps)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
			($1, $2), ($1, $3)
	`, releaseVersionID, groupWithoutDeps, groupWithDeps)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_role_credit_lifecycles (
			release_version_id, fansub_group_id, member_id, role_code, generation, lifecycle_status
		) VALUES ($1, $2, $3, 'timing', 1, 'pending')
	`, releaseVersionID, groupWithDeps, memberID)
	require.NoError(t, err)

	t.Run("empty removed set issues no query and returns nil", func(t *testing.T) {
		dsn := os.Getenv("TEAM4S_PHASE187_TEST_DSN")
		require.NotEmpty(t, dsn, "TEAM4S_PHASE187_TEST_DSN must be set once the fixture pool above did not skip")
		counter, tracedPool := openPhase187TracedPoolOnSameSchema(t, pool, dsn)
		defer tracedPool.Close()

		tx, err := tracedPool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		counter.reset()
		err = ensureRemovedReleaseVersionGroupsHaveNoDependents(ctx, tx, nonExistentGroupID, nil)
		require.NoError(t, err)
		require.Equal(t, 0, counter.count(), "an empty removed slice must not issue any query")
	})

	t.Run("removed group without dependents is allowed", func(t *testing.T) {
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		err = ensureRemovedReleaseVersionGroupsHaveNoDependents(ctx, tx, releaseVersionID, []int64{groupWithoutDeps})
		require.NoError(t, err)
	})

	t.Run("removed group with dependents is blocked", func(t *testing.T) {
		tx, err := pool.Begin(ctx)
		require.NoError(t, err)
		defer tx.Rollback(ctx)

		err = ensureRemovedReleaseVersionGroupsHaveNoDependents(ctx, tx, releaseVersionID, []int64{groupWithDeps})
		require.Error(t, err)
		require.True(t, errors.Is(err, ErrGroupHasDependents))

		var depErr *GroupHasDependentsError
		require.True(t, errors.As(err, &depErr))
		require.Equal(t, groupWithDeps, depErr.FansubGroupID)
		require.True(t, depErr.Summary.HasAny())
	})
}

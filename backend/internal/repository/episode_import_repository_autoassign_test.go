package repository

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// seedAutoAssignBaseFixture seeds anime, a theme, and episodes 1-5 (sort_index/episode_number ==
// episode number) -- the shared schema every test below builds its scenario-specific fansub
// groups, theme_segments, and release_versions on top of.
func seedAutoAssignBaseFixture(t *testing.T, pool *pgxpool.Pool, ctx context.Context, animeID int64, themeTypeID int64, themeID int64) {
	t.Helper()
	// The shared Phase-117 fixture (testsupport.OpenPhase117Postgres) does not create
	// anime_fansub_groups -- upsertReleaseVersionGroup's ensureAnimeFansubGroupLinksForMembers
	// tail call needs it (D-07 idempotent anime<->group links), mirroring migration
	// 0011_anime_fansub_groups.up.sql's shape.
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS anime_fansub_groups (
			anime_id BIGINT NOT NULL REFERENCES anime(id),
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			is_primary BOOLEAN NOT NULL DEFAULT FALSE,
			notes TEXT,
			PRIMARY KEY (anime_id, fansub_group_id)
		)
	`)
	require.NoError(t, err)
	// The shared Phase-117 fixture's fansub_groups stub only carries (id, name) --
	// lookupImportFansubGroupByID (episode_import_repository_fansub_helpers.go) also selects
	// slug, and upsertImportFansubGroup's ON CONFLICT path touches status.
	_, err = pool.Exec(ctx, `
		ALTER TABLE fansub_groups ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
		ALTER TABLE fansub_groups ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
	`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)
	for episodeNum := 1; episodeNum <= 5; episodeNum++ {
		episodeID := int64(100 + episodeNum)
		_, err = pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
			episodeID, animeID, episodeNum, fmt.Sprint(episodeNum))
		require.NoError(t, err)
	}
}

// seedAutoAssignFansubGroup inserts a minimal fansub_groups row for the given ID.
func seedAutoAssignFansubGroup(t *testing.T, pool *pgxpool.Pool, ctx context.Context, groupID int64) {
	t.Helper()
	slug := fmt.Sprintf("auto-assign-group-%d", groupID)
	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id, slug, name, status) VALUES ($1, $2, $2, 'active')`,
		groupID, slug)
	require.NoError(t, err)
}

// seedAutoAssignThemeSegment inserts a theme_segment covering [startEpisode, endEpisode] for the
// given group+version and returns its ID.
func seedAutoAssignThemeSegment(t *testing.T, pool *pgxpool.Pool, ctx context.Context, themeID int64, groupID int64, startEpisode int, endEpisode int) int64 {
	t.Helper()
	var segmentID int64
	err := pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', $3, $4)
		RETURNING id
	`, themeID, groupID, startEpisode, endEpisode).Scan(&segmentID)
	require.NoError(t, err)
	return segmentID
}

// createAutoAssignReleaseVersion creates a fansub_releases + release_versions row (version 'v1')
// for the given episode and returns the new release_version_id -- mirroring the production
// createFansubRelease/createReleaseVersion insert shape from
// episode_import_repository_release_helpers.go, without pulling in the full media/stream
// scaffolding upsertImportReleaseGraph needs. The Phase-117 fixture's fansub_releases/
// release_versions stub tables have no serial default on id, so both IDs are supplied explicitly
// (same convention as theme_segment_assignments_integration_test.go).
func createAutoAssignReleaseVersion(t *testing.T, pool *pgxpool.Pool, ctx context.Context, episodeID int64) int64 {
	t.Helper()
	releaseID := episodeID*10 + 1
	releaseVersionID := episodeID*10 + 2
	_, err := pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	return releaseVersionID
}

// callUpsertReleaseVersionGroup runs upsertReleaseVersionGroup (the Task 1 hook point) inside its
// own transaction against the given fansub group ID(s), mirroring how upsertImportReleaseGraph
// invokes it in production.
func callUpsertReleaseVersionGroup(t *testing.T, pool *pgxpool.Pool, ctx context.Context, releaseVersionID int64, groupIDs ...int64) {
	t.Helper()
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx.Rollback(ctx) }()

	groups := make([]models.SelectedFansubGroupInput, len(groupIDs))
	for i, id := range groupIDs {
		gid := id
		groups[i] = models.SelectedFansubGroupInput{ID: &gid}
	}
	mapping := models.EpisodeImportMappingRow{FansubGroups: groups}
	media := models.EpisodeImportMediaCandidate{}

	err = upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media)
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
}

func assignedReleaseVersionIDsForSegment(t *testing.T, pool *pgxpool.Pool, ctx context.Context, segmentID int64) []int64 {
	t.Helper()
	rows, err := pool.Query(ctx, `SELECT release_version_id FROM theme_segment_assignments WHERE theme_segment_id = $1`, segmentID)
	require.NoError(t, err)
	defer rows.Close()
	ids := make([]int64, 0)
	for rows.Next() {
		var id int64
		require.NoError(t, rows.Scan(&id))
		ids = append(ids, id)
	}
	require.NoError(t, rows.Err())
	return ids
}

// TestUpsertReleaseVersionGroupAutoAssign_SegmentFirst proves the "release-first ordering gap"
// from 156-03-PLAN.md is closed: a segment created BEFORE a matching release version is imported
// still ends up with that release version auto-assigned, without any call to
// AssignThemeSegmentToEpisodeRange.
func TestUpsertReleaseVersionGroupAutoAssign_SegmentFirst(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID     = int64(1)
		themeTypeID = int64(1)
		themeID     = int64(1)
		groupID     = int64(1)
	)
	seedAutoAssignBaseFixture(t, pool, ctx, animeID, themeTypeID, themeID)
	seedAutoAssignFansubGroup(t, pool, ctx, groupID)

	// Segment covering episodes 1-3 exists FIRST, before any release version for episode 2.
	segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, groupID, 1, 3)

	// A NEW release version for episode 2 is imported afterward -- this is the hook under test,
	// exercised via upsertReleaseVersionGroup directly (no AssignThemeSegmentToEpisodeRange call
	// anywhere in this test).
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, 102)
	callUpsertReleaseVersionGroup(t, pool, ctx, releaseVersionID, groupID)

	assigned := assignedReleaseVersionIDsForSegment(t, pool, ctx, segmentID)
	require.Contains(t, assigned, releaseVersionID, "release version created after a matching segment must be auto-assigned")
}

// TestUpsertReleaseVersionGroupAutoAssign_ReleaseFirstThenSegment proves the opposite ordering
// (already covered by AssignThemeSegmentToEpisodeRange, Plan 156-02) is not disturbed by this
// plan's new hook: re-running the hook for a release version that already has its assignment
// (created by the segment-creation path) must not create a duplicate row --
// ON CONFLICT DO NOTHING proven.
func TestUpsertReleaseVersionGroupAutoAssign_ReleaseFirstThenSegment(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID     = int64(1)
		themeTypeID = int64(1)
		themeID     = int64(1)
		groupID     = int64(1)
	)
	seedAutoAssignBaseFixture(t, pool, ctx, animeID, themeTypeID, themeID)
	seedAutoAssignFansubGroup(t, pool, ctx, groupID)

	// Release version for episode 2 is imported FIRST -- no segment exists yet, so the hook is a
	// no-op (nothing to match).
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, 102)
	callUpsertReleaseVersionGroup(t, pool, ctx, releaseVersionID, groupID)

	// A segment covering episodes 1-3 is created afterward. This direction is
	// AssignThemeSegmentToEpisodeRange's job (Plan 156-02), not this plan's hook.
	repo := NewAdminContentRepository(pool)
	segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, groupID, 1, 3)
	rangeResult, err := repo.AssignThemeSegmentToEpisodeRange(ctx, segmentID, animeID, groupID, "v1", 1, 3)
	require.NoError(t, err)
	require.Contains(t, rangeResult.Added, releaseVersionID)

	assigned := assignedReleaseVersionIDsForSegment(t, pool, ctx, segmentID)
	require.ElementsMatch(t, []int64{releaseVersionID}, assigned)

	// Re-running this plan's hook for the SAME release version (e.g. a duplicate/repeat import
	// event) must not create a second assignment row.
	callUpsertReleaseVersionGroup(t, pool, ctx, releaseVersionID, groupID)

	assignedAfterReplay := assignedReleaseVersionIDsForSegment(t, pool, ctx, segmentID)
	require.ElementsMatch(t, []int64{releaseVersionID}, assignedAfterReplay, "re-running the auto-assign hook must not duplicate an existing assignment")
}

// TestUpsertReleaseVersionGroupAutoAssign_MultiGroup proves a release version resolving to TWO
// fansub groups gets auto-assigned once per group -- via one bundled query call per group.ID, not
// a shared/merged query, and not a per-segment loop.
func TestUpsertReleaseVersionGroupAutoAssign_MultiGroup(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID     = int64(1)
		themeTypeID = int64(1)
		themeID     = int64(1)
		groupA      = int64(1)
		groupB      = int64(2)
	)
	seedAutoAssignBaseFixture(t, pool, ctx, animeID, themeTypeID, themeID)
	seedAutoAssignFansubGroup(t, pool, ctx, groupA)
	seedAutoAssignFansubGroup(t, pool, ctx, groupB)

	// Independent OP and ED slots may come from different selected groups.
	_, err := pool.Exec(ctx, `INSERT INTO theme_types(id,name) VALUES(2,'ED Kara'); INSERT INTO themes(id,anime_id,theme_type_id) VALUES(2,1,2)`)
	require.NoError(t, err)
	segmentA := seedAutoAssignThemeSegment(t, pool, ctx, themeID, groupA, 1, 3)
	segmentB := seedAutoAssignThemeSegment(t, pool, ctx, 2, groupB, 1, 3)

	// One release version for episode 2, resolving to BOTH groups (multi-group import).
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, 102)
	callUpsertReleaseVersionGroup(t, pool, ctx, releaseVersionID, groupA, groupB)

	assignedA := assignedReleaseVersionIDsForSegment(t, pool, ctx, segmentA)
	assignedB := assignedReleaseVersionIDsForSegment(t, pool, ctx, segmentB)
	require.Contains(t, assignedA, releaseVersionID, "group A's segment must be auto-assigned")
	require.Contains(t, assignedB, releaseVersionID, "group B's segment must be auto-assigned independently of group A")
}

// TestUpsertReleaseVersionGroupAutoAssign_OutOfRangeGetsNoAssignment is the negative case: a
// release version whose episode falls OUTSIDE every existing segment's range for its group+version
// must receive zero new assignment rows -- proving the WHERE clause is not overly broad.
func TestUpsertReleaseVersionGroupAutoAssign_OutOfRangeGetsNoAssignment(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	const (
		animeID     = int64(1)
		themeTypeID = int64(1)
		themeID     = int64(1)
		groupID     = int64(1)
	)
	seedAutoAssignBaseFixture(t, pool, ctx, animeID, themeTypeID, themeID)
	seedAutoAssignFansubGroup(t, pool, ctx, groupID)

	// Segment only covers episodes 1-3.
	segmentID := seedAutoAssignThemeSegment(t, pool, ctx, themeID, groupID, 1, 3)

	// Release version for episode 5 -- outside the segment's range.
	releaseVersionID := createAutoAssignReleaseVersion(t, pool, ctx, 105)
	callUpsertReleaseVersionGroup(t, pool, ctx, releaseVersionID, groupID)

	assigned := assignedReleaseVersionIDsForSegment(t, pool, ctx, segmentID)
	require.NotContains(t, assigned, releaseVersionID, "a release version outside the segment's range must not be auto-assigned")
	require.Empty(t, assigned, "no assignment should exist at all for a segment whose range never matched any created release version")
}

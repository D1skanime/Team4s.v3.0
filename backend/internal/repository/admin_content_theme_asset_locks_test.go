package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// openThemeAssetLockFixture provisions the real Phase-117 Postgres fixture (anime, a theme,
// episodes 1-5, and theme_segments with the real start_episode/end_episode/source_type/
// fansub_group_id columns from migrations 0049/0051) needed to exercise
// HasReleaseAssetSegmentUploadBlockedForRelease and HasGlobalThemeSegmentCoverageForRelease
// against real persisted data instead of reading their SQL source text.
func openThemeAssetLockFixture(t *testing.T) (*pgxpool.Pool, *AdminContentRepository) {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	seedAutoAssignBaseFixture(t, pool, ctx, 1, 1, 1)
	seedAutoAssignFansubGroup(t, pool, ctx, 1)
	return pool, NewAdminContentRepository(pool)
}

// themeAssetLockRelease creates a fansub_releases row (releaseID) for episode episodeNumber
// (1-5, from seedAutoAssignBaseFixture's episodes 101-105) -- the ID
// HasReleaseAssetSegmentUploadBlockedForRelease/HasGlobalThemeSegmentCoverageForRelease key on
// is fansub_releases.id, NOT a release_version id.
func themeAssetLockRelease(t *testing.T, pool *pgxpool.Pool, ctx context.Context, releaseID int64, episodeNumber int) {
	t.Helper()
	_, err := pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`,
		releaseID, int64(100+episodeNumber))
	require.NoError(t, err)
}

// themeAssetLockReleaseVersionInGroup additionally creates a release_versions + a
// release_version_groups row for releaseID, assigning it to groupID -- only
// HasReleaseAssetSegmentUploadBlockedForRelease's release_context CTE needs this (it matches
// ts.fansub_group_id against the release's resolved fansub_group_ids).
func themeAssetLockReleaseVersionInGroup(t *testing.T, pool *pgxpool.Pool, ctx context.Context, releaseID, releaseVersionID, groupID int64) {
	t.Helper()
	_, err := pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`,
		releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`,
		releaseVersionID, groupID)
	require.NoError(t, err)
}

// themeAssetLockSegment inserts a theme_segment with explicit control over every column the two
// lock/coverage queries key on. nil pointers insert SQL NULL for the nullable columns.
func themeAssetLockSegment(
	t *testing.T, pool *pgxpool.Pool, ctx context.Context,
	themeID int64, groupID *int64, version string, startEpisode, endEpisode *int,
	sourceType, sourceLabel, sourceRef *string,
) int64 {
	t.Helper()
	var segmentID int64
	err := pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, source_type, source_label, source_ref)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`, themeID, groupID, version, startEpisode, endEpisode, sourceType, sourceLabel, sourceRef).Scan(&segmentID)
	require.NoError(t, err)
	return segmentID
}

func intPtr(v int) *int          { return &v }
func i64Ptr(v int64) *int64      { return &v }
func strPtrLocks(v string) *string { return &v }

// TestThemeAssetUploadLocks_SourceInvariants proves, by actually calling the real
// HasReleaseAssetSegmentUploadBlockedForRelease repository method against real Postgres data,
// the three invariants the old test only grepped the SQL source text for:
//  1. a release_asset-typed segment genuinely blocks upload for a non-start episode in its range,
//  2. the lock is specific to source_type='release_asset' (a non-release_asset segment covering
//     the identical range does NOT block), and
//  3. the lock never blocks the segment's own start episode.
func TestThemeAssetUploadLocks_SourceInvariants(t *testing.T) {
	const themeID = int64(1)
	const groupID = int64(1)
	releaseAsset := strPtrLocks("release_asset")

	// Each subtest opens its OWN isolated Phase-117 schema (testsupport.OpenPhase117Postgres
	// creates a fresh schema per call) so theme_segments inserted by one subtest can never
	// leak into another subtest's EXISTS check against the shared themeID=1.

	t.Run("release_asset segment blocks upload for a non-start episode in range", func(t *testing.T) {
		pool, repo := openThemeAssetLockFixture(t)
		ctx := context.Background()
		themeAssetLockSegment(t, pool, ctx, themeID, i64Ptr(groupID), "v1", intPtr(2), intPtr(4), releaseAsset, nil, nil)

		const releaseID = int64(9001)
		const releaseVersionID = int64(9002)
		themeAssetLockRelease(t, pool, ctx, releaseID, 3) // episode 3: within [2,4], not the start
		themeAssetLockReleaseVersionInGroup(t, pool, ctx, releaseID, releaseVersionID, groupID)

		blocked, err := repo.HasReleaseAssetSegmentUploadBlockedForRelease(ctx, releaseID, themeID)
		require.NoError(t, err)
		require.True(t, blocked, "a release_asset segment covering episode 3 must block upload for episode 3 (not the segment's start)")
	})

	t.Run("lock checks explicitly for source_type=release_asset, not any segment in range", func(t *testing.T) {
		pool, repo := openThemeAssetLockFixture(t)
		ctx := context.Background()
		nonReleaseAsset := strPtrLocks("jellyfin_theme")
		themeAssetLockSegment(t, pool, ctx, themeID, i64Ptr(groupID), "v1", intPtr(2), intPtr(4), nonReleaseAsset, nil, nil)

		const releaseID = int64(9011)
		const releaseVersionID = int64(9012)
		themeAssetLockRelease(t, pool, ctx, releaseID, 3)
		themeAssetLockReleaseVersionInGroup(t, pool, ctx, releaseID, releaseVersionID, groupID)

		blocked, err := repo.HasReleaseAssetSegmentUploadBlockedForRelease(ctx, releaseID, themeID)
		require.NoError(t, err)
		require.False(t, blocked, "a non-release_asset segment covering the identical episode range must NOT block upload")
	})

	t.Run("lock never blocks the segment's own start episode", func(t *testing.T) {
		pool, repo := openThemeAssetLockFixture(t)
		ctx := context.Background()
		themeAssetLockSegment(t, pool, ctx, themeID, i64Ptr(groupID), "v1", intPtr(2), intPtr(4), releaseAsset, nil, nil)

		const releaseID = int64(9021)
		const releaseVersionID = int64(9022)
		themeAssetLockRelease(t, pool, ctx, releaseID, 2) // episode 2 == the segment's own start_episode
		themeAssetLockReleaseVersionInGroup(t, pool, ctx, releaseID, releaseVersionID, groupID)

		blocked, err := repo.HasReleaseAssetSegmentUploadBlockedForRelease(ctx, releaseID, themeID)
		require.NoError(t, err)
		require.False(t, blocked, "the lock must never block the segment's own start episode, even though it is inside [start,end]")
	})
}

// TestGlobalThemeSegmentCoverage_ReleaseAssetNotTreatedAsGlobalSourceByItself proves, by
// actually calling the real HasGlobalThemeSegmentCoverageForRelease repository method, that a
// globally-scoped (fansub_group_id NULL, version empty) release_asset-typed segment carrying
// only a human-readable label is NOT treated as "globally covering" a release -- this is the
// asymmetric exclusion the old test only grepped the SQL source text for (the naive
// `source_type <> ''` simplification would wrongly treat it as covered). A contrasting
// non-release_asset segment with the identical label-only shape IS treated as covered, proving
// the exclusion is genuinely specific to source_type='release_asset', not a dead branch.
func TestGlobalThemeSegmentCoverage_ReleaseAssetNotTreatedAsGlobalSourceByItself(t *testing.T) {
	const themeID = int64(1)
	label := strPtrLocks("Opening Clean")

	// Each subtest opens its OWN isolated Phase-117 schema, for the same reason as
	// TestThemeAssetUploadLocks_SourceInvariants above.

	t.Run("a release_asset segment with only a label is NOT globally covering", func(t *testing.T) {
		pool, repo := openThemeAssetLockFixture(t)
		ctx := context.Background()
		themeAssetLockSegment(t, pool, ctx, themeID, nil, "", nil, nil, strPtrLocks("release_asset"), label, nil)

		const releaseID = int64(9031)
		themeAssetLockRelease(t, pool, ctx, releaseID, 3)

		covered, err := repo.HasGlobalThemeSegmentCoverageForRelease(ctx, releaseID, themeID)
		require.NoError(t, err)
		require.False(t, covered, "a release_asset segment must not count as global source coverage merely by having a label")
	})

	t.Run("the identical label-only shape with a non-release_asset source_type IS globally covering", func(t *testing.T) {
		pool, repo := openThemeAssetLockFixture(t)
		ctx := context.Background()
		// source_type='none' (not 'jellyfin_theme') isolates the exact OR-branch at stake --
		// `source_type <> 'release_asset' AND source_label <> ''` -- rather than incidentally
		// passing through the separate `source_type IN ('jellyfin_theme')` branch.
		themeAssetLockSegment(t, pool, ctx, themeID, nil, "", nil, nil, strPtrLocks("none"), label, nil)

		const releaseID = int64(9041)
		themeAssetLockRelease(t, pool, ctx, releaseID, 3)

		covered, err := repo.HasGlobalThemeSegmentCoverageForRelease(ctx, releaseID, themeID)
		require.NoError(t, err)
		require.True(t, covered, "a non-release_asset segment with a label must count as global source coverage, proving the release_asset exclusion above is real, not a universally-false branch")
	})
}

package repository

import (
	"context"
	"fmt"
	"testing"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Plan 155-02 (Requirements P155-07, P155-08, P155-09): proves the standalone
// GetGroupReleaseVersionCount matches the legacy per-release-version row count
// GetGroupReleases produces (one row per release_version), NOT the distinct-
// episode count group.stats.episode_count would produce, for a seeded case
// where one episode carries two release versions (a v2/fix release).
//
// This reuses the phase155 DSN-gated Postgres scaffold already defined in
// fansub_project_resolver_query_budget_test.go (openPhase155Postgres,
// mustExecPhase155, phase155DSNEnv/phase155DatabasePattern) rather than this
// package's group_repository_test.go setupTestRepo/createTestAnime helpers
// (test_helpers.go), which unconditionally call t.Skip and therefore never
// actually execute against a real database in this environment.

// seedPhase155Episode inserts one episodes row for animeID and returns its id.
func seedPhase155Episode(t *testing.T, pool *pgxpool.Pool, animeID int64, episodeNumber string, title string) int64 {
	t.Helper()
	var episodeID int64
	err := pool.QueryRow(context.Background(), `
		INSERT INTO episodes (anime_id, episode_number, title, status)
		VALUES ($1, $2, $3, 'public')
		RETURNING id
	`, animeID, episodeNumber, title).Scan(&episodeID)
	require.NoError(t, err, "seed phase155 episode")
	return episodeID
}

// seedPhase155Release inserts one fansub_releases row for episodeID and
// returns its id.
func seedPhase155Release(t *testing.T, pool *pgxpool.Pool, episodeID int64) int64 {
	t.Helper()
	var releaseID int64
	err := pool.QueryRow(context.Background(), `
		INSERT INTO fansub_releases (episode_id)
		VALUES ($1)
		RETURNING id
	`, episodeID).Scan(&releaseID)
	require.NoError(t, err, "seed phase155 release")
	return releaseID
}

// seedPhase155ReleaseVersion inserts one release_versions row for releaseID
// and returns its id.
func seedPhase155ReleaseVersion(t *testing.T, pool *pgxpool.Pool, releaseID int64, version string, title string) int64 {
	t.Helper()
	var releaseVersionID int64
	err := pool.QueryRow(context.Background(), `
		INSERT INTO release_versions (release_id, version, title)
		VALUES ($1, $2, $3)
		RETURNING id
	`, releaseID, version, title).Scan(&releaseVersionID)
	require.NoError(t, err, "seed phase155 release version")
	return releaseVersionID
}

// seedPhase155ReleaseVersionGroup attaches a release version to a fansub
// group via release_version_groups.
func seedPhase155ReleaseVersionGroup(t *testing.T, pool *pgxpool.Pool, releaseVersionID int64, groupID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $2)
	`, releaseVersionID, groupID)
	require.NoError(t, err, "seed phase155 release version group")
}

// seedPhase155ReleaseCountFixture provisions one fansub_groups row, one anime
// row, and the anime_fansub_groups relation, namespaced by groupID (mirroring
// seedPhase155ProjectResolverGroup's id-namespacing convention).
func seedPhase155ReleaseCountFixture(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string) (animeID int64) {
	t.Helper()
	animeID = groupID * 1000
	mustExecPhase155(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status)
			VALUES (%d, '%s', 'Phase155 Release Count Group %d', 'active');
		INSERT INTO anime (id, title, slug, status)
			VALUES (%d, 'Phase155 Release Count Anime %d', '%s-anime', 'ongoing');
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES (%d, %d);
	`, groupID, slug, groupID, animeID, animeID, slug, animeID, groupID))
	return animeID
}

// TestGetGroupReleaseVersionCount_MatchesLegacyRowCountForMultiVersionEpisode
// proves the standalone count equals the legacy per-release-version row count
// (3: two versions on episode 1, one on episode 2) — NOT the distinct-episode
// count (2), which is what the rejected group.stats.episode_count substitute
// would have produced.
func TestGetGroupReleaseVersionCount_MatchesLegacyRowCountForMultiVersionEpisode(t *testing.T) {
	pool, _ := openPhase155Postgres(t)
	ctx := context.Background()

	const groupID int64 = 1550400
	slug := "phase155-release-count-multi-version"
	animeID := seedPhase155ReleaseCountFixture(t, pool, groupID, slug)

	// Episode 1: two release versions (v1, v2) — the multi-version case.
	episode1ID := seedPhase155Episode(t, pool, animeID, "1", "Episode 1")
	release1ID := seedPhase155Release(t, pool, episode1ID)
	rv1ID := seedPhase155ReleaseVersion(t, pool, release1ID, "v1", "Episode 1 v1")
	seedPhase155ReleaseVersionGroup(t, pool, rv1ID, groupID)
	rv2ID := seedPhase155ReleaseVersion(t, pool, release1ID, "v2", "Episode 1 v2")
	seedPhase155ReleaseVersionGroup(t, pool, rv2ID, groupID)

	// Episode 2: exactly one release version.
	episode2ID := seedPhase155Episode(t, pool, animeID, "2", "Episode 2")
	release2ID := seedPhase155Release(t, pool, episode2ID)
	rv3ID := seedPhase155ReleaseVersion(t, pool, release2ID, "v1", "Episode 2 v1")
	seedPhase155ReleaseVersionGroup(t, pool, rv3ID, groupID)

	repo := NewGroupRepository(pool)

	legacyResult, _, err := repo.GetGroupReleases(ctx, animeID, groupID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 500,
	})
	require.NoError(t, err)
	oldCount := int64(len(legacyResult.Episodes))

	newCount, err := repo.GetGroupReleaseVersionCount(ctx, animeID, groupID, models.GroupReleasesFilter{})
	require.NoError(t, err)

	require.Equalf(t, oldCount, newCount,
		"standalone GetGroupReleaseVersionCount (%d) must match legacy per-release-version row count from GetGroupReleases (%d)",
		newCount, oldCount)
	require.EqualValues(t, 3, newCount,
		"expected 3 release versions total (episode 1's v1+v2, episode 2's v1)")
	// This is the rejected group.stats.episode_count-style substitute value
	// (COUNT(DISTINCT e.id) = 2 distinct episodes) — guard against a future
	// accidental revert to that undercounting metric.
	require.NotEqualf(t, int64(2), newCount,
		"GetGroupReleaseVersionCount must NOT equal the distinct-episode count (2) — that is the rejected episode_count substitute, which undercounts multi-version episodes")
}

// TestGetGroupReleaseVersionCount_MatchesSingleVersionCase proves the two
// counts stay identical in the simple, non-diverging case (one episode, one
// release version) — the baseline the multi-version test's divergence is
// contrasted against.
func TestGetGroupReleaseVersionCount_MatchesSingleVersionCase(t *testing.T) {
	pool, _ := openPhase155Postgres(t)
	ctx := context.Background()

	const groupID int64 = 1550500
	slug := "phase155-release-count-single-version"
	animeID := seedPhase155ReleaseCountFixture(t, pool, groupID, slug)

	episodeID := seedPhase155Episode(t, pool, animeID, "1", "Episode 1")
	releaseID := seedPhase155Release(t, pool, episodeID)
	rvID := seedPhase155ReleaseVersion(t, pool, releaseID, "v1", "Episode 1 v1")
	seedPhase155ReleaseVersionGroup(t, pool, rvID, groupID)

	repo := NewGroupRepository(pool)

	legacyResult, _, err := repo.GetGroupReleases(ctx, animeID, groupID, models.GroupReleasesFilter{
		Page:    1,
		PerPage: 500,
	})
	require.NoError(t, err)
	oldCount := int64(len(legacyResult.Episodes))

	newCount, err := repo.GetGroupReleaseVersionCount(ctx, animeID, groupID, models.GroupReleasesFilter{})
	require.NoError(t, err)

	require.Equal(t, oldCount, newCount)
	require.EqualValues(t, 1, newCount)
}

package repository

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// Plan 152-03 (Requirements P152-07, P152-08): guarded-Postgres behavioral proof
// that the public group load path (getPublicGroupBase + attachPublicReleaseVersionsCount
// + a single ListGroupLinks call) is behaviorally correct -- the four unused counts
// serialize as zero, website_url reflects fansub_group_links (not the stale legacy
// column, per 152-RESEARCH.md Pitfall 1), and the shared admin path (GetGroupBySlug)
// remains fully hydrated and unaffected.
//
// Pattern: Phase-128/129/131 dedicated-test-DSN, skip-if-unset. Env var
// TEAM4S_PHASE152_TEST_DSN must point at a dedicated throwaway database
// (team4s_phase152_test) carrying the FULL real schema (pg_dump --schema-only of
// team4s_v2). A fail-closed DB-name guard prevents ever running against team4s_v2
// (the live dev DB).

const phase152DSNEnv = "TEAM4S_PHASE152_TEST_DSN"

// phase152DatabasePattern enforces fail-closed that the DSN points at a dedicated
// team4s_phase152_test database -- never team4s_v2.
var phase152DatabasePattern = regexp.MustCompile(`^team4s_phase152_test(?:_[a-z0-9]+)?$`)

// openPhase152Postgres opens the dedicated Phase-152 database (skip-if-unset) with the
// query-counting tracer attached (unused by these correctness tests today, but kept for
// parity with the shared analog and future query-budget work in 152-08), returning the
// pool. Each test resets its own fixtures via unique, namespaced IDs so ordering is not
// required.
func openPhase152Postgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase152DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-152 public-profile load-path test", phase152DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase152DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase152DatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase152DSNEnv, dbName, phase152DatabasePattern)

	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase152DSNEnv)
	t.Cleanup(pool.Close)

	var runtimeDB string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDB))
	require.Equalf(t, dbName, runtimeDB, "runtime database %q differs from guarded DSN database %q", runtimeDB, dbName)

	return pool, counter
}

func mustExecPhase152(t *testing.T, pool *pgxpool.Pool, sql string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), sql)
	require.NoError(t, err, "seed Phase-152 fixture")
}

// seedPhase152GroupWithFullData seeds one fansub_groups row plus at least one row in
// every relation the OLD hydration path (hydrateFansubGroup -> attachGroupCounts ->
// attachGroupLinks) attached, so:
//   - AnimeRelationsCount, ProjectsCount, MembersCount, AliasesCount would ALL be
//     non-zero under the old path (proving Task 1's zeroing is not a seeding artifact),
//   - ReleaseVersionsCount has exactly one real seeded row,
//   - fansub_groups.website_url holds a STALE value distinct from the fresh
//     fansub_group_links row's URL (Pitfall 1 regression guard).
//
// Every id is namespaced by groupID to keep seeds collision-free across tests within a
// single run.
func seedPhase152GroupWithFullData(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string) {
	t.Helper()

	staleWebsiteURL := fmt.Sprintf("https://stale-%s.example.invalid", slug)
	freshWebsiteURL := fmt.Sprintf("https://fresh-%s.example.invalid", slug)

	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status, website_url)
			VALUES (%d, '%s', 'Phase152 Group %d', 'active', '%s');
	`, groupID, slug, groupID, staleWebsiteURL))

	// Fresh links-table row: a regression-guard test asserts this wins over the
	// stale fansub_groups.website_url column (152-RESEARCH.md Pitfall 1).
	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_group_links (group_id, link_type, url)
			VALUES (%d, 'website', '%s');
	`, groupID, freshWebsiteURL))

	// AnimeRelationsCount / ProjectsCount source: one non-disabled anime linked via
	// anime_fansub_groups.
	animeID := groupID*100 + 1
	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO anime (id, title, status) VALUES (%d, 'Phase152 Anime %d', 'ongoing');
		INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES (%d, %d);
	`, animeID, groupID, animeID, groupID))

	// AliasesCount source: one alias row.
	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias)
			VALUES (%d, 'Phase152 Alias %d', 'phase152-alias-%d');
	`, groupID, groupID, groupID))

	// MembersCount source: one active fansub_group_members row backed by an app_user.
	appUserID := groupID*100 + 2
	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO app_users (id, keycloak_subject, email, display_name, status)
			VALUES (%d, 'phase152-subject-%d', 'phase152-%d@example.invalid', 'Phase152 User %d', 'active');
		INSERT INTO fansub_group_members (fansub_group_id, app_user_id, status)
			VALUES (%d, %d, 'active');
	`, appUserID, groupID, groupID, groupID, groupID, appUserID))

	// ReleaseVersionsCount source: one real release_version_groups row, reachable
	// through the full episodes -> fansub_releases -> release_versions chain.
	episodeID := groupID*100 + 3
	releaseID := groupID*100 + 4
	versionID := groupID*100 + 5
	mustExecPhase152(t, pool, fmt.Sprintf(`
		INSERT INTO episodes (id, anime_id, episode_number, status)
			VALUES (%d, %d, '1', 'public');
		INSERT INTO fansub_releases (id, episode_id) VALUES (%d, %d);
		INSERT INTO release_versions (id, release_id, version) VALUES (%d, %d, 'v1');
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
			VALUES (%d, %d);
	`, episodeID, animeID, releaseID, episodeID, versionID, releaseID, versionID, groupID))
}

// TestFansubPublicProfileLoadPath_UnusedCountsAreZero proves Task 1's intentional,
// directed contract-value change: GetPublicProfileBySlug's public-specific load path
// no longer computes AnimeRelationsCount/ProjectsCount/MembersCount/AliasesCount, so
// they serialize as their zero value even for a group with real, non-zero underlying
// rows in every source table. ReleaseVersionsCount is the one count the public page
// actually reads, so it must still reflect the seeded release_version_groups row.
func TestFansubPublicProfileLoadPath_UnusedCountsAreZero(t *testing.T) {
	pool, _ := openPhase152Postgres(t)
	repo := NewFansubRepository(pool)

	const groupID int64 = 1520001
	seedPhase152GroupWithFullData(t, pool, groupID, "phase152-unused-counts")

	profile, err := repo.GetPublicProfileBySlug(context.Background(), "phase152-unused-counts")
	require.NoError(t, err)

	require.Zerof(t, profile.Group.AnimeRelationsCount, "AnimeRelationsCount must be zeroed on the public load path even though the group has a real anime_fansub_groups row")
	require.Zerof(t, profile.Group.ProjectsCount, "ProjectsCount must be zeroed on the public load path even though the group has a real non-disabled anime project")
	require.Zerof(t, profile.Group.MembersCount, "MembersCount must be zeroed on the public load path even though the group has a real active fansub_group_members row")
	require.Zerof(t, profile.Group.AliasesCount, "AliasesCount must be zeroed on the public load path even though the group has a real fansub_group_aliases row")
	require.Equalf(t, 1, profile.Group.ReleaseVersionsCount, "ReleaseVersionsCount must still reflect the one seeded release_version_groups row -- this is the one count the public page reads")
}

// TestFansubPublicProfileLoadPath_WebsiteURLReflectsLinksTable is the Pitfall 1
// regression guard: GetPublicProfileBySlug must return the fansub_group_links table's
// website URL, not the stale fansub_groups.website_url column, proving
// applyLegacyLinkProjection still runs after the single batched ListGroupLinks call.
func TestFansubPublicProfileLoadPath_WebsiteURLReflectsLinksTable(t *testing.T) {
	pool, _ := openPhase152Postgres(t)
	repo := NewFansubRepository(pool)

	const groupID int64 = 1520002
	slug := "phase152-website-url"
	seedPhase152GroupWithFullData(t, pool, groupID, slug)

	profile, err := repo.GetPublicProfileBySlug(context.Background(), slug)
	require.NoError(t, err)

	require.NotNilf(t, profile.Group.WebsiteURL, "expected website_url to be populated from fansub_group_links")
	expectedFreshURL := fmt.Sprintf("https://fresh-%s.example.invalid", slug)
	staleColumnURL := fmt.Sprintf("https://stale-%s.example.invalid", slug)
	require.Equalf(t, expectedFreshURL, *profile.Group.WebsiteURL,
		"website_url must reflect the fansub_group_links row (%q), not the stale fansub_groups.website_url column (%q)", expectedFreshURL, staleColumnURL)
}

// TestFansubPublicProfileLoadPath_AdminGetGroupBySlugUnaffected proves Task 1's
// changes are strictly additive: using the same seeded group, the shared admin path
// (GetGroupBySlug, still calling hydrateFansubGroup) must keep returning the real,
// non-zero AnimeRelationsCount/ProjectsCount/MembersCount/AliasesCount values -- the
// new public-specific helpers did not regress the shared hydration path any of
// GetGroupBySlug's other callers depend on.
func TestFansubPublicProfileLoadPath_AdminGetGroupBySlugUnaffected(t *testing.T) {
	pool, _ := openPhase152Postgres(t)
	repo := NewFansubRepository(pool)

	const groupID int64 = 1520003
	slug := "phase152-admin-unaffected"
	seedPhase152GroupWithFullData(t, pool, groupID, slug)

	group, err := repo.GetGroupBySlug(context.Background(), slug)
	require.NoError(t, err)

	require.Positivef(t, group.AnimeRelationsCount, "admin GetGroupBySlug must still return a real, non-zero AnimeRelationsCount")
	require.Positivef(t, group.ProjectsCount, "admin GetGroupBySlug must still return a real, non-zero ProjectsCount")
	require.Positivef(t, group.MembersCount, "admin GetGroupBySlug must still return a real, non-zero MembersCount")
	require.Positivef(t, group.AliasesCount, "admin GetGroupBySlug must still return a real, non-zero AliasesCount")
	require.Equalf(t, 1, group.ReleaseVersionsCount, "admin GetGroupBySlug must still return the real ReleaseVersionsCount")
}

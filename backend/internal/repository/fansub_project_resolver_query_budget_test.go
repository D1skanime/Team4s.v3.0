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

// Plan 155-01 (Requirements P155-01, P155-13, P155-15): the constant-query-
// budget regression gate proving FansubProjectResolverRepository's
// ResolveProject + ListProjectNavigationProjects cost does not grow with the
// number of projects in a fansub group, plus the neutral not-found proof
// (T-155-01) that an unknown groupSlug and a known groupSlug with an unknown
// animeSlug both collapse to the same repository.ErrNotFound.
//
// This is a DELIBERATE, phase-155-scoped clone of the
// phase152DSNEnv/phase152DatabasePattern/openPhase152Postgres/
// mustExecPhase152 scaffold (fansub_public_profile_load_path_test.go), not a
// silent reuse of the Phase-152 names -- 155-PATTERNS.md flags this as an
// explicit choice this plan must make. Reuses the shared queryCounter type
// as-is.

const phase155DSNEnv = "TEAM4S_PHASE155_TEST_DSN"

// phase155DatabasePattern enforces fail-closed that the DSN points at a
// dedicated team4s_phase155_test database -- never team4s_v2.
var phase155DatabasePattern = regexp.MustCompile(`^team4s_phase155_test(?:_[a-z0-9]+)?$`)

// openPhase155Postgres opens the dedicated Phase-155 database (skip-if-unset)
// with the query-counting tracer attached.
func openPhase155Postgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase155DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-155 project-resolver query-budget test", phase155DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase155DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase155DatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase155DSNEnv, dbName, phase155DatabasePattern)

	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase155DSNEnv)
	t.Cleanup(pool.Close)

	var runtimeDB string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDB))
	require.Equalf(t, dbName, runtimeDB, "runtime database %q differs from guarded DSN database %q", runtimeDB, dbName)

	return pool, counter
}

func mustExecPhase155(t *testing.T, pool *pgxpool.Pool, sql string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), sql)
	require.NoError(t, err, "seed Phase-155 fixture")
}

// seedPhase155ProjectResolverGroup seeds one fansub_groups row plus
// projectCount projects (anime + anime_fansub_groups), namespacing every id
// by groupID*1000+i, mirroring seedPhase152PublicProfileQueryBudgetGroup's
// id-namespacing convention. Returns the anime_slug of the first seeded
// project (used as the animeSlug to resolve in the budget test).
func seedPhase155ProjectResolverGroup(t *testing.T, pool *pgxpool.Pool, groupID int64, slug string, projectCount int) string {
	t.Helper()

	mustExecPhase155(t, pool, fmt.Sprintf(`
		INSERT INTO fansub_groups (id, slug, name, status)
			VALUES (%d, '%s', 'Phase155 Resolver Group %d', 'active');
	`, groupID, slug, groupID))

	firstAnimeSlug := ""
	for i := 0; i < projectCount; i++ {
		animeID := groupID*1000 + int64(i)
		animeSlug := fmt.Sprintf("phase155-resolver-anime-%d", animeID)
		if i == 0 {
			firstAnimeSlug = animeSlug
		}
		mustExecPhase155(t, pool, fmt.Sprintf(`
			INSERT INTO anime (id, title, slug, status) VALUES (%d, 'Phase155 Resolver Anime %d', '%s', 'ongoing');
			INSERT INTO anime_fansub_groups (anime_id, fansub_group_id) VALUES (%d, %d);
		`, animeID, animeID, animeSlug, animeID, groupID))
	}

	return firstAnimeSlug
}

// phase155ProjectResolverConstantQueryBudget is the enforced constant number
// of SQL queries a single ResolveProject + ListProjectNavigationProjects
// pair issues, INDEPENDENT of how many projects the group has: one query for
// ResolveProject, one query for ListProjectNavigationProjects. Update this
// constant ONLY for an intentional, documented loader change.
const phase155ProjectResolverConstantQueryBudget = 2

// TestFansubProjectResolverQueryBudgetIsConstant proves (a) ResolveProject
// returns the correct GroupID/AnimeID/AnimeSlug for a known slug pair, and
// (b) the combined query count for ResolveProject +
// ListProjectNavigationProjects is IDENTICAL between a 1-project and a
// 6-project group -- no growth with project count -- and pinned to the
// documented constant.
func TestFansubProjectResolverQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase155Postgres(t)
	repo := NewFansubProjectResolverRepository(pool)

	const smallGroupID int64 = 1550100
	const largeGroupID int64 = 1550200
	const smallProjectCount = 1
	const largeProjectCount = 6
	smallSlug := "phase155-resolver-small"
	largeSlug := "phase155-resolver-large"

	smallAnimeSlug := seedPhase155ProjectResolverGroup(t, pool, smallGroupID, smallSlug, smallProjectCount)
	largeAnimeSlug := seedPhase155ProjectResolverGroup(t, pool, largeGroupID, largeSlug, largeProjectCount)

	counter.reset()
	smallResolved, err := repo.ResolveProject(context.Background(), smallSlug, smallAnimeSlug)
	require.NoError(t, err)
	require.Equal(t, smallGroupID, smallResolved.GroupID)
	require.Equal(t, smallGroupID*1000, smallResolved.AnimeID)
	require.Equal(t, smallAnimeSlug, smallResolved.AnimeSlug)
	_, err = repo.ListProjectNavigationProjects(context.Background(), smallResolved.GroupID)
	require.NoError(t, err)
	smallCount := counter.count()

	counter.reset()
	largeResolved, err := repo.ResolveProject(context.Background(), largeSlug, largeAnimeSlug)
	require.NoError(t, err)
	require.Equal(t, largeGroupID, largeResolved.GroupID)
	require.Equal(t, largeGroupID*1000, largeResolved.AnimeID)
	require.Equal(t, largeAnimeSlug, largeResolved.AnimeSlug)
	largeProjects, err := repo.ListProjectNavigationProjects(context.Background(), largeResolved.GroupID)
	require.NoError(t, err)
	require.Lenf(t, largeProjects, largeProjectCount, "large seed must list exactly its seeded sibling projects")
	largeCount := counter.count()

	t.Logf("P155-01 constant-budget gate: %d projects -> %d queries; %d projects -> %d queries (must be equal and constant).",
		smallProjectCount, smallCount, largeProjectCount, largeCount)

	require.Equalf(t, smallCount, largeCount,
		"constant query budget violated: %d-project group issued %d queries but %d-project group issued %d (resolver cost must not grow with project count)",
		smallProjectCount, smallCount, largeProjectCount, largeCount)
	require.Equalf(t, phase155ProjectResolverConstantQueryBudget, largeCount,
		"project resolver query budget drifted from the enforced constant %d; got %d (update phase155ProjectResolverConstantQueryBudget only with an intentional, documented loader change)",
		phase155ProjectResolverConstantQueryBudget, largeCount)
}

// TestResolveProject_NotFound proves both negative branches -- an unknown
// groupSlug, and a known groupSlug with an unknown animeSlug -- collapse to
// the same repository.ErrNotFound sentinel, proving no distinguishable
// behavior at the repository layer (T-155-01).
func TestResolveProject_NotFound(t *testing.T) {
	pool, _ := openPhase155Postgres(t)
	repo := NewFansubProjectResolverRepository(pool)

	const groupID int64 = 1550300
	slug := "phase155-resolver-notfound"
	animeSlug := seedPhase155ProjectResolverGroup(t, pool, groupID, slug, 1)

	_, err := repo.ResolveProject(context.Background(), "phase155-resolver-unknown-group", animeSlug)
	require.ErrorIsf(t, err, ErrNotFound, "unknown groupSlug must resolve to ErrNotFound")

	_, err = repo.ResolveProject(context.Background(), slug, "phase155-resolver-unknown-anime-slug")
	require.ErrorIsf(t, err, ErrNotFound, "unknown animeSlug within a known group must resolve to the SAME ErrNotFound")
}

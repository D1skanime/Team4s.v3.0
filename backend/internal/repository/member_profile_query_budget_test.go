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

// Phase 131 (Plan 01, Wave 1): Query-count instrumentation + current-state
// characterization (Requirements PMPF-01, PMPF-07; CONTEXT D-06/D-07).
//
// This file records TODAY'S reality: how many SQL queries a single public-profile
// load (GetPublicMemberProfileByID + its ~10 sequential r.load* helpers) issues, and
// that this count currently GROWS with the number of current projects. It asserts only
// a loose upper bound -- it does NOT yet assert constancy. The constant-query-budget
// gate (assert the count does not grow with project count) lands in 131-03.
//
// KNOWN GROWTH SEAM (the N+1 the constant-budget gate will close):
//
//	backend/internal/repository/member_profile_projects_repository.go
//	loadCurrentProjects (around L109) issues ONE additional round-trip per project card:
//	    releaseVersions, err := r.loadCurrentProjectReleaseVersions(ctx, memberID, item.AnimeID, item.FansubGroupID)
//	inside the row-iteration loop. So the total query count is ~ (a fixed base of
//	profile/badge/contribution loaders) + 1 (loadCurrentProjects list query) + N (one
//	loadCurrentProjectReleaseVersions per current project). That per-card round-trip is
//	the documented growth source 131-03 must eliminate (single set-based / batched read).
//
// Measurement uses the TEST-SUPPORT-ONLY queryCounter (query_counter.go), a
// pgx.QueryTracer attached via pgxpool.Config.ConnConfig.Tracer. It is never wired into
// production request paths.
//
// Pattern: Phase-128/129 dedicated-test-DSN, skip-if-unset. Env var
// TEAM4S_PHASE131_TEST_DSN must point at a dedicated throwaway database
// (team4s_phase131_test) carrying the FULL real schema (pg_dump --schema-only of
// team4s_v2); the public projection touches dozens of tables, so only the complete
// schema lets the real repository queries run unchanged. A fail-closed DB-name guard
// prevents ever running against team4s_v2 (the live dev DB).

const phase131DSNEnv = "TEAM4S_PHASE131_TEST_DSN"

// phase131DatabasePattern enforces fail-closed that the DSN points at a dedicated
// team4s_phase131_test database -- never team4s_v2.
var phase131DatabasePattern = regexp.MustCompile(`^team4s_phase131_test(?:_[a-z0-9]+)?$`)

// openPhase131Postgres opens the dedicated Phase-131 database (skip-if-unset) with the
// query-counting tracer attached, returning both the pool and the shared counter. The
// counter observes every query issued through the pool; callers reset() it immediately
// before the code path they want to measure so seed/setup traffic is excluded.
func openPhase131Postgres(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase131DSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-131 query-budget characterization test", phase131DSNEnv)
	}
	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase131DSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase131DatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase131DSNEnv, dbName, phase131DatabasePattern)

	counter := &queryCounter{}
	config.ConnConfig.Tracer = counter

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open %s pool", phase131DSNEnv)
	t.Cleanup(pool.Close)

	var runtimeDB string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDB))
	require.Equalf(t, dbName, runtimeDB, "runtime database %q differs from guarded DSN database %q", runtimeDB, dbName)

	resetPhase131Fixtures(t, pool)
	return pool, counter
}

// resetPhase131Fixtures clears every table the Phase-131 characterization seeds, in
// FK-safe child->parent order (mirrors the Phase-129 reset), so the test is order-
// independent and repeatable against the dedicated throwaway database.
func resetPhase131Fixtures(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		DELETE FROM anime_contribution_roles;
		DELETE FROM anime_contributions;
		DELETE FROM member_claims;
		DELETE FROM anime;
		DELETE FROM fansub_groups;
		DELETE FROM members;
		DELETE FROM role_definitions;
	`)
	require.NoError(t, err, "reset Phase-131 fixtures")
}

func mustExecPhase131(t *testing.T, pool *pgxpool.Pool, sql string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), sql)
	require.NoError(t, err, "seed Phase-131 fixture")
}

// seedPhase131MemberWithCurrentProjects seeds one member (memberID) with projectCount
// distinct confirmed, public, still-running current projects, each with one contribution
// role so loadCurrentProjects lists it. Every id is namespaced by memberID+index to keep
// seeds collision-free across members within a single test run.
func seedPhase131MemberWithCurrentProjects(t *testing.T, pool *pgxpool.Pool, memberID int64, slug string, projectCount int) {
	t.Helper()
	mustExecPhase131(t, pool, fmt.Sprintf(
		`INSERT INTO role_definitions (code, label_de) VALUES ('translator', 'Übersetzer') ON CONFLICT (code) DO NOTHING;
		 INSERT INTO members (id, nickname, public_slug) VALUES (%d, '%s', '%s');`,
		memberID, slug, slug))
	for i := 0; i < projectCount; i++ {
		base := memberID*100 + int64(i)
		mustExecPhase131(t, pool, fmt.Sprintf(`
			INSERT INTO fansub_groups (id, slug, name, status)
				VALUES (%d, '%s-grp-%d', 'Phase131 Group %d', 'active');
			INSERT INTO anime (id, title) VALUES (%d, 'Phase131 Anime %d');
			INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, status, is_public_on_member_profile, started_year, ended_year)
				VALUES (%d, %d, %d, %d, 'confirmed', true, 2020, NULL);
			INSERT INTO anime_contribution_roles (id, anime_contribution_id, role_code)
				VALUES (%d, %d, 'translator');
		`, base, slug, i, base, base, base, base, base, base, memberID, base, base))
	}
}

// TestPhase131PublicProfileQueryBudgetCharacterization records the current per-load
// query count for a SMALL current-project seed and asserts only a loose upper bound
// (documents today's ~base + 1 + N shape; does NOT assert constancy -- that is 131-03).
func TestPhase131PublicProfileQueryBudgetCharacterization(t *testing.T) {
	pool, counter := openPhase131Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	const memberID int64 = 1310001
	const smallProjectCount = 3
	seedPhase131MemberWithCurrentProjects(t, pool, memberID, "phase131-small", smallProjectCount)

	counter.reset()
	profile, err := repo.GetPublicMemberProfileByID(context.Background(), memberID)
	require.NoError(t, err)
	got := counter.count()

	require.Len(t, profile.CurrentProjects, smallProjectCount,
		"seed must produce exactly the expected number of listed current projects")

	t.Logf("PMPF-01 characterization: a single GetPublicMemberProfileByID load with %d current projects issued %d SQL queries (post-131-03 shape: fixed loader base + 1 loadCurrentProjects list query + 1 batched loadCurrentProjectReleaseVersionsBatch query; constant regardless of project count).",
		smallProjectCount, got)

	// Loose upper bound ONLY -- this records reality and stays GREEN. The constant-
	// budget assertion (count must not grow with project count) lands in 131-03.
	require.Positive(t, got, "query counter must observe the profile-load queries")
	require.LessOrEqualf(t, got, 100,
		"loose characterization ceiling: today's public-profile load should stay well under 100 queries for a small seed; got %d", got)
}

// phase131ConstantQueryBudget is the enforced constant number of SQL queries a single
// public-profile load issues, INDEPENDENT of the member's current-project count. Shape
// after 131-03 removed the per-card N+1: a fixed base of profile/badge/contribution
// loaders + 1 loadCurrentProjects list query + 1 batched loadCurrentProjectReleaseVersionsBatch
// query. Before 131-03 the tail was +N (one loadCurrentProjectReleaseVersions per project):
// 2 projects -> 20, 3 -> 21, 6 -> 24. After batching it is constant at this value.
// Update this constant ONLY for an intentional, documented loader change.
// Phase 132 (D-06/D-07): raised from 19 to 20 to account for the new loadKnownFor
// full-set aggregate query (top roles / known groups / active years), an intentional,
// documented addition wired into GetPublicMemberProfileByID alongside countCurrentProjects.
const phase131ConstantQueryBudget = 20

// TestPhase131PublicProfileQueryBudgetIsConstant is the constant-query-budget gate
// (Requirement PMPF-01, CONTEXT D-07 SC1): a public-profile load must issue the SAME
// number of SQL queries regardless of how many current projects the member has. 131-03
// replaced the per-card loadCurrentProjectReleaseVersions round-trip (one per project)
// with a single set-based batched read, so the count no longer grows with project count.
// This inverts the 131-01 growth characterization into a hard ceiling (D-07).
func TestPhase131PublicProfileQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase131Postgres(t)
	repo := NewMemberProfileRepository(pool, "")

	const fewMember int64 = 1310010
	const manyMember int64 = 1310020
	const fewProjects = 2
	const manyProjects = 6
	seedPhase131MemberWithCurrentProjects(t, pool, fewMember, "phase131-few", fewProjects)
	seedPhase131MemberWithCurrentProjects(t, pool, manyMember, "phase131-many", manyProjects)

	counter.reset()
	fewProfile, err := repo.GetPublicMemberProfileByID(context.Background(), fewMember)
	require.NoError(t, err)
	fewCount := counter.count()
	require.Len(t, fewProfile.CurrentProjects, fewProjects,
		"few-project seed must list exactly its seeded current projects")

	counter.reset()
	manyProfile, err := repo.GetPublicMemberProfileByID(context.Background(), manyMember)
	require.NoError(t, err)
	manyCount := counter.count()
	require.Len(t, manyProfile.CurrentProjects, manyProjects,
		"many-project seed must list exactly its seeded current projects")

	t.Logf("PMPF-01 constant-budget gate: %d projects -> %d queries; %d projects -> %d queries (must be equal and constant after 131-03 batched read).",
		fewProjects, fewCount, manyProjects, manyCount)

	// D-07 SC1: the budget is CONSTANT -- identical regardless of project count (no
	// per-card / per-project round-trips remain).
	require.Equalf(t, fewCount, manyCount,
		"constant query budget violated: %d-project load issued %d queries but %d-project load issued %d (per-card N+1 must stay eliminated)",
		fewProjects, fewCount, manyProjects, manyCount)
	// And it is exactly the enforced constant (hard ceiling, not just non-growing).
	require.Equalf(t, phase131ConstantQueryBudget, manyCount,
		"public-profile query budget drifted from the enforced constant %d; got %d (update phase131ConstantQueryBudget only with an intentional, documented loader change)",
		phase131ConstantQueryBudget, manyCount)
}

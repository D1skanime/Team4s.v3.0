package repository

// admin_users_query_budget_test.go proves QUAL-06/D25 (Plan 139-06, Task 1) for all three
// Phase-139 endpoints together (ListUserContributions, GetUserMedia, GetUserRightsSummary) --
// mirrors member_profile_query_budget_test.go's Phase-131 constant-query-budget gate pattern
// (counter.reset() immediately before the measured call + require.Equal(fewCount, manyCount) +
// a pinned exact constant).
//
// openPhase139PostgresWithCounter duplicates testsupport.OpenPhase139Postgres's isolated-schema +
// full-real-migration-chain connection logic locally in THIS package, because the counter must be
// wired onto the pool's pgxpool.Config.ConnConfig.Tracer BEFORE pgxpool.NewWithConfig opens the
// scoped pool -- testsupport.OpenPhase139Postgres does not expose a seam for that. This is the
// exact same duplication openPhase131Postgres (member_profile_query_budget_test.go) already
// accepts against testsupport's shared openPhasePostgres helper, for the identical reason -- not a
// new pattern.

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/migrations"
	"team4s.v3/backend/internal/permissions"
)

const phase139BudgetDSNEnv = "TEAM4S_PHASE139_TEST_DSN"

var (
	phase139BudgetDatabasePattern = regexp.MustCompile(`^team4s_phase139_test_[a-z0-9]+$`)
	phase139BudgetSchemaPattern   = regexp.MustCompile(`^phase139_[a-z0-9_]+$`)
)

// openPhase139PostgresWithCounter opens the SAME dedicated Phase-139 disposable database as
// testsupport.OpenPhase139Postgres (TEAM4S_PHASE139_TEST_DSN, skip-if-unset), in a fresh isolated
// schema carrying the COMPLETE real migration chain, with a query-counting pgx.QueryTracer wired
// onto the pool's ConnConfig BEFORE the scoped pool opens -- so every SQL round-trip issued
// through the returned pool is observed from the first connection onward.
func openPhase139PostgresWithCounter(t *testing.T) (*pgxpool.Pool, *queryCounter) {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv(phase139BudgetDSNEnv))
	if dsn == "" {
		t.Skipf("%s is not set; skipping Phase-139 query-budget/pagination-drift test", phase139BudgetDSNEnv)
	}

	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse %s", phase139BudgetDSNEnv)
	dbName := config.ConnConfig.Database
	require.Truef(t, phase139BudgetDatabasePattern.MatchString(dbName),
		"unsafe %s: database name %q must match %s (never run against team4s_v2)", phase139BudgetDSNEnv, dbName, phase139BudgetDatabasePattern)

	adminPool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open guarded %s pool", phase139BudgetDSNEnv)
	var runtimeDB string
	require.NoError(t, adminPool.QueryRow(context.Background(), `SELECT current_database()`).Scan(&runtimeDB))
	require.Equalf(t, dbName, runtimeDB, "runtime database %q differs from guarded DSN database %q", runtimeDB, dbName)

	schema := newPhase139BudgetSchemaName(t)
	_, err = adminPool.Exec(context.Background(), "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize())
	require.NoErrorf(t, err, "create isolated schema %q", schema)

	scopedConfig, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse scoped %s", phase139BudgetDSNEnv)
	scopedConfig.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO "+pgx.Identifier{schema}.Sanitize())
		return err
	}
	counter := &queryCounter{}
	scopedConfig.ConnConfig.Tracer = counter

	scopedPool, err := pgxpool.NewWithConfig(context.Background(), scopedConfig)
	if err != nil {
		_, _ = adminPool.Exec(context.Background(), "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE")
		adminPool.Close()
		require.NoErrorf(t, err, "open schema-scoped %s pool", phase139BudgetDSNEnv)
	}

	var cleanupOnce sync.Once
	t.Cleanup(func() {
		cleanupOnce.Do(func() {
			scopedPool.Close()
			if !phase139BudgetSchemaPattern.MatchString(schema) {
				t.Errorf("refusing cleanup for unsafe schema %q", schema)
				adminPool.Close()
				return
			}
			if _, err := adminPool.Exec(context.Background(), "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE"); err != nil {
				t.Errorf("drop isolated schema %q: %v", schema, err)
			}
			adminPool.Close()
		})
	})

	var schemas []string
	require.NoError(t, scopedPool.QueryRow(context.Background(), `SELECT current_schemas(false)`).Scan(&schemas))
	require.Truef(t, len(schemas) == 1 && schemas[0] == schema && !containsPhase139BudgetSchema(schemas, "public"),
		"unsafe search_path schemas: %v", schemas)

	runner := migrations.NewRunner(scopedPool, phase139BudgetMigrationsDir(t))
	_, err = runner.Up(context.Background())
	require.NoErrorf(t, err, "apply full migration chain for Phase-139 query-budget fixture")

	counter.reset() // exclude migration-chain traffic from the first measured call
	return scopedPool, counter
}

func containsPhase139BudgetSchema(schemas []string, wanted string) bool {
	for _, s := range schemas {
		if s == wanted {
			return true
		}
	}
	return false
}

func newPhase139BudgetSchemaName(t *testing.T) string {
	t.Helper()
	random := make([]byte, 8)
	_, err := rand.Read(random)
	require.NoError(t, err)
	name := "phase139_" + hex.EncodeToString(random)
	require.Truef(t, phase139BudgetSchemaPattern.MatchString(name), "schema name %q must match %s", name, phase139BudgetSchemaPattern)
	return name
}

// phase139BudgetMigrationsDir resolves database/migrations relative to this source file's
// location (runtime.Caller(0)), mirroring testsupport's phase139MigrationsDir convention --
// deterministic regardless of the working directory `go test` happens to use.
func phase139BudgetMigrationsDir(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok, "resolve Phase-139 query-budget migrations path")
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations")
}

// --- Task 1: constant-query-budget gates (QUAL-06/D25) ---------------------------------------

// seedPhase139ContributionsBudgetFixture seeds one verified user with blockCount distinct
// anime+project blocks, each carrying a project standard, one standard-equivalent range episode,
// and one genuinely deviating episode (F-03 pattern, seeded directly via SQL, per this plan's own
// <action> instruction, since this is an isolated-schema integration test, not a live-endpoint
// exercise).
func seedPhase139ContributionsBudgetFixture(t testing.TB, pool *pgxpool.Pool, userSeed int64, appUserID, memberID int64, blockCount int) {
	t.Helper()
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, fmt.Sprintf("phase139-budget-contrib-%d", userSeed))
	for b := 0; b < blockCount; b++ {
		base := int64(139060000000) + userSeed*1_000_000 + int64(b)*100
		animeID := base + 1
		groupID := base + 2
		seedPhase139Anime(t, pool, animeID, fmt.Sprintf("Phase139 Budget Contrib Anime %d-%d", userSeed, b))
		seedPhase139FansubGroup(t, pool, groupID, fmt.Sprintf("Phase139 Budget Contrib Group %d-%d", userSeed, b))
		seedPhase139AnimeContribution(t, pool, base+3, animeID, groupID, memberID, nil, []string{"encoder"}, nil)

		// Range entry 1: standard-equivalent episode (no deviation).
		ep1, rel1, ver1 := base+10, base+11, base+12
		seedPhase139Episode(t, pool, ep1, animeID, "01", 1)
		seedPhase139ReleaseVersion(t, pool, rel1, ver1, ep1, groupID, "v1")
		seedPhase139AnimeContribution(t, pool, base+13, animeID, groupID, memberID, &ver1, []string{"encoder"}, nil)

		// Range entry 2: a real deviation (independent + genuinely different role set).
		ep2, rel2, ver2 := base+20, base+21, base+22
		seedPhase139Episode(t, pool, ep2, animeID, "02", 2)
		seedPhase139ReleaseVersion(t, pool, rel2, ver2, ep2, groupID, "v1")
		seedPhase139ReleaseCrewSnapshot(t, pool, ver2, groupID, "independent")
		seedPhase139AnimeContribution(t, pool, base+23, animeID, groupID, memberID, &ver2, []string{"translator"}, nil)
	}
}

// phase139ContributionsQueryBudget is the enforced constant number of SQL queries a single
// ListUserContributions call issues, INDEPENDENT of the seeded project-block count. Update this
// constant ONLY for an intentional, documented loader change (matches Phase 131's own doc-comment
// convention, member_profile_query_budget_test.go).
const phase139ContributionsQueryBudget = 3

// TestPhase139ContributionsQueryBudgetIsConstant is the QUAL-06/D25 constant-query-budget gate
// for ListUserContributions: a load must issue the SAME number of SQL queries regardless of how
// many anime+project blocks (each with several range entries and a real deviation) the user has.
// A regression back to a per-block loop (e.g. resolving each project's standard or filter options
// separately) would grow this count with the seeded block count and fail this test.
func TestPhase139ContributionsQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase139PostgresWithCounter(t)
	ctx := context.Background()

	const fewAppUserID, fewMemberID = int64(139060910001), int64(139060910001)
	const manyAppUserID, manyMemberID = int64(139060920001), int64(139060920001)
	seedPhase139ContributionsBudgetFixture(t, pool, 1, fewAppUserID, fewMemberID, 2)
	seedPhase139ContributionsBudgetFixture(t, pool, 2, manyAppUserID, manyMemberID, 20)

	repo := NewAdminUsersRepository(pool, "")

	counter.reset()
	fewPage, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: fewAppUserID})
	require.NoError(t, err)
	fewCount := counter.count()
	require.Len(t, fewPage.Data, 2, "seed must produce exactly the expected number of project blocks")

	counter.reset()
	manyPage, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: manyAppUserID})
	require.NoError(t, err)
	manyCount := counter.count()
	require.Len(t, manyPage.Data, 20, "seed must produce exactly the expected number of project blocks")

	t.Logf("QUAL-06/D25 contributions budget: 2 blocks -> %d queries; 20 blocks -> %d queries (must be equal and constant).",
		fewCount, manyCount)
	require.Equalf(t, fewCount, manyCount,
		"constant query budget violated: 2-block load issued %d queries but 20-block load issued %d", fewCount, manyCount)
	require.Equalf(t, phase139ContributionsQueryBudget, manyCount,
		"contributions query budget drifted from the enforced constant %d; got %d (update phase139ContributionsQueryBudget only with an intentional, documented loader change)",
		phase139ContributionsQueryBudget, manyCount)
}

// seedPhase139MediaBudgetFixture seeds one legacy uploader user with blockCount distinct
// release-version blocks (all under one anime+group, so the grouping key that varies is
// release_version_id -- exactly the dimension GetUserMedia groups by, D11).
func seedPhase139MediaBudgetFixture(t testing.TB, pool *pgxpool.Pool, userSeed, userID int64, blockCount int) {
	t.Helper()
	seedPhase139LegacyUser(t, pool, userID, fmt.Sprintf("phase139-budget-media-%d", userSeed))
	animeID := int64(139061000000) + userSeed*1_000_000
	groupID := animeID + 1
	seedPhase139Anime(t, pool, animeID, fmt.Sprintf("Phase139 Budget Media Anime %d", userSeed))
	seedPhase139FansubGroup(t, pool, groupID, fmt.Sprintf("Phase139 Budget Media Group %d", userSeed))
	for b := 0; b < blockCount; b++ {
		base := animeID + 100 + int64(b)*10
		epID, relID, verID := base+1, base+2, base+3
		seedPhase139Episode(t, pool, epID, animeID, fmt.Sprintf("%02d", b+1), b+1)
		seedPhase139ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")
		assetID := base + 4
		seedPhase139MediaAsset(t, pool, assetID, testAdminMediaStorageDir+"/budget-"+itoa64(assetID)+".png", "image/png")
		seedPhase139ReleaseVersionMedia(t, pool, base+5, verID, assetID, userID, nil)
	}
}

// phase139MediaQueryBudget is the enforced constant number of SQL queries a single GetUserMedia
// call issues, INDEPENDENT of the seeded release/episode-block count. Update this constant ONLY
// for an intentional, documented loader change.
const phase139MediaQueryBudget = 2

// TestPhase139MediaQueryBudgetIsConstant is the QUAL-06/D25 constant-query-budget gate for
// GetUserMedia: a load must issue the SAME number of SQL queries regardless of how many
// release/episode media blocks the user has uploaded to.
func TestPhase139MediaQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase139PostgresWithCounter(t)
	ctx := context.Background()

	const fewUserID = int64(139061910001)
	const manyUserID = int64(139061920001)
	seedPhase139MediaBudgetFixture(t, pool, 1, fewUserID, 2)
	seedPhase139MediaBudgetFixture(t, pool, 2, manyUserID, 20)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)

	counter.reset()
	fewPage, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: fewUserID})
	require.NoError(t, err)
	fewCount := counter.count()
	require.Len(t, fewPage.Data, 2, "seed must produce exactly the expected number of release/episode blocks")

	counter.reset()
	manyPage, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: manyUserID})
	require.NoError(t, err)
	manyCount := counter.count()
	require.Len(t, manyPage.Data, 20, "seed must produce exactly the expected number of release/episode blocks")

	t.Logf("QUAL-06/D25 media budget: 2 blocks -> %d queries; 20 blocks -> %d queries (must be equal and constant).",
		fewCount, manyCount)
	require.Equalf(t, fewCount, manyCount,
		"constant query budget violated: 2-block load issued %d queries but 20-block load issued %d", fewCount, manyCount)
	require.Equalf(t, phase139MediaQueryBudget, manyCount,
		"media query budget drifted from the enforced constant %d; got %d (update phase139MediaQueryBudget only with an intentional, documented loader change)",
		phase139MediaQueryBudget, manyCount)
}

// seedPhase139RightsSummaryBudgetFixture seeds one app_user with groupCount fansub-group
// memberships (the first carrying a real role, 'fansub_lead', the rest 'translator'), returning
// the seeded fansub_group_ids in seed order.
func seedPhase139RightsSummaryBudgetFixture(t testing.TB, pool *pgxpool.Pool, userSeed, appUserID int64, groupCount int) []int64 {
	t.Helper()
	seedPhase139AppUser(t, pool, appUserID, fmt.Sprintf("phase139-budget-rights-%d", userSeed))
	groupIDs := make([]int64, 0, groupCount)
	for g := 0; g < groupCount; g++ {
		groupID := int64(139062000000) + userSeed*1_000_000 + int64(g)*10
		memberRowID := groupID + 1
		seedPhase139FansubGroup(t, pool, groupID, fmt.Sprintf("Phase139 Budget Rights Group %d-%d", userSeed, g))
		roles := []string{"translator"}
		if g == 0 {
			roles = []string{"fansub_lead"} // a real, normal role holder (distinguished from the deviation case below)
		}
		seedPhase139FansubGroupMember(t, pool, memberRowID, groupID, appUserID, "active", roles)
		groupIDs = append(groupIDs, groupID)
	}
	return groupIDs
}

// buildPhase139RightsSummaryResolutions builds an in-memory GroupRightsResolution per seeded
// group, with the FIRST group carrying a real user_deny override (regression-catching case: a
// per-group resolver loop would still be masked by this fake at the resolver level, but the
// resolver's OWN call-count is separately proven exactly-once by
// admin_users_rights_summary_query_test.go's TestGetUserRightsSummaryBatchesAcrossGroups; this
// helper's job is only to give listUserRightsSummary's OWN SQL round-trips something realistic to
// assemble, per the D25 constant-budget property this test proves) and every other group a plain
// allowed role-holder state.
func buildPhase139RightsSummaryResolutions(groupIDs []int64) map[int64]*permissions.GroupRightsResolution {
	byGroup := make(map[int64]*permissions.GroupRightsResolution, len(groupIDs))
	for i, groupID := range groupIDs {
		rights := map[permissions.Action]permissions.CapabilityRightState{
			permissions.ActionFansubGroupEdit: {ActionCode: permissions.ActionFansubGroupEdit, Allowed: true},
		}
		if i == 0 {
			rights[permissions.ActionReviewTextDecide] = permissions.CapabilityRightState{
				ActionCode: permissions.ActionReviewTextDecide, Allowed: false, UserDeny: true,
			}
		}
		byGroup[groupID] = &permissions.GroupRightsResolution{Rights: rights}
	}
	return byGroup
}

// phase139RightsSummaryQueryBudget is the enforced constant number of SQL queries a single
// GetUserRightsSummary call issues, INDEPENDENT of the seeded group-membership count (the batch
// resolver itself is a fake here with zero SQL cost -- its OWN exactly-once-call property is
// proven separately by admin_users_rights_summary_query_test.go; this constant covers only
// listUserRightsSummary's OWN round-trips: paginated memberships, actor, open-claims, action
// labels, role labels). Update this constant ONLY for an intentional, documented loader change.
const phase139RightsSummaryQueryBudget = 5

// TestPhase139RightsSummaryQueryBudgetIsConstant is the QUAL-06/D25 constant-query-budget gate
// for GetUserRightsSummary: a load must issue the SAME number of SQL queries regardless of how
// many group memberships the user has -- the test this plan's own <action> text calls out as
// catching a regression back to ResolveGroupRights-per-group-in-a-loop, since that anti-pattern's
// query count would scale linearly with group count while this fixed few/many comparison would
// fail (the loop's own per-call cost would show up in listUserRightsSummary's round-trips if it
// ever queried per group instead of delegating the whole batch to the resolver in one call, which
// is exactly what admin_users_rights_summary_query_test.go's TestGetUserRightsSummaryBatchesAcrossGroups
// independently pins at resolver.calls == 1).
func TestPhase139RightsSummaryQueryBudgetIsConstant(t *testing.T) {
	pool, counter := openPhase139PostgresWithCounter(t)
	ctx := context.Background()

	const fewAppUserID = int64(139062910001)
	const manyAppUserID = int64(139062920001)
	fewGroupIDs := seedPhase139RightsSummaryBudgetFixture(t, pool, 1, fewAppUserID, 2)
	manyGroupIDs := seedPhase139RightsSummaryBudgetFixture(t, pool, 2, manyAppUserID, 20)

	repo := NewAdminUsersRepository(pool, "")

	fewResolver := &rightsSummaryFakeResolver{byGroup: buildPhase139RightsSummaryResolutions(fewGroupIDs)}
	counter.reset()
	fewPage, err := repo.GetUserRightsSummary(ctx, fewAppUserID, 25, 0, fewResolver)
	require.NoError(t, err)
	fewCount := counter.count()
	require.Len(t, fewPage.Data, 2, "seed must produce exactly the expected number of group memberships")
	require.Equal(t, 1, fewResolver.calls, "ResolveGroupRightsBatch must be called exactly once regardless of group count")

	manyResolver := &rightsSummaryFakeResolver{byGroup: buildPhase139RightsSummaryResolutions(manyGroupIDs)}
	counter.reset()
	manyPage, err := repo.GetUserRightsSummary(ctx, manyAppUserID, 25, 0, manyResolver)
	require.NoError(t, err)
	manyCount := counter.count()
	require.Len(t, manyPage.Data, 20, "seed must produce exactly the expected number of group memberships")
	require.Equal(t, 1, manyResolver.calls, "ResolveGroupRightsBatch must be called exactly once regardless of group count")

	t.Logf("QUAL-06/D25 rights-summary budget: 2 groups -> %d queries; 20 groups -> %d queries (must be equal and constant).",
		fewCount, manyCount)
	require.Equalf(t, fewCount, manyCount,
		"constant query budget violated: 2-group load issued %d queries but 20-group load issued %d", fewCount, manyCount)
	require.Equalf(t, phase139RightsSummaryQueryBudget, manyCount,
		"rights-summary query budget drifted from the enforced constant %d; got %d (update phase139RightsSummaryQueryBudget only with an intentional, documented loader change)",
		phase139RightsSummaryQueryBudget, manyCount)
}

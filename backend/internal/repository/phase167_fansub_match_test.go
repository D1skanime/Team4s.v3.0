package repository

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// Plan 167-02 (D-08/D-03): unit-level proof, no DB required, that the batch exact-match
// query binds candidates exclusively via unnest($1::text[]) (never string-concatenated)
// and mirrors the production functional-index expression byte-for-byte for both
// fansub_groups.name and fansub_groups.slug (Pitfall 3).
func TestBuildFansubGroupBatchMatchQuery(t *testing.T) {
	sql := buildFansubGroupBatchMatchQuery()

	if !strings.Contains(sql, "unnest($1::text[])") {
		t.Fatalf("expected batch match query to bind candidates via unnest($1::text[]), got:\n%s", sql)
	}
	if !strings.Contains(sql, "regexp_replace(lower(f_unaccent(fansub_groups.name)), '[^a-z0-9]+', '', 'g')") {
		t.Fatalf("expected batch match query to mirror the production functional index expression for fansub_groups.name, got:\n%s", sql)
	}
	if !strings.Contains(sql, "regexp_replace(lower(f_unaccent(fansub_groups.slug)), '[^a-z0-9]+', '', 'g')") {
		t.Fatalf("expected batch match query to mirror the production functional index expression for fansub_groups.slug, got:\n%s", sql)
	}
	for _, forbidden := range []string{"+ candidate", "+ raw_group", "fmt.Sprintf"} {
		if strings.Contains(sql, forbidden) {
			t.Fatalf("batch match query must never string-concatenate candidate values into SQL text, found %q", forbidden)
		}
	}
}

// TestBuildFansubGroupSuggestionQuery proves the fuzzy "did you mean" suggestion query
// (D-03) is a separate, smaller query using trigram similarity, not folded into the
// exact-match path (RESEARCH.md Section 4.1).
func TestBuildFansubGroupSuggestionQuery(t *testing.T) {
	batchSQL := buildFansubGroupBatchMatchQuery()
	suggestionSQL := buildFansubGroupSuggestionQuery()

	if !strings.Contains(suggestionSQL, "f_unaccent(fansub_groups.name) % f_unaccent($1)") {
		t.Fatalf("expected suggestion query to use trigram similarity operator against f_unaccent(name), got:\n%s", suggestionSQL)
	}
	if !strings.Contains(suggestionSQL, "ORDER BY similarity(") || !strings.Contains(suggestionSQL, "DESC") || !strings.Contains(suggestionSQL, "LIMIT") {
		t.Fatalf("expected suggestion query to rank by similarity() DESC with a LIMIT clause, got:\n%s", suggestionSQL)
	}
	if suggestionSQL == batchSQL {
		t.Fatalf("suggestion query must be a textually separate query from the exact-match batch query")
	}
	if strings.Contains(suggestionSQL, "unnest($1::text[])") {
		t.Fatalf("suggestion query must not be folded into the batch exact-match query")
	}
}

// insertPhase167Group seeds a minimal fansub_groups row into the Phase-167 isolated
// fixture and returns its id.
func insertPhase167Group(t *testing.T, pool *pgxpool.Pool, slug, name string) int64 {
	t.Helper()
	var id int64
	require.NoError(t, pool.QueryRow(context.Background(), `
		INSERT INTO fansub_groups (slug, name, status) VALUES ($1, $2, 'active') RETURNING id
	`, slug, name).Scan(&id))
	return id
}

// TestResolveFansubGroupMatches_ExactTiers proves resolveFansubGroupMatches resolves a
// real alias-tier hit, a real name-tier hit (including case/separator variants of the
// same name), a real slug-tier hit, and correctly omits a candidate matching nothing --
// all against a real, isolated Postgres schema (D-10), not a fake-only substitute.
func TestResolveFansubGroupMatches_ExactTiers(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	team4sID := insertPhase167Group(t, pool, "team4s", "Team4s")
	bloodyShadowID := insertPhase167Group(t, pool, "bloody-shadow", "Bloody-Shadow")
	strawhatID := insertPhase167Group(t, pool, "shs-official", "Strawhat Subs")

	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias) VALUES ($1, 'BDnP', 'bdnp')
	`, bloodyShadowID)
	require.NoError(t, err)

	candidates := []string{
		"BDnP",         // alias-tier hit -> Bloody-Shadow
		"team-4s",      // name-tier hit, separator variant -> Team4s
		"Team 4S",      // name-tier hit, case + separator variant -> Team4s
		"shs-official", // slug-tier hit (slug normalizes differently from name) -> Strawhat Subs
		"NoSuchGroup",  // no match anywhere -> absent from result
	}

	matches, err := resolveFansubGroupMatches(ctx, pool, candidates)
	require.NoError(t, err)

	byRaw := make(map[string]struct {
		groupID    int64
		matchedVia string
	}, len(matches))
	for _, m := range matches {
		byRaw[m.RawCandidate] = struct {
			groupID    int64
			matchedVia string
		}{groupID: m.GroupID, matchedVia: m.MatchedVia}
	}

	require.Len(t, matches, 4, "exactly 4 of the 5 candidates must resolve; NoSuchGroup must be absent")

	require.Equal(t, bloodyShadowID, byRaw["BDnP"].groupID)
	require.Equal(t, "alias", byRaw["BDnP"].matchedVia)

	require.Equal(t, team4sID, byRaw["team-4s"].groupID)
	require.Equal(t, "name", byRaw["team-4s"].matchedVia)

	require.Equal(t, team4sID, byRaw["Team 4S"].groupID)
	require.Equal(t, "name", byRaw["Team 4S"].matchedVia)

	require.Equal(t, strawhatID, byRaw["shs-official"].groupID)
	require.Equal(t, "slug", byRaw["shs-official"].matchedVia)

	_, noMatchPresent := byRaw["NoSuchGroup"]
	require.False(t, noMatchPresent, "a candidate matching nothing must produce no row")
}

// openTracedPhase167Pool opens a SECOND *pgxpool.Pool against the same DSN/schema as
// fixturePool (opened via testsupport.OpenPhase167Postgres), with counter wired in as
// its pgx.QueryTracer -- mirrors segment_origin_query_budget_test.go's
// openTracedPoolOnSameSchema pattern. Queries issued through the RETURNED pool are
// counted; seeding queries issued through fixturePool are not.
func openTracedPhase167Pool(t *testing.T, fixturePool *pgxpool.Pool, counter *queryCounter) *pgxpool.Pool {
	t.Helper()

	var schema string
	require.NoError(t, fixturePool.QueryRow(context.Background(), `SELECT current_schema()`).Scan(&schema))

	dsn := os.Getenv("TEAM4S_PHASE167_TEST_DSN")
	require.NotEmpty(t, dsn, "TEAM4S_PHASE167_TEST_DSN must be set once the fixture pool above did not skip")

	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse TEAM4S_PHASE167_TEST_DSN")
	config.ConnConfig.Tracer = counter
	config.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO "+pgx.Identifier{schema}.Sanitize())
		return err
	}

	tracedPool, err := pgxpool.NewWithConfig(context.Background(), config)
	require.NoErrorf(t, err, "open traced pool on schema %q", schema)
	t.Cleanup(tracedPool.Close)

	var effectiveSchemas []string
	require.NoError(t, tracedPool.QueryRow(context.Background(), `SELECT current_schemas(false)`).Scan(&effectiveSchemas))
	require.Equalf(t, []string{schema}, effectiveSchemas,
		"traced pool must be scoped to the exact same isolated schema as the fixture pool")

	return tracedPool
}

// TestResolveFansubGroupMatches_ConstantQueryBudget proves resolveFansubGroupMatches
// issues exactly ONE SQL query regardless of candidate-slice length (D-08/D-20) --
// measured with a 1-element and a 50-element synthetic candidate slice against a real
// Postgres connection, not asserted by code inspection.
func TestResolveFansubGroupMatches_ConstantQueryBudget(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	counter := &queryCounter{}
	tracedPool := openTracedPhase167Pool(t, pool, counter)

	small := []string{"synthetic-candidate-1"}
	large := make([]string, 50)
	for i := range large {
		large[i] = fmt.Sprintf("synthetic-candidate-%d", i)
	}

	counter.reset()
	_, err := resolveFansubGroupMatches(ctx, tracedPool, small)
	require.NoError(t, err)
	smallCount := counter.count()

	counter.reset()
	_, err = resolveFansubGroupMatches(ctx, tracedPool, large)
	require.NoError(t, err)
	largeCount := counter.count()

	t.Logf("D-08/D-20 constant-budget gate: 1 candidate -> %d queries; 50 candidates -> %d queries (must be equal and constant).",
		smallCount, largeCount)

	require.Equalf(t, smallCount, largeCount,
		"constant query budget violated: resolveFansubGroupMatches must not scale with candidate count (small=%d, large=%d)",
		smallCount, largeCount)
	require.Equal(t, 1, smallCount, "resolveFansubGroupMatches must issue exactly one SQL query per call")
}

// TestResolveFansubGroupMatches_UniquenessRespected proves fansub_group_aliases'
// UNIQUE(normalized_alias) constraint (D-01/D-02's enforcement source) is actually live
// and enforced by the schema -- not just assumed -- against a real, isolated Postgres
// database (D-10).
func TestResolveFansubGroupMatches_UniquenessRespected(t *testing.T) {
	pool := testsupport.OpenPhase167Postgres(t)
	ctx := context.Background()

	groupAID := insertPhase167Group(t, pool, "group-a", "Group A")
	groupBID := insertPhase167Group(t, pool, "group-b", "Group B")

	_, err := pool.Exec(ctx, `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias) VALUES ($1, 'DUP', 'dup')
	`, groupAID)
	require.NoError(t, err, "first alias insert must succeed")

	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_group_aliases (fansub_group_id, alias, normalized_alias) VALUES ($1, 'dup', 'dup')
	`, groupBID)
	require.Error(t, err, "a second alias with the same normalized_alias for a DIFFERENT group must be rejected")
	require.True(t, isUniqueViolation(err), "expected a real Postgres unique-violation error (23505), got: %v", err)
}

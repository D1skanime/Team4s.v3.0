package repository

// Plan 156-09 (Requirements P156-16, P156-17): constant-query-budget
// regression gate for loadReleaseSegments' bundled origin+credit load
// (Plan 156-07), proving the Plan-156-07 rewrite issues the SAME number of
// SQL queries whether a release has 1 segment/1-contributor origin or 3
// segments each with a DISTINCT, multi-contributor origin -- no per-segment,
// per-member, per-release, or per-credit N+1 (T-156-17).
//
// Uses the shared queryCounter (query_counter.go) as a pgx.QueryTracer, the
// same pattern Phase-155 already established
// (fansub_project_resolver_query_budget_test.go). Because
// testsupport.OpenPhase117Postgres does not expose the isolated schema name it
// creates (callers only receive a scoped *pgxpool.Pool), this test discovers
// that schema via `SELECT current_schema()` on the fixture pool it already
// opened for seeding, then opens a SECOND pool against the SAME DSN/schema
// with a queryCounter wired in as its Tracer -- no change to testsupport
// itself, no duplicate schema/prerequisite setup, and seeding traffic (issued
// through the untraced fixture pool) is never counted.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset (same convention as
// every other test in this table family).

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// phase156SegmentOriginConstantQueryBudget is the enforced constant number of
// SQL queries a single loadReleaseSegments call issues, INDEPENDENT of how
// many segments the release has, how many contributors each segment's origin
// release version carries, or how many segments have an explicit
// theme_segment_contributors selection: one query for the segment-assignment
// scan (loadReleaseSegments' own SELECT), one bundled query for the origin
// credits (loadPublicEffectiveContributors, called once for the whole
// deduplicated origin set), one bundled query for the explicit segment-
// contributor selection (loadThemeSegmentContributorSelections, called once
// for the whole segment set -- added by Plan 156-13/156-UAT.md GAP-01 so the
// public projection can intersect role-relevance with explicit selection
// instead of showing every role-relevant Origin contributor unconditionally),
// and one bundled query for AppliesThroughEpisode -- observed and pinned
// below. Update this constant ONLY for an intentional, documented loader
// change.
const phase156SegmentOriginConstantQueryBudget = 4

// openTracedPoolOnSameSchema opens a SECOND *pgxpool.Pool against the same DSN
// and the exact isolated schema that fixturePool (opened via
// testsupport.OpenPhase117Postgres) is scoped to, with counter wired in as
// the pool's pgx.QueryTracer. Queries issued through the RETURNED pool are
// counted; seeding queries issued through fixturePool are not.
func openTracedPoolOnSameSchema(t *testing.T, fixturePool *pgxpool.Pool, counter *queryCounter) *pgxpool.Pool {
	t.Helper()

	var schema string
	require.NoError(t, fixturePool.QueryRow(context.Background(), `SELECT current_schema()`).Scan(&schema))

	dsn := os.Getenv("TEAM4S_PHASE117_TEST_DSN")
	require.NotEmpty(t, dsn, "TEAM4S_PHASE117_TEST_DSN must be set once the fixture pool above did not skip")

	config, err := pgxpool.ParseConfig(dsn)
	require.NoErrorf(t, err, "parse TEAM4S_PHASE117_TEST_DSN")
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

// TestLoadReleaseSegmentsQueryBudgetIsConstant proves loadReleaseSegments'
// bundled origin+credit load (Plan 156-07) issues the SAME number of queries
// for a 1-segment/1-contributor release as for a 3-segment release with three
// DISTINCT, multi-contributor origins -- no N+1 as segment/contributor count
// grows (P156-16) -- and pins that count to a named constant so any future
// accidental regression fails loudly (P156-17/T-156-17).
func TestLoadReleaseSegmentsQueryBudgetIsConstant(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()

	// Lokale Fixture-Ergaenzung (nur in dieser Testdatei) fuer die Tabellen, die
	// loadPublicEffectiveContributors braucht -- identisches Muster wie
	// release_detail_public_repository_segment_credits_test.go (Plan 156-07).
	// Plan 156-16: dieser Shim lebt inzwischen auch in testsupport/phase117_postgres.go's
	// createPhase117Prerequisites -- IF NOT EXISTS/ON CONFLICT halten diese lokale Kopie
	// kollisionsfrei.
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS visibilities (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);
		INSERT INTO visibilities (name) VALUES ('public') ON CONFLICT (name) DO NOTHING;

		ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'members_only';
		ALTER TABLE members ADD COLUMN IF NOT EXISTS public_slug TEXT;

		CREATE TABLE IF NOT EXISTS anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL,
			anime_id BIGINT NOT NULL,
			member_id BIGINT NOT NULL REFERENCES members(id),
			release_version_id BIGINT NULL REFERENCES release_versions(id),
			is_public_on_anime_page BOOLEAN NOT NULL DEFAULT false,
			visibility_id BIGINT NULL REFERENCES visibilities(id)
		);

		CREATE TABLE IF NOT EXISTS anime_contribution_roles (
			id BIGSERIAL PRIMARY KEY,
			anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
			role_code TEXT NOT NULL
		);
	`)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO role_definitions (code, label_de) VALUES
			('translator', 'Übersetzung'),
			('timer', 'Timing')
	`)
	require.NoError(t, err)

	const (
		animeID            = int64(1)
		fansubGroupID      = int64(1)
		themeTypeID        = int64(1)
		themeID            = int64(1)
		publicVisibilityID = int64(1)
	)

	_, err = pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id, title) VALUES ($1, $2, $3, 'Budget Theme')`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	nextID := int64(1)
	newReleaseVersion := func(t *testing.T) int64 {
		t.Helper()
		episodeID := nextID
		releaseID := nextID
		releaseVersionID := nextID
		nextID++
		_, err := pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`, episodeID, animeID, episodeID, fmt.Sprintf("%d", episodeID))
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
		require.NoError(t, err)
		return releaseVersionID
	}

	newSegment := func(t *testing.T, originReleaseVersionID int64) int64 {
		t.Helper()
		segmentID := nextID
		nextID++
		_, err := pool.Exec(ctx, `INSERT INTO theme_segments (id, theme_id, origin_release_version_id) VALUES ($1, $2, $3)`, segmentID, themeID, originReleaseVersionID)
		require.NoError(t, err)
		return segmentID
	}

	assignSegment := func(t *testing.T, segmentID, releaseVersionID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)`, segmentID, releaseVersionID)
		require.NoError(t, err)
	}

	newPublicContribution := func(t *testing.T, memberID, originReleaseVersionID int64, roleCode string) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING`, memberID)
		require.NoError(t, err)
		var contributionID int64
		err = pool.QueryRow(ctx, `
			INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
			VALUES ($1, $2, $3, $4, true, $5)
			RETURNING id
		`, fansubGroupID, animeID, memberID, originReleaseVersionID, publicVisibilityID).Scan(&contributionID)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
		require.NoError(t, err)
	}

	// selectSegmentContributor inserts a theme_segment_contributors row (Plan 156-12) --
	// the explicit per-segment selection that Plan 156-13 gates the public projection on.
	selectSegmentContributor := func(t *testing.T, segmentID, memberID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentID, memberID)
		require.NoError(t, err)
	}

	// --- Small scenario: 1 release version, 1 segment, 1 origin with 1
	// contributor, EXPLICITLY selected -- proves the new bundled selection
	// query participates in the scan and yields a matching row. ---
	smallViewedReleaseVersionID := newReleaseVersion(t)
	smallOriginID := newReleaseVersion(t)
	smallSegmentID := newSegment(t, smallOriginID)
	assignSegment(t, smallSegmentID, smallViewedReleaseVersionID)
	smallMemberID := nextID
	nextID++
	newPublicContribution(t, smallMemberID, smallOriginID, "translator")
	selectSegmentContributor(t, smallSegmentID, smallMemberID)

	// --- Large scenario: 1 release version, 3 segments, 3 DISTINCT origins,
	// each origin with 2 contributors. The first two segments explicitly
	// select BOTH their origin's contributors; the third segment selects
	// NEITHER -- proving the bundled selection query participates in the scan
	// regardless of whether it returns any row for a given segment (T-156-27),
	// and that zero selection means zero credits even though the origin has
	// two real, role-relevant contributors (156-UAT.md GAP-01 Case I/J). ---
	largeViewedReleaseVersionID := newReleaseVersion(t)
	for i := 0; i < 3; i++ {
		originID := newReleaseVersion(t)
		segmentID := newSegment(t, originID)
		assignSegment(t, segmentID, largeViewedReleaseVersionID)
		translatorID := nextID
		nextID++
		newPublicContribution(t, translatorID, originID, "translator")
		timerID := nextID
		nextID++
		newPublicContribution(t, timerID, originID, "timer")
		if i < 2 {
			selectSegmentContributor(t, segmentID, translatorID)
			selectSegmentContributor(t, segmentID, timerID)
		}
	}

	counter := &queryCounter{}
	tracedPool := openTracedPoolOnSameSchema(t, pool, counter)
	repo := NewReleaseDetailPublicRepository(tracedPool, "")

	counter.reset()
	smallSegments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, smallViewedReleaseVersionID, "v1", "1", nil)
	require.NoError(t, err)
	require.Len(t, smallSegments, 1, "small scenario must return exactly its one seeded segment")
	require.Len(t, smallSegments[0].Participants, 1, "small scenario's one explicitly selected contributor must resolve")
	smallCount := counter.count()

	counter.reset()
	largeSegments, err := repo.loadReleaseSegments(ctx, animeID, fansubGroupID, largeViewedReleaseVersionID, "v1", "1", nil)
	require.NoError(t, err)
	require.Len(t, largeSegments, 3, "large scenario must return exactly its three seeded segments")
	for i, segment := range largeSegments {
		if i < 2 {
			require.Len(t, segment.Participants, 2, "each fully-selected large-scenario segment must resolve its own origin's 2 explicitly selected contributors")
		} else {
			require.Empty(t, segment.Participants, "the zero-selection large-scenario segment must show zero credits even though its origin has 2 real contributors")
		}
	}
	largeCount := counter.count()

	t.Logf("P156-16 constant-budget gate: 1 segment/1 origin/1 contributor -> %d queries; 3 segments/3 distinct origins/2 contributors each -> %d queries (must be equal and constant).",
		smallCount, largeCount)

	require.Equalf(t, smallCount, largeCount,
		"constant query budget violated: bundled origin+credit load must not scale with segment/contributor count (small=%d, large=%d)",
		smallCount, largeCount)
	require.Equalf(t, phase156SegmentOriginConstantQueryBudget, largeCount,
		"segment origin/credit query budget drifted from the enforced constant %d; got %d (update phase156SegmentOriginConstantQueryBudget only with an intentional, documented loader change)",
		phase156SegmentOriginConstantQueryBudget, largeCount)
}

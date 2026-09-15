package repository

// TestThemeSegmentContributorPreselectionMigration and
// TestThemeSegmentContributorPreselectionSQLGoEquivalence prove migration 0165 (Phase 156, Plan
// 156-18, 156-UAT.md GAP-07) against a real, isolated Postgres instance -- following the exact
// structural precedent of theme_segment_origin_migration_repair_integration_test.go (156-16's own
// SQL/Go equivalence proof): the migration's up.sql content is read via os.ReadFile and EXECUTED
// via pool.Exec, its resulting rows asserted on, never grepped against its own source text (the
// CLAUDE.md Teststil exception for migrations applies here).
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// TestThemeSegmentContributorPreselectionMigrationRoleArrayMatchesGoSlice is the literal half of
// the mandatory SQL/Go equivalence proof: migration 0165's hardcoded SQL array literal
// (`ARRAY['translator','timer','karaoke_fx','typesetter','editor','quality_checker']`) must
// contain EXACTLY the same elements as permissions.SegmentCreditPreselectionRoleCodes's current
// value -- proven by direct element comparison, not asserted by comment alone. Repointed by
// GAP-09 (Plan 156-21, 2026-09-15): permissions.SegmentCreditRoleCodes grew to 8 codes (Plan
// 156-20 added encoder/designer for public credit purposes), so comparing against it here would
// now be wrong (8 vs. 6 elements) -- migration 0165 itself is untouched and still only ever
// preselects the original six codes, which is exactly what
// permissions.SegmentCreditPreselectionRoleCodes represents. The behavioral equivalence (both
// paths landing on the same member-ID set for identical fixtures) is proven separately by
// TestThemeSegmentContributorPreselectionSQLGoEquivalence below.
func TestThemeSegmentContributorPreselectionMigrationRoleArrayMatchesGoSlice(t *testing.T) {
	content, err := os.ReadFile(migration0165Path(t))
	require.NoError(t, err)
	require.Contains(t, string(content),
		"ARRAY['translator','timer','karaoke_fx','typesetter','editor','quality_checker']::text[]",
		"die hartcodierte SQL-Rollenliste muss woertlich vorhanden sein, damit der folgende Elementvergleich das TATSAECHLICH ausgefuehrte Array prueft")
	require.ElementsMatch(t,
		[]string{"translator", "timer", "karaoke_fx", "typesetter", "editor", "quality_checker"},
		permissions.SegmentCreditPreselectionRoleCodes,
		"migration 0165s hartcodiertes SQL-Array muss exakt permissions.SegmentCreditPreselectionRoleCodes entsprechen (GAP-09, Plan 156-21)",
	)
}

// migration0165Path resolves database/migrations/0165_theme_segment_contributor_preselection.up.sql
// relative to this test file, mirroring migration0164Path's precedent.
func migration0165Path(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok, "resolve migration 0165 path")
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", "0165_theme_segment_contributor_preselection.up.sql")
}

// applyMigration0165 reads and executes the migration 0165 up.sql content directly.
func applyMigration0165(t *testing.T, pool *pgxpool.Pool, ctx context.Context) {
	t.Helper()
	content, err := os.ReadFile(migration0165Path(t))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, string(content))
	require.NoError(t, err)
}

func readMigration0165Marker(t *testing.T, pool *pgxpool.Pool, ctx context.Context, segmentID int64) *string {
	t.Helper()
	var marker *string
	require.NoError(t, pool.QueryRow(ctx, `SELECT contributors_initialized_at::text FROM theme_segments WHERE id = $1`, segmentID).Scan(&marker))
	return marker
}

func readMigration0165Contributors(t *testing.T, pool *pgxpool.Pool, ctx context.Context, segmentID int64) []int64 {
	t.Helper()
	rows, err := pool.Query(ctx, `SELECT member_id FROM theme_segment_contributors WHERE theme_segment_id = $1 ORDER BY member_id`, segmentID)
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

// newMigration0165Pool mirrors newPreselectionFixture -- the shared Phase-117 fixture already
// carries anime_contributions/anime_contribution_roles/visibilities/members.profile_visibility
// AND the contributors_initialized_at column (both centralized in createPhase117Prerequisites
// since this plan) -- the migration's own ADD COLUMN IF NOT EXISTS is therefore a true no-op
// re-application when applyMigration0165 runs against this pool, which is exactly what its
// idempotency proof needs.
func newMigration0165Pool(t *testing.T) (*pgxpool.Pool, context.Context) {
	t.Helper()
	pool := testsupport.OpenPhase117Postgres(t)
	return pool, context.Background()
}

type migration0165Scenario struct {
	pool          *pgxpool.Pool
	ctx           context.Context
	nextID        int64
	animeID       int64
	fansubGroupID int64
	themeID       int64
}

func newMigration0165Scenario(t *testing.T) *migration0165Scenario {
	t.Helper()
	pool, ctx := newMigration0165Pool(t)
	s := &migration0165Scenario{pool: pool, ctx: ctx, nextID: 1, animeID: 1, fansubGroupID: 1, themeID: 1}
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, s.animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, s.fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES (1, 'OP1')`)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, 1)`, s.themeID, s.animeID)
	require.NoError(t, err)
	return s
}

func (s *migration0165Scenario) take() int64 {
	id := s.nextID
	s.nextID++
	return id
}

func (s *migration0165Scenario) newReleaseVersion(t *testing.T) int64 {
	t.Helper()
	episodeID := s.take()
	releaseID := s.take()
	releaseVersionID := s.take()
	_, err := s.pool.Exec(s.ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, 'e')`, episodeID, s.animeID, episodeID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, s.fansubGroupID)
	require.NoError(t, err)
	return releaseVersionID
}

func (s *migration0165Scenario) newSegment(t *testing.T, originReleaseVersionID *int64) int64 {
	t.Helper()
	segmentID := s.take()
	_, err := s.pool.Exec(s.ctx, `INSERT INTO theme_segments (id, theme_id, origin_release_version_id) VALUES ($1, $2, $3)`, segmentID, s.themeID, originReleaseVersionID)
	require.NoError(t, err)
	return segmentID
}

func (s *migration0165Scenario) newMember(t *testing.T) int64 {
	t.Helper()
	memberID := s.take()
	_, err := s.pool.Exec(s.ctx, `INSERT INTO members (id) VALUES ($1)`, memberID)
	require.NoError(t, err)
	return memberID
}

func (s *migration0165Scenario) newContribution(t *testing.T, memberID int64, releaseVersionID *int64, fansubGroupID int64, roleCode string) {
	t.Helper()
	const publicVisibilityID = int64(1)
	var contributionID int64
	err := s.pool.QueryRow(s.ctx, `
		INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
		VALUES ($1, $2, $3, $4, true, $5)
		RETURNING id
	`, fansubGroupID, s.animeID, memberID, releaseVersionID, publicVisibilityID).Scan(&contributionID)
	require.NoError(t, err)
	_, err = s.pool.Exec(s.ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, $2)`, contributionID, roleCode)
	require.NoError(t, err)
}

// TestThemeSegmentContributorPreselectionMigration proves migration 0165's core backfill
// behavior: a "previously-empty" segment (valid origin, NULL marker, zero existing selection) is
// preselected and marked; an "already-curated" segment (valid origin, NULL marker, an EXISTING
// selection -- the confirmed live "op" shape) is left byte-identical except for its marker; a
// segment with NULL origin stays fully untouched; and re-applying the SAME up.sql content a
// second time produces zero additional changes.
func TestThemeSegmentContributorPreselectionMigration(t *testing.T) {
	s := newMigration0165Scenario(t)

	// Segment A ("previously-empty" shape): valid origin, NULL marker, zero existing selection.
	// Two translators plus one encoder-only member -- only the translators must be preselected.
	originA := s.newReleaseVersion(t)
	segmentA := s.newSegment(t, &originA)
	translatorA1 := s.newMember(t)
	translatorA2 := s.newMember(t)
	encoderOnlyA := s.newMember(t)
	s.newContribution(t, translatorA1, &originA, s.fansubGroupID, "translator")
	s.newContribution(t, translatorA2, &originA, s.fansubGroupID, "translator")
	s.newContribution(t, encoderOnlyA, &originA, s.fansubGroupID, "encoder")

	// Segment B ("op" shape): valid origin, NULL marker, an EXISTING curated selection -- must
	// stay byte-identical, only the marker changes.
	originB := s.newReleaseVersion(t)
	segmentB := s.newSegment(t, &originB)
	curatedMember := s.newMember(t)
	qcMember := s.newMember(t)
	s.newContribution(t, qcMember, &originB, s.fansubGroupID, "quality_checker")
	_, err := s.pool.Exec(s.ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentB, curatedMember)
	require.NoError(t, err)

	// Segment C: NULL origin, NULL marker -- must stay fully untouched.
	segmentC := s.newSegment(t, nil)

	require.Nil(t, readMigration0165Marker(t, s.pool, s.ctx, segmentA))
	require.Nil(t, readMigration0165Marker(t, s.pool, s.ctx, segmentB))
	require.Nil(t, readMigration0165Marker(t, s.pool, s.ctx, segmentC))

	applyMigration0165(t, s.pool, s.ctx)

	require.NotNil(t, readMigration0165Marker(t, s.pool, s.ctx, segmentA))
	require.ElementsMatch(t, []int64{translatorA1, translatorA2}, readMigration0165Contributors(t, s.pool, s.ctx, segmentA),
		"nur die beiden Uebersetzer werden preselectet, der Encoder-only nie")

	require.NotNil(t, readMigration0165Marker(t, s.pool, s.ctx, segmentB))
	require.Equal(t, []int64{curatedMember}, readMigration0165Contributors(t, s.pool, s.ctx, segmentB),
		"die bereits kuratierte Auswahl bleibt byte-identisch -- nur der Merker aendert sich")

	require.Nil(t, readMigration0165Marker(t, s.pool, s.ctx, segmentC), "ein Segment ohne Origin bleibt vollstaendig unangetastet")
	require.Empty(t, readMigration0165Contributors(t, s.pool, s.ctx, segmentC))

	// Idempotency: capture full state, re-apply the SAME up.sql content, assert zero further
	// changes.
	markerBeforeSecondRun := map[int64]*string{
		segmentA: readMigration0165Marker(t, s.pool, s.ctx, segmentA),
		segmentB: readMigration0165Marker(t, s.pool, s.ctx, segmentB),
		segmentC: readMigration0165Marker(t, s.pool, s.ctx, segmentC),
	}
	contributorsBeforeSecondRun := map[int64][]int64{
		segmentA: readMigration0165Contributors(t, s.pool, s.ctx, segmentA),
		segmentB: readMigration0165Contributors(t, s.pool, s.ctx, segmentB),
		segmentC: readMigration0165Contributors(t, s.pool, s.ctx, segmentC),
	}

	applyMigration0165(t, s.pool, s.ctx)

	for segID, before := range markerBeforeSecondRun {
		after := readMigration0165Marker(t, s.pool, s.ctx, segID)
		if before == nil {
			require.Nil(t, after, "idempotent: Merker darf sich beim zweiten Lauf nicht aendern (segment=%d)", segID)
		} else {
			require.NotNil(t, after)
			require.Equal(t, *before, *after, "idempotent: Merker darf sich beim zweiten Lauf nicht aendern (segment=%d)", segID)
		}
	}
	for segID, before := range contributorsBeforeSecondRun {
		require.Equal(t, before, readMigration0165Contributors(t, s.pool, s.ctx, segID),
			"idempotent: Contributor-Auswahl darf sich beim zweiten Lauf nicht aendern (segment=%d)", segID)
	}
}

// TestThemeSegmentContributorPreselectionSQLGoEquivalence is the mandatory SQL/Go
// rule-equivalence proof (156-18-PLAN.md Task 3): four independently-seeded fixture cases --
// an inherited-anime-default-only member, a member whose fansub group has a release-level
// override replacing the default, two members holding the same segment-relevant role, and an
// encoder-only member excluded from both paths -- land on the EXACT SAME
// theme_segment_contributors member-ID set whether processed via Task 1's
// ensureThemeSegmentContributorsPreselectedTx or via migration 0165's raw SQL.
func TestThemeSegmentContributorPreselectionSQLGoEquivalence(t *testing.T) {
	s := newMigration0165Scenario(t)

	runCase := func(t *testing.T, seed func(t *testing.T, originID int64, fansubGroupID int64)) {
		t.Helper()
		goOrigin := s.newReleaseVersion(t)
		sqlOrigin := s.newReleaseVersion(t)
		goSegment := s.newSegment(t, &goOrigin)
		sqlSegment := s.newSegment(t, &sqlOrigin)

		seed(t, goOrigin, s.fansubGroupID)
		seed(t, sqlOrigin, s.fansubGroupID)

		tx, err := s.pool.Begin(s.ctx)
		require.NoError(t, err)
		_, err = ensureThemeSegmentContributorsPreselectedTx(s.ctx, tx, goSegment, &goOrigin)
		require.NoError(t, err)
		require.NoError(t, tx.Commit(s.ctx))

		applyMigration0165(t, s.pool, s.ctx)

		require.Equal(t,
			readMigration0165Contributors(t, s.pool, s.ctx, goSegment),
			readMigration0165Contributors(t, s.pool, s.ctx, sqlSegment),
			"Go-Pfad und SQL-Pfad muessen bei identischer Origin-Contributor-Form dieselbe Mitglieder-Menge waehlen",
		)
	}

	t.Run("vererbter Anime-Default-Contributor", func(t *testing.T) {
		defaultMember := s.newMember(t)
		runCase(t, func(t *testing.T, originID, fansubGroupID int64) {
			s.newContribution(t, defaultMember, nil, fansubGroupID, "timer")
		})
	})

	t.Run("Gruppen-Override ersetzt den ererbten Default", func(t *testing.T) {
		defaultMember := s.newMember(t)
		overrideMember := s.newMember(t)
		runCase(t, func(t *testing.T, originID, fansubGroupID int64) {
			s.newContribution(t, defaultMember, nil, fansubGroupID, "translator")
			s.newContribution(t, overrideMember, &originID, fansubGroupID, "translator")
		})
	})

	t.Run("zwei Mitglieder mit derselben segment-relevanten Rolle", func(t *testing.T) {
		memberA := s.newMember(t)
		memberB := s.newMember(t)
		runCase(t, func(t *testing.T, originID, fansubGroupID int64) {
			s.newContribution(t, memberA, &originID, fansubGroupID, "translator")
			s.newContribution(t, memberB, &originID, fansubGroupID, "translator")
		})
	})

	t.Run("Encoder-only wird von beiden Pfaden ausgeschlossen", func(t *testing.T) {
		encoderOnly := s.newMember(t)
		runCase(t, func(t *testing.T, originID, fansubGroupID int64) {
			s.newContribution(t, encoderOnly, &originID, fansubGroupID, "encoder")
		})
	})
}

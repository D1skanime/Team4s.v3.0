package repository

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// migration0164Path resolves database/migrations/0164_theme_segment_origin_repair.up.sql
// relative to this test file, mirroring testsupport's phase117MigrationPath.
func migration0164Path(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	require.True(t, ok, "resolve migration 0164 path")
	return filepath.Join(filepath.Clean(filepath.Join(filepath.Dir(filename), "..", "..", "..")), "database", "migrations", "0164_theme_segment_origin_repair.up.sql")
}

// applyMigration0164 reads and executes the migration 0164 up.sql content directly -- the
// CLAUDE.md Teststil exception applies here (the SQL file IS the tested artifact; it is
// EXECUTED against real Postgres and its resulting rows are asserted on below, never grepped
// against its own source text).
func applyMigration0164(t *testing.T, pool *pgxpool.Pool, ctx context.Context) {
	t.Helper()
	content, err := os.ReadFile(migration0164Path(t))
	require.NoError(t, err)
	_, err = pool.Exec(ctx, string(content))
	require.NoError(t, err)
}

// seedMigrationRepairContributorShim mirrors the exact local schema shim used elsewhere in this
// package (theme_segment_origin_integration_test.go's precedent) -- loadPublicEffectiveContributors
// and the migration's own contributor_membership CTE both need these tables.
func seedMigrationRepairContributorShim(t *testing.T, pool *pgxpool.Pool, ctx context.Context) {
	t.Helper()
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
}

func readMigrationRepairOrigin(t *testing.T, pool *pgxpool.Pool, ctx context.Context, segmentID int64) *int64 {
	t.Helper()
	var origin *int64
	require.NoError(t, pool.QueryRow(ctx, `SELECT origin_release_version_id FROM theme_segments WHERE id = $1`, segmentID).Scan(&origin))
	return origin
}

func seedMigrationRepairEpisodeReleaseVersion(t *testing.T, pool *pgxpool.Pool, ctx context.Context, animeID, fansubGroupID, episodeID, releaseID, releaseVersionID int64, episodeNumber string, sortIndex *int) {
	t.Helper()
	_, err := pool.Exec(ctx, `INSERT INTO episodes (id, anime_id, sort_index, episode_number) VALUES ($1, $2, $3, $4)`,
		episodeID, animeID, sortIndex, episodeNumber)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, 'v1')`, releaseVersionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)`, releaseVersionID, fansubGroupID)
	require.NoError(t, err)
}

// TestThemeSegmentOriginMigrationRepair proves migration 0164 repairs the exact proven live
// production shape (156-UAT.md: segment 3's stale origin pointing at a release it is no longer
// assigned to; a segment with a NULL origin despite having assignments) while leaving an
// already-valid segment's origin AND its theme_segment_contributors selection completely
// untouched (T-156-24) -- and that re-applying the SAME up.sql content a second time produces
// zero further changes (idempotent by construction).
func TestThemeSegmentOriginMigrationRepair(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	repo := NewAdminContentRepository(pool)
	seedMigrationRepairContributorShim(t, pool, ctx)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)
	)
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	sortIndex := func(n int) *int { return &n }

	// Segment A ("Segment 3" shape): origin points at rv1, but the segment's actual current
	// assignments are rv2 (episode 2) and rv3 (episode 3) -- rv1 is NOT among them.
	rv1, rv2, rv3 := int64(1001), int64(1002), int64(1003)
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 10010, 10011, rv1, "1", sortIndex(1))
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 10020, 10021, rv2, "2", sortIndex(2))
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 10030, 10031, rv3, "3", sortIndex(3))
	var segmentA int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, origin_release_version_id)
		VALUES ($1, $2, 'v1', 2, 3, $3) RETURNING id
	`, themeID, fansubGroupID, rv1).Scan(&segmentA))
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1,$2), ($1,$3)`, segmentA, rv2, rv3)
	require.NoError(t, err)

	// A stale contributor selection: effective contributor of rv1 (the OLD, invalid origin) but
	// NOT of rv2 (the expected NEW origin) -- must be removed atomically by the repair.
	const staleMemberID = int64(90001)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, staleMemberID)
	require.NoError(t, err)
	var staleContributionID int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
		VALUES ($1, $2, $3, $4, true, 1) RETURNING id
	`, fansubGroupID, animeID, staleMemberID, rv1).Scan(&staleContributionID))
	_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, 'translator')`, staleContributionID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentA, staleMemberID)
	require.NoError(t, err)

	// Segment B ("Segment 4/5" shape): NULL origin despite two current assignments.
	rv4, rv5 := int64(1004), int64(1005)
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 10040, 10041, rv4, "4", sortIndex(4))
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 10050, 10051, rv5, "5", sortIndex(5))
	var segmentB int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
		VALUES ($1, $2, 'v1', 4, 5) RETURNING id
	`, themeID, fansubGroupID).Scan(&segmentB))
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1,$2), ($1,$3)`, segmentB, rv4, rv5)
	require.NoError(t, err)

	// Control segment C: already-valid origin, must remain byte-identical, and its own
	// contributor selection must survive the repair run untouched (T-156-24).
	rv6 := int64(1006)
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 10060, 10061, rv6, "6", sortIndex(6))
	var segmentC int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode, origin_release_version_id)
		VALUES ($1, $2, 'v1', 6, 6, $3) RETURNING id
	`, themeID, fansubGroupID, rv6).Scan(&segmentC))
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1,$2)`, segmentC, rv6)
	require.NoError(t, err)
	const controlMemberID = int64(90002)
	_, err = pool.Exec(ctx, `INSERT INTO members (id) VALUES ($1)`, controlMemberID)
	require.NoError(t, err)
	var controlContributionID int64
	require.NoError(t, pool.QueryRow(ctx, `
		INSERT INTO anime_contributions (fansub_group_id, anime_id, member_id, release_version_id, is_public_on_anime_page, visibility_id)
		VALUES ($1, $2, $3, $4, true, 1) RETURNING id
	`, fansubGroupID, animeID, controlMemberID, rv6).Scan(&controlContributionID))
	_, err = pool.Exec(ctx, `INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, 'translator')`, controlContributionID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_segment_contributors (theme_segment_id, member_id) VALUES ($1, $2)`, segmentC, controlMemberID)
	require.NoError(t, err)

	applyMigration0164(t, pool, ctx)

	require.Equal(t, rv2, *readMigrationRepairOrigin(t, pool, ctx, segmentA), "Segment A muss auf die niedrigste verbleibende Zuweisung (rv2) repariert werden")
	require.Equal(t, rv4, *readMigrationRepairOrigin(t, pool, ctx, segmentB), "Segment B muss die fehlende Origin auf die niedrigste Zuweisung (rv4) erhalten")
	require.Equal(t, rv6, *readMigrationRepairOrigin(t, pool, ctx, segmentC), "Segment C (bereits gueltig) darf unangetastet bleiben")

	idsA, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentA)
	require.NoError(t, err)
	require.Empty(t, idsA, "die jetzt ungueltige Contributor-Auswahl von Segment A muss entfernt sein")

	idsC, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segmentC)
	require.NoError(t, err)
	require.Equal(t, []int64{controlMemberID}, idsC, "Segment Cs gueltige Contributor-Auswahl darf vom Reparaturlauf nicht angefasst werden")

	// Idempotenz: capture full state, re-apply the SAME up.sql content, assert zero further
	// changes.
	stateBeforeSecondRun := map[int64]*int64{
		segmentA: readMigrationRepairOrigin(t, pool, ctx, segmentA),
		segmentB: readMigrationRepairOrigin(t, pool, ctx, segmentB),
		segmentC: readMigrationRepairOrigin(t, pool, ctx, segmentC),
	}
	contributorsBeforeSecondRun := map[int64][]int64{}
	for _, segID := range []int64{segmentA, segmentB, segmentC} {
		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segID)
		require.NoError(t, err)
		contributorsBeforeSecondRun[segID] = ids
	}

	applyMigration0164(t, pool, ctx)

	for segID, before := range stateBeforeSecondRun {
		after := readMigrationRepairOrigin(t, pool, ctx, segID)
		if before == nil {
			require.Nil(t, after, "idempotent: origin darf sich beim zweiten Lauf nicht aendern (segment=%d)", segID)
		} else {
			require.NotNil(t, after)
			require.Equal(t, *before, *after, "idempotent: origin darf sich beim zweiten Lauf nicht aendern (segment=%d)", segID)
		}
	}
	for segID, before := range contributorsBeforeSecondRun {
		ids, err := repo.GetThemeSegmentContributorMemberIDs(ctx, segID)
		require.NoError(t, err)
		require.Equal(t, before, ids, "idempotent: Contributor-Auswahl darf sich beim zweiten Lauf nicht aendern (segment=%d)", segID)
	}
}

// TestThemeSegmentOriginRuleEquivalence is the mandatory SQL/Go rule-equivalence proof (point 8
// of the gap closure spec, 156-16-PLAN.md Task 3): a segment recomputed via Task 1's
// ensureThemeSegmentOriginTx and an independently-seeded segment with an IDENTICAL assignment
// set (the exact same shared release_version_id rows) recomputed via migration 0164's SQL path
// land on the exact same origin_release_version_id -- proven for both the NULLS LAST branch (an
// assignment whose episode is unresolvable) and the release_version_id ASC tiebreaker (two
// assignments resolving to the identical episode number).
func TestThemeSegmentOriginRuleEquivalence(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	ctx := context.Background()
	seedMigrationRepairContributorShim(t, pool, ctx)

	const (
		animeID       = int64(1)
		fansubGroupID = int64(1)
		themeTypeID   = int64(1)
		themeID       = int64(1)
	)
	_, err := pool.Exec(ctx, `INSERT INTO anime (id) VALUES ($1)`, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO fansub_groups (id) VALUES ($1)`, fansubGroupID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO theme_types (id, name) VALUES ($1, 'OP1')`, themeTypeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `INSERT INTO themes (id, anime_id, theme_type_id) VALUES ($1, $2, $3)`, themeID, animeID, themeTypeID)
	require.NoError(t, err)

	newSegment := func(t *testing.T) int64 {
		t.Helper()
		var id int64
		require.NoError(t, pool.QueryRow(ctx, `
			INSERT INTO theme_segments (theme_id, fansub_group_id, version, start_episode, end_episode)
			VALUES ($1, $2, 'v1', 1, 1) RETURNING id
		`, themeID, fansubGroupID).Scan(&id))
		return id
	}
	assign := func(t *testing.T, segmentID, releaseVersionID int64) {
		t.Helper()
		_, err := pool.Exec(ctx, `INSERT INTO theme_segment_assignments (theme_segment_id, release_version_id) VALUES ($1, $2)`, segmentID, releaseVersionID)
		require.NoError(t, err)
	}
	sortIndex := func(n int) *int { return &n }

	// Fixture 1 (NULLS LAST branch): rvResolvable has a numeric sort_index; rvUnresolvable has
	// neither a sort_index nor a numeric episode_number -- COALESCE(...) resolves to NULL, which
	// must sort LAST, not first. Both the Go-path and SQL-path segment are assigned to the SAME
	// two shared release_version_id rows, so a correct implementation on both sides must produce
	// the literal same origin_release_version_id.
	rvResolvable := int64(2001)
	rvUnresolvable := int64(2002)
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 20010, 20011, rvResolvable, "2", sortIndex(2))
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 20020, 20021, rvUnresolvable, "not-a-number", nil)

	goSegmentNulls := newSegment(t)
	assign(t, goSegmentNulls, rvResolvable)
	assign(t, goSegmentNulls, rvUnresolvable)
	sqlSegmentNulls := newSegment(t)
	assign(t, sqlSegmentNulls, rvResolvable)
	assign(t, sqlSegmentNulls, rvUnresolvable)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	goOutcomeNulls, err := ensureThemeSegmentOriginTx(ctx, tx, goSegmentNulls)
	require.NoError(t, err)
	require.NoError(t, tx.Commit(ctx))
	require.NotNil(t, goOutcomeNulls.After)
	require.Equal(t, rvResolvable, *goOutcomeNulls.After, "Go-Pfad muss die aufloesbare Episode waehlen, NULL sortiert zuletzt")

	// Fixture 2 (release_version_id ASC tiebreaker): both assignments resolve to the identical
	// episode number -- the LOWER release_version_id must win. rvTieLow/rvTieHigh are shared
	// between the Go-path and SQL-path segment for the same reason as above.
	rvTieLow := int64(2003)
	rvTieHigh := int64(2004)
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 20030, 20031, rvTieLow, "9", sortIndex(9))
	seedMigrationRepairEpisodeReleaseVersion(t, pool, ctx, animeID, fansubGroupID, 20040, 20041, rvTieHigh, "9", sortIndex(9))

	goSegmentTie := newSegment(t)
	assign(t, goSegmentTie, rvTieHigh)
	assign(t, goSegmentTie, rvTieLow)
	sqlSegmentTie := newSegment(t)
	assign(t, sqlSegmentTie, rvTieHigh)
	assign(t, sqlSegmentTie, rvTieLow)

	tx2, err := pool.Begin(ctx)
	require.NoError(t, err)
	goOutcomeTie, err := ensureThemeSegmentOriginTx(ctx, tx2, goSegmentTie)
	require.NoError(t, err)
	require.NoError(t, tx2.Commit(ctx))
	require.NotNil(t, goOutcomeTie.After)
	require.Equal(t, rvTieLow, *goOutcomeTie.After, "Go-Pfad muss bei gleicher Episode die niedrigere release_version_id waehlen")

	// Now recompute the two SQL-path segments (still NULL origin, never touched by the Go path)
	// via migration 0164's SQL rule.
	applyMigration0164(t, pool, ctx)

	require.Equal(t, *goOutcomeNulls.After, *readMigrationRepairOrigin(t, pool, ctx, sqlSegmentNulls),
		"Go-Pfad und SQL-Pfad muessen bei identischer Zuweisungsmenge (NULLS-LAST-Fall) exakt dieselbe origin_release_version_id waehlen")
	require.Equal(t, *goOutcomeTie.After, *readMigrationRepairOrigin(t, pool, ctx, sqlSegmentTie),
		"Go-Pfad und SQL-Pfad muessen bei identischer Zuweisungsmenge (Tiebreaker-Fall) exakt dieselbe origin_release_version_id waehlen")
}

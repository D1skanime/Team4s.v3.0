package repository

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

func readReleaseCrewSnapshotSource(t *testing.T) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), "release_crew_snapshot_repository.go"))
	if err != nil {
		t.Fatalf("read snapshot repository: %v", err)
	}
	return strings.ToLower(string(content))
}

func TestReleaseCrewSnapshot_NormalizesMemberRoleUnits(t *testing.T) {
	rows := normalizeReleaseCrewRows([]ReleaseCrewRow{
		{MemberID: 2, RoleCodes: []string{"quality_checker", "editor", "quality_checker"}},
		{MemberID: 1, RoleCodes: []string{"translator"}},
		{MemberID: 2, RoleCodes: []string{"editor"}},
	})
	if len(rows) != 2 {
		t.Fatalf("expected two members, got %#v", rows)
	}
	if rows[0].MemberID != 1 || strings.Join(rows[0].RoleCodes, ",") != "translator" {
		t.Fatalf("unexpected first row: %#v", rows[0])
	}
	if rows[1].MemberID != 2 || strings.Join(rows[1].RoleCodes, ",") != "editor,quality_checker" {
		t.Fatalf("unexpected second row: %#v", rows[1])
	}
}

func TestEveryReleaseReadsCompleteStoredSnapshot(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"func (r *releasecrewsnapshotrepository) loadcomplete(",
		"from release_crew_snapshots",
		"ac.status = 'confirmed'",
		"snapshotmodeindependent",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing complete stored snapshot contract %q", fragment)
		}
	}
	if strings.Contains(source, "anime_default") {
		t.Fatal("snapshot repository must not contain project-default read fallback")
	}
}

func TestMissingSnapshotValidatesCanonicalReleaseGroupContext(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"func (r *releasecrewsnapshotrepository) releasecontextexists(",
		"from release_version_groups",
		"release_version_id = $1",
		"fansub_group_id = $2",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing canonical missing-snapshot context check %q", fragment)
		}
	}
}

func TestProjectCrewChangeSyncsInheritedSnapshotsOnly(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"func (r *releasecrewsnapshotrepository) syncinheritedforprojectintx(",
		"rcs.snapshot_mode = 'inherited'",
		"ac.release_version_id is null",
		"ac.status = 'confirmed'",
		"pg_advisory_xact_lock",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing inherited-only synchronization contract %q", fragment)
		}
	}
}

func TestReleaseCrewSnapshot_ConfirmedOnlyReplacementPreservesReviewRows(t *testing.T) {
	source := readReleaseCrewSnapshotSource(t)
	for _, fragment := range []string{
		"delete from anime_contributions",
		"status = 'confirmed'",
		"insert into anime_contributions",
		"'confirmed'",
	} {
		if !strings.Contains(source, fragment) {
			t.Fatalf("missing confirmed-only replacement contract %q", fragment)
		}
	}
	for _, status := range []string{"proposed", "draft", "disputed", "hidden"} {
		if strings.Contains(source, "status = '"+status+"'") {
			t.Fatalf("snapshot mutation must not target %s rows", status)
		}
	}
}

// --- Real-Postgres idempotency regression (176-03 Task 2) ------------------
//
// 176-03's diagnosis (176-03-SUMMARY.md) concluded that the F-05 "9 doppelte
// anime_contributions" finding was a MISCOUNT, not a duplication bug: one
// release-version-scoped row per release version is the intended inherited-
// snapshot architecture, confirmed against the live team4s_v2 database (14
// rows for member 'timer'/anime 1/group 1 == 1 anime-wide row + 13 release
// versions, each carrying its own mirrored row). This test proves the actual
// regression surface D-02 cares about: that re-running the sync (an admin
// adding/confirming project crew, which fans out via SyncInheritedForProjectInTx)
// does NOT grow the row count for an unchanged crew list -- it must replace,
// not accumulate. Runs against the real, disposable Phase-117 Postgres
// fixture (testsupport.OpenPhase117Postgres, the same convention
// admin_content_anime_themes_test.go uses) with this test's own local
// ALTER TABLE/CREATE TABLE additions for the handful of release-crew-specific
// columns/tables the shared fixture does not already carry -- rather than a
// source-text inspection, per CLAUDE.md's Teststil rule. The full-migration-
// chain Phase-139 fixture was deliberately NOT used here: it requires
// unaccent/pg_trgm extension objects to be resolvable through an
// isolated-schema-only search_path, which is an unrelated, pre-existing
// environment gap outside this plan's file scope.
//
// Skips cleanly when TEAM4S_PHASE117_TEST_DSN is unset.

// prepareReleaseCrew176Schema adds the release-crew-specific columns/tables
// that OpenPhase117Postgres's shared minimal anime_contributions fixture does
// not already carry (status, is_public_on_member_profile, created_at/
// updated_at, plus the release_crew_snapshots context table). Scoped to this
// test file only -- it does not touch the shared testsupport fixture.
func prepareReleaseCrew176Schema(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		ALTER TABLE anime_contributions ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';
		ALTER TABLE anime_contributions ADD COLUMN IF NOT EXISTS is_public_on_member_profile BOOLEAN NOT NULL DEFAULT false;
		ALTER TABLE anime_contributions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
		ALTER TABLE anime_contributions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

		CREATE TABLE IF NOT EXISTS release_crew_snapshots (
			release_version_id BIGINT NOT NULL,
			fansub_group_id BIGINT NOT NULL,
			snapshot_mode TEXT NOT NULL CHECK (snapshot_mode IN ('inherited', 'independent')),
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			PRIMARY KEY (release_version_id, fansub_group_id),
			FOREIGN KEY (release_version_id, fansub_group_id)
				REFERENCES release_version_groups(release_version_id, fansub_group_id)
				ON DELETE CASCADE
		);
	`)
	require.NoError(t, err)
}

func seedReleaseCrew176Anime(t testing.TB, pool *pgxpool.Pool, id int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime (id) VALUES ($1) ON CONFLICT (id) DO NOTHING
	`, id)
	require.NoError(t, err)
}

func seedReleaseCrew176FansubGroup(t testing.TB, pool *pgxpool.Pool, id int64, name string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_groups (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, name)
	require.NoError(t, err)
}

func seedReleaseCrew176Member(t testing.TB, pool *pgxpool.Pool, id int64, nickname string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members (id, nickname) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, nickname)
	require.NoError(t, err)
}

// seedReleaseCrew176ReleaseVersion seeds a full fansub_releases -> episodes ->
// release_versions -> release_version_groups chain for one release version.
func seedReleaseCrew176ReleaseVersion(
	t testing.TB, pool *pgxpool.Pool, episodeID, releaseID, versionID, animeID, groupID int64,
) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO episodes (id, anime_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, episodeID, animeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_versions (id, release_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, versionID, releaseID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id)
		VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, versionID, groupID)
	require.NoError(t, err)
}

func seedReleaseCrew176Snapshot(t testing.TB, pool *pgxpool.Pool, versionID, groupID int64, mode string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_crew_snapshots (release_version_id, fansub_group_id, snapshot_mode)
		VALUES ($1, $2, $3)
		ON CONFLICT (release_version_id, fansub_group_id) DO UPDATE SET snapshot_mode = EXCLUDED.snapshot_mode
	`, versionID, groupID, mode)
	require.NoError(t, err)
}

// seedReleaseCrew176ConfirmedProjectMember seeds the anime-wide confirmed
// "project crew" row (release_version_id IS NULL) this plan's diagnosis
// identified as the mirror SOURCE that SyncInheritedForProjectInTx fans out
// into every inherited-mode release version.
func seedReleaseCrew176ConfirmedProjectMember(
	t testing.TB, pool *pgxpool.Pool, id, animeID, groupID, memberID int64, roleCodes []string,
) {
	t.Helper()
	ctx := context.Background()
	_, err := pool.Exec(ctx, `
		INSERT INTO anime_contributions (
			id, fansub_group_id, anime_id, member_id, status,
			is_public_on_anime_page, is_public_on_member_profile, created_at, updated_at
		) VALUES ($1, $2, $3, $4, 'confirmed', true, true, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, id, groupID, animeID, memberID)
	require.NoError(t, err)
	for _, code := range roleCodes {
		_, err := pool.Exec(ctx, `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, id, code)
		require.NoError(t, err)
	}
}

func countReleaseCrew176ConfirmedRows(t testing.TB, pool *pgxpool.Pool, releaseVersionID, groupID int64) int {
	t.Helper()
	var count int
	err := pool.QueryRow(context.Background(), `
		SELECT COUNT(*) FROM anime_contributions
		WHERE release_version_id = $1 AND fansub_group_id = $2 AND status = 'confirmed'
	`, releaseVersionID, groupID).Scan(&count)
	require.NoError(t, err)
	return count
}

// TestReleaseCrewSnapshot_SyncInheritedForProjectInTxIsIdempotentAcrossRepeatedCalls
// proves the DELETE-then-INSERT replace in replaceReleaseCrewInTx is
// idempotent per release_version_id: calling SyncInheritedForProjectInTx
// twice in a row with an unchanged confirmed project crew must leave the
// release-version-scoped row count unchanged (replace semantics), not
// doubled (accumulation bug). Named with the ReleaseCrew prefix so it is
// covered by this plan's verification command (`-run ReleaseCrew`).
func TestReleaseCrewSnapshot_SyncInheritedForProjectInTxIsIdempotentAcrossRepeatedCalls(t *testing.T) {
	pool := testsupport.OpenPhase117Postgres(t)
	prepareReleaseCrew176Schema(t, pool)
	ctx := context.Background()

	const (
		animeID        = int64(176031010)
		groupID        = int64(176031020)
		memberID       = int64(176031030)
		episodeID      = int64(176031040)
		releaseID      = int64(176031050)
		versionID      = int64(176031060)
		contributionID = int64(176031070)
	)

	seedReleaseCrew176Anime(t, pool, animeID)
	seedReleaseCrew176FansubGroup(t, pool, groupID, "176-03-idempotency-group")
	seedReleaseCrew176Member(t, pool, memberID, "176-03-idempotency-member")
	seedReleaseCrew176ReleaseVersion(t, pool, episodeID, releaseID, versionID, animeID, groupID)

	// The anime-wide confirmed "project crew" row this plan's diagnosis
	// identified as the mirror SOURCE (release_version_id IS NULL).
	seedReleaseCrew176ConfirmedProjectMember(t, pool, contributionID, animeID, groupID, memberID, []string{"timer", "project_lead"})

	// SyncInheritedForProjectInTx only touches release_crew_snapshots rows
	// already in 'inherited' mode (see replaceReleaseCrewInTx's doc comment).
	seedReleaseCrew176Snapshot(t, pool, versionID, groupID, SnapshotModeInherited)

	repo := NewReleaseCrewSnapshotRepository(pool)

	_, err := repo.SyncInheritedForProjectInTx(ctx, pool, animeID, groupID)
	require.NoError(t, err)
	firstCount := countReleaseCrew176ConfirmedRows(t, pool, versionID, groupID)
	require.Equal(t, 1, firstCount, "expected exactly one mirrored row after first sync")

	// Re-run with the SAME confirmed project crew (nothing changed) -- this is
	// the exact repeated-admin-action scenario D-02 asked to be ruled out as
	// an accumulation bug.
	_, err = repo.SyncInheritedForProjectInTx(ctx, pool, animeID, groupID)
	require.NoError(t, err)
	secondCount := countReleaseCrew176ConfirmedRows(t, pool, versionID, groupID)
	require.Equal(t, firstCount, secondCount, "row count must not grow across repeated syncs with an unchanged crew")

	_, err = repo.SyncInheritedForProjectInTx(ctx, pool, animeID, groupID)
	require.NoError(t, err)
	thirdCount := countReleaseCrew176ConfirmedRows(t, pool, versionID, groupID)
	require.Equal(t, firstCount, thirdCount, "row count must stay stable across a third repeated sync")
}

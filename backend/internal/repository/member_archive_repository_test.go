package repository

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/testsupport"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// archiveMigrationPath resolves a real database/migrations SQL file relative to this
// test file, mirroring member_point_totals_repository_test.go's own inline
// runtime.Caller pattern (this package has no shared, exported migration-path helper).
func archiveMigrationPath(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve archive migration path")
	}
	return filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations", name)
}

// openMemberArchivePostgres opens the fail-closed Phase-128 fixture and adds the real
// canonical-identity migration (0145, which adds members.public_slug) plus minimal
// stand-in tables mirroring the production shape SearchMembers's visibility-scoped
// query joins through (fansub_groups, hist_fansub_group_members, anime_contributions,
// anime_contribution_roles, media_assets) -- only the columns SearchMembers actually
// reads/joins are included, matching the minimal-stand-in convention already
// established by testsupport's other Phase fixtures (Phase 106/128/137/145).
func openMemberArchivePostgres(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase128Postgres(t)

	testsupport.ApplySQLFile(t, pool, archiveMigrationPath(t, "0145_member_public_identity_visibility.up.sql"))

	_, err := pool.Exec(context.Background(), `
ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_media_id BIGINT;

CREATE TABLE fansub_groups (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE hist_fansub_group_members (
    id BIGSERIAL PRIMARY KEY,
    member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE RESTRICT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'internal'
);

CREATE TABLE anime_contributions (
    id BIGSERIAL PRIMARY KEY,
    fansub_group_member_id BIGINT NOT NULL REFERENCES hist_fansub_group_members(id) ON DELETE RESTRICT,
    is_public_on_member_profile BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_year INT,
    ended_year INT
);

CREATE TABLE anime_contribution_roles (
    id BIGSERIAL PRIMARY KEY,
    anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL
);

CREATE TABLE media_assets (
    id BIGSERIAL PRIMARY KEY,
    file_path TEXT
);`)
	require.NoError(t, err)

	return pool
}

func TestArchiveUsesCanonicalStoredMemberSlug(t *testing.T) {
	pool := openMemberArchivePostgres(t)
	ctx := context.Background()

	// Seed a member whose nickname deliberately diverges from its stored public_slug --
	// if SearchMembers ever fell back to a nickname-derived or numeric-fallback slug,
	// this divergence would surface it. The row is wired through the full visibility
	// chain (public profile, public hist-membership, confirmed public contribution) so
	// it actually reaches SearchMembers's result set.
	_, err := pool.Exec(ctx, `
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (501, 'archive-divergent-nickname', 'Archive Divergent', 'public', 'stable-archive-slug');
INSERT INTO fansub_groups (id, name) VALUES (601, 'Archive Test Group');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (701, 501, 601, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (801, 701, true, 'confirmed');`)
	require.NoError(t, err)

	repo := NewMemberArchiveRepository(pool)
	result, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 1)
	require.NoError(t, err)
	require.Len(t, result.Members, 1, "the seeded, fully public member row must appear in the archive search result")
	require.NotNil(t, result.Members[0].Slug)
	require.Equal(t, "stable-archive-slug", *result.Members[0].Slug,
		"archive projection must return the stored public_slug, not a nickname-derived or generated fallback")

	contentBytes, err := os.ReadFile("member_archive_repository.go")
	if err != nil {
		t.Fatalf("read member_archive_repository.go: %v", err)
	}
	content := strings.ToLower(string(contentBytes))
	for _, forbidden := range []string{"memberslugexpr", "regexp_replace", "coalesce(m.public_slug", "id::text"} {
		if strings.Contains(content, forbidden) {
			t.Fatalf("archive projection must not contain generated or fallback identity fragment %q", forbidden)
		}
	}
}

// TestArchiveVisibilityFilterExcludesNonPublicRows prueft direkt gegen die echte
// SearchMembers-Implementierung, dass genau die Zeile erscheint, die alle vier
// Sichtbarkeits-Bedingungen erfuellt, und jede Zeile ausgeschlossen wird, die genau
// eine der Bedingungen verletzt (m.profile_visibility, hfgm.visibility,
// ac.is_public_on_member_profile, ac.status).
func TestArchiveVisibilityFilterExcludesNonPublicRows(t *testing.T) {
	pool := openMemberArchivePostgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
INSERT INTO fansub_groups (id, name) VALUES (8100, 'Visibility Test Group');

-- Row A: erfuellt alle vier Sichtbarkeits-Bedingungen -- muss im Ergebnis erscheinen.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8101, 'vis-public-ok', 'Visible OK', 'public', 'vis-public-ok');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8201, 8101, 8100, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8301, 8201, true, 'confirmed');

-- Row B: verletzt nur m.profile_visibility.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8102, 'vis-member-private', 'Visible Private', 'private', 'vis-member-private');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8202, 8102, 8100, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8302, 8202, true, 'confirmed');

-- Row C: verletzt nur hfgm.visibility.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8103, 'vis-hfgm-internal', 'Visible HFGM Internal', 'public', 'vis-hfgm-internal');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8203, 8103, 8100, 'internal');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8303, 8203, true, 'confirmed');

-- Row D: verletzt nur ac.is_public_on_member_profile.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8104, 'vis-contrib-notpublic', 'Visible Contrib Not Public', 'public', 'vis-contrib-notpublic');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8204, 8104, 8100, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8304, 8204, false, 'confirmed');

-- Row E: verletzt nur ac.status.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8105, 'vis-contrib-pending', 'Visible Contrib Pending', 'public', 'vis-contrib-pending');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8205, 8105, 8100, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8305, 8205, true, 'pending');
`)
	require.NoError(t, err)

	repo := NewMemberArchiveRepository(pool)
	result, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 1)
	require.NoError(t, err)
	require.Len(t, result.Members, 1,
		"only the row satisfying all four visibility conditions must appear in the archive search result")
	require.Equal(t, int64(8101), result.Members[0].ID,
		"rows violating profile_visibility, hfgm.visibility, is_public_on_member_profile, or status must be excluded")
}

// TestArchivePaginationBounds treibt die echte SearchMembers-Pagination (nicht eine
// Kopie ihrer Klammer-Logik) mit page=0, negativem page und page=1001, um die reale
// Normalisierung/Kappung sowie die Seiten-/Offset-Semantik zu beweisen.
func TestArchivePaginationBounds(t *testing.T) {
	pool := openMemberArchivePostgres(t)
	ctx := context.Background()

	// archivePageSize + 5 Mitglieder: erzwingt eine volle erste Seite und eine
	// teilweise gefuellte zweite Seite, damit die Offset-Semantik wirklich geprueft wird.
	const seedCount = archivePageSize + 5
	const baseMemberID = 8700
	const groupID = 8800

	_, err := pool.Exec(ctx, `INSERT INTO fansub_groups (id, name) VALUES ($1, 'Pagination Test Group')`, groupID)
	require.NoError(t, err)

	for i := 0; i < seedCount; i++ {
		memberID := baseMemberID + i
		hfgmID := 8900 + i
		contribID := 9000 + i
		slug := fmt.Sprintf("page-member-%d", memberID)

		// pgx's simple/extended protocol rejects multiple parameterized commands in a
		// single Exec call ("cannot insert multiple commands into a prepared
		// statement"), unlike the unparameterized multi-statement blocks used
		// elsewhere in this file -- so each seeded row needs three separate Exec calls.
		_, err := pool.Exec(ctx, `
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES ($1, $2, $2, 'public', $2)`, memberID, slug)
		require.NoError(t, err)

		_, err = pool.Exec(ctx, `
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES ($1, $2, $3, 'public')`, hfgmID, memberID, groupID)
		require.NoError(t, err)

		_, err = pool.Exec(ctx, `
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES ($1, $2, true, 'confirmed')`, contribID, hfgmID)
		require.NoError(t, err)
	}

	repo := NewMemberArchiveRepository(pool)

	page1, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 1)
	require.NoError(t, err)
	require.Len(t, page1.Members, archivePageSize, "first page must return a full page of results")
	require.Equal(t, seedCount, page1.Total)

	page2, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 2)
	require.NoError(t, err)
	require.Len(t, page2.Members, seedCount-archivePageSize, "second page must return exactly the remaining rows")

	pageZero, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 0)
	require.NoError(t, err)
	require.Equal(t, page1.Members, pageZero.Members, "page=0 must be normalized to page=1 (offset=0)")

	pageNegative, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, -5)
	require.NoError(t, err)
	require.Equal(t, page1.Members, pageNegative.Members, "a negative page must be normalized to page=1 (offset=0)")

	pageBeyondCeiling, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 1001)
	require.NoError(t, err)
	require.Empty(t, pageBeyondCeiling.Members,
		"page=1001 must be clamped (not passed through as a raw huge offset) and, for this seed size, yield no rows without erroring")
	require.Equal(t, seedCount, pageBeyondCeiling.Total, "total count must be unaffected by page clamping")
}

// TestArchiveRoleFilter treibt die echte RoleCode-EXISTS-Subquery in SearchMembers:
// ein Mitglied mit passender Rolle muss erscheinen, ein Mitglied mit einer anderen
// Rolle (sonst identisch sichtbar) muss ausgeschlossen bleiben.
func TestArchiveRoleFilter(t *testing.T) {
	pool := openMemberArchivePostgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
INSERT INTO fansub_groups (id, name) VALUES (8400, 'Role Filter Test Group');

-- Mitglied mit Rolle 'translator' -- muss bei RoleCode='translator' erscheinen.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8401, 'role-translator', 'Role Translator', 'public', 'role-translator');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8501, 8401, 8400, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8601, 8501, true, 'confirmed');
INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
VALUES (8601, 'translator');

-- Mitglied nur mit Rolle 'editor' -- darf bei RoleCode='translator' NICHT erscheinen.
INSERT INTO members (id, nickname, display_name, profile_visibility, public_slug)
VALUES (8402, 'role-editor', 'Role Editor', 'public', 'role-editor');
INSERT INTO hist_fansub_group_members (id, member_id, fansub_group_id, visibility)
VALUES (8502, 8402, 8400, 'public');
INSERT INTO anime_contributions (id, fansub_group_member_id, is_public_on_member_profile, status)
VALUES (8602, 8502, true, 'confirmed');
INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
VALUES (8602, 'editor');
`)
	require.NoError(t, err)

	repo := NewMemberArchiveRepository(pool)
	result, err := repo.SearchMembers(ctx, ArchiveSearchFilters{RoleCode: "translator"}, 1)
	require.NoError(t, err)
	require.Len(t, result.Members, 1,
		"role filter must return only members with a confirmed, public contribution carrying the requested role_code")
	require.Equal(t, int64(8401), result.Members[0].ID)
	require.Contains(t, result.Members[0].TopRoles, "translator")
}

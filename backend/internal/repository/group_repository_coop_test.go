package repository

// Real-Postgres proof for D-04 (189-01-PLAN.md): getCoopGroups returns only
// fansub groups that share at least one release_version_id with the
// requesting group on this anime, excludes groups whose only connection to
// the anime is a separate, non-overlapping release, and is wired into
// GetGroupReleasesCursor's coop_groups field alongside the pre-existing
// other_groups field. Package repository (not repository_test), same
// convention as group_repository_cursor_timeline_test.go -- direct access to
// the unexported getCoopGroups method.

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// openGroupRepositoryCoopFixture provisions a real, schema-isolated Postgres
// fixture with the release-chain schema getCoopGroups/getOtherGroups need
// (anime/episodes/fansub_releases/release_versions/release_version_groups),
// copied from openAnimeProjectTimelineHandlerFixture
// (admin_content_anime_project_timeline_test.go:26-58), package repository this
// time -- same tables, fresh pool.Exec call, no cross-package symbol reuse.
//
// Test 3 additionally exercises the FULL GetGroupReleasesCursor (not just
// getCoopGroups), which joins far beyond that minimal chain -- media_assets/
// media_files/visibilities/review_statuses (thumbnail + images-count LATERAL
// subqueries), release_variants (duration), release_version_notes
// (notes-count LATERAL subquery), anime_contributions/anime_contribution_roles/
// members (loadPublicEffectiveContributors), and theme_types/themes/
// theme_segments/theme_segment_assignments (attachReleaseTimelineSegments).
// Column names/shapes below were verified against the live team4s_v2 schema
// (`docker compose exec team4sv30-db psql -d team4s_v2 -c "\d <table>"`), then
// trimmed to only the columns the exercised SQL actually touches -- mirrors
// phase182_postgres.go's and phase187_postgres.go's own "trimmed stand-in,
// real column names" convention. Tests 1/2 only use the minimal chain; these
// extra tables stay empty for them (zero rows, no effect).
func openGroupRepositoryCoopFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	_, err := pool.Exec(context.Background(), `
CREATE TABLE anime (
    id BIGINT PRIMARY KEY
);
CREATE TABLE anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    production_started_on DATE,
    production_completed_on DATE,
    PRIMARY KEY (anime_id, fansub_group_id)
);
CREATE TABLE episodes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    episode_number TEXT
);
CREATE TABLE fansub_releases (
    id BIGINT PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id),
    release_date TIMESTAMPTZ
);
ALTER TABLE release_versions
    ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
    ADD COLUMN release_date TIMESTAMPTZ,
    ADD COLUMN version TEXT,
    ADD COLUMN title TEXT;
ALTER TABLE fansub_groups
    ADD COLUMN slug TEXT,
    ADD COLUMN name TEXT,
    ADD COLUMN logo_url TEXT;
ALTER TABLE members
    ADD COLUMN nickname TEXT,
    ADD COLUMN display_name TEXT,
    ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'public',
    ADD COLUMN public_slug TEXT,
    ADD COLUMN avatar_media_id BIGINT;
CREATE TABLE release_version_groups (
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    PRIMARY KEY (release_version_id, fansub_group_id)
);
CREATE TABLE visibilities (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE review_statuses (
    id BIGINT PRIMARY KEY,
    code TEXT NOT NULL
);
CREATE TABLE media_assets (
    id BIGINT PRIMARY KEY,
    file_path TEXT,
    status TEXT NOT NULL DEFAULT 'ready',
    visibility_id BIGINT REFERENCES visibilities(id),
    review_status_id BIGINT REFERENCES review_statuses(id)
);
CREATE TABLE media_files (
    id BIGINT PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id),
    variant TEXT,
    status TEXT NOT NULL DEFAULT 'ready',
    path TEXT
);
CREATE TABLE release_variants (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    duration_seconds INTEGER
);
CREATE TABLE release_version_media (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    media_asset_id BIGINT NOT NULL REFERENCES media_assets(id),
    category TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_preview_candidate BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE release_version_notes (
    id BIGINT PRIMARY KEY,
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
    visibility TEXT NOT NULL DEFAULT 'internal',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL,
    deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE anime_contributions (
    id BIGINT PRIMARY KEY,
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    member_id BIGINT NOT NULL REFERENCES members(id),
    release_version_id BIGINT NULL REFERENCES release_versions(id),
    is_public_on_anime_page BOOLEAN NOT NULL DEFAULT TRUE,
    visibility_id BIGINT NULL REFERENCES visibilities(id)
);
CREATE TABLE anime_contribution_roles (
    id BIGINT PRIMARY KEY,
    anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id),
    role_code TEXT NOT NULL
);
CREATE TABLE theme_types (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    kuerzel TEXT
);
CREATE TABLE themes (
    id BIGINT PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id),
    theme_type_id BIGINT NOT NULL REFERENCES theme_types(id),
    title TEXT
);
CREATE TABLE theme_segments (
    id BIGINT PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes(id),
    fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
    version TEXT,
    start_time TEXT,
    end_time TEXT,
    start_episode INTEGER,
    end_episode INTEGER
);
CREATE TABLE theme_segment_assignments (
    theme_segment_id BIGINT NOT NULL REFERENCES theme_segments(id),
    release_version_id BIGINT NOT NULL REFERENCES release_versions(id)
);`)
	if err != nil {
		t.Fatalf("create group repository coop fixture: %v", err)
	}
	return pool
}

// TestGetCoopGroupsReturnsOnlySharedReleaseGroups is Test 1 (189-01-PLAN.md):
// two groups (A=requesting, B) both attached via release_version_groups to the
// SAME release_version_id on one episode of the anime -> getCoopGroups returns
// exactly [B].
func TestGetCoopGroupsReturnsOnlySharedReleaseGroups(t *testing.T) {
	pool := openGroupRepositoryCoopFixture(t)
	ctx := context.Background()

	const (
		animeID          = int64(1)
		episodeID        = int64(1)
		fansubReleaseID  = int64(1)
		releaseVersionID = int64(1)
		groupA           = int64(1)
		groupB           = int64(2)
	)

	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id) VALUES ($1);
		INSERT INTO fansub_groups (id, slug, name) VALUES
			($2, 'group-a', 'Group A'),
			($3, 'group-b', 'Group B');
		INSERT INTO episodes (id, anime_id) VALUES ($4, $1);
		INSERT INTO fansub_releases (id, episode_id) VALUES ($5, $4);
		INSERT INTO release_versions (id, release_id, version) VALUES ($6, $5, 'v1');
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
			($6, $7),
			($6, $8);
	`, animeID, groupA, groupB, episodeID, fansubReleaseID, releaseVersionID, groupA, groupB)
	require.NoError(t, err)

	repo := NewGroupRepository(pool)
	coopGroups, err := repo.getCoopGroups(ctx, animeID, groupA)
	require.NoError(t, err)
	require.Len(t, coopGroups, 1, "A und B teilen denselben Release -- genau B ist Coop-Partner")
	require.Equal(t, groupB, coopGroups[0].ID)
	require.Equal(t, "Group B", coopGroups[0].Name)
}

// TestGetCoopGroupsExcludesNonOverlappingSameAnimeGroup is Test 2
// (189-01-PLAN.md): group C has its OWN, DIFFERENT release_version_id
// (different episode) on the SAME anime, with NO row sharing a
// release_version_id with A -> getCoopGroups(ctx, animeID, A) returns [], while
// a parallel call to the pre-existing getOtherGroups(ctx, animeID, A) in the
// same test still returns [C] (proves the two sets are NOT the same, closing
// RESEARCH.md Pitfall 4 at the data layer).
func TestGetCoopGroupsExcludesNonOverlappingSameAnimeGroup(t *testing.T) {
	pool := openGroupRepositoryCoopFixture(t)
	ctx := context.Background()

	const (
		animeID           = int64(1)
		episodeAID        = int64(1)
		episodeCID        = int64(2)
		fansubReleaseAID  = int64(1)
		fansubReleaseCID  = int64(2)
		releaseVersionAID = int64(1)
		releaseVersionCID = int64(2)
		groupA            = int64(1)
		groupC            = int64(3)
	)

	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id) VALUES ($1);
		INSERT INTO fansub_groups (id, slug, name) VALUES
			($2, 'group-a', 'Group A'),
			($3, 'group-c', 'Group C');
		INSERT INTO episodes (id, anime_id) VALUES ($4, $1), ($5, $1);
		INSERT INTO fansub_releases (id, episode_id) VALUES ($6, $4), ($7, $5);
		INSERT INTO release_versions (id, release_id, version) VALUES ($8, $6, 'v1'), ($9, $7, 'v1');
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
			($8, $2),
			($9, $3);
	`, animeID, groupA, groupC, episodeAID, episodeCID, fansubReleaseAID, fansubReleaseCID, releaseVersionAID, releaseVersionCID)
	require.NoError(t, err)

	repo := NewGroupRepository(pool)

	coopGroups, err := repo.getCoopGroups(ctx, animeID, groupA)
	require.NoError(t, err)
	require.Empty(t, coopGroups, "C hat keinen gemeinsamen Release mit A -- kein Coop-Partner")

	otherGroups, err := repo.getOtherGroups(ctx, animeID, groupA)
	require.NoError(t, err)
	require.Len(t, otherGroups, 1, "C hat einen eigenen Release zum selben Anime -- bleibt in other_groups")
	require.Equal(t, groupC, otherGroups[0].ID)
}

// TestGetGroupReleasesCursorPopulatesCoopGroupsField is Test 3
// (189-01-PLAN.md): calls the full GetGroupReleasesCursor (not just
// getCoopGroups directly) against the Test-1 fixture and asserts
// page.OtherGroups is non-empty (pre-existing field, sanity) AND
// page.CoopGroups contains exactly group B -- proves the wiring into the
// cursor page, not just the standalone function.
func TestGetGroupReleasesCursorPopulatesCoopGroupsField(t *testing.T) {
	pool := openGroupRepositoryCoopFixture(t)
	ctx := context.Background()

	const (
		animeID          = int64(1)
		episodeID        = int64(1)
		fansubReleaseID  = int64(1)
		releaseVersionID = int64(1)
		groupA           = int64(1)
		groupB           = int64(2)
	)

	_, err := pool.Exec(ctx, `
		INSERT INTO anime (id) VALUES ($1);
		INSERT INTO fansub_groups (id, slug, name) VALUES
			($2, 'group-a', 'Group A'),
			($3, 'group-b', 'Group B');
		INSERT INTO episodes (id, anime_id, episode_number) VALUES ($4, $1, '1');
		INSERT INTO fansub_releases (id, episode_id) VALUES ($5, $4);
		INSERT INTO release_versions (id, release_id, version) VALUES ($6, $5, 'v1');
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES
			($6, $7),
			($6, $8);
	`, animeID, groupA, groupB, episodeID, fansubReleaseID, releaseVersionID, groupA, groupB)
	require.NoError(t, err)

	repo := NewGroupRepository(pool)
	page, err := repo.GetGroupReleasesCursor(ctx, animeID, groupA, models.GroupReleasesFilter{}, "", 20)
	require.NoError(t, err)
	require.NotEmpty(t, page.OtherGroups, "other_groups bleibt wie bisher befuellt (Sanity-Check)")
	require.Len(t, page.CoopGroups, 1, "coop_groups enthaelt genau den echten Coop-Partner")
	require.Equal(t, groupB, page.CoopGroups[0].ID)
}

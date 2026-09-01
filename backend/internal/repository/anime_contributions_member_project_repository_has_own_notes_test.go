package repository

// anime_contributions_member_project_repository_has_own_notes_test.go proves
// Criterion-5 (143-11): listMemberProjectReleaseVersions' has_own_notes EXISTS
// subquery must not count a REJECTED release_version_note as "done", must
// still count a note with no review lifecycle row at all, and must keep
// excluding a tombstoned note via the pre-existing deleted_at IS NULL clause
// (no new special-casing).
//
// Uses testsupport.OpenPhase107Postgres + a hand-assembled minimal schema
// (mirroring release_review_query_repository_test.go's openReleaseReviewQuery
// Fixture), NOT testsupport.OpenPhase139Postgres's full real migration chain:
// the full chain's migration 0152 (f_unaccent_search_path_fix) hardcodes an
// unqualified "public.unaccent" dictionary reference that cannot resolve
// inside OpenPhase139Postgres's isolated, non-"public" per-test schema (a
// pre-existing infra gap, out of this plan's scope -- confirmed reproducible
// against the already-provisioned team4s_phase139_test_r03 fixture database
// during this plan's own execution). The hand-assembled schema below carries
// only the tables/columns listMemberProjectReleaseVersions and
// GetMemberProjectDetail's header query actually touch.

import (
	"context"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// openMemberProjectHasOwnNotesFixture opens an isolated Phase-107 schema and
// creates the minimal table set listMemberProjectReleaseVersions/
// GetMemberProjectDetail query, applying the real 0131-0133 migrations
// OpenPhase107Postgres already provides plus 0135's real lifecycle-table DDL.
func openMemberProjectHasOwnNotesFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := testsupport.OpenPhase107Postgres(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		CREATE TABLE anime (
			id BIGINT PRIMARY KEY, title TEXT, title_de TEXT, title_en TEXT
		);
		ALTER TABLE fansub_groups ADD COLUMN name TEXT;
		CREATE TABLE episodes (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			episode_number TEXT NOT NULL, title TEXT, sort_index INT
		);
		CREATE TABLE fansub_releases (
			id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id)
		);
		ALTER TABLE release_versions
			ADD COLUMN release_id BIGINT REFERENCES fansub_releases(id),
			ADD COLUMN version TEXT NOT NULL DEFAULT 'v1',
			ADD COLUMN title TEXT;
		CREATE TABLE release_version_groups (
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			PRIMARY KEY (release_version_id, fansub_group_id)
		);
		CREATE TABLE hist_fansub_group_members (
			id BIGINT PRIMARY KEY, member_id BIGINT REFERENCES members(id)
		);
		CREATE TABLE anime_contributions (
			id BIGINT PRIMARY KEY,
			fansub_group_id BIGINT NOT NULL REFERENCES fansub_groups(id),
			anime_id BIGINT NOT NULL REFERENCES anime(id),
			member_id BIGINT NULL REFERENCES members(id),
			fansub_group_member_id BIGINT NULL REFERENCES hist_fansub_group_members(id),
			release_version_id BIGINT NULL REFERENCES release_versions(id),
			status TEXT NOT NULL DEFAULT 'draft'
		);
		CREATE TABLE anime_contribution_roles (
			anime_contribution_id BIGINT NOT NULL REFERENCES anime_contributions(id),
			role_code TEXT NOT NULL,
			PRIMARY KEY (anime_contribution_id, role_code)
		);
		CREATE TABLE contributor_roles (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE release_version_notes (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			member_id BIGINT NOT NULL REFERENCES members(id),
			role_id BIGINT NOT NULL REFERENCES contributor_roles(id),
			title TEXT, body_markdown TEXT NOT NULL DEFAULT '', body_html TEXT NOT NULL DEFAULT '',
			deleted_at TIMESTAMPTZ
		);
		CREATE TABLE media_types (id BIGINT PRIMARY KEY, name TEXT NOT NULL);
		CREATE TABLE media_assets (
			id BIGINT PRIMARY KEY, media_type_id BIGINT REFERENCES media_types(id), file_path TEXT
		);
		CREATE TABLE media_files (
			id BIGINT PRIMARY KEY, media_id BIGINT NOT NULL REFERENCES media_assets(id),
			variant TEXT NOT NULL, path TEXT NOT NULL
		);
		CREATE TABLE anime_media (
			id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id),
			media_id BIGINT NOT NULL REFERENCES media_assets(id), sort_order INT NOT NULL DEFAULT 0
		);
		CREATE TABLE release_version_media (
			id BIGINT PRIMARY KEY,
			release_version_id BIGINT NOT NULL REFERENCES release_versions(id),
			uploaded_by_user_id BIGINT REFERENCES app_users(id),
			deleted_at TIMESTAMPTZ
		);
	`)
	require.NoError(t, err)

	_, file, _, ok := runtime.Caller(0)
	require.True(t, ok)
	migrations := filepath.Join(filepath.Dir(file), "..", "..", "..", "database", "migrations")
	testsupport.ApplySQLFile(t, pool, filepath.Join(migrations, "0135_release_review_lifecycle.up.sql"))

	return pool
}

// --- Seed helpers -----------------------------------------------------------

func seedPhase143Anime(t testing.TB, pool *pgxpool.Pool, id int64, title string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime (id, title) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, title)
	require.NoError(t, err)
}

func seedPhase143FansubGroup(t testing.TB, pool *pgxpool.Pool, id int64, name string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_groups (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, name)
	require.NoError(t, err)
}

func seedPhase143Member(t testing.TB, pool *pgxpool.Pool, id int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members (id) VALUES ($1) ON CONFLICT (id) DO NOTHING
	`, id)
	require.NoError(t, err)
}

func seedPhase143AppUser(t testing.TB, pool *pgxpool.Pool, id int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO app_users (id, status) VALUES ($1, 'active') ON CONFLICT (id) DO NOTHING
	`, id)
	require.NoError(t, err)
}

func seedPhase143Episode(t testing.TB, pool *pgxpool.Pool, id, animeID int64, episodeNumber string, sortIndex int) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO episodes (id, anime_id, episode_number, sort_index)
		VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING
	`, id, animeID, episodeNumber, sortIndex)
	require.NoError(t, err)
}

// seedPhase143ReleaseVersion seeds a full fansub_releases -> release_versions
// -> release_version_groups chain for one episode.
func seedPhase143ReleaseVersion(t testing.TB, pool *pgxpool.Pool, releaseID, versionID, episodeID, groupID int64, versionLabel string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING
	`, versionID, releaseID, versionLabel)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING
	`, versionID, groupID)
	require.NoError(t, err)
}

// seedPhase143ConfirmedProjectContribution seeds a confirmed, project-wide
// (release_version_id IS NULL) anime_contributions row. listMemberProjectRelease
// Versions' `JOIN own_roles ON true` is a hard requirement -- without at least
// one confirmed project-wide contribution row, GetMemberProjectDetail returns
// ErrNotFound instead of a project row to assert has_own_notes against.
func seedPhase143ConfirmedProjectContribution(t testing.TB, pool *pgxpool.Pool, id, animeID, groupID, memberID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, release_version_id, status)
		VALUES ($1, $2, $3, $4, NULL, 'confirmed') ON CONFLICT (id) DO NOTHING
	`, id, groupID, animeID, memberID)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, 'translator')
		ON CONFLICT DO NOTHING
	`, id)
	require.NoError(t, err)
}

// seedPhase143ContributorRole seeds one contributor_roles row --
// release_version_notes.role_id's FK target.
func seedPhase143ContributorRole(t testing.TB, pool *pgxpool.Pool, id int64, name string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO contributor_roles (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING
	`, id, name)
	require.NoError(t, err)
}

// seedPhase143ReleaseVersionNote seeds one release_version_notes row.
func seedPhase143ReleaseVersionNote(t testing.TB, pool *pgxpool.Pool, id, releaseVersionID, memberID, roleID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_version_notes (id, release_version_id, member_id, role_id, body_markdown, body_html)
		VALUES ($1, $2, $3, $4, '', '') ON CONFLICT (id) DO NOTHING
	`, id, releaseVersionID, memberID, roleID)
	require.NoError(t, err)
}

// seedPhase143NoteReviewLifecycle seeds a release_version_note_review_lifecycle
// row for noteID with the given review_state (pending/confirmed/rejected).
func seedPhase143NoteReviewLifecycle(t testing.TB, pool *pgxpool.Pool, noteID, submitterAppUserID, submitterMemberID int64, reviewState string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_version_note_review_lifecycle
			(release_version_note_id, source_revision, review_state,
			 submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at)
		VALUES ($1, 1, $2, $3, $4, NOW(), NOW()) ON CONFLICT (release_version_note_id) DO NOTHING
	`, noteID, reviewState, submitterAppUserID, submitterMemberID)
	require.NoError(t, err)
}

// --- Tests -------------------------------------------------------------------

// TestGetMemberProjectDetailHasOwnNotesExcludesRejectedNote: a release whose
// only note was reviewed and rejected must not count as "done".
func TestGetMemberProjectDetailHasOwnNotesExcludesRejectedNote(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(111001), int64(111002)
	const animeID, groupID = int64(111010), int64(111020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "Phase143 Rejected Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "Phase143 Rejected Note Group")
	seedPhase143ConfirmedProjectContribution(t, pool, 111030, animeID, groupID, memberID)

	epID, relID, verID := int64(111040), int64(111041), int64(111042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	roleID := int64(111060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(111050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	seedPhase143NoteReviewLifecycle(t, pool, noteID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, memberID, appUserID, animeID, groupID)
	require.NoError(t, err)
	require.Len(t, detail.ReleaseVersions, 1)
	require.False(t, detail.ReleaseVersions[0].HasOwnNotes, "a rejected-only note must not count as has_own_notes")
}

// TestGetMemberProjectDetailHasOwnNotesIncludesNoLifecycleNote: a release
// whose only note never entered review (no lifecycle row at all) must still
// count as "done".
func TestGetMemberProjectDetailHasOwnNotesIncludesNoLifecycleNote(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(112001), int64(112002)
	const animeID, groupID = int64(112010), int64(112020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "Phase143 No Lifecycle Anime")
	seedPhase143FansubGroup(t, pool, groupID, "Phase143 No Lifecycle Group")
	seedPhase143ConfirmedProjectContribution(t, pool, 112030, animeID, groupID, memberID)

	epID, relID, verID := int64(112040), int64(112041), int64(112042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	roleID := int64(112060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(112050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	// Deliberately no lifecycle row -- the note never entered review.

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, memberID, appUserID, animeID, groupID)
	require.NoError(t, err)
	require.Len(t, detail.ReleaseVersions, 1)
	require.True(t, detail.ReleaseVersions[0].HasOwnNotes, "a note that never entered review must still count as has_own_notes")
}

// TestGetMemberProjectDetailHasOwnNotesExcludesTombstonedNote is a regression
// guard, not a behavior change: a tombstoned note (deleted_at set by
// release_review_cleanup_repository.go's tombstone path) must stay excluded
// via the pre-existing rvn.deleted_at IS NULL clause, with no new
// tombstone-specific filter added.
func TestGetMemberProjectDetailHasOwnNotesExcludesTombstonedNote(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(113001), int64(113002)
	const animeID, groupID = int64(113010), int64(113020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "Phase143 Tombstoned Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "Phase143 Tombstoned Note Group")
	seedPhase143ConfirmedProjectContribution(t, pool, 113030, animeID, groupID, memberID)

	epID, relID, verID := int64(113040), int64(113041), int64(113042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	roleID := int64(113060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(113050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	seedPhase143NoteReviewLifecycle(t, pool, noteID, appUserID, memberID, "rejected")

	// Mirror release_review_cleanup_repository.go's tombstone shape exactly:
	// deleted_at set on the note, review_state='tombstoned' + tombstoned_at set
	// on the lifecycle row (the CHECK constraint requires both together).
	_, err := pool.Exec(ctx, `UPDATE release_version_notes SET deleted_at = NOW() WHERE id = $1`, noteID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		UPDATE release_version_note_review_lifecycle
		SET review_state = 'tombstoned', tombstoned_at = NOW()
		WHERE release_version_note_id = $1
	`, noteID)
	require.NoError(t, err)

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, memberID, appUserID, animeID, groupID)
	require.NoError(t, err)
	require.Len(t, detail.ReleaseVersions, 1)
	require.False(t, detail.ReleaseVersions[0].HasOwnNotes, "a tombstoned note must remain excluded via the existing deleted_at IS NULL clause")
}

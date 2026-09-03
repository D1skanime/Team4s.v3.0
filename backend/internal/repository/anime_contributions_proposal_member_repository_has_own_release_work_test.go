package repository

// anime_contributions_proposal_member_repository_has_own_release_work_test.go
// proves quick task 260903-czh: ListByMemberIDWithProposalFields's
// has_own_release_work CASE expression must not count a REJECTED release
// version note/media row as "own work done", mirroring the already-correct
// has_own_notes/has_own_media fix in the sibling query
// listMemberProjectReleaseVersions (anime_contributions_member_project_repository.go).
//
// Reuses openMemberProjectHasOwnNotesFixture and the existing
// seedPhase143Member/AppUser/Anime/FansubGroup/Episode/ReleaseVersion/
// ContributorRole/ReleaseVersionNote/NoteReviewLifecycle/ReleaseVersionMedia/
// MediaReviewLifecycle helpers from the sibling has_own_notes/has_own_media
// test files (same package, no import needed). Only one new local seed
// helper is added here: a RELEASE-SCOPED anime_contributions row
// (release_version_id NOT NULL), which seedPhase143ConfirmedProjectContribution
// does not produce (it seeds a project-wide row with release_version_id NULL).

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// openHasOwnReleaseWorkFixture opens the shared has-own-notes fixture and
// additively widens its minimal anime_contributions table with the
// remaining production columns (note/started_year/ended_year/
// is_public_on_anime_page/is_public_on_member_profile/confirmed_by/
// confirmed_at/created_by/created_at/updated_by/updated_at) that
// ListByMemberIDWithProposalFields selects via animeContributionSelectCols
// but listMemberProjectReleaseVersions/GetMemberProjectDetail never touch --
// mirroring migration 0086_anime_contributions.up.sql's real column shapes.
func openHasOwnReleaseWorkFixture(t *testing.T) *pgxpool.Pool {
	t.Helper()
	pool := openMemberProjectHasOwnNotesFixture(t)
	_, err := pool.Exec(context.Background(), `
		ALTER TABLE anime_contributions
			ADD COLUMN note TEXT NULL,
			ADD COLUMN started_year INT NULL,
			ADD COLUMN ended_year INT NULL,
			ADD COLUMN is_public_on_anime_page BOOLEAN NOT NULL DEFAULT false,
			ADD COLUMN is_public_on_member_profile BOOLEAN NOT NULL DEFAULT false,
			ADD COLUMN confirmed_by BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
			ADD COLUMN confirmed_at TIMESTAMPTZ NULL,
			ADD COLUMN created_by BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
			ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			ADD COLUMN updated_by BIGINT NULL REFERENCES app_users(id) ON DELETE SET NULL,
			ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	`)
	require.NoError(t, err)
	return pool
}

// seedPhase143ReleaseScopedContribution seeds a confirmed, release-scoped
// (release_version_id NOT NULL) anime_contributions row plus one role, so
// ListByMemberIDWithProposalFields's has_own_release_work CASE expression
// (which returns false unconditionally when ac.release_version_id IS NULL)
// actually evaluates its EXISTS subqueries.
func seedPhase143ReleaseScopedContribution(t testing.TB, pool *pgxpool.Pool, id, animeID, groupID, memberID, releaseVersionID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, release_version_id, status)
		VALUES ($1, $2, $3, $4, $5, 'confirmed') ON CONFLICT (id) DO NOTHING
	`, id, groupID, animeID, memberID, releaseVersionID)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO anime_contribution_roles (anime_contribution_id, role_code) VALUES ($1, 'translator')
		ON CONFLICT DO NOTHING
	`, id)
	require.NoError(t, err)
}

// findHasOwnReleaseWork locates the seeded contribution row by ID in the
// result set and returns its HasOwnReleaseWork field.
func findHasOwnReleaseWork(t testing.TB, rows []MemberContributionWithProposalRow, contributionID int64) bool {
	t.Helper()
	for _, row := range rows {
		if row.ID == contributionID {
			return row.HasOwnReleaseWork
		}
	}
	t.Fatalf("contribution %d not found in ListByMemberIDWithProposalFields result", contributionID)
	return false
}

// TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkExcludesRejectedNote:
// a release-scoped contribution whose only own note was reviewed and
// rejected must report has_own_release_work=false.
func TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkExcludesRejectedNote(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(120001), int64(120002)
	const animeID, groupID = int64(120010), int64(120020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QCZH Rejected Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QCZH Rejected Note Group")

	epID, relID, verID := int64(120040), int64(120041), int64(120042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(120030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	roleID := int64(120060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(120050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	seedPhase143NoteReviewLifecycle(t, pool, noteID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	require.False(t, findHasOwnReleaseWork(t, rows, contributionID), "a rejected-only note must not count as has_own_release_work")
}

// TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkIncludesPendingNote:
// a release-scoped contribution whose only own note has no lifecycle row
// (never entered review, i.e. pending) must still report
// has_own_release_work=true.
func TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkIncludesPendingNote(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(121001), int64(121002)
	const animeID, groupID = int64(121010), int64(121020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QCZH Pending Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QCZH Pending Note Group")

	epID, relID, verID := int64(121040), int64(121041), int64(121042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(121030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	roleID := int64(121060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(121050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	// Deliberately no lifecycle row -- the note never entered review (pending).

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	require.True(t, findHasOwnReleaseWork(t, rows, contributionID), "a pending/no-lifecycle note must still count as has_own_release_work")
}

// TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkExcludesRejectedMedia:
// a release-scoped contribution whose only own media row was reviewed and
// rejected must report has_own_release_work=false.
func TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkExcludesRejectedMedia(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(122001), int64(122002)
	const animeID, groupID = int64(122010), int64(122020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QCZH Rejected Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QCZH Rejected Media Group")

	epID, relID, verID := int64(122040), int64(122041), int64(122042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(122030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	mediaID := int64(122050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	require.False(t, findHasOwnReleaseWork(t, rows, contributionID), "a rejected-only media row must not count as has_own_release_work")
}

// TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkIncludesConfirmedMedia:
// a release-scoped contribution whose only own media row was reviewed and
// confirmed must report has_own_release_work=true.
func TestListByMemberIDWithProposalFieldsHasOwnReleaseWorkIncludesConfirmedMedia(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(123001), int64(123002)
	const animeID, groupID = int64(123010), int64(123020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QCZH Confirmed Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QCZH Confirmed Media Group")

	epID, relID, verID := int64(123040), int64(123041), int64(123042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(123030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	mediaID := int64(123050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "confirmed")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	require.True(t, findHasOwnReleaseWork(t, rows, contributionID), "a confirmed media row must count as has_own_release_work")
}

package repository

// anime_contributions_proposal_member_repository_has_own_rejected_test.go
// proves quick task 260903-dth: ListByMemberIDWithProposalFields must expose
// per-contribution has_own_rejected_notes/has_own_rejected_media signals so
// the dashboard can surface "Überarbeitung nötig" even when other own work
// on the same release version is confirmed (so has_own_release_work stays
// true and the item would otherwise vanish from the "Achtung" section).
//
// Mirrors the already-shipped EXISTS pattern in
// anime_contributions_member_project_repository.go's
// listMemberProjectReleaseVersions (has_own_rejected_notes/has_own_rejected_media),
// scoped here to ac.release_version_id via the same
// openHasOwnReleaseWorkFixture/seedPhase143ReleaseScopedContribution helpers
// used by the sibling has_own_release_work test file (same package, no
// import needed).

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// findHasOwnRejectedFlags locates the seeded contribution row by ID in the
// result set and returns its HasOwnRejectedNotes/HasOwnRejectedMedia (plus
// HasOwnReleaseWork, needed by the combined scenario test) fields.
func findHasOwnRejectedFlags(t testing.TB, rows []MemberContributionWithProposalRow, contributionID int64) MemberContributionWithProposalRow {
	t.Helper()
	for _, row := range rows {
		if row.ID == contributionID {
			return row
		}
	}
	t.Fatalf("contribution %d not found in ListByMemberIDWithProposalFields result", contributionID)
	return MemberContributionWithProposalRow{}
}

// Test 1: only own release-version note exists, lifecycle review_state='rejected'
// -> HasOwnRejectedNotes must be true, HasOwnRejectedMedia must be false.
func TestListByMemberIDWithProposalFieldsHasOwnRejectedNotesTrueForRejectedNote(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(124001), int64(124002)
	const animeID, groupID = int64(124010), int64(124020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QDTH Rejected Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QDTH Rejected Note Group")

	epID, relID, verID := int64(124040), int64(124041), int64(124042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(124030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	roleID := int64(124060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(124050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	seedPhase143NoteReviewLifecycle(t, pool, noteID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	row := findHasOwnRejectedFlags(t, rows, contributionID)
	require.True(t, row.HasOwnRejectedNotes, "a rejected note must set has_own_rejected_notes=true")
	require.False(t, row.HasOwnRejectedMedia, "no media exists, has_own_rejected_media must stay false")
}

// Test 2: only own release-version note exists, lifecycle review_state='confirmed'
// -> HasOwnRejectedNotes must be false.
func TestListByMemberIDWithProposalFieldsHasOwnRejectedNotesFalseForConfirmedNote(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(125001), int64(125002)
	const animeID, groupID = int64(125010), int64(125020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QDTH Confirmed Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QDTH Confirmed Note Group")

	epID, relID, verID := int64(125040), int64(125041), int64(125042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(125030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	roleID := int64(125060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(125050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	seedPhase143NoteReviewLifecycle(t, pool, noteID, appUserID, memberID, "confirmed")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	row := findHasOwnRejectedFlags(t, rows, contributionID)
	require.False(t, row.HasOwnRejectedNotes, "a confirmed note must not set has_own_rejected_notes")
}

// Test 3: only own release-version note exists, no lifecycle row at all (pending)
// -> HasOwnRejectedNotes must be false.
func TestListByMemberIDWithProposalFieldsHasOwnRejectedNotesFalseForPendingNote(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(126001), int64(126002)
	const animeID, groupID = int64(126010), int64(126020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QDTH Pending Note Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QDTH Pending Note Group")

	epID, relID, verID := int64(126040), int64(126041), int64(126042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(126030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	roleID := int64(126060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(126050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	// Deliberately no lifecycle row -- the note never entered review (pending).

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	row := findHasOwnRejectedFlags(t, rows, contributionID)
	require.False(t, row.HasOwnRejectedNotes, "a pending/no-lifecycle note must not set has_own_rejected_notes")
}

// Test 4: only own release-version media exists, lifecycle review_state='rejected'
// -> HasOwnRejectedMedia must be true, HasOwnRejectedNotes must be false.
func TestListByMemberIDWithProposalFieldsHasOwnRejectedMediaTrueForRejectedMedia(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(127001), int64(127002)
	const animeID, groupID = int64(127010), int64(127020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QDTH Rejected Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QDTH Rejected Media Group")

	epID, relID, verID := int64(127040), int64(127041), int64(127042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(127030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	mediaID := int64(127050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	row := findHasOwnRejectedFlags(t, rows, contributionID)
	require.True(t, row.HasOwnRejectedMedia, "a rejected media row must set has_own_rejected_media=true")
	require.False(t, row.HasOwnRejectedNotes, "no note exists, has_own_rejected_notes must stay false")
}

// Test 5: only own release-version media exists, lifecycle review_state='confirmed'
// -> HasOwnRejectedMedia must be false.
func TestListByMemberIDWithProposalFieldsHasOwnRejectedMediaFalseForConfirmedMedia(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(128001), int64(128002)
	const animeID, groupID = int64(128010), int64(128020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QDTH Confirmed Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QDTH Confirmed Media Group")

	epID, relID, verID := int64(128040), int64(128041), int64(128042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(128030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	mediaID := int64(128050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "confirmed")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	row := findHasOwnRejectedFlags(t, rows, contributionID)
	require.False(t, row.HasOwnRejectedMedia, "a confirmed media row must not set has_own_rejected_media")
}

// Test 6 (the live-evidenced scenario): own note CONFIRMED and own media
// REJECTED on the SAME release-scoped contribution -> HasOwnReleaseWork=true
// AND HasOwnRejectedMedia=true simultaneously -- proves the exact "vanishes
// despite needing revision" bug this plan closes (app_user 4 / member 5 /
// release_version 48 in production: note 23 confirmed, media 11 rejected).
func TestListByMemberIDWithProposalFieldsHasOwnRejectedMediaTrueWhileHasOwnReleaseWorkTrue(t *testing.T) {
	pool := openHasOwnReleaseWorkFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(129001), int64(129002)
	const animeID, groupID = int64(129010), int64(129020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "QDTH Combined Confirmed Note Rejected Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "QDTH Combined Confirmed Note Rejected Media Group")

	epID, relID, verID := int64(129040), int64(129041), int64(129042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	contributionID := int64(129030)
	seedPhase143ReleaseScopedContribution(t, pool, contributionID, animeID, groupID, memberID, verID)

	roleID := int64(129060)
	seedPhase143ContributorRole(t, pool, roleID, "translator")
	noteID := int64(129050)
	seedPhase143ReleaseVersionNote(t, pool, noteID, verID, memberID, roleID)
	seedPhase143NoteReviewLifecycle(t, pool, noteID, appUserID, memberID, "confirmed")

	mediaID := int64(129070)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	rows, err := repo.ListByMemberIDWithProposalFields(ctx, memberID, appUserID)
	require.NoError(t, err)
	row := findHasOwnRejectedFlags(t, rows, contributionID)
	require.True(t, row.HasOwnReleaseWork, "the confirmed note keeps has_own_release_work=true")
	require.True(t, row.HasOwnRejectedMedia, "the rejected media must still set has_own_rejected_media=true")
	require.False(t, row.HasOwnRejectedNotes, "the note is confirmed, has_own_rejected_notes must stay false")
}

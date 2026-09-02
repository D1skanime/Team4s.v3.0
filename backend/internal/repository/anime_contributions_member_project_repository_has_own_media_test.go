package repository

// anime_contributions_member_project_repository_has_own_media_test.go proves
// UAT-05 (143-19): listMemberProjectReleaseVersions' has_own_media EXISTS
// subquery must not count a REJECTED release_version_media row as "done",
// mirroring the has_own_notes fix already proven in the sibling
// ..._has_own_notes_test.go file (143-17), and a new has_own_rejected_media
// EXISTS subquery must report true only for that rejected-only-media case,
// false for confirmed media, and false for a tombstoned media row.
//
// Reuses openMemberProjectHasOwnNotesFixture and the existing
// seedPhase143Member/AppUser/Anime/FansubGroup/ConfirmedProjectContribution/
// Episode/ReleaseVersion helpers from the sibling file (same package, no
// import needed) -- only two new seed helpers for media + media lifecycle are
// added here.

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"
)

// seedPhase143ReleaseVersionMedia seeds one release_version_media row.
func seedPhase143ReleaseVersionMedia(t testing.TB, pool *pgxpool.Pool, id, releaseVersionID, uploadedByAppUserID int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_version_media (id, release_version_id, uploaded_by_user_id)
		VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING
	`, id, releaseVersionID, uploadedByAppUserID)
	require.NoError(t, err)
}

// seedPhase143MediaReviewLifecycle seeds a
// release_version_media_review_lifecycle row for mediaID with the given
// review_state (pending/confirmed/rejected). category is hardcoded to
// 'screenshot' (a valid allowed value) since it is NOT NULL and this fixture
// has no need to vary it.
func seedPhase143MediaReviewLifecycle(t testing.TB, pool *pgxpool.Pool, mediaID, submitterAppUserID, submitterMemberID int64, reviewState string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_version_media_review_lifecycle
			(release_version_media_id, source_revision, review_state, category,
			 submitter_app_user_id, submitter_member_id, submitted_at, last_activity_at)
		VALUES ($1, 1, $2, 'screenshot', $3, $4, NOW(), NOW()) ON CONFLICT (release_version_media_id) DO NOTHING
	`, mediaID, reviewState, submitterAppUserID, submitterMemberID)
	require.NoError(t, err)
}

// --- Tests -------------------------------------------------------------------

// TestGetMemberProjectDetailHasOwnRejectedMediaTrueForRejectedOnlyMedia: a
// release whose only media row was reviewed and rejected must report
// has_own_rejected_media=true (and has_own_media=false on the same row --
// proving both the new signal and the has_own_media exclusion fix in one
// test).
func TestGetMemberProjectDetailHasOwnRejectedMediaTrueForRejectedOnlyMedia(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(117001), int64(117002)
	const animeID, groupID = int64(117010), int64(117020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "Phase143 Rejected-Only Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "Phase143 Rejected-Only Media Group")
	seedPhase143ConfirmedProjectContribution(t, pool, 117030, animeID, groupID, memberID)

	epID, relID, verID := int64(117040), int64(117041), int64(117042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	mediaID := int64(117050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "rejected")

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, memberID, appUserID, animeID, groupID)
	require.NoError(t, err)
	require.Len(t, detail.ReleaseVersions, 1)
	require.True(t, detail.ReleaseVersions[0].HasOwnRejectedMedia, "a rejected-only media row must set has_own_rejected_media=true")
	require.False(t, detail.ReleaseVersions[0].HasOwnMedia, "a rejected-only media row must leave has_own_media=false")
}

// TestGetMemberProjectDetailHasOwnRejectedMediaFalseForConfirmedMedia: a
// release whose only media row was reviewed and confirmed must report
// has_own_rejected_media=false (and has_own_media=true).
func TestGetMemberProjectDetailHasOwnRejectedMediaFalseForConfirmedMedia(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(118001), int64(118002)
	const animeID, groupID = int64(118010), int64(118020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "Phase143 Confirmed Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "Phase143 Confirmed Media Group")
	seedPhase143ConfirmedProjectContribution(t, pool, 118030, animeID, groupID, memberID)

	epID, relID, verID := int64(118040), int64(118041), int64(118042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	mediaID := int64(118050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "confirmed")

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, memberID, appUserID, animeID, groupID)
	require.NoError(t, err)
	require.Len(t, detail.ReleaseVersions, 1)
	require.False(t, detail.ReleaseVersions[0].HasOwnRejectedMedia, "a confirmed media row must not set has_own_rejected_media")
	require.True(t, detail.ReleaseVersions[0].HasOwnMedia, "a confirmed media row must still count as has_own_media")
}

// TestGetMemberProjectDetailHasOwnRejectedMediaFalseForTombstonedMedia mirrors
// the sibling notes file's tombstone seeding exactly, for media: a tombstoned
// media row (deleted_at set on release_version_media, review_state=
// 'tombstoned' + tombstoned_at set on the lifecycle row) must not set
// has_own_rejected_media, via the pre-existing rvm.deleted_at IS NULL clause
// -- no new tombstone-specific filter added.
func TestGetMemberProjectDetailHasOwnRejectedMediaFalseForTombstonedMedia(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const memberID, appUserID = int64(119001), int64(119002)
	const animeID, groupID = int64(119010), int64(119020)
	seedPhase143Member(t, pool, memberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, "Phase143 Rejected Tombstoned Media Anime")
	seedPhase143FansubGroup(t, pool, groupID, "Phase143 Rejected Tombstoned Media Group")
	seedPhase143ConfirmedProjectContribution(t, pool, 119030, animeID, groupID, memberID)

	epID, relID, verID := int64(119040), int64(119041), int64(119042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	mediaID := int64(119050)
	seedPhase143ReleaseVersionMedia(t, pool, mediaID, verID, appUserID)
	seedPhase143MediaReviewLifecycle(t, pool, mediaID, appUserID, memberID, "rejected")

	// Mirror release_review_cleanup_repository.go's tombstone shape exactly:
	// deleted_at set on the media row, review_state='tombstoned' + tombstoned_at
	// set on the lifecycle row (the CHECK constraint requires both together).
	_, err := pool.Exec(ctx, `UPDATE release_version_media SET deleted_at = NOW() WHERE id = $1`, mediaID)
	require.NoError(t, err)
	_, err = pool.Exec(ctx, `
		UPDATE release_version_media_review_lifecycle
		SET review_state = 'tombstoned', tombstoned_at = NOW()
		WHERE release_version_media_id = $1
	`, mediaID)
	require.NoError(t, err)

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, memberID, appUserID, animeID, groupID)
	require.NoError(t, err)
	require.Len(t, detail.ReleaseVersions, 1)
	require.False(t, detail.ReleaseVersions[0].HasOwnRejectedMedia, "a tombstoned rejected media row must remain excluded via the existing deleted_at IS NULL clause")
	require.False(t, detail.ReleaseVersions[0].HasOwnMedia, "a tombstoned media row must also remain excluded from has_own_media")
}

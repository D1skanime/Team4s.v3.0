package repository

// anime_contributions_member_project_repository_sentinel_test.go proves D-05's
// repository-level half of the fix (181-RESEARCH.md Pattern 4 / Pitfall 2):
// GetMemberProjectDetail's header query used `JOIN own_roles ON true`, which made
// the ENTIRE query return zero rows whenever memberID had no matching own_roles
// CTE row (true for the sentinel memberID=0 a platform admin without a verified
// member_claims row is mapped onto in contributions_me_project_handler.go). This
// test calls the repository directly (no handler, no fake), proving the fix at
// the SQL layer independently of the handler sentinel fallback -- a handler-only
// test using a fake repository could never catch this, because a fake repository
// would not reproduce the JOIN-vs-LEFT-JOIN behavior difference.

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestGetMemberProjectDetailWithSentinelMemberID seeds one anime, one fansub
// group, one episode, and one release version chain -- deliberately WITHOUT any
// anime_contributions row for memberID 0 (the sentinel has no real contribution,
// by design: it exists purely so the query degrades gracefully instead of
// collapsing to zero rows). Asserts the repository returns a populated project
// row (not ErrNotFound) with empty role_codes and the seeded release version.
func TestGetMemberProjectDetailWithSentinelMemberID(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const sentinelMemberID = int64(0)
	const appUserID = int64(181001)
	const animeID, groupID = int64(181010), int64(181020)
	const animeTitle, groupName = "Phase181 Sentinel Anime", "Phase181 Sentinel Group"

	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, animeTitle)
	seedPhase143FansubGroup(t, pool, groupID, groupName)

	epID, relID, verID := int64(181040), int64(181041), int64(181042)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, sentinelMemberID, appUserID, animeID, groupID)

	require.NoError(t, err, "LEFT JOIN own_roles must not collapse the whole query to zero rows for memberID=0")
	require.NotNil(t, detail)
	require.Equal(t, animeTitle, detail.AnimeTitle, "the real anime title must come through for the sentinel memberID")
	require.Equal(t, groupName, detail.FansubGroupName, "the real fansub group name must come through for the sentinel memberID")
	require.NotNil(t, detail.RoleCodes, "role_codes must be a non-nil empty slice (JSON [], not null) when memberID has no own_roles row")
	require.Empty(t, detail.RoleCodes)
	require.Len(t, detail.ReleaseVersions, 1, "the seeded release version must still be listed for a platform admin without a member profile")
	require.Equal(t, verID, detail.ReleaseVersions[0].ReleaseVersionID)
}

// TestGetMemberProjectDetailWithNoContributionMemberIDIsNotSpecialCasedOnZero
// proves the fix is memberID-value-agnostic, not special-cased on literal 0: a
// real, non-sentinel memberID (with a real members row, but zero
// anime_contributions rows for this anime/group) must ALSO return a populated
// project row with empty role_codes, not ErrNotFound.
func TestGetMemberProjectDetailWithNoContributionMemberIDIsNotSpecialCasedOnZero(t *testing.T) {
	pool := openMemberProjectHasOwnNotesFixture(t)
	ctx := context.Background()

	const realMemberID = int64(181101)
	const appUserID = int64(181102)
	const animeID, groupID = int64(181110), int64(181120)
	const animeTitle, groupName = "Phase181 No-Contribution Anime", "Phase181 No-Contribution Group"

	seedPhase143Member(t, pool, realMemberID)
	seedPhase143AppUser(t, pool, appUserID)
	seedPhase143Anime(t, pool, animeID, animeTitle)
	seedPhase143FansubGroup(t, pool, groupID, groupName)
	// Deliberately NO anime_contributions row for realMemberID on this anime/group.

	epID, relID, verID := int64(181140), int64(181141), int64(181142)
	seedPhase143Episode(t, pool, epID, animeID, "01", 1)
	seedPhase143ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

	repo := NewAnimeContributionsRepository(pool)
	detail, err := repo.GetMemberProjectDetail(ctx, realMemberID, appUserID, animeID, groupID)

	require.NoError(t, err, "a real memberID with zero anime_contributions rows must not be treated differently from the sentinel -- the LEFT JOIN fix is value-agnostic")
	require.NotNil(t, detail)
	require.Equal(t, animeTitle, detail.AnimeTitle)
	require.NotNil(t, detail.RoleCodes)
	require.Empty(t, detail.RoleCodes)
	require.Len(t, detail.ReleaseVersions, 1)
	require.Equal(t, verID, detail.ReleaseVersions[0].ReleaseVersionID)
}

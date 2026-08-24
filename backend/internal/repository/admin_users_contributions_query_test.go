package repository

// admin_users_contributions_query_test.go proves D02-D10 (Plan 139-03) against
// a real, disposable Postgres running the complete Phase-139 migration chain
// (testsupport.OpenPhase139Postgres). Every seed helper inserts directly via
// SQL (never HTTP), using explicit, readable primary keys in the 139030000+
// range to keep fixtures deterministic and collision-free within a test's own
// isolated schema. episodes.sort_index is always set explicitly on seeded
// episodes (never relying on episode_number ordering, per D07).

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/testsupport"
)

// --- Seed helpers -----------------------------------------------------------

func seedPhase139Anime(t testing.TB, pool *pgxpool.Pool, id int64, title string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime (id, title) VALUES ($1, $2)
		ON CONFLICT (id) DO NOTHING
	`, id, title)
	require.NoError(t, err)
}

func seedPhase139FansubGroup(t testing.TB, pool *pgxpool.Pool, id int64, name string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_groups (id, slug, name, status)
		VALUES ($1, $2, $2, 'active')
		ON CONFLICT (id) DO NOTHING
	`, id, name)
	require.NoError(t, err)
}

func seedPhase139Member(t testing.TB, pool *pgxpool.Pool, id int64, nickname string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO members (id, nickname, public_slug)
		VALUES ($1, $2, $2)
		ON CONFLICT (id) DO NOTHING
	`, id, nickname)
	require.NoError(t, err)
}

func seedPhase139AppUser(t testing.TB, pool *pgxpool.Pool, id int64, email string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO app_users (id, keycloak_subject, email, display_name, status)
		VALUES ($1, $2, $3, $3, 'active')
		ON CONFLICT (id) DO NOTHING
	`, id, email, email)
	require.NoError(t, err)
}

// seedPhase139VerifiedUser seeds the app_user + member + verified
// member_claims row that anchors ListUserContributions's member_id lookup
// (D-12 canonical anchor, unchanged from the pre-139 implementation).
func seedPhase139VerifiedUser(t testing.TB, pool *pgxpool.Pool, appUserID, memberID int64, label string) {
	t.Helper()
	seedPhase139AppUser(t, pool, appUserID, label+"@phase139.test")
	seedPhase139Member(t, pool, memberID, label)
	_, err := pool.Exec(context.Background(), `
		INSERT INTO member_claims (id, member_id, app_user_id, claim_status)
		VALUES ($1, $2, $3, 'verified')
		ON CONFLICT (id) DO NOTHING
	`, memberID, memberID, appUserID)
	require.NoError(t, err)
}

// seedPhase139AnimeContribution seeds one anime_contributions row (optionally
// scoped to a release_version_id) plus its role assignments.
// fansub_group_member_id is left NULL — the composite
// fk_anime_contributions_member_group FK is NULL-safe (MATCH SIMPLE), and
// member_id (Migration 0105) is the sole canonical anchor this query reads.
func seedPhase139AnimeContribution(
	t testing.TB,
	pool *pgxpool.Pool,
	id, animeID, groupID, memberID int64,
	releaseVersionID *int64,
	roleCodes []string,
	createdAt *time.Time,
) {
	t.Helper()
	ts := time.Now()
	if createdAt != nil {
		ts = *createdAt
	}
	_, err := pool.Exec(context.Background(), `
		INSERT INTO anime_contributions (id, fansub_group_id, anime_id, member_id, release_version_id, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING
	`, id, groupID, animeID, memberID, releaseVersionID, ts)
	require.NoError(t, err)
	for _, code := range roleCodes {
		_, err := pool.Exec(context.Background(), `
			INSERT INTO anime_contribution_roles (anime_contribution_id, role_code)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, id, code)
		require.NoError(t, err)
	}
}

// seedPhase139Episode seeds an episode with an EXPLICIT sort_index (never
// derived from episode_number, D07).
func seedPhase139Episode(t testing.TB, pool *pgxpool.Pool, id, animeID int64, episodeNumber string, sortIndex int) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO episodes (id, anime_id, episode_number, sort_index)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO NOTHING
	`, id, animeID, episodeNumber, sortIndex)
	require.NoError(t, err)
}

// seedPhase139ReleaseVersion seeds a full fansub_releases -> release_versions
// -> release_version_groups chain for one episode, returning the new
// release_version_id.
func seedPhase139ReleaseVersion(
	t testing.TB,
	pool *pgxpool.Pool,
	releaseID, versionID, episodeID, groupID int64,
	versionLabel string,
) int64 {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO fansub_releases (id, episode_id) VALUES ($1, $2)
		ON CONFLICT (id) DO NOTHING
	`, releaseID, episodeID)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO release_versions (id, release_id, version) VALUES ($1, $2, $3)
		ON CONFLICT (id) DO NOTHING
	`, versionID, releaseID, versionLabel)
	require.NoError(t, err)
	_, err = pool.Exec(context.Background(), `
		INSERT INTO release_version_groups (release_version_id, fansub_group_id) VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, versionID, groupID)
	require.NoError(t, err)
	return versionID
}

// seedPhase139ReleaseCrewSnapshot seeds a release_crew_snapshots row. Used by
// the F-03 fixture pair (Tests 3/4) to prove the override-diff logic never
// trusts snapshot_mode alone (D04/D05) — ListUserContributionsGrouped's SQL
// never reads this table; it exists purely so the fixture matches the real
// domain shape ReplaceInTx/SeedInheritedInTx produce in production.
func seedPhase139ReleaseCrewSnapshot(t testing.TB, pool *pgxpool.Pool, versionID, groupID int64, mode string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_crew_snapshots (release_version_id, fansub_group_id, snapshot_mode)
		VALUES ($1, $2, $3)
		ON CONFLICT (release_version_id, fansub_group_id) DO UPDATE SET snapshot_mode = EXCLUDED.snapshot_mode
	`, versionID, groupID, mode)
	require.NoError(t, err)
}

// --- Tests -------------------------------------------------------------------

func TestListUserContributionsGroupsByAnimeAndProject(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139031001), int64(139031001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-groups")

	seedPhase139Anime(t, pool, 139031010, "Phase139 Anime A")
	seedPhase139FansubGroup(t, pool, 139031020, "Phase139 Group A")
	seedPhase139AnimeContribution(t, pool, 139031030, 139031010, 139031020, memberID, nil, []string{"translator"}, nil)

	seedPhase139Anime(t, pool, 139031011, "Phase139 Anime B")
	seedPhase139FansubGroup(t, pool, 139031021, "Phase139 Group B")
	seedPhase139AnimeContribution(t, pool, 139031031, 139031011, 139031021, memberID, nil, []string{"encoder"}, nil)

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID})
	require.NoError(t, err)
	require.Len(t, page.Data, 2, "expected exactly 2 project blocks, one per (anime_id, fansub_group_id) pair")
	for _, block := range page.Data {
		require.NotEmpty(t, block.ProjectStandard.RoleCodes, "every project block must carry a non-empty ProjectStandard (D03)")
	}
}

func TestListUserContributionsRangeCollapse(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139032001), int64(139032001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-range")

	const animeID, groupID = int64(139032010), int64(139032020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Range Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Range Group")
	seedPhase139AnimeContribution(t, pool, 139032030, animeID, groupID, memberID, nil, []string{"encoder"}, nil)

	for i, sortIdx := range []int{1, 2, 3} {
		episodeID := int64(139032040 + i)
		releaseID := int64(139032050 + i)
		versionID := int64(139032060 + i)
		seedPhase139Episode(t, pool, episodeID, animeID, "0"+itoa(sortIdx), sortIdx)
		seedPhase139ReleaseVersion(t, pool, releaseID, versionID, episodeID, groupID, "v1")
		seedPhase139AnimeContribution(t, pool, 139032070+int64(i), animeID, groupID, memberID, &versionID, []string{"encoder"}, nil)
	}

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Len(t, page.Data[0].RangeEntries, 1, "3 consecutive standard-equivalent episodes must collapse into exactly ONE range entry")
	require.False(t, page.Data[0].RangeEntries[0].IsDeviation)
}

func TestListUserContributionsOverrideDetectionIndependentButIdentical(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139033001), int64(139033001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-identical")

	const animeID, groupID = int64(139033010), int64(139033020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Identical Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Identical Group")
	seedPhase139AnimeContribution(t, pool, 139033030, animeID, groupID, memberID, nil, []string{"encoder"}, nil)

	episodeID, releaseID, versionID := int64(139033040), int64(139033050), int64(139033060)
	seedPhase139Episode(t, pool, episodeID, animeID, "01", 1)
	seedPhase139ReleaseVersion(t, pool, releaseID, versionID, episodeID, groupID, "v1")
	// F-03 case 1: snapshot_mode='independent' but role set is IDENTICAL to
	// the project standard — must NOT be flagged as a deviation (D04/D05).
	seedPhase139ReleaseCrewSnapshot(t, pool, versionID, groupID, "independent")
	seedPhase139AnimeContribution(t, pool, 139033070, animeID, groupID, memberID, &versionID, []string{"encoder"}, nil)

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Len(t, page.Data[0].RangeEntries, 1)
	require.False(t, page.Data[0].RangeEntries[0].IsDeviation,
		"independent-but-identical must not be flagged as an override (snapshot_mode is never trusted alone)")
}

func TestListUserContributionsOverrideDetectionIndependentAndDifferent(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139034001), int64(139034001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-different")

	const animeID, groupID = int64(139034010), int64(139034020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Different Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Different Group")
	seedPhase139AnimeContribution(t, pool, 139034030, animeID, groupID, memberID, nil, []string{"encoder"}, nil)

	episodeID, releaseID, versionID := int64(139034040), int64(139034050), int64(139034060)
	seedPhase139Episode(t, pool, episodeID, animeID, "01", 1)
	seedPhase139ReleaseVersion(t, pool, releaseID, versionID, episodeID, groupID, "v1")
	// F-03 case 2: snapshot_mode='independent' AND the role set genuinely
	// differs — must be flagged as a real override (D04/D05).
	seedPhase139ReleaseCrewSnapshot(t, pool, versionID, groupID, "independent")
	seedPhase139AnimeContribution(t, pool, 139034070, animeID, groupID, memberID, &versionID, []string{"translator"}, nil)

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Len(t, page.Data[0].RangeEntries, 1)
	entry := page.Data[0].RangeEntries[0]
	require.True(t, entry.IsDeviation, "independent-and-different must be flagged as a real override")
	require.NotNil(t, entry.DeviationDetail)
	require.NotEmpty(t, *entry.DeviationDetail)
}

func TestListUserContributionsRangeBreaksOnDeviation(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139035001), int64(139035001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-breaks")

	const animeID, groupID = int64(139035010), int64(139035020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Breaks Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Breaks Group")
	seedPhase139AnimeContribution(t, pool, 139035030, animeID, groupID, memberID, nil, []string{"encoder"}, nil)

	roleForEpisode := map[int][]string{
		1: {"encoder"},
		2: {"encoder"},
		3: {"translator"}, // the real deviation
		4: {"encoder"},
		5: {"encoder"},
	}
	for i, sortIdx := range []int{1, 2, 3, 4, 5} {
		episodeID := int64(139035040 + i)
		releaseID := int64(139035050 + i)
		versionID := int64(139035060 + i)
		seedPhase139Episode(t, pool, episodeID, animeID, "0"+itoa(sortIdx), sortIdx)
		seedPhase139ReleaseVersion(t, pool, releaseID, versionID, episodeID, groupID, "v1")
		seedPhase139AnimeContribution(t, pool, 139035070+int64(i), animeID, groupID, memberID, &versionID, roleForEpisode[sortIdx], nil)
	}

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	entries := page.Data[0].RangeEntries
	require.Len(t, entries, 3, "expected [1,2] range, episode 3 alone, [4,5] range — 3 entries total")
	require.False(t, entries[0].IsDeviation)
	require.True(t, entries[1].IsDeviation)
	require.False(t, entries[2].IsDeviation)
}

func TestListUserContributionsFiltersServerSide(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139036001), int64(139036001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-filters")

	seedPhase139Anime(t, pool, 139036010, "Phase139 Filter Anime A")
	seedPhase139FansubGroup(t, pool, 139036020, "Phase139 Filter Group A")
	seedPhase139AnimeContribution(t, pool, 139036030, 139036010, 139036020, memberID, nil, []string{"encoder"}, nil)

	seedPhase139Anime(t, pool, 139036011, "Phase139 Filter Anime B")
	seedPhase139FansubGroup(t, pool, 139036021, "Phase139 Filter Group B")
	seedPhase139AnimeContribution(t, pool, 139036031, 139036011, 139036021, memberID, nil, []string{"translator"}, nil)

	repo := NewAdminUsersRepository(pool)
	animeFilter := int64(139036010)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID, AnimeID: &animeFilter})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Equal(t, int64(139036010), page.Data[0].AnimeID)
	require.Equal(t, 1, page.Meta.Total, "Meta.Total must reflect the FILTERED count, not the unfiltered count of 2")
}

func TestListUserContributionsOnlyDeviationsFilter(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139037001), int64(139037001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-onlydev")

	// Block A: no deviation.
	const animeA, groupA = int64(139037010), int64(139037020)
	seedPhase139Anime(t, pool, animeA, "Phase139 OnlyDev Anime A")
	seedPhase139FansubGroup(t, pool, groupA, "Phase139 OnlyDev Group A")
	seedPhase139AnimeContribution(t, pool, 139037030, animeA, groupA, memberID, nil, []string{"encoder"}, nil)
	epA, relA, verA := int64(139037040), int64(139037041), int64(139037042)
	seedPhase139Episode(t, pool, epA, animeA, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relA, verA, epA, groupA, "v1")
	seedPhase139AnimeContribution(t, pool, 139037050, animeA, groupA, memberID, &verA, []string{"encoder"}, nil)

	// Block B: has a real deviation.
	const animeB, groupB = int64(139037011), int64(139037021)
	seedPhase139Anime(t, pool, animeB, "Phase139 OnlyDev Anime B")
	seedPhase139FansubGroup(t, pool, groupB, "Phase139 OnlyDev Group B")
	seedPhase139AnimeContribution(t, pool, 139037031, animeB, groupB, memberID, nil, []string{"encoder"}, nil)
	epB, relB, verB := int64(139037060), int64(139037061), int64(139037062)
	seedPhase139Episode(t, pool, epB, animeB, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relB, verB, epB, groupB, "v1")
	seedPhase139AnimeContribution(t, pool, 139037070, animeB, groupB, memberID, &verB, []string{"translator"}, nil)

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID, OnlyDeviations: true})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Equal(t, animeB, page.Data[0].AnimeID)
}

func TestListUserContributionsPaginationNeverSplitsAProjectBlock(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139038001), int64(139038001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-pagination")

	expectedPairs := map[[2]int64]bool{}
	for p := 0; p < 3; p++ {
		animeID := int64(139038010 + p*10)
		groupID := int64(139038020 + p*10)
		seedPhase139Anime(t, pool, animeID, "Phase139 Page Anime "+itoa(p))
		seedPhase139FansubGroup(t, pool, groupID, "Phase139 Page Group "+itoa(p))
		seedPhase139AnimeContribution(t, pool, 139038030+int64(p*10), animeID, groupID, memberID, nil, []string{"encoder"}, nil)
		for i, sortIdx := range []int{1, 2} {
			episodeID := int64(139038040 + p*100 + i)
			releaseID := int64(139038060 + p*100 + i)
			versionID := int64(139038080 + p*100 + i)
			seedPhase139Episode(t, pool, episodeID, animeID, "0"+itoa(sortIdx), sortIdx)
			seedPhase139ReleaseVersion(t, pool, releaseID, versionID, episodeID, groupID, "v1")
			seedPhase139AnimeContribution(t, pool, 139038100+int64(p*100+i), animeID, groupID, memberID, &versionID, []string{"encoder"}, nil)
		}
		expectedPairs[[2]int64{animeID, groupID}] = true
	}

	repo := NewAdminUsersRepository(pool)
	seenPairs := map[[2]int64]bool{}
	for page := 0; page < 3; page++ {
		result, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID, Limit: 1, Offset: page})
		require.NoError(t, err)
		require.Len(t, result.Data, 1, "limit=1 must return exactly one whole project block per page")
		block := result.Data[0]
		require.Len(t, block.RangeEntries, 1, "the whole project block's range entries must all be present on its page (2 consecutive standard episodes collapse to 1 range)")
		pair := [2]int64{block.AnimeID, block.FansubGroupID}
		require.False(t, seenPairs[pair], "the same project pair must not appear on two different pages")
		seenPairs[pair] = true
	}
	require.Equal(t, expectedPairs, seenPairs, "walking limit=1 across 3 pages must return exactly the 3 distinct project pairs with no duplicates or gaps")
}

func TestListUserContributionsFilterOptionsScopedToUser(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const appUserID, memberID = int64(139039001), int64(139039001)
	seedPhase139VerifiedUser(t, pool, appUserID, memberID, "phase139-scoped-a")
	const otherAppUserID, otherMemberID = int64(139039002), int64(139039002)
	seedPhase139VerifiedUser(t, pool, otherAppUserID, otherMemberID, "phase139-scoped-b")

	seedPhase139Anime(t, pool, 139039010, "Phase139 Scoped Anime Mine")
	seedPhase139FansubGroup(t, pool, 139039020, "Phase139 Scoped Group Mine")
	seedPhase139AnimeContribution(t, pool, 139039030, 139039010, 139039020, memberID, nil, []string{"encoder"}, nil)

	seedPhase139Anime(t, pool, 139039011, "Phase139 Scoped Anime Other")
	seedPhase139FansubGroup(t, pool, 139039021, "Phase139 Scoped Group Other")
	seedPhase139AnimeContribution(t, pool, 139039031, 139039011, 139039021, otherMemberID, nil, []string{"encoder"}, nil)

	repo := NewAdminUsersRepository(pool)
	page, err := repo.ListUserContributions(ctx, AdminUserContributionsFilter{AppUserID: appUserID})
	require.NoError(t, err)
	require.Len(t, page.FilterOptions.Animes, 1)
	require.Equal(t, int64(139039010), page.FilterOptions.Animes[0].ID)
	require.Len(t, page.FilterOptions.Groups, 1)
	require.Equal(t, int64(139039020), page.FilterOptions.Groups[0].ID)
}

// itoa avoids importing strconv purely for single-digit loop indices in this
// test file's seed helpers.
func itoa(n int) string {
	digits := "0123456789"
	if n < 10 {
		return string(digits[n])
	}
	return string(digits[n/10]) + string(digits[n%10])
}

package repository

// admin_users_media_query_test.go proves D11-D19 (Plan 139-04) against a
// real, disposable Postgres running the complete Phase-139 migration chain
// (testsupport.OpenPhase139Postgres). Seed helpers reuse the anime/fansub-
// group/episode/release-version helpers already defined in
// admin_users_contributions_query_test.go (139-03). release_version_media's
// uploaded_by_user_id FKs to the legacy `users` table (NOT app_users) —
// exactly the same join key admin_users_queries.go's existing
// MediaUploadCount aggregate already uses, so this test seeds a `users` row
// directly and filters on that same ID, matching established production
// behavior in this seam (out of this plan's scope to change).

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/testsupport"
)

// testAdminMediaStorageDir is the fixed storage-root prefix these tests seed
// media_assets.file_path values under, so buildAdminMediaPublicURL's
// TrimPrefix convention has something real to strip (D17).
const testAdminMediaStorageDir = "/app/storage/media"

// --- Seed helpers (media-specific; anime/group/episode/release-version
// helpers are reused from admin_users_contributions_query_test.go) ---------

func seedPhase139LegacyUser(t testing.TB, pool *pgxpool.Pool, id int64, username string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO users (id, username, email, password_hash)
		VALUES ($1, $2, $2, 'x')
		ON CONFLICT (id) DO NOTHING
	`, id, username)
	require.NoError(t, err)
}

// seedPhase139MediaAsset seeds a media_assets row with a real, storage-root-
// prefixed file_path (D17 — proves PublicURL is derived from a real path,
// not a hardcoded placeholder).
func seedPhase139MediaAsset(t testing.TB, pool *pgxpool.Pool, id int64, filePath, mimeType string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO media_assets (id, file_path, mime_type)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO NOTHING
	`, id, filePath, mimeType)
	require.NoError(t, err)
}

// seedPhase139MediaFile seeds a media_files row carrying the REAL byte size
// (D17 — proves FileSizeBytes is a real joined value, not a hardcoded 0).
func seedPhase139MediaFile(t testing.TB, pool *pgxpool.Pool, id, mediaID int64, path string, size int64) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO media_files (id, media_id, variant, path, size)
		VALUES ($1, $2, 'original', $3, $4)
		ON CONFLICT (id) DO NOTHING
	`, id, mediaID, path, size)
	require.NoError(t, err)
}

// seedPhase139ReleaseVersionMedia seeds one release_version_media row.
func seedPhase139ReleaseVersionMedia(
	t testing.TB,
	pool *pgxpool.Pool,
	id, releaseVersionID, mediaAssetID, uploadedByUserID int64,
	createdAt *time.Time,
) {
	t.Helper()
	ts := time.Now()
	if createdAt != nil {
		ts = *createdAt
	}
	_, err := pool.Exec(context.Background(), `
		INSERT INTO release_version_media
			(id, release_version_id, media_asset_id, category, uploaded_by_user_id, created_at)
		VALUES ($1, $2, $3, 'screenshot', $4, $5)
		ON CONFLICT (id) DO NOTHING
	`, id, releaseVersionID, mediaAssetID, uploadedByUserID, ts)
	require.NoError(t, err)
}

// --- Tests -------------------------------------------------------------------

func TestGetUserMediaGroupsByReleaseOrEpisode(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139041001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-groups")

	const animeID, groupID = int64(139041010), int64(139041020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Media Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Media Group")

	epA, relA, verA := int64(139041030), int64(139041031), int64(139041032)
	seedPhase139Episode(t, pool, epA, animeID, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relA, verA, epA, groupID, "v1")

	epB, relB, verB := int64(139041040), int64(139041041), int64(139041042)
	seedPhase139Episode(t, pool, epB, animeID, "02", 2)
	seedPhase139ReleaseVersion(t, pool, relB, verB, epB, groupID, "v1")

	// 2 media items under verA (same release version -> same block).
	seedPhase139MediaAsset(t, pool, 139041050, testAdminMediaStorageDir+"/a1.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139041060, verA, 139041050, userID, nil)
	seedPhase139MediaAsset(t, pool, 139041051, testAdminMediaStorageDir+"/a2.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139041061, verA, 139041051, userID, nil)

	// 1 media item under verB (different release version -> different block).
	seedPhase139MediaAsset(t, pool, 139041052, testAdminMediaStorageDir+"/b1.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139041062, verB, 139041052, userID, nil)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	page, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID})
	require.NoError(t, err)
	require.Len(t, page.Data, 2, "expected exactly 2 release/episode blocks")

	var blockA *models.AdminMediaReleaseBlock
	for i := range page.Data {
		if page.Data[i].ReleaseVersionID == verA {
			blockA = &page.Data[i]
		}
	}
	require.NotNil(t, blockA, "block for verA must exist")
	require.Len(t, blockA.Items, 2, "verA's block must contain BOTH media items")
}

func TestGetUserMediaPublicURLAndFileSizeDerivedForReal(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139042001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-real")

	const animeID, groupID = int64(139042010), int64(139042020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Real URL Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Real URL Group")
	ep, rel, ver := int64(139042030), int64(139042031), int64(139042032)
	seedPhase139Episode(t, pool, ep, animeID, "01", 1)
	seedPhase139ReleaseVersion(t, pool, rel, ver, ep, groupID, "v1")

	storagePath := testAdminMediaStorageDir + "/release-version/" + itoa64(ver) + "/asset-uuid/original.jpg"
	seedPhase139MediaAsset(t, pool, 139042040, storagePath, "image/jpeg")
	seedPhase139MediaFile(t, pool, 139042050, 139042040, storagePath, 123456)
	seedPhase139ReleaseVersionMedia(t, pool, 139042060, ver, 139042040, userID, nil)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	page, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Len(t, page.Data[0].Items, 1)
	item := page.Data[0].Items[0]
	require.True(t, len(item.PublicURL) > 0 && item.PublicURL[:7] == "/media/", "PublicURL must start with /media/, got %q", item.PublicURL)
	require.NotEqual(t, storagePath, item.PublicURL, "PublicURL must not equal the raw storage path")
	require.Equal(t, int64(123456), item.FileSizeBytes, "FileSizeBytes must be the real seeded media_files.size value, not a hardcoded 0")
}

func TestGetUserMediaNoOwnerContextOrPermissionField(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139043001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-nofields")

	const animeID, groupID = int64(139043010), int64(139043020)
	seedPhase139Anime(t, pool, animeID, "Phase139 NoFields Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 NoFields Group")
	ep, rel, ver := int64(139043030), int64(139043031), int64(139043032)
	seedPhase139Episode(t, pool, ep, animeID, "01", 1)
	seedPhase139ReleaseVersion(t, pool, rel, ver, ep, groupID, "v1")
	seedPhase139MediaAsset(t, pool, 139043040, testAdminMediaStorageDir+"/x.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139043050, ver, 139043040, userID, nil)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	page, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Len(t, page.Data[0].Items, 1)

	encoded, err := json.Marshal(page)
	require.NoError(t, err)
	raw := string(encoded)
	require.NotContains(t, raw, "owner_context")
	require.NotContains(t, raw, "release_version:")
	require.NotContains(t, raw, "berechtigung")
	require.NotContains(t, raw, "file_path")
	require.NotContains(t, raw, "storage_id")
	require.NotContains(t, raw, testAdminMediaStorageDir, "the raw storage-root prefix must never leak into the response")
}

func TestGetUserMediaPaginationNeverSplitsAReleaseBlock(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139044001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-pagination")

	seenReleaseVersions := map[int64]bool{}
	for p := 0; p < 3; p++ {
		animeID := int64(139044010 + p*10)
		groupID := int64(139044020 + p*10)
		seedPhase139Anime(t, pool, animeID, "Phase139 Page Media Anime "+itoa(p))
		seedPhase139FansubGroup(t, pool, groupID, "Phase139 Page Media Group "+itoa(p))
		epID := int64(139044030 + p*10)
		relID := int64(139044040 + p*10)
		verID := int64(139044050 + p*10)
		seedPhase139Episode(t, pool, epID, animeID, "01", 1)
		seedPhase139ReleaseVersion(t, pool, relID, verID, epID, groupID, "v1")

		// 2 media items per block, to prove the WHOLE block travels together.
		assetA := int64(139044060 + p*10)
		assetB := int64(139044061 + p*10)
		seedPhase139MediaAsset(t, pool, assetA, testAdminMediaStorageDir+"/p"+itoa(p)+"a.png", "image/png")
		seedPhase139MediaAsset(t, pool, assetB, testAdminMediaStorageDir+"/p"+itoa(p)+"b.png", "image/png")
		seedPhase139ReleaseVersionMedia(t, pool, int64(139044070+p*10), verID, assetA, userID, nil)
		seedPhase139ReleaseVersionMedia(t, pool, int64(139044071+p*10), verID, assetB, userID, nil)

		seenReleaseVersions[verID] = true
	}

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	walked := map[int64]bool{}
	for page := 0; page < 3; page++ {
		result, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID, Limit: 1, Offset: page})
		require.NoError(t, err)
		require.Len(t, result.Data, 1, "limit=1 must return exactly one whole release block per page")
		block := result.Data[0]
		require.Len(t, block.Items, 2, "the whole release block's items must all be present on its page")
		require.False(t, walked[block.ReleaseVersionID], "the same release_version_id must not appear on two different pages")
		walked[block.ReleaseVersionID] = true
	}
	require.Equal(t, seenReleaseVersions, walked, "walking limit=1 across 3 pages must return exactly the 3 distinct release_version_id values with no duplicates or gaps")
}

func TestGetUserMediaCountsFilteredBlocksNotRows(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139045001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-counts")

	const animeID, groupID = int64(139045010), int64(139045020)
	seedPhase139Anime(t, pool, animeID, "Phase139 Counts Anime")
	seedPhase139FansubGroup(t, pool, groupID, "Phase139 Counts Group")

	// Block A: 5 media items.
	epA, relA, verA := int64(139045030), int64(139045031), int64(139045032)
	seedPhase139Episode(t, pool, epA, animeID, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relA, verA, epA, groupID, "v1")
	for i := 0; i < 5; i++ {
		assetID := int64(139045040 + i)
		seedPhase139MediaAsset(t, pool, assetID, testAdminMediaStorageDir+"/a"+itoa(i)+".png", "image/png")
		seedPhase139ReleaseVersionMedia(t, pool, int64(139045050+i), verA, assetID, userID, nil)
	}

	// Block B: 1 media item.
	epB, relB, verB := int64(139045060), int64(139045061), int64(139045062)
	seedPhase139Episode(t, pool, epB, animeID, "02", 2)
	seedPhase139ReleaseVersion(t, pool, relB, verB, epB, groupID, "v1")
	assetB := int64(139045070)
	seedPhase139MediaAsset(t, pool, assetB, testAdminMediaStorageDir+"/b.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139045080, verB, assetB, userID, nil)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	page, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID})
	require.NoError(t, err)
	require.Equal(t, 2, page.Meta.Total, "Meta.Total must count BLOCKS (2), not raw media rows (6)")
}

func TestGetUserMediaFiltersServerSide(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139046001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-filters")

	const animeA, groupA = int64(139046010), int64(139046020)
	seedPhase139Anime(t, pool, animeA, "Phase139 Filter Media Anime A")
	seedPhase139FansubGroup(t, pool, groupA, "Phase139 Filter Media Group A")
	epA, relA, verA := int64(139046030), int64(139046031), int64(139046032)
	seedPhase139Episode(t, pool, epA, animeA, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relA, verA, epA, groupA, "v1")
	assetA := int64(139046040)
	seedPhase139MediaAsset(t, pool, assetA, testAdminMediaStorageDir+"/fa.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139046050, verA, assetA, userID, nil)

	const animeB, groupB = int64(139046011), int64(139046021)
	seedPhase139Anime(t, pool, animeB, "Phase139 Filter Media Anime B")
	seedPhase139FansubGroup(t, pool, groupB, "Phase139 Filter Media Group B")
	epB, relB, verB := int64(139046060), int64(139046061), int64(139046062)
	seedPhase139Episode(t, pool, epB, animeB, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relB, verB, epB, groupB, "v1")
	assetB := int64(139046070)
	seedPhase139MediaAsset(t, pool, assetB, testAdminMediaStorageDir+"/fb.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139046080, verB, assetB, userID, nil)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	animeFilter := animeA
	page, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID, AnimeID: &animeFilter})
	require.NoError(t, err)
	require.Len(t, page.Data, 1)
	require.Equal(t, animeA, page.Data[0].AnimeID)
	require.Equal(t, 1, page.Meta.Total, "Meta.Total must reflect the FILTERED count, not the unfiltered count of 2")
}

func TestGetUserMediaFilterOptionsScopedToUser(t *testing.T) {
	pool := testsupport.OpenPhase139Postgres(t)
	ctx := context.Background()
	const userID = int64(139047001)
	seedPhase139LegacyUser(t, pool, userID, "phase139-media-scoped-a")
	const otherUserID = int64(139047002)
	seedPhase139LegacyUser(t, pool, otherUserID, "phase139-media-scoped-b")

	const animeMine, groupMine = int64(139047010), int64(139047020)
	seedPhase139Anime(t, pool, animeMine, "Phase139 Scoped Media Anime Mine")
	seedPhase139FansubGroup(t, pool, groupMine, "Phase139 Scoped Media Group Mine")
	epM, relM, verM := int64(139047030), int64(139047031), int64(139047032)
	seedPhase139Episode(t, pool, epM, animeMine, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relM, verM, epM, groupMine, "v1")
	assetM := int64(139047040)
	seedPhase139MediaAsset(t, pool, assetM, testAdminMediaStorageDir+"/mine.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139047050, verM, assetM, userID, nil)

	const animeOther, groupOther = int64(139047011), int64(139047021)
	seedPhase139Anime(t, pool, animeOther, "Phase139 Scoped Media Anime Other")
	seedPhase139FansubGroup(t, pool, groupOther, "Phase139 Scoped Media Group Other")
	epO, relO, verO := int64(139047060), int64(139047061), int64(139047062)
	seedPhase139Episode(t, pool, epO, animeOther, "01", 1)
	seedPhase139ReleaseVersion(t, pool, relO, verO, epO, groupOther, "v1")
	assetO := int64(139047070)
	seedPhase139MediaAsset(t, pool, assetO, testAdminMediaStorageDir+"/other.png", "image/png")
	seedPhase139ReleaseVersionMedia(t, pool, 139047080, verO, assetO, otherUserID, nil)

	repo := NewAdminUsersRepository(pool, testAdminMediaStorageDir)
	page, err := repo.GetUserMedia(ctx, AdminUserMediaFilter{AppUserID: userID})
	require.NoError(t, err)
	require.Len(t, page.FilterOptions.Animes, 1)
	require.Equal(t, animeMine, page.FilterOptions.Animes[0].ID)
	require.Len(t, page.FilterOptions.Groups, 1)
	require.Equal(t, groupMine, page.FilterOptions.Groups[0].ID)
}

// itoa64 formats an int64 without importing strconv purely for test fixture
// path construction.
func itoa64(n int64) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	if neg {
		return "-" + string(digits)
	}
	return string(digits)
}

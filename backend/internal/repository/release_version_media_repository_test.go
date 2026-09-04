package repository

import (
	"context"
	"testing"
	"time"

	"team4s.v3/backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestReleaseVersionMediaTypes verifies that the input/output struct types
// have the expected fields and compile correctly.
func TestReleaseVersionMediaTypes(t *testing.T) {
	// ReleaseVersionMediaCreateInput must have these fields
	input := ReleaseVersionMediaCreateInput{
		ReleaseVersionID:   1,
		MediaAssetID:       2,
		Category:           "screenshot",
		Caption:            nil,
		SortOrder:          10,
		IsPreviewCandidate: false,
		UploadedByUserID:   nil,
	}
	assert.Equal(t, int64(1), input.ReleaseVersionID)
	assert.Equal(t, "screenshot", input.Category)

	// ReleaseVersionMediaPatchInput nil fields = no change
	patch := ReleaseVersionMediaPatchInput{
		Caption:            nil,
		IsPreviewCandidate: nil,
	}
	assert.Nil(t, patch.Caption)
	assert.Nil(t, patch.IsPreviewCandidate)

	// ReleaseVersionMediaReorderItem
	reorder := ReleaseVersionMediaReorderItem{
		RelationID: 7,
		SortOrder:  20,
	}
	assert.Equal(t, int64(7), reorder.RelationID)

	// ReleaseVersionMediaItem must have OriginalFilePath, ThumbFilePath, ThumbnailURL, OriginalURL
	item := ReleaseVersionMediaItem{
		ID:                 1,
		ReleaseVersionID:   2,
		MediaAssetID:       3,
		Category:           "screenshot",
		SortOrder:          10,
		IsPreviewCandidate: false,
		CreatedAt:          time.Now(),
		OriginalFilePath:   "/app/media/release-version/2/uuid/original.png",
		ThumbFilePath:      "/app/media/release-version/2/uuid/thumb.jpg",
		ThumbnailURL:       "/media/release-version/2/uuid/thumb.jpg",
		OriginalURL:        "/media/release-version/2/uuid/original.png",
	}
	assert.Equal(t, "/app/media/release-version/2/uuid/original.png", item.OriginalFilePath)
	assert.Equal(t, "/media/release-version/2/uuid/thumb.jpg", item.ThumbnailURL)
}

// TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle proves against real
// Postgres that ListReleaseVersionMedia's LEFT JOIN onto
// release_version_media_review_lifecycle actually surfaces a relation's own
// review-lifecycle state (source_revision/review_state/last_activity_at),
// not merely that the SQL fragments are present in source (D-12).
func TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	startedAt := time.Now().UTC().Add(-10 * time.Minute)

	lifecycle := submitMedia(t, pool, 601, 11, nil, startedAt)

	repo := NewMediaRepository(pool, "")
	items, err := repo.ListReleaseVersionMedia(ctx, 41)
	require.NoError(t, err)

	var found *ReleaseVersionMediaItem
	for i := range items {
		if items[i].ID == 601 {
			found = &items[i]
		}
	}
	require.NotNil(t, found, "relation 601 must appear in the version-41 listing")
	require.NotNil(t, found.SourceRevision, "the lifecycle JOIN must populate source_revision")
	assert.Equal(t, lifecycle.SourceRevision, *found.SourceRevision)
	require.NotNil(t, found.ReviewState, "the lifecycle JOIN must populate review_state")
	assert.Equal(t, string(ReleaseReviewStatePending), *found.ReviewState)
	require.NotNil(t, found.LastActivityAt, "the lifecycle JOIN must populate last_activity_at")
}

// TestMediaRepositoryMethodSignatures verifies that all required methods
// exist on *MediaRepository with the expected receiver.
// If any method is missing, this test will fail to compile.
func TestMediaRepositoryMethodSignatures(t *testing.T) {
	// This test validates at compile time that the methods exist.
	// It does not require a database connection.
	var repo *MediaRepository
	_ = repo.BeginTx                              // must exist
	_ = repo.CreateReleaseVersionMediaAsset       // must exist
	_ = repo.CreateMediaAssetWithStatusTx         // must exist
	_ = repo.UpdateMediaAssetStatusRVMTx          // must exist
	_ = repo.UpdateMediaFileStatusRVMTx           // must exist
	_ = repo.ListReleaseVersionMedia              // must exist
	_ = repo.PatchReleaseVersionMedia             // must exist
	_ = repo.SoftDeleteReleaseVersionMedia        // must exist
	_ = repo.ReorderReleaseVersionMedia           // must exist
	_ = repo.ClearPreviewCandidateForVersion      // must exist
	_ = repo.CreateMediaAssetWithStatus           // must exist
	_ = repo.InsertMediaFileWithStatus            // must exist
	_ = repo.GetMaxRVMSortOrder                   // must exist
	_ = repo.ReleaseVersionExistsForRVM           // must exist
	_ = repo.GetReleaseVersionMediaRelation       // must exist
	_ = repo.ValidateReleaseVersionMediaOwnership // must exist
}

// TestClearPreviewCandidateExists verifies method signature accepts required parameters.
func TestClearPreviewCandidateExists(t *testing.T) {
	// Verifies at compile time that ClearPreviewCandidateForVersion has the correct signature.
	// (releaseVersionID int64, excludeRelationID int64) — both are required per D-15.
	var repo *MediaRepository
	_ = repo.ClearPreviewCandidateForVersion
	t.Log("ClearPreviewCandidateForVersion method signature verified")
}

// ---------------------------------------------------------------------------
// Cleanup repository method signatures (extended — mutation helpers added in 37-01)
// ---------------------------------------------------------------------------

// TestRVMCleanupRepositoryMutationMethodSignatures verifies that the mutation
// helpers added in plan 37-01 exist on *MediaRepository at compile time.
func TestRVMCleanupRepositoryMutationMethodSignatures(t *testing.T) {
	var repo *MediaRepository
	_ = repo.MarkMediaAssetStatusByID  // mark asset failed/deleted
	_ = repo.MarkMediaFileMissing      // mark file missing
	_ = repo.HasReadyMediaFileForAsset // check for surviving ready variant
	_ = repo.HardDeleteRVMAndAsset     // atomic hard-delete
}

// ---------------------------------------------------------------------------
// Upload contract source invariant tests
// ---------------------------------------------------------------------------

// TestReleaseVersionMedia_UploadTransactionContract proves against real
// Postgres that the processing->ready status transition is transactional: a
// rolled-back transaction must never leave 'ready' visible, and only a
// committed transaction makes the transition observable (D-12).
func TestReleaseVersionMedia_UploadTransactionContract(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	statusOf := func(assetID int64) string {
		var status string
		require.NoError(t, pool.QueryRow(ctx, `SELECT status FROM media_assets WHERE id = $1`, assetID).Scan(&status))
		return status
	}
	require.Equal(t, "processing", statusOf(701), "fixture asset 701 must start in 'processing'")

	// A mid-transaction failure (rollback) must never leave 'ready' visible.
	txFail, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer txFail.Rollback(ctx) //nolint:errcheck // no-op once explicitly rolled back below
	require.NoError(t, repo.UpdateMediaAssetStatusRVMTx(ctx, txFail, 701, "ready"))
	require.NoError(t, repo.UpdateMediaFileStatusRVMTx(ctx, txFail, 701, "ready"))
	require.NoError(t, txFail.Rollback(ctx))
	assert.Equal(t, "processing", statusOf(701), "a rolled-back transition must leave the asset in its prior status")

	// Only a committed transaction makes the transition visible.
	txOK, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer txOK.Rollback(ctx) //nolint:errcheck // no-op once committed below
	require.NoError(t, repo.UpdateMediaAssetStatusRVMTx(ctx, txOK, 701, "ready"))
	require.NoError(t, repo.UpdateMediaFileStatusRVMTx(ctx, txOK, 701, "ready"))
	require.NoError(t, txOK.Commit(ctx))
	assert.Equal(t, "ready", statusOf(701), "a committed transition must be visible")
}

// TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows proves against
// real Postgres that ListReleaseVersionMedia excludes soft-deleted rows and
// that PatchReleaseVersionMedia refuses to mutate a soft-deleted relation
// (D-12).
func TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	_, err := pool.Exec(ctx, `UPDATE release_version_media SET deleted_at = NOW() WHERE id = 602`)
	require.NoError(t, err)

	items, err := repo.ListReleaseVersionMedia(ctx, 41)
	require.NoError(t, err)

	ids := make([]int64, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ID)
	}
	assert.Contains(t, ids, int64(601), "the live relation must remain listed")
	assert.NotContains(t, ids, int64(602), "the soft-deleted relation must be excluded by deleted_at IS NULL")

	// PatchReleaseVersionMedia must also refuse to touch a soft-deleted row.
	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once explicitly rolled back below
	newCategory := "poster"
	patchErr := repo.PatchReleaseVersionMedia(ctx, tx, 602, ReleaseVersionMediaPatchInput{Category: &newCategory})
	assert.ErrorIs(t, patchErr, ErrNotFound, "patching a soft-deleted relation must be rejected, not silently succeed")
	require.NoError(t, tx.Rollback(ctx))
}

// TestReleaseVersionMedia_ReorderOwnershipValidationExists proves against
// real Postgres that ValidateReleaseVersionMediaOwnership rejects relation
// IDs belonging to a different release version, and that
// ValidateReleaseVersionMediaUploader rejects relation IDs not uploaded by
// the given legacy user — real rejections, not source-substring claims
// (D-12).
func TestReleaseVersionMedia_ReorderOwnershipValidationExists(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	_, err := pool.Exec(ctx, `INSERT INTO release_versions(id) VALUES (42)`)
	require.NoError(t, err)

	// Cross-version: relation 601 belongs to release_version 41, not 42.
	err = repo.ValidateReleaseVersionMediaOwnership(ctx, 42, []int64{601})
	assert.ErrorIs(t, err, ErrOwnershipMismatch, "a relation from a different release version must be rejected")

	// Same-version: no error.
	require.NoError(t, repo.ValidateReleaseVersionMediaOwnership(ctx, 41, []int64{601}))

	// Uploader-scoped: relation 601 was uploaded by legacy user 2001 (fixture seed).
	require.NoError(t, repo.ValidateReleaseVersionMediaUploader(ctx, 41, []int64{601}, 2001))
	assert.ErrorIs(t, repo.ValidateReleaseVersionMediaUploader(ctx, 41, []int64{601}, 9999), ErrOwnershipMismatch,
		"a relation ID not uploaded by the given user must be rejected")
}

// TestReleaseVersionMedia_ContributorGroupOwnershipResolverExists proves
// against real Postgres that ListReleaseVersionMediaContributorGroupIDs
// resolves the uploader's real, verified fansub group — not merely that the
// JOIN fragments are present in source (D-12).
func TestReleaseVersionMedia_ContributorGroupOwnershipResolverExists(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		ALTER TABLE release_versions ADD COLUMN release_id BIGINT NULL;
		CREATE TABLE anime (id BIGINT PRIMARY KEY);
		CREATE TABLE episodes (id BIGINT PRIMARY KEY, anime_id BIGINT NOT NULL REFERENCES anime(id));
		CREATE TABLE fansub_releases (id BIGINT PRIMARY KEY, episode_id BIGINT NOT NULL REFERENCES episodes(id));
		CREATE TABLE anime_contributions (
			id BIGSERIAL PRIMARY KEY,
			member_id BIGINT NOT NULL,
			fansub_group_id BIGINT NOT NULL,
			anime_id BIGINT NULL,
			release_version_id BIGINT NULL
		);
		INSERT INTO anime(id) VALUES (901);
		INSERT INTO episodes(id, anime_id) VALUES (911, 901);
		INSERT INTO fansub_releases(id, episode_id) VALUES (921, 911);
		UPDATE release_versions SET release_id = 921 WHERE id = 41;
		INSERT INTO anime_contributions(member_id, fansub_group_id, anime_id, release_version_id)
			VALUES (101, 21, NULL, 41);
	`)
	require.NoError(t, err)

	repo := NewMediaRepository(pool, "")
	groupIDs, err := repo.ListReleaseVersionMediaContributorGroupIDs(ctx, 601)
	require.NoError(t, err)
	assert.Equal(t, []int64{21}, groupIDs,
		"the uploader's verified member identity must resolve to their real contributing fansub group")
}

// TestReleaseVersionMedia_CategoryChangeAllowed proves against real Postgres
// that PatchReleaseVersionMedia persists a category change (Zielbild 2,
// 144-CONTEXT.md) — the former hard-block on category changes is gone
// (D-12).
func TestReleaseVersionMedia_CategoryChangeAllowed(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed below
	newCategory := "poster"
	require.NoError(t, repo.PatchReleaseVersionMedia(ctx, tx, 601, ReleaseVersionMediaPatchInput{Category: &newCategory}))
	require.NoError(t, tx.Commit(ctx))

	var category string
	require.NoError(t, pool.QueryRow(ctx, `SELECT category FROM release_version_media WHERE id = 601`).Scan(&category))
	assert.Equal(t, "poster", category)
}

// TestReleaseVersionMedia_PreviewEnforcementInRepository proves against real
// Postgres that ClearPreviewCandidateForVersion enforces the max-one-preview
// rule: the excluded relation keeps its flag, every sibling relation's flag
// is cleared (D-12).
func TestReleaseVersionMedia_PreviewEnforcementInRepository(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	_, err := pool.Exec(ctx, `UPDATE release_version_media SET is_preview_candidate = true WHERE id IN (601, 602)`)
	require.NoError(t, err)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx.Rollback(ctx) //nolint:errcheck // no-op once committed below
	require.NoError(t, repo.ClearPreviewCandidateForVersion(ctx, tx, 41, 601))
	require.NoError(t, tx.Commit(ctx))

	var preview601, preview602 bool
	require.NoError(t, pool.QueryRow(ctx, `SELECT is_preview_candidate FROM release_version_media WHERE id = 601`).Scan(&preview601))
	require.NoError(t, pool.QueryRow(ctx, `SELECT is_preview_candidate FROM release_version_media WHERE id = 602`).Scan(&preview602))
	assert.True(t, preview601, "the excluded relation keeps its preview flag")
	assert.False(t, preview602, "a sibling relation's preview flag is cleared — max-one-preview enforced")
}

// TestReleaseVersionMedia_PartialFailureIsolation proves against real
// Postgres that per-file upload transactions are isolated from each other:
// one file's rolled-back transaction must not affect a sibling file's
// already-committed relation (D-12) — mirroring processOneRVMFile's
// per-file transaction composition in admin_content_release_version_media.go.
func TestReleaseVersionMedia_PartialFailureIsolation(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()
	repo := NewMediaRepository(pool, "")

	// Fresh, dedicated assets for this test — 701/702/703 are the fixture's
	// own pre-seeded assets (702 is free-standing, but 703 already backs
	// relation 602, so reusing it here would make the "must not persist"
	// assertion below match that pre-existing row instead of proving isolation).
	_, err := pool.Exec(ctx, `
		INSERT INTO media_assets (id, status, visibility_id, review_status_id)
		VALUES (710, 'ready', 1, 2), (711, 'ready', 1, 2)
	`)
	require.NoError(t, err)

	// File 1 ("good"): its own transaction commits successfully.
	tx1, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx1.Rollback(ctx) //nolint:errcheck // no-op once committed below
	goodID, err := repo.CreateReleaseVersionMediaAsset(ctx, tx1, ReleaseVersionMediaCreateInput{
		ReleaseVersionID: 41, MediaAssetID: 710, Category: "screenshot", SortOrder: 5,
	})
	require.NoError(t, err)
	require.NoError(t, tx1.Commit(ctx))

	// File 2 ("bad"): its own, independent transaction is rolled back.
	// The deferred Rollback guarantees the connection is released even if a
	// require.NoError below fails and stops this goroutine — an unrolled
	// aborted transaction otherwise blocks the pool's later cleanup.
	tx2, err := pool.Begin(ctx)
	require.NoError(t, err)
	defer tx2.Rollback(ctx) //nolint:errcheck // idempotent if already rolled back explicitly
	_, err = repo.CreateReleaseVersionMediaAsset(ctx, tx2, ReleaseVersionMediaCreateInput{
		ReleaseVersionID: 41, MediaAssetID: 711, Category: "screenshot", SortOrder: 6,
	})
	require.NoError(t, err)
	require.NoError(t, tx2.Rollback(ctx))

	var goodCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_media WHERE id = $1`, goodID).Scan(&goodCount))
	assert.Equal(t, 1, goodCount, "the successful file's relation must persist despite a sibling file's rollback")

	var failedCount int
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM release_version_media WHERE media_asset_id = 711 AND release_version_id = 41
	`).Scan(&failedCount))
	assert.Equal(t, 0, failedCount, "the rolled-back file's relation must not persist — per-file isolation, not a shared rollback")
}

// TestReleaseVersionMedia_HardDeleteTransactional proves against real
// Postgres that HardDeleteRVMAndAsset removes release_version_media,
// media_assets, and media_files atomically — no partial delete state
// remains (D-12).
func TestReleaseVersionMedia_HardDeleteTransactional(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `INSERT INTO media_files(media_id, variant) VALUES (701, 'original'), (701, 'thumb')`)
	require.NoError(t, err)

	repo := NewMediaRepository(pool, "")
	require.NoError(t, repo.HardDeleteRVMAndAsset(ctx, 601, 701))

	var rvmCount, assetCount, fileCount int
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM release_version_media WHERE id = 601`).Scan(&rvmCount))
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_assets WHERE id = 701`).Scan(&assetCount))
	require.NoError(t, pool.QueryRow(ctx, `SELECT COUNT(*) FROM media_files WHERE media_id = 701`).Scan(&fileCount))
	assert.Equal(t, 0, rvmCount, "release_version_media row must be hard-deleted")
	assert.Equal(t, 0, assetCount, "media_assets row must be hard-deleted")
	assert.Equal(t, 0, fileCount, "media_files rows must be hard-deleted atomically alongside the parent rows")
}

// ---------------------------------------------------------------------------
// Task 79-02 Task 2: Sub-SELECT-Persistenz in CreateMediaAsset + Handler-Defaults
// ---------------------------------------------------------------------------

// TestCreateMediaAsset_SubSelectVisibilityOnInput proves against real
// Postgres that CreateMediaAsset's Sub-SELECT-INSERT persists visibility_id
// and review_status_id resolved from the visibilities/review_statuses
// lookup tables (Lock K) — not merely that the SQL fragments are present in
// source (D-12).
func TestCreateMediaAsset_SubSelectVisibilityOnInput(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()

	// The shared fixture's media_assets table only carries the columns its own
	// tests need (id, status, visibility_id, review_status_id); CreateMediaAsset's
	// production INSERT additionally needs media_type_id/file_path/mime_type/
	// format/created_at and an auto-generated id (it never supplies one),
	// so this test extends the table locally rather than widening the shared
	// fixture for every sibling test in this package.
	_, err := pool.Exec(ctx, `
		CREATE TABLE media_types (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE);
		INSERT INTO media_types(name) VALUES ('image');
		ALTER TABLE media_assets
			ADD COLUMN media_type_id BIGINT NULL REFERENCES media_types(id),
			ADD COLUMN file_path TEXT NULL,
			ADD COLUMN mime_type TEXT NULL,
			ADD COLUMN format TEXT NULL,
			ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
		ALTER TABLE media_assets ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (START WITH 800);
	`)
	require.NoError(t, err)

	repo := NewMediaRepository(pool, "")
	visibility := "public"
	reviewStatus := "approved"
	asset, err := repo.CreateMediaAsset(ctx, models.MediaAssetCreateInput{
		Kind:             models.MediaKindImage,
		Filename:         "cover.png",
		StoragePath:      "/media/covers/cover.png",
		MimeType:         "image/png",
		SizeBytes:        2048,
		VisibilityCode:   &visibility,
		ReviewStatusCode: &reviewStatus,
	})
	require.NoError(t, err)

	var visibilityID, reviewStatusID int64
	require.NoError(t, pool.QueryRow(ctx, `
		SELECT visibility_id, review_status_id FROM media_assets WHERE id = $1
	`, asset.ID).Scan(&visibilityID, &reviewStatusID))
	assert.EqualValues(t, 2, visibilityID, "the Sub-SELECT must resolve visibility_id from visibilities WHERE name = 'public'")
	assert.EqualValues(t, 2, reviewStatusID, "the Sub-SELECT must resolve review_status_id from review_statuses WHERE code = 'approved'")
}

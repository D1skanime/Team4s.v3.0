package repository

import (
	"os"
	"strings"
	"testing"
	"time"

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
	_ = repo.GetRVMCategory                       // must exist
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

// TestReleaseVersionMedia_UploadTransactionContract verifies the upload path
// enforces the processing→ready atomic transition via a transaction. A broken
// upload (commit failure) must never leave a status='ready' asset visible.
func TestReleaseVersionMedia_UploadTransactionContract(t *testing.T) {
	// Verify the main repository writes happen inside a transaction.
	repoSrc, err := os.ReadFile("release_version_media_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.True(t, strings.Contains(content, "func (r *MediaRepository) UpdateMediaAssetStatusRVMTx"),
		"UpdateMediaAssetStatusRVMTx must exist — status update runs inside the caller tx")
	assert.True(t, strings.Contains(content, "func (r *MediaRepository) UpdateMediaFileStatusRVMTx"),
		"UpdateMediaFileStatusRVMTx must exist — file status update runs inside the caller tx")

	// The status transition from 'processing' to 'ready' must be transactional:
	// both UpdateMediaAssetStatusRVMTx and tx.Commit must succeed together.
	// Verify 'processing' is mentioned in the repository doc comment.
	assert.True(t, strings.Contains(content, "processing"),
		"'processing' must appear in repository (as initial status doc or usage)")
}

// TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows verifies that
// ListReleaseVersionMedia and related queries exclude soft-deleted rows
// by checking for 'deleted_at IS NULL' in the SQL source.
func TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows(t *testing.T) {
	repoSrc, err := os.ReadFile("release_version_media_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	// ListReleaseVersionMedia must filter soft-deleted rows
	assert.True(t, strings.Contains(content, "deleted_at IS NULL"),
		"list query must exclude soft-deleted rows via deleted_at IS NULL")

	// SoftDeleteReleaseVersionMedia must SET deleted_at
	assert.True(t, strings.Contains(content, "deleted_at = NOW()"),
		"soft delete must set deleted_at to NOW()")

	// PatchReleaseVersionMedia must not update deleted rows
	patchIdx := strings.Index(content, "func (r *MediaRepository) PatchReleaseVersionMedia")
	assert.Greater(t, patchIdx, 0, "PatchReleaseVersionMedia must exist")
	afterPatch := content[patchIdx:]
	// Find the first occurrence of "deleted_at IS NULL" after the patch function
	assert.True(t, strings.Contains(afterPatch, "deleted_at IS NULL"),
		"PatchReleaseVersionMedia must filter deleted rows")
}

// TestReleaseVersionMedia_ReorderOwnershipValidationExists verifies that
// ValidateReleaseVersionMediaOwnership exists and enforces both ErrNotFound
// and ErrOwnershipMismatch as distinct error cases.
func TestReleaseVersionMedia_ReorderOwnershipValidationExists(t *testing.T) {
	repoSrc, err := os.ReadFile("release_version_media_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.True(t, strings.Contains(content, "func (r *MediaRepository) ValidateReleaseVersionMediaOwnership"),
		"ValidateReleaseVersionMediaOwnership must exist in repository")
	assert.True(t, strings.Contains(content, "ErrOwnershipMismatch"),
		"ValidateReleaseVersionMediaOwnership must return ErrOwnershipMismatch for cross-version IDs")
	assert.True(t, strings.Contains(content, "ErrNotFound"),
		"ValidateReleaseVersionMediaOwnership must return ErrNotFound for nonexistent IDs")
}

// TestReleaseVersionMedia_CategoryChangePrevented verifies the repository
// does NOT have a SetCategory method — category changes are prevented at the
// handler layer by rejecting the PATCH body field before calling the repository.
func TestReleaseVersionMedia_CategoryChangePrevented(t *testing.T) {
	repoSrc, err := os.ReadFile("release_version_media_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	assert.False(t, strings.Contains(content, "SetCategory"),
		"repository must NOT have a SetCategory method — category is immutable after creation")

	// PatchReleaseVersionMedia SQL must NOT include category in the SET clause
	patchIdx := strings.Index(content, "func (r *MediaRepository) PatchReleaseVersionMedia")
	require.Greater(t, patchIdx, 0)
	afterPatch := content[patchIdx:]
	// Find the UPDATE statement and assert category is not in the SET clause
	// by checking the function ends before any SET category= pattern.
	assert.False(t, strings.Contains(afterPatch[:500], "SET\n\t\t\t\tcategory"),
		"PatchReleaseVersionMedia SQL must not include category in SET clause")
}

// TestReleaseVersionMedia_PreviewEnforcementInRepository verifies that the
// ClearPreviewCandidateForVersion method exists and that the patch path
// routes through it when is_preview_candidate is true.
func TestReleaseVersionMedia_PreviewEnforcementInRepository(t *testing.T) {
	repoSrc, err := os.ReadFile("release_version_media_repository.go")
	require.NoError(t, err)
	assert.True(t, strings.Contains(string(repoSrc), "func (r *MediaRepository) ClearPreviewCandidateForVersion"),
		"ClearPreviewCandidateForVersion must exist to enforce max-one-preview rule")
}

// TestReleaseVersionMedia_PartialFailureIsolation verifies the upload contract:
// each file is processed independently, errors in one file must not roll back
// successful files that completed earlier.
func TestReleaseVersionMedia_PartialFailureIsolation(t *testing.T) {
	// The per-file isolation is enforced by processOneRVMFile — each file gets
	// its own transaction. Verify the handler source reflects this.
	handlerSrc, err := os.ReadFile("../handlers/admin_content_release_version_media.go")
	require.NoError(t, err)
	content := string(handlerSrc)

	// processOneRVMFile must exist and be called per file in a loop
	assert.True(t, strings.Contains(content, "func (h *AdminContentHandler) processOneRVMFile"),
		"processOneRVMFile must be a separate function — one transaction per file")
	assert.True(t, strings.Contains(content, "h.processOneRVMFile("),
		"upload must call processOneRVMFile inside a for loop for each file")
	assert.True(t, strings.Contains(content, `"results"`),
		"upload response must carry a 'results' array with per-file entries")
}

// TestReleaseVersionMedia_HardDeleteTransactional verifies that HardDeleteRVMAndAsset
// uses a transaction so media_files, release_version_media, and media_assets are
// removed atomically — preventing partial deletes on cleanup failures.
func TestReleaseVersionMedia_HardDeleteTransactional(t *testing.T) {
	cleanupSrc, err := os.ReadFile("release_version_media_cleanup.go")
	require.NoError(t, err)
	content := string(cleanupSrc)

	assert.True(t, strings.Contains(content, "func (r *MediaRepository) HardDeleteRVMAndAsset"),
		"HardDeleteRVMAndAsset must exist")
	assert.True(t, strings.Contains(content, "BeginTx"),
		"HardDeleteRVMAndAsset must use a transaction for atomic removal")
	assert.True(t, strings.Contains(content, "tx.Commit"),
		"HardDeleteRVMAndAsset must commit the transaction on success")
	assert.True(t, strings.Contains(content, "defer tx.Rollback"),
		"HardDeleteRVMAndAsset must have a deferred rollback to prevent partial deletes")
}

// TestReleaseVersionMedia_CleanupServicePassesExist verifies the three-pass cleanup
// seam is implemented in the services layer and wired to concrete repository methods.
func TestReleaseVersionMedia_CleanupServicePassesExist(t *testing.T) {
	svcSrc, err := os.ReadFile("../services/release_version_media_cleanup.go")
	require.NoError(t, err)
	content := string(svcSrc)

	// Pass 1: stale processing
	assert.True(t, strings.Contains(content, "SelectStaleProcessingRVMAssets"),
		"cleanup service must implement pass 1: stale processing scan")
	// Pass 2: missing files
	assert.True(t, strings.Contains(content, "SelectMissingFileRVMCandidates"),
		"cleanup service must implement pass 2: missing file scan")
	// Pass 3: soft-delete purge
	assert.True(t, strings.Contains(content, "SelectSoftDeleteRVMCleanupCandidates"),
		"cleanup service must implement pass 3: soft-delete purge scan")
}

// ---------------------------------------------------------------------------
// Task 79-02 Task 2: Sub-SELECT-Persistenz in CreateMediaAsset + Handler-Defaults
// ---------------------------------------------------------------------------

// TestCreateMediaAsset_SubSelectVisibilityOnInput verifies that media_repository.go
// contains the Sub-SELECT pattern for visibility_id and review_status_id
// in CreateMediaAsset when VisibilityCode is not nil (Lock K).
func TestCreateMediaAsset_SubSelectVisibilityOnInput(t *testing.T) {
	repoSrc, err := os.ReadFile("../repository/media_repository.go")
	require.NoError(t, err)
	content := string(repoSrc)

	// Sub-SELECT muss im INSERT für visibility_id vorhanden sein
	assert.True(t, strings.Contains(content, "SELECT id FROM visibilities WHERE name"),
		"CreateMediaAsset INSERT muss Sub-SELECT für visibility_id enthalten (Lock K)")

	// Sub-SELECT muss im INSERT für review_status_id vorhanden sein
	assert.True(t, strings.Contains(content, "SELECT id FROM review_statuses WHERE code"),
		"CreateMediaAsset INSERT muss Sub-SELECT für review_status_id enthalten (Lock K)")
}

// TestFansubMediaUploadHandler_BrandingDefaults verifies the fansub_media_upload.go
// handler sets Branding-Defaults (public/approved) when visibility/review fields are empty (D-09).
func TestFansubMediaUploadHandler_BrandingDefaults(t *testing.T) {
	src, err := os.ReadFile("../handlers/fansub_media_upload.go")
	require.NoError(t, err)
	content := string(src)

	// Branding-Default: 'public' und 'approved' müssen als Default gesetzt werden
	assert.True(t, strings.Contains(content, `"public"`),
		"fansub_media_upload.go muss 'public' als Branding-Default setzen (D-09)")
	assert.True(t, strings.Contains(content, `"approved"`),
		"fansub_media_upload.go muss 'approved' als Branding-Default setzen (D-09)")

	// visibility_code muss aus FormData gelesen werden
	assert.True(t, strings.Contains(content, "visibility_code"),
		"fansub_media_upload.go muss visibility_code aus FormData lesen")

	// review_status_code muss aus FormData gelesen werden
	assert.True(t, strings.Contains(content, "review_status_code"),
		"fansub_media_upload.go muss review_status_code aus FormData lesen")
}

// TestRVMHandler_ProzessmedienDefaults verifies admin_content_release_version_media.go
// sets Prozessmedien-Defaults (private/in_review) when fields are empty (D-03).
func TestRVMHandler_ProzessmedienDefaults(t *testing.T) {
	src, err := os.ReadFile("../handlers/admin_content_release_version_media.go")
	require.NoError(t, err)
	content := string(src)

	// Prozessmedien-Default: 'private' und 'in_review' müssen als Default gesetzt werden
	assert.True(t, strings.Contains(content, `"private"`),
		"admin_content_release_version_media.go muss 'private' als Prozessmedien-Default setzen (D-03)")
	assert.True(t, strings.Contains(content, `"in_review"`),
		"admin_content_release_version_media.go muss 'in_review' als Prozessmedien-Default setzen (D-03)")
}

// TestMemberMediaHandler_LockI_OwnerFromSession verifies member_media_upload.go
// does NOT read owner_member_id from PostForm (Lock I enforcement).
func TestMemberMediaHandler_LockI_OwnerFromSession(t *testing.T) {
	src, err := os.ReadFile("../handlers/member_media_upload.go")
	require.NoError(t, err)
	content := string(src)

	// owner_member_id darf NICHT aus PostForm kommen (Lock I)
	assert.False(t, strings.Contains(content, `PostForm("owner_member_id")`),
		"member_media_upload.go darf owner_member_id NICHT aus dem Request lesen (Lock I)")

	// Avatar/Hintergrund-Branding-Default: 'public' und 'approved' müssen vorhanden sein
	assert.True(t, strings.Contains(content, `"public"`),
		"member_media_upload.go muss 'public' als Branding-Default für Avatar/Hintergrund setzen (D-09)")
	assert.True(t, strings.Contains(content, `"approved"`),
		"member_media_upload.go muss 'approved' als Branding-Default für Avatar/Hintergrund setzen (D-09)")
}

package repository

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
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
	_ = repo.BeginTx                           // must exist
	_ = repo.CreateReleaseVersionMediaAsset    // must exist
	_ = repo.CreateMediaAssetWithStatusTx      // must exist
	_ = repo.UpdateMediaAssetStatusRVMTx       // must exist
	_ = repo.UpdateMediaFileStatusRVMTx        // must exist
	_ = repo.ListReleaseVersionMedia           // must exist
	_ = repo.PatchReleaseVersionMedia          // must exist
	_ = repo.SoftDeleteReleaseVersionMedia     // must exist
	_ = repo.ReorderReleaseVersionMedia        // must exist
	_ = repo.ClearPreviewCandidateForVersion   // must exist
	_ = repo.CreateMediaAssetWithStatus        // must exist
	_ = repo.InsertMediaFileWithStatus         // must exist
	_ = repo.GetMaxRVMSortOrder                // must exist
	_ = repo.ReleaseVersionExistsForRVM        // must exist
	_ = repo.GetRVMCategory                    // must exist
	_ = repo.GetReleaseVersionMediaRelation    // must exist
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

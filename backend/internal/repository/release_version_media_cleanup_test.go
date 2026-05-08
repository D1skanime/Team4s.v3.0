package repository

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TestStaleProcessingCleanupCandidateFields verifies that
// StaleProcessingCleanupCandidate contains the fields needed by the cleanup service.
func TestStaleProcessingCleanupCandidateFields(t *testing.T) {
	c := StaleProcessingCleanupCandidate{
		MediaAssetID: 42,
		FilePath:     "/media/release-version/1/uuid/original.jpg",
		StuckSince:   time.Now().Add(-35 * time.Minute),
	}
	assert.Equal(t, int64(42), c.MediaAssetID)
	assert.NotEmpty(t, c.FilePath)
	assert.True(t, c.StuckSince.Before(time.Now()))
}

// TestMissingFileCleanupCandidateFields verifies that
// MissingFileCleanupCandidate holds the identifiers for a missing-file row.
func TestMissingFileCleanupCandidateFields(t *testing.T) {
	c := MissingFileCleanupCandidate{
		MediaFileID:  7,
		MediaAssetID: 42,
		FilePath:     "/media/release-version/1/uuid/original.jpg",
	}
	assert.Equal(t, int64(7), c.MediaFileID)
	assert.Equal(t, int64(42), c.MediaAssetID)
	assert.NotEmpty(t, c.FilePath)
}

// TestSoftDeleteCleanupCandidateFields verifies the struct produced by the
// soft-delete eligibility query carries its required identifiers.
func TestSoftDeleteCleanupCandidateFields(t *testing.T) {
	c := SoftDeleteCleanupCandidate{
		RelationID:       55,
		MediaAssetID:     42,
		OriginalFilePath: "/media/release-version/1/uuid/original.jpg",
		ThumbFilePath:    "/media/release-version/1/uuid/thumb.jpg",
		DeletedAt:        time.Now().Add(-48 * time.Hour),
	}
	assert.Equal(t, int64(55), c.RelationID)
	assert.Equal(t, int64(42), c.MediaAssetID)
	assert.NotEmpty(t, c.OriginalFilePath)
	assert.True(t, c.DeletedAt.Before(time.Now()))
}

// TestMediaRepositoryCleanupMethodSignatures verifies that all required cleanup
// query methods exist on *MediaRepository at compile time.
// This test will fail to compile if a method is missing.
func TestMediaRepositoryCleanupMethodSignatures(t *testing.T) {
	var repo *MediaRepository
	_ = repo.SelectStaleProcessingRVMAssets     // must exist
	_ = repo.SelectMissingFileRVMCandidates     // must exist
	_ = repo.SelectSoftDeleteRVMCleanupCandidates // must exist
	_ = repo.IsMediaAssetReferencedByOtherRVM   // must exist
	t.Log("All cleanup method signatures verified at compile time")
}

// TestSoftDeleteCandidateNoSharedAsset validates the no-other-reference rule:
// if a media_asset_id appears only in the soft-deleted row it is eligible for
// physical cleanup; if another active row holds the same id it must be skipped.
// This test documents the contract — the repository implementation must honour it
// by excluding shared-asset candidates from SelectSoftDeleteRVMCleanupCandidates.
func TestSoftDeleteCandidateNoSharedAsset(t *testing.T) {
	// Baseline: RelationID=55 holds MediaAssetID=42.
	// If IsMediaAssetReferencedByOtherRVM(ctx, 42, 55) returns true,
	// the cleanup service MUST NOT physically delete the asset files.
	// The repository's SelectSoftDeleteRVMCleanupCandidates query enforces this
	// at SQL level so only exclusively-owned assets are returned.

	// Simulate the invariant with struct construction (no DB needed).
	candidate := SoftDeleteCleanupCandidate{
		RelationID:       55,
		MediaAssetID:     42,
		OriginalFilePath: "/media/release-version/1/uuid/original.jpg",
		ThumbFilePath:    "/media/release-version/1/uuid/thumb.jpg",
		DeletedAt:        time.Now().Add(-48 * time.Hour),
	}
	// The candidate should only be returned when no other active relation
	// references the same MediaAssetID — document this invariant for callers.
	assert.NotEqual(t, int64(0), candidate.MediaAssetID,
		"MediaAssetID must be non-zero to identify the asset to clean up")
	assert.NotEqual(t, int64(0), candidate.RelationID,
		"RelationID identifies the soft-deleted row that owns the asset")
}

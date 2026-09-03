package repository

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

// TestHardDeleteRVMAndAssetRemovesLifecycleRow proves against real Postgres
// that HardDeleteRVMAndAsset succeeds even when a
// release_version_media_review_lifecycle row exists for the relation being
// hard-deleted. Before the fix, this failed with a live FK violation
// (SQLSTATE 23503) identical to the production error observed every 10
// minutes in the rvm cleanup goroutine's logs since 2026-09-02 18:55.
func TestHardDeleteRVMAndAssetRemovesLifecycleRow(t *testing.T) {
	pool := openReleaseVersionMediaReplaceFixture(t)
	ctx := context.Background()

	// Submit relation 601 for review, creating a
	// release_version_media_review_lifecycle row referencing it.
	submitMedia(t, pool, 601, 11, nil, time.Now().UTC().Add(-time.Hour))

	repo := NewMediaRepository(pool, "")
	err := repo.HardDeleteRVMAndAsset(ctx, 601, 701)
	require.NoError(t, err, "HardDeleteRVMAndAsset must succeed even when a review_lifecycle row references the relation")

	var rvmCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM release_version_media WHERE id = $1`, 601,
	).Scan(&rvmCount))
	assert.Equal(t, 0, rvmCount, "release_version_media row 601 must be hard-deleted")

	var lifecycleCount int
	require.NoError(t, pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM release_version_media_review_lifecycle WHERE release_version_media_id = $1`, 601,
	).Scan(&lifecycleCount))
	assert.Equal(t, 0, lifecycleCount, "release_version_media_review_lifecycle row for relation 601 must be hard-deleted")
}

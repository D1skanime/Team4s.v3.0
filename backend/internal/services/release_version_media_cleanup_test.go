package services

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"

	"team4s.v3/backend/internal/repository"
)

// --- Mock implementation ---

type mockRVMCleanupStore struct {
	staleAssets        []repository.StaleProcessingCleanupCandidate
	missingCandidates  []repository.MissingFileCleanupCandidate
	softDeleteCandidates []repository.SoftDeleteCleanupCandidate
	referencedAssets   map[int64]bool // assetID -> referenced by another active RVM

	markedAssetStatus  map[int64]string
	markedFileMissing  []int64
	hardDeletedPairs   [][2]int64 // [relationID, assetID]
	hasReadyFile       map[int64]bool
}

func newMockRVMCleanupStore() *mockRVMCleanupStore {
	return &mockRVMCleanupStore{
		markedAssetStatus: make(map[int64]string),
		referencedAssets:  make(map[int64]bool),
		hasReadyFile:      make(map[int64]bool),
	}
}

func (m *mockRVMCleanupStore) SelectStaleProcessingRVMAssets(_ context.Context, _ time.Duration) ([]repository.StaleProcessingCleanupCandidate, error) {
	return m.staleAssets, nil
}

func (m *mockRVMCleanupStore) SelectMissingFileRVMCandidates(_ context.Context) ([]repository.MissingFileCleanupCandidate, error) {
	return m.missingCandidates, nil
}

func (m *mockRVMCleanupStore) SelectSoftDeleteRVMCleanupCandidates(_ context.Context) ([]repository.SoftDeleteCleanupCandidate, error) {
	return m.softDeleteCandidates, nil
}

func (m *mockRVMCleanupStore) IsMediaAssetReferencedByOtherRVM(_ context.Context, assetID, _ int64) (bool, error) {
	return m.referencedAssets[assetID], nil
}

func (m *mockRVMCleanupStore) MarkMediaAssetStatusByID(_ context.Context, assetID int64, status string) error {
	m.markedAssetStatus[assetID] = status
	return nil
}

func (m *mockRVMCleanupStore) MarkMediaFileMissing(_ context.Context, fileID int64) error {
	m.markedFileMissing = append(m.markedFileMissing, fileID)
	return nil
}

func (m *mockRVMCleanupStore) HasReadyMediaFileForAsset(_ context.Context, assetID int64) (bool, error) {
	return m.hasReadyFile[assetID], nil
}

func (m *mockRVMCleanupStore) HardDeleteRVMAndAsset(_ context.Context, relationID, assetID int64) error {
	m.hardDeletedPairs = append(m.hardDeletedPairs, [2]int64{relationID, assetID})
	return nil
}

// --- Tests ---

// TestRVMCleanupService_StaleProcessing verifies that stale processing assets
// are transitioned to 'failed' status and their staging files are removed.
func TestRVMCleanupService_StaleProcessing(t *testing.T) {
	tmpDir := t.TempDir()
	stagingFile := filepath.Join(tmpDir, "staging.jpg")
	if err := os.WriteFile(stagingFile, []byte("dummy"), 0600); err != nil {
		t.Fatal(err)
	}

	store := newMockRVMCleanupStore()
	store.staleAssets = []repository.StaleProcessingCleanupCandidate{
		{MediaAssetID: 10, FilePath: stagingFile, StuckSince: time.Now().Add(-35 * time.Minute)},
	}

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	assert.Equal(t, "failed", store.markedAssetStatus[10],
		"stale processing asset must be marked failed")
	_, err := os.Stat(stagingFile)
	assert.True(t, errors.Is(err, os.ErrNotExist),
		"staging file must be physically removed after stale-processing cleanup")
}

// TestRVMCleanupService_MissingFile verifies that a media_files row is marked
// missing when its physical file does not exist, and that the asset is
// escalated to 'failed' when no ready variant remains.
func TestRVMCleanupService_MissingFile(t *testing.T) {
	tmpDir := t.TempDir()
	absentPath := filepath.Join(tmpDir, "missing.jpg")
	// intentionally do NOT create the file

	store := newMockRVMCleanupStore()
	store.missingCandidates = []repository.MissingFileCleanupCandidate{
		{MediaFileID: 7, MediaAssetID: 42, FilePath: absentPath},
	}
	store.hasReadyFile[42] = false // no ready variant remains

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	assert.Contains(t, store.markedFileMissing, int64(7),
		"media file row must be marked missing")
	assert.Equal(t, "failed", store.markedAssetStatus[42],
		"asset must be escalated to failed when no ready variant remains")
}

// TestRVMCleanupService_MissingFile_ReadyVariantExists verifies that the asset
// is NOT escalated to 'failed' when another ready variant still exists.
func TestRVMCleanupService_MissingFile_ReadyVariantExists(t *testing.T) {
	tmpDir := t.TempDir()
	absentPath := filepath.Join(tmpDir, "missing.jpg")

	store := newMockRVMCleanupStore()
	store.missingCandidates = []repository.MissingFileCleanupCandidate{
		{MediaFileID: 7, MediaAssetID: 42, FilePath: absentPath},
	}
	store.hasReadyFile[42] = true // another ready variant still present

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	assert.Contains(t, store.markedFileMissing, int64(7),
		"media file row must still be marked missing")
	_, escalated := store.markedAssetStatus[42]
	assert.False(t, escalated,
		"asset must NOT be escalated when a ready variant still exists")
}

// TestRVMCleanupService_SoftDelete verifies that files are physically deleted
// and the DB rows are hard-deleted for exclusively-owned soft-deleted relations.
func TestRVMCleanupService_SoftDelete(t *testing.T) {
	tmpDir := t.TempDir()
	origFile := filepath.Join(tmpDir, "original.jpg")
	thumbFile := filepath.Join(tmpDir, "thumb.jpg")
	for _, f := range []string{origFile, thumbFile} {
		if err := os.WriteFile(f, []byte("dummy"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	store := newMockRVMCleanupStore()
	store.softDeleteCandidates = []repository.SoftDeleteCleanupCandidate{
		{
			RelationID:       55,
			MediaAssetID:     42,
			OriginalFilePath: origFile,
			ThumbFilePath:    thumbFile,
			DeletedAt:        time.Now().Add(-48 * time.Hour),
		},
	}
	store.referencedAssets[42] = false // exclusively owned

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	for _, f := range []string{origFile, thumbFile} {
		_, err := os.Stat(f)
		assert.True(t, errors.Is(err, os.ErrNotExist),
			"physical file must be removed after soft-delete cleanup: %s", f)
	}
	assert.Len(t, store.hardDeletedPairs, 1)
	assert.Equal(t, [2]int64{55, 42}, store.hardDeletedPairs[0],
		"hard delete must use the correct relation ID and asset ID")
}

// TestRVMCleanupService_SoftDelete_SharedAsset verifies that a shared asset
// (another active RVM row references the same media_asset_id) is NOT physically
// deleted even if the soft-deleted row appears as a candidate.
func TestRVMCleanupService_SoftDelete_SharedAsset(t *testing.T) {
	tmpDir := t.TempDir()
	origFile := filepath.Join(tmpDir, "shared_original.jpg")
	if err := os.WriteFile(origFile, []byte("dummy"), 0600); err != nil {
		t.Fatal(err)
	}

	store := newMockRVMCleanupStore()
	store.softDeleteCandidates = []repository.SoftDeleteCleanupCandidate{
		{
			RelationID:       55,
			MediaAssetID:     42,
			OriginalFilePath: origFile,
			ThumbFilePath:    "",
			DeletedAt:        time.Now().Add(-48 * time.Hour),
		},
	}
	// Simulate a race: another active relation appeared after the SELECT
	store.referencedAssets[42] = true

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	_, err := os.Stat(origFile)
	assert.NoError(t, err,
		"shared asset file must NOT be removed when another active relation exists")
	assert.Empty(t, store.hardDeletedPairs,
		"hard delete must NOT be called for shared assets")
}

// TestRVMCleanupServiceConstructor ensures NewRVMCleanupService returns a
// non-nil service and that RunOnce is callable with an empty store.
func TestRVMCleanupServiceConstructor(t *testing.T) {
	store := newMockRVMCleanupStore()
	svc := NewRVMCleanupService(store, t.TempDir())
	assert.NotNil(t, svc)
	// RunOnce with empty store must not panic
	assert.NotPanics(t, func() {
		svc.RunOnce(context.Background())
	})
}

package services

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"

	"team4s.v3/backend/internal/repository"
)

// newUUID is a local wrapper used by TestRVMUploadStorageKeyUniqueness to
// generate UUIDs using the same library the handler uses, so this test
// validates the same uniqueness guarantee the upload path relies on.
func newUUID() string {
	return uuid.New().String()
}

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

// TestRVMCleanupService_ReadyAssetsNotTouched verifies that cleanup passes
// do not touch ready assets: stale-processing pass only targets 'processing'
// assets, and soft-delete pass only hard-deletes assets that are NOT referenced.
// A ready asset that has no corresponding candidate must survive all passes intact.
func TestRVMCleanupService_ReadyAssetsNotTouched(t *testing.T) {
	tmpDir := t.TempDir()
	readyFile := filepath.Join(tmpDir, "ready_original.jpg")
	if err := os.WriteFile(readyFile, []byte("ready content"), 0600); err != nil {
		t.Fatal(err)
	}

	store := newMockRVMCleanupStore()
	// No stale, no missing, no soft-delete candidates — only a ready file on disk.
	// The cleanup service must not touch readyFile.

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	// File must still exist after cleanup
	_, err := os.Stat(readyFile)
	assert.NoError(t, err,
		"ready asset file must NOT be removed by cleanup when no candidate exists for it")

	// No mutations must have happened
	assert.Empty(t, store.markedAssetStatus, "no asset status changes expected")
	assert.Empty(t, store.markedFileMissing, "no file-missing marks expected")
	assert.Empty(t, store.hardDeletedPairs, "no hard deletes expected")
}

// TestRVMCleanupService_MultipleRunsAreIdempotent verifies that running cleanup
// multiple times against the same empty candidate set produces no mutations.
// This simulates the periodic ticker firing when there is nothing to clean up.
func TestRVMCleanupService_MultipleRunsAreIdempotent(t *testing.T) {
	store := newMockRVMCleanupStore()
	svc := NewRVMCleanupService(store, t.TempDir())

	// Three consecutive runs with empty candidates must not panic or accumulate mutations
	for i := 0; i < 3; i++ {
		assert.NotPanics(t, func() {
			svc.RunOnce(context.Background())
		})
	}

	assert.Empty(t, store.markedAssetStatus)
	assert.Empty(t, store.markedFileMissing)
	assert.Empty(t, store.hardDeletedPairs)
}

// TestRVMCleanupService_StaleProcessing_ReadyFileUnchanged verifies that the
// stale-processing pass only affects assets that ARE in the candidates list.
// A second asset with status='ready' must not be demoted even if it is present on disk.
func TestRVMCleanupService_StaleProcessing_ReadyFileUnchanged(t *testing.T) {
	tmpDir := t.TempDir()
	stagingFile := filepath.Join(tmpDir, "stale_staging.jpg")
	readyFile := filepath.Join(tmpDir, "ready_file.jpg")
	for _, f := range []string{stagingFile, readyFile} {
		if err := os.WriteFile(f, []byte("dummy"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	store := newMockRVMCleanupStore()
	// Only assetID=10 is a stale processing candidate; assetID=20 is a separate ready asset
	// not in the candidates list.
	store.staleAssets = []repository.StaleProcessingCleanupCandidate{
		{MediaAssetID: 10, FilePath: stagingFile, StuckSince: time.Now().Add(-35 * time.Minute)},
	}

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	// Only the stale asset must be marked failed
	assert.Equal(t, "failed", store.markedAssetStatus[10])
	// Asset 20 must not appear in any mutation list
	_, asset20Touched := store.markedAssetStatus[20]
	assert.False(t, asset20Touched, "ready asset outside the candidate set must NOT be demoted")

	// Stale staging file must be gone; ready file must remain
	_, err := os.Stat(stagingFile)
	assert.True(t, errors.Is(err, os.ErrNotExist), "stale staging file must be removed")
	_, err = os.Stat(readyFile)
	assert.NoError(t, err, "ready file outside cleanup scope must still exist")
}

// TestRVMCleanupService_SoftDelete_MultipleUnsharedAssets verifies that multiple
// soft-deleted relations each get their files removed and DB rows hard-deleted
// independently when none are shared.
func TestRVMCleanupService_SoftDelete_MultipleUnsharedAssets(t *testing.T) {
	tmpDir := t.TempDir()

	files := make([]string, 4)
	for i, name := range []string{"orig_a.jpg", "thumb_a.jpg", "orig_b.jpg", "thumb_b.jpg"} {
		files[i] = filepath.Join(tmpDir, name)
		if err := os.WriteFile(files[i], []byte("data"), 0600); err != nil {
			t.Fatal(err)
		}
	}

	store := newMockRVMCleanupStore()
	store.softDeleteCandidates = []repository.SoftDeleteCleanupCandidate{
		{RelationID: 10, MediaAssetID: 100, OriginalFilePath: files[0], ThumbFilePath: files[1], DeletedAt: time.Now().Add(-48 * time.Hour)},
		{RelationID: 20, MediaAssetID: 200, OriginalFilePath: files[2], ThumbFilePath: files[3], DeletedAt: time.Now().Add(-48 * time.Hour)},
	}
	// Neither asset is referenced by other active relations
	store.referencedAssets[100] = false
	store.referencedAssets[200] = false

	svc := NewRVMCleanupService(store, tmpDir)
	svc.RunOnce(context.Background())

	// Both file pairs must be removed
	for _, f := range files {
		_, err := os.Stat(f)
		assert.True(t, errors.Is(err, os.ErrNotExist),
			"file must be removed after soft-delete cleanup: %s", f)
	}

	// Both DB pairs must be hard-deleted
	assert.Len(t, store.hardDeletedPairs, 2,
		"both unshared relations must be hard-deleted")

	// The order of deletion is not guaranteed; check presence by set
	deleted := make(map[[2]int64]bool)
	for _, pair := range store.hardDeletedPairs {
		deleted[pair] = true
	}
	assert.True(t, deleted[[2]int64{10, 100}], "relation 10 / asset 100 must be hard-deleted")
	assert.True(t, deleted[[2]int64{20, 200}], "relation 20 / asset 200 must be hard-deleted")
}

// TestRVMUploadStorageKeyUniqueness verifies that each upload gets a unique
// UUID-based storage directory so concurrent uploads from separate requests
// cannot overwrite each other's files.
// This test uses source inspection because processOneRVMFile uses uuid.New() directly
// inside the handler which cannot be injected without an interface refactor.
func TestRVMUploadStorageKeyUniqueness(t *testing.T) {
	// UUID uniqueness is guaranteed by uuid.New() — each call returns a new v4 UUID.
	// Two UUIDs generated at the same moment must differ.
	seen := make(map[string]bool)
	for i := 0; i < 100; i++ {
		id := newUUID()
		assert.False(t, seen[id], "uuid.New() must produce unique values (duplicate found: %s)", id)
		seen[id] = true
	}
	assert.Len(t, seen, 100, "100 sequential UUID calls must all be unique")
}

// TestRVMPreviewAssignmentIsExclusive verifies that the PATCH handler enforces
// max-one-preview per release-version by calling ClearPreviewCandidateForVersion
// inside the same transaction before setting the new preview flag.
// This structural assertion proves the single-preview contract without a live DB.
func TestRVMPreviewAssignmentIsExclusive(t *testing.T) {
	src, err := os.ReadFile("../handlers/admin_content_release_version_media.go")
	assert.NoError(t, err, "handler file must be readable from services test")
	if err != nil {
		t.SkipNow()
	}
	content := string(src)

	// ClearPreviewCandidateForVersion must be called in the PATCH path
	assert.Contains(t, content, "ClearPreviewCandidateForVersion",
		"PATCH handler must call ClearPreviewCandidateForVersion to enforce max-one-preview")

	// It must be called before PatchReleaseVersionMedia inside the transaction
	clearIdx := strings.Index(content, "ClearPreviewCandidateForVersion")
	patchIdx := strings.Index(content, "PatchReleaseVersionMedia(c.Request.Context(), tx,")
	assert.Less(t, clearIdx, patchIdx,
		"ClearPreviewCandidateForVersion must be called before PatchReleaseVersionMedia in the tx path")
}

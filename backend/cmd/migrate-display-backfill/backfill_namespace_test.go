package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRunBackfill_FansubGroupMediaMigratesToNamespace proves D-09/D-17: a pre-existing
// flat-stored fansub group-media file is physically moved to
// <storageDir>/fansub/<group_id>/<same filename>, and the media_assets/media_files rows are
// updated to the new path. Calls runFansubNamespaceMigration directly (not the full runBackfill)
// to isolate this phase's effect from the generic display-backfill phase, which would otherwise
// ALSO pick up this same 'original'-only asset and add its own 'display' row, muddying the
// ProcessedOK count this test is asserting -- the combined, all-three-phases-together behavior
// is proven separately in the Task 3 integration test.
func TestRunBackfill_FansubGroupMediaMigratesToNamespace(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertFansubGroup(t, pool, 501, "Namespace Test Group")
	jpegBytes := newStaticJPEGBytes(t, 800, 600)
	flatPath := writeTestFile(t, storageDir, "fansub_media_abc123.jpg", jpegBytes)
	mediaID := insertMediaAsset(t, pool, flatPath, "image/jpeg", nil)
	fileID := insertMediaFile(t, pool, mediaID, "original", flatPath, 800, 600, int64(len(jpegBytes)))
	insertFansubGroupMedia(t, pool, 501, mediaID)

	cfg := Config{MediaStorageDir: storageDir}
	stats, err := runFansubNamespaceMigration(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, stats.ProcessedOK)
	require.Equal(t, 0, stats.Failed)

	expectedPath := filepath.Join(storageDir, "fansub", "501", "fansub_media_abc123.jpg")

	_, oldStatErr := os.Stat(flatPath)
	require.True(t, os.IsNotExist(oldStatErr), "the flat-stored file must no longer exist at its old location")
	_, newStatErr := os.Stat(expectedPath)
	require.NoError(t, newStatErr, "the file must exist at the new namespaced location")

	var dbPath, assetFilePath string
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT path FROM media_files WHERE id = $1`, fileID).Scan(&dbPath))
	require.Equal(t, expectedPath, dbPath)
	require.NoError(t, pool.QueryRow(context.Background(), `SELECT file_path FROM media_assets WHERE id = $1`, mediaID).Scan(&assetFilePath))
	require.Equal(t, expectedPath, assetFilePath)
}

// TestRunBackfill_FansubLogoMigratesToNamespace proves the same migration applies to a
// fansub_groups.logo_id-linked asset (not just fansub_group_media gallery rows).
func TestRunBackfill_FansubLogoMigratesToNamespace(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertFansubGroup(t, pool, 777, "Logo Namespace Group")
	pngBytes := newStaticJPEGBytes(t, 256, 256)
	flatPath := writeTestFile(t, storageDir, "logo_xyz789.jpg", pngBytes)
	mediaID := insertMediaAsset(t, pool, flatPath, "image/jpeg", nil)
	insertMediaFile(t, pool, mediaID, "original", flatPath, 256, 256, int64(len(pngBytes)))
	setFansubGroupLogo(t, pool, 777, mediaID)

	cfg := Config{MediaStorageDir: storageDir}
	stats, err := runFansubNamespaceMigration(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, stats.ProcessedOK)

	expectedPath := filepath.Join(storageDir, "fansub", "777", "logo_xyz789.jpg")
	_, newStatErr := os.Stat(expectedPath)
	require.NoError(t, newStatErr)
}

// TestRunBackfill_FansubNamespaceIdempotentOnSecondRun proves a second run of the namespace
// migration is a no-op: already-migrated rows (path already starts with the fansub/ prefix) are
// skipped entirely.
func TestRunBackfill_FansubNamespaceIdempotentOnSecondRun(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertFansubGroup(t, pool, 42, "Idempotent Group")
	jpegBytes := newStaticJPEGBytes(t, 400, 300)
	flatPath := writeTestFile(t, storageDir, "fansub_media_idem.jpg", jpegBytes)
	mediaID := insertMediaAsset(t, pool, flatPath, "image/jpeg", nil)
	insertMediaFile(t, pool, mediaID, "original", flatPath, 400, 300, int64(len(jpegBytes)))
	insertFansubGroupMedia(t, pool, 42, mediaID)

	cfg := Config{MediaStorageDir: storageDir}
	firstStats, err := runFansubNamespaceMigration(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, firstStats.ProcessedOK)

	expectedPath := filepath.Join(storageDir, "fansub", "42", "fansub_media_idem.jpg")
	infoAfterFirst, statErr := os.Stat(expectedPath)
	require.NoError(t, statErr)

	secondStats, err := runFansubNamespaceMigration(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, secondStats.TotalCandidates, "already-migrated rows must not be candidates again")
	require.Equal(t, 0, secondStats.ProcessedOK)

	infoAfterSecond, statErr2 := os.Stat(expectedPath)
	require.NoError(t, statErr2)
	require.Equal(t, infoAfterFirst.ModTime(), infoAfterSecond.ModTime(), "a second run must not move the file again")
}

// TestRunBackfill_AlreadyNamespacedFansubMediaIsNotACandidate proves a fansub media row whose
// path is already under the fansub/ namespace (a fresh 173-04 upload) is excluded from the
// candidate set from the start.
func TestRunBackfill_AlreadyNamespacedFansubMediaIsNotACandidate(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertFansubGroup(t, pool, 99, "Already Namespaced Group")
	namespacedDir := filepath.Join(storageDir, "fansub", "99")
	require.NoError(t, os.MkdirAll(namespacedDir, 0o755))
	jpegBytes := newStaticJPEGBytes(t, 200, 200)
	namespacedPath := writeTestFile(t, namespacedDir, "image_already_there.jpg", jpegBytes)
	mediaID := insertMediaAsset(t, pool, namespacedPath, "image/jpeg", nil)
	insertMediaFile(t, pool, mediaID, "original", namespacedPath, 200, 200, int64(len(jpegBytes)))
	insertFansubGroupMedia(t, pool, 99, mediaID)

	cfg := Config{MediaStorageDir: storageDir}
	stats, err := runFansubNamespaceMigration(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, stats.TotalCandidates)
}

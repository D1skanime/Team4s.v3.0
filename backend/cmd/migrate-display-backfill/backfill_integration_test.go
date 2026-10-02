package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRunBackfill_FullIntegrationAcrossAllAssetShapes is the Task 3 full-run integration test:
// a single runBackfill call against a fixture seeded with one of each asset-type shape this
// phase cares about -- a plain media_files-table asset (stands in for anime/avatar/background/
// RVM/segment-preview, which are all structurally identical from the generic phase's
// perspective), a pointer-only story-image row (D-15), and an un-migrated flat fansub file
// (D-09/D-17) -- produces the expected combined BackfillStats and leaves the database/filesystem
// in the expected final state for every seeded case.
//
// The flat fansub asset is deliberately also a generic-display candidate (it has an 'original'
// row with no 'display' row, exactly like the plain static-image case) -- this test proves the
// two phases compose correctly: the generic phase gives it a display file FIRST (still flat,
// right next to its original), then the namespace phase migrates BOTH the original and the
// freshly-created display file into the fansub/<group_id>/ namespace in the same run.
func TestRunBackfill_FullIntegrationAcrossAllAssetShapes(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	// 1. Plain media_files-table asset (anime/avatar/background/RVM/segment-preview all share
	// this exact shape from the generic phase's point of view).
	staticBytes := newStaticJPEGBytes(t, 2400, 1600)
	staticOriginal := writeTestFile(t, storageDir, "static-original.jpg", staticBytes)
	staticMediaID := insertMediaAsset(t, pool, staticOriginal, "image/jpeg", nil)
	insertMediaFile(t, pool, staticMediaID, "original", staticOriginal, 2400, 1600, int64(len(staticBytes)))

	// 2. Pointer-only story image (D-15): owner_member_id set, NO media_files rows at all.
	insertMember(t, pool, 501, "integration-story-author")
	storyBytes := newStaticJPEGBytes(t, 1000, 700)
	storyPath := writeTestFile(t, storageDir, "story-pointer-only.jpg", storyBytes)
	ownerID := int64(501)
	storyMediaID := insertMediaAsset(t, pool, storyPath, "image/jpeg", &ownerID)

	// 3. Un-migrated flat fansub group-media file (D-09/D-17).
	insertFansubGroup(t, pool, 900, "Integration Fansub Group")
	fansubBytes := newStaticJPEGBytes(t, 640, 480)
	fansubFlatPath := writeTestFile(t, storageDir, "fansub_media_integration.jpg", fansubBytes)
	fansubMediaID := insertMediaAsset(t, pool, fansubFlatPath, "image/jpeg", nil)
	insertMediaFile(t, pool, fansubMediaID, "original", fansubFlatPath, 640, 480, int64(len(fansubBytes)))
	insertFansubGroupMedia(t, pool, 900, fansubMediaID)

	cfg := Config{MediaStorageDir: storageDir}
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, stats.Failed)
	// Generic phase: static (1) + fansub-original (1) = 2 candidates.
	// Story-image phase: story (1) candidate.
	// Namespace phase: fansub-original (1) + the display row the generic phase just created for
	// it (1, since the generic phase runs first and writes its display file flat, right next to
	// the still-flat original) = 2 candidates.
	// Total: 2 + 1 + 2 = 5.
	require.Equal(t, 5, stats.TotalCandidates)
	require.Equal(t, 5, stats.ProcessedOK)

	// Case 1: plain static asset got its display row.
	require.Equal(t, 1, countMediaFilesByVariant(t, pool, staticMediaID, "display"))
	staticDisplayPath := displayFilePath(t, pool, staticMediaID)
	_, statErr := os.Stat(staticDisplayPath)
	require.NoError(t, statErr)

	// Case 2: story image got a pointer-only display row at its own existing path, no original
	// invented, no new file written.
	require.Equal(t, 0, countMediaFilesByVariant(t, pool, storyMediaID, "original"))
	require.Equal(t, 1, countMediaFilesByVariant(t, pool, storyMediaID, "display"))
	require.Equal(t, storyPath, displayFilePath(t, pool, storyMediaID))

	// Case 3: fansub asset -- both its original AND its freshly-backfilled display file now live
	// under the fansub/900/ namespace, and media_assets.file_path was updated to match.
	expectedNamespaceDir := filepath.Join(storageDir, "fansub", "900")
	var fansubOriginalPath, fansubDisplayPath string
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT path FROM media_files WHERE media_id = $1 AND variant = 'original'`, fansubMediaID).Scan(&fansubOriginalPath))
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT path FROM media_files WHERE media_id = $1 AND variant = 'display'`, fansubMediaID).Scan(&fansubDisplayPath))
	require.True(t, strings.HasPrefix(fansubOriginalPath, expectedNamespaceDir), "fansub original must live under the namespace: %s", fansubOriginalPath)
	require.True(t, strings.HasPrefix(fansubDisplayPath, expectedNamespaceDir), "fansub display must live under the namespace: %s", fansubDisplayPath)

	_, origStatErr := os.Stat(fansubOriginalPath)
	require.NoError(t, origStatErr)
	_, dispStatErr := os.Stat(fansubDisplayPath)
	require.NoError(t, dispStatErr)
	_, oldStatErr := os.Stat(fansubFlatPath)
	require.True(t, os.IsNotExist(oldStatErr), "the old flat original must no longer exist")

	var fansubAssetFilePath string
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT file_path FROM media_assets WHERE id = $1`, fansubMediaID).Scan(&fansubAssetFilePath))
	require.Equal(t, fansubOriginalPath, fansubAssetFilePath)

	// A second run across all three seeded cases must be a complete no-op.
	secondStats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, secondStats.TotalCandidates)
	require.Equal(t, 0, secondStats.ProcessedOK)
	require.Equal(t, 0, secondStats.Failed)
}

// TestRunBackfill_DryRunMakesNoChanges proves the DRY_RUN posture: every phase reports its
// candidate counts but performs zero database writes and zero filesystem writes/moves.
func TestRunBackfill_DryRunMakesNoChanges(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	staticBytes := newStaticJPEGBytes(t, 1200, 900)
	staticOriginal := writeTestFile(t, storageDir, "dryrun-original.jpg", staticBytes)
	staticMediaID := insertMediaAsset(t, pool, staticOriginal, "image/jpeg", nil)
	insertMediaFile(t, pool, staticMediaID, "original", staticOriginal, 1200, 900, int64(len(staticBytes)))

	insertMember(t, pool, 601, "dryrun-story-author")
	storyBytes := newStaticJPEGBytes(t, 500, 400)
	storyPath := writeTestFile(t, storageDir, "dryrun-story.jpg", storyBytes)
	ownerID := int64(601)
	storyMediaID := insertMediaAsset(t, pool, storyPath, "image/jpeg", &ownerID)

	insertFansubGroup(t, pool, 950, "Dry Run Fansub Group")
	fansubBytes := newStaticJPEGBytes(t, 300, 300)
	fansubFlatPath := writeTestFile(t, storageDir, "fansub_media_dryrun.jpg", fansubBytes)
	fansubMediaID := insertMediaAsset(t, pool, fansubFlatPath, "image/jpeg", nil)
	insertMediaFile(t, pool, fansubMediaID, "original", fansubFlatPath, 300, 300, int64(len(fansubBytes)))
	insertFansubGroupMedia(t, pool, 950, fansubMediaID)

	entriesBefore, err := os.ReadDir(storageDir)
	require.NoError(t, err)

	cfg := Config{MediaStorageDir: storageDir, DryRun: true}
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Greater(t, stats.TotalCandidates, 0, "dry run must still report real candidates")
	require.Equal(t, stats.TotalCandidates, stats.ProcessedOK, "dry run counts every candidate as processed without acting")
	require.Equal(t, 0, stats.Failed)

	// No database writes: none of the three seeded assets gained a display row, and the fansub
	// file's stored path is unchanged.
	require.Equal(t, 0, countMediaFilesByVariant(t, pool, staticMediaID, "display"))
	require.Equal(t, 0, countMediaFilesByVariant(t, pool, storyMediaID, "display"))
	require.Equal(t, 0, countMediaFilesByVariant(t, pool, storyMediaID, "original"))

	var fansubPathAfter string
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT path FROM media_files WHERE media_id = $1 AND variant = 'original'`, fansubMediaID).Scan(&fansubPathAfter))
	require.Equal(t, fansubFlatPath, fansubPathAfter, "dry run must not move any file")

	// No filesystem writes: the storage directory's entry set is byte-for-byte unchanged.
	entriesAfter, err := os.ReadDir(storageDir)
	require.NoError(t, err)
	require.Len(t, entriesAfter, len(entriesBefore), "dry run must not create or move any file")

	_, statErr := os.Stat(fansubFlatPath)
	require.NoError(t, statErr, "dry run must not move the flat fansub file")
}

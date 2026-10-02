package main

import (
	"context"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

// TestRunBackfill_StoryImagePointerOnlyDisplay proves D-15: a pre-existing story-image
// media_asset (owner_member_id set, NO media_files children at all) gets exactly one new
// 'display' media_files row whose path equals the asset's OWN existing file, with no new file
// written and no 'original' row invented for it.
func TestRunBackfill_StoryImagePointerOnlyDisplay(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertMember(t, pool, 42, "story-author")
	jpegBytes := newStaticJPEGBytes(t, 1200, 800)
	existingPath := writeTestFile(t, storageDir, "story-image-pre-phase.jpg", jpegBytes)
	ownerID := int64(42)
	mediaID := insertMediaAsset(t, pool, existingPath, "image/jpeg", &ownerID)
	// Deliberately NO media_files row inserted -- the pre-173-06 story-image shape.

	infoBefore, statErr := os.Stat(existingPath)
	require.NoError(t, statErr)

	cfg := Config{MediaStorageDir: storageDir}
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, stats.ProcessedOK)
	require.Equal(t, 0, stats.Failed)

	require.Equal(t, 0, countMediaFilesByVariant(t, pool, mediaID, "original"), "D-15: no original row must be invented for a pre-existing story image")
	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "display"))

	displayPath := displayFilePath(t, pool, mediaID)
	require.Equal(t, existingPath, displayPath, "the pointer-only display row must point at the asset's own existing file")

	infoAfter, statErr2 := os.Stat(existingPath)
	require.NoError(t, statErr2)
	require.Equal(t, infoBefore.ModTime(), infoAfter.ModTime(), "no new file must be written for a pointer-only story image")
	require.Equal(t, infoBefore.Size(), infoAfter.Size())
}

// TestRunBackfill_StoryImageIdempotentOnSecondRun proves a second run is a true no-op for the
// pointer-only story-image phase.
func TestRunBackfill_StoryImageIdempotentOnSecondRun(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertMember(t, pool, 7, "story-author-2")
	jpegBytes := newStaticJPEGBytes(t, 640, 480)
	existingPath := writeTestFile(t, storageDir, "story-image-2.jpg", jpegBytes)
	ownerID := int64(7)
	mediaID := insertMediaAsset(t, pool, existingPath, "image/jpeg", &ownerID)

	cfg := Config{MediaStorageDir: storageDir}
	firstStats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, firstStats.ProcessedOK)

	secondStats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, secondStats.TotalCandidates)
	require.Equal(t, 0, secondStats.ProcessedOK)
	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "display"), "a second run must not create a second pointer-only display row")
}

// TestRunBackfill_FreshStoryImageWithRealMediaFilesIsNotACandidate proves the backfill does not
// touch a post-173-06 story image that already has its own real original+display media_files
// pair -- the "no media_files children at all" predicate must exclude it entirely.
func TestRunBackfill_FreshStoryImageWithRealMediaFilesIsNotACandidate(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	insertMember(t, pool, 9, "story-author-3")
	originalBytes := newStaticJPEGBytes(t, 3000, 2000)
	displayBytes := newStaticJPEGBytes(t, 1920, 1280)
	originalPath := writeTestFile(t, storageDir, "story-original.jpg", originalBytes)
	displayPath := writeTestFile(t, storageDir, "story-display.jpg", displayBytes)
	ownerID := int64(9)
	mediaID := insertMediaAsset(t, pool, displayPath, "image/jpeg", &ownerID)
	insertMediaFile(t, pool, mediaID, "original", originalPath, 3000, 2000, int64(len(originalBytes)))
	insertMediaFile(t, pool, mediaID, "display", displayPath, 1920, 1280, int64(len(displayBytes)))

	cfg := Config{MediaStorageDir: storageDir}
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, stats.TotalCandidates)
	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "original"))
	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "display"))
}

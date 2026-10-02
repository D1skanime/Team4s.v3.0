package main

import (
	"context"
	"os"
	"testing"

	"team4s.v3/backend/internal/services"

	"github.com/stretchr/testify/require"
)

func genericTestConfig(storageDir, ffmpegBinary string) Config {
	return Config{
		MediaStorageDir: storageDir,
		FFmpegPath:      ffmpegBinary,
		DryRun:          false,
	}
}

// TestRunBackfill_GenericStaticImageGetsDisplayVariant proves Task 1's core behavior: a
// media_asset with an 'original' row and no 'display' row gets a new, correctly-capped 'display'
// row after runBackfill.
func TestRunBackfill_GenericStaticImageGetsDisplayVariant(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	jpegBytes := newStaticJPEGBytes(t, 3000, 1500)
	originalPath := writeTestFile(t, storageDir, "original.jpg", jpegBytes)
	mediaID := insertMediaAsset(t, pool, originalPath, "image/jpeg", nil)
	insertMediaFile(t, pool, mediaID, "original", originalPath, 3000, 1500, int64(len(jpegBytes)))

	cfg := genericTestConfig(storageDir, "")
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, stats.ProcessedOK)
	require.Equal(t, 0, stats.Failed)

	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "display"))
	displayPath := displayFilePath(t, pool, mediaID)
	_, statErr := os.Stat(displayPath)
	require.NoError(t, statErr, "display file must exist on disk")

	var width, height int
	require.NoError(t, pool.QueryRow(context.Background(),
		`SELECT width, height FROM media_files WHERE media_id = $1 AND variant = 'display'`, mediaID).Scan(&width, &height))
	require.LessOrEqual(t, width, 1920)
	require.LessOrEqual(t, height, 1920)
	require.Greater(t, width, 0)
}

// TestRunBackfill_GenericTransparentPNGStaysPNG proves D-18 holds through the backfill path: a
// transparent source produces a PNG display variant, never a flattened JPEG.
func TestRunBackfill_GenericTransparentPNGStaysPNG(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	pngBytes := newTransparentPNGBytes(t, 400, 300)
	originalPath := writeTestFile(t, storageDir, "original.png", pngBytes)
	mediaID := insertMediaAsset(t, pool, originalPath, "image/png", nil)
	insertMediaFile(t, pool, mediaID, "original", originalPath, 400, 300, int64(len(pngBytes)))

	cfg := genericTestConfig(storageDir, "")
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, stats.ProcessedOK)

	displayPath := displayFilePath(t, pool, mediaID)
	require.Contains(t, displayPath, "display.png")
	data, readErr := os.ReadFile(displayPath)
	require.NoError(t, readErr)
	require.True(t, len(data) >= 8 && string(data[1:4]) == "PNG", "display file must be a real PNG")
}

// TestRunBackfill_GenericAnimatedGIFProducesAnimatedWebPDisplay proves the backfill's animated
// GIF handling matches every live write path (D-19): the display variant is a genuine animated
// WebP, not a static frame-0 image.
func TestRunBackfill_GenericAnimatedGIFProducesAnimatedWebPDisplay(t *testing.T) {
	ffmpegBinary := requireFFmpegForBackfillTests(t)
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	gifBytes := newAnimatedGIFBytes(t, 320, 240)
	originalPath := writeTestFile(t, storageDir, "original.gif", gifBytes)
	mediaID := insertMediaAsset(t, pool, originalPath, "image/gif", nil)
	insertMediaFile(t, pool, mediaID, "original", originalPath, 320, 240, int64(len(gifBytes)))

	cfg := genericTestConfig(storageDir, ffmpegBinary)
	stats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, stats.ProcessedOK)
	require.Equal(t, 0, stats.Failed)

	displayPath := displayFilePath(t, pool, mediaID)
	require.Contains(t, displayPath, "display.webp")
	data, readErr := os.ReadFile(displayPath)
	require.NoError(t, readErr)
	require.True(t, services.IsAnimatedWebPData(data), "backfilled display.webp must be recognized as animated")
}

// TestRunBackfill_GenericIdempotentOnSecondRun proves the must_have: running the backfill twice
// in a row is a true no-op (zero new rows, zero file rewrites).
func TestRunBackfill_GenericIdempotentOnSecondRun(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	jpegBytes := newStaticJPEGBytes(t, 800, 600)
	originalPath := writeTestFile(t, storageDir, "original.jpg", jpegBytes)
	mediaID := insertMediaAsset(t, pool, originalPath, "image/jpeg", nil)
	insertMediaFile(t, pool, mediaID, "original", originalPath, 800, 600, int64(len(jpegBytes)))

	cfg := genericTestConfig(storageDir, "")
	firstStats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 1, firstStats.ProcessedOK)

	displayPath := displayFilePath(t, pool, mediaID)
	infoAfterFirst, statErr := os.Stat(displayPath)
	require.NoError(t, statErr)
	mtimeAfterFirst := infoAfterFirst.ModTime()

	// Sleep is unnecessary; mtime equality is checked, not ordering -- but give the filesystem a
	// moment in case its clock granularity is coarse (not required for the assertion to be
	// meaningful either way, since the second run must perform NO write at all).
	secondStats, err := runBackfill(context.Background(), pool, cfg)
	require.NoError(t, err)
	require.Equal(t, 0, secondStats.TotalCandidates, "the already-processed asset must not be a candidate again")
	require.Equal(t, 0, secondStats.ProcessedOK)
	require.Equal(t, 0, secondStats.Failed)

	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "display"), "a second run must not create a second display row")
	infoAfterSecond, statErr2 := os.Stat(displayPath)
	require.NoError(t, statErr2)
	require.Equal(t, mtimeAfterFirst, infoAfterSecond.ModTime(), "a second run must not rewrite the display file")
}

// TestProcessGenericDisplayCandidate_ConcurrentRaceLeavesExactlyOneWinner proves T-173-07-01:
// two callers racing on the SAME candidate snapshot (simulating two concurrent backfill runs,
// or a backfill run racing a live upload) must leave exactly one display row, and the loser must
// clean up its own generated file without disturbing the winner's.
func TestProcessGenericDisplayCandidate_ConcurrentRaceLeavesExactlyOneWinner(t *testing.T) {
	pool := openDisplayBackfillFixture(t)
	storageDir := t.TempDir()

	jpegBytes := newStaticJPEGBytes(t, 500, 400)
	originalPath := writeTestFile(t, storageDir, "original.jpg", jpegBytes)
	mediaID := insertMediaAsset(t, pool, originalPath, "image/jpeg", nil)
	insertMediaFile(t, pool, mediaID, "original", originalPath, 500, 400, int64(len(jpegBytes)))

	candidates, err := fetchGenericDisplayCandidates(context.Background(), pool)
	require.NoError(t, err)
	require.Len(t, candidates, 1)
	candidate := candidates[0]

	cfg := genericTestConfig(storageDir, "")
	ctx := context.Background()

	// Both "racers" hold the exact same stale candidate snapshot (as two real concurrent
	// goroutines/processes would after an identical fetch).
	errFirst := processGenericDisplayCandidate(ctx, pool, cfg, candidate)
	errSecond := processGenericDisplayCandidate(ctx, pool, cfg, candidate)

	require.NoError(t, errFirst, "the winner must succeed")
	require.Error(t, errSecond, "the loser must report the lost race")

	require.Equal(t, 1, countMediaFilesByVariant(t, pool, mediaID, "display"), "exactly one display row must exist after the race")
	displayPath := displayFilePath(t, pool, mediaID)
	_, statErr := os.Stat(displayPath)
	require.NoError(t, statErr, "the winner's final display file must still exist")

	// None of the loser's temp files should remain behind in the destination directory.
	entries, readDirErr := os.ReadDir(storageDir)
	require.NoError(t, readDirErr)
	for _, entry := range entries {
		require.NotContains(t, entry.Name(), ".display-backfill-", "loser's temp file must have been cleaned up: %s", entry.Name())
	}
}

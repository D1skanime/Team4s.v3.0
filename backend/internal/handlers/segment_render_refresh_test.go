package handlers

import (
	"os"
	"path/filepath"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestSegmentRenderInputsChangedDetectsPlaybackWindowChange(t *testing.T) {
	beforeStart := "00:23:00"
	beforeEnd := "00:23:45"
	afterStart := "00:22:58"
	afterEnd := "00:23:45"
	sourceKind := "episode_version"

	before := &models.AdminThemeSegment{
		ID:                   1,
		StartTime:            &beforeStart,
		EndTime:              &beforeEnd,
		PlaybackSourceKind:   &sourceKind,
		PlaybackStartSeconds: renderRefreshInt32Ptr(1380),
		PlaybackEndSeconds:   renderRefreshInt32Ptr(1425),
	}
	after := &models.AdminThemeSegment{
		ID:                   1,
		StartTime:            &afterStart,
		EndTime:              &afterEnd,
		PlaybackSourceKind:   &sourceKind,
		PlaybackStartSeconds: renderRefreshInt32Ptr(1378),
		PlaybackEndSeconds:   renderRefreshInt32Ptr(1425),
	}

	if !segmentRenderInputsChanged(before, after) {
		t.Fatal("expected playback window change to require render refresh")
	}
}

func TestSegmentRenderInputsChangedIgnoresThemeTitleOnlyChange(t *testing.T) {
	start := "00:23:00"
	end := "00:23:45"
	sourceKind := "episode_version"
	titleBefore := "ED"
	titleAfter := "ED korrigiert"

	before := &models.AdminThemeSegment{
		ID:                   1,
		ThemeTitle:           &titleBefore,
		StartTime:            &start,
		EndTime:              &end,
		PlaybackSourceKind:   &sourceKind,
		PlaybackStartSeconds: renderRefreshInt32Ptr(1380),
		PlaybackEndSeconds:   renderRefreshInt32Ptr(1425),
	}
	after := &models.AdminThemeSegment{
		ID:                   1,
		ThemeTitle:           &titleAfter,
		StartTime:            &start,
		EndTime:              &end,
		PlaybackSourceKind:   &sourceKind,
		PlaybackStartSeconds: renderRefreshInt32Ptr(1380),
		PlaybackEndSeconds:   renderRefreshInt32Ptr(1425),
	}

	if segmentRenderInputsChanged(before, after) {
		t.Fatal("theme title only changes must not delete and requeue render cache")
	}
}

func TestRemoveSegmentRenderCacheFilesDeletesControlledOutput(t *testing.T) {
	renderDir := t.TempDir()
	outputName := "theme-segment-test.mp4"
	outputPath := filepath.Join(renderDir, outputName)
	if err := os.WriteFile(outputPath, []byte("old render"), 0o644); err != nil {
		t.Fatalf("write cache file: %v", err)
	}

	handler := &AdminContentHandler{segmentRenderDir: renderDir}
	if err := handler.removeSegmentRenderCacheFiles([]models.ThemeSegmentRenderCache{
		{OutputPath: &outputName},
	}); err != nil {
		t.Fatalf("remove cache files: %v", err)
	}
	if _, err := os.Stat(outputPath); !os.IsNotExist(err) {
		t.Fatalf("expected cache file to be removed, stat err=%v", err)
	}
}

func renderRefreshInt32Ptr(value int32) *int32 {
	return &value
}

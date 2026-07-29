package handlers

import (
	"os"
	"path/filepath"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestSegmentRenderInputsChangedDetectsPlaybackWindowChange(t *testing.T) {
	sourceKind := "episode_version"
	externalID := "jf-123"

	before := &models.ThemeSegmentRenderSource{
		SegmentID:          1,
		SourceKind:         sourceKind,
		StreamExternalID:   &externalID,
		StartOffsetSeconds: renderRefreshInt32Ptr(1380),
		EndOffsetSeconds:   renderRefreshInt32Ptr(1425),
	}
	after := &models.ThemeSegmentRenderSource{
		SegmentID:          1,
		SourceKind:         sourceKind,
		StreamExternalID:   &externalID,
		StartOffsetSeconds: renderRefreshInt32Ptr(1378),
		EndOffsetSeconds:   renderRefreshInt32Ptr(1425),
	}

	if !segmentRenderInputsChanged(before, after) {
		t.Fatal("expected playback window change to require render refresh")
	}
}

func TestSegmentRenderInputsChangedIgnoresUnrelatedFieldChange(t *testing.T) {
	sourceKind := "episode_version"
	externalID := "jf-123"
	labelBefore := "ED"
	labelAfter := "ED korrigiert"

	before := &models.ThemeSegmentRenderSource{
		SegmentID:          1,
		SourceKind:         sourceKind,
		StreamExternalID:   &externalID,
		SourceLabel:        &labelBefore,
		StartOffsetSeconds: renderRefreshInt32Ptr(1380),
		EndOffsetSeconds:   renderRefreshInt32Ptr(1425),
	}
	after := &models.ThemeSegmentRenderSource{
		SegmentID:          1,
		SourceKind:         sourceKind,
		StreamExternalID:   &externalID,
		SourceLabel:        &labelAfter,
		StartOffsetSeconds: renderRefreshInt32Ptr(1380),
		EndOffsetSeconds:   renderRefreshInt32Ptr(1425),
	}

	if segmentRenderInputsChanged(before, after) {
		t.Fatal("label-only changes (not part of the compared fields) must not delete and requeue render cache")
	}
}

func TestSegmentRenderInputsChangedDetectsStreamExternalIDChange(t *testing.T) {
	sourceKind := "episode_version"
	externalIDBefore := "jf-episode-1"
	externalIDAfter := "jf-episode-2"

	before := &models.ThemeSegmentRenderSource{
		SegmentID:          1,
		SourceKind:         sourceKind,
		StreamExternalID:   &externalIDBefore,
		StartOffsetSeconds: renderRefreshInt32Ptr(1380),
		EndOffsetSeconds:   renderRefreshInt32Ptr(1425),
	}
	after := &models.ThemeSegmentRenderSource{
		SegmentID:          1,
		SourceKind:         sourceKind,
		StreamExternalID:   &externalIDAfter,
		StartOffsetSeconds: renderRefreshInt32Ptr(1380),
		EndOffsetSeconds:   renderRefreshInt32Ptr(1425),
	}

	if !segmentRenderInputsChanged(before, after) {
		t.Fatal("expected changed stream_external_id (different underlying source) to require render refresh")
	}
}

func TestSegmentRenderInputsChangedNilBeforeAndAfterIsUnchanged(t *testing.T) {
	if segmentRenderInputsChanged(nil, nil) {
		t.Fatal("nil/nil (no render source known before or after) must not be treated as a change")
	}
}

func TestSegmentRenderInputsChangedNilVsPresentIsChanged(t *testing.T) {
	source := &models.ThemeSegmentRenderSource{SegmentID: 1, SourceKind: "episode_version"}
	if !segmentRenderInputsChanged(nil, source) {
		t.Fatal("a render source appearing where none existed before must be treated as a change")
	}
	if !segmentRenderInputsChanged(source, nil) {
		t.Fatal("a render source disappearing must be treated as a change")
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

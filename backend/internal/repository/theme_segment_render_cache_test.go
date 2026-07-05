package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"team4s.v3/backend/internal/models"
)

func TestThemeSegmentRenderCacheUpsertValidation(t *testing.T) {
	valid := models.ThemeSegmentRenderCacheUpsertInput{
		ThemeSegmentID:    1,
		CacheKey:          "segment:1:source",
		SourceKind:        "episode_version",
		SourceFingerprint: "variant:1",
		RenderProfile:     "mp4-h264-aac-ass-v1",
	}
	if err := validateThemeSegmentRenderCacheUpsertInput(valid); err != nil {
		t.Fatalf("expected valid input, got %v", err)
	}

	invalid := valid
	invalid.SourceKind = "release_media"
	if err := validateThemeSegmentRenderCacheUpsertInput(invalid); err == nil {
		t.Fatal("expected invalid source kind to be rejected")
	}
}

func TestThemeSegmentRenderCacheRepositoryMethodsDeclared(t *testing.T) {
	src := readRepositorySourceFile(t, "theme_segment_render_cache.go")

	required := []string{
		"UpsertThemeSegmentRenderCacheQueued",
		"GetThemeSegmentRenderCacheByKey",
		"MarkThemeSegmentRenderCacheRendering",
		"MarkThemeSegmentRenderCacheReady",
		"MarkThemeSegmentRenderCacheFailed",
		"MarkThemeSegmentRenderCacheStale",
		"ON CONFLICT (cache_key)",
		"status = 'ready'",
		"status = 'failed'",
		"status = 'stale'",
	}
	for _, pattern := range required {
		if !strings.Contains(src, pattern) {
			t.Fatalf("theme_segment_render_cache.go missing %q", pattern)
		}
	}
}

func TestThemeSegmentRenderCacheAvoidsMediaOwnershipShortcuts(t *testing.T) {
	src := readRepositorySourceFile(t, "theme_segment_render_cache.go")
	migration := readMigrationFile(t, "0122_theme_segment_render_cache.up.sql")

	required := []string{
		"theme_segment_render_cache",
		"theme_segment_playback_sources",
		"theme_segments",
	}
	for _, pattern := range required {
		if !strings.Contains(src+"\n"+migration, pattern) {
			t.Fatalf("segment render cache missing expected ownership anchor %q", pattern)
		}
	}

	forbidden := []string{
		"INSERT INTO media_assets",
		"INSERT INTO release_media",
		"INSERT INTO episode_media",
		"REFERENCES release_media",
		"REFERENCES episode_media",
	}
	for _, pattern := range forbidden {
		if strings.Contains(src+"\n"+migration, pattern) {
			t.Fatalf("segment render cache must not use media ownership shortcut %q", pattern)
		}
	}
}

func readRepositorySourceFile(t *testing.T, name string) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot determine test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(thisFile), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

func readMigrationFile(t *testing.T, name string) string {
	t.Helper()
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot determine test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(thisFile), "..", "..", "..", "database", "migrations", name))
	if err != nil {
		t.Fatalf("read migration %s: %v", name, err)
	}
	return string(content)
}

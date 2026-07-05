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
		"GetThemeSegmentRenderSource",
		"ClaimNextQueuedThemeSegmentRender",
		"MarkThemeSegmentRenderCacheReady",
		"MarkThemeSegmentRenderCacheFailed",
		"MarkThemeSegmentRenderCacheStale",
		"RequeueInterruptedThemeSegmentRenders",
		"ON CONFLICT (cache_key)",
		"FOR UPDATE SKIP LOCKED",
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

func TestThemeSegmentRenderSourceResolvesStoredPlaybackSource(t *testing.T) {
	src := readRepositorySourceFile(t, "theme_segment_render_cache.go")

	required := []string{
		"JOIN theme_segment_playback_sources tps ON tps.theme_segment_id = ts.id",
		"LEFT JOIN release_variants rv ON rv.id = tps.release_variant_id",
		"LEFT JOIN release_versions rev ON rev.id = rv.release_version_id",
		"LEFT JOIN release_streams rs ON rs.variant_id = rv.id",
		"LEFT JOIN stream_sources ss ON ss.id = rs.stream_source_id",
		"LEFT JOIN media_assets ma ON ma.id = tps.media_asset_id",
		"CASE WHEN ss.provider_type = 'jellyfin' THEN 0 ELSE 1 END",
	}
	for _, pattern := range required {
		if !strings.Contains(src, pattern) {
			t.Fatalf("render source resolver missing %q", pattern)
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

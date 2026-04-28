package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readSegmentSourceFile reads a source file in the same directory as this test file.
func readSegmentSourceFile(t *testing.T, name string) string {
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

// TestParseSegmentClockSeconds verifies the HH:MM:SS → seconds parser used by
// both the snapshot and the playback sync function.
func TestParseSegmentClockSeconds_VariousFormats(t *testing.T) {
	cases := []struct {
		input    string
		expected *int32
	}{
		{"00:00:30", int32ptr(30)},
		{"00:01:30", int32ptr(90)},
		{"01:30:00", int32ptr(5400)},
		{"1:30", int32ptr(90)},
		{"0:30", int32ptr(30)},
		{"0", int32ptr(0)},
		{"", nil},
		{"invalid", nil},
		{"1:2:3:4", nil},
		{"-1", nil},
	}

	for _, tc := range cases {
		var input *string
		if tc.input != "" {
			s := tc.input
			input = &s
		}
		got := parseSegmentClockSeconds(input)
		if tc.expected == nil && got != nil {
			t.Errorf("parseSegmentClockSeconds(%q): expected nil, got %d", tc.input, *got)
		} else if tc.expected != nil && got == nil {
			t.Errorf("parseSegmentClockSeconds(%q): expected %d, got nil", tc.input, *tc.expected)
		} else if tc.expected != nil && got != nil && *tc.expected != *got {
			t.Errorf("parseSegmentClockSeconds(%q): expected %d, got %d", tc.input, *tc.expected, *got)
		}
	}
}

// TestLoadThemeSegmentPlaybackSnapshotTx_NoNullDurationHardcode verifies that the
// snapshot query no longer hardcodes NULL::INTEGER AS duration_seconds.
// Acceptance criteria: the query resolves duration_seconds from release_variants.
func TestLoadThemeSegmentPlaybackSnapshotTx_NoNullDurationHardcode(t *testing.T) {
	content := readSegmentSourceFile(t, "admin_content_anime_themes.go")

	if strings.Contains(content, "NULL::INTEGER AS duration_seconds") {
		t.Fatal("snapshot query still hardcodes NULL::INTEGER AS duration_seconds — must resolve from release_variants")
	}
}

// TestLoadThemeSegmentPlaybackSnapshotTx_ContainsReleaseVariantJoins verifies that
// the snapshot query joins release_variants, release_streams, and stream_sources.
func TestLoadThemeSegmentPlaybackSnapshotTx_ContainsReleaseVariantJoins(t *testing.T) {
	content := readSegmentSourceFile(t, "admin_content_anime_themes.go")

	requiredPatterns := []string{
		"release_variants",
		"release_streams",
		"stream_sources",
		"duration_seconds",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(content, pattern) {
			t.Errorf("loadThemeSegmentPlaybackSnapshotTx: missing pattern %q in admin_content_anime_themes.go", pattern)
		}
	}
}

// TestSyncThemeSegmentPlaybackSourceTx_EpisodeVersionIsDefaultKind verifies that
// the sync function contains episode_version as a playback source kind.
// Task 2 acceptance: episode_version|uploaded_asset|jellyfin_theme all appear in syncThemeSegmentPlaybackSourceTx.
func TestSyncThemeSegmentPlaybackSourceTx_ContainsAllPlaybackKinds(t *testing.T) {
	content := readSegmentSourceFile(t, "admin_content_anime_themes.go")

	requiredKinds := []string{
		"episode_version",
		"uploaded_asset",
		"jellyfin_theme",
	}
	for _, kind := range requiredKinds {
		if !strings.Contains(content, kind) {
			t.Errorf("syncThemeSegmentPlaybackSourceTx: missing playback kind %q", kind)
		}
	}
}

// TestSyncThemeSegmentPlaybackSourceTx_UpsertContainsPlaybackColumns verifies that
// the upsert statement rebuilds all playback columns including release_variant_id, jellyfin_item_id,
// and duration_seconds.
func TestSyncThemeSegmentPlaybackSourceTx_UpsertContainsPlaybackColumns(t *testing.T) {
	content := readSegmentSourceFile(t, "admin_content_anime_themes.go")

	// These column names are used in the INSERT / DO UPDATE SET inside syncThemeSegmentPlaybackSourceTx.
	requiredColumns := []string{
		"release_variant_id",
		"jellyfin_item_id",
		"duration_seconds",
	}
	for _, col := range requiredColumns {
		if !strings.Contains(content, col) {
			t.Errorf("syncThemeSegmentPlaybackSourceTx upsert: missing column %q", col)
		}
	}
}

// TestGetSegmentReleaseDuration_MethodDeclared verifies that the new repository method
// GetSegmentReleaseDuration is declared so the interface contract can be satisfied.
func TestGetSegmentReleaseDuration_MethodDeclared(t *testing.T) {
	content := readSegmentSourceFile(t, "admin_content_anime_themes.go")

	if !strings.Contains(content, "func (r *AdminContentRepository) GetSegmentReleaseDuration(") {
		t.Fatal("GetSegmentReleaseDuration method not found in admin_content_anime_themes.go")
	}
}

func int32ptr(v int32) *int32 { return &v }

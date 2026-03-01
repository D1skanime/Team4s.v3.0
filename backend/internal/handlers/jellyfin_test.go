package handlers

import (
	"testing"
)

// Additional Jellyfin validation tests not covered in admin_content_test.go

func TestValidateAdminAnimeJellyfinSyncRequest_InvalidSeasonNumberZero(t *testing.T) {
	season := int32(0)
	_, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
		SeasonNumber: &season,
	})
	if message != "ungueltiger season_number parameter" {
		t.Fatalf("expected season_number error, got %q", message)
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_InvalidSeasonNumberNegative(t *testing.T) {
	negativeSeason := int32(-1)
	_, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
		SeasonNumber: &negativeSeason,
	})
	if message != "ungueltiger season_number parameter" {
		t.Fatalf("expected season_number error for negative, got %q", message)
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_InvalidEpisodeStatus(t *testing.T) {
	invalid := "invalid"
	_, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
		EpisodeStatus: &invalid,
	})
	if message != "ungueltiger episode_status parameter" {
		t.Fatalf("expected episode_status error, got %q", message)
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_SeriesIDTooLong(t *testing.T) {
	longID := string(make([]byte, 121))
	_, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
		JellyfinSeriesID: &longID,
	})
	if message != "jellyfin_series_id ist zu lang" {
		t.Fatalf("expected series_id error, got %q", message)
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_ValidStatuses(t *testing.T) {
	statuses := []string{"disabled", "private", "public"}
	for _, status := range statuses {
		s := status
		input, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
			EpisodeStatus: &s,
		})
		if message != "" {
			t.Fatalf("expected no error for status %q, got %q", status, message)
		}
		if input.EpisodeStatus != status {
			t.Fatalf("expected status %q, got %q", status, input.EpisodeStatus)
		}
	}
}

func TestValidateAdminAnimeJellyfinSyncRequest_BooleanFlags(t *testing.T) {
	trueVal := true
	input, message := validateAdminAnimeJellyfinSyncRequest(adminAnimeJellyfinSyncRequest{
		OverwriteEpisodeTitle:   &trueVal,
		OverwriteVersionTitle:   &trueVal,
		CleanupProviderVersions: &trueVal,
		AllowMismatch:           &trueVal,
	})
	if message != "" {
		t.Fatalf("expected no error, got %q", message)
	}
	if !input.OverwriteEpisodeTitle {
		t.Fatal("expected OverwriteEpisodeTitle true")
	}
	if !input.OverwriteVersionTitle {
		t.Fatal("expected OverwriteVersionTitle true")
	}
	if !input.CleanupProviderVersions {
		t.Fatal("expected CleanupProviderVersions true")
	}
	if !input.AllowMismatch {
		t.Fatal("expected AllowMismatch true")
	}
}

func TestJellyfinSeasonNumber(t *testing.T) {
	if jellyfinSeasonNumber(nil) != 1 {
		t.Fatal("expected default 1 for nil")
	}

	zero := 0
	if jellyfinSeasonNumber(&zero) != 1 {
		t.Fatal("expected default 1 for zero")
	}

	negative := -1
	if jellyfinSeasonNumber(&negative) != 1 {
		t.Fatal("expected default 1 for negative")
	}

	valid := 3
	if jellyfinSeasonNumber(&valid) != 3 {
		t.Fatalf("expected 3, got %d", jellyfinSeasonNumber(&valid))
	}
}

func TestJellyfinEpisodeNumber(t *testing.T) {
	if jellyfinEpisodeNumber(nil) != 0 {
		t.Fatal("expected 0 for nil")
	}

	zero := 0
	if jellyfinEpisodeNumber(&zero) != 0 {
		t.Fatal("expected 0 for zero")
	}

	negative := -1
	if jellyfinEpisodeNumber(&negative) != 0 {
		t.Fatal("expected 0 for negative")
	}

	valid := 5
	if jellyfinEpisodeNumber(&valid) != 5 {
		t.Fatalf("expected 5, got %d", jellyfinEpisodeNumber(&valid))
	}
}

func TestNormalizeJellyfinPath(t *testing.T) {
	if normalizeJellyfinPath(nil) != "" {
		t.Fatal("expected empty for nil")
	}

	empty := ""
	if normalizeJellyfinPath(&empty) != "" {
		t.Fatal("expected empty for empty string")
	}

	spaces := "   "
	if normalizeJellyfinPath(&spaces) != "" {
		t.Fatal("expected empty for spaces-only")
	}

	backslash := "C:\\Anime\\Series"
	result := normalizeJellyfinPath(&backslash)
	if result != "c:/anime/series" {
		t.Fatalf("expected normalized path, got %q", result)
	}

	trailingSlash := "/anime/series/"
	result = normalizeJellyfinPath(&trailingSlash)
	if result != "/anime/series" {
		t.Fatalf("expected no trailing slash, got %q", result)
	}
}

func TestBuildJellyfinSyncMismatchReason_NoMismatch(t *testing.T) {
	maxEp := int16(12)
	reason := buildJellyfinSyncMismatchReason(&maxEp, 12)
	if reason != nil {
		t.Fatalf("expected nil for exact match, got %q", *reason)
	}

	reason = buildJellyfinSyncMismatchReason(&maxEp, 14)
	if reason != nil {
		t.Fatalf("expected nil within tolerance, got %q", *reason)
	}
}

func TestBuildJellyfinSyncMismatchReason_Mismatch(t *testing.T) {
	maxEp := int16(12)
	reason := buildJellyfinSyncMismatchReason(&maxEp, 25)
	if reason == nil {
		t.Fatal("expected mismatch reason for 25 episodes when max is 12")
	}
}

func TestBuildJellyfinSyncMismatchReason_NilMaxEpisodes(t *testing.T) {
	reason := buildJellyfinSyncMismatchReason(nil, 50)
	if reason != nil {
		t.Fatalf("expected nil for nil max_episodes, got %q", *reason)
	}
}

func TestParseJellyfinPremiereDate(t *testing.T) {
	if parseJellyfinPremiereDate(nil) != nil {
		t.Fatal("expected nil for nil input")
	}

	empty := ""
	if parseJellyfinPremiereDate(&empty) != nil {
		t.Fatal("expected nil for empty string")
	}

	invalid := "not-a-date"
	if parseJellyfinPremiereDate(&invalid) != nil {
		t.Fatal("expected nil for invalid date")
	}

	valid := "2024-01-15T00:00:00.0000000Z"
	parsed := parseJellyfinPremiereDate(&valid)
	if parsed == nil {
		t.Fatal("expected parsed date")
	}
	if parsed.Year() != 2024 || parsed.Month() != 1 || parsed.Day() != 15 {
		t.Fatalf("unexpected date: %v", parsed)
	}
}

func TestNormalizeNullableStringPtr(t *testing.T) {
	result := normalizeNullableStringPtr("")
	if result != nil {
		t.Fatal("expected nil for empty string")
	}

	result = normalizeNullableStringPtr("   ")
	if result != nil {
		t.Fatal("expected nil for whitespace")
	}

	result = normalizeNullableStringPtr("  hello  ")
	if result == nil || *result != "hello" {
		t.Fatalf("expected trimmed value, got %v", result)
	}
}

func TestInt16FromCount(t *testing.T) {
	if int16FromCount(0) != nil {
		t.Fatal("expected nil for zero")
	}

	if int16FromCount(-1) != nil {
		t.Fatal("expected nil for negative")
	}

	if int16FromCount(32768) != nil {
		t.Fatal("expected nil for overflow")
	}

	result := int16FromCount(100)
	if result == nil || *result != 100 {
		t.Fatalf("expected 100, got %v", result)
	}
}

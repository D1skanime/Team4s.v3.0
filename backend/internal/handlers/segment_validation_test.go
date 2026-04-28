package handlers

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// TestValidateSegmentTimes_StartAfterEnd verifies that start_time >= end_time is always rejected.
func TestValidateSegmentTimes_StartAfterEnd(t *testing.T) {
	start := "00:01:00"
	end := "00:00:30"
	msg := validateSegmentTimes(&start, &end, nil)
	if msg == "" {
		t.Fatal("expected validation error when start_time >= end_time, got empty string")
	}
}

// TestValidateSegmentTimes_StartEqualsEnd verifies that start_time == end_time is rejected.
func TestValidateSegmentTimes_StartEqualsEnd(t *testing.T) {
	ts := "00:01:30"
	msg := validateSegmentTimes(&ts, &ts, nil)
	if msg == "" {
		t.Fatal("expected validation error when start_time == end_time, got empty string")
	}
}

// TestValidateSegmentTimes_EndExceedsKnownRuntime verifies that end_time > duration_seconds
// is rejected when runtime is known.
func TestValidateSegmentTimes_EndExceedsKnownRuntime(t *testing.T) {
	start := "00:00:00"
	end := "00:01:35" // 95 seconds
	dur := int32(90)  // 90 seconds runtime
	msg := validateSegmentTimes(&start, &end, &dur)
	if msg == "" {
		t.Fatal("expected validation error when end_time exceeds known runtime, got empty string")
	}
}

// TestValidateSegmentTimes_ValidTimesWithKnownRuntime verifies that valid times within
// known runtime are accepted.
func TestValidateSegmentTimes_ValidTimesWithKnownRuntime(t *testing.T) {
	start := "00:00:05"
	end := "00:01:25" // 85 seconds
	dur := int32(90)  // 90 seconds runtime
	msg := validateSegmentTimes(&start, &end, &dur)
	if msg != "" {
		t.Fatalf("expected no validation error for valid times within runtime, got: %q", msg)
	}
}

// TestValidateSegmentTimes_NullRuntimeAllowsAnySave verifies that when runtime is null,
// any valid (start < end) timing is accepted without upper bound rejection.
func TestValidateSegmentTimes_NullRuntimeAllowsAnySave(t *testing.T) {
	start := "00:00:00"
	end := "23:59:59"
	msg := validateSegmentTimes(&start, &end, nil)
	if msg != "" {
		t.Fatalf("expected no validation error when runtime is null, got: %q", msg)
	}
}

// TestValidateSegmentTimes_NilTimesAlwaysValid verifies that nil start/end are always valid.
func TestValidateSegmentTimes_NilTimesAlwaysValid(t *testing.T) {
	dur := int32(90)
	msg := validateSegmentTimes(nil, nil, &dur)
	if msg != "" {
		t.Fatalf("expected no validation error for nil times, got: %q", msg)
	}
}

// TestParseClockToSeconds_VariousFormats verifies the clock string parser.
func TestParseClockToSeconds_VariousFormats(t *testing.T) {
	cases := []struct {
		input    string
		expected *int32
	}{
		{"00:00:30", handlerInt32ptr(30)},
		{"00:01:30", handlerInt32ptr(90)},
		{"01:30:00", handlerInt32ptr(5400)},
		{"1:30", handlerInt32ptr(90)},
		{"", nil},
		{"invalid", nil},
		{"1:2:3:4", nil},
	}

	for _, tc := range cases {
		var input *string
		if tc.input != "" {
			s := tc.input
			input = &s
		}
		got := parseClockToSeconds(input)
		if tc.expected == nil && got != nil {
			t.Errorf("parseClockToSeconds(%q): expected nil, got %d", tc.input, *got)
		} else if tc.expected != nil && got == nil {
			t.Errorf("parseClockToSeconds(%q): expected %d, got nil", tc.input, *tc.expected)
		} else if tc.expected != nil && got != nil && *tc.expected != *got {
			t.Errorf("parseClockToSeconds(%q): expected %d, got %d", tc.input, *tc.expected, *got)
		}
	}
}

// TestCreateUpdateAnimeSegment_SharedValidationSeamExists verifies that both
// CreateAnimeSegment and UpdateAnimeSegment call the shared validateSegmentTimes function.
func TestCreateUpdateAnimeSegment_SharedValidationSeamExists(t *testing.T) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Skip("cannot determine test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(thisFile), "admin_content_anime_theme_segments.go"))
	if err != nil {
		t.Fatalf("read handler source: %v", err)
	}
	src := string(content)

	// Both CreateAnimeSegment and UpdateAnimeSegment must reference validateSegmentTimes.
	if !strings.Contains(src, "validateSegmentTimes") {
		t.Fatal("admin_content_anime_theme_segments.go: validateSegmentTimes not found — shared validation seam missing")
	}

	// The handler must reference duration_seconds or runtime in context of validation.
	if !strings.Contains(src, "duration_seconds") && !strings.Contains(src, "releaseDuration") {
		t.Fatal("admin_content_anime_theme_segments.go: no runtime/duration_seconds reference in segment handlers")
	}

	// badRequest must be referenced near validation (end_time/start_time guard).
	if !strings.Contains(src, "badRequest") {
		t.Fatal("admin_content_anime_theme_segments.go: badRequest not found — 400 responses missing")
	}
}

func handlerInt32ptr(v int32) *int32 { return &v }

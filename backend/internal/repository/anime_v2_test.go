package repository

// anime_v2_test.go proves GAP-21 (165-UAT.md, Live-UAT 2026-09-22): the
// anime_types table seeds the row "film" (database/migrations/0030_add_anime_types_table.up.sql),
// but mapAnimeTypeNameToAPI lacked a case "film" and fell through to the
// default "tv" fallback. This is a pure unit test (no DB) mirroring the
// existing anime_relations_admin_test.go pattern.

import "testing"

func ptr(s string) *string { return &s }

func TestMapAnimeTypeNameToAPI(t *testing.T) {
	tests := []struct {
		name  string
		input *string
		want  string
	}{
		{name: "film DB row maps to film API value", input: ptr("film"), want: "film"},
		{name: "tv stays tv", input: ptr("tv"), want: "tv"},
		{name: "unknown value falls back to tv", input: ptr("garbage"), want: "tv"},
		{name: "nil falls back to tv", input: nil, want: "tv"},
		{name: "uppercase Film still maps to film (case-insensitive)", input: ptr("Film"), want: "film"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mapAnimeTypeNameToAPI(tt.input)
			if got != tt.want {
				t.Fatalf("mapAnimeTypeNameToAPI(%v) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

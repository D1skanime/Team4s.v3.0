package repository

// Pure logic test for DependencySummary.GermanReasonFragment -- no Postgres
// fixture needed (unlike release_version_group_guard_test.go's DB-backed
// dependents-counting tests). Covers the 1/2/0 pluralization table for all
// three counted kinds (Credits/Media/Notes), per this phase's Teststil
// instruction (test the logic directly, not via a render/handler test).

import "testing"

func TestDependencySummaryGermanReasonFragment(t *testing.T) {
	tests := []struct {
		name    string
		summary DependencySummary
		want    string
	}{
		{
			name:    "all zero",
			summary: DependencySummary{Credits: 0, Media: 0, Notes: 0},
			want:    "0 Credits, 0 Medien, 0 Notizen",
		},
		{
			name:    "credits singular",
			summary: DependencySummary{Credits: 1, Media: 0, Notes: 0},
			want:    "1 Credit, 0 Medien, 0 Notizen",
		},
		{
			name:    "credits plural",
			summary: DependencySummary{Credits: 2, Media: 0, Notes: 0},
			want:    "2 Credits, 0 Medien, 0 Notizen",
		},
		{
			name:    "media singular",
			summary: DependencySummary{Credits: 0, Media: 1, Notes: 0},
			want:    "0 Credits, 1 Medium, 0 Notizen",
		},
		{
			name:    "media plural",
			summary: DependencySummary{Credits: 0, Media: 2, Notes: 0},
			want:    "0 Credits, 2 Medien, 0 Notizen",
		},
		{
			name:    "notes singular",
			summary: DependencySummary{Credits: 0, Media: 0, Notes: 1},
			want:    "0 Credits, 0 Medien, 1 Notiz",
		},
		{
			name:    "notes plural",
			summary: DependencySummary{Credits: 0, Media: 0, Notes: 2},
			want:    "0 Credits, 0 Medien, 2 Notizen",
		},
		{
			name:    "mixed singular and plural across all three kinds",
			summary: DependencySummary{Credits: 1, Media: 2, Notes: 1},
			want:    "1 Credit, 2 Medien, 1 Notiz",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.summary.GermanReasonFragment(); got != tt.want {
				t.Errorf("GermanReasonFragment() = %q, want %q", got, tt.want)
			}
		})
	}
}

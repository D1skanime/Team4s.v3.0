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

// Live-UAT-Nachbesserung (Phase 189, Lösch-Sperre): "1 Gruppennotiz hängen
// noch daran." war grammatisch falsch (Verb muss mit der GESAMTzahl aller
// angehängten Dinge übereinstimmen, nicht mit der Anzahl der Kategorien oder
// dem Einzelwert einer Kategorie). Deckt 1 vs. 2 vs. mehrere Arten ab.
func TestGermanHaengenVerb(t *testing.T) {
	tests := []struct {
		name  string
		total int32
		want  string
	}{
		{name: "genau ein angehängtes Element", total: 1, want: "hängt"},
		{name: "zwei angehängte Elemente derselben Art", total: 2, want: "hängen"},
		{name: "null angehängte Elemente", total: 0, want: "hängen"},
		{name: "viele angehängte Elemente", total: 7, want: "hängen"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := GermanHaengenVerb(tt.total); got != tt.want {
				t.Errorf("GermanHaengenVerb(%d) = %q, want %q", tt.total, got, tt.want)
			}
		})
	}
}

func TestDependencySummaryTotalCount(t *testing.T) {
	tests := []struct {
		name    string
		summary DependencySummary
		want    int32
	}{
		{name: "all zero", summary: DependencySummary{}, want: 0},
		{name: "exactly one item, one kind", summary: DependencySummary{Notes: 1}, want: 1},
		{
			name:    "exactly one item per kind, two kinds -- total is two, not one",
			summary: DependencySummary{Credits: 1, Notes: 1},
			want:    2,
		},
		{name: "multiple items, one kind", summary: DependencySummary{Media: 3}, want: 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.summary.TotalCount()
			if got != tt.want {
				t.Errorf("TotalCount() = %d, want %d", got, tt.want)
			}
			gotVerb := GermanHaengenVerb(got)
			wantVerb := "hängen"
			if got == 1 {
				wantVerb = "hängt"
			}
			if gotVerb != wantVerb {
				t.Errorf("GermanHaengenVerb(TotalCount()) = %q, want %q", gotVerb, wantVerb)
			}
		})
	}
}

func TestFansubGroupDependencySummaryTotalCount(t *testing.T) {
	tests := []struct {
		name    string
		summary FansubGroupDependencySummary
		want    int32
	}{
		{name: "all zero", summary: FansubGroupDependencySummary{}, want: 0},
		{
			name:    "exactly one item, one kind -- singular verb case from the live UAT report",
			summary: FansubGroupDependencySummary{GroupNotes: 1},
			want:    1,
		},
		{
			name:    "exactly one item per kind, two kinds -- total is two, plural verb",
			summary: FansubGroupDependencySummary{GroupNotes: 1, Releases: 1},
			want:    2,
		},
		{name: "multiple items, one kind", summary: FansubGroupDependencySummary{Releases: 5}, want: 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.summary.TotalCount(); got != tt.want {
				t.Errorf("TotalCount() = %d, want %d", got, tt.want)
			}
		})
	}
}

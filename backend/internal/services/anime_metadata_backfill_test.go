package services

import "testing"

func TestBuildLegacyTitleCandidates_UsesResolvedMappings(t *testing.T) {
	titleDE := "Deutscher Titel"
	titleEN := "English Title"

	got := buildLegacyTitleCandidates(
		"Japanese Title",
		&titleDE,
		&titleEN,
		1,
		2,
		3,
		10,
		11,
	)

	if len(got) != 3 {
		t.Fatalf("expected 3 title candidates, got %d", len(got))
	}

	if got[0].title != "Japanese Title" || got[0].languageID != 1 || got[0].titleTypeID != 10 {
		t.Fatalf("unexpected ja/main candidate: %+v", got[0])
	}
	if got[1].title != "Deutscher Titel" || got[1].languageID != 2 || got[1].titleTypeID != 10 {
		t.Fatalf("unexpected de/main candidate: %+v", got[1])
	}
	if got[2].title != "English Title" || got[2].languageID != 3 || got[2].titleTypeID != 11 {
		t.Fatalf("unexpected en/official candidate: %+v", got[2])
	}
}

func TestBuildLegacyTitleCandidates_DeduplicatesSameTuple(t *testing.T) {
	titleDE := "  Deutscher Titel  "
	titleEN := "  "

	got := buildLegacyTitleCandidates(
		"Japanese Title",
		&titleDE,
		&titleEN,
		1,
		2,
		3,
		10,
		11,
	)

	if len(got) != 2 {
		t.Fatalf("expected 2 title candidates, got %d", len(got))
	}
}

func TestTokenizeLegacyGenres_SplitsTrimsAndDeduplicates(t *testing.T) {
	raw := "Action, Drama, action , , Sci-Fi"

	got := tokenizeLegacyGenres(&raw)
	want := []string{"Action", "Drama", "Sci-Fi"}

	if len(got) != len(want) {
		t.Fatalf("expected %d genre tokens, got %d: %#v", len(want), len(got), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("expected token %q at index %d, got %q", want[i], i, got[i])
		}
	}
}

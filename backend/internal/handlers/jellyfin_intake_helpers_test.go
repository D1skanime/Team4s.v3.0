package handlers

import "testing"

// TestBuildJellyfinIntakeTypeHint_LiveFansubsPathSegments_D28 covers Test E2 (D-28): all eight
// live-verified Fansubs path segments (RESEARCH.md §17c/a) must resolve to their correct
// suggested type, including the previously-broken German "Spezial" folder name
// (Anime.TV-Spezial.Sub), without changing the resolution of any of the other seven segments
// or the pre-existing English "special" match used by the direct-search flow.
func TestBuildJellyfinIntakeTypeHint_LiveFansubsPathSegments_D28(t *testing.T) {
	t.Parallel()

	cases := []struct {
		segment      string
		expectedType string
	}{
		{"Anime.Bonus.BD-rips", "bonus"},
		{"Anime.Bonus.Dub", "bonus"},
		{"Anime.Bonus.Sub", "bonus"},
		{"Anime.Bonus.Webrips", "bonus"},
		{"Anime.Film.Sub", "film"},
		{"Anime.OVA.Sub", "ova"},
		{"Anime.TV.Sub", "tv"},
		{"Anime.TV-Spezial.Sub", "special"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.segment, func(t *testing.T) {
			t.Parallel()

			path := "/media/Anime/Serie/" + tc.segment + "/Some Series"
			hint := buildJellyfinIntakeTypeHint("Some Series", &path)

			if hint.SuggestedType == nil {
				t.Fatalf("expected a suggested type for segment %q, got nil", tc.segment)
			}
			if *hint.SuggestedType != tc.expectedType {
				t.Fatalf("segment %q: expected suggested type %q, got %q", tc.segment, tc.expectedType, *hint.SuggestedType)
			}
		})
	}
}

// TestBuildJellyfinIntakeTypeHint_EnglishSpecialStillMatches_D28Regression proves the D-28
// additive fix did not regress the pre-existing English "special" token match.
func TestBuildJellyfinIntakeTypeHint_EnglishSpecialStillMatches_D28Regression(t *testing.T) {
	t.Parallel()

	path := "/media/Anime/Serie/Anime.TV-Special.Sub/Some Series"
	hint := buildJellyfinIntakeTypeHint("Some Series", &path)

	if hint.SuggestedType == nil || *hint.SuggestedType != "special" {
		t.Fatalf("expected english 'special' path to still resolve to special, got %+v", hint)
	}
}

// TestBuildJellyfinIntakeTypeHint_SeasonZeroStillMatches_D28Regression proves the D-28
// additive fix did not regress the pre-existing "season 00" token match.
func TestBuildJellyfinIntakeTypeHint_SeasonZeroStillMatches_D28Regression(t *testing.T) {
	t.Parallel()

	hint := buildJellyfinIntakeTypeHint("Some Series Season 00", nil)

	if hint.SuggestedType == nil || *hint.SuggestedType != "special" {
		t.Fatalf("expected 'season 00' name to still resolve to special, got %+v", hint)
	}
}

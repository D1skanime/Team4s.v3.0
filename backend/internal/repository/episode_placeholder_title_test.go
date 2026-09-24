package repository

import "testing"

func TestIsPlaceholderEpisodeTitle(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name          string
		title         string
		episodeNumber int32
		want          bool
	}{
		{"episode-1", "Episode 1", 1, true},
		{"episode-1-lowercase", "episode 1", 1, true},
		{"folge-01-leading-zero", "Folge 01", 1, true},
		{"ep-1-abbreviation", "Ep 1", 1, true},
		{"ep-dot-1", "Ep. 1", 1, true},
		{"ep-dot-1-no-space", "EP.1", 1, true},
		{"episode-bare-form", "Episode", 42, true},
		{"folge-bare-form", "Folge", 42, true},
		{"ep-dot-bare-form", "Ep.", 42, true},
		{"real-title-parody-mode", "Parody Mode", 1, false},
		{"real-title-episode-of-the-sun", "Episode of the Sun", 1, false},
		{"episode-number-mismatch", "Episode 2", 1, false},
		{"empty-string", "", 1, false},
		{"whitespace-only", "  ", 1, false},
		{"no-word-boundary-false-friend", "Folgenreich", 1, false},
	} {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := isPlaceholderEpisodeTitle(tc.title, tc.episodeNumber); got != tc.want {
				t.Fatalf("isPlaceholderEpisodeTitle(%q, %d) = %v, want %v", tc.title, tc.episodeNumber, got, tc.want)
			}
		})
	}
}

func TestIsEinteilerAnimeType(t *testing.T) {
	t.Parallel()

	for _, tc := range []struct {
		name              string
		animeType         string
		totalEpisodeCount int
		want              bool
	}{
		{"film-always-einteiler-many-episodes", "film", 12, true},
		{"film-always-einteiler-single-episode", "film", 1, true},
		{"ova-single-episode-is-einteiler", "ova", 1, true},
		{"ova-two-episodes-not-einteiler", "ova", 2, false},
		{"ona-single-episode-is-einteiler", "ona", 1, true},
		{"special-single-episode-is-einteiler", "special", 1, true},
		{"bonus-single-episode-is-einteiler", "bonus", 1, true},
		{"tv-never-einteiler", "tv", 1, false},
		{"unknown-type-never-einteiler", "unknown", 1, false},
		{"empty-type-never-einteiler", "", 1, false},
	} {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := IsEinteilerAnimeType(tc.animeType, tc.totalEpisodeCount); got != tc.want {
				t.Fatalf("IsEinteilerAnimeType(%q, %d) = %v, want %v", tc.animeType, tc.totalEpisodeCount, got, tc.want)
			}
		})
	}
}

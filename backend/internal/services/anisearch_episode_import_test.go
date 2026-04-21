package services

import "testing"

func TestParseAniSearchEpisodeListHTML_ReturnsCanonicalEpisodes(t *testing.T) {
	t.Parallel()

	fixture := `
		<section id="episoden">
			<table>
				<tr><td>1</td><td>The Day I Became a Shinigami</td></tr>
				<tr><td>2</td><td>A Shinigami's Work</td></tr>
			</table>
		</section>`

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(episodes) != 2 {
		t.Fatalf("expected 2 canonical episodes, got %d", len(episodes))
	}
	if episodes[0].EpisodeNumber != 1 || episodes[1].EpisodeNumber != 2 {
		t.Fatalf("expected canonical episode numbers [1 2], got [%d %d]", episodes[0].EpisodeNumber, episodes[1].EpisodeNumber)
	}
	if episodes[0].Title == nil || *episodes[0].Title != "The Day I Became a Shinigami" {
		t.Fatalf("unexpected first title: %#v", episodes[0].Title)
	}
}

func TestParseAniSearchEpisodeListHTML_CarriesMultilingualTitlesAndFiller(t *testing.T) {
	t.Parallel()

	fixture := `
		<section id="episoden">
			<table>
				<tr>
					<td>1</td>
					<td data-lang="de">Deutscher Titel</td>
					<td data-lang="en">English Title</td>
					<td data-lang="ja">日本語タイトル</td>
					<td>Filler</td>
				</tr>
				<tr>
					<td>2</td>
					<td data-lang="en">Only English</td>
					<td>Canon</td>
				</tr>
			</table>
		</section>`

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(episodes) != 2 {
		t.Fatalf("expected 2 canonical episodes, got %d", len(episodes))
	}
	if got := episodes[0].TitlesByLanguage["de"]; got != "Deutscher Titel" {
		t.Fatalf("expected German title, got %q", got)
	}
	if got := episodes[0].TitlesByLanguage["en"]; got != "English Title" {
		t.Fatalf("expected English title, got %q", got)
	}
	if got := episodes[0].TitlesByLanguage["ja"]; got != "日本語タイトル" {
		t.Fatalf("expected Japanese title, got %q", got)
	}
	if episodes[0].Title == nil || *episodes[0].Title != "Deutscher Titel" {
		t.Fatalf("expected German display fallback, got %#v", episodes[0].Title)
	}
	if episodes[0].FillerType == nil || *episodes[0].FillerType != "filler" {
		t.Fatalf("expected filler metadata, got %#v", episodes[0].FillerType)
	}
	if episodes[1].Title == nil || *episodes[1].Title != "Only English" {
		t.Fatalf("expected English fallback when German missing, got %#v", episodes[1].Title)
	}
	if episodes[1].FillerType == nil || *episodes[1].FillerType != "canon" {
		t.Fatalf("expected canon metadata, got %#v", episodes[1].FillerType)
	}
}

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

func TestParseAniSearchEpisodeListHTML_IgnoresUnrelatedPageTablesWhenEpisodeSectionIsMissing(t *testing.T) {
	t.Parallel()

	fixture := `
		<html>
			<body>
				<table>
					<tr><td>Klarwert 3.62 = 72%</td><td>Toplist #1628</td></tr>
					<tr><td>TV-Serie, 220 (~23 min)</td><td>Status: Abgeschlossen</td></tr>
				</table>
			</body>
		</html>`

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(episodes) != 0 {
		t.Fatalf("expected unrelated tables to be ignored, got %+v", episodes)
	}
}

func TestParseAniSearchEpisodeListHTML_UsesTitleColumnInsteadOfRuntimeColumn(t *testing.T) {
	t.Parallel()

	fixture := `
		<section id="episoden">
			<table>
				<tr data-episode="true">
					<th scope="row"><b>1</b></th>
					<td data-title="Laufzeit">
						<div class="grey" lang="ja">23 min</div>
						<div class="grey" lang="en">23 min</div>
						<div class="bold" lang="de">23 min</div>
					</td>
					<td data-title="Titel">
						<div lang="ja"><span lang="ja">Sanjou! Uzumaki Naruto</span></div>
						<div lang="en"><span lang="en">Enter: Naruto Uzumaki!</span></div>
						<div lang="de"><span lang="de">Wer ist Naruto?</span></div>
					</td>
				</tr>
			</table>
		</section>`

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(episodes) != 1 {
		t.Fatalf("expected 1 canonical episode, got %d", len(episodes))
	}
	if got := episodes[0].TitlesByLanguage["de"]; got != "Wer ist Naruto?" {
		t.Fatalf("expected German title from title column, got %q", got)
	}
	if episodes[0].Title == nil || *episodes[0].Title != "Wer ist Naruto?" {
		t.Fatalf("expected display title to ignore runtime column, got %#v", episodes[0].Title)
	}
}

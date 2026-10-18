package services

import (
	"os"
	"strings"
	"testing"
)

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

func TestParseAniSearchEpisodeListHTML_TitlelessRowYieldsNilTitleNotSyntheticFallback(t *testing.T) {
	t.Parallel()

	fixture := `
		<section id="episoden">
			<table>
				<tr><td>1</td><td></td></tr>
			</table>
		</section>`

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(episodes) != 1 {
		t.Fatalf("expected 1 canonical episode, got %d", len(episodes))
	}
	if episodes[0].Title != nil {
		t.Fatalf("expected nil title for titleless row, not a synthetic fallback, got %#v", episodes[0].Title)
	}
}

// TestParseAniSearchEpisodeListHTML_BonusRowDoesNotOverwriteRegularEpisode
// reproduces the "B1" bonus-episode collision from the debug session
// anisearch-episode-titles-wrong-and-no-language-select.md: a bonus row
// whose episode-number cell is "B1" (not pure-numeric, and linking to a
// DIFFERENT anime id) must be rejected entirely by
// parseAniSearchEpisodeNumber, not parsed as episode 1 and overwrite the
// real episode 1 that appears earlier in document order.
func TestParseAniSearchEpisodeListHTML_BonusRowDoesNotOverwriteRegularEpisode(t *testing.T) {
	t.Parallel()

	fixture := `
		<section id="episoden">
			<table>
				<tr data-episode="true">
					<th scope="row"><b>1</b></th>
					<td data-title="Titel"><div lang="de"><span lang="de">Unantastbare Koenigin</span></div></td>
				</tr>
				<tr data-episode="true">
					<th scope="row"><b><a href="anime/7031">B1</a></b></th>
					<td data-title="Titel"><div lang="en"><span lang="en">Freezing: Hajikechau! Dokidoki Trouble Freezing</span></div></td>
				</tr>
			</table>
		</section>`

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	if len(episodes) != 1 {
		t.Fatalf("expected the bonus row to be excluded entirely, got %d episodes: %+v", len(episodes), episodes)
	}
	if episodes[0].EpisodeNumber != 1 {
		t.Fatalf("expected the only surviving episode to be number 1, got %d", episodes[0].EpisodeNumber)
	}
	if episodes[0].Title == nil || *episodes[0].Title != "Unantastbare Koenigin" {
		t.Fatalf("expected real episode 1 title to survive, got %#v", episodes[0].Title)
	}
	for _, title := range episodes[0].TitlesByLanguage {
		if strings.Contains(title, "Hajikechau") {
			t.Fatalf("bonus title leaked into episode 1's TitlesByLanguage: %#v", episodes[0].TitlesByLanguage)
		}
	}
}

// readAniSearchEpisodeFixture loads a real, committed AniSearch episode-page
// HTML fixture from testdata/. This reads a test FIXTURE file, not a
// handler's own .go source used to fake a behavior assertion -- the Teststil
// source-self-grepping prohibition in CLAUDE.md does not apply here; the
// parser under test is still invoked end-to-end against this HTML.
func readAniSearchEpisodeFixture(t *testing.T, name string) string {
	t.Helper()
	content, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return string(content)
}

// TestParseAniSearchEpisodeListHTML_FreezingRealFixture_BonusRowExcluded is
// the integration-style regression test against the real, broken case:
// AniSearch 6465 "Freezing" has 12 regular episodes plus one trailing "B1"
// bonus row. Before the anchored-regex fix, the bonus row overwrote episode
// 1 with its own bonus title; after the fix exactly 12 regular episodes
// survive and episode 1 keeps its real German title.
func TestParseAniSearchEpisodeListHTML_FreezingRealFixture_BonusRowExcluded(t *testing.T) {
	t.Parallel()

	fixture := readAniSearchEpisodeFixture(t, "anisearch_6465_freezing_episodes.html")

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse real fixture: %v", err)
	}
	if len(episodes) != 12 {
		t.Fatalf("expected exactly 12 regular episodes (bonus B1 row excluded), got %d", len(episodes))
	}
	if episodes[0].EpisodeNumber != 1 {
		t.Fatalf("expected first episode to be number 1, got %d", episodes[0].EpisodeNumber)
	}
	if episodes[0].Title == nil || *episodes[0].Title != "Unantastbare Königin" {
		t.Fatalf("expected episode 1's real German title, got %#v", episodes[0].Title)
	}
	const bonusTitle = "Freezing: Hajikechau! Dokidoki Trouble Freezing"
	for _, episode := range episodes {
		for _, title := range episode.TitlesByLanguage {
			if title == bonusTitle {
				t.Fatalf("bonus title %q leaked into episode %d", bonusTitle, episode.EpisodeNumber)
			}
		}
		if episode.Title != nil && *episode.Title == bonusTitle {
			t.Fatalf("bonus title %q leaked into episode %d's display title", bonusTitle, episode.EpisodeNumber)
		}
	}
}

// TestParseAniSearchEpisodeListHTML_BuddyComplexRealFixture_StillParsesAll13
// is the regression counterexample: AniSearch 9251 "Buddy Complex" has 13
// purely numeric episode rows (1-13), no bonus-row collision. The anchored
// regex must not break this already-working case.
func TestParseAniSearchEpisodeListHTML_BuddyComplexRealFixture_StillParsesAll13(t *testing.T) {
	t.Parallel()

	fixture := readAniSearchEpisodeFixture(t, "anisearch_9251_buddycomplex_episodes.html")

	episodes, err := parseAniSearchEpisodeListHTML(fixture)
	if err != nil {
		t.Fatalf("parse real fixture: %v", err)
	}
	if len(episodes) != 13 {
		t.Fatalf("expected all 13 episodes to parse, got %d", len(episodes))
	}
	for i, episode := range episodes {
		expectedNumber := int32(i + 1)
		if episode.EpisodeNumber != expectedNumber {
			t.Fatalf("expected episode at index %d to be number %d, got %d", i, expectedNumber, episode.EpisodeNumber)
		}
	}
	if episodes[0].Title == nil || *episodes[0].Title != "Begegnung" {
		t.Fatalf("expected episode 1's real German title, got %#v", episodes[0].Title)
	}
}

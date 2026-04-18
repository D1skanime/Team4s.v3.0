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

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

	t.Fatalf("not implemented: parse AniSearch episode list fixture into canonical episode rows independent of Jellyfin evidence; fixture=%d bytes", len(fixture))
}

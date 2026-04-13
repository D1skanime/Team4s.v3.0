package services

import "testing"

func TestParseAniSearchSearchHTML_ReturnsAnimeCandidatesOnly(t *testing.T) {
	t.Parallel()

	results, err := parseAniSearchSearchHTML(`
		<html>
			<body>
				<section class="mtC">
					<h2 class="headerA">Anime <span class="f12g">(Ergebnisse: 2)</span></h2>
					<ul class="covers">
						<li>
							<a href="anime/1078,bleach" class="anime-item">
								<span class="details">
									<span class="date">TV-Serie, 366 (2004)</span>
									<span class="title">Bleach</span>
								</span>
							</a>
						</li>
						<li>
							<a href="anime/15085,bleach-thousand-year-blood-war" class="anime-item">
								<span class="details">
									<span class="date">TV-Serie, 13 (2022)</span>
									<span class="title">Bleach: Thousand-Year Blood War</span>
								</span>
							</a>
						</li>
					</ul>
				</section>
				<section class="mtC">
					<h2 class="headerA">Manga <span class="f12g">(Ergebnisse: 1)</span></h2>
					<ul class="covers">
						<li>
							<a href="manga/2542,bleach" class="manga-item">
								<span class="details">
									<span class="date">Manga, 74/684 (2001)</span>
									<span class="title">Bleach</span>
								</span>
							</a>
						</li>
					</ul>
				</section>
			</body>
		</html>
	`, 10)
	if err != nil {
		t.Fatalf("parse search html: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 anime candidates, got %#v", results)
	}
	if results[0].AniSearchID != "1078" || results[0].Title != "Bleach" || results[0].Type != "TV-Serie" {
		t.Fatalf("unexpected first candidate: %#v", results[0])
	}
	if results[0].Year == nil || *results[0].Year != 2004 {
		t.Fatalf("expected first candidate year, got %#v", results[0].Year)
	}
	if results[1].AniSearchID != "15085" {
		t.Fatalf("unexpected second candidate: %#v", results[1])
	}
}

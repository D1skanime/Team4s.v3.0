package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readPublicVersionsSource laedt eine Quelldatei relativ zur Test-Datei.
// Konsistent mit dem Source-Inspection-Muster der uebrigen Repository-Tests
// (DB-Integration ist via test_helpers.go als Skip gekennzeichnet).
func readPublicVersionsSource(t *testing.T, name string) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test file path")
	}
	content, err := os.ReadFile(filepath.Join(filepath.Dir(file), name))
	if err != nil {
		t.Fatalf("read %s: %v", name, err)
	}
	return string(content)
}

// normalizeWhitespace kollabiert beliebigen Whitespace zu einzelnen Leerzeichen,
// damit gofmt-Tab-Ausrichtung in Struct-Feldern keine false negatives erzeugt.
func normalizeWhitespace(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

// TestPublicAnimeContributionsVersionBreakdown_MethodExists verifiziert, dass die
// Ebene-2-Aggregationsmethode attachVersionBreakdowns am Repository-Receiver definiert ist.
func TestPublicAnimeContributionsVersionBreakdown_MethodExists(t *testing.T) {
	content := readPublicVersionsSource(t, "anime_contributions_public_versions_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "func (r *animecontributionsrepository) attachversionbreakdowns(") {
		t.Fatalf("erwartete Methode attachVersionBreakdowns am *AnimeContributionsRepository")
	}
}

// TestPublicAnimeContributionsVersionBreakdown_DTOShape verifiziert die DTO-Felder
// und snake_case JSON-Tags (Spiegel zu frontend/src/types/contributions.ts).
func TestPublicAnimeContributionsVersionBreakdown_DTOShape(t *testing.T) {
	content := readPublicVersionsSource(t, "anime_contributions_public_versions_repository.go")
	normalized := normalizeWhitespace(strings.ToLower(content))

	requiredFragments := []string{
		"type releaseversionbreakdowngroup struct",
		`releaseversionid int64 ` + "`json:\"release_version_id\"`",
		`episodenumber string ` + "`json:\"episode_number\"`",
		`version string ` + "`json:\"version\"`",
		`contributors []publiccontributorrow ` + "`json:\"contributors\"`",
	}
	for _, frag := range requiredFragments {
		if !strings.Contains(normalized, frag) {
			t.Fatalf("erwartetes DTO-Fragment %q in ReleaseVersionBreakdownGroup", frag)
		}
	}
}

// TestPublicAnimeContributionsVersionBreakdown_QueryFiltersAndJoins verifiziert die
// Ebenen-Trennung (nur release_version_id IS NOT NULL), die identischen Public-Filter
// und die JOIN-Kette zur Episode-Release-Hierarchie.
func TestPublicAnimeContributionsVersionBreakdown_QueryFiltersAndJoins(t *testing.T) {
	content := readPublicVersionsSource(t, "anime_contributions_public_versions_repository.go")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		// Ebenen-Trennung: Versions-Ebene nur fuer versions-spezifische Beitraege.
		"ac.release_version_id is not null",
		// Information-Disclosure-Mitigation: dieselben Public-Filter wie Ebene 1.
		"ac.is_public_on_anime_page = true",
		"hfgm.visibility = 'public'",
		// Release-Hierarchie-JOINs (0035).
		"join release_versions rv on rv.id = ac.release_version_id",
		"join fansub_releases fr on fr.id = rv.release_id",
		"join episodes ep on ep.id = fr.episode_id",
		// Parametrisierter animeID-Filter (SQL-Injection-Mitigation).
		"where ac.anime_id = $1",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("erwartetes Query-Fragment %q in attachVersionBreakdowns", pattern)
		}
	}
}

// TestPublicAnimeContributionsVersionBreakdown_SortOrder verifiziert die D-07-Sortierung:
// zuerst Gruppe, dann Episode (NULL-safe), dann Version.
func TestPublicAnimeContributionsVersionBreakdown_SortOrder(t *testing.T) {
	content := readPublicVersionsSource(t, "anime_contributions_public_versions_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "order by ac.fansub_group_id, coalesce(ep.sort_index, 2147483647), ep.id, rv.version") {
		t.Fatalf("erwartete ORDER-BY-Klausel mit fansub_group_id, NULL-safe sort_index, ep.id, rv.version (D-07)")
	}
}

// TestPublicAnimeContributions_Level1FiltersVersionSpecific verifiziert, dass die
// Ebene-1-Query (GetPublicAnimeContributions) anime-weite Beitraege auf
// release_version_id IS NULL filtert (verhindert Doppelanzeige, Pitfall 2).
func TestPublicAnimeContributions_Level1FiltersVersionSpecific(t *testing.T) {
	content := readPublicVersionsSource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, "ac.release_version_id is null") {
		t.Fatalf("erwarteter Ebene-1-Filter 'ac.release_version_id IS NULL' in GetPublicAnimeContributions (Pitfall 2)")
	}
}

// TestPublicAnimeContributions_AttachVersionBreakdownsWired verifiziert, dass
// attachVersionBreakdowns nach attachHiddenCounts aufgerufen wird und
// attachHiddenCounts (gruppenweite Zaehlung) unveraendert bleibt.
func TestPublicAnimeContributions_AttachVersionBreakdownsWired(t *testing.T) {
	content := readPublicVersionsSource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	hiddenIdx := strings.Index(normalized, "r.attachhiddencounts(")
	versionIdx := strings.Index(normalized, "r.attachversionbreakdowns(")
	if hiddenIdx < 0 {
		t.Fatalf("attachHiddenCounts-Aufruf nicht gefunden (darf nicht entfernt werden)")
	}
	if versionIdx < 0 {
		t.Fatalf("attachVersionBreakdowns-Aufruf in GetPublicAnimeContributions fehlt")
	}
	if versionIdx < hiddenIdx {
		t.Fatalf("attachVersionBreakdowns muss NACH attachHiddenCounts aufgerufen werden")
	}
}

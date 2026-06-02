package repository

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// readReleaseLookupSource laedt eine Quelldatei relativ zur Test-Datei.
// Konsistent mit dem Source-Inspection-Muster der uebrigen Repository-Tests
// (DB-Integration ist via test_helpers.go als Skip gekennzeichnet).
func readReleaseLookupSource(t *testing.T, name string) string {
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

// TestReleaseVersionLookup_MethodsExist verifiziert, dass die beiden Lookup-Methoden
// am Receiver *AnimeContributionsRepository definiert sind (D-03 + Dropdown).
func TestReleaseVersionLookup_MethodsExist(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_release_lookup_repository.go")
	normalized := strings.ToLower(content)

	requiredMethods := []string{
		"func (r *animecontributionsrepository) groupparticipatesinreleaseversion(",
		"func (r *animecontributionsrepository) listgroupreleaseversionsforanime(",
	}
	for _, method := range requiredMethods {
		if !strings.Contains(normalized, method) {
			t.Fatalf("erwartete Methode %q in anime_contributions_release_lookup_repository.go", method)
		}
	}
}

// TestReleaseVersionLookup_ParticipationQueryIsParameterized verifiziert, dass der
// EXISTS-Guard parametrisiert ($1/$2) gegen release_version_groups laeuft (SQL-Injection-Mitigation).
func TestReleaseVersionLookup_ParticipationQueryIsParameterized(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_release_lookup_repository.go")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		"select exists(",
		"from release_version_groups",
		"where release_version_id = $1 and fansub_group_id = $2",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("erwartetes Query-Fragment %q in GroupParticipatesInReleaseVersion", pattern)
		}
	}
}

// TestReleaseVersionLookup_DropdownQueryShape verifiziert die JOIN-Kette und die
// NULL-sichere Episode-Sortierung des gruppen-gefilterten Dropdown-Lookups (D-07).
func TestReleaseVersionLookup_DropdownQueryShape(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_release_lookup_repository.go")
	normalized := strings.ToLower(content)

	requiredPatterns := []string{
		"from release_versions rv",
		"join release_version_groups rvg on rvg.release_version_id = rv.id",
		"join fansub_releases fr on fr.id = rv.release_id",
		"join episodes ep on ep.id = fr.episode_id",
		"where rvg.fansub_group_id = $1 and ep.anime_id = $2",
		"order by coalesce(ep.sort_index, 2147483647), ep.id, rv.version",
	}
	for _, pattern := range requiredPatterns {
		if !strings.Contains(normalized, pattern) {
			t.Fatalf("erwartetes Dropdown-Query-Fragment %q", pattern)
		}
	}
}

// TestReleaseVersionLookup_OptionStructJSONTags verifiziert die snake_case-JSON-Tags
// des GroupReleaseVersionOption-Structs (Spiegel zu den Frontend-Typen).
func TestReleaseVersionLookup_OptionStructJSONTags(t *testing.T) {
	content := readReleaseLookupSource(t, "anime_contributions_release_lookup_repository.go")
	normalized := strings.ToLower(content)

	requiredTags := []string{
		"type groupreleaseversionoption struct",
		`json:"release_version_id"`,
		`json:"episode_number"`,
		`json:"version"`,
	}
	for _, tag := range requiredTags {
		if !strings.Contains(normalized, tag) {
			t.Fatalf("erwartetes Struct-Fragment %q in GroupReleaseVersionOption", tag)
		}
	}
}

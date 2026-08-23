package repository

// D-29 (Phase 138 Plan 03): ListUserContributions muss die echte fachliche
// Version (release_versions.version) und die Episodennummer (episodes.episode_number)
// zusätzlich zur internen release_version_id ausliefern, damit die Beiträge-Tab-UI
// nie mehr eine interne DB-ID als "Version" rendert.
//
// Test-Konvention: admin_users_repository_test.go besitzt für diese Datei keinen
// echten Postgres-Testharness — die bestehenden Tests (z. B.
// TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst) sind reine
// Quell-Inspektionstests (os.ReadFile + strings.Contains). Dieser Test folgt
// exakt derselben, bereits etablierten Konvention statt einen neuen
// Postgres-Harness für einen eng gescopten Anzeige-Bugfix einzuführen
// (D-29 verbietet explizit, den Scope über die reine Anzeige-Korrektur hinaus
// zu erweitern).

import (
	"os"
	"strings"
	"testing"
)

func TestListUserContributions(t *testing.T) {
	source, err := os.ReadFile("admin_users_tab_repository.go")
	if err != nil {
		t.Fatalf("admin_users_tab_repository.go lesen: %v", err)
	}
	text := string(source)

	requiredSnippets := []string{
		// Die beiden neuen LEFT JOINs, additiv, damit Projekt-Standard-Beiträge
		// (release_version_id IS NULL) weiterhin Zeilen liefern.
		"LEFT JOIN release_versions rv ON rv.id = ac.release_version_id",
		"LEFT JOIN fansub_releases fr ON fr.id = rv.release_id",
		"LEFT JOIN episodes ep ON ep.id = fr.episode_id",
		// Die zwei neuen Select-Spalten.
		"rv.version",
		"ep.episode_number",
		// Beide neuen Spalten müssen in GROUP BY, sonst bricht die ARRAY_AGG-Aggregation.
		"GROUP BY ac.id, ac.member_id, fg.name, a.title, rv.version, ep.episode_number",
		// Scan-Ziele der zwei neuen nullable Felder.
		"&item.ReleaseVersionLabel",
		"&item.EpisodeNumber",
	}
	for _, snippet := range requiredSnippets {
		if !strings.Contains(text, snippet) {
			t.Fatalf("ListUserContributions enthält erwarteten SQL-/Mapping-Snippet nicht: %s", snippet)
		}
	}
}

func TestListUserContributions_ModelFieldsAreNullableStrings(t *testing.T) {
	// D-29: episodes.episode_number ist in der Datenbank TEXT (Migration 0002,
	// wie auch GroupReleaseVersionOption.EpisodeNumber in
	// anime_contributions_release_lookup_repository.go bereits belegt), daher
	// *string statt *int — Abweichung von der ursprünglichen Plan-Annahme,
	// dokumentiert als Rule-1-Bugfix in 138-03-SUMMARY.md.
	source, err := os.ReadFile("../models/admin_users.go")
	if err != nil {
		t.Fatalf("../models/admin_users.go lesen: %v", err)
	}
	text := string(source)

	requiredSnippets := []string{
		"ReleaseVersionLabel *string `json:\"release_version_label\"`",
		"EpisodeNumber       *string `json:\"episode_number\"`",
	}
	for _, snippet := range requiredSnippets {
		if !strings.Contains(text, snippet) {
			t.Fatalf("AdminContributionItem enthält erwartetes Feld nicht: %s", snippet)
		}
	}
}

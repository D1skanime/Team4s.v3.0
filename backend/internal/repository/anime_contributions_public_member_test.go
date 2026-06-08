package repository

import (
	"strings"
	"testing"
)

// TestPublicMemberContributionsGroupHistoryBranch: Source-Fragment-Test gegen
// anime_contributions_public_repository.go. Stellt sicher, dass GetPublicMemberContributions
// den 3. UNION-Branch (aktuelle App-Gruppenrollen, GAP-3/D-06) und die notes-Projektion (GAP-2/D-07)
// enthält. Die repository-Test-Suite hat keinen echten DB-Harness (siehe runtime_authority_test.go /
// member_claims_memorial_guard_test.go), daher Fragment-Stil — konsistent zum bestehenden Muster.
// Der Live-DB-Beleg (Member 3 / Ballelboy -> genau ein group_history-Eintrag) erfolgt in Plan 74-11.
func TestPublicMemberContributionsGroupHistoryBranch(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	// Pflicht-Fragmente: 3. Branch-Quelltabellen, group_history-Kontext, label_de-Fallback,
	// notes aus anime_contributions.note und member->app_user-Auflösung.
	requiredFragments := []string{
		"fansub_group_members",        // 3. Branch-Quelltabelle (aktuelle App-Gruppe)
		"fansub_group_member_roles",   // role-Quelle des 3. Branch
		"group_history",               // gemeinsamer Kontext-Wert
		"coalesce(rd.label_de",        // role-Label-Fallback (fansub_lead fehlt in role_definitions)
		"ac.note as notes",            // notes-Projektion im anime_contribution-Branch
		"resolved_user",               // member->app_user-Auflösungs-CTE
		"member_claims",               // verifizierter-claim-Pfad der Auflösung
		"legacy_user_id",              // members.user_id->app_users-Fallback der Auflösung
		"not exists",                  // Duplikat-Schutz gegen hist-Rollen
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(normalized, fragment) {
			t.Fatalf("anime_contributions_public_repository.go fehlt erwartetes Fragment %q — GAP-3 App-Gruppenrollen-Branch / notes-Projektion noch nicht implementiert", fragment)
		}
	}
}

// TestPublicMemberContributionsNotesField: stellt sicher, dass PublicMemberRoleEntry das
// notes-Feld trägt (Lock-K-Datenquelle für den Inline-Expand, GAP-2/D-07) und der Scan-Loop es liest.
func TestPublicMemberContributionsNotesField(t *testing.T) {
	content := readRepositorySource(t, "anime_contributions_public_repository.go")
	normalized := strings.ToLower(content)

	if !strings.Contains(normalized, `notes           *string`) {
		t.Fatalf("PublicMemberRoleEntry fehlt das Feld Notes *string — notes-Detaildaten (GAP-2) nicht implementiert")
	}
	if !strings.Contains(normalized, `json:"notes"`) {
		t.Fatalf("PublicMemberRoleEntry.Notes fehlt der json-Tag \"notes\" — Lock-K-Contract nicht erfüllt")
	}
	if !strings.Contains(content, "&e.Notes") {
		t.Fatalf("Scan-Loop liest &e.Notes nicht — notes-Spalte wird nicht eingelesen")
	}
}

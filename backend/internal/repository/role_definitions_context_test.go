package repository

// role_definitions_context_test.go — Nyquist RED-Phase (Plan 94-01)
//
// Dieser Test verankert die Verhaltensspezifikation für die geplante Repo-Methode
// ListGroupHistoryRoleDefinitions (wird in Plan 94-03 implementiert).
//
// Vorgehen (Wave-0-Repository-Test-Stil des Projekts):
//   - Funktional testbare Invarianten (ohne Live-DB) werden direkt getestet.
//   - Die Methoden-Signatur ist als Interface-Kommentar dokumentiert.
//   - Sobald die Methode existiert, laufen die Tests GREEN ohne Anpassung.
//
// Whitelist-Entscheidung (Pitfall 2 / RESEARCH Pattern 4):
//   Migration 0103 markiert App-Rollen zusätzlich mit group_history →
//   ein naives WHERE 'group_history' = ANY(contexts) liefert auch translator/encoder.
//   Die Whitelist begrenzt das Ergebnis auf die vier echten historischen Gruppenrollen.

import (
	"testing"

	"team4s.v3/backend/internal/permissions"
)

// GroupHistoryRoleWhitelist ist die verbindliche Liste der historischen Gruppenrollen.
// Entspricht dem Seed in database/migrations/0085_role_definitions_seed.up.sql
// und der Bereinigung aus 0112_role_model_cleanup (D-04/D-06/D-07):
// leader → fansub_lead, project_manager → project_lead, neu: techadmin, gfxler.
// KEINE Rollen aus permissions.FansubGroupRoles() dürfen enthalten sein (Pitfall 2).
var groupHistoryRoleWhitelist = []string{
	"founder",
	"fansub_lead",
	"co_leader",
	"project_lead",
	"techadmin",
	"gfxler",
}

// GroupHistoryRoleDefinition ist die erwartete DTO-Struktur der geplanten Repo-Methode.
// Signatur der Methode (wird in Plan 94-03 implementiert):
//
//	func (r *HistGroupMemberRolesRepository) ListGroupHistoryRoleDefinitions(ctx context.Context) ([]GroupHistoryRoleDefinition, error)
//
// Die Methode soll ausführen:
//
//	SELECT code, label_de, sort_order
//	FROM role_definitions
//	WHERE 'group_history' = ANY(contexts)
//	  AND code = ANY($whitelist)
//	ORDER BY sort_order, code
type GroupHistoryRoleDefinition struct {
	Code      string
	LabelDE   string
	SortOrder int
}

// TestRoleDefinitionsContextWhitelistOnly prüft die Whitelist-Invariante deterministisch:
//
//  1. Die Whitelist ist nicht leer.
//  2. Projekt-/Anime-Ebenen-Rollen (translator, encoder, …) sind NICHT in der Whitelist.
//     Nach Phase 95 (D-01/D-06) dürfen Gruppen-Rollen (fansub_lead, project_lead, techadmin,
//     gfxler) in beiden Listen erscheinen — das ist das Design-Ziel. Nur reine App-only-Rollen
//     (translator, editor, timer, …) dürfen NICHT im group_history-Read erscheinen.
//  3. Historisch-pure Codes (founder, co_leader) dürfen nicht im App-Katalog erscheinen.
//
// Behavior: Läuft ohne Live-DB und ist deterministisch.
func TestRoleDefinitionsContextWhitelistOnly(t *testing.T) {
	// (1) Whitelist ist nicht leer
	if len(groupHistoryRoleWhitelist) == 0 {
		t.Fatal("groupHistoryRoleWhitelist ist leer — Whitelist-Konstante muss mindestens einen Code enthalten")
	}

	appRoles := permissions.FansubGroupRoles()
	if len(appRoles) == 0 {
		t.Fatal("permissions.FansubGroupRoles() ist leer — Testvorbedingung verletzt")
	}

	// Projekt-/Anime-Rollen (nur App-Ebene): dürfen nie in der Whitelist erscheinen.
	// Nach D-01/D-02: translator, editor, timer, typesetter, encoder, raw_provider,
	// quality_checker, designer sind Projekt-Ebene — kein Historien-Kontext.
	projektRoles := map[string]bool{
		"translator":      true,
		"editor":          true,
		"timer":           true,
		"typesetter":      true,
		"encoder":         true,
		"raw_provider":    true,
		"quality_checker": true,
		"designer":        true,
	}

	whitelistSet := make(map[string]bool, len(groupHistoryRoleWhitelist))
	for _, code := range groupHistoryRoleWhitelist {
		whitelistSet[code] = true
	}

	// (2) Keine Projekt-Rollen in der Whitelist
	for projektRole := range projektRoles {
		if whitelistSet[projektRole] {
			t.Errorf("Projekt-Rolle %q ist fälschlicherweise in groupHistoryRoleWhitelist — "+
				"nur Gruppen-Ebenen-Rollen dürfen im group_history-Read erscheinen", projektRole)
		}
	}

	// (3) Historisch-pure Codes (founder, co_leader) nicht im App-Katalog
	historicalOnlyCodes := []string{"founder", "co_leader"}
	appRoleSet := make(map[string]bool, len(appRoles))
	for _, r := range appRoles {
		appRoleSet[r] = true
	}
	for _, histOnly := range historicalOnlyCodes {
		if appRoleSet[histOnly] {
			t.Errorf("Historisch-purer Code %q ist fälschlicherweise in permissions.FansubGroupRoles() — "+
				"founder/co_leader sind keine assignable App-Rollen", histOnly)
		}
	}

	// Zusammenfassung im Erfolgsfall
	t.Logf("Whitelist OK: %v (%d App-Rollen im Katalog)", groupHistoryRoleWhitelist, len(appRoles))
}

// TestRoleDefinitionsContextWhitelistExpectedCodes prüft, dass die Whitelist die vier
// erwarteten historischen Rollen aus dem 0085-Seed enthält und keine zusätzlichen.
// Dieser Test verhindert stilles Erweitern der Whitelist ohne explizite Review.
func TestRoleDefinitionsContextWhitelistExpectedCodes(t *testing.T) {
	// Nach Migration 0112: kanonische Codes (D-04/D-06/D-07)
	// leader → fansub_lead, project_manager → project_lead, neu: techadmin, gfxler
	expected := map[string]bool{
		"founder":    true,
		"fansub_lead": true,
		"co_leader":  true,
		"project_lead": true,
		"techadmin":  true,
		"gfxler":     true,
	}

	if len(groupHistoryRoleWhitelist) != len(expected) {
		t.Fatalf("erwartet %d Whitelist-Einträge, gefunden %d: %v",
			len(expected), len(groupHistoryRoleWhitelist), groupHistoryRoleWhitelist)
	}

	for _, code := range groupHistoryRoleWhitelist {
		if !expected[code] {
			t.Errorf("unerwarteter Code in Whitelist: %q — nur {founder, fansub_lead, co_leader, project_lead, techadmin, gfxler} erlaubt", code)
		}
	}
}

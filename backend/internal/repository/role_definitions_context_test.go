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
// (Schritt 3: contexts = group_history).
// KEINE Rollen aus permissions.FansubGroupRoles() dürfen enthalten sein (Pitfall 2).
var groupHistoryRoleWhitelist = []string{
	"founder",
	"leader",
	"co_leader",
	"project_manager",
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
//  2. Kein Code aus groupHistoryRoleWhitelist ist in permissions.FansubGroupRoles() enthalten
//     (Set-Schnitt == leer). Pitfall 2: Migration 0103 wäre ein stiller Fehler.
//  3. Kein Code aus permissions.FansubGroupRoles() soll von der geplanten Methode zurückgegeben
//     werden (Whitelist-Filter stellt sicher, dass translator/encoder nicht erscheinen).
//
// Behavior: Läuft ohne Live-DB und ist deterministisch.
// RED-Hinweis: Wenn ListGroupHistoryRoleDefinitions noch nicht existiert, kompiliert
// dieser Test trotzdem — er prüft nur die Whitelist-Konstante und deren Disjunktheit.
func TestRoleDefinitionsContextWhitelistOnly(t *testing.T) {
	// (1) Whitelist ist nicht leer
	if len(groupHistoryRoleWhitelist) == 0 {
		t.Fatal("groupHistoryRoleWhitelist ist leer — Whitelist-Konstante muss mindestens einen Code enthalten")
	}

	appRoles := permissions.FansubGroupRoles()
	if len(appRoles) == 0 {
		t.Fatal("permissions.FansubGroupRoles() ist leer — Testvorbedingung verletzt")
	}

	// Schnellzugriff: App-Rollen als Set
	appRoleSet := make(map[string]bool, len(appRoles))
	for _, r := range appRoles {
		appRoleSet[r] = true
	}

	// (2) Set-Schnitt: Whitelist ∩ FansubGroupRoles() == leer
	// Pitfall 2: Falls Migration 0103 historische Rollen fälschlicherweise in den App-Katalog
	// aufnimmt, würde dieser Test fehlschlagen — das ist die Schutzfunktion.
	for _, histCode := range groupHistoryRoleWhitelist {
		if appRoleSet[histCode] {
			t.Errorf("Whitelist-Code %q ist auch in permissions.FansubGroupRoles() enthalten — "+
				"Disjunktheit verletzt (Pitfall 2: Migration 0103 Drift)", histCode)
		}
	}

	// (3) Kein App-Rollen-Code darf in der Whitelist erscheinen.
	// Ergänzende Prüfung von der App-Rollen-Seite aus.
	whitelistSet := make(map[string]bool, len(groupHistoryRoleWhitelist))
	for _, code := range groupHistoryRoleWhitelist {
		whitelistSet[code] = true
	}
	for _, appRole := range appRoles {
		if whitelistSet[appRole] {
			t.Errorf("App-Rolle %q ist fälschlicherweise in groupHistoryRoleWhitelist — "+
				"aktive App-Rollen dürfen NICHT im group_history-Read erscheinen", appRole)
		}
	}

	// Zusammenfassung im Erfolgsfall
	t.Logf("Whitelist OK: %v (keine Überschneidung mit %d App-Rollen)", groupHistoryRoleWhitelist, len(appRoles))
}

// TestRoleDefinitionsContextWhitelistExpectedCodes prüft, dass die Whitelist die vier
// erwarteten historischen Rollen aus dem 0085-Seed enthält und keine zusätzlichen.
// Dieser Test verhindert stilles Erweitern der Whitelist ohne explizite Review.
func TestRoleDefinitionsContextWhitelistExpectedCodes(t *testing.T) {
	expected := map[string]bool{
		"founder":         true,
		"leader":          true,
		"co_leader":       true,
		"project_manager": true,
	}

	if len(groupHistoryRoleWhitelist) != len(expected) {
		t.Fatalf("erwartet %d Whitelist-Einträge, gefunden %d: %v",
			len(expected), len(groupHistoryRoleWhitelist), groupHistoryRoleWhitelist)
	}

	for _, code := range groupHistoryRoleWhitelist {
		if !expected[code] {
			t.Errorf("unerwarteter Code in Whitelist: %q — nur {founder, leader, co_leader, project_manager} erlaubt", code)
		}
	}
}

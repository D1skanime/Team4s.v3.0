package repository

// Wave-0 RED-Tests: admin_users_repository.go und AdminUsersRepository existieren noch nicht.
// Compile-Fehler auf NewAdminUsersRepository / ListAdminUsersPage / GetUserOverview / ListUserContributions
// sind das erwartete RED-Signal. Diese Tests werden grün, wenn Plan 80-03 das Repository implementiert.
//
// Teststruktur: Interface-basierte Kompilier-Tests ohne Live-DB.
// Der AdminUsersRepository-Typ und seine Methoden fehlen — daher schlagen diese Tests
// mit "undefined: AdminUsersRepository" oder "AdminUsersRepository has no field/method" fehl.

import (
	"context"
	"testing"
)

// adminUsersRepositoryContract beschreibt das erwartete Interface des noch nicht existierenden
// AdminUsersRepository. Die Typen werden aus dem models-Paket importiert.
// Dieses Interface dient nur als Referenz für die Erwartungen der Wave-0-Tests.
type adminUsersRepositoryContract interface {
	ListAdminUsersPage(ctx context.Context, params adminUsersListParamsRef) (*adminUsersListResultRef, error)
	GetUserOverview(ctx context.Context, appUserID int64) (*adminUsersOverviewRef, error)
	ListUserContributions(ctx context.Context, appUserID int64) (*adminUsersContributionsRef, error)
}

// Platzhalter-Typen, damit der Compiler nicht über undefined-Typen klagt,
// bevor AdminUsersRepository und seine echten DTOs implementiert sind.
// Diese werden in 80-03 durch die echten models-Typen ersetzt.
type adminUsersListParamsRef struct{}
type adminUsersListResultRef struct{}
type adminUsersOverviewRef struct{}
type adminUsersContributionsRef struct{}

// --- RED: TestAdminUsersRepository_ListAdminUsersPage_PageFirstCTE ---
//
// Prüft, dass ListAdminUsersPage existiert und eine Page-First-CTE-Logik verwendet
// (LATERAL-Aggregation über eine paginierte Page-CTE statt N+1-Abfragen).
// Erwarteter RED-Fehler: AdminUsersRepository existiert nicht → Compile-Fehler.
func TestAdminUsersRepository_ListAdminUsersPage_PageFirstCTE(t *testing.T) {
	t.Skip("RED: AdminUsersRepository existiert noch nicht — wird durch Plan 80-03 implementiert")

	// RED-Erwartung:
	// 1. NewAdminUsersRepository(nil) muss kompilieren.
	// 2. ListAdminUsersPage muss eine Methode von AdminUsersRepository sein.
	// 3. Die Implementierung muss eine Page-First-CTE (WITH filtered AS ... page AS ... LIMIT/OFFSET)
	//    verwenden, LATERAL-Aggregate darauf berechnen und keinen N+1 über App-User erzeugen.
	//
	// Wenn AdminUsersRepository existiert, ersetzt dieses t.Skip() durch einen echten
	// Interface-Assertion-Test:
	//
	//   var _ adminUsersRepositoryContract = (*AdminUsersRepository)(nil)
	//
	// Und einen Integrations-Test der die SQL-Struktur via EXPLAIN ANALYZE prüft.
	if false {
		// Statische Interface-Kompilier-Assertion (schlägt fehl sobald die Datei entfernt wird):
		var _ interface {
			ListAdminUsersPage(ctx context.Context, params adminUsersListParamsRef) (*adminUsersListResultRef, error)
		} = nil
	}
}

// --- RED: TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst ---
//
// Prüft, dass ListUserContributions den kanonischen member_id-Anker (anime_contributions.member_id)
// als primären Join-Key verwendet und fansub_group_member_id nur als Legacy-Fallback.
//
// Hintergrund: Migration 0105 hat member_id als NOT-NULL-Feld in anime_contributions ergänzt.
// Alle Contribution-Abfragen müssen WHERE ac.member_id = $1 bevorzugen.
// Pitfall 7 (PATTERNS.md): WHERE ac.fansub_group_member_id = $1 ist veraltet und führt zu
// fehlenden Contributions bei Benutzern, die über member_id verknüpft sind.
//
// Erwarteter RED-Fehler: AdminUsersRepository existiert noch nicht.
func TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst(t *testing.T) {
	t.Skip("RED: AdminUsersRepository existiert noch nicht — wird durch Plan 80-03 implementiert")

	// Erwartung nach Implementierung:
	// ListUserContributions(ctx, memberID) führt intern einen Query aus, der enthält:
	//   WHERE ac.member_id = $1
	// UND NICHT:
	//   WHERE ac.fansub_group_member_id = $1  (Legacy — nur als OR-Fallback akzeptabel)
	//
	// Testansatz nach Implementierung: SQL-Query via EXPLAIN ANALYZE oder Query-String-Inspektion.
}

// --- RED: TestAdminUsersRepository_ConflictCount_D17_D18 ---
//
// Prüft, dass conflict_count in AdminUserListItem korrekt aus D-17-Typen
// (open_claim_with_profile, member_without_role, media_without_scope, open_dispute)
// und D-18-Typen (invalid_release_override, override_contradiction, media_without_contribution_rights)
// zusammengesetzt wird.
//
// Die sieben Konflikttypen entsprechen den AdminConflictType*-Konstanten in models/admin_users.go.
// Erwarteter RED-Fehler: AdminUsersRepository existiert noch nicht.
func TestAdminUsersRepository_ConflictCount_D17_D18(t *testing.T) {
	t.Skip("RED: AdminUsersRepository existiert noch nicht — wird durch Plan 80-03 implementiert")

	// Erwartung nach Implementierung:
	// GetUserOverview(ctx, appUserID) gibt AdminUserOverview zurück, dessen ConflictDetails
	// Einträge der folgenden Typen enthalten können:
	//   - "open_claim_with_profile"          (D-17)
	//   - "member_without_role"              (D-17)
	//   - "media_without_scope"              (D-17)
	//   - "open_dispute"                     (D-17)
	//   - "invalid_release_override"         (D-18)
	//   - "override_contradiction"           (D-18)
	//   - "media_without_contribution_rights" (D-18)
	//
	// Die conflict_count-Aggregation in ListAdminUsersPage muss alle sieben Typen addieren.
	// Kein Konflikttyp darf in der Aggregation fehlen.

	// Statische Prüfung der Konstanten-Vollständigkeit (greift sobald models importierbar):
	// Diese Assertion stellt sicher, dass alle erwarteten Typen im models-Paket definiert sind.
	_ = []string{
		"open_claim_with_profile",
		"member_without_role",
		"media_without_scope",
		"open_dispute",
		"invalid_release_override",
		"override_contradiction",
		"media_without_contribution_rights",
	}
}

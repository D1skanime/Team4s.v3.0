package handlers

// fansub_hist_group_member_roles_handler_test.go — Auth-Gate-Tests + CR-01/WR-02 (Plan 94-03 / 95-03)
//
// Enthält:
//   - TestListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor:
//     Auth-Gate-Test (Plan 94-03) — CanForFansubGroup-Gate lehnt nicht-berechtigten Actor ab.
//   - TestCreateHistGroupMemberRoleWhitelistReject (CR-01/D-13, Plan 95-03):
//     Source-Inspection — CreateHistGroupMemberRole enthält IsGroupHistoryWhitelistRole statt
//     RoleCodeExistsForContext; kein DB-Aufruf für Role-Validierung.
//   - TestListHistGroupMemberRolesCrossGroupGuard (WR-02/D-14, Plan 95-03):
//     Source-Inspection — ListHistGroupMemberRoles enthält GetByID + FansubGroupID-Check
//     vor ListByMember.
//
// Kein Live-DB-Zugriff: Auth-Gate nutzt nil-Pool (wird im Deny-Pfad nicht erreicht).
// CR-01/WR-02 nutzen Source-Inspection analog zu fansub_group_history_handler_test.go —
// der Handler hält konkrete Repo-Typen (kein Interface), daher ist Source-Inspection
// die korrekte Teststrategie für Verhaltens-Invarianten.

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// TestListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor prüft, dass das
// CanForFansubGroup(ActionFansubGroupMembersView)-Gate des neuen Endpunkts einen
// nicht-berechtigten Actor mit HTTP 403 ablehnt.
//
// Aufbau:
//  1. Leerer Fake-Resolver (fansubMediaPermissionResolver{}) → keine Gruppenrollen →
//     CanForFansubGroup liefert Allowed=false.
//  2. Handler mit permissions.NewService(<leerer Resolver>); rolesRepo via
//     NewHistGroupMemberRolesRepository(nil) — wird im Deny-Pfad nie erreicht.
//  3. AuthIdentity mit AppUserID > 0, NICHT IsPlatformAdmin.
//  4. Assertion: recorder.Code == http.StatusForbidden.
func TestListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Leerer Resolver: keine Gruppenrollen → CanForFansubGroup denied
	resolver := fansubMediaPermissionResolver{}
	permSvc := permissions.NewService(resolver)

	// rolesRepo mit nil-Pool — wird im Deny-Pfad nicht erreicht
	handler := NewFansubHistGroupMemberRolesHandler(
		repository.NewHistGroupMemberRolesRepository(nil),
		nil,  // badgeService — nicht benötigt im Deny-Pfad
		permSvc,
		nil,  // auditLogRepo — nil-safe im Deny-Pfad (auditPermissionDenied prüft nil)
		nil,  // histMembersRepo — nicht benötigt im Deny-Pfad
	)

	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/fansubs/42/role-definitions", nil)
	c.Params = gin.Params{{Key: "id", Value: "42"}}

	// Nicht-berechtigter Actor: AppUserID > 0, kein Platform-Admin, keine Gruppenrollen
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:          1,
		AppUserID:       2,
		AppUserStatus:   "active",
		DisplayName:     "Nicht-Berechtigter",
		IsPlatformAdmin: false,
	})

	handler.ListGroupHistoryRoleDefinitions(c)

	if recorder.Code != http.StatusForbidden {
		t.Fatalf(
			"erwartete HTTP 403 Forbidden für nicht-berechtigten Actor, erhielt %d — Body: %s",
			recorder.Code, recorder.Body.String(),
		)
	}
}

// TestCreateHistGroupMemberRoleWhitelistReject (CR-01 / D-13, Plan 95-03)
//
// Source-Inspection-Test: prüft dass CreateHistGroupMemberRole die Whitelist-basierte
// Validierung (IsGroupHistoryWhitelistRole) verwendet statt der breiten DB-Abfrage
// (RoleCodeExistsForContext). Damit wird sichergestellt, dass App-Rollen-Codes wie
// 'translator' nicht als historische Gruppenrollen akzeptiert werden.
//
// Strategie: Source-Inspection analog zu fansub_group_history_handler_test.go.
// Der Handler hält *repository.HistGroupMemberRolesRepository als konkreten Typ —
// kein Interface-Mock möglich ohne architektonischen Refactor (Regel 4).
func TestCreateHistGroupMemberRoleWhitelistReject(t *testing.T) {
	const handlerFile = "fansub_hist_group_member_roles_handler.go"
	src := readSource(t, handlerFile)

	// CR-01: IsGroupHistoryWhitelistRole muss im Create-Handler vorhanden sein.
	if !strings.Contains(src, "IsGroupHistoryWhitelistRole") {
		t.Error("CreateHistGroupMemberRole: IsGroupHistoryWhitelistRole-Aufruf fehlt (CR-01/D-13 nicht umgesetzt)")
	}

	// CR-01: RoleCodeExistsForContext darf im Create-Pfad nicht mehr aufgerufen werden.
	// Die Methode darf im Repository verbleiben, aber der Handler-Aufruf muss entfernt sein.
	body := funcBody(t, src, "CreateHistGroupMemberRole")
	if strings.Contains(body, "RoleCodeExistsForContext") {
		t.Error("CreateHistGroupMemberRole: RoleCodeExistsForContext-Aufruf noch vorhanden — " +
			"muss durch IsGroupHistoryWhitelistRole ersetzt werden (CR-01/D-13)")
	}

	// CR-01: Bei ungültigem Role-Code muss 422 zurückgegeben werden.
	if !strings.Contains(body, "http.StatusUnprocessableEntity") {
		t.Error("CreateHistGroupMemberRole: HTTP 422 bei ungültigem role_code fehlt")
	}
}

// TestListHistGroupMemberRolesCrossGroupGuard (WR-02 / D-14, Plan 95-03)
//
// Source-Inspection-Test: prüft dass ListHistGroupMemberRoles den Cross-Group-Guard
// (GetByID + FansubGroupID-Vergleich) VOR dem ListByMember-Aufruf enthält.
// Ohne diesen Guard könnte ein Angreifer mit Zugriff auf Fansub A die hist-Rollen
// eines Mitglieds aus Fansub B lesen, indem er dessen member_id als Parameter übergibt.
func TestListHistGroupMemberRolesCrossGroupGuard(t *testing.T) {
	const handlerFile = "fansub_hist_group_member_roles_handler.go"
	src := readSource(t, handlerFile)

	body := funcBody(t, src, "ListHistGroupMemberRoles")

	// WR-02: GetByID-Aufruf (Cross-Group-Lookup) muss vorhanden sein.
	if !strings.Contains(body, "GetByID") {
		t.Error("ListHistGroupMemberRoles: GetByID-Aufruf fehlt (WR-02/D-14 nicht umgesetzt) — " +
			"Cross-Group-Guard ist nicht vorhanden")
	}

	// WR-02: FansubGroupID-Vergleich muss vorhanden sein.
	if !strings.Contains(body, "FansubGroupID != fansubID") {
		t.Error("ListHistGroupMemberRoles: FansubGroupID-Vergleich fehlt — " +
			"Cross-Group-Guard prüft Gruppen-Zugehörigkeit nicht")
	}

	// WR-02: GetByID muss VOR ListByMember stehen.
	getByIDIdx := strings.Index(body, "GetByID")
	listByMemberIdx := strings.Index(body, "ListByMember")
	if listByMemberIdx >= 0 && getByIDIdx >= listByMemberIdx {
		t.Error("ListHistGroupMemberRoles: GetByID-Guard steht NACH ListByMember — " +
			"Cross-Group-Check muss vor dem Datenabruf erfolgen (WR-02/D-14)")
	}

	// WR-02: 422 bei Cross-Group-Zugriff.
	if !strings.Contains(body, "http.StatusUnprocessableEntity") {
		t.Error("ListHistGroupMemberRoles: HTTP 422 bei Cross-Group-Zugriff fehlt (WR-02/D-14)")
	}
}

// TestCR01WR02AutoArchiveSourceInspection prüft D-10 auf Quell-Ebene:
// SetRole-Methode in fansub_group_app_members_repository.go muss einen
// hist_group_member_roles-INSERT im Enable=false-Pfad enthalten.
func TestCR01WR02AutoArchiveSourceInspection(t *testing.T) {
	const repoFile = "../../internal/repository/fansub_group_app_members_repository.go"
	src := readSource(t, repoFile)

	body := funcBody(t, src, "SetRole")

	// D-10: INSERT INTO hist_group_member_roles muss im SetRole-Body vorhanden sein.
	if !strings.Contains(body, "hist_group_member_roles") {
		t.Error("SetRole: INSERT INTO hist_group_member_roles fehlt — " +
			"Auto-Archivierung (D-10) ist nicht implementiert")
	}

	// D-10: ON CONFLICT DO NOTHING für Idempotenz.
	if !strings.Contains(body, "ON CONFLICT DO NOTHING") {
		t.Error("SetRole: ON CONFLICT DO NOTHING fehlt — " +
			"Doppel-Entzug würde Duplikate erzeugen (D-10)")
	}
}

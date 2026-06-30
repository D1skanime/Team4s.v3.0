package handlers

// fansub_hist_group_member_roles_handler_test.go — Auth-Gate-Test für Plan 94-03
//
// Dieser Test fixiert das CanForFansubGroup-Auth-Gate des neuen Read-Endpunkts
// GET /admin/fansubs/:id/role-definitions. Ein nicht-berechtigter Actor darf nur
// HTTP 403 (Forbidden) erhalten — kein 200 und kein 500.
//
// Kein Live-DB-Zugriff: rolesRepo wird mit nil-Pool konstruiert (wird im Deny-Pfad
// nicht erreicht, da der Gate-Check VOR dem Repo-Read greift).

import (
	"net/http"
	"net/http/httptest"
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

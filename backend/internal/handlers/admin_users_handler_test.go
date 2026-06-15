package handlers

// Wave-0 RED-Tests: admin_users_handler.go und AdminUsersHandler existieren noch nicht.
// Compile-Fehler auf NewAdminUsersHandler / AdminUsersHandler.ListUsers /
// AdminUsersHandler.AssignGlobalRole etc. sind das erwartete RED-Signal.
// Diese Tests werden grün, wenn Plan 80-03 den Handler implementiert.

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Stubs für AdminUsersHandler-Tests ---

// adminUsersRepoStub implementiert das (noch nicht existierende) AdminUsersRepository-Interface.
// Die Stub-Methoden entsprechen den erwarteten Methoden des echten Repositorys.
type adminUsersRepoStub struct {
	listResult          *models.AdminUserListResult
	listErr             error
	overviewResult      *models.AdminUserOverview
	overviewErr         error
	rolesResult         *models.AdminUserGlobalRolesResult
	rolesErr            error
	claimsResult        *models.AdminUserMemberClaimsResult
	claimsErr           error
	membershipsResult   *models.AdminUserGroupMembershipsResult
	membershipsErr      error
	groupRightsResult   *models.AdminUserGroupRightsResult
	groupRightsErr      error
	contributionsResult *models.AdminUserContributionsResult
	contributionsErr    error
	mediaResult         *models.AdminUserMediaResult
	mediaErr            error
	auditResult         *models.AdminUserAuditResult
	auditErr            error
	updateStatusErr     error
}

// Die folgenden Methoden entsprechen dem noch-nicht-existierenden AdminUsersRepository-Interface.
// Compile-Fehler: AdminUsersRepository in admin_users_handler.go ist noch nicht definiert.
// Die Stub-Typen hier KOMPILIEREN unabhängig davon, da sie an kein Interface gebunden sind.

func (s *adminUsersRepoStub) ListAdminUsersPage(ctx context.Context, params models.AdminUserListParams) (*models.AdminUserListResult, error) {
	return s.listResult, s.listErr
}

func (s *adminUsersRepoStub) GetUserOverview(ctx context.Context, appUserID int64) (*models.AdminUserOverview, error) {
	return s.overviewResult, s.overviewErr
}

func (s *adminUsersRepoStub) GetUserGlobalRoles(ctx context.Context, appUserID int64) (*models.AdminUserGlobalRolesResult, error) {
	return s.rolesResult, s.rolesErr
}

func (s *adminUsersRepoStub) GetUserMemberClaims(ctx context.Context, appUserID int64) (*models.AdminUserMemberClaimsResult, error) {
	return s.claimsResult, s.claimsErr
}

func (s *adminUsersRepoStub) GetUserGroupMemberships(ctx context.Context, appUserID int64) (*models.AdminUserGroupMembershipsResult, error) {
	return s.membershipsResult, s.membershipsErr
}

func (s *adminUsersRepoStub) GetUserGroupRights(ctx context.Context, appUserID int64) (*models.AdminUserGroupRightsResult, error) {
	return s.groupRightsResult, s.groupRightsErr
}

func (s *adminUsersRepoStub) ListUserContributions(ctx context.Context, appUserID int64) (*models.AdminUserContributionsResult, error) {
	return s.contributionsResult, s.contributionsErr
}

func (s *adminUsersRepoStub) GetUserMedia(ctx context.Context, appUserID int64) (*models.AdminUserMediaResult, error) {
	return s.mediaResult, s.mediaErr
}

func (s *adminUsersRepoStub) GetUserAudit(ctx context.Context, appUserID int64) (*models.AdminUserAuditResult, error) {
	return s.auditResult, s.auditErr
}

func (s *adminUsersRepoStub) UpdateAppUserStatus(ctx context.Context, appUserID int64, status string) error {
	return s.updateStatusErr
}

// adminAuthzRepoStub implementiert die authzRoleChecker-Funktionen für Platform-Admin-Gate-Tests.
// Die Methoden AppUserHasGlobalRole und CountActivePlatformAdmins sind bereits in authz.go vorhanden.
type adminAuthzRepoStub struct {
	isAdmin            bool
	authzErr           error
	activePlatformAdmins int
	countErr           error
}

func (s *adminAuthzRepoStub) AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error) {
	return s.isAdmin, s.authzErr
}

func (s *adminAuthzRepoStub) UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	return s.isAdmin, s.authzErr
}

func (s *adminAuthzRepoStub) CountActivePlatformAdmins(ctx context.Context) (int, error) {
	return s.activePlatformAdmins, s.countErr
}

func (s *adminAuthzRepoStub) AssignAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
	return nil
}

func (s *adminAuthzRepoStub) RevokeAppUserGlobalRole(ctx context.Context, appUserID int64, roleName string) error {
	return nil
}

// adminAuditStub fängt Write-Aufrufe ab, ohne etwas zu persistieren.
type adminAuditStub struct {
	entries []repository.AuditLogEntry
}

func (s *adminAuditStub) Write(ctx context.Context, entry repository.AuditLogEntry) error {
	s.entries = append(s.entries, entry)
	return nil
}

func (s *adminAuditStub) writeCount() int { return len(s.entries) }
func (s *adminAuditStub) lastEventType() string {
	if len(s.entries) == 0 {
		return ""
	}
	return s.entries[len(s.entries)-1].EventType
}
func (s *adminAuditStub) lastOutcome() string {
	if len(s.entries) == 0 {
		return ""
	}
	return s.entries[len(s.entries)-1].Outcome
}

// setAdminTestAuth setzt eine gültige AuthIdentity im Gin-Kontext (AppUserID > 0, Status active).
func setAdminTestAuth(c *gin.Context, appUserID int64) {
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:        appUserID,
		AppUserID:     appUserID,
		DisplayName:   "Testadmin",
		AppUserStatus: models.AppUserStatusActive,
	})
}

// buildAdminUsersHandler baut einen AdminUsersHandler mit Stubs.
// RED: NewAdminUsersHandler existiert noch nicht → Compile-Fehler erwartet.
func buildAdminUsersHandler(
	repo *adminUsersRepoStub,
	authz *adminAuthzRepoStub,
	audit *adminAuditStub,
) *AdminUsersHandler { // AdminUsersHandler ist noch nicht definiert → RED
	return NewAdminUsersHandler(repo, authz, audit) // NewAdminUsersHandler → RED
}

// --- RED: TestAdminUsersHandler_ListUsers_NonPlatformAdmin_Returns403 ---
//
// Prüft, dass ListUsers HTTP 403 zurückgibt, wenn der anfragende App-User
// keine platform_admin-Rolle hat.
// Sicherheitsanforderung: T-80-02-01 (Elevation of Privilege).
func TestAdminUsersHandler_ListUsers_NonPlatformAdmin_Returns403(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: false}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/admin/users", nil)
	setAdminTestAuth(c, 99)

	handler.ListUsers(c) // ListUsers ist noch nicht definiert → RED

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet HTTP 403, erhalten %d", rec.Code)
	}
}

// --- RED: TestAdminUsersHandler_AssignGlobalRole_AuditsAllowed ---
//
// Prüft, dass AssignGlobalRole bei einem berechtigten Platform-Admin
// einen AuditLogEntry mit EventType="app_user_global_role.assigned" und Outcome="allowed" schreibt.
func TestAdminUsersHandler_AssignGlobalRole_AuditsAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 2}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	body, _ := json.Marshal(map[string]string{"role": "content_admin"})
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/5/global-roles/content_admin", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "userId", Value: "5"}, {Key: "role", Value: "content_admin"}}
	setAdminTestAuth(c, 1)

	handler.AssignGlobalRole(c) // AssignGlobalRole ist noch nicht definiert → RED

	if rec.Code != http.StatusOK && rec.Code != http.StatusNoContent {
		t.Fatalf("erwartet HTTP 200 oder 204, erhalten %d", rec.Code)
	}
	if audit.writeCount() == 0 {
		t.Fatal("erwartet mindestens einen Audit-Eintrag, keiner vorhanden")
	}
	if audit.lastEventType() != "app_user_global_role.assigned" {
		t.Fatalf("erwartet EventType %q, erhalten %q", "app_user_global_role.assigned", audit.lastEventType())
	}
	if audit.lastOutcome() != "allowed" {
		t.Fatalf("erwartet Outcome %q, erhalten %q", "allowed", audit.lastOutcome())
	}
}

// --- RED: TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409 ---
//
// Prüft, dass RevokeGlobalRole HTTP 409 zurückgibt, wenn CountActivePlatformAdmins = 1
// und damit die letzte Plattform-Admin-Rolle entzogen würde.
// Sicherheitsanforderung: T-80-02-02 (Denial of Service — Lockout).
// Kein Audit-Write bei Ablehnung.
func TestAdminUsersHandler_RevokeGlobalRole_LastAdminGuard_Returns409(t *testing.T) {
	gin.SetMode(gin.TestMode)

	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 1}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodDelete, "/api/v1/admin/users/1/global-roles/platform_admin", nil)
	c.Params = gin.Params{{Key: "userId", Value: "1"}, {Key: "role", Value: "platform_admin"}}
	setAdminTestAuth(c, 2)

	handler.RevokeGlobalRole(c) // RevokeGlobalRole ist noch nicht definiert → RED

	if rec.Code != http.StatusConflict {
		t.Fatalf("erwartet HTTP 409, erhalten %d (Last-Admin-Guard hat nicht gegriffen)", rec.Code)
	}
	if audit.writeCount() != 0 {
		t.Fatalf("erwartet keinen Audit-Eintrag bei Ablehnung, aber %d Einträge vorhanden", audit.writeCount())
	}
}

// --- RED: TestAdminUsersHandler_UpdateUserStatus_Disable_AuditsAllowed ---
//
// Prüft, dass UpdateUserStatus bei Status "disabled" einen AuditLogEntry
// mit EventType="app_user_status.disabled" schreibt.
func TestAdminUsersHandler_UpdateUserStatus_Disable_AuditsAllowed(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Ziel-User hat keine platform_admin-Rolle → kein Last-Admin-Guard
	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 2}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	body, _ := json.Marshal(map[string]string{"status": "disabled"})
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/7/status", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Params = gin.Params{{Key: "userId", Value: "7"}}
	setAdminTestAuth(c, 1)

	handler.UpdateUserStatus(c) // UpdateUserStatus ist noch nicht definiert → RED

	if rec.Code != http.StatusOK && rec.Code != http.StatusNoContent {
		t.Fatalf("erwartet HTTP 200 oder 204, erhalten %d", rec.Code)
	}
	if audit.writeCount() == 0 {
		t.Fatal("erwartet mindestens einen Audit-Eintrag, keiner vorhanden")
	}
	if audit.lastEventType() != "app_user_status.disabled" {
		t.Fatalf("erwartet EventType %q, erhalten %q", "app_user_status.disabled", audit.lastEventType())
	}
	if audit.lastOutcome() != "allowed" {
		t.Fatalf("erwartet Outcome %q, erhalten %q", "allowed", audit.lastOutcome())
	}
}

// --- RED: TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409 ---
//
// Prüft, dass UpdateUserStatus mit status="disabled" HTTP 409 zurückgibt, wenn
// CountActivePlatformAdmins = 1 und der Ziel-User die platform_admin-Rolle hat.
// Lockout-Schutz: Der letzte aktive Platform-Admin darf nicht deaktiviert werden.
// Sicherheitsanforderung: T-80-02-03 (Denial of Service — Disable-Lockout).
// Kein Audit-Write bei Ablehnung (analog zu RevokeGlobalRole-LastAdminGuard).
func TestAdminUsersHandler_UpdateUserStatus_Disable_LastAdminGuard_Returns409(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// CountActivePlatformAdmins = 1: genau ein aktiver Platform-Admin
	// AppUserHasGlobalRole für Ziel-User (userId=1) gibt true zurück
	authz := &adminAuthzRepoStub{isAdmin: true, activePlatformAdmins: 1}
	audit := &adminAuditStub{}
	handler := buildAdminUsersHandler(&adminUsersRepoStub{}, authz, audit)

	// Request: Ziel-User ist der letzte aktive Platform-Admin
	body, _ := json.Marshal(map[string]string{"status": "disabled"})
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/v1/admin/users/1/status", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")
	// userId=1 ist Ziel-User; Actor (Aufrufer) kann ein anderer Admin sein
	c.Params = gin.Params{{Key: "userId", Value: "1"}}
	setAdminTestAuth(c, 2)

	handler.UpdateUserStatus(c) // UpdateUserStatus ist noch nicht definiert → RED

	if rec.Code != http.StatusConflict {
		t.Fatalf("erwartet HTTP 409 (Last-Admin-Guard), erhalten %d", rec.Code)
	}
	if audit.writeCount() != 0 {
		t.Fatalf("erwartet keinen Audit-Eintrag bei Ablehnung, aber %d Einträge vorhanden", audit.writeCount())
	}
}

package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Test-Doubles (Struct-Literale, kein Mock-Framework) ---

// stubCapabilityAuthzRepo implementiert die für requirePlatformAdminIdentity nötigen Methoden
// sowie die Capability-Mutation-Methoden.
type stubCapabilityAuthzRepo struct {
	isPlatformAdmin       bool
	countRolesWithAction  int64
	countErr              error
	grantErr              error
	revokeErr             error
	matrixRoles           []repository.CapabilityMatrixRoleEntry
}

func (s *stubCapabilityAuthzRepo) AppUserHasGlobalRole(_ context.Context, _ int64, _ string) (bool, error) {
	return s.isPlatformAdmin, nil
}

func (s *stubCapabilityAuthzRepo) UserHasRole(_ context.Context, _ int64, _ string) (bool, error) {
	return false, nil
}

func (s *stubCapabilityAuthzRepo) ListCapabilityMatrix(_ context.Context) (*repository.CapabilityMatrix, error) {
	roles := s.matrixRoles
	if roles == nil {
		roles = []repository.CapabilityMatrixRoleEntry{}
	}
	return &repository.CapabilityMatrix{
		Roles:      roles,
		AllActions: []repository.CapabilityMatrixActionEntry{},
	}, nil
}

func (s *stubCapabilityAuthzRepo) GrantRoleCapability(_ context.Context, _, _ string) error {
	return s.grantErr
}

func (s *stubCapabilityAuthzRepo) RevokeRoleCapability(_ context.Context, _, _ string) error {
	return s.revokeErr
}

func (s *stubCapabilityAuthzRepo) CountRolesWithAction(_ context.Context, _ string) (int64, error) {
	return s.countRolesWithAction, s.countErr
}

func (s *stubCapabilityAuthzRepo) LoadRoleCapabilities(_ context.Context) (map[string][]permissions.Action, error) {
	return nil, nil
}

// stubCapabilityPermissionSvc ist ein minimaler PermissionSvc-Stub für Tests.
// ReloadCache wird nur aufgerufen wenn die DB-Mutation erfolgreich war.
type stubCapabilityPermissionSvc struct {
	reloadErr error
	reloaded  bool
}

func (s *stubCapabilityPermissionSvc) ReloadCache(_ context.Context, _ permissions.CacheLoader) error {
	s.reloaded = true
	return s.reloadErr
}

// captureAuditLogRepo fängt alle geschriebenen Audit-Einträge.
type captureAuditLogRepo struct {
	entries []repository.AuditLogEntry
}

func (r *captureAuditLogRepo) Write(_ context.Context, entry repository.AuditLogEntry) error {
	r.entries = append(r.entries, entry)
	return nil
}

// makeCapabilityTestContext erstellt einen Gin-Kontext mit einer AuthIdentity.
func makeCapabilityTestContext(method, path string, identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(method, path, nil)
	c.Set("auth_identity", identity)
	return c, rec
}

// --- Tests ---

// TestGrantCapabilityRequiresPlatformAdmin prüft, dass PUT /api/v1/admin/role-capabilities/{roleCode}/{actionCode}
// einen nicht-platform-admin Benutzer mit 403 ablehnt.
func TestGrantCapabilityRequiresPlatformAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Nicht-Admin-Identity im Context setzen
	c, rec := makeCapabilityTestContext(http.MethodPut, "/admin/role-capabilities/fansub_lead/release.view",
		middleware.AuthIdentity{
			UserID:        42,
			AppUserID:     42,
			AppUserStatus: models.AppUserStatusActive,
			DisplayName:   "Non-Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: "fansub_lead"},
		{Key: "actionCode", Value: "release.view"},
	}

	// authzRepo-Stub der AppUserHasGlobalRole=false zurückgibt
	authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: false}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.GrantCapability(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet 403, erhalten %d", rec.Code)
	}
	// Kein Audit bei Ablehnung
	if len(auditStub.entries) != 0 {
		t.Fatalf("kein Audit-Eintrag bei 403 erwartet, erhalten %d", len(auditStub.entries))
	}
}

// TestRevokeCapabilityLastActionGuard prüft, dass DELETE /api/v1/admin/role-capabilities/{roleCode}/{actionCode}
// den Last-Action-Guard auslöst (HTTP 409) wenn die letzte Capability einer Rolle entzogen werden würde.
func TestRevokeCapabilityLastActionGuard(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, rec := makeCapabilityTestContext(http.MethodDelete, "/admin/role-capabilities/fansub_lead/release.view",
		middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: "fansub_lead"},
		{Key: "actionCode", Value: "release.view"},
	}

	// CountRolesWithAction gibt 1 zurück → Lockout-Guard soll 409 auslösen
	// permissions.IsStandaloneAction("release.view") = false
	authzStub := &stubCapabilityAuthzRepo{
		isPlatformAdmin:      true,
		countRolesWithAction: 1,
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.RevokeCapability(c)

	if rec.Code != http.StatusConflict {
		t.Fatalf("erwartet 409, erhalten %d (body: %s)", rec.Code, rec.Body.String())
	}

	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body parsen fehlgeschlagen: %v", err)
	}
	if body.Error.Code != "lockout_guard" {
		t.Fatalf("erwartet error.code='lockout_guard', erhalten %q", body.Error.Code)
	}
	// Kein Audit bei Lockout-Ablehnung
	if len(auditStub.entries) != 0 {
		t.Fatalf("kein Audit-Eintrag bei 409 erwartet, erhalten %d", len(auditStub.entries))
	}
}

// --- AssignableGuard-Tests (Nyquist RED — Guard existiert noch nicht in Plan 01) ---

// TestGrantCapabilityAssignableGuardRejectsHistoricalRole prüft, dass GrantCapability
// mit einer nicht capability-tragenden Rolle HTTP 422 und "role_not_capability_bearing"
// zurückgibt (G4: nur rein historische Rollen ohne aktiven Kontext werden abgelehnt).
func TestGrantCapabilityAssignableGuardRejectsHistoricalRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Negativ-Rolle: nicht im Capability-Katalog des Test-Stubs → nicht capability-tragend.
	historicalRole := "founder"
	if permissions.IsCapabilityBearingRole(historicalRole) {
		t.Fatalf("Testvorbedingung verletzt: %q sollte keine capability-tragende Rolle sein", historicalRole)
	}

	c, rec := makeCapabilityTestContext(http.MethodPut,
		"/admin/role-capabilities/"+historicalRole+"/release.view",
		middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: historicalRole},
		{Key: "actionCode", Value: "release.view"},
	}

	authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.GrantCapability(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("erwartet HTTP 422 für historische Rolle %q, erhalten %d (body: %s)",
			historicalRole, rec.Code, rec.Body.String())
	}

	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body parsen fehlgeschlagen: %v", err)
	}
	if body.Error.Code != "role_not_capability_bearing" {
		t.Fatalf("erwartet error.code='role_not_capability_bearing', erhalten %q", body.Error.Code)
	}
}

// TestRevokeCapabilityAssignableGuardRejectsHistoricalRole prüft, dass RevokeCapability
// mit einer nicht capability-tragenden Rolle HTTP 422 und "role_not_capability_bearing"
// zurückgibt. Der Guard muss in BEIDEN Mutationspfaden vorhanden sein (Pitfall 4).
func TestRevokeCapabilityAssignableGuardRejectsHistoricalRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Negativ-Rolle: nicht im Capability-Katalog des Test-Stubs → nicht capability-tragend.
	historicalRole := "co_leader"
	if permissions.IsCapabilityBearingRole(historicalRole) {
		t.Fatalf("Testvorbedingung verletzt: %q sollte keine capability-tragende Rolle sein", historicalRole)
	}

	c, rec := makeCapabilityTestContext(http.MethodDelete,
		"/admin/role-capabilities/"+historicalRole+"/release.view",
		middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: historicalRole},
		{Key: "actionCode", Value: "release.view"},
	}

	// CountRolesWithAction > 1 → Lockout-Guard greift nicht → AssignableGuard soll zuerst feuern.
	authzStub := &stubCapabilityAuthzRepo{
		isPlatformAdmin:      true,
		countRolesWithAction: 5,
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.RevokeCapability(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("erwartet HTTP 422 für historische Rolle %q, erhalten %d (body: %s)",
			historicalRole, rec.Code, rec.Body.String())
	}

	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body parsen fehlgeschlagen: %v", err)
	}
	if body.Error.Code != "role_not_capability_bearing" {
		t.Fatalf("erwartet error.code='role_not_capability_bearing', erhalten %q", body.Error.Code)
	}
}

// TestGrantCapabilityAssignableGuardAllowsAppRole prüft, dass GrantCapability
// mit einer zuweisbaren App-Rolle (erstes Element aus FansubGroupRoles) NICHT 422 liefert.
// RED (Erwartung Guard noch nicht implementiert): dieser Test ist GRÜN, weil der Guard
// fehlt und die assignable Rolle daher durchgelassen wird.
// Sobald der Guard implementiert ist, bleibt dieser Test grün (erwünschtes Verhalten).
func TestGrantCapabilityAssignableGuardAllowsAppRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Positiv-Rolle: erstes Element aus FansubGroupRoles() ist immer assignable.
	appRoles := permissions.FansubGroupRoles()
	if len(appRoles) == 0 {
		t.Fatal("FansubGroupRoles() ist leer — Testvorbedingung verletzt")
	}
	assignableRole := appRoles[0]
	if !permissions.IsKnownFansubGroupRole(assignableRole) {
		t.Fatalf("Testvorbedingung verletzt: %q sollte eine bekannte Fansub-Gruppenrolle sein", assignableRole)
	}

	c, rec := makeCapabilityTestContext(http.MethodPut,
		"/admin/role-capabilities/"+assignableRole+"/release.view",
		middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: assignableRole},
		{Key: "actionCode", Value: "release.view"},
	}

	// grantErr = nil → GrantRoleCapability erfolgreich
	authzStub := &stubCapabilityAuthzRepo{
		isPlatformAdmin: true,
		grantErr:        nil,
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.GrantCapability(c)

	// Guard darf NICHT 422 auslösen für eine assignable Rolle.
	if rec.Code == http.StatusUnprocessableEntity {
		t.Fatalf("AssignableGuard hat fälschlicherweise 422 für assignable Rolle %q ausgelöst (body: %s)",
			assignableRole, rec.Body.String())
	}
}

// TestListCapabilityMatrixAssignableEnrichment prüft, dass der ListCapabilityMatrix-Handler
// jede RoleEntry mit dem Feld assignable=true (App-Rolle) bzw. assignable=false (historische Rolle) anreichert.
// RED: Die Anreicherung existiert noch nicht → assignable-Feld fehlt oder ist immer false/true im JSON.
// Erwartungsorakel: permissions.IsKnownFansubGroupRole (keine hartkodierten Rollenlisten).
func TestListCapabilityMatrixAssignableEnrichment(t *testing.T) {
	gin.SetMode(gin.TestMode)

	appRoles := permissions.FansubGroupRoles()
	if len(appRoles) == 0 {
		t.Fatal("FansubGroupRoles() ist leer — Testvorbedingung verletzt")
	}
	appRole := appRoles[0]     // z.B. "fansub_lead" — assignable=true erwartet
	histRole := "founder"      // nicht im Katalog — assignable=false erwartet

	if permissions.IsKnownFansubGroupRole(histRole) {
		t.Fatalf("Testvorbedingung verletzt: %q sollte keine bekannte Fansub-Gruppenrolle sein", histRole)
	}

	// Stub-Matrix mit je einer App-Rolle und einer historischen Rolle
	stubRoles := []repository.CapabilityMatrixRoleEntry{
		{RoleCode: appRole, LabelDE: "App-Rolle Test", Actions: []repository.CapabilityMatrixActionState{}},
		{RoleCode: histRole, LabelDE: "Historische Rolle Test", Actions: []repository.CapabilityMatrixActionState{}},
	}

	c, rec := makeCapabilityTestContext(http.MethodGet, "/admin/role-capabilities",
		middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})

	authzStub := &stubCapabilityAuthzRepo{
		isPlatformAdmin: true,
		matrixRoles:     stubRoles,
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.ListCapabilityMatrix(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
	}

	// JSON-Response parsen: Roles-Array mit assignable-Feld prüfen
	var response struct {
		Roles []struct {
			RoleCode   string `json:"role_code"`
			Assignable *bool  `json:"assignable"`
		} `json:"roles"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("response body parsen fehlgeschlagen: %v\nbody: %s", err, rec.Body.String())
	}

	if len(response.Roles) != 2 {
		t.Fatalf("erwartet 2 Rollen im Response, erhalten %d", len(response.Roles))
	}

	for _, role := range response.Roles {
		expectedAssignable := permissions.IsKnownFansubGroupRole(role.RoleCode)

		if role.Assignable == nil {
			t.Fatalf("Rolle %q: assignable-Feld fehlt im JSON-Response (Anreicherung nicht implementiert)", role.RoleCode)
		}
		if *role.Assignable != expectedAssignable {
			t.Fatalf("Rolle %q: erwartet assignable=%v (laut permissions.IsKnownFansubGroupRole), erhalten %v",
				role.RoleCode, expectedAssignable, *role.Assignable)
		}
	}
}

// TestCapabilityAuditOnGrant prüft, dass nach einem erfolgreichen Grant-Aufruf
// ein Audit-Log-Eintrag mit EventType "role_capability.granted" erzeugt wurde.
func TestCapabilityAuditOnGrant(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, rec := makeCapabilityTestContext(http.MethodPut, "/admin/role-capabilities/fansub_lead/release.view",
		middleware.AuthIdentity{
			UserID:          7,
			AppUserID:       7,
			AppUserStatus:   models.AppUserStatusActive,
			IsPlatformAdmin: true,
			DisplayName:     "Admin",
		})
	c.Params = gin.Params{
		{Key: "roleCode", Value: "fansub_lead"},
		{Key: "actionCode", Value: "release.view"},
	}

	authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.GrantCapability(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
	}
	if len(auditStub.entries) != 1 {
		t.Fatalf("erwartet 1 Audit-Eintrag, erhalten %d", len(auditStub.entries))
	}
	entry := auditStub.entries[0]
	if entry.EventType != "role_capability.granted" {
		t.Fatalf("erwartet EventType='role_capability.granted', erhalten %q", entry.EventType)
	}
	if entry.ActorAppUserID == nil || *entry.ActorAppUserID != 7 {
		t.Fatalf("erwartet ActorAppUserID=7, erhalten %v", entry.ActorAppUserID)
	}
	payload := entry.Payload
	if payload["role_code"] != "fansub_lead" {
		t.Fatalf("erwartet payload.role_code='fansub_lead', erhalten %v", payload["role_code"])
	}
	if payload["action_code"] != "release.view" {
		t.Fatalf("erwartet payload.action_code='release.view', erhalten %v", payload["action_code"])
	}
}


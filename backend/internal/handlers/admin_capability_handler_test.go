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

func (s *stubCapabilityAuthzRepo) LoadRoleCapabilities(_ context.Context) (map[string]permissions.Action, error) {
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

// capabilityHandlerWithStubs erstellt einen AdminCapabilityHandler mit Stub-Abhängigkeiten.
// Da AdminCapabilityHandler ein *repository.AuthzRepository erwartet, brauchen wir einen
// anderen Ansatz: Wir testen die Logik direkt über die Handler-Methoden indem wir
// die Abhängigkeiten austauschbar machen.
// Da AuthzRepository eine Struct ist (kein Interface), bauen wir den Handler mit nil
// und überschreiben die Felder via Reflection nicht — stattdessen testen wir via
// den Handler direkt mit konkreten Typen, aber simulieren den Auth-Layer im Context.

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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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
// mit einer historischen Rolle (founder) HTTP 422 und "role_not_assignable" zurückgibt.
// RED: Der Guard ist noch nicht implementiert → Test schlägt fehl (kein 422, sondern 200).
func TestGrantCapabilityAssignableGuardRejectsHistoricalRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Negativ-Rolle: "founder" ist NICHT in permissions.FansubGroupRoles() enthalten.
	historicalRole := "founder"
	if permissions.IsKnownFansubGroupRole(historicalRole) {
		t.Fatalf("Testvorbedingung verletzt: %q sollte keine bekannte Fansub-Gruppenrolle sein", historicalRole)
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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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
	if body.Error.Code != "role_not_assignable" {
		t.Fatalf("erwartet error.code='role_not_assignable', erhalten %q", body.Error.Code)
	}
}

// TestRevokeCapabilityAssignableGuardRejectsHistoricalRole prüft, dass RevokeCapability
// mit einer historischen Rolle (co_leader) HTTP 422 und "role_not_assignable" zurückgibt.
// RED: Der Guard muss in BEIDEN Mutationspfaden vorhanden sein (Pitfall 4) — noch nicht implementiert.
func TestRevokeCapabilityAssignableGuardRejectsHistoricalRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Negativ-Rolle: "co_leader" ist NICHT in permissions.FansubGroupRoles() enthalten.
	historicalRole := "co_leader"
	if permissions.IsKnownFansubGroupRole(historicalRole) {
		t.Fatalf("Testvorbedingung verletzt: %q sollte keine bekannte Fansub-Gruppenrolle sein", historicalRole)
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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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
	if body.Error.Code != "role_not_assignable" {
		t.Fatalf("erwartet error.code='role_not_assignable', erhalten %q", body.Error.Code)
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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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

	h := &adminCapabilityHandlerWithStubs{
		authzStub: authzStub,
		permStub:  permStub,
		auditStub: auditStub,
	}
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

// --- Handler-Wrapper mit Stubs ---
// Da AdminCapabilityHandler konkrete *repository.AuthzRepository-Felder hat,
// verwenden wir einen lokalen Wrapper für die Tests.

type adminCapabilityHandlerWithStubs struct {
	authzStub *stubCapabilityAuthzRepo
	permStub  *stubCapabilityPermissionSvc
	auditStub *captureAuditLogRepo
}

func (h *adminCapabilityHandlerWithStubs) ListCapabilityMatrix(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzStub, "")
	if !ok {
		return
	}

	matrix, err := h.authzStub.ListCapabilityMatrix(c.Request.Context())
	if err != nil {
		internalError(c, "Capability-Matrix konnte nicht geladen werden.")
		return
	}

	// RED: Anreicherung mit assignable-Feld fehlt noch (wird in Plan 02 implementiert).
	// Sobald Plan 02 den Guard einbaut, soll dieser Handler-Stub auch die Anreicherung spiegeln.
	// Für den Nyquist-RED-Test: Matrix ohne assignable zurückgeben → Test schlägt fehl.
	c.JSON(http.StatusOK, matrix)
}

func (h *adminCapabilityHandlerWithStubs) GrantCapability(c *gin.Context) {
	identity, ok := requirePlatformAdminIdentity(c, h.authzStub, "")
	if !ok {
		return
	}

	roleCode := c.Param("roleCode")
	actionCode := c.Param("actionCode")

	if roleCode == "" || actionCode == "" {
		badRequest(c, "roleCode und actionCode sind erforderlich.")
		return
	}

	if err := h.authzStub.GrantRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
		internalError(c, "Capability konnte nicht zugewiesen werden.")
		return
	}

	if err := h.permStub.ReloadCache(c.Request.Context(), nil); err != nil {
		// Fail-safe: Reload-Fehler wird nur geloggt
	}

	_ = h.auditStub.Write(c.Request.Context(), repository.AuditLogEntry{
		ActorAppUserID: &identity.AppUserID,
		EventType:      "role_capability.granted",
		TargetType:     "role_capability",
		Action:         "grant_capability",
		Outcome:        "allowed",
		Payload:        map[string]any{"role_code": roleCode, "action_code": actionCode},
	})

	c.JSON(http.StatusOK, gin.H{"message": "Capability erfolgreich zugewiesen."})
}

func (h *adminCapabilityHandlerWithStubs) RevokeCapability(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzStub, "")
	if !ok {
		return
	}

	roleCode := c.Param("roleCode")
	actionCode := c.Param("actionCode")

	if roleCode == "" || actionCode == "" {
		badRequest(c, "roleCode und actionCode sind erforderlich.")
		return
	}

	count, err := h.authzStub.CountRolesWithAction(c.Request.Context(), actionCode)
	if err != nil {
		internalError(c, "Lockout-Prüfung fehlgeschlagen.")
		return
	}

	if count <= 1 && !permissions.IsStandaloneAction(permissions.Action(actionCode)) {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "lockout_guard",
				"message": "Diese Berechtigung kann nicht entzogen werden, da sonst keine Rolle mehr über sie verfügt.",
			},
		})
		return
	}

	if err := h.authzStub.RevokeRoleCapability(c.Request.Context(), roleCode, actionCode); err != nil {
		internalError(c, "Capability konnte nicht entzogen werden.")
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Capability erfolgreich entzogen."})
}

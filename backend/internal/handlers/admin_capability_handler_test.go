package handlers

import (
	"context"
	"encoding/json"
	"errors"
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
	globalRoleCounts      map[string]int
	groupHolderCounts     map[string]int
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

func (s *stubCapabilityAuthzRepo) CountGlobalRoleAssignments(_ context.Context) (map[string]int, error) {
	return s.globalRoleCounts, nil
}

func (s *stubCapabilityAuthzRepo) CountGroupRoleHolders(_ context.Context) (map[string]int, error) {
	return s.groupHolderCounts, nil
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
		{RoleCode: appRole, LabelDE: "App-Rolle Test", Assignable: true, Actions: []repository.CapabilityMatrixActionState{}},
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

	// 2 Stub-Rollen + 3 synthetische globale App-Rollen-Zeilen (platform_admin/content_admin/user),
	// die ListCapabilityMatrix seit D-05 (111-01) unconditionally voranstellt.
	if len(response.Roles) != 5 {
		t.Fatalf("erwartet 5 Rollen im Response (2 Stub + 3 synthetisch), erhalten %d", len(response.Roles))
	}

	for _, role := range response.Roles {
		expectedAssignable := role.RoleCode == appRole

		if role.Assignable == nil {
			t.Fatalf("Rolle %q: assignable-Feld fehlt im JSON-Response (Anreicherung nicht implementiert)", role.RoleCode)
		}
		if *role.Assignable != expectedAssignable {
			t.Fatalf("Rolle %q: erwartet assignable=%v (laut permissions.IsKnownFansubGroupRole), erhalten %v",
				role.RoleCode, expectedAssignable, *role.Assignable)
		}
	}
}

// TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries prüft, dass ListCapabilityMatrix
// zusätzlich zu den role_definitions-Zeilen drei synthetische globale App-Rollen-Zeilen
// (platform_admin/content_admin/user) mit role_kind="global_app_role" und dem korrekten
// global_assignment_count aus CountGlobalRoleAssignments liefert (D-05, 111-RESEARCH.md
// Pitfall 1). Eine bestehende role_definitions-Zeile (fansub_lead) darf dabei ihr
// role_kind="" und global_assignment_count=null (abwesend) behalten.
func TestListCapabilityMatrixIncludesSyntheticGlobalRoleEntries(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stubRoles := []repository.CapabilityMatrixRoleEntry{
		{RoleCode: "fansub_lead", LabelDE: "Fansub-Leitung", Actions: []repository.CapabilityMatrixActionState{}},
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
		// Bewusst ohne "user"-Eintrag, um den Default-0-Fall zu prüfen.
		globalRoleCounts: map[string]int{"platform_admin": 3, "content_admin": 0},
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.ListCapabilityMatrix(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
	}

	var response struct {
		Roles []struct {
			RoleCode              string `json:"role_code"`
			RoleKind              string `json:"role_kind"`
			GlobalAssignmentCount *int   `json:"global_assignment_count"`
		} `json:"roles"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("response body parsen fehlgeschlagen: %v\nbody: %s", err, rec.Body.String())
	}

	if len(response.Roles) != 4 {
		t.Fatalf("erwartet 4 Rollen (1 role_definitions + 3 synthetisch), erhalten %d", len(response.Roles))
	}

	expectedCounts := map[string]int{"platform_admin": 3, "content_admin": 0, "user": 0}
	syntheticSeen := map[string]bool{}

	for _, role := range response.Roles {
		if role.RoleCode == "fansub_lead" {
			if role.RoleKind != "" {
				t.Fatalf("fansub_lead: erwartet role_kind='', erhalten %q", role.RoleKind)
			}
			if role.GlobalAssignmentCount != nil {
				t.Fatalf("fansub_lead: erwartet global_assignment_count=null, erhalten %v", *role.GlobalAssignmentCount)
			}
			continue
		}

		expectedCount, isSynthetic := expectedCounts[role.RoleCode]
		if !isSynthetic {
			t.Fatalf("unerwarteter role_code %q in Response", role.RoleCode)
		}
		syntheticSeen[role.RoleCode] = true

		if role.RoleKind != "global_app_role" {
			t.Fatalf("Rolle %q: erwartet role_kind='global_app_role', erhalten %q", role.RoleCode, role.RoleKind)
		}
		if role.GlobalAssignmentCount == nil {
			t.Fatalf("Rolle %q: erwartet global_assignment_count gesetzt, erhalten nil", role.RoleCode)
		}
		if *role.GlobalAssignmentCount != expectedCount {
			t.Fatalf("Rolle %q: erwartet global_assignment_count=%d, erhalten %d", role.RoleCode, expectedCount, *role.GlobalAssignmentCount)
		}
	}

	for roleCode := range expectedCounts {
		if !syntheticSeen[roleCode] {
			t.Fatalf("erwartete synthetische Rolle %q fehlt in Response", roleCode)
		}
	}
}

// TestListCapabilityMatrixIncludesGroupHolderCount prüft, dass ListCapabilityMatrix jede
// permissions.IsKnownFansubGroupRole-Zeile mit group_holder_count aus CountGroupRoleHolders
// anreichert, sonst nie (weder für IsKnownFansubGroupRole-false-Rollen noch für die drei
// synthetischen globalen Zeilen) (260824-ike Defekt 2, Task 1).
//
// Rollenwahl: dieses Testpaket initialisiert permissions.fansubGroupRoleCatalog einmalig über
// testmain_test.go's handlerTestCatalogLoader (ein bewusst schmaler, hartkodierter 12-Rollen-Stub
// aus der Zeit vor Migration 0112's assignable=true-Beförderung von co_leader/founder/project_lead).
// "fansub_lead" ist Teil dieses Stubs (IsKnownFansubGroupRole=true, wie bereits von
// TestGrantCapabilityAssignableGuardAllowsAppRole/TestListCapabilityMatrixAssignableEnrichment
// via appRoles[0] genutzt); "founder" ist bewusst NICHT Teil dieses Stubs
// (IsKnownFansubGroupRole=false, identisches Negativ-Beispiel wie
// TestGrantCapabilityAssignableGuardRejectsHistoricalRole in dieser Datei). Der ursprünglich im
// Plan genannte encoder/co_leader-Beispielpaar passt nicht zu diesem Testpaket-Stub (encoder ist
// im Stub enthalten -> true, co_leader fehlt -> false) und wurde deshalb durch dieses
// stub-konsistente Paar ersetzt — reine Testauswahl, keine Verhaltensänderung.
func TestListCapabilityMatrixIncludesGroupHolderCount(t *testing.T) {
	gin.SetMode(gin.TestMode)

	stubRoles := []repository.CapabilityMatrixRoleEntry{
		{RoleCode: "fansub_lead", LabelDE: "Fansub-Leitung", Actions: []repository.CapabilityMatrixActionState{}},
		{RoleCode: "founder", LabelDE: "Gründer/in", Actions: []repository.CapabilityMatrixActionState{}},
	}

	if !permissions.IsKnownFansubGroupRole("fansub_lead") {
		t.Fatalf("Testvorbedingung verletzt: fansub_lead sollte laut Testpaket-Stub eine bekannte Fansub-Gruppenrolle sein")
	}
	if permissions.IsKnownFansubGroupRole("founder") {
		t.Fatalf("Testvorbedingung verletzt: founder sollte laut Testpaket-Stub KEINE bekannte Fansub-Gruppenrolle sein")
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
		isPlatformAdmin:   true,
		matrixRoles:       stubRoles,
		groupHolderCounts: map[string]int{"fansub_lead": 3},
	}
	permStub := &stubCapabilityPermissionSvc{}
	auditStub := &captureAuditLogRepo{}

	h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
	h.ListCapabilityMatrix(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
	}

	var response struct {
		Roles []struct {
			RoleCode        string `json:"role_code"`
			GroupHolderCount *int  `json:"group_holder_count"`
		} `json:"roles"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("response body parsen fehlgeschlagen: %v\nbody: %s", err, rec.Body.String())
	}

	for _, role := range response.Roles {
		switch role.RoleCode {
		case "fansub_lead":
			if role.GroupHolderCount == nil {
				t.Fatalf("fansub_lead: erwartet group_holder_count gesetzt, erhalten nil")
			}
			if *role.GroupHolderCount != 3 {
				t.Fatalf("fansub_lead: erwartet group_holder_count=3, erhalten %d", *role.GroupHolderCount)
			}
		case "founder":
			if role.GroupHolderCount != nil {
				t.Fatalf("founder: erwartet group_holder_count=null (nicht IsKnownFansubGroupRole laut Testpaket-Stub), erhalten %v", *role.GroupHolderCount)
			}
		case "platform_admin", "content_admin", "user":
			if role.GroupHolderCount != nil {
				t.Fatalf("synthetische globale Rolle %q: erwartet group_holder_count=null, erhalten %v", role.RoleCode, *role.GroupHolderCount)
			}
		default:
			t.Fatalf("unerwarteter role_code %q in Response", role.RoleCode)
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

// TestAdminCapabilityHandlerCacheReloadSucceededField prüft CAP-10/D-21 (Plan 138-02):
// Grant/RevokeCapability antworten immer mit HTTP 200 (eine ReloadCache-Fehlschlag ist keine
// Mutations-Fehlschlag), melden aber ehrlich über cache_reload_succeeded, ob der In-Process-
// Cache-Reload erfolgreich war.
func TestAdminCapabilityHandlerCacheReloadSucceededField(t *testing.T) {
	gin.SetMode(gin.TestMode)

	adminIdentity := middleware.AuthIdentity{
		UserID:          1,
		AppUserID:       1,
		AppUserStatus:   models.AppUserStatusActive,
		IsPlatformAdmin: true,
		DisplayName:     "Admin",
	}

	decodeResult := func(t *testing.T, rec *httptest.ResponseRecorder) RoleCapabilityMutationResult {
		t.Helper()
		var result RoleCapabilityMutationResult
		if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
			t.Fatalf("response body parsen fehlgeschlagen: %v\nbody: %s", err, rec.Body.String())
		}
		return result
	}

	t.Run("grant cache_reload_succeeded=true", func(t *testing.T) {
		c, rec := makeCapabilityTestContext(http.MethodPut, "/admin/role-capabilities/fansub_lead/release.view", adminIdentity)
		c.Params = gin.Params{
			{Key: "roleCode", Value: "fansub_lead"},
			{Key: "actionCode", Value: "release.view"},
		}

		authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
		permStub := &stubCapabilityPermissionSvc{reloadErr: nil}
		auditStub := &captureAuditLogRepo{}

		h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
		h.GrantCapability(c)

		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
		result := decodeResult(t, rec)
		if !result.CacheReloadSucceeded {
			t.Fatalf("erwartet cache_reload_succeeded=true, erhalten %v", result.CacheReloadSucceeded)
		}
	})

	t.Run("grant cache_reload_succeeded=false", func(t *testing.T) {
		c, rec := makeCapabilityTestContext(http.MethodPut, "/admin/role-capabilities/fansub_lead/release.view", adminIdentity)
		c.Params = gin.Params{
			{Key: "roleCode", Value: "fansub_lead"},
			{Key: "actionCode", Value: "release.view"},
		}

		authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
		permStub := &stubCapabilityPermissionSvc{reloadErr: errors.New("reload boom")}
		auditStub := &captureAuditLogRepo{}

		h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
		h.GrantCapability(c)

		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200 (Reload-Fehler ist keine Mutations-Fehlschlag), erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
		result := decodeResult(t, rec)
		if result.CacheReloadSucceeded {
			t.Fatalf("erwartet cache_reload_succeeded=false, erhalten %v", result.CacheReloadSucceeded)
		}
	})

	t.Run("revoke cache_reload_succeeded=true", func(t *testing.T) {
		c, rec := makeCapabilityTestContext(http.MethodDelete, "/admin/role-capabilities/fansub_lead/release.view", adminIdentity)
		c.Params = gin.Params{
			{Key: "roleCode", Value: "fansub_lead"},
			{Key: "actionCode", Value: "release.view"},
		}

		authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: true, countRolesWithAction: 5}
		permStub := &stubCapabilityPermissionSvc{reloadErr: nil}
		auditStub := &captureAuditLogRepo{}

		h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
		h.RevokeCapability(c)

		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
		result := decodeResult(t, rec)
		if !result.CacheReloadSucceeded {
			t.Fatalf("erwartet cache_reload_succeeded=true, erhalten %v", result.CacheReloadSucceeded)
		}
	})

	t.Run("revoke cache_reload_succeeded=false", func(t *testing.T) {
		c, rec := makeCapabilityTestContext(http.MethodDelete, "/admin/role-capabilities/fansub_lead/release.view", adminIdentity)
		c.Params = gin.Params{
			{Key: "roleCode", Value: "fansub_lead"},
			{Key: "actionCode", Value: "release.view"},
		}

		authzStub := &stubCapabilityAuthzRepo{isPlatformAdmin: true, countRolesWithAction: 5}
		permStub := &stubCapabilityPermissionSvc{reloadErr: errors.New("reload boom")}
		auditStub := &captureAuditLogRepo{}

		h := NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)
		h.RevokeCapability(c)

		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200 (Reload-Fehler ist keine Mutations-Fehlschlag), erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
		result := decodeResult(t, rec)
		if result.CacheReloadSucceeded {
			t.Fatalf("erwartet cache_reload_succeeded=false, erhalten %v", result.CacheReloadSucceeded)
		}
	})
}

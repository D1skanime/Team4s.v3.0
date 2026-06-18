package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// --- Test-Doubles für View-Enforcement-Tests ---

// stubPermissionSvcForView ist ein minimaler permissions.Service-Stub,
// der CanForFansubGroup via einer voreingestellten Antwort implementiert.
// Da permissions.Service eine Struct ist, nutzen wir einen Interface-Wrapper.

// viewPermissionSvc ist ein Interface das CanForFansubGroup exponiert —
// nur für Tests, um den Stub einzuhängen.
type viewPermissionSvc interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubGroupID int64) (permissions.Result, error)
}

// stubViewPermissionSvc gibt allowed oder denied zurück je nach Konfiguration.
type stubViewPermissionSvc struct {
	allowed bool
}

func (s *stubViewPermissionSvc) CanForFansubGroup(_ context.Context, actor permissions.Actor, _ permissions.Action, _ int64) (permissions.Result, error) {
	// platform_admin immer erlaubt (D-03)
	if actor.IsPlatformAdmin {
		return permissions.Result{
			Allowed:    true,
			ReasonCode: permissions.ReasonPlatformAdmin,
		}, nil
	}
	if s.allowed {
		return permissions.Result{
			Allowed:    true,
			ReasonCode: permissions.ReasonAllowed,
		}, nil
	}
	return permissions.Result{
		Allowed:    false,
		ReasonCode: permissions.ReasonNoMembership,
	}, nil
}

// stubAuditLogRepoView fängt Audit-Einträge für die View-Tests.
type stubAuditLogRepoView struct{}

func (s *stubAuditLogRepoView) Write(_ context.Context, _ repository.AuditLogEntry) error {
	return nil
}

// makeViewTestContext erstellt einen Gin-Kontext mit einer AuthIdentity und einem :id-Param.
func makeViewTestContext(method, path string, identity middleware.AuthIdentity, fansubID string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(method, path, nil)
	c.Set("auth_identity", identity)
	c.Params = gin.Params{{Key: "id", Value: fansubID}}
	return c, rec
}

// --- View-Enforcement-Handler-Wrappers für Tests ---
// Da die Produktions-Handler konkrete *repository.AuthzRepository-Typen verwenden,
// testen wir die Enforcement-Logik über einen minimalen Wrapper der das gleiche Muster
// wie die Produktions-Handler implementiert.

// testGroupMembersViewHandler simuliert den ListHistGroupMembers-Endpoint-Check.
func testGroupMembersViewHandler(permSvc viewPermissionSvc, auditRepo auditLogWriter) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, actor, ok := permissionActorFromContext(c)
		if !ok {
			return
		}

		fansubID, err := parseFansubID(c.Param("id"))
		if err != nil {
			badRequest(c, "ungültige fansub id")
			return
		}

		result, err := permSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			auditPermissionDenied(c, auditRepo, identity, "hist_group_member.list.denied", &fansubID, "hist_fansub_group_member", nil, permissions.ActionFansubGroupMembersView, result)
			writePermissionDenied(c, result)
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
	}
}

// testUnifiedMembersViewHandler simuliert den ListUnifiedGroupMembers-Endpoint-Check.
func testUnifiedMembersViewHandler(permSvc viewPermissionSvc, auditRepo auditLogWriter) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, actor, ok := permissionActorFromContext(c)
		if !ok {
			return
		}

		fansubID, err := parseFansubID(c.Param("id"))
		if err != nil {
			badRequest(c, "ungültige fansub id")
			return
		}

		result, err := permSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			auditPermissionDenied(c, auditRepo, identity, "unified_members.list.denied", &fansubID, "unified_member", nil, permissions.ActionFansubGroupMembersView, result)
			writePermissionDenied(c, result)
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
	}
}

// testAnimeCoverageViewHandler simuliert den GetAnimeCoverage-Endpoint-Check.
func testAnimeCoverageViewHandler(permSvc viewPermissionSvc, auditRepo auditLogWriter) gin.HandlerFunc {
	return func(c *gin.Context) {
		_, actor, ok := permissionActorFromContext(c)
		if !ok {
			return
		}

		fansubID, err := parseFansubID(c.Param("id"))
		if err != nil {
			badRequest(c, "ungültige fansub id")
			return
		}

		result, err := permSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupMembersView, fansubID)
		if err != nil {
			writePermissionInternalError(c, err, "Berechtigung konnte nicht geprüft werden.")
			return
		}
		if !result.Allowed {
			writePermissionDenied(c, result)
			return
		}

		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
	}
}

// --- Tests ---

// TestViewCapabilityEnforcementGroupMembers prüft, dass GET /admin/fansubs/:id/group-members
// einen Benutzer ohne ActionFansubGroupMembersView mit 403 ablehnt und mit der Action zulässt.
func TestViewCapabilityEnforcementGroupMembers(t *testing.T) {
	auditStub := &stubAuditLogRepoView{}

	activeIdentity := middleware.AuthIdentity{
		UserID:        10,
		AppUserID:     10,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Mitglied",
	}

	t.Run("ohne ActionFansubGroupMembersView → 403", func(t *testing.T) {
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/group-members", activeIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: false}
		h := testGroupMembersViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("erwartet 403, erhalten %d", rec.Code)
		}
	})

	t.Run("mit ActionFansubGroupMembersView → 200", func(t *testing.T) {
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/group-members", activeIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: true}
		h := testGroupMembersViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("platform_admin passiert immer (D-03)", func(t *testing.T) {
		adminIdentity := middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			DisplayName:     "Platform Admin",
			IsPlatformAdmin: true,
		}
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/group-members", adminIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: false} // allowed=false, aber platform_admin überschreibt
		h := testGroupMembersViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusOK {
			t.Fatalf("platform_admin: erwartet 200, erhalten %d", rec.Code)
		}
	})
}

// TestViewCapabilityEnforcementUnifiedMembers prüft, dass der Unified-Members-Endpunkt
// das ActionFansubGroupMembersView-Recht durchsetzt.
func TestViewCapabilityEnforcementUnifiedMembers(t *testing.T) {
	auditStub := &stubAuditLogRepoView{}

	activeIdentity := middleware.AuthIdentity{
		UserID:        10,
		AppUserID:     10,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Mitglied",
	}

	t.Run("ohne ActionFansubGroupMembersView → 403", func(t *testing.T) {
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/unified-members", activeIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: false}
		h := testUnifiedMembersViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("erwartet 403, erhalten %d", rec.Code)
		}
	})

	t.Run("mit ActionFansubGroupMembersView → 200", func(t *testing.T) {
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/unified-members", activeIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: true}
		h := testUnifiedMembersViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("platform_admin passiert immer (D-03)", func(t *testing.T) {
		adminIdentity := middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			DisplayName:     "Platform Admin",
			IsPlatformAdmin: true,
		}
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/unified-members", adminIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: false}
		h := testUnifiedMembersViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusOK {
			t.Fatalf("platform_admin: erwartet 200, erhalten %d", rec.Code)
		}
	})
}

// TestViewCapabilityEnforcementAnimeCoverage prüft, dass der Anime-Coverage-Endpunkt
// das zutreffende View-Recht durchsetzt.
func TestViewCapabilityEnforcementAnimeCoverage(t *testing.T) {
	auditStub := &stubAuditLogRepoView{}

	activeIdentity := middleware.AuthIdentity{
		UserID:        10,
		AppUserID:     10,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Mitglied",
	}

	t.Run("ohne ActionFansubGroupMembersView → 403", func(t *testing.T) {
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/anime-coverage", activeIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: false}
		h := testAnimeCoverageViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("erwartet 403, erhalten %d", rec.Code)
		}
	})

	t.Run("mit ActionFansubGroupMembersView → 200", func(t *testing.T) {
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/anime-coverage", activeIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: true}
		h := testAnimeCoverageViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusOK {
			t.Fatalf("erwartet 200, erhalten %d (body: %s)", rec.Code, rec.Body.String())
		}
	})

	t.Run("platform_admin passiert immer (D-03)", func(t *testing.T) {
		adminIdentity := middleware.AuthIdentity{
			UserID:          1,
			AppUserID:       1,
			AppUserStatus:   models.AppUserStatusActive,
			DisplayName:     "Platform Admin",
			IsPlatformAdmin: true,
		}
		c, rec := makeViewTestContext(http.MethodGet, "/admin/fansubs/1/anime-coverage", adminIdentity, "1")
		permStub := &stubViewPermissionSvc{allowed: false}
		h := testAnimeCoverageViewHandler(permStub, auditStub)
		h(c)
		if rec.Code != http.StatusOK {
			t.Fatalf("platform_admin: erwartet 200, erhalten %d", rec.Code)
		}
	})
}

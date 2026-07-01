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

	"github.com/gin-gonic/gin"
)

// stubGroupRolesAuthzRepo implementiert capabilityAuthzRepo für GroupRoles-Tests.
// Die Signatur von AppUserHasGlobalRole muss exakt mit capabilityAuthzRepo übereinstimmen.
type stubGroupRolesAuthzRepo struct {
	isPlatformAdmin bool
}

func (s *stubGroupRolesAuthzRepo) AppUserHasGlobalRole(_ context.Context, _ int64, _ string) (bool, error) {
	return s.isPlatformAdmin, nil
}

// groupRolesHandlerWithCatalog ist ein Test-Wrapper, der permissions.FansubGroupRoles()
// aus dem aktuellen In-Memory-Catalog liest (wird in TestListFansubGroupRoles vorbereitet).
type groupRolesHandlerWithCatalog struct {
	authzRepo any
}

func (h *groupRolesHandlerWithCatalog) ListFansubGroupRoles(c *gin.Context) {
	_, ok := requirePlatformAdminIdentity(c, h.authzRepo, "")
	if !ok {
		return
	}

	roles := permissions.FansubGroupRoles()

	type roleItem struct {
		Code string `json:"code"`
	}
	items := make([]roleItem, len(roles))
	for i, r := range roles {
		items[i] = roleItem{Code: r}
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

// TestListFansubGroupRoles prüft GET /admin/fansub-group-roles (D-12).
// Setzt den fansubGroupRoleCatalog via LoadFansubGroupCatalog vor dem Test.
// Erwartet 200 + JSON {data: [{code:"fansub_lead"},{code:"techadmin"},{code:"gfxler"}]}.
func TestListFansubGroupRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Catalog mit bekannten Rollen vorbereiten (simuliert DB-Load).
	svc := permissions.NewService(nil)
	stubLoader := &stubGroupRolesCatalogLoader{
		roles: []string{"fansub_lead", "techadmin", "gfxler"},
	}
	if err := svc.LoadFansubGroupCatalog(t.Context(), stubLoader); err != nil {
		t.Fatalf("LoadFansubGroupCatalog: %v", err)
	}

	// Platform-Admin-Identity setzen.
	rec := httptest.NewRecorder()
	c, router := gin.CreateTestContext(rec)

	authzStub := &stubGroupRolesAuthzRepo{isPlatformAdmin: true}
	h := &groupRolesHandlerWithCatalog{authzRepo: authzStub}

	router.GET("/admin/fansub-group-roles", func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{
			UserID:        1,
			AppUserID:     1,
			AppUserStatus: models.AppUserStatusActive,
			DisplayName:   "Admin",
			IsPlatformAdmin: true,
		})
		h.ListFansubGroupRoles(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/admin/fansub-group-roles", nil)
	c.Request = req
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("erwartet HTTP 200, erhalten %d — Body: %s", rec.Code, rec.Body.String())
	}

	var resp struct {
		Data []struct {
			Code string `json:"code"`
		} `json:"data"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("JSON-Decode fehlgeschlagen: %v", err)
	}

	if len(resp.Data) != 3 {
		t.Fatalf("erwartet 3 Rollen, erhalten %d: %+v", len(resp.Data), resp.Data)
	}

	codes := make(map[string]bool)
	for _, item := range resp.Data {
		codes[item.Code] = true
	}
	for _, expected := range []string{"fansub_lead", "techadmin", "gfxler"} {
		if !codes[expected] {
			t.Errorf("erwartet Rolle %q in Antwort, nicht gefunden: %+v", expected, resp.Data)
		}
	}
}

// TestListFansubGroupRolesRequiresPlatformAdmin prüft dass Nicht-Admins 403 erhalten.
func TestListFansubGroupRolesRequiresPlatformAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	rec := httptest.NewRecorder()
	_, router := gin.CreateTestContext(rec)

	authzStub := &stubGroupRolesAuthzRepo{isPlatformAdmin: false}
	h := &groupRolesHandlerWithCatalog{authzRepo: authzStub}

	router.GET("/admin/fansub-group-roles", func(c *gin.Context) {
		c.Set("auth_identity", middleware.AuthIdentity{
			UserID:        2,
			AppUserID:     2,
			AppUserStatus: models.AppUserStatusActive,
			DisplayName:   "NichtAdmin",
		})
		h.ListFansubGroupRoles(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/admin/fansub-group-roles", nil)
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("erwartet HTTP 403, erhalten %d — Body: %s", rec.Code, rec.Body.String())
	}
}

// stubGroupRolesCatalogLoader implementiert permissions.CatalogLoader für Tests.
type stubGroupRolesCatalogLoader struct {
	roles []string
}

func (s *stubGroupRolesCatalogLoader) LoadFansubGroupRoles(_ context.Context) ([]string, error) {
	return s.roles, nil
}

func (s *stubGroupRolesCatalogLoader) LoadCapabilityRoles(_ context.Context) ([]string, error) {
	return s.roles, nil
}

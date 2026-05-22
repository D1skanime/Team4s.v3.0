package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/models"

	"github.com/gin-gonic/gin"
)

type stubRoleChecker struct {
	appUserIsAdmin bool
	legacyIsAdmin  bool
}

func (s stubRoleChecker) AppUserHasGlobalRole(ctx context.Context, appUserID int64, roleName string) (bool, error) {
	return s.appUserIsAdmin, nil
}

func (s stubRoleChecker) UserHasRole(ctx context.Context, userID int64, roleName string) (bool, error) {
	return s.legacyIsAdmin, nil
}

func makeAuthzContext(identity middleware.AuthIdentity) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/admin", nil)
	c.Set("auth_identity", identity)
	return c, recorder
}

func TestRequirePlatformAdminIdentityAllowsActiveAppAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, recorder := makeAuthzContext(middleware.AuthIdentity{
		UserID:        5,
		AppUserID:     11,
		DisplayName:   "Phase Admin",
		AppUserStatus: models.AppUserStatusActive,
	})

	identity, ok := requirePlatformAdminIdentity(c, stubRoleChecker{appUserIsAdmin: true}, "")
	if !ok {
		t.Fatalf("expected app admin to pass, got status %d", recorder.Code)
	}
	if identity.AppUserID != 11 {
		t.Fatalf("expected app user id 11, got %d", identity.AppUserID)
	}
}

func TestRequirePlatformAdminIdentityRejectsPendingAppUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, recorder := makeAuthzContext(middleware.AuthIdentity{
		UserID:        5,
		AppUserID:     11,
		DisplayName:   "Phase Pending",
		AppUserStatus: models.AppUserStatusPending,
	})

	if _, ok := requirePlatformAdminIdentity(c, stubRoleChecker{appUserIsAdmin: true}, ""); ok {
		t.Fatalf("expected pending app user to fail")
	}
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}
}

func TestRequirePlatformAdminIdentityRejectsDisabledAppUser(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, recorder := makeAuthzContext(middleware.AuthIdentity{
		UserID:        5,
		AppUserID:     11,
		DisplayName:   "Phase Disabled",
		AppUserStatus: models.AppUserStatusDisabled,
	})

	if _, ok := requirePlatformAdminIdentity(c, stubRoleChecker{appUserIsAdmin: true}, ""); ok {
		t.Fatalf("expected disabled app user to fail")
	}
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d", recorder.Code)
	}
}

func TestRequirePlatformAdminIdentityFallsBackToLegacyRoleCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	c, recorder := makeAuthzContext(middleware.AuthIdentity{
		UserID:      7,
		DisplayName: "Legacy Admin",
	})

	identity, ok := requirePlatformAdminIdentity(c, stubRoleChecker{legacyIsAdmin: true}, "admin")
	if !ok {
		t.Fatalf("expected legacy admin to pass, got status %d", recorder.Code)
	}
	if identity.UserID != 7 {
		t.Fatalf("expected user id 7, got %d", identity.UserID)
	}
}

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

// Phase 138 Plan 07 -- Role-to-Capability Change Impact Preview handler tests. Uses the same
// fake-interface test-double pattern as admin_capability_handler_test.go/
// admin_role_assignment_impact_handler_test.go (stubCapabilityAuthzRepo already shared
// package-wide).

// fakeCapabilityImpactRoleHolderRepo is a minimal fake for roleHolderRepo.
type fakeCapabilityImpactRoleHolderRepo struct {
	entries []repository.RoleHolderEntry
	err     error
}

func (f *fakeCapabilityImpactRoleHolderRepo) ListRoleHolders(_ context.Context, _ string) ([]repository.RoleHolderEntry, error) {
	return f.entries, f.err
}

// fakeCapabilityImpactPermissionSvc is a minimal fake for capabilityImpactPermissionSvc.
type fakeCapabilityImpactPermissionSvc struct {
	results     []permissions.CapabilityImpactResult
	err         error
	calls       int
	lastRole    string
	lastAction  permissions.Action
	lastAdd     bool
	lastHolders []permissions.RoleHolderTarget
}

func (f *fakeCapabilityImpactPermissionSvc) PreviewGroupRightsCapabilityChange(
	_ context.Context, roleCode string, actionCode permissions.Action, add bool, holders []permissions.RoleHolderTarget,
) ([]permissions.CapabilityImpactResult, error) {
	f.calls++
	f.lastRole = roleCode
	f.lastAction = actionCode
	f.lastAdd = add
	f.lastHolders = holders
	if f.err != nil {
		return nil, f.err
	}
	if f.results != nil {
		return f.results, nil
	}
	results := make([]permissions.CapabilityImpactResult, 0, len(holders))
	for _, holder := range holders {
		results = append(results, permissions.CapabilityImpactResult{
			TargetUserID: holder.AppUserID,
			Before:       permissions.CapabilityRightState{ActionCode: actionCode, Allowed: false},
			After:        permissions.CapabilityRightState{ActionCode: actionCode, Allowed: add},
		})
	}
	return results, nil
}

func capabilityImpactTestContext(method, target string, identity middleware.AuthIdentity, roleCode, actionCode string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(method, target, nil)
	c.Params = gin.Params{
		{Key: "roleCode", Value: roleCode},
		{Key: "actionCode", Value: actionCode},
	}
	c.Set("auth_identity", identity)
	return c, rec
}

var capabilityImpactAdminIdentity = middleware.AuthIdentity{
	UserID:          1,
	AppUserID:       1,
	AppUserStatus:   models.AppUserStatusActive,
	IsPlatformAdmin: true,
	DisplayName:     "Admin",
}

// TestAdminCapabilityImpactHandlerReturnsAffectedUserCountForValidRequest proves the 200
// happy path: affected_user_count matches the number of real role holders.
func TestAdminCapabilityImpactHandlerReturnsAffectedUserCountForValidRequest(t *testing.T) {
	authz := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
	holderRepo := &fakeCapabilityImpactRoleHolderRepo{
		entries: []repository.RoleHolderEntry{
			{AppUserID: 10, FansubGroupID: 5},
			{AppUserID: 11, FansubGroupID: 5},
			{AppUserID: 12, FansubGroupID: 6},
		},
	}
	permSvc := &fakeCapabilityImpactPermissionSvc{}
	h := NewAdminCapabilityImpactHandler(authz, holderRepo, permSvc)

	c, rec := capabilityImpactTestContext(
		http.MethodGet,
		"/admin/role-capabilities/fansub_lead/fansub_group_media.upload/impact-preview?add=true",
		capabilityImpactAdminIdentity, "fansub_lead", "fansub_group_media.upload",
	)
	h.PreviewCapabilityChange(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data CapabilityOverrideImpactPreview `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if response.Data.AffectedUserCount != 3 {
		t.Fatalf("expected affected_user_count=3, got %d", response.Data.AffectedUserCount)
	}
	if len(response.Data.Items) != 3 {
		t.Fatalf("expected 3 items, got %d", len(response.Data.Items))
	}
	if permSvc.calls != 1 {
		t.Fatalf("expected exactly 1 PreviewGroupRightsCapabilityChange call, got %d", permSvc.calls)
	}
	if permSvc.lastRole != "fansub_lead" || permSvc.lastAction != "fansub_group_media.upload" || !permSvc.lastAdd {
		t.Fatalf("unexpected preview call params: role=%q action=%q add=%v", permSvc.lastRole, permSvc.lastAction, permSvc.lastAdd)
	}
	if len(permSvc.lastHolders) != 3 {
		t.Fatalf("expected 3 holders passed to preview, got %d", len(permSvc.lastHolders))
	}
}

// TestAdminCapabilityImpactHandlerRejectsNonCapabilityBearingRole proves 422 for a purely
// historical role, mirroring AdminCapabilityHandler.GrantCapability's exact guard.
func TestAdminCapabilityImpactHandlerRejectsNonCapabilityBearingRole(t *testing.T) {
	historicalRole := "founder"
	if permissions.IsCapabilityBearingRole(historicalRole) {
		t.Fatalf("test precondition violated: %q should not be capability-bearing", historicalRole)
	}

	authz := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
	holderRepo := &fakeCapabilityImpactRoleHolderRepo{}
	permSvc := &fakeCapabilityImpactPermissionSvc{}
	h := NewAdminCapabilityImpactHandler(authz, holderRepo, permSvc)

	c, rec := capabilityImpactTestContext(
		http.MethodGet,
		"/admin/role-capabilities/"+historicalRole+"/fansub_group_media.upload/impact-preview?add=true",
		capabilityImpactAdminIdentity, historicalRole, "fansub_group_media.upload",
	)
	h.PreviewCapabilityChange(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var body struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if body.Error.Code != "role_not_capability_bearing" {
		t.Fatalf("expected error.code='role_not_capability_bearing', got %q", body.Error.Code)
	}
	if permSvc.calls != 0 {
		t.Fatal("expected PreviewGroupRightsCapabilityChange to never be called for a non-capability-bearing role")
	}
}

// TestAdminCapabilityImpactHandlerRejectsMissingOrInvalidAddParam proves 400 for a missing or
// invalid add query param -- it must never silently default to one direction.
func TestAdminCapabilityImpactHandlerRejectsMissingOrInvalidAddParam(t *testing.T) {
	cases := []struct {
		name   string
		target string
	}{
		{name: "missing", target: "/admin/role-capabilities/fansub_lead/fansub_group_media.upload/impact-preview"},
		{name: "invalid", target: "/admin/role-capabilities/fansub_lead/fansub_group_media.upload/impact-preview?add=maybe"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			authz := &stubCapabilityAuthzRepo{isPlatformAdmin: true}
			holderRepo := &fakeCapabilityImpactRoleHolderRepo{}
			permSvc := &fakeCapabilityImpactPermissionSvc{}
			h := NewAdminCapabilityImpactHandler(authz, holderRepo, permSvc)

			c, rec := capabilityImpactTestContext(
				http.MethodGet, tc.target, capabilityImpactAdminIdentity, "fansub_lead", "fansub_group_media.upload",
			)
			h.PreviewCapabilityChange(c)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("expected 400, got %d (body: %s)", rec.Code, rec.Body.String())
			}
			if permSvc.calls != 0 {
				t.Fatal("expected PreviewGroupRightsCapabilityChange to never be called for a missing/invalid add param")
			}
		})
	}
}

// TestAdminCapabilityImpactHandlerRequiresPlatformAdmin proves 403 for a non-platform-admin
// caller, matching GrantCapability/RevokeCapability's identical gate.
func TestAdminCapabilityImpactHandlerRequiresPlatformAdmin(t *testing.T) {
	authz := &stubCapabilityAuthzRepo{isPlatformAdmin: false}
	holderRepo := &fakeCapabilityImpactRoleHolderRepo{}
	permSvc := &fakeCapabilityImpactPermissionSvc{}
	h := NewAdminCapabilityImpactHandler(authz, holderRepo, permSvc)

	nonAdminIdentity := middleware.AuthIdentity{
		UserID:        42,
		AppUserID:     42,
		AppUserStatus: models.AppUserStatusActive,
		DisplayName:   "Non-Admin",
	}
	c, rec := capabilityImpactTestContext(
		http.MethodGet,
		"/admin/role-capabilities/fansub_lead/fansub_group_media.upload/impact-preview?add=true",
		nonAdminIdentity, "fansub_lead", "fansub_group_media.upload",
	)
	h.PreviewCapabilityChange(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if permSvc.calls != 0 {
		t.Fatal("expected PreviewGroupRightsCapabilityChange to never be called when unauthorized")
	}
}

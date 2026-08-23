package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

// Phase 138 Plan 04 -- Role-Assignment Impact Preview handler tests. Uses the same
// fake-interface test-double pattern as admin_effective_rights_handler_test.go
// (effectiveRightsTargetRepoStub, stubCapabilityAuthzRepo already shared package-wide).

// roleAssignmentImpactPermissionStub is a minimal fake for roleAssignmentImpactPermissionService.
type roleAssignmentImpactPermissionStub struct {
	allowedGroups map[int64]bool
	before        *permissions.GroupRightsResolution
	after         *permissions.GroupRightsResolution
	previewErr    error
	canCalls      int
	previewCalls  int
	lastPreviewFor permissions.Actor
	lastRoleCode   string
	lastAdd        bool
}

func (s *roleAssignmentImpactPermissionStub) CanForFansubGroup(
	_ context.Context, _ permissions.Actor, _ permissions.Action, fansubGroupID int64,
) (permissions.Result, error) {
	s.canCalls++
	if s.allowedGroups[fansubGroupID] {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

func (s *roleAssignmentImpactPermissionStub) PreviewGroupRightsWithRoleChange(
	_ context.Context, actor permissions.Actor, fansubGroupID int64, roleCode string, add bool,
) (*permissions.GroupRightsResolution, *permissions.GroupRightsResolution, error) {
	s.previewCalls++
	s.lastPreviewFor = actor
	s.lastRoleCode = roleCode
	s.lastAdd = add
	if s.previewErr != nil {
		return nil, nil, s.previewErr
	}
	before := s.before
	if before == nil {
		before = &permissions.GroupRightsResolution{
			Actor: actor, FansubGroupID: fansubGroupID, Rights: map[permissions.Action]permissions.CapabilityRightState{},
		}
	}
	after := s.after
	if after == nil {
		after = &permissions.GroupRightsResolution{
			Actor: actor, FansubGroupID: fansubGroupID, Rights: map[permissions.Action]permissions.CapabilityRightState{},
		}
	}
	return before, after, nil
}

func roleAssignmentImpactTestContext(target string, groupID string, appUserID string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, target, nil)
	c.Params = gin.Params{
		{Key: "id", Value: groupID},
		{Key: "appUserId", Value: appUserID},
	}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:        900,
		AppUserID:     900,
		AppUserStatus: "active",
		DisplayName:   "Group Admin",
	})
	return c, rec
}

func stubRoleAssignmentImpactHandler(
	perm *roleAssignmentImpactPermissionStub,
	target *effectiveRightsTargetRepoStub,
	authz *stubCapabilityAuthzRepo,
) *AdminRoleAssignmentImpactHandler {
	return NewAdminRoleAssignmentImpactHandler(perm, target, authz)
}

// TestAdminRoleAssignmentImpactHandlerReturnsBeforeAfterDiffForValidRequest proves the 200 happy path:
// a correctly-shaped before/after diff for a valid request.
func TestAdminRoleAssignmentImpactHandlerReturnsBeforeAfterDiffForValidRequest(t *testing.T) {
	perm := &roleAssignmentImpactPermissionStub{
		allowedGroups: map[int64]bool{21: true},
		before: &permissions.GroupRightsResolution{
			Rights: map[permissions.Action]permissions.CapabilityRightState{
				permissions.ActionFansubGroupMediaUpload: {
					ActionCode: permissions.ActionFansubGroupMediaUpload, Allowed: false,
					DecisiveSource: permissions.ProvenanceNoGrant, ReasonCode: permissions.ReasonCodeNoGrant,
				},
			},
		},
		after: &permissions.GroupRightsResolution{
			Rights: map[permissions.Action]permissions.CapabilityRightState{
				permissions.ActionFansubGroupMediaUpload: {
					ActionCode: permissions.ActionFansubGroupMediaUpload, Allowed: true,
					GrantingRoles: []string{permissions.RoleFansubLead},
					DecisiveSource: permissions.ProvenanceGroupRole, ReasonCode: permissions.ReasonCodeGroupRole,
				},
			},
		},
	}
	target := &effectiveRightsTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {MembershipID: 1, AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	authz := &stubCapabilityAuthzRepo{isPlatformAdmin: false}
	h := stubRoleAssignmentImpactHandler(perm, target, authz)

	c, rec := roleAssignmentImpactTestContext(
		"/api/v1/admin/fansubs/21/app-members/55/role-assignment-impact?role_code=fansub_lead&change=assign", "21", "55",
	)
	h.PreviewRoleAssignment(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data RoleAssignmentImpactPreview `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if response.Data.TargetUserID != 55 {
		t.Fatalf("expected target_user_id=55, got %d", response.Data.TargetUserID)
	}
	if response.Data.RoleCode != "fansub_lead" {
		t.Fatalf("expected role_code=fansub_lead, got %q", response.Data.RoleCode)
	}
	if response.Data.Change != "assign" {
		t.Fatalf("expected change=assign, got %q", response.Data.Change)
	}
	if len(response.Data.Before) != 1 || response.Data.Before[0].Allowed {
		t.Fatalf("expected before.Allowed=false, got %+v", response.Data.Before)
	}
	if len(response.Data.After) != 1 || !response.Data.After[0].Allowed {
		t.Fatalf("expected after.Allowed=true, got %+v", response.Data.After)
	}
	if perm.previewCalls != 1 {
		t.Fatalf("expected exactly 1 PreviewGroupRightsWithRoleChange call, got %d", perm.previewCalls)
	}
	if perm.lastPreviewFor.AppUserID != 55 {
		t.Fatalf("expected preview requested for target 55, got %d", perm.lastPreviewFor.AppUserID)
	}
	if perm.lastRoleCode != "fansub_lead" || !perm.lastAdd {
		t.Fatalf("expected roleCode=fansub_lead, add=true, got roleCode=%q add=%v", perm.lastRoleCode, perm.lastAdd)
	}
}

// TestAdminRoleAssignmentImpactHandlerRejectsActorNotAuthorizedForTargetGroup proves 403 when the actor
// lacks ActionFansubGroupMembersManage.
func TestAdminRoleAssignmentImpactHandlerRejectsActorNotAuthorizedForTargetGroup(t *testing.T) {
	perm := &roleAssignmentImpactPermissionStub{allowedGroups: map[int64]bool{}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	h := stubRoleAssignmentImpactHandler(perm, target, authz)

	c, rec := roleAssignmentImpactTestContext(
		"/api/v1/admin/fansubs/21/app-members/55/role-assignment-impact?role_code=fansub_lead&change=assign", "21", "55",
	)
	h.PreviewRoleAssignment(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewGroupRightsWithRoleChange to never be called when unauthorized")
	}
}

// TestAdminRoleAssignmentImpactHandlerRejectsUnknownRoleCode proves 400 for an unknown role_code.
func TestAdminRoleAssignmentImpactHandlerRejectsUnknownRoleCode(t *testing.T) {
	perm := &roleAssignmentImpactPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	h := stubRoleAssignmentImpactHandler(perm, target, authz)

	c, rec := roleAssignmentImpactTestContext(
		"/api/v1/admin/fansubs/21/app-members/55/role-assignment-impact?role_code=not_a_real_role&change=assign", "21", "55",
	)
	h.PreviewRoleAssignment(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewGroupRightsWithRoleChange to never be called for an unknown role_code")
	}
}

// TestAdminRoleAssignmentImpactHandlerRejectsInvalidChangeValue proves 400 for an invalid change value.
func TestAdminRoleAssignmentImpactHandlerRejectsInvalidChangeValue(t *testing.T) {
	perm := &roleAssignmentImpactPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	h := stubRoleAssignmentImpactHandler(perm, target, authz)

	c, rec := roleAssignmentImpactTestContext(
		"/api/v1/admin/fansubs/21/app-members/55/role-assignment-impact?role_code=fansub_lead&change=maybe", "21", "55",
	)
	h.PreviewRoleAssignment(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewGroupRightsWithRoleChange to never be called for an invalid change value")
	}
}

// TestAdminRoleAssignmentImpactHandlerForeignTargetIsNeutralNotFound proves 404 for a foreign/
// non-existent (group, user) pair.
func TestAdminRoleAssignmentImpactHandlerForeignTargetIsNeutralNotFound(t *testing.T) {
	perm := &roleAssignmentImpactPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{memberships: map[string]*repository.TargetMembership{}}
	authz := &stubCapabilityAuthzRepo{}
	h := stubRoleAssignmentImpactHandler(perm, target, authz)

	c, rec := roleAssignmentImpactTestContext(
		"/api/v1/admin/fansubs/21/app-members/999/role-assignment-impact?role_code=fansub_lead&change=assign", "21", "999",
	)
	h.PreviewRoleAssignment(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewGroupRightsWithRoleChange to never be called for a foreign target")
	}
}

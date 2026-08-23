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

// Phase 138 Plan 14 -- Claim-Activation Impact Preview handler tests (D-24). Uses the same
// fake-interface test-double pattern as admin_role_assignment_impact_handler_test.go.

// claimActivationImpactPermissionStub is a minimal fake for claimActivationImpactPermissionService.
type claimActivationImpactPermissionStub struct {
	allowedGroups map[int64]bool
	before        *permissions.GroupRightsResolution
	after         *permissions.GroupRightsResolution
	previewErr    error
	canCalls      int
	previewCalls  int
	lastAppUserID int64
	lastRoleCodes []string
}

func (s *claimActivationImpactPermissionStub) CanForFansubGroup(
	_ context.Context, _ permissions.Actor, _ permissions.Action, fansubGroupID int64,
) (permissions.Result, error) {
	s.canCalls++
	if s.allowedGroups[fansubGroupID] {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

func (s *claimActivationImpactPermissionStub) PreviewClaimActivationImpact(
	_ context.Context, appUserID int64, fansubGroupID int64, roleCodes []string,
) (*permissions.GroupRightsResolution, *permissions.GroupRightsResolution, error) {
	s.previewCalls++
	s.lastAppUserID = appUserID
	s.lastRoleCodes = roleCodes
	if s.previewErr != nil {
		return nil, nil, s.previewErr
	}
	before := s.before
	if before == nil {
		before = &permissions.GroupRightsResolution{FansubGroupID: fansubGroupID, Rights: map[permissions.Action]permissions.CapabilityRightState{}}
	}
	after := s.after
	if after == nil {
		after = &permissions.GroupRightsResolution{FansubGroupID: fansubGroupID, Rights: map[permissions.Action]permissions.CapabilityRightState{}}
	}
	return before, after, nil
}

// claimActivationRolesRepoStub is a minimal fake for claimActivationRolesRepo.
type claimActivationRolesRepoStub struct {
	appUserID int64
	roleCodes []string
	err       error
}

func (s *claimActivationRolesRepoStub) PreviewActivatableRoles(
	_ context.Context, _ int64, _ int64,
) (int64, []string, error) {
	if s.err != nil {
		return 0, nil, s.err
	}
	return s.appUserID, s.roleCodes, nil
}

func claimActivationImpactTestContext(target string, groupID string, memberID string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodGet, target, nil)
	c.Params = gin.Params{
		{Key: "id", Value: groupID},
		{Key: "memberId", Value: memberID},
	}
	c.Set("auth_identity", middleware.AuthIdentity{
		UserID:        900,
		AppUserID:     900,
		AppUserStatus: "active",
		DisplayName:   "Group Admin",
	})
	return c, rec
}

// TestAdminClaimActivationImpactHandlerReturnsBeforeAfterDiffForValidRequest proves the 200
// happy path: a real before/after diff for a valid verified claim with activatable roles.
func TestAdminClaimActivationImpactHandlerReturnsBeforeAfterDiffForValidRequest(t *testing.T) {
	perm := &claimActivationImpactPermissionStub{
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
					GrantingRoles:  []string{permissions.RoleFansubLead},
					DecisiveSource: permissions.ProvenanceGroupRole, ReasonCode: permissions.ReasonCodeGroupRole,
				},
			},
		},
	}
	claims := &claimActivationRolesRepoStub{appUserID: 55, roleCodes: []string{permissions.RoleFansubLead}}
	h := NewAdminClaimActivationImpactHandler(perm, claims)

	c, rec := claimActivationImpactTestContext(
		"/api/v1/admin/fansubs/21/historical-members/9/claim-activation-impact", "21", "9",
	)
	h.PreviewClaimActivation(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data ClaimActivationImpactPreview `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if response.Data.TargetAppUserID != 55 {
		t.Fatalf("expected target_app_user_id=55, got %d", response.Data.TargetAppUserID)
	}
	if len(response.Data.RoleCodes) != 1 || response.Data.RoleCodes[0] != permissions.RoleFansubLead {
		t.Fatalf("expected role_codes=[fansub_lead], got %+v", response.Data.RoleCodes)
	}
	if len(response.Data.Before) != 1 || response.Data.Before[0].Allowed {
		t.Fatalf("expected before.Allowed=false, got %+v", response.Data.Before)
	}
	if len(response.Data.After) != 1 || !response.Data.After[0].Allowed {
		t.Fatalf("expected after.Allowed=true, got %+v", response.Data.After)
	}
	if perm.previewCalls != 1 {
		t.Fatalf("expected exactly 1 PreviewClaimActivationImpact call, got %d", perm.previewCalls)
	}
	if perm.lastAppUserID != 55 {
		t.Fatalf("expected preview requested for app_user 55, got %d", perm.lastAppUserID)
	}
}

// TestAdminClaimActivationImpactHandlerRejectsZeroActivatableRoles proves the 422 refusal
// mirroring ActivateClaimedMember's own no_activatable_roles error when
// PreviewActivatableRoles finds zero activatable roles.
func TestAdminClaimActivationImpactHandlerRejectsZeroActivatableRoles(t *testing.T) {
	perm := &claimActivationImpactPermissionStub{allowedGroups: map[int64]bool{21: true}}
	claims := &claimActivationRolesRepoStub{appUserID: 55, roleCodes: []string{}}
	h := NewAdminClaimActivationImpactHandler(perm, claims)

	c, rec := claimActivationImpactTestContext(
		"/api/v1/admin/fansubs/21/historical-members/9/claim-activation-impact", "21", "9",
	)
	h.PreviewClaimActivation(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewClaimActivationImpact to never be called for zero activatable roles")
	}
}

// TestAdminClaimActivationImpactHandlerRejectsActorNotAuthorizedForTargetGroup proves 403
// when the actor lacks ActionFansubGroupHistoricalMembersLink.
func TestAdminClaimActivationImpactHandlerRejectsActorNotAuthorizedForTargetGroup(t *testing.T) {
	perm := &claimActivationImpactPermissionStub{allowedGroups: map[int64]bool{}}
	claims := &claimActivationRolesRepoStub{appUserID: 55, roleCodes: []string{permissions.RoleFansubLead}}
	h := NewAdminClaimActivationImpactHandler(perm, claims)

	c, rec := claimActivationImpactTestContext(
		"/api/v1/admin/fansubs/21/historical-members/9/claim-activation-impact", "21", "9",
	)
	h.PreviewClaimActivation(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewClaimActivationImpact to never be called when unauthorized")
	}
}

// TestAdminClaimActivationImpactHandlerForeignTargetIsNotFound proves 404 for a
// non-existent verified claim (PreviewActivatableRoles returns repository.ErrNotFound).
func TestAdminClaimActivationImpactHandlerForeignTargetIsNotFound(t *testing.T) {
	perm := &claimActivationImpactPermissionStub{allowedGroups: map[int64]bool{21: true}}
	claims := &claimActivationRolesRepoStub{err: repository.ErrNotFound}
	h := NewAdminClaimActivationImpactHandler(perm, claims)

	c, rec := claimActivationImpactTestContext(
		"/api/v1/admin/fansubs/21/historical-members/999/claim-activation-impact", "21", "999",
	)
	h.PreviewClaimActivation(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.previewCalls != 0 {
		t.Fatal("expected PreviewClaimActivationImpact to never be called for a not-found claim")
	}
}

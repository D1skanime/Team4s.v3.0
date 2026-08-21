package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

// Phase 137 Plan 07 -- Effective-Rights Inspection/Mutation/History handler
// tests. Locks the group-scoped HTTP contract and BOLA/IDOR behavior
// (137-07-PLAN.md Task 1) before the handler exists (RED).

// --- Test doubles ---

// effectiveRightsPermissionStub is a minimal fake for
// effectiveRightsPermissionService. allowedGroups gates CanForFansubGroup by
// fansub group id (simulating an actor authorized only for specific groups);
// resolutions maps fansubGroupID -> canned GroupRightsResolution keyed by the
// target actor's AppUserID so tests can assert exactly which target the
// handler resolved rights for.
type effectiveRightsPermissionStub struct {
	allowedGroups map[int64]bool
	resolutions   map[int64]map[int64]*permissions.GroupRightsResolution
	resolveErr    error
	canCalls      int
	resolveCalls  int
	lastResolveFor permissions.Actor
}

func (s *effectiveRightsPermissionStub) CanForFansubGroup(
	_ context.Context, _ permissions.Actor, _ permissions.Action, fansubGroupID int64,
) (permissions.Result, error) {
	s.canCalls++
	if s.allowedGroups[fansubGroupID] {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

func (s *effectiveRightsPermissionStub) ResolveGroupRights(
	_ context.Context, actor permissions.Actor, fansubGroupID int64,
) (*permissions.GroupRightsResolution, error) {
	s.resolveCalls++
	s.lastResolveFor = actor
	if s.resolveErr != nil {
		return nil, s.resolveErr
	}
	if byTarget, ok := s.resolutions[fansubGroupID]; ok {
		if resolution, ok := byTarget[actor.AppUserID]; ok {
			return resolution, nil
		}
	}
	return &permissions.GroupRightsResolution{
		Actor: actor, FansubGroupID: fansubGroupID, Rights: map[permissions.Action]permissions.CapabilityRightState{},
	}, nil
}

// effectiveRightsMutationStub is a minimal fake for
// effectiveRightsMutationService, capturing the last command it received.
type effectiveRightsMutationStub struct {
	result   *services.EffectiveRightsOverrideMutationResult
	err      error
	calls    int
	lastCmd  services.EffectiveRightsOverrideMutationCommand
}

func (s *effectiveRightsMutationStub) MutateOverride(
	_ context.Context, cmd services.EffectiveRightsOverrideMutationCommand,
) (*services.EffectiveRightsOverrideMutationResult, error) {
	s.calls++
	s.lastCmd = cmd
	if s.err != nil {
		return nil, s.err
	}
	return s.result, nil
}

// effectiveRightsTargetRepoStub is a minimal fake for effectiveRightsTargetRepo.
type effectiveRightsTargetRepoStub struct {
	memberships map[string]*repository.TargetMembership // key: "appUserID:groupID"
	history     map[string][]repository.UserGroupCapabilityOverrideHistoryEntry
	lockCalls   int
	historyCalls int
	lastHistoryTarget int64
	lastHistoryGroup  int64
}

func targetMembershipKey(appUserID, groupID int64) string {
	return fmt.Sprintf("%d:%d", appUserID, groupID)
}

func (s *effectiveRightsTargetRepoStub) LockTargetMembership(
	_ context.Context, appUserID int64, fansubGroupID int64,
) (*repository.TargetMembership, error) {
	s.lockCalls++
	if m, ok := s.memberships[targetMembershipKey(appUserID, fansubGroupID)]; ok {
		return m, nil
	}
	return nil, repository.ErrNotFound
}

func (s *effectiveRightsTargetRepoStub) ListHistoryForSubject(
	_ context.Context, appUserID int64, fansubGroupID int64, _ int, _ int,
) ([]repository.UserGroupCapabilityOverrideHistoryEntry, error) {
	s.historyCalls++
	s.lastHistoryTarget = appUserID
	s.lastHistoryGroup = fansubGroupID
	return s.history[targetMembershipKey(appUserID, fansubGroupID)], nil
}

// --- Test context helper ---

func effectiveRightsTestContext(method, target string, groupID string, appUserID string) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(method, target, nil)
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

func stubHandler(
	perm *effectiveRightsPermissionStub,
	mutation *effectiveRightsMutationStub,
	target *effectiveRightsTargetRepoStub,
	authz *stubCapabilityAuthzRepo,
	audit *captureAuditLogRepo,
) *AdminEffectiveRightsHandler {
	return NewAdminEffectiveRightsHandler(perm, mutation, target, authz, audit)
}

// --- Inspection tests ---

func TestGetEffectiveRightsReturnsCompleteProvenanceForAuthorizedActor(t *testing.T) {
	perm := &effectiveRightsPermissionStub{
		allowedGroups: map[int64]bool{21: true},
		resolutions: map[int64]map[int64]*permissions.GroupRightsResolution{
			21: {
				55: {
					Actor: permissions.Actor{AppUserID: 55}, FansubGroupID: 21, ActiveMembership: true,
					Rights: map[permissions.Action]permissions.CapabilityRightState{
						permissions.ActionFansubGroupMediaUpload: {
							ActionCode: permissions.ActionFansubGroupMediaUpload, Allowed: false,
							GrantingRoles: []string{"founder", "gfxler"}, UserDeny: true,
							DecisiveSource: permissions.ProvenanceUserDeny, ReasonCode: permissions.ReasonCodeUserDeny,
						},
					},
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
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, &effectiveRightsMutationStub{}, target, authz, audit)

	c, rec := effectiveRightsTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/55/effective-rights", "21", "55")
	h.GetEffectiveRights(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data []EffectiveRightState `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if len(response.Data) != 1 {
		t.Fatalf("expected 1 capability state, got %d", len(response.Data))
	}
	state := response.Data[0]
	if state.ActionCode != string(permissions.ActionFansubGroupMediaUpload) {
		t.Fatalf("unexpected action_code %q", state.ActionCode)
	}
	if state.Allowed {
		t.Fatal("expected allowed=false for a decisive user_deny")
	}
	if !state.UserDeny {
		t.Fatal("expected user_deny=true to remain visible")
	}
	if len(state.GrantingRoles) != 2 {
		t.Fatalf("expected 2 granting roles, got %v", state.GrantingRoles)
	}
	if string(state.DecisiveSource) != "user_deny" {
		t.Fatalf("expected decisive_source=user_deny, got %q", state.DecisiveSource)
	}
	if state.ReasonCode != permissions.ReasonCodeUserDeny {
		t.Fatalf("expected reason_code=%q, got %q", permissions.ReasonCodeUserDeny, state.ReasonCode)
	}
	if perm.resolveCalls != 1 {
		t.Fatalf("expected exactly 1 ResolveGroupRights call (single group resolution), got %d", perm.resolveCalls)
	}
	if perm.lastResolveFor.AppUserID != 55 {
		t.Fatalf("expected resolution requested for target 55, got %d", perm.lastResolveFor.AppUserID)
	}
}

func TestGetEffectiveRightsRejectsActorNotAuthorizedForTargetGroup(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, &effectiveRightsMutationStub{}, target, authz, audit)

	// Actor is authorized for group 21 only; requests group 22 (Cross-Group).
	c, rec := effectiveRightsTestContext(http.MethodGet, "/api/v1/admin/fansubs/22/app-members/55/effective-rights", "22", "55")
	h.GetEffectiveRights(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for cross-group inspection, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if target.lockCalls != 0 {
		t.Fatal("target membership must not be resolved before authorization succeeds")
	}
	if len(audit.entries) != 1 || audit.entries[0].Outcome != "denied" {
		t.Fatalf("expected 1 denied audit entry, got %v", audit.entries)
	}
}

func TestGetEffectiveRightsForeignTargetIsNeutralNotFound(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{memberships: map[string]*repository.TargetMembership{}}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, &effectiveRightsMutationStub{}, target, authz, audit)

	// Target 99 has no membership row for group 21 at all (foreign/manipulated id).
	c, rec := effectiveRightsTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/99/effective-rights", "21", "99")
	h.GetEffectiveRights(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected neutral 404 for foreign target, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if perm.resolveCalls != 0 {
		t.Fatal("resolver must not be invoked for a target with no membership row")
	}
}

// --- Mutation tests ---

func TestMutateOverrideRejectsBodyPathMismatchBeforeDomainMutation(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	// Path says group 21 / target 55, but body claims group 99 (manipulated).
	body := `{"group_id":99,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"deny","reason":{"category":"security_measure"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for body/path mismatch, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.calls != 0 {
		t.Fatal("mutation service must not be called when body/path mismatch is detected")
	}
}

func TestMutateOverrideSetAllowMapsToServiceKind(t *testing.T) {
	perm := &effectiveRightsPermissionStub{
		allowedGroups: map[int64]bool{21: true},
		resolutions: map[int64]map[int64]*permissions.GroupRightsResolution{
			21: {55: {Rights: map[permissions.Action]permissions.CapabilityRightState{
				"fansub_group_media.upload": {ActionCode: "fansub_group_media.upload", Allowed: true, DecisiveSource: permissions.ProvenanceUserAllow},
			}}},
		},
	}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"allow","reason":{"category":"task_delegation"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.calls != 1 {
		t.Fatalf("expected exactly 1 mutation call, got %d", mutation.calls)
	}
	if mutation.lastCmd.Kind != services.OverrideMutationSetAllow {
		t.Fatalf("expected SET ALLOW kind, got %q", mutation.lastCmd.Kind)
	}
	if mutation.lastCmd.TargetAppUserID != 55 || mutation.lastCmd.FansubGroupID != 21 {
		t.Fatalf("unexpected command scope: %+v", mutation.lastCmd)
	}
}

func TestMutateOverrideNullEffectMapsToRemoveKind(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":null,"reason":{"category":"other","text":"cleanup"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.lastCmd.Kind != services.OverrideMutationRemove {
		t.Fatalf("expected REMOVE kind for null effect, got %q", mutation.lastCmd.Kind)
	}
}

// TestMutateOverridePostCommitTargetLookupFailureDegradesToPending is GAP-01's
// core regression: mutationSvc.MutateOverride already succeeded (the write is
// committed), but the post-commit target-actor lookup fails because the
// target repo stub has no membership row for this (target, group) pair. The
// handler must still respond 200 with the mutation result correctly
// populated and ActivationStatus degraded to "pending" -- never 404.
func TestMutateOverridePostCommitTargetLookupFailureDegradesToPending(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{} // no membership row -> LockTargetMembership returns ErrNotFound
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"allow","reason":{"category":"task_delegation"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 even when post-commit target lookup fails, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data CapabilityOverrideMutationResult `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if !response.Data.Changed {
		t.Fatal("expected changed=true from the mutation result")
	}
	if response.Data.ActivationStatus != CapabilityActivationStatusPending {
		t.Fatalf("expected activation_status=pending, got %q", response.Data.ActivationStatus)
	}
	// GAP-02: the unconditional success audit must still have been written
	// even though the post-commit enrichment failed.
	if len(audit.entries) != 1 || audit.entries[0].Outcome != "allowed" {
		t.Fatalf("expected exactly 1 allowed audit entry even on enrichment failure, got %v", audit.entries)
	}
}

// TestMutateOverridePostCommitResolveFailureDegradesToPending is GAP-01's
// second failure mode: the target-actor lookup succeeds but the subsequent
// ResolveGroupRights call fails. The handler must still respond 200 with
// ActivationStatus "pending", never 500.
func TestMutateOverridePostCommitResolveFailureDegradesToPending(t *testing.T) {
	perm := &effectiveRightsPermissionStub{
		allowedGroups: map[int64]bool{21: true},
		resolveErr:    errors.New("resolve boom"),
	}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"allow","reason":{"category":"task_delegation"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 even when post-commit ResolveGroupRights fails, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data CapabilityOverrideMutationResult `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if response.Data.ActivationStatus != CapabilityActivationStatusPending {
		t.Fatalf("expected activation_status=pending, got %q", response.Data.ActivationStatus)
	}
	if len(audit.entries) != 1 || audit.entries[0].Outcome != "allowed" {
		t.Fatalf("expected exactly 1 allowed audit entry even on enrichment failure, got %v", audit.entries)
	}
}

// TestMutateOverrideWritesUnconditionalSuccessAudit proves the plain happy
// path (working post-commit enrichment) still writes exactly one generic
// audit entry with the expected event type and outcome.
func TestMutateOverrideWritesUnconditionalSuccessAudit(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"allow","reason":{"category":"task_delegation"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if len(audit.entries) != 1 {
		t.Fatalf("expected exactly 1 audit entry, got %d", len(audit.entries))
	}
	entry := audit.entries[0]
	if entry.EventType != "effective_rights.override.mutated" {
		t.Fatalf("unexpected event_type %q", entry.EventType)
	}
	if entry.Outcome != "allowed" {
		t.Fatalf("expected outcome=allowed, got %q", entry.Outcome)
	}
}

// TestMutateOverrideAuditsBodyPathMismatchReject proves the BOLA/IDOR-
// relevant body/path-mismatch guard (137-UAT.md GAP-02's one reject path that
// returns directly via c.JSON instead of through writeMutationError) now
// writes a rejected audit entry too, in addition to its unchanged 422
// response.
func TestMutateOverrideAuditsBodyPathMismatchReject(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{result: &services.EffectiveRightsOverrideMutationResult{Changed: true}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	// Path says group 21 / target 55, but body claims group 99 (manipulated).
	body := `{"group_id":99,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"deny","reason":{"category":"security_measure"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for body/path mismatch, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.calls != 0 {
		t.Fatal("mutation service must not be called when body/path mismatch is detected")
	}
	if len(audit.entries) != 1 {
		t.Fatalf("expected exactly 1 audit entry, got %d", len(audit.entries))
	}
	entry := audit.entries[0]
	if entry.Outcome != "rejected" {
		t.Fatalf("expected outcome=rejected, got %q", entry.Outcome)
	}
	if entry.ReasonCode == nil || *entry.ReasonCode != "body_path_mismatch" {
		t.Fatalf("expected reason_code=body_path_mismatch, got %v", entry.ReasonCode)
	}
}

// TestMutateOverrideAuditsRejectBranches proves each of the four
// previously-unaudited writeMutationError reject branches now writes exactly
// one rejected audit entry with a stable, distinguishing reason code
// (137-UAT.md GAP-02).
func TestMutateOverrideAuditsRejectBranches(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		reasonCode string
	}{
		{"target not active member", services.ErrEffectiveRightsTargetNotActiveMember, "target_not_active_member"},
		{"unknown action", services.ErrEffectiveRightsActionUnknown, "action_unknown"},
		{"action not overridable", services.ErrEffectiveRightsActionNotOverridable, "action_not_overridable"},
		{"reason required", services.ErrEffectiveRightsReasonRequired, "reason_required"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
			mutation := &effectiveRightsMutationStub{err: tc.err}
			target := &effectiveRightsTargetRepoStub{}
			authz := &stubCapabilityAuthzRepo{}
			audit := &captureAuditLogRepo{}
			h := stubHandler(perm, mutation, target, authz, audit)

			body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"deny","reason":{"category":"security_measure"}}`
			c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
			c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

			h.MutateOverride(c)

			if rec.Code != http.StatusUnprocessableEntity {
				t.Fatalf("expected 422, got %d (body: %s)", rec.Code, rec.Body.String())
			}
			if len(audit.entries) != 1 {
				t.Fatalf("expected exactly 1 audit entry, got %d", len(audit.entries))
			}
			entry := audit.entries[0]
			if entry.Outcome != "rejected" {
				t.Fatalf("expected outcome=rejected, got %q", entry.Outcome)
			}
			if entry.ReasonCode == nil || *entry.ReasonCode != tc.reasonCode {
				t.Fatalf("expected reason_code=%q, got %v", tc.reasonCode, entry.ReasonCode)
			}
		})
	}
}

func TestMutateOverrideMapsTargetNotActiveMemberTo422(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{err: services.ErrEffectiveRightsTargetNotActiveMember}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"deny","reason":{"category":"security_measure"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422 for inactive target membership, got %d (body: %s)", rec.Code, rec.Body.String())
	}
}

func TestMutateOverrideMapsUnknownActionAndNotOverridableTo422(t *testing.T) {
	cases := []error{services.ErrEffectiveRightsActionUnknown, services.ErrEffectiveRightsActionNotOverridable, services.ErrEffectiveRightsReasonRequired}
	for _, mutationErr := range cases {
		perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
		mutation := &effectiveRightsMutationStub{err: mutationErr}
		target := &effectiveRightsTargetRepoStub{}
		authz := &stubCapabilityAuthzRepo{}
		audit := &captureAuditLogRepo{}
		h := stubHandler(perm, mutation, target, authz, audit)

		body := `{"group_id":21,"target_user_id":55,"action_code":"unknown.action","effect":"deny"}`
		c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
		c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

		h.MutateOverride(c)

		if rec.Code != http.StatusUnprocessableEntity {
			t.Fatalf("error %v: expected 422, got %d (body: %s)", mutationErr, rec.Code, rec.Body.String())
		}
	}
}

func TestMutateOverrideDeniedCapabilityReturns403(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &effectiveRightsMutationStub{err: services.ErrEffectiveRightsCapabilityDenied}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, mutation, target, authz, audit)

	body := `{"group_id":21,"target_user_id":55,"action_code":"fansub_group_media.upload","effect":"deny","reason":{"category":"security_measure"}}`
	c, rec := effectiveRightsTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateOverride(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (body: %s)", rec.Code, rec.Body.String())
	}
}

// --- History tests ---

func TestListOverrideHistoryIsGroupScoped(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{
		history: map[string][]repository.UserGroupCapabilityOverrideHistoryEntry{
			targetMembershipKey(55, 21): {
				{ID: 1, AppUserID: 55, FansubGroupID: 21, ActionCode: "fansub_group_media.upload", ActorAppUserID: 900},
			},
		},
	}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, &effectiveRightsMutationStub{}, target, authz, audit)

	c, rec := effectiveRightsTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/55/capability-overrides/history", "21", "55")
	h.ListOverrideHistory(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if target.lastHistoryTarget != 55 || target.lastHistoryGroup != 21 {
		t.Fatalf("expected history scoped to (55,21), got (%d,%d)", target.lastHistoryTarget, target.lastHistoryGroup)
	}
	var response struct {
		Data []CapabilityOverrideAuditItem `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if len(response.Data) != 1 {
		t.Fatalf("expected 1 history item, got %d", len(response.Data))
	}
}

func TestListOverrideHistoryRejectsActorNotAuthorizedForTargetGroup(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, &effectiveRightsMutationStub{}, target, authz, audit)

	c, rec := effectiveRightsTestContext(http.MethodGet, "/api/v1/admin/fansubs/22/app-members/55/capability-overrides/history", "22", "55")
	h.ListOverrideHistory(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for cross-group history access, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if target.historyCalls != 0 {
		t.Fatal("history must not be read before authorization succeeds")
	}
}

func TestListOverrideHistoryForeignPairReturnsEmptyNotError(t *testing.T) {
	perm := &effectiveRightsPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &effectiveRightsTargetRepoStub{history: map[string][]repository.UserGroupCapabilityOverrideHistoryEntry{}}
	authz := &stubCapabilityAuthzRepo{}
	audit := &captureAuditLogRepo{}
	h := stubHandler(perm, &effectiveRightsMutationStub{}, target, authz, audit)

	c, rec := effectiveRightsTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/99/capability-overrides/history", "21", "99")
	h.ListOverrideHistory(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 with empty list for foreign pair, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data []CapabilityOverrideAuditItem `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	if len(response.Data) != 0 {
		t.Fatalf("expected empty history for foreign pair, got %d items", len(response.Data))
	}
}

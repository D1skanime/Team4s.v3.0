package handlers

import (
	"context"
	"encoding/json"
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

func TestReviewDelegationRowsUseFixedOrderAndEligibility(t *testing.T) {
	memberID := int64(5)
	rows := reviewDelegationRows(&repository.ReviewDelegationSnapshot{
		MembershipID: 9, FansubGroupID: 3, AppUserID: 7, MemberID: &memberID,
		MembershipStatus: "active", AppUserStatus: "active", HasVerifiedMemberClaim: true,
		GrantedActionCodes: []string{"review.contribution.decide", "review.image.decide"},
	})
	want := []string{"review.image.decide", "review.text.decide", "review.contribution.decide"}
	if len(rows) != len(want) { t.Fatalf("expected three rows, got %d", len(rows)) }
	for index, action := range want {
		if rows[index].ActionCode != action { t.Fatalf("row %d action = %q, want %q", index, rows[index].ActionCode, action) }
		if !rows[index].EligibleForGrant { t.Fatalf("row %d should be eligible", index) }
	}
	if !rows[0].Granted || rows[1].Granted || !rows[2].Granted { t.Fatalf("unexpected grants: %#v", rows) }
}

func TestReviewDelegationRowsRequireVerifiedActiveMembership(t *testing.T) {
	rows := reviewDelegationRows(&repository.ReviewDelegationSnapshot{MembershipID: 1, FansubGroupID: 1, AppUserID: 1, MembershipStatus: "active", AppUserStatus: "disabled", HasVerifiedMemberClaim: true})
	if rows[0].EligibleForGrant { t.Fatal("disabled account must not be eligible") }
}

// 260826-6vu -- HTTP-level stub tests for AdminReviewDelegationHandler, closing
// 140-VERIFICATION.md Gap 1 (no automated coverage for the auth gate, 404
// mapping, action_code validation, and grant/revoke dispatch).

// --- Test doubles ---

// reviewDelegationPermissionStub mirrors effectiveRightsPermissionStub's
// CanForFansubGroup gating convention.
type reviewDelegationPermissionStub struct {
	allowedGroups map[int64]bool
	canCalls      int
}

func (s *reviewDelegationPermissionStub) CanForFansubGroup(
	_ context.Context, _ permissions.Actor, _ permissions.Action, fansubGroupID int64,
) (permissions.Result, error) {
	s.canCalls++
	if s.allowedGroups[fansubGroupID] {
		return permissions.Result{Allowed: true, ReasonCode: permissions.ReasonAllowed}, nil
	}
	return permissions.Result{Allowed: false, ReasonCode: permissions.ReasonInsufficientRole}, nil
}

// reviewDelegationMutationStub captures the last GrantDelegation/RevokeDelegation
// command it received and separately counts each method's calls.
type reviewDelegationMutationStub struct {
	err         error
	grantCalls  int
	revokeCalls int
	lastCmd     services.ReviewDelegationCommand
}

func (s *reviewDelegationMutationStub) GrantDelegation(_ context.Context, cmd services.ReviewDelegationCommand) error {
	s.grantCalls++
	s.lastCmd = cmd
	return s.err
}

func (s *reviewDelegationMutationStub) RevokeDelegation(_ context.Context, cmd services.ReviewDelegationCommand) error {
	s.revokeCalls++
	s.lastCmd = cmd
	return s.err
}

// reviewDelegationTargetRepoStub mirrors effectiveRightsTargetRepoStub's
// LockTargetMembership convention, keyed via the shared targetMembershipKey helper.
type reviewDelegationTargetRepoStub struct {
	memberships map[string]*repository.TargetMembership
	lockCalls   int
}

func (s *reviewDelegationTargetRepoStub) LockTargetMembership(
	_ context.Context, appUserID int64, fansubGroupID int64,
) (*repository.TargetMembership, error) {
	s.lockCalls++
	if m, ok := s.memberships[targetMembershipKey(appUserID, fansubGroupID)]; ok {
		return m, nil
	}
	return nil, repository.ErrNotFound
}

// reviewDelegationReadRepoStub is a minimal fake for reviewDelegationReadRepo.
type reviewDelegationReadRepoStub struct {
	snapshots map[int64]*repository.ReviewDelegationSnapshot
	loadCalls int
	err       error
}

func (s *reviewDelegationReadRepoStub) LoadDelegationSnapshot(
	_ context.Context, membershipID int64,
) (*repository.ReviewDelegationSnapshot, error) {
	s.loadCalls++
	if s.err != nil {
		return nil, s.err
	}
	if snapshot, ok := s.snapshots[membershipID]; ok {
		return snapshot, nil
	}
	return nil, repository.ErrNotFound
}

// --- Test context helper ---

func reviewDelegationTestContext(method, target string, groupID string, appUserID string) (*gin.Context, *httptest.ResponseRecorder) {
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

// --- GetReviewDelegations tests ---

func TestGetReviewDelegationsRejectsActorNotAuthorizedForTargetGroup(t *testing.T) {
	perm := &reviewDelegationPermissionStub{}
	target := &reviewDelegationTargetRepoStub{}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, &reviewDelegationMutationStub{}, target, read, audit)

	c, rec := reviewDelegationTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	h.GetReviewDelegations(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if len(audit.entries) != 1 || audit.entries[0].Outcome != "denied" {
		t.Fatalf("expected 1 denied audit entry, got %v", audit.entries)
	}
}

func TestGetReviewDelegationsForeignTargetIsNeutralNotFound(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &reviewDelegationTargetRepoStub{memberships: map[string]*repository.TargetMembership{}}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, &reviewDelegationMutationStub{}, target, read, audit)

	c, rec := reviewDelegationTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/99/review-delegations", "21", "99")
	h.GetReviewDelegations(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected neutral 404, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if read.loadCalls != 0 {
		t.Fatal("LoadDelegationSnapshot must not be invoked before membership resolves")
	}
}

func TestGetReviewDelegationsReturnsFixedOrderRowsForAuthorizedExistingMembership(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	target := &reviewDelegationTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {MembershipID: 9, AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	read := &reviewDelegationReadRepoStub{
		snapshots: map[int64]*repository.ReviewDelegationSnapshot{
			9: {
				MembershipID: 9, FansubGroupID: 21, AppUserID: 55,
				MembershipStatus: "active", AppUserStatus: "active", HasVerifiedMemberClaim: true,
				GrantedActionCodes: []string{"review.image.decide"},
			},
		},
	}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, &reviewDelegationMutationStub{}, target, read, audit)

	c, rec := reviewDelegationTestContext(http.MethodGet, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	h.GetReviewDelegations(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	var response struct {
		Data []ReviewDelegationRow `json:"data"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
		t.Fatalf("body parse failed: %v", err)
	}
	want := []string{"review.image.decide", "review.text.decide", "review.contribution.decide"}
	if len(response.Data) != len(want) {
		t.Fatalf("expected %d rows, got %d", len(want), len(response.Data))
	}
	for index, action := range want {
		if response.Data[index].ActionCode != action {
			t.Fatalf("row %d action = %q, want %q", index, response.Data[index].ActionCode, action)
		}
	}
}

// --- MutateReviewDelegation tests ---

func TestMutateReviewDelegationGrantTrueUsesResolvedMembershipID(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{}
	target := &reviewDelegationTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {MembershipID: 77, AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"review.image.decide","grant":true}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.grantCalls != 1 {
		t.Fatalf("expected exactly 1 GrantDelegation call, got %d", mutation.grantCalls)
	}
	if mutation.revokeCalls != 0 {
		t.Fatalf("expected 0 RevokeDelegation calls, got %d", mutation.revokeCalls)
	}
	if mutation.lastCmd.TargetMembershipID != 77 {
		t.Fatalf("expected command to use resolved membership id 77, got %d", mutation.lastCmd.TargetMembershipID)
	}
	if mutation.lastCmd.Action != permissions.ActionReviewImageDecide {
		t.Fatalf("unexpected action %q", mutation.lastCmd.Action)
	}
}

func TestMutateReviewDelegationGrantFalseCallsRevokeOnly(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{}
	target := &reviewDelegationTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {MembershipID: 77, AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"review.image.decide","grant":false}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.revokeCalls != 1 {
		t.Fatalf("expected exactly 1 RevokeDelegation call, got %d", mutation.revokeCalls)
	}
	if mutation.grantCalls != 0 {
		t.Fatalf("expected 0 GrantDelegation calls, got %d", mutation.grantCalls)
	}
}

func TestMutateReviewDelegationRejectsActionOutsideCatalogBeforeTouchingState(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{}
	target := &reviewDelegationTargetRepoStub{}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"fansub_group.edit","grant":true}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if target.lockCalls != 0 {
		t.Fatal("membership must not be resolved for a non-delegable action_code")
	}
	if mutation.grantCalls != 0 || mutation.revokeCalls != 0 {
		t.Fatalf("mutation service must not be called, got grantCalls=%d revokeCalls=%d", mutation.grantCalls, mutation.revokeCalls)
	}
}

func TestMutateReviewDelegationRejectsMissingGrantField(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{}
	target := &reviewDelegationTargetRepoStub{}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"review.image.decide"}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing grant field, got %d (body: %s)", rec.Code, rec.Body.String())
	}
}

func TestMutateReviewDelegationCapabilityDeniedMapsTo403(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{err: services.ErrReviewCapabilityDenied}
	target := &reviewDelegationTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {MembershipID: 77, AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"review.image.decide","grant":true}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d (body: %s)", rec.Code, rec.Body.String())
	}
}

func TestMutateReviewDelegationTargetIneligibleMapsTo422(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{err: services.ErrReviewDelegationTargetIneligible}
	target := &reviewDelegationTargetRepoStub{
		memberships: map[string]*repository.TargetMembership{
			targetMembershipKey(55, 21): {MembershipID: 77, AppUserID: 55, FansubGroupID: 21, Status: "active", AppUserStatus: "active"},
		},
	}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"review.image.decide","grant":true}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/55/review-delegations", "21", "55")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d (body: %s)", rec.Code, rec.Body.String())
	}
}

func TestMutateReviewDelegationForeignTargetIsNeutralNotFound(t *testing.T) {
	perm := &reviewDelegationPermissionStub{allowedGroups: map[int64]bool{21: true}}
	mutation := &reviewDelegationMutationStub{}
	target := &reviewDelegationTargetRepoStub{memberships: map[string]*repository.TargetMembership{}}
	read := &reviewDelegationReadRepoStub{}
	audit := &captureAuditLogRepo{}
	h := NewAdminReviewDelegationHandler(perm, mutation, target, read, audit)

	body := `{"action_code":"review.image.decide","grant":true}`
	c, rec := reviewDelegationTestContext(http.MethodPut, "/api/v1/admin/fansubs/21/app-members/99/review-delegations", "21", "99")
	c.Request = httptest.NewRequest(http.MethodPut, c.Request.URL.String(), strings.NewReader(body))

	h.MutateReviewDelegation(c)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected neutral 404, got %d (body: %s)", rec.Code, rec.Body.String())
	}
	if mutation.grantCalls != 0 || mutation.revokeCalls != 0 {
		t.Fatalf("mutation service must not be called for a foreign target, got grantCalls=%d revokeCalls=%d", mutation.grantCalls, mutation.revokeCalls)
	}
}
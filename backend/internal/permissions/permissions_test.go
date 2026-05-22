package permissions

import (
	"context"
	"testing"
)

type resolverStub struct {
	context *Context
	roles   map[int64][]string
}

func (s resolverStub) ResolveFansubGroup(_ context.Context, _ int64) (*Context, error) {
	return s.context, nil
}

func (s resolverStub) ResolveRelease(_ context.Context, _ int64) (*Context, error) {
	return s.context, nil
}

func (s resolverStub) ResolveReleaseVersion(_ context.Context, _ int64) (*Context, error) {
	return s.context, nil
}

func (s resolverStub) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*Context, error) {
	return s.context, nil
}

func (s resolverStub) ListActorGroupRoles(_ context.Context, _ int64, fansubGroupID int64) ([]string, error) {
	return s.roles[fansubGroupID], nil
}

func TestCanForFansubGroupAllowsFansubLead(t *testing.T) {
	service := NewService(resolverStub{
		context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}},
		roles:   map[int64][]string{88: {RoleFansubLead}},
	})

	result, err := service.CanForFansubGroup(context.Background(), Actor{AppUserID: 10, Status: "active"}, ActionFansubGroupMembersManage, 88)
	if err != nil {
		t.Fatalf("can for fansub group: %v", err)
	}
	if !result.Allowed {
		t.Fatalf("expected permission to be allowed, got %+v", result)
	}
	if result.MatchedRole != RoleFansubLead {
		t.Fatalf("expected matched role %q, got %q", RoleFansubLead, result.MatchedRole)
	}
}

func TestCanForReleaseVersionMediaDeleteOwnAllowsDesignerOwnerOnly(t *testing.T) {
	ownerID := int64(12)
	service := NewService(resolverStub{
		context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}, OwnerAppUserID: &ownerID},
		roles:   map[int64][]string{88: {RoleDesigner}},
	})

	allowed, err := service.CanForReleaseVersionMediaDelete(context.Background(), Actor{AppUserID: 12, Status: "active"}, 99)
	if err != nil {
		t.Fatalf("delete own allowed: %v", err)
	}
	if !allowed.Allowed {
		t.Fatalf("expected owner delete_own permission, got %+v", allowed)
	}

	denied, err := service.CanForReleaseVersionMediaDelete(context.Background(), Actor{AppUserID: 77, Status: "active"}, 99)
	if err != nil {
		t.Fatalf("delete own denied: %v", err)
	}
	if denied.Allowed {
		t.Fatalf("expected non-owner delete to be denied")
	}
	if denied.ReasonCode != ReasonOwnerMismatch {
		t.Fatalf("expected owner mismatch, got %+v", denied)
	}
}

func TestCanForReleaseVersionDeniesDisabledUser(t *testing.T) {
	service := NewService(resolverStub{
		context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}},
		roles:   map[int64][]string{88: {RoleFansubLead}},
	})

	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 12, Status: "disabled"}, ActionReleaseVersionView, 99)
	if err != nil {
		t.Fatalf("disabled user check: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected disabled user to be denied")
	}
	if result.ReasonCode != ReasonDisabledUser {
		t.Fatalf("expected disabled reason, got %+v", result)
	}
}

func TestRoleAllowsActionDifferentiatesManagerRoles(t *testing.T) {
	if !RoleAllowsAction(RoleFansubLead, ActionFansubGroupMembersManage) {
		t.Fatal("expected fansub lead to manage members")
	}
	if RoleAllowsAction(RoleProjectLead, ActionFansubGroupMembersManage) {
		t.Fatal("expected project lead to not manage members")
	}
	if RoleAllowsAction(RoleDesigner, ActionFansubGroupMembersManage) {
		t.Fatal("expected designer to not manage members")
	}
}

func TestCanForFansubGroupDeniesWhenNoActiveMembershipRolesRemain(t *testing.T) {
	service := NewService(resolverStub{
		context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}},
		roles:   map[int64][]string{},
	})

	result, err := service.CanForFansubGroup(context.Background(), Actor{AppUserID: 12, Status: "active"}, ActionFansubGroupMembersView, 88)
	if err != nil {
		t.Fatalf("can for fansub group: %v", err)
	}
	if result.Allowed {
		t.Fatalf("expected access to be denied when no active membership roles remain")
	}
	if result.ReasonCode != ReasonNoMembership {
		t.Fatalf("expected no_membership, got %+v", result)
	}
}

package permissions

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

func (s resolverStub) ListActorContributionRolesForVersion(_ context.Context, _ int64, _ int64) ([]string, error) {
	return nil, nil
}

type phase107ReviewResolverStub struct {
	resolverStub
	reviewContext      *ReviewGrantContext
	reviewContextCalls int
}

func (s *phase107ReviewResolverStub) ResolveActorReviewGrantContext(
	_ context.Context,
	appUserID int64,
	fansubGroupID int64,
) (*ReviewGrantContext, error) {
	s.reviewContextCalls++
	if s.reviewContext == nil ||
		s.reviewContext.AppUserID != appUserID ||
		s.reviewContext.FansubGroupID != fansubGroupID {
		return nil, nil
	}
	return s.reviewContext, nil
}

// ResolveActorGroupMembership mirrors the real DB fact this fixture already
// encodes: ResolveActorReviewGrantContext (Phase 107) only ever returns a
// non-nil context for a verified, active membership, so a configured
// reviewContext for this exact (appUserID, fansubGroupID) is itself proof of
// active membership -- independent of whether the actor holds any group
// role. Without this method, ResolveGroupRights' fallback derives
// ActiveMembership from len(roles)>0 alone, which under-serves the
// zero-role, pure-review-delegation fixtures below (Plan 137-05).
func (s *phase107ReviewResolverStub) ResolveActorGroupMembership(
	_ context.Context,
	appUserID int64,
	fansubGroupID int64,
) (*GroupMembershipState, error) {
	if s.reviewContext == nil || s.reviewContext.AppUserID != appUserID || s.reviewContext.FansubGroupID != fansubGroupID {
		return &GroupMembershipState{ActiveMembership: false}, nil
	}
	return &GroupMembershipState{ActiveMembership: true}, nil
}

func TestPhase107ReviewActionsAreIndependentForFansubLead(t *testing.T) {
	for _, action := range []Action{
		ActionReviewTextDecide,
		ActionReviewImageDecide,
		ActionReviewContributionDecide,
	} {
		t.Run(string(action), func(t *testing.T) {
			resolver := &phase107ReviewResolverStub{
				resolverStub: resolverStub{
					context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}},
					roles:   map[int64][]string{88: {RoleFansubLead}},
				},
				reviewContext: &ReviewGrantContext{
					MembershipID:  700,
					AppUserID:     10,
					MemberID:      701,
					FansubGroupID: 88,
				},
			}
			service := NewService(resolver)

			result, err := service.CanReviewForFansubGroup(
				context.Background(),
				Actor{AppUserID: 10, Status: "active"},
				action,
				88,
			)

			require.NoError(t, err)
			assert.True(t, result.Allowed)
			assert.Equal(t, RoleFansubLead, result.MatchedRole)
			assert.EqualValues(t, 700, result.MembershipID)
			assert.EqualValues(t, 701, result.MemberID)
			// Plan 137-05: CanReviewForFansubGroup now calls
			// ResolveActorReviewGrantContext twice -- once directly, for the
			// verified-membership/MembershipID/MemberID facts the legacy
			// ReviewAuthorizationResult shape still needs, and once more inside
			// ResolveGroupRights' specialized-grant provider (review_grant_provider.go),
			// which independently re-derives its own grants for the central resolver.
			// This is a deliberate, documented consequence of routing the decision
			// through the single central resolver rather than a bug (see
			// 137-05-SUMMARY.md deviations).
			assert.Equal(t, 2, resolver.reviewContextCalls)
		})
	}
}

func TestPhase107DirectGrantAllowsOnlyExactReviewAction(t *testing.T) {
	resolver := &phase107ReviewResolverStub{
		resolverStub: resolverStub{
			context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}},
			roles:   map[int64][]string{88: {}},
		},
		reviewContext: &ReviewGrantContext{
			MembershipID:  700,
			AppUserID:     10,
			MemberID:      701,
			FansubGroupID: 88,
			GrantedActions: []Action{
				ActionReviewTextDecide,
			},
		},
	}
	service := NewService(resolver)
	actor := Actor{AppUserID: 10, Status: "active"}

	textResult, err := service.CanForFansubGroup(context.Background(), actor, ActionReviewTextDecide, 88)
	require.NoError(t, err)
	assert.True(t, textResult.Allowed)

	for _, action := range []Action{
		ActionReviewImageDecide,
		ActionReviewContributionDecide,
	} {
		result, err := service.CanForFansubGroup(context.Background(), actor, action, 88)
		require.NoError(t, err)
		assert.False(t, result.Allowed, "%s must require its own direct grant", action)
	}

	manageResult, err := service.CanForFansubGroup(
		context.Background(),
		actor,
		ActionFansubGroupMembersManage,
		88,
	)
	require.NoError(t, err)
	assert.False(t, manageResult.Allowed, "review grants must never imply delegation rights")
}

func TestPhase107PlatformAdminReviewActionsNeedNoMemberContext(t *testing.T) {
	service := NewService(resolverStub{})
	actor := Actor{AppUserID: 10, Status: "active", IsPlatformAdmin: true}

	for _, action := range []Action{
		ActionReviewTextDecide,
		ActionReviewImageDecide,
		ActionReviewContributionDecide,
	} {
		result, err := service.CanReviewForFansubGroup(context.Background(), actor, action, 88)
		require.NoError(t, err)
		assert.True(t, result.Allowed)
		assert.Equal(t, ReasonPlatformAdmin, result.ReasonCode)
		assert.Zero(t, result.MembershipID)
		assert.Zero(t, result.MemberID)
	}
}

func TestPhase107ResolverCompatibilityForNonReviewActions(t *testing.T) {
	var unchanged Resolver = resolverStub{
		context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{88}},
		roles:   map[int64][]string{88: {RoleFansubLead}},
	}
	service := NewService(unchanged)

	result, err := service.CanForFansubGroup(
		context.Background(),
		Actor{AppUserID: 10, Status: "active"},
		ActionFansubGroupMembersManage,
		88,
	)
	require.NoError(t, err)
	assert.True(t, result.Allowed)

	reviewResult, err := service.CanForFansubGroup(
		context.Background(),
		Actor{AppUserID: 10, Status: "active"},
		ActionReviewTextDecide,
		88,
	)
	require.NoError(t, err)
	assert.False(t, reviewResult.Allowed, "review actions fail closed without ReviewContextResolver")
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
	if !RoleAllowsAction(RoleFansubLead, ActionFansubGroupHistoricalMembersManage) {
		t.Fatal("expected fansub lead to manage historical members")
	}
	if !RoleAllowsAction(RoleFansubLead, ActionFansubGroupHistoricalRolesManage) {
		t.Fatal("expected fansub lead to manage historical roles")
	}
	if !RoleAllowsAction(RoleFansubLead, ActionFansubGroupHistoricalMembersLink) {
		t.Fatal("expected fansub lead to link historical members")
	}
	if RoleAllowsAction(RoleProjectLead, ActionFansubGroupMembersManage) {
		t.Fatal("expected project lead to not manage members")
	}
	if RoleAllowsAction(RoleProjectLead, ActionFansubGroupHistoricalMembersManage) {
		t.Fatal("expected project lead to not manage historical members")
	}
	if RoleAllowsAction(RoleDesigner, ActionFansubGroupMembersManage) {
		t.Fatal("expected designer to not manage members")
	}
	if RoleAllowsAction(RoleRawProvider, ActionFansubGroupHistoricalMembersManage) {
		t.Fatal("expected historical/contribution role to not manage historical members")
	}
}

func TestRoleAllowsActionGrantsEncoderReleaseVersionWorkspace(t *testing.T) {
	expected := []Action{
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDeleteOwn,
		ActionReleaseVersionNotesWrite,
	}

	for _, action := range expected {
		if !RoleAllowsAction(RoleEncoder, action) {
			t.Fatalf("expected encoder to allow %s", action)
		}
	}

	if RoleAllowsAction(RoleEncoder, ActionReleaseVersionMediaDelete) {
		t.Fatal("expected encoder to not delete media from other members")
	}
	if RoleAllowsAction(RoleEncoder, ActionFansubGroupMembersManage) {
		t.Fatal("expected encoder to not manage group members")
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

// mockResolverV83 ist ein erweiterter Test-Resolver für die Wave-0-Tests (Plan 83-01).
// Er liefert Rollen nach appUserID (nicht fansubGroupID) und enthält einen Stub für
// ListActorContributionRolesForVersion, die in Plan 83-02 dem Resolver-Interface hinzugefügt wird.
type mockResolverV83 struct {
	// groupRolesByUser: appUserID → []string (Rollen aus fansub_group_member_roles)
	groupRolesByUser map[int64][]string
	// contributionRolesByUser: appUserID → []string (role_codes aus anime_contributions)
	contributionRolesByUser map[int64][]string
}

func (m mockResolverV83) ResolveFansubGroup(_ context.Context, _ int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{1}}, nil
}

func (m mockResolverV83) ResolveRelease(_ context.Context, _ int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{1}}, nil
}

func (m mockResolverV83) ResolveReleaseVersion(_ context.Context, versionID int64) (*Context, error) {
	if versionID == 42 {
		return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{1}}, nil
	}
	return nil, nil
}

func (m mockResolverV83) ResolveReleaseVersionMedia(_ context.Context, _ int64) (*Context, error) {
	return &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{1}}, nil
}

func (m mockResolverV83) ListActorGroupRoles(_ context.Context, appUserID int64, _ int64) ([]string, error) {
	return m.groupRolesByUser[appUserID], nil
}

// ListActorContributionRolesForVersion ist ein Stub für die Methode, die in Plan 83-02
// dem Resolver-Interface hinzugefügt wird (D-02). Solange das Interface die Methode noch
// nicht enthält, kompiliert dieser Mock, aber CanForReleaseVersion ruft sie nicht auf.
func (m mockResolverV83) ListActorContributionRolesForVersion(_ context.Context, appUserID int64, _ int64) ([]string, error) {
	return m.contributionRolesByUser[appUserID], nil
}

// TestCanForReleaseVersionContributionRequired prüft D-01/D-04:
// Ein Actor ohne Leader-Rolle und ohne Contribution für die Release-Version wird abgelehnt.
func TestCanForReleaseVersionContributionRequired(t *testing.T) {
	// appUserID=3 hat weder fansub_lead noch project_lead und keine Contribution für versionID=42
	mock := mockResolverV83{
		groupRolesByUser:        map[int64][]string{3: {"member"}},
		contributionRolesByUser: map[int64][]string{},
	}
	service := NewService(mock)

	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 3, Status: "active"}, ActionReleaseVersionNotesWrite, 42)
	if err != nil {
		t.Fatalf("CanForReleaseVersion: %v", err)
	}
	assert.False(t, result.Allowed, "erwartet: kein Zugriff ohne Contribution (D-04)")
	assert.True(t,
		result.ReasonCode == ReasonNoMembership || result.ReasonCode == ReasonInsufficientRole,
		"erwartet: ReasonNoMembership oder ReasonInsufficientRole, got %q", result.ReasonCode,
	)
}

// TestCanForReleaseVersionLeaderBypass prüft D-05 (fansub_lead):
// fansub_lead darf trotz fehlender Contribution auf eine Release-Version zugreifen.
func TestCanForReleaseVersionLeaderBypass(t *testing.T) {
	// appUserID=99 hat fansub_lead, aber keine Contribution für versionID=42
	mock := mockResolverV83{
		groupRolesByUser:        map[int64][]string{99: {RoleFansubLead}},
		contributionRolesByUser: map[int64][]string{},
	}
	service := NewService(mock)

	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 99, Status: "active"}, ActionReleaseVersionMediaUpload, 42)
	if err != nil {
		t.Fatalf("CanForReleaseVersion fansub_lead: %v", err)
	}
	assert.True(t, result.Allowed, "erwartet: fansub_lead hat Zugriff trotz fehlender Contribution (D-05)")
}

func TestCanForReleaseVersionAllowsCollaborativeGroupRole(t *testing.T) {
	service := NewService(resolverStub{
		context: &Context{ScopeType: ScopeTypeGroup, FansubGroupIDs: []int64{3, 4}},
		roles: map[int64][]string{
			3: {RoleTimer},
		},
	})

	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 3, Status: "active"}, ActionReleaseVersionSegmentsManage, 1)
	if err != nil {
		t.Fatalf("CanForReleaseVersion group role: %v", err)
	}

	assert.True(t, result.Allowed, "expected timer group role to manage segments for a collaborative release version")
	assert.Equal(t, RoleTimer, result.MatchedRole)
	assert.Equal(t, "group:3", result.MatchedScope)
}

// TestCanForReleaseVersionProjectLeadBypass prüft D-05 (project_lead):
// project_lead darf trotz fehlender Contribution auf eine Release-Version zugreifen.
// project_lead wird in fansub_group_member_roles.role gespeichert — gleicher Abfragepfad wie fansub_lead.
func TestCanForReleaseVersionProjectLeadBypass(t *testing.T) {
	// appUserID=98 hat project_lead (aus ListActorGroupRoles, via fansub_group_member_roles),
	// aber keine Contribution für versionID=42
	mock := mockResolverV83{
		groupRolesByUser:        map[int64][]string{98: {RoleProjectLead}},
		contributionRolesByUser: map[int64][]string{},
	}
	service := NewService(mock)

	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 98, Status: "active"}, ActionReleaseVersionMediaUpload, 42)
	if err != nil {
		t.Fatalf("CanForReleaseVersion project_lead: %v", err)
	}
	assert.True(t, result.Allowed, "erwartet: project_lead hat Zugriff trotz fehlender Contribution (D-05)")
}

// TestCanForReleaseVersionWithContribution prüft D-01/D-02:
// Ein Actor mit einer passenden Contribution-Rolle für die Release-Version erhält Zugriff.
func TestCanForReleaseVersionWithContribution(t *testing.T) {
	// appUserID=2 hat translator-Contribution für versionID=42
	mock := mockResolverV83{
		groupRolesByUser:        map[int64][]string{},
		contributionRolesByUser: map[int64][]string{2: {"translator"}},
	}
	service := NewService(mock)

	// ActionReleaseVersionNotesWrite ist für translator in roleMatrix vorhanden
	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 2, Status: "active"}, ActionReleaseVersionNotesWrite, 42)
	if err != nil {
		t.Fatalf("CanForReleaseVersion with contribution: %v", err)
	}
	assert.True(t, result.Allowed, "erwartet: translator-Contribution erlaubt ActionReleaseVersionNotesWrite (D-01)")
}

// TestCanForReleaseVersionAbsenceInOverride prüft D-03:
// Wenn für eine Release-Version ein versions-spezifischer Override-Satz existiert,
// aber der Actor nicht darin enthalten ist, wird der Zugriff verweigert.
func TestCanForReleaseVersionAbsenceInOverride(t *testing.T) {
	// appUserID=3 hat keine Leader-Rolle und keine Contribution für versionID=42.
	// Modelliert: Override-Satz für Version 42 existiert, Actor 3 ist nicht darin.
	mock := mockResolverV83{
		groupRolesByUser:        map[int64][]string{},
		contributionRolesByUser: map[int64][]string{},
	}
	service := NewService(mock)

	result, err := service.CanForReleaseVersion(context.Background(), Actor{AppUserID: 3, Status: "active"}, ActionReleaseVersionNotesWrite, 42)
	if err != nil {
		t.Fatalf("CanForReleaseVersion absence in override: %v", err)
	}
	assert.False(t, result.Allowed, "erwartet: kein Zugriff wenn Actor nicht im Override-Satz (D-03)")
}

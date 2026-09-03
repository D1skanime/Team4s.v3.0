package permissions

// Phase 137 — Central Effective-Rights Resolver (137-CONTEXT.md D01-D05).
//
// GroupRightsResolution/ResolveGroupRights is the single, provenance-capable, group-wide
// decision primitive for one actor + fansub group. It batch-loads membership, role
// grants, per-user allow/deny overrides and specialized (non-role) grants -- at most one
// round trip per source category -- and evaluates every canonical action in memory. There
// is no per-capability SQL query. Can()-style enforcement checks and the future
// Effective-Rights Inspection API are both meant to become projections of this same
// resolution rather than a second, independently-computed decision path (137-05/137-07).
//
// Precedence (D01), evaluated per action:
//
//	platform_admin > disabled_actor > no_active_membership > user_deny > user_allow >
//	membership_baseline > role_grant > specialized_grant > no_grant
//
// Dormant overrides (D02): a stored user_allow/user_deny row always remains visible on the
// resulting CapabilityRightState even when a higher-precedence source (disabled actor, no
// active membership) determines the effective result -- it is only ever *effective* while
// ActiveMembership is true.
//
// Production wiring closed (Plan 137-05): *repository.AuthzRepository implements both
// GroupRightsMembershipResolver and GroupRightsOverridesResolver via
// ResolveActorGroupMembership/ResolveActorUserOverrides, proven against real Postgres by
// TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces, and this concrete
// repository is wired into permissions.NewService in production (main.go). Real per-user
// override enforcement is live end-to-end. Review Delegation is wired the same way:
// ReviewContextResolver is the specialized-grant seam (review_grant_provider.go), fully
// wired in production.
//
// The Go DTO consumed by the admin HTTP layer (backend/internal/handlers/
// capability_policy_contract.go's EffectiveRightState) also carries this additive shape
// (granting_roles, user_allow, user_deny, specialized_grants, decisive_source, reason_code),
// closed in Plan 137-02/137-07.

import (
	"context"
	"sort"
	"strings"
)

// Decisive-source / provenance vocabulary produced by ResolveGroupRights. These string
// values are chosen to match the additive EffectiveRightProvenance enum shipped in Plan
// 137-02 (shared/contracts/admin-capabilities.yaml, openapi.yaml, admin-capability.ts):
// idp_global_role is not produced by this group-scoped resolver.
const (
	ProvenancePlatformAdmin      = "platform_admin"
	ProvenanceGroupRole          = "group_role"
	ProvenanceMembershipBaseline = "membership_baseline"
	ProvenanceUserAllow          = "user_allow"
	ProvenanceUserDeny           = "user_deny"
	ProvenanceSpecializedGrant   = "specialized_grant"
	ProvenanceNoGrant            = "no_grant"
)

// Fine-grained machine reason codes (D04: "reason_code must be machine-readable"). The
// platform_admin/disabled_user/no_membership reasons intentionally reuse the existing
// Reason* string values declared in permissions.go so this resolver's per-action
// ReasonCode stays consistent with the legacy Result.ReasonCode vocabulary wherever the
// two concepts coincide; the remaining values are new and specific to this resolver.
const (
	ReasonCodeGroupRole          = "group_role"
	ReasonCodeMembershipBaseline = "membership_baseline"
	ReasonCodeUserAllow          = "user_allow"
	ReasonCodeUserDeny           = "user_deny"
	ReasonCodeSpecializedGrant   = "specialized_grant"
	ReasonCodeNoGrant            = "no_grant"
)

// IsMembershipBaselineAction reports whether an action belongs to the active-membership
// baseline. Phase 145: the source of truth is the loaded role_capabilities cache entry for
// the reserved RoleMembershipBaseline pseudo-role (group_member), not a hardcoded Go slice
// -- see permissions.go's validateMembershipBaselineRegistryPresence for the fail-closed
// startup guarantee that this cache entry always carries the expected 3 actions.
func IsMembershipBaselineAction(action Action) bool {
	return roleAllows(RoleMembershipBaseline, action)
}

// UserCapabilityOverride is one stored personal allow/deny row for one (actor,
// fansubGroupID) pair, mirroring AuthzUserOverridesRepository.UserGroupCapabilityOverride's
// shape without importing the repository package from permissions (kept dependency-free).
type UserCapabilityOverride struct {
	ActionCode Action
	Effect     string // "allow" | "deny"
}

// GroupMembershipState is the batch-loaded membership fact this resolver needs to
// implement D02's dormant-override model: a stored override remains visible as data but is
// only ever effective while ActiveMembership is true. ListActorGroupRoles alone cannot
// prove this -- it only ever returns roles for an active membership, so an active member
// with zero assigned roles is indistinguishable from "no membership" through roles alone.
type GroupMembershipState struct {
	ActiveMembership bool
}

// GroupRightsMembershipResolver is an optional Resolver capability (mirrors the existing
// ReviewContextResolver pattern already used by CanReviewForFansubGroup) that lets
// ResolveGroupRights ask for the real active-membership signal in one batched call. A
// Resolver implementation that does not support it is not an error -- ResolveGroupRights
// falls back to inferring active membership from a non-empty role set instead.
type GroupRightsMembershipResolver interface {
	ResolveActorGroupMembership(ctx context.Context, appUserID int64, fansubGroupID int64) (*GroupMembershipState, error)
}

// GroupRightsOverridesResolver is an optional Resolver capability exposing the current
// user-override rows for one (actor, fansubGroupID) pair in a single batched call. A
// Resolver implementation that does not support it simply contributes zero overrides.
type GroupRightsOverridesResolver interface {
	ResolveActorUserOverrides(ctx context.Context, appUserID int64, fansubGroupID int64) ([]UserCapabilityOverride, error)
}

// SpecializedGrant is one non-role ALLOW-only grant contributed by a
// SpecializedGrantProvider (D05), e.g. a review delegation. Source is a stable machine
// identifier such as "review_delegation" -- never a human-facing string.
type SpecializedGrant struct {
	Action Action
	Source string
}

// SpecializedGrantProvider contributes grants for one (actor, fansubGroupID) pair that are
// not plain role assignments. Review Delegation is the first implementer
// (review_grant_provider.go); the central resolver stays open to future specialized
// sources without becoming a collection of domain-specific branches (D05). A provider only
// ever contributes ALLOW-shaped facts -- it never itself makes the DENY decision, and a
// User-Deny in the central resolver still wins over anything a provider returns.
type SpecializedGrantProvider interface {
	Source() string
	ResolveGroupGrants(ctx context.Context, actorAppUserID int64, fansubGroupID int64) ([]SpecializedGrant, error)
}

// CapabilityRightState is the per-action projection of a GroupRightsResolution. Its field
// set mirrors D04's minimum conceptual provenance data field-for-field so a later
// Phase-137 plan can serialize it directly into the additive EffectiveRightState contract
// (Plan 137-02) without inventing a second shape.
type CapabilityRightState struct {
	ActionCode        Action
	Allowed           bool
	GrantingRoles     []string
	UserAllow         bool
	UserDeny          bool
	SpecializedGrants []string
	DecisiveSource    string
	NonDeniable       bool
	ReasonCode        string
}

// GroupRightsResolution is the single, provenance-capable, group-wide decision result for
// one actor + fansub group (D03/D04). Can()-style checks and the future Inspection API are
// both meant to become projections of this same in-memory structure -- never a second
// computation.
type GroupRightsResolution struct {
	Actor            Actor
	FansubGroupID    int64
	PlatformAdmin    bool
	ActorDisabled    bool
	ActiveMembership bool
	Rights           map[Action]CapabilityRightState
}

// Can returns the resolved state for one action. Actions this resolution never evaluated
// deny closed with ReasonCodeNoGrant rather than panicking on a missing map entry.
func (res *GroupRightsResolution) Can(action Action) CapabilityRightState {
	if res == nil {
		return CapabilityRightState{ActionCode: action, DecisiveSource: ProvenanceNoGrant, ReasonCode: ReasonCodeNoGrant}
	}
	if state, ok := res.Rights[action]; ok {
		return state
	}
	return CapabilityRightState{ActionCode: action, DecisiveSource: ProvenanceNoGrant, ReasonCode: ReasonCodeNoGrant}
}

// groupRightsSources is the fully batch-loaded, already-in-memory input to the pure
// precedence evaluator. Loading these categories from Postgres is ResolveGroupRights' job;
// evaluateGroupRights itself never touches the database, which is what makes it
// exhaustively unit-testable against fixtures.
type groupRightsSources struct {
	ActiveMembership  bool
	Roles             []string
	Overrides         []UserCapabilityOverride
	SpecializedGrants []SpecializedGrant
}

// ResolveGroupRights is the single, provenance-capable, group-wide decision primitive for
// one actor + fansub group (D03). It batch-loads membership, role grants, user overrides
// and specialized grants in at most one round trip per category, then evaluates every
// canonical action in memory -- there is no per-capability SQL query.
func (s *Service) ResolveGroupRights(ctx context.Context, actor Actor, fansubGroupID int64) (*GroupRightsResolution, error) {
	if s == nil || s.resolver == nil {
		return denyAllGroupRights(actor, fansubGroupID, ReasonUnauthorized), nil
	}
	if actor.AppUserID <= 0 {
		return denyAllGroupRights(actor, fansubGroupID, ReasonUnauthorized), nil
	}
	if fansubGroupID <= 0 {
		return denyAllGroupRights(actor, fansubGroupID, ReasonResourceNotFound), nil
	}

	sources, fastPath, err := s.loadGroupRightsSources(ctx, actor, fansubGroupID)
	if err != nil {
		return nil, err
	}
	if fastPath {
		return evaluateGroupRights(actor, fansubGroupID, groupRightsSources{}, allKnownActions), nil
	}
	return evaluateGroupRights(actor, fansubGroupID, sources, allKnownActions), nil
}

// loadGroupRightsSources batch-loads membership, role grants, user overrides and
// specialized grants in at most one round trip per category (extracted from
// ResolveGroupRights, Plan 138-04, behavior-preserving). The returned bool signals
// "fast-path taken" -- true means actor is a platform admin or disabled, sources is an
// empty groupRightsSources{}, and the caller must evaluate with that EMPTY source set,
// exactly matching the pre-extraction fast-path branch; false means sources is the real
// batch-loaded input for evaluateGroupRights. Callers other than ResolveGroupRights (e.g.
// Plan 138-04's PreviewGroupRightsWithRoleChange) MUST still perform their own guard checks
// (nil service/resolver, actor.AppUserID <= 0, fansubGroupID <= 0) before calling this --
// those pre-condition guards intentionally stay outside this method since they resolve to a
// denyAllGroupRights reason code, not the platform-admin/disabled evaluateGroupRights path.
func (s *Service) loadGroupRightsSources(ctx context.Context, actor Actor, fansubGroupID int64) (groupRightsSources, bool, error) {
	// Platform admin and disabled actor are unconditionally decisive per D01 -- no source
	// batch-load is needed to compute the answer for either, so skip the round trips.
	if actor.IsPlatformAdmin || strings.TrimSpace(actor.Status) == "disabled" {
		return groupRightsSources{}, true, nil
	}

	var sources groupRightsSources

	roles, err := s.resolver.ListActorGroupRoles(ctx, actor.AppUserID, fansubGroupID)
	if err != nil {
		return groupRightsSources{}, false, err
	}
	sources.Roles = roles

	if membershipResolver, ok := s.resolver.(GroupRightsMembershipResolver); ok {
		membership, err := membershipResolver.ResolveActorGroupMembership(ctx, actor.AppUserID, fansubGroupID)
		if err != nil {
			return groupRightsSources{}, false, err
		}
		if membership != nil {
			sources.ActiveMembership = membership.ActiveMembership
		}
	} else {
		// Fallback wiring (see file-level doc comment): ListActorGroupRoles' query already
		// filters on an active membership, so a non-empty role set is always sufficient
		// proof of active membership. It is not a NECESSARY condition -- an active member
		// with zero assigned roles cannot be distinguished from "no membership" through
		// this fallback alone -- but it reproduces the exact pre-Phase-137 behavior with
		// zero regression for every existing role-based check.
		sources.ActiveMembership = len(roles) > 0
	}

	if overridesResolver, ok := s.resolver.(GroupRightsOverridesResolver); ok {
		overrides, err := overridesResolver.ResolveActorUserOverrides(ctx, actor.AppUserID, fansubGroupID)
		if err != nil {
			return groupRightsSources{}, false, err
		}
		sources.Overrides = overrides
	}

	for _, provider := range s.specializedGrantProviders() {
		grants, err := provider.ResolveGroupGrants(ctx, actor.AppUserID, fansubGroupID)
		if err != nil {
			return groupRightsSources{}, false, err
		}
		sources.SpecializedGrants = append(sources.SpecializedGrants, grants...)
	}

	return sources, false, nil
}

// specializedGrantProviders collects every SpecializedGrantProvider this Service's
// underlying resolver supports (D05). Review Delegation is the only current source: it is
// discovered via the same optional-interface type-assertion convention already used by
// CanReviewForFansubGroup for ReviewContextResolver, so no new Service field/constructor
// signature is needed to add it.
func (s *Service) specializedGrantProviders() []SpecializedGrantProvider {
	var providers []SpecializedGrantProvider
	if reviewResolver, ok := s.resolver.(ReviewContextResolver); ok {
		if provider := newReviewGrantProvider(reviewResolver); provider != nil {
			providers = append(providers, provider)
		}
	}
	return providers
}

// evaluateGroupRights is the pure D01 precedence engine: platform_admin > disabled_actor >
// no_active_membership > user_deny > user_allow > membership_baseline > role_grant >
// specialized_grant > no_grant. It never issues I/O and is exercised directly by effective_rights_test.go's
// fixture matrix.
func evaluateGroupRights(actor Actor, fansubGroupID int64, sources groupRightsSources, actions []Action) *GroupRightsResolution {
	res := &GroupRightsResolution{
		Actor:            actor,
		FansubGroupID:    fansubGroupID,
		PlatformAdmin:    actor.IsPlatformAdmin,
		ActorDisabled:    strings.TrimSpace(actor.Status) == "disabled",
		ActiveMembership: sources.ActiveMembership,
		Rights:           make(map[Action]CapabilityRightState, len(actions)),
	}

	userAllow := make(map[Action]bool, len(sources.Overrides))
	userDeny := make(map[Action]bool, len(sources.Overrides))
	for _, o := range sources.Overrides {
		switch o.Effect {
		case "allow":
			userAllow[o.ActionCode] = true
		case "deny":
			userDeny[o.ActionCode] = true
		}
	}

	specializedByAction := make(map[Action][]string, len(sources.SpecializedGrants))
	for _, g := range sources.SpecializedGrants {
		specializedByAction[g.Action] = append(specializedByAction[g.Action], g.Source)
	}
	for action := range specializedByAction {
		sort.Strings(specializedByAction[action])
	}

	for _, action := range actions {
		state := CapabilityRightState{
			ActionCode:        action,
			GrantingRoles:     grantingRolesFor(sources.Roles, action),
			UserAllow:         userAllow[action],
			UserDeny:          userDeny[action],
			SpecializedGrants: append([]string(nil), specializedByAction[action]...),
		}

		switch {
		case res.PlatformAdmin:
			state.Allowed = true
			state.DecisiveSource = ProvenancePlatformAdmin
			state.ReasonCode = ReasonPlatformAdmin
			state.NonDeniable = true
		case res.ActorDisabled:
			state.Allowed = false
			state.DecisiveSource = ProvenanceNoGrant
			state.ReasonCode = ReasonDisabledUser
		case !res.ActiveMembership:
			state.Allowed = false
			state.DecisiveSource = ProvenanceNoGrant
			state.ReasonCode = ReasonNoMembership
		case state.UserDeny:
			state.Allowed = false
			state.DecisiveSource = ProvenanceUserDeny
			state.ReasonCode = ReasonCodeUserDeny
		case state.UserAllow:
			state.Allowed = true
			state.DecisiveSource = ProvenanceUserAllow
			state.ReasonCode = ReasonCodeUserAllow
		case IsMembershipBaselineAction(action):
			state.Allowed = true
			state.DecisiveSource = ProvenanceMembershipBaseline
			state.ReasonCode = ReasonCodeMembershipBaseline
		case len(state.GrantingRoles) > 0:
			state.Allowed = true
			state.DecisiveSource = ProvenanceGroupRole
			state.ReasonCode = ReasonCodeGroupRole
		case len(state.SpecializedGrants) > 0:
			state.Allowed = true
			state.DecisiveSource = ProvenanceSpecializedGrant
			state.ReasonCode = ReasonCodeSpecializedGrant
		default:
			state.Allowed = false
			state.DecisiveSource = ProvenanceNoGrant
			state.ReasonCode = ReasonCodeNoGrant
		}

		res.Rights[action] = state
	}

	return res
}

// grantingRolesFor returns every role in roles that grants action, deduplicated and
// deterministically sorted, regardless of whether that source ultimately decides the
// effective result (D04: provenance must preserve losing grant sources).
func grantingRolesFor(roles []string, action Action) []string {
	seen := make(map[string]bool, len(roles))
	var granting []string
	for _, role := range roles {
		role = strings.TrimSpace(role)
		if role == "" || seen[role] {
			continue
		}
		if roleAllows(role, action) {
			granting = append(granting, role)
			seen[role] = true
		}
	}
	sort.Strings(granting)
	return granting
}

// denyAllGroupRights builds a fully action-complete, all-denied resolution for the
// pre-condition guard cases (missing service/resolver/actor/target group) that sit outside
// D01's eight-step model.
func denyAllGroupRights(actor Actor, fansubGroupID int64, reasonCode string) *GroupRightsResolution {
	res := &GroupRightsResolution{
		Actor:         actor,
		FansubGroupID: fansubGroupID,
		PlatformAdmin: actor.IsPlatformAdmin,
		ActorDisabled: strings.TrimSpace(actor.Status) == "disabled",
		Rights:        make(map[Action]CapabilityRightState, len(allKnownActions)),
	}
	for _, action := range allKnownActions {
		res.Rights[action] = CapabilityRightState{
			ActionCode:     action,
			Allowed:        false,
			DecisiveSource: ProvenanceNoGrant,
			ReasonCode:     reasonCode,
		}
	}
	return res
}

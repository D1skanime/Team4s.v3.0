package permissions

// Phase 138 Plan 07 — Role-to-Capability Change Impact Preview (138-CONTEXT.md CAP-09,
// binding D-20).
//
// PreviewGroupRightsCapabilityChange answers "if role X were granted (or revoked) capability
// Y right now, which effective rights would change for EVERY current holder of role X, across
// every group they hold it in?" -- the "one action, many users" counterpart to Plan 138-04's
// role-assignment preview ("one user, many actions"). Per D-20 (binding), this reuses the
// exact same batch-loading (loadGroupRightsSources) and pure precedence evaluator
// (evaluateGroupRights) every other Phase-137/138 resolver path already uses: the only new
// logic here is a small, provably-equivalent variant,
// evaluateGroupRightsWithHypotheticalGrant, that forces one specific (role, action) pair's
// granting-role determination to a hypothetical value without ever touching the real,
// package-level loadedCache (T-138-16) and without introducing a second, independently
// computed decision path.

import (
	"context"
	"errors"
	"sort"
	"strings"
)

// errCapabilityImpactPreviewServiceUnavailable is returned when the Service or its resolver
// is not configured. Unlike the actor-scoped preview/resolve entry points, this batch preview
// has no single actor to build a denied-result shape around, so a genuine misconfiguration is
// surfaced as an error rather than silently returning an empty/denied result set.
var errCapabilityImpactPreviewServiceUnavailable = errors.New("permissions: service or resolver not configured")

// RoleHolderTarget is one (app user, fansub group) pair PreviewGroupRightsCapabilityChange
// must independently compute a before/after diff for -- the same user can hold roleCode in
// multiple groups (D-11: rights are structured by group first), and each pair gets its own
// resolution with zero cross-contamination.
type RoleHolderTarget struct {
	AppUserID     int64
	FansubGroupID int64
}

// CapabilityImpactResult is the before/after diff for one RoleHolderTarget, scoped to exactly
// one action_code (matching Grant/RevokeCapability's own one-action-at-a-time mutation
// shape). The handler projects this into the locked CapabilityOverrideImpactItem wire DTO via
// the existing effectiveRightStateFromCapabilityState helper.
type CapabilityImpactResult struct {
	TargetUserID int64
	Before       CapabilityRightState
	After        CapabilityRightState
}

// PreviewGroupRightsCapabilityChange batch-computes a before/after effective-rights diff for
// one action_code, for every given role holder, without persisting anything and without any
// N+1 SQL beyond loadGroupRightsSources' existing at-most-one-round-trip-per-category
// contract (D-20). It never mutates real role assignments or the package-level capability
// cache -- the hypothetical grant/revoke exists purely in memory for the duration of this
// call (T-138-16).
//
// Each holder's Actor is intentionally minimal (AppUserID only) -- status/platform-admin
// flags are NOT re-resolved per holder for performance, so a platform-admin or disabled
// holder will show as a regular member in this preview. This is an accepted simplification
// for a PREVIEW surface: the real mutation path (GrantCapability/RevokeCapability) and every
// production Can* entry point still enforce correctly regardless of what this preview
// displays; only the preview's own display of that one holder can be imprecise.
func (s *Service) PreviewGroupRightsCapabilityChange(
	ctx context.Context, roleCode string, actionCode Action, add bool, holders []RoleHolderTarget,
) ([]CapabilityImpactResult, error) {
	if s == nil || s.resolver == nil {
		return nil, errCapabilityImpactPreviewServiceUnavailable
	}

	results := make([]CapabilityImpactResult, 0, len(holders))
	for _, holder := range holders {
		actor := Actor{AppUserID: holder.AppUserID}

		sources, fastPath, err := s.loadGroupRightsSources(ctx, actor, holder.FansubGroupID)
		if err != nil {
			return nil, err
		}

		var before, after *GroupRightsResolution
		if fastPath {
			// Platform admin / disabled actor (never true today given the minimal Actor
			// above, kept for defensive completeness -- see doc comment): a role->capability
			// change cannot alter the outcome, so before and after are the identical
			// fast-path evaluation, matching PreviewGroupRightsWithRoleChange's own
			// fast-path handling.
			res := evaluateGroupRights(actor, holder.FansubGroupID, groupRightsSources{}, []Action{actionCode})
			before, after = res, res
		} else {
			before = evaluateGroupRights(actor, holder.FansubGroupID, sources, []Action{actionCode})
			after = evaluateGroupRightsWithHypotheticalGrant(
				actor, holder.FansubGroupID, sources, []Action{actionCode}, roleCode, actionCode, add,
			)
		}

		results = append(results, CapabilityImpactResult{
			TargetUserID: holder.AppUserID,
			Before:       before.Can(actionCode),
			After:        after.Can(actionCode),
		})
	}

	return results, nil
}

// evaluateGroupRightsWithHypotheticalGrant computes a GroupRightsResolution identical to
// evaluateGroupRights(actor, fansubGroupID, sources, actions) EXCEPT for hypotheticalAction,
// whose granting-role determination forces hypotheticalRoleCode's real, unmodified roleAllows
// verdict to hypotheticalAdd instead -- every other role/action pair, and every other action
// in actions, is decided by the exact same, unmodified evaluateGroupRights production code
// path (D-20: this is a thin, provably-equivalent wrapper, not an independent decision path).
//
// This is deliberately NOT the same shape as Plan 138-04's PreviewGroupRightsWithRoleChange:
// that preview adds/removes an entire role from the holder's role list (they do not yet hold
// the role). This preview's holder ALREADY holds hypotheticalRoleCode -- what changes is
// which actions that role grants, so the role itself must stay in sources.Roles for every
// action except the one hypothetical (role, action) pair being previewed.
func evaluateGroupRightsWithHypotheticalGrant(
	actor Actor, fansubGroupID int64, sources groupRightsSources, actions []Action,
	hypotheticalRoleCode string, hypotheticalAction Action, hypotheticalAdd bool,
) *GroupRightsResolution {
	var otherActions []Action
	hasHypothetical := false
	for _, action := range actions {
		if action == hypotheticalAction {
			hasHypothetical = true
			continue
		}
		otherActions = append(otherActions, action)
	}

	// Every action except the hypothetical one goes through the real, unmodified precedence
	// engine untouched (D-20) -- this also fully computes res.PlatformAdmin/ActorDisabled/
	// ActiveMembership from actor/sources, which does not depend on which actions were asked
	// for.
	res := evaluateGroupRights(actor, fansubGroupID, sources, otherActions)

	if !hasHypothetical {
		return res
	}

	if res.Rights == nil {
		res.Rights = make(map[Action]CapabilityRightState, 1)
	}
	res.Rights[hypotheticalAction] = hypotheticalCapabilityRightState(
		res, sources, hypotheticalRoleCode, hypotheticalAction, hypotheticalAdd,
	)
	return res
}

// hypotheticalCapabilityRightState computes the single hypothetical action's
// CapabilityRightState. The granting-roles determination mirrors grantingRolesFor exactly,
// except hypotheticalRoleCode's real roleAllows verdict for hypotheticalAction is overridden
// by hypotheticalAdd -- this NEVER mutates the package-level loadedCache (T-138-16), it only
// substitutes the value grantingRolesFor would have consulted for that one pair. The
// precedence switch below mirrors evaluateGroupRights' own switch in effective_rights.go
// EXACTLY (platform_admin > disabled_actor > no_active_membership > user_deny > user_allow >
// role_grant > specialized_grant > no_grant) -- a thin, provably-equivalent duplication
// scoped to exactly one action, not an independent decision path (D-20 still holds).
func hypotheticalCapabilityRightState(
	res *GroupRightsResolution, sources groupRightsSources,
	hypotheticalRoleCode string, hypotheticalAction Action, hypotheticalAdd bool,
) CapabilityRightState {
	seen := make(map[string]bool, len(sources.Roles))
	var granting []string
	for _, role := range sources.Roles {
		role = strings.TrimSpace(role)
		if role == "" || seen[role] {
			continue
		}
		allowed := roleAllows(role, hypotheticalAction)
		if role == hypotheticalRoleCode {
			allowed = hypotheticalAdd
		}
		if allowed {
			granting = append(granting, role)
			seen[role] = true
		}
	}
	sort.Strings(granting)

	userAllow := false
	userDeny := false
	for _, o := range sources.Overrides {
		if o.ActionCode != hypotheticalAction {
			continue
		}
		switch o.Effect {
		case "allow":
			userAllow = true
		case "deny":
			userDeny = true
		}
	}

	var specializedGrants []string
	for _, g := range sources.SpecializedGrants {
		if g.Action == hypotheticalAction {
			specializedGrants = append(specializedGrants, g.Source)
		}
	}
	sort.Strings(specializedGrants)

	state := CapabilityRightState{
		ActionCode:        hypotheticalAction,
		GrantingRoles:     granting,
		UserAllow:         userAllow,
		UserDeny:          userDeny,
		SpecializedGrants: specializedGrants,
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

	return state
}

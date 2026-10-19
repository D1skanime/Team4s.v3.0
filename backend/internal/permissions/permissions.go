package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
)

type Service struct {
	resolver Resolver
}

func NewService(resolver Resolver) *Service {
	return &Service{resolver: resolver}
}

func (s *Service) CanForFansubGroup(ctx context.Context, actor Actor, action Action, fansubGroupID int64) (Result, error) {
	if isReviewAction(action) {
		result, err := s.CanReviewForFansubGroup(ctx, actor, action, fansubGroupID)
		return result.Result, err
	}
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveFansubGroup(ctx, fansubGroupID)
	})
}

func (s *Service) CanReviewForFansubGroup(
	ctx context.Context,
	actor Actor,
	action Action,
	fansubGroupID int64,
) (ReviewAuthorizationResult, error) {
	if s == nil || s.resolver == nil {
		return reviewDenied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return reviewDenied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return reviewDenied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if !isReviewAction(action) || fansubGroupID <= 0 {
		return reviewDenied(ReasonNoSupportedContext, "keine unterstützte review-aktion oder gruppe"), nil
	}
	if actor.IsPlatformAdmin {
		return ReviewAuthorizationResult{Result: Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGlobal,
		}}, nil
	}

	resourceContext, err := s.resolver.ResolveFansubGroup(ctx, fansubGroupID)
	if err != nil {
		return ReviewAuthorizationResult{}, err
	}
	if resourceContext == nil || !slices.Contains(resourceContext.FansubGroupIDs, fansubGroupID) {
		return reviewDenied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	reviewResolver, ok := s.resolver.(ReviewContextResolver)
	if !ok {
		return reviewDenied(ReasonNoMembership, "review-kontext nicht verfügbar"), nil
	}
	reviewContext, err := reviewResolver.ResolveActorReviewGrantContext(ctx, actor.AppUserID, fansubGroupID)
	if err != nil {
		return ReviewAuthorizationResult{}, err
	}
	if reviewContext == nil ||
		reviewContext.MembershipID <= 0 ||
		reviewContext.AppUserID != actor.AppUserID ||
		reviewContext.MemberID <= 0 ||
		reviewContext.FansubGroupID != fansubGroupID {
		return reviewDenied(ReasonNoMembership, "keine aktive bestätigte gruppenmitgliedschaft"), nil
	}

	// D01: the actual allow/deny decision is now a projection of the single
	// central resolver, not an independent role-then-grant chain -- a stored
	// user_deny must be able to override even an existing review delegation
	// grant (137-RESEARCH.md Pitfall 2 / Open Question 4).
	groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
	if err != nil {
		return ReviewAuthorizationResult{}, err
	}
	state := groupRights.Can(action)
	if state.Allowed {
		return ReviewAuthorizationResult{
			Result:       resultFromCapabilityState(state, fansubGroupID),
			MembershipID: reviewContext.MembershipID,
			MemberID:     reviewContext.MemberID,
		}, nil
	}
	if state.DecisiveSource == ProvenanceUserDeny {
		return reviewDenied(ReasonCodeUserDeny, "durch persönliche sperre verweigert"), nil
	}

	return reviewDenied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber review-recht fehlt"), nil
}

func (s *Service) CanAcceptInvitation(actor Actor) Result {
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt")
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer")
	}
	return Result{
		Allowed:      true,
		ReasonCode:   ReasonAllowed,
		Reason:       "authentifizierter app-user darf einladung annehmen",
		MatchedScope: ScopeTypeGroup,
	}
}

func (s *Service) CanForRelease(ctx context.Context, actor Actor, action Action, releaseID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveRelease(ctx, releaseID)
	})
}

func (s *Service) canForContext(
	ctx context.Context,
	actor Actor,
	actions []Action,
	resolve func(context.Context) (*Context, error),
) (Result, error) {
	if s == nil || s.resolver == nil {
		return denied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if actor.IsPlatformAdmin {
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGroup,
		}, nil
	}

	resourceContext, err := resolve(ctx)
	if err != nil {
		return Result{}, err
	}
	if resourceContext == nil || len(resourceContext.FansubGroupIDs) == 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	// D01/D03: every group this resource resolves to is now decided through
	// the single central resolver instead of a raw per-group role loop, so a
	// stored user allow/deny changes the result here exactly as it does for
	// CanForFansubGroup. Active-membership presence is tracked in the same
	// pass (ResolveGroupRights already batch-loads it), replacing the old
	// second ListActorGroupRoles loop that only existed to recompute it.
	ownerRequired := slices.Contains(actions, ActionReleaseVersionMediaDeleteOwn)
	activeMembershipFound := false
	var deniedByUserOverride *CapabilityRightState
	var deniedGroupID int64
	for _, fansubGroupID := range resourceContext.FansubGroupIDs {
		groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
		if err != nil {
			return Result{}, err
		}
		if groupRights.ActiveMembership {
			activeMembershipFound = true
		}
		for _, action := range actions {
			if action == ActionReleaseVersionMediaDeleteOwn {
				if !ownerRequired || resourceContext.OwnerAppUserID == nil || *resourceContext.OwnerAppUserID != actor.AppUserID {
					continue
				}
			}
			state := groupRights.Can(action)
			if state.Allowed {
				return resultFromCapabilityState(state, fansubGroupID), nil
			}
			if state.DecisiveSource == ProvenanceUserDeny && deniedByUserOverride == nil {
				captured := state
				deniedByUserOverride = &captured
				deniedGroupID = fansubGroupID
			}
		}
	}

	if ownerRequired && resourceContext.OwnerAppUserID != nil && *resourceContext.OwnerAppUserID != actor.AppUserID {
		return denied(ReasonOwnerMismatch, "ressource gehört einem anderen benutzer"), nil
	}

	// Release-version contribution roles are authoritative for curation actions on media relations.
	// Owner-sensitive metadata edits remain on the owner path above.
	if resourceContext.ReleaseVersionID != nil {
		for _, action := range actions {
			if action != ActionReleaseVersionMediaHighlight && action != ActionReleaseVersionMediaReorder {
				continue
			}
			roleCodes, err := s.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, *resourceContext.ReleaseVersionID)
			if err != nil {
				return Result{}, err
			}
			for _, code := range roleCodes {
				if roleAllows(code, action) {
					return Result{
						Allowed:      true,
						ReasonCode:   ReasonAllowed,
						Reason:       "berechtigung über contribution-rolle bestätigt",
						MatchedRole:  code,
						MatchedScope: ScopeTypeGroup,
					}, nil
				}
			}
		}
	}

	// A stored user_deny is a more specific, more transparent denial reason than the generic
	// fallbacks below -- surface it once no group granted access.
	if deniedByUserOverride != nil {
		return resultFromCapabilityState(*deniedByUserOverride, deniedGroupID), nil
	}

	if activeMembershipFound {
		return denied(ReasonInsufficientRole, "gruppe gefunden, aber rolle reicht nicht aus"), nil
	}

	return denied(ReasonNoMembership, "keine aktive gruppenmitgliedschaft für diese ressource"), nil
}

// resultFromCapabilityState projects one CapabilityRightState (the central
// resolver's per-action decision) into the legacy Result shape every
// existing Can* entry point returns, preserving the pre-Phase-137
// ReasonCode/Reason/MatchedRole/MatchedScope vocabulary wherever the two
// concepts coincide (D04: "existing Result shapes/reason behavior remain
// compatible for callers"). This is a pure translation, not a second
// precedence computation -- the decision itself was already made by
// evaluateGroupRights (effective_rights.go).
func resultFromCapabilityState(state CapabilityRightState, fansubGroupID int64) Result {
	scope := fmt.Sprintf("%s:%d", ScopeTypeGroup, fansubGroupID)
	switch state.DecisiveSource {
	case ProvenancePlatformAdmin:
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGlobal,
		}
	case ProvenanceGroupRole:
		matchedRole := ""
		if len(state.GrantingRoles) > 0 {
			matchedRole = state.GrantingRoles[0]
		}
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonAllowed,
			Reason:       "berechtigung über gruppenrolle bestätigt",
			MatchedRole:  matchedRole,
			MatchedScope: scope,
		}
	case ProvenanceUserAllow:
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonAllowed,
			Reason:       "berechtigung über persönliche freigabe bestätigt",
			MatchedScope: scope,
		}
	case ProvenanceSpecializedGrant:
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonAllowed,
			Reason:       "berechtigung über zugewiesene sonderberechtigung bestätigt",
			MatchedScope: scope,
		}
	case ProvenanceUserDeny:
		return Result{
			Allowed:      false,
			ReasonCode:   ReasonCodeUserDeny,
			Reason:       "durch persönliche sperre verweigert",
			MatchedScope: scope,
		}
	default:
		if state.Allowed {
			return Result{Allowed: true, ReasonCode: ReasonAllowed, Reason: "berechtigung bestätigt", MatchedScope: scope}
		}
		return denied(ReasonInsufficientRole, "gruppe gefunden, aber rolle reicht nicht aus")
	}
}

func denied(code string, reason string) Result {
	return Result{
		Allowed:    false,
		ReasonCode: code,
		Reason:     reason,
	}
}

func reviewDenied(code string, reason string) ReviewAuthorizationResult {
	return ReviewAuthorizationResult{Result: denied(code, reason)}
}

func isReviewAction(action Action) bool {
	return action == ActionReviewTextDecide ||
		action == ActionReviewImageDecide ||
		action == ActionReviewContributionDecide
}

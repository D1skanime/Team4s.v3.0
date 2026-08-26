package permissions

// Phase 141 Plan 01 — Single-resolution review-group authorization
// (141-RESEARCH.md Pitfall 1).
//
// ResolveReviewGroupAuthorization replaces two independent CanReviewForFansubGroup calls
// (one per review action) with a single guard-chain evaluation plus exactly one
// ResolveGroupRights call, closing the real N+1 the research doc found: each
// CanReviewForFansubGroup call independently re-runs the full ResolveGroupRights source
// load (membership, roles, overrides, specialized grants), so two calls per handler
// invocation meant twice the round trips for no additional decision-relevant information.
//
// This function is a pure aggregation of CanReviewForFansubGroup's existing guard chain
// (permissions.go:480-553) — it does not introduce a new authorization decision path, and
// it must keep replicating that guard chain exactly, including the ReviewContextResolver
// verified-membership gate, which is intentionally STRICTER than ResolveGroupRights' own
// ActiveMembership signal (see permissions.go:480-553's doc comment history / 141-01-PLAN.md
// interfaces block). Do not substitute one gate for the other.
import (
	"context"
	"slices"
	"strings"
)

// ResolveReviewGroupAuthorization resolves both review.text.decide and review.image.decide
// for one actor + fansub group in a single pass, calling ResolveGroupRights at most once.
// Every non-platform-admin, non-guard-failure outcome is projected from that single
// resolution via resultFromCapabilityState, exactly mirroring what two sequential
// CanReviewForFansubGroup calls (one per action) already return today.
func (s *Service) ResolveReviewGroupAuthorization(
	ctx context.Context,
	actor Actor,
	fansubGroupID int64,
) (map[Action]ReviewAuthorizationResult, error) {
	reviewActions := []Action{ActionReviewTextDecide, ActionReviewImageDecide}

	if s == nil || s.resolver == nil {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonUnauthorized, "permission service nicht verfügbar"),
		), nil
	}
	if actor.AppUserID <= 0 {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonUnauthorized, "aktueller app-user fehlt"),
		), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonDisabledUser, "deaktivierter benutzer"),
		), nil
	}
	if fansubGroupID <= 0 {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonNoSupportedContext, "keine unterstützte review-aktion oder gruppe"),
		), nil
	}
	if actor.IsPlatformAdmin {
		return sameReviewResultForBothActions(reviewActions, ReviewAuthorizationResult{Result: Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGlobal,
		}}), nil
	}

	resourceContext, err := s.resolver.ResolveFansubGroup(ctx, fansubGroupID)
	if err != nil {
		return nil, err
	}
	if resourceContext == nil || !slices.Contains(resourceContext.FansubGroupIDs, fansubGroupID) {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonResourceNotFound, "ressource nicht gefunden"),
		), nil
	}

	reviewResolver, ok := s.resolver.(ReviewContextResolver)
	if !ok {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonNoMembership, "review-kontext nicht verfügbar"),
		), nil
	}
	reviewContext, err := reviewResolver.ResolveActorReviewGrantContext(ctx, actor.AppUserID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	if reviewContext == nil ||
		reviewContext.MembershipID <= 0 ||
		reviewContext.AppUserID != actor.AppUserID ||
		reviewContext.MemberID <= 0 ||
		reviewContext.FansubGroupID != fansubGroupID {
		return sameReviewResultForBothActions(
			reviewActions, reviewDenied(ReasonNoMembership, "keine aktive bestätigte gruppenmitgliedschaft"),
		), nil
	}

	// D01: the actual allow/deny decision is a projection of the single central resolver,
	// called exactly ONCE for both actions here (the fix for 141-RESEARCH.md Pitfall 1),
	// not once per action.
	groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
	if err != nil {
		return nil, err
	}

	results := make(map[Action]ReviewAuthorizationResult, len(reviewActions))
	for _, action := range reviewActions {
		state := groupRights.Can(action)
		if state.Allowed {
			results[action] = ReviewAuthorizationResult{
				Result:       resultFromCapabilityState(state, fansubGroupID),
				MembershipID: reviewContext.MembershipID,
				MemberID:     reviewContext.MemberID,
			}
			continue
		}
		if state.DecisiveSource == ProvenanceUserDeny {
			results[action] = reviewDenied(ReasonCodeUserDeny, "durch persönliche sperre verweigert")
			continue
		}
		results[action] = reviewDenied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber review-recht fehlt")
	}
	return results, nil
}

func sameReviewResultForBothActions(
	actions []Action,
	result ReviewAuthorizationResult,
) map[Action]ReviewAuthorizationResult {
	results := make(map[Action]ReviewAuthorizationResult, len(actions))
	for _, action := range actions {
		results[action] = result
	}
	return results
}

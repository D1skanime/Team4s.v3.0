package permissions

import (
	"context"
	"strings"
)

func (s *Service) CanForReleaseVersion(ctx context.Context, actor Actor, action Action, releaseVersionID int64) (Result, error) {
	// Schritt 0: Basis-Checks (analog canForContext).
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

	// Schritt 1: Ressource auflösen.
	resourceCtx, err := s.resolver.ResolveReleaseVersion(ctx, releaseVersionID)
	if err != nil {
		return Result{}, err
	}
	if resourceCtx == nil || len(resourceCtx.FansubGroupIDs) == 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	// Schritt 2: Aktive Gruppenrollen pruefen. Release-Versionen koennen mehrere
	// Fansub-Gruppen haben; eine passende Rolle in irgendeiner Gruppe reicht.
	groupRoleResult, hasGroupMembership, err := s.canForReleaseVersionGroupRole(ctx, actor, action, resourceCtx)
	if err != nil {
		return Result{}, err
	}
	// Schritt 3: Contribution-Check (D-01..D-04).
	// Gibt versions-spezifische role_codes zurück; Fallback auf anime-weite wenn keine Override existiert.
	//
	// GAP-06 (137-UAT.md) is now resolved as Fall B -- a named, deliberate exception, decided by
	// the user on 2026-08-23. Contribution Roles are an intentionally standalone, override-blind
	// domain: see 137-CONTEXT.md's "D01 exception -- Contribution Roles (entschieden 2026-08-23)"
	// paragraph. A stored user_deny from Step 2 does NOT block this fallback, by design; a
	// contribution role can still independently grant access even after Step 2 was denied by a
	// stored user_deny. This behavior is locked by the regression test
	// TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny.
	roleCodes, err := s.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, releaseVersionID)
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

	// A contribution role takes precedence when both domains grant the action. This
	// keeps the release-version result scoped to the concrete project contribution,
	// while an allowed group role remains the fallback when no contribution role grants.
	if groupRoleResult.Allowed {
		return groupRoleResult, nil
	}
	if len(roleCodes) > 0 {
		return denied(ReasonInsufficientRole, "contribution vorhanden, aber rolle reicht nicht aus"), nil
	}
	// A stored user_deny is a more specific, more transparent denial reason than the generic
	// insufficient_role fallback below -- surface it once neither the group-role step nor the
	// contribution fallback granted access.
	if groupRoleResult.ReasonCode == ReasonCodeUserDeny {
		return groupRoleResult, nil
	}
	if hasGroupMembership {
		return denied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber rolle reicht nicht aus"), nil
	}
	return denied(ReasonNoMembership, "keine contribution für diese release-version"), nil
}

// canForReleaseVersionGroupRole is CanForReleaseVersion's step 2 (the shared
// group-context path): it now derives its decision from ResolveGroupRights
// instead of a raw role loop, so a stored user allow/deny for the resolved
// group changes the result here exactly as it does for CanForFansubGroup
// (137-RESEARCH.md Pattern 1). Step 3 (contribution-role fallback) remains,
// by decided exception, a separate override-blind domain -- see the Step-3
// comment above (Fall B, entschieden 2026-08-23). When no group
// grants access, the returned Result carries the most specific denial reason
// found (a decisive user_deny over the generic zero-value) so the caller can
// distinguish "explicitly denied" from "simply never granted".
func (s *Service) canForReleaseVersionGroupRole(ctx context.Context, actor Actor, action Action, resourceCtx *Context) (Result, bool, error) {
	hasGroupMembership := false
	var deniedByUserOverride *CapabilityRightState
	var deniedGroupID int64
	for _, fansubGroupID := range resourceCtx.FansubGroupIDs {
		groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
		if err != nil {
			return Result{}, false, err
		}
		if groupRights.ActiveMembership {
			hasGroupMembership = true
		}
		state := groupRights.Can(action)
		if state.Allowed {
			return resultFromCapabilityState(state, fansubGroupID), true, nil
		}
		if state.DecisiveSource == ProvenanceUserDeny && deniedByUserOverride == nil {
			captured := state
			deniedByUserOverride = &captured
			deniedGroupID = fansubGroupID
		}
	}
	if deniedByUserOverride != nil {
		return resultFromCapabilityState(*deniedByUserOverride, deniedGroupID), hasGroupMembership, nil
	}
	return Result{}, hasGroupMembership, nil
}

func (s *Service) CanForReleaseVersionMedia(ctx context.Context, actor Actor, action Action, relationID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveReleaseVersionMedia(ctx, relationID)
	})
}

func (s *Service) CanForReleaseVersionMediaDelete(ctx context.Context, actor Actor, relationID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{ActionReleaseVersionMediaDelete, ActionReleaseVersionMediaDeleteOwn}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveReleaseVersionMedia(ctx, relationID)
	})
}

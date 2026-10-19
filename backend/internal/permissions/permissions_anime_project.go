package permissions

import (
	"context"
	"strings"
)

// AnimeProjectContributionResolver is an optional Resolver capability (mirrors the already
// established ReviewContextResolver / GroupRightsMembershipResolver / SpecializedGrantProvider
// pattern) that lets CanForAnimeProject ask whether the actor holds a CONFIRMED project role
// (anime_contribution_roles) for one concrete (animeID, fansubGroupID) pair (D-12, D-13).
//
// This is deliberately a NEW, standalone interface rather than a new method on the existing
// Resolver interface: at least 19 production/test files implement Resolver in full
// (grep-confirmed, see 188-05-PLAN.md <interfaces>), and a new mandatory Resolver method would
// break every one of them for a change scoped to exactly one bugfix. A Resolver implementation
// that does not support this optional capability is not an error -- CanForAnimeProject simply
// stays limited to the plain group-rights path (stricter, never more permissive; no fail-open
// risk, see <threat_model> T-188-05-04).
type AnimeProjectContributionResolver interface {
	ListActorContributionRolesForAnimeProject(ctx context.Context, appUserID int64, animeID int64, fansubGroupID int64) ([]string, error)
}

// CanForAnimeProject decides anime_fansub_project.timeline.update (and any other action
// scoped to one concrete (anime, fansub group) project) for an actor, considering BOTH the
// actor's group-wide rights (ResolveGroupRights, same primitive CanForFansubGroup uses) AND a
// confirmed project-specific contribution role for exactly this (animeID, fansubGroupID) pair
// (D-12, the bugfix's core case). Structurally this mirrors CanForReleaseVersion
// (permissions_release.go) -- see 188-RESEARCH.md's Nachtrag table "Release-Version-Ebene vs.
// Anime-Projekt-Ebene" for the side-by-side comparison -- with two deliberate differences:
// (a) fansubGroupID is already a known parameter here (no ResolveReleaseVersion-style resolve
// step is needed), and (b) the project-role lookup explicitly filters on
// anime_contributions.status = 'confirmed' (D-12), unlike ListActorContributionRolesForVersion's
// any-status acceptance for the release-version level.
//
// D-13 (verbindlich): diese Methode vergleicht NIE einen konkreten Rollen-Namen -- die einzige
// Entscheidungsgrundlage ist das in role_capabilities/CapabilityRightState aufgelöste Recht für
// die übergebene Action.
func (s *Service) CanForAnimeProject(ctx context.Context, actor Actor, action Action, animeID int64, fansubGroupID int64) (Result, error) {
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
	if animeID <= 0 || fansubGroupID <= 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
	if err != nil {
		return Result{}, err
	}
	state := groupRights.Can(action)
	if state.Allowed {
		return resultFromCapabilityState(state, fansubGroupID), nil
	}

	if contribResolver, ok := s.resolver.(AnimeProjectContributionResolver); ok {
		roleCodes, err := contribResolver.ListActorContributionRolesForAnimeProject(ctx, actor.AppUserID, animeID, fansubGroupID)
		if err != nil {
			return Result{}, err
		}
		for _, code := range roleCodes {
			if roleAllows(code, action) {
				return Result{
					Allowed:      true,
					ReasonCode:   ReasonAllowed,
					Reason:       "berechtigung über projektrolle bestätigt",
					MatchedRole:  code,
					MatchedScope: ScopeTypeGroup,
				}, nil
			}
		}
	}

	if state.DecisiveSource == ProvenanceUserDeny {
		return resultFromCapabilityState(state, fansubGroupID), nil
	}
	if groupRights.ActiveMembership {
		return denied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber rolle reicht nicht aus"), nil
	}
	return denied(ReasonNoMembership, "keine aktive gruppenmitgliedschaft für diese ressource"), nil
}

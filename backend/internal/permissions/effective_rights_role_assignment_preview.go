package permissions

// Phase 138 Plan 04 — Role-Assignment Impact Preview (138-CONTEXT.md D-22, binding D-20).
//
// PreviewGroupRightsWithRoleChange answers "if role X were assigned to (or removed from)
// this user in this group right now, which effective rights would change across every
// action?" -- the "one user, many actions" counterpart to CAP-09's role->capability preview
// ("one action, many users"). Per D-20 (binding), this reuses the exact same pure
// precedence evaluator (evaluateGroupRights) ResolveGroupRights already uses: the only new
// logic here is loading the current sources once (via loadGroupRightsSources) and feeding a
// synthetically modified role list through that SAME function twice (current vs.
// hypothetical). No second, independently-computed decision engine is introduced.

import (
	"context"
)

// PreviewGroupRightsWithRoleChange computes a before/after GroupRightsResolution diff for a
// hypothetical role assign (add=true) or revoke (add=false) of roleCode on actor within
// fansubGroupID, without persisting anything. It never mutates real role assignments -- the
// synthetic role-set modification happens entirely in memory (T-138-09).
//
// If actor is a platform admin or disabled (loadGroupRightsSources' fast path), a role
// change is meaningless for that actor: before and after are computed identically via the
// same fast-path evaluation, and the caller (the HTTP handler) is expected to surface this
// as "no change, {reason}" rather than a misleading empty diff.
func (s *Service) PreviewGroupRightsWithRoleChange(ctx context.Context, actor Actor, fansubGroupID int64, roleCode string, add bool) (before *GroupRightsResolution, after *GroupRightsResolution, err error) {
	if s == nil || s.resolver == nil {
		denied := denyAllGroupRights(actor, fansubGroupID, ReasonUnauthorized)
		return denied, denied, nil
	}
	if actor.AppUserID <= 0 {
		denied := denyAllGroupRights(actor, fansubGroupID, ReasonUnauthorized)
		return denied, denied, nil
	}
	if fansubGroupID <= 0 {
		denied := denyAllGroupRights(actor, fansubGroupID, ReasonResourceNotFound)
		return denied, denied, nil
	}

	sources, fastPath, err := s.loadGroupRightsSources(ctx, actor, fansubGroupID)
	if err != nil {
		return nil, nil, err
	}

	if fastPath {
		// Platform admin / disabled actor: a role change cannot alter the outcome, so
		// before and after are the identical fast-path evaluation -- no synthetic
		// modification is attempted.
		res := evaluateGroupRights(actor, fansubGroupID, groupRightsSources{}, allKnownActions)
		return res, res, nil
	}

	before = evaluateGroupRights(actor, fansubGroupID, sources, allKnownActions)

	modifiedSources := sources
	modifiedSources.Roles = modifiedRoles(sources.Roles, roleCode, add)

	after = evaluateGroupRights(actor, fansubGroupID, modifiedSources, allKnownActions)

	return before, after, nil
}

// modifiedRoles returns a NEW role slice with roleCode added (deduped against the existing
// set) or removed (filtered out), never mutating the input slice in place -- sources is
// shared with the "before" evaluation via a shallow copy, so mutating its backing array
// would corrupt the already-computed before result.
func modifiedRoles(roles []string, roleCode string, add bool) []string {
	if add {
		for _, r := range roles {
			if r == roleCode {
				// Already present -- dedup, return the original set unchanged.
				return append([]string(nil), roles...)
			}
		}
		modified := make([]string, 0, len(roles)+1)
		modified = append(modified, roles...)
		modified = append(modified, roleCode)
		return modified
	}

	modified := make([]string, 0, len(roles))
	for _, r := range roles {
		if r == roleCode {
			continue
		}
		modified = append(modified, r)
	}
	return modified
}

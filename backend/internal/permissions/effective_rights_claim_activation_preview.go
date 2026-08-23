package permissions

// Phase 138 Plan 14 — Claim-Activation Impact Preview (138-CONTEXT.md D-24).
//
// PreviewClaimActivationImpact answers "if this verified-claimed historical member were
// activated as a real fansub-group member right now (ActivateClaimedMember), which
// effective rights would that person gain?" -- resolved this session by a direct read of
// backend/internal/repository/member_claims_activate_repository.go: `VerifyClaim` only
// flips member_claims.claim_status and creates NO membership/role row at all;
// `ActivateClaimedMember` is the one action that actually creates a real
// fansub_group_members row plus the non-governance activatable historical roles. This is
// the preview for THAT action specifically -- VerifyClaim/RejectClaim never get (and never
// should get, per D-24's binding honesty rule) a fabricated diff, since neither one changes
// effective rights at all.
//
// Reuses the exact same primitives Plan 138-04 already extracted for
// PreviewGroupRightsWithRoleChange (D-20, binding): the real, unmodified ResolveGroupRights
// for "before" and loadGroupRightsSources + evaluateGroupRights for "after". No second,
// independently-computed decision engine is introduced.

import (
	"context"
)

// PreviewClaimActivationImpact computes a before/after GroupRightsResolution diff for a
// hypothetical ActivateClaimedMember call on appUserID within fansubGroupID, granting
// exactly roleCodes -- without persisting anything.
//
// "before" is the real, unmodified ResolveGroupRights result: the target is NOT yet an
// active member, so this naturally resolves to the no_active_membership deny-all state via
// the resolver's own existing logic -- no special-casing needed.
//
// "after" reloads the target's CURRENT sources via loadGroupRightsSources (a second real
// read -- needed since the target may already hold specialized grants, e.g. a review
// delegation, that should still count in "after"), then overrides ActiveMembership=true and
// Roles=roleCodes before evaluating. This override assumes the documented precondition that
// a non-active-member has no group roles loaded yet today (by construction, since
// ListActorGroupRoles' production query only ever returns roles for an active membership) --
// it is not silently assumed, it is a real constraint of the current data model, not a
// preview-specific simplification.
func (s *Service) PreviewClaimActivationImpact(ctx context.Context, appUserID int64, fansubGroupID int64, roleCodes []string) (before *GroupRightsResolution, after *GroupRightsResolution, err error) {
	actor := Actor{AppUserID: appUserID}

	before, err = s.ResolveGroupRights(ctx, actor, fansubGroupID)
	if err != nil {
		return nil, nil, err
	}

	sources, fastPath, err := s.loadGroupRightsSources(ctx, actor, fansubGroupID)
	if err != nil {
		return nil, nil, err
	}
	if fastPath {
		// Platform admin / disabled actor: activation cannot alter the outcome for either
		// path, so "after" mirrors "before" exactly -- no synthetic membership/role
		// override is attempted.
		return before, before, nil
	}

	sources.ActiveMembership = true
	sources.Roles = append([]string(nil), roleCodes...)

	after = evaluateGroupRights(actor, fansubGroupID, sources, allKnownActions)
	return before, after, nil
}

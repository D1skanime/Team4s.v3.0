package permissions

// Phase 137 — Review Delegation as the first SpecializedGrantProvider (137-CONTEXT.md D05).
//
// This file adapts the already-shipped, Phase-107 ResolveActorReviewGrantContext query as
// the resolver's first specialized (non-role) grant source. It intentionally does not
// duplicate the review query and does not migrate review grants into the generic
// user_group_capability_overrides table -- Review Delegation remains its own domain
// mechanism (137-CONTEXT.md Section 2, rule 9) and only ever contributes ALLOW-shaped
// facts into the central resolver. A personal User-Deny in ResolveGroupRights still wins
// over any grant this provider returns (D01).

import "context"

// reviewDelegationGrantSource is the specialized_grants[] provenance token this adapter
// contributes -- a stable machine identifier matching D04's own review_delegation example.
// It must never be a human-facing string (Phase 137 does not add German explanation text).
const reviewDelegationGrantSource = "review_delegation"

// reviewGrantProvider adapts any ReviewContextResolver (AuthzRepository already implements
// this interface in production, see repository/authz_permissions.go) as a
// SpecializedGrantProvider.
type reviewGrantProvider struct {
	resolver ReviewContextResolver
}

// newReviewGrantProvider wraps resolver as a SpecializedGrantProvider. Returns nil if
// resolver is nil so callers can skip wiring the provider instead of constructing one that
// would always answer empty.
func newReviewGrantProvider(resolver ReviewContextResolver) SpecializedGrantProvider {
	if resolver == nil {
		return nil
	}
	return &reviewGrantProvider{resolver: resolver}
}

func (p *reviewGrantProvider) Source() string {
	return reviewDelegationGrantSource
}

// ResolveGroupGrants projects the existing verified, active-membership-scoped review grant
// context into SpecializedGrant entries. A User-Deny in the central resolver still wins
// over these grants (D01) -- this provider only ever contributes ALLOW-shaped facts, never
// makes the deny decision itself.
func (p *reviewGrantProvider) ResolveGroupGrants(ctx context.Context, actorAppUserID int64, fansubGroupID int64) ([]SpecializedGrant, error) {
	if p == nil || p.resolver == nil || actorAppUserID <= 0 || fansubGroupID <= 0 {
		return nil, nil
	}
	reviewContext, err := p.resolver.ResolveActorReviewGrantContext(ctx, actorAppUserID, fansubGroupID)
	if err != nil {
		return nil, err
	}
	if reviewContext == nil || reviewContext.AppUserID != actorAppUserID || reviewContext.FansubGroupID != fansubGroupID {
		return nil, nil
	}
	grants := make([]SpecializedGrant, 0, len(reviewContext.GrantedActions))
	for _, action := range reviewContext.GrantedActions {
		grants = append(grants, SpecializedGrant{Action: action, Source: reviewDelegationGrantSource})
	}
	return grants, nil
}

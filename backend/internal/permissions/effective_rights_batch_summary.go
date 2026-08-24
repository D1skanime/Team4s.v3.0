package permissions

// Phase 139 Plan 05 -- Batched Group-Rights Summary Facade (139-05-PLAN.md Task 1, F-01/UADM-06).
//
// The Overview tab (UserOverviewTab.tsx) must render a compact rights summary for EVERY group
// membership simultaneously on mount (Phase 138 D-05) -- unlike the Rights tab, it cannot
// reasonably defer to "select a group first". Naively calling ResolveGroupRights once per group
// from a loop would just move the N+1 from HTTP to Postgres (RESEARCH.md's named anti-pattern).
// This file adds a batched orchestration path that reuses the exact same, unmodified pure
// precedence evaluator (evaluateGroupRights) every other Phase-137/138 resolver path already
// uses (D21) -- it adds ZERO new precedence logic and changes ZERO existing resolver semantics.
//
// Shape: batch-load membership/overrides/specialized-grants ONCE across every requested group
// (at most one round trip per source category, mirroring loadGroupRightsSources' existing
// per-group contract), then evaluate each group's already-in-memory sources via
// EvaluateGroupRightsFromSources -- a pure, zero-I/O call. Total SQL round trips stay constant
// (2-3) regardless of how many groups are requested.

import (
	"context"
	"strings"
)

// GroupRightsSourcesInput is an EXPORTED mirror of the unexported groupRightsSources, letting
// callers outside this package (the new admin_users repository/handler) supply pre-loaded facts
// without needing package-internal access. Field types match groupRightsSources exactly (Roles
// is []string -- group role CODES such as "fansub_lead", the same shape ListActorGroupRoles/
// AdminGroupMembershipSummary.Roles already use -- NOT []Action; Action values are capability
// codes such as "fansub_group.edit", a different vocabulary evaluateGroupRights never mixes).
type GroupRightsSourcesInput struct {
	Roles             []string
	ActiveMembership  bool
	Overrides         []UserCapabilityOverride
	SpecializedGrants []SpecializedGrant
}

// EvaluateGroupRightsFromSources converts sources to the unexported groupRightsSources shape
// and calls the existing unexported evaluateGroupRights directly. This function's entire body
// is the type conversion plus one delegating call -- zero new precedence logic (D21).
func (s *Service) EvaluateGroupRightsFromSources(actor Actor, fansubGroupID int64, sources GroupRightsSourcesInput) *GroupRightsResolution {
	return evaluateGroupRights(actor, fansubGroupID, groupRightsSources{
		ActiveMembership:  sources.ActiveMembership,
		Roles:             sources.Roles,
		Overrides:         sources.Overrides,
		SpecializedGrants: sources.SpecializedGrants,
	}, allKnownActions)
}

// GroupRightsMembershipBatchResolver is an optional Resolver capability (mirrors the existing
// GroupRightsMembershipResolver's single-group shape and optional-interface discovery
// convention) that lets ResolveGroupRightsBatch ask for the real active-membership signal for
// every requested group in ONE batched call. A Resolver implementation that does not support it
// is not an error -- ResolveGroupRightsBatch falls back to inferring active membership from a
// non-empty role set per group instead, exactly like loadGroupRightsSources' existing fallback.
type GroupRightsMembershipBatchResolver interface {
	ResolveActorGroupMembershipsForGroups(ctx context.Context, appUserID int64, fansubGroupIDs []int64) (map[int64]*GroupMembershipState, error)
}

// GroupRightsOverridesBatchResolver is an optional Resolver capability exposing the current
// user-override rows for every requested group in a single batched call. A Resolver
// implementation that does not support it simply contributes zero overrides to every group.
type GroupRightsOverridesBatchResolver interface {
	ResolveActorUserOverridesForGroups(ctx context.Context, appUserID int64, fansubGroupIDs []int64) (map[int64][]UserCapabilityOverride, error)
}

// SpecializedGrantBatchProvider is the batched counterpart to SpecializedGrantProvider,
// contributing every requested group's specialized (non-role) grants in one call. If the
// underlying resolver does not implement this for a given specialized-grant source (e.g.
// review delegation has no batch variant wired yet), that source contributes zero grants to
// every group's batched result -- a group where the ONLY reason a capability would show
// allowed=true is a specialized grant (not a role or user_allow) may show allowed=false in this
// batched summary until a batch variant is wired. This is a disclosed, bounded scope note for
// Phase 139's Overview-tab compact headline only; the full single-group Rights tab
// (UserGroupRightsTab.tsx, calling ResolveGroupRights unchanged) always includes specialized
// grants with full fidelity.
type SpecializedGrantBatchProvider interface {
	ResolveGroupGrantsForGroups(ctx context.Context, actorAppUserID int64, fansubGroupIDs []int64) (map[int64][]SpecializedGrant, error)
}

// ResolveGroupRightsBatch answers every one of fansubGroupIDs' full GroupRightsResolution in
// O(1) SQL round trips (2-3), never one ResolveGroupRights call per group. rolesByGroup is
// supplied BY THE CALLER (the admin_users repository layer already has this from
// GetUserGroupMemberships' existing single query) -- this function never re-fetches roles
// itself, avoiding a redundant round trip.
//
// For the platform-admin/disabled fast path (mirrors loadGroupRightsSources' existing fast-path
// check), every group in the result gets evaluateGroupRights(actor, groupID,
// groupRightsSources{}, allKnownActions) with zero further I/O. Otherwise: if the resolver
// implements GroupRightsMembershipBatchResolver, it is called ONCE with the full
// fansubGroupIDs slice; if it implements GroupRightsOverridesBatchResolver, likewise ONCE; if
// it implements SpecializedGrantBatchProvider, likewise ONCE. Each group's
// GroupRightsSourcesInput is then assembled from rolesByGroup[groupID] plus the batch-loaded
// maps (falling back to len(rolesByGroup[groupID]) > 0 for ActiveMembership when no
// GroupRightsMembershipBatchResolver is available, mirroring loadGroupRightsSources' existing
// single-group fallback), and EvaluateGroupRightsFromSources is called per group -- a PURE,
// zero-I/O, in-memory call, so total SQL round trips stay constant regardless of how many
// groups are in fansubGroupIDs.
func (s *Service) ResolveGroupRightsBatch(
	ctx context.Context, actor Actor, fansubGroupIDs []int64, rolesByGroup map[int64][]string,
) (map[int64]*GroupRightsResolution, error) {
	result := make(map[int64]*GroupRightsResolution, len(fansubGroupIDs))

	if s == nil || s.resolver == nil {
		for _, groupID := range fansubGroupIDs {
			result[groupID] = denyAllGroupRights(actor, groupID, ReasonUnauthorized)
		}
		return result, nil
	}

	// Platform admin and disabled actor are unconditionally decisive per D01 -- no batch load
	// is needed to compute the answer for either, so skip every round trip (mirrors
	// loadGroupRightsSources' identical fast-path check).
	if actor.IsPlatformAdmin || strings.TrimSpace(actor.Status) == "disabled" {
		for _, groupID := range fansubGroupIDs {
			result[groupID] = evaluateGroupRights(actor, groupID, groupRightsSources{}, allKnownActions)
		}
		return result, nil
	}

	var membershipByGroup map[int64]*GroupMembershipState
	if membershipResolver, ok := s.resolver.(GroupRightsMembershipBatchResolver); ok {
		loaded, err := membershipResolver.ResolveActorGroupMembershipsForGroups(ctx, actor.AppUserID, fansubGroupIDs)
		if err != nil {
			return nil, err
		}
		membershipByGroup = loaded
	}

	var overridesByGroup map[int64][]UserCapabilityOverride
	if overridesResolver, ok := s.resolver.(GroupRightsOverridesBatchResolver); ok {
		loaded, err := overridesResolver.ResolveActorUserOverridesForGroups(ctx, actor.AppUserID, fansubGroupIDs)
		if err != nil {
			return nil, err
		}
		overridesByGroup = loaded
	}

	var specializedByGroup map[int64][]SpecializedGrant
	if grantProvider, ok := s.resolver.(SpecializedGrantBatchProvider); ok {
		loaded, err := grantProvider.ResolveGroupGrantsForGroups(ctx, actor.AppUserID, fansubGroupIDs)
		if err != nil {
			return nil, err
		}
		specializedByGroup = loaded
	}

	for _, groupID := range fansubGroupIDs {
		roles := rolesByGroup[groupID]

		activeMembership := len(roles) > 0
		if membershipByGroup != nil {
			if membership, ok := membershipByGroup[groupID]; ok && membership != nil {
				activeMembership = membership.ActiveMembership
			}
		}

		sources := GroupRightsSourcesInput{
			Roles:             roles,
			ActiveMembership:  activeMembership,
			Overrides:         overridesByGroup[groupID],
			SpecializedGrants: specializedByGroup[groupID],
		}
		result[groupID] = s.EvaluateGroupRightsFromSources(actor, groupID, sources)
	}

	return result, nil
}

package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"team4s.v3/backend/internal/permissions"
)

type ReleasePlaybackEntitlementRepository struct {
	db       *pgxpool.Pool
	resolver permissions.Resolver
}

func NewReleasePlaybackEntitlementRepository(db *pgxpool.Pool, resolver permissions.Resolver) *ReleasePlaybackEntitlementRepository {
	return &ReleasePlaybackEntitlementRepository{db: db, resolver: resolver}
}

type releasePlaybackRule struct {
	SubjectType     string
	SubjectRoleCode string
	Effect          string
	ScopeType       string
	FansubGroupID   *int64
}

func (r *ReleasePlaybackEntitlementRepository) ResolveReleasePlaybackEntitlement(
	ctx context.Context,
	actor permissions.Actor,
	releaseVersionID int64,
) (permissions.ReleasePlaybackEntitlementDecision, error) {
	denied := permissions.ReleasePlaybackEntitlementDecision{Allowed: false}
	if r == nil || r.db == nil || r.resolver == nil || actor.AppUserID <= 0 || releaseVersionID <= 0 || strings.TrimSpace(actor.Status) == "disabled" {
		return denied, nil
	}

	resource, err := r.resolver.ResolveReleaseVersion(ctx, releaseVersionID)
	if err != nil {
		return denied, fmt.Errorf("resolve release playback context: %w", err)
	}
	if resource == nil || resource.AnimeID == nil || len(resource.FansubGroupIDs) == 0 {
		return denied, nil
	}

	// Platform administrators use the same central resolver entry point. Their
	// eligibility is explicit and does not require a seeded broad production rule.
	if actor.IsPlatformAdmin {
		return permissions.ReleasePlaybackEntitlementDecision{
			Allowed: true, WinningScope: permissions.ScopeTypeGlobal,
			WinningEffect: "allow", SubjectType: "role",
		}, nil
	}

	rolesByGroup := make(map[int64]map[string]struct{}, len(resource.FansubGroupIDs))
	allRoles := make(map[string]struct{})
	for _, groupID := range resource.FansubGroupIDs {
		roles, err := r.resolver.ListActorGroupRoles(ctx, actor.AppUserID, groupID)
		if err != nil {
			return denied, fmt.Errorf("resolve release playback group roles: %w", err)
		}
		roleSet := make(map[string]struct{}, len(roles))
		for _, role := range roles {
			role = strings.TrimSpace(role)
			if role != "" {
				roleSet[role] = struct{}{}
				allRoles[role] = struct{}{}
			}
		}
		rolesByGroup[groupID] = roleSet
	}
	contributionRoles, err := r.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, releaseVersionID)
	if err != nil {
		return denied, fmt.Errorf("resolve release playback contribution roles: %w", err)
	}
	for _, role := range contributionRoles {
		if role = strings.TrimSpace(role); role != "" {
			allRoles[role] = struct{}{}
		}
	}

	rows, err := r.db.Query(ctx, `
		SELECT subject_type, COALESCE(subject_role_code, ''), effect, scope_type, fansub_group_id
		FROM release_playback_entitlement_rules
		WHERE (subject_app_user_id = $1 OR subject_role_code = ANY($2::text[]))
		  AND (
			scope_type = 'global'
			OR (scope_type = 'group' AND fansub_group_id = ANY($3::bigint[]))
			OR (scope_type = 'project' AND anime_id = $4 AND fansub_group_id = ANY($3::bigint[]))
			OR (scope_type = 'release' AND release_version_id = $5)
		  )
	`, actor.AppUserID, mapKeys(allRoles), resource.FansubGroupIDs, *resource.AnimeID, releaseVersionID)
	if err != nil {
		return denied, fmt.Errorf("query release playback entitlement rules: %w", err)
	}
	defer rows.Close()

	rules := make([]releasePlaybackRule, 0)
	for rows.Next() {
		var rule releasePlaybackRule
		if err := rows.Scan(&rule.SubjectType, &rule.SubjectRoleCode, &rule.Effect, &rule.ScopeType, &rule.FansubGroupID); err != nil {
			return denied, fmt.Errorf("scan release playback entitlement rule: %w", err)
		}
		rules = append(rules, rule)
	}
	if err := rows.Err(); err != nil {
		return denied, fmt.Errorf("iterate release playback entitlement rules: %w", err)
	}
	return evaluateReleasePlaybackRules(rules, rolesByGroup, allRoles), nil
}

func evaluateReleasePlaybackRules(rules []releasePlaybackRule, rolesByGroup map[int64]map[string]struct{}, allRoles map[string]struct{}) permissions.ReleasePlaybackEntitlementDecision {
	bestSpecificity := -1
	bestSubject := -1
	bestEffect := -1
	decision := permissions.ReleasePlaybackEntitlementDecision{}
	for _, rule := range rules {
		if rule.SubjectType == "role" {
			if _, ok := allRoles[rule.SubjectRoleCode]; !ok {
				continue
			}
			if (rule.ScopeType == permissions.ScopeTypeGroup || rule.ScopeType == permissions.ScopeTypeProject) && rule.FansubGroupID != nil {
				if _, ok := rolesByGroup[*rule.FansubGroupID][rule.SubjectRoleCode]; !ok {
					continue
				}
			}
		}
		specificity := map[string]int{"global": 0, "group": 1, "project": 2, "release": 3}[rule.ScopeType]
		subjectPriority := 0
		if rule.SubjectType == "app_user" {
			subjectPriority = 1
		}
		effectPriority := 0
		if rule.Effect == "deny" {
			effectPriority = 1
		}
		if specificity > bestSpecificity ||
			(specificity == bestSpecificity && subjectPriority > bestSubject) ||
			(specificity == bestSpecificity && subjectPriority == bestSubject && effectPriority > bestEffect) {
			bestSpecificity, bestSubject, bestEffect = specificity, subjectPriority, effectPriority
			decision = permissions.ReleasePlaybackEntitlementDecision{
				Allowed: rule.Effect == "allow", WinningScope: rule.ScopeType,
				WinningEffect: rule.Effect, SubjectType: rule.SubjectType,
			}
		}
	}
	return decision
}

func mapKeys(values map[string]struct{}) []string {
	keys := make([]string, 0, len(values))
	for value := range values {
		keys = append(keys, value)
	}
	return keys
}

var _ permissions.ReleasePlaybackEntitlementResolver = (*ReleasePlaybackEntitlementRepository)(nil)

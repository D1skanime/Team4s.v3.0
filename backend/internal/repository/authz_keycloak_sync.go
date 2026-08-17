package repository

import (
	"context"

	"team4s.v3/backend/internal/models"
)

// diffKeycloakGlobalRoleSync computes the app_user_global_roles reconciliation
// diff for a single app user from their current global role set and their
// verified Keycloak token's realm roles. It is a pure function (no DB, no
// context) so the full reconciliation matrix can be unit tested exhaustively.
//
// Rules:
//   - A managed role present in realmRoles but absent from current is assigned.
//   - A managed role present in current but absent from realmRoles is revoked
//     (bidirectional: Keycloak is fully authoritative for the three global
//     roles once JIT sync runs).
//   - Any realmRoles entry outside models.KeycloakManagedGlobalRoles is ignored
//     (defense in depth alongside the DB's chk_app_user_global_roles_role CHECK
//     constraint) — it can never be assigned or revoked by this diff.
//   - A current role outside the managed set is left untouched (not revoked),
//     since this diff only ever reasons about the three managed global roles.
func diffKeycloakGlobalRoleSync(current, realmRoles []string) (toAssign, toRevoke []string) {
	currentSet := make(map[string]bool, len(current))
	for _, role := range current {
		currentSet[role] = true
	}

	managedRealmRoles := make(map[string]bool, len(realmRoles))
	for _, role := range realmRoles {
		if !isManagedGlobalRole(role) {
			continue
		}
		managedRealmRoles[role] = true
	}

	for _, managed := range models.KeycloakManagedGlobalRoles {
		hasCurrent := currentSet[managed]
		hasRealm := managedRealmRoles[managed]
		switch {
		case hasRealm && !hasCurrent:
			toAssign = append(toAssign, managed)
		case hasCurrent && !hasRealm:
			toRevoke = append(toRevoke, managed)
		}
	}

	return toAssign, toRevoke
}

func isManagedGlobalRole(role string) bool {
	for _, managed := range models.KeycloakManagedGlobalRoles {
		if managed == role {
			return true
		}
	}
	return false
}

// SyncGlobalRolesFromKeycloak is the "in/nach EnsureAppUserForIdentity" JIT
// sync step from the milestone note's NACHTRAG Phase-0 spec. It deliberately
// lives outside EnsureAppUserForIdentity (see the locked
// TestEnsureAppUserForIdentityStaysAppUserOnly invariant in
// app_auth_repository_test.go) and is instead invoked by
// KeycloakCurrentUserResolver.ResolveCurrentUser on every authenticated
// request, after the app user row itself has been ensured.
//
// It only ever touches app_user_global_roles — never role_capabilities,
// fansub_group_member_roles, or any other fine-grained role table. The
// three-value global role set (platform_admin/content_admin/user) is fully
// IdP-driven; fine-grained app-DB roles remain a separate, untouched hybrid
// layer managed entirely inside the app.
func (r *AuthzRepository) SyncGlobalRolesFromKeycloak(ctx context.Context, appUserID int64, realmRoles []string) ([]string, error) {
	current, err := r.ListAppUserGlobalRoles(ctx, appUserID)
	if err != nil {
		return nil, err
	}

	toAssign, toRevoke := diffKeycloakGlobalRoleSync(current, realmRoles)

	for _, role := range toAssign {
		if err := r.AssignAppUserGlobalRole(ctx, appUserID, role); err != nil {
			return nil, err
		}
	}
	for _, role := range toRevoke {
		if err := r.RevokeAppUserGlobalRole(ctx, appUserID, role); err != nil {
			return nil, err
		}
	}

	if len(toAssign) == 0 && len(toRevoke) == 0 {
		return current, nil
	}

	return r.ListAppUserGlobalRoles(ctx, appUserID)
}

---
phase: 138-effective-rights-administration-impact-ux
type: research
status: complete
---

# Phase 138 Research

## Confirmed backend seams

### Effective rights
`backend/internal/handlers/admin_effective_rights_handler.go` already provides:
- complete `ResolveGroupRights` inspection;
- atomic/idempotent per-user override mutation;
- immutable override history;
- response-side `activation_status` for the direct override mutation.

No new resolver should be introduced.

### Role-capability mutation
`backend/internal/handlers/admin_capability_handler.go` currently:
1. validates platform admin / role editability / lockout;
2. persists grant or revoke;
3. calls `permissionSvc.ReloadCache(...)`;
4. logs reload failure without failing the HTTP response;
5. writes audit;
6. returns a generic success message.

Therefore CAP-10 cannot be solved by frontend-only work.

### Capability matrix
`backend/internal/repository/authz_capability_mutations.go` is the canonical matrix repository seam.
Role definitions already carry:
- role code / label,
- contexts,
- assignability,
- editability,
- sort order,
- operative capability metadata.

### Group roles
Active group-role assignments are stored through `fansub_group_member_roles`.
Current repositories already join that table in:
- `backend/internal/repository/authz_permissions.go`
- `backend/internal/repository/fansub_group_app_members_repository.go`
- `backend/internal/repository/admin_users_tab_repository.go`

Impact queries should reuse repository-level set queries and must not resolve users in an N+1 handler loop.

## Confirmed frontend seams

### User list
`AdminUsersClient.tsx` currently displays several columns the agreed UX removes from primary view:
- Leitungskontext
- Beiträge
- Release-Arbeitsflächen
- Medienuploads

Open claims, membership count and last activity remain useful.

### User detail
`UserDetailPageClient.tsx` is an Accordion-based page with many sections.
The agreed Phase-138 information architecture replaces this with a stable detail navigation:
`Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen`.

### Group rights
`UserGroupRightsTab.tsx` currently calls the old aggregated `getAdminUserGroupRights`.
This must stop being the canonical rights source.
The new rights editor must call the Phase-137 effective-rights endpoint for the selected `(group, user)`.

### Role capability
`RoleCapabilityClient.tsx` already implements:
- compact role master list,
- desktop master/detail,
- mobile responsive sheet,
- URL role preselection,
- controlled category open state.

Keep that shell. Replace immediate switch mutation with preview → confirm → activation state.

## Known contribution display defect

`UserContributionsTab.tsx` currently treats `release_version_id` as a visible version number.
`release_version_id` is an internal row identifier and must never be rendered as `Version {id}`.
Phase 139 owns the full scalable projection redesign; Phase 138 should only remove/avoid this incorrect semantic label.

## Planning decomposition

Wave 1 establishes contracts and shared navigation shells.
Wave 2 builds the two canonical mutation workflows independently:
- effective user rights,
- role-capability impact/activation.
Wave 3 integrates claims/changes/cross-navigation and runs responsive/security/regression gates.

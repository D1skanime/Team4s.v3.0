# Phase 138: Effective-Rights Administration & Impact UX - Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 27 (new/modified, backend + frontend)
**Analogs found:** 27 / 27

> Scope note: Phase 138 is IA-heavy with many new top-level nav areas (`Änderungen`, `Claims`
> workqueue), a new impact-preview computation, and evolution of an existing read-only tab into
> an editable one. This map groups files by **role+data-flow shape** rather than 1:1 file, since
> most new files repeat one of a small number of already-established shapes in this codebase.
> Per 138-RESEARCH.md, the role-capabilities split-view and effective-rights endpoints already
> exist — several "new" files below are **modifications** of existing files, not new files; this
> is called out explicitly per row.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/admin_capability_impact_handler.go` (NEW, CAP-09) | handler | batch request-response (compute, no write) | `backend/internal/handlers/admin_effective_rights_handler.go` (`GetEffectiveRights`) | role-match (single-resolve inspection → batch-resolve inspection) |
| `backend/internal/handlers/admin_role_assignment_impact_handler.go` (NEW, D-22) — or folded into wherever role assign/revoke actually lives (verify route at plan time, RESEARCH Open Question 2) | handler | batch request-response (compute, no write) | `backend/internal/handlers/admin_effective_rights_handler.go` (`GetEffectiveRights`) | role-match |
| `backend/internal/handlers/admin_role_holders_handler.go` (NEW, D-07/R-03) | handler | CRUD (read, query) | `backend/internal/handlers/role_catalog_handler.go` | role-match |
| `backend/internal/handlers/admin_changes_handler.go` (NEW, D-25/D-28) | handler | CRUD (filtered read) | `backend/internal/handlers/admin_effective_rights_handler.go` (`ListOverrideHistory`) | role-match (paginated history projection) |
| `backend/internal/handlers/admin_capability_handler.go` (MODIFY — add activation-status field, CAP-10/Pitfall 3) | handler | request-response (mutation + cache reload) | itself (existing `GrantCapability`/`RevokeCapability`) | exact — extend in place |
| `backend/internal/repository/authz_role_holders_repository.go` (NEW, R-03) or sibling file to `authz_capability_mutations.go` | repository | CRUD (read, join query) | `backend/internal/repository/authz_capability_mutations.go` (`ListCapabilityMatrix`) | exact |
| `backend/internal/repository/audit_logs_query.go` (NEW — filtered list method, D-25/D-28; keep separate file from write-only `audit_logs.go` per 450-line discipline) | repository | CRUD (filtered/paginated read) | `backend/internal/repository/admin_users_tab_repository.go` (`GetUserAudit`) | exact |
| `backend/internal/repository/admin_users_tab_repository.go` (MODIFY — `ListUserContributions`, D-29/R-08 version-label fix) | repository | CRUD (read, join query) | itself (existing query) | exact — extend in place |
| `backend/internal/models/admin_users.go` or equivalent (MODIFY — `AdminContributionItem` gains `release_version_label`/`episode_number`) | model | transform (DTO field addition) | itself (existing struct) | exact |
| `backend/internal/permissions/effective_rights.go` (REUSE, not modified — `evaluateGroupRights`) | service/pure-fn | transform (pure precedence evaluation) | itself | exact — call, do not duplicate (D-20 binding) |
| `backend/cmd/server/admin_routes.go` (MODIFY — register new routes) | route | request-response wiring | itself (existing `effective-rights`/`capability-overrides` route block, lines 267-269) | exact |
| `frontend/src/lib/api.ts` (MODIFY — add `getEffectiveRights`, `mutateCapabilityOverride`, `listOverrideHistory`) | service (API helper) | request-response (simple GET) | itself, `getAdminUserGroupRights` (lines 3738-3753) | exact |
| `frontend/src/lib/api.ts` (MODIFY — add `getRoleCapabilityImpactPreview`, `getRoleAssignmentImpactPreview`) | service (API helper) | request-response (compute/batch GET or POST) | itself, `listRoleCapabilities`/`grantRoleCapability` (lines 9778-9864) | role-match |
| `frontend/src/lib/api.ts` (MODIFY — add `listChanges`, `listRoleHolders`) | service (API helper) | request-response (filtered GET) | itself, `getAdminUserAudit` (lines 3792-3807) | exact |
| `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (MODIFY — UADM-01, becomes canonical editor) | component (tab) | CRUD (read + guided mutation) | itself (existing read-only version) + `RoleCapabilityClient.tsx` (mutation/error-state wiring) | exact base, role-match for mutation wiring |
| `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx` (NEW, CAP-08) | component (modal flow) | event-driven (multi-step confirm) | `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` | role-match (single-step → multi-step; same Modal+Button+danger-confirm shape) |
| `frontend/src/app/admin/users/tabs/GuidedGrantFlow.tsx` (NEW, D-16 symmetric) | component (modal flow) | event-driven (confirm) | `frontend/src/app/admin/role-capabilities/GrantCapabilityModal.tsx` | exact |
| `frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx` (NEW, D-13b) | component | CRUD (read, list) | `frontend/src/app/admin/users/tabs/UserAuditTab.tsx` | role-match |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx` (NEW, CAP-09/D-19) | component (modal) | event-driven (compute → confirm → track status) | `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` (Modal/Button shape) + `RoleCapabilityClient.tsx` (loading/error state wiring) | role-match |
| `frontend/src/app/admin/role-capabilities/capabilityCategories.ts` (MODIFY — add 4 missing category labels, Pitfall 2) | utility | transform (label lookup) | itself | exact — extend in place |
| `frontend/src/app/admin/roles/RoleHoldersTable.tsx` (NEW, D-07) | component | CRUD (read, list) | `frontend/src/app/admin/users/tabs/UserAuditTab.tsx` (`AuditTable`) | role-match (simple `Table`-rendering list) |
| `frontend/src/app/admin/claims/page.tsx` + `ClaimsClient.tsx` (NEW top-level nav area, D-23) | route + component (list+filter) | CRUD (filtered read + action) | `frontend/src/app/admin/users/page.tsx` + `AdminUsersClient.tsx` + `useUserListFilters.ts` | exact (list+filter+pagination shape) |
| `frontend/src/app/admin/users/tabs/ClaimDecisionImpactPanel.tsx` (NEW, D-24, inside `Modal`) | component (modal) | event-driven (compute → confirm) | `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` | role-match |
| `frontend/src/app/admin/changes/page.tsx` + `ChangesClient.tsx` (NEW top-level nav area, D-25) | route + component (list+filter) | CRUD (filtered read) | `frontend/src/app/admin/users/page.tsx` + `AdminUsersClient.tsx` + `useUserListFilters.ts` | exact |
| `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` (NEW, D-25/D-26, pure fn) | utility | transform (event_type → German sentence) | `frontend/src/app/admin/role-capabilities/capabilityCategories.ts` (`categoryDisplayLabel`) | exact (label-mapping pattern) |
| `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` (MODIFY — D-29 display-bug fix) | component (tab) | transform (render fix only) | itself (existing tab) | exact — extend in place |
| `frontend/src/components/ui/ActivationStatusIndicator.tsx` (NEW, CAP-10, added to `@/components/ui`) | component (primitive addition) | transform (status → badge/pill) | `frontend/src/components/ui/Badge.tsx` (existing semantic-variant pattern, verify at plan time) | role-match |

## Pattern Assignments

### `backend/internal/handlers/admin_capability_impact_handler.go` (handler, batch request-response)

**Analog:** `backend/internal/handlers/admin_effective_rights_handler.go`

**Imports pattern** (lines 1-19):
```go
package handlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)
```

**Narrow-interface + doc-comment convention** (lines 21-65) — declare only the methods this
handler actually needs from the resolver, mirroring the existing pattern so tests can substitute
fakes without a real Postgres-backed resolver:
```go
type effectiveRightsPermissionService interface {
	CanForFansubGroup(ctx context.Context, actor permissions.Actor, action permissions.Action, fansubGroupID int64) (permissions.Result, error)
	ResolveGroupRights(ctx context.Context, actor permissions.Actor, fansubGroupID int64) (*permissions.GroupRightsResolution, error)
}
```
The impact handler needs the SAME `ResolveGroupRights` method, called once per affected role
holder (before/after), never a second evaluator (D-20, binding — see Anti-Pattern below).

**Core inspection pattern to replicate for "before" state, then repeat with a synthetically
modified role set for "after"** (lines 190-217):
```go
func (h *AdminEffectiveRightsHandler) GetEffectiveRights(c *gin.Context) {
	identity, actor, ok := permissionActorFromContext(c)
	if !ok {
		return
	}
	fansubGroupID, targetAppUserID, ok := h.parseGroupAndTarget(c)
	if !ok {
		return
	}
	if !h.authorizeManagement(c, identity, actor, fansubGroupID, targetAppUserID, "effective_rights.inspect.denied", "effective_rights") {
		return
	}
	targetActor, ok := h.resolveTargetActor(c, targetAppUserID, fansubGroupID)
	if !ok {
		return
	}
	resolution, err := h.permissionSvc.ResolveGroupRights(c.Request.Context(), *targetActor, fansubGroupID)
	if err != nil {
		log.Printf("effective rights inspect: resolve error (group=%d, target=%d): %v", fansubGroupID, targetAppUserID, err)
		internalError(c, "interner serverfehler")
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": effectiveRightStatesFromResolution(resolution)})
}
```
For the impact handler: call this shape once per role holder returned by the new role-holder
repository query (R-03), with the "after" resolution computed by feeding
`permissions.evaluateGroupRights` (pure function, `backend/internal/permissions/effective_rights.go`
lines 254-336) a copy of `groupRightsSources.Roles` with the hypothetical action added/removed —
never write a second SQL-driven evaluator.

**Target DTO already locked — do not redefine, only produce** (`backend/internal/handlers/capability_policy_contract.go` lines 122-131):
```go
type CapabilityOverrideImpactItem struct {
	TargetUserID int64               `json:"target_user_id"`
	Before       EffectiveRightState `json:"before"`
	After        EffectiveRightState `json:"after"`
}
type CapabilityOverrideImpactPreview struct {
	AffectedUserCount int                            `json:"affected_user_count"`
	Items             []CapabilityOverrideImpactItem `json:"items"`
}
```

**Error handling pattern** (lines 210-215, 384-424 `writeMutationError`): explicit German-language
`gin.H{"error": gin.H{"message": ...}}` payloads, `log.Printf` with contextual identifiers before
every `internalError`/4xx write — reuse this shape verbatim, never a bare `err.Error()` string to
the client.

---

### `backend/internal/handlers/admin_role_holders_handler.go` (handler, CRUD read)

**Analog:** `backend/internal/handlers/role_catalog_handler.go` (52 lines — small, single-purpose
read handler; good shape reference for a narrow new query-backed handler)

**Security pattern (V4 Access Control, binding per RESEARCH):** this is genuinely new surface area
with no 1:1 precedent — decide explicitly at plan time whether it is platform-admin-only
(`requirePlatformAdminIdentity`, matches `AdminCapabilityHandler`'s pattern, used when "who holds
role X" must span ALL groups) or per-group-authorized (`permissionActorFromContext` +
`CanForFansubGroup`, matches `AdminEffectiveRightsHandler`'s pattern, used if scoped to one group).
Do not invent a third authorization pattern.

---

### `backend/internal/handlers/admin_changes_handler.go` (handler, filtered read)

**Analog:** `backend/internal/handlers/admin_effective_rights_handler.go` (`ListOverrideHistory`,
lines 354-380) for the paginated-list handler shape:
```go
func (h *AdminEffectiveRightsHandler) ListOverrideHistory(c *gin.Context) {
	// ... authorizeManagement ...
	limit, offset := parseHistoryPageParams(c)
	entries, err := h.targetRepo.ListHistoryForSubject(c.Request.Context(), targetAppUserID, fansubGroupID, limit, offset)
	// ...
	c.JSON(http.StatusOK, gin.H{"data": capabilityOverrideAuditItemsFromHistory(entries)})
}
```
Repurpose `parseHistoryPageParams`'s limit/offset-from-query-string pattern for the new
`/admin/changes` endpoint's `benutzer`/`gruppe`/`rolle`/`capability`/`claim`/`zeitraum`/`akteur`
filters (D-25/D-28) — same query-param-parsing convention, extended with more filter keys.

---

### `backend/internal/handlers/admin_capability_handler.go` (MODIFY, CAP-10 activation-status field)

**Analog:** itself — extend the existing `GrantCapability`/`RevokeCapability` in place.

**Exact fail-safe pattern that must gain an honest response signal** (lines 166-170, 241-245):
```go
// D-06: Cache nach erfolgreicher Mutation neu laden.
// Fail-safe: Reload-Fehler wird nur geloggt — Mutation war erfolgreich, alter Cache bleibt gültig.
if err := h.permissionSvc.ReloadCache(c.Request.Context(), h.mutationRepo); err != nil {
	log.Printf("capability grant: ReloadCache fehlgeschlagen (role=%q, action=%q): %v — alter Cache bleibt gültig", roleCode, actionCode, err)
}
```
Per Pitfall 3 / CAP-10, this reload-failure signal today never reaches the JSON response
(`c.JSON(http.StatusOK, gin.H{"message": "Capability erfolgreich zugewiesen."})`, line 182/257) —
the minimal, honest fix is to capture the `ReloadCache` error into a boolean/status field on the
response body (contract-chain extension: OpenAPI → Go DTO → `frontend/src/types/` →
`frontend/src/lib/api.ts`, per D-35), not to invent a new async polling mechanism.

---

### `backend/internal/repository/authz_role_holders_repository.go` (repository, join query)

**Analog:** `backend/internal/repository/authz_capability_mutations.go` (`ListCapabilityMatrix`,
lines 86-200) — the established shape for a multi-table join query with in-Go aggregation into
ordered slices:
```go
func (r *AuthzRepository) ListCapabilityMatrix(ctx context.Context) (*CapabilityMatrix, error) {
	query := `
		SELECT ad.code, ad.label_de, ad.category, ...
		FROM action_definitions ad
		CROSS JOIN role_definitions rd
		LEFT JOIN role_capabilities rc ON rc.action_code = ad.code AND rc.role_code = rd.code
		ORDER BY rd.sort_order, rd.code, ad.sort_order, ad.code
	`
	rows, err := r.db.Query(ctx, query, standaloneActionCodes)
	if err != nil {
		return nil, fmt.Errorf("list capability matrix: query: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var row CapabilityMatrixRoleRow
		if err := rows.Scan(&row.ActionCode, /* ... */); err != nil {
			return nil, fmt.Errorf("list capability matrix: scan: %w", err)
		}
		// ... aggregate into ordered map/slice ...
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list capability matrix: iterate: %w", err)
	}
	return &CapabilityMatrix{ /* ... */ }, nil
}
```
For the new role-holder query (R-03): join `fansub_group_member_roles` (indexed on `role`) →
`fansub_group_members` → `fansub_groups` → `app_users`, filtered on one `role_code`, returning
`(app_user, group, status)` tuples — same `Query`/`defer rows.Close()`/`rows.Scan` loop/`rows.Err()`
error-wrapping convention, every `fmt.Errorf` prefixed with the function name exactly as above.

**Error-wrapping convention (apply verbatim to every new repository method in this phase):** every
returned error is `fmt.Errorf("<method-name-lowercase>: <step>: %w", err)` — never a bare
`err`/`errors.New` without the method-name prefix.

---

### `backend/internal/repository/audit_logs_query.go` (repository, filtered/paginated read — NEW file)

**Analog:** `backend/internal/repository/admin_users_tab_repository.go` (`GetUserAudit`, lines
286-326):
```go
func (r *AdminUsersRepository) GetUserAudit(
	ctx context.Context,
	appUserID int64,
) (*models.AdminUserAuditResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT al.id, al.event_type, COALESCE(al.target_type, ''), al.target_id,
			COALESCE(al.action_name, ''), COALESCE(al.outcome, ''), al.created_at::text
		FROM audit_logs al
		WHERE al.actor_app_user_id = $1
		   OR (al.target_type = 'app_user' AND al.target_id = $1)
		ORDER BY al.created_at DESC
		LIMIT 100
	`, appUserID)
	// ... scan loop, rows.Err() ...
	return &models.AdminUserAuditResult{Entries: entries}, nil
}
```
For the central "Änderungen" list (D-25/D-28), extend this exact `audit_logs`-query shape with
dynamic `WHERE` fragments for benutzer/gruppe/rolle/capability/claim/zeitraum/akteur filters plus
real `LIMIT`/`OFFSET` pagination (see `ListAdminUsersPage`'s
`limit`/`offset` clamping convention in `backend/internal/repository/admin_users_repository.go`
lines 30-48 — clamp `limit` to a sane max, default 25, never trust an unclamped client value).
Keep this in a **new** file (`audit_logs_query.go` or similar), not appended to the existing
write-only `audit_logs.go` (81 lines today — fine to grow slightly, but a filtered list query is a
distinct read-path concern worth its own file per the 450-line discipline headroom already flagged
in RESEARCH for `admin_effective_rights_handler.go`).

---

### `backend/internal/repository/admin_users_tab_repository.go` — `ListUserContributions` (MODIFY, D-29/R-08)

**Analog:** itself — extend the existing query in place (lines 181-204):
```go
rows, err := r.db.Query(ctx, `
	SELECT
		ac.id, ac.fansub_group_id, fg.name AS fansub_group_name,
		ac.anime_id, a.title AS anime_title,
		ac.release_version_id,
		CASE WHEN ac.release_version_id IS NULL THEN 'project_default' ELSE 'release_override' END,
		COALESCE(ac.dispute_state, ''),
		COALESCE(ARRAY_AGG(acr.role_code ORDER BY acr.role_code) FILTER (WHERE acr.role_code IS NOT NULL), ARRAY[]::text[]),
		(ac.member_id IS NULL) AS is_legacy_historical
	FROM anime_contributions ac
	JOIN fansub_groups fg ON fg.id = ac.fansub_group_id
	JOIN anime a ON a.id = ac.anime_id
	LEFT JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id
	LEFT JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
	WHERE COALESCE(ac.member_id, hfgm.member_id) = $1
	GROUP BY ac.id, ac.member_id, fg.name, a.title
	ORDER BY a.title, ac.release_version_id NULLS FIRST, ac.id
`, memberID)
```
Per R-08, add `JOIN release_versions ON release_versions.id = ac.release_version_id`,
`JOIN fansub_releases ON fansub_releases.id = release_versions.release_id`,
`JOIN episodes ON episodes.id = fansub_releases.episode_id`, select
`release_versions.version` and `episodes.episode_number` alongside the existing columns, and add
both fields to `models.AdminContributionItem` (Go), `frontend/src/types/admin-users.ts`, and the
tab component's render (contract-chain discipline, D-35) — additive, no schema migration needed.
This is the exact fix locus for the `Version {release_version_id}` display bug (D-29); do not
expand into grouping/range-collapse (explicitly Phase 139, out of scope).

---

### `frontend/src/lib/api.ts` (MODIFY — add effective-rights consumption functions)

**Analog:** itself, `getAdminUserGroupRights` (lines 3738-3753) for a simple parameterized GET:
```typescript
export async function getAdminUserGroupRights(
  userId: number,
): Promise<AdminUserGroupRightsResponse> {
  const response = await apiClientFetch(
    `/api/v1/admin/users/${userId}/group-rights`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details);
  }
  return response.json() as Promise<AdminUserGroupRightsResponse>;
}
```
Add `getEffectiveRights(fansubGroupId, appUserId)` calling
`GET /admin/fansubs/:id/app-members/:appUserId/effective-rights` with this exact
fetch/error-parse/throw shape. **Zero of these three Phase-137 functions exist in `api.ts` today**
(R-09, confirmed via full-file grep) — this is genuinely new code, not a modification of an
existing function, even though the backend endpoint is already live.

**Analog for the mutation + `authorizedFetch` variant** (lines 9808-9864,
`grantRoleCapability`/`revokeRoleCapability`):
```typescript
export async function grantRoleCapability(
  roleCode: string,
  actionCode: string,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl()
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/role-capabilities/${encodeURIComponent(roleCode)}/${encodeURIComponent(actionCode)}`,
    { method: 'PUT', headers: { 'Content-Type': 'application/json' } },
  )
  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }
}
```
Use this shape for `mutateCapabilityOverride` (PUT to `.../capability-overrides`, JSON body per
`CapabilityOverrideMutationRequest`), `getRoleCapabilityImpactPreview`, and
`getRoleAssignmentImpactPreview`. **Note the two competing fetch helpers already present in this
file** (`apiClientFetch` vs. `authorizedFetch` + `getApiBaseUrl()`) — match whichever convention
the immediately-surrounding admin-users-section functions use for the effective-rights/user-scoped
calls (`apiClientFetch`, per the 3700s block) vs. the role-capabilities-section calls
(`authorizedFetch`, per the 9700s block); do not mix them within one new function.

---

### `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (MODIFY, UADM-01 — canonical editor)

**Analog:** itself (existing read-only structure) for the overall tab shape — `useCallback`
load function, `isLoading`/`error`/`data` state triad, `LoadingState`/`ErrorState`/`EmptyState`
from `@/components/ui`:
```typescript
const loadData = useCallback(async () => {
  try {
    setIsLoading(true)
    setError(null)
    const resp = await getAdminUserGroupRights(userId)
    setData(resp)
  } catch (err) {
    setError(
      err instanceof ApiError ? err.message : 'Daten konnten nicht geladen werden. Erneut versuchen.',
    )
  } finally {
    setIsLoading(false)
  }
}, [userId])
```
**Re-point this to `getEffectiveRights(fansubGroupId, appUserId)` per group** (R-09/UADM-01) —
the tab today calls the OLD heuristic `GET /admin/users/:userId/group-rights` two-boolean endpoint;
replace with the Phase-137 endpoint, one call per selected group (D-11: rights are structured by
group first, not flattened across groups).

**Mutation-wiring analog (error-classification per status code):** `RoleCapabilityClient.tsx`
(lines 148-198, `handleGrant`/`handleRevoke`) shows the established pattern for classifying
`ApiError.status`/`.code` into specific inline German messages (422 role-not-bearing vs. 409
lockout vs. generic) — reuse this `if (err instanceof ApiError) { if (err.status === X && err.code === 'Y') {...} else {...} } else {...}` cascade for the new guided-revoke/grant mutation handlers.

---

### `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx` (NEW, CAP-08/D-16/D-17)

**Analog:** `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` (65 lines, full
file read):
```tsx
'use client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export function RevokeCapabilityModal({
  open, roleLabel, actionLabel, isMutating, mutationError, isLockout, onConfirm, onClose,
}: RevokeCapabilityModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capability entziehen"
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={isMutating}>Abbrechen</Button>
          {!isLockout && (
            <Button variant="danger" onClick={onConfirm} disabled={isMutating}>
              {isMutating ? 'Wird verarbeitet …' : 'Capability entziehen'}
            </Button>
          )}
        </div>
      }
    >
      {mutationError && <p role="alert" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>{mutationError}</p>}
      {!mutationError && ( <>
        <p>Soll die Capability <strong>{actionLabel}</strong> der Rolle <strong>{roleLabel}</strong> entzogen werden?</p>
      </> )}
    </Modal>
  )
}
```
This single-step confirm shape (`Modal` + `Button variant="danger"` + conditional error paragraph
with `role="alert"`) is the base to extend into `GuidedRevokeFlow`'s multi-step contract (UI-SPEC
Section E): Step 1 source-explanation body replaces the confirm paragraph; the non-deniable case
(D-17) removes the confirm button entirely rather than disabling it — mirror the existing
`{!isLockout && (...)}` conditional-render-not-disable pattern used here for the lockout case.
**Never use `window.confirm()`** — UI-SPEC explicitly cites this file as the established
`Modal`-based precedent that replaced all `window.confirm()` calls (Phase 135-10).

---

### `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx` (NEW, CAP-09/D-19)

**Analog:** `RoleCapabilityClient.tsx`'s loading/error/mutation-state wiring (lines 60-79,
87-122) combined with the `RevokeCapabilityModal.tsx` Modal shape above. Key state triad to reuse:
```typescript
const [isLoading, setIsLoading] = useState(...)
const [error, setError] = useState<string | null>(null)
const [isMutating, setIsMutating] = useState(false)
```
Per UI-SPEC Section F: `Modal` size `lg`, stays open across confirm → activation-status tracking
(do not close-then-reopen a second success screen — extend the SAME modal body in place, matching
the D-21 "modal-stays-open" contract). Confirm button disabled until preview computation finishes,
using `LoadingState` (not a full-page blocking loader) inside the modal body.

---

### `frontend/src/app/admin/role-capabilities/capabilityCategories.ts` (MODIFY, Pitfall 2)

**Analog:** itself — extend `CATEGORY_LABEL_MAP`/`CATEGORY_ORDER` in place. Real categories
confirmed live against `team4s_v2` (R-02): `gruppe`, `gruppenmedien`, `gruppenseite`, `projekt`,
`rechteverwaltung`, `release`, `review` (7 total, 35 actions). Current `CATEGORY_ORDER` in
`RoleCapabilityDetail.tsx` (line 9) only lists `['gruppe', 'projekt', 'release']` — the other four
fall through to a generic `capitalizeFirst` fallback. Add explicit, deliberate German labels for
all 7 rather than leaving 4 on the accidental fallback.

---

### `frontend/src/app/admin/roles/RoleHoldersTable.tsx` (NEW, D-07)

**Analog:** `frontend/src/app/admin/users/tabs/UserAuditTab.tsx`'s `AuditTable` function (lines
70-110) — a pure `Table`/`TableHead`/`TableBody`/`TableRow` rendering function taking a typed
array prop, with an `EmptyState` early-return:
```tsx
function AuditTable({ entries }: { entries: AdminAuditEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="Keine Audit-Einträge vorhanden." description="" />
  }
  return (
    <Table variant="compact">
      <TableHead><TableRow>{/* ...TableHeaderCell columns... */}</TableRow></TableHead>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.event_id}>{/* ...TableCell cells... */}</TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```
For `RoleHoldersTable`: columns `Benutzer | Gruppe | Status | Rechte-Abweichungen | letzte
Aktivität` (D-07), user/group cells rendered as `Button variant="ghost"` navigation links per
UI-SPEC Section A ("never a raw `<a>` or unstyled clickable `<div>`") — see
`UserGroupRightsTab.tsx`'s `resolveRoleLink`-based link-`Button` pattern (lines 70-80) for the
exact clickable-navigation-cell shape to reuse.

---

### `frontend/src/app/admin/claims/` and `frontend/src/app/admin/changes/` (NEW top-level nav areas, D-23/D-25)

**Analog:** `frontend/src/app/admin/users/page.tsx` + `AdminUsersClient.tsx` +
`useUserListFilters.ts` — the established list+filter+pagination shape for a top-level admin nav
area.

**Filter-hook analog** (`useUserListFilters.ts`, full file, 138 lines) — URL-synced filters with
debounced search, `router.replace` (not push), stable `useMemo`'d params object:
```typescript
export function useUserListFilters(limit = DEFAULT_LIMIT): UseUserListFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // ... q/status/role read from searchParams, debounced local searchValue ...
  const writeParams = useCallback((patch, resetOffset = true) => {
    const nextSearchParams = new URLSearchParams(searchParams.toString())
    // ... set/delete keys ...
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [...])
  const params = useMemo(() => ({ /* ... */ }), [...]) // stable reference — avoids render loop
  return { params, searchValue, handleSearchChange, /* ... */ handlePageChange }
}
```
Build `useClaimsListFilters.ts` (status/typ/gruppe/benutzer/zeitraum, D-23) and
`useChangesListFilters.ts` (zeitraum/benutzer/gruppe/rolle/capability/claim/akteur, D-28) on this
exact shape — same debounce/URL-sync/stable-`useMemo` discipline (the file's own comment explains
WHY the `useMemo` is required: an unstable params object causes an infinite
`useEffect → loadX → render → new object → useEffect` loop in the consuming client component).

**List-client analog** (`AdminUsersClient.tsx`, lines 60-91): `useState` triad
(`items`/`isLoading`/`error`/`total`), `useCallback` load function, `Pagination`+`Table` render —
reuse this exact shape for `ClaimsClient.tsx`/`ChangesClient.tsx`.

---

### `frontend/src/app/admin/changes/ChangeEntryTranslator.ts` (NEW, D-25/D-26, pure function)

**Analog:** `frontend/src/app/admin/role-capabilities/capabilityCategories.ts`'s
`categoryDisplayLabel` lookup-table pattern (verify exact export name at plan time; referenced by
`RoleCapabilityDetail.tsx` line 7 import) — a single pure function keyed on a stable string enum
(`category` there, `audit_logs.event_type` here), mapping to a German label/sentence, with a safe
fallback for unmapped values (`capitalizeFirst`) rather than throwing. Centralizing here (per
Don't-Hand-Roll table in RESEARCH) avoids per-component ad hoc string templates drifting apart
across the Änderungen list, the context-scoped history panels (D-27), and `CapabilityHistoryPanel`.

---

### `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` (MODIFY, D-29 display fix)

**Analog:** itself — the exact bug site (line 80, confirmed via direct read):
```tsx
{item.release_version_id != null ? (
  <Badge variant="info">Version {item.release_version_id}</Badge>
) : (
  <Badge variant="muted">–</Badge>
)}
```
Replace with the real business label once the backend projection is extended (see
`ListUserContributions` pattern above): render
`{item.anime_title} · Episode {item.episode_number} · Version {item.version}` — reuse the existing
`Badge` component and existing `ContributionSection`/`Table` layout unchanged; this is a data-field
+ render-string fix only, not a new visual pattern (D-29 binding: no grouping/range-collapse work).

---

## Shared Patterns

### Authorization (two established patterns — pick the correct one per new endpoint, never a third)
**Source A (group-scoped, delegable):** `backend/internal/handlers/admin_effective_rights_handler.go`
lines 113-141 (`authorizeManagement`) — `permissionActorFromContext(c)` +
`h.permissionSvc.CanForFansubGroup(ctx, actor, permissions.ActionUserGroupCapabilityOverrideManage, fansubGroupID)`.
**Source B (global, platform-admin-only):** `backend/internal/handlers/admin_capability_handler.go`
lines 83-87, 133-137, 190-194 — `requirePlatformAdminIdentity(c, h.authzRepo, "")` as the FIRST
action in every handler method.
**Apply to:** every new handler in this phase (impact-preview, role-holders, changes list) — decide
explicitly per endpoint whether it is group-scoped or global-only; do not invent a third check.

### BOLA/IDOR body-vs-path mismatch guard (binding, reuse verbatim)
**Source:** `admin_effective_rights_handler.go` lines 241-256 (`MutateOverride`):
```go
if req.GroupID != fansubGroupID || req.TargetUserID != targetAppUserID {
	auditMutationRejected(c, h.auditLogRepo, identity, "effective_rights.override.rejected",
		&fansubGroupID, "user_group_capability_override", &targetAppUserID,
		permissions.Action(req.ActionCode), "body_path_mismatch")
	c.JSON(http.StatusUnprocessableEntity, gin.H{
		"error": gin.H{"message": "group_id/target_user_id im Body stimmen nicht mit dem Pfad überein"},
	})
	return
}
```
**Apply to:** any new Phase-138 mutation endpoint accepting a group ID + user ID pair in the body
(e.g. a role-assignment mutation for D-22, if the planner builds one) — this exact
reject-and-audit shape, not a silent overwrite of path values from the body.

### Audit logging (unconditional, immediately after commit)
**Source:** `repository/audit_logs.go` `Write()` (full file, 81 lines) + call-site convention at
`admin_capability_handler.go` lines 172-180, `admin_effective_rights_handler.go` lines 313-328:
```go
_ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
	ActorAppUserID: &identity.AppUserID,
	EventType:      "role_capability.granted",
	TargetType:     "role_capability",
	Action:         "grant_capability",
	Outcome:        "allowed",
	Payload:        map[string]any{"role_code": roleCode, "action_code": actionCode},
})
```
**Apply to:** every new mutation this phase introduces (guided revoke/grant confirm,
role-assignment confirm, claim decision confirm) — write unconditionally right after the domain
write commits, independent of any best-effort response-enrichment that follows (GAP-01 precedent:
a downstream read failure must never leave a successful, security-relevant mutation unaudited).

### Error response shape (Go)
**Source:** repeated throughout `admin_effective_rights_handler.go`/`admin_capability_handler.go`:
`c.JSON(<status>, gin.H{"error": gin.H{"message": "<german sentence>", "code": "<snake_case>"}})`
for structured errors; `badRequest(c, "...")`/`internalError(c, "...")` helper functions for the
generic cases. **Apply to:** every new handler's error paths.

### Frontend fetch/error-parse/throw shape
**Source:** every function read in `frontend/src/lib/api.ts` (3738-3807, 9778-9864) follows:
```typescript
if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
```
**Apply to:** every new `api.ts` function this phase adds.

### Component state triad + `@/components/ui` state components
**Source:** every tab component read (`UserGroupRightsTab.tsx`, `UserAuditTab.tsx`,
`UserContributionsTab.tsx`) uses identically: `useState` for `data`/`isLoading`/`error`,
`useCallback` load function, `useEffect(() => { void loadData() }, [loadData])`, and
`LoadingState`/`ErrorState`/`EmptyState` from `@/components/ui` for the three non-happy-path
renders — **never** a hand-rolled spinner/error `<div>`. **Apply to:** every new tab/panel
component in this phase.

### Split-view responsive breakpoint (reuse verbatim, do not invent a second value)
**Source:** `RoleCapabilityClient.tsx` lines 20-33 (`useIsMobile`, `matchMedia('(max-width: 759px)')`).
**Apply to:** any new D-06/D-07/D-08-shaped split view (Rollen "wer besitzt diese Rolle" view if
built as split-view, any new Capabilities-adjacent detail panel).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/components/ui/ActivationStatusIndicator.tsx` (visual shape only) | component (primitive) | transform | No existing multi-state status pill exists in `@/components/ui` today for a 2-4-value enum like `gespeichert/aktiv/fehlgeschlagen`; `Badge`'s semantic variants (`success`/`warning`/`danger`/`info`/`muted`/`neutral`) are the closest building block (role-match, listed above) but the specific "activation status" semantics are new — confirm at plan time whether this belongs inside `Badge` usage only (no new component) or genuinely needs a small new wrapper. |
| Toast/Snackbar (explicitly NOT to be built) | — | — | UI-SPEC (R-10) explicitly forbids inventing one locally; the D-21 modal-stays-open pattern replaces the need. Listed here only to make the "no analog, do not build" decision explicit and traceable. |

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`,
`backend/internal/permissions/`, `backend/cmd/server/`, `frontend/src/app/admin/`,
`frontend/src/lib/api.ts`, `frontend/src/components/ui/` (existence check only).
**Files scanned (read directly, full or targeted):** `admin_effective_rights_handler.go` (full),
`admin_capability_handler.go` (full), `capability_policy_contract.go` (targeted),
`authz_capability_mutations.go` (full), `audit_logs.go` (full), `admin_users_repository.go`
(targeted), `admin_users_tab_repository.go` (targeted, 2 sections), `role_catalog_handler.go`
(existence/size only), `member_claims_handler.go` (existence/size only), `admin_routes.go`
(grepped), `main.go` (targeted), `RoleCapabilityClient.tsx` (full), `RevokeCapabilityModal.tsx`
(full), `RoleCapabilityDetail.tsx` (targeted), `UserGroupRightsTab.tsx` (full), `UserAuditTab.tsx`
(full), `UserContributionsTab.tsx` (full), `AdminUsersClient.tsx` (targeted),
`useUserListFilters.ts` (full), `frontend/src/lib/api.ts` (grepped for function inventory +
2 targeted sections).
**Pattern extraction date:** 2026-08-23

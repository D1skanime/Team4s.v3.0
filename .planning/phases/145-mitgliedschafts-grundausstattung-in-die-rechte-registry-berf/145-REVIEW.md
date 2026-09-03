---
phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf
reviewed: 2026-09-03T22:45:58Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - backend/internal/handlers/app_auth_test.go
  - backend/internal/handlers/dashboard_me_handler_test.go
  - backend/internal/permissions/capability_registry_test.go
  - backend/internal/permissions/effective_rights.go
  - backend/internal/permissions/effective_rights_test.go
  - backend/internal/permissions/permissions.go
  - backend/internal/permissions/permissions_reload_test.go
  - backend/internal/repository/authz_capability_mutations.go
  - backend/internal/repository/authz_permissions.go
  - backend/internal/repository/hist_group_member_roles_repository.go
  - backend/internal/repository/membership_baseline_registry_test.go
  - backend/internal/repository/release_review_query_repository_test.go
  - backend/internal/repository/role_catalog_repository.go
  - backend/internal/services/effective_rights_service_test.go
  - backend/internal/services/review_service_test.go
  - backend/internal/testsupport/phase145_postgres.go
  - database/migrations/0160_membership_baseline_pseudo_role.down.sql
  - database/migrations/0160_membership_baseline_pseudo_role.up.sql
  - frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx
  - frontend/src/app/admin/roles/RoleCapabilityDetail.tsx
  - frontend/src/app/admin/roles/RoleDetailPanel.test.tsx
  - frontend/src/app/admin/roles/RoleDetailPanel.tsx
  - frontend/src/app/admin/roles/RoleRail.test.tsx
  - frontend/src/app/admin/roles/RoleRail.tsx
  - frontend/src/app/admin/roles/RolesClient.test.tsx
  - frontend/src/app/admin/roles/RolesClient.tsx
findings:
  critical: 1
  warning: 2
  info: 0
  total: 3
status: issues_found
---

# Phase 145: Code Review Report

**Reviewed:** 2026-09-03T22:45:58Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

This phase turns the three hardcoded membership-baseline actions
(`fansub_group.members.view`, `fansub_group_media.view`, `fansub_group_media.upload`) into a
reserved, non-assignable pseudo-role (`group_member`) sourced from `role_capabilities`, with a
fail-closed startup/reload guard (`validateMembershipBaselineRegistryPresence`) and a matching
frontend Capability-Matrix treatment (reserved-role badge, dedicated explanatory copy, deep
link from ordinary roles). The Go precedence engine, the migration, and the frontend/test
changes are internally consistent with the six ROADMAP.md success criteria and are well covered
by both pure-Go and real-Postgres tests.

However, tracing the new "capability-editable" reserved role through to the existing
`AdminCapabilityHandler.RevokeCapability` mutation path (used by the Capability Matrix UI this
phase explicitly wires up in `RoleCapabilityDetail.tsx`) surfaces a genuine, currently
un-guarded regression risk: nothing stops a platform admin from revoking one of the pseudo-role's
three mandatory baseline actions through the very UI this phase ships, which can silently corrupt
`role_capabilities` in a way that only manifests as a fatal, unrecoverable startup failure on the
next server restart. This is classified as a BLOCKER below. Two smaller consistency gaps
(missing `reserved` exclusion in a sibling role-picker query, and duplicated hardcoded
action-code lists across Go/TS/SQL) are classified as WARNINGs.

## Critical Issues

### CR-01: Revoking a baseline action from the reserved pseudo-role has no guard against dropping below the mandatory 3-action minimum, risking a fail-closed startup crash

**File:** `backend/internal/permissions/permissions.go:415-431` (`validateMembershipBaselineRegistryPresence`), `database/migrations/0160_membership_baseline_pseudo_role.up.sql:37-41`, `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx:44-128` (reserved-role switches are rendered as ordinary, mutable switches)

**Issue:**

Phase 145 makes `RoleMembershipBaseline` ("group_member") capability-editable in the admin
Capability Matrix on purpose (Success Criterion 5: "... ist aber in der Capability-Matrix im
Admin sichtbar und bearbeitbar"). `RoleCapabilityDetail.tsx` renders all three of its actions as
normal, togglable `Switch` components (no special-casing beyond skipping the "deep link" copy),
and `RolesClient.tsx` wires those toggles straight into the existing
`AdminCapabilityHandler.RevokeCapability` mutation
(`backend/internal/handlers/admin_capability_handler.go`, not itself in this phase's diff but
directly reachable through it).

That handler's only safety check before deleting a `role_capabilities` row is the pre-existing
"Lockout Guard":

```go
count, err := h.mutationRepo.CountRolesWithAction(c.Request.Context(), actionCode)
...
if count <= 1 && !permissions.IsStandaloneAction(permissions.Action(actionCode)) {
    // 409 lockout_guard
}
```

`CountRolesWithAction` counts *every* role in `role_capabilities` that grants the action, not
whether the reserved pseudo-role specifically still meets its 3-action minimum. Per the ROADMAP
research note ("Alle drei Actions stehen bereits in `action_definitions` und sind dort 15 Rollen
über `role_capabilities` zugeordnet") and migration history (`0108`, `0109`, `0146`, `0151`,
`0154`), each of the three baseline actions is *also* granted directly to roughly a dozen other
roles (`fansub_lead`, `project_lead`, `designer`, `editor`, `encoder`, `gfxler`, `techadmin`,
`founder`, `co_leader`, …). Revoking, say, `fansub_group_media.upload` from `group_member`
therefore always leaves `count` well above 1, so the Lockout Guard never fires and the DELETE
succeeds unconditionally.

After the DELETE succeeds, `RevokeCapability` calls `permissionSvc.ReloadCache`, which runs
`validateMembershipBaselineRegistryPresence` and correctly **fails closed in memory** — the old,
still-complete in-memory cache is kept for the running process
(`cacheReloadSucceeded = false` is surfaced to the frontend, which does render an
"ehrlicher Fehlschlag-Text" per `RoleCapabilityImpactPreviewModal.tsx`). But the row is already
gone from the database. On the *next* process start (deploy, restart, crash-loop recovery,
`docker compose restart backend`, …), `main.go` calls:

```go
if err := permissionSvc.LoadCache(ctx, authzRepo); err != nil {
    log.Fatalf("Capability-Registry laden fehlgeschlagen: %v", err)
}
```

`LoadCache` now fails closed against the corrupted 2-of-3 `group_member` row set and the process
exits immediately — the entire backend refuses to start until an operator manually re-inserts the
missing `role_capabilities` row by hand. This is a self-inflicted outage reachable purely through
the officially shipped, tested admin workflow this phase adds (no direct DB access or
out-of-band tooling required), with only a soft, easy-to-miss in-app hint (a failed-reload
banner in a modal) rather than a hard block at mutation time.

**Fix:** Add a dedicated guard in `RevokeCapability` (or, more centrally, in
`RevokeRoleCapability`/the capability mutation repository) that refuses to drop
`role_code == permissions.RoleMembershipBaseline` below its required action set, independent of
`CountRolesWithAction`. For example:

```go
// In RevokeCapability, before the existing Lockout-Guard check:
if roleCode == permissions.RoleMembershipBaseline {
    remaining, err := h.mutationRepo.CountRoleActions(c.Request.Context(), roleCode)
    if err != nil {
        internalError(c, "Grundausstattungs-Prüfung fehlgeschlagen.")
        return
    }
    // remaining is the count BEFORE this revoke; must stay >= 3 after removal.
    if remaining <= 3 {
        c.JSON(http.StatusConflict, gin.H{
            "error": gin.H{
                "code":    "membership_baseline_guard",
                "message": "Diese Berechtigung ist Teil der Mitgliedschafts-Grundausstattung und kann nicht unter die Mindestausstattung entzogen werden.",
            },
        })
        return
    }
}
```

Alternatively (or additionally), make `RevokeRoleCapability` itself reject the mutation inside a
transaction that re-validates `validateMembershipBaselineRegistryPresence`-equivalent state
*before* commit, so the DB can never reach the corrupted state in the first place, rather than
relying on the in-memory `ReloadCache` fail-safe to merely paper over an already-corrupted row
set until the next restart.

## Warnings

### WR-01: `ListGroupHistoryRoleDefinitions`/`IsHistoricalMemberRoleCode` were not updated to exclude reserved roles, unlike their sibling role-picker queries

**File:** `backend/internal/repository/hist_group_member_roles_repository.go:248-284` (`ListGroupHistoryRoleDefinitions`, `IsHistoricalMemberRoleCode`)

**Issue:** This phase added `AND NOT reserved` / `AND NOT rd.reserved` to three other
role-listing queries that could otherwise surface the reserved pseudo-role
(`LoadFansubGroupRoles` in `authz_permissions.go`, `ListFansubGroupRoleDefinitions` and — via the
diff — `ListPublicRoleDefinitions` in `role_catalog_repository.go`). `ListGroupHistoryRoleDefinitions`
(and the `IsHistoricalMemberRoleCode` check that reuses `RoleCodeExistsForContext` for the same
`group_history` context) was left unchanged:

```go
func (r *HistGroupMemberRolesRepository) ListGroupHistoryRoleDefinitions(ctx context.Context) ([]RoleDefinitionOption, error) {
    rows, err := r.db.Query(ctx, `
        SELECT rd.code, rd.label_de, rd.contexts, rd.sort_order, rd.assignable, rd.color_key, rd.icon_key,
               COUNT(rc.action_code)::integer
        FROM role_definitions rd LEFT JOIN role_capabilities rc ON rc.role_code = rd.code
        WHERE 'group_history' = ANY(rd.contexts)
        GROUP BY rd.code ORDER BY rd.sort_order, rd.code
    `)
```

Today this is harmless because `group_member`'s `contexts` array is `ARRAY['fansub_group']` only
(migration `0160`), so it never matches `'group_history' = ANY(rd.contexts)`. But
ROADMAP.md's Success Criterion 5 states the pseudo-role must "in keiner Rollen-Auswahlliste"
(no role-selection list) appear — an intent this phase otherwise enforced defensively across
every other similar query in the same commit. This one was missed, so a future reserved role (or
a future edit widening `group_member`'s `contexts`) would silently leak into the historical-role
picker with no test currently guarding against it.

**Fix:** Add the same guard for consistency and defense-in-depth:

```sql
WHERE 'group_history' = ANY(rd.contexts) AND NOT rd.reserved
```

and thread the same `AND NOT reserved` predicate through `RoleCodeExistsForContext` (or add a
dedicated `NOT reserved` check to `IsHistoricalMemberRoleCode` specifically), so all four
role-selection surfaces enforce the "never assignable" invariant the same way.

### WR-02: The three membership-baseline action codes are duplicated as hardcoded literals in three unrelated places (Go validation, Go doc/migration, TS filter) with no shared constant

**File:** `backend/internal/permissions/permissions.go:424-429` (`validateMembershipBaselineRegistryPresence`), `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx:10-14` (`membershipBaselineCodes`)

**Issue:** `validateMembershipBaselineRegistryPresence` hardcodes
`[]Action{ActionFansubGroupMembersView, ActionFansubGroupMediaView, ActionFansubGroupMediaUpload}`
as a second Go-side list, separate from the migration's seed rows and from
`RoleCapabilityDetail.tsx`'s independent `membershipBaselineCodes` `Set` of the same three raw
string codes. ROADMAP.md documents this duplication as a deliberate, accepted tradeoff for the
frontend filter (the filter must stay for ordinary roles and be disabled only for the reserved
role), but the *third* copy — the Go startup-validation literal — was not called out and is not
strictly required to be a separate literal: it could instead validate against
`standaloneActions`-style shared state or at minimum derive from a single named
`[]Action{...}` var reused by both `validateMembershipBaselineRegistryPresence` and any future
caller, reducing the number of places that must be kept in sync if a baseline action is ever
added/removed/renamed.

**Fix:** Extract a single package-level `var membershipBaselineActionCodes = []Action{...}` in
`permissions.go` and reference it from `validateMembershipBaselineRegistryPresence` (and
anywhere else in Go that needs the literal list), so at least the two Go-side copies collapse
into one. The TS-side duplication is a documented, intentional exception per ROADMAP.md and does
not need to change.

---

_Reviewed: 2026-09-03T22:45:58Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
reviewed: 2026-06-30T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/internal/handlers/admin_capability_handler.go
  - backend/internal/handlers/admin_capability_handler_test.go
  - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
  - backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go
  - backend/internal/repository/authz_capability_mutations.go
  - backend/internal/repository/hist_group_member_roles_repository.go
  - backend/internal/repository/role_definitions_context_test.go
  - backend/internal/repository/fansub_group_app_members_repository_test.go
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersClaimActions.ts
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
  - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx
  - frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx
  - frontend/src/app/admin/role-capabilities/RoleMasterList.tsx
  - frontend/src/app/admin/role-capabilities/capabilityCategories.ts
  - frontend/src/app/admin/role-capabilities/page.tsx
  - frontend/src/components/contributions/ProposalForm.tsx
  - frontend/src/components/ui/Accordion.tsx
  - frontend/src/components/ui/Switch.tsx
  - frontend/src/lib/api.ts
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 94: Code Review Report

**Reviewed:** 2026-06-30
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Reviewed the Phase 94 work splitting role/capability UX into an Assignable-guarded
capability matrix (backend handler + repo + frontend master/detail), a curated
group_history role whitelist for the historical-role dialog, and a large refactor
extracting `GroupMembersTab` into hooks/sub-components.

The capability-matrix Assignable-Guard and Lockout-Guard are correctly implemented in
**both** mutation paths and use `permissions.IsKnownFansubGroupRole` as the single source
of truth (no hardcoded role lists). The read-side group_history whitelist is enforced
correctly in `ListGroupHistoryRoleDefinitions`.

However, there is one **security/data-integrity defect**: the *write* path for historical
roles (`CreateHistGroupMemberRole`) validates `role_code` only against the broad
`group_history` context membership, **not** against the four-role whitelist. Per the
repository's own documentation, Migration 0103 also tags active App roles (translator,
encoder, …) with `group_history`, so a crafted POST can persist a historical-role record
with an App-role code — defeating exactly the curation D-07 was meant to enforce. This is
the same whitelist gap the read endpoint deliberately closes, left open on write.

Additional concerns: the capability-handler test suite tests a **duplicated copy** of the
handler logic rather than the production handler (so the production audit/guard code is not
actually covered, and the test copy already diverges by dropping the revoke audit write),
and two phase-touched files exceed the 450-line modularity constraint.

No ASCII-umlaut violations were found in scoped user-facing strings. No native
`<select>/<input>/<textarea>` outside `@/components/ui` primitives were found in the scoped
non-test files.

## Critical Issues

### CR-01: group_history write path bypasses the role whitelist (accepts active App roles)

**File:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go:237`
(repo: `backend/internal/repository/hist_group_member_roles_repository.go:282`)

**Issue:** `CreateHistGroupMemberRole` validates the submitted `role_code` with
`h.rolesRepo.RoleCodeExistsForContext(ctx, req.RoleCode, "group_history")`, which resolves to:

```sql
SELECT EXISTS(SELECT 1 FROM role_definitions WHERE code = $1 AND 'group_history' = ANY(contexts))
```

The repository explicitly documents (lines 239–250) that Migration 0103 adds the
`group_history` context to active App roles (translator, encoder, …). Therefore this check
returns `true` for App-role codes, and a hand-crafted request
(`POST /admin/fansubs/:id/member-roles` with `{"role_code":"translator", ...}`) will persist
a `hist_group_member_roles` row with an active App-role code. The read endpoint
`ListGroupHistoryRoleDefinitions` applies the four-code whitelist (`founder`, `leader`,
`co_leader`, `project_manager`) precisely to avoid this — but the write path does not, so the
guarantee is only cosmetic. This is a whitelist-enforcement gap (data integrity; it lets the
UI's curated set be circumvented), and it contradicts the disjointness invariant asserted by
`role_definitions_context_test.go`.

**Fix:** Validate writes against the same whitelist used for reads, not the broad context.
Add a repo method (or reuse the whitelist constant) and gate creation on it:

```go
// repository: add
func (r *HistGroupMemberRolesRepository) IsGroupHistoryWhitelistRole(code string) bool {
    for _, c := range groupHistoryDialogRoleWhitelist {
        if c == code {
            return true
        }
    }
    return false
}

// handler CreateHistGroupMemberRole, replacing the RoleCodeExistsForContext check:
if !h.rolesRepo.IsGroupHistoryWhitelistRole(req.RoleCode) {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "error": gin.H{"message": "ungültiger role_code für group_history-Kontext"},
    })
    return
}
```

(Equivalently, change `RoleCodeExistsForContext` to also intersect with the whitelist, or run
the existing whitelist SELECT with `code = ANY($whitelist)`.)

## Warnings

### WR-01: Capability handler tests exercise a duplicated copy, not the production handler

**File:** `backend/internal/handlers/admin_capability_handler_test.go:506-626`

**Issue:** All capability tests instantiate `adminCapabilityHandlerWithStubs`, a local
re-implementation of `GrantCapability`/`RevokeCapability`/`ListCapabilityMatrix`, instead of
the real `AdminCapabilityHandler`. The production handler's guard ordering, audit writes, and
cache-reload calls are therefore never executed by the suite. The copy already **diverges**:
the production `RevokeCapability` writes an audit entry on success
(`admin_capability_handler.go:190-197`), but the stub's `RevokeCapability` omits the audit
write entirely (lines 620-625). A regression in the production revoke-audit path (or in guard
ordering) would pass all tests. The comment at lines 98-104 acknowledges the workaround but
the result is that the security-relevant guards are tested only in a parallel universe.

**Fix:** Make `AdminCapabilityHandler` depend on the small interfaces already declared at the
top of the production file (`capabilityAuthzRepo`, `capabilityMutationRepo`,
`capabilityPermissionSvc`, an audit-writer interface) instead of concrete
`*repository.AuthzRepository`, then construct the real handler with the stubs. Delete
`adminCapabilityHandlerWithStubs` so the production code path is the thing under test.

### WR-02: `ListByMember` is reachable without the `member_id`-belongs-to-fansub check

**File:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go:111-153`

**Issue:** `ListHistGroupMemberRoles` checks `CanForFansubGroup(...View, fansubID)` but then
calls `h.rolesRepo.ListByMember(ctx, memberID)` using the raw `member_id` query param with no
verification that `memberID` actually belongs to `fansubID`. An actor authorized to view
group A can enumerate role rows of a member in group B by passing that member's id. The
mutation handlers (Create/Update/Delete) all enforce the cross-group guard; this read does
not, so it is an authorization-scope leak (historical role rows, status/visibility, source
notes). Severity is Warning rather than Critical because the leaked data is historical
role metadata, but it still crosses the intended group boundary.

**Fix:** Join the membership table in the query (filter by `fansub_group_id`), or pre-check
that the member belongs to `fansubID` (mirror the `histMembersRepo.GetByID` +
`memberRow.FansubGroupID != fansubID` guard used in `CreateHistGroupMemberRole`) before
calling `ListByMember`.

### WR-03: `ProposalForm.tsx` exceeds the 450-line production-file limit

**File:** `frontend/src/components/contributions/ProposalForm.tsx:1-541`

**Issue:** The file is 541 lines, over the project's 450-line modularity constraint, and it
was modified in this phase (94-07 migrated Drawer→Modal). It bundles the `ChoiceSelect`
custom dropdown, the wizard step machine, and all three step panels in one component.

**Fix:** Extract `ChoiceSelect` and/or the per-step panels (`Step1GroupProject`,
`Step2Role`, `Step3NoteRange`) into colocated components to bring the file under 450 lines.

### WR-04: `ui-system/page.tsx` is far over the 450-line limit

**File:** `frontend/src/app/dev/ui-system/page.tsx:1-1251`

**Issue:** The dev showcase page is 1251 lines and was extended in this phase (94-05 added the
Switch/Accordion showcase). Even as a dev-only route it is a source file under the modularity
rule and is now nearly 3x the limit.

**Fix:** Split the showcase into per-primitive showcase modules (e.g.
`showcase/AccordionShowcase.tsx`, `showcase/SwitchShowcase.tsx`) imported by `page.tsx`.

### WR-05: `RoleCapabilityDetail` rebuilds `byCategory` Map on every render with a non-stable group order

**File:** `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.tsx:40-46`

**Issue:** `byCategory` is built by iterating `role.actions` in array order, so the Accordion
category order follows whatever order the backend returns actions in. The Accordion open-state
is keyed by category id, which is stable, so this is not a correctness bug — but because the
grouping is recomputed inline on each render and depends purely on incoming action order, a
backend re-order (or an action whose category appears later) silently changes the displayed
category sequence. There is also no defined ordering of categories (Gruppe/Projekt/Release),
so they render in first-seen order rather than a deliberate order.

**Fix:** Derive `accordionItems` inside a `useMemo` keyed on `role`, and sort the category
entries by a defined order (e.g. the `gruppe < projekt < release` order from
`capabilityCategories`) so the panel order is deterministic.

## Info

### IN-01: `ProposalForm` ChoiceSelect is a hand-built dropdown instead of the `Select` primitive

**File:** `frontend/src/components/contributions/ProposalForm.tsx:67-140`

**Issue:** `ChoiceSelect` implements a custom listbox with native `<button>` elements rather
than using `@/components/ui` `Select`. This predates Phase 94 (not introduced by this diff),
but it is the kind of bespoke-primitive pattern the project conventions discourage. Noted for
follow-up, not blocking this phase.

**Fix:** Evaluate replacing `ChoiceSelect` with the global `Select` primitive (or, if the
avatar/subtitle affordance is required, promote it into `@/components/ui` so the pattern is
shared).

### IN-02: `roleToForm` maps `role.note` but mutations send `source_note`

**File:** `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts:88-96, 305, 311`

**Issue:** `roleToForm` reads `role.note` (the display DTO field), while save sends
`source_note`. The display DTO (`HistGroupMemberRoleDisplayRow.note`) is aliased from
`source_note` server-side, so round-tripping works today, but the field-name asymmetry is a
latent trap if the list endpoint ever stops aliasing.

**Fix:** Add a brief comment documenting that `note` is the read alias of `source_note`, or
unify the field name across read/write types.

### IN-03: Duplicated `getRoleClassName` / `MEDIA_PERMISSION_OPTIONS` across member components

**File:** `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx:71-83`,
`frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx:20-41`,
`frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx:56-61`

**Issue:** `getRoleClassName` and the `MEDIA_PERMISSION_OPTIONS` array are copy-pasted across
three files (one uses a map, one uses an if-chain — same mapping). Drift risk when role styles
or permission labels change.

**Fix:** Extract `getRoleClassName` and `MEDIA_PERMISSION_OPTIONS` into a shared module under
the `edit/` folder and import in all three.

### IN-04: `capabilityCategories.capitalizeFirst` falls back to "Sonstige" only for empty input

**File:** `frontend/src/app/admin/role-capabilities/capabilityCategories.ts:24-27`

**Issue:** `categoryDisplayLabel` returns `capitalizeFirst(category)` for unknown categories,
which echoes the raw technical code (e.g. an unmapped `foo_bar`) directly into the UI rather
than a user-friendly fallback. The `'Sonstige'` fallback only triggers for the empty string.
Low impact (only the three known categories ship today), but an unmapped future category would
surface its raw code to admins.

**Fix:** Either route all unknown categories to a stable label (`'Sonstige'`) or ensure the
map stays in sync with `action_definitions.category`.

---

_Reviewed: 2026-06-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

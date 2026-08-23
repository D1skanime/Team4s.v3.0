---
phase: 138-effective-rights-administration-impact-ux
plan: 16
subsystem: ui
tags: [react, nextjs, admin, fansub-group, capability-overrides, audit-log, claims]

# Dependency graph
requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: "138-01 listRoleHolders/RoleHolderEntry, 138-05 listChanges (filtered admin changes), 138-10 /admin/claims (central claims workspace, fansub_group_id filter), 138-11 translateChangeEntry (central German audit-sentence translator), 138-12 /admin/roles (cross-group role-holders view)"
provides:
  - "Group-scoped 'Rollen' tab (GroupRolesTab) — this group's own already-fetched member-role data, grouped client-side by role code, with clickable user navigation"
  - "Group-scoped 'Änderungen' tab (GroupChangesTab) — reuses the central listChanges endpoint scoped to this group, and the central translateChangeEntry sentence translator"
  - "Existing member list (FansubAppMembersOverview) gains a clickable user-navigation link and an honest 'Rechteabweichungen: –' indicator per member"
  - "Claims link-out button ('Claims dieser Gruppe ansehen') from the collaboration tab to the central /admin/claims?fansub_group_id={id} workspace, gated to platform admins"
affects: [138-VALIDATION, future D-06 follow-ups]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Group-scoped read tabs reuse an already-fetched, already-authorized list endpoint and regroup client-side instead of adding a new backend endpoint (GroupRolesTab reuses listFansubAppMembers; mirrors the codebase's existing 'no redundant editor' precedent)"
    - "Cross-cutting link-out props (claimsLinkOut) are constructed once at the top-level client component and threaded down through the existing section/tab component tree, rather than duplicating navigation logic at each layer"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupChangesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupChangesTab.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/mainTabRouting.ts
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/sections/FansubEditWorkspaceSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditClient.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubDetailsTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx

key-decisions:
  - "listChanges's real group filter parameter is `gruppe`, not `fansub_group_id` as sketched in the plan's interfaces block — verified against AdminChangesListParams/ChangesClient.tsx and corrected in GroupChangesTab.tsx"
  - "The plan's files_modified named a non-existent GroupMembersTable.tsx; the real collaboration-tab member list component is FansubAppMembersOverview.tsx, confirmed by directory listing and modified there instead (per the plan's own interfaces-block instruction to verify before editing)"
  - "Claims link-out is gated on isPlatformAdmin (not just a fansub-group capability) because /admin/claims sits behind PlatformAdminGate — a visible link that 403s for non-admin fansub leads would be a dead end"
  - "roles tab reuses listFansubAppMembers and groups client-side; Rechteabweichungen renders an honest '–' since FansubAppMember carries no override-presence signal (only Plan 138-01's cross-group RoleHolderEntry.has_overrides does)"

requirements-completed: []

# Metrics
duration: 35min
completed: 2026-08-23
---

# Phase 138 Plan 16: Group View Rollen/Änderungen Tabs, Member Rechteabweichungen, Claims Link-out Summary

**Closes D-06's Gruppenansicht: two new group-scoped tabs (Rollen, Änderungen) reusing this phase's existing endpoints/translators with zero new backend surface, a Rechteabweichungen indicator + user-navigation on the existing member list, and a Claims link-out to the central `/admin/claims` workspace instead of a second claims editor.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-23 (session start)
- **Completed:** 2026-08-23T19:34:35Z
- **Tasks:** 2
- **Files modified:** 13 (5 created, 8 modified)

## Accomplishments
- `GroupRolesTab`: regroups this group's already-fetched `listFansubAppMembers` response by role code client-side (no new backend endpoint), with clickable `/admin/users/:id` navigation and an `EmptyState` for zero members.
- `GroupChangesTab`: reuses Plan 138-05's `listChanges` (scoped via the real `gruppe` filter param) and Plan 138-11's `translateChangeEntry` (aliased import, mirrors `ChangesClient.tsx`'s own pattern), with a link out to the full central `/admin/changes?gruppe={id}` view.
- Wired `"roles"`/`"changes"` into `MainTab`/`MAIN_TABS`/`canUseMainTab` and rendered both tabs via `FansubEditSecondaryTabs` (required for the tabs to actually render anything — not explicit in the plan's `files_modified` list, added as Rule 2 missing-critical-functionality).
- Extended the real collaboration-tab member list (`FansubAppMembersOverview.tsx`) with a clickable user-navigation link and an honest `Rechteabweichungen: –` badge per member.
- Added a platform-admin-gated "Claims dieser Gruppe ansehen" link-out to `/admin/claims?fansub_group_id={id}`, threaded from `FansubEditClient` down to the existing invitations card without altering that tab's own content.

## Task Commits

1. **Task 1: GroupRolesTab + GroupChangesTab (new tabs)** - `a801730e` (feat)
2. **Task 2: Member table Rechteabweichungen + navigation, Claims link-out** - `b143d343` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `GroupRolesTab.tsx` / `GroupRolesTab.test.tsx` - group-scoped role-holder table, client-grouped from `listFansubAppMembers`
- `GroupChangesTab.tsx` / `GroupChangesTab.test.tsx` - group-scoped Änderungen list reusing `listChanges`/`translateChangeEntry`
- `mainTabRouting.ts` - added `roles`/`changes` to `MainTab`/`MAIN_TABS`
- `fansubEditAccess.ts` - added `canUseMainTab` gates for `roles`/`changes`
- `FansubEditSecondaryTabs.tsx` - renders `GroupRolesTab`/`GroupChangesTab` for the new tab keys
- `sections/FansubEditWorkspaceSection.tsx` - excludes `roles`/`changes` from the generic `FansubDetailsTab` branch; forwards `claimsLinkOut`
- `FansubEditClient.tsx` - builds the platform-admin-gated `claimsLinkOut` element; new `FansubEditClient.test.tsx` covers its gating
- `FansubDetailsTab.tsx` / `FansubAppMembersSection.tsx` - forward `claimsLinkOut` down to the member overview
- `FansubAppMembersOverview.tsx` - clickable member-name navigation, `Rechteabweichungen` badge, renders `claimsLinkOut` next to the invitations card

## Decisions Made
- `listChanges`'s real group filter is `gruppe`, not `fansub_group_id` (plan interfaces sketch was wrong) — corrected and documented in `GroupChangesTab.tsx`'s file comment.
- The plan's `GroupMembersTable.tsx` file name does not exist; the real component is `FansubAppMembersOverview.tsx` — modified there per the plan's own "verify before editing" instruction.
- Claims link-out gated on `isPlatformAdmin` (route sits behind `PlatformAdminGate`), not a fansub-group capability, to avoid a dead-end link for non-admin group leads.
- `Rechteabweichungen` renders an honest `–` on both new/existing member surfaces since `FansubAppMember` has no override-presence field (only Plan 138-01's cross-group `RoleHolderEntry.has_overrides` does) — no fabricated value, no new backend join.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected `listChanges` group filter param name**
- **Found during:** Task 1 (GroupChangesTab)
- **Issue:** Plan's interfaces block specified `listChanges({fansub_group_id: fansubId, ...})`, but `AdminChangesListParams`/`ChangesClient.tsx` show the real, already-shipped (Plan 138-05/138-11) param is `gruppe`. Using `fansub_group_id` would not type-check (not in `AdminChangesListParams`) and would silently filter nothing.
- **Fix:** Used `listChanges({ gruppe: fansubId, limit: 25, offset: 0 })`; documented the correction in the file's top comment.
- **Files modified:** `GroupChangesTab.tsx`
- **Verification:** `GroupChangesTab.test.tsx` asserts `listChanges` is called with `{ gruppe: 5, ... }`; `tsc --noEmit` clean.
- **Committed in:** `a801730e`

**2. [Rule 1 - Bug] Corrected the plan's `GroupMembersTable.tsx` filename to the real component**
- **Found during:** Task 2
- **Issue:** Plan's `files_modified`/acceptance criteria referenced `GroupMembersTable.tsx`, which does not exist in this codebase. The real collaboration-tab member list is `FansubAppMembersOverview.tsx` (the plan's own interfaces block explicitly flagged this as a "best-effort guess ... MUST be confirmed").
- **Fix:** Modified `FansubAppMembersOverview.tsx` instead; the acceptance criterion's `grep -c "Rechteabweichungen"` intent is satisfied against the corrected file path.
- **Files modified:** `FansubAppMembersOverview.tsx`
- **Verification:** `grep -c "Rechteabweichungen" FansubAppMembersOverview.tsx` = 2.
- **Committed in:** `b143d343`

**3. [Rule 2 - Missing Critical] Wired the new tabs into the actual render tree**
- **Found during:** Task 1
- **Issue:** Adding `"roles"`/`"changes"` to `MainTab`/`MAIN_TABS`/`canUseMainTab` alone makes the tab buttons appear, but nothing renders when selected — `FansubEditWorkspaceSection.tsx`'s branch logic would have silently routed them into the generic `FansubDetailsTab` (which has no case for either), rendering an empty column. Neither `FansubEditSecondaryTabs.tsx` nor `FansubEditWorkspaceSection.tsx` was listed in the plan's `files_modified`.
- **Fix:** Excluded `"roles"`/`"changes"` from the `FansubDetailsTab` branch condition and added render branches in `FansubEditSecondaryTabs.tsx` for `GroupRolesTab`/`GroupChangesTab`, mirroring the existing `pruefungen`/`readiness` pattern.
- **Files modified:** `sections/FansubEditWorkspaceSection.tsx`, `FansubEditSecondaryTabs.tsx`
- **Verification:** `GroupRolesTab.test.tsx`/`GroupChangesTab.test.tsx` render the components directly; manual trace of the tab-routing logic confirms both new keys reach a real render branch.
- **Committed in:** `a801730e`

**4. [Rule 2 - Missing Critical] Threaded `claimsLinkOut` through 4 layers to reach the invitations card**
- **Found during:** Task 2
- **Issue:** The acceptance criterion requires the literal claims URL string inside `FansubEditClient.tsx` (where `isPlatformAdmin`/`activeMainTab` are available), but the invitations card it should appear "near" lives 4 component layers deeper (`FansubEditWorkspaceSection` → `FansubDetailsTab` → `FansubAppMembersSection` → `FansubAppMembersOverview`). Neither of the middle two files was listed in the plan's `files_modified`.
- **Fix:** Built the gated `claimsLinkOut` `ReactNode` once in `FansubEditClient.tsx` and threaded it down as a plain prop through all four layers to its actual render site next to "Offene Gruppeneinladungen".
- **Files modified:** `FansubEditClient.tsx`, `sections/FansubEditWorkspaceSection.tsx`, `FansubDetailsTab.tsx`, `FansubAppMembersSection.tsx`, `FansubAppMembersOverview.tsx`
- **Verification:** `FansubEditClient.test.tsx` (new) proves the gating (platform-admin + collaboration tab only); `grep -c "/admin/claims?fansub_group_id=" FansubEditClient.tsx` = 1.
- **Committed in:** `b143d343`

---

**Total deviations:** 4 auto-fixed (2 bug corrections, 2 missing-critical-functionality additions)
**Impact on plan:** All four were necessary for the plan's own stated behaviors to actually work (a filter param that type-checks and actually filters; tabs that render something instead of a blank pane; a claims link-out that appears where the plan says it should). No scope creep beyond what D-06 requires.

## Issues Encountered
- `npm test -- --run "GroupRolesTab|GroupChangesTab|FansubEditClient"` (the plan's own literal `<verify>` command, pipe-joined single string) reports "No test files found" — Vitest's CLI filter does not treat a pipe-joined string as alternation; the equivalent working form is multiple space-separated positional args (`--run "GroupRolesTab" "GroupChangesTab" "FansubEditClient"`), which passes 8/8. Documented here since this is a recurring pattern in this phase's plan `<verify>` blocks, not specific to this plan's code.
- No test file existed matching the `FansubEditClient` filter pattern before this plan (the closest, `page.test.tsx`, does exercise `FansubEditClient` indirectly via `AdminFansubEditPage` but has a different filename). Added `FansubEditClient.test.tsx` scoped to the new `claimsLinkOut` gating, with all of `FansubEditClient`'s hooks/child sections stubbed (mirrors `page.test.tsx`'s own mocking style for the same tree).
- `FansubAppMembersSection.test.tsx` (8/8 tests) and 12/60 tests in `page.test.tsx` fail with `useRoleCatalog must be used within RoleCatalogProvider` — confirmed via `git stash` to be present identically before and after this plan's changes (same failure count both ways). Root cause is unrelated pre-existing `useRoleCatalog()` calls in `FansubAppMembersOverview.tsx` and `AnimeReleasesCockpit.tsx` with no provider in those test files' render trees. Logged to `deferred-items.md`; left untouched per the scope-boundary rule.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-06's Gruppenansicht is now fully real: Benutzer (extended existing member list with navigation + Rechteabweichungen), Rollen (new tab), Claims (link-out to the central workspace, no duplicated editor), Änderungen (new tab).
- This closes the last plan of Phase 138. Phase-level closure (full regression/code-review gate, ROADMAP/STATE phase-complete marking) is the orchestrator's next step, not part of this plan.
- Pre-existing `useRoleCatalog` provider gaps in two unrelated test files remain open technical debt (see `deferred-items.md`); do not block this plan or the phase.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED
All created files and both task commits (`a801730e`, `b143d343`) verified present.

---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 08
subsystem: ui
tags: [css, react, typescript, role-colors, gap-closure]

# Dependency graph
requires:
  - phase: 148-04
    provides: "The presentationForRole()/data-color-key seam migration pattern (ROLE_CATALOG_CHIP_CLASS / data-color-key on the badge element), already proven against FansubAppMembersOverview.tsx"
  - phase: 148-07
    provides: "148-VERIFICATION.md's independently-confirmed SC1/SC2 gap: FansubEdit.module.css still fed dead --role-accent-<code> tokens to two live sibling components 148-04 didn't touch"
provides:
  - "GroupMembersHistTable.tsx and FansubAppMemberAddModal.tsx migrated off their local getRoleClassName()/roleClassMap onto the same presentationForRole()/data-color-key seam every other consumer already uses"
  - "FansubEdit.module.css's nine dead role-specific class blocks (feeding undefined --role-accent-<code> tokens) removed; .fansubEditRoleBadge/.fansubEditRoleOption keep their exact pre-existing formulas minus the one dead self-assignment"
  - "grep -rln -- '--role-accent-' frontend/src now returns only the one benign false positive inside a test file's own negative-assertion regex — zero live dead-token references remain outside LayeredBadgeArtwork.module.css"
  - "Real-render tests proving the data-color-key seam (color_key changes the attribute, label_de does not) for both newly-migrated components"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useRoleCatalog('fansub_group') is globally available in any client component under the root layout's RoleCatalogProvider — no prop drilling needed to reach the catalog from a component that only receives role codes as props/data, matching the pattern already used by FansubAppMembersOverview.tsx, DefaultCrewManager.tsx, and others."

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css

key-decisions:
  - "Kept the existing base classes (.fansubEditRoleBadge, .fansubEditRoleOption) and their --role-bg/--role-border/background/border-color/color declarations exactly as-is, removing only the one dead --role-accent: var(--role-accent-base) self-assignment line from each — mirrors exactly what Plan 148-04 did for .fansubEditMemberRoleToggle (commit cb273707), not a new pattern. Did NOT switch these two elements to ROLE_CATALOG_CHIP_CLASS (the generic chip class globals.css/other surfaces use), since these two elements have their own, still-in-scope, unmodified formula the Restoration Rule requires preserving byte-for-byte — ROLE_CATALOG_CHIP_CLASS would have been a different visual formula, which the Restoration Rule only permits for ContributionCard's documented exception."
  - "Deleted the nine role-specific CSS class blocks (.fansubEditRoleLead through .fansubEditRoleDefault) entirely rather than just their dead --role-accent-<code> line, per the user's explicit instruction — these blocks also carried role-specific --role-bg/--role-border gradient overrides that were never wired to role_definitions.color_key at all (a separate, hardcoded-by-role-name scheme layered on top of the broken token system), and are now fully unreferenced now that both getRoleClassName() call sites are gone."
  - "Called useRoleCatalog('fansub_group') directly inside the leaf component that renders the badge (HistoricalMemberCard in GroupMembersHistTable.tsx; the FansubAppMemberAddModal component itself) rather than threading a new roles prop through the exported props interface — avoids widening either component's public prop contract for an internal seam detail, matching how FansubAppMembersOverview.tsx calls the hook directly rather than receiving roles as a prop."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~40min
completed: 2026-09-05
---

# Phase 148 Plan 08: Close the FansubEdit Dead-Token Gap (SC1/SC2) Summary

**`GroupMembersHistTable.tsx` and `FansubAppMemberAddModal.tsx` — two sibling admin components `148-VERIFICATION.md` found still running a third and fourth copy of the exact broken role-code-to-CSS-class pattern Plan 148-04 removed from `FansubAppMembersOverview.tsx` — are now migrated onto the same `presentationForRole()`/`data-color-key` seam, and the nine dead `--role-accent-<code>` CSS class blocks that fed them are gone.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- `GroupMembersHistTable.tsx`'s historical-member role badge and `FansubAppMemberAddModal.tsx`'s two role-selection button rows (member roles, invite roles) now derive their color via `data-color-key={presentationForRole(roles, code).colorKey}`, sourced from `useRoleCatalog('fansub_group')` — identical seam to every other role-color consumer in the codebase.
- Both local `getRoleClassName()`/`roleClassMap` functions (role-code keyed, hardcoding 8 of the catalog's role codes with a `fansubEditRoleDefault` fallback for the rest) are removed. `grep -rn "getRoleClassName" frontend/src` now returns empty repo-wide.
- `FansubEdit.module.css`: `.fansubEditRoleBadge` and `.fansubEditRoleOption` keep every existing declaration except the one dead `--role-accent: var(--role-accent-base)` self-assignment, which is removed so `--role-accent` now resolves via the `[data-color-key]` seam already present on the same element. The nine role-specific class blocks (`.fansubEditRoleLead` … `.fansubEditRoleDefault`) that fed the dead `--role-accent-<code>` tokens are deleted entirely — they carried no formula that survives independent of the catalog, and are fully unreferenced now that both call sites are gone.
- `grep -rln -- "--role-accent-" frontend/src` now returns exactly one file, `MemberCurrentProjectsSection.test.tsx` — a confirmed benign match inside that test's own `expect(...).not.toMatch(/--role-accent-/)` negative-assertion regex literal, not a live CSS reference. This is precisely the target state `148-VERIFICATION.md` specified for SC2.
- Both components' test files gained a `RoleCatalogProvider` mock (neither used the hook before this plan) and two new tests each: one proving the rendered `data-color-key` matches the catalog's `color_key` with no role-code-specific dead class present, and one proving the `color_key`-changes/`label_de`-does-not-change independence property, mirroring the SC7 test Plan 148-04 added to `FansubAppMembersSection.test.tsx`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate both components onto the data-color-key seam; remove dead CSS blocks** - `4b575d2b` (fix)
2. **Task 2: Add data-color-key-seam tests to both components' test files** - `c0844d69` (test)

**Plan metadata:** `ff55e3a7` (docs: register gap-closure plan, written before implementation since the full fix was already fully specified)

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx` - removed `getRoleClassName()`; `HistoricalMemberCard` now calls `useRoleCatalog('fansub_group')` and sets `data-color-key` on the role `Badge`
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` - added `RoleCatalogProvider` mock + 2 new tests
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx` - removed `getRoleClassName()`; the modal component now calls `useRoleCatalog('fansub_group')` and sets `data-color-key` on both role-option `Button` rows (member roles, invite roles)
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.test.tsx` - added `RoleCatalogProvider` mock + 2 new tests
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` - removed the dead self-assignment from `.fansubEditRoleBadge`/`.fansubEditRoleOption`; deleted the nine dead role-specific class blocks

## Decisions Made
See `key-decisions` in frontmatter above.

## Deviations from Plan
None — plan executed exactly as written. The plan itself (`148-08-PLAN.md`) was authored immediately before implementation, from the user's own precise specification of the fix (mirroring 148-04's already-proven pattern), so there was no discovery gap between plan and execution.

## Verification

- `grep -rn "getRoleClassName" frontend/src` → empty
- `grep -rln -- "--role-accent-" frontend/src` → `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` only
- `grep -rn "categoryForRole" frontend/src` → empty (unaffected, re-confirmed)
- Frontend: `npx vitest run` on the 4 changed/touched test files individually (10 tests) green; full suite re-run: 290 files / 2230 tests passed, 1 skipped, 0 failures (was 2226 before this plan's 4 new tests)
- `npx tsc --noEmit` — only the pre-existing, unrelated generated route-type error remains
- `npx eslint` on all 5 touched files — clean
- Backend (unaffected by this plan, re-confirmed for completeness): `go build ./...` and `go vet ./...` both exit 0

## Issues Encountered
None.

## User Setup Required
None.

## Next Phase Readiness
The gap `148-VERIFICATION.md` reported against ROADMAP Phase 148 Success Criteria 1 and 2 is closed.
Re-verification (a fresh `148-VERIFICATION.md`) is the next step before Phase 148 and milestone v1.4
can be marked complete in ROADMAP.md/STATE.md.

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*

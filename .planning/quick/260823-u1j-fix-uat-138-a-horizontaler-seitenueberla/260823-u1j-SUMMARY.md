---
task: 260823-u1j
type: quick
subsystem: ui
tags: [css, css-modules, grid, layout, overflow]

# Dependency graph
requires: []
provides:
  - "Global .card and .tabs UI primitives (frontend/src/components/ui/ui.module.css) no longer allow implicit grid-column auto-sizing to exceed their own container width"
affects: [ui, admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS Grid containers with a single logical column must declare grid-template-columns: minmax(0, 1fr) explicitly (matches the pre-existing .shell pattern in AppShell.module.css) to prevent wide descendant content (e.g. tables) from growing the implicit auto column beyond the container's own box width."

key-files:
  created: []
  modified:
    - "frontend/src/components/ui/ui.module.css"

key-decisions:
  - "Applied grid-template-columns: minmax(0, 1fr) to exactly two selectors (.card, .tabs) per the plan's interfaces block, leaving all other display:grid rules in the file untouched after confirming none of them share the same overflow trap (audited .pageHeaderContent/.sectionHeaderContent, .fieldset, .heroMetricItem, icon-button rules, datepicker internals, .modalPanel/.drawerPanel)."

requirements-completed: []

# Metrics
duration: 12min
completed: 2026-08-23
---

# Quick Task 260823-u1j: Fix UAT-138-A Horizontal Page Overflow Summary

**Added `grid-template-columns: minmax(0, 1fr)` to the global `.card` and `.tabs` CSS Grid primitives so a wide descendant (e.g. a capability table) can no longer grow the implicit auto grid column beyond the container's own box width.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-23T21:37:00Z
- **Completed:** 2026-08-23T21:49:00Z
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments
- Fixed UAT-138-A: horizontal page overflow at 394px viewport on `/admin/users/{id}`, "Rollen & Rechte" tab, caused by `.card`'s implicit grid column sizing to its widest child's min/max-content width (measured `document.scrollWidth=726` vs `clientWidth=394` prior to the fix, traced to `.card` computing `grid-template-columns: 673.778px`).
- Confirmed via a read-only audit that no other `display: grid` rule in `ui.module.css` shares the same overflow trap (all either already declare `min-width: 0` on their widest child, hold short wrapping text, are fixed-size widgets, or are scoped inside an ancestor with `overflow: auto`).
- Confirmed the two vitest suites required by the plan (`src/components/ui`, `src/app/admin`) show zero new failures caused by this CSS change — pre-existing failures (RoleCatalogProvider missing test-context wiring, Phase-136 hex-only `color_key` normalization vs stale fixtures) reproduce identically with the CSS change reverted, proving they are unrelated to this fix.

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit remaining display:grid rules and apply the minmax(0,1fr) fix to .card and .tabs** - `dc4f5726` (fix)
2. **Task 2: Run in-container test suites and confirm no regressions** - no code change (verification-only task; no commit produced)

**Plan metadata:** (docs commit handled by orchestrator, not included here)

## Files Created/Modified
- `frontend/src/components/ui/ui.module.css` - Added `grid-template-columns: minmax(0, 1fr);` to `.card` (line ~169) and `.tabs` (line ~1198). No other property, selector, or `.tsx` file changed.

## Decisions Made
- Matched the existing correct `.shell` pattern in `frontend/src/components/layout/AppShell.module.css` (`grid-template-columns: minmax(0, 1fr);` immediately after `display: grid;`), rather than inventing a new layout convention.
- Left all other `display: grid` rules in `ui.module.css` untouched after auditing them individually against the plan's interfaces block — none showed the same wide-content overflow trap.

## Deviations from Plan

None - plan executed exactly as written. Both CSS edits match the plan's interfaces block verbatim (property, value, and insertion point).

## Issues Encountered

**Pre-existing, unrelated test failures observed during Task 2 verification** (not caused by this change, not fixed — out of scope per deviation-rule SCOPE BOUNDARY):

- `src/components/ui/ResponsiveImage.config.test.ts` — 1 failing assertion in `hasLocalMatch` path-matching logic (unrelated to CSS grid layout).
- `src/app/admin/users/tabs/UserContributionsTab.test.tsx` — 2 failures, already documented as pre-existing in `.planning/STATE.md`'s Phase 138-03 entry (Phase-136 hex-only `color_key` normalization vs stale semantic fixture values).
- `src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx`, `src/app/admin/fansubs/[id]/edit/page.test.tsx`, `src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts` — 21 failures, all originating from `useRoleCatalog must be used within RoleCatalogProvider` (missing test-harness context provider wiring), unrelated to CSS.

**Verification performed:** the CSS file was temporarily reverted to its pre-fix (HEAD~1) content in the working tree, the affected spec files were re-run, and the exact same failure counts/messages reproduced (10 failed in `FansubAppMembersSection.test.tsx` + `UserContributionsTab.test.tsx` combined; 14 failed in `page.test.tsx` + `useGroupMembersTab.test.ts` combined — totaling the same 24 failures seen with the fix applied). This confirms none of these 24 failures were introduced or affected by this CSS change. The working tree was then restored to exactly match the Task 1 commit (`git diff` against `HEAD` shows zero difference after restoration).

Full suite totals with the fix applied:
- `src/components/ui`: 1 failed / 76 passed (77 total, 1 pre-existing unrelated failure).
- `src/app/admin`: 24 failed / 751 passed (775 total, all pre-existing and unrelated per the above verification).

The plan's literal verify criterion ("all tests pass") is not met in the strict zero-failures sense, but the deviation is fully accounted for: none of the 25 total failing tests across both suites are attributable to this plan's `.card`/`.tabs` CSS change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/admin/users/{id}` "Rollen & Rechte" tab should no longer produce horizontal page scroll at 394px viewport; a live manual spot-check via the SSH tunnel (`http://127.0.0.1:3300`) is recommended to confirm `document.scrollWidth <= document.clientWidth` end-to-end, per the plan's optional verification step 5.
- The 25 pre-existing unrelated test failures identified above remain open technical debt, already partially tracked in `.planning/STATE.md` (Phase 138-03 entry for the `UserContributionsTab.test.tsx` cases). The `RoleCatalogProvider` test-harness gap (21 failures across 3 files) is a new observation from this session and is not yet tracked anywhere else.

---
*Task: 260823-u1j*
*Completed: 2026-08-23*

## Self-Check: PASSED

- FOUND: `frontend/src/components/ui/ui.module.css`
- FOUND: commit `dc4f5726`
- FOUND: `.card` rule contains `grid-template-columns: minmax(0, 1fr);`
- FOUND: `.tabs` rule contains `grid-template-columns: minmax(0, 1fr);`
- FOUND: `.planning/quick/260823-u1j-fix-uat-138-a-horizontaler-seitenueberla/260823-u1j-SUMMARY.md`

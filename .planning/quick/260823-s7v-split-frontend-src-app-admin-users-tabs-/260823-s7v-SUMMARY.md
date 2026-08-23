---
phase: quick-s7v
plan: 01
subsystem: ui
tags: [react, nextjs, refactor, admin, modularity]

requires: []
provides:
  - UserGroupRightsTab.tsx split into 6 files, all <=450 lines, zero behavior change
  - New sibling files userGroupRightsHelpers.ts, CapabilityDetailRow.tsx, CategoryTable.tsx,
    GroupRolesSection.tsx, GroupSection.tsx under frontend/src/app/admin/users/tabs/
affects: [admin-users, effective-rights-ui]

tech-stack:
  added: []
  patterns:
    - "Pure structural file-split: helpers/components moved verbatim, orchestrator file keeps
      only data-loading/flow-state/top-level render, regression-gated by existing test suite"

key-files:
  created:
    - frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts
    - frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx
    - frontend/src/app/admin/users/tabs/CategoryTable.tsx
    - frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
    - frontend/src/app/admin/users/tabs/GroupSection.tsx
  modified:
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx

key-decisions:
  - "UserGroupRightsTab.tsx remains the sole default export, canonical UADM-01 editor, and sole
    mutation-flow orchestrator (renders GuidedRevokeFlow/GuidedGrantFlow/RoleAssignmentImpactModal
    unchanged); the split only relocates pure helpers and presentational sub-components."

patterns-established:
  - "Leaf-first extraction order (pure helpers -> leaf components -> mid-level composed
    components -> orchestrator rewire) keeps every intermediate git commit compilable and
    test-green, even with temporary duplication between commits."

requirements-completed: []

duration: 25min
completed: 2026-08-23
---

# Quick Task 260823-s7v: Split frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx Summary

**Split a 716-line UserGroupRightsTab.tsx (59% over CLAUDE.md's 450-line cap) into 6 cohesive
sibling files with byte-identical logic, verified by the pre-existing 9/9 test suite passing
unchanged.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-23T20:01:00Z
- **Completed:** 2026-08-23T20:26:00Z
- **Tasks:** 2 completed
- **Files modified:** 6 (5 created, 1 rewritten)

## Accomplishments
- `UserGroupRightsTab.tsx` reduced from 716 lines to 269 lines (all remaining lines are
  data-loading, flow-state orchestration, and the top-level render — unchanged from before).
- 5 new sibling files created, each well under the 450-line cap: `userGroupRightsHelpers.ts` (91),
  `CapabilityDetailRow.tsx` (93), `CategoryTable.tsx` (88), `GroupRolesSection.tsx` (96),
  `GroupSection.tsx` (101).
- Zero behavior change: every moved function/component body is verbatim (byte-identical logic,
  comments, and German strings/umlauts preserved); only import paths and file boundaries changed.
- All 9 pre-existing `UserGroupRightsTab.test.tsx` assertions pass unchanged after the split, with
  no test file edits required (confirmed by the plan's own interface analysis: the test file only
  imports `{ UserGroupRightsTab }` from `'./UserGroupRightsTab'`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract pure helpers and leaf-level components (helpers, CapabilityDetailRow,
   CategoryTable)** - `8a13c3f1` (refactor)
2. **Task 2: Extract GroupRolesSection and GroupSection, rewire UserGroupRightsTab.tsx, verify
   full suite** - `7039195b` (refactor)

**Plan metadata:** committed separately by the orchestrator (docs commit, not included here).

## Files Created/Modified

- `frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts` (created, 91 lines) - Pure
  helpers/derivations: `sortCategories`, `groupStatesByCategory`, `decisiveSourceLabel`,
  `roleLabelFor`, `assignableFansubGroupRoles`, plus private `CATEGORY_ORDER`/`UNKNOWN_CATEGORY`
  constants.
- `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` (created, 93 lines) - Expanded
  capability detail/provenance row (revoke/grant/remove-override actions + embedded
  `CapabilityHistoryPanel`).
- `frontend/src/app/admin/users/tabs/CategoryTable.tsx` (created, 88 lines) - Per-category
  capability table with expandable detail rows.
- `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx` (created, 96 lines) - Group-membership
  role display/assign/revoke section (D-22).
- `frontend/src/app/admin/users/tabs/GroupSection.tsx` (created, 101 lines) - Per-group card
  composing `GroupRolesSection` + category accordion of `CategoryTable`.
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` (rewritten, 716 -> 269 lines) - Data
  loading (memberships/rights/matrix), flow-state orchestration (revoke/grant/roleAssignment),
  top-level render; remains sole default export and mutation-flow orchestrator.

## Final Line Counts (`wc -l`)

| File | Lines |
|------|-------|
| `UserGroupRightsTab.tsx` | 269 |
| `userGroupRightsHelpers.ts` | 91 |
| `CapabilityDetailRow.tsx` | 93 |
| `CategoryTable.tsx` | 88 |
| `GroupRolesSection.tsx` | 96 |
| `GroupSection.tsx` | 101 |

All 6 files are at or below the 450-line CLAUDE.md modularity cap.

## Deviations from Plan

None — plan executed exactly as written. Every function/component body was moved verbatim
(byte-identical), German umlauts preserved, no native `<select>/<input>/<textarea>/<button>`
introduced, and no test file required edits.

## Verification

Ran `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run
src/app/admin/users/tabs/ --reporter=basic'` after both tasks:

- Task 1 (baseline, `UserGroupRightsTab.tsx` untouched): 9/9 `UserGroupRightsTab.test.tsx` pass;
  2 pre-existing, unrelated `UserContributionsTab.test.tsx` failures present (documented in
  STATE.md Phase 138 notes as a stale Phase-136 hex-only `color_key` fixture mismatch, out of this
  plan's scope).
- Task 2 (after full split + rewrite): identical result — 9/9 `UserGroupRightsTab.test.tsx` pass
  unchanged, same 2 pre-existing unrelated `UserContributionsTab.test.tsx` failures, no new
  regressions across the full `src/app/admin/users/tabs/` suite (38/40 total, unchanged from
  baseline).

Additionally ran `npx tsc --noEmit -p tsconfig.json` inside the container: only 5 pre-existing,
unrelated Next.js App Router `PageProps` type errors in `.next/dev/types/app/...` (matching the
already-documented pattern noted in STATE.md's Phase 135/137 entries); zero errors in any of the 6
files touched by this plan.

Manually diffed `UserGroupRightsTab.tsx` between the two commits and confirmed the remaining
`UserGroupRightsTab({ userId })` function body (all hooks, handlers, and JSX including the 3 flow
modals) is byte-identical to the pre-split original — only imports and now-relocated
function/component definitions were removed.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## Threat Flags

None. This plan is a pure structural move within an existing trust boundary (admin browser to
`UserGroupRightsTab` render tree); no new network endpoint, auth path, file access pattern, or
schema change was introduced. Matches the plan's own `<threat_model>` disposition (both threats
accepted, no new mitigation required).

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/users/tabs/userGroupRightsHelpers.ts
- FOUND: frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx
- FOUND: frontend/src/app/admin/users/tabs/CategoryTable.tsx
- FOUND: frontend/src/app/admin/users/tabs/GroupRolesSection.tsx
- FOUND: frontend/src/app/admin/users/tabs/GroupSection.tsx
- FOUND: frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
- FOUND: commit 8a13c3f1
- FOUND: commit 7039195b

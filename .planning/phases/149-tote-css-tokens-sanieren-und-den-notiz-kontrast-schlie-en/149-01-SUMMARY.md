---
phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en
plan: 01
subsystem: ui
tags: [css-custom-properties, design-tokens, admin, releases-page]

# Dependency graph
requires:
  - phase: 148-tote-css-tokens (prior CSS token restoration work)
    provides: the locked globals.css token set (--text-muted, --text-primary, --surface-card, --text-faint) this plan renames dead references onto
provides:
  - 16 fallback-free dead-token references fixed across 5 files (Block A, file group 1 of 3)
  - --color-text-muted -> --text-muted in 3 admin user-detail tabs (4 occurrences)
  - --color-text -> --text-primary, --color-surface -> --surface-card, --color-text-tertiary -> --text-faint in the group releases page (10 occurrences)
  - --color-surface -> --surface-card in GroupEdgeNavigation (2 occurrences)
affects: [149-02, 149-03, 149-UI-SPEC guard test]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure token-name substitution: replace dead/undefined CSS custom-property references with an already-defined equivalent token, never touching fallback-protected var(...) calls or the token's own stored value."

key-files:
  created: []
  modified:
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/app/admin/users/tabs/UserAuditTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/page.module.css"
    - frontend/src/components/groups/GroupEdgeNavigation.module.css

key-decisions:
  - "Used sed with explicit line-number anchors for the CSS file changes to guarantee the two fallback-protected var(--color-surface, #f9f9f9) occurrences (lines 37, 93) were never touched, since the dead and fallback-protected forms share the same token name."

patterns-established:
  - "Token-rename verification via grep gates: assert dead-token grep returns zero fallback-free matches, assert replacement-token count matches expected occurrences, assert fallback-protected line count is unchanged."

requirements-completed: []

# Metrics
duration: ~5min
completed: 2026-09-06
---

# Phase 149 Plan 01: Dead CSS Token Rename (Block A, File Group 1) Summary

**Renamed 16 fallback-free dead-token `var()` references (`--color-text-muted`, `--color-text`, `--color-surface`, `--color-text-tertiary`) to their already-defined replacement tokens across 3 admin user-tabs and 2 releases/group-nav CSS modules, per the locked mapping in 149-UI-SPEC.md.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-09-06T06:42:50Z (approx, per STATE.md session marker)
- **Completed:** 2026-09-06T06:45:04Z
- **Tasks:** 2/2 completed
- **Files modified:** 5

## Accomplishments
- Fixed all 4 fallback-free `--color-text-muted` occurrences in `UserOverviewTab.tsx` (2), `UserAuditTab.tsx` (1), `UserGroupRightsTab.tsx` (1) by renaming to `--text-muted`
- Fixed all 10 fallback-free occurrences of `--color-text` (3), `--color-surface` (4), `--color-text-tertiary` (3) in `releases/page.module.css` by renaming to `--text-primary`, `--surface-card`, `--text-faint` respectively
- Fixed the 2 fallback-free `--color-surface` occurrences in `GroupEdgeNavigation.module.css` by renaming to `--surface-card`
- Verified the 2 fallback-protected `var(--color-surface, #f9f9f9)` occurrences in `releases/page.module.css` (lines 37, 93) remain byte-identical

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix --color-text-muted in the three admin user tabs** - `5c6366df` (fix)
2. **Task 2: Fix --color-text, --color-surface, --color-text-tertiary in releases/page.module.css and GroupEdgeNavigation.module.css** - `e97dfe63` (fix)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` - 2 inline-style `color` values renamed to `var(--text-muted)`
- `frontend/src/app/admin/users/tabs/UserAuditTab.tsx` - 1 inline-style `color` value renamed to `var(--text-muted)`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` - 1 inline-style `color` value renamed to `var(--text-muted)`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.module.css` - 10 declarations renamed (`--color-text`->`--text-primary` x3, `--color-surface`->`--surface-card` x4, `--color-text-tertiary`->`--text-faint` x3)
- `frontend/src/components/groups/GroupEdgeNavigation.module.css` - 2 declarations renamed (`--color-surface`->`--surface-card`)

## Decisions Made
- Applied `sed` with exact line-number targeting (not a blanket string replace) for the CSS files, since the fallback-protected form `var(--color-surface, #f9f9f9)` shares the same base token name as the dead form `var(--color-surface)` — a naive global find/replace risked corrupting the fallback-protected lines. Verified afterward via `git diff` that only the 12 intended lines changed.

## Deviations from Plan

None — plan executed exactly as written. Every changed line matched the plan's cited file:line exactly; no other line in any of the 5 files was touched.

## Issues Encountered

`npx tsc --noEmit` inside the frontend container reports one pre-existing, unrelated error in `releases/[releaseVersionId]/page.ts` (Next.js 16 `PageProps`/`params` typing mismatch) that exists independently of this plan's changes — it is not in any of the 3 touched `.tsx` files and was not introduced by the string-literal edits. Confirmed via `grep` that the compiler output contains zero errors referencing `UserOverviewTab`, `UserAuditTab`, or `UserGroupRightsTab`. This matches the project's already-documented precedent (STATE.md Phase 133/135 notes) of pre-existing unrelated Next.js route-type errors being out of scope for feature/fix plans. Not fixed here — out of scope for this plan (Block A, file group 1); left as-is.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 16 fallback-free dead-token occurrences in this plan's 5-file scope are resolved; the two fallback-protected `--color-surface` occurrences are untouched.
- Plans 149-02 and 149-03 (the other two file groups in Block A, zero file overlap) and the guard-test/PublicNoteCard contrast work remain to complete the phase's full 39-occurrence scope and Success Criteria 3-7.
- No blockers for subsequent plans.

---
*Phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en*
*Completed: 2026-09-06*

## Self-Check: PASSED

All 5 modified files confirmed present on disk; both task commits (`5c6366df`, `e97dfe63`) confirmed in `git log --oneline --all`. No missing items.

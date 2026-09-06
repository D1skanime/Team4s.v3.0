---
phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en
plan: 02
subsystem: ui
tags: [css-custom-properties, design-tokens, admin, navigation]

# Dependency graph
requires:
  - phase: 148-tote-css-tokens (prior CSS token restoration work)
    provides: the locked globals.css token set (--surface-card-muted, --accent-primary, --color-success, --text-faint) this plan renames dead references onto
provides:
  - 15 fallback-free dead-token references fixed across 4 files (Block A, file group 2 of 3)
  - --surface-muted -> --surface-card-muted in project.module.css (2) and GroupMediaReviewSection.module.css (5)
  - --accent -> --accent-primary and --success -> --color-success in FansubEdit.module.css (7)
  - Breadcrumbs.module.css:41 two-level dead reference closed (inner fallback -> --text-faint, outer --breadcrumb-separator-color seam preserved)
affects: [149-01, 149-03, 149-UI-SPEC guard test]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure token-name substitution: replace dead/undefined CSS custom-property references with an already-defined equivalent token, never touching fallback-protected var(...) calls or the token's own stored value."
    - "Two-level dead-reference fix: when a var()'s fallback argument is itself an unresolvable var() reference, replace only the inner fallback target while preserving the outer customization-seam token."

key-files:
  created: []
  modified:
    - "frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/project.module.css"
    - "frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css"
    - "frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css"
    - frontend/src/components/navigation/Breadcrumbs.module.css

key-decisions:
  - "Used sed with explicit line-number anchors for all CSS edits to guarantee only the plan-cited lines changed, since GroupMediaReviewSection.module.css already had one pre-existing (correct, non-dead) var(--surface-card-muted) usage at line 361 sharing the same replacement token name as the 5 lines being fixed."

patterns-established:
  - "Token-rename verification via grep gates: assert dead-token grep returns zero fallback-free matches, assert replacement-token count reflects fixed occurrences, assert untouched sibling rule blocks (e.g. .fansubEditMemberRoleToggle*) are byte-identical via before/after grep diff."

requirements-completed: []

# Metrics
duration: ~7min
completed: 2026-09-06
---

# Phase 149 Plan 02: Dead CSS Token Rename (Block A, File Group 2) Summary

**Renamed 15 fallback-free dead-token `var()` references (`--surface-muted`, `--accent`, `--success`, and the Breadcrumbs two-level dead reference) to their already-defined replacement tokens across 4 files, per the locked mapping in 149-UI-SPEC.md.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-06T06:42:00Z (approx)
- **Completed:** 2026-09-06T06:49:00Z
- **Tasks:** 2/2 completed
- **Files modified:** 4

## Accomplishments
- Fixed both fallback-free `--surface-muted` occurrences in `project.module.css` (`.roleDetailRow`, `.segmented`) by renaming to `--surface-card-muted`
- Fixed all 5 fallback-free `--surface-muted` occurrences in `GroupMediaReviewSection.module.css` (lines 39, 187, 280, 379, 423) by renaming to `--surface-card-muted`, preserving the `color-mix(in srgb, ... 70%, transparent)` wrapper/percentage at line 39 unchanged
- Fixed all 5 fallback-free `--accent` occurrences in `FansubEdit.module.css` (`.fansubEditCandidateResult:hover`/`:focus-visible`, `.fansubEditCandidateResultSelected`) by renaming to `--accent-primary`, leaving the `.fansubEditMemberRoleToggle*` rules (Phase 148's frozen role-color formulas) byte-identical
- Fixed both fallback-free `--success` occurrences in `FansubEdit.module.css` (`.fansubEditCandidateSelection`) by renaming to `--color-success`
- Closed the two-level dead reference at `Breadcrumbs.module.css:41` by replacing only the inner fallback (`var(--color-text-tertiary)` -> `var(--text-faint)`), keeping `--breadcrumb-separator-color` as the outer customization seam intact

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix --surface-muted in project.module.css and GroupMediaReviewSection.module.css** - `ee240234` (fix)
2. **Task 2: Fix --accent, --success in FansubEdit.module.css and the Breadcrumbs two-level dead reference** - `db11a3f5` (fix)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/project.module.css` - 2 declarations renamed (`--surface-muted` -> `--surface-card-muted`)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css` - 5 declarations renamed (`--surface-muted` -> `--surface-card-muted`), color-mix wrapper/percentage unchanged
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` - 7 declarations renamed (`--accent` -> `--accent-primary` x5, `--success` -> `--color-success` x2); `.fansubEditMemberRoleToggle*` rules untouched
- `frontend/src/components/navigation/Breadcrumbs.module.css` - 1 declaration's inner fallback renamed (`var(--color-text-tertiary)` -> `var(--text-faint)`); outer `--breadcrumb-separator-color` token preserved

## Decisions Made
- Applied `sed` with exact line-number targeting (not a blanket string replace) for all CSS files, since `GroupMediaReviewSection.module.css` has a pre-existing, already-correct `var(--surface-card-muted)` usage at line 361 that shares the destination token name with the 5 lines being fixed — a naive global find/replace on the source token name was safe here (source token `--surface-muted` never appears at line 361), but line-anchored edits were used throughout for consistency with Plan 149-01's established pattern and to make the diff trivially auditable against the plan's cited line numbers.
- Verified via `git diff` after each edit that only the plan-cited lines changed in each file.

## Deviations from Plan

None — plan executed exactly as written. Every changed line matched the plan's cited file:line exactly; no other line in any of the 4 files was touched.

One documentation discrepancy noted (not a deviation from execution, informational only): the plan's acceptance criterion for `GroupMediaReviewSection.module.css` states "grep -c var(--surface-card-muted) equals 5" — the actual post-fix count is 6, because the file already contained one pre-existing, correct (non-dead) `var(--surface-card-muted)` usage at line 361 that is unrelated to this plan's 5 fixed occurrences (confirmed via `git log`/`git show` that line 361 predates this plan, commit `a5b5fc2e`, 2026-07-26). All 5 plan-cited lines (39, 187, 280, 379, 423) were correctly fixed and the dead-token grep for `--surface-muted` returns empty as required — the substantive truth of the acceptance criterion (no dead references remain) holds; only the raw total-count assertion undercounted a pre-existing correct usage.

## Issues Encountered

None. `npx eslint` was run against the 4 touched CSS files as a sanity check; ESLint's config does not lint `.css`/`.module.css` files directly (all 4 report "File ignored because no matching configuration was supplied" — a config-level no-op, not an error), which is expected and matches the project's ESLint setup for CSS Modules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 15 fallback-free dead-token occurrences in this plan's 4-file scope are resolved; the Breadcrumbs two-level dead reference is closed while preserving the outer customization seam.
- Plan 149-01 (5 files, 16 occurrences) is already complete. Plan 149-03 (the remaining file group in Block A) and the guard-test/PublicNoteCard contrast work remain to complete the phase's full 39-occurrence scope and Success Criteria 3-7.
- No blockers for subsequent plans.

---
*Phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en*
*Completed: 2026-09-06*

## Self-Check: PASSED

All 4 modified files confirmed present on disk; both task commits (`ee240234`, `db11a3f5`) confirmed in `git log --oneline --all`. No missing items.

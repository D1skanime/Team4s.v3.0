---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 06
subsystem: ui
tags: [accessibility, a11y, axe-core, profile, heading-hierarchy]

# Dependency graph
requires: [133-01, 133-03]
provides:
  - "MemberProfileMemorialHero.tsx renders the member display name in exactly one <h1 className={styles.heroTitle}>, matching MemberProfileHero.tsx's public-view branch structure"
  - "Axe-core zero-violations coverage for both the memorial and public MemberProfileHero render branches"
affects: [member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MemberProfileMemorialHero.tsx now mirrors MemberProfileHero.tsx's public-view heading structure exactly: p.heroEyebrow -> div.heroTitleRow > (h1.heroTitle + MemberStatusPill), no PageHeader title usage."

key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberProfileMemorialHero.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx

key-decisions:
  - "Strengthened the RED test beyond the plan's literal 'getAllByRole(heading, level:1) has length 1' assertion (which passed unexpectedly pre-fix, since the pre-fix h2 duplicate is a different ARIA level and doesn't affect a level-1 count) by adding assertions that the display name text appears exactly once (`getAllByText('Ballelboy')` length 1) and that zero level-2 headings exist. This follows the TDD fail-fast rule: a passing-when-it-should-fail RED assertion means the test isn't testing the real bug, so it was fixed before proceeding to GREEN."
  - "Axe coverage (Task 2) added as two separate assertions in their natural describe blocks (memorial-variant block, main public-view block) rather than a shared helper, matching the plan's explicit instruction and the file's existing per-describe-block convention."

requirements-completed: [PMA11Y-01, PMA11Y-04]

# Metrics
duration: ~15min
completed: 2026-08-16
---

# Phase 133 Plan 06: Memorial Hero Single-Heading Fix Summary

**Fixed `MemberProfileMemorialHero.tsx` rendering the member's display name twice (once as `<h1>` via `PageHeader`, once as a separate `<h2>`) by dropping `PageHeader` entirely and rendering a single `<h1 className={styles.heroTitle}>` inside `.heroCopy`, mirroring the non-memorial public hero's existing pattern exactly; added axe-core zero-violations coverage for both hero variants.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `MemberProfileMemorialHero.tsx` no longer imports or renders `PageHeader`; the member's display name now renders exactly once, as `<h1 className={styles.heroTitle}>{displayName}</h1>` inside a `<div className={styles.heroTitleRow}>` alongside `MemberStatusPill`, with `"Fansub-Member"` moved to a plain `<p className={styles.heroEyebrow}>` — byte-for-byte matching `MemberProfileHero.tsx`'s public-view branch structure.
- No CSS changes: `.heroTitle`, `.heroEyebrow`, `.heroTitleRow` in `profile.module.css` were already generic (shared with the non-memorial hero) and needed no modification.
- `MemberProfileHero.test.tsx` gained 4 new tests: single-`<h1>`/no-duplicate-text/no-`<h2>` assertion for the memorial variant, `MemberStatusPill`-adjacent-to-heading assertion, and one `axe()` zero-violations assertion each for the memorial and public-view render branches.
- Full `MemberProfileHero.test.tsx` suite: 32/32 passing (28 pre-existing + 4 new).
- `npm run typecheck` (in-container) shows only the already-documented pre-existing `MemberBadgeChain.test.tsx` errors (TS2552 `containe` typo, TS2322 `badgeProgress` prop-shape mismatch) — zero new errors from this plan.
- `npx eslint` clean on both modified files.

## Task Commits

Each task was committed atomically, following the TDD RED/GREEN cycle:

1. **Task 1 RED:** `3b7834ec` (test) - Added failing test asserting single `<h1>`, no duplicate display-name text, and zero `<h2>` headings for the memorial variant.
2. **Task 1 GREEN:** `36f493e4` (feat) - Removed `PageHeader` usage, rendered the single `<h1 className={styles.heroTitle}>` structure.
3. **Task 2:** `57345a48` (test) - Added axe-core zero-violations coverage for both memorial and public hero variants.

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/profile/MemberProfileMemorialHero.tsx` - Removed `PageHeader` import/usage; single `<h1 className={styles.heroTitle}>` now carries the display name, wrapped with `MemberStatusPill` in a `<div className={styles.heroTitleRow}>`; `"Fansub-Member"` moved to `<p className={styles.heroEyebrow}>`. All other lines (avatar, memorial notice, bio, known-for block) untouched.
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - Added `import { axe } from 'jest-axe'`; 4 new tests in/near the existing memorial-variant `describe` block and the main `describe('MemberProfileHero', ...)` block.

## Decisions Made
See `key-decisions` in frontmatter above. Summary: the plan's literal "heading count === 1" RED assertion passed unexpectedly pre-fix (the pre-fix duplicate uses a different heading level, h1 vs h2, so a level-1-only count doesn't catch it) — per the TDD fail-fast rule this was investigated and the test strengthened with a display-name-text-occurrence-count assertion and a zero-`<h2>`-headings assertion before proceeding to GREEN.

## Deviations from Plan

None — plan executed exactly as written; the only judgment call (strengthening the RED test to actually fail before the fix, per the TDD fail-fast rule) was an execution-quality correction within Task 1's own stated behavior, not a scope change. No files outside the plan's declared `files_modified` were touched.

## Issues Encountered

- `npm run typecheck` (in-container) continues to show the same pre-existing `MemberBadgeChain.test.tsx` errors already logged in `deferred-items.md` (TS2552 `containe`/`container` typo, one TS2322 `badgeProgress` prop-shape mismatch) — confirmed unaffected by this plan's changes (neither `MemberBadgeChain.tsx` nor `.test.tsx` was touched). No new deferred items found; this plan's own scope (`MemberProfileMemorialHero.tsx`, `MemberProfileHero.test.tsx`) is fully clean and fully green.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PMA11Y-01 (single, non-duplicated heading hierarchy) is now satisfied across all three profile render states (public, owner, memorial).
- PMA11Y-04 (axe-core WCAG coverage) now extends to both `MemberProfileHero` render branches, using the shared global matcher from Plan 133-01.
- Pre-existing unrelated `MemberBadgeChain.test.tsx` failures and the `page.test.tsx` `styles.familyCard` -> `chainStyles.familyCard` stale-string assertion (logged in `deferred-items.md` from 133-04/133-05) remain open for whichever later Phase 133 plan next touches those files.

## TDD Gate Compliance

RED gate (`3b7834ec`) precedes GREEN gate (`36f493e4`) in git log; both confirmed present. No REFACTOR commit was needed — the GREEN implementation required no follow-up cleanup.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`frontend/src/components/profile/MemberProfileMemorialHero.tsx` verified to contain `h1 className={styles.heroTitle}` and no `PageHeader` reference (grep, zero matches). All 3 task commits (`3b7834ec`, `36f493e4`, `57345a48`) verified present in `git log`. `MemberProfileHero.test.tsx` 32/32 tests passing (in-container `npx vitest run`), including all 4 new tests. `npm run typecheck` and `npx eslint` show zero errors attributable to this plan's changes.

---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 13
subsystem: ui
tags: [css, timeline, role-color, project-member, gap-02]

# Dependency graph
requires:
  - phase: 157-12
    provides: GAP-02 V1/V2/V5 closure (header underline, SectionHeader conversion, notes pager fix), plus the already-CAP-hitting 449/450-line shot-projectmember.mjs
provides:
  - Larger (10px) timeline dot and a thicker (3px), per-entry role-colored line segment on the project-member notes timeline, closing V3/V4 of 157-UAT.md GAP-02 per the operator-approved "Entscheid 2026-09-14 zu V4"
  - Extended unit-test coverage proving each timeline entry's <article> root (not just the trailing <a>) carries its own distinct data-color-key -- the exact DOM attribute the CSS line-color derivation depends on
  - Live screenshot-script diagnostics (lineColor, dotSizes, dotOverflow) proving on a real rendered page that dot and line share the identical role-derived color, that distinct-role entries render distinct line colors when present, and that the larger dot does not overflow the mobile viewport at 390px
  - New frontend/scripts/lib/shotHelpers.mjs (first file in that directory), holding the relocated SHOT_VERIFY_HERO-gated hero-verification pass, freeing room for future shot-projectmember.mjs diagnostics under the 450-line cap
affects: [157-UAT.md GAP-02 human sign-off, any future project-member timeline CSS changes]

tech-stack:
  added: []
  patterns:
    - "Per-entry ::before line segment colored via the same data-color-key -> --role-accent seam the dot already used, with geometry derived algebraically (line height = ownHeight + fixed inter-entry gap) rather than an arbitrary constant"
    - "Large, environment-gated (or otherwise self-contained) script blocks extracted to frontend/scripts/lib/*.mjs as a straight, behavior-preserving relocation when a production script sits at/near the 450-line cap and needs headroom for new diagnostics"

key-files:
  created:
    - frontend/scripts/lib/shotHelpers.mjs
  modified:
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
    - frontend/scripts/shot-projectmember.mjs

key-decisions:
  - "Per Entscheid 2026-09-14 zu V4 (pre-approved, not reopened): each timeline entry owns its own colored line segment reaching to the next entry's dot, not a single shared neutral-gray bar"
  - "Task 1 is coverage-only (not RED-to-GREEN): the data-color-key attribute the CSS depends on was already set by pre-157-13 code, so the new assertions pass immediately; the actual CSS geometry/color change (Task 2) is verified live via the screenshot script (Task 3), not fabricated as a jsdom-observable assertion, since jsdom cannot resolve ::before computed style"
  - "Extracted the pre-existing SHOT_VERIFY_HERO hero-verification block to frontend/scripts/lib/shotHelpers.mjs (straight relocation, zero behavior change) rather than exceeding the 450-line production cap on shot-projectmember.mjs, which was already at 449/450 after plan 157-11"

requirements-completed: [P157-05, P157-13]

duration: 11min
completed: 2026-09-14
---

# Phase 157 Plan 13: Timeline Dot/Line GAP-02 V3+V4 Closure Summary

**Per-entry role-colored timeline line (var(--role-accent) via the existing data-color-key seam) replaces the single neutral-gray bar, plus a visibly larger dot, closing 157-UAT.md GAP-02 V3/V4.**

## Performance

- **Duration:** 11 min (17:50 - 18:01 UTC)
- **Started:** 2026-09-14T17:50:00Z
- **Completed:** 2026-09-14T18:01:07Z
- **Tasks:** 3
- **Files modified:** 3 (1 new file created)

## Accomplishments
- The contribution timeline's dot grew from 6px to 10px and its line grew from 1px to 3px, both now visibly larger per the V3 requirement
- The timeline line is no longer a single, shared, neutral-gray (`var(--color-border)`) bar -- each entry now owns its own line segment colored with `var(--role-accent)`, running from that entry's own dot down to the next entry's dot, via the exact same `data-color-key` seam the dot already used
- A single-role member's timeline (the only fixture currently available live) reads as one continuous colored line, confirmed both by the live screenshot script's `dotColor === lineColor` parity check across all 12 entries and by direct visual inspection of the mobile screenshot
- The multi-role distinct-line-color case is proven at the unit-test level (P157-13 Nachtrag 2's two-role render, now asserting the `<article>` root's own `data-color-key`) and the screenshot script carries a conditional live check that will fire automatically once a multi-role fixture is live, without having been fabricated for the current single-role fixture

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend P157-13 Nachtrag 2 test with entry-root data-color-key assertions** - `dd28743a` (test)
2. **Task 2: Implement larger dot + per-entry role-colored line in CSS** - `0d8ffc2c` (feat)
3. **Task 3: Extend shot-projectmember.mjs with lineColor/dotSizes/dotOverflow diagnostics** - `9ea1d67a` (test)

_Note: Task 1 is coverage-only per the plan's own explicit guidance -- no separate feat commit was needed since the CSS is Task 2._

## Files Created/Modified
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css` - `.dot` grows 6px->10px; `.entry::before` switches from a shared 1px `var(--color-border)` bar to a 3px `var(--role-accent)` per-entry segment, `height: calc(100% + 14px)` reaching the next entry's dot, `:first-child` override removed, `:last-child` now stops at its own bottom edge via `height: calc(100% - 18px)`
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx` - P157-13 Nachtrag 2 test extended with 5 new assertions proving each `<article>` root's own distinct `data-color-key`
- `frontend/scripts/shot-projectmember.mjs` - `noteAccentColorSamples` gains `lineColor`; new `dotSizes`/`dotOverflow` facts; three new throwing checks (dot/line color parity, distinct-role line-color distinctness, mobile dot overflow); the `SHOT_VERIFY_HERO` hero-verification block relocated to `lib/shotHelpers.mjs`
- `frontend/scripts/lib/shotHelpers.mjs` (new) - `runHeroVerification`, a straight, behavior-preserving relocation of the pre-existing hero-layout/accessibility/container-query/zoom-reflow verification pass

## Decisions Made
- Followed the plan's exact derived geometry (dot/line share `top: 18px`; line `height: calc(100% + 14px)` for all but the last entry, `calc(100% - 18px)` for the last) without deviation
- Created `frontend/scripts/lib/shotHelpers.mjs` (plan-sanctioned fallback) because `shot-projectmember.mjs` was already at 449/450 lines after plan 157-11, leaving no room for the new diagnostics; extracted the `SHOT_VERIFY_HERO`-gated block (the largest self-contained, less-frequently-exercised block) rather than the new diagnostics themselves, so the new lineColor/dotSizes/dotOverflow code stays inline in the main script in the same style as the pre-existing checks (matching the plan's `<read_first>` guidance and comfortably satisfying every literal grep-count acceptance criterion)

## Deviations from Plan

None affecting behavior or scope - plan executed as written. Two minor precisions worth noting (not Rule 1-4 fixes):

1. The plan's acceptance criterion `grep -c "var(--color-border)" ... returns 0` could not be exactly satisfied: `.roleChip`'s pre-existing `border: 1px solid var(--color-border);` (present before this plan, explicitly listed in the plan's own "leave unchanged" rule list) also matches this grep pattern, so the actual count is 1, not 0. The substantive intent of the criterion -- "the old neutral-gray LINE color is fully gone from this file" -- is fully satisfied: `.entry::before` no longer references `var(--color-border)` anywhere. This is a plan-authoring grep-check imprecision, not a real requirement gap; `.roleChip`'s border was correctly left untouched per the plan's own explicit scope boundary.
2. Wrote the new CSS comment carefully to avoid literally duplicating the grep-checked string `height: calc(100% + 14px)`, so `grep -c` on that exact pattern returns exactly 1 (the real CSS declaration) rather than 2 (declaration + comment), matching the plan's acceptance criterion to the letter.

## Issues Encountered
- The plan's Task 3 `<verify>` command chains `npx vitest run && node scripts/shot-projectmember.mjs` with `&&`. The full suite has 2 pre-existing, documented, plan-unrelated failures in `cssCustomProperties.guard.test.ts` (a hardcoded line-number in an allow-list drifted after an earlier, unrelated commit `1332686b` touched `roleCatalog.accessibility.test.ts` -- fully documented in this phase's `deferred-items.md`, confirmed via `git log` to predate this plan and lie outside its file scope). This caused the `&&` chain to short-circuit before running the screenshot script. Resolved by running the screenshot script as a separate command; it passed with exit code 0 for all three viewports plus the zoom200 pass. No fix applied to the pre-existing failures (correctly out of scope per this plan's `files_modified`).

## User Setup Required

None - no external service configuration required.

## Live Verification Evidence

- `npx tsc --noEmit` - clean, no errors
- `npx eslint scripts/shot-projectmember.mjs scripts/lib/shotHelpers.mjs src/components/fansubs/projectMember/ProjectMemberNoteEntry.module.css src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx` - clean
- `npx vitest run` - 321 passed / 1 failed file (2 pre-existing, documented, unrelated test failures) / 2697 passed / 2 failed / 3 todo tests -- 0 new failures versus the 157-12 baseline
- `node scripts/shot-projectmember.mjs` (after `docker restart team4sv30-frontend`) - exit code 0 for mobile/tablet/desktop plus the desktop-zoom200 pass
  - `noteAccentColorSamples[].dotColor === lineColor` for all 12 live entries (single-role fixture: `rgb(123, 60, 78)` for both, every entry)
  - `dotSizes`: `[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]` (was 6 pre-plan)
  - `dotOverflow`: `false` on mobile (390px)
  - `sectionHeaderUnderlines`, `noteBorderUniformity`, `noteNestedInteractiveViolations` (all prior GAP-01/GAP-02 checks) still pass, confirming no regression
- Mobile (390px) screenshot visually inspected: dot noticeably larger, line noticeably thicker and colored (dark maroon-pink, matching the typesetter role), reads as one continuous colored line down the full 5-entry visible span, no clipping at the left edge

## Next Phase Readiness

GAP-02's V3 and V4 items are now automated-verification-complete. Per this plan's own `<verification>` item 6 and the phase's established discipline, this does NOT constitute human Live-UAT sign-off -- that remains a separate, still-open operator step (157-06 Task 4 / the broader GAP-02 checklist), consistent with every prior 157-1x plan in this phase.

---
*Phase: 157-projekt-memberseite-visuelles-referenzdesign*
*Completed: 2026-09-14*

## Self-Check: PASSED

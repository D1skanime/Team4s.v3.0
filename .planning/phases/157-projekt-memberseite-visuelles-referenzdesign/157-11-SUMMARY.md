---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 11
subsystem: testing
tags: [playwright, screenshot-tooling, live-uat, gap-closure]

# Dependency graph
requires:
  - phase: 157-06
    provides: the original shot-projectmember.mjs Live-UAT screenshot/facts script this plan corrects
provides:
  - a waitForSectionsSettled(page) helper wired into every viewport's fullPage capture, closing the
    "Wird geladen" false-negative risk in the pre-existing script
  - an always-on (no env gate) 200%-zoom-equivalent overflow check for the desktop viewport, closing
    157-UAT.md checklist point 9 (Browser-Zoom), previously unverified
affects: [157-12, 157-13, 157-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scroll-through-and-settle before fullPage screenshot: progressively scroll the full document,
      explicitly await every still-loading <img> via load/error listeners, return to top, settle
      layout with double requestAnimationFrame -- reused by every subsequent GAP-02 evidence run"

key-files:
  created: []
  modified:
    - frontend/scripts/shot-projectmember.mjs

key-decisions:
  - "Placed the new unconditional 200%-zoom overflow block immediately after the existing
    SHOT_VERIFY_HERO-gated block but BEFORE the existing console.log call (not literally
    'immediately before await ctx.close()' as the plan's action text says), so facts.zoom200Overflow
    actually appears in the printed JSON output per the plan's own verification requirement
    ('JSON facts include zoom200Overflow: false')."
  - "Kept the fix scoped to the single file (frontend/scripts/shot-projectmember.mjs) instead of
    extracting waitForSectionsSettled into a new frontend/scripts/lib/shotHelpers.mjs module, per the
    gap-closure operator's hard constraint to only touch that one file. Reduced comment verbosity in
    both new blocks instead to land exactly at the 450-line project modularity cap (450/450), which
    the plan's own acceptance criteria treats as the alternative to extraction when both paths are
    available."

requirements-completed: [P157-12]

# Metrics
duration: ~7min
completed: 2026-09-14
---

# Phase 157 Plan 11: Screenshot Script Settle-Wait and 200%-Zoom Check Summary

**Fixed the Live-UAT screenshot script's premature fullPage capture (added a scroll-through-and-settle
wait before every screenshot) and added a previously-missing always-on 200%-zoom overflow assertion,
closing 157-UAT.md checklist point 9.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-09-14T16:53:00Z (approx)
- **Completed:** 2026-09-14T16:57:04Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added `waitForSectionsSettled(page)`: scrolls the full document in viewport-height steps to trigger
  lazy image loading, explicitly awaits every still-loading `<img>` via `load`/`error` listeners,
  returns to the top, and settles layout with a double-`requestAnimationFrame` wait -- called exactly
  once per viewport, right before every fullPage screenshot.
- Added an unconditional (no `SHOT_VERIFY_HERO` env gate), desktop-only 200%-zoom-equivalent overflow
  check: resizes to 720x450 (the same CSS-pixel ratio already used by the pre-existing hero-only
  check), re-settles content, captures a `-desktop-zoom200` fullPage screenshot, and asserts
  `scrollWidth <= clientWidth`, throwing with the measured values on failure. This closes
  `157-UAT.md`'s previously-unverified checklist point 9 (Browser-Zoom).
- Verified live against the running stack: `node --check` clean, `eslint` clean, the corrected script
  exits 0 for mobile/tablet/desktop plus the new desktop-zoom200 pass, `zoom200Overflow: false` appears
  in the printed JSON facts, and both fullPage screenshots (desktop, desktop-zoom200) were visually
  inspected and show fully-populated "Texte & Notizen" (12 notes) and "Bilder & Medien" (2 images)
  content -- no "Wird geladen" placeholder anywhere.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a settle-before-screenshot helper and wire it into every viewport capture** - `a51884bb` (fix)
2. **Task 2: Add an always-on 200%-zoom overflow check, lint, and run the corrected script against the live stack** - `c1dae6ba` (fix)

_No TDD tasks in this plan; both are single-commit `type="auto"` tasks._

## Files Created/Modified
- `frontend/scripts/shot-projectmember.mjs` - added `waitForSectionsSettled(page)` helper (wired into
  the main viewport loop before every fullPage screenshot) and an unconditional desktop-only 200%-zoom
  overflow check writing `facts.zoom200Overflow` and a `*-desktop-zoom200.png` screenshot. File is now
  exactly 450 lines (was 396), at the project's modularity cap.

## Decisions Made
- Placement of the new zoom-check block: the plan's action text said "immediately before the existing
  `await ctx.close()` line," but that line sits after the script's existing `console.log(...)` call. A
  literal reading would have meant `facts.zoom200Overflow` never appeared in the printed JSON output --
  contradicting the plan's own verification requirement ("JSON facts include `zoom200Overflow: false`").
  Resolved by placing the new block right after the `SHOT_VERIFY_HERO` block but before `console.log`,
  satisfying both the spirit of "near the end of the loop, after the note-toggle proof and hero block"
  and the literal verification requirement.
- Line-cap resolution: hit 454 lines after Task 2's addition (over the 450-line project cap). The
  plan's acceptance criteria offered two paths -- extract `waitForSectionsSettled` into a new
  `frontend/scripts/lib/shotHelpers.mjs` module, or otherwise stay under 450. The gap-closure operator
  context for this plan explicitly restricted changes to the single file
  `frontend/scripts/shot-projectmember.mjs` ("do not deviate"). Chose to stay within the single file by
  trimming comment verbosity in both new blocks (kept the substance, cut redundant phrasing), landing
  at exactly 450 lines with no functional change.

## Deviations from Plan

None requiring Rule 1-4 classification. The two items above (zoom-check placement relative to
`console.log`, and staying single-file instead of extracting a helper module) are documented as
decisions rather than deviations because they resolve genuine internal tensions in the plan text itself
(the action's literal placement instruction vs. its own verification requirement; the acceptance
criteria's extraction fallback vs. this plan's own gap-closure operator constraint) without changing
scope, behavior, or the plan's stated success criteria.

## Issues Encountered
None. All three automated verification gates (`node --check`, `eslint`, live script run) passed on
first attempt after the line-cap comment trim.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The corrected `shot-projectmember.mjs` is now trustworthy evidence tooling for plans 157-12, 157-13,
  and 157-14, which each depend on producing live screenshots via this exact script as part of their
  own verification.
- This plan makes no functional/visual change to the application itself -- there is no human Live-UAT
  sign-off implication from this plan alone, consistent with its own `<verification>` point 6.
- Phase 157 remains NOT fully accepted overall (the separate, pre-existing 157-06 Task 4 human Live-UAT
  checkpoint stays open, unaffected by this plan).

---
*Phase: 157-projekt-memberseite-visuelles-referenzdesign*
*Completed: 2026-09-14*

## Self-Check: PASSED

- FOUND: frontend/scripts/shot-projectmember.mjs
- FOUND: .planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-11-SUMMARY.md
- FOUND commit: a51884bb
- FOUND commit: c1dae6ba

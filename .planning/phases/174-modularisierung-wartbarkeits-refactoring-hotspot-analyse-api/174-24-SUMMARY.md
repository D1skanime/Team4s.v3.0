---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 24
subsystem: ui
tags: [css-modules, visual-regression, manual-verification, playwright]

# Dependency graph
requires:
  - phase: 174-22
    provides: FansubEdit.module.css single-owner extraction (97 classes, 15 new per-component modules)
  - phase: 174-23
    provides: ui.module.css single-owner extraction (163 classes, 26 new per-primitive modules)
provides:
  - "visual-baseline/after/: 8 AFTER screenshots captured with identical parameters to visual-baseline/before/ (174-01), ready for the Task 2 human pairwise comparison"
  - "AFTER-NOTES.md: documents the frontend-image rebuild, a found-and-fixed fullPage screenshot timing race (not a CSS regression), and classification of all content differences found (all data-only, none CSS)"
affects: [174-REPORT.md (Welle 6)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Same-container TCP loopback proxy (127.0.0.1:3300 -> 127.0.0.1:3000) + Keycloak password-grant token injected as the team4s_access_token cookie, reused identically from 174-01's BASELINE-NOTES.md method"

key-files:
  created:
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/AFTER-NOTES.md
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/button-disabled.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/button-focus.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/button-hover.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/fansub-edit-desktop.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/fansub-edit-mobile-375.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/input-focus.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/select-focus.png
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/after/ui-system-desktop.png
  modified: []

key-decisions:
  - "Rebuilt team4sv30-frontend before capture (image was 1.5 days stale relative to the 174-22/174-23 commits it needed to reflect) — same methodology 174-01 documented as mandatory"
  - "Extended the fullPage-screenshot settle time from BASELINE-NOTES.md's literal 1500ms to 4500ms (desktop) after discovering a Chromium fullPage-capture compositing race: the logo/banner <img> elements were confirmed loaded (complete=true, correct naturalWidth, opacity:1, visibility:visible) well before 1500ms, and a non-fullPage viewport screenshot at 1500ms painted them correctly, but the fullPage capture at 1500ms still rendered them as empty frames. This is a capture-script timing fix, not a product/CSS change."
  - "No fansub-group-id substitution needed — group id 1 (new-subs) is still the correct seeded row"

requirements-completed: []

# Metrics
duration: ~70min
completed: IN PROGRESS — Task 1 complete, Task 2 (human sign-off) pending
---

# Phase 174 Plan 24: Welle-5 Visual-Equality Checkpoint Summary (PARTIAL — Task 2 pending)

**Task 1 complete: AFTER screenshots captured and compared against the 174-01 BEFORE baseline — zero CSS regressions found (5/8 shots byte-identical, the other 3 show only real data changes). Task 2 (the blocking human-verify checkpoint, D-18's actual verification mechanism) is pending and requires explicit user sign-off before this plan or Welle 5 can be considered closed.**

## Performance

- **Duration (Task 1 only):** ~70 min
- **Started:** 2026-10-06
- **Tasks:** 1 of 2 complete (Task 2 is `checkpoint:human-verify gate="blocking"` — cannot be completed autonomously)
- **Files modified:** 9 (8 new PNGs + 1 new AFTER-NOTES.md)

## Accomplishments

- Rebuilt the stale `team4sv30-frontend` image (1.5 days behind the 174-22/174-23 CSS-split commits) before capturing, preventing a stale-vs-fresh false comparison.
- Captured all 8 AFTER screenshots with identical URLs, viewports, fansub group id (1 = `new-subs`), and interactive-state triggers as `visual-baseline/before/BASELINE-NOTES.md` — no substitution was needed.
- Found and fixed (Rule 1 — bug in the capture methodology, not the product) a Chromium fullPage-screenshot compositing race that initially produced a false-positive "missing banner/logo" signal; confirmed via computed style (`opacity:1`, `visibility:visible`, correct `rect`) that the images were actually loaded and painted correctly at the time of capture, and that only the fullPage screenshot mechanism itself needed a longer settle window.
- Classified every remaining before/after difference: `button-hover.png`, `button-focus.png`, `button-disabled.png`, `input-focus.png`, `select-focus.png` are **byte-for-byte identical** to the before/ baseline (strongest possible proof 174-23's Button/Input/Select extraction produced zero visual change for those states); `fansub-edit-desktop.png`/`fansub-edit-mobile-375.png` differ only in the New-Subs group's banner/logo *image content* (real Live-UAT data change, DB-verified: `fansub_groups.logo_id`/`banner_id` point to different, still-valid `media_assets` rows than at baseline time) with identical layout/structure; `ui-system-desktop.png` differs by 30 bytes out of ~7.3 MB with no visible layout/color/spacing difference found in a full side-by-side read of the 1440x20196 page.
- **Zero CSS regressions found** across both 174-22's (`FansubEdit.module.css`) and 174-23's (`ui.module.css`) splits.

## Task Commits

1. **Task 1: Capture visual-baseline/after/** - `eb580710` (docs)
2. **Task 2: Live visual-equality UAT** - **NOT STARTED** (`checkpoint:human-verify gate="blocking"`, requires explicit human sign-off; cannot be auto-approved or simulated)

**Plan metadata:** this SUMMARY committed as a checkpoint-state snapshot; a further `docs(174-24): record Welle-5 visual-equality UAT approval` commit (or discrepancy-fix commits) will follow once the user responds to the checkpoint.

## Files Created/Modified

- `visual-baseline/after/fansub-edit-desktop.png`, `fansub-edit-mobile-375.png`, `ui-system-desktop.png`, `button-hover.png`, `button-focus.png`, `button-disabled.png`, `input-focus.png`, `select-focus.png` — the 8 AFTER screenshots
- `visual-baseline/after/AFTER-NOTES.md` — reproduction notes, the settle-time deviation rationale, and the full content-difference classification

## Decisions Made

See `key-decisions` in the frontmatter. In short: rebuild-before-capture (mandatory per BASELINE-NOTES.md), and an evidence-backed settle-time extension to eliminate a capture-only timing race that was not a real CSS regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in capture methodology, not product code] fullPage screenshot compositing race produced a false "missing image" signal**
- **Found during:** Task 1, first capture pass at the literal 1500ms settle time BASELINE-NOTES.md documents
- **Issue:** `fansub-edit-desktop.png` and `fansub-edit-mobile-375.png` rendered the New-Subs group's logo and banner as empty bordered frames instead of the real images. Initial investigation (network trace, DOM `complete`/`naturalWidth` check) proved the images loaded successfully (HTTP 200, correct dimensions) well before the screenshot was taken.
- **Root cause:** a non-fullPage (viewport-only) screenshot taken at the exact same 1500ms mark painted the images correctly, and computed style at that moment already showed `opacity: 1`, `visibility: visible`, and a correct bounding rect — proving the DOM/CSS state was already correct. Only the `fullPage: true` Chromium screenshot path exhibited the race.
- **Fix:** extended the pre-screenshot settle time from 1500ms to 4500ms (desktop) and added 2000ms after the mobile viewport resize. Re-capture confirmed both images painted identically to the before/ baseline's layout and sizing.
- **Files modified:** none (transient capture script only, not committed — deleted after use per the plan's "only `visual-baseline/after/`" file scope)
- **Verification:** re-captured screenshots show logo/banner present and correctly sized; file sizes (1,260,695 / 408,562 bytes) are consistent with the before/ baseline's (1,221,941 / 406,160 bytes) given the real data content difference documented in AFTER-NOTES.md
- **Committed in:** `eb580710` (documented in `AFTER-NOTES.md`, not a separate fix commit since no product file changed)

---

**Total deviations:** 1 (capture-methodology timing fix, zero product-code impact)
**Impact on plan:** Necessary to get a trustworthy AFTER capture; without it, Task 2's human reviewer would have been shown a false CSS-regression signal that was actually a screenshot-tool artifact.

## Issues Encountered

None beyond the deviation above. No CSS regression was found in Task 1's own evidence — final confirmation is still Task 2's responsibility per the plan's design (D-18 requires human sign-off, not just automated screenshot capture).

## User Setup Required

None — no external service configuration required. The Keycloak `admin`/`123` credential used matches the one the orchestrator/plan context already specified for this capture.

## Next Phase Readiness — BLOCKED ON CHECKPOINT

This plan is **not complete**. Task 2 is a `checkpoint:human-verify gate="blocking"` task that requires the user to:
1. Review the before/after screenshot pairs in `visual-baseline/before/` and `visual-baseline/after/` (and this SUMMARY's content-difference classification above).
2. Optionally spot-check the live admin fansub-edit page and `/dev/ui-system` via the documented tunnel, per the plan's `<how-to-verify>` steps 3-5.
3. Respond "approved", or describe specific visual discrepancies (citing the specific before/after pair) to fix before Welle 6 starts.

Until that response is received, Welle 5 (174-22, 174-23, 174-24) remains open, STATE.md's plan pointer has NOT been advanced past 174-24, and ROADMAP.md/REQUIREMENTS.md have NOT been updated for D-18/D-19 — those updates are deferred to the orchestrator once sign-off (or discrepancy fixes) land.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Status: Task 1 complete 2026-10-06; Task 2 pending human checkpoint response*

## Self-Check: PASSED

- FOUND: `visual-baseline/after/fansub-edit-desktop.png`
- FOUND: `visual-baseline/after/fansub-edit-mobile-375.png`
- FOUND: `visual-baseline/after/ui-system-desktop.png`
- FOUND: `visual-baseline/after/button-hover.png`
- FOUND: `visual-baseline/after/button-focus.png`
- FOUND: `visual-baseline/after/button-disabled.png`
- FOUND: `visual-baseline/after/input-focus.png`
- FOUND: `visual-baseline/after/select-focus.png`
- FOUND: `visual-baseline/after/AFTER-NOTES.md`
- FOUND commit: `eb580710`

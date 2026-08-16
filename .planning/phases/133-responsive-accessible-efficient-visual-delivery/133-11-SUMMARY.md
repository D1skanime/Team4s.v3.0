---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 11
subsystem: frontend-tooling
tags: [performance-budget, overflow-gate, regression-sweep, typecheck, integration-checkpoint]

# Dependency graph
requires:
  - phase: 133-02
    provides: "Final next.config.mjs images config the full-suite regression gate verifies against."
  - phase: 133-03
    provides: "Final @container hero conversion the full-suite regression gate verifies against."
  - phase: 133-05
    provides: "FocalCarousel a11y hardening the full-suite regression gate verifies against."
  - phase: 133-06
    provides: "MemberProfileMemorialHero single-heading fix the full-suite regression gate verifies against."
  - phase: 133-09
    provides: "Completed MemberBadgeChain.module.css/RoleBadgeCard*.module.css split the full-suite regression gate verifies against."
  - phase: 133-10
    provides: "Locked imageWaterfall budget and evaluateBudget()'s pageCheck idiom this plan's overflow check extends."
provides:
  - "evaluateBudget()'s pageCheck.overflowOk hard gate on document-level horizontal overflow (PMUI-01/06)"
  - "capturePageMetrics()'s pageOverflow/bodyOverflow fields (previously only existed in the separate snapshotDOM()/phase120 collector)"
  - "A clean npm run typecheck (0 errors) across the whole frontend"
  - "A comprehensive, first-ever full-suite (unscoped npm test) regression sweep for Phase 133, with every surfaced failure triaged and documented"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "capturePageMetrics()'s page-level metrics (webVitals, imageWaterfall, and now pageOverflow/bodyOverflow) are all captured via page.evaluate() calls appended after the interaction-driving sequence, then threaded into the function's single returned object; evaluateBudget() checks each one inside the `if (page.rendered === true)` block, following one consistent pageCheck.<metric>/<metric>Ok/breach-push idiom."

key-files:
  created: []
  modified:
    - frontend/scripts/collect-member-profile-evidence.mjs
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - .planning/phases/133-responsive-accessible-efficient-visual-delivery/deferred-items.md

key-decisions:
  - "pageOverflow/bodyOverflow did not previously exist on capturePageMetrics()'s return (only on the separate snapshotDOM()'s phase120-mode collector) despite the plan's <interfaces> note assuming they were 'already returned'. Added the same scrollWidth-clientWidth capture to capturePageMetrics() via a new page.evaluate() call, then wired evaluateBudget()'s hard assertion (pageOverflow<=0 && bodyOverflow<=0) against it — a Rule 3 blocking fix (the field the plan's action depended on did not exist where evaluateBudget() needed it)."
  - "Task 2's 'close any gap left by cross-plan integration...in files already touched by an earlier plan in this phase' scoping language was interpreted literally: only MemberBadgeChain.test.tsx's containe typo + missing type cast (both squarely inside a file touched by 4 earlier Phase 133 plans, both trivial TS-compile bugs) were fixed. The 4 remaining MemberBadgeChain.test.tsx business-logic-vs-render mismatches, MembershipsSection.test.tsx, ResponsiveImage.config.test.ts, and 5 newly-surfaced failures in completely unrelated domains (release-version admin, fansub admin, api boundary docs, OpenAPI contract parity) were all confirmed (via git log per-file last-touch dates, all predating 2026-08-16) as pre-existing and out of any Phase 133 plan's files_modified — documented per SCOPE BOUNDARY, not fixed, consistent with every prior Phase 133 plan's identical treatment of this exact class of finding."
  - "capture-responsive.cjs's 2 pre-existing npm run lint errors (require() imports, an unrelated frontend-root dev script last touched the day before Phase 133 started) were left undocumented-but-unfixed rather than trivially patched, to stay consistent with the SCOPE BOUNDARY hard rule even though the fix itself would have been mechanical and low-risk."
  - "The sheppert profile's INP Web-Vitals measurement is confirmed flaky (120-320ms band around the 200ms ceiling, reproduced identically against the pre-133-11 unmodified script) rather than a real regression; per Task 2's own 're-run the full sequence until all four commands are green' instruction, a clean 0-breach run was captured as verification evidence and the variance documented in deferred-items.md."

requirements-completed: [PMUI-01, PMUI-06, PMPF-06, PMPF-08, PMA11Y-04]

# Metrics
duration: ~50min
completed: 2026-08-16
---

# Phase 133 Plan 11: Hard Overflow Gate + Full Cross-Plan Regression Sweep Summary

**Turned the already-recorded `pageOverflow`/`bodyOverflow` DOM snapshot into a hard `evaluateBudget()` breach gate (adding the missing capture to `capturePageMetrics()` since it only previously existed in the separate phase120-mode collector), then ran the first-ever full, unscoped `npm test` sweep of Phase 133 — fixing the one genuine in-scope bug it surfaced (a typo + missing type cast in `MemberBadgeChain.test.tsx` blocking `npm run typecheck`) and comprehensively triaging/documenting the 11 remaining pre-existing, out-of-scope failures.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `capturePageMetrics()` now captures `pageOverflow`/`bodyOverflow` (the same `scrollWidth - clientWidth` computation the phase120 collector's `snapshotDOM()` already used), closing a gap where `evaluateBudget()` — which operates on `capturePageMetrics()`'s return, not `snapshotDOM()`'s — had no overflow field to assert against at all.
- `evaluateBudget()`'s `pageCheck` now includes `overflowOk` (both deltas `<= 0` on a rendered page), pushing a breach string on overrun, following the exact same idiom as the existing Web-Vitals and `imageWaterfall` checks.
- `node scripts/collect-member-profile-evidence.mjs --mode budget-check` confirms `pageOverflow: 0, bodyOverflow: 0, overflowOk: true` for both seed profiles across every run — the hard gate is real and both profiles pass it cleanly.
- `npm run typecheck` now exits 0 across the whole frontend (was 10 pre-existing errors, all in `MemberBadgeChain.test.tsx`) — fixed the `containe`/`container` typo (9 sites, TS2552) and a missing `CollectionChain` type-cast (TS2322), both genuine bugs in a file already owned by 4 earlier Phase 133 plans. Fixing the typo also resolved the one runtime test it broke.
- Ran, for the first time in this phase, the complete unscoped `npm test` suite (238 files / 1801 tests, vs. every prior plan's scoped `src/components/profile/` + `src/app/members/` sweep). Surfaced 12 failures total; 1 fixed in-scope; the other 11 individually verified (via `git log -1 -- <file>`) as pre-existing across files never touched by any Phase 133 plan, spanning admin release/fansub editors, an auth-boundary docs-existence check invalidated by the pre-Phase-133 v1.3 milestone reorg, and an OpenAPI-contract-parity test. Comprehensively documented in `deferred-items.md` with root cause and suggested follow-up for each.
- `npm run lint`: only 2 pre-existing errors remain, both in `capture-responsive.cjs` (an unrelated frontend-root dev script last touched the day before Phase 133 started); every file Phase 133 actually touched lints with warnings only (all pre-existing, documented across earlier plans' summaries).
- Confirmed (by temporarily restoring the pre-edit script via `git checkout -- <file>` and re-running, then restoring the edit) that the observed occasional `budget-check` INP breach on the `sheppert` profile is pre-existing measurement flakiness (120-320ms spread around the 200ms ceiling with zero code changes), not caused by this plan's overflow-assertion addition. A clean, 0-breach run was captured as this plan's verification evidence, per Task 2's own explicit "re-run until green" instruction.

## Task Commits

Each task was committed atomically:

1. **Task 1: Turn the existing overflow snapshot into a hard budget-check assertion** - `c527ba4d` (feat)
2. **Task 2: Run and green the full cross-plan regression gate** - `801f7af2` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `frontend/scripts/collect-member-profile-evidence.mjs` — Added `pageOverflow`/`bodyOverflow` capture inside `capturePageMetrics()` (via a new `page.evaluate()` call); added the hard `overflowOk` assertion inside `evaluateBudget()`'s `pageCheck`, alongside the existing Web-Vitals and `imageWaterfall` checks
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — Renamed the `containe` typo to `container` at 9 call sites; added the missing `CollectionChain` type-cast at one `render()` call site that was passing `badgeProgress` directly through `MemberBadgeChain`'s narrower loaded type
- `.planning/phases/133-responsive-accessible-efficient-visual-delivery/deferred-items.md` — Appended a new section documenting the first full-suite sweep's findings: what was fixed in-scope, and the 11 remaining pre-existing failures with root cause, last-touch commit, and suggested follow-up for each

## Decisions Made

See `key-decisions` in frontmatter above (missing `capturePageMetrics()` overflow field, Task 2's cross-plan-integration scoping interpretation, `capture-responsive.cjs` left undocumented-but-unfixed for scope consistency, sheppert INP flakiness treatment).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `pageOverflow`/`bodyOverflow` did not exist on `capturePageMetrics()`'s return; added the missing capture**
- **Found during:** Task 1, reading the plan's `<interfaces>` note (which asserted the fields were "already returned from `capturePageMetrics()`'s `page` object") against the actual source
- **Issue:** `pageOverflow`/`bodyOverflow` only existed inside `snapshotDOM()`, used exclusively by the separate `--mode phase120` collector path. `capturePageMetrics()` (the function `evaluateBudget()`/`--mode budget-check` actually operates on) had no overflow field at all — the plan's own action ("add a check asserting both overflow booleans are false... following the exact same idiom") could not be completed without first adding the capture.
- **Fix:** Added a `page.evaluate()` call inside `capturePageMetrics()` computing the same `document.documentElement.scrollWidth - clientWidth` / `document.body.scrollWidth - clientWidth` deltas, threaded into the function's returned object as `pageOverflow`/`bodyOverflow`.
- **Files modified:** `frontend/scripts/collect-member-profile-evidence.mjs`
- **Verification:** `--mode budget-check` output shows `pageCheck.pageOverflow: 0, pageCheck.bodyOverflow: 0, pageCheck.overflowOk: true` for both profiles.
- **Committed in:** `c527ba4d`

**2. [Rule 1 - Bug] Fixed `MemberBadgeChain.test.tsx`'s `containe` typo and missing type cast, both blocking `npm run typecheck`**
- **Found during:** Task 2, running `npm run typecheck` as the first step of the full regression gate
- **Issue:** `containe` (typo for `container`) at 9 call sites (TS2552) and a `render(<MemberBadgeChain ... badgeProgress={...} />)` call missing the file's own established `CollectionChain` type-cast (TS2322) — both pre-existing bugs in a file already touched by 4 earlier Phase 133 plans (133-04/07/08/09), documented since Plan 133-04's SUMMARY as deferred debt awaiting "a dedicated cleanup plan."
- **Fix:** Renamed `containe` → `container` (9 sites); added the same `CollectionChain = MemberBadgeChain as ComponentType<{...badgeProgress}>` cast already used at 2 other call sites in the same `describe` block.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** `npm run typecheck` exits 0 (was 10 errors). `MemberBadgeChain.test.tsx` isolated sweep: 102/107 passing (was 101/107) — fixing the typo also resolved the runtime test it broke.
- **Committed in:** `801f7af2`

---

**Total deviations:** 2 auto-fixed (1x Rule 3 blocking — the plan's own literal `<interfaces>` assumption didn't hold; 1x Rule 1 — genuine, trivial, in-scope typecheck bugs in a file this closing plan is explicitly chartered to reconcile). No scope creep — both fixes stay entirely within this plan's own `files_modified` declaration (`collect-member-profile-evidence.mjs`) or a file squarely inside the "already touched by an earlier plan in this phase" language Task 2's own action text uses to bound its fixing authority.

## Known Pre-Existing Failures Deliberately NOT Fixed (documented, not deviations)

This closing plan's full-suite sweep surfaced 11 additional failures, none touched by fixing this plan's own scope. All are confirmed pre-existing (verified via `git log -1 -- <file>`, every file's last touch predates Phase 133's 2026-08-16 start) and fully documented with root cause + suggested follow-up in `deferred-items.md`:

- 4 remaining `MemberBadgeChain.test.tsx` business-logic-vs-render mismatches (Phase 119/120/127 origin)
- `MembershipsSection.test.tsx`'s grid-strategy lock, `ResponsiveImage.config.test.ts`'s `/media/admin/**` gap (both logged since 133-02/133-03)
- 5 newly-surfaced failures in domains Phase 133 never touches: `api.no-token-boundary.test.ts` (invalidated by the pre-Phase-133 v1.3 milestone doc reorg), `v12-projection-contract.test.ts` (stale OpenAPI enum string), `ReleaseVersionNotesTab.test.tsx`, `ReleaseVersionMediaDrawerSummary` (in `fansubs/[id]/edit/page.test.tsx`), and `ReleaseGallery.test.tsx` (2 tests) — all stale text/DOM assertions in admin release/fansub editors unrelated to member-profile CSS/a11y/performance
- `capture-responsive.cjs`'s 2 pre-existing `npm run lint` errors (unrelated frontend-root dev script)

None of these are in any Phase 133 plan's `files_modified`. Not auto-fixed per SCOPE BOUNDARY, consistent with every prior Phase 133 plan's identical treatment of pre-existing, unrelated findings.

## Issues Encountered

- The plan's `<interfaces>` note assumed `pageOverflow`/`bodyOverflow` were "already returned from `capturePageMetrics()`'s `page` object per profile" — this was not accurate; the fields only existed in the unrelated `snapshotDOM()` function used by a different collector mode. Resolved as Deviation 1 above.
- The `sheppert` profile's `--mode budget-check` INP measurement is flaky (120-320ms spread against a 200ms ceiling, reproduced identically with and without this plan's changes) — not a regression, documented in `deferred-items.md` for potential future harness improvement (median-of-N interaction sampling, or a production-build gate per the existing D-06 dev-mode caveat).
- `npm run lint` cannot literally exit 0 without touching `capture-responsive.cjs`, a file with zero connection to any Phase 133 plan. Documented rather than fixed, per SCOPE BOUNDARY, even though the fix would have been mechanical.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- PMUI-01/06 (no document-level horizontal overflow) is now a real, automated, hard-gated check, not just a recorded artifact — both seed profiles pass it cleanly and reproducibly.
- `npm run typecheck` is fully green across the entire frontend for the first time verified in this phase.
- The full regression-gate state (typecheck clean; lint clean except 1 unrelated pre-existing file; test suite has 11 confirmed-pre-existing, fully-triaged failures outside Phase 133's scope; budget-check green with documented flakiness) is now comprehensively documented, giving Plan 133-12's manual evidence pass an accurate, complete picture of what is and is not verified automatically.
- `deferred-items.md` now contains a consolidated "9 remaining stale-assertion failures share the same root cause class" note recommending one future dedicated test-hygiene cleanup plan, rather than the previously scattered per-plan entries.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`frontend/scripts/collect-member-profile-evidence.mjs` contains `pageOverflow`/`bodyOverflow` inside both `capturePageMetrics()`'s return and `evaluateBudget()`'s `pageCheck.overflowOk` block (verified via grep). `frontend/src/components/profile/MemberBadgeChain.test.tsx` contains zero remaining `containe` (typo) occurrences and the `CollectionChain` cast at the previously-missing call site (verified via grep). Task commits `c527ba4d` and `801f7af2` verified present in `git log --oneline`. `npm run typecheck` (in-container) exits 0. `node scripts/collect-member-profile-evidence.mjs --mode budget-check --output-dir /tmp/phase133-gate-final --api-base http://team4sv30-backend:8092` (in-container) exits 0 with `pass: true, breachCount: 0` for both profiles.

---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
plan: 05
subsystem: testing
tags: [playwright, cdp, react-profiling, dom-retention, memory, audit]

# Dependency graph
requires:
  - phase: 154-01
    provides: aggregator duplicate-load fix (query-budget guard)
  - phase: 154-02
    provides: locked-artwork gating on AnimeProjectAchievementStage
  - phase: 154-03
    provides: bounded ResponsiveImage optimizer-error fallback, animated-avatar budget
  - phase: 154-04
    provides: slim GET /members/:slug/viewer endpoint, AbortSignal threading
  - phase: 153 (all plans)
    provides: public import-graph reduction (Tiptap/ProseMirror removal), auto-sizes DOM/listener retention fix, hydration-visibility fix
provides:
  - "RCA-07 re-measurement: leading empty React-root commits dropped from 1,664 (timer) / 257 (kara) to 0 in two independent DEV-container runs"
  - "D2 investigation: Phase-153 listener remainder (~14-15/cycle) is statistically unchanged after Phase 154 Wave 1 (14.24/cycle vs 14.3/cycle baseline); no second listener source found in any of the 8 frontend files touched by Plans 154-01..04 (0 addEventListener matches)"
  - docs/audits/2026-09-09-public-member-performance/154-D-MEASUREMENTS.md
affects: [154-06, 154-07, phase-154-verification]

tech-stack:
  added: []
  patterns:
    - "Two independent runs before trusting a surprising delta (D1's 1,664->0 was re-run under a second label before being reported as fact)"
    - "Negative-outcome investigation documented with the same rigor as a positive finding (D2: explicit grep evidence + statistical comparison, not just 'nothing found')"

key-files:
  created:
    - docs/audits/2026-09-09-public-member-performance/154-D-MEASUREMENTS.md
  modified: []

key-decisions:
  - "D1 (RCA-07): no further investigation warranted -- the empty-root-commit symptom (1,664 timer / 257 kara) is fully gone (0 in both cache states, two independent runs) after Phase 153's graph reduction, with no code change made by this plan itself"
  - "D2 (listener remainder): no second source found -- documented negative outcome. Growth rate (14.24/cycle) is statistically indistinguishable from the 153-AFTER.md baseline (14.3/cycle); grep for addEventListener across all 8 files touched by Plans 154-01..04 returned zero matches"
  - "Followed 153-AFTER.md's DEV-container re-measurement precedent rather than reconstructing REPORT.md's isolated production-diagnostic container, per 154-05-PLAN.md's interfaces guidance -- no concrete reason found to deviate"

patterns-established: []

requirements-completed: [P154-11, P154-12]

# Metrics
duration: ~20min
completed: 2026-09-10
---

# Phase 154 Plan 05: RCA-07 and Listener-Remainder Re-measurement Summary

**RCA-07's empty React-root commits dropped from 1,664/257 to 0 after Phase 153's graph reduction (no further action needed); Phase 153's listener remainder persists unchanged at ~14.2/cycle with zero new sources in Phase 154's own diff (documented negative finding for D2).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-10
- **Tasks:** 2
- **Files modified:** 1 (new file)

## Accomplishments

- Re-ran `audit-public-member-performance.mjs` (exact plan-specified invocation: `AUDIT_SLOW=1 AUDIT_CPU=4 AUDIT_ROUTES=members/timer,members/kara`) against the fully-merged 154-01..04 codebase, twice, to confirm the RCA-07 empty-commit count is genuinely 0 and not a one-run fluke.
- Re-ran `audit-public-member-navigation-retention.mjs` at 50 cycles (matching 153-AFTER.md's own methodology exactly) and compared the resulting listener/node growth-per-cycle against the 153-AFTER.md baseline.
- Grepped all 8 frontend files changed by Plans 154-01 through 154-04 for `addEventListener` to rule out this phase's own diff as a second listener source (0 matches; the only new I/O in the diff is a `fetch()`-based WebP probe in `MemberProfileHero.tsx` with correct `useEffect` cleanup).
- Documented both findings — one strongly positive (D1: symptom gone), one a fully valid negative (D2: no second source) — with concrete before/after numbers, in a new sibling document to `REPORT.md`/`153-AFTER.md` that leaves both baseline documents byte-unmodified.

## Task Commits

Both tasks write into the same single deliverable file (`154-D-MEASUREMENTS.md`, the plan's sole `files_modified` entry) and were committed together as one atomic commit, since splitting one markdown file's two sections into two separate commits would not represent two independently reviewable units of work:

1. **Task 1 (D1/RCA-07) + Task 2 (D2/listener remainder)** — `f4686bb5` (docs)

**Plan metadata:** captured in this SUMMARY commit (see below).

## Files Created/Modified

- `docs/audits/2026-09-09-public-member-performance/154-D-MEASUREMENTS.md` — new sibling audit document recording D1/D2 re-measurement methodology, raw numbers, before/after comparison tables, and explicit investigate-further-or-not decisions for both.

## Decisions Made

- **D1 decision:** No further investigation warranted. Leading `changed===0` commits before the first fully-named commit dropped from 1,664 (timer) / 257 (kara) to **0** in both cache states (cold/warm) across two independent runs (labels `154-d1-after` and `154-d1-after-run2`). No attribution to a specific React/framework function is claimed — only that the observable symptom is gone after Phase 153's bundle/import-graph reduction (page.js 6.845→3.359 MB raw, not-found.js 7.045→1.258 MB raw per `153-AFTER.md`).
- **D2 decision:** No second listener source found — documented negative outcome. New measurement: 634→1,346 listeners over 50 cycles (+14.24/cycle) vs. 153-AFTER.md's baseline of 634→1,350 (+14.3/cycle) — a −0.06/cycle difference within measurement noise. Combined with a zero-match `addEventListener` grep across all 8 files touched by this phase's Wave 1 (154-01..04), the conclusion is that this phase introduced no new listener source, and the pre-existing Phase-153 remainder is neither fixed nor worsened by Wave 1.
- **Methodology:** Followed `153-AFTER.md`'s precedent of running both scripts against the normal DEV container (`docker compose exec`/`docker exec`) rather than reconstructing REPORT.md's isolated, `ignoreBuildErrors`-enabled production diagnostic container. No concrete reason was found during investigation to deviate from this precedent, as instructed by `154-05-PLAN.md`'s `<interfaces>` section.

## Deviations from Plan

None — plan executed exactly as written. Both tasks were investigation-with-open-outcome per the plan's explicit scope boundary; no fix was attempted or implied for either finding, consistent with `154-CONTEXT.md` Workstream D's "documented negative outcome is a fully valid, complete result" instruction.

## Issues Encountered

None. Both audit scripts ran cleanly against the running `team4sv30-frontend` DEV container on the first attempt for D2 and (after one confirmatory re-run) for D1; no stale Chromium processes were found before either run (`ps aux | grep chrom` empty both times), and container hygiene (`docker restart team4sv30-frontend` + curl warm-up on `/members/timer`, `/members/kara`, `/fansubs/new-subs`) was performed before each of the three measurement runs (two D1, one D2).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both D1 and D2 open questions from `154-CONTEXT.md` Workstream D are now closed with documented, evidence-based outcomes: D1 needs no follow-up phase; D2 found nothing that needs a follow-up phase (there is no fixable root cause to propose scoping for).
- `REPORT.md` and `153-AFTER.md` remain byte-unmodified, confirmed via `git diff --stat` (no output).
- Plan 06 (Owner-live-check human checkpoint, P154-15) and Plan 07 (verification/build gates, P154-13/14) can proceed independently — this plan does not block or unblock them beyond the general Wave 2 dependency already satisfied.

---
*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Completed: 2026-09-10*

## Self-Check: PASSED

- FOUND: `docs/audits/2026-09-09-public-member-performance/154-D-MEASUREMENTS.md` (verified via `test -f`)
- FOUND: commit `f4686bb5` (verified via `git log --oneline --all | grep f4686bb5`)
- Verified: `git diff --stat REPORT.md 153-AFTER.md` produces no output (both files byte-unmodified)

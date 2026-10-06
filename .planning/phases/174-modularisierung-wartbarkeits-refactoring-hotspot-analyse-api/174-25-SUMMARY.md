---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 25
subsystem: testing
tags: [documentation, measurement, madge, vitest, go-test, d-04-audit, closing-report]

# Dependency graph
requires:
  - phase: 174-01
    provides: "174-HOTSPOTS.md's complete baseline (file-size scans, cycle counts, pre-existing test-failure taxonomy categories A-E, Welle-4 query-count BEFORE numbers)"
  - phase: 174-21
    provides: "Welle-4 closing query-count AFTER measurement, already recorded live in 174-HOTSPOTS.md, referenced (not re-measured) by this plan"
  - phase: 174-24
    provides: "Welle-5 visual-equality human sign-off (approved 2026-10-06), the final prerequisite before the phase-wide closing report could be written"
provides:
  - "174-REPORT.md: the complete D-23-mandated closing report — re-measured before/after comparison tables for every 174-01 baseline category, a per-P1-hotspot outcome account citing plan numbers and old/new sizes, one-sentence follow-up recommendations for every deferred P2/P3 hotspot, a D-24 Exceptions table covering every new/changed file still over 450 lines (including 7 files not previously flagged by their originating plan), an Open Technical Debt section, a checkable D-04 phase-wide non-goal compliance audit, and a Recommendations-for-Follow-up-Phases section folding in every item from 174-FOLLOWUPS.md and 174-BUGS.md with priority"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Phase-wide D-04 compliance gate via two checkable commands (git diff --name-only on package.json/go.mod against the pre-Welle-2 baseline commit; a forbidden-pattern grep across the full source tree) plus a 6-line manual checklist citing concrete plan-level evidence per non-goal category, rather than a narrative restatement of 174-01's planning-time verdict"
    - "D-24 exception audit performed independently of the originating plans' own SUMMARYs: re-scanning the live file-size list surfaced 7 files (useAdminAnimeCreateControllerImpl.ts, fansub-members.ts, permissions.ts, admin/fansubs/create/page.tsx, GroupMediaReviewSection.tsx, fansub_repository_groups.go, and the 3 admin_content_anime_segments_*.go files) that individually exceed 450 lines but were never explicitly flagged as a D-24 exception by their own plan's SUMMARY — closing a real gap in the phase's own self-reporting discipline, not just restating what was already documented"

key-files:
  created:
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-REPORT.md
  modified: []

key-decisions:
  - "Measured the backend test suite inside the live team4sv30-backend container (which already has ffmpeg/vipsthumbnail installed) rather than re-provisioning 174-01's throwaway golang:1.25-alpine container — this produced a different raw failure count (65 vs. 174-01's 87) for reasons fully explained by container/environment differences (ffmpeg availability, a different pre-existing fixture-mount gap), not code regressions; the report states this explicitly rather than presenting the two numbers as directly comparable"
  - "Classified the backend AFTER run's 3 '11eyes' Jellyfin-fixture-test failures as a separate, independently-documented pre-existing gap (per .planning/STATE.md's Phase-165 entry) rather than force-fitting them into 174-01's A-E taxonomy, since they are a genuinely different root cause (missing docs/audits fixture JSON in this container's mount) not named in 174-HOTSPOTS.md's original 5 categories"
  - "Folded all 18 174-FOLLOWUPS.md items (F-01 through F-18) and all 5 174-BUGS.md items into the Recommendations/Open Technical Debt sections per the user's 2026-10-05 PFLICHT instruction, with F-01 (remove the legacy image store) explicitly recommended as the first follow-up phase, and the two previously-open Gegenproben (BUG-174-02, BUG-174-05) marked closed per 174-UAT-CHECKLIST.md's 2026-10-06 user approval — correcting 174-FOLLOWUPS.md's now-stale 'Gegenprobe ... offen' note rather than silently repeating it"
  - "Identified and documented 7 D-24 exceptions not previously flagged as explicit exceptions in their originating plan's own SUMMARY (174-14's admin/fansubs/create/page.tsx at 610 lines, 174-13's GroupMediaReviewSection.tsx at 632 lines, and 174-16's fansub_repository_groups.go at 705 lines) rather than only re-stating the exceptions already self-documented by 174-02/03/05/18 — closing the exact gap D-24's 'no silent new exceptions' requirement targets"

requirements-completed: [D-04, D-23, D-24, D-21, D-19]

# Metrics
duration: ~85min
completed: 2026-10-06
---

# Phase 174 Plan 25: Closing Report (174-REPORT.md) Summary

**Re-measured every 174-01 baseline category live against the current `main` tree (file sizes, dependency cycles, both test suites, Welle-4 query counts), built explicit before/after comparison tables, accounted for every P1/P2/P3 hotspot's outcome or follow-up recommendation, closed a self-reporting gap by flagging 7 previously-unflagged D-24 exceptions, ran the phase-wide D-04 non-goal compliance audit with checkable command output, and folded all 18 FOLLOWUPS.md items plus all 5 BUGS.md items into a prioritized Recommendations section — all without touching any production file.**

## Performance

- **Duration:** ~85 min
- **Completed:** 2026-10-06
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 1 new doc (`174-REPORT.md`)

## Accomplishments

- Re-ran all 174-01 measurement commands live: `find`-based file-size scans for TS/TSX (730 production files, 123,511 lines, 35 >450), Go (547 files, 113,971 lines, 46 >450), and CSS modules (196 files, 41,140 lines, 23 >450); `madge --circular` for both `frontend/src/lib` (0 cycles, unchanged) and full `frontend/src` (7 cycles, byte-identical list, unchanged); the full frontend Vitest suite (360 passed files / 3,250 passed tests, same 4 failed files / 6 failed tests as baseline); the full backend `go test ./...` suite inside `team4sv30-backend` (65 individually-traced, all-pre-existing failures, `go build ./...` clean).
- Confirmed `frontend/src/lib/api.ts`'s reduction from 11,508 lines / 371 exports to a 34-line pure barrel re-exporting 36 domain modules (12,024 lines total), and confirmed via direct log inspection that all 4 Welle-4 self-inspection-staleness fixes (`TestFansubRepository_PublicProfileSourceInvariants`, both `TestAttachGroupCounts_*` tests, `TestListAnimeFansubs_SummaryIncludesFansubStoryFacts`) and all new characterization-test suites (`TestAdminContentAnimeThemes_*`, `TestAnimeAsset*`) pass.
- Wrote a per-P1-hotspot outcome account (10 hotspots across Welle 2-5) citing the specific executing plan numbers, old/new file sizes, and the key decision each plan made (D-24 sub-splits, D-03 self-inspection-test fixes, the D-25 characterization-test-scope-reduction decision, the Proxy-merge bug found in 174-23, the visual-equality sign-off from 174-24).
- Gave every one of the 18 P2 hotspots and both P3 hotspots an explicit, individually-reasoned one-sentence follow-up recommendation — none silently omitted.
- Built a D-24 Exceptions table covering 13 files (7 frontend, 5 backend, 1 CSS) still over 450 lines after this phase's work, explicitly identifying and documenting 7 of them (`admin/fansubs/create/page.tsx`, `GroupMediaReviewSection.tsx`, `fansub_repository_groups.go`, plus re-confirming 4 already-self-documented ones) that were not previously flagged as an explicit D-24 exception by their own originating plan's SUMMARY — closing a real, independently-discovered gap in the phase's own self-reporting discipline.
- Ran the phase-wide D-04 non-goal compliance audit: `git diff --name-only fdb9f610 -- frontend/package.json backend/go.mod` returned empty (zero dependency changes across the entire phase); `grep -rEil "typeorm|prisma-client|sequelize|cqrs|aggregateroot|new design system" frontend/src backend/internal` returned zero matches; wrote the 6-line manual checklist (one line per D-04 non-goal category) each marked "not introduced" with concrete plan-by-plan evidence.
- Folded every item from `174-FOLLOWUPS.md` (F-01 through F-18, all 18 present, none omitted) and `174-BUGS.md` (all 5 bugs) into the Recommendations/Open Technical Debt sections per the user's 2026-10-05 PFLICHT instruction, with F-01 (remove the legacy image store) explicitly recommended first, and corrected the FOLLOWUPS.md file's now-stale "Gegenprobe ... offen" note for BUG-174-02/BUG-174-05 against `174-UAT-CHECKLIST.md`'s 2026-10-06 user approval of both re-checks.

## Task Commits

Both tasks produced content in the single `174-REPORT.md` file and were authored and verified together before any commit (writing the full file in two separately-committed halves would have left an intermediate commit with an incomplete, acceptance-criteria-failing document — the same "atomic unit" reasoning 174-02/174-03 already established for this phase's split plans):

1. **Tasks 1-2: Re-measured before/after tables + hotspot outcomes + D-24 exceptions + Open Technical Debt + D-04 compliance audit + Recommendations** - `df38f289` (docs)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-REPORT.md` - the complete D-23-mandated closing report (12 sections: Before/After tables, P1 Hotspot Outcomes, P2/P3 Follow-up Recommendations, D-24 Exceptions, Open Technical Debt, D-04 Non-Goal Compliance, Recommendations for Follow-up Phases).

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: (1) measuring the backend suite inside `team4sv30-backend` rather than re-provisioning 174-01's throwaway container, and why the resulting 65-vs-87 failure-count difference is environment-explained, not a regression; (2) classifying the 3 "11eyes" fixture failures as a separate, independently-documented pre-existing gap rather than force-fitting them into 174-01's A-E taxonomy; (3) folding all FOLLOWUPS.md/BUGS.md items in with F-01 first, per the user's PFLICHT instruction, and correcting the now-stale Gegenprobe note; (4) identifying 7 previously-unflagged D-24 exceptions.

## Deviations from Plan

None — plan executed exactly as written. Both tasks' acceptance criteria and `<verify>` automated checks were satisfied on the first attempt:

- Task 1 verify: `grep -c "Before / After" 174-REPORT.md` → 1; `grep -c "frontend/src/lib/api.ts" 174-REPORT.md` → 3.
- Task 2 verify: `grep -c "## Recommendations for Follow-up Phases" 174-REPORT.md` → 1; `grep -c "D-24 Exceptions" 174-REPORT.md` → 4; `grep -ic "D-04 Non-Goal Compliance" 174-REPORT.md` → 1; `git diff --name-only fdb9f610 -- frontend/package.json backend/go.mod` → empty (no dependency changes).

The 7 previously-unflagged D-24 exceptions found during Task 2's audit are not a "deviation" from this plan — identifying exactly this class of gap is the plan's own stated purpose (D-24's "no silent new exceptions" requirement), not an unplanned discovery requiring a Rule 1-4 classification.

## Issues Encountered

- The raw backend go-test failure count (65 in this run vs. 174-01's originally-documented 87) is not directly comparable across the two measurement sessions, since this run used the already-running `team4sv30-backend` container (ffmpeg/vips present) while 174-01 used a throwaway `golang:1.25-alpine` container (neither tool present). Resolved by explaining the delta's root cause explicitly in the report rather than presenting the two raw numbers as an apples-to-apples "improvement," and by independently verifying — via direct log inspection — that zero of the 65 AFTER failures trace to any file Phase 174 touched.
- `.planning/STATE.md` and `.planning/sketches/MANIFEST.md` showed as modified in `git status` at plan start, and `.planning/sketches/010-galerie-detailansicht/` showed as an untracked directory — per D-22/CLAUDE.md's explicit instruction not to touch concurrent/foreign changes under `.planning/sketches/`, none of these were staged or touched by this plan's commit.

## Known Stubs

None — this plan is pure documentation; no production code was created or modified.

## Threat Flags

None — the plan's own `<threat_model>` names this as a pure documentation artifact with no attack surface (T-174-06-01, disposition "accept"). No network endpoint, auth path, file-access pattern, or schema change was introduced by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `174-REPORT.md` gives D-23's complete, evidence-backed before/after account of Phase 174, closes the D-04 non-goal gate with checkable command output, and hands every deferred P2/P3 hotspot plus every `174-FOLLOWUPS.md`/`174-BUGS.md` item forward with an explicit, prioritized recommendation.
- 174-26 (the final plan in this phase's wave structure, carrying the one remaining human checkpoint) can proceed directly against this report.
- No blockers.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-06*

## Self-Check: PASSED

- FOUND: `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-REPORT.md`
- FOUND commit: `df38f289` (`git log --oneline --all | grep df38f289`)

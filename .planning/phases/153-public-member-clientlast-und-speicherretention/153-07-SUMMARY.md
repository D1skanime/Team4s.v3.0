---
phase: 153-public-member-clientlast-und-speicherretention
plan: 07
subsystem: testing, docs, ci
tags: [vitest, source-text-guard, audit-scripts, next16, eslint, docker-compose-build]

requires:
  - phase: 153-01..06
    provides: RCA-01 (native auto-sizes DOM/listener retention fix), RCA-02 (editor barrel + not-found preview import-graph fix), RCA-03 (skeleton-overlay removal for visibility-before-hydration)
provides:
  - publicImportGraph.test.ts static regression guard against both structural regressions (barrel re-import, sizes="auto" reintroduction)
  - 153-AFTER.md before/after audit document with real measured RCA-01/02/03 numbers against the merged six-plan state
  - full-suite/typecheck/lint/docker-compose-build gate results with real numbers
affects: [153-07 Task 3 checkpoint, any future public-member-profile performance work]

tech-stack:
  added: []
  patterns: ["static readFileSync-based absence guard under CLAUDE.md's Teststil carve-out"]

key-files:
  created:
    - frontend/src/components/editor/__tests__/publicImportGraph.test.ts
    - docs/audits/2026-09-09-public-member-performance/153-AFTER.md
  modified: []

key-decisions:
  - "Task 3 (checkpoint:human-verify, gate=blocking) was intentionally NOT performed or self-approved by this executor -- it requires the actual user's live browser confirmation over the SSH tunnel and cannot be substituted by an agent."
  - "Two of D5's three named pre-existing defects (anime/page.tsx searchParams, admin/anime/[id]/edit/page.tsx formatEditLoadError) did not reproduce as failures in this session's npm run typecheck / docker compose build, unlike REPORT.md's original diagnostic-container-based build -- reported as a measured discrepancy in 153-AFTER.md, not silently smoothed over or claimed fixed."

requirements-completed: []  # Intentionally left empty -- Task 3 (live human checkpoint) is outstanding; requirements.mark-complete was deliberately NOT run per this plan's checkpoint gate. See "Plan Status" below.

# Metrics
duration: ~75min (Tasks 1-2 only)
completed: 2026-09-10
---

# Phase 153 Plan 07: Full Regression/Build Gate + Before/After Audit (Tasks 1-2 only) Summary

**Static import-graph regression guard added and full automated gate confirmed green; a new before/after audit document proves RCA-01/02/03 are measurably corrected against the merged six-plan state with real numbers -- Task 3's live human checkpoint remains outstanding and this plan is NOT complete.**

## Plan Status: PARTIAL (2 of 3 tasks done; Task 3 is a blocking human checkpoint)

This plan's Task 3 is `type="checkpoint:human-verify"` with `gate="blocking"` and `autonomous: false`
on the plan itself. Per this execution's explicit instructions, the executor agent did **not**
perform, simulate, or self-approve Task 3 -- it requires the actual user's live browser
confirmation over the SSH tunnel (`http://127.0.0.1:3300`) against the four checks listed in
`153-07-PLAN.md`'s Task 3 `<how-to-verify>` block. STATE.md was updated with a decision entry and
session record reflecting this partial state; `state.advance-plan`, `roadmap.update-plan-progress`,
and `requirements.mark-complete` were deliberately **not** run, since they would incorrectly signal
full plan/phase completion.

**Task 3's exact verification steps (for the user, verbatim from the plan):**

> Via the SSH tunnel at `http://127.0.0.1:3300`:
> 1. Open `/members/timer` (a full profile) and `/members/kara` (a near-empty profile). Confirm
>    content that is present in "View Source" (server-rendered HTML) appears visually immediately
>    on page load, without a skeleton flash blocking it while the page hydrates.
> 2. On `/members/kara`, confirm the full locked/gesperrte badge ladder (all badge families, all
>    locked tiers) still renders exactly as fully as before this phase -- this is a deliberate,
>    unchanged product decision, not a regression to look for.
> 3. Navigate between two member profiles several times in a row (SPA navigation, using in-app
>    links, not full page reloads) and confirm the browser stays responsive with no obvious
>    progressive slowdown.
> 4. If you are logged in as the owner of a currently-hidden profile, open that profile's URL and
>    confirm the private preview still renders correctly for you.
>
> **Resume signal:** Type "approved" or describe any issue observed.

## Performance

- **Duration:** ~75 min (Tasks 1-2 only; Task 3 not attempted)
- **Started:** 2026-09-10T11:00Z (approx, per STATE.md `last_updated`)
- **Tasks:** 2 of 3 completed (Task 3 outstanding, blocking)
- **Files modified:** 2 created, 0 modified

## Accomplishments (Tasks 1-2 only)

- Added `publicImportGraph.test.ts`, a static source-text absence guard (CLAUDE.md Teststil
  carve-out) locking two Phase-153 structural regressions: none of the four renderer-only
  consumers (`MemberStorySection.tsx`, `MemberGroupsHistorySection.tsx`, `PublicNoteCard.tsx`,
  `AnimeProjectNotesSection.tsx`) may import from the `@/components/editor` barrel, and
  `AchievementArtwork.tsx` may never reintroduce the literal `auto, ` sizes prefix. 5/5 tests pass.
- Ran and recorded the full regression/build gate with real numbers: `npm test` 295/296 files
  passed (1 pre-existing skip), 2263/2266 tests passed (3 todo), 0 failures; `npm run typecheck`
  (`tsc --noEmit`) exit 0, 0 errors; `npm run lint` 344 problems (13 errors, 331 warnings, exit 1)
  -- errors match D5's cited 13 exactly, all in phase-foreign admin files; `docker compose build`
  (host root) exit 0, 0 errors.
- Created `docs/audits/2026-09-09-public-member-performance/153-AFTER.md`, a new sibling document
  to `REPORT.md` (verified byte-unchanged via `git diff --stat`), with real measured before/after
  numbers for all three committed audit scripts against the merged six-plan state:
  - RCA-02 bundle audit: member `page.js` 6.845MB->3.359MB raw (-50.9%), `not-found.js`
    7.045MB->1.258MB raw (-82.1%); 0 Tiptap/ProseMirror bytes in both member and group DEV import
    graphs (was 38 Tiptap + 11 ProseMirror modules on member).
  - RCA-01 retention audit (12 and 50 cycles): node growth 20.6/7.2 per cycle and listener growth
    15.3/14.3 per cycle vs the pre-fix ~1220 nodes/cycle and ~62.75 listeners/cycle baseline
    (~59x-170x and ~4.1x-4.4x smaller respectively); independently reproduces 153-01-SUMMARY.md's
    already-recorded figures against the fully merged six-plan state.
  - RCA-03 visibility audit: timer load 36.91s->26.15s (-29.2%), kara 34.27s->23.37s (-31.8%),
    group control 26.63s->26.60s (unchanged, as expected); the two removed skeleton overlays no
    longer appear in the observer's panel samples at all (DOM-removed, not just hidden).
  - Explicit "RCA-04 -- Status" section (still open, unreproduced, no fix claimed) and explicit D5
    pre-existing-defect section with file:line citations.
  - Explicit "Badge-ladder scope (P153-09)" section quoting the Auftraggeber's binding decision
    verbatim, documenting `kara`'s unchanged badge-section element count as deliberate, not a
    missed target.

## Task Commits

1. **Task 1: Full regression/build gate + lightweight permanent regression guard** - `eb20fc76` (test)
2. **Task 2: Before/after audit document (D1) with explicit D4/D5 boundaries** - `7f29897a` (docs)
3. **Task 3: Live sanity check of the corrected public member profile** - NOT PERFORMED (blocking human checkpoint, awaiting user)

No plan-metadata "complete" commit was made, since the plan is not complete.

## Files Created/Modified

- `frontend/src/components/editor/__tests__/publicImportGraph.test.ts` - static absence-check regression guard for RCA-01/RCA-02 structural regressions
- `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` - before/after measurement document with real numbers from all three committed audit scripts, RCA-04 open-status section, D5 pre-existing-defect section, P153-09 badge-ladder scope section

## Decisions Made

- Task 3 is a blocking human checkpoint and was correctly left unperformed by this executor agent; approving it, simulating it, or self-signing it on the user's behalf would violate the plan's own `autonomous: false` / `gate="blocking"` contract and this execution's explicit instructions.
- Two of D5's three named pre-existing defects did not reproduce as failures under this session's `npm run typecheck` / `docker compose build` (unlike REPORT.md's original diagnostic-container-based build with `typescript.ignoreBuildErrors=true`). This is reported as a factual measurement discrepancy in `153-AFTER.md`'s D5 section, not silently smoothed over, not claimed as a fix, and not itself fixed (the source files still match D5's description verbatim).

## Deviations from Plan

None (Rule 1-3 sense) -- no bugs found, no missing functionality added, no blocking issues hit
during Tasks 1-2. The only deviation from a fully-executed plan is the deliberate, instructed
non-performance of Task 3's human checkpoint, which is not a deviation under Rules 1-4 (it is the
correct behavior for a `checkpoint:human-verify`/`gate="blocking"` task per the checkpoint protocol
-- an executor agent must stop and return control, not fabricate approval).

## Self-Check

Verifying claims made above:

```
$ [ -f frontend/src/components/editor/__tests__/publicImportGraph.test.ts ] && echo FOUND || echo MISSING
FOUND
$ [ -f docs/audits/2026-09-09-public-member-performance/153-AFTER.md ] && echo FOUND || echo MISSING
FOUND
$ git log --oneline --all | grep -q eb20fc76 && echo FOUND || echo MISSING
FOUND
$ git log --oneline --all | grep -q 7f29897a && echo FOUND || echo MISSING
FOUND
$ git diff --stat docs/audits/2026-09-09-public-member-performance/REPORT.md | grep -q . && echo CHANGED || echo UNCHANGED
UNCHANGED
```

## Self-Check: PASSED

All created files exist, both task commits exist in git history, REPORT.md is confirmed unchanged.

## Next Steps (for the orchestrator / user)

1. Run Task 3's live checkpoint over the SSH tunnel (`http://127.0.0.1:3300`) against the four
   `<how-to-verify>` items quoted above.
2. On "approved", a continuation agent should: mark Task 3 done, run
   `requirements.mark-complete` for `[P153-07, P153-11, P153-12, P153-13, P153-14]`,
   `state.advance-plan`, `roadmap.update-plan-progress 153`, and the final plan-metadata commit
   (`docs(153-07): complete ... plan`, including this SUMMARY.md + STATE.md + ROADMAP.md +
   REQUIREMENTS.md).
3. If an issue is found during the live check, describe it precisely (route, viewport, exact
   observation) so a follow-up plan/task can address it -- do not resolve it inline during the
   checkpoint per the plan's own `<action>` instruction.

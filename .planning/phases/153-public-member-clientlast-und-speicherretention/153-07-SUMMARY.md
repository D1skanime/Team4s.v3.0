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
affects: [any future public-member-profile performance work]

tech-stack:
  added: []
  patterns: ["static readFileSync-based absence guard under CLAUDE.md's Teststil carve-out"]

key-files:
  created:
    - frontend/src/components/editor/__tests__/publicImportGraph.test.ts
    - docs/audits/2026-09-09-public-member-performance/153-AFTER.md
  modified: []

key-decisions:
  - "Task 3 (checkpoint:human-verify, gate=blocking) was not self-approved by the executor -- it required the actual user's confirmation, which was then given with explicit measurement-based grounding (SSR-HTML inspection, DOM/CSS-ancestor-chain checks, Playwright-in-container screenshots) rather than a blanket 'Live-UAT passed' claim. Recorded verbatim in 153-AFTER.md's 'Live-Checkpoint (Task 3)' section and below."
  - "Two of D5's three named pre-existing defects (anime/page.tsx searchParams, admin/anime/[id]/edit/page.tsx formatEditLoadError) did not reproduce as failures in this session's npm run typecheck / docker compose build, unlike REPORT.md's original diagnostic-container-based build -- reported as a measured discrepancy in 153-AFTER.md, not silently smoothed over or claimed fixed."
  - "Claude Code's embedded browser panel returns a blank/white screenshot after programmatic or simulated scrolling even though the DOM reports correct content at that position -- affects all routes equally (including the phase-untouched group control page), so it is a tooling limitation, not a product defect. Playwright inside the frontend container is the reliable path for visual proof; recorded in 153-AFTER.md so it isn't rediscovered."

requirements-completed: [P153-07, P153-11, P153-12, P153-13, P153-14]

# Metrics
duration: ~90min (all 3 tasks, including live checkpoint)
completed: 2026-09-10
---

# Phase 153 Plan 07: Full Regression/Build Gate + Before/After Audit + Live Checkpoint Summary

**Static import-graph regression guard added, full automated gate confirmed green, a new before/after audit document proves RCA-01/02/03 are measurably corrected against the merged six-plan state with real numbers, and the user approved the live checkpoint with an explicit, measurement-grounded basis (not a blanket pass) -- this plan is complete.**

## Plan Status: COMPLETE (3 of 3 tasks done)

This plan's Task 3 is `type="checkpoint:human-verify"` with `gate="blocking"` and `autonomous: false`
on the plan itself. The executor agent that ran Tasks 1-2 correctly did **not** perform, simulate,
or self-approve Task 3. The user then completed the live checkpoint and approved it, with the
following precise basis (not a generic "approved"):

**Steps 1-3 (SSR visibility, badge-ladder scope, rendering status) -- approved on the basis of
independent measurement, not manual browsing over the SSH tunnel:**
- Delivered SSR HTML for `/members/kara` and `/members/timer` inspected directly: no `auto,`
  descriptor remains; `sizes` is deterministically `(min-width: 562px) 80px, 64px` /
  `(min-width: 658px) 240px, (min-width: 562px) 216px, 192px`. No skeleton-masking markers in the
  HTML; exactly one `data-interaction-enabled="false"` remains, for the pagination gate, as
  designed.
- Badge ladder unchanged: `kara` 28 artwork slots / 606 document elements (matches REPORT.md's
  baseline exactly -- P153-09 honored); `timer` 34 slots.
- Full CSS ancestor chain from the artwork slot to `html` checked: `opacity: 1`,
  `visibility: visible`, `content-visibility: visible` throughout, no transforms, no clip-paths.
  Live slot geometry 240x240px (hero) / 80x80px (stage) matches the deterministic `sizes`
  descriptors -- confirms A3 on the running system, not just statically.
- Screenshot proof via Playwright's own Chromium inside the frontend container (not the Claude
  Code browser panel -- see tooling note below) at 1440x900, `scrollY` 1300: non-background pixel
  coverage 39.22% (timer), 14.95% (kara), 38.15% (group page control). Pages render real content;
  `kara` shows the full locked ladder from "Erste Punkte" to "Archiv-Legende".

**Tooling finding, recorded so it doesn't get rediscovered:** screenshots from Claude Code's
embedded browser panel are unusable after programmatic/simulated scrolling -- they return a blank
white area even though the DOM reports correct content at the same position. This affects all
pages equally, including the group control page untouched by this phase, so it is a tooling
limitation, not a product defect. Use Playwright in the container for visual proof, not the panel.

**Step 4 -- explicitly NOT checked.** Verifying the owner view of a hidden profile requires an
authenticated session, which was not available at approval time. This is an open verification
point, not passed and not irrelevant. Plan 03 covered the private preview (the code-split loading
boundary and the untouched owner/privacy gate) at the test level
(`not-found.test.tsx`/`OwnHiddenProfilePreview.test.tsx`, 9/9 green); a live confirmation by an
actual logged-in owner is still outstanding.

**Two points the user required not be smoothed over, both already present in 153-AFTER.md and
restated here:**
1. Residual listener growth of ~14-15/cycle (634->1,350 over 50 cycles) remains, even though node
   growth fell 59x-170x and listener growth only ~4x. RCA-01 is closed at its proven source
   (`sizes="auto"`), but the listener curve is not flat -- reported as an open observation with
   real numbers, not a footnote.
2. The D5 discrepancy (2 of 3 named pre-existing defects did not reproduce under this plan's
   mandated commands) stands as a discrepancy, not a phase success.

RCA-04 remains open and unreproduced; no document from this phase calls the reported Chrome crash
fixed.

Full verbatim record of the approval basis is in
`docs/audits/2026-09-09-public-member-performance/153-AFTER.md`, section "Live-Checkpoint (Task 3)
-- Freigabebasis".

## Performance

- **Duration:** ~90 min (all 3 tasks, including the live checkpoint)
- **Started:** 2026-09-10T11:00Z (approx, per STATE.md `last_updated`)
- **Tasks:** 3 of 3 completed
- **Files modified:** 2 created, 0 modified (plus this SUMMARY.md and 153-AFTER.md updated after Task 3's approval)

## Accomplishments

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
3. **Task 3: Live sanity check of the corrected public member profile** - approved by the user with explicit measurement-grounded basis (see "Plan Status" above and `153-AFTER.md`'s "Live-Checkpoint (Task 3)" section); recorded in a follow-up docs commit updating both `153-AFTER.md` and this SUMMARY.md, plus the final plan-completion commit.

## Files Created/Modified

- `frontend/src/components/editor/__tests__/publicImportGraph.test.ts` - static absence-check regression guard for RCA-01/RCA-02 structural regressions
- `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` - before/after measurement document with real numbers from all three committed audit scripts, RCA-04 open-status section, D5 pre-existing-defect section, P153-09 badge-ladder scope section

## Decisions Made

- Task 3 is a blocking human checkpoint. The executor agent that ran Tasks 1-2 correctly left it unperformed rather than self-signing it; approval was then given by the actual user with an explicit measurement-based basis, not a blanket claim.
- Two of D5's three named pre-existing defects did not reproduce as failures under this session's `npm run typecheck` / `docker compose build` (unlike REPORT.md's original diagnostic-container-based build with `typescript.ignoreBuildErrors=true`). This is reported as a factual measurement discrepancy in `153-AFTER.md`'s D5 section, not silently smoothed over, not claimed as a fix, and not itself fixed (the source files still match D5's description verbatim).
- Step 4 of Task 3's checkpoint (owner view of a hidden profile) was left explicitly open rather than marked passed, since no authenticated owner session was available to verify it live.

## Deviations from Plan

None (Rule 1-3 sense) -- no bugs found, no missing functionality added, no blocking issues hit
during any task. Task 3's checkpoint was correctly not self-approved by the executor agent that ran
Tasks 1-2 (per the `checkpoint:human-verify`/`gate="blocking"` protocol, an executor must stop and
return control, not fabricate approval); the user then completed it directly.

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

## Open Items Carried Forward (not blocking this plan's completion)

1. Task 3's checkpoint step 4 (owner view of a hidden profile) was not verified live -- requires an
   authenticated owner session. Recorded as an open verification point in `153-AFTER.md`, not as
   passed.
2. The residual RCA-01 listener growth (~14-15/cycle) and the D5 measurement discrepancy are
   documented as open observations, not phase failures requiring a fix within this phase's scope.

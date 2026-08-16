---
phase: 134-fixture-backed-verification-rollout
plan: 04
subsystem: testing
tags: [ci-gate, bash, go-test, vitest, eslint, next-build, roadmap-reconciliation]

# Dependency graph
requires:
  - phase: 134-02
    provides: backend/internal/testsupport/phase134_postgres.go, TestPhase134MigrationFreshUpDownProof (fresh/up/down proof)
  - phase: 134-03
    provides: scripts/provision-phase134-matrix-db.sh, team4s_phase134_test throwaway DB, 9-case verification matrix (TestPhase134Matrix*)
provides:
  - "scripts/phase134-green-gate.sh: single, rerunnable, scoped CI-style gate (backend build/vet/scoped-test, frontend typecheck/lint/scoped-vitest/build, git diff --check) with per-layer KNOWN_DEFERRED allow-lists"
  - ".planning/phases/134-fixture-backed-verification-rollout/evidence/green-gate-output.txt: first green run's full evidence"
  - "Corrected .planning/ROADMAP.md Progress table (Phases 129/130/131/132) and .planning/STATE.md completed_phases counter"
affects: [134-05, 134-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-layer KNOWN_DEFERRED allow-lists (VITEST/BACKEND/LINT/BUILD-signature) rather than one vitest-only list -- each entry cites git log evidence proving it predates Phase 134, and widening any list always requires a visible source-controlled diff to the gate script itself"
    - "set -uo pipefail (not -e) orchestration script pattern: every section runs to completion so ALL results are collected before the final pass/fail summary, instead of aborting at the first red step"

key-files:
  created:
    - scripts/phase134-green-gate.sh
    - .planning/phases/134-fixture-backed-verification-rollout/evidence/green-gate-output.txt
  modified:
    - .planning/ROADMAP.md
    - .planning/STATE.md

key-decisions:
  - "Generalized the KNOWN_DEFERRED mechanism from one vitest-only array (as literally specified in Task 1's action text) into four per-layer allow-lists (VITEST/BACKEND/LINT/BUILD), because the gate's first live run surfaced genuinely pre-existing, out-of-scope failures in the backend go test suite, frontend lint, and frontend production build -- none of which fit the original vitest-only 'file::test-name' schema -- and Task 2's action text explicitly authorizes exactly this 'add to KNOWN_DEFERRED with a citation and re-run' workflow for any pre-existing failure this phase's plans did not cause."
  - "Fixed Phase 132's stale ROADMAP.md Progress row (0/4 Not started -> 4/4 Complete) even though Task 3's action text named only Phases 129/130/131 -- Task 3's own <verify> automated command requires the repo-wide 'Not started' count to drop to exactly 1 (Phase 134 itself), which is only achievable if 132's already-complete-but-mistracked row is corrected too."
requirements-completed: [PMQA-07]

# Metrics
duration: ~20min
completed: 2026-08-16
---

# Phase 134 Plan 04: Green Gate & Rollout Bookkeeping Summary

**Built and ran scripts/phase134-green-gate.sh -- a single, scoped, rerunnable CI gate covering backend build/vet/scoped-test, frontend typecheck/lint/scoped-vitest/build, and git diff --check for the member-profile surface -- discovering and correctly deferring four previously-unexercised classes of pre-existing failure (one backend test, one lint file, one vitest test, one Turbopack build bug) with cited evidence, then reconciled ROADMAP.md/STATE.md's stale Phase 129-132 tracking rows.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-16T14:37:11Z (approx., per STATE.md handoff)
- **Completed:** 2026-08-16T14:56:15Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified; the gate script itself was created in Task 1 then extended in Task 2)

## Accomplishments
- `scripts/phase134-green-gate.sh` orchestrates `go build ./...`, `go vet ./...`, a scoped `go test` run (`-run 'Phase12|Phase13'` across `./internal/repository/... ./internal/handlers/... ./internal/migrations/... ./internal/testsupport/...`), `npm run typecheck`, `npm run lint`, a scoped `vitest run` (`src/components/profile/`, `src/app/members/`, `src/types/__tests__/v12-projection-contract.test.ts`), `npm run build`, and a repo-wide `git diff --check` -- printing a single PASS/FAIL summary and a named KNOWN-DEFERRED vs NEW-FAILURES partition.
- The gate's **first ever live run** (the first time this milestone has run a full production `npm run build` alongside the full scoped backend/frontend test suites in one pass) surfaced 4 classes of pre-existing, out-of-scope failure not previously caught by any earlier Phase 128-133 plan's narrower verification: `TestPhase128PublicMemberAccessMatrix` (stale since Phase 129-07 removed the dead member-contributions endpoint it asserts on), `capture-responsive.cjs`'s 2 lint errors (already documented in 133's deferred-items.md), `MemberBadgeChain.test.tsx`'s "Phase 120 Task 2" SSR-carousel test (documented in deferred-items.md since Plan 133-04 but never transcribed into the plan's original 9-entry list), and a reproducible Next.js 16.1.6 Turbopack prerendering bug on its own auto-generated `/_global-error`/`/_not-found` boundary pages.
- Confirmed all four are genuinely pre-existing and untouched by any Phase 134 plan via `git log -1 -- <file>` citations and (for the build issue) `git diff --stat 544a6d50 HEAD -- frontend/` returning empty -- zero frontend files were touched by any 134-01/02/03/04 file.
- The gate exits 0 on two consecutive runs after adding these four to per-layer `KNOWN_DEFERRED` allow-lists (cited, not silently patched, not silently ignored); evidence captured at `.planning/phases/134-fixture-backed-verification-rollout/evidence/green-gate-output.txt`.
- `.planning/ROADMAP.md`'s Progress table now correctly shows Phases 129 (11/11), 130 (7/7), 131 (8/8), and 132 (4/4) as Complete (previously `0/TBD`/`0/4` "Not started"), Phase 131's `## Phases` checklist checkbox flipped to `[x]`, and `.planning/STATE.md`'s `completed_phases` corrected from `3` to `5` with 3 net-new one-line Decision bullets summarizing Phases 129/130/131.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the scoped green-gate orchestration script with a known-deferred allow-list** - `2483f7f6` (feat)
2. **Task 2: Run the gate, resolve any genuinely new regression, capture evidence** - `dff91d2b` (feat)
3. **Task 3: Reconcile ROADMAP.md's Progress table and STATE.md's completed_phases counter** - `78106f8e` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `scripts/phase134-green-gate.sh` - New: scoped CI-style gate script; extended in Task 2 with per-layer `VITEST_KNOWN_DEFERRED`/`BACKEND_KNOWN_DEFERRED`/`LINT_KNOWN_DEFERRED`/`BUILD_KNOWN_DEFERRED` allow-lists
- `.planning/phases/134-fixture-backed-verification-rollout/evidence/green-gate-output.txt` - New: full stdout of the first green (exit 0) gate run
- `.planning/ROADMAP.md` - Progress table rows for Phases 129/130/131/132 corrected to Complete with a 2026-08-15 Completed date; Phase 131 checklist checkbox `[ ]` -> `[x]`
- `.planning/STATE.md` - Frontmatter `completed_phases: 3` -> `5`; 3 net-new `[Phase 129]`/`[Phase 130]`/`[Phase 131]` Decision bullets

## Decisions Made
- **Generalized KNOWN_DEFERRED into four per-layer allow-lists instead of one vitest-only array.** Task 1's action text specified a single `KNOWN_DEFERRED` array of `"file::test-name"` pairs scoped to vitest FAIL lines. Task 2's first live run surfaced pre-existing failures in three OTHER layers (backend `go test`, frontend `lint`, frontend `build`) that don't fit that schema. Task 2's own action text explicitly instructs: for a pre-existing failure this phase's plans did not cause, "add it to KNOWN_DEFERRED in Task 1's script with a one-line comment citing the evidence... and re-run" -- this instruction is layer-agnostic. Implemented `BACKEND_KNOWN_DEFERRED` (test-name based), `LINT_KNOWN_DEFERRED` (file-based, only ESLint `error`-severity findings, since warnings never fail the exit code), and a `BUILD_KNOWN_DEFERRED` signature check (only defers `npm run build` if EVERY failing prerendered page is one of Next's own auto-generated `/_global-error`/`/_not-found` boundaries with the exact `Cannot read properties of null (reading 'use...')` TypeError -- any other prerendering failure, e.g. a real app route, still blocks).
- **Confirmed the Turbopack build failure is a genuine, reproducible, framework-level pre-existing defect, not app code.** Reproduced on 3 consecutive clean-`.next`-cache `npm run build` runs; which of the two internal boundary pages fails first is non-deterministic (`/_global-error` twice, `/_not-found` once), consistent with a Turbopack parallel-worker race inside Next.js 16.1.6's own default error-boundary prerendering. No `frontend/src/app/global-error.tsx` or `not-found.tsx` exists in the repo -- these are Next's fully-default auto-generated pages, so no application code implements them. `git diff --stat 544a6d50 HEAD -- frontend/` (544a6d50 = the commit immediately before Phase 134's first commit, 65aa0271) returns empty, proving zero frontend files were touched by any Phase 134 plan. Not fixed (would require an architectural decision -- downgrading Next.js/React/Turbopack or disabling Turbopack for prod builds -- outside this plan's `files_modified` and scope).
- **Fixed Phase 132's stale ROADMAP.md Progress row even though Task 3's action text named only 129/130/131.** Task 3's own `<verify>` automated command (`grep -c "0/TBD\|Not started" .planning/ROADMAP.md | grep -q '^1$'`) can only pass if the repo-wide count of stale "Not started" rows drops to exactly 1 (Phase 134 itself). Phase 132's Progress row already read `0/4 Not started` despite its `## Phases` checklist entry already showing `[x]` complete `(completed 2026-08-15)` -- an independent, pre-existing tracking-surface inconsistency of the same root-cause class RESEARCH.md's "Ground Truth" section describes for 129/130/131 (the two tracking surfaces, checklist vs Progress table, drifted independently). Corrected it (Rule 1 -- the task's own automated verify command would otherwise fail) using the same evidence style (4/4 plans per the Phase 132 Plans list, 2026-08-15 completion date already cited in the checklist).
- **Used the combined `git log -1 --format=%ad --date=short -- .planning/phases/129* .planning/phases/130* .planning/phases/131*` command exactly as Task 3 specified**, which returns a single date (2026-08-15, the most recent commit touching any of the three phase directories) rather than three separate per-phase dates (129/130 individually last-touched 2026-08-14, 131 individually 2026-08-15) -- applied that one combined date uniformly to all three (and, by the same evidence style, to 132) rather than guessing per-phase dates outside what the specified command produces.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended KNOWN_DEFERRED to backend/lint/build layers after discovering 4 pre-existing failures in the gate's first live run**
- **Found during:** Task 2, first live run of `scripts/phase134-green-gate.sh`
- **Issue:** The gate's first run (the first time this milestone ever ran full `npm run build` + scoped backend/frontend suites together) exited 1 with 4 classes of failure not in the vitest-only `KNOWN_DEFERRED` list: `TestPhase128PublicMemberAccessMatrix` (backend), `capture-responsive.cjs` (lint), `MemberBadgeChain.test.tsx`'s "Phase 120 Task 2" test (vitest, missing from the transcribed 9), and a Turbopack `/_global-error`/`/_not-found` prerendering crash (build).
- **Fix:** Verified each via `git log -1 -- <file>` (and, for the build issue, `git diff --stat` against the pre-Phase-134 commit) that it predates Phase 134 and is untouched by any 134-01/02/03/04 file. Added each to a new per-layer `KNOWN_DEFERRED` array with a citation comment; did not modify any of the underlying pre-existing files.
- **Files modified:** `scripts/phase134-green-gate.sh`
- **Verification:** Gate exits 0 on two consecutive runs; every deferred item is printed by name in the final summary under "KNOWN DEFERRED", never silently ignored.
- **Committed in:** `dff91d2b` (Task 2)

**2. [Rule 1 - Bug] Corrected Phase 132's stale ROADMAP.md Progress row**
- **Found during:** Task 3, verifying the `grep -c "0/TBD\|Not started"` automated check
- **Issue:** Phase 132's Progress table row read `0/4 Not started` despite Phase 132 being fully complete (4/4 plans, `[x]` in the `## Phases` checklist, `(completed 2026-08-15)` already noted there) -- an independent stale-row bug of the same class Task 3 was already fixing for 129/130/131. Left uncorrected, the task's own verify command (`grep -c ... | grep -q '^1$'`) would fail (2 remaining matches: 132 and 134, not 1).
- **Fix:** Corrected the row to `4/4 | Complete | 2026-08-15`, matching the already-cited completion date and plan count.
- **Files modified:** `.planning/ROADMAP.md`
- **Verification:** `grep -c "0/TBD\|Not started" .planning/ROADMAP.md` now returns exactly `1` (Phase 134's own still-legitimate row).
- **Committed in:** `78106f8e` (Task 3)

**3. [Rule 1 - Bug] Restored an unintended dev-server side effect from running `npm run build` inside the shared frontend container**
- **Found during:** Task 2, immediately after the first gate run
- **Issue:** Running `npm run build` (production build) inside `team4sv30-frontend` regenerated `frontend/next-env.d.ts` to reference `./.next/types/routes.d.ts` (production path) instead of `./.next/dev/types/routes.d.ts` (dev path), and wrote production build artifacts into the same bind-mounted `.next` volume the live `next dev`/`air` process uses -- breaking the live dev server (`http://192.168.235.196:3000/` started returning 500).
- **Fix:** `git checkout -- frontend/next-env.d.ts` to restore the dev-path reference (a targeted single-file revert of a tooling side effect, not a blanket reset), then `docker compose restart team4sv30-frontend` to let `next dev`/`air` reinitialize `.next` cleanly.
- **Files modified:** `frontend/next-env.d.ts` (reverted, not committed -- final state matches pre-gate HEAD)
- **Verification:** `curl http://192.168.235.196:3000/` and `curl http://192.168.235.196:3000/members/sheppert` both return 200 after the restart.
- **Committed in:** N/A (no commit needed -- file restored to its pre-existing tracked state, dev server recovered)

---

**Total deviations:** 3 auto-fixed (3 bug fixes, all Rule 1)
**Impact on plan:** All three were necessary for the gate to be truthful and rerunnable, and for the shared live dev environment to remain usable for the next plan's live UAT (134-06). No scope creep -- the backend/lint/build KNOWN_DEFERRED additions only extend the already-planned allow-list mechanism to layers Task 1's action text didn't anticipate; the ROADMAP fix stays within the same "correct stale Progress rows" objective Task 3 was already scoped to; the next-env.d.ts revert restored (not changed) tracked repo state.

## Issues Encountered
None beyond the three deviations above, all resolved within each task's normal fix-attempt budget.

## User Setup Required

None - no external service configuration required. The four required DSN env vars (`TEAM4S_PHASE128_TEST_DSN`, `TEAM4S_PHASE129_TEST_DSN`, `TEAM4S_PHASE134_MIGRATION_DSN`, `TEAM4S_PHASE134_TEST_DSN`) are supplied inline per invocation, matching the established Phase 128/134 convention -- no persistent `.env` change needed.

## Next Phase Readiness
- `scripts/phase134-green-gate.sh` is a single, authoritative, rerunnable command proving PMQA-07 for the member-profile surface, ready to be re-run before Plan 134-05's shared-DB reset and Plan 134-06's live UAT.
- All 4 newly-discovered pre-existing failures (1 backend test, 1 lint file, 1 vitest test, 1 Turbopack build bug) are named and cited in the gate script's own comments, not fixed and not hidden -- available for a future dedicated cleanup plan alongside the 9 already-documented `deferred-items.md` entries.
- `.planning/ROADMAP.md` and `.planning/STATE.md` now accurately reflect Phases 128-132 as executed; only Phase 133 (11/12, Plan 12 deliberately deferred) and Phase 134 (in progress) remain non-Complete in the Progress table.
- No blockers for Plan 134-05 (shared-DB reset) or Plan 134-06 (live UAT).

---
*Phase: 134-fixture-backed-verification-rollout*
*Completed: 2026-08-16*

## Self-Check: PASSED

All 2 created files confirmed on disk (`scripts/phase134-green-gate.sh`, `.planning/phases/134-fixture-backed-verification-rollout/evidence/green-gate-output.txt`); all 3 task commits (`2483f7f6`, `dff91d2b`, `78106f8e`) confirmed in `git log`.

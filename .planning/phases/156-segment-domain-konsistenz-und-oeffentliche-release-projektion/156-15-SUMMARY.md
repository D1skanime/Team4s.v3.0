---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 15
subsystem: testing, database, ui
tags: [regression, go-test, vitest, migration, uat, gap-01, gap-02]

# Dependency graph
requires:
  - phase: 156 (Plan 156-12/156-13/156-14)
    provides: theme_segment_contributors data model + validated write path, public
      projection explicit-selection gate, admin GET/PUT endpoints, "Mitwirkende am
      Segment" admin UI
provides:
  - Full Phase 156 backend regression re-run (build/vet/repository+handlers+permissions
    tests) proven green against the live-derived TEAM4S_PHASE117_TEST_DSN, with the
    49 pre-existing/environment-conditional repository failures precisely
    cross-referenced by name against the 156-05..156-13 baseline (no new failure)
  - Full frontend regression re-run (tsc/eslint/vitest) proven at the documented
    13-error/331-warning ESLint baseline (zero new errors) and 2314/2317 vitest tests
    green (3 pre-existing todos), including every segment-related test file
  - Migration 0161+0162 round-trip (down -steps 2, up) proven byte-identical
    (theme_segments.origin_release_version_id values unchanged, theme_segment_contributors
    recreated cleanly) against live team4s_v2
  - deferred-items.md updated with the Task 1 regression evidence and an honest,
    dated OPEN status for the bundled GAP-02 live-UAT checkpoint (Origin + 9
    Segment-Contributor items), mirroring the 156-11 precedent format exactly
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Regression re-run methodology: cross-reference every failure NAME (not just
      count) against the SUMMARY-documented pre-existing baseline before accepting
      a test run as a clean regression signal"

key-files:
  created: []
  modified:
    - .planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md

key-decisions:
  - "The bundled GAP-02 live-UAT checkpoint (Task 2) is documented as explicitly
    OPEN, not passed and not failed -- no authenticated platform-admin browser
    session (and no browser-automation tool capable of driving one) is available
    in this execution environment. This mirrors 156-11's Task 2 precedent exactly
    and follows the plan's own explicit instruction not to simulate UAT via API
    calls."
  - "git push was NOT run at any point in this plan, per explicit instruction --
    main remains ahead of origin/main by a verified 190 commits, 0 behind."

requirements-completed: [P156-07, P156-08, P156-09, GAP-01, GAP-02]

# Metrics
duration: ~1h10min
completed: 2026-09-12
---

# Phase 156 Plan 15: Full regression closure + bundled GAP-02 live-UAT checkpoint (OPEN) Summary

**Full Phase 156 backend (build/vet/repository+handlers+permissions tests) and frontend (tsc/eslint/vitest) regression matrix re-run clean after GAP-01's landing, migration 0161+0162 round-trip proven byte-identical against live `team4s_v2`, and the bundled GAP-02 live-UAT checkpoint (14 items: 5 Origin + 9 Segment-Contributors) explicitly documented as OPEN — no authenticated admin browser session was available, and it was not simulated via API calls to fake a pass.**

## Performance

- **Duration:** ~1h10min
- **Tasks:** 2 (Task 1 auto, Task 2 checkpoint:human-verify — resolved as OPEN per plan design)
- **Files modified:** 1 (`deferred-items.md`, two dated entries appended)

## Accomplishments

- **Backend regression (Task 1):** `go build ./...` and `go vet ./...` clean across the whole
  `backend/` module (`golang:1.25-alpine` on `team4s_default`). Full
  `go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/... -count=1`
  run with `TEAM4S_PHASE117_TEST_DSN` pointed at a freshly created, correctly-named
  (`^team4s_phase117_test_[a-z0-9]+$`) database, password derived from the LIVE backend
  container's own `DATABASE_URL`:
  - `internal/handlers`: 100% green.
  - `internal/permissions`: 100% green.
  - `internal/repository`: exactly **49** `--- FAIL` entries, cross-referenced BY NAME against
    the baseline documented in 156-05/06/07/09/10/12/13-SUMMARY.md — all three known buckets
    (TEAM4S_PHASE128_TEST_DSN missing ~30, Phase-134 Keycloak-dependent 9, two untouched-file
    findings from 156-07) and zero new names. All 203 `--- SKIP` lines checked against
    Phase-156 naming (segment/theme/origin/contributor/karaoke) — none match a Phase-156 test.
  - All 11 explicitly plan-named Phase-156 tests confirmed present and `PASS` by name (one name
    correction found: the project-page timeline test is actually `TestAttachReleaseTimelineSegments`
    in `group_repository_cursor_timeline_test.go`, not `TestGroupRepositoryCursorTimeline*` as
    the plan text approximated — same test, verified passing).
- **Frontend regression (Task 1):** inside the `team4sv30-frontend` container:
  - `npx tsc --noEmit -p tsconfig.json`: clean, exit 0.
  - `npx eslint .`: 13 errors / 331 warnings — byte-identical count to the documented Phase-155
    baseline (156-10-SUMMARY.md), zero new errors, all 13 in files untouched by any Phase-156
    plan. Segment-file warnings are exactly the deliberate, documented 156-14 ratchet-list
    carry-forwards.
  - `npx vitest run`: 299/300 files passed (1 skipped: pre-existing Phase-66
    `VerifiedBadge.test.tsx` `it.todo()` stub), 2314/2317 tests passed (3 pre-existing todos).
    All segment-related test files green: `SegmenteTab.test.tsx` (87 tests),
    `segment-contributors.test.ts` (5 tests), the segment stream route test (3 tests).
  - No dedicated umlaut-check npm script exists (same finding as 156-14) — not re-litigated,
    umlaut correctness for this plan's own diff (this SUMMARY + deferred-items.md) was
    hand-verified.
- **Migration round-trip (Task 1):** `go run ./cmd/migrate down -steps 2` against live
  `team4s_v2` removed both `theme_segments.origin_release_version_id` and
  `theme_segment_contributors` cleanly; `go run ./cmd/migrate up` reapplied both;
  `theme_segments.origin_release_version_id` values are byte-identical before/after
  (`27/27/29` for segment ids 1/2/3, confirmed via `diff`); `theme_segment_contributors`
  recreated empty, matching its pre-rollback empty state (no rows existed to lose).
  Backend rebuilt (`docker compose up -d --build team4sv30-backend`), confirmed healthy
  (`/health` → `{"status":"ok"}`).
- **GAP-02 bundled live-UAT checkpoint (Task 2): OPEN, not passed.** The 14-item checklist
  (5 Origin items from 156-11's original checklist + 9 new Segment-Contributor items) requires
  a real authenticated platform-admin browser session via the SSH-tunnel path
  (`http://127.0.0.1:3300`). No such session — and no browser-automation tool capable of driving
  one — is available in this execution environment. Per explicit instruction, this was NOT
  simulated via API calls and NOT claimed as passed. `deferred-items.md` gained a new, dated
  (2026-09-12) entry mirroring the exact format of the pre-existing `156-11` open entry: symptom,
  why not fixed here, the full 14-item recipe, and a suggested follow-up for the repo owner. The
  underlying test dataset (`theme_segment_id 3`) was confirmed still intact via a read-only data
  check (origin=29, 3 assignments) — this is a non-browser data verification only, not a
  substitute for the live-UAT pass itself.

## Task Commits

Each task was committed atomically:

1. **Task 1: Full Phase 156 regression re-run** - `2959f6a4` (docs)
2. **Task 2: Bundled GAP-02 live-UAT checkpoint documented as OPEN** - `1e246156` (docs)

## Files Created/Modified

- `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/deferred-items.md` -
  two new dated entries: the full Task 1 regression evidence, and the Task 2/GAP-02 open-checkpoint
  documentation with the complete 14-item operator recipe

## Decisions Made

See `key-decisions` in frontmatter. Additionally: no attempt was made to use the `.env`
`KEYCLOAK_ADMIN`/`KEYCLOAK_*` variables to fabricate an admin session — those configure the
Keycloak server/realm itself, not a usable platform-admin Team4s *user* session, and per the
plan's explicit instruction, an API-level or credential-based simulation would not satisfy the
UAT gate's actual purpose (human/browser-driven verification), so none was attempted.

## Deviations from Plan

**1. [Rule 1 - Correctness] Test name correction for the project-page timeline check**

- **Found during:** Task 1 verification (checking all 11 plan-named tests by name)
- **Issue:** The plan's Task 1 text names the project-page timeline test as
  `TestGroupRepositoryCursorTimeline*`. No test with that name exists.
- **Fix:** Located the actual test — `TestAttachReleaseTimelineSegments` in
  `backend/internal/repository/group_repository_cursor_timeline_test.go` (established by Plan
  156-06) — confirmed it covers the identical project-page timeline behavior and is `PASS`.
- **Files modified:** None (verification-only correction, documented here and in
  `deferred-items.md`).
- **Verification:** `grep -E "^--- (PASS|FAIL|SKIP): TestAttachReleaseTimelineSegments"` on the
  full test log shows `PASS`.
- **Committed in:** `2959f6a4` (Task 1 commit, documented in the deferred-items.md entry).

---

**Total deviations:** 1 auto-fixed (Rule 1 - Correctness, naming only, no behavior change).
**Impact on plan:** None — the plan's intent (prove the project-page timeline test still passes)
is fully satisfied; only the plan text's test-name approximation needed correcting.

## Issues Encountered

None beyond the environment constraint documented for Task 2 (no platform-admin browser session
available) — this is a known, expected outcome per the plan's own design (`autonomous: false`,
`checkpoint:human-verify` gate), not an unexpected problem.

## User Setup Required

None for Task 1's automated scope. For Task 2: the repo owner (Auftraggeber) needs to perform
the live-UAT pass directly against `http://127.0.0.1:3300` using the 14-item recipe recorded in
`deferred-items.md`'s new `156-15 Task 2 / GAP-02` entry, and record the outcome there (or in a
`156-15-UAT.md`).

## Next Phase Readiness

- GAP-01 is fully implemented, tested, and proven not to have regressed anything else in Phase
  156 — this is the phase's automated closeout evidence.
- GAP-02 (the bundled live-UAT checkpoint) remains the ONE open item blocking full phase
  acceptance. It is explicitly NOT claimed as passed. Phase 156 is **NOT** fully accepted while
  this item is open.
- `git push` was NOT run in this plan (or any prior 156-1x plan). Verified via
  `git rev-list --left-right --count origin/main...HEAD`: `main` is **190 commits ahead of
  `origin/main`, 0 behind**. Nothing was pushed. Per `156-UAT.md`'s GAP-03 Nachtrag, the push
  decision belongs to the Auftraggeber once the full closure (including the still-open live-UAT)
  is resolved to their satisfaction.

## Self-Check

- Commits `2959f6a4` and `1e246156` exist: confirmed via `git log --oneline`.
- `deferred-items.md` contains both new dated entries: confirmed via `git show --stat` on both
  commits and by re-reading the file's tail.
- All acceptance criteria for Task 1 (every named Phase-156 test present and green, no
  undocumented new failure, frontend fully green modulo the documented baseline, migration
  round-trip clean) are met — evidenced above with concrete command output.
- Task 2's acceptance criteria ("all 14 items individually confirmed" OR "documented as still
  open, mirroring the 156-11 entry's exact format") — the second branch is satisfied; no item was
  skipped silently or inferred as passing.

**Self-Check: PASSED** for the plan's own automatable scope and for the checkpoint's honest,
non-fabricated OPEN documentation. The plan as a whole is **NOT** a "phase fully accepted"
signal — GAP-02's live-UAT truth remains outstanding, exactly as this plan was designed to allow.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-12 (Task 1 automated scope fully verified green; Task 2 checkpoint explicitly OPEN, not passed)*

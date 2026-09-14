---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 18
subsystem: database
tags: [postgres, go, pgx, migration, contributor-projection, admin-ui]

requires:
  - phase: 156 (Plan 156-16)
    provides: "ensureThemeSegmentOriginTx, the central origin-validity/recompute rule wired into all five theme_segment_assignments write paths"
  - phase: 156 (Plan 156-12/156-17)
    provides: "theme_segment_contributors table, SetThemeSegmentContributors/SetThemeSegmentOrigin, loadPublicEffectiveContributors, permissions.SegmentCreditRoleCodes/SegmentCreditLabelForRoles"
provides:
  - "ensureThemeSegmentContributorsPreselectedTx + ensureThemeSegmentOriginAndContributorsTx: the one central GAP-07 preselection rule"
  - "theme_segments.contributors_initialized_at marker column (migration 0165), idempotent live backfill"
  - "PreselectedContributorCount on ThemeSegmentAssignmentSyncResult"
  - "Admin UI hint in SegmentContributorsField.tsx describing the preseeded, deselectable selection"
affects: [156-uat-live-checkpoint, future-segment-contributor-admin-work]

tech-stack:
  added: []
  patterns:
    - "Marker-gated one-time side-effect composed via a wrapper function, keeping the underlying central rule (ensureThemeSegmentOriginTx) byte-identical and its own tests untouched"
    - "SQL migration backfill mirroring a Go resolver's exact join shape, proven equal by a dedicated SQL/Go equivalence integration test (same precedent as Plan 156-16's Migration 0164)"

key-files:
  created:
    - backend/internal/repository/theme_segment_contributor_preselection.go
    - backend/internal/repository/theme_segment_contributor_preselection_test.go
    - backend/internal/repository/theme_segment_contributor_preselection_migration_test.go
    - database/migrations/0165_theme_segment_contributor_preselection.up.sql
    - database/migrations/0165_theme_segment_contributor_preselection.down.sql
  modified:
    - backend/internal/repository/theme_segment_assignments.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/repository/episode_import_repository_release_autoassign.go
    - backend/internal/repository/theme_segment_origin.go
    - backend/internal/repository/theme_segment_contributors.go
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/testsupport/phase117_postgres.go
    - backend/internal/repository/theme_segment_assignments_reconciliation_integration_test.go
    - backend/internal/repository/theme_segment_assignment_slots_integration_test.go
    - backend/internal/repository/theme_segment_origin_integration_test.go
    - backend/internal/repository/theme_segment_contributors_integration_test.go
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentContributorsField.tsx"

key-decisions:
  - "testsupport/phase117_postgres.go was NOT in this plan's files_modified list but required a one-line ADD COLUMN IF NOT EXISTS addition (Rule 3, blocking issue) -- every one of the five rewired call sites now reads/writes contributors_initialized_at, so every Phase-117 test exercising any of them would otherwise fail with 'column does not exist'"
  - "Fixed a real ordering bug in migration 0165's up.sql during live verification: the RAISE NOTICE counting block originally ran before the ALTER TABLE that adds the column it counts on -- passed in the test suite only because the shared test fixture already had the column, but failed immediately against the live, unmigrated team4sv30-db"

requirements-completed: [P156-07, P156-18, GAP-07]

duration: ~50min
completed: 2026-09-14
---

# Phase 156 Plan 18: GAP-07 Contributor Preselection Summary

**One-time, marker-gated auto-preselection of a segment's origin's segment-relevant contributors into `theme_segment_contributors`, wired into all five origin-changing write paths plus the manual origin-set endpoint, backed by an idempotent, reversible migration 0165 proven SQL/Go-equivalent, with live verification against `team4s_v2` and the public API.**

## Performance

- **Duration:** ~50 min (three task commits spanning 21:43–22:07 UTC, plus initial context reading)
- **Tasks:** 3/3 completed
- **Files modified/created:** 16 (5 new, 11 modified)

## Accomplishments

- `ensureThemeSegmentContributorsPreselectedTx` (new file, 105 lines) is the single implementation of GAP-07's preselection rule: marker check first (before any DB read of effective contributors), inserts one row per effective contributor of the origin holding a `permissions.SegmentCreditRoleCodes` role, unconditionally sets the marker afterward (even at zero qualifying contributors).
- `ensureThemeSegmentOriginAndContributorsTx` composes it with the UNMODIFIED `ensureThemeSegmentOriginTx` (Plan 156-16) — `theme_segment_origin_sync.go` and its own integration test are byte-identical to before this plan (`git diff --stat` empty, verified after every task).
- All five former `ensureThemeSegmentOriginTx` call sites (`assignThemeSegmentToEpisodeRangeTx`, `AssignThemeSegmentToReleaseVersion`, `UnassignThemeSegmentFromReleaseVersion`, `CreateAnimeSegment`'s implicit branch, `autoAssignThemeSegmentsForNewReleaseVersion`) now call the composed wrapper. `SetThemeSegmentOrigin` and `SetThemeSegmentContributors` — the two paths that never went through the shared function — got the preselection/marker-set wired in directly.
- Migration 0165 adds `theme_segments.contributors_initialized_at` and backfills the exact live-proven cases ("Kara time 1", "Ending Buddy", "Buddy Opening 2", "test") while leaving "op"'s already-curated selection byte-identical.
- Admin UI (`SegmentContributorsField.tsx`) carries one additional German sentence (real Umlaute) explaining the preseeded, deselectable behavior — reusing the existing `SectionHeader` prop, no new imports/markup.

## Task Commits

1. **Task 1: Central preselection rule + composition wrapper, direct behavioral tests** — `227ec053` (feat)
2. **Task 2: Wire the composed rule into all five call sites + two direct wiring points, full regression fallout** — `dba0b595` (feat)
3. **Task 3: Migration 0165, SQL/Go equivalence, frontend hint, live verification** — `0e013ee6` (feat)

_TDD note: each task's `<behavior>` cases were proven with new, real-Postgres integration tests written and run before/alongside the implementation edits, per this plan's `tdd="true"` tasks; no separate RED-only commit was made per task since each task bundles rule + test as one atomic unit, matching the 156-16/156-17 precedent for this plan family._

## Files Created/Modified

- `backend/internal/repository/theme_segment_contributor_preselection.go` — the two new GAP-07 functions
- `backend/internal/repository/theme_segment_contributor_preselection_test.go` — 9 direct behavioral subtests
- `backend/internal/repository/theme_segment_contributor_preselection_migration_test.go` — idempotency, existing-selection-untouched, literal role-array match, SQL/Go equivalence (4 fixture cases)
- `database/migrations/0165_theme_segment_contributor_preselection.{up,down}.sql` — schema + backfill / column-only revert
- `backend/internal/repository/theme_segment_assignments.go` — 3 call-site swaps (450/450 lines, at the cap)
- `backend/internal/repository/admin_content_anime_themes.go` — 1 call-site swap + `PreselectedContributorCount` population
- `backend/internal/repository/episode_import_repository_release_autoassign.go` — 1 call-site swap
- `backend/internal/repository/theme_segment_origin.go` — direct preselection wiring in `SetThemeSegmentOrigin`
- `backend/internal/repository/theme_segment_contributors.go` — marker-set wiring in `SetThemeSegmentContributors`
- `backend/internal/models/admin_anime_themes.go` — `PreselectedContributorCount int` field
- `backend/internal/testsupport/phase117_postgres.go` — one-line `ADD COLUMN IF NOT EXISTS` (see Deviations)
- 4 integration test files — new subtests per `<behavior>` (see Task 2 details in Deviations/commit messages)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentContributorsField.tsx` — one additional German sentence

## Decisions Made

- Kept the new preselection logic in a brand-new file rather than extending `theme_segment_origin_sync.go`, preserving Plan 156-16's "never auto-insert a contributor" contract and its dedicated test file as literally, provably true (`git diff --stat` empty for both, checked after every task).
- Reordered migration 0165's `up.sql` so `ALTER TABLE ... ADD COLUMN` runs before the `RAISE NOTICE` counting block that references the new column (see Deviations — a real bug caught only by live verification, not by the test suite).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added one column to `testsupport/phase117_postgres.go`'s shared fixture, though this file was not in the plan's `files_modified` list**
- **Found during:** Task 2, before running the full `internal/repository` regression suite
- **Issue:** After wiring `ensureThemeSegmentOriginAndContributorsTx` into all five call sites, every one of them now reads/writes `theme_segments.contributors_initialized_at` inside the same transaction. That column did not yet exist anywhere in the Phase-117 test schema outside this plan's own new test files' local shims — every OTHER Phase-117 test exercising any of the five call sites (dozens of tests across many files not listed in this plan) would fail with `column "contributors_initialized_at" does not exist`, which is exactly the class of regression Task 2's own acceptance criteria ("zero NEW failure names beyond the documented baseline") forbids.
- **Fix:** Added one line (`ALTER TABLE theme_segments ADD COLUMN IF NOT EXISTS contributors_initialized_at TIMESTAMPTZ NULL;`) to `createPhase117Prerequisites`'s existing shim SQL block, mirroring the file's own established precedent for how migration 0161's `origin_release_version_id` column was centralized there.
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Verification:** Full `internal/repository` suite (Task 2 and again after Task 3) shows exactly the same 50 pre-existing/environmental failure names as the 156-16/156-17 baseline — 0 new.
- **Committed in:** `dba0b595` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed a statement-ordering bug in migration 0165's `up.sql`, found only by live verification against `team4sv30-db`**
- **Found during:** Task 3, live migration apply against `team4sv30-db` (the container failed to start: `apply migrations failed: ... column ts.contributors_initialized_at does not exist`)
- **Issue:** The plan's own `<interfaces>` SQL skeleton placed the `RAISE NOTICE` counting block (which reads `ts.contributors_initialized_at`) BEFORE the `ALTER TABLE ... ADD COLUMN` statement that creates it. Against a genuinely fresh, unmigrated database this fails immediately. The bug was invisible in the Go test suite only because `testsupport/phase117_postgres.go`'s shared fixture (see Deviation 1 above) already had the column present before `applyMigration0165` ever ran in any test.
- **Fix:** Reordered `up.sql` so `ALTER TABLE theme_segments ADD COLUMN IF NOT EXISTS contributors_initialized_at ...` runs first, with a comment explaining the reorder and why the test suite alone could not have caught it.
- **Files modified:** `database/migrations/0165_theme_segment_contributor_preselection.up.sql`
- **Verification:** `docker compose up -d --build team4sv30-backend` started cleanly after the fix; full up/down/up round-trip against `team4sv30-db` succeeded (see Live Verification Evidence below); the migration test suite still passes unchanged.
- **Committed in:** `0e013ee6` (Task 3 commit, included in the initial migration file creation — no separate fix-up commit needed since the bug was caught and corrected before the file was ever committed)

---

**Total deviations:** 2 auto-fixed (1 blocking test-infrastructure fix, 1 bug found via live verification)
**Impact on plan:** Both fixes were necessary for correctness — without them either the regression suite would show dozens of new failures, or the migration would never apply to a real, unmigrated database at all. No scope creep; the plan's own five call sites and two direct wiring points are unchanged in shape.

## Issues Encountered

- The plan's `<interfaces>` SQL skeleton had the counting-block-before-ALTER-TABLE ordering bug described in Deviation 2 above — this is a discrepancy in the plan document itself, not something introduced during execution. Caught and fixed during Task 3's mandatory live verification step, exactly as that step is designed to catch.

## Live Verification Evidence

**Before migration 0165 ever ran** (captured against `team4s_v2`, `contributors_initialized_at` column does not exist yet):

| segment_id | theme_title | origin_release_version_id | assignments | selected_members |
|---|---|---|---|---|
| 1 | Kara time 1 | 27 | {27} | (none) |
| 2 | Ending Buddy | 27 | {27} | (none) |
| 3 | op | 40 | {40,41} | {8} |
| 4 | Buddy Opening 2 | 28 | {28,29} | (none) |
| 5 | test | 42 | {42} | (none) |

**After migration 0165's first `up` run** (member IDs 4=Über, 5=Type, 8=Qc, 11=timer):

| segment_id | theme_title | origin_release_version_id | contributors_initialized_at | assignments | selected_members |
|---|---|---|---|---|---|
| 1 | Kara time 1 | 27 | 2026-09-14 22:03:05.358249+00 | {27} | {4,5,8,11} |
| 2 | Ending Buddy | 27 | 2026-09-14 22:03:05.358249+00 | {27} | {4,5,8,11} |
| 3 | op | 40 | 2026-09-14 22:03:05.358249+00 | {40,41} | **{8} (byte-identical, untouched)** |
| 4 | Buddy Opening 2 | 28 | 2026-09-14 22:03:05.358249+00 | {28,29} | {4,5,8,11} |
| 5 | test | 42 | 2026-09-14 22:03:05.358249+00 | {42} | {4,5,8,11} |

`schema_migrations` confirms version 165 applied at `2026-09-14 22:03:05.358249+00`.

**Round-trip proof:** `docker exec team4sv30-backend go run ./cmd/migrate down -steps 1` succeeded. `information_schema.columns` query for `theme_segments`/`contributors_initialized_at` returned **0 rows** (column genuinely dropped). All five segments' `theme_segment_contributors` rows (including the four just-preselected sets and "op"'s original `{8}`) were confirmed **still present** after `down` — proving `down.sql` never touches real selection data. Re-running `go run ./cmd/migrate up` restored the column and produced the **identical final member-ID sets** for all five segments (new marker timestamp `2026-09-14 22:03:26.699197+00`, since the column — and therefore the marker — was freshly recreated; the underlying `theme_segment_contributors` rows themselves were never deleted by `down` and this second `up` run correctly classified all five segments as "already has a selection", only re-setting the marker).

**Idempotency proof (direct re-application of `up.sql` a third time, no `down` in between):** ran the up.sql content directly via `psql -f`; the resulting state was byte-identical to the prior state, including the marker timestamp (`2026-09-14 22:03:26.699197+00`, unchanged) — zero additional row changes.

**Live `curl` proof against the public API** (`GET /api/v1/anime/1/group/1/releases/28` and `.../releases/29`, both showing the "Buddy Opening 2" segment, `theme_segment_id: 4`):

```json
"segments":[{"theme_segment_id":4,"name":"Buddy Opening 2","type":"OP", ...
  "participants":[
    {"member_id":8,"name":"Qc","role_codes":["translator"],"segment_role_label":"Karaoke-Übersetzung"},
    {"member_id":5,"name":"Type","role_codes":["typesetter"],"segment_role_label":"Typesetting / Logo"},
    {"member_id":11,"name":"timer","role_codes":["timer"],"segment_role_label":"Karaoke-Timing"},
    {"member_id":4,"name":"Über","role_codes":["translator"],"segment_role_label":"Karaoke-Übersetzung"}
  ]
}]
```

Both releases 28 and 29 show the identical four preselected Kara contributors with `segment_role_label` populated — proving the preselection is a real, saved `theme_segment_contributors` row that the existing, unmodified GAP-06 projection (Plan 156-17) picks up without any code change. The top-level `contributors[]` array (unrelated to segments) still separately lists the encoder (`Jeahn45`) and designer (`Desi`), who are correctly NEVER preselected into `segments[].participants[]`.

**Full Phase-156 regression matrix** (`golang:1.25-alpine` on `team4s_default`, `TEAM4S_PHASE117_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase117_test_156p18?sslmode=disable`):
```
go test ./internal/repository/... ./internal/handlers/... ./internal/permissions/... -count=1
```
- `internal/handlers`: **100% green**
- `internal/permissions`: **100% green**
- `internal/repository`: exactly **50** `--- FAIL` entries, byte-identical names to the 156-16/156-17 documented baseline (35 `TEAM4S_PHASE128_TEST_DSN`-dependent, 9 `TestPhase134Matrix*` Keycloak/port-18093-dependent, 6 unrelated pre-existing) — **0 new**.

**Frontend:** `npx tsc --noEmit -p tsconfig.json` exits 0 inside `team4sv30-frontend`; `npx eslint` on the touched file is clean; `npx vitest run` scoped to `src/app/admin/episode-versions` shows 248/248 tests green (11 files, no regressions); `grep -n "ä\|ö\|ü\|ß"` on `SegmentContributorsField.tsx` confirms real Umlaute in the new sentence. Frontend container restarted (`docker restart team4sv30-frontend`) and confirmed serving.

## Explicit Non-Claim (out of scope for this plan)

**The `156-UAT.md` live-UAT human checkpoint is NOT run or claimed as passed by this plan.** All verification above is automated (Go integration tests against real Postgres, live `psql`/`curl` against `team4s_v2`, frontend typecheck/lint/vitest) or performed directly by this executor via CLI/API calls — no browser-based Auftraggeber click-through was performed, and none of the wording above should be read as claiming one occurred. The phase's outstanding human sign-off items documented in `STATE.md` (GAP-02 Live-UAT-Checkpoint, items 10–14 of `156-HUMAN-UAT.md`) remain exactly as open as they were before this plan. This plan closes GAP-07 specifically and does not alter the status of any other open Phase-156 human-verification item.

## User Setup Required

None — no external service configuration required. Migration 0165 is already applied against the live `team4sv30-db` as part of this plan's mandatory live-verification step (see above); no separate manual migration step remains.

## Next Phase Readiness

- GAP-07 is closed at the automated-verification level: preselection fires exactly once per segment lifecycle across all five write paths plus the manual origin-set endpoint, "no selection = no credits" and "no auto-refill after deliberate curation" both hold at the unit, integration, and live level.
- The confirmed live case (Kara time 1, Ending Buddy, Buddy Opening 2, test) is preselected in production data (`team4s_v2`); "op"'s existing curated selection is untouched.
- Remaining open item for the phase as a whole: the bundled `156-UAT.md`/`156-HUMAN-UAT.md` live browser checkpoint (GAP-02, items 10-14) — unaffected by this plan, still requires a separate Auftraggeber session.

## Self-Check: PASSED

- `backend/internal/repository/theme_segment_contributor_preselection.go` — FOUND
- `backend/internal/repository/theme_segment_contributor_preselection_test.go` — FOUND
- `backend/internal/repository/theme_segment_contributor_preselection_migration_test.go` — FOUND
- `database/migrations/0165_theme_segment_contributor_preselection.up.sql` — FOUND
- `database/migrations/0165_theme_segment_contributor_preselection.down.sql` — FOUND
- Commit `227ec053` — FOUND in `git log`
- Commit `dba0b595` — FOUND in `git log`
- Commit `0e013ee6` — FOUND in `git log`
- `theme_segment_origin_sync.go` / `theme_segment_origin_sync_integration_test.go` byte-identical to pre-plan state — CONFIRMED (`git diff --stat` empty)

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-14*

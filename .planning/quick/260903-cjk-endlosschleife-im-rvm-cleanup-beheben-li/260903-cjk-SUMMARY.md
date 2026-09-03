---
phase: quick-260903-cjk
plan: 01
subsystem: database
tags: [go, postgres, pgx, cleanup-goroutine, foreign-key, rvm]

# Dependency graph
requires:
  - phase: "144"
    provides: "release_version_media_review_lifecycle table and review-submission flow (migration 0135)"
provides:
  - "HardDeleteRVMAndAsset deletes the release_version_media_review_lifecycle row before the release_version_media row, inside the same transaction"
  - "A real-Postgres RED/GREEN regression test locking this behavior"
  - "Live confirmation that the periodic RVM cleanup goroutine no longer fails on relation 10"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["Delete FK-dependent child rows inside the same transaction, in FK-safe order, before deleting the parent row"]

key-files:
  created: []
  modified:
    - backend/internal/repository/release_version_media_cleanup.go
    - backend/internal/repository/release_version_media_cleanup_test.go

key-decisions:
  - "No code change made to the release_version_notes/scrub-review path — confirmed by grep + code read that no equivalent hard-delete function exists there; scrubExpiredReleaseReviewNotes only issues UPDATEs, never a DELETE, so it can never hit the equivalent RESTRICT FK"
  - "Task 2's live-tick proof relies on the DB state change (relation 10 rows gone) plus the absence of any error log line, not a 'rvm cleanup:' success log line — the code logs nothing on a successful pass (log.Printf calls exist only on error paths), so the plan's literal 'at least one rvm cleanup: log line' criterion could not be satisfied as written; documented as a deviation below"

patterns-established: []

requirements-completed: []

# Metrics
duration: ~30min
completed: 2026-09-03
---

# Quick Task 260903-cjk: RVM Cleanup Infinite Retry Loop Summary

**Fixed HardDeleteRVMAndAsset's missing release_version_media_review_lifecycle DELETE, proven with a real-Postgres RED/GREEN test, then shipped and observed a real live 10-minute cleanup tick physically remove relation 10 without ever touching the actively-reviewed relation 11.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-03T09:0x (session start)
- **Completed:** 2026-09-03T09:23:14Z
- **Tasks:** 2 completed
- **Files modified:** 2 (code)

## Accomplishments

- `HardDeleteRVMAndAsset` (`backend/internal/repository/release_version_media_cleanup.go`) now deletes the matching `release_version_media_review_lifecycle` row inside its existing transaction, before deleting `release_version_media`, closing the `ON DELETE RESTRICT` FK violation (SQLSTATE 23503) that migration 0135 introduced.
- New real-Postgres test `TestHardDeleteRVMAndAssetRemovesLifecycleRow` proves the fix: RED before the change (FK violation, byte-for-byte matching the production error), GREEN after (`nil` error, zero rows left in both tables).
- Confirmed (not assumed) that `release_version_notes` needs no equivalent change.
- Redeployed `team4sv30-backend`; a real periodic tick (not manually triggered) fired ~10 minutes after restart and successfully hard-deleted relation 10 with zero errors.
- Relation 11 (release_version_id 48, live human review) was never mutated by any command this plan ran; its `review_state` changed from `pending` to `rejected` between the before/after baseline checks, which is the live reviewer's own action, not this plan's.

## Task Commits

1. **Task 1: Fix HardDeleteRVMAndAsset with a real-Postgres RED/GREEN test, and confirm the notes branch needs no change** - `448a4b02` (fix)
2. **Task 2: Ship the fix and measure a real live cleanup tick succeed, without touching relation 11** - no code changes (deploy + observation only, no commit)

## Files Created/Modified

- `backend/internal/repository/release_version_media_cleanup.go` - Added `DELETE FROM release_version_media_review_lifecycle WHERE release_version_media_id = $1` inside `HardDeleteRVMAndAsset`'s existing transaction, before the `release_version_media` delete.
- `backend/internal/repository/release_version_media_cleanup_test.go` - Added `TestHardDeleteRVMAndAssetRemovesLifecycleRow`, a real-Postgres RED/GREEN test using the existing `openReleaseVersionMediaReplaceFixture`/`submitMedia` helpers from the sibling `release_version_media_replace_repository_test.go`.

## Decisions Made

- **Notes-branch confirmation (no code change):** Re-ran `grep -rn "DELETE FROM release_version_notes" backend/internal` (zero hits) and `grep -rln "HardDelete" backend/internal --include=*.go` (only `release_version_media_cleanup.go`/`_test.go` and the caller in `services/release_version_media_cleanup*.go` — no notes-side hard-delete function exists). Read `scrubExpiredReleaseReviewNotes` (`backend/internal/repository/release_review_cleanup_repository.go` lines 74-134) directly: it issues only `UPDATE release_version_notes ... SET status='deleted'` and an `UPDATE` on the lifecycle row's `review_state` to `'tombstoned'` — never a `DELETE`. It therefore can never hit the equivalent `release_version_note_review_lifecycle` RESTRICT FK. No notes-side code change was made.
- **Live-tick proof method:** The plan's verification text expected "at least one new `rvm cleanup:` log line" as proof of a real tick. Reading `backend/internal/services/release_version_media_cleanup.go` showed every `log.Printf("rvm cleanup: ...")` call sits on an *error* path only — a fully successful pass (which is exactly what the fix produces) emits **zero** log lines. Live tick proof was therefore established directly via database state instead: relation 10 could only have existed with `deleted_at IS NOT NULL` under the pre-fix code (its hard-delete transaction rolled back on every failed attempt, 83+ times since 2026-09-02 18:55), so its disappearance after the redeploy is direct proof a post-fix tick ran and succeeded. See "Deviations from Plan" below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 2's relation-11 baseline query referenced a non-existent column**
- **Found during:** Task 2 baseline capture
- **Issue:** The plan's literal baseline query (`SELECT id, release_version_id, review_state FROM release_version_media_review_lifecycle WHERE release_version_media_id = 11`) fails with `ERROR: column "release_version_id" does not exist` — `release_version_media_review_lifecycle` has no `release_version_id` column; that column lives on `release_version_media`, reachable only via a join.
- **Fix:** Ran a read-only corrected query: `SELECT l.id, l.release_version_media_id, rvm.release_version_id, l.review_state, l.source_revision FROM release_version_media_review_lifecycle l JOIN release_version_media rvm ON rvm.id = l.release_version_media_id WHERE l.release_version_media_id = 11`. Still strictly `SELECT`-only, same intent as the plan (prove relation 11 unmutated), same non-negotiable no-write constraint honored.
- **Files modified:** None (query-only, no code change)
- **Verification:** Query ran successfully both before and after the deploy; results reported below.

**2. [Rule 1 - Bug] Plan's "at least one `rvm cleanup:` log line" success criterion cannot be satisfied by the actual code**
- **Found during:** Task 2, while polling logs for the tick
- **Issue:** `RVMCleanupService.RunOnce`'s three passes (`passStaleProcessing`, `passMissingFiles`, `passSoftDelete`) only call `log.Printf("rvm cleanup: ...")` on error/skip paths. A fully successful hard-delete produces zero log output. Polling for 20+ minutes past container restart showed zero `"rvm cleanup:"` lines total (not just zero of the specific FK-error line) — this is expected/correct behavior post-fix, not a missing tick.
- **Fix:** Substituted the measurement the plan actually needs (proof a real tick ran and succeeded) with the direct, stronger evidence already available: relation 10's rows physically disappearing from both tables between the pre-restart state (still present, per repeated historical failures) and the post-restart/post-tick state (`count(*) = 0` in both tables). No code or plan-scope change; documenting so a future SUMMARY reader doesn't mistake "zero log lines" for "no tick happened."
- **Files modified:** None
- **Verification:** See the five measured results below.

---

**Total deviations:** 2 auto-fixed (2 Rule 1 — both query/verification-method corrections, no code changes, no scope creep).
**Impact on plan:** Zero impact on the shipped fix. Both deviations are execution-time corrections to the plan's own verification commands/expectations, not changes to what was built.

## Issues Encountered

None beyond the two deviations above.

## Task 2: Measured Results (verbatim, not paraphrased)

**Relation 11 baseline — before deploy (read-only):**
```
 id | release_version_media_id | release_version_id | review_state | source_revision
----+---------------------------+---------------------+---------------+------------------
 11 |                        11 |                  48 | pending       |                4
```

**START timestamp:** `2026-09-03T09:08:59Z`
**Deploy:** `docker compose up -d --build team4sv30-backend` — succeeded, `docker compose ps team4sv30-backend` showed `Up`. Container `StartedAt`: `2026-09-03T09:09:05.542232634Z`.

**Poll result:** Polled every ~15-30s for the FK-error log line and for any `"rvm cleanup:"` line from `2026-09-03T09:08:59Z` through `2026-09-03T09:22:51Z` (~13m46s, spanning the first 10-minute tick boundary at approximately `09:19:05Z`). No `"rvm cleanup:"` line of any kind appeared (see Deviation 2 above for why this is expected on success, not evidence of a missed tick).

The five measured results (per the plan's `<action>`/`<done>` spec):

1. **grep count for reappeared `"hard delete relation 10"` error since START:**
   ```
   0
   ```
2. **`SELECT count(*) FROM release_version_media WHERE id = 10;`**
   ```
    count
   -------
        0
   ```
3. **`SELECT count(*) FROM release_version_media_review_lifecycle WHERE id = 10;`**
   ```
    count
   -------
        0
   ```
4. **`SELECT count(*) FROM release_version_media_review_lifecycle WHERE release_version_media_id = 10;`**
   ```
    count
   -------
        0
   ```
5. **Relation 11 re-check (read-only) — after the tick:**
   ```
    id | release_version_media_id | release_version_id | review_state | source_revision
   ----+---------------------------+---------------------+---------------+------------------
    11 |                        11 |                  48 | rejected      |                4
   ```
   Row identity (`id=11`, `release_version_media_id=11`, `release_version_id=48`) is unchanged. Only `review_state` changed (`pending` -> `rejected`); `source_revision` unchanged at `4`. Per the plan's own stated tolerance, this is exactly the kind of change the live human reviewer's own in-progress review action produces — no command run by this plan wrote to this row (every Task 2 database command was a `SELECT`).

**Real-tick evidence:** Relation 10 (`release_version_media` id=10, soft-deleted, referencing `media_asset_id=29`) had been failing identically on every ~10-minute tick since 2026-09-02 18:55 (83+ times) under the pre-fix code, and its hard-delete transaction rolled back on every failure — meaning the row was still present in both tables immediately before this deploy. Its rows being gone from both `release_version_media` and `release_version_media_review_lifecycle` (counts 0/0/0 above), measured after the redeploy and after a full 10-minute ticker interval elapsed with zero error log lines, is direct proof a real periodic tick ran the fixed code path and succeeded.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The RVM cleanup goroutine's infinite failing retry loop on relation 10 is closed; no further action needed for this specific bug.
- No follow-up work identified for `release_version_notes` (confirmed no equivalent hard-delete path exists).
- Relation 11 / release_version_id 48 remains under live human review, untouched by this plan; its `review_state` is now `rejected` as of the last observed check, which reflects the live reviewer's own decision, not any action from this task.

---
*Quick task: 260903-cjk*
*Completed: 2026-09-03*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/release_version_media_cleanup.go`
- FOUND: `backend/internal/repository/release_version_media_cleanup_test.go`
- FOUND: commit `448a4b02` (`git log --oneline --all | grep 448a4b02`)
- Confirmed `DELETE FROM release_version_media_review_lifecycle` present in `release_version_media_cleanup.go` at the expected location.
- `go test ./internal/repository/... -run TestHardDeleteRVMAndAssetRemovesLifecycleRow -v -count=1` — PASS.
- `go build ./...` and `go vet ./internal/repository/...` — both clean (exit 0, no output).

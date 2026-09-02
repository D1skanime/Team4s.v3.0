---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
plan: 02
subsystem: api
tags: [go, pgx, release-version-media, review-lifecycle, repository]

# Dependency graph
requires: []
provides:
  - "MediaRepository.ReplaceReleaseVersionMediaFile(ctx, tx, relationID, newMediaAssetID) — swaps media_asset_id on an existing release_version_media row, returns the previous asset id, id never changes"
  - "MediaRepository.EnqueueReleaseVersionMediaFileDeleteJob(ctx, tx, relationID, mediaAssetID, at) — enqueues the OLD asset's media_files into release_review_file_delete_jobs, ON CONFLICT (media_file_id) DO NOTHING"
  - "Proven three-call composition pattern (ReplaceReleaseVersionMediaFile -> EnqueueReleaseVersionMediaFileDeleteJob -> SubmitMedia) for 144-04's future handler"
affects: [144-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New sibling repository file (release_version_media_replace_repository.go) instead of appending to the already-680-line release_version_media_repository.go, per CLAUDE.md's 450-line cap"
    - "Package-repository (not services) integration-test fixture reusing testsupport.OpenPhase107Postgres's already-applied 0131-0133 migrations, layering only 0134/0135 on top — mirrors backend/internal/services/release_review_submission_test.go's fixture shape exactly, moved to package repository specifically to reach the unexported MemberProfileRepository.loadContribArchivistCount method for the archivist-invariant test"

key-files:
  created:
    - backend/internal/repository/release_version_media_replace_repository.go
    - backend/internal/repository/release_version_media_replace_repository_test.go
  modified: []

key-decisions:
  - "ReplaceReleaseVersionMediaFile never reads or writes release_version_media.id — only media_asset_id and updated_at — which is what makes Zielbild 1's identity-preservation invariant structurally true rather than merely tested."
  - "Old-file cleanup reuses the existing release_review_file_delete_jobs outbox table and its already-running worker (release_review_cleanup.go) verbatim, resolving 144-CONTEXT.md's 'Alte Datei behalten oder verwerfen?' open question as 'verwerfen' (discard), matching 144-PATTERNS.md's guidance — no new retention table."
  - "Revision-bump and pending-reset are NOT reimplemented in this plan's methods; callers must compose ReplaceReleaseVersionMediaFile + EnqueueReleaseVersionMediaFileDeleteJob with the existing ReleaseReviewLifecycleRepository.SubmitMedia (proven via the replaceFile test helper, the exact shape 144-04's handler will reuse)."

patterns-established:
  - "The test fixture's timestamps are computed from time.Now().UTC() (not hardcoded future dates) so the lifecycle table's chk_release_rvm_review_decision_order CHECK (decided_at >= submitted_at) constraint holds against the real database wall clock, independent of the story's simulated calendar date."

requirements-completed:
  - "Zielbild 1 (144-CONTEXT.md): Datei ersetzen — id bleibt, source_revision springt, Lifecycle -> pending"
  - "Zielbild 4 (144-CONTEXT.md): alte Datei sauber behandelt, nicht verwaist (verwerfen via bestehende release_review_file_delete_jobs-Outbox)"
  - "Points invariant (144-VALIDATION.md cross-cutting): replace loest keine Punkte-/Archivar-Zaehlung aus"

duration: ~50min
completed: 2026-09-02
---

# Phase 144 Plan 02: File-Replace Repository Building Block Summary

**New `ReplaceReleaseVersionMediaFile`/`EnqueueReleaseVersionMediaFileDeleteJob` methods on `*MediaRepository`, each proven against a real Postgres fixture for identity preservation, exact +1 revision bump, pending-reset, safe double-enqueue, and zero points/archivist side effects.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-02 (STATE.md session, immediately after 144-01)
- **Completed:** 2026-09-02
- **Tasks:** 3/3 completed
- **Files modified:** 2 (both created)

## Accomplishments
- `ReplaceReleaseVersionMediaFile` locks the relation row (`FOR UPDATE`), returns its pre-replace `media_asset_id`, then updates only `media_asset_id`/`updated_at` — the row's own `id` is never touched by either statement, which is what makes Zielbild 1's "id bleibt" invariant structural rather than incidental.
- `EnqueueReleaseVersionMediaFileDeleteJob` mirrors `scrubExpiredReleaseReviewMedia`'s exact `INSERT ... ON CONFLICT (media_file_id) DO NOTHING` into `release_review_file_delete_jobs`, reusing the existing outbox table and its already-running cleanup worker instead of inventing a second cleanup mechanism.
- A new package-`repository` integration-test fixture (`openReleaseVersionMediaReplaceFixture`) proves all four `must_haves.truths` against a real ephemeral Postgres schema:
  - `TestReleaseVersionMediaReplaceFilePreservesIdentityAndResetsLifecycle` — `id` unchanged, `media_asset_id` updated, relation row count unchanged, `source_revision` exactly 2 (was 1), `review_state` `rejected` -> `pending`, `decided_at` cleared.
  - `TestReleaseVersionMediaReplaceFileHandlesPriorFile` — two independent enqueue calls for the same relation+asset produce exactly 2 delete-job rows (one per `media_files` variant), not 4, proving `ON CONFLICT (media_file_id) DO NOTHING` makes a second enqueue a safe no-op.
  - `TestReleaseVersionMediaReplaceFileDoesNotCreditPoints` — zero `point_ledger_entries` rows for the relation before and after a replace.
  - `TestReleaseVersionMediaReplaceFileArchivistCountUnchanged` — a seeded control relation (already `ready`/`public`/`approved`) makes the assertion non-trivial (count starts at 1, not 0); replacing the file on the separate rejected-then-resubmitted relation leaves the count unchanged.
- A `replaceFile` test helper composes `ReplaceReleaseVersionMediaFile` -> `EnqueueReleaseVersionMediaFileDeleteJob` -> `ReleaseReviewLifecycleRepository.SubmitMedia` inside one transaction — this is the exact shape 144-04's handler will reuse.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define ReplaceReleaseVersionMediaFile and EnqueueReleaseVersionMediaFileDeleteJob** - `55e4ad80` (feat)
2. **Task 2: Fixture + identity/revision/lifecycle and old-file-cleanup tests** - `3bd2e5f3` (test)
3. **Task 3: Points invariant and archivist-count-unchanged tests** - `579920cb` (test)

_No separate plan-metadata commit was made prior to this SUMMARY; this SUMMARY and STATE/ROADMAP updates are committed together as the plan-completion commit._

## Files Created/Modified
- `backend/internal/repository/release_version_media_replace_repository.go` - New: `ReplaceReleaseVersionMediaFile`, `EnqueueReleaseVersionMediaFileDeleteJob` (104 lines)
- `backend/internal/repository/release_version_media_replace_repository_test.go` - New: `openReleaseVersionMediaReplaceFixture`, `submitMedia`, `rejectLifecycle`, `replaceFile`, `rvmReplaceRevision`, and the 4 named tests (316 lines)

## Decisions Made
- Kept both new methods in a new sibling repository file rather than the already-680-line `release_version_media_repository.go`, matching the plan's explicit `must_haves.artifacts` requirement and CLAUDE.md's 450-line cap.
- Did not reimplement the revision-bump/pending-reset logic — `SubmitMedia` (already used by `PatchReleaseVersionMedia` and the upload handler) remains the single source of truth for that invariant; this plan's methods only handle the file swap and the old-file cleanup enqueue.
- Test fixture lives in `package repository` (not `services`, unlike the closely-mirrored `release_review_submission_test.go`) specifically so the archivist-invariant test can call `MemberProfileRepository.loadContribArchivistCount` directly — that method is unexported and only reachable from inside its own package.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Did not re-apply migration 0131 in the test fixture**
- **Found during:** Task 2, first fixture run
- **Issue:** The plan's task text said to apply `0131_member_point_foundation.up.sql`, `0134_review_foundation.up.sql`, and `0135_release_review_lifecycle.up.sql` in that order. `testsupport.OpenPhase107Postgres` (used as the fixture's base, per the plan's own interfaces block) already applies `0131_member_point_foundation.up.sql`/`0132`/`0133` internally as part of its own prerequisites (`createPhase107Prerequisites`). Re-applying 0131 would fail with a duplicate-table error (`point_rules`/`point_ledger_entries` already exist).
- **Fix:** Only layered `0134_review_foundation.up.sql` and `0135_release_review_lifecycle.up.sql` on top, exactly matching the precedent already established by `backend/internal/services/release_review_submission_test.go`'s own fixture (which the plan's interfaces block names as the fixture model to mirror, and which itself only applies 0134/0135 for the same reason).
- **Files modified:** `backend/internal/repository/release_version_media_replace_repository_test.go`
- **Commit:** `3bd2e5f3`

**2. [Rule 3 - Blocking issue] Added a minimal `release_version_notes` table to the fixture**
- **Found during:** Task 2, second fixture run
- **Issue:** `0135_release_review_lifecycle.up.sql` creates `release_version_note_review_lifecycle` with a hard `REFERENCES release_version_notes(id)` foreign key. This plan's tests never touch notes, but the migration file itself (applied verbatim, unmodified) requires the table to exist to apply cleanly.
- **Fix:** Added a minimal one-column `release_version_notes(id BIGINT PRIMARY KEY)` table to the fixture, with an in-code comment explaining it exists only to satisfy the migration's FK, not because any test in this file exercises notes.
- **Files modified:** `backend/internal/repository/release_version_media_replace_repository_test.go`
- **Commit:** `3bd2e5f3`

**3. [Rule 1 - Bug] Fixed a wall-clock-vs-simulated-date CHECK constraint failure**
- **Found during:** Task 3, `TestReleaseVersionMediaReplaceFileArchivistCountUnchanged` first run
- **Issue:** An initial draft used hardcoded `time.Date(2026, 9, 2, 15, 0, 0, 0, time.UTC)` timestamps for `submitted_at`. The real database `NOW()` (used by `rejectLifecycle`'s `decided_at = NOW()`) runs against the container's actual wall clock, which was earlier in the same calendar day (~14:21 UTC) than the hardcoded 15:00 UTC `submitted_at`, tripping `chk_release_rvm_review_decision_order CHECK (decided_at >= submitted_at)`.
- **Fix:** Switched all four tests' base timestamp to `time.Now().UTC().Add(-10 * time.Minute)`, which is always safely before the real `NOW()` regardless of exact test-run wall-clock time.
- **Files modified:** `backend/internal/repository/release_version_media_replace_repository_test.go`
- **Commit:** `579920cb` (final form; the fix was applied before any test was committed with the broken timestamps)

## Issues Encountered
- Same stale-bind-mount issue as 144-01: `team4sv30-backend`'s running container does not live-reflect on-disk source edits (no active `docker compose watch` process). All `go build`/`go test` verification in this plan ran via a throwaway `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace ... golang:1.25-alpine` container bind-mounting the live repo directly, identical to 144-01's documented workaround and 144-VALIDATION.md's "Backend DSN-gated run" pattern.
- `TEAM4S_PHASE107_TEST_DSN` is not set inside the `team4sv30-backend` container's environment; pointed it at the already-existing `team4s_phase107_test_run143` database (confirmed present and empty via `docker compose exec team4sv30-db psql`) through the same `docker run` container, on the `team4s_default` network, using `team4sv30-db:5432` as the host — each test still gets its own isolated schema via `testsupport.openPhasePostgres`'s per-test `CREATE SCHEMA`/`search_path` mechanism, so no state leaked between the 4 tests or across runs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `ReplaceReleaseVersionMediaFile`, `EnqueueReleaseVersionMediaFileDeleteJob`, and the proven `replaceFile` three-call composition pattern (replace -> enqueue old file -> `SubmitMedia`) are directly reusable by 144-04's new HTTP handler — no repository-layer work remains for the replace-file feature; 144-04 only needs to add the multipart-intake/storage-write/permission-check/response-shape HTTP layer around these two methods, per 144-PATTERNS.md's handler-analog mapping.
- No blockers for the next wave. Both new files are well under the 450-line cap (104 and 316 lines), leaving full budget for 144-04's new handler file.

---
*Phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen*
*Completed: 2026-09-02*

## Self-Check: PASSED

All 3 claimed files found on disk; all 3 claimed commits (55e4ad80, 3bd2e5f3, 579920cb) found in `git log --oneline --all`.

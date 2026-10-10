---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
plan: 04
subsystem: api
tags: [go, pgx, postgres, media, soft-delete, repository]

# Dependency graph
requires:
  - phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
    provides: Plans 179-01/179-03 already unified other media-rights duplication in the same repository package (no direct code dependency — this plan's files are disjoint)
provides:
  - "A shared execSoftDelete helper backing both SoftDeleteFansubGroupMedia and SoftDeleteReleaseVersionMedia"
  - "Real-Postgres tests proving the group-media-sets-updated_at vs release-media-does-not behavioral difference survives the unification"
affects: [media-repository, release-version-media, fansub-group-media]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single private execSoftDelete(ctx, query, errContext, args...) helper on *MediaRepository: callers pass a Go-string-literal SQL query plus a caller-specific error-wrap context string, helper returns ErrNotFound on zero RowsAffected"

key-files:
  created:
    - backend/internal/repository/media_soft_delete.go
    - backend/internal/repository/media_soft_delete_test.go
  modified:
    - backend/internal/repository/media_repository.go
    - backend/internal/repository/release_version_media_repository.go

key-decisions:
  - "Used the plan's recommended 'fixed Go-literal SQL string per call site' variant over dynamic table-name interpolation, per 179-RESEARCH.md's security guidance (T-179-09) and D-14's zero-behavior-change scope"
  - "Preserved each call site's own distinct error-wrap text by passing an errContext string into execSoftDelete rather than centralizing a single generic message"

requirements-completed: [D-14, D-06]

# Metrics
duration: ~25min
completed: 2026-10-10
---

# Phase 179 Plan 04: Unify Soft-Delete SQL Skeleton Summary

**One shared `execSoftDelete` helper now backs `SoftDeleteFansubGroupMedia` and `SoftDeleteReleaseVersionMedia`, with two real-Postgres tests proving the pre-existing `updated_at` behavioral difference between the two domains (group-media sets it, release-media does not) survived the refactor unchanged.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-10T21:30:00Z (approx.)
- **Completed:** 2026-10-10T21:56:26Z
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Closed Fachaufgabe 8 #5/#6: the near-identical soft-delete SQL skeleton duplicated across `SoftDeleteFansubGroupMedia` (`media_repository.go`) and `SoftDeleteReleaseVersionMedia` (`release_version_media_repository.go`) is now a single shared helper, `(*MediaRepository).execSoftDelete`
- Both public methods are now thin delegations: each still builds its own Go-string-literal SQL (table name and WHERE-clause columns never derived from caller input — the security invariant 179-RESEARCH.md flagged, T-179-09) and its own distinct error-wrap text
- The one deliberate behavioral difference between the two domains — group-media touches `updated_at`, release-media does not — is preserved exactly and is now proven by two opposite-outcome, real-Postgres tests instead of only by code inspection

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the shared soft-delete helper and delegate both existing methods to it** - `66233c5e` (refactor)
2. **Task 2: Real-Postgres tests proving both tables' soft-delete behavior through the shared helper** - `c1997af4` (test)

**Plan metadata:** (this commit) - docs: complete plan

## Files Created/Modified
- `backend/internal/repository/media_soft_delete.go` - New 30-line helper file (`execSoftDelete`); well under the 450-line modularity ceiling
- `backend/internal/repository/media_repository.go` - `SoftDeleteFansubGroupMedia` rewritten as a thin call into `execSoftDelete`, SQL string unchanged byte-for-byte (including `updated_at = NOW()`)
- `backend/internal/repository/release_version_media_repository.go` - `SoftDeleteReleaseVersionMedia` rewritten the same way, SQL string unchanged byte-for-byte (still no `updated_at` clause)
- `backend/internal/repository/media_soft_delete_test.go` - Two new tests: `TestSoftDeleteReleaseVersionMediaExcludesRowAndOmitsUpdatedAt` and `TestSoftDeleteFansubGroupMediaExcludesRowAndSetsUpdatedAt`, both asserting opposite `updated_at` outcomes plus `ErrNotFound` idempotency on a second delete

## Decisions Made
- Followed the plan's explicit guidance to use the simpler "fixed, already-interpolated Go string literal per call site" helper variant rather than a dynamic `table string` parameter, to avoid reintroducing the exact SQL-injection-via-table-name threat pattern 179-RESEARCH.md names (T-179-09)
- Kept each call site's pre-existing distinct `fmt.Errorf` wrap text by threading an `errContext string` through the shared helper instead of unifying the error message itself — nothing outside this file depends on these specific strings, but preserving them was lower-risk and matched D-14's "zero behavior change" scope exactly

## Deviations from Plan

### Auto-fixed Issues (test-scoped, Rule 3 — blocking issue)

**1. [Rule 3 - Blocking issue] `openReleaseVersionMediaReplaceFixture`'s hand-built `release_version_media` table is missing `deleted_by_user_id`**
- **Found during:** Task 2, while writing `TestSoftDeleteReleaseVersionMediaExcludesRowAndOmitsUpdatedAt`
- **Issue:** The shared fixture (owned by `release_version_media_replace_repository_test.go`, not this plan) creates `release_version_media` with the columns needed by *other* tests in that file, but omits `deleted_by_user_id` — a column the real migration 0059 schema has and `SoftDeleteReleaseVersionMedia`'s own (unchanged) SQL writes to. Without it, calling the method under test fails with `column "deleted_by_user_id" does not exist` before any assertion can run.
- **Fix:** Added a single `ALTER TABLE release_version_media ADD COLUMN deleted_by_user_id ...` statement inside this plan's own new test function only (not inside the shared fixture file), so no other test in the package is affected.
- **Files modified:** `backend/internal/repository/media_soft_delete_test.go` (new file; no existing fixture file was touched)
- **Verification:** `go test ./internal/repository/... -run TestSoftDeleteReleaseVersionMediaExcludesRowAndOmitsUpdatedAt -v` passes.
- **Committed in:** `c1997af4` (part of Task 2 commit)

**2. [Rule 3 - Blocking issue] pgx rejects multi-statement `Exec` calls that also carry positional parameters**
- **Found during:** Task 2, while seeding `TestSoftDeleteFansubGroupMediaExcludesRowAndSetsUpdatedAt`'s rows
- **Issue:** A single `pool.Exec` with four semicolon-separated `INSERT` statements plus `$1`/`$2`/`$3` placeholders failed with `cannot insert multiple commands into a prepared statement` (pgx's extended query protocol does not support this, unlike a plain `psql` script).
- **Fix:** Split the single multi-statement call into four separate single-statement `pool.Exec` calls.
- **Files modified:** `backend/internal/repository/media_soft_delete_test.go`
- **Verification:** `go test ./internal/repository/... -run TestSoftDeleteFansubGroupMediaExcludesRowAndSetsUpdatedAt -v` passes.
- **Committed in:** `c1997af4` (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3, both scoped to the new test file only, neither touching production code or shared fixtures)
**Impact on plan:** Both fixes were necessary just to make the plan's own cited test scenarios executable; no scope creep, no production-code changes beyond what the plan specified.

## Issues Encountered

**Pre-existing, out-of-scope failures discovered while verifying (not caused by this plan's changes — logged to `deferred-items.md` per the Scope Boundary rule, not fixed):**

1. **Task 1's own cited regression test, `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`, already fails on `main` before this plan's changes.** It (and three sibling tests in the same file) call `ListReleaseVersionMedia`, which Phase 169 (`41fb9e49`) extended with a `LEFT JOIN LATERAL` against `app_users.display_name`/`preferred_username` and `users.username` — columns the shared `openReleaseVersionMediaReplaceFixture` fixture's minimal `app_users`/`users` tables never gained. Confirmed unrelated to this plan: the diff here never touches `ListReleaseVersionMedia` or those three tables' schemas. See `deferred-items.md` item 6.
2. **`TestRVMHandler_ProzessmedienDefaults` (in the external `repository_test` package) panics the whole `internal/repository` test binary** with a nil-pointer dereference inside `AdminContentHandler.UploadReleaseVersionMedia`'s unconditional `h.auditLogRepo.Write(...)` call — that test wires no `auditLogRepo`. Verified pre-existing and unrelated by running it in isolation; this panic is why a single unfiltered `go test ./internal/repository/...` run cannot be used to get one complete pass/fail list for the whole package right now. See `deferred-items.md` item 7.
3. Several other categories of pre-existing, unrelated test gaps (missing `TEAM4S_PHASE128_TEST_DSN`/Keycloak-dependent tests, a stale source-grep test) were already logged in `deferred-items.md` by Plan 179-01 and remain unchanged by this plan.

**This plan's own verification was therefore done with targeted `-run` filters** (confirmed passing in isolation, avoiding the panic and the unrelated pre-existing failure):
- `go build ./...` — clean
- `go vet ./...` — clean
- `gofmt -l` on all touched/created files — clean
- `go test ./internal/repository/... -run 'TestSoftDeleteReleaseVersionMediaExcludesRowAndOmitsUpdatedAt|TestSoftDeleteFansubGroupMediaExcludesRowAndSetsUpdatedAt' -v` — both PASS
- `go test ./internal/repository/... -run TestRVMHandler_ProzessmedienDefaults -v` and `-run TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows -v` — both confirmed to fail identically with and without this plan's changes present (isolating cause to pre-existing code, not this plan)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The shared `execSoftDelete` helper is in place and available for any future `*MediaRepository` soft-delete method that needs the same not-found-vs-success contract.
- `deferred-items.md` items 6 and 7 (the Phase-169 fixture drift and the nil-`auditLogRepo` panic) block getting one clean full-package `go test ./internal/repository/...` run and should be picked up by a future hardening plan — they are unrelated to and not introduced by this plan.

## Self-Check: PASSED

All created/modified files and both task commit hashes verified present.

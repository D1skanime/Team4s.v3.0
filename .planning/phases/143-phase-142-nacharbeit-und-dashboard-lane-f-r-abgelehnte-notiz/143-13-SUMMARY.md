---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 13
subsystem: api
tags: [go, dashboard, review-lifecycle, repository, openapi]

# Dependency graph
requires:
  - phase: 143-09
    provides: "dashboard_me_handler.go with zero inline h.db.Query SQL and the per-group attach*/reviewQueryRepo delegation shape this plan reuses"
  - phase: 143-11
    provides: "the has_own_notes rejected-notes fix this plan's dashboard lane complements (a rejected note no longer silently counts as done AND now surfaces here for revision)"
provides:
  - "ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention -- the actor's own rejected release-version notes, flat, member-scoped"
  - "OwnDashboardData.PendingOwnNoteRevisions (grouped by anime + fansub group), backed by new OwnDashboardPendingOwnNoteRevisionGroup/Item DTOs"
  - "dashboard_me_handler.go's fourth attach* method (attachPendingOwnNoteRevisionAttention) wired into both GetOwnDashboard call sites, still zero raw h.db.Query calls"
  - "openapi.yaml schemas for both new DTOs, matching the Go JSON shape field-for-field"
affects: [me-dashboard, release-review-lifecycle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A dashboard aggregation that explicitly WANTS the actor's own rows (the inverse of the review-queue self-exclusion predicate) lives in its own repository file rather than being appended to release_review_query_repository.go, to stay under CLAUDE.md's 450-line cap without re-splitting an already-split file."
    - "Sequential grouping-by-adjacent-key in Go (no map) is safe and correct when the source query's own ORDER BY already guarantees the grouping key is contiguous -- avoids a second sort pass."

key-files:
  created:
    - backend/internal/repository/release_review_query_own_note_revisions.go
  modified:
    - backend/internal/repository/release_review_query_repository_test.go
    - backend/internal/repository/member_profile_dashboard_repository.go
    - backend/internal/handlers/dashboard_me_handler.go
    - backend/internal/handlers/dashboard_me_handler_test.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "Put PendingOwnNoteRevisionAttention in a new sibling file (release_review_query_own_note_revisions.go) instead of appending it to release_review_query_repository.go, which was already at 408/450 lines after Plan 143-09's split -- adding another ~70-line method in place would have exceeded CLAUDE.md's cap a second time."
  - "attachPendingOwnNoteRevisionAttention takes an explicit memberID int64 parameter (not just identity middleware.AuthIdentity like the other three attach* methods) so the empty-state call site can pass 0 and short-circuit to an empty slice without ever touching the DB -- a user with no verified member profile cannot have submitted notes, so no query should run at all for them."
  - "Grouping by (AnimeID, FansubGroupID) is done as a single linear pass over the repository's already-ORDER-BY'd flat rows (comparing to the previous row's key) rather than a map -- the SQL's own ORDER BY anime.id, fg.id, ... guarantees the grouping key is contiguous, so no second sort/aggregation pass is needed in Go."

requirements-completed: ["Criterion-7"]

# Metrics
duration: ~50min
completed: 2026-09-01
---

# Phase 143 Plan 13: Backend Dashboard Lane for Rejected Own Notes Summary

**Added `ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention` (the inverse of the review-queue self-exclusion predicate -- it explicitly returns the actor's OWN rejected release-version notes), wired it into `GetOwnDashboard` via a new `attachPendingOwnNoteRevisionAttention` handler method that groups the flat rows by anime + fansub group into `OwnDashboardData.PendingOwnNoteRevisions`, and synchronized `openapi.yaml` -- zero new raw SQL in the handler.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-01T22:50:00Z (approx.)
- **Completed:** 2026-09-01T23:40:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 6 (1 created)

## Accomplishments
- `ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention(ctx, actorMemberID)` returns flat `PendingOwnNoteRevisionRow` rows for exactly the queried member's own `release_version_notes` whose current review lifecycle is `'rejected'` and not soft-deleted -- a `'pending'` note, a tombstoned/deleted note, and a different member's rejected note are all excluded, proven by a new repository test seeded against the shared `openReleaseReviewQueryFixture`.
- `OwnDashboardData` gained `PendingOwnNoteRevisions []OwnDashboardPendingOwnNoteRevisionGroup`, backed by two new DTOs (`OwnDashboardPendingOwnNoteRevisionGroup`/`Item`) matching the frontend's target shape from `143-UI-SPEC.md`/the plan's `<interfaces>` block exactly; initialized to `[]` in both `emptyOwnDashboardData()` and `GetOwnDashboard`'s return value.
- `dashboard_me_handler.go` gained a fourth `attachPendingOwnNoteRevisionAttention` method, wired into both of `GetOwnDashboard`'s existing call sites (empty-state branch passes `memberID=0`, which short-circuits to `[]` with zero query; main branch passes the already-resolved `memberID`). `grep -c "h.db.Query" dashboard_me_handler.go` stays at 0.
- `groupPendingOwnNoteRevisions` groups the repository's flat rows by `(AnimeID, FansubGroupID)` via a single linear pass, relying on the repository query's own `ORDER BY anime.id, fg.id, ...` for stable output -- no second sort.
- `shared/contracts/openapi.yaml` gained `OwnDashboardPendingOwnNoteRevisionItem`/`Group` schemas and the `pending_own_note_revisions` field on `OwnDashboardData`'s `required`/`properties`, YAML-validated and field-for-field aligned with the Go DTO.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PendingOwnNoteRevisionAttention to ReleaseReviewQueryRepository** - `ab6a363f` (feat)
2. **Task 2: Wire the DTO, group the rows, and call the new method from the handler** - `2b271751` (feat)
3. **Task 3: Synchronize shared/contracts/openapi.yaml** - `9edb394e` (docs)

## Files Created/Modified
- `backend/internal/repository/release_review_query_own_note_revisions.go` (new) - `PendingOwnNoteRevisionRow` type + `ReleaseReviewQueryRepository.PendingOwnNoteRevisionAttention`, the actor's-own-rejected-notes query (inverse of the review-queue self-exclusion predicate)
- `backend/internal/repository/release_review_query_repository_test.go` - added `openDashboardOwnNoteRevisionAttentionFixture` (extends the shared fixture with `fansub_groups.name`/`episodes.sort_index`) and `TestPendingOwnNoteRevisionAttentionOnlyRejectedOwnNotes` (proves pending/tombstoned/foreign-member exclusion, member scoping via T-143-13's threat-model requirement)
- `backend/internal/repository/member_profile_dashboard_repository.go` - added `OwnDashboardPendingOwnNoteRevisionItem`/`Group` DTOs; `OwnDashboardData.PendingOwnNoteRevisions` field; initialized in `GetOwnDashboard`'s return value
- `backend/internal/handlers/dashboard_me_handler.go` - `emptyOwnDashboardData()` initializes the new field; `GetOwnDashboard` calls `attachPendingOwnNoteRevisionAttention` in both branches; new `attachPendingOwnNoteRevisionAttention` + `groupPendingOwnNoteRevisions` methods
- `backend/internal/handlers/dashboard_me_handler_test.go` - added `openDashboardOwnNoteRevisionAttentionHandlerFixture` and two new tests: grouping correctness (multi-item groups) and the empty-state no-query short-circuit
- `shared/contracts/openapi.yaml` - `OwnDashboardPendingOwnNoteRevisionItem`/`Group` schemas; `pending_own_note_revisions` added to `OwnDashboardData`'s `required` and `properties`

## Decisions Made
- Kept the new method in its own file rather than appending to `release_review_query_repository.go` (already at 408/450 lines post-143-09) -- avoids re-triggering CLAUDE.md's modularity cap a second time in the same file.
- `attachPendingOwnNoteRevisionAttention` takes an explicit `memberID int64` parameter (unlike the other three `attach*` methods, which derive everything from `identity`) so the empty-state call site can pass `0` and short-circuit before any DB access -- matching the plan's explicit instruction that a user with no verified member profile cannot have submitted notes.
- Grouping is a single linear pass comparing each row's `(AnimeID, FansubGroupID)` to the current group's key, not a map -- correct and simpler because the repository's SQL `ORDER BY anime.id, fg.id, ...` already guarantees the key is contiguous across the flat row stream.

## Deviations from Plan

None - plan executed as written. All three tasks' acceptance criteria pass; `grep -c "h.db.Query" dashboard_me_handler.go` is 0 as required.

### Note on the plan's literal verification-block regex

Same pre-existing naming-convention mismatch flagged by `143-09-SUMMARY.md`: the plan's `<verification>` block specifies `-run TestReleaseReviewQueryRepositoryPendingOwnNoteRevisionAttention`, which matches zero tests (the file's actual test-naming convention, established by 143-09, is `Test<Behavior>` named after the subject, not `TestReleaseReviewQueryRepository<Method>`). The actual new test is `TestPendingOwnNoteRevisionAttentionOnlyRejectedOwnNotes`, run and confirmed passing (see below). Not a coverage gap -- a plan-authoring naming mismatch, consistent with the prior plan's documented note.

## Issues Encountered
- Per the operational note for this phase, `team4sv30-backend`'s running container had stale file contents relative to host edits. Used `docker cp` to sync every touched/created file into the container before each build/test run, matching 143-09/143-11's established workaround.
- The plan's SQL for `PendingOwnNoteRevisionAttention` references `episode.sort_index` in its `ORDER BY`, a column the shared `openReleaseReviewQueryFixture`/`openDashboardReleaseReviewAttentionHandlerFixture` fixtures never declared (only the real production `episodes` table has it, added by migration 0033). Both new fixture functions (`openDashboardOwnNoteRevisionAttentionFixture` in the repository test file, `openDashboardOwnNoteRevisionAttentionHandlerFixture` in the handler test file) add `episodes.sort_index INTEGER` and `fansub_groups.name` as additive columns on top of the shared base fixture to satisfy the query.
- The repository test's first attempt to seed a tombstoned lifecycle row (`review_state = 'tombstoned'`) failed against migration 0135's `chk_release_note_review_tombstone_shape` CHECK constraint, which requires `tombstoned_at IS NOT NULL` whenever `review_state = 'tombstoned'`. Fixed by supplying a `tombstoned_at` timestamp alongside the tombstoned row -- a one-line fixture fix, not a production code change.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Criterion-7 (backend half) is closed: the dashboard now aggregates the actor's own rejected release-version notes, grouped by anime + fansub group, with zero new raw SQL in the handler and full member-scoping proof against the threat model's T-143-13 entry.
- The frontend half (types, `AttentionSection.tsx` lane markup, CSS, page wiring per `143-PATTERNS.md` #10 and `143-UI-SPEC.md`) is explicitly out of this plan's `files_modified` list and remains for a later plan in this phase.
- No blockers for subsequent Phase 143 plans.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: backend/internal/repository/release_review_query_own_note_revisions.go
- FOUND: backend/internal/repository/release_review_query_repository_test.go
- FOUND: backend/internal/repository/member_profile_dashboard_repository.go
- FOUND: backend/internal/handlers/dashboard_me_handler.go
- FOUND: backend/internal/handlers/dashboard_me_handler_test.go
- FOUND: shared/contracts/openapi.yaml
- FOUND commit: ab6a363f
- FOUND commit: 2b271751
- FOUND commit: 9edb394e

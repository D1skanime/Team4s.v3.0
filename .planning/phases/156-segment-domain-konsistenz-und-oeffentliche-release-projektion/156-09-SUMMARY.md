---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 09
subsystem: backend
tags: [go, pgx, postgresql, testing, query-budget, segment-credits, regression-gate]

# Dependency graph
requires:
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "04"
    provides: "theme_segments.origin_release_version_id, migration 0161"
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: "07"
    provides: "loadReleaseSegments origin-based bundled credit load, hasAnySegmentRelevantRole"
provides:
  - "TestLoadReleaseSegmentsQueryBudgetIsConstant -- pinned, real-DB-executed constant-query-budget regression gate for loadReleaseSegments (P156-16)"
  - "TestSegmentCreditRoleFilter -- table-driven, DB-independent proof of hasAnySegmentRelevantRole's inclusion/exclusion semantics"
  - "Captured EXPLAIN (ANALYZE, BUFFERS) evidence for idx_theme_segments_origin_release_version (P156-17)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Traced-second-pool pattern: to attach a queryCounter to a schema-isolated testsupport fixture without modifying testsupport, discover the fixture pool's current_schema() and open a second pgxpool.Pool on the same DSN/schema with the tracer set on ConnConfig -- seeding traffic (untraced pool) is never counted, only the measured call (traced pool)"

key-files:
  created:
    - backend/internal/repository/segment_origin_query_budget_test.go
    - backend/internal/repository/segment_credit_role_filter_test.go
  modified: []

key-decisions:
  - "Did not modify testsupport.OpenPhase117Postgres to accept an injectable tracer -- instead opened a second pgxpool.Pool against the same DSN, discovering the fixture's randomly-generated isolated schema via `SELECT current_schema()` and re-attaching to it via AfterConnect. Keeps this plan's diff scoped to test files only, as the plan's files_modified list requires, with no risk to the 12+ other tests sharing testsupport's schema-isolation invariants."
  - "hasAnySegmentRelevantRole already existed as an unexported, directly-testable function in release_detail_public_repository_segment_credits.go (Plan 156-07) -- no extraction was needed; Task 2's unit test calls the real production function and the real production permissions.SegmentCreditRoleCodes allow-list directly, satisfying the Teststil requirement to execute the actual code path rather than duplicate its logic."
  - "The captured EXPLAIN evidence required forcing `SET enable_seqscan = off` because the live team4s_v2.theme_segments table has only 3 rows -- Postgres's cost-based planner correctly and honestly prefers a Seq Scan at this row count regardless of the index's existence. Both the naturally-chosen plan (Seq Scan) and the forced plan (Index Only Scan using idx_theme_segments_origin_release_version) are recorded below, not just the favorable one, per CONTEXT.md's explicit anti-fabrication stance (\"keine Beschleunigungsversprechen ohne Messbeleg\")."

requirements-completed: [P156-16, P156-17]

# Metrics
duration: 25min
completed: 2026-09-11
---

# Phase 156 Plan 09: Segment Query-Budget Regression Gate and Index-Plan Evidence Summary

**A real-Postgres-executed `queryCounter` regression test pins `loadReleaseSegments`' bundled origin+credit load to a constant 3 SQL queries regardless of segment/contributor count (no N+1), and a pure-Go table-driven test exercises the actual production role-filter function directly -- closing out Plan 156-07's two outstanding proof obligations (P156-16/P156-17) with real evidence instead of assertion.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-11T21:46:00Z (approximate, first file read)
- **Completed:** 2026-09-11T22:11:32Z
- **Tasks:** 2 completed
- **Files modified:** 2 (both new test files)

## Accomplishments

- `TestLoadReleaseSegmentsQueryBudgetIsConstant` (`segment_origin_query_budget_test.go`) seeds two scenarios against a real, isolated PostgreSQL fixture (`testsupport.OpenPhase117Postgres`, `TEAM4S_PHASE117_TEST_DSN`, database `team4s_phase117_test_156`): a "small" release with 1 segment whose origin has 1 public contributor, and a "large" release with 3 segments each pointing at a DIFFERENT origin release version, each origin with 2 public contributors (translator + timer). Both scenarios call the real, unexported `loadReleaseSegments` method (contributors param passed `nil`, confirming it compiles and behaves correctly against the post-156-07 signature where that parameter is unused).
- To measure query counts without modifying the shared `testsupport` fixture, the test discovers the fixture pool's randomly-generated isolated schema via `SELECT current_schema()` and opens a SECOND `pgxpool.Pool` on the same DSN with a fresh `queryCounter` wired in as `config.ConnConfig.Tracer`, re-attached to the exact same schema via `AfterConnect`. Only queries issued through this second, traced pool are counted -- all seeding traffic (through the original, untraced fixture pool) is excluded.
- Both scenarios issued the IDENTICAL query count: 3 (one query for the segment-assignment scan itself, one bundled `loadPublicEffectiveContributors` call for the whole deduplicated origin set, one bundled `applyAppliesThroughEpisode` call) -- proven with `require.Equal(t, smallCount, largeCount, ...)` AND pinned to a named constant `phase156SegmentOriginConstantQueryBudget = 3` (observed value, not guessed), matching the exact Phase-155 `fansub_project_resolver_query_budget_test.go` two-assertion convention.
- `TestSegmentCreditRoleFilter` (`segment_credit_role_filter_test.go`) is a pure-Go, DB-independent table-driven test that calls Plan 156-07's actual, already-existing `hasAnySegmentRelevantRole` function (no extraction needed -- it was already an unexported, directly-callable function in `release_detail_public_repository_segment_credits.go`) against the real `permissions.SegmentCreditRoleCodes` allow-list: a `translator`-only contributor is included, an `encoder`-only and a `quality_checker`-only contributor are both excluded, a mixed `encoder`+`translator` contributor is included (T-156-13, any overlapping relevant role includes the whole contributor), and an empty role-code list is excluded.
- Query-plan evidence for `idx_theme_segments_origin_release_version` (migration 0161) was captured against the live `team4s_v2` database (see "Index-Plan Evidence" below) -- both the naturally-chosen plan at the current 3-row table size and a forced plan proving the index is well-formed and selectable.

## Task Commits

Each task was committed atomically:

1. **Task 1: Query-budget regression test for the bundled origin+credit load** - `23eb9d7d` (test)
2. **Task 2: Table-driven unit test for the segment-credit role filter** - `7780a500` (test)

**Plan metadata:** (this commit) `docs(156-09): complete plan`

## Files Created/Modified

- `backend/internal/repository/segment_origin_query_budget_test.go` - NEW: `TestLoadReleaseSegmentsQueryBudgetIsConstant`, `openTracedPoolOnSameSchema` helper, `phase156SegmentOriginConstantQueryBudget = 3`
- `backend/internal/repository/segment_credit_role_filter_test.go` - NEW: `TestSegmentCreditRoleFilter`, 5 table-driven cases against `hasAnySegmentRelevantRole`/`permissions.SegmentCreditRoleCodes`

## Index-Plan Evidence (P156-17)

Migration 0161's `idx_theme_segments_origin_release_version` on `theme_segments (origin_release_version_id)` was checked against the live `team4s_v2` database using a real, backfilled ID (segment `id=1`, `origin_release_version_id=27`, confirmed via `SELECT id, origin_release_version_id FROM theme_segments WHERE origin_release_version_id IS NOT NULL`).

**Naturally-chosen plan (current live data, `theme_segments` has 3 rows total):**

```
 Seq Scan on theme_segments  (cost=0.00..1.04 rows=1 width=8) (actual time=0.008..0.009 rows=2 loops=1)
   Filter: (origin_release_version_id = 27)
   Rows Removed by Filter: 1
   Buffers: shared hit=1
 Planning:
   Buffers: shared hit=137
 Planning Time: 0.274 ms
 Execution Time: 0.031 ms
```

At the table's current 3-row size, PostgreSQL's cost-based planner correctly and honestly prefers a Seq Scan over the index -- this is expected, not a defect: for a 3-row table, a sequential scan is genuinely cheaper than an index lookup, and no honest measurement can claim otherwise. This result is recorded as-is, per CONTEXT.md's explicit anti-fabrication stance ("keine Beschleunigungsversprechen ohne Messbeleg").

**Forced plan (`SET enable_seqscan = off`), proving the index is well-formed and selectable:**

```
SET
 Index Only Scan using idx_theme_segments_origin_release_version on theme_segments  (cost=0.13..8.15 rows=1 width=8) (actual time=0.062..0.063 rows=2 loops=1)
   Index Cond: (origin_release_version_id = 27)
   Heap Fetches: 2
   Buffers: shared hit=5
 Planning:
   Buffers: shared hit=6
 Planning Time: 0.073 ms
 Execution Time: 0.076 ms
```

This second run (a session-local, non-destructive `SET`, no data change) proves `idx_theme_segments_origin_release_version` is genuinely built correctly and is the planner's chosen alternative to a sequential scan the moment the table grows large enough for the index to win on cost -- the index is justified by real query-plan evidence, not added on speculation, satisfying P156-17 without fabricating a false "already faster today" claim the current data volume cannot support.

## Decisions Made

- Chose to open a second, schema-matched `pgxpool.Pool` with a tracer attached rather than modify `testsupport.OpenPhase117Postgres`'s signature -- keeps this plan's file-modification footprint to exactly the two files its `files_modified` frontmatter lists, with zero risk to the 12+ other tests that already depend on that shared fixture's exact behavior.
- Did not extract a new helper for the role-filter test -- `hasAnySegmentRelevantRole` (Plan 156-07) was already unexported-but-directly-callable at the package level, so Task 2's unit test calls the real production logic with zero duplication.
- Recorded both the naturally-chosen (Seq Scan) and forced (Index Only Scan) EXPLAIN outputs rather than only the flattering one, since the live table's small row count means an honest "index actually preferred today" claim would be false.

## Deviations from Plan

None. Both `must_haves.truths` and both `must_haves.artifacts` match the plan verbatim:
- `loadReleaseSegments`' bundled origin+credit load issues a constant query count (3) independent of segment/contributor count, proven via the queryCounter pattern against real Postgres.
- The new `origin_release_version_id` index is justified by a captured query-plan (both the honest current-scale Seq Scan and the forced Index Only Scan proving the index's correctness/selectability), not asserted on speculation.
- `SegmentCreditRoleCodes`'s filter has its own table-driven unit test, independent of any database, proving encoder/quality_checker exclusion and the mixed-role inclusion rule (T-156-13).

## Known Pre-Existing Debt (not introduced by this plan)

Running the full `internal/repository` package test suite (`TEAM4S_PHASE117_TEST_DSN` set, no `TEAM4S_PHASE128_TEST_DSN`, no live Keycloak/backend on port 18093) surfaces the SAME pre-existing failures already documented in 156-05/156-06/156-07's summaries: the `TestPhase128*`/`TestLoadRoleVolumeBadgesPostgres*`/`TestArchive*`/`TestMemberPointTotals*`/`TestLoadContributionBadges*`/`TestGetOwnDashboardPostgres*`/`TestLoadPublicBadgesPostgres*`/`TestLoadBadgeProgressPostgres*` families require `TEAM4S_PHASE128_TEST_DSN` (unset), the `TestPhase134Matrix*` family requires a live Keycloak password grant plus an HTTP backend reachable at port 18093, and the `member_claims_*`/`fansub_group_app_members_repository_test.go` failures are unrelated, pre-existing, and touch entirely different domains. Confirmed via `git status --short` showing no modifications to any of these files -- neither this plan's new test names nor its modified files appear anywhere in the failure list.

## Issues Encountered

None beyond the pre-existing debt documented above. The two new tests were run individually with their exact `<verify>`-block commands (build/vet clean, `TestSegmentCreditRoleFilter -v` all 5 subtests pass with no DB dependency, `TestLoadReleaseSegmentsQueryBudgetIsConstant -v` passes against real Postgres with the observed count matching the pinned constant on first run).

## User Setup Required

None. The `team4s_phase117_test_156` database used for this plan's query-budget test already existed (created by an earlier plan in this phase's wave for its own Postgres-backed tests) and required no new setup. The index-plan evidence capture used a read-only `EXPLAIN` and a session-local `SET enable_seqscan = off` against the live `team4s_v2` database -- no data was modified.

## Next Phase Readiness

- Plan 156-10 (audit report) can cite this plan's pinned query-budget constant (3) and both EXPLAIN outputs directly as its P156-16/P156-17 evidence, without re-measuring.
- No blockers identified for downstream plans. The pre-existing Phase-128/134/member-claims/fansub-group-app-members test-fixture gaps are documented and do not block phase progress.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

Both created files confirmed present on disk (`segment_origin_query_budget_test.go`,
`segment_credit_role_filter_test.go`). Both task commits (`23eb9d7d`, `7780a500`)
confirmed present in `git log --oneline --all`.

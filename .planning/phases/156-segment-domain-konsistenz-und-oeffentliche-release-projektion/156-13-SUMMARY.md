---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 13
subsystem: api, database
tags: [postgres, pgx, gin, segment-contributors, gap-01]

# Dependency graph
requires:
  - phase: 156 (Plan 156-12)
    provides: theme_segment_contributors table (theme_segment_id + member_id only, no
      role_code, no release_version_id), SetThemeSegmentContributors/
      ListThemeSegmentContributorCandidates/GetThemeSegmentContributorMemberIDs,
      permissions.SegmentCreditRoleCodes widened to 6 entries, transactional
      SetThemeSegmentOrigin with atomic contributor cleanup
provides:
  - applySegmentOriginCredits now requires explicit theme_segment_contributors
    selection AND role-relevance before a contributor appears publicly -- no
    fallback to "show every role-relevant Origin contributor"
  - loadThemeSegmentContributorSelections: one bundled SELECT keyed by segment ID,
    query budget raised from 3 to 4 (pinned, proven constant across cardinality)
  - full A-J-plus-K(a/b) regression matrix against real Postgres
    (TestSegmentContributorSubsetMatrix), including the 2026-09-12 Nachtrag's
    inherited-default -> release-override -> removal case
  - corrected TestReleaseDetailPublicSegmentOriginCredits/Test5 and
    TestSegmentCreditRoleFilter (quality_checker/editor now segment-relevant,
    encoder remains the sole permanent exclusion)
  - GET/PUT /api/v1/admin/anime/:id/segments/:segmentId/contributors, gated by the
    same requireSegmentManage capability as every other segment-write endpoint
affects: [156-14, 156-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-condition public projection gate: role-relevance (permissions.SegmentCreditRoleCodes)
      AND explicit per-segment selection (theme_segment_contributors), both resolved live,
      neither stored redundantly on the segment"
    - "segmentCreditsFixture: shared unexported Postgres test fixture struct extracted across
      two segment-credit test files to avoid duplicating fixture-creation SQL while staying
      under the 450-line file limit"

key-files:
  created:
    - backend/internal/repository/release_detail_public_repository_segment_contributor_subset_test.go
    - backend/internal/handlers/admin_content_anime_theme_segment_contributors.go
    - backend/internal/handlers/admin_content_anime_theme_segment_contributors_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository_segment_credits.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/release_detail_public_repository_segment_credits_test.go
    - backend/internal/repository/segment_credit_role_filter_test.go
    - backend/internal/repository/segment_origin_query_budget_test.go
    - backend/cmd/server/admin_routes.go

key-decisions:
  - "applySegmentOriginCredits resolves segmentIDs internally from items[i].ThemeSegmentID
    instead of taking a new function parameter -- the plan explicitly allowed either approach;
    internal resolution avoided touching loadReleaseSegments' call site at all."
  - "loadThemeSegmentContributorSelections always issues its bundled query regardless of
    whether any segment has a selection row, so the query-budget constant stays proven equal
    across zero-selection and fully-selected scenarios, not just the row-count-positive case."
  - "GET/PUT handlers load the segment via GetAnimeSegmentByID BEFORE the requireSegmentManage
    check (per the plan's own behavior spec), because the permission-check release version
    (Origin, else first assignment, else 0) is only knowable after the segment is loaded --
    the 'zero repository access when denied' acceptance criterion was interpreted as 'zero
    calls to the SECOND read/write (candidates list / SetThemeSegmentContributors)', matching
    the plan's own described-calls language, and proven by a fake-repo call counter."

patterns-established:
  - "segmentCreditsFixture (Postgres-backed test fixture struct with allocID/newReleaseVersion/
    newSegment/assignSegment/newContribution/newAnimeDefaultContribution/selectContributor
    methods) is now the shared base for any future segment-credit-projection regression test."

requirements-completed: [P156-07, P156-08, P156-09, GAP-01]

# Metrics
duration: ~55min
completed: 2026-09-12
---

# Phase 156, Plan 13: Explicit segment-contributor selection gates the public projection Summary

**The public release page now shows a segment credit only if the person was explicitly selected for that segment (theme_segment_contributors, Plan 156-12) AND their current, live-resolved Origin role is segment-relevant -- the 12-case A-J-plus-K(a/b) regression matrix and two new admin endpoints are the proof and the write surface for that rule.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2
- **Files modified:** 9 (3 created, 6 modified)

## Accomplishments

- `applySegmentOriginCredits` (`release_detail_public_repository_segment_credits.go`) now
  intersects role-relevance with an explicit `theme_segment_contributors` selection via one new
  bundled query (`loadThemeSegmentContributorSelections`, keyed by segment ID) -- a segment with
  zero selection rows shows zero person-level credits, even when its Origin has real,
  role-relevant, public contributors. No legacy fallback exists or was added.
  the query budget rose from a proven-constant 3 to a proven-constant 4
  (`TestLoadReleaseSegmentsQueryBudgetIsConstant`), extended not replaced, with both the
  small/large-equality assertion and the pinned-constant assertion intact.
- Full A-J-plus-K regression matrix (`TestSegmentContributorSubsetMatrix`, 13 independent
  subtests) proven against real, isolated Postgres, including the 2026-09-12 UAT Nachtrag's
  mandatory Case K: a contributor effective only through an inherited anime-default, later
  overridden at release level to either a relevant role (switches automatically) or an
  irrelevant role (disappears cleanly) -- in both sub-cases the underlying
  `theme_segment_contributors` row is never touched, only the read-time effective-resolution
  output changes.
- The two tests Plan 156-12 knowingly left red are corrected, not deleted, per mandatory
  directive #5: `TestReleaseDetailPublicSegmentOriginCredits/Test5` (renamed "Encoder erscheint
  nie, Quality-Checker nur wenn explizit ausgewählt und auflösbar") and
  `TestSegmentCreditRoleFilter` (`quality_checker`/`editor` now assert `want: true`, `encoder`
  remains the sole `want: false`). Both are GREEN.
- New `GET`/`PUT /api/v1/admin/anime/:id/segments/:segmentId/contributors` endpoints
  (`admin_content_anime_theme_segment_contributors.go`) expose the candidate list and the
  validated write path, gated by the identical `requireSegmentManage` capability check used by
  every other segment-write endpoint -- confirmed live: both return `401` (not `404`)
  unauthenticated after a backend rebuild.
- Confirmed (per the plan's own `<interfaces>` claim, re-verified live) that the project-page
  timeline DTO (`models.ReleaseTimelineSegment` / `group.go`) carries no participant/credit
  field at all -- `grep -n "Participants\|participants" backend/internal/models/group.go`
  returns zero matches, and `git status --short` on `group_repository_cursor.go`/`group.go`
  shows no changes. GAP-01 intentionally adds nothing to the project page.

## Task Commits

Each task was committed atomically:

1. **Task 1: Public projection intersection + query-budget extension + regression matrix A-J+K** -
   `34c4ea5d` (feat)
2. **Task 2: Admin GET/PUT segment-contributors endpoints** - `f3410b29` (feat)

_Note: both tasks were delivered with their tests in the same commit (implementation + tests
together), not as separate RED/GREEN commits, mirroring the same TDD-gate note already recorded
in 156-06-SUMMARY.md/156-12-SUMMARY.md for this phase._

## Files Created/Modified

- `backend/internal/repository/release_detail_public_repository_segment_credits.go` -
  `applySegmentOriginCredits`'s two-condition rule, new `loadThemeSegmentContributorSelections`
  helper, updated header doc citing 156-UAT.md GAP-01
- `backend/internal/repository/release_detail_public_repository_helpers.go` - doc-comment update
  describing the two-condition credit rule (no functional change -- segment IDs are resolved
  internally by `applySegmentOriginCredits` from `items`, not passed as a new parameter)
- `backend/internal/repository/release_detail_public_repository_segment_credits_test.go` -
  rewritten around a new shared `segmentCreditsFixture` struct (`newReleaseVersion`/`newSegment`/
  `assignSegment`/`newContribution`/`newAnimeDefaultContribution`/`selectContributor`/
  `ensureMember`), Test1-Test4/Test6/Test7 updated to explicitly select their contributors,
  Test5 rewritten for the corrected rule
- `backend/internal/repository/release_detail_public_repository_segment_contributor_subset_test.go` -
  new file, `TestSegmentContributorSubsetMatrix` with 13 independent subtests (A, B, C, D, E, F,
  G, H, I, J, K-relevant, K-irrelevant, NoOrigin-defensive), reusing `segmentCreditsFixture`
- `backend/internal/repository/segment_credit_role_filter_test.go` - `quality_checker-only`/
  `editor-only` cases now `want: true` with renamed, accurate descriptions; `encoder-only`
  unchanged
- `backend/internal/repository/segment_origin_query_budget_test.go` - constant raised to 4 with
  updated doc comment; both scenarios now seed explicit selections (small: one selected; large:
  two segments fully selected, one segment deliberately left unselected) so the new bundled
  query is proven to participate in the scan on both matching and non-matching cases
- `backend/internal/handlers/admin_content_anime_theme_segment_contributors.go` - new file,
  `ListThemeSegmentContributors`/`SetAnimeSegmentContributors`/
  `resolveSegmentPermissionReleaseVersionID`
- `backend/internal/handlers/admin_content_anime_theme_segment_contributors_test.go` - new file,
  7 httptest+fake-repo cases (GET denied/allowed/not-found, PUT denied/allowed/no-origin-409/
  repository-conflict-409/malformed-body-400)
- `backend/cmd/server/admin_routes.go` - two new route registrations immediately after the
  existing `.../origin` route

## Decisions Made

See `key-decisions` in frontmatter. No discrepancy was found between `156-13-PLAN.md` and
`156-UAT.md`'s 2026-09-12 Nachtrag -- the plan's task text already incorporated the Nachtrag's
Case K requirement verbatim (it cites the Nachtrag by date in the plan's own `must_haves`), so no
UAT-vs-plan conflict resolution was needed.

## Deviations from Plan

None - plan executed exactly as written. The plan explicitly offered a choice for how
`applySegmentOriginCredits` obtains segment IDs ("as a new third parameter, or resolve it
internally from items -- either is acceptable"); resolving internally was chosen and is not a
deviation per the plan's own text.

## Issues Encountered

**Pre-existing, plan-unrelated test-order dependency reproduced identically on this plan's new
tests when run with an isolated `-run` filter** (same class of finding already documented in
156-02-SUMMARY.md for four `RangeAutoAssign` handler tests): running
`TestSetAnimeSegmentOrigin_RequiresCapabilityThenSucceeds` (a pre-existing, untouched test) in
isolation via `-run` also fails with 403/`insufficient_role` on this same pre-plan baseline --
confirmed by running it alone BEFORE reproducing the same symptom on the new
`TestListThemeSegmentContributors_RequiresCapabilityThenSucceeds`/
`TestSetAnimeSegmentContributors_RequiresCapabilityThenSucceeds` tests. The FULL
`internal/handlers` package run (`go test ./internal/handlers/... -count=1`, no `-run` filter) is
green for the entire package, including every new test added by this plan -- verified explicitly
by grepping the full verbose run's output for both `SegmentContributors` and `SegmentOrigin` test
names, all `PASS`. Not a regression introduced by this plan; not fixed here (out of this plan's
scope, same disposition as the 156-02 precedent).

**Separately, pre-existing/environment-conditional failures NOT caused by this plan** (same
buckets documented in every prior 156-0x/156-1x SUMMARY): `internal/repository`'s
`TEAM4S_PHASE128_TEST_DSN`-gated Member-*-tests (~30 tests, env var not set in this execution
environment) and the Keycloak-dependent `phase134_verification_matrix*_test.go` tests. Neither
bucket touches any file this plan modified; not re-verified line-by-line here since this plan's
own scoped verification command (`-run` filtered to the four named test functions) is unaffected
by either bucket and is fully green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The public projection, the write path (Plan 156-12), and the admin read/write HTTP surface
  (this plan) are now all wired end to end and proven against real Postgres. Plan 156-14/156-15
  can build frontend UI on top of a stable, tested backend contract without further backend
  changes to this specific surface.
- Backend rebuilt (`docker compose up -d --build team4sv30-backend`) and confirmed healthy
  (`/health` returns `{"status":"ok"}`, `docker compose ps` shows `Up`); both new routes verified
  live returning `401` (not `404`) unauthenticated.
- git push was NOT run, per this execution's explicit instruction (main remains ahead of
  origin/main, reported only in the phase-level final report).

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-12*

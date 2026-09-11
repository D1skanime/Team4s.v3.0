---
phase: 155-fansub-projektseite-read-model-und-query-budget
plan: 03
subsystem: api
tags: [go, pgx, postgres, testing]

# Dependency graph
requires: ["155-01"]
provides:
  - "Real, running, Postgres-backed regression proof that GroupContributorsRepository.GetProjectContributors issues a constant 2-query budget at 30-50 contributor scale"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Own matching contributor_roles/role_definitions seed pair required to satisfy GetProjectContributors' case-sensitive role_definitions.code = contributor_roles.name join, since the DSN-gated test database carries no production lookup-row data"

key-files:
  created: []
  modified:
    - backend/internal/repository/group_contributors_repository_test.go

key-decisions:
  - "This plan does not change GroupContributorsRepository.GetProjectContributors's SQL at all — it is a pure verification/lock-in task per CONTEXT.md's explicit allowance for a documented negative finding instead of a rewrite"
  - "Seeded team members and external contributors through the exact table chains GetProjectContributors' two queries already join (release_member_roles -> fansub_releases -> episodes -> release_versions -> release_version_groups for team members; anime_contributions -> anime_contribution_roles for external contributors), rather than any parallel/simplified seed shape"

requirements-completed: [P155-03, P155-04]

# Metrics
duration: ~12min
completed: 2026-09-11
---

# Phase 155 Plan 03: Contributor Query Budget Summary

**Locked in, with a real seeded 30+20-contributor Postgres test, the negative finding RESEARCH.md already confirmed by direct SQL inspection: `GetProjectContributors` issues exactly 2 SQL queries (one external-contributors block, one team-members block) regardless of contributor volume — no per-member request/query fan-out exists today.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-09-11T15:30:15Z
- **Tasks:** 1/1 completed
- **Files modified:** 1

## Accomplishments

- Added `TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors` to `group_contributors_repository_test.go`, reusing the Plan 155-01 `openPhase155Postgres`/`mustExecPhase155` DSN scaffold from `fansub_project_resolver_query_budget_test.go` (same package) — the new test does NOT call `setupTestRepo`, which unconditionally skips (`test_helpers.go:14-17`) and had therefore never actually run this file's other two tests against a real database.
- Seeded two synthetic projects against the real `team4s_phase155_test` database: a small case (2 team members via `release_member_roles`, 2 external contributors via `anime_contributions`) and a large case (30 team members, 20 external contributors — 50 total, matching Auftrag §12's contributor-load-test mandate and P155-04's requirement).
- Measured, not guessed: both the small and large cases issue exactly 2 SQL queries total for a single `GetProjectContributors` call, pinned as `phase155ContributorsConstantQueryBudget = 2` — identical to `phase155PublicProfileConstantQueryBudget`-style constants used elsewhere in this package.
- Discovered and worked around a real, pre-existing latent defect while building the seed data: `GetProjectContributors`' team-members query joins `role_definitions.code = contributor_roles.name` with case-sensitive string equality. Production `contributor_roles` rows are capitalized (`'Translator'`, `'Timer'`, ...) while all production `role_definitions` codes are lowercase snake_case (`'translator'`, `'timer'`, ...) — this join can never match in production data, meaning `TeamMembers` could be silently empty in production today regardless of how much `release_member_roles` data exists. This is flagged below as an out-of-scope finding, not fixed here (see Deviations).
- The test seeds its own matching `contributor_roles`/`role_definitions` pair (`'Phase155BudgetRole'` on both sides) specifically so the team-members query's join succeeds during the test, proving the query-count claim without silently masking the underlying join defect.
- Notes/media tables are deliberately NOT seeded: `GetProjectContributors` does not join `member_anime_notes`/media tables at all, so their absence from the seed is itself part of what the constant query count proves (per the plan's `<behavior>` framing).

## Task Commits

Each task was committed atomically:

1. **Task 1: Constant-query-budget test for GetProjectContributors at 30-50 contributor scale** - `b3b9ecda` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

## Files Created/Modified

- `backend/internal/repository/group_contributors_repository_test.go` - added `seedPhase155ContributorBudgetGroup` (seed helper: one `fansub_groups` + `anime` + shared release chain + N team members + M external contributors, namespaced by `groupID*1000+offset`), `phase155ContributorsConstantQueryBudget` constant, and `TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors`

## Decisions Made

- Did not fix the `role_definitions.code = contributor_roles.name` case-sensitivity join gap in `GetProjectContributors` itself. This plan's binding scope is verification/lock-in of the query-budget claim, not a rewrite of the query — CONTEXT.md explicitly frames a negative finding (query count is already bounded) as an acceptable, expected outcome for Workstream B, and the plan's `<action>` text is scoped to "Do not pin an exact numeric constant if the measured count... is already documented elsewhere as '2'" (i.e. verify the count, do not touch the SQL). Flagged below as a real, out-of-scope defect discovered during execution.
- Used a single shared `contributor_roles`/`role_definitions` pair (`'Phase155BudgetRole'`) reused across both the small and large seeded groups, rather than seeding a fresh role pair per group, since `ON CONFLICT DO NOTHING` makes the lookup-row insert idempotent and the role itself is not group-scoped in the schema.
- Chose group IDs `1550400`/`1550500` (small/large) to avoid collision with Plan 155-01's already-seeded `1550100`–`1550300` range in the same shared, persistent `team4s_phase155_test` database.

## Deviations from Plan

### Auto-fixed Issues

None — no code required fixing for this test-only plan.

### Out-of-Scope Findings (not fixed, documented per Rule 2/scope-boundary guidance)

**1. [Latent pre-existing defect, out of scope] `GetProjectContributors`' team-members query can never match production role data**

- **Found during:** Task 1, while designing seed data for team members via `release_member_roles`.
- **Issue:** `group_contributors_repository.go`'s team query does `JOIN contributor_roles cr ON cr.id = rmr.role_id JOIN role_definitions rd ON rd.code = cr.name` — an exact, case-sensitive string join. Production `contributor_roles.name` values (migration `0044_add_db_schema_v2_target_tables.up.sql`) are capitalized English words (`'Translator'`, `'Timer'`, `'Typesetter'`, `'Encoder'`, `'QC'`, `'Karaoke'`). Production `role_definitions.code` values (migration `0085_role_definitions_seed.up.sql` and later) are lowercase snake_case (`'translator'`, `'timer'`, `'typesetter'`, `'encoder'`, ...). No production `role_definitions` row has a code matching any production `contributor_roles.name` value byte-for-byte, so this inner join can filter out every `release_member_roles` row in the live database, regardless of how much team-credit data exists — team members with real, existing `release_member_roles` rows can be silently absent from a project's contributor list today.
- **Why not fixed here:** This plan's binding scope (per `155-03-PLAN.md`'s objective and CONTEXT.md's Workstream B framing) is to measure and lock in the *query-count* behavior of the existing, unmodified query — not to rewrite its join logic. Fixing the join (e.g. `LOWER(rd.code) = LOWER(cr.name)`, or reconciling the two lookup tables) is a behavior change to production SQL with its own blast radius (would need verification against real production `release_member_roles` data, which this session's read-only research found to be `0` rows anyway — see `155-RESEARCH.md`'s Environment Availability table), and is not one of this plan's listed tasks.
- **Workaround used in the test:** Seeded a matching `contributor_roles`/`role_definitions` pair (`'Phase155BudgetRole'` on both sides) so the join succeeds during the test — this proves the *query-count* claim accurately without being silently defeated by the unrelated join defect, and without papering over the defect by lower-casing test data to match production's mismatched casing (which would misrepresent what actually happens in production).
- **Recommendation:** Flagged here for the phase-level verifier/closeout and any future maintainer touching `group_contributors_repository.go` — this is a real, currently-live data-integrity gap independent of Phase 155's query-budget scope, tracked here rather than silently fixed mid-plan or silently ignored.

---

**Total deviations:** 0 auto-fixed. 1 out-of-scope finding documented (not fixed, per scope boundary).
**Impact on plan:** None on this plan's own success criteria — both required assertions (constant query count; exact team/external counts at both scales) pass against a real database. The out-of-scope finding is orthogonal to what this plan was asked to measure.

## Issues Encountered

- The `team4s_phase155_test` database (provisioned in Plan 155-01, a schema-only clone of `team4s_v2`) carries the full production schema but zero lookup-row data (no `contributor_roles`, no `role_definitions` seed rows) — matching the exact same pattern the Phase-152 test database's own comments already documented (`fansub_public_profile_query_budget_test.go:38-42`). The seed helper inserts its own idempotent lookup rows for both tables rather than assuming production seed data is present.
- Confirmed (by direct repro) that this test — like Plan 155-01's `TestFansubProjectResolverQueryBudgetIsConstant` in the same DSN-gated database — is a single-run fixture: re-running it a second time against the same already-seeded database fails on `fansub_groups_pkey` duplicate-key violations, since neither this plan's nor Plan 155-01's seed helpers are idempotent on their fixed numeric IDs. This is the established, pre-existing convention for this scaffold (also true of the Phase-152 test database across its own multiple test functions), not a regression introduced by this plan. The test passed cleanly on its first run against the freshly-available database state (see verification below); the database is left in a "used once" state afterward, consistent with how Plan 155-01 already left it.

## User Setup Required

None — no external service configuration required. The `team4s_phase155_test` database this plan's test uses already existed from Plan 155-01's provisioning; no new database or environment variable was created.

## Next Phase Readiness

- `phase155ContributorsConstantQueryBudget = 2` is now the enforced ceiling for `GetProjectContributors`; any future change to that repository method that increases the query count must update this constant deliberately and explain why.
- The latent `role_definitions.code = contributor_roles.name` case-sensitivity join defect documented above remains unresolved and is not blocking for the rest of Phase 155's plans (155-04 through 155-07), none of which touch `GetProjectContributors`'s SQL per the phase's own workstream boundaries — but it should be surfaced to the phase-level verifier/closeout as a real, independently-discovered data-integrity gap.

---
*Phase: 155-fansub-projektseite-read-model-und-query-budget*
*Completed: 2026-09-11*

## Self-Check: PASSED

Verified `backend/internal/repository/group_contributors_repository_test.go` contains
`TestGetProjectContributorsQueryBudgetIsConstantAt30To50Contributors` (grep count 1) and does
not call `setupTestRepo` within that function body. Verified commit `b3b9ecda` is present in
`git log --oneline --all`. Verified the test passes against the real, DSN-gated
`team4s_phase155_test` Postgres database (both small and large cases measured at exactly 2
queries, matching the pinned constant).

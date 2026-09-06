---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 04
subsystem: api
tags: [go, badges, gamification, postgres, member-profile]

# Dependency graph
requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 01)
    provides: "backend/internal/badges package (RoleVolume, Points, Progress, ContributionProjects, ContributionChronicle, ContributionArchivist, Membership families) -- not directly used by this plan's own fix, but establishes the phase's threshold-authority context this plan's D-10 fix sits inside"
provides:
  - "member_profile_public_repository.go's loadPublicBadges no longer queries release_role_credit_lifecycles -- role_entry_<code> is sourced exclusively by loadRoleVolumeBadges, for every tier including entry, always with progress fields"
  - "Real-Postgres proof (dedicated single-use fixture DB) that role_entry_<code> appears exactly once, with progress fields, for both an above-entry-tier role and an entry-tier-only role"
  - "Four pre-existing member_profile_repository_postgres_test.go tests updated to assert the same award-visible/reversal-hidden live-projection behavior on loadRoleVolumeBadges (their production behavior's new sole source) instead of the now-deleted loadPublicBadges code path"
affects: [150-05, 150-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dedicated single-use throwaway Postgres fixture database (openPhase15004Postgres, TEAM4S_PHASE150_04_TEST_DSN) for tests that must write to point_ledger_entries: that table carries an append-only guard trigger (DELETE/UPDATE/TRUNCATE all raise), which is fundamentally incompatible with the shared team4s_phase129_test database's DELETE-based per-test reset (openPhase129Postgres/resetPhase129Fixtures) -- any test writing a ledger row there would permanently break every later test sharing that database. IDs are derived from time.Now().UnixNano() rather than fixed literals so repeated invocations against the same long-lived database never collide."

key-files:
  created: []
  modified:
    - backend/internal/repository/member_profile_public_repository.go
    - backend/internal/repository/member_profile_public_repository_postgres_test.go
    - backend/internal/repository/member_profile_repository_postgres_test.go

key-decisions:
  - "Used a NEW dedicated single-use fixture database/env-var (TEAM4S_PHASE150_04_TEST_DSN, openPhase15004Postgres, full pg_dump --schema-only copy of team4s_v2) rather than the plan's suggested testsupport/phase150_postgres.go helper (OpenPhase150Postgres) or the file's existing openPhase129Postgres fixture. OpenPhase150Postgres's minimal stand-in schema (members/hist_fansub_group_members/anime_contributions/member_badges only) cannot support GetPublicMemberProfileByID's full loader chain (loadMemberships/loadCurrentProjects/loadKnownFor/etc., dozens of tables). openPhase129Postgres COULD run the full function, but its shared-DB DELETE-based reset is fundamentally incompatible with point_ledger_entries' append-only guard trigger -- inserting a ledger row there (required because release_role_credit_lifecycles' chk_release_role_credit_lifecycle_shape CHECK mandates a non-null award_entry_id for 'awarded' rows) permanently breaks every subsequent test sharing that database. Confirmed this by reproducing the exact 'point ledger is append-only' failure cascading into all later Phase129/131/132 tests before reverting and switching approaches."
  - "The corrected entry-tier count (role_entry_<code>'s CurrentCount now reflecting the real awarded count instead of a bare progress-less badge) is a genuine, user-visible number change on any live profile with an entry-tier role whose true count is not 1 -- flagged explicitly below for Plan 150-06's Live-UAT."

requirements-completed: [SC-5, SC-7]

# Metrics
duration: 26min
completed: 2026-09-06
---

# Phase 150 Plan 04: Fix loadPublicBadges' duplicate role-entry emission (D-10) Summary

**Deleted `loadPublicBadges`'s independent `release_role_credit_lifecycles` query so `role_entry_<code>` is now emitted exactly once (by `loadRoleVolumeBadges` alone, always with progress fields) instead of twice.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-06T23:02:04Z
- **Completed:** 2026-09-06T23:28:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- `loadPublicBadges` no longer queries `release_role_credit_lifecycles` for role codes; it now only ever returns real, persisted `member_badges` rows.
- `role_entry_<code>` is now sourced exclusively by `loadRoleVolumeBadges` (unchanged in this plan, called immediately after `loadPublicBadges` in `GetPublicMemberProfileByID`), which already emitted this badge code correctly WITH progress fields for every tier including entry.
- New real-Postgres test (`TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress`) proves the fix at both the plan's own named examples: an above-entry-tier role (`typesetter`, count=13/bronze) and an entry-tier-only role (`translator`, count=5) -- `role_entry_<code>` appears exactly once in both cases, always with a non-nil `CurrentCount`.
- Four pre-existing tests in `member_profile_repository_postgres_test.go` that directly exercised `loadPublicBadges`'s now-deleted role-entry code path (`TestLoadPublicBadgesPostgresRoleEntryAwardedVisible`, `TestLoadPublicBadgesPostgresKaraokeFXAwardedVisible`, `TestLoadPublicBadgesPostgresRoleEntryReversedHidden`, `TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears`) were updated to assert the identical live-projection (award-visible / reversal-hidden / never-awarded-never-appears) behavior against `loadRoleVolumeBadges` instead, preserving genuine test coverage rather than leaving them either broken or vacuously passing.

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1 (RED): add failing real-Postgres proof for role_entry_<code> double-emission** - `ab478b0c` (test)
2. **Task 1 (GREEN): delete loadPublicBadges' duplicate role-entry query** - `ca9a5a9e` (feat)

## Files Created/Modified
- `backend/internal/repository/member_profile_public_repository.go` - `loadPublicBadges`'s second query/loop (independent `release_role_credit_lifecycles` scan, bare `role_entry_<code>` append with no progress fields) deleted; doc comment updated to state role-entry sourcing is now exclusively `loadRoleVolumeBadges`'s responsibility
- `backend/internal/repository/member_profile_public_repository_postgres_test.go` - new `TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress` plus its dedicated single-use fixture helper (`openPhase15004Postgres`, `mustExecPhase15004`, `seedPhase150AwardedRoleCredits`, `countBadgeCodeOccurrences`)
- `backend/internal/repository/member_profile_repository_postgres_test.go` - four pre-existing tests repointed from `repo.loadPublicBadges` to `repo.loadRoleVolumeBadges` to keep asserting genuine, non-vacuous coverage of the same behavior after the source moved

## Decisions Made
See `key-decisions` in frontmatter: the dedicated single-use fixture database choice (and why the plan's suggested `OpenPhase150Postgres` and the file's own `openPhase129Postgres` were both unworkable for this specific test), and the explicit flag for Plan 150-06's Live-UAT about the entry-tier count correction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's suggested test-fixture helper (`OpenPhase150Postgres`) is schema-incompatible with `GetPublicMemberProfileByID`; the file's own existing `openPhase129Postgres` fixture is incompatible with `point_ledger_entries`' append-only guard**
- **Found during:** Task 1 (writing the real-Postgres test)
- **Issue:** (a) `testsupport.OpenPhase150Postgres` (Plan 150-02's helper) creates only 5 minimal stand-in tables (members/hist_fansub_group_members/anime_contributions/member_claims/member_badges) for the `services` package's `badge_service.go` queries -- `GetPublicMemberProfileByID`'s full loader chain touches dozens of tables (fansub_groups, anime, episodes, release_versions, etc.) this helper never creates. (b) The existing `openPhase129Postgres` fixture in this exact test file DOES carry the full schema and IS what every other test proving `GetPublicMemberProfileByID` behavior in this file already uses -- but its `resetPhase129Fixtures` reset mechanism is DELETE-based against a single shared database, and `release_role_credit_lifecycles`'s `chk_release_role_credit_lifecycle_shape` CHECK requires a non-null `award_entry_id` for 'awarded' rows, meaning any test proving real awarded-tier counts (as this plan's task explicitly requires) must insert into `point_ledger_entries` -- which carries an unconditional append-only guard trigger blocking DELETE, UPDATE, and TRUNCATE alike. Confirmed by reproduction: inserting via `openPhase129Postgres` made `resetPhase129Fixtures` fail with "point ledger is append-only" on every subsequent test in the same run, cascading failures into unrelated Phase-129/131/132 tests.
- **Fix:** Reverted the shared fixture's reset function to its original state (no residual changes), dropped and re-provisioned the polluted `team4s_phase129_test` database fresh, and instead added a new dedicated, single-use fixture (`openPhase15004Postgres`, env var `TEAM4S_PHASE150_04_TEST_DSN`, same `pg_dump --schema-only` recipe as `openPhase129Postgres` but its own throwaway database) used exclusively by this one test. IDs are derived from `time.Now().UnixNano()` (not fixed literals) so repeated invocations against the same long-lived, never-reset database never collide -- verified by running the new test three times in a row with PASS every time.
- **Files modified:** `backend/internal/repository/member_profile_public_repository_postgres_test.go`
- **Verification:** `go test ./internal/repository/... -run TestPhase150RoleEntryBadgeEmittedExactlyOnceWithProgress -v` passes against real Postgres, repeatably; full `go test ./internal/repository/... -run 'TestPhase129|TestPhase131|TestPhase132'` suite still green against the re-provisioned shared database (no lingering pollution).
- **Committed in:** `ab478b0c` (RED test), `ca9a5a9e` (final fixture refinements alongside the GREEN fix)

**2. [Rule 1 - Bug] Four pre-existing tests directly asserted the now-deleted `loadPublicBadges` role-entry behavior**
- **Found during:** Task 1 (running the plan's own `<verify>` command `go test ./internal/repository/... -run TestLoadPublicBadges -v` after the GREEN fix)
- **Issue:** `TestLoadPublicBadgesPostgresRoleEntryAwardedVisible`, `TestLoadPublicBadgesPostgresKaraokeFXAwardedVisible`, and `TestLoadPublicBadgesPostgresRoleEntryReversedHidden` called `repo.loadPublicBadges` directly and asserted it produced `role_entry_<code>` badges -- behavior this plan's fix deliberately removes from that function. `TestLoadPublicBadgesPostgresNonEligibleRoleNeverAppears` would have kept "passing" but vacuously, since `loadPublicBadges` no longer looks at role data at all regardless of lifecycle status.
- **Fix:** Repointed all four tests' assertions from `repo.loadPublicBadges` to `repo.loadRoleVolumeBadges` -- the function's new sole source for this behavior -- preserving the exact same award-visible / reversal-hidden / never-awarded-never-appears live-projection semantics they were already correctly testing.
- **Files modified:** `backend/internal/repository/member_profile_repository_postgres_test.go`
- **Verification:** `go test ./internal/repository/... -run TestLoadPublicBadges -v` (with `TEAM4S_PHASE128_TEST_DSN` set) — all 5 tests in that run pass.
- **Committed in:** `ca9a5a9e`

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug, both required to make this plan's own `<verify>` commands actually pass against real Postgres)
**Impact on plan:** Both fixes were necessary correctness/test-infrastructure work directly caused by this plan's own change; no scope creep beyond what the plan's task already required ("a real-Postgres test proves the fix").

## Issues Encountered
Reproduced and then had to work around a genuine incompatibility between Postgres's append-only ledger guard trigger and this codebase's shared, DELETE-reset Phase-129 test fixture -- documented above and in the dedicated fixture's own doc comment for future plans that might otherwise hit the same trap.

## User Setup Required
None - no external service configuration required. (The dedicated `team4s_phase150_test_04` database was provisioned directly against the running `team4sv30-db` container as part of this plan's own verification; it is a disposable throwaway per the codebase's existing convention for these phase-specific fixture databases, matching `team4s_phase129_test`/`team4s_phase128_test`.)

## Next Phase Readiness
- `grep -n "role_entry_" backend/internal/repository/member_profile_public_repository.go` shows only the doc-comment reference, not a query/loop -- matches the plan's own `<verification>` requirement exactly.
- Plan 150-05 (frontend `Math.max` compensation removal in `MemberBadgeChain.tsx`) can now proceed: the backend never emits `role_entry_<code>` twice, so the frontend's defensive de-duplication is provably no longer needed.
- **Flag for Plan 150-06's Live-UAT:** the entry-tier `role_entry_<code>` count is now the REAL awarded count (previously the frontend's `Math.max` fallback showed a hardcoded `1` for every entry-tier role, since `loadPublicBadges`'s old bare copy carried no `CurrentCount` at all). Any live member profile with an entry-tier role whose true count is not `1` will show a different, larger, and now-correct number after this fix ships.

---
*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Completed: 2026-09-06*

## Self-Check: PASSED

All three modified files found on disk; this SUMMARY.md found on disk; both task commits
(`ab478b0c`, `ca9a5a9e`) found in git history.

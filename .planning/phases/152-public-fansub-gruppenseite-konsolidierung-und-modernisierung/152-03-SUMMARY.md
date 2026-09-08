---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 03
subsystem: api
tags: [go, postgres, pgx, fansub-repository, domain-projection, query-budget]

# Dependency graph
requires:
  - phase: 152-01/02
    provides: prior Phase-152 groundwork (audit-verified baseline, tiptap link-mark contract drift fix)
provides:
  - "Public-specific group load path (getPublicGroupBase + attachPublicReleaseVersionsCount) that skips 4 unused counts and the duplicate fansub_group_links query"
  - "Trimmed GetFansubGroupDomainProjection with the never-rendered contributors query removed"
  - "Guarded-Postgres regression suite proving zeroed-unused-counts, links-table freshness (Pitfall 1), and admin-path non-regression"
affects: [152-08 (query-budget constant-count gate consumes this trimmed load path)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Public-specific additive load-path helpers alongside shared admin hydration functions, instead of trimming the shared functions themselves (keeps GetGroupByID/GetGroupBySlug/hydrateFansubGroup byte-identical for their other 4+ callers)"
    - "applyLegacyLinkProjection reused standalone (zero extra queries) to keep legacy website_url/discord_url/irc_url columns in sync with fansub_group_links after removing a duplicate query path"

key-files:
  created:
    - backend/internal/repository/fansub_public_profile_load_path_test.go
  modified:
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/domain_projection_repository.go
    - backend/internal/repository/domain_projection_repository_test.go

key-decisions:
  - "getPublicGroupBase/attachPublicReleaseVersionsCount added as new additive private methods rather than modifying GetGroupBySlug/hydrateFansubGroup, preserving those functions byte-for-byte for fansub_groups.go, fansub_merge.go, and app_auth_invitations.go callers"
  - "listProjectionContributors left defined-but-uncalled (not deleted) per D02 additive-only scope lock; DomainProjectionContributorRow type and its query stay reversible dead code"
  - "team4s_phase152_test throwaway database created via CREATE DATABASE + pg_dump --schema-only pipe from team4s_v2, matching the Phase-128/129/131 guarded-Postgres pattern"

requirements-completed: [P152-07, P152-08]

# Metrics
duration: ~20min
completed: 2026-09-08
---

# Phase 152 Plan 03: Public group load-path query trimming Summary

**Public /fansub-slugs/:slug/public-profile load path now hydrates only the fields the page reads (drops 4 unused counts, collapses a duplicated fansub_group_links query into one), and the domain-projection endpoint no longer issues its never-rendered contributors query -- both changes behaviorally proven against a real guarded Postgres database.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-08T17:22:00Z (approx, first grounding read)
- **Completed:** 2026-09-08T17:41:23Z
- **Tasks:** 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `GetPublicProfileBySlug` uses a new public-specific load path (`getPublicGroupBase` + `attachPublicReleaseVersionsCount`) instead of the shared `GetGroupBySlug`/`hydrateFansubGroup` path, dropping 4 count queries the public page never reads while keeping `ReleaseVersionsCount` (the one it does read) correct
- The duplicate `fansub_group_links` query is gone: a single `ListGroupLinks` call now feeds both `group.Links` and, via `applyLegacyLinkProjection`, the legacy `website_url`/`discord_url`/`irc_url` columns -- closing the exact staleness gap flagged as Pitfall 1 in `152-RESEARCH.md`
- `GetFansubGroupDomainProjection` no longer calls `listProjectionContributors`; the response still defaults `contributors` to `[]` in JSON, so no consumer-visible contract change
- Three new guarded-Postgres tests against a dedicated `team4s_phase152_test` database (schema-only copy of `team4s_v2`) behaviorally prove: the four unused counts are zero despite real underlying rows, `website_url` reflects the links table over a deliberately stale legacy column, and the shared admin `GetGroupBySlug` path is completely unaffected (still returns real non-zero counts)
- `GetGroupBySlug`/`GetGroupByID`/`hydrateFansubGroup`/`attachGroupCounts`/`attachGroupLinks`/`ListGroupLinks` remain byte-identical (confirmed via `git diff`) for their other callers (`fansub_groups.go`, `fansub_merge.go`, `app_auth_invitations.go`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Additive public-specific group load path (B1, B2)** - `0dd2b0a9` (feat)
2. **Task 2: Drop the unused contributors projection (B3)** - `a6fced76` (feat)
3. **Task 3: Guarded-Postgres behavioral proof of the trimmed public load path** - `bda525ee` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `backend/internal/repository/fansub_repository.go` - Added `getPublicGroupBase` (raw base-row load, no `hydrateFansubGroup`) and `attachPublicReleaseVersionsCount` (only the one count the public page reads); rewrote `GetPublicProfileBySlug` to use them plus a single `ListGroupLinks` call followed by `applyLegacyLinkProjection`
- `backend/internal/repository/domain_projection_repository.go` - Removed the `listProjectionContributors` call and `resp.Contributors` assignment from `GetFansubGroupDomainProjection`; struct literal still initializes `Contributors: []DomainProjectionContributorRow{}`
- `backend/internal/repository/domain_projection_repository_test.go` - Added `TestGetFansubGroupDomainProjection_DoesNotCallListProjectionContributors` (absence-check, CLAUDE.md-permitted exception)
- `backend/internal/repository/fansub_public_profile_load_path_test.go` - New guarded-Postgres test file with 3 behavioral tests plus the DSN-env/DB-name-guard/seed scaffold

## Decisions Made
- Kept `listProjectionContributors` and `DomainProjectionContributorRow` defined but uncalled rather than deleting them (D02: targeted fix, not a rewrite; RESEARCH.md confirmed no other caller exists, so this is safe, reversible dead code)
- Placed the two new `FansubRepository` helpers near `GetGroupBySlug` and mirrored its exact SQL/scan shape and `hydrateFansubGroup`'s single-element slice-wrap pattern for `populateCountMap`, to keep the change purely additive and easy to audit against the existing shared functions
- Created the `team4s_phase152_test` database and loaded a schema-only dump from `team4s_v2` before writing Task 3's tests, following the Phase-128/129/131 guarded-Postgres precedent exactly (fail-closed DB-name regex, `SELECT current_database()` self-check, skip-if-unset)

## Deviations from Plan

None - plan executed exactly as written. The re-confirmed caller graph for `GetGroupBySlug`/`GetGroupByID`/`hydrateFansubGroup` matched `152-RESEARCH.md` Assumption A4 exactly (`fansub_groups.go:134/188`, `fansub_merge.go:80`, `app_auth_invitations.go:129`), so no additional coordination was needed.

## Issues Encountered
None. The `team4s_phase152_test` throwaway database did not yet exist at plan start; created it and loaded the schema-only dump per the plan's explicit Task 3 instructions (this was expected setup work, not a deviation).

## Known Stubs

None - no stubs introduced. The four zeroed count fields (`AnimeRelationsCount`/`ProjectsCount`/`MembersCount`/`AliasesCount`) are an intentional, plan-directed contract-value change documented in the plan's `<read_first>` section (B1), not stubs -- they reflect fields the public page never read in the first place, and the admin path (`GetGroupBySlug`) still computes them correctly for its own consumers.

## Threat Flags

None. Both changes stay within the plan's own `<threat_model>` disposition (T-152-03-01 accept, T-152-03-02 mitigate via the Pitfall-1 regression test, T-152-03-03 accept) -- no new network endpoints, auth paths, or trust-boundary-relevant surface was introduced.

## User Setup Required

None - no external service configuration required. Note for future test runs: the `team4s_phase152_test` database now persists on the shared `team4sv30-db` container (schema-only, no seed data outside individual test runs' own inserts); subsequent guarded-test runs against `TEAM4S_PHASE152_TEST_DSN` will reuse it without needing to recreate it.

## Next Phase Readiness
The public group load path and domain-projection endpoint are both trimmed and behaviorally proven. Plan 152-08 (query-budget constant-count gate, per the plan's `<verification>` note) can now build its guarded-Postgres query-count assertions directly against this reduced load path -- the plan's stated target of "7 queries instead of 12" for `public-profile` is unverified numerically by this plan (that measurement is explicitly deferred to 152-08) but the structural reductions (4 fewer count queries, 1 fewer duplicate links query, 1 fewer contributors query) are all in place and tested.

---
*Phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung*
*Completed: 2026-09-08*

## Self-Check: PASSED

All 4 created/modified plan files confirmed present on disk; all 3 task commit hashes
(`0dd2b0a9`, `a6fced76`, `bda525ee`) confirmed present in `git log`.

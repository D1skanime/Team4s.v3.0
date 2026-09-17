# Phase 163 — Deferred Items (Out-of-Scope Discoveries)

Logged per the executor's Scope Boundary rule: issues discovered during Plan 163-01's
mandatory pre-fix `go test ./...` baseline capture that are unrelated to this phase's
`episode_version_public_*` scope. None of these were fixed — they pre-exist independently
of any Phase 163 change (Plan 163-01 touched only two `episode_version_public_*` test files).

## 1. Full `go test ./...` requires per-phase test-DSN env vars this session did not set

Running `go test ./...` with only `TEAM4S_PHASE117_TEST_DSN` set (the DSN Phase 163's own
tests use) produces many additional failures beyond the one documented in `STATE.md`
(`TestFansubRepository_PublicProfileSourceInvariants`). These are gated by env vars/live
services this baseline capture did not configure, not new regressions:

- 35 subtests across `TestLoadRoleVolumeBadgesPostgresProgressBoundaries` and 8 sibling
  `TestLoad*/TestGetOwnDashboard*/TestMemberPointTotals*/TestArchive*` tests fail with
  `TEAM4S_PHASE128_TEST_DSN is required for Phase-128 PostgreSQL tests` (no DSN set this run).
- `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` fails with
  `TEAM4S_PHASE134_MIGRATION_DSN is required for the Phase-134 migration fresh/up/down proof test`.
- 9 `TestPhase134Matrix*` tests fail with `dial tcp 192.168.235.196:18093: connect: connection
  refused` (these call the live HTTP backend on a port not reachable from inside the
  `team4sv30-backend` container in this session).
- 3 `TestPhase134Matrix*` tests fail with a Keycloak `invalid_grant` (`sheppert`/`csubs-leader`
  password-grant credentials not valid/seeded in this session's Keycloak state).
- 2 Jellyfin fixture tests (`Test11eyesSourceSelection_AllActualItemsAndPermutations`,
  `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery`) fail with
  `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json: no such file
  or directory` (fixture file not present in this checkout).
- A handful of `TestEpisodeImportSource*`/`TestEpisodeVersionDate*`/`TestEpisodeVersionDelete*`
  tests fail on `column "episode_type_source" does not exist` / `relation
  "episode_filler_types" does not exist` — the shared `OpenPhase117Postgres` fixture shim
  predates a later quick task's schema addition (260916-emd), and those specific test files
  add their own newer shims that this baseline run's environment did not fully reconcile.
- `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` and two `TestClaimBlock*`/
  `TestClaimSubmitBlockedForMemorialProfile` tests fail on string-based source-fragment
  checks (`member_claims_repository.go` missing an expected string) — pre-existing,
  unrelated Altlast-style tests (see CLAUDE.md's Teststil section on this pattern).
- `TestEvaluateMemberMutationConflictBlocksLastActiveManager` fails independently of Phase 163.

**Why deferred, not fixed:** none of these touch `episode_version_public_query.go`,
`episode_version_public_integration_test.go`, or `episode_version_public_group_filter_test.go`.
Plan 163-01 changed only the latter two files (test-only). Fixing any of the above would be
out-of-scope infrastructure/environment work for unrelated phases.

**Verified in scope:** `go test ./internal/repository/... -run TestEpisodeVersionPublic` and
`-run TestEpisodeVersionPublicGroupFilter` are the only two commands this plan's `<verification>`
section requires, and both were run and produce the documented RED failures (see
`163-01-SUMMARY.md`).

## 2. `backend/internal/repository/fansub_repository.go` pre-exists CLAUDE.md's 450-line cap (2471 lines before Plan 163-02, 2496 after)

Plan 163-02 added one small method (`ResolveFansubGroupIDForAnime`, ~19 lines) to this file
per the plan's own explicit interface guidance (RESEARCH.md Pattern 4 / 163-02-PLAN.md's
interfaces block: "recommended location: a new small method on `FansubRepository`", reusing
the `animeExists`/`ListAnimeFansubs` pattern already in this exact file). The file was already
2471 lines — 5.5x over CLAUDE.md's 450-line production-code cap — before this plan touched it.

**Why deferred, not fixed:** the Scope Boundary rule limits auto-fixes to issues directly
caused by the current task's changes. This file's pre-existing size is unrelated to Phase 163
and splitting a 2471-line repository file into cohesive sub-files is a non-trivial refactor
(dozens of methods, shared private helpers, no obvious single-responsibility seam at the
one-method-addition scale of this plan) that risks destabilizing unrelated fansub-admin
functionality. Recommend a dedicated future cleanup phase/quick task to split
`fansub_repository.go` by concern (e.g. group CRUD, anime-relation queries, public-profile
reads, admin release/version writes).

---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 09
subsystem: api
tags: [go, postgres, episode-import, jellyfin, gap-closure]

# Dependency graph
requires:
  - phase: 164
    provides: 164-UAT.md live gap report (GAP-12) that this plan closes
provides:
  - "applyReleaseNative derives the default episode_type_id for newly imported episodes from anime.type instead of a hardcoded 'episode' lookup"
  - "models.EpisodeMetadataSourceImport constant marking import-derived episode_type_source values, distinct from 'manual'"
affects: [episode-import, jellyfin-import, anisearch-import, admin-episode-editing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New import-derived episode metadata uses a distinct source constant (EpisodeMetadataSourceImport = 'import') from the admin-override constant (EpisodeMetadataSourceManual = 'manual'), so a later reimport can still refine it while manual overrides are never touched by the existing COALESCE(episode_type_id, ...) update-branch guard."

key-files:
  created:
    - backend/internal/repository/episode_import_repository_apply_test.go
  modified:
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/models/episode_classification.go

key-decisions:
  - "Read anime.type inside the same apply transaction (tx.QueryRow \"SELECT type FROM anime WHERE id = $1\") right before the existing episode_types lookup, so the mapping is read-consistent with the rest of the apply and requires no new lock."
  - "mapAnimeTypeToEpisodeType is a closed Go switch (tv->episode, ova->ova, ona->ona, movie->movie, special->special, default->episode) -- no dynamic SQL construction from the mapped value, matching the threat model's T-164-16 mitigation."
  - "episode_type_source is only set on the INSERT (new-episode) branch, never on the UPDATE (existing-episode) branch -- preserves the pre-existing 'never overwrite manual' contract for episode_type_id without any change to that branch's logic."

patterns-established:
  - "Test fixture for this file: openEpisodeImportSourceFixture(t) extended locally (in the new test file) with an ALTER TABLE anime ADD COLUMN type + ALTER TABLE episodes ADD COLUMN episode_type_source + extra episode_types seed rows, run against a real Postgres via testsupport.OpenPhase117Postgres (TEAM4S_PHASE117_TEST_DSN, isolated schema per test)."

requirements-completed: [REQ-164-04]

# Metrics
duration: ~20min
completed: 2026-09-18
---

# Phase 164 Plan 09: Derive import episode type from anime.type (GAP-12) Summary

**`applyReleaseNative` now reads `anime.type` and maps it to the correct `episode_types` row (ova/ona/movie/special/episode) for newly created import episodes instead of always hardcoding `"episode"`, while never touching manually-set episode types on reimport.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-18T08:18:00Z (approx)
- **Completed:** 2026-09-18T08:37:33Z
- **Tasks:** 1
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Closed GAP-12: importing episodes for an OVA/ONA/Movie/Special anime now types every newly created episode according to `anime.type` instead of leaving everything as the generic `'episode'` type.
- Added `episode_type_source = 'import'` on newly-created import episodes (previously the column was omitted from the INSERT and defaulted to `NULL`), giving future tooling a clean signal that a type was import-derived vs. admin-set.
- Verified with 5 real-Postgres integration test cases (ova/ona/movie/special/tv mapping + unknown/empty fallback) plus a dedicated regression test proving a manually-set `episode_type_id`/`episode_type_source='manual'` survives a reimport that would otherwise flip the type.

## Task Commits

Each task was committed atomically:

1. **Task 1: Derive the default import episode type from anime.type** - `a18c3f82` (fix) — production code + new test file
2. Deferred-items log update - `44d323bd` (docs) — pre-existing unrelated test failures observed during broader verification run

**Plan metadata:** (this SUMMARY commit, to follow)

## Files Created/Modified
- `backend/internal/repository/episode_import_repository_apply.go` - Added `mapAnimeTypeToEpisodeType`; `applyReleaseNative` now queries `anime.type` and uses the mapped name for the `episode_types` lookup; `upsertImportEpisode`'s INSERT branch now also writes `episode_type_source = 'import'` for new rows (UPDATE branch untouched).
- `backend/internal/models/episode_classification.go` - Added `EpisodeMetadataSourceImport = "import"` constant alongside the existing `EpisodeMetadataSourceManual`.
- `backend/internal/repository/episode_import_repository_apply_test.go` - New: `openEpisodeImportApplyTypeFixture` (extends the shared Jellyfin/episode-import fixture with `anime.type`, `episodes.episode_type_source`, and extra `episode_types` rows) plus `TestEpisodeImportRepositoryDerivesEpisodeTypeFromAnimeType` (7 subtests) and `TestEpisodeImportRepositoryNeverOverwritesManualEpisodeType`.

## Decisions Made
- Read `anime.type` via a plain `SELECT type FROM anime WHERE id = $1` inside the existing apply transaction rather than adding a new repository method — the value is needed exactly once, right before the existing `lookupIDByName(ctx, tx, "episode_types", ...)` call it feeds into, and the transaction already holds the anime-scoped advisory lock (`lockSegmentAssignmentAnimeTx`) from earlier in `applyReleaseNative`.
- Kept `mapAnimeTypeToEpisodeType` as an unexported, closed `switch` (not a lookup table or DB-driven mapping) — the mapping is small, fixed, and this shape gives the STRIDE mitigation (T-164-16) a hard "no dynamic SQL from the mapped value" guarantee for free.
- Did not add `episode_type_source` to the UPDATE branch of `upsertImportEpisode` — per the plan's explicit instruction and the interfaces note, the existing `COALESCE(episode_type_id, ...)` guard already protects manually-set types; touching the UPDATE branch's `episode_type_source` was out of scope and would risk overwriting a `'manual'` marker on an existing row whose `episode_type_id` happens to already match the derived value.

## Deviations from Plan

None - plan executed exactly as written. The plan's `<action>` section anticipated adding the new source constant "locally in this file if [adding to episode_classification.go] touches an unrelated file unnecessarily" but explicitly preferred the shared constant for symmetry with `EpisodeMetadataSourceManual`; that preferred option was used.

## Issues Encountered

- The plan's scoped verification command (`docker compose exec team4sv30-backend go test ./internal/repository/... -run TestEpisodeImportRepository -v -count=1`) could not run as literally written: `team4sv30-backend`'s runtime image is a compiled binary (production `Dockerfile`) with no Go toolchain, and `docker-compose.override.yml`'s dev image relies on Compose Watch file sync, which was not confirmed active for this session. Per this plan's operational constraints, ran the equivalent test via a throwaway `golang:1.25-alpine` container on the `team4s_default` network, bind-mounting the repo and pointing `TEAM4S_PHASE117_TEST_DSN` at a disposable `team4s_phase117_test_16409` database created on `team4sv30-db` (dropped afterward). All 8 new subtests passed (`ok team4s.v3/backend/internal/repository 1.136s`); `go build ./...` also passed via the same throwaway container. No changes were made to `team4s_v2`.
- A subsequent unscoped `go test ./internal/repository/... -count=1` run (extra double-check, not required by the plan) surfaced pre-existing, unrelated failures (network-unreachable Phase-134 matrix tests from inside the ephemeral container, and an unrelated `episode_version_dates_integration_test.go` schema-fixture gap). Logged to `deferred-items.md` per the SCOPE BOUNDARY rule; not fixed, not caused by this plan's changes.

## User Setup Required

None - no external service configuration required. This is a backend-only Go change; no frontend or infra changes. A `docker compose up -d --build team4sv30-backend` rebuild is only needed if/when a human wants to exercise the fix live via the admin UI (this plan's own verification did not require runtime deployment, per its `<verification>` block).

## Next Phase Readiness
- GAP-12 is closed for automated verification purposes; remaining plans 164-10..164-13 continue closing the other live-UAT gaps from `164-UAT.md`.
- No data migration was performed or needed: existing `episode_type_id`/`episode_type_source` values on already-imported episodes are unchanged; the fix only affects the type chosen for episodes created by a *future* import.
- Live UAT re-verification of GAP-12 (re-importing `11eyes: Pink Phantasmagoria` or another OVA/ONA/Movie/Special title and confirming the new episodes come in typed correctly) remains for the orchestrator's separate live UAT round — not marked human-accepted here.

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-18*

## Self-Check: PASSED

All claimed files exist on disk and both task commits (`a18c3f82`, `44d323bd`) are present in `git log`.

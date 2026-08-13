---
phase: 20-release-native-episode-import-schema
plan: 01
subsystem: database
tags: [postgres, schema-contract, release-graph, local-reset, db-schema-v2]
requires:
  - phase: 20.1-db-schema-v2-physical-cutover
    provides: physical DB Schema v2 tables, release_variant_episodes, release_streams, and legacy episode-version table removal
provides:
  - Phase 20 local reset verification against the Docker dev database
  - DB Schema v2 release coverage and filler metadata architecture contract alignment
  - Phase 20 schema audit artifact with zero missing artifacts and zero legacy deletion targets
affects: [phase-20, episode-import, release-graph, schema-contracts, shared-contracts]
tech-stack:
  added: []
  patterns:
    - Verification-only task commits for already-satisfied bridge work
    - DB Schema v2 contract checks remain the guardrail for release-native import work
key-files:
  created:
    - .planning/phases/20-release-native-episode-import-schema/20-01-schema-audit.md
  modified:
    - docs/architecture/db-schema-v2.md
    - shared/contracts/admin-content.yaml
    - shared/contracts/fansubs.yaml
    - shared/contracts/openapi.yaml
key-decisions:
  - "Treat Phase 20.1 as the schema foundation for Phase 20 plan 01 rather than recreating migrations or legacy episode-version tables."
  - "Keep `release_streams` as the canonical release-bound stream table; the older `streams` table remains only as an allowed compatibility divergence."
  - "Shared contracts must use release-native field names where runtime DTOs already moved away from episode-version terminology."
patterns-established:
  - "Bridge plans can use empty verification commits when a prior physical cutover already satisfied the planned schema work."
requirements-completed: [P20-SC1, P20-SC2, P20-SC3]
duration: 4min
completed: 2026-04-21
---

# Phase 20 Plan 01: Release-Native Schema Verification Summary

**Release-native schema bridge verified against Phase 20.1 physical cutover, with filler metadata, combined-file coverage, reset tooling, and contract audit locked for Phase 20 imports**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-21T14:28:07Z
- **Completed:** 2026-04-21T14:31:43Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Verified the guarded local reset script clears disposable anime, episode, release, stream, and media import rows without recreating legacy episode-version tables.
- Proved a clean disposable database can migrate through all 46 migrations and contains the release-native schema required by Phase 20.
- Aligned the architecture document and shared contracts with the already-physicalized release-native schema.
- Generated a Phase 20 schema audit artifact showing `Contract check | PASSED`, `Missing artifacts | 0`, and `Legacy deletion targets still present | 0`.

## Task Commits

1. **Task 1: Add a controlled local import reset** - `b995f39` (`test`, verification-only)
2. **Task 2: Align the architecture schema and add missing normalized schema pieces** - `4f3b00e` (`docs`)
3. **Task 3: Lock the schema contract in tests or audit output** - `d751f5b` (`test`)

## Files Created/Modified

- `.planning/phases/20-release-native-episode-import-schema/20-01-schema-audit.md` - Fresh Phase 20 DB Schema v2 contract audit output.
- `docs/architecture/db-schema-v2.md` - Documents `Episode` filler fields, `EpisodeFillerType`, and `ReleaseVariantEpisode` coverage for combined files.
- `shared/contracts/admin-content.yaml` - Renames the episode-delete result contract to `deleted_release_variants`.
- `shared/contracts/fansubs.yaml` - Renames group summary count to `release_versions_count`.
- `shared/contracts/openapi.yaml` - Mirrors the release-native shared contract field names.

## Reset Verification

Command run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\reset-local-schema-cutover-data.ps1 -ConfirmLocal
```

The script verified the local Docker database identity (`team4s_v2` / `team4s`) before truncating disposable rows. Post-reset counts were zero for `anime`, `episodes`, `episode_titles`, `fansub_releases`, `release_versions`, `release_variants`, `release_streams`, `stream_sources`, media link tables, and the legacy episode-version table names. The legacy names reported zero because the reset tooling safely skips absent tables instead of recreating them.

## Migration And Schema Verification

Migration names verified from a clean disposable database:

- `0044_add_db_schema_v2_target_tables`
- `0045_reconcile_db_schema_v2_columns`
- `0046_drop_legacy_episode_versions`

Commands run:

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS team4s_v2_2001_clean;" -c "CREATE DATABASE team4s_v2_2001_clean OWNER team4s;"
cd backend
go run ./cmd/migrate up -database-url "postgres://team4s:team4s_dev_password@127.0.0.1:5433/team4s_v2_2001_clean?sslmode=disable" -dir ..\database\migrations
```

Verification output confirmed:

- `migrations applied: 46`
- Required tables present: `episode_filler_types`, `episodes`, `episode_titles`, `fansub_releases`, `release_versions`, `release_variants`, `release_variant_episodes`, `release_streams`, `stream_sources`
- Required `episodes` columns present: `number_decimal`, `number_text`, `filler_type_id`, `filler_source`, `filler_note`
- Required constraints/indexes present: `uq_release_variant_filename`, `release_variant_episodes_pkey`, `chk_release_variant_episodes_position`, `idx_episode_filler_type`, and the release-variant-episode indexes
- Legacy tables absent: `episode_versions`, `episode_version_images`, `episode_version_episodes`

The disposable verification database was dropped after the check.

## Contract Verification

Commands run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\schema-v2-contract-check.ps1 -OutputPath .\.planning\phases\20-release-native-episode-import-schema\20-01-schema-audit.md
cd backend
go test ./internal/migrations -count=1
go test ./internal/... -count=1
```

Results:

- Schema contract check passed.
- Audit summary: `Missing artifacts | 0`, `Divergent artifacts | 1`, `Legacy deletion targets still present | 0`, `Contract check | PASSED`.
- The one remaining divergence is the documented old `streams` compatibility table existing beside target `release_streams`.
- Backend tests passed for `./internal/migrations` and `./internal/...`.
- Source scan across `backend/internal`, `frontend/src`, and `shared/contracts` found no remaining references to `episode_versions`, `episode_version_images`, `episode_version_episodes`, `deleted_episode_versions`, or `episode_versions_count`.

## Decisions Made

- No legacy episode-version table was recreated; Phase 20.1 remains the source of truth for the physical schema foundation.
- `docs/architecture/db-schema-v2.md` must explicitly document release coverage and filler metadata because future Phase 20 write work should follow that contract, not infer from migrations alone.
- Shared OpenAPI contract names were updated to match release-native runtime DTOs so generated or reviewed API work does not drift back to old terminology.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Documented physicalized filler and coverage schema in the architecture contract**
- **Found during:** Task 2
- **Issue:** Phase 20.1 had already physicalized `episode_filler_types`, `episodes.filler_*`, and `release_variant_episodes`, but `docs/architecture/db-schema-v2.md` did not document those structures.
- **Fix:** Added `Episode` filler fields, `EpisodeFillerType` values, and the `ReleaseVariantEpisode` coverage join.
- **Files modified:** `docs/architecture/db-schema-v2.md`
- **Verification:** Clean migration schema query and schema contract check passed.
- **Committed in:** `4f3b00e`

**2. [Rule 2 - Missing Critical] Removed stale episode-version terminology from shared contracts**
- **Found during:** Task 3
- **Issue:** Runtime code and frontend types had release-native names, but shared contract files still exposed `deleted_episode_versions` and `episode_versions_count`.
- **Fix:** Renamed those contract fields to `deleted_release_variants` and `release_versions_count`.
- **Files modified:** `shared/contracts/admin-content.yaml`, `shared/contracts/fansubs.yaml`, `shared/contracts/openapi.yaml`
- **Verification:** Source scan across backend, frontend, and shared contracts found no remaining legacy episode-version references.
- **Committed in:** `d751f5b`

**Total deviations:** 2 auto-fixed missing-critical documentation/contract issues.
**Impact on plan:** Both fixes align existing Phase 20.1 schema work with the documented bridge contract. No legacy schema was recreated.

## Issues Encountered

- The plan was largely already satisfied by Phase 20.1. Execution treated it as a bridge verification pass and only patched real documentation/contract drift found during verification.

## Known Stubs

None found in files created or modified by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 20 plan 02 can implement release-native episode import writes against `episodes`, `episode_titles`, `fansub_releases`, `release_versions`, `release_variants`, `release_variant_episodes`, `stream_sources`, and `release_streams`. It must not recreate or depend on `episode_versions`, `episode_version_images`, or `episode_version_episodes`.

## Self-Check: PASSED

- Verified created/modified files exist.
- Verified task commits exist: `b995f39`, `4f3b00e`, `d751f5b`.

---
*Phase: 20-release-native-episode-import-schema*
*Completed: 2026-04-21*

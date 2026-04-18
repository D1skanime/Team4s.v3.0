# Phase 18 Plan 01 Summary

**Completed:** 2026-04-18
**Plan:** `18-01-PLAN.md`
**Type:** Wave 0 contracts and expected-red tests
**Status:** Complete

## What Changed

- Added backend import DTOs in `backend/internal/models/episode_import.go`.
- Added expected-red backend tests for:
  - AniSearch canonical episode parsing.
  - Multi-episode media coverage apply.
  - Manual episode title preservation.
  - Preview separation between canonical rows and media candidates.
  - Apply rejection for unresolved conflicts.
- Added frontend import DTOs in `frontend/src/types/episodeImport.ts`.
- Added a pure frontend mapping helper seam in `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts`.
- Added expected-red frontend mapping tests in `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts`.

## Contract Locked

- AniSearch canonical episodes and Jellyfin media candidates are separate DTOs.
- Jellyfin season/episode values are evidence for suggestions only.
- A mapping row can target multiple canonical episode numbers.
- Status values are limited to `suggested`, `confirmed`, `conflict`, and `skipped`.
- Apply payloads require explicit operator-approved mappings.

## Verification

Backend compile gate passed:

```powershell
cd backend; go test ./internal/services ./internal/repository ./internal/handlers -run "^$"
```

Backend expected-red gate passed. The named tests fail by explicit `not implemented` assertions, not compile/setup errors:

```powershell
cd backend; go test ./internal/services ./internal/repository ./internal/handlers -run "TestParseAniSearchEpisodeListHTML_ReturnsCanonicalEpisodes|TestEpisodeImportApply_CreatesCoverageJoinRowsForMultiEpisodeMedia|TestEpisodeImportApply_PreservesExistingManualEpisodeTitle|TestPreviewEpisodeImport_SeparatesCanonicalEpisodesAndMediaCandidates|TestApplyEpisodeImport_RejectsUnconfirmedConflicts" -v
```

Frontend scoped typecheck passed for the new Phase 18 contract files:

```powershell
cd frontend; npx tsc --noEmit --pretty false --target ES2022 --module ESNext --moduleResolution Bundler --strict --esModuleInterop --skipLibCheck --types vitest src/types/episodeImport.ts "src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts" "src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts"
```

Frontend expected-red gate passed. `episodeImportMapping` fails by assertions for multi-target parsing and conflict detection, which later frontend work must implement:

```powershell
cd frontend; npm test -- episodeImportMapping --run --reporter verbose
```

## Baseline Note

Full-repo frontend `npx tsc --noEmit --pretty false` currently fails on older unrelated test fixtures in create/edit areas. Plan 18-01 was adjusted to use a scoped typecheck for the newly introduced Phase 18 contract files so the Wave 0 gate still distinguishes expected red tests from compile/import failures.

## Next

Proceed to `18-02-PLAN.md`: add `episode_version_episodes`, implement repository apply semantics, and turn the repository expected-red tests green.

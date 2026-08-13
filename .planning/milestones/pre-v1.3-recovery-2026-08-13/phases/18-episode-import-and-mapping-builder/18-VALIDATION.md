# Phase 18: Episode Import And Mapping Builder - Validation

**Created:** 2026-04-18
**Purpose:** Nyquist validation map for Phase 18 before execution.
**Status:** Ready for execution after plan-checker pass

## Validation Contract

Phase 18 must prove the gap between canonical anime episodes and local media files is handled explicitly. Validation therefore focuses on source separation, manual mapping, multi-episode media coverage, and safe apply semantics.

## Requirement Coverage

| Requirement | What Must Be Proven | Primary Plan | Automated Evidence |
|---|---|---|---|
| P18-SC1 | AniSearch provides canonical episode numbers/titles independent of Jellyfin/TVDB season grouping. | 18-01, 18-03 | `cd backend; go test ./internal/services -run AniSearchEpisode` |
| P18-SC2 | Jellyfin scan exposes media/file candidates with season/episode/path/media evidence but does not redefine canonical numbering. | 18-01, 18-03 | `cd backend; go test ./internal/handlers -run EpisodeImport` |
| P18-SC3 | Preview suggests mappings from Jellyfin evidence while keeping targets editable. | 18-01, 18-03, 18-04 | `cd frontend; npm test -- episodeImportMapping --run` |
| P18-SC4 | One Jellyfin media item can map to multiple canonical episodes. | 18-01, 18-02, 18-04 | `cd backend; go test ./internal/repository -run EpisodeImportApply` and `cd frontend; npm test -- episodeImportMapping --run` |
| P18-SC5 | Apply creates missing episodes and links media without overwriting manually curated episode data. | 18-01, 18-02, 18-03 | `cd backend; go test ./internal/repository ./internal/handlers -run EpisodeImport` |

## Wave Gates

### Wave 0: Contracts And Expected-Red Tests

Gate is satisfied only when:
- Backend packages compile with `go test ./internal/services ./internal/repository ./internal/handlers -run "^$"`.
- Phase 18 frontend contract files compile with the scoped `npx tsc --noEmit --pretty false ... episodeImport.ts episodeImportMapping.ts episodeImportMapping.test.ts` command from `18-01-PLAN.md`.
- Expected-red tests fail by assertion or explicit not-implemented behavior, not by compile, import, or setup errors.
- Red tests include named coverage for parser, repository apply, manual title preservation, preview separation, conflict rejection, and mapping helper conflicts.

### Wave 1: Data Model And Repository

Gate is satisfied only when:
- Migration `0043_add_episode_version_episodes.*.sql` exists and is reversible.
- `episode_version_episodes` is authoritative coverage.
- `episode_versions.episode_number` remains populated as the compatibility/display primary episode.
- Repository tests prove one media item covering `[9,10]` creates one version and two coverage rows.
- Existing manual episode title/status data survives import apply.

### Wave 2: Backend Preview And Apply API

Gate is satisfied only when:
- Preview is read-only.
- Preview response keeps canonical episodes, media candidates, mappings, conflicts, and unmapped rows separate.
- Apply rejects `suggested` and `conflict` mappings.
- Apply delegates persistence to the repository from Wave 1.
- Routes are admin-only and do not alter public playback routes.

### Wave 3: Frontend Mapping Builder

Gate is satisfied only when:
- `/admin/anime/[id]/episodes/import` is reachable from the existing episode overview.
- The UI shows anime context, AniSearch preview, Jellyfin media preview, editable mapping rows, and apply counts.
- Operators can confirm a multi-target mapping such as `9,10`.
- Apply remains disabled until suggested/conflict rows are confirmed or skipped.
- Public playback and broader Anime Edit redesign remain out of scope.

## Final Phase Verification

Before Phase 18 is considered complete, run:

```powershell
cd backend; go test ./internal/handlers ./internal/services ./internal/repository -run "EpisodeImport|AniSearchEpisode"
cd frontend; npx tsc --noEmit --pretty false --target ES2022 --module ESNext --moduleResolution Bundler --strict --esModuleInterop --skipLibCheck --types vitest src/types/episodeImport.ts "src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts" "src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts"
cd frontend; npm test -- episodeImportMapping --run
cd frontend; npm run build
```

If migrations or grouped reads touched broader repository behavior, also run:

```powershell
cd backend; go test ./internal/repository ./internal/models
```

## Manual UAT Checklist

- Import preview for a Jellyfin-linked anime with AniSearch source shows canonical episode rows and Jellyfin file rows separately.
- A Jellyfin item like `S03E11` is presented as evidence, not as the final Team4s episode number.
- A row can be edited to target multiple canonical episodes, for example `9,10`.
- Unmapped canonical episodes and unmapped files stay visible.
- Apply summary reports created/existing episodes, created/updated versions, applied mappings, skipped rows, and conflicts.
- Existing manually edited episode title/status values are preserved after apply.

## Out Of Scope Guardrails

- Do not redesign Anime Edit broadly.
- Do not redesign public playback.
- Do not treat TVDB/Jellyfin season grouping as canonical anime episode numbering.
- Do not rely on live AniSearch markup without fixture-backed parser tests.

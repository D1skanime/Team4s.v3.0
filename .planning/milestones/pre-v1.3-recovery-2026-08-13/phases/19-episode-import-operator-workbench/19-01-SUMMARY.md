---
phase: 19-episode-import-operator-workbench
plan: 01
subsystem: api
tags: [go, episode-import, jellyfin, dto, typescript]

requires:
  - phase: 18-episode-import-and-mapping-builder
    provides: preview/apply routes, coverage persistence, mapping builder baseline

provides:
  - Readable file evidence (file_name, display_path) in every EpisodeImportMappingRow
  - episodeImportDisplayPath helper for short folder-context labels
  - Version-friendly apply plan that accepts parallel releases for same episode
  - Frontend EpisodeImportMappingRow type updated with optional file_name/display_path

affects:
  - 19-02-PLAN (frontend workbench UI consuming readable mapping row fields)
  - 19-03-PLAN (bulk resolution controls referencing these semantics)

tech-stack:
  added: []
  patterns:
    - "MappingRow carries readable file evidence alongside opaque media_item_id so frontend never shows only IDs"
    - "Apply plan allows multiple confirmed mappings per episode (parallel versions) but rejects duplicate media_item_id"

key-files:
  created: []
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_episode_import_test.go
    - backend/internal/repository/episode_import_repository.go
    - backend/internal/repository/episode_import_repository_test.go
    - frontend/src/types/episodeImport.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts

key-decisions:
  - "EpisodeImportMappingRow carries file_name and display_path fields populated from media candidates at preview build time"
  - "displayPath uses grandparent/parent folder segments to give release-group context without exposing full absolute path"
  - "Apply plan removes exclusive episode-claim check: multiple confirmed rows for same episode are valid parallel versions"
  - "Duplicate media_item_id in mappings list remains a structural error and is still rejected"

patterns-established:
  - "Parallel releases: Two files from different groups targeting the same canonical episode are allowed as separate version rows"
  - "MappingRow readable evidence: file_name populated from FileName, display_path from folder context via episodeImportDisplayPath"

requirements-completed:
  - P19-SC1
  - P19-SC2
  - P19-SC4

duration: 18min
completed: 2026-04-20
---

# Phase 19 Plan 01: Version-Friendly Preview Contract and Readable Mapping Evidence Summary

**EpisodeImportMappingRow now carries file_name and display_path from Jellyfin, and apply plan accepts parallel releases as valid separate version rows instead of structural conflicts.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-04-20T10:47:00Z
- **Completed:** 2026-04-20T11:05:15Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `file_name` and `display_path` fields to `EpisodeImportMappingRow` model (Go + TypeScript) so operators see readable file labels rather than opaque Jellyfin media IDs
- Added `episodeImportDisplayPath` helper that derives a short folder-context label (grandparent/parent segments) from the full Jellyfin path, giving release-group context
- Removed the exclusive episode-claim check from `buildEpisodeImportApplyPlan`: multiple distinct files confirmed for the same canonical episode are now accepted as parallel version rows
- Retained duplicate `media_item_id` check to guard against structural input errors
- Extended test coverage with `TestPreviewEpisodeImport_MappingRowsCarryReadableFileEvidence` and `TestEpisodeImportApply_AllowsParallelReleasesForSameEpisode`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend preview DTOs and tests for readable file evidence** - `483d59f` (feat)
2. **Task 2: Teach repository/apply flow that parallel releases are valid versions** - `6fa7f05` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `backend/internal/models/episode_import.go` - Added `FileName` and `DisplayPath` fields to `EpisodeImportMappingRow`
- `backend/internal/handlers/admin_episode_import.go` - Populate FileName/DisplayPath in `buildEpisodeImportPreview`; added `episodeImportDisplayPath` helper
- `backend/internal/handlers/admin_episode_import_test.go` - Added readable file evidence assertions; new `TestPreviewEpisodeImport_MappingRowsCarryReadableFileEvidence`
- `backend/internal/repository/episode_import_repository.go` - Removed exclusive claim map; added duplicate media_item_id check
- `backend/internal/repository/episode_import_repository_test.go` - Renamed/replaced conflict test with `AllowsParallelReleasesForSameEpisode` and `RejectsDuplicateMediaItemID`
- `frontend/src/types/episodeImport.ts` - Added optional `file_name` and `display_path` to `EpisodeImportMappingRow` interface
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` - Fixed pre-existing missing `anime_title` in preview fixture

## Decisions Made

- `displayPath` is derived as grandparent/parent folder name rather than the full absolute path — keeps the label short and useful for identifying release groups without cluttering the UI with long filesystem paths
- The exclusive episode-claim check was a backend concern but the real distinction (parallel release vs true conflict) belongs in the frontend mapping builder; removing the backend enforcement allows confirmed parallel versions to apply cleanly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing missing `anime_title` in episodeImportMapping.test.ts**
- **Found during:** Task 1 (TypeScript type check)
- **Issue:** `episodeImportMapping.test.ts` built a `EpisodeImportPreviewResult` fixture without `anime_title`, which is a required field — TypeScript error TS2741
- **Fix:** Added `anime_title: 'Test Anime'` to the fixture
- **Files modified:** `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts`
- **Verification:** `npx tsc --noEmit` shows no episodeImport-related errors
- **Committed in:** `483d59f` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 pre-existing bug in test fixture)
**Impact on plan:** Minimal scope — the test fix was required for a clean type check baseline.

## Issues Encountered

None — plan executed as specified. All planned test names from the verify blocks pass.

## Known Stubs

None — all new fields are populated from real Jellyfin media candidate data at preview build time.

## Next Phase Readiness

- Backend contract is ready: `EpisodeImportMappingRow.file_name` and `display_path` are populated by the preview handler
- Apply semantics accept parallel releases without forcing false conflict resolution
- Phase 19 Plan 02 (frontend workbench UI) can now consume `file_name`/`display_path` to render readable mapping rows
- No blockers

## Self-Check: PASSED

- FOUND: backend/internal/models/episode_import.go
- FOUND: backend/internal/handlers/admin_episode_import.go
- FOUND: frontend/src/types/episodeImport.ts
- FOUND: commit 483d59f (Task 1)
- FOUND: commit 6fa7f05 (Task 2)

---
*Phase: 19-episode-import-operator-workbench*
*Completed: 2026-04-20*

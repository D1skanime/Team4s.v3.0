---
phase: 20-release-native-episode-import-schema
plan: 03
subsystem: frontend
tags: [nextjs, typescript, episode-import, release-graph, filler, naruto-scale, workbench]
requires:
  - phase: 20-release-native-episode-import-schema
    provides: plan 02 release-native episode import apply with multilingual titles and filler fields in backend DTOs
provides:
  - Import workbench filler badge display for non-canon episodes
  - Multilingual title resolution (German > English > Japanese > fallback)
  - Editable fansub group and release version fields per mapping row before apply
  - Bulk mapping controls verified to preserve multi-target combined-file coverage
  - 23 frontend tests guarding filler display, title fallback, release field preservation, and Naruto-scale bulk operations
affects: [episode-import, admin-workbench, release-graph, frontend-types]
tech-stack:
  added: []
  patterns:
    - Display helper functions extracted to mapping module for testability (fillerLabel, resolveEpisodeDisplayTitle)
    - Release metadata overrides carried in EpisodeImportMappingRow before apply payload dispatch
    - EpisodeGroup header shows filler badge only for non-canon filler types
key-files:
  created: []
  modified:
    - frontend/src/types/episodeImport.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
key-decisions:
  - "Display helpers (fillerLabel, resolveEpisodeDisplayTitle) are extracted to episodeImportMapping.ts rather than living as local page functions so they can be unit-tested."
  - "fillerLabel returns null for canon episodes so the badge is not rendered; only filler, mixed, recap, and unknown show a badge."
  - "Release metadata overrides (fansub_group_name, release_version) are stored directly on EpisodeImportMappingRow and survive setMappingTargets and markMappingSkipped operations."
  - "markAllSuggestedConfirmed does not modify target_episode_numbers so multi-target rows like 9,10 are preserved exactly."
requirements-completed: [P20-SC4, P20-SC5]
duration: 6min 32sec
completed: 2026-04-21
---

# Phase 20 Plan 03: Workbench UI for Release-Native Mapping Summary

**Import workbench now exposes filler status, multilingual titles, and editable release identity before apply, while bulk controls preserve Naruto-scale multi-target coverage**

## Performance

- **Duration:** 6min 32sec
- **Started:** 2026-04-21T15:41:43Z
- **Completed:** 2026-04-21T15:48:16Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Extended `EpisodeImportCanonicalEpisode` with `titles_by_language`, `filler_type`, `filler_source`, and `filler_note` fields so the backend DTO is mirrored on the frontend.
- Added `fillerLabel` and `resolveEpisodeDisplayTitle` helper functions to `episodeImportMapping.ts` so display logic is testable outside the component.
- Episode group headers now show a filler badge (Filler / Gemischt / Recap / Unbekannt) for non-canon episodes; canon episodes show no badge.
- Title resolution follows German > English > Japanese > title field > existing_title > null so AniSearch multilingual data is used when available.
- Extended `EpisodeImportMappingRow` with `fansub_group_id`, `fansub_group_name`, and `release_version` fields.
- Added compact Gruppe/Version inputs to every mapping row pre-filled from backend detection; operator can override before apply.
- `setReleaseMeta` hook action merges operator overrides without touching mapping status or target episode numbers.
- Verified that `markAllSuggestedConfirmed` preserves `target_episode_numbers` exactly so a `9,10` combined file stays intact.
- Added tests for season-offset correction (`127` → `141`), apply-button enablement conditions, and multi-target row preservation.

## Task Commits

1. **Task 1: Show canonical episode metadata and filler status** - `d8c0077` (`feat`)
2. **Task 2: Add release fields to mapping rows** - `5dc11da` (`feat`)
3. **Task 3: Preserve practical bulk mapping for Naruto-style season splits** - `0d6cb1e` (`feat`)

## Files Created/Modified

- `frontend/src/types/episodeImport.ts` - Adds `titles_by_language`, `filler_type`, `filler_source`, `filler_note` to `EpisodeImportCanonicalEpisode`; adds `fansub_group_id`, `fansub_group_name`, `release_version` to `EpisodeImportMappingRow`.
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` - Exports `fillerLabel` and `resolveEpisodeDisplayTitle` display helpers.
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` - 23 tests covering filler label, title fallback, release field preservation, multi-target bulk confirm, season-offset correction, and apply-button enablement.
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - `EpisodeGroup` carries `fillerType`/`fillerNote`; uses `resolveEpisodeDisplayTitle`; adds `setReleaseMeta` action.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - `EpisodeGroup` header renders filler badge; `MappingRow` adds Gruppe/Version inputs; imports `fillerLabel` from the mapping module.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - Adds `fillerBadge`, filler type modifier classes, and release metadata input styles.

## Naruto-Scale Workbench State

For a Naruto import with ~360 episodes and season-split Jellyfin files:

- Each episode group header shows the canonical AniSearch title from the German/English/Japanese title map when available.
- Known filler episodes (e.g. episodes 26, 97, 101-106) show a yellow "Filler" badge; mixed-canon episodes show "Gemischt".
- The operator can correct a season-indexed suggestion (e.g. `127` → `141`) by typing in the target input.
- A combined file covering episodes `9` and `10` can be mapped using the comma-list input `9,10`; bulk confirm leaves this multi-target intact.
- The fansub group detected from file brackets (e.g. `[Dattebayo]`) is pre-filled in the Gruppe field; the operator can override before apply.
- Bulk "Alle Vorschläge bestätigen" applies all auto-detected suggestions without erasing manually set multi-target or release metadata.

## Decisions Made

- Display helper functions live in `episodeImportMapping.ts` (not in `page.tsx`) so they can be tested independently of the React component tree.
- `fillerLabel` returns `null` for `'canon'` and `null`/`undefined` inputs so the badge conditional in the component is clean.
- Release metadata overrides are stored on the `EpisodeImportMappingRow` object itself so the existing `applyMappings` payload path (`mappings` array) carries them to the backend without a new wire protocol.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- `page.tsx` originally had a local `fillerLabel` function. It was moved to `episodeImportMapping.ts` during Task 1 for testability, and the page imports from the module instead. This is a small structural improvement, not a plan deviation.

## Known Stubs

None. All three new UI surfaces (filler badge, multilingual title, release fields) receive real data from the backend DTOs built in Plan 02. The Gruppe/Version inputs are pre-filled from backend detection and can be overridden.

## User Setup Required

None.

## Next Phase Readiness

Phase 20 Plan 04 (UAT) can verify the full Naruto-scale import flow end-to-end: AniSearch canonical numbering, filler flags visible before apply, multi-episode file coverage, operator group/version correction, and the complete release-native write path established in Plan 02.

## Self-Check: PASSED

- Verified all 6 modified files exist on disk.
- Verified task commits exist: `d8c0077`, `5dc11da`, `0d6cb1e`.
- 23 tests passing in `episodeImportMapping.test.ts`.
- No TypeScript errors in episode import files.

---
*Phase: 20-release-native-episode-import-schema*
*Completed: 2026-04-21*

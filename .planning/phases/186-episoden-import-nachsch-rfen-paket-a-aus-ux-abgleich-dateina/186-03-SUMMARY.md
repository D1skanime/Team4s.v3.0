---
phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina
plan: 03
subsystem: ui
tags: [react, vitest, episode-import, fansub-groups, pure-functions]

# Dependency graph
requires:
  - phase: 186-01
    provides: admin_episode_import.go split (backend D-04 precedent, unrelated subsystem)
provides:
  - "applyGroupFromHere: low-level pure D-01 replacement rule (index + single-value based)"
  - "fansubGroupsValueKey adapter helper reducing a row's fansub-group array to a comparable string key"
  - "rewritten applyFansubGroupFromEpisodeDown adapter using baseline-value semantics instead of blanket overwrite"
  - "sourceKey-based wiring for the 'Ab hier' button through the whole call chain"
  - "episodeImportFansubGroupHelpers.ts sibling file (normalizeFansubGroups/normalizeFansubGroup/getFansubGroupKey/normalizeOptionalText)"
affects: [186-02, 186-04, episode-import-mapper, fansub-group-assignment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-layer pure-function design: low-level index+string-array function tested directly against spec table, high-level adapter mapping real row/array shapes onto it"
    - "Pristine-baseline read pattern: read the pre-edit value from preview.mappings (never mutated) instead of live-edited state, documented inline at the call site"

key-files:
  created:
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportFansubGroupHelpers.ts
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx

key-decisions:
  - "applyGroupFromHere implemented exactly per 186-CONTEXT.md D-01 pseudocode (index + single-string-value), with applyFansubGroupFromEpisodeDown as the adapter reducing each row's fansub_groups array to a deterministic string key via fansubGroupsValueKey"
  - "'Old value' (the origin row's pre-edit baseline) is read from the pristine preview.mappings snapshot, not the live-edited mappings state, documented inline in useEpisodeImportBuilder.ts"
  - "episodeImportMapping.ts crossed 450 lines (485) after the D-01 rewrite; split the normalization/key helpers (normalizeFansubGroups, normalizeFansubGroup, getFansubGroupKey, normalizeOptionalText) verbatim into a new episodeImportFansubGroupHelpers.ts sibling as a pure refactor (D-04)"

requirements-completed: [D-01]

# Metrics
duration: 6min
completed: 2026-10-18
---

# Phase 186 Plan 03: "Ab hier" targeted fansub-group replacement Summary

**Replaced the "Ab hier" blanket fansub-group overwrite with CONTEXT.md D-01's targeted replacement rule (`applyGroupFromHere`), wired through sourceKey-based baseline lookup, with a follow-up file split to stay under the 450-line ceiling.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-18T12:20:38Z (immediately after 186-01 plan completion commit)
- **Completed:** 2026-10-18T12:24:57Z
- **Tasks:** 3
- **Files modified:** 7 (1 created)

## Accomplishments
- `applyGroupFromHere(values, startIndex, oldValue, newValue)` added as a new low-level pure function implementing CONTEXT.md D-01's exact rule, verified against all 4 mandatory test cases including the all-empty-origin Sonderfall
- `applyFansubGroupFromEpisodeDown` rewritten as an adapter over `applyGroupFromHere`, replacing the old suggested-episode-number-threshold blanket overwrite with targeted index+baseline-value matching
- "Ab hier"/"Ab hier entfernen" call chain rewired to pass `sourceKey` instead of `episodeNumber` through `EpisodeImportMappingRowGroupField.tsx` → `EpisodeImportMappingRow.tsx` → `EpisodeImportEpisodeGroup.tsx` → `useEpisodeImportBuilder.ts`
- `useEpisodeImportBuilder.ts` now resolves `startIndex` from `sourceKey` and reads the origin row's pre-edit baseline from the pristine `preview.mappings` (not the live-edited state), with an inline comment documenting this deliberate design choice
- `episodeImportMapping.ts` split (D-04): normalization/key helpers extracted verbatim into a new `episodeImportFansubGroupHelpers.ts` sibling, bringing both files under the 450-line ceiling (430 and 68 lines respectively)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add applyGroupFromHere + fansubGroupsValueKey, rewrite the adapter and its tests** - `e48a7a942` (feat)
2. **Task 2: Rewire the call chain (sourceKey instead of episodeNumber) and run full tests** - `629857e8d` (feat)
3. **Task 3: Line-count check (D-04) and final verification** - `d186f068e` (refactor)

**Plan metadata:** committed alongside this summary.

## Files Created/Modified
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportFansubGroupHelpers.ts` - new sibling file holding `normalizeFansubGroups`, `normalizeFansubGroup`, `getFansubGroupKey`, `normalizeOptionalText` (verbatim extraction from `episodeImportMapping.ts`, D-04)
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` - added `applyGroupFromHere`, `fansubGroupsValueKey`, rewrote `applyFansubGroupFromEpisodeDown`; now imports normalization helpers from the new sibling file
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` - replaced the old blanket-overwrite-fixing test with 4 `applyGroupFromHere` cases (literal CONTEXT.md table values) + 3 `applyFansubGroupFromEpisodeDown` adapter tests
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - `applyFansubGroupFromEpisode` wiring now resolves `startIndex`/baseline from `sourceKey` via `preview.mappings`; interface type updated
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx` - both "Ab hier" button `onClick` handlers and the prop type now pass `sourceKey` instead of `episodeNumber`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - `onApplyFansubGroupFromEpisode` prop type updated (passthrough only, no logic change)
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx` - `onApplyFansubGroupFromEpisode` prop type updated (passthrough only, no logic change)

## Decisions Made
- Two-layer design per the plan's `<interfaces>` section: `applyGroupFromHere` is the exact CONTEXT.md spec (index + single-string-value), `applyFansubGroupFromEpisodeDown` adapts the real `EpisodeImportMappingRow[]`/multi-group-array shape onto it via `fansubGroupsValueKey`
- "Old value" baseline is read from `preview.mappings` (pristine, never mutated by `setMappings`) rather than the live `mappings` state, as specified and documented inline
- File split seam for D-04: moved only the normalization/key primitives (not `applyFansubGroupsToRow`, which stays in the main file since it depends on `serializeEpisodeImportMappingRow`, avoiding a circular import between the two files)

## Deviations from Plan

None - plan executed exactly as written. The Task 3 file-split was anticipated by the plan itself (episodeImportMapping.ts was flagged as "knapp unter dem Limit" in 186-CONTEXT.md D-04, and the plan's Task 3 action explicitly named this exact seam as the natural split boundary).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-01 ("Ab hier" targeted replacement) is fully implemented and verified; no remaining work for this requirement.
- `npm test -- episodeImportMapping` (61 tests), `npm test -- episodes/import` (110 tests across 9 files), and `npm run typecheck` all pass with zero failures/errors.
- A full-suite `npx vitest run` shows 3 pre-existing, environment-dependent failures unrelated to this plan's scope (missing `API_INTERNAL_URL` for a badge-artwork catalog gate, an unrelated `ResponsiveImage` config assertion, and a backend-source anti-drift test requiring an absolute `/backend/...` path only resolvable inside the Docker container) — not caused by and not touched by this plan's changes.
- D-02 (button label/primitive migration) and D-03 (anitogo filename parser) remain open for other plans in Phase 186.

## Self-Check: PASSED

All created files and all task/summary commit hashes verified present (`episodeImportFansubGroupHelpers.ts`, `episodeImportMapping.ts`, this SUMMARY.md, commits `e48a7a942`, `629857e8d`, `d186f068e`, `802071cc9`).

---
*Phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina*
*Completed: 2026-10-18*

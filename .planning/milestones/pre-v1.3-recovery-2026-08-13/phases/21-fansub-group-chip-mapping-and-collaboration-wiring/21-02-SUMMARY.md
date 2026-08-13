---
phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
plan: 02
subsystem: ui
tags: [react, nextjs, episode-import, fansub-groups, chips]
requires:
  - phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
    provides: explicit `fansub_groups` payload support and backend collaboration resolution
provides:
  - chip-based fansub group selection in episode import rows
  - set-aware episode patch helpers for selected fansub chips
  - normalized apply payloads that preserve free-text fansub chips
affects: [21-03, manual-version-editor, episode-import-workbench]
tech-stack:
  added: []
  patterns:
    - compact row-local chip search UI backed by shared import hook state
    - normalized import apply payload builder for selected fansub groups
key-files:
  created:
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
    - frontend/src/types/episodeImport.ts
key-decisions:
  - "Import-row group selection reuses searchable group chips while filtering out collaboration groups from manual selection."
  - "Episode import apply now serializes mapping rows through a dedicated payload builder so free-text and existing-group chips share one normalized path."
patterns-established:
  - "UI Pattern: dense admin row controls can use a row-local chip search component without moving import mapping state out of the shared builder hook."
  - "Patch Pattern: Episode and Ab-hier helpers copy normalized fansub chip arrays rather than singular fallback strings."
requirements-completed: [P21-SC1, P21-SC2, P21-SC4]
duration: 29min
completed: 2026-04-23
---

# Phase 21 Plan 02: Fansub chip import workbench summary

**Episode import rows now use searchable/removable fansub chips, row patch actions copy whole chip sets, and apply preserves typed free-text groups in the backend payload.**

## Performance

- **Duration:** 29 min
- **Started:** 2026-04-23T10:18:00+02:00
- **Completed:** 2026-04-23T10:47:11+02:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Replaced the flat `Gruppe` field with a compact chip selector that searches existing groups, filters out collaboration records, and lets operators add new names inline.
- Updated import-row state helpers and patch helpers so `Episode` and `Ab hier` copy complete selected-chip sets with normalized dedupe instead of one lossy string.
- Normalized the import apply payload through a dedicated builder so new free-text groups survive row edits and reach `applyEpisodeImport`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace the import-row group text field with chip selection plus search** - `f0079ab` (feat)
2. **Task 2: Make patch helpers propagate full selected-group sets** - `1c29815` (test)
3. **Task 3: Send the selected groups in the apply payload without losing free-text entries** - `d832edc` (feat)

## Files Created/Modified
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - row-local chip search, free-text add, and removable selected-group UI.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - imports the extracted mapping row card and keeps the page under the file-size guardrail.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - styling for chips, search results, and dense row controls.
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - selected-group mutations plus apply-payload builder wiring.
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` - normalized selected-group helpers, row patch propagation, and serialization helpers.
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` - regression coverage for multi-group patch propagation and free-text payload persistence.
- `frontend/src/types/episodeImport.ts` - explicit selected-group chip type for mapping rows.

## Decisions Made

- Extracted the row control into `EpisodeImportMappingRow.tsx` so `page.tsx` stays below the project line-count limit while still rendering the chip UI in the route.
- Kept collaboration groups out of the search results because the UI should select member groups only and let the backend resolve the effective collaboration.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Repo-wide frontend `tsc --noEmit` still reports unrelated pre-existing test/type failures outside the episode-import files, so verification used the import-specific Vitest suite plus filtered typecheck output for touched files only.
- PowerShell path globbing treated `[id]` route segments as wildcards during initial reads; subsequent file access used literal paths.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The import workbench now emits the selected-group chip payload shape expected by the backend resolver from Plan 21-01.
- Phase 21-03 can wire the same chip semantics into the manual episode-version editor without inventing a second collaboration-selection model.

## Self-Check

PASSED

---
*Phase: 21-fansub-group-chip-mapping-and-collaboration-wiring*
*Completed: 2026-04-23*

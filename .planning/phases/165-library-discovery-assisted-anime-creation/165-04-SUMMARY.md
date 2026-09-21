---
phase: 165-library-discovery-assisted-anime-creation
plan: 04
subsystem: api
tags: [go, gin, nextjs, react, jellyfin, idor, authorization, ui-primitives]

# Dependency graph
requires: []
provides:
  - "Fail-closed jellyfin_series_id ownership guard in PreviewEpisodeImport, closing a pre-existing IDOR-shaped gap (RESEARCH.md Pitfall 5)"
  - "Shared, independently-tested collectJellyfinFolderOptions helper (models.JellyfinFolderOption) enumerating an anime's connected jellyfin: folders"
  - "EpisodeImportFolderSelector.tsx, a @/components/ui-only folder picker wired into the episode-import screen"
affects: [165-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Guard logic for an oversized handler file split into a dedicated sibling file (admin_episode_import_ownership.go) instead of growing the 450-line-over-budget file inline"
    - "Shared enumeration helper's result type placed in the models package (not handlers) specifically to avoid an import cycle while still being reusable from a future plan (165-07)"
    - "React: derive UI selection state at render time via useMemo instead of syncing local state from props/context via useEffect, avoiding react-hooks/set-state-in-effect lint errors"

key-files:
  created:
    - backend/internal/handlers/jellyfin_source_folder_list.go
    - backend/internal/handlers/jellyfin_source_folder_list_test.go
    - backend/internal/handlers/admin_episode_import_ownership.go
    - backend/internal/handlers/admin_episode_import_ownership_test.go
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.test.tsx
  modified:
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/models/episode_import.go
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/types/episodeImport.ts

key-decisions:
  - "JellyfinFolderOption type placed in models package (not handlers, as the plan's interface text literally specified) because models.EpisodeImportContextResult cannot import a handlers-package type without an import cycle"
  - "EpisodeImportContextResult.JellyfinFolders is only populated (non-nil) when an anime has >1 connected folder; for the ordinary single-folder case it stays nil, which both satisfies D-14's 'no visible new field in the regular case' and keeps the guard fail-closed against any unexpected override attempt on single-folder animes"
  - "Frontend type/field additions went into types/episodeImport.ts (the file the actual runtime code imports) instead of types/admin.ts (named in the plan's file list but containing no EpisodeImportContextResult-equivalent type)"
  - "useEpisodeImportBuilder.ts (not in the plan's file list) was extended with an optional loadPreview(jellyfinSeriesIDOverride) parameter -- without this the folder selector would be visually present but functionally inert"

requirements-completed: [REQ-165-14]

duration: ~50min
completed: 2026-09-21
---

# Phase 165 Plan 04: Jellyfin Folder Ownership Guard + Multi-Folder Selector Summary

**Fail-closed `jellyfin_series_id` ownership guard in `PreviewEpisodeImport` (closing a pre-existing IDOR-shaped gap) plus a `@/components/ui`-only Jellyfin folder selector shown only when an anime has more than one connected folder.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2
- **Files modified:** 11 (6 created, 5 modified)

## Accomplishments

- `PreviewEpisodeImport` now rejects any client-supplied `jellyfin_series_id` that is not one of the target anime's own connected Jellyfin folders, with HTTP 400 and a German error message, strictly before any Jellyfin HTTP call is made -- proven by a zero-request-counter test against a real Postgres fixture and fake Jellyfin server.
- New shared `collectJellyfinFolderOptions` helper enumerates an anime's connected `jellyfin:` folders from its already-loaded `source`/`source_links`, de-duplicating by Jellyfin ID (not raw string) so the ordinary single-folder case -- where `syncAnimeSourceLinks` duplicates the main folder into `source_links` -- never produces a spurious second entry. Independently unit-tested and reusable by 165-07.
- The single-folder regular case (today's default, no `jellyfin_series_id` sent) is proven byte-for-byte unchanged: same HTTP 200, same single Jellyfin fetch.
- A multi-folder anime with a `jellyfin_series_id` that IS one of its connected folders passes the guard and proceeds exactly as before.
- New `EpisodeImportFolderSelector.tsx` renders a `FormField`+`Select` folder picker only when `jellyfin_folders.length > 1`, main folder preselected, raw Jellyfin ID as the fallback label; wired into the existing "Quellen konfigurieren" panel without touching the surrounding native-markup fields (explicitly out of D-13 scope per UI-SPEC Design-Entscheidung 14).

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared folder-list helper + fail-closed ownership guard (backend)** - `8df5dbe7` (feat)
2. **Task 2: Frontend folder selector, wired into the import screen** - `bf49c99c` (feat)

## Files Created/Modified

- `backend/internal/handlers/jellyfin_source_folder_list.go` - `collectJellyfinFolderOptions`, the shared folder-enumeration helper
- `backend/internal/handlers/jellyfin_source_folder_list_test.go` - 2 pure unit tests (multi-folder ordering/exclusion, single-folder de-dup)
- `backend/internal/handlers/admin_episode_import_ownership.go` - `rejectUnownedJellyfinSeriesID`, the fail-closed guard, kept out of the oversized `admin_episode_import.go`
- `backend/internal/handlers/admin_episode_import_ownership_test.go` - 2 pure guard-function tests + 3 full-handler httptest/Postgres-fixture tests
- `backend/internal/handlers/admin_episode_import.go` - two additive edits only: guard call in `PreviewEpisodeImport`, `JellyfinFolders` computation in `loadEpisodeImportContext`
- `backend/internal/models/episode_import.go` - new `JellyfinFolderOption` type, `EpisodeImportContextResult.JellyfinFolders` field
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.tsx` - new folder-picker component
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.test.tsx` - 4 RTL tests
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - wires the selector into the source panel, derives selected folder ID via `useMemo`
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - `loadPreview` accepts an optional folder override
- `frontend/src/types/episodeImport.ts` - `JellyfinFolderOption` type, `EpisodeImportContextResult.jellyfin_folders`

## Decisions Made

- **`JellyfinFolderOption` lives in `models`, not `handlers`.** The plan's `<action>` text said to define the struct in `handlers/jellyfin_source_folder_list.go` and then use it as a field type on `models.EpisodeImportContextResult`. Since `models` cannot import `handlers` (handlers already imports models -- that would be a compile-time import cycle), the struct was placed in `models/episode_import.go` instead, with `handlers.collectJellyfinFolderOptions` returning `[]models.JellyfinFolderOption`. This preserves every behavioral guarantee the plan specified (single source of truth for enumeration, shared by the guard and the future 165-07 folder-management surface) while actually compiling.
- **`JellyfinFolders` gating.** The field is set to `nil` whenever the anime has `<= 1` connected folder, both to satisfy D-14 ("kein sichtbares neues Feld im Regelfall") for `GetEpisodeImportContext`'s JSON response and to keep `PreviewEpisodeImport`'s guard fail-closed: for a single-folder anime, any override attempt (present or not) is rejected because the allow-list is empty, which is strictly safer than the pre-plan behavior (no override concept existed at all before this plan).
- **Frontend type location fixed to `types/episodeImport.ts`.** The plan's file list named `frontend/src/types/admin.ts`, but no `EpisodeImportContextResult`-equivalent type exists there -- the real, imported-everywhere type lives in `types/episodeImport.ts`. Extended that file instead (Rule 1: the plan's stated file would not have affected the code path it claimed to).
- **`useEpisodeImportBuilder.ts` extended (not in the plan's file list).** The plan's own action text says "selecting a folder updates local state that is passed as jellyfin_series_id to the existing `builder.loadPreview()` call" -- but `loadPreview()` took no parameters before this plan. Added an optional `jellyfinSeriesIDOverride` parameter (Rule 2: closing a functionality gap that would otherwise leave the new selector a visual-only stub with no effect on the actual preview request).
- **Selection state uses derived `useMemo`, not `useEffect` + `setState`.** An initial implementation synced default folder selection via `useEffect(() => setSelectedFolderID(...), [builder.context])`, which ESLint's `react-hooks/set-state-in-effect` flagged as an error (cascading-render risk). Refactored to track only an explicit user override in state and derive the effective selection (override, else main folder, else first folder) via `useMemo` at render time -- no effect needed, no lint error, same UX.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `JellyfinFolderOption` moved from `handlers` to `models` package**
- **Found during:** Task 1 (writing `jellyfin_source_folder_list.go`)
- **Issue:** The plan specified defining `JellyfinFolderOption` in package `handlers`, then using `[]JellyfinFolderOption` as a field type on `models.EpisodeImportContextResult`. This does not compile: `models` cannot import `handlers` without creating an import cycle (`handlers` already imports `models`).
- **Fix:** Defined `JellyfinFolderOption` in `models/episode_import.go` instead; `handlers.collectJellyfinFolderOptions` returns `[]models.JellyfinFolderOption`.
- **Files modified:** `backend/internal/models/episode_import.go`, `backend/internal/handlers/jellyfin_source_folder_list.go`, `backend/internal/handlers/admin_episode_import_ownership.go`
- **Verification:** `go build ./...` succeeds; full `internal/handlers` and `internal/models` package compile and test cleanly.
- **Committed in:** `8df5dbe7` (Task 1 commit)

**2. [Rule 1 - Bug] Corrected frontend type-file target**
- **Found during:** Task 2 (reading `frontend/src/types/admin.ts` per the plan's `<read_first>` instruction)
- **Issue:** The plan's file list named `frontend/src/types/admin.ts` for the `EpisodeImportContextResult`-equivalent type extension, but no such type exists there -- the actual type used by `useEpisodeImportBuilder.ts`/`page.tsx` lives in `frontend/src/types/episodeImport.ts`.
- **Fix:** Added `JellyfinFolderOption` and extended `EpisodeImportContextResult` in `types/episodeImport.ts`.
- **Files modified:** `frontend/src/types/episodeImport.ts`
- **Verification:** `npx tsc --noEmit` clean; existing consumers (`useEpisodeImportBuilder.ts`, `page.tsx`) type-check against the new field.
- **Committed in:** `bf49c99c` (Task 2 commit)

**3. [Rule 2 - Missing Critical] Extended `useEpisodeImportBuilder.loadPreview` to accept a folder override**
- **Found during:** Task 2 (wiring the selector into `page.tsx`)
- **Issue:** The plan's action text requires the selected folder to reach `PreviewEpisodeImport` as `jellyfin_series_id`, but `useEpisodeImportBuilder.ts` was not in the plan's file list and `loadPreview()` had no parameter to carry an override -- without this the selector would have no functional effect (a UI stub).
- **Fix:** Added an optional `jellyfinSeriesIDOverride` parameter to `loadPreview`, forwarded to `previewEpisodeImport`'s existing `jellyfin_series_id` request field (already supported server-side and in `frontend/src/lib/api.ts`).
- **Files modified:** `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts`, `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`
- **Verification:** Existing `useEpisodeImportBuilder.test.tsx` tests (calling `loadPreview()` with no args) still pass unchanged; new selector wiring verified via `EpisodeImportFolderSelector.test.tsx` and manual code-path tracing.
- **Committed in:** `bf49c99c` (Task 2 commit)

**4. [Rule 1 - Bug] Fixed `react-hooks/set-state-in-effect` ESLint error in `page.tsx`**
- **Found during:** Task 2 (running the project's ESLint gate on touched files)
- **Issue:** Initial implementation synced default folder selection into local state via `useEffect(() => setSelectedFolderID(...), [builder.context])`, which is a hard ESLint error (`react-hooks/set-state-in-effect`) in this project's config, not just a warning.
- **Fix:** Replaced the effect with derived state: track only an explicit `folderOverride` in `useState`, compute the effective `selectedFolderID` (override if still valid, else main folder, else first folder) via `useMemo` at render time.
- **Files modified:** `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`
- **Verification:** `npx eslint` on touched files reports 0 errors (only pre-existing native-`<input>`/`<textarea>` warnings, out of scope per UI-SPEC Design-Entscheidung 14); `EpisodeImportFolderSelector.test.tsx` and `useEpisodeImportBuilder.test.tsx` still pass.
- **Committed in:** `bf49c99c` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bug fixes, 1 Rule 2 missing-critical-functionality fix, 1 Rule 1 lint-error fix)
**Impact on plan:** All four were necessary for the code to compile, type-check, lint clean, and actually function end-to-end. No scope creep -- all changes stayed within the plan's stated objective (ownership guard + folder selector).

## Issues Encountered

- The Postgres-backed handler tests initially returned HTTP 500 ("interner serverfehler") instead of the expected 400/200, because `evecFixtureHandler` (reused from the existing `admin_content_episode_version_editor_context_test.go` fixture) does not set `h.authzRepo`, and `PreviewEpisodeImport` (unlike `GetEpisodeVersionEditorContext`) goes through `requireAdmin` → `requirePlatformAdminIdentity`, which needs a role checker. Fixed by setting `h.authzRepo = adminRoleCheckerStub{isAdmin: true}` on the fixture handler in the three new full-handler tests, matching the existing pattern in `TestEpisodeImportSourceApplyRevalidatesBeforeWrite`.
- `npx tsc --noEmit` initially reported one error in an unrelated generated `.next/dev/types/app/admin/anime/create/page.ts` file. Confirmed pre-existing/environmental (same class of issue documented in the Phase 164 STATE.md entry -- an orphaned `.next/types` artifact); removing `.next/dev/types` and re-running produced 0 errors.
- Full frontend `npx vitest run` (331 files) showed 2 pre-existing failures in `src/lib/cssCustomProperties.guard.test.ts`, unrelated to any file this plan touched and already documented as pre-existing/flaky in STATE.md's Phase 164 entry.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `collectJellyfinFolderOptions` and `models.JellyfinFolderOption` are ready for 165-07 (D-18 folder management surface) to reuse directly -- same allow-list semantics, same de-duplication behavior.
- The D-14 security gap (unauthenticated cross-anime Jellyfin series preview) is fully closed for every anime, not just multi-folder ones.
- No blockers for subsequent phase-165 plans.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 7 claimed created files verified present on disk; all 3 claimed commit hashes (`8df5dbe7`, `bf49c99c`, plan-metadata commit) verified present in `git log --oneline --all`.

---
phase: 165-library-discovery-assisted-anime-creation
plan: 10
subsystem: ui
tags: [react, nextjs, typescript, vitest, jellyfin, admin]

# Dependency graph
requires:
  - phase: 165-07
    provides: "buildAnimeJellyfinContext.Folders (jellyfin_item_id/is_main list) and the guarded DELETE /admin/anime/:id/jellyfin/folders/:source endpoint"
provides:
  - "AnimeJellyfinFolderList.tsx: renders every connected Jellyfin folder on the anime edit page, main folder informational-only, additional folders removable without a confirmation dialog"
  - "removeAdminAnimeJellyfinFolder(animeID, source) in lib/api.ts (DELETE client)"
  - "AdminAnimeJellyfinContext.folders (typed) wired end-to-end from the 165-07 backend response into the edit-page UI"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AnimeContextFansubManager.tsx's per-row isMutating/mutatingID loading-state shape reused for a new @/components/ui-only component, explicitly without its window.confirm(...) step (Design-Entscheidung 15: folder removal is reversible)"
    - "removeAdminAnimeJellyfinFolder mirrors unignoreAdminJellyfinDiscoveryItem's exact authorizedFetch/withAuthHeader/parseApiErrorPayload/ApiError DELETE shape"

key-files:
  created:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.test.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.test.tsx
  modified:
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "Component keeps its own localFolders state (seeded from and re-synced to the folders prop via useEffect) so a removed row disappears immediately without waiting on the parent's async refreshContext() round-trip; onFolderRemoved still fires so the parent section refetches context for the rest of the page (asset slots, cover, etc.)."
  - "No name/path field exists on JellyfinFolderOption (jellyfin_item_id/is_main only, per 165-07's backend model) -- each row renders the raw jellyfin_item_id, matching UI-SPEC's stated fallback-to-raw-ID behavior (no separate name/path is ever available for this payload)."

requirements-completed: [REQ-165-17, REQ-165-13]

# Metrics
duration: ~15min
completed: 2026-09-21
---

# Phase 165 Plan 10: Anime Edit Page — Verbundene Jellyfin-Ordner Summary

**New `AnimeJellyfinFolderList` component lists every connected Jellyfin folder on the anime edit page (main folder informational, additional folders removable via an immediate no-confirmation-dialog action), closing D-18's frontend half against 165-07's backend endpoint.**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2/2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `AnimeJellyfinFolderList.tsx`: renders the main folder as a `Badge variant="muted"` "Haupt-Ordner" row with no remove action whatsoever (genuinely absent from the DOM, not just disabled), and every additional folder as "Zusatz-Ordner" + a `Button variant="ghost" size="sm"` "Ordner entfernen" that fires immediately on click — no `window.confirm(...)`.
- Removal shows a disabled "Wird entfernt…" loading label during the mutation, calls the new `removeAdminAnimeJellyfinFolder(animeID, source)` client, removes the row from local state on success, and renders a single `role="status"` line: "Ordner entfernt. Der Eintrag erscheint wieder als „offen" in der Bibliothek."
- Component returns `null` (no empty-state noise) when `folders` is empty or undefined.
- `removeAdminAnimeJellyfinFolder` added to `lib/api.ts`, byte-for-byte matching the existing `authorizedFetch`/`withAuthHeader`/`parseApiErrorPayload`/`ApiError` DELETE shape used by `unignoreAdminJellyfinDiscoveryItem`.
- `AdminAnimeJellyfinContext` extended with `folders?: AdminAnimeJellyfinFolderOption[]` (`jellyfin_item_id`/`is_main`), matching 165-07's `models.JellyfinFolderOption` JSON shape exactly.
- `AnimeJellyfinMetadataSection.tsx` renders `AnimeJellyfinFolderList` directly below the pre-existing single-context block (AniSearch-ID/Jellyfin-Serie/Ordnerpfad/Quelle — untouched, proven byte-identical by a new regression test), wired to the section's existing `refreshContext()` so the whole section (asset slots, cover state, etc.) stays in sync after a removal.

## Task Commits

Each task was committed atomically (tests and implementation written together, verified green before each commit — matching 165-06/165-07's documented precedent for greenfield composition):

1. **Task 1: AnimeJellyfinFolderList component + API client function + type extension** - `58aea220` (feat)
2. **Task 2: Wire into AnimeJellyfinMetadataSection** - `11c97d75` (feat)

## Files Created/Modified

- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.tsx` - new folder-list component (Task 1)
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinFolderList.test.tsx` - 4 behavior tests (Task 1)
- `frontend/src/types/admin.ts` - `AdminAnimeJellyfinFolderOption` + `AdminAnimeJellyfinContext.folders`
- `frontend/src/lib/api.ts` - `removeAdminAnimeJellyfinFolder`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx` - single additive render call + import (Task 2)
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.test.tsx` - new (Task 2, see Deviations) regression + integration tests

## Decisions Made

See `key-decisions` in frontmatter: (1) component-local `localFolders` state for instant row removal instead of waiting on the parent's async context refetch, (2) rows always render the raw `jellyfin_item_id` since the backend payload never carries a separate name/path for this list.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created `AnimeJellyfinMetadataSection.test.tsx` from scratch (did not pre-exist)**
- **Found during:** Task 2 (verify step)
- **Issue:** The plan's Task 2 `<verify>` command and acceptance criteria both assume a pre-existing `AnimeJellyfinMetadataSection.test.tsx` ("Pre-existing test cases pass unmodified (full pre-existing suite, not just the new assertion)"). No such file exists on disk — only `AnimeJellyfinMetadataSection.helpers.test.ts` (a different file, testing the helper functions, not the component) existed before this plan.
- **Fix:** Created `AnimeJellyfinMetadataSection.test.tsx` covering (a) the pre-existing single-context block rendering unaffected by this task (AniSearch-ID/Jellyfin-Serie/Ordnerpfad/Quelle, verified via `getAllByDisplayValue`/`getByText` against a mocked `getAdminAnimeJellyfinContext`), and (b) the two new integration behaviors the plan's Task 2 `<behavior>` section specifies (folder list renders below the context block with `context.folders` passed through; folder list absent when `context.folders` is empty).
- **Files modified:** `AnimeJellyfinMetadataSection.test.tsx` (new)
- **Verification:** `npx vitest run src/app/admin/anime/components/AnimeEditPage` — 6 files, 31 tests, all green.
- **Committed in:** `11c97d75` (Task 2)

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking fix — plan referenced a non-existent pre-existing test file as its own verification baseline).
**Impact on plan:** Necessary to make the plan's stated Task 2 verification command and acceptance criteria ("pre-existing cases pass unmodified") actually executable. No scope creep — the new test file only covers this task's own component and the plan's own specified behaviors.

## Issues Encountered

None beyond the deviation above. `@testing-library/jest-dom` is not installed in this repo (confirmed via `package.json`), so both new test files use the existing house style (`.toBeTruthy()`/`.toBeNull()`/`element.disabled`/`textContent` assertions with `fireEvent`), matching `DiscoveryLibraryCard.test.tsx`'s established pattern rather than jest-dom matchers.

## User Setup Required

None — no external service configuration required. The `DELETE /admin/anime/:id/jellyfin/folders/:source` endpoint this plan consumes is already live on the rebuilt `team4sv30-backend` container (165-07's deferred rebuild, completed before this plan started per the operational notes).

## Next Phase Readiness

- The anime edit page now surfaces every connected Jellyfin folder with a working, server-guarded remove action end to end (frontend UI closes D-18; 165-07 already closed the backend half).
- No blockers for other Wave 4/5 plans. This plan's only dependency (165-07) was already complete and live.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

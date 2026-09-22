---
phase: quick-260922-ln7
plan: 01
subsystem: ui
tags: [react, nextjs, vitest, jellyfin, discovery, admin]

# Dependency graph
requires:
  - phase: 165-library-discovery-assisted-anime-creation
    provides: AdminJellyfinDiscoveryItem.path, AdminAnimeJellyfinIntakePreviewResult.folder_name_title_seed, DiscoveryLibraryCard, useCreatePageDiscoveryHandoff
provides:
  - Shared discoveryFolderName.ts helper (stripTrailingYearSuffix, extractFolderNameFromPath, buildDisplayFolderName)
  - DiscoveryLibraryCard title now uses the cleaned folder name with a conditional "Jellyfin: <name>" hint
  - useCreatePageDiscoveryHandoff prefills AniSearch search field from the cleaned folder name instead of the unreliable Jellyfin series name
affects: [admin-anime-create, jellyfin-discovery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared pure-function helper module for folder-name/year-suffix cleanup, reused by both a display component and a handoff hook, to avoid duplicating regex logic"

key-files:
  created:
    - frontend/src/app/admin/anime/create/library/discoveryFolderName.ts
    - frontend/src/app/admin/anime/create/library/discoveryFolderName.test.ts
  modified:
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx
    - frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.ts
    - frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.test.ts
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
    - .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

key-decisions:
  - "Bibliothekskarten-Titel = bereinigter Ordnername (letztes Pfadsegment von item.path, Jahres-Suffix entfernt); bei Abweichung von item.name zusaetzlich klein 'Jellyfin: <Name>' anzeigen"
  - "AniSearch-Prefill beim Discovery-Handoff = bereinigter Ordnername (preview.folder_name_title_seed, jahres-bereinigt) statt jellyfin_series_name, weiterhin ohne automatische Suche"
  - "Jahres-Bereinigung als einzige gemeinsame Hilfsfunktion in discoveryFolderName.ts, kein Backend-Change (item.path/folder_name_title_seed lagen bereits vor)"

patterns-established:
  - "Pure display/prefill helpers extracted into a small dedicated module next to discoveryPageHelpers.ts when the same regex/derivation logic is needed by more than one consumer"

requirements-completed: [GAP-19]

# Metrics
duration: 22min
completed: 2026-09-22
---

# Phase quick-260922-ln7: GAP-19 Bibliothekskarte und AniSearch-Prefill Summary

**Bibliothekskarte und AniSearch-Prefill nutzen jetzt den bereinigten Ordnernamen (aus item.path / folder_name_title_seed) statt des unzuverlaessigen Jellyfin-Serien­namens, mit sichtbarem "Jellyfin: <Name>"-Hinweis bei Abweichung.**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-09-22T15:48:00Z
- **Completed:** 2026-09-22T16:10:00Z
- **Tasks:** 3
- **Files modified:** 10 (2 created, 8 modified)

## Accomplishments
- New shared helper `discoveryFolderName.ts` (`stripTrailingYearSuffix`, `extractFolderNameFromPath`, `buildDisplayFolderName`) with 9 unit tests, reused by both the card and the handoff hook — no duplicated regex logic.
- `DiscoveryLibraryCard` now shows the cleaned folder name as its title and a conditional "Jellyfin: <name>" caption only when the Jellyfin name diverges from the folder name; the "{Jahr} | {Pfad}" meta line stays raw/unchanged.
- `useCreatePageDiscoveryHandoff` now prefills the AniSearch search field from the cleaned `folder_name_title_seed` instead of `jellyfin_series_name`, still without triggering an automatic search.
- GAP-19 documented as `status: resolved` in `165-UAT.md`.
- No backend change needed — `item.path` and `preview.folder_name_title_seed` already existed; GAP-14 free-text search (`buildSortedJellyfinDiscoveryEntries`) re-verified unchanged via `TestJellyfinDiscovery_SearchMatchesTitleOrFolderNameNotFullPath`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Gemeinsame Ordnername-/Jahres-Bereinigungs-Hilfsfunktion** - `2b139d94` (feat)
2. **Task 2: DiscoveryLibraryCard — Ordnername als Titel + Jellyfin-Namenshinweis** - `cfbeb4ef` (feat)
3. **Task 3: AniSearch-Prefill aus Ordnername, Wiring, UAT-Eintrag, Gesamtverifikation** - `6efe17d8` (feat)

_Note: tdd="true" tasks were implemented with tests added alongside the implementation in the same commit, following the plan's `<action>`/`<verify>` structure rather than separate RED/GREEN commits (plan did not specify plan-level `type: tdd` gate enforcement)._

## Files Created/Modified
- `frontend/src/app/admin/anime/create/library/discoveryFolderName.ts` - shared pure helpers: `stripTrailingYearSuffix`, `extractFolderNameFromPath`, `buildDisplayFolderName`
- `frontend/src/app/admin/anime/create/library/discoveryFolderName.test.ts` - 9 unit tests for the three helpers
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx` - title now uses `buildDisplayFolderName(item.path)`; conditional "Jellyfin: <name>" caption
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx` - 3 new tests for the GAP-19 core case, year-suffix-in-title-only, and missing-path fallback
- `frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.ts` - prop renamed to `jellyfinPreviewFolderNameSeed`, strips trailing year suffix before prefill
- `frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.test.ts` - renamed prop across all 5 existing tests, added a new GAP-19 year-stripping test
- `frontend/src/app/admin/anime/create/page.tsx` - wires `jellyfin.preview?.folder_name_title_seed` instead of `jellyfin_series_name`
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` - GAP-01 harness updated to mirror the renamed prop/wiring
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx` - fixture `path` added alongside `name: "Bleach"` overrides (Rule 1 fix, see Deviations)
- `.planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md` - GAP-19 entry appended with `status: resolved`

## Decisions Made
- Bibliothekskarten-Titel = bereinigter Ordnername; Abweichung vom Jellyfin-Namen wird als kleiner Zusatztext angezeigt, nicht versteckt.
- AniSearch-Prefill nutzt denselben bereinigten Ordnernamen wie die Karte, weiterhin nur als Vorbelegung (kein Auto-Search).
- Jahres-Bereinigung lebt in genau einer Datei (`discoveryFolderName.ts`), von Karte und Handoff-Hook importiert — keine doppelte Regex.
- Kein Backend-Change: `item.path` und `preview.folder_name_title_seed` waren bereits vorhanden und ausreichend.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DiscoveryLibraryPanel.test.tsx fixtures broken by the new Jellyfin-name-hint rendering**
- **Found during:** Task 3 (full frontend test suite run)
- **Issue:** `DiscoveryLibraryPanel.test.tsx` used `buildItem({ name: "Bleach" })` (default `path: "D:/Anime/TV/Naruto"`) purely as a unique marker text across 6 tests (pagination, ignore-wiring, stale-response handling). After Task 2's change, the card now derives the title from the folder name ("Naruto", since the path was unchanged) and renders the mismatching Jellyfin name as a separate "Jellyfin: Bleach" caption split across two text nodes — breaking every `screen.getByText("Bleach")` exact-match query in that file (8 failing assertions across 6 tests).
- **Fix:** Added a matching `path: "D:/Anime/TV/Bleach"` override alongside each `name: "Bleach"` fixture override, so the folder name and Jellyfin name agree again and the card renders a single "Bleach" title node exactly as before Task 2 — these tests were never about the Jellyfin-name-hint feature, just using a distinct marker string.
- **Files modified:** frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
- **Verification:** `npx vitest run src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx` — 15/15 tests pass; full `npm test` afterwards shows only the pre-existing, unrelated `cssCustomProperties.guard.test.ts` failure remaining.
- **Committed in:** `6efe17d8` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, Rule 1)
**Impact on plan:** Necessary regression fix directly caused by Task 2's own change; no scope creep, no behavior change to the fixed test file's actual assertions (pagination/ignore/stale-response logic untouched).

## Issues Encountered
- `npm test` inside the frontend container takes ~4 minutes for the full suite (3056 tests); ran in the background twice to avoid the 2-minute default Bash timeout.

### Pre-existing, unrelated test failure (documented, not a regression)
- `src/lib/cssCustomProperties.guard.test.ts` — 2 failing assertions ("finds zero fallback-free dead custom-property references..." and "the known-non-CSS-textual-mentions allow-list stays exactly as small as documented") both trace to `--surface-muted` used without a fallback at `lib/roleCatalog.accessibility.test.ts:268`. That test's own `it(...)` title text explicitly states this is "an undefined token pre-existing and out of this plan's scope - see deferred-items.md" — confirmed unrelated to any file touched by this plan. Not fixed here (out of scope per plan's verification step 3 instructions).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GAP-19 resolved; the admin-visible library title and AniSearch prefill now reflect the reliable Jellyfin folder name rather than Jellyfin's own (sometimes wrong) series recognition.
- `docker restart team4sv30-frontend` executed; container confirmed "Up".
- No blockers for follow-up UAT.

---
*Phase: quick-260922-ln7*
*Completed: 2026-09-22*

## Self-Check: PASSED

All 11 claimed files verified present on disk; all 3 task commit hashes (2b139d94, cfbeb4ef, 6efe17d8) verified present in git log.

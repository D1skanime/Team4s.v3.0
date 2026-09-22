---
phase: 165-library-discovery-assisted-anime-creation
plan: 16
subsystem: ui
tags: [nextjs, react, app-router, useSearchParams, vitest, design-system]

# Dependency graph
requires:
  - phase: 165-library-discovery-assisted-anime-creation
    provides: "useDiscoveryLibraryFilters (D-11 URL round-trip for filter/q/cursor), DiscoveryLibraryPanel (D-24 card-grid list), DiscoveryEntryCard (165-08 Create-page entry point)"
provides:
  - "cursorHistory fully derivable from the URL's new `hist` search param — page number and 'Zurück'-button survive a full remount after 'Zurück zur Bibliothek' (GAP-11)"
  - "Filter-dependent empty-state copy for the Discovery library list, replacing a hardcoded 'Keine offenen Einträge' (GAP-09 frontend remainder)"
  - "DiscoveryEntryCard visually matches its AniSearch/Jellyfin sibling provider cards (default variant, normal-size footer button, full width only below 767px) (GAP-16)"
affects: [165-library-discovery-assisted-anime-creation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "URL-derived history stacks: encode/decode helpers with a strict `raw === null` check (not a falsy check) to distinguish 'param absent' from 'param present but empty string', avoiding collapsing a single-empty-entry history into an empty one"
    - "useSyncExternalStore-backed next/navigation mock for tests where a hook removes its own local React state in favor of URL-derived values, so router.replace() in the mock notifies subscribers exactly like the real reactive App Router context"

key-files:
  created:
    - frontend/src/app/admin/anime/create/DiscoveryEntryCard.test.tsx
  modified:
    - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts
    - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
    - frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx

key-decisions:
  - "hist URL param uses comma-join encoding; decode uses `raw === null` (strict) instead of a falsy check so a present-but-empty hist param (the page-1 return cursor) decodes to [\"\"] rather than being collapsed into []"
  - "DiscoveryLibraryPanel.test.tsx's next/navigation mock was rewritten to a useSyncExternalStore-backed reactive store (Rule 1 fix) because removing the hook's local cursorHistory useState also removed the only mechanism that forced a re-render in the old non-reactive vi.fn() mock — this was necessary to keep 3 pre-existing pager tests passing, matching the real App Router's actual reactive behavior"
  - "GAP-09 empty-state copy: 'alle' filter shows 'Die Bibliothek enthält aktuell keine Einträge' with no action button (no self-referential 'switch to alle'); 'offen' default case kept byte-identical to pre-plan copy"

patterns-established:
  - "Filter-dependent EmptyState copy resolved via a small pure helper function (resolveDiscoveryEmptyFilterCopy) keyed on the active filter value, returning title/description/showAllAction"

requirements-completed: [REQ-165-11, REQ-165-13]

# Metrics
duration: ~25min
completed: 2026-09-22
---

# Phase 165 Plan 16: Discovery Frontend Gap Closures (GAP-11/GAP-09/GAP-16) Summary

**Discovery cursor-history round-trips through a new URL `hist` param, the library empty state now speaks to the active filter, and the "Aus meiner Bibliothek" card matches its AniSearch/Jellyfin siblings instead of rendering a full-width highlighted button.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-22
- **Tasks:** 3/3
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments
- GAP-11: `cursorHistory` in `useDiscoveryLibraryFilters` is now derived from a new `hist` URL search param instead of an isolated `useState`, so "Zurück zur Bibliothek" (which already round-trips the full query string via D-11's `return` link) carries the page-back stack for free — page number and "Zurück"-button now survive a full navigate-away-and-return round trip.
- GAP-09 (frontend remainder): the library's empty state now shows filter-appropriate German copy for all four status filters (`offen`/`bereits_vorhanden`/`ignoriert`/`alle`) instead of a hardcoded "Keine offenen Einträge"; the "Alle Einträge anzeigen" action is hidden when the filter is already `alle`.
- GAP-16: `DiscoveryEntryCard` dropped `variant="elevated"` and moved its button into the `Card` footer slot, eliminating the CSS-grid `justify-items: stretch` full-width bug with zero new CSS — the existing `.cardFooter` flex layout (row on desktop, stretched column below 767px) already produces the correct responsive behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: GAP-11 — cursor/page history reconstructible from the URL** - `a1bb7eb8` (fix)
2. **Task 2: GAP-09 (frontend remainder) — filter-dependent empty state** - `6ee635ae` (feat)
3. **Task 3: GAP-16 — DiscoveryEntryCard matches provider-card styling** - `24a06826` (fix)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts` - `cursorHistory` derived from URL `hist` param via `encodeHistoryParam`/`decodeHistoryParam`; `writeParams` extended with an optional `history` patch
- `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts` - 5 new/rewritten GAP-11 tests covering first-render hydration, forward/back URL sync, and filter/search history-clearing; pre-existing filter/q/cursor/debounce tests remain green
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx` - `resolveDiscoveryEmptyFilterCopy` helper; empty-state title/description/action now depend on `params.filter`
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx` - 3 new GAP-09 empty-state tests (bereits_vorhanden/ignoriert/alle) plus a reactive `useSyncExternalStore`-backed `next/navigation` mock rewrite (Rule 1 fix, see Deviations)
- `frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx` - removed `variant="elevated"`, moved the "Bibliothek durchsuchen" `Button` into the `footer` prop
- `frontend/src/app/admin/anime/create/DiscoveryEntryCard.test.tsx` - new file, 3 tests asserting card/button className parity with reference `Card`/`Button` primitives and footer-slot placement

## Decisions Made
- `decodeHistoryParam` uses a strict `raw === null` check (not `!raw`) so a present-but-empty `hist` param — which represents the one-entry history `[""]` left after paging from page 1 (the "return cursor" for page 1 is the empty string) — round-trips correctly instead of being collapsed into `[]`. This edge case is explicitly documented in the interfaces section of the plan and was implemented per that guidance rather than the initially-drafted naive `!raw` guard.
- GAP-09 empty-state copy for `alle` reads "Die Bibliothek enthält aktuell keine Einträge" (no action) rather than offering a self-referential "switch to alle" button, matching the plan's Test 3 acceptance criterion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Rewrote DiscoveryLibraryPanel.test.tsx's next/navigation mock to be reactive (useSyncExternalStore)**
- **Found during:** Task 1 (GAP-11 hook change) — verification of `DiscoveryLibraryPanel.test.tsx` (not directly listed as a Task 1 file, but is in Task 2's `files_modified`, and the plan's own `<verification>` runs the whole `library` folder together)
- **Issue:** Removing `useDiscoveryLibraryFilters`'s local `cursorHistory` `useState` (per Task 1's design) also removed the only mechanism that forced a re-render in the test file's non-reactive `vi.fn()`-based `next/navigation` mock. Without a genuine React state update piggybacking on `router.replace()`, the mocked `useSearchParams()` never reflected the post-click URL, and the "Weiter"/"Zurück" pager tests (3 tests) hung waiting for a second `listAdminJellyfinDiscovery` call that never fired. This is purely a test-mock artifact — the real Next.js App Router's `useSearchParams()` is reactive via React Context and does not have this problem.
- **Fix:** Replaced the plain `{ current: URLSearchParams }` mock object with a `useSyncExternalStore`-backed reactive store (`subscribe`/`notify`/`set`); `mockReplace` now calls `searchParamsState.set(...)` which notifies subscribers, and the mocked `useSearchParams()` hook itself uses `useSyncExternalStore` to re-render subscribed components on change — matching the real Next.js App Router's reactivity.
- **Files modified:** frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
- **Verification:** All 15 tests in `DiscoveryLibraryPanel.test.tsx` pass (12 pre-existing + 3 new GAP-09 tests), including the 3 pager tests that previously hung.
- **Committed in:** a1bb7eb8 (Task 1 commit, since the fix is a direct consequence of Task 1's hook change and was needed before Task 2's empty-state tests could even be added to the same file)

---

**Total deviations:** 1 auto-fixed (1 bug fix, test infrastructure only — no production code affected beyond the 3 planned tasks)
**Impact on plan:** Necessary to keep pre-existing pager regression tests green after the GAP-11 hook change; no scope creep into production code.

## Issues Encountered
- A stale generated `.next/dev/types/app/admin/anime/create/page.ts` file (gitignored, container-local) caused a spurious `tsc --noEmit` error referencing `buildCreateSuccessMessage` unrelated to any file this plan touched. Removed the stale `.next/dev/types` directory inside the container and re-ran `tsc --noEmit`, which then passed cleanly. Not a code change — no commit needed (generated artifact, not tracked in git).

## Tests Run (verbatim results)

All commands run inside the `team4sv30-frontend` container via `docker compose exec -T team4sv30-frontend sh -c "cd /app && <command>"`.

**Unit tests — full Discovery library + DiscoveryEntryCard suite:**
```
npx vitest run src/app/admin/anime/create/library src/app/admin/anime/create/DiscoveryEntryCard.test.tsx
```
Result: **PASS** — 5 test files, 62 tests, 0 failed
- `DiscoveryLibraryCard.test.tsx` — 14 tests — PASS
- `useDiscoveryLibraryFilters.test.ts` — 11 tests — PASS (includes 5 new GAP-11 tests: first-render hydration from `hist`, `handleCursorChange` appends old cursor, `handleCursorBack` pops last entry, filter/search change clears `hist`, and a rewritten `handleCursorBack pops the URL-persisted cursor history` regression test)
- `DiscoveryLibraryPanel.test.tsx` — 15 tests — PASS (12 pre-existing + 3 new GAP-09 tests: `bereits_vorhanden` copy, `ignoriert` copy, `alle` copy with no self-referential action)
- `discoveryPageHelpers.test.ts` — 19 tests — PASS (unaffected, ran as part of the folder-level command)
- `DiscoveryEntryCard.test.tsx` — 3 tests — PASS (new file: Card className parity, Button className parity, footer-slot placement)

**Typecheck:**
```
npx tsc --noEmit
```
Result: **PASS** (clean, after clearing a stale unrelated `.next/dev/types` cache entry — see Issues Encountered)

**Lint:**
```
npx eslint src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx src/app/admin/anime/create/DiscoveryEntryCard.tsx src/app/admin/anime/create/DiscoveryEntryCard.test.tsx
```
Result: **PASS** (no output, 0 errors/warnings)

**Container restart:** `docker restart team4sv30-frontend` — restarted cleanly, `/admin/anime/create` compiled and served without errors (verified via `docker logs`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GAP-11, GAP-09 (frontend remainder), and GAP-16 are closed. Remaining open items from 165-UAT.md (GAP-05 through GAP-08, GAP-10, GAP-12 through GAP-15) are backend or cross-cutting and are covered by the other plans in this gap-closure round (165-14, 165-15, 165-17..165-19 per 165-CONTEXT.md's plan sequence), not this plan.
- No blockers for subsequent gap-closure plans in this round.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-22*

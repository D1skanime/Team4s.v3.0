---
phase: 165-library-discovery-assisted-anime-creation
plan: 09
subsystem: ui
tags: [nextjs, react, admin-anime, discovery, jellyfin, cursor-pagination, ui-primitives]

# Dependency graph
requires:
  - phase: 165-06
    provides: "GET /admin/jellyfin/discovery (cursor-paginated) + POST/DELETE /admin/jellyfin/discovery/ignore[/:itemID], including D-24 library_context"
  - phase: 165-05
    provides: "DiscoveryReturnLink, buildAssistedCreateRedirectPath"
provides:
  - "listAdminJellyfinDiscovery / ignoreAdminJellyfinDiscoveryItem / unignoreAdminJellyfinDiscoveryItem (lib/api.ts), AdminJellyfinDiscoveryItem/Page/PageResponse types (types/admin.ts)"
  - "discoveryPageHelpers.ts: mapDiscoveryStatusToBadgeVariant/mapDiscoveryStatusToLabel/mapDiscoveryTypeHintToLabel/buildDiscoveryCardMetaLine/buildDiscoveryCreateURL"
  - "useDiscoveryLibraryFilters.ts: URL-synced filter/q/cursor state (D-11) with a client-held cursor-history stack for the D-25 pager"
  - "DiscoveryLibraryCard.tsx: D-24 card component (Card/Badge/Button only), status-priority action set"
  - "/admin/anime/create/library — the live Discovery list page (DiscoveryLibraryPanel + page.tsx)"
affects: [165-10, 165-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Live/stateful next/navigation mock in DiscoveryLibraryPanel.test.tsx: router.replace(url) parses and writes back into a shared searchParamsState so a subsequent hook-driven re-render observes the updated URL — needed because a plain vi.fn() router mock isn't reactive like the real App Router, unlike AdminUsersClient.test.tsx's simpler assertion-only mock which never needed to observe post-navigation state."
    - "Inline style objects (not a CSS module) for DiscoveryLibraryCard/DiscoveryLibraryPanel layout, matching AdminUsersClient.tsx's AdminUserTableRow precedent, to stay within this plan's declared files_modified list while still meeting the UI-SPEC's exact grid/spacing contract."

key-files:
  created:
    - frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts
    - frontend/src/app/admin/anime/create/library/discoveryPageHelpers.test.ts
    - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts
    - frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx
    - frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx
    - frontend/src/app/admin/anime/create/library/page.tsx
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "mapDiscoveryStatusToBadgeVariant/mapDiscoveryStatusToLabel operate on the real backend AdminJellyfinDiscoveryItem.status vocabulary (English: open/existing/partial/ignored, from 165-06's resolveDiscoveryItemStatus), not the German filter-query-param vocabulary (offen/bereits_vorhanden/ignoriert/alle) the plan's Task 1 behavior text used as example input. These are two genuinely different vocabularies that coexist in the same backend response (filter is a request param, status is a response field) — see Deviations."
  - "DiscoveryLibraryCard's Anime-oeffnen/Anime-anlegen buttons are onClick callbacks (onCreate/onOpenExisting), not href-based Button links, per the plan's explicit 'pure prop-callback component, zero internal API calls' instruction (Task 2 action text) and the Interfaces section's own confirmation that DiscoveryLibraryPanel performs the navigation via buildDiscoveryCreateURL/`/admin/anime/{id}/edit`. This keeps DiscoveryLibraryCard fully presentational/testable while still reaching the exact UI-SPEC navigation targets from the Panel."
  - "Status-Caption lines ('Verknuepft ueber Jellyfin-ID'/'Verknuepft ueber Ordnerpfad') were intentionally omitted: AdminJellyfinDiscoveryItem (165-06) has no field distinguishing a source-link match from a folder-path match, and Task 2's own behavior/test list does not require this caption (only the existing-title statusdetail line and the D-15 partial caption are required). Adding it would mean guessing data that isn't in this plan's file scope."
  - "DiscoveryLibraryPanel.test.tsx mocks next/navigation with a stateful searchParamsState object whose router.replace implementation parses and writes back the query string, instead of a static vi.fn() return value, so that clicking Weiter/Zurueck is observable end-to-end through the real useDiscoveryLibraryFilters hook rather than only asserting the router.replace call arguments."

requirements-completed: [REQ-165-03, REQ-165-04, REQ-165-06, REQ-165-07, REQ-165-11, REQ-165-13, REQ-165-16, REQ-165-18]

# Metrics
duration: ~65min
completed: 2026-09-21
---

# Phase 165 Plan 09: Discovery List Page (D-24 Card Layout) Summary

**Live `/admin/anime/create/library` Discovery list — vertical DiscoveryLibraryCard stack (Poster/Titel/Jahr|Pfad/Typ|Bibliothek/Status/Aktionen) with URL-synced filter/search/cursor state, a client-held cursor-history Zurueck/Weiter pager, and immediate D-19 status consistency after Ignorieren/Entignorieren — all built exclusively with `@/components/ui` primitives.**

## Performance

- **Duration:** ~65 min
- **Completed:** 2026-09-21
- **Tasks:** 3/3
- **Files modified:** 11 (9 created, 2 modified)

## Accomplishments
- `lib/api.ts`: `listAdminJellyfinDiscovery` (GET, mirrors `getAdminAnimeJellyfinContext`'s `authorizedFetch`/`ApiError` contract), `ignoreAdminJellyfinDiscoveryItem`/`unignoreAdminJellyfinDiscoveryItem` (POST/DELETE, idempotent per 165-06). `types/admin.ts` gains `AdminJellyfinDiscoveryItem`/`Page`/`PageResponse`, including D-24's `library_context`.
- `discoveryPageHelpers.ts`: status-to-badge-variant/label mapping (corrected to the real backend vocabulary, see Deviations), type-hint label mapping (Serie/Film/OVA/ONA/Special/Unbekannt), `buildDiscoveryCardMetaLine` ("{Typ} | {Bibliothek}", omitting the suffix when `library_context` is empty, D-24), and `buildDiscoveryCreateURL` (the "Anime anlegen" hand-off URL).
- `useDiscoveryLibraryFilters.ts`: URL-synced `filter`/`q`/`cursor` (D-11), 300ms debounce on search, a filter/search change clears any existing `cursor` ("stiller Neustart", Design-Entscheidung 4), `handleCursorChange` writes only `cursor`, and a client-held `cursorHistory` stack backs `handleCursorBack` so "Zurueck" never needs a server backward-cursor (D-25). `params` is `useMemo`-stabilized (proven by a reference-equality test).
- `DiscoveryLibraryCard.tsx`: the D-24 card — 96px/2:3 poster (`<img loading="lazy">` or a placeholder box, the sole D-13-exempt element), Heading title, "{Jahr} | {Pfad}" and "{Typ} | {Bibliothek}" meta lines, status `Badge` (+ existing-title statusdetail / D-15 partial caption), and the status-priority action set (offen/teilweise: Anime anlegen + Ignorieren stacked; bereits vorhanden: Anime oeffnen only; ignoriert: Nicht mehr ignorieren only) — a pure callback-prop component with zero internal API calls, built exclusively with `Card`/`Badge`/`Button`.
- `DiscoveryLibraryPanel.tsx` + `page.tsx`: the live page at `/admin/anime/create/library` — toolbar (`FormField`+`Select` status filter in UI-SPEC order, `FormField`+`Input` debounced search, library-size text, "Bibliothek neu laden" refresh button), a vertical `aria-live="polite"` `DiscoveryLibraryCard` stack (zero `Table`/`TableRow`/`TableHeaderCell`), classic Zurueck/Weiter pager with a "Seite {n}" counter, `LoadingState`/`ErrorState`/`EmptyState` (both the filter-empty and search-empty variants per the Copywriting Contract), D-19 immediate status consistency (Ignorieren/Entignorieren re-runs only the current page's query, not a full snapshot reload), and `DiscoveryReturnLink` surfaced only when an inbound `return` param exists.

## Task Commits

Each task was committed atomically:

1. **Task 1: Contracts — API client function, types, and discoveryPageHelpers** - `d145ca3f` (feat)
2. **Task 2: DiscoveryLibraryCard (D-24 — new card component, @/components/ui only)** - `eee776c4` (feat)
3. **Task 3: DiscoveryLibraryPanel + library/page.tsx (vertical card list, D-24)** - `b04d8640` (feat)

_Note: `tdd="true"` was set on all three tasks; tests were written together with the implementation and verified green before each commit (not as separate RED/GREEN/REFACTOR commits) — all behavior was new/greenfield composition of already-tested Wave-1/Wave-2/Wave-3 building blocks (165-01/165-02/165-05/165-06), with no pre-existing failing-test gate to observe first._

## Files Created/Modified
- `frontend/src/types/admin.ts` - `AdminJellyfinDiscoveryStatus`/`AdminJellyfinDiscoveryItem`/`AdminJellyfinDiscoveryPage`/`AdminJellyfinDiscoveryPageResponse`
- `frontend/src/lib/api.ts` - `listAdminJellyfinDiscovery`/`ignoreAdminJellyfinDiscoveryItem`/`unignoreAdminJellyfinDiscoveryItem`
- `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts` - pure status/type/URL helpers
- `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.test.ts` - 16 tests
- `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.ts` - URL-synced filter/q/cursor hook
- `frontend/src/app/admin/anime/create/library/useDiscoveryLibraryFilters.test.ts` - 6 tests
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.tsx` - D-24 card component
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryCard.test.tsx` - 13 tests
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.tsx` - toolbar/list/pager client component
- `frontend/src/app/admin/anime/create/library/DiscoveryLibraryPanel.test.tsx` - 8 tests
- `frontend/src/app/admin/anime/create/library/page.tsx` - server component (`PlatformAdminGate` + `PageHeader` + `DiscoveryLibraryPanel`)

## Decisions Made
See `key-decisions` in frontmatter: (1) status-mapping corrected to the real backend English vocabulary, (2) card action buttons are callbacks not href-links (Panel owns navigation), (3) status-caption lines omitted (data not present on the DTO, not required by Task 2's own tests), (4) stateful `next/navigation` mock needed for pager tests to be observable end-to-end.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected `mapDiscoveryStatusToBadgeVariant`/`mapDiscoveryStatusToLabel` to the real backend status vocabulary**
- **Found during:** Task 1 (before writing `discoveryPageHelpers.ts`)
- **Issue:** The plan's Task 1 `<behavior>` text illustrates `mapDiscoveryStatusToBadgeVariant` with German example inputs (`"offen"`/`"bereits_vorhanden"`/`"teilweise"`/`"ignoriert"`) — the same vocabulary as the `filter` query parameter. But `AdminJellyfinDiscoveryItem.status` (165-06, `resolveDiscoveryItemStatus`/`jellyfin_discovery_status.go`) actually returns the English `DiscoveryStatus*` constants (`"open"`/`"existing"`/`"partial"`/`"ignored"`) — confirmed by reading both the Go model (`backend/internal/models/jellyfin_discovery.go`) and the status resolver source directly. Implementing the mapping function literally against the German words would have made `DiscoveryLibraryCard`'s Badge always fall back to the default variant/label when wired to a real API response, silently breaking the entire status-display feature (the whole point of this plan).
- **Fix:** `mapDiscoveryStatusToBadgeVariant`/`mapDiscoveryStatusToLabel` (`discoveryPageHelpers.ts`) key off the actual backend vocabulary (`open`/`existing`/`partial`/`ignored`); `discoveryPageHelpers.test.ts` asserts against that vocabulary with an explicit deviation comment. `filter`-query-param handling elsewhere (`useDiscoveryLibraryFilters.ts`, `DiscoveryLibraryPanel.tsx`'s `FILTER_OPTIONS`) is unaffected and correctly still uses the German words, since that vocabulary genuinely is what 165-06's `filter` query parameter expects.
- **Files modified:** `frontend/src/app/admin/anime/create/library/discoveryPageHelpers.ts`, `discoveryPageHelpers.test.ts`
- **Verification:** `discoveryPageHelpers.test.ts` (16 tests) and `DiscoveryLibraryCard.test.tsx`'s badge-variant test (using real `status: "open"|"existing"|"partial"|"ignored"` fixture values) both pass; `DiscoveryLibraryPanel.test.tsx` exercises the same real vocabulary end-to-end via mocked `listAdminJellyfinDiscovery` responses.
- **Committed in:** `d145ca3f` (Task 1)

---

**Total deviations:** 1 auto-fixed (Rule 1 — correctness bug that would have broken the core status display against real API data).
**Impact on plan:** Necessary for the plan's own stated goal (a working Discovery list showing correct status badges) to actually function once wired to 165-06's live endpoint. No scope creep — same function names/signatures the plan specified, only the vocabulary of example test inputs was corrected to match the actual backend contract.

## Issues Encountered
- `@testing-library/user-event` is not an installed dependency in this project (confirmed via `package.json`); used `fireEvent` throughout (matching the project's existing convention in `AdminUsersClient.test.tsx`) instead of the plan's illustrative "user-event clicks" wording — behaviorally equivalent for the click assertions this plan's tests require.
- `DiscoveryLibraryPanel.test.tsx`'s initial `next/navigation` mock (static `vi.fn()` return values, copied from `AdminUsersClient.test.tsx`) made the Weiter/Zurueck pager test fail: clicking "Weiter" calls `router.replace(...)` but a static mock never reflects that change back into `useSearchParams()`, so the component never re-fetched. Fixed by making the mock stateful (`router.replace` parses and writes back into a shared `searchParamsState`), which is observable through the real `useDiscoveryLibraryFilters` hook on the next re-render (triggered by the hook's own `setCursorHistory` state update in the same event handler). Documented as a `key-decisions`/`tech-stack.patterns` entry for future Discovery-adjacent test files.
- A UI-SPEC copy string (`„Suchbegriff prüfen oder Filter auf „Alle" stellen."`) mixes a German opening guillemet (`„`) with a straight ASCII closing quote (`"`) around "Alle", which breaks a JSX double-quoted attribute. Rendered the exact same text (byte-for-byte, all umlauts/quote characters preserved per CLAUDE.md) via a template-literal JSX expression (`` description={`...`} ``) instead of a plain JSX string attribute — no content was altered, only the JS syntax used to embed it.

## User Setup Required

None - no external service configuration required. The `team4sv30-backend` container was not rebuilt in this session (165-06's Discovery endpoints are additive route registrations already committed on `main` but the running container predates them per 165-06's own SUMMARY) — a `docker compose up -d --build team4sv30-backend` is needed before this page's live fetches will succeed against the real backend; not performed here since it's outside this plan's frontend-only `files_modified` scope and no task in this plan required live-server verification (no `checkpoint:human-verify` task present).

## Next Phase Readiness
- `/admin/anime/create/library` is feature-complete per this plan's `must_haves`/`success_criteria`: filter/search/cursor round-trips through the URL (D-11), the Zurueck/Weiter pager is unchanged in logic from the pre-D-24 spec (D-25), Ignorieren/Entignorieren update the visible list immediately (D-19), and "Anime anlegen" fires zero Jellyfin detail requests before navigation (D-07, since `DiscoveryLibraryCard` only ever calls the passed-in callbacks, never its own API calls).
- `partial` status (D-15) remains hard-coded to `false` server-side (165-06); `DiscoveryLibraryCard`/`DiscoveryLibraryPanel` already render the "Teilweise" badge/caption/action set correctly whenever the backend does start returning it — no frontend follow-up needed when 165-11 wires the real partial-detection logic.
- Backend container rebuild (see User Setup Required) should happen before any live UAT walkthrough of this page.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 9 created source files (plus `types/admin.ts`/`lib/api.ts` modifications) confirmed present on
disk; all three task commit hashes (`d145ca3f`, `eee776c4`, `b04d8640`) confirmed present in
`git log --oneline --all`.

---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
plan: 03
subsystem: frontend-admin-ui
tags: [nextjs, react, typescript, admin, i18n, tags, genres, vitest]

# Dependency graph
requires: ["160-02"]
provides:
  - "/admin/tags-genres route (PlatformAdminGate-gated) with TagsGenresAdminClient — list + inline German-name editing for tags and genres (D-04/D-07)"
  - "frontend/src/lib/api.ts: getAdminTagNames/updateAdminTagName/getAdminGenreNames/updateAdminGenreName"
  - "frontend/src/types/admin.ts: AdminTagNameRow/AdminGenreNameRow/AdminTagNamesResponse/AdminGenreNamesResponse/AdminUpsertNameResponse"
  - "Admin overview (/admin) discoverable nav entry to /admin/tags-genres"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useCancellableSlugState (project-standard cancellable-fetch hook) for the list load instead of a raw useEffect+setState fetch-on-mount, to satisfy the project-wide react-hooks/set-state-in-effect ESLint rule"
    - "Per-row local 'drafts' state as the single source of truth for a table cell's displayed value after an isolated per-row PATCH, avoiding any need to splice a PATCH response back into the parent's fetched list"

key-files:
  created:
    - frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx
    - frontend/src/app/admin/tags-genres/TagsGenresAdminClient.test.tsx
    - frontend/src/app/admin/tags-genres/page.tsx
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/page.tsx

key-decisions:
  - "Persist a row's German name on Input onBlur (not a separate save button) — simplest reliable per-row-save trigger per the plan's action guidance"
  - "NameTable owns its own per-row 'drafts' + 'saveErrors' state and does not bubble saved values back into the parent's fetched tags/genres arrays — the drafts map alone is the source of truth for what's displayed after a save, keeping each row's edit/persist cycle fully isolated from every other row and from the parent's list-fetch lifecycle"

patterns-established:
  - "Any future single-value-per-row admin maintenance table with independent per-row PATCH persistence should follow the same shape: useCancellableSlugState for the list fetch, local drafts/saveErrors state keyed by row id inside the table component, onBlur as the save trigger"

requirements-completed: []

# Metrics
duration: ~40min
completed: 2026-09-16
---

# Phase 160 Plan 03: Admin-Frontend für deutsche Tag-/Genre-Namen (Layer 1, Pflegeseite UI) Summary

**New `/admin/tags-genres` page lists every tag and genre with base name, usage count, and an editable German-name field that persists per row on blur via the plan-160-02 backend endpoints — built exclusively from `@/components/ui` primitives, with a Vitest suite proving isolated per-row saves and both empty-string and whitespace-only clears.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-16
- **Tasks:** 3/3 completed
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- `frontend/src/types/admin.ts` gained `AdminTagNameRow`/`AdminGenreNameRow`/`AdminTagNamesResponse`/`AdminGenreNamesResponse`/`AdminUpsertNameResponse`, placed near the existing `TagToken`/`GenreToken` types but kept distinct (those lack `id`/`name_de` and serve other autocomplete surfaces)
- `frontend/src/lib/api.ts` gained `getAdminTagNames`/`updateAdminTagName`/`getAdminGenreNames`/`updateAdminGenreName`, mirroring `getAdminTagTokens`'s fetch/auth/error-handling shape exactly
- New `TagsGenresAdminClient` renders two `Table`s (Tags, Genres) with columns Grundname / Nutzungsanzahl / Deutscher Name; each row's German-name `Input` persists independently on blur via the matching `updateAdmin{Tag,Genre}Name` call
- List load uses the project-standard `useCancellableSlugState` hook (not a raw `useEffect`+`setState`, which the project-wide `react-hooks/set-state-in-effect` ESLint rule blocks — see Deviations)
- `ErrorState` with a real retry action on a failed list load, `EmptyState` for an empty tag or genre list — both proven end-to-end in the test suite (retry re-fetches and renders the recovered list)
- New `/admin/tags-genres/page.tsx` mirrors `admin/groups/page.tsx`'s exact `PlatformAdminGate` wrapper; admin overview (`/admin`) gained a new "Tags und Genres" secondary nav entry alongside the existing `/admin/fansubs`/`/admin/episodes` links
- `grep -n "<input\|<select\|<textarea\|<button"` on `TagsGenresAdminClient.tsx` returns zero matches — exclusively `Table`/`FormField`/`Input`/`Button`/`EmptyState`/`ErrorState`/`LoadingState` from `@/components/ui`
- Frontend container rebuilt via `docker restart team4sv30-frontend`; `/admin/tags-genres` and `/admin` both return HTTP 200 and show identical `HTTPAccessErrorFallback` unauthenticated-gate behavior as the known-working `/admin/groups` route (parity check, not a crash)

## Task Commits

Each task was committed atomically:

1. **Task 1: Frontend contracts — types and API helper functions** - `8791d49f` (feat)
2. **Task 2 (TDD RED): failing test for TagsGenresAdminClient** - `7a627eae` (test)
2. **Task 2 (TDD GREEN): TagsGenresAdminClient implementation** - `ddda3305` (feat)
2. **Task 2 (Rule 3 fix): useCancellableSlugState refactor** - `1946ade2` (fix)
3. **Task 3: Route wrapper and admin overview navigation entry** - `77e39535` (feat)

## Files Created/Modified
- `frontend/src/types/admin.ts` - `AdminTagNameRow`/`AdminGenreNameRow`/`AdminTagNamesResponse`/`AdminGenreNamesResponse`/`AdminUpsertNameResponse`
- `frontend/src/lib/api.ts` - `getAdminTagNames`, `updateAdminTagName`, `getAdminGenreNames`, `updateAdminGenreName`
- `frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx` - list + inline German-name editing client component
- `frontend/src/app/admin/tags-genres/TagsGenresAdminClient.test.tsx` - 6-test Vitest suite (list render, isolated per-row save, empty-string clear, whitespace-only clear, ErrorState retry, EmptyState)
- `frontend/src/app/admin/tags-genres/page.tsx` - `PlatformAdminGate`-wrapped route
- `frontend/src/app/admin/page.tsx` - new "Tags und Genres" secondary nav link

## Decisions Made
- Persist on `onBlur` rather than a separate per-row save `Button` — the plan explicitly calls this out as "the simplest reliable per-row-save trigger," and it keeps the row markup minimal (one `Input` per cell).
- `NameTable`'s local `drafts`/`saveErrors` state (not the parent's fetched `tags`/`genres` arrays) is the single source of truth for what's rendered after a save. This was a deliberate simplification over threading a `name_de` update back up through an `onSaved` callback into the parent's array state — it achieves the same displayed result with less state-synchronization surface and keeps each row's save cycle fully independent of the list's own fetch/reload lifecycle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced setState-in-effect list fetch with `useCancellableSlugState`**
- **Found during:** Task 3 (post-implementation `npx eslint` check requested by the operational mandate before the route/nav task's own verification)
- **Issue:** The plan's Task 2 `<action>` specified a plain `useEffect` calling `getAdminTagNames()`/`getAdminGenreNames()` and calling `setState` directly inside the effect body. This trips the project-wide `react-hooks/set-state-in-effect` ESLint rule (`error` severity, blocking) — the exact pattern documented as remediated project-wide in STATE.md's `260916-ejp` quick task.
- **Fix:** Replaced the raw `useEffect`+`setState` fetch-on-mount with the existing `useCancellableSlugState` hook (`frontend/src/hooks/useCancellableSlugState.ts`), using a `reloadToken`-based `requestKey` so the `ErrorState`'s retry button forces a fresh fetch. Per-row `drafts`/`saveErrors` state (the plan's core per-row-save behavior) is byte-for-byte unchanged by this refactor.
- **Files modified:** `frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx`
- **Verification:** `npx eslint src/app/admin/tags-genres/` clean (0 errors); all 6 Vitest assertions still pass unchanged; `npx tsc --noEmit` clean.
- **Committed in:** `1946ade2`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix is purely internal to how the list is fetched (a project-convention correction) — it does not change any of the plan's `<behavior>` requirements (list rendering, per-row isolated save, empty/whitespace-only clear, ErrorState/EmptyState) and required no test changes. No scope creep.

## Auftraggeber-Mandat: UI-seitige Drei-Fall-Fallback-Abdeckung (Punkt 2)

Per the mandate, the component test suite proves all three cases at the UI layer, mirroring the three-case coverage already proven at the backend in 160-02:

| Case | Test | What it proves |
|---|---|---|
| (a) Setting a real value | `TagsGenresAdminClient — deutschen Namen setzen` | Editing tag id 1's Input to `"Amnesie"` and blurring calls `updateAdminTagName(1, "Amnesie")` exactly once, and `updateAdminGenreName` is never called — proves per-row isolation, not just that the write fires |
| (b) Clearing to empty string | `TagsGenresAdminClient — Leeren auf leeren String (Fall b)` | Tag id 2 starts with a real German name (`"Dämon"`, asserted via the Input's live value before the edit); clearing to `""` and blurring calls `updateAdminTagName(2, "")` |
| (c) Clearing to a whitespace-only string | `TagsGenresAdminClient — Leeren auf Leerzeichen-Wert (Fall c, Auftraggeber-Mandat)` | Genre id 10's Input, cleared to `"   "` (three spaces) and blurred, calls `updateAdminGenreName(10, "   ")` — the UI forwards the raw value verbatim, exactly as 160-02's backend `UpsertTagGermanName`/`UpsertGenreGermanName` expect (server-side `strings.TrimSpace` + empty-check owns the actual clear semantics) |

This proves the UI-side contribution to Punkt 2 (Fallback exakt): an admin can see the current German name (row (b)'s pre-edit assertion), and both clearing mechanisms (empty and whitespace-only) reach the backend correctly, where 160-02's already-proven trim/clear logic and 160-01's `COALESCE`-based public read complete the fallback-to-base-name behavior end to end.

## Operational Verification
- `docker exec team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/tags-genres/"` — 6/6 tests pass
- `docker exec team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` — clean, no errors attributable to any touched file
- `docker exec team4sv30-frontend sh -c "cd /app && npx eslint src/app/admin/tags-genres/ src/app/admin/page.tsx"` — clean
- `grep -n "<input\|<select\|<textarea\|<button" frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx` — no matches
- Full frontend suite (`docker exec team4sv30-frontend sh -c "cd /app && npx vitest run"`): 325/327 files, 2822/2827 tests pass; the only 2 failures are the pre-existing, documented `cssCustomProperties.guard.test.ts` baseline failures (unrelated to this plan, tracked in prior STATE.md entries) — 0 new failures
- `docker restart team4sv30-frontend` completed cleanly (container came back up, `next dev` re-compiled, no crash in logs)
- `curl http://192.168.235.196:3000/admin/tags-genres` and `/admin` both return HTTP 200; both show `HTTPAccessErrorFallback` in the unauthenticated `curl` response, identical to the known-working `/admin/groups` route (parity check confirms the gate renders correctly, not a crash) — a real authenticated browser check is separate, pending human UAT per project convention
- `curl http://192.168.235.196:3000/admin | grep -o "Tags und Genres"` confirms the new nav link text is present in the rendered admin overview page

## Issues Encountered
None beyond the documented Rule 3 fix above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Admins can now set and clear German tag/genre names end-to-end through a real UI (previously only reachable via `curl`/httptest in 160-02).
- This closes Layer 1 (Mehrsprachigkeit)'s maintenance surface (D-04/D-07). Layer 2 (`/suche` filter-only search) and Layer 3 (public tag/genre display) are separately tracked in 160-04 (already executed) and remaining phase-160 plans.
- A live authenticated browser click-through of `/admin/tags-genres` (setting a real German name, confirming it appears on the public anime detail page per 160-01's `COALESCE` resolution) remains open human UAT, consistent with how prior phase-160 plans have deferred live browser verification to a later combined UAT pass.
- No blockers.

## Self-Check: PASSED

Verified on disk: `frontend/src/app/admin/tags-genres/TagsGenresAdminClient.tsx`, `frontend/src/app/admin/tags-genres/TagsGenresAdminClient.test.tsx`, `frontend/src/app/admin/tags-genres/page.tsx`, and the modified `frontend/src/types/admin.ts`, `frontend/src/lib/api.ts`, `frontend/src/app/admin/page.tsx` all exist with the described content. All five task commit hashes (`8791d49f`, `7a627eae`, `ddda3305`, `1946ade2`, `77e39535`) found in `git log`.

---
*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Completed: 2026-09-16*

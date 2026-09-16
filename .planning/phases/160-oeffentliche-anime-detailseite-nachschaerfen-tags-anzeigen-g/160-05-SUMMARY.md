---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
plan: 05
subsystem: frontend
tags: [nextjs, react, vitest, search, ux]

# Dependency graph
requires:
  - phase: 160-04
    provides: "Backend D-08 bypass (`/api/v1/search` accepts tag/genre-only requests without q)"
provides:
  - "useDebouncedSearch's results-fetch length gate is additively bypassed for a truly absent q when tag/genre is set (D-08 frontend mirror)"
  - "SearchResults' empty-state gate mirrors the same bypass — no dead \"Wonach suchst du?\" screen for tag/genre-only URL states"
affects: [160-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive UX-gate bypass mirroring an authoritative backend gate: compute a narrow bypass predicate (empty-after-trim q AND tag/genre set) and OR it into the existing length check, rather than replacing the check"
    - "Decouple two fetches sharing one debounced effect (results vs. suggestions) so a bypass for one does not silently loosen the other"

key-files:
  created: []
  modified:
    - frontend/src/app/suche/useDebouncedSearch.ts
    - frontend/src/app/suche/useDebouncedSearch.test.tsx
    - frontend/src/app/suche/SearchResults.tsx
    - frontend/src/app/suche/SearchResults.test.tsx

key-decisions:
  - "Bypass predicate is narrow, matching the backend's Plan-160-04 reading: only `trimmed.length === 0` (q truly absent) bypasses the gate, not merely below MIN_QUERY_LENGTH — a present-but-1-character q with tag set still blocks (same 'absent, not merely short' semantics as the backend)"
  - "Suggestions fetch gained its OWN explicit `trimmed.length >= MIN_QUERY_LENGTH` guard inside the `fetchSuggestions` block, so the outer gate being bypassed for tag/genre never lets an empty/too-short query reach `/search/suggestions`"
  - "SearchResults.tsx's empty-state gate uses the identical bypass shape (`!filters.tag && !filters.genre`) as the hook, kept intentionally in sync as two independently-gated UX moments rather than a single shared helper (matches the plan's explicit action spec)"

patterns-established:
  - "When decoupling a shared gate for two dependent effects, add the narrower guard to the SPECIFIC effect that must stay strict, rather than trying to encode both effects' conditions into one shared boolean"

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-09-16
---

# Phase 160 Plan 05: Nur-Filter-Suche Frontend-Spiegel (D-08/D-11) Summary

**`useDebouncedSearch` and `SearchResults` now fire and render results for a tag/genre-only, q-less URL state instead of showing the "Wonach suchst du?" empty state — the UX-side mirror of plan 160-04's backend D-08 bypass — while a plain filter-less, query-less visit is completely unaffected and autocomplete suggestions remain strictly gated at MIN_QUERY_LENGTH.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-16
- **Tasks:** 2/2 completed
- **Files modified:** 4 (0 created, 4 modified)

## Accomplishments

- `useDebouncedSearch.ts`: the single early-return length guard in the debounced effect now computes `bypassMinLength = trimmed.length === 0 && Boolean(state.filters.tag || state.filters.genre)` and only aborts/clears when `trimmed.length < MIN_QUERY_LENGTH && !bypassMinLength` — when bypassed, execution falls through into the existing `fetchResults` block unchanged, firing `getSearch` with an empty `q`.
- The `fetchSuggestions` block gained its own explicit `trimmed.length >= MIN_QUERY_LENGTH` condition, so `getSearchSuggestions` is never called with an empty/too-short query even in `role: 'full'` when the outer gate was bypassed for tag/genre — D-08 does not extend to `/search/suggestions`.
- `SearchResults.tsx` now destructures `filters` from the hook and extends its `"Wonach suchst du?"` empty-state gate to `trimmedQuery.length < MIN_QUERY_LENGTH && !filters.tag && !filters.genre` — identical bypass shape to the hook, so the results panel renders its normal loading/results/tabs flow instead of the dead empty-state screen.
- No new UI, no new URL convention, no change to D-11 (active filter remains visible only via the existing pre-filled filter field).

## Task Commits

Each task was committed atomically:

1. **Task 1: Additive tag/genre bypass in useDebouncedSearch, scoped to results only** - `0ccd8aec` (feat)
2. **Task 2: SearchResults empty-state gate mirrors the same bypass** - `b3cdbf26` (feat)

## Files Created/Modified

- `frontend/src/app/suche/useDebouncedSearch.ts` - narrow `bypassMinLength` predicate additively OR'd into the results-fetch length guard; suggestions fetch gained its own independent `trimmed.length >= MIN_QUERY_LENGTH` guard
- `frontend/src/app/suche/useDebouncedSearch.test.tsx` - 5 new tests under a `D-08-Bypass` describe block (see Auftraggeber-Mandat evidence below)
- `frontend/src/app/suche/SearchResults.tsx` - `filters` destructured from the hook; empty-state gate extended with `!filters.tag && !filters.genre`
- `frontend/src/app/suche/SearchResults.test.tsx` - 3 new tests under a `D-08-Bypass` describe block (see Auftraggeber-Mandat evidence below)

## Decisions Made

- Narrow D-08 reading confirmed on the frontend side, matching plan 160-04's backend semantics exactly: only a truly absent `q` (empty after `.trim()`) bypasses the length gate; a present-but-too-short `q` (e.g. `setQuery('a')` with `tag` set) still blocks the results fetch. Verified by a dedicated regression test.
- The hook-level and component-level bypass conditions are two independently-written, intentionally-identical `!filters.tag && !filters.genre`-shaped checks rather than a single shared exported predicate — this matches the plan's explicit `<action>` instruction ("kept in sync intentionally, both files independently gate the same UX moment") rather than introducing a new shared abstraction.
- Suggestions remained untouched in `role: 'input'` (no results fetch in that role at all) and were explicitly re-gated in `role: 'full'` so the bypass never leaks into `/search/suggestions`.

## Auftraggeber-Mandat Punkt 3 (Frontend-Spiegel): Vier explizite Nachweise

1. **Results-role mit nur `tag` gesetzt (kein q) → Fetch feuert, Leerzustand rendert NICHT.**
   `useDebouncedSearch.test.tsx` — `'feuert die Ergebnissuche bei role "results" ohne q, wenn nur tag gesetzt ist'`: asserts `getSearchMock` called once with `q: ''`, `tag: 'Amnesia'`.
   `SearchResults.test.tsx` — `'rendert bei tag-only-URL (ohne q) NICHT den „Wonach suchst du?"-Leerzustand'`: `searchParamsRef.current = new URLSearchParams('tag=Amnesia')`, asserts `screen.queryByText('Wonach suchst du?')` is `null` and the normal Tabs UI renders instead.

2. **Results-role mit nur `genre` gesetzt (kein q) → Fetch feuert, Leerzustand rendert NICHT.**
   `useDebouncedSearch.test.tsx` — `'feuert die Ergebnissuche bei role "results" ohne q, wenn nur genre gesetzt ist'`: asserts `getSearchMock` called once with `q: ''`, `genre: 'Action'`.
   `SearchResults.test.tsx` — `'rendert bei genre-only-URL (ohne q) NICHT den „Wonach suchst du?"-Leerzustand'`: `searchParamsRef.current = new URLSearchParams('genre=Action')`, same assertions as above.

3. **Results-role ohne tag/genre/q → Fetch bleibt weiterhin blockiert, Leerzustand rendert weiterhin (Regressionsschutz gegen Aufblähen).**
   `useDebouncedSearch.test.tsx` — `'feuert bei role "results" ohne q und ohne tag/genre weiterhin KEINEN Request (Regressionsschutz gegen Aufblähen)'`: sets an unrelated `format` filter only, asserts `getSearchMock` NOT called, `result.current.results` stays `null`.
   `SearchResults.test.tsx` — `'rendert ohne q UND ohne tag/genre weiterhin den „Wonach suchst du?"-Leerzustand (Regressionsschutz)'`: `searchParamsRef.current = new URLSearchParams('')`, asserts the empty-state text IS present and `getSearchMock` was NOT called.

4. **Full-role mit tag-only (kein q) → Ergebnis-Fetch feuert, Vorschlags-Fetch feuert NICHT (D-08 gilt nicht für `/search/suggestions`).**
   `useDebouncedSearch.test.tsx` — `'feuert bei role "full" mit tag ohne q die Ergebnissuche, aber NICHT die Vorschläge (D-08 gilt nicht für /search/suggestions)'`: asserts `getSearchMock` called once with `tag: 'Amnesia'` AND `getSearchSuggestionsMock` NOT called.

Bonus regression case (present-but-short q with tag set still blocks, per the narrow D-08 reading): `useDebouncedSearch.test.tsx` — `'blockiert weiterhin bei vorhandenem, aber zu kurzem q trotz gesetztem tag (schmale D-08-Lesart)'`.

## Test Evidence

- `npx vitest run src/app/suche/useDebouncedSearch.test.tsx` — 10/10 passed (5 pre-existing + 5 new).
- `npx vitest run src/app/suche/SearchResults.test.tsx` — 7/7 passed (4 pre-existing + 3 new).
- `npx tsc --noEmit` — clean, no new type errors.
- Full `npx vitest run` (run inside `team4sv30-frontend`, per CLAUDE.md canonical workflow) — 2830/2835 tests passed, 1 test file failed with exactly the same 2 pre-existing, documented `src/lib/cssCustomProperties.guard.test.ts` failures already tracked in `.planning/STATE.md` (unrelated `--surface-muted` fallback-free reference in `lib/roleCatalog.accessibility.test.ts`, out of this plan's scope). 0 new failures introduced by this plan's changes.
- `frontend` container (`team4sv30-frontend`) restarted after the code change per CLAUDE.md canonical workflow; confirmed healthy (`docker ps` shows `Up`) and `GET /suche` returns HTTP 200 against the live Linux host.

## Issues Encountered

None — plan executed without blockers.

## User Setup Required

None — no external service configuration required. All changes are frontend-only additive UX logic against the existing local Docker Compose stack.

## Next Phase Readiness

- Plan 160-06 (tag/genre chip links on the public anime detail page) can now safely link to `/suche?type=anime&tag=<name>` / `.../genre=<name>` without a search term: both the backend (160-04) and the frontend (this plan) will fire the results fetch and render a working results page instead of a dead "type something" screen.
- No blockers for 160-06.

## Self-Check: PASSED

All 4 claimed modified files found on disk; both task commit hashes (`0ccd8aec`, `b3cdbf26`) found in `git log`.

---
*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Completed: 2026-09-16*

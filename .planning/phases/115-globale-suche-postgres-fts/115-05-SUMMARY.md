---
phase: 115-globale-suche-postgres-fts
plan: 05
subsystem: frontend
tags: [search, api-client, hook, debounce, abortcontroller, navigation, appshell]
status: complete
requires:
  - "Plan 115-04 (OpenAPI-Kontrakt /api/v1/search (+ /suggestions) + Envelope {data:SearchResult, meta:PaginationMeta})"
provides:
  - "types/search.ts: SearchParams/SearchResultItem/SearchEntityResult/SearchResult/SearchResponse/SearchSuggestionsResponse (1:1 zum OpenAPI-Kontrakt)"
  - "api.ts: getSearch(params, signal?) + getSearchSuggestions(q, signal?) + buildSearchQuery (oeffentlicher fetch, AbortController-signal, ApiError bei !ok)"
  - "useDebouncedSearch-Hook: 250ms Debounce + AbortController-Abbruch + useSearchParams-Sync (q/type/Filter/page), Reload-fest"
  - "AppShell: aktiver 'Suche'-Nav-Eintrag in anonymer UND eingeloggter Shell-Gruppe (href '/suche', Icon Search)"
affects:
  - "Plan 115-06/07 (Such-UI-Komponenten konsumieren Hook + API-Helfer fertig)"
tech-stack:
  added: []
  patterns:
    - "buildSearchQuery haengt nur gesetzte Params an (URL = Source of Truth, D-08) — exakt nach buildQuery/getAnimeList-Muster"
    - "Oeffentlicher fetch (kein authorizedFetch — Suche ist oeffentlich) mit durchgereichtem AbortSignal + parseApiErrorPayload -> ApiError"
    - "Debounce via useEffect+setTimeout mit Cleanup (clearTimeout): schnelle Zustandswechsel loeschen den vorherigen Timer -> genau ein Request nach 250ms Stille"
    - "AbortController-Refs (searchAbortRef/suggestAbortRef): jeder neue Lauf ruft abort() auf dem vorherigen -> kein veraltetes Ergebnis ueberschreibt ein neueres"
    - "Zustand aus useSearchParams rekonstruiert (readSearchState) + via router.replace(scroll:false) zurueckgespiegelt (buildStateQuery) -> teilbar & reload-fest"
key-files:
  created:
    - frontend/src/types/search.ts
    - frontend/src/app/suche/useDebouncedSearch.ts
    - frontend/src/app/suche/useDebouncedSearch.test.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/components/layout/AppShell.tsx
decisions:
  - "SearchSuggestionsResponse spiegelt den Kontrakt 1:1 (data: SearchResult, gruppiert), nicht eine flache Liste; SearchSuggestion bleibt als Alias auf SearchResultItem fuer die Plan-Namensvorgabe"
  - "Hook-Zustand ist die einzige Quelle: Setter setzen page auf 1 zurueck (ausser setPage) — Filter-/Typ-/Query-Aenderung startet die Ergebnisliste neu"
  - "Debounce-Effekt spiegelt zuerst die URL (router.replace) und feuert dann Suche + Vorschlaege; bei q<2 werden laufende Requests abgebrochen und Ergebnisse geraeumt (kein Request)"
  - "Vorschlagsfehler bleiben still (nicht-fatal); nur die Hauptsuche traegt den Fehlerzustand"
metrics:
  duration: "~20 min"
  completed: 2026-07-29
  tasks: 3
  files: 5
---

# Phase 115 Plan 05: Frontend-Datenschicht + Nav-Aktivierung der globalen Suche Summary

Die Contract-first-Grundlage der Such-UI steht: `types/search.ts` bildet den OpenAPI-Kontrakt
`/api/v1/search` (+ `/suggestions`) 1:1 ab (strukturierter `{ anime, fansub }`-Envelope aus Plan
115-04). `api.ts` erhaelt `getSearch(params, signal?)`, `getSearchSuggestions(q, signal?)` und
`buildSearchQuery` — oeffentlicher `fetch` (kein `authorizedFetch`), durchgereichtes AbortController-
`signal`, `ApiError` bei `!ok`, nur gesetzte Params im Query-String (URL = Source of Truth, D-08). Der
wiederverwendbare `useDebouncedSearch`-Hook kapselt 250 ms Debounce, Request-Abbruch via
`AbortController` (kein veraltetes Ergebnis) und die Spiegelung von q/type/Filter/page in
`useSearchParams` (Reload-fest). Der tote „Suche"-Nav-Eintrag ist in BEIDEN AppShell-Gruppen
(anonym + eingeloggt) aktiviert (href `/suche`, Icon `Search`). Alles lokal gruen: typecheck, lint,
Vitest — kein Docker/Runtime benoetigt.

## Was umgesetzt wurde

### Task 1 — Suchtypen + api.ts-Helfer · Commit 65c922cb
- `frontend/src/types/search.ts`: `SearchParams` (q, type, year_from/to, genre, tag, format, status,
  fansub_group, page, per_page, sort, include_disabled), `SearchResultItem`
  (Diskriminator `type: anime|fansub` + slug/title/subtitle/year/format/status/image_url),
  `SearchEntityResult` (`items` + `total`), `SearchResult` (`{ anime, fansub }`), `SearchResponse`
  (`{ data, meta: PaginationMeta }`), `SearchSuggestionsResponse` (`{ data: SearchResult }`),
  `SearchSuggestion` (Alias auf `SearchResultItem`). Alle Formen exakt nach `openapi.yaml`.
- `frontend/src/lib/api.ts`: `buildSearchQuery` (nur gesetzte Params), `getSearch` und
  `getSearchSuggestions` nach dem `getAnimeList`/`getFansubList`-Muster — `getApiBaseUrl()`,
  oeffentlicher `fetch` mit `signal`, `parseApiErrorPayload` -> `ApiError` mit deutschen Fallback-
  Fehlertexten (korrekte Umlaute). typecheck gruen.

### Task 2 — useDebouncedSearch-Hook + Vitest · Commit 7cef35b6
- `frontend/src/app/suche/useDebouncedSearch.ts` (241 Z.): Debounce (`SEARCH_DEBOUNCE_MS=250`) via
  `useEffect`+`setTimeout`+Cleanup; `AbortController`-Refs fuer Suche und Vorschlaege (jeder neue
  Lauf bricht den vorherigen ab); `readSearchState`/`buildStateQuery`/`stateToSearchParams` als
  reine, testbare Helfer; URL-Sync via `router.replace(..., { scroll: false })`; `MIN_QUERY_LENGTH=2`
  Guard (kein Request bei q<2); Setter (`setQuery`/`setType`/`setFilters`/`setPage`/`reset`) setzen
  page konsistent zurueck.
- `frontend/src/app/suche/useDebouncedSearch.test.tsx`: 5 Tests (Vitest, `@vitest-environment jsdom`,
  fake timers) — Debounce-Zusammenfassung (ein Request nach 250 ms), Abbruch des vorherigen Requests
  (`signals[0].aborted === true`), URL-Sync (`router.replace` mit `q=…&type=…`), Reload-Restore aus
  URL-Parametern, `<2`-Zeichen-Guard (weder Suche noch Vorschlaege). Alle 5 gruen.

### Task 3 — AppShell-Nav-Aktivierung (beide Gruppen) · Commit 464bf432
- `frontend/src/components/layout/AppShell.tsx`: `Search` aus `lucide-react` importiert.
  `AppShellAnonNavGroups`: toten „Suche"-Eintrag aktiviert (`href: '/suche'`,
  `current: isCurrent(...)`, `disabled`+`badge` entfernt, Icon `Search` statt Platzhalter `Compass`).
  `AppShellNavGroups` (publicItems): NEUEN „Suche"-Eintrag mit gleicher Shape ergaenzt. Datei 450
  Zeilen (== 450, <= 450-Limit eingehalten). typecheck + lint gruen; 37 AppShell-Tests gruen.

## Abweichungen vom Plan

Keine Rule-1/2/3-Fixes am Code noetig. Ein Hinweis zur Acceptance-Heuristik von Task 3:

- **`badge: 'bald'`-Grep-Gate (Task 3):** Das Kriterium erwartet `grep -c "badge: 'bald'" == 0`.
  Tatsaechlicher Zaehler = **1** — dieser verbleibende Treffer ist der **Dashboard**-Platzhalter in
  der eingeloggten Gruppe (`{ label: 'Dashboard', disabled: true, badge: 'bald' }`), ein
  vorbestehender, von der Suche unabhaengiger „bald"-Eintrag. Der **tote Suche-Badge** wurde wie
  gefordert entfernt (beide `'/suche'`-Eintraege tragen weder `badge` noch `disabled`). Das
  Dashboard-Element anzufassen waere Scope-Verletzung (unabhaengige Funktionalitaet), daher bewusst
  unveraendert gelassen. Die eigentliche Intention (Suche aktiv, kein toter Badge) ist erfuellt.

## Sicherheit (Threat-Register)

- **T-115-05-01 (DoS / ungedrosselte Requests):** 250 ms Debounce + `AbortController`-Abbruch
  veralteter Requests (`useDebouncedSearch`, Test „bricht den vorherigen Request ab" beweist es).
- **T-115-05-02 (Info Disclosure):** akzeptiert — Client rendert nur gelieferte Items; Sichtbarkeit
  erzwingt der Server (Plan 03/04). Keine clientseitige Filterung von Rohdaten eingefuehrt.
- **T-115-05-03 (XSS ueber Suchbegriff):** kein `dangerouslySetInnerHTML`; q/Ergebnistext fliessen
  nur als React-Textknoten (in diesem Plan nur Datenschicht — Rendering folgt in 06/07).
- **T-115-05-SC (npm-Installs):** keine neuen Pakete; nur vorhandene Deps (Next 16, lucide-react,
  @testing-library/react, vitest).

## Verifikation

- `cd frontend && npm run typecheck` — gruen.
- `cd frontend && npm run lint` — 0 Errors (323 vorbestehende Warnungen, keine in den geaenderten/
  neuen Dateien).
- `cd frontend && npx vitest run src/app/suche/useDebouncedSearch.test.tsx` — 5/5 gruen.
- Regression: `npx vitest run src/components/layout/AppShell.test.tsx` — 37/37 gruen.
- Grep-Gates: `getSearch`=2, `getSearchSuggestions`=1, `signal`=10 (Task 1); `AbortController`=5,
  `useSearchParams|URLSearchParams`=7 (Task 2); `'/suche'`=2, `wc -l AppShell.tsx`=450 (Task 3).
- Docker war down (Umgebungsvorgabe) — keine Runtime-/Browser-Verifikation, nichts fabriziert. Live-
  UAT der Nav-Aktivierung + Datenfluss folgt im gebuendelten Phase-115-Live-Test.

## Known Stubs

Keine. Types, API-Helfer, Hook und Nav sind vollstaendig verdrahtet und lokal getestet. Die Such-UI-
Komponenten (Rendering von Ergebnissen/Vorschlaegen) sind bewusst Gegenstand von Plan 115-06/07 —
dieser Plan liefert ausschliesslich die Datenschicht + Nav-Aktivierung, wie im Objective definiert.

## Self-Check: PASSED
- FOUND: frontend/src/types/search.ts
- FOUND: frontend/src/app/suche/useDebouncedSearch.ts
- FOUND: frontend/src/app/suche/useDebouncedSearch.test.tsx
- FOUND: frontend/src/lib/api.ts (getSearch/getSearchSuggestions/buildSearchQuery)
- FOUND: frontend/src/components/layout/AppShell.tsx (2x '/suche')
- FOUND: .planning/phases/115-globale-suche-postgres-fts/115-05-SUMMARY.md
- FOUND commit: 65c922cb (Task 1)
- FOUND commit: 7cef35b6 (Task 2)
- FOUND commit: 464bf432 (Task 3)

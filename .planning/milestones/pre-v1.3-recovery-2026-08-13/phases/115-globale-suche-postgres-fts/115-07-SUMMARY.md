---
phase: 115-globale-suche-postgres-fts
plan: 07
subsystem: frontend
tags: [search, tabs, url-state, filters, drawer, pagination, ui-primitives, accessibility]
status: complete
requires:
  - "Plan 115-06 (Route /suche Server-Shell + SearchField/SuggestionList + useDebouncedSearch-Nutzung)"
  - "Plan 115-05 (useDebouncedSearch-Hook, api.ts getSearch/getSearchSuggestions, types/search.ts)"
  - "Plan 115-04 (strukturierter Envelope {anime:{items,total}, fansub:{items,total}} → Tab-Trefferzahlen)"
provides:
  - "SearchResults: URL-gebundene Ergebnis-Tabs (Alle/Anime/Fansubgruppen) mit Trefferzahl-Badges via key-Remount + defaultTabId; Ergebniskarten, Pagination, Lade-/Empty-/Fehlerzustände"
  - "SearchFilters (Desktop) + SearchFilterFields/SearchFilterChips: D-06-Filter-Controls (Genre/Tag/Typ-Format/Status/Jahr-von-bis/Fansubgruppe) + entfernbare Filter-Chips"
  - "SearchFilterDrawer: mobiler Filter-Drawer (Footer 'Filter zurücksetzen'/'Filter anwenden')"
  - "useDebouncedSearch: role-Option (input/results/controls/full) gegen Doppel-Fetch + URL-Reconcile beim Rendern (Schwester-Instanzen teilen den Zustand über die URL)"
  - "page.tsx: vollständige Komposition der Ergebnis-/Filterfläche (teilbarer, reload-fester URL-Zustand)"
affects:
  - "Plan 115-08 (Live-UAT: visuelle/mobile Abnahme Drawer, Fokus-Trap, Touch-Targets, kein Layout-Shift, echte Daten)"
tech-stack:
  added: []
  patterns:
    - "Unkontrollierte Tabs-Primitive URL-binden ohne Primitive-Änderung: aktiver Tab aus URL-type → key={type}-Remount + defaultTabId={type}; nur das aktive Panel wird gemountet, dessen Mount-Effekt schreibt bei echtem Wechsel type zurück in die URL (kein onChange, kein natives Markup)"
    - "Mehrere useDebouncedSearch-Instanzen (Eingabe/Ergebnisse/Filter) teilen den Zustand ausschließlich über die URL: role-scoped Fetching (input=nur Vorschläge, results=nur Suche, controls=kein Fetch) verhindert doppelte Requests"
    - "URL = Source of Truth via Render-Reconcile (React-Muster 'adjust state while rendering' mit Query-String-Vergleich) statt setState-in-Effect — kein Cascading-Render-Lint, keine Rückschreib-Schleife"
    - "Freitext-D-06-Filter (Genre/Tag/Typ-Format) über die @/components/ui Input-Primitive (Backend-Param nimmt Strings); enumerierbarer Status über Select mit realen AnimeStatus-Werten; Jahr über YearPicker"
    - "Panel-Mount-Effekt schreibt nur bei tabType !== currentType, damit der initiale Mount des aktiven Tabs den aus der URL wiederhergestellten page-Zustand nicht zurücksetzt"
key-files:
  created:
    - frontend/src/app/suche/SearchResults.tsx
    - frontend/src/app/suche/SearchResults.module.css
    - frontend/src/app/suche/SearchResults.test.tsx
    - frontend/src/app/suche/SearchFilters.tsx
    - frontend/src/app/suche/SearchFilters.module.css
    - frontend/src/app/suche/SearchFilterDrawer.tsx
  modified:
    - frontend/src/app/suche/useDebouncedSearch.ts
    - frontend/src/app/suche/SearchField.tsx
    - frontend/src/app/suche/page.tsx
    - frontend/src/app/suche/page.module.css
decisions:
  - "Tabs-URL-Bindung über Panel-Mount statt onChange: die @/components/ui Tabs-Primitive ist unkontrolliert; der neu gemountete aktive Panel-Effekt spiegelt type in die URL — gewählt gegenüber Primitive-Erweiterung (kein separater Review am geteilten UI-Vertrag) und gegenüber nativem Markup (Mandatory-Primitives)"
  - "useDebouncedSearch bekommt role + URL-Reconcile (Rule 3): nötig, damit SearchField (Vorschläge), SearchResults (Ergebnisse) und SearchFilters (Filter) als getrennte Hook-Instanzen denselben URL-Zustand teilen, ohne zu desyncen oder doppelt zu suchen"
  - "D-06-Filter ohne Options-Endpunkt: Genre/Tag/Typ-Format als Input-Primitive (Backend akzeptiert Strings), Status als Select (reale AnimeStatus-Enum ohne 'disabled'), Fansubgruppe als numerische ID-Input mit Hinweis — honest, kein fabriziertes Options-Set; ein Options-/Gruppen-Picker ist Folge-Increment"
  - "Initial-Empty ('Wonach suchst du?') vs. keine-Treffer-Empty ('Keine Treffer für …') liegen in SearchResults und werden über die Suchbegriff-Länge (≥2) unterschieden; die Server-Shell braucht keinen eigenen Empty-Gate mehr"
metrics:
  duration: "~30 min"
  completed: 2026-07-29
  tasks: 3
  files: 10
---

# Phase 115 Plan 07: Ergebnis- und Filterfläche (Tabs + Filter + Drawer + Pagination) Summary

Die Suche ist jetzt eine vollständige, teilbare Ergebnisseite. `SearchResults` rendert die
URL-gebundenen Ergebnis-Tabs „Alle"/„Anime"/„Fansubgruppen" mit Trefferzahl-`Badge`s: Der aktive
Tab kommt aus dem URL-`type`, wird per `key`-Remount + `defaultTabId` reload-fest wiederhergestellt,
und ein Tab-Wechsel schreibt `type` (über den Mount-Effekt des neu aktiven Panels) zurück in die URL
— ganz ohne Änderung an der geteilten, unkontrollierten `Tabs`-Primitive und ohne natives Markup.
Ergebniskarten (`Card` im Link zur Detailseite), `Pagination` und die Lade-/Empty-/Fehlerzustände
(`LoadingState`/`EmptyState`/`ErrorState`+`getErrorStateCopy`, `aria-live`) ersetzen den
Ergebnisbereich flächengleich (kein Layout-Shift). `SearchFilters` liefert die D-06-Filter
(Genre/Tag/Typ-Format/Status/Jahr-von-bis/Fansubgruppe) über `Input`/`Select`/`YearPicker`/`FormField`
samt entfernbaren `Badge`-Chips (aria-label „Filter {name} entfernen"), der `SearchFilterDrawer`
kapselt dieselben Controls mobil im `Drawer` mit Footer „Filter zurücksetzen"/„Filter anwenden".
`page.tsx` komponiert alles zu einer flächenstabilen Seite. Ausschließlich `@/components/ui`-Primitives,
korrekte Umlaute, jede Datei ≤ 450 Zeilen. Lokal grün: typecheck, lint (0 Errors), Vitest 14/14 im
`suche`-Verzeichnis.

## Was umgesetzt wurde

### Task 1 — SearchResults (URL-gebundene Tabs, Karten, Pagination, Zustände) · Commit 5a175735
- `SearchResults.tsx` (252 Z., Client): `Tabs` mit `TabItem`s `alle`/`anime`/`fansub`, Labels gemäß
  Copy, `badge` = Trefferzahl-`Badge` (nur wenn Backend Zahlen liefert). Aktiver Tab = `type` aus dem
  URL-Zustand; `key={type}` + `defaultTabId={type}` remounten `Tabs` reload-fest. `ResultTabPanel`
  schreibt bei echtem Wechsel (`tabType !== currentType`) `type` via `setType` in die URL — der
  initiale Mount setzt den `page`-Zustand nicht zurück. Ergebniskarten als `Card`-im-`<a>`
  (Titel Body/600, Meta Jahr/Typ bzw. Slug in `--text-soft`), `Pagination` (Seite in URL),
  `LoadingState`/`EmptyState`/`ErrorState`+`getErrorStateCopy` (Retry via Zustands-Nudge), `aria-live`.
- `useDebouncedSearch` erweitert: `role`-Option (`input`/`results`/`controls`/`full`) → rollen-scoped
  Fetching (kein Doppel-Request) + Render-Reconcile gegen die URL (Schwester-Instanzen konvergieren
  über die URL). `SearchField` auf `role: 'input'` (nur Vorschläge).
- `SearchResults.test.tsx` (4 Tests, jsdom): Tab-Badges (Alle/Anime/Fansubgruppen mit 3/2/1 Treffer),
  keine-Treffer-Empty, ErrorState, Tab-Wechsel schreibt `type=anime` in die URL. Alle grün.

### Task 2 — SearchFilters + SearchFilterDrawer (Controls, Chips, mobiler Drawer) · Commit dc4eaea8
- `SearchFilters.tsx` (241 Z., Client): `SearchFilterFields` (präsentational, geteilt) mit Genre/Tag/
  Typ-Format als `Input`, Status als `Select` (reale `AnimeStatus`-Werte ohne `disabled`), Jahr-von/-bis
  als `YearPicker`, Fansubgruppe als numerische ID-`Input`; `SearchFilterChips` (aktive Filter als
  `Badge` mit Accent-Kante + icon-only Ghost-`Button`, aria-label „Filter {name} entfernen");
  `SearchFilters` (Rolle `controls`) mit „Filter zurücksetzen". Alle Werte im URL-Zustand.
- `SearchFilterDrawer.tsx` (79 Z., Client): „Filter"-`Button` (mit aktiver Anzahl) öffnet den `Drawer`
  (`variant="responsiveSheet"`) mit denselben Controls; Footer „Filter zurücksetzen"/„Filter anwenden"
  (Anwenden = schließt, da Werte live wirken); Fokus-Trap/Esc via Primitive.

### Task 3 — page.tsx Verdrahtung · Commit 83b01dc7
- `page.tsx` (50 Z., Server): `PageHeader` + `SearchField` (Anker) + Ergebnis-/Filterfläche:
  `SearchFilters` (Desktop) bzw. `SearchFilterDrawer` (mobil, Media-Query 768px) über `SearchResults`.
  Der server-seitige Initial-Empty-Gate aus Plan 06 entfällt — SearchResults unterscheidet Initial-
  vs. keine-Treffer-Empty über die Suchbegriff-Länge. `force-dynamic` bleibt (client `useSearchParams`).
- `page.module.css`: `.resultsRegion`/`.filterBar`/`.filterDesktop`/`.filterMobile` (responsive,
  flächenstabil), `.resultsSlot` durch die neue Region ersetzt.

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] useDebouncedSearch um role-Scoping + URL-Reconcile erweitert**
- **Gefunden in:** Task 1 (Verdrahtung von SearchResults gegen den geteilten Suchzustand)
- **Problem:** Der Hook (Plan 05) synchronisierte den Zustand nur beim Init aus der URL und feuerte
  in jeder Instanz beide Requests. Damit SearchField (Vorschläge), SearchResults (Ergebnisse) und
  SearchFilters (Filter) — die der Plan je als eigene `useDebouncedSearch`-Nutzer vorsieht — denselben
  URL-Zustand teilen, hätten sich mehrere Instanzen desynchronisiert und die Ergebnissuche doppelt
  gefeuert (T-115-07-03 DoS-Spirit).
- **Fix:** `role`-Option (`input`/`results`/`controls`/`full`, Default `full` = altes Verhalten) für
  rollen-scoped Fetching + Render-Reconcile gegen die URL (React-Muster „adjust state while
  rendering", Query-String-Vergleich als Schleifen-/Clobber-Schutz). `SearchField` auf `role: 'input'`.
- **Dateien:** frontend/src/app/suche/useDebouncedSearch.ts, frontend/src/app/suche/SearchField.tsx
- **Commit:** 5a175735
- **Absicherung:** Bestehende Tests unverändert grün (useDebouncedSearch 5/5 mit Default-Rolle,
  SearchField 5/5) — die Änderung ist rückwärtskompatibel.

**2. [Rule 1 - Bug] Synchroner setState im Sync-Effekt (ESLint-Error „cascading renders")**
- **Gefunden in:** Task 1 (erster Sync-Ansatz per useEffect)
- **Problem:** Der ursprüngliche URL-Sync als `useEffect` mit synchronem `setState` verletzte die
  ESLint-Regel (1 Error) und hätte Cascading-Renders auslösen können.
- **Fix:** Ersetzt durch das offizielle React-Muster „State beim Rendern abgleichen" (kein Effekt,
  konditionaler `setState` mit Query-String-Guard) — Lint wieder 0 Errors.
- **Dateien:** frontend/src/app/suche/useDebouncedSearch.ts
- **Commit:** 5a175735

Sonst keine Rule-2/4-Eingriffe.

## Sicherheit (Threat-Register)

- **T-115-07-01 (XSS über q/Filter/Ergebnistext):** mitigiert — ausschließlich React-Textknoten
  (auto-escaped); kein `dangerouslySetInnerHTML`; Filterwerte fließen nur als Query-Params in die URL,
  nie als HTML. Grep: `dangerouslySetInnerHTML` in den neuen Dateien = 0.
- **T-115-07-02 (Info Disclosure / disabled-Anime):** akzeptiert — Sichtbarkeit serverseitig (Plan
  03/04); der Client rendert nur gelieferte Items. dissolved-Fansubgruppen erscheinen (D-11).
- **T-115-07-03 (DoS / Request-Flut):** mitigiert — Debounce (250 ms) + AbortController aus dem Hook;
  role-scoped Fetching verhindert doppelte Ergebnis-Requests trotz mehrerer Hook-Instanzen; Pagination
  begrenzt die Ergebnismenge.
- **T-115-07-SC (npm-Installs):** keine neuen Pakete; nur vorhandene Deps.

## Verifikation

- `cd frontend && npm run typecheck` — grün.
- `cd frontend && npm run lint` — 0 Errors (323 vorbestehende Warnungen, keine in den neuen Dateien).
- `cd frontend && npx vitest run src/app/suche/` — 14/14 grün (SearchResults 4, SearchField 5,
  useDebouncedSearch 5).
- Grep-/Zeilen-Gates: SearchResults `key=`=3, `defaultTabId`=4, `getErrorStateCopy`=2,
  native `<input|<button|<select>`=0, 252 Z.; SearchFilters „Filter … entfernen"=2, native=0, 241 Z.;
  SearchFilterDrawer `Drawer`=8, native=0, 79 Z.; page.tsx `SearchResults`=4, `SearchFilter`=5,
  native=0, 50 Z. — alle Dateien ≤ 450.
- Docker war down (Umgebungsvorgabe) — keine Runtime-/Browser-Verifikation, nichts fabriziert. Die
  visuelle/mobile Abnahme (Drawer, Fokus-Trap, Touch-Targets, kein Layout-Shift mit echten Daten,
  Reload-Wiederherstellung des aktiven Tabs) ist im gebündelten Phase-115-Live-UAT (Plan 115-08).

## Known Stubs

Keine im Sinne toter Daten. Die D-06-Filter Genre/Tag/Typ-Format/Fansubgruppe nutzen bewusst
Freitext-/ID-Eingaben (kein Options-Endpunkt in dieser Phase), schreiben aber echte, funktionale
Query-Params in die URL und filtern real gegen das Backend. Ein komfortablerer Options-/Gruppen-Picker
(enumerierte Genres/Tags, Fansubgruppen-Auswahl statt ID) ist ein bewusst dokumentiertes
Folge-Increment, kein toter Platzhalter. Trefferzahl-Badges werden nur gezeigt, wenn das Backend
Zahlen liefert (D-06).

## Self-Check: PASSED
- FOUND: frontend/src/app/suche/SearchResults.tsx (+ .module.css, + .test.tsx)
- FOUND: frontend/src/app/suche/SearchFilters.tsx (+ .module.css)
- FOUND: frontend/src/app/suche/SearchFilterDrawer.tsx
- FOUND (modifiziert): useDebouncedSearch.ts, SearchField.tsx, page.tsx, page.module.css
- FOUND: .planning/phases/115-globale-suche-postgres-fts/115-07-SUMMARY.md
- FOUND commit: 5a175735 (Task 1 SearchResults + Hook-role/reconcile)
- FOUND commit: dc4eaea8 (Task 2 SearchFilters + SearchFilterDrawer)
- FOUND commit: 83b01dc7 (Task 3 page.tsx Verdrahtung)

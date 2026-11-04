---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 05
subsystem: ui
tags: [nextjs, react, ssr, server-components, vitest]

# Dependency graph
requires:
  - phase: 192-02
    provides: "AnimeDetailHero besitzt Card(publicHero)+SplitLayout+edgeNavigation-Slot vollstaendig selbst; edgeNavigationOverlay-Positionierung lebt im Baustein"
  - phase: 192-04
    provides: "Seiten-Guard verbietet grid-template dauerhaft; Seiten-vs-Bausteine-Dokumentation"
provides:
  - "resolveAnimeNeighbors() in lib/animeGridContext.ts -- einzige, server- und clientseitig geteilte Nachbarn-Ermittlung fuer die Anime-Randnavigation"
  - "page.tsx loest previous/next serverseitig auf und reicht fertige AdjacentNavigationItem-Objekte an AnimeDetailView/AnimeEdgeNavigation durch"
  - "AnimeEdgeNavigation rendert die Randnavigations-Links sofort aus Props (im Server-HTML vorhanden, vor jeder Client-Hydration); der eigene getAnimeList-Aufruf bleibt ausschliesslich fuer die Hover-Vorschaukarte"
affects: [192-06, 192-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Serversichere, reine Funktion (kein 'use client') als einzige Quelle eines Index-/Seitenrand-Algorithmus, der zuvor nur client-seitig existierte -- Server-Call-Site (page.tsx, kein AbortSignal) und Client-Call-Site (AnimeEdgeNavigation.tsx, mit AbortSignal) rufen dieselbe Funktion auf statt sie zu duplizieren"
    - "Serverseitig vorberechnete Navigations-Props (href/label/ariaLabel) werden client-seitig per Object-Spread nur noch um Hover-/Fokus-Handler ergaenzt, nie um die Navigationsdaten selbst neu berechnet"

key-files:
  created: []
  modified:
    - frontend/src/lib/animeGridContext.ts
    - frontend/src/lib/animeGridContext.test.ts
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/app/anime/[id]/AnimeDetailView.tsx
    - frontend/src/app/anime/[id]/AnimeDetailView.test.tsx
    - frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.test.tsx
    - frontend/src/components/anime/AnimeEdgeNavigation.stories.tsx

key-decisions:
  - "AnimeDetailView.stories.tsx und AnimeEdgeNavigation.stories.tsx wurden zusaetzlich geaendert, obwohl nicht in PLAN.md's files_modified gelistet -- previous/next sind jetzt Pflicht-Props beider Komponenten (CLAUDE.md 'Stories ziehen mit'), ohne Anpassung haetten beide Story-Dateien nicht mehr kompiliert. Die neuen Story-Werte nutzen dieselbe animeNavigationFixture (Anime 12/13/14), die der zentrale MSW-Listenhandler bereits fuer die Vorschaukarte beantwortet -- kein neuer Fixture-Datensatz noetig."
  - "AnimeDetailView.test.tsx wurde ergaenzend angepasst (previous/next als null uebergeben) -- derselbe Pflicht-Prop-Grund wie bei den Stories, nicht im PLAN.md files_modified gelistet."
  - "Der fruehere 'if (!gridParams) return null'-Fruehausstieg in AnimeEdgeNavigation.tsx wurde entfernt (PLAN.md-Vorgabe): die Randnavigations-Links rendern jetzt unabhaengig vom Ergebnis des client-seitigen Vorschau-Parsing, ausschliesslich gesteuert durch die previous/next-Props. AdjacentNavigation selbst gibt bereits null zurueck, wenn beide Richtungen fehlen -- kein Verhaltensunterschied fuer den Fall ohne Grid-Kontext."
  - "Zwei 'Befund 19'-Codekommentare in den neu/veraenderten *.stories.tsx-Dateien wurden umformuliert, um processHistory.regression.test.ts's Verbot von Auftrags-/Planungs-Verweisen in Story-Dateien einzuhalten (projektweiter Guard, nicht phasenspezifisch). Die bereits bestehenden 'Befund 21/22'-Verweise in AnimeDetailView.tsx/page.test.tsx (ausserhalb von components/ui und keine .stories.tsx) bleiben unangetastet -- dieser Guard deckt nur components/ui-Dateien und *.stories.tsx projektweit ab, nicht beliebige Produktionsdateien."

patterns-established: []

requirements-completed: [Befund-19]

# Metrics
duration: ~20min
completed: 2026-11-04T11:10:00Z
---

# Phase 192 Plan 05: SSR-Randnavigation Summary

**`resolveAnimeNeighbors()` ersetzt den bisherigen rein client-seitigen Nachbarn-Algorithmus durch eine einzige, server- und clientseitig geteilte Funktion -- die Zurück/Weiter-Links der Anime-Detailseite stehen dadurch bereits im Server-HTML, bevor React hydriert, während die Hover-Vorschaukarte unverändert client-seitig bleibt.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-11-04T11:10:00Z
- **Tasks:** 2 completed
- **Files modified:** 10 (8 im Plan vorgesehen + 2 "Stories ziehen mit"-Ergänzungen)

## Accomplishments
- `resolveAnimeNeighbors(gridParams, currentAnimeID, options)` in `lib/animeGridContext.ts` ist die einzige Implementierung des Index-/Seitenrand-Algorithmus (Mittelposition, beide Seitenrand-Fälle mit Zusatz-Fetch, beide absoluten Ränder ohne Zusatz-Fetch, nicht gefundene ID, AbortSignal-Durchreichung) -- 10 neue Testfälle in `animeGridContext.test.ts`
- `page.tsx`s `AnimeDetailContent` löst `previous`/`next` serverseitig über `Promise.allSettled` auf (gleiches Fail-open-Muster wie die übrigen SSR-Datenabrufe dieser Seite) und reicht fertige `AdjacentNavigationItem`-Objekte (href/label/ariaLabel) an `AnimeDetailView` durch
- `AnimeEdgeNavigation` rendert die Zurück/Weiter-Links sofort aus den `previous`/`next`-Props -- kein `waitFor()`/Hydration mehr nötig, um die hrefs zu lesen; der eigene `resolveAnimeNeighbors()`-Aufruf (weiterhin mit `AbortController`) bleibt ausschließlich für die Hover-Vorschaukarte (Bild/Titel/Typ) bestehen
- Drei neue SSR-Tests in `page.test.tsx` beweisen die HREFs direkt auf dem noch nicht materialisierten `AnimeEdgeNavigation`-Element (kein Mock-Fetch, kein `act()`, kein jsdom-Render) -- inklusive des Fail-open-Falls (fehlschlagender `getAnimeList`-Aufruf blendet nur den betroffenen Button aus) und des Falls ohne Grid-Kontext
- `AnimeEdgeNavigation.test.tsx` auf Props-getriebene Links umgestellt (keine `waitFor()`-Href-Assertions mehr); die Hover-Vorschaukarten- und Abort-Tests bleiben inhaltlich unverändert
- `AnimeDetailView.stories.tsx`/`AnimeEdgeNavigation.stories.tsx` liefern die neuen Pflicht-Props `previous`/`next` passend zur bestehenden MSW-Fixture nach (`animeNavigationFixture`, Anime 12/13/14)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract resolveAnimeNeighbors() into lib/animeGridContext.ts** - `9b3b58bed` (feat)
2. **Task 2: Wire SSR neighbor resolution through page.tsx/AnimeDetailView.tsx; narrow AnimeEdgeNavigation to props-driven hrefs; add the SSR tree-walk test** - `17c2efa85` (feat)

**Plan metadata:** (siehe `docs(192-05)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/lib/animeGridContext.ts` - `resolveAnimeNeighbors()` + `AnimeNeighbors`/`AnimeNeighborTarget`-Typen, einzige Quelle des Index-/Seitenrand-Algorithmus
- `frontend/src/lib/animeGridContext.test.ts` - 10 neue Testfälle (Mittelposition, beide Seitenrand-Fälle, beide absoluten Ränder, nicht gefundene ID, AbortSignal)
- `frontend/src/app/anime/[id]/page.tsx` - löst `previous`/`next` via `resolveAnimeNeighbors()` auf (Fail-open), `buildAdjacentNavItem()`-Helfer
- `frontend/src/app/anime/[id]/page.test.tsx` - neue `describe`-Gruppe mit 3 SSR-Tests (HREFs vorhanden, kein Grid-Kontext, Fail-open bei Fehlschlag)
- `frontend/src/app/anime/[id]/AnimeDetailView.tsx` - `previous`/`next` als Pflicht-Props, an `AnimeEdgeNavigation` durchgereicht
- `frontend/src/app/anime/[id]/AnimeDetailView.test.tsx` - übergibt `previous: null, next: null` (Pflicht-Prop-Ergänzung)
- `frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx` - `previous: null, next: null` im Meta-Default, echte Werte in `MitRandnavigation`
- `frontend/src/components/anime/AnimeEdgeNavigation.tsx` - `previous`/`next`-Props, `withPreviewHandlers()` ergänzt nur noch Hover-/Fokus-Handler, `loadNeighbors()` ruft die geteilte `resolveAnimeNeighbors()` auf
- `frontend/src/components/anime/AnimeEdgeNavigation.test.tsx` - Props-getriebene Link-Tests statt `waitFor()`-Href-Assertions
- `frontend/src/components/anime/AnimeEdgeNavigation.stories.tsx` - `previous`/`next`-Args passend zur MSW-Fixture

## Decisions Made
Siehe `key-decisions` im Frontmatter (Stories-Ergänzung für die beiden neuen Pflicht-Props, AnimeDetailView.test.tsx-Ergänzung, Entfernung des `gridParams`-Fruehausstiegs, Umformulierung der "Befund 19"-Kommentare in Story-Dateien wegen `processHistory.regression.test.ts`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / Stories ziehen mit] `AnimeDetailView.stories.tsx`, `AnimeEdgeNavigation.stories.tsx`, `AnimeDetailView.test.tsx` ergänzend geändert, obwohl nicht in PLAN.md's `files_modified` gelistet**
- **Found during:** Task 2 (nach Hinzufügen der Pflicht-Props `previous`/`next`)
- **Issue:** Die PLAN.md-Frontmatter nennt diese drei Dateien nicht, aber `previous`/`next` wurden als Pflicht-Props (nicht optional) auf `AnimeDetailView`/`AnimeEdgeNavigation` eingeführt. Ohne Anpassung hätten beide Stories und `AnimeDetailView.test.tsx` nicht mehr kompiliert (`npx tsc --noEmit` schlug mit "missing properties: previous, next" fehl) -- ein direkter Compile-Blocker, und CLAUDE.md's "Stories ziehen mit"-Pflicht verlangt ohnehin, dass eine sichtbare Prop-Änderung im selben Auftrag in die zugehörige Story wandert.
- **Fix:** `AnimeDetailView.stories.tsx`s Meta-Default setzt `previous: null, next: null` (kein Grid-Kontext im Normalfall); die Story `MitRandnavigation` liefert echte Werte passend zur bereits bestehenden `animeNavigationFixture` (Anime 12/13/14) über den MSW-Listenhandler. `AnimeEdgeNavigation.stories.tsx`s Meta-Args liefern dieselben Werte. `AnimeDetailView.test.tsx` übergibt `previous: null, next: null`.
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx`, `frontend/src/app/anime/[id]/AnimeDetailView.test.tsx`, `frontend/src/components/anime/AnimeEdgeNavigation.stories.tsx`
- **Verification:** `npx tsc --noEmit` clean (nur vorbestehende `.storybook/mocks/handlers.ts`-Fehler), `npx vitest run` der betroffenen Testdateien grün, `npx eslint` clean
- **Committed in:** `17c2efa85` (Task 2)

**2. [Rule 1 - Bug] Zwei "Befund 19"-Kommentare in neuen Story-Kommentaren umformuliert**
- **Found during:** Task 2, Verifikation
- **Issue:** `processHistory.regression.test.ts` (projektweiter Guard gegen Auftrags-/Planungs-Verweise in `*.stories.tsx`-Dateien) schlug auf zwei neu hinzugefügte "Befund 19"-Erklärkommentare in `AnimeEdgeNavigation.stories.tsx`/`AnimeDetailView.stories.tsx` fehl.
- **Fix:** Beide Kommentare fachlich umformuliert ("serverseitig berechnete HREFs" statt "Befund 19"), ohne die Erklärung selbst zu verlieren.
- **Files modified:** `frontend/src/components/anime/AnimeEdgeNavigation.stories.tsx`, `frontend/src/app/anime/[id]/AnimeDetailView.stories.tsx`
- **Verification:** `npx vitest run src/components/ui/processHistory.regression.test.ts` (232/232 grün)
- **Committed in:** `17c2efa85` (Task 2)

---

**Total deviations:** 2 auto-fixed (1× Rule 2/Stories-ziehen-mit über drei Dateien, 1× Rule 1 Kommentar-Fix über zwei Dateien)
**Impact on plan:** Beide Ergänzungen waren notwendig, um einen Compile-Blocker bzw. einen bestehenden projektweiten Guard einzuhalten. Kein Scope-Creep über Befund 19 hinaus.

## Issues Encountered
- `page.performance.test.ts`s `vi.mock('@/lib/api', ...)`-Block enthielt bereits `getAnimeList: vi.fn()` (Pitfall 2 aus `192-RESEARCH.md` war bereits in einem früheren Plan/Commit defensiv behoben) -- keine Änderung an dieser Datei nötig, nur verifiziert.
- Zwei neue Props-getriebene Tests in `AnimeEdgeNavigation.test.tsx` erzeugten anfangs eine `act()`-Warnung, weil der weiterhin laufende client-seitige Vorschau-Fetch nach der (jetzt synchronen) Href-Assertion noch resolvte. Behoben durch ein abschließendes `await waitFor(() => expect(getAnimeList).toHaveBeenCalled())` je Test, das den Vorschau-Fetch vor Testende abschließen lässt, ohne die Kernaussage ("hrefs synchron ohne Warten lesbar") zu verändern.
- Volle `npx vitest run`-Suite zeigt 5 vorbestehende, von dieser Änderung unabhängige Fehlschläge (MSW-Modulauflösung in einem Storybook-Setup-Helfer, ein Linux-Compose-only Badge-Artwork-Gate, ein Backend-Quellpfad-Diff-Test ohne gemountetes `/backend`, sowie der bereits in `192-02-SUMMARY.md` dokumentierte `ResponsiveImage.config.test.ts`-Fehlschlag) -- keiner davon berührt eine in diesem Plan geänderte Datei, nicht behoben (außerhalb des Scopes).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Befund 19 (Randnavigation fehlt bis zur Hydration) ist vollständig abgeschlossen: die Zurück/Weiter-Links stehen bereits im Server-HTML, bevor React hydriert; die Hover-Vorschaukarte bleibt unverändert client-seitig.
- Offen für Folgepläne dieser Phase: Befund 20 (Release-Zeilen-Einrückung über `SplitLayout`/`Stack`), abschließender visueller Nachweis (Playwright-Bildpaare main vs. Branch, Story vs. Live-Seite) laut `192-CONTEXT.md`.
- Kein Blocker: alle 64 unmittelbar betroffenen Tests grün, `npx tsc --noEmit`/`npx eslint` clean, volle Suite zeigt nur vorbestehende, unveränderte Fehlschläge.

## Self-Check: PASSED

`frontend/src/lib/animeGridContext.ts` enthält `resolveAnimeNeighbors` (verifiziert); beide Task-Commit-Hashes (`9b3b58bed`, `17c2efa85`) verifiziert in `git log`.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

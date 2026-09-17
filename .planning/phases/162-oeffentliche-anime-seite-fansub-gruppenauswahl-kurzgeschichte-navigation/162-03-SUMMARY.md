---
phase: 162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation
plan: 03
subsystem: frontend
tags: [react, nextjs, history-api, fansubs, url-state]

# Dependency graph
requires: ["162-02"]
provides:
  - "FansubVersionBrowser.tsx: URL-basierter Gruppenzustand (window.history.pushState/popstate) als einzige Quelle des Gruppenkontexts (D-01)"
  - "Vollstaendiges Wiring von FansubGroupPicker + FansubGroupContext inkl. 0/1/2+-Gruppen-Logik"
affects: ["162-04"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "window.history.pushState + popstate-Listener statt next/navigation router.push/replace, um auf einer bereits dynamischen Route (searchParams.grid_query/from) einen RSC-Refetch bei jedem Chip-Klick zu vermeiden (D-03)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
  deleted: []

key-decisions:
  - "activeGroup fuer FansubGroupContext wird direkt aus fansubOptions (=collectFansubOptions(fansubs)) abgeleitet, nicht aus dem separaten storyGroups-Prop -- beide enthalten dieselben fansub_group-Objekte (storyGroups ist nur eine deduplizierte Projektion derselben fansubs-Relationen), die zusaetzliche Prop-Kette wird dadurch fuer diese Komponente ueberfluessig. storyGroups bleibt Teil der Props-Signatur (page.tsx uebergibt es weiterhin unveraendert), wird aber innerhalb dieser Komponente nicht mehr destrukturiert/gelesen."
  - "Kein Fallback mehr auf die zuletzt/primaer gewaehlte Gruppe: der bisherige is_primary-Fallback (Altlast aus der localStorage-Aera) entfaellt vollstaendig zugunsten von D-02s 'Alle ist Standard bei 2+ Gruppen'."

requirements-completed: [REQ-162-01, REQ-162-02, REQ-162-03, REQ-162-08, REQ-162-09, REQ-162-13, REQ-162-14, REQ-162-15, REQ-162-18, REQ-162-19, REQ-162-20]

# Metrics
duration: 55min
completed: 2026-09-17
---

# Phase 162 Plan 03: Fansub-Gruppenauswahl auf URL-Zustand umstellen (Wiring) Summary

**`FansubVersionBrowser.tsx` nutzt jetzt ausschliesslich `window.history.pushState`/`popstate` statt localStorage als Quelle des Gruppenkontexts und wiret die in Plan 162-02 gebauten `FansubGroupPicker`/`FansubGroupContext`-Komponenten vollstaendig, inklusive der kompletten 0/1/2+-Gruppen-Logik.**

## Performance

- **Duration:** ca. 55 Minuten
- **Started:** 2026-09-17T08:47:00Z (ca.)
- **Completed:** 2026-09-17T09:00:00Z (ca.)
- **Tasks:** 2/2 abgeschlossen
- **Files modified:** 3

## Accomplishments

- `FansubVersionBrowser.tsx` verzichtet vollstaendig auf `localStorage`/`StorageEvent` (D-01):
  Interface `PersistedFilterState`, `getStorageKey`, `parseStoredSelection`, der komplette
  Mount-`useEffect` mit `storage`-Listener sowie `selectFansubGroup`s `localStorage.setItem`-Aufruf
  und die tote Prop `onActiveFansubChange` sind entfernt.
- Neues Zustandsmodell: `selectedSlug` (State) + `activeFansubGroupID` (Ableitung) ersetzen den
  alten `selectedGroupID`/`fallback`-Mechanismus. Bei 0 Gruppen ist `activeFansubGroupID` immer
  `null`; bei genau 1 Gruppe ist deren ID immer aktiv (kein Chip-Klick, kein "Alle"); bei 2+
  Gruppen entscheidet ausschliesslich der aufgeloeste `selectedSlug` gegen `fansubOptions`, mit
  sauberem Rueckfall auf "Alle" (`null`), wenn der Slug ungueltig/entfernt ist.
  `initialActiveSlug?: string | null` ist als neue Prop fuer die SSR-Determinismus-Anbindung
  in Plan 162-04 bereits vorbereitet (D-04) und wird bei genau einer Gruppe bewusst ignoriert (D-02).
- `updateFansubSelection(groupID)`: erzeugt bei 2+ Gruppen einen neuen `window.history.pushState`
  -Eintrag (`fansub=<slug>` gesetzt/entfernt, andere Query-Parameter wie `from`/`grid_query` bleiben
  erhalten) -- explizit **kein** `router.push`/`router.replace` aus `next/navigation`, da diese Route
  bereits dynamisch ist (`searchParams.grid_query`/`from`) und einen RSC-Refetch ausloesen wuerden
  (D-03). Ein neuer `popstate`-Listener liest den Parameter bei Browser Zurueck/Vor erneut aus der
  URL, ohne selbst einen weiteren `pushState`-Aufruf oder Datenrequest auszuloesen.
- Render-Reihenfolge: `FansubGroupPicker` (Chip-Zeile) + `FansubGroupContext` (Gruppenbereich)
  werden nur gerendert, wenn `fansubOptions.length > 0`; bei 0 Gruppen erscheint weder Chip-Zeile
  noch Gruppenbereich noch ein Platzhalter (REQ-162-01). Die alte native `<button>`-`filterRow` und
  die alte `groupCtaRow`-CTA ("Gruppenbereich") sind vollstaendig entfernt (D-13) -- keine alte und
  neue Loesung parallel.
- `getSummaryVersion`, `groupMatchedVersions`, `mergeEpisodes`, `loadMore`, die Pagination-Logik und
  die komplette Episoden-`<ul>`-JSX sind byte-identisch unveraendert geblieben (D-09, per
  `git diff` gegenueber dem Vor-Stand bestaetigt -- 0 Treffer in diesen Funktionsbloecken).
- CSS-Bereinigung: `.filterRow` (inkl. der drei `::-webkit-scrollbar*`-Regeln), `.groupCtaRow`,
  `.groupButton` (inkl. `:hover`), `.filterChip`, `.filterChipActive`, `.logo` sind aus
  `FansubVersionBrowser.module.css` entfernt (189 statt vorher 273 Zeilen) -- diese Verantwortung
  liegt jetzt vollstaendig in `FansubGroupPicker.module.css`/`FansubGroupContext.module.css`.
- `FansubVersionBrowser.test.tsx` komplett neu geschrieben (330 Zeilen): der gesamte
  localStorage-/`StorageEvent`-Testblock ("one deterministic group owner") ist entfernt, ersetzt
  durch eine neue `describe`-Gruppe mit den Testfaellen A-I aus `162-USER-REQUEST.md` §16 (0/1/2+
  Gruppen, "Alle"-Default, vollstaendiger Chip-Wechsel, `initialActiveSlug` bei existierender/
  ungueltiger Gruppe, Coop-Version ohne dritten Chip, a11y-`role=group`), plus einem expliziten
  D-03-Beweis (`getGroupedEpisodes` wird bei Chip-Wechsel NICHT erneut aufgerufen), einem
  Browser-Zurueck/Vor-Beweis ueber ein echtes `PopStateEvent` (Assumptions-Log-Risiko A1 aus
  162-RESEARCH.md) und einem Beweis, dass andere Query-Parameter (`from`) beim Gruppenwechsel
  erhalten bleiben (D-02). Die bestehenden `describe('bounded public inventory continuation', ...)`-
  und den finalen Dedup-Test hat der Plan explizit unangetastet gelassen -- sie laufen unveraendert
  weiter gruen.
- Der Block `describe('authoritative anime project navigation', ...)` ist angepasst: alle
  `screen.getByRole('link', { name: 'Zum Gruppenbereich' })`-Assertions sind durch zwei getrennte
  Pruefungen auf `'Zur Fansub-Gruppe'` (href `/fansubs/<slug>`) und `'Zum Projekt'`
  (href `/fansubs/<slug>/fansubprojekt/<animeSlug>`) ersetzt. Der Test "retains numeric
  compatibility ..." (Fallback auf `/anime/22/group/7`) ist ersatzlos entfallen (D-12 verbietet
  diesen Fallback jetzt fuer "Zum Projekt") -- ersetzt durch Tests, die beweisen, dass "Zum Projekt"
  ohne `animeSlug` bzw. ohne gueltigen Gruppen-Slug gar nicht gerendert wird.

## Task Commits

Each task was committed atomically:

1. **Task 1: FansubVersionBrowser.tsx — URL-Zustand statt localStorage, Wiring der neuen Komponenten** - `a7ee53ce` (feat)
2. **Task 2: FansubVersionBrowser.test.tsx — vollstaendiger Rewrite (Testfaelle A-I + D-03-Beweis)** - `3c75890b` (test)

## Files Modified

- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (373 -> 323 Zeilen) — localStorage
  entfernt, URL-Zustand + Wiring von `FansubGroupPicker`/`FansubGroupContext`
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css` (273 -> 189 Zeilen) —
  alte Chip-/CTA-Styles entfernt
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` (295 -> 330 Zeilen) — vollstaendiger
  Rewrite der Testabdeckung fuer URL-Zustand statt localStorage

## Decisions Made

- `activeGroup` fuer `FansubGroupContext` kommt direkt aus `fansubOptions` (der bereits vorhandenen,
  ueber `collectFansubOptions(fansubs)` deduplizierten Relationenliste) statt aus dem separaten
  `storyGroups`-Prop -- beide liefern strukturell dieselben `fansub_group`-Objekte (`storyGroups` ist
  nur `buildFansubStoryGroups(fansubs)`, eine weitere Deduplizierung derselben Quelle). Der
  `storyGroups`-Prop bleibt Teil der Props-Signatur (rueckwaertskompatibel zu `page.tsx`, das ihn
  unveraendert weiterreicht), wird aber innerhalb dieser Komponente nicht mehr destrukturiert.
- Der bisherige `is_primary`-Fallback (Altlast aus der localStorage-Aera, der bei fehlendem
  gespeicherten Wert automatisch die primaere Gruppe aktivierte) entfaellt ersatzlos zugunsten von
  D-02s "Alle ist Standard bei 2+ Gruppen ohne URL-Parameter".

## Deviations from Plan

None — Plan exakt wie geschrieben umgesetzt. Ein kleiner Selbstkorrektur-Schritt (kein
Rule-1-4-Fall): die erste Fassung des D-03-Kommentars im Code enthielt woertlich
"router.push/router.replace", was das eigene Akzeptanzkriterium
(`grep -c "router.push\|router.replace"` == 0) faelschlich getroffen haette -- der Kommentar wurde
umformuliert, ohne die Aussage zu aendern.

## Self-Check

```
grep -c "localStorage" FansubVersionBrowser.tsx            -> 0
grep -c "onActiveFansubChange" FansubVersionBrowser.tsx     -> 0
grep -c "window.history.pushState" FansubVersionBrowser.tsx -> 2
grep -c "addEventListener('popstate'" FansubVersionBrowser.tsx -> 1
grep -c "router.push\|router.replace" FansubVersionBrowser.tsx -> 0
grep -c "function getSummaryVersion" FansubVersionBrowser.tsx -> 1
grep -c "StorageEvent" FansubVersionBrowser.test.tsx        -> 0
grep -c "Zum Gruppenbereich" FansubVersionBrowser.test.tsx  -> 0
grep -c "pushState" FansubVersionBrowser.test.tsx           -> 4
grep -c "popstate\|PopStateEvent" FansubVersionBrowser.test.tsx -> 3
grep -c "not.toHaveBeenCalled" FansubVersionBrowser.test.tsx -> 3
```

Beide Task-Commit-Hashes (`a7ee53ce`, `3c75890b`) in `git log` gefunden. Alle drei genannten Dateien
vorhanden und wie erwartet veraendert.

## Verification Results

```
docker compose exec -T team4sv30-frontend npm run typecheck
-> 0 Fehler

docker compose exec -T team4sv30-frontend npx eslint <alle geaenderten Dateien>
-> 0 Findings

docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx
-> 26/26 Tests gruen

docker compose exec -T team4sv30-frontend npx vitest run src/components/fansubs
-> 25/25 Dateien, 158/158 Tests gruen

docker compose exec -T team4sv30-frontend npx vitest run src/app/anime
-> 20/20 Dateien, 185/185 Tests gruen (keine Fremdregression durch die Umverdrahtung)

docker compose exec -T team4sv30-frontend npx vitest run
-> 326/328 Dateien, 2845/2850 Tests gruen; 2 vorbestehende, dokumentierte, planfremde
   cssCustomProperties.guard.test.ts-Fehlschlaege (roleCatalog.accessibility.test.ts-Fixture, seit
   mehreren fruehreren Plaenen bekannt, siehe STATE.md) -- 0 neue Fehlschlaege durch diesen Plan.
```

## Success Criteria Assessment

- Kein localStorage-/StorageEvent-Code mehr in `FansubVersionBrowser.tsx` — **erfuellt**
- 0/1/2+-Gruppen-Logik inkl. "Alle"-Default vollstaendig automatisiert getestet (Testfaelle A-I) —
  **erfuellt**
- Chip-Wechsel erzeugt nachweislich keinen zusaetzlichen Datenrequest (D-03) — **erfuellt**
- Bestehende Episoden-/Versionsfilterung byte-identisch unveraendert (D-09) — **erfuellt**, per
  `git diff` auf die betroffenen Funktionsbloecke bestaetigt

## Threat Flags

Keine neue sicherheitsrelevante Oberflaeche ausserhalb des im Plan bereits erfassten
`T-162-05`-Eintrags (Query-Parameter `?fansub=` wird ausschliesslich gegen die serverseitig
autoritative `fansubOptions`-Liste verglichen, nie in HTML interpoliert oder als Redirect-Ziel
genutzt).

## Issues Encountered

Kein Blocker. Die vollstaendige Frontend-Regression zeigt exakt dieselben 2 vorbestehenden,
dokumentierten `cssCustomProperties.guard.test.ts`-Fehlschlaege wie in vorherigen Phasen (0 neue).

## User Setup Required

Keine — reine Frontend-Komponentenarbeit ohne neue Umgebungsvariablen, Migrationen oder externe
Abhaengigkeiten. Plan 162-04 (SSR-Determinismus ueber `searchParams.fansub` in `page.tsx`) baut auf
der hier bereits vorbereiteten `initialActiveSlug`-Prop auf.

## Self-Check: PASSED

Alle 4 genannten Dateien (3 geaenderte Produktionsdateien + dieses SUMMARY) vorhanden; beide
Task-Commit-Hashes (`a7ee53ce`, `3c75890b`) in `git log` gefunden.

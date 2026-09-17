---
phase: 162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation
plan: 04
subsystem: frontend
tags: [nextjs, ssr, fansubs, url-state]

# Dependency graph
requires: ["162-03"]
provides:
  - "page.tsx liest searchParams.fansub serverseitig und reicht ihn unvalidiert als initialActiveSlug an FansubVersionBrowser durch (D-04, SSR-Determinismus)"
  - "Letzter Alt-UI-Rest (grauer fansubRow-Chip-Block in page.tsx, zugehoeriges CSS) vollstaendig entfernt (D-13)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive searchParams-Erweiterung nach dem bestehenden from/grid_query-Muster (page.tsx), unvalidierter Rohwert als Hinweis-Prop weitergereicht -- Validierung bleibt bewusst client-seitig in FansubVersionBrowser (T-162-06)"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/app/anime/[id]/page.module.css
    - frontend/src/app/anime/[id]/page.test.tsx
  deleted: []

key-decisions:
  - "rawFansubParam wird 1:1 (kein Trim/keine Transformation) als initialActiveSlug durchgereicht -- serverseitige Doppelvalidierung waere redundant, da FansubVersionBrowser den Wert bereits gegen die geladene fansubOptions-Allowlist prueft (162-03)."

requirements-completed: [REQ-162-13, REQ-162-15, REQ-162-19]

# Metrics
duration: 25min
completed: 2026-09-17
---

# Phase 162 Plan 04: page.tsx an SSR-Determinismus und Alt-UI-Bereinigung anschliessen Summary

**`page.tsx` liest `searchParams.fansub` jetzt serverseitig und reicht ihn unvalidiert als `initialActiveSlug` an `FansubVersionBrowser` durch (D-04), waehrend der letzte redundante graue `fansubRow`-Chip-Block samt totem CSS ersatzlos entfernt ist (D-13).**

## Performance

- **Duration:** ca. 25 Minuten
- **Started:** 2026-09-17T08:42:00Z (ca.)
- **Completed:** 2026-09-17T09:07:00Z (ca.)
- **Tasks:** 3/3 abgeschlossen
- **Files modified:** 3

## Accomplishments

- `AnimeDetailPageProps['searchParams']` und der `resolvedSearchParams`-Cast-Typ in
  `AnimeDetailContent` sind additiv um `fansub?: string | string[]` erweitert, exakt nach dem
  bestehenden `from`/`grid_query`-Muster. Eine neue Konstante `rawFansubParam` liest den Wert nur,
  wenn er ein einzelner String ist (`typeof === 'string'`), sonst `undefined` -- keine serverseitige
  Validierung gegen `animeFansubsResponse`, das uebernimmt `FansubVersionBrowser` bereits
  client-seitig (D-02/162-03, dokumentiert im Threat-Register als `T-162-06`).
- Der komplette `{animeFansubsResponse && animeFansubsResponse.data.length > 0 && (<div
  className={styles.fansubRow}>...)}`-Block (der graue Chip-Link auf `/fansubs/<slug>`, alte
  Zeilen 253-268) ist vollstaendig entfernt -- keine alte und neue Loesung parallel (D-13).
- `<FansubVersionBrowser>` bekommt zusaetzlich zu den bestehenden Props (`animeID`, `animeSlug`,
  `fansubs`, `storyGroups`, `episodes`, `pagination`) die neue Prop `initialActiveSlug={rawFansubParam}`.
- `page.module.css`: die drei toten Regelbloecke `.fansubRow`, `.fansubChip`, `.fansubChip:hover`
  sind entfernt; `.episodesSection h2` (davor) und `.emptyEpisodes` (danach) sind unveraendert.
- `page.test.tsx` bekommt drei neue Tests innerhalb der bestehenden `describe('anime detail
  integration without invented data', ...)`: (1) `searchParams.fansub: 'bloody-shadow'` fuehrt
  nachweislich zu `initialActiveSlug === 'bloody-shadow'` auf dem gefundenen
  `FansubVersionBrowser`-Element; (2) ohne `fansub`-Parameter ist `initialActiveSlug === undefined`;
  (3) `page.module.css` enthaelt per `readFileSync`-Assertion keinen `.fansubRow`- oder
  `.fansubChip`-Selektor mehr.

## Task Commits

Each task was committed atomically:

1. **Task 1: page.tsx — searchParams.fansub lesen, fansubRow entfernen** - `b6bf412a` (feat)
2. **Task 2: page.module.css — fansubRow/fansubChip entfernen** - `af8029b3` (chore)
3. **Task 3: page.test.tsx — initialActiveSlug-Weitergabe und CSS-Bereinigung beweisen** - `48b8f1c3` (test)

## Files Modified

- `frontend/src/app/anime/[id]/page.tsx` (324 -> 314 Zeilen) — `searchParams.fansub` gelesen,
  `initialActiveSlug`-Prop ergaenzt, `fansubRow`-Block entfernt
- `frontend/src/app/anime/[id]/page.module.css` (828 -> 807 Zeilen) — `.fansubRow`/`.fansubChip`
  entfernt
- `frontend/src/app/anime/[id]/page.test.tsx` (278 -> 298 Zeilen) — 3 neue Tests (26 -> 29 Faelle)

## Decisions Made

- `rawFansubParam` wird ohne Trim/Transformation 1:1 durchgereicht (kein serverseitiger
  Allowlist-Check gegen `animeFansubsResponse`), weil `FansubVersionBrowser` diesen Check bereits
  client-seitig gegen `fansubOptions` durchfuehrt (162-03) -- eine zweite Pruefung waere redundant.

## Deviations from Plan

None — Plan exakt wie geschrieben umgesetzt.

## Self-Check

```
grep -c "fansubRow" frontend/src/app/anime/[id]/page.tsx           -> 0
grep -c "initialActiveSlug" frontend/src/app/anime/[id]/page.tsx   -> 1
grep -c "rawFansubParam" frontend/src/app/anime/[id]/page.tsx      -> 2
grep -c "fansubRow\|fansubChip" frontend/src/app/anime/[id]/page.module.css -> 0
```

Alle drei Task-Commit-Hashes (`b6bf412a`, `af8029b3`, `48b8f1c3`) in `git log` gefunden. Alle drei
geaenderten Dateien vorhanden und wie erwartet veraendert.

## Verification Results

```
docker compose exec -T team4sv30-frontend npm run typecheck
-> 0 Fehler

docker compose exec -T team4sv30-frontend npx eslint "src/app/anime/[id]/page.tsx" "src/app/anime/[id]/page.test.tsx"
-> 0 Findings

docker compose exec -T team4sv30-frontend npx vitest run src/app/anime/[id]/page.test.tsx
-> 29/29 Tests gruen (26 bestehende + 3 neue)

docker compose exec -T team4sv30-frontend npx vitest run src/app/anime
-> 20/20 Dateien, 188/188 Tests gruen

docker compose exec -T team4sv30-frontend npx vitest run
-> 326/328 Dateien, 2848/2853 Tests gruen; 2 vorbestehende, dokumentierte, planfremde
   cssCustomProperties.guard.test.ts-Fehlschlaege (unveraendert seit mehreren fruehreren Plaenen,
   siehe STATE.md) -- 0 neue Fehlschlaege durch diesen Plan.
```

## Success Criteria Assessment

- Kein `fansubRow`/`fansubChip`-Rest in Code oder CSS — **erfuellt** (grep 0 Treffer in
  `page.tsx`/`page.module.css`; die unabhaengige `ReleaseVersionFansubChips`-Komponente mit
  `.fansubChips` (Plural, Coop-Badges im Versionrow) ist ein anderes, nicht in D-13 genanntes
  Bauteil und bleibt unangetastet)
- `initialActiveSlug` wird nachweislich aus `searchParams.fansub` an `FansubVersionBrowser`
  durchgereicht — **erfuellt**, per neuem Test bewiesen
- Alle bestehenden `page.test.tsx`-Faelle (Tags/Genres aus Phase 160, Emby, Pagination) bleiben
  unveraendert gruen — **erfuellt**, 26/26 bestehende Faelle weiterhin gruen

## Threat Flags

Keine neue sicherheitsrelevante Oberflaeche ausserhalb des im Plan bereits erfassten
`T-162-06`-Eintrags (`rawFansubParam` wird serverseitig weder in eine Query noch einen Redirect
noch ein HTML-Attribut eingebettet, sondern ausschliesslich als Hinweis-Prop weitergereicht, die
client-seitig gegen die autoritative `fansubOptions`-Liste geprueft wird).

## Issues Encountered

Keine. Die vollstaendige Frontend-Regression zeigt exakt dieselben 2 vorbestehenden, dokumentierten
`cssCustomProperties.guard.test.ts`-Fehlschlaege wie in vorherigen Plaenen (0 neue).

## User Setup Required

Keine — reine Frontend-Aenderung ohne neue Umgebungsvariablen, Migrationen oder externe
Abhaengigkeiten. Damit ist die technische Wiring-Kette aus Phase 162 (Backend-Story-Preview,
FansubGroupPicker/-Context, URL-Zustand, SSR-Determinismus) vollstaendig geschlossen; Live-UAT der
Coop-/Logo-/Geschichte-Faelle wartet weiterhin auf Testdaten des Auftraggebers (D-14).

## Self-Check: PASSED

Alle 3 genannten Produktionsdateien vorhanden; alle drei Task-Commit-Hashes (`b6bf412a`,
`af8029b3`, `48b8f1c3`) in `git log` gefunden.

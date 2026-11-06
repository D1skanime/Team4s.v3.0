---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 03
subsystem: ui
tags: [react, nextjs, css-modules, design-system, fansubs]

# Dependency graph
requires:
  - phase: 192-01
    provides: "Stack/Cluster/SplitLayout Grundbausteine (components/ui)"
provides:
  - "FansubGroupPicker komponiert aus Stack(.wrapper)+Cluster(.chipRow) statt handgebauter flex-Divs"
  - "FansubVersionBrowsers Episodenliste als Stack(as=\"ul\") statt handgebautem display:grid-ul"
affects: [192-04, 192-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grundbausteine Stack/Cluster uebernehmen Layout-Verantwortung eines zusammengesetzten Bausteins unter Beibehaltung bestehender role/aria-label-Rest-Props -- identisch zum in Plan 01 etablierten Konsum-Muster"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubGroupPicker.tsx
    - frontend/src/components/fansubs/FansubGroupPicker.module.css
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css

key-decisions:
  - "className={styles.chipRow} wurde aus der Komponente entfernt, weil nach dem Entfernen der Layout-Regeln keine CSS-Deklaration mehr in .chipRow uebrig blieb (leeres Selektor-Regelwerk waere toter Code) -- Cluster uebernimmt die gesamte visuelle Verantwortung"

patterns-established: []

requirements-completed: [Befund-23]

# Metrics
duration: ~5min
completed: 2026-11-04
---

# Phase 192 Plan 03: Fansubgruppen-Auswahl & Episodenliste auf Stack/Cluster Summary

**FansubGroupPicker und FansubVersionBrowsers Episodenliste bestehen jetzt nur noch aus Stack/Cluster-Grundbausteinen statt handgebauter flex/grid-Divs, bei byte-identischem Verhalten (63/63 betroffene Tests gruen).**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-11-04T10:47:54Z
- **Tasks:** 2 completed
- **Files modified:** 4

## Accomplishments
- `FansubGroupPicker`s aeusserer Wrapper ist jetzt `Stack gap="2"`, die Chip-Reihe `Cluster gap="3" role="group" aria-label="Fansub-Gruppe"` -- `.wrapper`/`.chipRow` in der CSS verloren ihre Layout-Deklarationen, `.chipRow` wurde als leere Hülle ganz entfernt (Cluster übernimmt die Klasse komplett)
- `FansubVersionBrowser`s Episodenliste ist jetzt `Stack as="ul" gap="3"` statt einem handgebauten `<ul>` mit `display:grid; gap:12px` -- `--space-3` entspricht exakt den bisherigen 12px (verifiziert gegen `layout.css:23`), reine Token-Substitution ohne Pixel-Differenz
- `aria-busy`, die bedingte `episodeListDimmed`-Klasse und der D-34-Scroll-Anchoring-Pfad (`overflow-anchor: auto` in der CSS) bleiben vollstaendig erhalten
- Beide globalen Design-System-Waechtertests (`catalogTaxonomy.test.ts`, `foreignVariableOverrides.regression.test.ts`) bleiben unveraendert gruen, da keine neue `components/ui`-Datei entstand

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate FansubGroupPicker onto Stack(.wrapper) + Cluster(.chipRow)** - `db2cbac36` (feat)
2. **Task 2: Migrate FansubVersionBrowser's episode list onto Stack(as="ul")** - `edae4a418` (feat)

**Plan metadata:** (siehe `docs(192-03)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/components/fansubs/FansubGroupPicker.tsx` - aeusserer Stack/Cluster statt handgebauter Divs, `styles.chipRow`-Nutzung entfernt
- `frontend/src/components/fansubs/FansubGroupPicker.module.css` - `.wrapper`/`.chipRow` verlieren Layout-CSS; `.chipRow`-Selektor komplett entfernt (leer)
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - `<ul>` durch `Stack as="ul" gap="3"` ersetzt, Import von `Stack` ergaenzt
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css` - `.episodeList` verliert `display: grid; gap: 12px`, behaelt `list-style`/`margin`/`padding`/`overflow-anchor`

## Decisions Made
- `.chipRow`-CSS-Selektor wurde nach Entfernen seiner Layout-Deklarationen ganz geloescht statt als leere Huelle beizubehalten, und die zugehoerige `className`-Prop-Uebergabe in der Komponente ebenfalls entfernt (Plan erlaubte explizit diese Option, wenn nichts mehr im Regelwerk uebrig bleibt).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Vorab existierende `act()`-Warnungen in `FansubVersionBrowser.test.tsx` (nicht Teil dieses Plans, betreffen Zustandswechsel in anderen Testfaellen) bestanden bereits vor der Aenderung und bleiben unveraendert bestehen -- kein Rule-1-Fix, da ausserhalb des Scopes dieser beiden Dateien/Tasks.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Zwei der fuenf in `192-CONTEXT.md` benannten Pilot-Bausteine (Fansubgruppen-Auswahl, Episoden-Bereich der Episodenliste) bestehen jetzt rein aus Grundbausteinen -- bereit fuer die verbleibenden Pilot-Bausteine (Anime-Kopf/Randnavigation in Plan 02, Release-Zeile in einem Folge-Plan laut der verbindlichen Reihenfolge 23+22/21 -> 19 -> 20).
- Keine Blocker: `catalogTaxonomy.test.ts`/`foreignVariableOverrides.regression.test.ts` bleiben unveraendert gruen, `tsc --noEmit` zeigt keine neuen Fehler (vorbestehende, unveraenderte `.storybook/mocks/handlers.ts`-TS-Fehler sind nicht Teil dieses Plans), `eslint` zeigt keine neuen Befunde in beiden geaenderten Dateien.

## Self-Check: PASSED

Both created/modified files verified present on disk with the expected edits; both task commit hashes (`db2cbac36`, `edae4a418`) verified present in `git log`.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 01
subsystem: ui
tags: [react, nextjs, css-modules, container-queries, design-system, storybook]

# Dependency graph
requires: []
provides:
  - "Stack Grundbaustein (vertikale Anordnung, Space-Token-gap, align)"
  - "Cluster Grundbaustein (horizontale Anordnung mit Umbruch, Space-Token-gap, align, justify)"
  - "SplitLayout Grundbaustein (feste/automatische erste Spalte + flexible Restspalte, Container-Query-Haltepunkt md/lg)"
  - "Barrel-Export aller drei Primitives in components/ui/index.ts"
affects: [192-02, 192-03, 192-04, 192-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Override-Hook-Mechanismus (private CSS-Custom-Properties, inline per Props gesetzt, Fallback via var(--x, default)) auf drei neue Layout-Grundbausteine angewendet -- identisch zu Card.tsx's tintHue-Muster"
    - "SplitLayout setzt gap/firstColumnWidth bewusst NUR bedingt (!== undefined), damit Konsumenten mit mehrstufigem/responsivem Bedarf dieselbe private Variable per eigener className/Medienabfrage ueberschreiben koennen -- Stack/Cluster setzen dagegen IMMER mit JS-Default"
    - "Container-Query (container: split-layout / inline-size) statt Viewport-Medienabfrage fuer SplitLayouts Haltepunkt-Kollaps, identisch zu ArtworkHeros bestehendem Muster"

key-files:
  created:
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.module.css
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.module.css
    - frontend/src/components/ui/Cluster.stories.tsx
    - frontend/src/components/ui/Cluster.test.tsx
    - frontend/src/components/ui/SplitLayout.tsx
    - frontend/src/components/ui/SplitLayout.module.css
    - frontend/src/components/ui/SplitLayout.stories.tsx
    - frontend/src/components/ui/SplitLayout.test.tsx
  modified:
    - frontend/src/components/ui/index.ts

key-decisions:
  - "Cluster/SplitLayout re-deklarieren den SpaceToken-Literal-Typ lokal statt ihn aus Stack.tsx zu importieren, da catalogTaxonomy.test.ts jeden textuellen `from './Stack'`-Import als Grundbaustein-Verbund werten wuerde (auch einen reinen Typ-Import) -- vermeidet eine Aenderung an der global geschuetzten Guard-Datei"

patterns-established:
  - "Layout-Grundbausteine duerfen laut Vorgabe (CLAUDE.md Frontend-UI) keine Flaeche/Farbe/Rundung setzen -- durchgesetzt durch die bestehenden foreignVariableOverrides.regression.test.ts/catalogTaxonomy.test.ts-Wächter, ohne dass diese Dateien geaendert werden mussten"

requirements-completed: [Befund-23]

# Metrics
duration: ~20min
completed: 2026-11-04
---

# Phase 192 Plan 01: Layout-Grundbausteine (Stack/Cluster/SplitLayout) Summary

**Drei neue token-only Layout-Grundbausteine (`Stack`, `Cluster`, `SplitLayout`) in `components/ui`, nach dem bestehenden Card-Override-Hook-Muster, mit vollständiger Storybook-/Testabdeckung und ohne Änderung an den beiden globalen CSS-Wächtertests.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-11-04T10:26:08Z
- **Tasks:** 2 completed
- **Files modified:** 13 (12 neu, 1 geändert)

## Accomplishments
- `Stack` (vertikal) und `Cluster` (horizontal, Umbruch) als generische, token-only Flex-Grundbausteine mit vollständiger `gap`/`align`/`justify`/`wrap`-Zustandsabdeckung in Storybook (`Grundbausteine/Stack`, `Grundbausteine/Cluster`)
- `SplitLayout` als generischer Zwei-Spalten-Grundbaustein mit eigenem, eindeutig benanntem Container (`split-layout`), der unterhalb eines konfigurierbaren `breakpoint` (`md`=768px/`lg`=1024px) zu einer gestapelten Spalte kollabiert — demonstriert in drei Storys über Container-Breite statt Browser-Viewport
- Alle drei Primitives bestehen die bereits bestehenden, unveränderten globalen Wächtertests (`catalogTaxonomy.test.ts`, `foreignVariableOverrides.regression.test.ts`) ohne jede Codeänderung an diesen Dateien — exakt wie in `192-RESEARCH.md` vorhergesagt
- Barrel-Export in `components/ui/index.ts` an den korrekten alphabetischen Positionen ergänzt (Cluster zwischen Card/ConfirmDialog; SplitLayout und Stack zwischen Spinner/StatusIcon)

## Task Commits

Each task was committed atomically:

1. **Task 1: Stack and Cluster primitives (gap/align/justify/wrap, token-only)** - `bb7d88f4b` (feat)
2. **Task 2: SplitLayout primitive (container-query breakpoint collapse) + full guard verification** - `e538d0b87` (feat)

**Plan metadata:** (siehe `docs(192-01)`-Commit nach diesem Dokument)

## Files Created/Modified
- `frontend/src/components/ui/Stack.tsx` - vertikaler Flex-Grundbaustein, setzt `--stack-gap`/`--stack-align` inline
- `frontend/src/components/ui/Stack.module.css` - liest beide Hooks mit Fallback, keine Fläche/Farbe/Rundung
- `frontend/src/components/ui/Stack.stories.tsx` - `Grundbausteine/Stack`, deckt gap `2`/`3` und beide align-Extreme ab
- `frontend/src/components/ui/Stack.test.tsx` - prüft Standardwerte, dokumentierte gap-Werte, align-Extreme, Rest-Prop-Durchreichung
- `frontend/src/components/ui/Cluster.tsx` - horizontaler Flex-Grundbaustein mit Umbruch, `justify`-Mapping auf echte CSS-Schlüsselwörter
- `frontend/src/components/ui/Cluster.module.css` - liest alle vier Hooks mit Fallback, keine Fläche/Farbe/Rundung
- `frontend/src/components/ui/Cluster.stories.tsx` - `Grundbausteine/Cluster`, deckt gap `2`/`4`/`5`, wrap true/false, justify start/between ab
- `frontend/src/components/ui/Cluster.test.tsx` - prüft Standardwerte, gap-Werte, justify-Mapping, wrap-Umschaltung, Rest-Prop-Durchreichung
- `frontend/src/components/ui/SplitLayout.tsx` - zwei-Spalten-Grid-Grundbaustein, `gap`/`firstColumnWidth` nur bedingt gesetzt
- `frontend/src/components/ui/SplitLayout.module.css` - eigener Container `split-layout`, zwei `@container`-Haltepunkt-Blöcke (md/lg)
- `frontend/src/components/ui/SplitLayout.stories.tsx` - `Grundbausteine/SplitLayout`, drei Storys (breit/schmal/lg) über Container-Breiten-Decorator
- `frontend/src/components/ui/SplitLayout.test.tsx` - prüft Rendering beider Spalten, bedingtes Setzen von `--split-first-col`/`--split-gap`, `--split-align`-Standard, `breakpointLg`-Klasse
- `frontend/src/components/ui/index.ts` - drei neue Barrel-Exports an alphabetisch korrekter Position

## Decisions Made
- `SpaceToken` wird in `Cluster.tsx`/`SplitLayout.tsx` als eigener, lokal wiederholter Literal-Typ deklariert statt aus `./Stack` importiert, weil `catalogTaxonomy.test.ts` jeden textuellen `from './Stack'`-Import unabhängig von `type`-Only-Semantik als Grundbaustein-zu-Grundbaustein-Verbund werten würde — ein Import hätte entweder eine (laut Phasenvorgabe unnötige) Änderung an der Guard-Datei oder einen fehlschlagenden Test erzwungen. Die drei Zeichen des Literal-Typs sind trivial und stellen keine Geschäftslogik-Duplizierung im Sinne von CLAUDE.mds Wiederverwendungsregel dar.
- `SplitLayoutProps` erweitert `Omit<HTMLAttributes<HTMLElement>, 'children'>` statt der vollen `HTMLAttributes`, da die Komponente `firstColumn`/`secondColumn` als benannte Props statt eines generischen `children`-Slots rendert (verhindert widersprüchliche gleichzeitige Nutzung beider Mechanismen).

## Deviations from Plan

None - plan executed exactly as written (die oben dokumentierte `SpaceToken`-Typ-Entscheidung ist eine Implementierungsdetail-Präzisierung innerhalb von CONTEXT.md's "Claude's Discretion"-Freiraum für die exakte Prop-API, keine Abweichung von einer verbindlichen Vorgabe).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Alle drei Grundbausteine stehen bereit für Plan 02 (Anime-Kopf-Baustein, Befund 21/22) und Plan 03 (Fansubgruppen-Karte/Release-Zeile, Befund 20), exakt nach der in `192-UI-SPEC.md` festgelegten Prop-API.
- Keine Blocker: `catalogTaxonomy.test.ts`/`foreignVariableOverrides.regression.test.ts` bleiben unverändert grün, `tsc --noEmit` und `eslint` zeigen keine neuen Fehler in den drei neuen Dateien (vorbestehende, unveränderte `.storybook/mocks/handlers.ts`-TS-Fehler sind nicht Teil dieses Plans).

## Self-Check: PASSED

All 12 created files verified present on disk; both task commit hashes (`bb7d88f4b`, `e538d0b87`) verified present in `git log`.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

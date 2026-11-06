---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 21
subsystem: ui
tags: [react, typescript, storybook, design-tokens, layout-primitives]

# Dependency graph
requires:
  - phase: 192 (Pläne 01-20)
    provides: Stack/Cluster/SplitLayout-Grundbausteine mit Zweck-Benennung (Befund 23/24), Pilot-Komposit-Dateien, 192-CONTEXT.md-Addendum 2026-11-05a (Review-Befund 1)
provides:
  - "Stack.gap akzeptiert zusätzlich ein Array von StackGapPurpose-Werten (Rhythmus-Modus) für einen nicht-einheitlichen Kind-zu-Kind-Abstand, mit Zero-Pixel-Diff für den unveränderten Einzelwert-Pfad"
  - "Neuer dritter Stack-Zweck 'captionLines' (--space-caption-lines, 4px) für enge Zwei-Zeilen-Bildunterschriften"
affects: [192-24, 192-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Stack-Rhythmus-Array-Modus: --stack-gap wird bei Array-gap literal auf '0' gesetzt, jedes Kind außer dem ersten steckt in einem schlanken, nur mit marginTop versehenen Wrapper -- Fail-fast bei falscher Array-Länge statt stillschweigender Fehlausrichtung"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.stories.tsx
    - frontend/src/components/ui/Stack.test.tsx
    - frontend/src/styles/tokens/layout.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "Array-Modus bewusst nur als NEUER Zweig hinter Array.isArray(gap) implementiert, nicht als Umbau des bestehenden Einzelwert-Pfads -- garantiert Zero-Pixel-Diff für jeden bestehenden Aufrufer ohne erneute visuelle Prüfung"
  - "Wrapper-Element ist ein nacktes <div> ohne className, trägt ausschließlich marginTop -- konsistent mit Stacks eigener Regel, keine Fläche/Farbe/Rundung selbst zu setzen"
  - "Array-Längen-Validierung wirft synchron beim Rendern (vor jedem DOM-Commit), damit eine künftige Komposit-Datei, die Kinder ändert ohne das gap-Array nachzuziehen, sofort im Development sichtbar fehlschlägt statt leise falsch auszurichten"

requirements-completed: [Befund-Review1]

# Metrics
duration: 4min
completed: 2026-11-05
---

# Phase 192 Plan 21: Stack-Rhythmus-Array-Modus + 'captionLines'-Zweck Summary

**Stack's `gap`-Prop unterstützt jetzt ein Array von Zweck-Werten für nicht-einheitlichen Kind-Abstand (ein Wert pro Lücke), plus einen neuen `'captionLines'`-Zweck für enge Zwei-Zeilen-Bildunterschriften -- beides rein additiv, noch nicht an Komposit-Dateien verdrahtet.**

## Performance

- **Duration:** ~4 min (Commit-zu-Commit, 00:42:36–00:45:37 UTC)
- **Started:** 2026-11-05T00:42:00Z (ca.)
- **Completed:** 2026-11-05T00:45:59Z
- **Tasks:** 2 completed (beide TDD: RED→GREEN)
- **Files modified:** 5

## Accomplishments
- `Stack.gap` akzeptiert jetzt `StackGapPurpose | StackGapPurpose[]` -- Array-Modus rendert pro Lücke zwischen zwei aufeinanderfolgenden Kindern einen schlanken `marginTop`-Wrapper statt des nativen CSS-`gap`, mit synchronem Fail-fast bei Längen-Mismatch
- Neuer dritter Stack-Zweck `'captionLines'` (`--space-caption-lines`, 4px) für die geplante Randnavigations-Vorschaukarten-Bildunterschrift (Titel+Typ)
- Zwei neue Storybook-Stories ("Rhythmus-Modus (Array)", "Bildunterschrift (zwei Zeilen)") mit deutscher Zweck-Erklärung
- `docs/FRONTEND_ARCHITEKTUR.md`s Stack/Cluster/SplitLayout-Absatz dokumentiert beide neuen Fähigkeiten

## Task Commits

Each task was committed atomically (TDD RED/GREEN):

1. **Task 1: Stack array-gap rhythm mode**
   - `a0f75e762` (test) - RED: 2 failende Tests für Array-Modus (2 Wrapper bei 3 Kindern/2 Werten, Fail-fast bei Längen-Mismatch)
   - `a0ccd22ab` (feat) - GREEN: `Array.isArray(gap)`-Zweig in `Stack.tsx`, neue Storybook-Story
2. **Task 2: 'captionLines' purpose + token; docs**
   - `10dbddc2b` (test) - RED: 1 failender Test für den neuen Zweck
   - `b5afde099` (feat) - GREEN: `--space-caption-lines`-Token, `StackGapPurpose`-Erweiterung, Story, Doku-Satz

**Plan metadata:** (folgt in separatem Abschluss-Commit)

## Files Created/Modified
- `frontend/src/components/ui/Stack.tsx` - `gap` akzeptiert Array; neuer `'captionLines'`-Zweck; erweiterte deutsche Doku-Kommentare
- `frontend/src/components/ui/Stack.stories.tsx` - zwei neue Stories (Rhythmus-Array, Bildunterschrift)
- `frontend/src/components/ui/Stack.test.tsx` - 3 neue Testfälle (Array-Render, Fail-fast, `captionLines`)
- `frontend/src/styles/tokens/layout.css` - `--space-caption-lines: var(--space-1)` mit deutschem Zweck-Kommentar
- `docs/FRONTEND_ARCHITEKTUR.md` - ein neuer Satz im bestehenden Stack/Cluster/SplitLayout-Absatz

## Decisions Made
- Array-Modus wrapt mit einem nackten `<div>` (keine `className`), exakt wie in `192-CONTEXT.md`s Addendum 2026-11-05a spezifiziert -- keine neue Fläche/Farbe/Rundung
- Kein neuer Pixelwert für `captionLines` nötig: `var(--space-1)` (4px) war bereits der im Addendum benannte Zielwert
- Keine Verdrahtung in `AnimeDetailHero`/`AnimeEdgeNavigation` in diesem Plan -- laut Plan-Objective bewusst interface-first, Verdrahtung folgt in Plänen 192-24/192-26

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Pläne 192-24/192-26 können jetzt `Stack`s Rhythmus-Array-Modus und `'captionLines'`-Zweck nutzen, um `.infoCardBody`s uneinheitlichen Abstands-Rhythmus (Fälle 1/4/5/6/7/8 aus Review-Befund 1) sowie `AnimeEdgeNavigation.previewType` (Fall 12) durch echte Grundbaustein-Komposition statt lokalem CSS abzubilden
- Keine Blocker: `npx vitest run src/components/ui/Stack.test.tsx` (7/7) und `npx tsc --noEmit` beide grün; `gapPurposeNaming.guard.test.ts`, `compositeLayoutPurity.guard.test.ts` und `catalogTaxonomy.test.ts` bleiben unverändert grün

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-05*

## Self-Check: PASSED

All 5 modified files found on disk; all 4 task commits (a0f75e762, a0ccd22ab, 10dbddc2b, b5afde099) found in git history.

---
phase: quick-rcx
plan: 01
subsystem: frontend-tooling
tags: [eslint, typescript, react-hooks, design-system, playwright]

requires: []
provides:
  - ESM-Version des verwaisten Playwright-Debug-Skripts capture-responsive (vorher CommonJS, vorher no-require-imports-Verstoss)
  - Stabil memoisiertes storyContext in EpisodeVersionEditorPage.tsx, passend angepasstes fetcher-Abhaengigkeitsarray in useReleaseVersionMedia.ts
  - Design-System-konforme Input-Primitive statt natives input-Element in ReleasesFilterBar.tsx
affects: [quality-gate, admin-episode-versions-editor, anime-group-releases]

tech-stack:
  added: []
  patterns:
    - "Ad-hoc-Playwright-Debug-Skripte im Projekt-Root als ESM-.mjs mit Top-Level-await (kein IIFE), nicht als CommonJS-.cjs"
    - "An Kind-Komponenten durchgereichte Kontext-Objekte, die als Hook-Abhaengigkeit dienen, werden an der Erzeugungsstelle per useMemo stabilisiert statt als Inline-Objektliteral uebergeben"

key-files:
  created:
    - frontend/capture-responsive.mjs
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx

key-decisions:
  - "Alle drei Root Causes echt behoben statt per ESLint-Disable unterdrueckt -- Finding 2 behebt zusaetzlich einen latenten Perf-Footgun (Abbruch-und-Neu-Fetch des Medien-Fetchers bei jedem Render)."
  - "Keine neuen Tests geschrieben, keine Testsuite ausgefuehrt (REIHENFOLGE-Regel, Runde 1 von 3 der Quality-Gate-Behebung)."

patterns-established: []

requirements-completed: []

duration: ~15min
completed: 2026-11-06
---

# Phase quick-rcx Plan 01: Quality-Gate Frontend-Lint-Befunde beheben Summary

**Alle vier urspruenglichen ESLint-Befunde (2x no-require-imports, 1x react-hooks/preserve-manual-memoization, 1x no-restricted-syntax) echt behoben statt unterdrueckt -- inklusive eines dabei aufgedeckten latenten Perf-Footguns im Medien-Fetcher.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-11-06
- **Tasks:** 3/3 completed
- **Files modified:** 4 (1 Rename+Konvertierung, 3 inhaltliche Aenderungen)

## Accomplishments
- `capture-responsive.cjs` nach `capture-responsive.mjs` umbenannt und auf ESM (Top-Level-await, kein `require`) umgestellt, identisches Laufzeitverhalten erhalten.
- `storyContext` in `EpisodeVersionEditorPage.tsx` per `useMemo` stabilisiert und das `fetcher`-Abhaengigkeitsarray in `useReleaseVersionMedia.ts` passend auf `[storyContext, versionId]` verbreitert -- behebt sowohl den Lint-Befund als auch einen echten Perf-Footgun (Abbruch-und-Neu-Fetch bei jedem Render).
- Natives `<input>` in `ReleasesFilterBar.tsx` durch die globale `Input`-Primitive aus `@/components/ui` ersetzt, identisches Verhalten und Styling erhalten.

## Task Commits

Each task was committed atomically:

1. **Task 1: capture-responsive.cjs zu ESM (.mjs) konvertieren** - `07ee00de9` (chore)
2. **Task 2: storyContext stabil memoisieren + fetcher-Abhaengigkeiten anpassen** - `4d847b99d` (fix)
3. **Task 3: natives input-Element in ReleasesFilterBar.tsx durch Input-Primitive ersetzen** - `6fc442433` (fix)

_Keine TDD-Tasks in diesem Auftrag (REIHENFOLGE-Regel: keine neuen Tests, keine Testsuite in dieser Runde)._

## Files Created/Modified
- `frontend/capture-responsive.mjs` - ESM-Ersatz fuer das geloeschte CommonJS-Debug-Skript, identisches Laufzeitverhalten (gleiche URL, Viewport-Groessen, Screenshot-Pfade, Konsolenausgabe)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` - `storyContext` jetzt per `useMemo` ueber `segmentAnimeId`/`segmentGroupId`/`segmentVersion` stabilisiert, an `ReleaseVersionMediaSection` per `storyContext={storyContext}` durchgereicht
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - `fetcher`-Abhaengigkeitsarray von drei Einzelfeldern auf `[storyContext, versionId]` verbreitert, passend zur jetzt stabilen Aufruferreferenz
- `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx` - Suchfeld nutzt `Input` aus `@/components/ui` statt natives `<input>`, Styling-Hook `className={styles.searchInput}` unveraendert erhalten

## Decisions Made
- Keine Abweichung von der im Plan vorgegebenen Root-Cause-Analyse -- alle drei Befunde waren bereits vollstaendig diagnostiziert und wurden 1:1 umgesetzt.
- Task 2 bewusst an beiden Enden (Erzeuger- und Verbraucherseite) gefixt, nicht nur das Abhaengigkeitsarray verbreitert, um die vom Plan beschriebene Render-Regression zu vermeiden.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `npx eslint capture-responsive.mjs "src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx" "src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts" "src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx"` -- 0 Fehler. 3 vorbestehende, nicht mit diesem Auftrag zusammenhaengende `no-unused-vars`-Warnungen in `useReleaseVersionMedia.ts` (Zeilen 6, 41, 67 -- ausserhalb der in Task 2 geaenderten Zeilen, nicht Teil der vier urspruenglichen Befunde).
- `npx tsc --noEmit` (gesamtes Projekt) -- fehlerfrei.
- `frontend/capture-responsive.cjs` existiert nicht mehr (per `git mv` umbenannt); `frontend/capture-responsive.mjs` existiert.
- Keine Testsuite ausgefuehrt, keine Testdatei angefasst (REIHENFOLGE-Regel eingehalten).

## Self-Check: PASSED

- FOUND: frontend/capture-responsive.mjs
- MISSING (erwartet, da umbenannt): frontend/capture-responsive.cjs
- FOUND commit: 07ee00de9
- FOUND commit: 4d847b99d
- FOUND commit: 6fc442433

---
phase: 31-ui-umbau
plan: "01"
subsystem: frontend-admin-fansub
tags: [fansub, ui, tabs, releases, expandable-rows]
dependency_graph:
  requires: []
  provides: [fansub-edit-tab-nav, anime-releases-tab, expandable-release-rows]
  affects: [frontend/src/app/admin/fansubs/[id]/edit/]
tech_stack:
  added: []
  patterns: [tab-navigation, sub-component-extraction, css-module-split]
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEditHelpers.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubReleasesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubReleasesTab.module.css
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/lib/api.ts
    - frontend/src/types/fansub.ts
decisions:
  - Fansub-Edit wird zu tab-basiertem Workspace mit MainTab-State in page.tsx
  - FansubReleasesTab als Sub-Komponente extrahiert um CLAUDE.md 450-Zeilen-Limit einzuhalten
  - expandedReleaseIds-State in page.tsx gehalten und als Prop weitergeleitet
  - FansubEditHelpers.ts fuer Formhelfer-Funktionen extrahiert
  - AdminFansubRelease-Types und getAdminFansubAnimeReleases-Funktion im Worktree nachgezogen
metrics:
  duration: "14min"
  completed_date: "2026-04-30"
  tasks: 2
  files: 7
---

# Phase 31 Plan 01: Fansub-Edit Tab-Workspace und ausklappbare Release-Zeilen Summary

Tab-basierter Fansub-Edit-Workspace mit `Anime & Releases` als erstem Klasse-Tab und ausklappbaren Release-Zeilen mit `Theme- und Segment-Kontext` Platzhalter-Panel.

## Was gebaut wurde

### Task 1: Top-Level-Tab-Navigation

Die Fansub-Edit-Seite wurde von einer `<details>`-basierten Accordion-Struktur zu einer echten Tab-Navigation umgebaut:

- `MainTab`-Typ mit `basic | tags | content | media | links | releases`
- `activeMainTab`-State (Default: `basic`)
- Tab-Navigationsleiste im Profil-Header (via `fansubEditMainTabRow` und `fansubEditMainTabButtonActive` CSS-Klassen)
- Jeder Tab zeigt nur seinen relevanten Formular-Abschnitt
- `Anime & Releases` ist der letzte Tab und laedt Release-Daten beim ersten Rendern

Gleichzeitig wurden im Worktree fehlende Phase-30-Typen und API-Funktionen nachgezogen:
- `AdminFansubRelease`-Interface in `frontend/src/types/fansub.ts`
- `AdminFansubAnimeReleasesResponse`-Interface in `frontend/src/types/fansub.ts`
- `getAdminFansubAnimeReleases`-Funktion in `frontend/src/lib/api.ts`

### Task 2: Ausklappbare Release-Zeilen

Jede Release-Zeile hat jetzt einen Chevron-Button zum Auf-/Zuklappen:

- `expandedReleaseIds`-State als `Set<number>` in `page.tsx`
- `toggleRelease`-Handler passt den Set per Callback-Update an
- Ausgeklappter Bereich zeigt `Theme- und Segment-Kontext`-Shell mit Release-Identitaet
- Kein `ReleaseDrawer` - der Kontext bleibt inline in der Release-Zeile

## Dateiaufteilung (CLAUDE.md 450-Zeilen-Limit)

Da `page.tsx` nach dem Umbau 587 Zeilen hatte, wurden folgende Splits vorgenommen:

| Datei | Zeilen | Inhalt |
|---|---|---|
| `page.tsx` | 354 | Haupt-Page-Komponente, State, Form-Logic, Tab-Rendering |
| `FansubEditHelpers.ts` | 110 | FormState, Typen, Hilfsfunktionen, Mapping |
| `FansubReleasesTab.tsx` | 84 | Releases-Tab-Komponente mit Expandable-Rows |
| `FansubReleasesTab.module.css` | 79 | Release-spezifische CSS-Klassen |
| `FansubEdit.module.css` | 368 | Basis- und Tab-Navigation-CSS |

## Deviations from Plan

### Auto-added Missing Critical Functionality

**[Rule 2 - Missing Types] AdminFansubRelease und API-Funktion im Worktree nachgezogen**
- **Found during:** Task 1 - Worktree hat Phase-30-Aenderungen nicht
- **Issue:** Worktree-Version hatte weder `AdminFansubRelease`-Types noch `getAdminFansubAnimeReleases`
- **Fix:** Types in `fansub.ts` und API-Funktion in `api.ts` nachgezogen (identisch mit Main-Repo)
- **Files modified:** `frontend/src/types/fansub.ts`, `frontend/src/lib/api.ts`
- **Commit:** 60e29a7a

**[Rule 2 - Modularity] Sub-Komponenten-Split durch CLAUDE.md 450-Zeilen-Limit**
- **Found during:** Task 1/2 kombiniert
- **Issue:** page.tsx war nach vollstaendigem Umbau 587 Zeilen
- **Fix:** FansubEditHelpers.ts, FansubReleasesTab.tsx, FansubReleasesTab.module.css extrahiert
- **Files modified:** Alle oben genannten Dateien
- **Commit:** 60e29a7a, 3386e846

## Known Stubs

- `Theme- und Segment-Kontext` Placeholder in ausgeklapptem Release-Bereich zeigt nur statischen Hinweis-Text - wird in Plan 31-02 mit echten Segment-Karten befuellt.

## Self-Check: PASSED

Alle erstellten Dateien existieren und Commits sind vorhanden.

---
phase: 83
plan: "06"
subsystem: frontend-cockpit-wiring
tags: [cockpit, frontend, page-tsx, drawer-mount, badge, has_override, phase-83]
dependency_graph:
  requires: [83-04, 83-05]
  provides: [cockpit-contribution-entry-point, has_override-badge, mitwirkende-button]
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/types/fansub.ts
tech_stack:
  added: []
  patterns: [drawer-mount-pattern, badge-from-listing-field, no-extra-api-call]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/types/fansub.ts
decisions:
  - "contributionDrawerAnimeId stored in State (zusätzlicher 4. State) — Drawer-Mount liegt außerhalb des releaseGroup-Loop, animeId muss daher mitgespeichert werden"
  - "onSaved verwendet loadAnimeReleases(group, true) statt refreshAnimeReleases — Funktion existiert nicht, loadAnimeReleases(releaseGroup, force=true) ist der korrekte Refresh-Pfad"
  - "has_override?: boolean optional in AdminFansubRelease — Feld ist neu in API (Plan 04), ältere Responses ohne Feld bleiben kompatibel"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-12"
  tasks_completed: 1
  files_changed: 2
---

# Phase 83 Plan 06: Cockpit-Verdrahtung ReleaseContributionDrawer Summary

Import + State + Handler + Badge + Button + Drawer-Mount in `page.tsx` — Cockpit zeigt pro Release-Zeile Status-Badge (aus `has_override`) und Mitwirkende-Button, der `ReleaseContributionDrawer` öffnet.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | State + Handler + Drawer-Mount + Mitwirkende-Button + Badge in page.tsx | e0db036f | page.tsx, fansub.ts |

## What Was Built

**Task 1 — Cockpit-Verdrahtung:**

- `AdminFansubRelease.has_override?: boolean` in `frontend/src/types/fansub.ts` — API-Feld aus Plan 04 nun typisiert
- Import `ReleaseContributionDrawer` aus `./ReleaseContributionDrawer` in `page.tsx`
- 4 neue State-Variablen: `contributionDrawerOpen`, `contributionDrawerVersionId`, `contributionDrawerAnimeId`, `contributionDrawerTitle`
- `openContributionDrawer(versionId, animeId, title)` Handler — setzt alle vier States
- Pro Release-Zeile in der Aktions-Reihe:
  - `<Badge variant={'info'|'muted'|'warning'}>` mit Text "Eigene Besetzung" / "Projektteam" / "Mitwirkende fehlen" — direkt aus `release.has_override` (kein separater API-Call, D-08 erfüllt)
  - `<Button variant="subtle" size="sm">Mitwirkende</Button>` mit `aria-label="Mitwirkende für {title} bearbeiten"` — nur wenn `canOpenReleaseContributors` (D-06 erfüllt)
- Drawer-Mount am Ende des JSX-Return: `ReleaseContributionDrawer` mit `open`, `fansubId`, `animeId`, `releaseVersionId`, `releaseTitle`, `onClose`, `onSaved` Props
- `onSaved` sucht releaseGroup aus `releaseGroups` via `animeId` und ruft `loadAnimeReleases(group, true)` auf

## Verification Results

```
npm run typecheck → exit 0 (keine neuen TypeScript-Fehler)
npm run lint → keine no-restricted-syntax Fehler in geänderten Dateien
page.tsx enthält "ReleaseContributionDrawer" (Import + Verwendung): JA
page.tsx enthält "contributionDrawerOpen": JA
page.tsx enthält "openContributionDrawer": JA
page.tsx enthält "has_override": JA
page.tsx enthält "Eigene Besetzung": JA
page.tsx enthält "Projektteam": JA
page.tsx enthält "Mitwirkende fehlen": JA
page.tsx enthält "Mitwirkende" als Button-Label: JA
page.tsx Wachstum: +59 Zeilen (≈ Rahmen des Plans, leicht über 50 durch extra animeId-State)
Kein nativer <select>/<input>/<textarea> hinzugefügt
Alle Umlaute korrekt: Mitwirkende, Eigene Besetzung, Projektteam
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Context] contributionDrawerAnimeId als 4. State-Variable**
- **Found during:** Task 1 (Drawer-Mount-Erstellung)
- **Issue:** PATTERNS.md dokumentierte `animeId={animeId}` im Drawer-Mount ohne zu spezifizieren, woher `animeId` kommt. Da der Drawer-Mount außerhalb des `releases.map`-Loops liegt, ist `animeId` dort nicht direkt verfügbar.
- **Fix:** Zusätzliche State-Variable `contributionDrawerAnimeId` + Übergabe in `openContributionDrawer`-Handler. Wächst page.tsx um ~4 extra Zeilen (gesamt +59 statt ≤50).
- **Files modified:** `page.tsx`
- **Commit:** e0db036f

**2. [Rule 3 - Blocking] refreshAnimeReleases existiert nicht**
- **Found during:** Task 1 (Handler-Implementierung)
- **Issue:** PATTERNS.md dokumentierte `onSaved={() => { void refreshAnimeReleases(); }}` — Funktion `refreshAnimeReleases` existiert nicht in page.tsx.
- **Fix:** `onSaved` implementiert als `const group = releaseGroups.find(...); if (group) void loadAnimeReleases(group, true);` — korrekte Refresh-Logik.
- **Files modified:** `page.tsx`
- **Commit:** e0db036f

### Known Technical Debt

**page.tsx 450-Zeilen-Verstoß:**
- `page.tsx` ist jetzt 4018 Zeilen (war >3200 Zeilen vor diesem Plan).
- Massiver Verstoß gegen CLAUDE.md-Modularitätslimit (≤450 Zeilen).
- Explizit getrackt — Split auf Folge-Phase verschoben (ReleaseTab.tsx, ContributionsTab.tsx o.ä.).
- Kein unerwarteter Verifier-Befund — dokumentiert in Plan-Frontmatter und Objective.

## Known Stubs

Keine — Badge und Button sind vollständig verdrahtet. `has_override` kommt direkt aus Listing-API (Plan 04).

## Threat Surface Scan

Keine neuen Netzwerk-Endpoints. Alle Sicherheitsprüfungen liegen im Backend (T-83-IDOR via `CanForReleaseVersion` aus Plan 04). Die `openContributionDrawer`-Funktion setzt nur UI-State, keine Benutzereingaben fließen als IDs — alle IDs kommen aus API-gelieferten Release-Daten.

## Self-Check: PASSED

- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` FOUND
- `frontend/src/types/fansub.ts` FOUND
- Commit e0db036f FOUND
- `import { ReleaseContributionDrawer }` in page.tsx FOUND
- `contributionDrawerOpen` State in page.tsx FOUND
- `openContributionDrawer` Handler in page.tsx FOUND
- `ReleaseContributionDrawer` Mount in page.tsx FOUND
- `has_override` Badge-Kondition in page.tsx FOUND
- "Eigene Besetzung" in page.tsx FOUND
- "Projektteam" in page.tsx FOUND
- "Mitwirkende fehlen" in page.tsx FOUND
- "Mitwirkende" Button-Label in page.tsx FOUND
- `has_override?: boolean` in fansub.ts FOUND
- `npm run typecheck` → exit 0
- Keine no-restricted-syntax Lint-Fehler in geänderten Dateien

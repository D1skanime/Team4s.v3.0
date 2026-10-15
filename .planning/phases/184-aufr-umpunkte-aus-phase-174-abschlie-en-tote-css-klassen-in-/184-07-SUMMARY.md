---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 07
subsystem: ui
tags: [react, nextjs, css-modules, refactor, hooks]

requires:
  - phase: 184-03
    provides: "frontend/src/lib/mergeCssModules.ts (Proxy-basierter CSS-Modul-Merge-Helfer)"
provides:
  - "admin/episodes/page.tsx regelkonform aufgeteilt (≤450 Zeilen) via neuem useAdminEpisodesPage-Hook"
  - "AnimeBrowser-Cluster (page.tsx, AnimeBrowserFilters.tsx, AnimeBrowserList.tsx, AnimeRow.tsx) nutzt mergeCssModules statt kaputtem Spread-Merge"
affects: [184-folgeplaene-f12, admin-episodes, admin-anime-browser]

tech-stack:
  added: []
  patterns:
    - "Options-Objekt-Hook-Split (useAdminEpisodesPage nach Vorbild useGroupMembersTab): Seite bleibt reiner Render + ein Hook-Aufruf"

key-files:
  created:
    - frontend/src/app/admin/episodes/useAdminEpisodesPage.ts
  modified:
    - frontend/src/app/admin/episodes/page.tsx
    - frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx
    - frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserList.tsx
    - frontend/src/app/admin/anime/components/AnimeBrowser/AnimeRow.tsx

key-decisions:
  - "D-05-Reihenfolge eingehalten: reiner Umbau-Commit (Hook-Split) vor dem inhaltlichen mergeCssModules-Commit, beide Gates separat grün."
  - "Inline-onClick zum Leeren der Anime-Suche in page.tsx als benannte Hook-Funktion clearAnimeSearch extrahiert (gleiche Logik, nur Benennung) statt es inline in der JSX zu belassen."

requirements-completed: [D-01, D-05]

duration: ~15min
completed: 2026-10-15
---

# Phase 184 Plan 07: admin/episodes-Split + AnimeBrowser-Cluster auf mergeCssModules Summary

**admin/episodes/page.tsx (637 Zeilen) in Render-Komponente + useAdminEpisodesPage-Hook aufgeteilt (423/317 Zeilen), danach zusammen mit den 3 AnimeBrowser-Dateien auf den zentralen mergeCssModules-Helfer aus 184-03 umgestellt — ohne sichtbare Verhaltensänderung.**

## Performance

- **Duration:** ~15min
- **Completed:** 2026-10-15T16:45:04Z
- **Tasks:** 2 completed
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `admin/episodes/page.tsx` ist jetzt regelkonform unter der 450-Zeilen-Grenze (423 Zeilen), State/Handler/Anime-Suche leben im neuen `useAdminEpisodesPage()`-Hook (317 Zeilen).
- Alle 4 Dateien des episodes/AnimeBrowser-Clusters rufen jetzt `mergeCssModules(browserStyles, sharedStyles)` statt dem latent kaputten `{ ...sharedStyles, ...browserStyles }`-Spread.
- Reihenfolge der Commits entspricht D-05: erst reiner Umbau (Split), dann erst die inhaltliche Änderung (Helferaufruf).

## Task Commits

Each task was committed atomically:

1. **Task 1: admin/episodes/page.tsx aufteilen (reiner Umbau-Commit)** - `42fc4bc6e` (refactor)
2. **Task 2: AnimeBrowser-Cluster (4 Dateien) auf mergeCssModules umstellen** - `44b1f858a` (refactor)

_Kein TDD in diesem Plan (reiner Refactor ohne neues Verhalten)._

## Files Created/Modified
- `frontend/src/app/admin/episodes/useAdminEpisodesPage.ts` - Neuer Hook mit State, Handlern, Anime-Suche und Modul-Helfern (parsePositiveInt, normalizeOptionalString, resolveAnimeStatusClass, handleCoverImgError) der Episoden-Admin-Seite
- `frontend/src/app/admin/episodes/page.tsx` - Nur noch Render-Komponente, ruft `useAdminEpisodesPage()` auf; CSS-Modul-Merge jetzt via `mergeCssModules`
- `frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx` - CSS-Modul-Merge auf `mergeCssModules` umgestellt
- `frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserList.tsx` - CSS-Modul-Merge auf `mergeCssModules` umgestellt
- `frontend/src/app/admin/anime/components/AnimeBrowser/AnimeRow.tsx` - CSS-Modul-Merge auf `mergeCssModules` umgestellt

## Decisions Made
- Der Hook braucht kein Options-Objekt (keine Parameter von außen) — anders als `useGroupMembersTab`, das von einer Tab-Komponente mit Props aufgerufen wird. `useAdminEpisodesPage()` wird parameterlos von der Seite selbst aufgerufen, Rückgabe ist weiterhin ein flaches Objekt (gleiches Muster, nur ohne Options-Parameter, weil nicht gebraucht).
- Das Leeren-Button-onClick (`setAnimeSearchInput(""); ...`) wurde als benannte Funktion `clearAnimeSearch` im Hook gekapselt statt als Inline-Closure in der JSX — identische Logik, bessere Lesbarkeit, keine Verhaltensänderung.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- `cd frontend && npx tsc --noEmit` — grün nach Task 1 und nach Task 2.
- `cd frontend && npx eslint .` — 0 neue Errors nach beiden Tasks (4 bestehende, nicht von diesem Plan verursachte Errors in unveränderten Dateien: `capture-responsive.cjs`, `useReleaseVersionMedia.ts`, `CapabilityDetailRow.tsx`; nur Pre-existing `no-restricted-syntax`-Warnings auf native `<input>`/`<select>`, identisch zum Vorzustand, nicht Teil dieses Plans).
- `cd frontend && npx vitest run` — nach Task 1 und nach Task 2 identisch: 385 passed / 4 failed Test-Dateien, 3536 passed / 3 failed Tests. Alle 4 fehlschlagenden Dateien sind umgebungsbedingt (benötigen `API_INTERNAL_URL` im Compose-Container bzw. den absoluten Pfad `/backend/internal/permissions/permissions.go`, der außerhalb des Containers nicht existiert) und unverändert zum Zustand vor diesem Plan — keine neuen Fehlschläge durch diesen Plan.
- `grep -c "export default function" frontend/src/app/admin/episodes/page.tsx` → 1.
- `wc -l frontend/src/app/admin/episodes/page.tsx` → 423; `wc -l frontend/src/app/admin/episodes/useAdminEpisodesPage.ts` → 317.
- `grep -l "\.\.\.sharedStyles"` über alle 4 Cluster-Dateien → 0 Treffer; `grep -l "mergeCssModules(browserStyles, sharedStyles)"` → 4 Treffer.
- `docker restart team4sv30-frontend` nach allen Frontend-Edits einmalig ausgeführt, Container läuft wieder (`Up`).

## Self-Check: PASSED

- Alle 5 erstellten/geänderten Dateien auf Disk gefunden.
- Beide Task-Commits (`42fc4bc6e`, `44b1f858a`) in `git log --oneline --all` gefunden.

---
phase: 184-aufr-umpunkte-aus-phase-174-abschlie-en-tote-css-klassen-in-
plan: 08
subsystem: ui
tags: [css-modules, react, nextjs, refactor, admin-anime]

# Dependency graph
requires:
  - phase: 184-03
    provides: "frontend/src/lib/mergeCssModules.ts (Proxy-basierter mergeCssModules(own, shared)-Helfer)"
provides:
  - "AnimeContext-Cluster (3 Dateien) und EpisodeManager-Cluster (8 Dateien, inkl. 3-fach-Merge-Sonderfall EpisodeEditForm.tsx) nutzen ausschließlich mergeCssModules statt des kaputten Spread-Musters"
affects: [184-09, 184-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Verschachtelter mergeCssModules-Aufruf für 3-Wege-Merges: mergeCssModules(own, mergeCssModules(middle, shared)) erhält die Vorrangreihenfolge own > middle > shared exakt wie der vorherige 3-fach-Spread"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubs.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeBulkBar.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeCreateForm.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeFilters.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeInlineEdit.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeRow.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeTable.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx

key-decisions:
  - "Alle 11 Dateien lagen bereits unter 450 Zeilen (größte: EpisodeManager.tsx mit 367 Zeilen) — kein D-05-Split nötig, reine Helfer-Umstellung wie im Plan vorgesehen."
  - "Beide Tasks in einem Commit zusammengefasst, da Task 1 nur eine Zwischenverifikation ohne eigenen Commit vorsah (volles Gate und Commit erst nach Task 2 laut Plan)."

requirements-completed: [D-01]

# Metrics
duration: 20min
completed: 2026-10-15
---

# Phase 184 Plan 08: AnimeContext/EpisodeManager-Cluster auf mergeCssModules umstellen Summary

**Alle 11 Dateien des AnimeContext- und EpisodeManager-Clusters rufen jetzt den zentralen `mergeCssModules`-Helfer statt des latent fehlerhaften Spread-Merge-Musters, inklusive korrekt verschachteltem 3-Wege-Merge in `EpisodeEditForm.tsx`.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-15
- **Tasks:** 2/2 completed
- **Files modified:** 11

## Accomplishments
- 3 AnimeContext-Dateien: `{ ...sharedStyles, ...contextStyles }` → `mergeCssModules(contextStyles, sharedStyles)`
- 7 EpisodeManager-Dateien (2er-Merge): `{ ...sharedStyles, ...episodeStyles }` → `mergeCssModules(episodeStyles, sharedStyles)`
- `EpisodeEditForm.tsx` (3er-Merge-Sonderfall): `{ ...sharedStyles, ...contextStyles, ...episodeStyles }` → `mergeCssModules(episodeStyles, mergeCssModules(contextStyles, sharedStyles))`, Vorrangreihenfolge episodeStyles > contextStyles > sharedStyles exakt erhalten
- `tsc --noEmit` und `eslint .` grün für alle 11 Dateien; Frontend-Container nach Abschluss neu gestartet

## Task Commits

Beide Tasks (Umstellung + Verifikation) sind in einem inhaltlichen Commit zusammengefasst, da Task 1 im Plan keinen eigenen Commit vorsah:

1. **Task 1+2: AnimeContext-Cluster + EpisodeManager-Cluster (11 Dateien) auf mergeCssModules umgestellt** - `ce5c27674` (refactor)

_Kein separater Plan-Metadaten-Commit in diesem Lauf — folgt im abschließenden State-Update-Schritt._

## Files Created/Modified
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx` - Spread-Merge durch `mergeCssModules(contextStyles, sharedStyles)` ersetzt
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` - dito
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubs.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeBulkBar.tsx` - Spread-Merge durch `mergeCssModules(episodeStyles, sharedStyles)` ersetzt
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeCreateForm.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeFilters.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeInlineEdit.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeRow.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeTable.tsx` - dito
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx` - Dreifach-Spread durch verschachtelten `mergeCssModules(episodeStyles, mergeCssModules(contextStyles, sharedStyles))` ersetzt

## Decisions Made
- Keine Datei-Aufteilung nötig (alle 11 Dateien unter 450 Zeilen, laut 184-CONTEXT.md-Inventur bereits vorab bestätigt).
- Ein einziger inhaltlicher Commit für beide Tasks, da der Plan für Task 1 nur eine Zwischen-Acceptance-Verifikation ohne eigenen Commit vorsah.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — reine clientseitige Styling-Konsolidierung ohne neue Netzwerk-/Auth-/Datei-Zugriffspfade, wie im Plan-Threat-Model (`T-184-08-01`, disposition: accept) vorgesehen.

## Verification

- `grep -l "\.\.\.sharedStyles" <7 Dateien aus Task 1>` → 0 Treffer
- `grep -l "mergeCssModules(" <7 Dateien aus Task 1>` → 7 Treffer
- `grep -c "\.\.\.sharedStyles\|\.\.\.contextStyles\|\.\.\.episodeStyles" <4 Dateien aus Task 2>` → 0 über alle 4 Dateien summiert
- `grep -c "mergeCssModules(episodeStyles, mergeCssModules(contextStyles, sharedStyles))" EpisodeEditForm.tsx` → 1
- `cd frontend && npx tsc --noEmit` → grün, keine Ausgabe
- `cd frontend && npx eslint .` → 4 Fehler, aber alle 4 in unberührten Dateien (`capture-responsive.cjs`, `CapabilityDetailRow.tsx`, `useReleaseVersionMedia.ts`) — vorbestehend, außerhalb des Scopes dieses Plans (Scope Boundary, nicht Rule 1/2/3). Keine Fehler in den 11 Plan-Dateien, nur vorbestehende Design-System-Warnungen (natives `<input>`/`<select>`), die nicht Teil des F-12-Scopes sind.
- `cd frontend && npx vitest run` → 3 Tests in 3 Dateien fehlgeschlagen (`ResponsiveImage.config.test.ts`, `anime-detail-contract.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts`), alle drei thematisch und dateilich vollständig unabhängig vom AnimeContext-/EpisodeManager-Cluster (Remote-Image-Patterns, OpenAPI-Contract, Backend-Pfad-Dateizugriff auf einen in dieser Umgebung nicht vorhandenen absoluten Pfad `/backend/...`) — vorbestehende, nicht durch diesen Plan verursachte Fehler, daher nicht behoben (Scope Boundary). Der einzige vorhandene Komponenten-Test im Scope (`EpisodeBulkBar.test.tsx`) läuft isoliert grün.
- `docker restart team4sv30-frontend` ausgeführt, Container läuft wieder sauber (`Ready in 1370ms`, Seite `/admin/fansubs/24/edit` kompiliert und liefert 200).

## Deferred Issues (out of scope, logged not fixed)

Siehe oben unter Verification — 3 vorbestehende Testfehler und 4 vorbestehende ESLint-Fehler in Dateien außerhalb dieses Plans wurden identifiziert, aber gemäß Scope-Boundary-Regel nicht behoben.

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx
- FOUND: frontend/src/app/admin/anime/components/EpisodeManager/EpisodeEditForm.tsx
- FOUND commit ce5c27674 in `git log --oneline --all`

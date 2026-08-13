---
phase: 26-segment-source-asset-upload-and-persistence
plan: "02"
subsystem: segment-asset-frontend
tags: [upload-ui, asset-display, delete-asset, segment-panel, modularity]
dependency_graph:
  requires: [26-01]
  provides: [segment-asset-upload-ui, segment-asset-delete-ui, asset-display-in-table]
  affects: [SegmenteTab, SegmentEditPanel, SegmenteTab.helpers]
tech_stack:
  added: [SegmentEditPanel, SegmenteTab.helpers]
  patterns: [extract-sub-component, upload-on-file-select, reload-after-mutation]
key_files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.helpers.tsx
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css
decisions:
  - SegmentEditPanel extracted as sub-component to keep SegmenteTab.tsx at exactly 450 lines (CLAUDE.md limit)
  - Pure helpers and SegmentTimeline extracted to SegmenteTab.helpers.tsx
  - Upload triggers immediately on file selection (no separate Submit button) for minimal friction
  - Asset state (source_ref/source_label) refreshed from API response after upload rather than computed locally
  - resolveSourceLabel derives filename from source_ref path when source_label is absent
metrics:
  duration: "~6 min"
  completed: "2026-04-27"
  tasks: 3
  files: 4
---

# Phase 26 Plan 02: Segment Asset Upload and Persistence — Summary

Upload-UI, Asset-Anzeige und Delete-Aktion im Segment-Panel fuer `release_asset`-Segmente; Panel-Code in SegmentEditPanel und SegmenteTab.helpers aufgeteilt um das 450-Zeilen-Limit einzuhalten.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Upload-UI fuer gespeicherte release_asset-Segmente | fa31f044 | SegmenteTab.tsx, SegmenteTab.module.css, SegmentEditPanel.tsx, SegmenteTab.helpers.tsx |
| 2 | Hinterlegte Datei anzeigen und entfernen | fa31f044 | SegmentEditPanel.tsx, SegmenteTab.helpers.tsx |
| 3 | Hook-State nach Asset-Aktionen sauber reloaden | fa31f044 | SegmenteTab.tsx (handleAssetUpload/handleAssetDelete) |

## What Was Built

### Upload-UI (Task 1)

Im Segment-Panel erscheint bei `source_type === 'release_asset'` eine "Segment-Datei"-Sektion:

- **Neues/ungespeichertes Segment**: Hilfetext "Segment zuerst speichern, danach Datei hochladen"
- **Gespeichertes Segment ohne Datei**: Datei-Picker (accept: mp4/webm/mkv), Format- und Groessen-Hinweis (Max. 150 MB), Upload startet sofort bei Dateiauswahl, Busy-State zeigt "Wird hochgeladen..."
- **API-Fehler** werden direkt in der Sektion angezeigt

### Asset-Anzeige und Delete (Task 2)

Wenn `source_ref != null` (Datei hinterlegt):
- Dateiname/source_label mit FileVideo-Icon anzeigen
- Sekundaer: vollstaendiger `source_ref`-Pfad
- Button "Datei entfernen" mit confirm-Dialog
- Nach Delete: `reload()`, Panel-Formular auf `sourceType: none` zurueckgesetzt

Tabellenspalte "Quelle" zeigt bei `release_asset`:
- `source_label` wenn vorhanden, sonst
- Dateiname aus `source_ref`-Pfad (z.B. `Datei: op1-creditless.mp4`), sonst
- `Release-Asset (keine Datei)` als Fallback

### Hook-State Reload (Task 3)

`handleAssetUpload` und `handleAssetDelete` rufen beide nach Erfolg `reload()` auf, sodass:
- Tabelle aktualisierte `source_ref`/`source_label` anzeigt
- Panel mit frischen Segmentdaten aktualisiert wird
- `setEditingSegment(res.data)` nach Upload setzt aktuelle Segment-Instanz im Panel

### Modularisierung (Deviation Rule 2 / CLAUDE.md)

SegmenteTab.tsx war nach den Aenderungen bei 801 Zeilen. CLAUDE.md schreibt max. 450 Zeilen vor. Aufgeteilt in:
- `SegmenteTab.helpers.tsx` (176 Zeilen): Badge-Helfer, Zeit-Helfer, `resolveSourceLabel`, `isSegmentActiveForEpisode`, `SegmentTimeline`
- `SegmentEditPanel.tsx` (247 Zeilen): Komplettes Panel-JSX mit Formular, Quell-Selector, Asset-Sektion
- `SegmenteTab.tsx` (450 Zeilen): Haupt-Komponente mit State, Handlern, Tabelle, Suggestions

## Deviations from Plan

### Auto-added: CLAUDE.md Modularity Split

**Rule 2 - Missing critical functionality (CLAUDE.md compliance)**
- **Found during:** Task 1 — after adding upload/delete code, file reached 801 lines
- **Issue:** CLAUDE.md mandates production code files at or below 450 lines
- **Fix:** Extracted helpers to SegmenteTab.helpers.tsx, panel JSX to SegmentEditPanel.tsx
- **Files created:** SegmenteTab.helpers.tsx, SegmentEditPanel.tsx
- **Commit:** fa31f044

## Known Stubs

None. Upload triggers real `uploadSegmentAsset` API call. Delete triggers real `deleteSegmentAsset`. State reloads from live API after both operations.

## Self-Check: PASSED

- SegmentEditPanel.tsx: EXISTS
- SegmenteTab.helpers.tsx: EXISTS
- SegmenteTab.tsx: 450 lines (at limit)
- npx tsc --noEmit (plan files): PASSED (no errors in plan files)
- `uploadSegmentAsset` called in handleAssetUpload: CONFIRMED
- `deleteSegmentAsset` called in handleAssetDelete: CONFIRMED
- `reload()` called after upload and delete: CONFIRMED
- Asset display with source_ref/source_label: CONFIRMED in SegmentEditPanel.tsx
- Table resolveSourceLabel shows filename: CONFIRMED in SegmenteTab.helpers.tsx

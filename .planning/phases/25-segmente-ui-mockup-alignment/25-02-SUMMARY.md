---
phase: 25-segmente-ui-mockup-alignment
plan: 02
subsystem: frontend-segmente-ui
tags: [segments, frontend, breadcrumb, tabs, timeline, suggestions, source-type]
dependency_graph:
  requires: [25-01]
  provides: [EpisodeVersionEditorPage-5tabs, SegmenteTab-suggestions, SegmenteTab-dual-spur-timeline, SegmenteTab-source-type-selector]
  affects:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css
tech_stack:
  added: []
  patterns: [sub-component-timeline, source-type-enum-selector, suggestions-bar, active-row-highlight, dropdown-action-menu]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css
decisions:
  - 5-Tab-Layout mit default Informationen-Tab; Uebersicht und Changelog als ehrliche Stubs
  - episodeNumber aus version.episode_number an SegmenteTab weitergegeben fuer aktive-Semantik
  - Source-Type-Selector mit drei expliziten Optionen statt freiem Jellyfin-Picker; Hilfstext je Option
  - Dreipunkt-Dropdown fuer Loeschen statt direktem Danger-Button in der Tabelle
  - Dual-Spur-Timeline: obere Spur fuer IN/PV, untere fuer OP/ED mit Hauptinhalt-Block zwischen OP-Ende und ED-Start
metrics:
  duration: 4min
  completed: "2026-04-27T09:55:00Z"
  tasks: 2
  files: 4
---

# Phase 25 Plan 02: Frontend Mockup-Alignment — Breadcrumb, 5 Tabs, SegmenteTab-Verbesserungen Summary

Vollstaendiges Frontend-Mockup-Alignment: EpisodeVersionEditorPage erhaelt Breadcrumb-Navigation und 5-Tab-Layout; SegmenteTab erhaelt Vorschlaege-Leiste, dual-Spur-Timeline mit Hauptinhalt-Label, lesbaren Quelltyp und expliziten Source-Type-Selector.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SegmenteTab verbessern (Tabelle, Vorschlaege, Timeline, Formular) | b1bad3ce | SegmenteTab.tsx, SegmenteTab.module.css |
| 2 | EpisodeVersionEditorPage — Breadcrumb und 5 Tabs | a4d657bb | EpisodeVersionEditorPage.tsx, EpisodeVersionEditor.module.css |

## What Was Built

**Task 1 — SegmenteTab:**
- Props um `episodeNumber?: number | null` erweitert
- Tabellen-Spalten: Typ-Badge | Name | Episoden (Einzelepisode als `3` statt `3 - 3`) | Zeitbereich mit Dauer `00:00:30 - 00:01:45 (01:15)` | Quelle (lesbares Label) | Aktionen
- Quelle-Spalte: `resolveSourceLabel()` mapped `source_type` zu deutschem Label; Legacy `source_jellyfin_item_id` faellt auf `Jellyfin Serien-Theme` zurueck
- Aktionen-Spalte: Bearbeiten-Button + Dreipunkt-Menue mit Loeschen-Dropdown
- Vorschlaege-Leiste: laedt via `getAnimeSegmentSuggestions()` wenn `episodeNumber` gesetzt; `Uebernehmen` kopiert Segment in aktuelle Release-Kombination
- Timeline: `SegmentTimeline` Sub-Komponente, obere Spur fuer IN/PV, untere fuer OP/ED, grauer `Hauptinhalt`-Block zwischen OP-Ende und ED-Start
- Formular: expliziter Source-Type-Selector (`Keine Quelle` / `Jellyfin Serien-Theme` / `Datei aus Release-Ordner`) mit kontext-sensitivem Hilfstext; kein freier Jellyfin-Picker
- Aktive-Semantik: Zeilen mit `isSegmentActiveForEpisode()` werden gruenlich hervorgehoben; Toolbar-Titel lautet `Aktive Segmente fuer Episode N`

**Task 2 — EpisodeVersionEditorPage:**
- Breadcrumb: Anime > [Anime-Titel] > Episode [N] > [Gruppe] v1
- 5 Tabs: Uebersicht (Stub), Dateien (Scan/Dateiauswahl), Informationen (Metadaten-Formular), Segmente (SegmenteTab), Changelog (Stub)
- Default-Tab: Informationen
- `episodeNumber` aus `version.episode_number` an `SegmenteTab` uebergeben

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- **Uebersicht-Tab**: Zeigt nur Basis-Kontext (Anime, Episode, Gruppe). Detaillierte Uebersicht in spaeterem Plan.
- **Changelog-Tab**: Zeigt Placeholder-Text. Changelog-Eintraege in spaeterem Plan.
- **Source-Type-Selector**: Jellyfin-Verknuepfung und Release-Asset-Selector sind Textstubs; echte Selektoren in Phase 25 Plan 03 oder spaeter.

Diese Stubs verhindern nicht das Planziel: Breadcrumb, 5-Tab-Layout, korrekte Segmente-Verwaltung und Vorschlaege sind vollstaendig implementiert.

## Self-Check: PASSED

- `EpisodeVersionEditorPage.tsx` — Breadcrumb 5-Tab-Layout vorhanden — FOUND
- `SegmenteTab.tsx` — episodeNumber prop, suggestions, dual-spur timeline, source-type selector — FOUND
- `npx tsc --noEmit` fuer episode-versions files — keine Fehler
- Commits: b1bad3ce, a4d657bb — FOUND

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
  patterns: [tab-navigation, inline-expandable-rows, existing-api-reuse]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
decisions:
  - Fansub-Edit nutzt eine Top-Level-Tab-Leiste statt eines globalen Release-Drawers.
  - Anime & Releases ist ein eigener Tab und bleibt der Einstieg fuer Release-Kontext.
  - Release-Zeilen werden inline ausklappbar; dadurch bleibt der Anime/Fansub-Kontext sichtbar.
  - Der alte "Releases neu laden"-Use-Case wird bewusst nicht eingebaut.
  - OP/ED bleibt ausserhalb des Release-Tabs, weil das nicht zum generischen Release-Media-Kontext gehoert.
metrics:
  completed_date: "2026-04-30"
---

# Phase 31 Plan 01 Summary

Der Fansub-Edit-Workspace hat jetzt eine Top-Level-Tab-Leiste mit `Anime & Releases` als eigener Arbeitsflaeche. Die bestehende Form wird nur in den Stammdaten-Tabs angezeigt; der Release-Tab zeigt Anime-Gruppen und konkrete Releases.

## Was gebaut wurde

- `activeMainTab` steuert die Haupt-Tabs `Basic Information`, `Tags / Aliases`, `Description / History`, `Media`, `Community Links`, `Collaboration Members` und `Anime & Releases`.
- Release-Daten werden ueber die vorhandenen Phase-30-APIs geladen und pro Anime gruppiert.
- Release-Zeilen sind inline ausklappbar und behalten Links zu `Versionen` und `Release ansehen`.
- OP/ED wird im neuen Release-Tab nicht angezeigt, damit der Release-Kontext sauber bei Anime/Releases/Theme-Segmenten bleibt.

## Offene Erweiterung

Der ausgeklappte Release-Bereich wurde in Plan 31-02/31-03 mit echten Theme-/Segment-Karten und einer vorbereiteten Segment-Bearbeitungsflaeche erweitert.

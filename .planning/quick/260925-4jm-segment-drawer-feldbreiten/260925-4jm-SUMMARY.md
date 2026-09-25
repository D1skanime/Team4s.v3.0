# Quick Task 260925-4jm: Segment-Drawer-Feldbreiten ausbalancieren

**Status:** complete
**Date:** 2026-09-25
**Phase:** 168

## Ergebnis

- SectionHeader-Beschreibungen im Segment-Drawer nutzen jetzt die gesamte verfügbare Breite.
- Direkte Select-Felder wie Typ und Provenance sind auf maximal 360px begrenzt.
- Unter 640px werden Selects weiterhin auf die verfügbare Breite erweitert.

## Geänderte Dateien

- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.module.css`

## Checks

- Segmenttests: 125/125 bestanden
- `git diff --check`: bestanden

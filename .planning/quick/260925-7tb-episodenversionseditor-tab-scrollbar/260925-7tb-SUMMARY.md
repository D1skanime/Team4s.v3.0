# Quick Task 260925-7tb: Tab-Scrollbar im Episodenversionseditor entfernen

**Status:** complete
**Date:** 2026-09-25
**Phase:** 168

## Ergebnis

- Die Tab-Leiste im Episodenversionseditor blendet sichtbare horizontale und vertikale Scrollbars aus.
- Horizontales Scrollen der Tabs bleibt für schmale Viewports erhalten.
- Die Änderung ist auf `.tabNav` im Editor begrenzt und beeinflusst keine globalen Scrollbereiche.

## Geänderte Dateien

- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css`

## Checks

- `git diff --check` — bestanden
- Fokussierter Editor-Testlauf — gestartet; für die CSS-Änderung existiert kein dedizierter visueller Test
- Menschliche Live-UAT im authentifizierten Browser bleibt empfohlen.

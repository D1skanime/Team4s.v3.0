# Quick Task 260925-5np: Media-Tab-Kontext und Status-Chips bereinigen

**Status:** complete
**Date:** 2026-09-25
**Phase:** 168

## Ergebnis

- Die redundante Fansub-/Release-Kontextkarte des Media-Tabs wurde entfernt.
- Die zweite Kontextzeile innerhalb der Media-Komponente wurde entfernt.
- Kategorie, Review-Status und Sichtbarkeit eines Mediums werden in `.mediaMeta` nebeneinander dargestellt und können responsiv umbrechen.
- Legacy-Props bleiben für externe Aufrufer optional typkompatibel, werden aber nicht mehr als doppelte Karte gerendert.

## Geänderte Dateien

- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`

## Checks

- Media- und Seitentests: 55/55 bestanden
- Typecheck: bestanden
- `git diff --check`: bestanden

# Quick Plan 260925-kae

## Umsetzung

1. Vorhandene Episode-Klassifizierungsoptionen und Admin-Update-Funktion wiederverwenden.
2. In der bestehenden Auswahlleiste optionale Dropdowns für Canon/Filler und Episodentyp ergänzen.
3. Sammelaktion mit Bestätigungsdialog, Fortschritt, Fehler-/Erfolgsmeldung und lokaler Aktualisierung ergänzen.
4. Typecheck, fokussierte Tests, ESLint und Diff-Prüfung ausführen.

## Relevante Dateien

- `frontend/src/components/episodes/EpisodesOverview/EpisodesOverview.tsx`
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx`
- `frontend/src/components/ui/ConfirmDialog.tsx`
- `frontend/src/lib/api.ts`

## Akzeptanzkriterien

- Bei ausgewählten Episoden stehen Canon/Filler und Episodentyp als optionale Sammelfelder zur Verfügung.
- Ein leeres Sammelfeld ändert das jeweilige Merkmal nicht.
- Das Anwenden fragt vor der Änderung nach Bestätigung und zeigt Fortschritt sowie Ergebnis.
- Einzelbearbeitung und Fansub-Gruppen-Sammelaktion bleiben funktionsfähig.

# Quick Task 260925-kae: Bulk-Klassifizierung für Episoden

**Status:** complete
**Date:** 2026-09-25

## Ergebnis

- Die bestehende Episodenauswahl kann jetzt mehrere Episoden gleichzeitig als Canon/Filler und/oder Episodentyp klassifizieren.
- Beide Änderungen sind unabhängig: „nicht ändern“ lässt das jeweilige Merkmal unverändert.
- Das Anwenden nutzt den bestehenden Bestätigungsdialog, zeigt Fortschritt und aktualisiert die sichtbaren Klassifizierungen.
- Die bestehenden Klassifizierungsoptionen und der vorhandene Admin-Episode-Endpunkt werden wiederverwendet.

## Geänderte Dateien

- `frontend/src/components/episodes/EpisodesOverview/EpisodesOverview.tsx`
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx`

## Checks

- TypeScript: `npm run typecheck` bestanden
- Fokussierte Vitest-Tests: 16/16 bestanden
- ESLint auf den geänderten Dateien: bestanden
- `git diff --check`: bestanden

## UAT-Hinweis

Die authentifizierte Browser-Sichtprüfung der Sammelaktion bleibt als menschlicher UAT-Schritt offen. Zu prüfen: mehrere Episoden auswählen, nur Canon/Filler ändern, nur Episodentyp ändern und beide Felder gemeinsam anwenden.

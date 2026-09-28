# Quick Summary 260928-6qr

Der Upload-Bereich für Gruppenmedien wurde an den globalen Upload-Stil angeglichen. Der sichtbare native Datei-Input wurde durch eine zugängliche Dropzone mit globalem Secondary-Button ersetzt. Drag-and-drop zeigt einen aktiven Zustand, Mehrfachauswahl wird kompakt zusammengefasst und der Upload-Button verwendet nun den globalen Loading-Zustand.

Die bestehende fachliche Upload-Kette (`uploadFansubGroupMedia`) und die Kategorie-/Review-/Visibility-Werte wurden nicht verändert. Ergänzt wurde ein fokussierter Regressionstest für Drag-and-drop.

## Checks

- `GroupMediaReviewSection.test.tsx`: 23/23 Tests bestanden
- fokussiertes ESLint: bestanden
- `git diff --check`: bestanden
- Typecheck: bestehende, unabhängige Fehler in Next-Generated-Types und Release-Detail-Fixtures; keine Fehler im geänderten Upload-Bereich
- Live-UAT: Route erreichbar, aber aktuell ohne Anmeldung; die Seite zeigt deshalb nur den Auth-Hinweis. Der geschützte Upload-Flow wurde nicht mutiert.

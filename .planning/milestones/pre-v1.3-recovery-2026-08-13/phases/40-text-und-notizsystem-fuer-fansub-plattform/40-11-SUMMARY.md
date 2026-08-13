# 40-11 Summary

## Ergebnis

Die Lücke bei `anime_fansub_project_notes` ist geschlossen: Projekttexte sind jetzt fachlich an die kanonische Zuordnung in `anime_fansub_groups` gebunden.

## Umgesetzt

- Neue Migration `0066_anime_fansub_project_notes_context_guard` ergänzt einen zusammengesetzten FK auf `anime_fansub_groups` und stoppt mit klarer Fehlermeldung, falls Alt-Daten ohne gültigen Kontext existieren.
- Das Repository validiert `anime_id` plus `fansub_group_id` vor `GET` und `UPSERT` explizit gegen `anime_fansub_groups`.
- Für ungültige Kontexte verwendet das Backend jetzt den klaren Fehler `ErrInvalidAnimeFansubContext`.
- Der Delete-Pfad ist auf `note_id + anime_id + fansub_group_id` eingegrenzt und kann keine fremde Projektnotiz mehr nur über die nackte ID löschen.
- Source-Invariant-Tests sichern Migration, Repository-Guard und Handler-Fehlermapping gegen Regressionen ab.

## Verifikation

- `cd backend && go test ./internal/repository ./internal/handlers -run "AnimeProjectNotes|ProjectNoteSourceInvariants" -count=1`
- `cd backend && go build ./...`
- `git diff --check`

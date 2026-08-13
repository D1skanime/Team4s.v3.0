# 40-12 Summary

## Ergebnis

`release_version_notes` werden jetzt serverseitig gegen die tatsächlich gültigen Member/Rollen der betroffenen Release-Version validiert.

## Umgesetzt

- Das Repository lädt die erlaubten `(member_id, role_id)`-Paare für die konkrete `release_version` über den kanonischen Join `release_versions -> release_member_roles`.
- Jede Bulk-Note wird vor Insert oder Update gegen diese erlaubten Paare geprüft.
- Für Updates wird zusätzlich validiert, dass die gespeicherte Note wirklich zur mitgeschickten `member_id`/`role_id`-Paarung gehört.
- Ungültige Contributor-Kontexte liefern jetzt den expliziten Domain-Fehler `ErrInvalidReleaseVersionContributorContext`.
- Der Handler mappt diesen Fall auf eine klare 400-Antwort; Duplicate-Notes bleiben weiter sauber als 409 unterscheidbar.
- Die Frontend-Regression deckt die neue fachliche Fehlermeldung für den Bulk-Save ab.

## Verifikation

- `cd backend && go test ./internal/repository ./internal/handlers -run "ReleaseVersionNotes|ContributorGuardSourceInvariants" -count=1`
- `cd backend && go build ./internal/repository ./internal/handlers ./internal/services`
- `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionNotesTab.test.tsx"`
- `git diff --check`

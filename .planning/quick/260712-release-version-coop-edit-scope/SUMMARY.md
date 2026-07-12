---
status: complete
date: 2026-07-12
---

# Summary

Quick-Fix abgeschlossen:

- Release-Version-Media liefert jetzt `can_update` und `can_delete` pro Item und prueft Mutationen gegen die beitragende Fansubgruppe.
- Release-Version-Notizen markieren Member/Rollen mit `CanEdit` und blockieren Bulk-Upsert/Delete fuer gruppenfremde Rollen.
- Der Episode-Version-Editor zeigt fremde Coop-Beitraege weiterhin an, schaltet Bearbeiten/Loeschen aber readonly.
- Shared Contracts wurden fuer die Media-Editierbarkeitsflags ergaenzt.
- Tests decken ab, dass sichtbare fremde Coop-Beitraege nicht mehr editierbar sind.

Checks:

- `go test ./internal/handlers ./internal/repository`
- `npm test -- --run ReleaseVersionMediaSection ReleaseVersionNotesTab`
- `npm run typecheck`
- `npm run lint -- --quiet`
- `git diff --check`

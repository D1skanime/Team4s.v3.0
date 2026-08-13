---
phase: 69-fansub-contributions-contract-und-permission-haertung
plan: 05
status: complete
completed_at: 2026-06-03
provides:
  - fansub-group-members-contracts
  - fansub-member-roles-contracts
  - admin-fansub-anime-contributions-contracts
---

# Phase 69 Plan 05: OpenAPI Contract Summary

**One-liner:** Fehlende Contract-Eintraege fuer Admin-Group-Members, Member-Roles und Anime-Contributions nachgezogen.

## Implementiert

- `shared/contracts/fansubs.yaml`
  - 4 Endpunkte fuer `group-members` dokumentiert.
  - 4 Endpunkte fuer `member-roles` dokumentiert.
  - `member_id` ist beim Rollen-List-Endpunkt als required Query-Parameter dokumentiert.
  - Permission-Anforderungen sind als `fansub_group.members.view` bzw. `fansub_group.members.manage` dokumentiert.
  - Auto-Create- und Cross-Group-Hinweise sind in Notes/Error-Responses enthalten.

- `shared/contracts/admin-content.yaml`
  - 4 Endpunkte fuer `/api/v1/admin/fansubs/{id}/anime/{animeId}/contributions` dokumentiert.
  - `{data: ...}`-Responses, Status-Enum und `ON CONFLICT DO UPDATE`/Upsert-Semantik sind dokumentiert.
  - Route-Scoping fuer Fansub/Anime/Contribution ist in Error-Responses und Notes festgehalten.

## Verifikation

- `Select-String 'name: fansub-group-members|name: fansub-member-roles' shared/contracts/fansubs.yaml` ergibt 8 Treffer.
- `Select-String 'name: admin-fansub-anime-contributions' shared/contracts/admin-content.yaml` ergibt 4 Treffer.
- `Select-String 'member_id' shared/contracts/fansubs.yaml` bestaetigt den required Query-Parameter.
- `Select-String 'ON CONFLICT|DO UPDATE|upsert' shared/contracts/admin-content.yaml` bestaetigt dokumentierte Upsert-Semantik.
- `git diff --check -- shared/contracts/fansubs.yaml shared/contracts/admin-content.yaml` ohne Whitespace-Fehler.

## Offene Punkte

Keine fuer Plan 05.

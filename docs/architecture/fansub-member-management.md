# Fansub Member Management

## Ziel
Phase 45 führt die app-user-basierte Mitgliederverwaltung pro Fansub-Gruppe als kanonischen Admin-Seam ein.

## Quellen der Wahrheit
- Identität und Login kommen aus Keycloak.
- Team4s verwaltet `app_users`, `app_user_global_roles`, `fansub_group_members` und `fansub_group_member_roles`.
- `fansub_members` bleibt eine Legacy-/Contributor-Struktur und ist keine Quelle für App-Berechtigungen.

## Relevante Permissions
- `fansub_group.members.view`
- `fansub_group.members.manage`

Die UI wertet nur Capabilities aus. Sie leitet nie aus Rollennamen ab, ob Buttons sichtbar sein dürfen.

## Rollenmodell
Erlaubte Gruppenrollen sind:
- `fansub_lead`
- `project_lead`
- `translator`
- `timer`
- `typesetter`
- `editor`
- `encoder`
- `raw_provider`
- `quality_checker`
- `designer`

Nur Rollen, die in der zentralen Permission-Matrix hinterlegt sind, dürfen gespeichert werden.

## Self-Lockout
Das Backend schützt zwei Invarianten:
- Der letzte aktive `fansub_lead` darf nicht entfernt oder deaktiviert werden.
- Die letzte aktive Mitgliedschaft mit `fansub_group.members.manage` darf nicht entfernt oder deaktiviert werden.

Verletzungen liefern `409 Conflict` mit einer verständlichen Fehlermeldung.

## Admin-API
- `GET /api/v1/admin/fansubs/:id/app-members`
- `GET /api/v1/admin/fansubs/:id/app-member-candidates?q=...`
- `POST /api/v1/admin/fansubs/:id/app-members`
- `PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/roles`
- `PUT /api/v1/admin/fansubs/:id/app-members/:appUserId/status`

## Audit
Member-Mutationen werden über `audit_logs` protokolliert:
- `fansub_group_member.created`
- `fansub_group_member_role.updated`
- `fansub_group_member.deactivated`
- `fansub_group_member.reactivated`
- `fansub_group_member_role.blocked`
- denied Events für fehlende Gruppenberechtigung

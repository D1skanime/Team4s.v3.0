# Code-Altlasten und Domain-Audit Roadmap

Datum: 2026-05-25
Status: rekonstruiert aus aktuellem Repo-Stand und den festgehaltenen Entscheidungen

## Kontext

Diese Quick-Roadmap verfolgt die Sanierung aus dem Code-Altlasten- und Domain-Audit. Der urspruengliche Quick-Ordner war im aktuellen Workspace nicht mehr vorhanden und wurde fuer die weitere Arbeit rekonstruiert.

## Entscheidungen

- `release_version_media` ist kanonisch fuer versionierte Admin-/Fansub-Prozessmedien.
- Release-Version-Media muss mit echter `release_version_id` adressiert werden.
- `release_media` bleibt ein separater Release-Level-/Public-/Legacy-Pfad und ist kein Ersatz fuer versionierte Prozessmedien.
- Keine Rueckfuehrung von Admin-/Fansub-Prozessmedien auf `release_media`.
- Keine neue Migration fuer `release_version_groups.fansubgroup_id`; Migration `0057_drop_release_version_groups_fansubgroup_id` existiert und ist in der lokalen DB angewendet.

## Arbeitspakete

### WP-01 release-media-domain-decision

Status: erledigt

Ergebnis:
- Entscheidung in `DECISIONS.md` festgehalten.
- Live-DB bestaetigt `release_version_media.release_version_id -> release_versions.id`.
- `release_media` ist lokal leer und bleibt nur als separater Release-Level-/Public-/Legacy-Pfad relevant.

### WP-02 fansub-drawer-release-version-id

Status: umgesetzt in diesem Quick-Schnitt

Ziel:
- Der Fansub-Release-Drawer darf `release_id` nicht als `versionId` fuer Release-Version-Media verwenden.

Umsetzung:
- Admin-Release-Summary liefert `release_version_id`.
- Frontend-Typ `AdminFansubRelease` kennt `release_version_id`.
- Drawer uebergibt `drawerRelease.release_version_id` an `ReleaseVersionMediaDrawerSummary`.
- Wenn kein eindeutiger Version-Kontext vorhanden ist, wird kein Media-Summary geladen.
- Regressionstest stellt sicher, dass `useReleaseVersionMedia` mit `release_version_id` und nicht mit `release_id` aufgerufen wird.

### WP-03 release-media-api-contract

Status: offen

Ziel:
- Shared OpenAPI/API-Dokumentation fuer `/api/v1/admin/release-versions/:versionId/media` und die neue `release_version_id` in Admin-Release-Summaries aktualisieren.

### Weitere Cleanup-Pakete

Status: offen

- Legacy-Routen entfernen.
- UI-Duplikate bei Drawer/Card/Table/Upload-Patterns reduzieren.
- Race-Condition-Hardening fuer Release-/Drawer-Ladevorgaenge fortsetzen.
- Tests fuer kritische Domain-Regeln ausbauen.

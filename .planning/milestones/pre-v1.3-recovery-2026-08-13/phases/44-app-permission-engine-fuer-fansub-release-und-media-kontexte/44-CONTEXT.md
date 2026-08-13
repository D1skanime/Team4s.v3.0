# Phase 44: App Permission Engine fuer Fansub-, Release- und Media-Kontexte - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Inline phase brief from user plus current codebase inspection

<domain>
## Phase Boundary

Diese Phase fuehrt die zentrale fachliche Berechtigungslogik fuer Team4s ein.

**Was diese Phase liefern soll:**
- zentrale Permission-Actions fuer Fansub-, Release-, Release-Version-, Media- und Description-Kontexte
- statische Rollenmatrix im Go-Backend
- zentrale PermissionContext-Aufloesung
- `Can(...)` und `RequirePermission(...)`
- group-scope Auswertung auf Basis von Team4s-DB-Rollen
- Absicherung priorisierter Admin-Endpunkte im Backend
- Capability-Responses fuer das Frontend
- minimale Frontend-Integration auf Basis dieser Capabilities
- minimales Audit fuer kritische Mutationen
- automatisierte Tests fuer Engine und zentrale Handler-Szenarien

**Was diese Phase NICHT liefern soll:**
- keinen erneuten Keycloak-Umbau
- keinen dynamischen Permission-Editor
- keine Rollenverwaltung in Keycloak
- keine Join-Requests, Einladungen oder E-Mail-Flows
- keine Public-Site-Berechtigungsmatrix

</domain>

<decisions>
## Locked Decisions

- Keycloak bleibt fuer Identitaet, Login, Session und JWT/OIDC zustaendig; fachliche Rollen und Berechtigungen bleiben in Team4s.
- Das Backend ist die letzte Autoritaet fuer Sicherheitsentscheidungen; das Frontend darf nur Capabilities konsumieren.
- Permission-Pruefungen werden zentralisiert; keine verteilten `if role == ...`-Pruefungen in Handlern oder React-Komponenten.
- Vor jeder neuen Permission-, Audit- oder Migrationsarbeit steht eine Ist-Analyse des vorhandenen Schemas und der bestehenden Code-Struktur; Phase 44 baut bevorzugt auf vorhandenen Tabellen, Services, Repositories, Middleware und API-/UI-Konventionen auf.
- `platform_admin` darf alle Actions.
- Fansub-spezifische Rollen werden aus `fansub_group_member_roles` gelesen, nicht aus Keycloak.
- `fansub_group_member_roles` ist die einzige Quelle fuer App-Berechtigungen innerhalb einer Fansub-Gruppe; fachliche Credit-/Beitragsstrukturen wie `release_member_roles`, `member_episode_notes` oder `member_anime_notes` erteilen keine App-Rechte.
- Phase 44 muss `scope_type = group` produktiv tragen; andere Scopes werden nur vorbereitend modelliert.
- Das Backend soll den fachlichen Kontext ausschliesslich ueber zentrale Resolver aus Release-, Release-Version-, Release-Media- und Description-Targets ableiten; Handler bauen keinen Authz-Kontext selbst zusammen.
- Vom Frontend gelieferte Kontextfelder duerfen nicht blind vertraut werden; bei Widerspruch gewinnt immer der DB-Kontext. Manipulationsverdacht fuehrt nach Projektkonvention zu 403.
- `release_version_groups.fansub_group_id` bleibt die kanonische Fansub-Spalte; das alte `fansubgroup_id` darf nicht wieder eingefuehrt werden.
- Coop-Release-Versionen duerfen aus jeder beteiligten Fansub-Gruppe berechtigen, wenn mindestens eine aktive Gruppenrolle die benoetigte Permission traegt; gruppenfremde Rechte duerfen daraus nicht entstehen.
- `fansub_group.members.manage` bleibt strikt gruppengebunden und darf nie aus einem Coop-Kontext abgeleitet werden.
- Release-Media bleibt im bestehenden `media_files` / `media_assets` / `release_media` bzw. `release_version_media`-Stack; keine parallele Media-Logik.
- `Can()` liefert ein strukturiertes `PermissionResult` mit mindestens `Allowed`, `ReasonCode`, `Reason` und optional `MatchedRole` / `MatchedScope`.
- `RequirePermission()` mappt `PermissionResult` auf 401 bei fehlender Authentifizierung, 403 bei fehlender Berechtigung, 404 bei fehlender Ressource und 403/404 fuer ungueltigen Kontext nach Projektkonvention.
- Ownership fuer `delete_own` wird aus DB-Feldern wie `uploaded_by_user_id` oder `created_by_user_id` aufgeloest; `modified_by_user_id` ist niemals Ownership.
- Wenn der Owner nicht eindeutig aus der Datenbank ableitbar ist, gilt `delete_own` als nicht erlaubt.
- Unberechtigte API-Aufrufe muessen 403 liefern, nicht nur versteckte Buttons im Frontend.
- Wenn fuer User, Rollen, Mitglieder, Audit oder Media-Kontext bereits geeignete Strukturen existieren, werden diese wiederverwendet; neue Parallelstrukturen sind explizit unerwuenscht.
- Nur wenn nach Analyse wirklich eine Luecke bleibt, darf eine minimale Migration nach Projektkonvention geplant werden.
- Wenn fachliche Mehrdeutigkeit bleibt, ist fuer die Ausfuehrung ein BLOCKER mit konkreter Rueckfrage auszugeben statt auf Verdacht zu modellieren.

## Branch-Reality Findings

- Die aktuell sichtbare Branch-Realitaet zeigt noch die alte Signed-Token-/Redis-Auth-Seam in `backend/internal/repository/auth.go`, `backend/internal/middleware/comment_auth.go` und `backend/cmd/server/main.go`.
- `backend/internal/repository/authz.go` und die Handler-Helfer `requireAdmin(...)` werten derzeit eine globale Legacy-Rolle ueber `roles` / `user_roles` aus.
- Im aktuell sichtbaren Code wurden noch keine `app_users`-, `app_user_global_roles`-, `fansub_group_members`- oder `fansub_group_member_roles`-Migrationen gefunden.
- Phase 44 ist deshalb fachlich auf Phase-43-Seams angewiesen, die laut Planungsartefakten erwartet werden, in der aktuell geoeffneten Branch aber noch nicht sichtbar sind.

## Planning Assumption

- Fuer die Phase-44-Planung wird angenommen, dass die Phase-43-Auth-Foundation vor Ausfuehrung von Phase 44 gemerged oder anderweitig verfuegbar gemacht wird.
- Falls diese Seams beim Start von Phase 44 weiterhin fehlen, ist das ein Pre-flight-Blocker und kein stillschweigender Anlass, die Phase-43-Gesamtumsetzung unbemerkt in Phase 44 hineinzuziehen.

</decisions>

<constraints>
## Constraints

- Stop condition aus `AGENTS.md`: keine Aenderung darf Release- oder Fansub-Daten an die falsche Domain-Entitaet haengen.
- `docs/architecture/db-schema-fansub-domain.md` ist die Source of Truth fuer Fansub-/Release-/Media-Grenzen.
- Vor Implementierung muessen bestehende DB-Tabellen, Spalten, Keycloak-Mapping-Felder, Auth-/User-Middleware, Rollen-/Admin-Seams, Audit-Seams und relevante Frontend-API-/UI-Seams explizit geprueft und als Ist-Analyse dokumentiert werden.
- PermissionContext-Aufloesung darf Anime und Episode neutral lassen; Fansub-Kontext entsteht ueber Fansub-Gruppen, Releases und Release-Versionen.
- Context-Resolver muessen mindestens `fansub_group_id`, `release_id`, `release_version_id`, `release_media_id` und Description-Targets unterstuetzen.
- Bestehende Handler haben heute doppelte `requireAdmin(...)`-Hilfen in `AdminContentHandler` und `FansubHandler`; Phase 44 muss diese Zentralisierung sauber aufloesen statt eine dritte ad-hoc Pruefschicht hinzuzufuegen.
- Bestehende Frontend-Auth-Seams in `frontend/src/lib/api.ts` arbeiten noch mit dem aktuellen Bearer-Token-Flow; Phase 44 soll darauf nur minimal capability-seitig aufsetzen, nicht den Login-Flow neu entwerfen.
- Capability-Endpunkte duerfen keine eigene Rollenlogik enthalten, muessen bei fehlendem Leserecht 403 liefern und duerfen nicht global pro User gecacht werden.
- Die UI soll bestehende Projektmuster beibehalten; keine grosse visuelle Neugestaltung.

## Mandatory Pre-Analysis Checklist

- User-/App-User-Tabellen, Keycloak-Mapping-Felder und eventuelle bestehende `app_users`-/`users`-Seams identifizieren.
- Mitgliedschafts- und Rollenstrukturen wie `fansub_group_members`, `fansub_group_member_roles` oder fachlich aehnliche Alternativen identifizieren und die relevanten Felder fuer `fansub_group_id`, `user_id` / `app_user_id`, `role_code`, `scope_type`, `scope_id`, `status`, `active`, `created_by`, `created_at` dokumentieren.
- Vorhandene Audit-Strukturen und die Owner-Felder auf Release-/Media-/Description-Ressourcen dokumentieren, insbesondere `created_by`, `created_by_user_id`, `uploaded_by_user_id` oder aehnliche Spalten.
- Die aktuelle Verbindung zwischen `fansub_releases`, `release_versions`, `release_version_groups`, `release_media`, `media_assets` und `media_files` als Grundlage fuer Resolver und Ownership nachvollziehen.
- Backend-seitig die aktuelle Auth-Middleware, Admin-Seams, Rollenpruefungen, Service-/Repository-Strukturen, Fehler-/Response-Konventionen und Teststruktur dokumentieren.
- Frontend-seitig die Admin-API-Clients, vorhandene Capability-/Permission-/Auth-Hooks, 401/403-Behandlung sowie die relevanten Fansub-/Release-/Media-Ansichten mit Buttons, Tabs, Actions und Drawer-/Detail-State dokumentieren.
- Die spaetere Ausfuehrungsantwort von Phase 44 muss mit einem kurzen Ist-Analyse-Abschnitt starten, der gefundene Tabellen/Spalten, Auth-Seams, Rollenlogik, API-/Frontend-Konventionen, die Wiederverwendungsentscheidung und die Aussage zu neuen Migrationen zusammenfasst.

</constraints>

<canonical_refs>
## Canonical References

### Domain and workflow
- `.planning/ROADMAP.md` - aktive Phasenabfolge und neue Phase-44-Zieldefinition
- `.planning/STATE.md` - zeigt die aktuell sichtbare Branch-/Workflow-Lage
- `AGENTS.md` - lokale Stop-Conditions, Domain-Regeln und Validierungspflichten
- `docs/architecture/db-schema-fansub-domain.md` - kanonische Fansub-/Release-/Media-Grenzen

### Current auth and authz seams
- `backend/cmd/server/main.go` - aktuelle Auth-/Route-Verdrahtung
- `backend/internal/middleware/comment_auth.go` - aktueller Bearer-/Bypass-Auth-Kontext
- `backend/internal/repository/auth.go` - Redis-/Session-basierte Legacy-Auth-Seam
- `backend/internal/repository/authz.go` - aktuelle globale Rollenpruefung ueber `roles` / `user_roles`
- `backend/internal/handlers/admin_content_authz.go` - aktuelles `AdminContentHandler.requireAdmin`
- `backend/internal/handlers/fansub_admin.go` - aktuelles `FansubHandler.requireAdmin`

### Priority backend surfaces to protect
- `backend/internal/handlers/admin_content_fansub_releases_handlers.go` - Release-Lese-Seams im Admin-Kontext
- `backend/internal/handlers/admin_content_release_version_media.go` - Release-Version-Media Upload/Patch/Delete
- `backend/internal/handlers/admin_content_fansub_group_notes.go` - Fansub-Gruppen-Notizen
- `backend/internal/handlers/admin_content_release_version_notes.go` - Release-Version-Notizen
- `backend/internal/handlers/fansub_group_members.go` - Fansub-Mitgliederverwaltung
- `backend/internal/handlers/admin_content_handler.go` - zentrale Admin-Handler-Verdrahtung und Dependencies

### Existing audit and frontend seams
- `backend/internal/repository/admin_content_anime_audit.go` - vorhandenes Beispiel fuer DB-auditiertes Admin-Mutationslogging
- `frontend/src/lib/api.ts` - API-Client-Seam fuer Admin-/Fansub-/Release-Version-Endpunkte
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` - Fansub-Edit-Workspace inklusive Releases/Notes-Zustaende
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx` - Mitgliederverwaltungsseite

</canonical_refs>

<specifics>
## Specific Ideas From Phase Brief

- Beispiel-Actions:
  - `fansub_group.read`
  - `fansub_group.update_basic`
  - `fansub_group.members.view`
  - `fansub_group.members.manage`
  - `release.read`
  - `release.create`
  - `release.update`
  - `release.delete`
  - `release_version.read`
  - `release_version.create`
  - `release_version.update`
  - `release_version.delete`
  - `release_media.read`
  - `release_media.upload`
  - `release_media.update`
  - `release_media.delete`
  - `release_media.delete_own`
  - `description.read`
  - `description.update_release`
  - `description.update_member_role`
  - `description.update_translation`
  - `description.update_qc`
- Beispiel-Rollen:
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
- Beispiel-Capability-Endpunkte:
  - `GET /api/admin/fansub-groups/:id/capabilities`
  - `GET /api/admin/release-versions/:id/capabilities`
- Capability-Regel:
  - jedes Capability-Feld mappt intern auf eine zentrale Permission Action
  - Capabilities sind immer ressourcen-/kontextbezogen
  - nach Rollenwechseln, Kontextwechseln, Drawer-Open und relevanten Mutationen werden sie neu geladen

</specifics>

<deferred>
## Deferred Ideas

- dynamischer Policy- oder Rollenmatrix-Editor
- Scope-Vererbung fuer `anime`, `release`, `release_version` jenseits der vorbereitenden Modellierung
- feinere Publish-/Workflow-Rollen ueber die statische Matrix hinaus
- Public-Site- oder Watchlist-Berechtigungen
- Einladungs-, Join-Request- und Self-Service-Mitgliedschaftsflows
- Phase 45 Kandidat: Gruppen-Mitgliedschaftsverwaltung und Auth-Foundation in eine vollstaendig release-/media-faehige Selbstverwaltungsoberflaeche ueberfuehren

</deferred>

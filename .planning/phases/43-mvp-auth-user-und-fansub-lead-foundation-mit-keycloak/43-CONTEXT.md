# Phase 43: MVP Auth-, User- und Fansub-Lead-Foundation mit Keycloak - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Inline phase brief from user

<domain>
## Phase Boundary

Diese Phase ersetzt den bisherigen festen Test-Admin-Kontext durch eine echte Auth- und User-Grundlage mit Keycloak.

**Was diese Phase liefert:**
- Keycloak als externer Identity Provider im lokalen Docker-/Dev-Stack
- Keycloak Realm- und Client-Grundlage fuer Team4s
- moeglichst automatisierte lokale Keycloak-Grundkonfiguration per Realm-Import und/oder Bootstrap-Skript
- Frontend-Login/Logout/Session-Erkennung mit Bearer-Token-Weitergabe ans Backend
- Backend-JWT-Validierung gegen Keycloak
- internes `app_users`-Modell mit `keycloak_subject`
- globale App-Rollen fuer Plattformrechte
- Fansub-Gruppenmitgliedschaften auf App-User-Ebene
- fansub-spezifische MVP-Rolle `fansub_lead` in der Team4s-Datenbank
- Admin-MVP fuer Userliste, Fansub-Mitgliedschaft und Fansub-Lead-Zuweisung

**Was diese Phase NICHT liefert:**
- keine vollstaendige Permission Engine
- keine komplette Fansub-Lead-Selbstverwaltung
- keine Join Requests, Einladungslinks oder E-Mail-Flows
- keine Public-User-Funktionen wie Watchlist, Kommentare oder Profile
- keinen generischen Policy-/Permission-Editor

</domain>

<decisions>
## Locked Decisions

- Keycloak ist nur fuer Identitaet, Login, Session, OIDC/JWT und globale Plattformrollen zustaendig
- fansub-spezifische Rollen werden NICHT in Keycloak gespeichert
- `app_users` ist der kanonische authentifizierte Team4s-App-Principal
- die bestehende `users`-/`user_roles`-/lokale Token-Seam ist nicht das Zielmodell von Phase 43 und wird nur dort uebergangsweise beruecksichtigt, wo Runtime-Kompatibilitaet es zwingend verlangt
- `app_users.keycloak_subject` ist die kanonische externe Identity-Bindung
- beim ersten gueltigen Login wird ein fehlender `app_user` kontrolliert als `pending` angelegt
- `pending` darf sich einloggen und `/api/me` sehen, aber keine Admin-Aktionen ausfuehren
- `platform_admin` ist die zentrale globale MVP-Rolle fuer User-/Fansub-Zuweisungsverwaltung
- Fansub-Rollen werden in Team4s auf Gruppenebene gespeichert; MVP-Rolle ist `fansub_lead`
- bestehende `fansub_groups` werden weiterverwendet und nicht neu erfunden
- Keycloak bekommt eine eigene PostgreSQL-Datenbank und eigene Docker-Volumes
- lokale Entwicklung darf `start-dev` fuer Keycloak verwenden
- Konfiguration laeuft ueber `.env`, nicht ueber hart codierte Secrets
- die lokale Realm-/Client-Grundkonfiguration wird soweit wie praktikabel automatisiert
- Keycloak-Automatisierung darf nur globale Plattformrollen anlegen, keine fansub-spezifischen Rollen
- die Doku muss explizit beschreiben, wann ein geloeschtes Keycloak-Volume fuer einen erneuten Realm-Import noetig ist
- der erste `platform_admin` wird in der Team4s-App-Datenbank gesetzt, nicht in Keycloak
- Phase 43 liefert die funktionale Auth-Grundlage, aber nicht die finale Drawer-basierte Login/Register/User-Menue-UX
- der spaetere linke Drawer bleibt moegliche UX-Heimat fuer Login, Register und User-Menues, ist aber kein Blocking-Scope dieser Phase
- Keycloak Backchannel Logout gehoert in Phase 43 und muss zwischen Keycloak und Team4s sauber verdrahtet werden
- ein Backchannel-Logout-Ereignis muss den lokalen Team4s-Auth-State zuverlaessig invalidieren, damit bestehende Session-/Bearer-Seams danach nicht weiter als gueltig behandelt werden

## Explicit Anti-Decisions

- keine Rollen wie `dreamsubs_fansub_lead` in Keycloak
- keine Rollen wie `fansub_12_designer` in Keycloak
- keine Rollen wie `release_103_editor` in Keycloak
- keine Keycloak-Rollen wie `fansub_lead`, `editor`, `designer` oder `translator`
- keine Verlagerung der fachlichen Rechteverwaltung nach Keycloak

## Open Technical Decisions

- wie stark bestehende Tabellen `users`, `roles`, `user_roles`, `members`, `group_members` weitergenutzt oder bewusst umfahren werden
- ob fuer Phase 43 ein Adapter/Bridge-Path zwischen bestehendem `users`-Modell und neuem `app_users`-Modell noetig ist
- welche konkrete Frontend-Auth-Library/Strategie im Next.js-Stack am wenigsten Reibung erzeugt
- ob Phase 43 beide Keycloak-Automatisierungswege liefert (`infra/keycloak/realm-team4s.json` und `scripts/keycloak/bootstrap-keycloak.sh`) oder bewusst einen davon als Primaerpfad festzieht

</decisions>

<constraints>
## Constraints

- High-stakes area: Auth, Rollen und Admin-Seams muessen kontrolliert und klein geschnitten werden
- Bestehende Admin-Bereiche haengen heute an der aktuellen Auth-/Role-Seam; Phase 43 darf diese nicht blind zerschlagen
- Bestehende Fansub-Domainregeln bleiben gueltig: release-/fansub-spezifische Rechte duerfen nicht auf neutrale Entitaeten driften
- Bestehende Tabellen fuer Fansub- und Contributor-Domain sind zuerst zu inspizieren, bevor neue Auth-/Membership-Tabellen angelegt werden
- Keycloak bleibt Identitaetssystem, nicht fachliche Berechtigungsinstanz

</constraints>

<canonical_refs>
## Canonical References

### Domain and workflow
- `.planning/ROADMAP.md` - aktive Phasenabfolge und Zielkontext
- `.planning/STATE.md` - aktueller Projektstand
- `docs/architecture/db-schema-fansub-domain.md` - fachliche Leitplanken fuer Fansub-/Anime-Domain
- `AGENTS.md` - lokale Projektregeln fuer Stop-Conditions, Auth-/DB-Sorgfalt und Domainrisiken

### Existing auth and role seams
- `backend/internal/repository/auth.go` - aktuelles Redis-basiertes Session-/Refresh-Token-Modell
- `backend/internal/middleware/comment_auth.go` - aktueller Bearer-/Bypass-Middleware-Pfad
- `backend/internal/repository/authz.go` - aktuelle globale Rollenpruefung ueber `roles` / `user_roles`

### Existing schema seams
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` - bestehende `users`, `members`, `group_members`, `contributor_roles`
- `docker-compose.yml` - bestehender lokaler Stack mit App-Postgres und Redis
- `infra/keycloak/` - Zielort fuer Realm-Importartefakte dieser Phase
- `scripts/keycloak/` - Zielort fuer idempotente lokale Bootstrap-Helfer dieser Phase

</canonical_refs>

<specifics>
## Specific Ideas From Phase Brief

- lokale Keycloak-URL z. B. `http://localhost:8081`
- Realm `team4s`
- Frontend Client `team4s-frontend`
- Authorization Code Flow mit PKCE
- globale Keycloak-Rollen: `platform_admin`, `content_admin`, `user`
- moegliche Automatisierungsartefakte:
  - `infra/keycloak/realm-team4s.json`
  - `scripts/keycloak/bootstrap-keycloak.sh`
- Realm-Automatisierung muss idempotent sein und bestehende Ressourcen nicht doppelt anlegen
- optionaler lokaler Testuser ist erlaubt, aber nur als Dev-Helfer und ohne fansub-spezifische Rollen
- MVP-APIs: `/api/me`, `/api/admin/users`, `/api/admin/fansub-groups/:id/members`
- funktionaler Auth-Einstiegspfad ist Pflicht; finale Drawer-UX ist bewusst spaeter
- Backchannel-Logout muss fuer Keycloak-Session-Ende und lokale Team4s-Invalidierung mitgeplant werden

</specifics>

<deferred>
## Deferred Ideas

- Phase 44: eigentliche App Permission Engine (`Can(user, action, context)`, `RequirePermission(...)`)
- Phase 45: Fansub-Lead-Selbstverwaltung, Einladungen, weitere Gruppenrollen
- spaetere Public-User-Funktionen

</deferred>

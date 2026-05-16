# Phase 45: Fansub Member Management MVP - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Inline phase brief from user plus current codebase inspection and prior Phase-43/44 planning artifacts

<domain>
## Phase Boundary

Diese Phase fuehrt ein MVP fuer app-user-basierte Mitglieder- und Rollenverwaltung pro Fansub-Gruppe ein.

**Was diese Phase liefern soll:**
- Mitgliederliste pro Fansub-Gruppe auf Basis der app-user-/Gruppenmitgliedschaftsstruktur
- Suche nach bestehenden App-Usern fuer den Add-to-Group-Flow
- Rollenvergabe, Rollenentzug und Aktivieren/Deaktivieren von Mitgliedschaften
- Self-Lockout-Schutz fuer verwaltende Gruppenrollen
- Nutzung der Permission Engine aus Phase 44 fuer View-/Manage-Entscheidungen
- Capability-Erweiterung fuer Fansub-Gruppen
- minimale Frontend-Integration fuer Mitglieder & Rollen
- Audit und Tests fuer die kritischen Verwaltungsfluesse

**Was diese Phase NICHT liefern soll:**
- keine Einladungen per Token
- kein E-Mail-Versand
- keine Join Requests
- keine Keycloak-Gruppen oder Keycloak-Fansub-Rollen
- keinen dynamischen Permission-Editor
- keine Public-Watchlist oder Kommentarfeatures
- keinen Release-Publishing-Workflow

</domain>

<decisions>
## Locked Decisions

- Keycloak bleibt fuer Login, Identitaet, Session und JWT zustaendig; fachliche Gruppenrollen und Mitgliedschaften bleiben in Team4s.
- Alle Berechtigungsentscheidungen laufen ueber die Permission Engine aus Phase 44; keine direkten `role == "fansub_lead"`-Checks in Handlern oder React-Komponenten.
- `fansub_group_member_roles` oder eine gleichwertige app-user-basierte Gruppenrollenstruktur ist die einzige Quelle fuer App-Berechtigungen innerhalb einer Fansub-Gruppe.
- Fachliche Credit-/Notizstrukturen wie `release_member_roles`, `member_episode_notes` oder `member_anime_notes` duerfen nie als App-Berechtigungsquelle verwendet werden.
- Bestehende Tabellen, Services, Repositories, Middleware und Projektkonventionen werden bevorzugt wiederverwendet; keine neue Parallelstruktur fuer User, Members, Rollen, Audit oder Capabilities.
- Vor jeder Implementierung steht eine Ist-Analyse des vorhandenen Schemas und der Code-Struktur.
- Die sichtbare Legacy-Tabelle `fansub_members` mit `handle`/`role` ist kein ausreichender Ersatz fuer app-user-basierte Berechtigungs- und Mitgliedschaftsverwaltung.
- Wenn die app-user-/Gruppenmitgliedschaftsseams aus Phase 43 oder die Permission-Seams aus Phase 44 in der Ausfuehrungs-Branch fehlen, ist das ein BLOCKER statt ein Anlass, auf Legacy-Member-Daten auszuweichen.
- `fansub_group.members.view` schuetzt die Mitgliederliste; `fansub_group.members.manage` schuetzt jede Mutation.
- Self-Lockout-Schutz ist Pflicht: der letzte aktive `fansub_lead` und die letzte aktive Rolle mit `fansub_group.members.manage` duerfen nicht entfernt oder deaktiviert werden.
- Bei Self-Lockout-Verletzungen liefert das Backend `409 Conflict` mit verstaendlicher Meldung.
- Deaktivierte Mitgliedschaften verlieren alle aktiven Berechtigungen.
- Capability-Felder enthalten keine eigene Rollenlogik; sie werden zentral auf Permission-Actions gemappt.

## Branch-Reality Findings

- In der aktuell sichtbaren Branch existiert bereits eine Fansub-Mitgliederverwaltung auf Basis von `fansub_members` mit freiem `handle`-/`role`-Modell in:
  - `backend/internal/handlers/fansub_group_members.go`
  - `backend/internal/repository/fansub_repository.go`
  - `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
  - `frontend/src/types/fansub.ts`
- Diese Legacy-Struktur ist nicht app-user-basiert und nutzt derzeit globale `requireAdmin(...)`-Checks statt group-scope Permissions.
- Die geplanten Phase-43/44-Seams (`app_users`, `fansub_group_members`, `fansub_group_member_roles`, Keycloak-resolved CurrentUser, Capability-Endpunkte, zentrale Permission Engine) sind in der geoeffneten Branch-Realitaet weiterhin hauptsaechlich in Planungsartefakten sichtbar, nicht sicher in Runtime-Code oder Migrationen.

## Planning Assumption

- Phase 45 setzt eine in der Ausfuehrungs-Branch verfuegbare Phase-43-Auth-Foundation und Phase-44-Permission-Engine voraus.
- Wenn diese Grundlagen bei Ausfuehrungsstart nicht sichtbar sind, muss Phase 45 mit einem klaren Pre-flight-Blocker stoppen.

</decisions>

<constraints>
## Constraints

- `AGENTS.md` bleibt bindend: keine Aenderung darf Release- oder Fansub-Daten an die falsche Domain-Entitaet haengen.
- `docs/architecture/db-schema-fansub-domain.md` bleibt die fachliche Source of Truth fuer Fansub-/Release-/Media-Grenzen.
- Vor Implementierung muessen DB-Tabellen, Migrationen, Keycloak-Mapping-Felder, Auth-/Permission-Middleware, Audit-Seams, Admin-Routen, API-Clients und betroffene Frontend-Seiten dokumentiert werden.
- Wenn geeignete bestehende Strukturen existieren, muessen sie wiederverwendet werden.
- Wenn eine benoetigte Struktur fehlt, ist nur eine minimale Migration nach bestehender Projektkonvention erlaubt.
- Wenn das Schema oder die Verantwortung zwischen `fansub_members` und app-user-basierten Gruppenmitgliedschaften unklar bleibt, ist fuer die Ausfuehrung ein BLOCKER mit konkreter Rueckfrage noetig.
- Das Frontend soll bestehende Projektmuster beibehalten; keine grosse visuelle Neugestaltung.

## Mandatory Pre-Analysis Checklist

- User-/App-User-Tabellen und Keycloak-Mapping-Felder identifizieren, insbesondere `app_users`, `keycloak_subject` und globale Rollen-/Statusfelder.
- Gruppenmitgliedschafts- und Gruppenrollenstrukturen identifizieren, insbesondere `fansub_group_members`, `fansub_group_member_roles` oder gleichwertige Tabellen mit Feldern fuer `fansub_group_id`, `app_user_id` / `user_id`, `role_code`, `scope_type`, `scope_id`, `status`, `active`, `created_by`, `created_at`, `updated_at`.
- Vorhandene Audit-Strukturen und ihre Eignung fuer Member-Mutationslogs dokumentieren.
- Die sichtbare Legacy-Struktur `fansub_members` mitsamt bestehenden Handler-/Repo-/Frontend-Flows dokumentieren und klar als Legacy-/Contributor-Seam gegen app-user-basierte Berechtigungsmitgliedschaft abgrenzen.
- Die aktuelle Auth-Middleware, CurrentUser-Seam, Permission-Engine, Fansub-Admin-Routen, Fehlerkonventionen und Teststruktur dokumentieren.
- Die aktuelle Fansub-Admin-Seite, Tab-Struktur, API-Clients/Hooks, Capability-Seams und 401/403-Behandlung im Frontend dokumentieren.
- Die spaetere Ausfuehrungsantwort muss mit einer kurzen Ist-Analyse beginnen, die gefundene Tabellen, Spalten, Middleware, Admin-/Permission-Seams, Frontend-Konventionen, Wiederverwendungsentscheidungen und die Aussage zu neuen Migrationen zusammenfasst.

</constraints>

<canonical_refs>
## Canonical References

### Workflow and prior phases
- `.planning/ROADMAP.md`
- `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `.planning/phases/43-mvp-auth-user-und-fansub-lead-foundation-mit-keycloak/43-CONTEXT.md`
- `.planning/phases/43-mvp-auth-user-und-fansub-lead-foundation-mit-keycloak/43-RESEARCH.md`
- `.planning/phases/44-app-permission-engine-fuer-fansub-release-und-media-kontexte/44-CONTEXT.md`
- `.planning/phases/44-app-permission-engine-fuer-fansub-release-und-media-kontexte/44-RESEARCH.md`

### Current visible member/admin seams
- `backend/internal/handlers/fansub_group_members.go`
- `backend/internal/handlers/fansub_admin.go`
- `backend/internal/repository/fansub_repository.go`
- `backend/internal/models/fansub.go`
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
- `frontend/src/types/fansub.ts`
- `frontend/src/lib/api.ts`

</canonical_refs>

<specifics>
## Specific Ideas From Phase Brief

- Mitgliederliste zeigt mindestens:
  - User-ID
  - Display Name
  - E-Mail
  - Mitgliedschaftsstatus
  - aktive Rollen
  - Beitrittsdatum / `created_at`
  - letzte Aenderung
  - verfuegbare Aktionen anhand von Capabilities
- Add-member Flow:
  - App-User nach Name oder E-Mail suchen
  - User auswaehlen
  - mindestens eine Rolle waehlen
  - `fansub_group.members.manage` pruefen
  - Mitgliedschaft + Rollen anlegen
  - Audit schreiben
- Mutationstypen:
  - Rolle hinzufuegen
  - Rolle entfernen
  - Mitgliedschaft aktivieren/deaktivieren
  - Mitglied reaktivieren
- Capability-Erweiterung fuer Fansub-Gruppen:
  - `canViewMembers`
  - `canManageMembers`

</specifics>

<deferred>
## Deferred Ideas

- Invitations per Token
- E-Mail-Einladungen
- Join Requests
- feinere Selbstverwaltungs-Workflows ueber den MVP hinaus
- spaetere Bruecke zwischen Mitgliederverwaltung und komfortabler Operator-Suche / Bulk-Management
- Phase 46 Kandidat: Invitations & Join Requests als naechster schmaler Aufbau auf dem Member-Management-MVP

</deferred>

# Phase 46: Fansub Group Invitations & Join Requests MVP - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Inline phase brief from user plus current codebase inspection and prior Phase-43/44/45 planning artifacts

<domain>
## Phase Boundary

Diese Phase fuehrt ein MVP fuer token-basierte Einladungen zu Fansub-Gruppen ein und bereitet Join Requests hoechstens schmal vor.

**Was diese Phase liefern soll:**
- gruppenbezogene Einladungen per sicherem Token
- Verwaltung offener Einladungen pro Fansub-Gruppe
- Annahme gueltiger Einladungen durch eingeloggte App-User
- Permission-Engine-basierte Absicherung fuer View/Create/Cancel/Accept
- Capability-Erweiterung fuer Einladungsverwaltung
- minimales Audit fuer Einladungsereignisse
- optionale vorbereitende Join-Request-Seams, falls sie sich ohne Aufblaehen sauber mitmodellieren lassen

**Was diese Phase NICHT liefern soll:**
- kein E-Mail-Versand
- keine Mail-Templates
- kein vollwertiges Notification-System
- keine Keycloak-Gruppen oder Keycloak-Fansub-Rollen
- keinen dynamischen Policy-Editor
- keine komplexe Self-Service-Community-Flaeche

</domain>

<decisions>
## Locked Decisions

- Keycloak bleibt fuer Login, Identitaet, Session und JWT zustaendig; Einladungen und Gruppenrollen bleiben Team4s-Datenbanklogik.
- Alle Berechtigungsentscheidungen laufen ueber die Permission Engine aus Phase 44.
- Es gibt keine direkten `role == ...`-Checks in Handlern oder React-Komponenten.
- Phase 46 baut auf Phase 45 auf: angenommene Einladungen muessen in die app-user-basierte Gruppenmitgliedschaftsstruktur schreiben, nicht in Legacy-`fansub_members`.
- Permission-Codes fuer Einladungen werden zentral definiert; keine Magic Strings in Handlern.
- Token werden kryptografisch sicher erzeugt und nur als Hash gespeichert.
- Das Backend gibt den Roh-Invite-Token bzw. Invite-Link nur einmalig bei der Erstellung zurueck; weder Token noch Token-Hash werden ueber Listenendpunkte offengelegt.
- Einladungsstatus wird explizit modelliert, mindestens `pending`, `accepted`, `cancelled`, `expired`.
- E-Mail wird normalisiert gespeichert und verglichen.
- Bestehende Tabellen, Services, Repositories, Middleware, Audit- und Capability-Seams werden bevorzugt wiederverwendet.
- Join Requests sind in Phase 46 optional/vorbereitend und duerfen den Invitation-MVP nicht dominieren.
- Wenn die Phase-43/44/45-Runtime-Seams in der Ausfuehrungs-Branch fehlen, ist das ein BLOCKER statt ein Anlass, Invitation-Logik auf Legacy-Seams zu improvisieren.
- Einladungserstellung verlangt mindestens eine gueltige zentrale Rollen-Zuweisung; unbekannte Rollen sind abzulehnen.
- Offene Einladungen fuer dieselbe Gruppe und dieselbe normalisierte E-Mail duerfen nicht mehrfach aktiv existieren.
- Bereits aktive Gruppenmitglieder sollen nicht erneut eingeladen werden.
- Invitation Acceptance ist ein authentifizierter Flow; bei vorhandenem App-User-E-Mail-Feld muss die Invitation-E-Mail dazu passen oder mit 403 abgelehnt werden.

## Branch-Reality Findings

- In der aktuell sichtbaren Branch wurden keine klaren Runtime-Seams fuer Invitations oder Join Requests gefunden.
- Die sichtbare Admin-/Member-Seam bleibt:
  - `backend/internal/handlers/fansub_group_members.go`
  - `backend/internal/repository/fansub_repository.go`
  - `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
- Modale/Dialog-Muster existieren im Frontend bereits in anderen Admin-Bereichen, aber nicht sichtbar als bestehender Invitation-Flow.
- Die app-user-/Permission-/Capability-Seams aus Phase 43-45 sind in der offenen Branch weiterhin eher als Planungsziel als sicher bestaetigte Runtime-Realitaet sichtbar.

## Planning Assumption

- Phase 46 setzt eine in der Ausfuehrungs-Branch verfuegbare app-user-basierte Gruppenmitgliedschaft aus Phase 45 und eine funktionierende Permission Engine aus Phase 44 voraus.
- Wenn diese Grundlagen beim Start fehlen oder unklar bleiben, muss Phase 46 mit einem klaren Pre-flight-Blocker stoppen.

</decisions>

<constraints>
## Constraints

- `AGENTS.md` bleibt bindend: keine Aenderung darf Fansub- oder Releasedaten an die falsche Entitaet haengen.
- Vor Implementierung muessen Invitation-/Join-Request-Seams, Audit-Strukturen, Membership-Seams, Status-/Token-Konventionen und Frontend-Anschlussstellen dokumentiert werden.
- Keine Parallelstruktur bauen, wenn bereits passende Tabellen/Repos/Middleware vorhanden sind.
- Nur minimale Migrationen anlegen, wenn eine echte Luecke nachgewiesen ist.
- Wenn unklar ist, ob Einladungen nur fuer bestehende App-User oder auch fuer noch nicht angelegte User gelten sollen, muss die Ausfuehrung die MVP-Interpretation explizit festhalten und ggf. blockieren statt zu raten.
- Das Frontend soll bestehende Admin-Muster und Fehlerkonventionen beibehalten; keine grosse Neugestaltung.

## Mandatory Pre-Analysis Checklist

- Pruefen, ob bereits Tabellen oder Migrationsentwuerfe fuer Invitations oder Join Requests existieren.
- `app_users`, `fansub_groups`, `fansub_group_members`, `fansub_group_member_roles` und Audit-Seams mit relevanten Feldern dokumentieren.
- Statuskonventionen, Soft-Delete-Muster, Token-/Hash-/Expiry-Muster und bestehende `created_by`-/`updated_at`-Konventionen dokumentieren.
- Die Member-Management-Endpunkte und Capability-Seams aus Phase 45 dokumentieren, weil Invitation Acceptance in diese Strukturen schreiben muss.
- Den CurrentUser-/Auth-Middleware-Seam, Fehlersemantik fuer `401/403/404/409` und Teststruktur dokumentieren.
- Den Fansub-Mitglieder-/Rollen-Tab, Capability-Loading, Admin-API-Clients/Hooks, Dialog-/Modal-Muster und zentrales Error Handling im Frontend dokumentieren.
- Die spaetere Ausfuehrungsantwort muss mit einer kurzen Ist-Analyse beginnen, die gefundene Tabellen, Spalten, Permission-/Member-Seams, Frontend-Seams, Wiederverwendungsentscheidungen und neue Migrationen zusammenfasst.

</constraints>

<canonical_refs>
## Canonical References

### Workflow and prior phases
- `.planning/ROADMAP.md`
- `AGENTS.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `.planning/phases/44-app-permission-engine-fuer-fansub-release-und-media-kontexte/44-CONTEXT.md`
- `.planning/phases/44-app-permission-engine-fuer-fansub-release-und-media-kontexte/44-RESEARCH.md`
- `.planning/phases/45-fansub-member-management-mvp/45-CONTEXT.md`
- `.planning/phases/45-fansub-member-management-mvp/45-RESEARCH.md`

### Current visible seams
- `backend/internal/handlers/fansub_group_members.go`
- `backend/internal/handlers/fansub_admin.go`
- `backend/internal/repository/fansub_repository.go`
- `frontend/src/app/admin/fansubs/[id]/members/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/types/fansub.ts`

</canonical_refs>

<specifics>
## Specific Ideas From Phase Brief

- Zentrale Permission-Codes:
  - `fansub_group.invitations.view`
  - `fansub_group.invitations.create`
  - `fansub_group.invitations.cancel`
  - `fansub_group.invitations.accept`
- Optional vorbereitende Join-Request-Codes:
  - `fansub_group.join_requests.view`
  - `fansub_group.join_requests.approve`
  - `fansub_group.join_requests.reject`
  - `fansub_group.join_requests.create`
- Bevorzugte Einladungstabelle, falls noetig:
  - `fansub_group_invitations`
- Beispiel-Felder:
  - `id`
  - `fansub_group_id`
  - `email`
  - `invited_role_codes`
  - `token_hash`
  - `status`
  - `expires_at`
  - `created_by_user_id`
  - `accepted_by_user_id`
  - `accepted_at`
  - `cancelled_by_user_id`
  - `cancelled_at`
  - `created_at`
  - `updated_at`
- Beispiel-Create-Response:
  - `id`
  - `email`
  - `status`
  - `expiresAt`
  - `inviteLink`
- Fansub-Gruppen-Capabilities fuer den MVP:
  - `canViewInvitations`
  - `canCreateInvitation`
  - `canCancelInvitation`

</specifics>

<deferred>
## Deferred Ideas

- E-Mail dispatch and templates
- reminder/resend flows
- public landing UX fuer nicht eingeloggte Einladungsannahme
- vollwertige Join-Request-Lifecycle mit Moderationstools
- Phase 47 Kandidat: feinere Self-Service-Flows fuer Join Requests, Resend, Reminder und Acceptance UX

</deferred>

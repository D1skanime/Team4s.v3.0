# Phase 60: SMTP-Mailfluss fuer Team4s-Einladungen und Keycloak-Accountmails - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** User request + codebase inspection

<domain>
## Phase Boundary

Phase 60 richtet einen echten lokalen Mail-Testfluss ein:

- Team4s Backend sendet Fansub-Gruppeneinladungen per SMTP.
- Keycloak sendet Account-Mails wie Passwort-zuruecksetzen und E-Mail-Verifikation per SMTP.
- Lokal geht beides an Mailpit, damit keine echten Mails verschickt werden.
- Fuer spaeter wird dokumentiert, wie dieselben SMTP-Seams in Produktion auf Mailjet zeigen koennen.

Diese Phase liefert nicht:

- Kein eigenes Newsletter-/Notification-System.
- Keine produktiven Mailjet-Secrets im Repo.
- Keine Abhaengigkeit von Amazon SES.
- Keine Veraenderung daran, dass Keycloak Login, Passwort-Reset und Account-Mails besitzt.
- Keine Veraenderung daran, dass Team4s fachliche Einladungen und Fansub-Berechtigungen besitzt.

</domain>

<decisions>
## Implementation Decisions

### Mail Ownership

- **D-01:** Keycloak besitzt Account- und Identity-Mails: Passwort vergessen, E-Mail-Verifikation, Account Actions.
- **D-02:** Team4s besitzt App-/Domain-Mails: Fansub-Gruppeneinladungen und spaetere Team4s-Benachrichtigungen.
- **D-03:** Lokal zeigen Keycloak und Team4s Backend auf denselben Mailpit-SMTP-Server.
- **D-04:** Produktion wird nur als SMTP-Konfiguration vorbereitet und dokumentiert. Mailjet ist der bevorzugte spaetere Produktionsprovider, aber Secrets werden nie committed.

### Local Mailpit

- **D-05:** Docker Compose bekommt einen Mailpit-Service mit SMTP-Port `1025` und Web-UI-Port `8025`.
- **D-06:** Lokale Backend-Defaults nutzen Mailpit nur im lokalen Profil. Produktion muss explizit konfiguriert werden.
- **D-07:** Keycloak Realm/Compose wird so konfiguriert, dass lokale Account-Mails in Mailpit sichtbar sind.

### Team4s Backend Mailer

- **D-08:** Backend bekommt einen kleinen SMTP-Mailer-Service hinter einer klaren Schnittstelle; kein Mailversand direkt im Handler.
- **D-09:** `CreateFansubGroupInvitation` bleibt der fachliche Besitzer des Einladungsflows, ruft aber nach erfolgreicher Einladung den Mailer auf.
- **D-10:** Der Einladungslink muss absolut gebaut werden, z.B. ueber `APP_PUBLIC_URL`, damit Mail-Empfaenger den Link aus Mailpit oder spaeter Mailjet oeffnen koennen.
- **D-11:** Der Roh-Token darf nur im Response und in der Mail erscheinen. Gespeichert bleibt nur der Hash.
- **D-12:** Bei SMTP-Fehlern darf keine still gueltige, aber nie zugestellte Einladung uebrig bleiben. Der Plan muss einen klaren Fehlerpfad definieren: entweder Versandstatus persistieren oder die Einladung kontrolliert abbrechen.

### UX / API Contract

- **D-13:** Das Frontend soll nach Einladungserstellung nicht mehr suggerieren, dass Copy/Paste der primaere Weg ist, wenn SMTP aktiv ist.
- **D-14:** Der API-Contract muss dokumentieren, ob `invite_link` weiterhin zurueckgegeben wird und welche Mail-/Delivery-Felder neu sind.
- **D-15:** Protected UI bleibt tokenfrei und nutzt `frontend/src/lib/api.ts`; keine neuen Bearer-Seams.

</decisions>

<canonical_refs>
## Canonical References

### Project Rules
- `AGENTS.md` - Projektregeln, API-Contract-Regeln, Auth-Seams, Docker-/Migration-Regeln.
- `docs/engineering/implementation-contract.md` - Search-first und keine parallelen Seams.
- `docs/api/api-contracts.md` - OpenAPI/Backend/Frontend-Contract gemeinsam pflegen.
- `docs/frontend/auth-api-client.md` - geschuetzte UI nutzt zentrale API-Helfer.

### Existing Invitation Flow
- `backend/internal/handlers/app_auth.go` - `CreateFansubGroupInvitation`, Audit-Log und Response.
- `backend/internal/repository/fansub_group_invitations_repository.go` - Token-Erzeugung, Hash-Speicherung, `InviteLink`.
- `backend/internal/models/app_auth.go` - `FansubGroupInvitation`, `FansubGroupInvitationCreateResult`.
- `frontend/src/lib/api.ts` - `createFansubGroupInvitation`, `listFansubGroupInvitations`, `acceptFansubInvitation`.
- `frontend/src/types/fansub.ts` - Invitation DTOs.
- `shared/contracts/openapi.yaml` und `shared/contracts/fansubs.yaml` - zu pruefende API-Vertragsquellen.

### Local Runtime / Keycloak
- `docker-compose.yml` - lokale Services fuer DB, Redis, Keycloak, Backend, Frontend.
- `.env.example` - dokumentierte lokale Env-Werte.
- `infra/keycloak/realm-team4s.json` - lokaler Realm-Import, aktuell ohne SMTP-Server.
- `docs/operations/keycloak-auth-foundation-phase43.md` - Keycloak-Grenzen und lokaler Auth-Bootstrap.

</canonical_refs>

<code_context>
## Existing Code Insights

- Es gibt aktuell keinen Backend-Mailer und keine SMTP-Konfiguration in `backend/internal/config/config.go`.
- `POST /api/v1/admin/fansubs/:id/invitations` erstellt eine DB-Einladung, schreibt Audit-Log und gibt `invite_link` zurueck.
- `fansub_group_invitations` speichert nur den Token-Hash; ein verlorener Roh-Link kann nicht rekonstruiert werden.
- `docker-compose.yml` enthaelt noch keinen Mailpit-Service.
- `infra/keycloak/realm-team4s.json` hat `resetPasswordAllowed: true`, aber keine SMTP-Server-Konfiguration.

</code_context>

<deferred>
## Deferred Ideas

- Produktive Mailjet-Anbindung live testen.
- Bounce-/Complaint-Verarbeitung.
- Mail-Templates im Admin editierbar machen.
- Allgemeines Notification-Center.

</deferred>

---

*Phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm*
*Context gathered: 2026-06-01*

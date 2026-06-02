---
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
verified: 2026-06-02T12:00:00Z
status: passed
score: 6/6
overrides_applied: 0
human_verification_completed: 2026-06-02T14:35:00+02:00
human_verification_result: "3/3 passed — siehe 60-HUMAN-UAT.md (Einladung E2E, Keycloak-Reset, Cancel-on-fail alle gruen)"
human_verification:
  - test: "Fansub-Einladung per Admin-UI erstellen und Einladungsmail in Mailpit prüfen"
    expected: "Mail erscheint in Mailpit Web-UI (http://127.0.0.1:8025) mit absolutem Einladungslink, der auf http://127.0.0.1:3002/invitations/accept?token=... zeigt"
    why_human: "Erfordert laufenden Compose-Stack; kann nicht per grep/static analysis verifiziert werden"
  - test: "Keycloak Passwort-Reset auslösen und Reset-Mail in Mailpit prüfen"
    expected: "Reset-Mail erscheint in Mailpit; Link ist klickbar und führt zur Passwort-Reset-Seite"
    why_human: "Erfordert laufenden Keycloak + Mailpit; realer SMTP-Fluss nicht automatisch testbar"
  - test: "SMTP-Ausfall simulieren (Mailpit stoppen) und Einladung per API erstellen"
    expected: "HTTP 502 mit reason_code=mail_delivery_failed; keine pending Einladung in DB"
    why_human: "Erfordert laufenden Stack mit kontrolliertem Ausfall; dynamisches Laufzeitverhalten"
---

# Phase 60: SMTP-Mailfluss Verifikation

**Phase Goal:** Lokalen SMTP-Mailfluss fuer Team4s und Keycloak herstellen -- Fansub-Gruppeneinladungen werden vom Team4s Backend per SMTP verschickt, Keycloak Account-Mails (z.B. Passwort-Reset) gehen ebenfalls ueber SMTP, lokal landen beide in Mailpit, und fuer Produktion ist der spaetere Wechsel auf Mailjet als SMTP-Provider dokumentiert (ohne Secrets im Repo).

**Verified:** 2026-06-02T12:00:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | P60-SC1: Mailpit laeuft als Compose-Service mit SMTP 1025 und Web-UI 8025 | VERIFIED | `docker-compose.yml:81-87`: Service `team4sv30-mailpit` mit `axllent/mailpit:latest`, Ports 1025/8025, `restart: unless-stopped` |
| 2 | P60-SC2: Keycloak kann lokale Passwort-Reset-Mails an Mailpit senden | VERIFIED | `infra/keycloak/realm-team4s.json:7-15`: `smtpServer` mit `host: team4sv30-mailpit`, `port: 1025`, `resetPasswordAllowed: true`; plus `docker-compose.yml:62-67`: `KC_SMTP_*` Env-Vars zeigen auf Mailpit |
| 3 | P60-SC3: Backend sendet Fansub-Einladungsmails ueber SMTP-Mailer-Service | VERIFIED | `mailer.go`: SMTPMailer/NoopMailer-Interface vollstaendig; `app_auth.go:382-418`: CreateFansubGroupInvitation ruft `h.mailer.Send()` nach DB-Erstellung; `main.go:129-143`: Mailer-Wiring per SMTPEnabled-Flag |
| 4 | P60-SC4: Invitation-Create-Contract dokumentiert Mail/Delivery-Semantik und ist zwischen Backend, OpenAPI, Frontend DTO und API-Helfer ausgerichtet | VERIFIED | `fansubs.yaml:740-768`: 502/mail_delivery_failed dokumentiert, invite_link als Dev-Fallback beschrieben; `FansubAppMembersSection.tsx:325`: Erfolgsmeldung "Einladung wurde gesendet."; `FansubAppMembersSection.tsx:50`: 502-Fehlermeldung auf Deutsch |
| 5 | P60-SC5: Roh-Token nicht persistiert oder geloggt; SMTP-Fehler hinterlassen keine stille Einladung | VERIFIED | `app_auth.go:395-416`: Cancel-on-fail: invitationRepo.Cancel() bei mailErr, Audit-Event `mail_failed` OHNE Token; `app_auth.go:430-433`: Erfolgs-Audit-Log ohne Token; Tests TestCreateFansubGroupInvitationCancelsOnMailFailure + TestCreateFansubGroupInvitationAuditLogContainsNoRawToken vorhanden |
| 6 | P60-SC6: Produktionswechsel auf Mailjet als SMTP-Konfiguration dokumentiert, keine Secrets committed | VERIFIED | `docs/operations/mail-delivery.md`: vollstaendige Mailjet-Produktionsdoku mit `<mailjet-api-key>`-Platzhaltern; `.env.example:73-83`: Mailjet-Block auskommentiert mit Platzhaltern; keine realen Credentials gefunden |

**Score:** 6/6 Truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docker-compose.yml` | Mailpit-Service + Backend/Keycloak SMTP-Wiring | VERIFIED | Mailpit-Service vorhanden; Backend-Block mit SMTP_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_FROM_NAME, SMTP_USER, SMTP_PASSWORD, SMTP_STARTTLS, APP_PUBLIC_URL; Keycloak-Block mit KC_SMTP_* |
| `.env.example` | Dokumentierte lokale SMTP-Defaults und Mailjet-Platzhalter | VERIFIED | Lokaler SMTP-Block (Zeilen 51-69) + auskommentierter Mailjet-Produktions-Block (Zeilen 72-83); keine echten Secrets |
| `infra/keycloak/realm-team4s.json` | Lokale SMTP-Server-Konfiguration fuer Mailpit | VERIFIED | `smtpServer`-Objekt mit host, port, from; auth/ssl/starttls korrekt auf "false" |
| `backend/internal/services/mailer.go` | SMTP-Mailer und Noop/Fake-Testseam | VERIFIED | SMTPMailer (net/smtp, STARTTLS, ImplicitTLS, Context-Timeout, CRLF-Schutz, RFC2047) und NoopMailer vollstaendig implementiert |
| `backend/internal/handlers/app_auth.go` | CreateFansubGroupInvitation sendet Mail nach DB-Erstellung | VERIFIED | Cancel-on-fail-Logik bei SMTP-Fehler (Zeilen 382-418); absoluter Link per appPublicURL + InviteLink; 502/reason_code=mail_delivery_failed |
| `backend/internal/config/config.go` | SMTP-Konfigurationsfelder | VERIFIED | 9 neue Felder (SMTPEnabled, SMTPHost, SMTPPort, SMTPUsername, SMTPPassword, SMTPFromEmail, SMTPFromName, SMTPStartTLS, AppPublicURL); legacy Fallbacks SMTP_USER/SMTP_FROM_EMAIL korrekt implementiert |
| `docs/operations/mail-delivery.md` | Lokaler Mailpit-Test und Mailjet-Produktionswechsel | VERIFIED | Neue Datei erstellt; beides vollstaendig dokumentiert inkl. Fehlerpfad und Sicherheitshinweise |
| `shared/contracts/fansubs.yaml` | Invitation-Create-Response mit invite_link und 502-Fehlerpfad | VERIFIED | FansubGroupInvitationCreateResponse-Schema und 502-Fehlerfall dokumentiert |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` | UX auf Mailversand ausgerichtet, 502-Fehler explizit | VERIFIED | "Einladung wurde gesendet." als Erfolgstext; 502-Handler mit SMTP-Fehlermeldung auf Deutsch; dev-link als `<details>/<summary>` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `config.go` (SMTP_USER) | `SMTPUsername` field | `getEnv("SMTP_USER", os.Getenv("SMTP_USERNAME"))` | WIRED | Zeile 112: legacy Fallback korrekt; Env-Namen stimmen mit docker-compose.yml ueberein |
| `config.go` (SMTP_FROM) | `SMTPFromEmail` field | `getEnv("SMTP_FROM", getEnv("SMTP_FROM_EMAIL", ...))` | WIRED | Zeile 114: primaerer Name SMTP_FROM, Fallback SMTP_FROM_EMAIL |
| `main.go` | SMTPMailer/NoopMailer | `cfg.SMTPEnabled` branch | WIRED | Zeilen 129-143: vollstaendige Wiring-Logik |
| `main.go` | `AppAuthHandler.mailer` + `appPublicURL` | `NewAppAuthHandler(... mailerSvc, ... cfg.AppPublicURL)` | WIRED | Zeilen 163-180: beide Parameter uebergeben |
| `CreateFansubGroupInvitation` | `mailer.Send()` | `h.mailer.Send(mailCtx, MailMessage{...})` | WIRED | Zeilen 382-392: Mail nach DB-Erstellung gesendet |
| `CreateFansubGroupInvitation` | `invitationRepo.Cancel()` on SMTP fail | `if mailErr != nil { h.invitationRepo.Cancel(...) }` | WIRED | Zeilen 393-416: Cancel-on-fail vollstaendig |
| `docker-compose.yml` Backend | `SMTP_ENABLED=true` Default | `${SMTP_ENABLED:-true}` | WIRED | Zeile 97: Fix aus CR-01/WR-06 nachweislich committed |
| `docker-compose.yml` Backend | `APP_PUBLIC_URL` | `${APP_PUBLIC_URL:-http://127.0.0.1:3002}` | WIRED | Zeile 105: Fix aus WR-07 nachweislich committed |
| `FansubAppMembersSection.tsx` | `createFansubGroupInvitation` | Import aus `@/lib/api` | WIRED | Zeile 12: zentraler API-Helfer; kein neuer Bearer-Seam |
| Keycloak realm-team4s.json | Mailpit SMTP | `smtpServer.host: team4sv30-mailpit` | WIRED | Realm-Import setzt SMTP-Konfiguration beim Start |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `app_auth.go:CreateFansubGroupInvitation` | `created.InviteLink` | `h.invitationRepo.Create()` (DB-Write) | Ja -- aus Repository, echte DB-Operation | FLOWING |
| `app_auth.go:CreateFansubGroupInvitation` | `h.appPublicURL` | `cfg.AppPublicURL` aus Env-Var | Ja -- Env-Wert, kein Hardcode | FLOWING |
| `FansubAppMembersSection.tsx` | `response.data.invite_link` | `createFansubGroupInvitation()` via `api.ts` | Ja -- echter API-Call; NoopMailer-Fall gibt invite_link zurueck als Dev-Fallback | FLOWING |
| `mailer.go:Send` | `msg.To` (E-Mail-Adresse) | `created.Invitation.Email` aus DB | Ja -- gespeicherte E-Mail-Adresse aus Einladungserstellung | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED fuer SMTP-Laufzeitverhalten (erfordert laufenden Stack + echtes Mailpit). Statisch verifizierbare Aspekte wurden in Artifact- und Wiring-Checks abgedeckt.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| mailer.go vorhanden und nicht leer | File read | 240 Zeilen, vollstaendige Implementierung | PASS |
| config.go SMTP-Felder vorhanden | Grep `SMTPEnabled` | Gefunden Zeile 109 | PASS |
| docker-compose SMTP_ENABLED=true Default | Grep `SMTP_ENABLED` | Zeile 97: `${SMTP_ENABLED:-true}` | PASS |
| No raw secrets in .env.example | Manual check | Mailjet-Block auskommentiert mit `<platzhalter>` | PASS |
| Cancel-on-fail Code-Pfad | Grep `Cancel.*mailErr\|invitationRepo.Cancel` | Zeilen 395-397 in app_auth.go | PASS |
| Audit-Log ohne Token | Grep `Kein Token\|Kein Roh-Token` | Kommentare + Payload ohne Token-Key in Zeilen 408-432 | PASS |

---

### Probe Execution

Keine Probe-Skripte fuer Phase 60 deklariert oder gefunden.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| P60-SC1 | 60-01 | Mailpit als lokaler SMTP-Catcher | SATISFIED | `docker-compose.yml`: Service `team4sv30-mailpit` mit korrekten Ports |
| P60-SC2 | 60-01 | Keycloak sendet Account-Mails an Mailpit | SATISFIED | `realm-team4s.json:7-15`: `smtpServer` korrekt konfiguriert; `docker-compose.yml:62-67`: KC_SMTP_* |
| P60-SC3 | 60-02 | Backend-Mailer-Service fuer Einladungsmails | SATISFIED | `mailer.go` vollstaendig; Handler-Integration in `app_auth.go` |
| P60-SC4 | 60-03 | Contract-Alignment Backend/OpenAPI/Frontend | SATISFIED | `fansubs.yaml`, `FansubAppMembersSection.tsx`, `api.ts`; alle drei aligned |
| P60-SC5 | 60-02 | Kein Roh-Token; kein stiller pending-Record | SATISFIED | Cancel-on-fail implementiert und getestet; Audit-Log ohne Token |
| P60-SC6 | 60-03 | Mailjet-Produktionswechsel dokumentiert ohne Secrets | SATISFIED | `docs/operations/mail-delivery.md` + `.env.example` mit Platzhaltern |

**Alle 6 Requirement-IDs aus den PLAN-Frontmattern (P60-SC1 bis P60-SC6) sind in REQUIREMENTS.md definiert und verifiziert.**

---

### Accepted Design Deviation: Cancel-on-fail statt Migration 0081

60-02-PLAN.md listete `database/migrations/0081_fansub_invitation_delivery.up.sql` als Artifact, liess aber beide Implementierungsoptionen offen. Die Implementierung waehlt Cancel-on-fail (kein Schema-Delta), was D-12 vollstaendig erfuellt:

- Kein pending-Record nach SMTP-Fehler: invitationRepo.Cancel() wird bei mailErr aufgerufen (app_auth.go:395)
- Audit-Event `fansub_group_invitation.mail_failed` ohne Raw-Token
- HTTP 502 + reason_code=mail_delivery_failed

Migration 0081 existiert nicht in der Codebase und wird nicht benoetigt. Dies ist eine akzeptierte Designentscheidung gemaess 60-02-SUMMARY.md.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| Keine TBD/FIXME/XXX-Marker in den modifizierten Dateien gefunden | -- | -- | -- | -- |

Keine blockierenden Debt-Marker in den Phase-60-Aenderungen.

**Geprueft auf Stubs:**
- `mailer.go:238`: `NoopMailer.Send` gibt immer `nil` zurueck -- das ist KEIN Stub, sondern die korrekte Noop-Implementierung (per Design D-08)
- `app_auth.go`: Kein `return nil`, kein `return {}`, keine Placeholder-Strings
- `FansubAppMembersSection.tsx`: Kein Placeholder-Text; "Einladung wurde gesendet." ist echter UX-Text

---

### Human Verification Required

#### 1. Fansub-Einladung End-to-End (Mailpit)

**Test:** Docker Compose starten (`docker compose up -d`), Fansub-Admin-UI aufrufen, Einladung per E-Mail fuer eine Testadresse erstellen.

**Expected:** Mail erscheint in Mailpit Web-UI (`http://127.0.0.1:8025`) mit Subject "Einladung zur Fansub-Gruppe"; Body enthaelt absoluten Link `http://127.0.0.1:3002/invitations/accept?token=...`; Frontend zeigt "Einladung wurde gesendet." als Erfolgsmeldung; Einladungslink ist unter "Einladungslink (Entwickler-Fallback)" aufklappbar.

**Why human:** Erfordert laufenden Compose-Stack (Mailpit + Backend + DB); realer SMTP-Fluss nicht per statischer Analyse verifizierbar.

#### 2. Keycloak Passwort-Reset via Mailpit

**Test:** Keycloak-Login aufrufen (`http://127.0.0.1:8081`), "Passwort vergessen" ausloesen, Mailpit pruefen.

**Expected:** Reset-Mail erscheint in Mailpit mit From-Adresse `account@team4s.local`; Reset-Link ist klickbar und fuehrt zur Passwort-Reset-Seite.

**Why human:** Erfordert laufenden Keycloak + Mailpit; Keycloak-SMTP-Fluss ist Laufzeit-Verhalten.

#### 3. Cancel-on-fail Verhalten bei SMTP-Ausfall

**Test:** Mailpit stoppen (`docker compose stop team4sv30-mailpit`), dann Einladung per API erstellen.

**Expected:** HTTP 502 mit `{"error": {"message": "Einladung konnte nicht gesendet werden. Bitte prüfe die SMTP-Konfiguration.", "reason_code": "mail_delivery_failed"}}`; keine `pending`-Einladung in der Datenbank; Audit-Log enthaelt Event `fansub_group_invitation.mail_failed` ohne Raw-Token.

**Why human:** Erfordert kontrollierten Dienst-Ausfall in laufendem Stack.

---

### Gaps Summary

Keine Gaps. Alle 6 Success Criteria sind durch Codebase-Evidence verifiziert. Die Phase ist in einem sehr guten Zustand:

- Kritische Review-Findings CR-01 (Env-Var-Namen-Mismatch) und CR-02 (STARTTLS-Logik) wurden in einem Fix-Commit behoben. Die aktuelle `config.go` (Zeile 112-114) liest korrekt `SMTP_USER` mit Fallback auf `SMTP_USERNAME`, und `SMTP_FROM` mit Fallback auf `SMTP_FROM_EMAIL`. `docker-compose.yml` setzt `SMTP_ENABLED=true` (Zeile 97) und `APP_PUBLIC_URL` (Zeile 105). `mailer.go` implementiert echtes STARTTLS (Zeilen 119-128) mit erzwungenem Upgrade und explizitem Fehler bei fehlendem STARTTLS-Angebot des Servers.

- Warning-level Review-Findings WR-01 (DATA-Close-Fehler), WR-02 (CRLF-Sanitization), WR-03 (RFC2047-Encoding), WR-04 (Quit) wurden ebenfalls behoben: `mailer.go` prueft `wc.Close()`-Fehler explizit (Zeile 158), hat `containsCRLF()`-Funktion (Zeilen 172-175), nutzt `mime.QEncoding.Encode()` fuer Subject (Zeile 186), und ruft `client.Quit()` auf (Zeile 164).

- Pending menschliche Verifikation ist ausschliesslich fuer Laufzeit-Verhalten notwendig, das nicht per statischer Analyse geprueft werden kann.

---

_Verified: 2026-06-02T12:00:00Z_
_Verifier: Claude (gsd-verifier)_

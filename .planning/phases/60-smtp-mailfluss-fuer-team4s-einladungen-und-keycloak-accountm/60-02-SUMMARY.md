---
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
plan: "02"
subsystem: backend
tags: [smtp, mailer, invitations, fansub, go, config]
dependency_graph:
  requires:
    - 60-01 (Mailpit-Infrastruktur und SMTP-Env-Defaults)
  provides:
    - SMTPMailer und NoopMailer als Mailer-Interface in services/
    - SMTP-Konfigurationsfelder in config.Config
    - Einladungsmail-Versand in CreateFansubGroupInvitation mit Cancel-Fehlerpfad
  affects:
    - backend/internal/config/config.go
    - backend/internal/services/mailer.go
    - backend/internal/services/mailer_test.go
    - backend/internal/handlers/app_auth.go
    - backend/internal/handlers/app_auth_test.go
    - backend/cmd/server/main.go
tech_stack:
  added:
    - net/smtp (Go-Standardbibliothek, kein externes Package)
  patterns:
    - Mailer-Interface als Seam fuer NoopMailer (Tests) und SMTPMailer (Produktion)
    - Context-Timeout fuer SMTP-Dial und Mailversand
    - Cancel-on-fail fuer D-12 (kein stiller pending-Record bei SMTP-Ausfall)
key_files:
  created:
    - backend/internal/services/mailer.go
    - backend/internal/services/mailer_test.go
  modified:
    - backend/internal/config/config.go
    - backend/internal/handlers/app_auth.go
    - backend/internal/handlers/app_auth_test.go
    - backend/cmd/server/main.go
decisions:
  - "Fehlerpfad D-12 als Cancel-on-fail implementiert: keine Delivery-Felder-Migration noetig"
  - "Go-Standardbibliothek net/smtp genuetzt: kein externes Mail-Package, kein Lizenz-Overhead"
  - "Mailer-Interface als Seam: NoopMailer fuer SMTP_ENABLED=false und Tests, SMTPMailer fuer echten Betrieb"
  - "Context-Timeout von 15s fuer SMTP-Send verhindert haengenden Handler (STRIDE DoS-Mitigation)"
metrics:
  duration: "~25min"
  completed_date: "2026-06-02"
  tasks: 3
  files: 6
---

# Phase 60 Plan 02: Backend-SMTP-Mailer und Einladungsmail-Versand -- Summary

SMTP-Mailer-Service mit sauberem Interface, Context-Timeout und Noop-Seam fuer Tests gebaut; Einladungsmail in CreateFansubGroupInvitation integriert mit absolutem Link (D-10), Cancel-Fehlerpfad (D-12) und tokenfreiem Audit-Log (D-11).

## Aufgaben

### Task 1 -- SMTP-Konfiguration in Backend-Config ergaenzen

**Commit:** 84046fdb (zusammen mit Task 2)

`backend/internal/config/config.go` um 10 neue SMTP-Felder erweitert:
`SMTPEnabled`, `SMTPHost`, `SMTPPort`, `SMTPUsername`, `SMTPPassword`,
`SMTPFromEmail`, `SMTPFromName`, `SMTPStartTLS`, `AppPublicURL`.
Lokale Defaults sind Mailpit-kompatibel (`team4sv30-mailpit:1025`, `noreply@team4s.local`).

`backend/cmd/server/main.go` verdrahtet den Mailer nach `SMTP_ENABLED`: SMTPMailer wenn aktiv,
NoopMailer sonst. `AppAuthHandler` erhaelt neue Felder `mailer` und `appPublicURL`.

Abgedeckte Designentscheidungen: D-06 (lokale Defaults), D-10 (APP_PUBLIC_URL).

### Task 2 -- Mailer-Service mit Tests bauen

**Commit:** 84046fdb (zusammen mit Task 1)

`backend/internal/services/mailer.go` implementiert:
- `Mailer`-Interface mit `Send(ctx, MailMessage) error`
- `SMTPMailer`: net/smtp-basiert, STARTTLS-faehig, Context-Timeout fuer Dial, MIME multipart/alternative fuer HTML+Text-Mails
- `NoopMailer`: verwirft alle Nachrichten lautlos (Tests und SMTP_ENABLED=false)

`backend/internal/services/mailer_test.go` prueft:
- Interface-Compliance fuer beide Implementierungen
- Noop gibt niemals Fehler zurueck
- SMTPMailer lehnt leeren Empfaenger ab mit sprechendem Fehler
- buildRawMessage: Plaintext-only, Multipart-mit-HTML, From-Header
- formatMailAddress mit und ohne Anzeigenamen

Abgedeckte Designentscheidungen: D-02 (Team4s-Mailer), D-08 (Mailer-Service-Seam).

### Task 3 -- Einladungsversand in CreateFansubGroupInvitation integrieren

**Commit:** 3616a652

`backend/internal/handlers/app_auth.go` -- `CreateFansubGroupInvitation`:

Nach erfolgreicher DB-Einladungserstellung wird `h.mailer.Send()` aufgerufen mit:
- Absolutem Invite-Link: `strings.TrimRight(h.appPublicURL, "/") + created.InviteLink`
- 15s Context-Timeout fuer den SMTP-Aufruf

Fehlerpfad (D-12): Bei SMTP-Fehler wird `h.invitationRepo.Cancel()` aufgerufen
(kein stiller pending-Record), Audit-Event `fansub_group_invitation.mail_failed` geschrieben
und 502 mit `reason_code=mail_delivery_failed` zurueckgegeben.

Audit-Log (D-11): Weder im Erfolgsfall noch im Fehlerfall wird der Roh-Token
in das Payload-Map geschrieben. Nur `email` und `invited_role_codes` werden geloggt.

`backend/internal/handlers/app_auth_test.go` -- neue Tests:
- `TestCreateFansubGroupInvitationSendsMailOnSuccess`: prueft Mailer-Aufruf und absoluten Link
- `TestCreateFansubGroupInvitationCancelsOnMailFailure`: prueft Cancel-Aufruf bei SMTP-Fehler, 502-Status und reason_code
- `TestCreateFansubGroupInvitationAuditLogContainsNoRawToken`: D-11-Konformitaet des Audit-Logs

Abgedeckte Designentscheidungen: D-09, D-10, D-11, D-12.

## Deviationen vom Plan

### Abweichung: Cancel-on-fail statt Delivery-Felder-Migration

**Grund:** Der Plan liess beide Optionen offen ("bevorzugt Delivery-Felder per Migration 0081;
alternativ misslungene Einladung sofort canceln und 502 zurueckgeben").
Die Cancel-Variante wurde gewaehlt, weil sie:
1. Keine Schema-Migration erfordert (kein externer Zustand)
2. Das Invarianz-Versprechen von D-12 einfacher und atomarer erfuellt
3. Den Testaufwand reduziert (kein Delivery-Status-Feld im Modell noetig)

Eine `database/migrations/0081_fansub_invitation_delivery.up.sql` wurde nicht erstellt.
Kein Delivery-Status-Feld in `models.FansubGroupInvitation`.

## Bekannte Stubs

Keine. Der Mailversand ist vollstaendig verdrahtet (NoopMailer fuer SMTP_ENABLED=false,
SMTPMailer fuer echten Betrieb). Mail-Template ist einfach gehalten und kann spaeter
als separater UX-Slice erweitert werden.

## Bedrohungsoberflaeche

| Flag | File | Beschreibung |
|------|------|-------------|
| threat_flag: smtp_credentials | backend/internal/config/config.go | SMTP_PASSWORD und SMTP_USERNAME kommen aus Env; niemals committen -- dokumentiert in .env.example |

STRIDE-Mitigationen des Plans umgesetzt:
- Information Disclosure: Roh-Token nicht im Audit-Log (D-11) - prueft TestCreateFansubGroupInvitationAuditLogContainsNoRawToken
- Repudiation: Delivery-Outcome als Audit-Event fansub_group_invitation.mail_failed
- Denial of Service: 15s Context-Timeout fuer SMTP-Dial + Send

## Self-Check: PASSED

- FOUND: backend/internal/services/mailer.go
- FOUND: backend/internal/services/mailer_test.go
- FOUND: backend/internal/config/config.go (SMTP-Felder ergaenzt)
- FOUND: backend/internal/handlers/app_auth.go (mailer-Integration)
- FOUND: backend/internal/handlers/app_auth_test.go (neue Tests)
- FOUND: backend/cmd/server/main.go (Mailer verdrahtet)
- Commit 84046fdb (Task 1+2): verifiziert
- Commit 3616a652 (Task 3): verifiziert
- go test ./internal/services: PASS
- go test ./internal/handlers -run Invitation: PASS (5 Tests)
- go test ./internal/config ./cmd/server: PASS

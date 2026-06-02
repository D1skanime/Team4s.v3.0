---
status: passed
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
source: [60-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-02T14:35:00+02:00
---

## Current Test

Live-UAT im In-App-Browser und lokalem Stack abgeschlossen.

## Tests

### 1. Fansub-Einladung End-to-End (Mailpit)
expected: Compose starten, Fansub-Gruppeneinladung erstellen. Mail erscheint in Mailpit (http://127.0.0.1:8025) mit absolutem Einladungslink (APP_PUBLIC_URL). UI zeigt "Einladung wurde gesendet."; der Entwickler-Fallback-Link erscheint nur dezent als aufklappbares `<details>`.
result: [passed]
evidence:
- Backend fuer Live-Test mit `SMTP_ENABLED=true`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_STARTTLS=false`, `APP_PUBLIC_URL=http://127.0.0.1:3000` gestartet.
- UI-Test als `phase43-member@example.local` auf `/admin/fansubs/88/edit`, Tab `App-Mitglieder`.
- Testadresse `phase60-final-1780402723309@example.local` eingeladen.
- UI zeigte `Einladung wurde gesendet.` und den Entwickler-Fallback-Link als aufklappbaren Details-Bereich.
- Mailpit zeigte 1 Nachricht: From `noreply@team4s.local`, To `phase60-final-1780402723309@example.local`, Subject `Einladung zur Fansub-Gruppe`.
- Mail-Text enthaelt einen absoluten Accept-Link auf `http://127.0.0.1:3000/invitations/accept?token=...`.
- DB-Pruefung: Einladung `pending`, `token_hash` Laenge 64, kein Raw-JWT-Muster.

### 2. Keycloak Passwort-Reset via Mailpit
expected: In Keycloak "Passwort vergessen" ausloesen. Reset-Mail landet in Mailpit, der Reset-Link ist klickbar und fuehrt zum Keycloak-Flow.
result: [passed]
evidence:
- Bestehender Keycloak-Realm wurde im laufenden Dev-Stack per Admin-API auf Mailpit-SMTP gesetzt, weil der Container vor Phase 60 erstellt worden war und Realm-Importe bestehende Realms ueberspringen.
- Reset fuer `phase43-member@example.local` ausgeloest.
- Mailpit zeigte 1 Nachricht: From `account@team4s.local`, To `phase43-member@example.local`, Subject `Reset password`.
- Mail-Text enthaelt einen Keycloak-Reset-Link auf `http://127.0.0.1:8081/realms/team4s/login-actions/action-token?...`.

### 3. Cancel-on-fail bei SMTP-Ausfall
expected: Mailpit stoppen, dann Einladung erstellen. Backend antwortet mit HTTP 502 (reason_code mail_delivery_failed), die Einladung wird storniert (keine verwaiste Einladung in der DB), und im Audit-Log steht kein Roh-Token.
result: [passed]
evidence:
- `docker compose stop team4sv30-mailpit`, danach Einladung ueber die UI erstellt.
- Testadresse `phase60-fail-1780402654640@example.local`.
- UI zeigte `Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration pruefen.`
- DB-Pruefung: Einladung Status `cancelled`, `cancelled_at IS NOT NULL`, `token_hash` Laenge 64.
- Audit-Pruefung: Event `fansub_group_invitation.mail_failed` mit Payload nur `email`, kein Raw-Token.
- Mailpit wurde anschliessend wieder gestartet.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- Kein Funktionsgap. Laufzeithinweis: Bereits existierende lokale Backend-/Keycloak-Prozesse muessen nach Phase 60 mit SMTP-Konfiguration neu gestartet bzw. der bestehende Keycloak-Realm muss aktualisiert werden, weil Keycloak Realm-Importe fuer vorhandene Realms ueberspringt.

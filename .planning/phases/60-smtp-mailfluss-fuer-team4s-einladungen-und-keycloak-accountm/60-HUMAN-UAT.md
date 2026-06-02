---
status: partial
phase: 60-smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
source: [60-VERIFICATION.md]
started: 2026-06-02T00:00:00Z
updated: 2026-06-02T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Fansub-Einladung End-to-End (Mailpit)
expected: Compose starten, Fansub-Gruppeneinladung erstellen. Mail erscheint in Mailpit (http://127.0.0.1:8025) mit absolutem Einladungslink (APP_PUBLIC_URL). UI zeigt "Einladung wurde gesendet."; der Entwickler-Fallback-Link erscheint nur dezent als aufklappbares `<details>`.
result: [pending]

### 2. Keycloak Passwort-Reset via Mailpit
expected: In Keycloak "Passwort vergessen" auslösen. Reset-Mail landet in Mailpit, der Reset-Link ist klickbar und führt zum Keycloak-Flow.
result: [pending]

### 3. Cancel-on-fail bei SMTP-Ausfall
expected: Mailpit stoppen, dann Einladung erstellen. Backend antwortet mit HTTP 502 (reason_code mail_delivery_failed), die Einladung wird storniert (keine verwaiste Einladung in der DB), und im Audit-Log steht kein Roh-Token.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

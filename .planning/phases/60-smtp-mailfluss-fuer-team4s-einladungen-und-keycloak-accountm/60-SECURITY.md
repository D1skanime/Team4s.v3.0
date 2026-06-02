---
phase: 60
slug: smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-02
updated: 2026-06-02
---

# SECURITY - Phase 60

## Scope

Phase 60 hardened the Team4s mail flow so fansub invitation mails and Keycloak account mails are delivered through the configured SMTP transport instead of the development-only noop path. This security pass retroactively verifies the Phase 60 threat model, implementation mitigations, and live UAT evidence.

## Trust Boundaries

| Boundary | Data crossing | Verification focus |
| --- | --- | --- |
| Admin browser -> frontend API helper -> backend invitation endpoint | Invitation email, invited role codes, auth session | Authorized admin action only, central API/auth seam preserved |
| Backend invitation handler -> SMTP transport | Invite email, subject/body, raw invite token inside accept URL | Header injection resistance, delivery failure handling, token leakage minimization |
| Backend invitation repository -> PostgreSQL | Email, token hash, status, expiry, audit payloads | Raw token never persisted, failure state is cancelable/auditable |
| Keycloak realm -> SMTP transport | Account reset mail, action-token link | Realm SMTP configured for the same local/production mail path |
| Runtime environment -> backend/Keycloak SMTP config | SMTP host, port, from address, optional credentials, APP_PUBLIC_URL | Secrets supplied by env/deployment, no committed production credentials |

## Threat Register

| ID | STRIDE | Threat | Mitigation | Evidence | Status |
| --- | --- | --- | --- | --- | --- |
| T-60-01 | Information Disclosure | Raw invitation tokens could be logged or persisted. | Repository stores `token_hash` only; audit payloads intentionally include email/status data but no raw token. | `backend/internal/repository/fansub_group_invitations_repository.go`; `backend/internal/handlers/app_auth.go`; `TestCreateFansubGroupInvitationAuditLogContainsNoRawToken`; live DB check showed 64-character `token_hash` and no raw token column. | Closed |
| T-60-02 | Tampering | A manipulated `APP_PUBLIC_URL` could produce wrong or hostile invite links. | Invite link base comes from runtime config, not request/user input; local and production expectations are documented. | `backend/internal/handlers/app_auth.go`; `.env.example`; `docs/operations/mail-delivery.md`; live Mailpit invitation contained `http://127.0.0.1:3000/invitations/accept?...`. | Closed |
| T-60-03 | Repudiation | Operators could not distinguish successful invitation creation from failed mail delivery. | SMTP failure cancels the pending invitation, returns `mail_delivery_failed`, and records `fansub_group_invitation.mail_failed`; successful creation records `fansub_group_invitation.created`. | `backend/internal/handlers/app_auth.go`; `TestCreateFansubGroupInvitationCancelsOnMailFailure`; live Mailpit outage UAT produced cancelled DB row and `mail_failed` audit event. | Closed |
| T-60-04 | Denial of Service | SMTP delivery could hang the invitation request. | Invitation handler sends mail with a 15-second context timeout; SMTP dial/write path respects bounded timeouts and propagates DATA/QUIT errors. | `backend/internal/handlers/app_auth.go`; `backend/internal/services/mailer.go`; `go test ./internal/services -count=1`; `go test ./internal/handlers -run Invitation -count=1`. | Closed |
| T-60-05 | Information Disclosure | SMTP credentials or Mailjet secrets could be committed or logged. | Backend reads credentials from environment only; `.env.example` uses placeholders; operations docs mark credentials as secrets; server startup logs host/port/from only. | `backend/internal/config/config.go`; `backend/cmd/server/main.go`; `.env.example`; `docs/operations/mail-delivery.md`; Phase 60 summaries confirm no real secrets committed. | Closed |
| T-60-06 | Spoofing / Abuse | Unauthorized users could invite fansub members or trigger mail sends. | Invitation creation remains permission-gated by the app permission service; denied access is audited; frontend continues to use the central API client/auth boundary. | `backend/internal/handlers/app_auth.go`; `frontend/src/lib/api.ts`; `FansubAppMembersSection.test.tsx`; Phase 60 validation checks. | Closed |
| T-60-07 | Tampering | Malicious recipient/from fields could inject mail headers. | SMTP mailer validates recipient and from addresses, rejects CRLF in address/name fields, and encodes subjects with RFC 2047. | `backend/internal/services/mailer.go`; `TestSMTPMailerRejectsCRLFInRecipient`; `TestSMTPMailerRejectsInvalidRecipient`; `TestSMTPMailerSendsMessage`. | Closed |

## Accepted Risks

None.

## Runtime Notes

- Existing local Keycloak realms created before Phase 60 do not automatically re-import `infra/keycloak/realm-team4s.json`; live UAT therefore applied SMTP through the Keycloak Admin API. Fresh realm imports include the SMTP server configuration.
- A host-run backend uses `SMTP_HOST=127.0.0.1` for local Mailpit, while compose services use `team4sv30-mailpit`. This is a deployment/runtime distinction, not an open security threat.

## Security Audit Trail

| Date | Threats reviewed | Closed | Open | Reviewer |
| --- | ---: | ---: | ---: | --- |
| 2026-06-02 | 7 | 7 | 0 | Codex |

## Sign-off

- [x] All Phase 60 threat-model items were reviewed against source code.
- [x] Security-relevant Phase 60 tests were run or referenced from validated UAT evidence.
- [x] Live SMTP success and failure paths were verified in Mailpit and backend/audit state.
- [x] No open security follow-ups remain for Phase 60.

Approved for Phase 60 security closure on 2026-06-02.

---
phase: 60
slug: smtp-mailfluss-fuer-team4s-einladungen-und-keycloak-accountm
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-02
updated: 2026-06-02
---

# Phase 60 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go test, Vitest, TypeScript, Docker Compose, browser/live Mailpit UAT |
| **Config file** | `backend/go.mod`, `frontend/vitest.config.ts`, `frontend/tsconfig.json`, `docker-compose.yml` |
| **Quick run command** | `cd backend && go test ./internal/services -count=1`; `cd backend && go test ./internal/handlers -run Invitation -count=1` |
| **Full suite command** | `docker compose config`; `cd backend && go test ./internal/services ./internal/handlers -run "Invitation|FansubGroupInvitation" -count=1`; `cd frontend && npm run test -- --run "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx"`; `cd frontend && npm run typecheck`; `git diff --check` |
| **Estimated runtime** | ~2 minutes for focused checks; live Mailpit/Keycloak UAT depends on local stack startup |

---

## Sampling Rate

- **After SMTP infrastructure changes:** Run `docker compose config`.
- **After mailer or invitation backend changes:** Run `go test ./internal/services ./internal/handlers -run "Invitation|FansubGroupInvitation" -count=1`.
- **After invitation UX or contract changes:** Run the focused `FansubAppMembersSection` Vitest file and `npm run typecheck`.
- **Before commit:** Run focused backend checks, focused frontend checks, `npm run typecheck`, and `git diff --check`.
- **Max feedback latency:** under 2 minutes for focused automated checks; live SMTP UAT is manual-only.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 60-01-01 | 01 | 1 | P60-SC1 | -- | Docker Compose exposes one local Mailpit SMTP catcher on 1025 and Web UI on 8025. | compose config | `docker compose config` | yes | green |
| 60-01-02 | 01 | 1 | P60-SC2 | -- | Keycloak SMTP configuration points to Mailpit without real outbound delivery or committed secrets. | source + live UAT | `docker compose config`; live Keycloak reset in Mailpit | yes | green |
| 60-01-03 | 01 | 1 | P60-SC6 | -- | Local SMTP defaults and Mailjet production placeholders are documented without real credentials. | diff/source check | `git diff --check -- docker-compose.yml .env.example infra/keycloak/realm-team4s.json docs/operations/keycloak-auth-foundation-phase43.md` | yes | green |
| 60-02-01 | 02 | 2 | P60-SC3 | T-60-DoS | SMTP mailer uses a reusable service seam with timeout behavior and Noop fallback. | unit | `cd backend && go test ./internal/services -count=1` | yes | green |
| 60-02-02 | 02 | 2 | P60-SC3, P60-SC5 | T-60-InfoDisclosure, T-60-Repudiation | Invitation creation sends mail with absolute link; SMTP failure cancels the invitation and returns 502. | handler unit | `cd backend && go test ./internal/handlers -run Invitation -count=1` | yes | green |
| 60-02-03 | 02 | 2 | P60-SC5 | T-60-InfoDisclosure | Raw invitation tokens are not persisted or written to audit logs. | handler unit + DB live spot-check | `cd backend && go test ./internal/handlers -run Invitation -count=1` | yes | green |
| 60-03-01 | 03 | 3 | P60-SC4 | -- | OpenAPI and focused fansubs contract document `invite_link` semantics and `502` / `mail_delivery_failed`. | contract source check | `git diff --check -- shared/contracts/openapi.yaml shared/contracts/fansubs.yaml frontend/src/types/fansub.ts frontend/src/lib/api.ts` | yes | green |
| 60-03-02 | 03 | 3 | P60-SC4 | -- | Invitation UX presents e-mail delivery as primary flow and SMTP failure as a clear German error. | frontend unit | `cd frontend && npm run test -- --run "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx"` | yes | green |
| 60-03-03 | 03 | 3 | P60-SC6 | -- | Mailpit local flow and Mailjet SMTP handoff are documented without secrets or Amazon dependency. | source + diff check | `git diff --check -- docs/operations/mail-delivery.md .env.example` | yes | green |

---

## Wave 0 Requirements

Existing infrastructure covered all Phase 60 automated requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Result |
|----------|-------------|------------|-------------------|--------|
| Fansub invitation appears in Mailpit with absolute accept link | P60-SC1, P60-SC3, P60-SC4, P60-SC5 | Requires live frontend, backend, DB, SMTP catcher, and authenticated browser session. | Start Mailpit and backend with SMTP enabled, log in as `phase43-member@example.local`, create an invitation from `/admin/fansubs/88/edit`, and confirm the Mailpit message includes `http://127.0.0.1:3000/invitations/accept?token=...`. | passed 2026-06-02 |
| Keycloak password reset appears in Mailpit | P60-SC2 | Requires live Keycloak SMTP behavior; existing persisted realms may need SMTP config applied because imports skip existing realms. | Configure realm SMTP to `team4sv30-mailpit:1025`, trigger password reset for `phase43-member@example.local`, and confirm Mailpit receives a `Reset password` mail from `account@team4s.local` with a Keycloak action-token link. | passed 2026-06-02 |
| SMTP outage cancels invitation and surfaces 502 UX | P60-SC5 | Requires controlled Mailpit outage and live UI/API behavior. | Stop `team4sv30-mailpit`, create an invitation, confirm the UI error says the mail could not be delivered, then verify DB status is `cancelled` and audit payload contains no raw token. | passed 2026-06-02 |

---

## Live UAT Evidence 2026-06-02

| Check | Evidence |
|-------|----------|
| Backend SMTP active | Runtime log: `SMTP-Mailer aktiv: 127.0.0.1:1025 (from=noreply@team4s.local)` |
| Final invitation mail | Mailpit count `1`, To `phase60-final-1780402723309@example.local`, From `noreply@team4s.local`, Subject `Einladung zur Fansub-Gruppe`, accept-link present. |
| Token persistence | DB row for final invitation was `pending`, `token_hash` length `64`, and did not look like a raw JWT. |
| Keycloak reset mail | Mailpit To `phase43-member@example.local`, From `account@team4s.local`, Subject `Reset password`, Keycloak `action-token` link present. |
| SMTP failure behavior | UI showed `Einladungsmail konnte nicht zugestellt werden. Bitte SMTP-Konfiguration pruefen.`; DB row for `phase60-fail-1780402654640@example.local` was `cancelled`; audit event was `fansub_group_invitation.mail_failed` with email-only payload. |

---

## Validation Audit 2026-06-02

| Metric | Count |
|--------|-------|
| Gaps found | 0 automated coverage gaps |
| Resolved | 9 automated/source verification rows |
| Escalated | 3 manual/live SMTP UAT rows, all passed |

---

## Validation Sign-Off

- [x] All tasks have automated verify coverage or documented manual-only live UAT.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency under 2 minutes for focused automated checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-02

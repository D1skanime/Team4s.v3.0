---
phase: 135
slug: einladungs-und-onboarding-flow-fuer-eingeladene-fansub-mitgl
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-17
---

# Phase 135 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (frontend, `frontend/package.json` `"test": "vitest run"`); Go stdlib `testing` + `testify` (backend) |
| **Config file** | `frontend/vitest.config.ts`; Go tests run via `go test ./...` from `backend/` |
| **Quick run command** | `npm --prefix frontend run test -- src/app/invitations/accept src/app/login src/app/admin/fansubs` and `go test ./internal/handlers/... ./internal/repository/... -run Invitation` (from `backend/`) |
| **Full suite command** | `npm --prefix frontend run test` and `go test ./...` (from `backend/`) |
| **Estimated runtime** | ~60 seconds (frontend targeted) / ~180 seconds (full suite both stacks) |

---

## Sampling Rate

- **After every task commit:** Run the targeted Vitest/`go test` command scoped to the touched package.
- **After every plan wave:** Run `npm --prefix frontend run test` (full), `go test ./...` (from `backend/`), and `npm --prefix frontend run lint`.
- **Before `/gsd:verify-work`:** Full suite must be green, plus a live UAT pass (Mailpit `:8025` mail content check, fresh private-browser cold-invite round trip through Keycloak on `:3000`) — per this phase's CONTEXT.md constraint that code-level checks alone are insufficient.
- **Max feedback latency:** ~60 seconds per task (targeted run).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 135-0X-0X | TBD | 0 | D-01/D-04 | — | Accept page offers register+login, persists returnTo, auto-accepts after login | unit/component | `vitest run src/app/invitations/accept/page.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 135-0X-0X | TBD | 0 | D-02 | — | `registrationAllowed` true in tracked + live realm config | source-inspection / live-check | manual grep + live KC admin check | ✅ (config) | ⬜ pending |
| 135-0X-0X | TBD | 0 | D-03 | — | Invite mail contains group name, inviter, explanatory sentence, CTA, correct Umlaute | integration (backend) + manual Mailpit check | `go test ./internal/handlers/... -run TestCreateFansubGroupInvitation` (extend) + live Mailpit `:8025` capture | ❌ Wave 0 | ⬜ pending |
| 135-0X-0X | TBD | 0 | D-05 | — | `HistoricalMemberCard` renders generate/copy/cancel claim-invite UI when `canCreateClaimInvitation` | component (frontend) | `vitest run src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` | ❌ Wave 0 | ⬜ pending |
| 135-0X-0X | TBD | 0 | D-06 | — | `ListFansubGroupRoleDefinitions` returns only `assignable = true` rows | repository/integration (backend) | `go test ./internal/repository/... -run TestListFansubGroupRoleDefinitions` (extend/add) | ⚠️ Partial | ⬜ pending |
| 135-0X-0X | TBD | 0 | D-07 | — | Touched pages use `@/components/ui` primitives only, no raw `<select>/<input>/<textarea>/<button>` | lint / component | `npm --prefix frontend run lint` | ✅ (rule exists, `warn`) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner assigns final plan/wave/task numbering.*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/invitations/accept/page.test.tsx` — new file, covers D-01/D-04 (mirror `frontend/src/app/login/page.test.tsx`'s Vitest setup/mocking pattern for `useAuthSession`, `keycloakAuth`, `api.ts`).
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.test.tsx` — new file, covers D-05 (adapt assertions from the existing, working `ClaimManagementPanel.test.tsx`).
- [ ] Backend test coverage for `ListFansubGroupRoleDefinitions` returning exactly the `assignable = true` set — extend `backend/internal/repository/role_definitions_context_test.go` or add a sibling test, covers D-06.
- [ ] Backend test/assertion for invitation-mail body content (group name, inviter, Umlaute) — covers D-03; check whether `app_auth.go` already has a `_test.go` sibling with a fake `Mailer` to extend before assuming a new file is needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cold-invite end-to-end round trip (no existing account) | D-01/D-04/D-10 (BLOCKER) | Requires real Keycloak self-registration flow + private-browser session; not mockable at unit level | Open invite link in private browser tab on `:3000`, click Registrieren, complete KC self-registration, confirm returnTo redirect + auto-accept + confirmation UI |
| Invite email content/formatting in real inbox | D-03 | Mail rendering (subject, body, Umlaute, CTA link) only fully verifiable in an actual mail client view | Trigger an invite, open Mailpit `:8025`, inspect rendered HTML/plaintext body |
| `registrationAllowed` live Keycloak admin console state | D-02 | Live IdP config can drift from tracked `realm-team4s.json`; only the running Keycloak instance is authoritative | Check Keycloak admin console realm settings for `team4s` realm login tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

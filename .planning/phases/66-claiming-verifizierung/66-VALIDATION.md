---
phase: 66
slug: claiming-verifizierung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 66 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test (`github.com/stretchr/testify`) + Vitest 3 (Frontend) |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd frontend && npm test -- --run` |
| **Full suite command** | `cd frontend && npm test` + `go test ./...` (im `backend/`) |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npm test -- --run` (Frontend) bzw. `go test ./internal/...` (Backend, im `backend/`)
- **After every plan wave:** Run full suite (`go test ./...` + `npm test`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (planner fills) | — | — | P66-SC1 | — | Self-Service-Claim nur fuer eingeloggte App-User | unit | `go test ./internal/handlers/... -run TestMemberClaim` | ❌ W0 | ⬜ pending |
| (planner fills) | — | — | P66-SC1 | — | UNIQUE(member_id, app_user_id) verhindert Doppel-Claim | unit | `go test ./internal/repository/... -run TestMemberClaim` | ✅ (0081) | ⬜ pending |
| (planner fills) | — | — | P66-SC2 | — | Token gehasht (SHA-256, 64), 7 Tage Ablauf, Lifecycle | unit | `go test ./internal/repository/... -run TestMemberClaimInvitation` | ❌ W0 | ⬜ pending |
| (planner fills) | — | — | P66-SC2 | — | nur 1 verified-Claim pro historischem Member (FOR UPDATE) | unit | `go test ./internal/handlers/... -run TestVerifyClaim` | ❌ W0 | ⬜ pending |
| (planner fills) | — | — | P66-SC3 | — | noindex-PATCH nur durch Profil-Eigentuemer | unit | `go test ./internal/handlers/... -run TestNoindex` | ❌ W0 | ⬜ pending |
| (planner fills) | — | — | P66-SC3 | — | verified-Badge im oeffentlichen Profil sichtbar | component | `cd frontend && npm test -- VerifiedBadge` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/member_claims_handler_test.go` — stubs fuer P66-SC1 (Self-Service-Claim + Verify)
- [ ] `backend/internal/repository/member_claims_repository_test.go` — P66-SC1 UNIQUE-Invariante + 1-verified-Invariante
- [ ] `backend/internal/repository/member_claim_invitations_repository_test.go` — P66-SC2 (Token-Hash, Ablauf, Lifecycle)
- [ ] `backend/internal/handlers/member_profile_noindex_test.go` — P66-SC3 (noindex-PATCH)
- [ ] `frontend/src/components/profile/VerifiedBadge.test.tsx` — P66-SC3 (verified-Badge)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keycloak-Einloesungs-Flow (Link → Registrierung/Login → verified) | P66-SC2 | End-to-End ueber externen Keycloak-Account-Flow, nicht in Unit-Tests reproduzierbar | Einladungslink generieren, in Inkognito oeffnen, Registrierung durchlaufen, pruefen dass `claim_status = verified` und `noindex = false` |
| robots-Meta-Tag `noindex,nofollow` auf Profilseite | P66-SC3 | SSR-Metadata, am besten im Browser/Network verifiziert | Profil mit `noindex=true` aufrufen, Page-Source auf `<meta name="robots" content="noindex,nofollow">` pruefen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

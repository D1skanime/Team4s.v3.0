---
phase: 66
slug: claiming-verifizierung
status: draft
nyquist_compliant: true
wave_0_complete: true
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
| 00-T1-stubs-backend | 66-00 | 0 | P66-SC1, P66-SC2, P66-SC3 | — | Test-Stubs kompilieren ohne Implementierung | stub | `go build ./internal/handlers/... ./internal/repository/...` | ✅ erstellt in W0 | ✅ green |
| 00-T2-stub-frontend | 66-00 | 0 | P66-SC3 | — | Vitest erkennt VerifiedBadge.test.tsx ohne Fehler | stub | `npm test -- --run VerifiedBadge` | ✅ erstellt in W0 | ✅ green |
| 01-T1-migration | 66-01 | 1 | P66-SC2 | T-66-01-02 | token_hash CHECK erzwingt SHA-256-Länge | migration | `powershell -Command "Select-String -Path 'database/migrations/0092_member_claim_invitations.up.sql' -Pattern 'member_claim_invitations','token_hash','char_length'"` | ✅ erstellt in W1 | ✅ green |
| 02-T1-claims-repo | 66-02 | 2 | P66-SC1 | T-66-02-01 | Self-Service-Claim nur für eingeloggte App-User; UNIQUE-Invariante | unit | `go test ./internal/repository/... -run TestMemberClaims` | ✅ erstellt in W2 | ✅ green |
| 02-T2-invitations-repo | 66-02 | 2 | P66-SC2 | T-66-02-03 | Token gehasht (SHA-256, 64), 7 Tage Ablauf, Lifecycle | unit | `go test ./internal/repository/... -run TestMemberClaimInvitation` | ✅ erstellt in W2 | ✅ green |
| 03-T1-claims-handler | 66-03 | 3 | P66-SC1 | T-66-03-05 | nur 1 verified-Claim pro historischem Member (FOR UPDATE) | unit | `go test ./internal/handlers/... -run TestMemberClaim` | ✅ erstellt in W3 | ✅ green |
| 03-T2-noindex-handler | 66-03 | 3 | P66-SC3 | T-66-03-06 | noindex-PATCH nur durch Profil-Eigentümer mit verified Claim | unit | `go test ./internal/handlers/... -run "TestNoindex\|TestVerifyClaim"` | ✅ erstellt in W3 | ✅ green |
| 04-T1-public-profile | 66-04 | 4 | P66-SC3 | T-66-04-05 | is_verified + noindex in GET /members/:slug Response | build | `go build ./internal/repository/... ./internal/models/...` | ✅ erstellt in W4 | ✅ green |
| 04-T2-wiring | 66-04 | 4 | P66-SC1, P66-SC2, P66-SC3 | T-66-04-01 | Alle Routen verdrahtet; TypeScript sauber | build | `go build ./cmd/server/... && npx tsc --noEmit` | ✅ erstellt in W4 | ✅ green |
| 05-T1-verified-badge | 66-05 | 5 | P66-SC3 | T-66-05-01 | verified-Badge im öffentlichen Profil sichtbar | component | `npm test -- --run VerifiedBadge` | ✅ erstellt in W5 | ✅ green |
| 05-T2-me-profile | 66-05 | 5 | P66-SC3 | T-66-05-02 | noindex-Toggle nutzt patchNoindex(); generateMetadata korrekt | build | `npm run build` | ✅ erstellt in W5 | ✅ green |
| 06-T1-accept-page | 66-06 | 5 | P66-SC2 | T-66-06-01 | Token nach Erfolg aus URL entfernt; Login-Redirect mit return_to | build | `npx tsc --noEmit` | ❌ erstellt in W5 | ⬜ pending |
| 06-T2-groups-page | 66-06 | 5 | P66-SC1, P66-SC2 | T-66-06-03 | Claim-Queue + Neuanlage-Antrags-Queue (D-03) sichtbar | build | `npm run build` | ❌ erstellt in W5 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/internal/handlers/member_claims_handler_test.go` — stubs für P66-SC1 (Self-Service-Claim + Verify) — geplant in 66-00 Task 1
- [x] `backend/internal/repository/member_claims_repository_test.go` — P66-SC1 UNIQUE-Invariante + 1-verified-Invariante — geplant in 66-00 Task 1
- [x] `backend/internal/repository/member_claim_invitations_repository_test.go` — P66-SC2 (Token-Hash, Ablauf, Lifecycle) — geplant in 66-00 Task 1
- [x] `backend/internal/handlers/member_profile_noindex_test.go` — P66-SC3 (noindex-PATCH) — geplant in 66-00 Task 1
- [x] `frontend/src/components/profile/VerifiedBadge.test.tsx` — P66-SC3 (verified-Badge) — geplant in 66-00 Task 2

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keycloak-Einlösungs-Flow (Link → Registrierung/Login → verified) | P66-SC2 | End-to-End über externen Keycloak-Account-Flow, nicht in Unit-Tests reproduzierbar | Einladungslink generieren, in Inkognito öffnen, Registrierung durchlaufen, prüfen dass `claim_status = verified` und `noindex = false` |
| robots-Meta-Tag `noindex,nofollow` auf Profilseite | P66-SC3 | SSR-Metadata, am besten im Browser/Network verifiziert | Profil mit `noindex=true` aufrufen, Page-Source auf `<meta name="robots" content="noindex,nofollow">` prüfen |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (66-00-PLAN.md erstellt)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

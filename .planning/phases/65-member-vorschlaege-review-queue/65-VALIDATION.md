---
phase: 65
slug: member-vorschlaege-review-queue
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: go test (stretchr/testify) · Frontend: vitest 3 |
| **Config file** | Backend: backend/go.mod · Frontend: frontend/vitest.config.ts |
| **Quick run command** | `cd backend && go test ./internal/handlers/...` |
| **Full suite command** | `cd backend && go test ./... ` then `cd frontend && npm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go test ./internal/handlers/...`
- **After every plan wave:** Run full suite (backend `go test ./...` + frontend `npm run test`)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 65-01-01 | 01 | 1 | P65-SC1 | — | Migration 0089 (Ablehngrund-Spalte) up/down idempotent | manual | `cd backend && go run ./cmd/migrate up` | ❌ W0 | ⬜ pending |
| 65-02-01 | 02 | 2 | P65-SC1 | T-65-01 | POST proposals nur für eigene verifizierte Gruppe (D-01/D-03); fremde Gruppe → 403 | unit | `cd backend && go test ./internal/handlers/ -run Proposal` | ❌ W0 | ⬜ pending |
| 65-02-02 | 02 | 2 | P65-SC1 | T-65-02 | Duplikat (member+anime+group) → 409 via uq_anime_contribution_member | unit | `cd backend && go test ./internal/handlers/ -run Duplicate` | ❌ W0 | ⬜ pending |
| 65-03-01 | 03 | 2 | P65-SC2 | T-65-03 | Confirm setzt confirmed+beide Flags+confirmed_by; nur Leader/Admin (CanForFansubGroup) | unit | `cd backend && go test ./internal/handlers/ -run Review` | ❌ W0 | ⬜ pending |
| 65-03-02 | 03 | 2 | P65-SC2 | T-65-03 | Reject setzt disputed + optionalen Ablehngrund; kein Hard-Delete | unit | `cd backend && go test ./internal/handlers/ -run Reject` | ❌ W0 | ⬜ pending |
| 65-04-01 | 04 | 2 | P65-SC3 | T-65-04 | 90-Tage-Selbstschaltung on-read; vor Ablauf nicht erlaubt → 403/409 | unit | `cd backend && go test ./internal/handlers/ -run Timeout` | ❌ W0 | ⬜ pending |
| 65-05-01 | 05 | 3 | P65-SC1, P65-SC2, P65-SC3 | — | Frontend-Komponenten rendern Status-Gruppierung + Review-Queue | unit | `cd frontend && npm run test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/contribution_proposals_handler_test.go` — stubs für P65-SC1 (proposal create, ownership, duplicate)
- [ ] `backend/internal/handlers/contribution_review_handler_test.go` — stubs für P65-SC2 (confirm/reject) und P65-SC3 (90-Tage-Selbstschaltung)
- [ ] Repository-Interface-Stub (analog bestehender AnimeContributionsRepository httptest+Stub-Tests — neue Endpunkte NICHT roh gegen *pgxpool.Pool, sonst nicht testbar)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration 0089 läuft via cmd/migrate / Docker | P65-SC1 | DB-Migration braucht laufende Postgres-Instanz | `docker-compose up -d db && cd backend && go run ./cmd/migrate up`, dann Spalte in `anime_contributions` prüfen |
| Member-Dashboard „Eigene Vorschläge"-UX (Modal, Status-Gruppen) | P65-SC1, P65-SC3 | Visuelle/Interaktions-UX im Browser | me/contributions öffnen, Vorschlag einreichen, Status-Gruppierung + 90-Tage-Hinweis prüfen |
| Review-Queue-UX im Leader-Bereich | P65-SC2 | Visuelle/Interaktions-UX im Browser | admin/my-groups/[id] als Leader öffnen, Vorschlag bestätigen/ablehnen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 97
slug: revoke-rollen-lifecycle-uebergang
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-01
---

# Phase 97 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | go test (Go 1.25, testify) |
| **Framework (Frontend)** | vitest 3 (jsdom) |
| **Config file** | none extra — `backend/go.mod`, `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && go test ./internal/repository/... ./internal/handlers/...` |
| **Full suite command** | `cd backend && go test ./...` + `cd frontend && npx vitest run` |
| **Estimated runtime** | ~20–60 s |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the touched package.
- **After every plan wave:** Run the full suite command.
- **Before `/gsd:verify-work`:** Full suite green + Docker-Rebuild (`docker compose up -d --build team4sv30-backend team4sv30-frontend`) + Live-Smoke gegen :8092/:3000.
- **Max feedback latency:** ~60 s.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 97-00-1 | 00 | 0 | D-02/D-04 | unit (Go, RED) | `cd backend && go test ./internal/repository/... -run TestHistRoleStructHasDateFields\|TestHistRoleEndDateRule` | ⬜ pending |
| 97-00-2 | 00 | 0 | D-05 | unit (Go, RED) | `cd backend && go test ./internal/repository/... -run TestResolvePendingRolesToActive\|TestVerifyClaimActivatesRoles` | ⬜ pending |
| 97-00-3 | 00 | 0 | D-03 | unit (Vitest, RED) | `cd frontend && npx vitest run src/app/admin/fansubs` | ⬜ pending |
| 97-01-1 | 01 | 1 | D-02 | migration | `migrate up` + psql-Check DATE-Spalten vorhanden, Bestandsdaten gemappt | ⬜ pending |
| 97-01-2 | 01 | 1 | D-04 | compile | `cd backend && go build ./...` — D-10-Auto-Archivierung mit DATE-Spalten | ⬜ pending |
| 97-02-1 | 02 | 2 | D-02 | compile | `cd backend && go build ./internal/repository/...` — Structs mit *time.Time | ⬜ pending |
| 97-02-2 | 02 | 2 | D-02 | unit (Go) | `cd backend && go test ./internal/repository/... ./internal/handlers/...` | ⬜ pending |
| 97-03-1 | 03 | 3 | D-01/D-03 | typecheck | `cd frontend && npx tsc --noEmit` | ⬜ pending |
| 97-03-2 | 03 | 3 | D-03 | unit (Vitest, GREEN) | `cd frontend && npx vitest run src/app/admin/fansubs` — Wave-0-Tests nun grün | ⬜ pending |
| 97-04-1 | 04 | 4 | D-05 | unit (Go, GREEN) | `cd backend && go test ./internal/repository/... -run TestResolvePendingRolesToActive\|TestVerifyClaimActivatesRoles` | ⬜ pending |
| 97-04-2 | 04 | 4 | D-06 | typecheck | `cd frontend && npx tsc --noEmit` — ClaimManagementPanel.tsx kompiliert | ⬜ pending |
| 97-05-1 | 05 | 5 | D-08 | smoke (curl) | Bearer-Token + curl auf ListByMember-Endpunkt → started_date ISO-String im Response | ⬜ pending |
| 97-05-2 | 05 | 5 | D-07 | grep-gate | `grep -rn "hist_group_member_roles" backend/internal/permissions/` → 0 Treffer | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Go-Repository-Tests für D-02/D-04: `hist_group_member_roles_date_test.go` (Plan 97-00)
- [x] Go-Repository-Tests für D-05: `member_claims_repository_claim_activation_test.go` (Plan 97-00)
- [x] Vitest-Test für D-03: `GroupHistRoleDialog.test.tsx` (Plan 97-00)

*Frameworks sind vorhanden — kein Install nötig.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Claim-Aktivierung end-to-end im Browser | D-05 | Login/Claim-Flow + Admin-Bestätigung | :3000 als Admin, hist-Mitglied claimen, Rollen ohne Enddatum werden aktiv |
| D-06 ClaimManagementPanel: Rollen-Select + Button | D-06 | UI-Interaktion im Browser | :3000 → Claim-Management → Dropdown + "Aktive Rolle zuweisen"-Button testen |
| Historie-Anzeige im Profil | D-08 | UI nachgelagert, nur DB-Korrektheit in dieser Phase | DB-Check + Basisanzeige; polierte UI = Folge-Phase |

---

## Validation Sign-Off

- [x] Alle Tasks haben `<automated>` verify oder Wave-0-Abhängigkeit
- [x] Sampling-Kontinuität: keine 3 Tasks in Folge ohne automatisierte Prüfung
- [x] Wave 0 deckt alle MISSING-Referenzen (97-00-PLAN.md anlegt RED-Tests für D-02/D-03/D-04/D-05)
- [ ] Keine watch-mode-Flags
- [ ] Feedback-Latenz < 60 s
- [x] `nyquist_compliant: true` in Frontmatter gesetzt

**Approval:** pending (wave_0_complete wird nach Plan-97-00-Ausführung true)

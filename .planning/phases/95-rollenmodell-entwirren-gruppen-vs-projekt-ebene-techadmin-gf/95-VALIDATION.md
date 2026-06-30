---
phase: 95
slug: rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-30
---

# Phase 95 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Inhalt abgeleitet aus `95-RESEARCH.md` → „Validierungs-Architektur" + „Sicherheitsdomäne".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | `go test` + `github.com/stretchr/testify` |
| **Framework (Frontend)** | Vitest 3 |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && go test ./internal/handlers/... ./internal/repository/...` · `cd frontend && npm run test -- --reporter=dot` |
| **Full suite command** | `cd backend && go test ./...` · `cd frontend && npm run test` |
| **Estimated runtime** | ~60–120 seconds (Backend) + Frontend-Vitest |

---

## Sampling Rate

- **After every task commit:** `go test ./internal/handlers/... ./internal/repository/...` + `npm run test -- --reporter=dot`
- **After every plan wave:** Full suite — `go test ./...` + `npm run test`
- **Before `/gsd:verify-work`:** Full suite green; manueller Smoke gegen Live-Backend `:8092` mit Bearer-Token (Keycloak Direct-Grant, client `team4s-frontend`)
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

> Vorbefüllt aus RESEARCH.md (D-NN ist das Tracking-Vokabular dieser Phase — keine REQ-IDs gemappt).
> Plan/Wave-Spalten ergänzt der Planner beim Mapping auf konkrete PLAN-Tasks.

| Decision | Behavior | Threat Ref | Test Type | Automated Command | File Exists | Status |
|----------|----------|------------|-----------|-------------------|-------------|--------|
| D-04 | `hist_group_member_roles` enthält keine `leader`/`project_manager`-Zeilen nach Migration | — | Migration-Roundtrip | `go test ./internal/repository/... -run TestRoleDefinitionsContext` | ✅ (anpassen) | ⬜ pending |
| D-06 | group_history-Whitelist gibt nur kanonische Codes zurück | — | unit | `go test ./internal/repository/... -run TestGroupHistoryWhitelist` | ❌ W0 | ⬜ pending |
| D-07/08 | `techadmin`+`gfxler` in `role_definitions`, `assignable=true`, ohne `role_capabilities` | T-95 EoP | integration | Smoke gegen DB | ❌ W0 | ⬜ pending |
| D-10 | `SetMemberRole(Enable=false)` erzeugt `hist_group_member_roles`-„ended"-Eintrag | — | unit (repo) | `go test ./internal/repository/... -run TestAutoArchive` | ❌ W0 | ⬜ pending |
| D-12 | `GET /admin/fansub-group-roles` liefert `techadmin`+`gfxler` data-driven | — | API-Roundtrip | `go test ./internal/handlers/... -run TestListFansubGroupRoles` | ❌ W0 | ⬜ pending |
| D-13 (CR-01) | `POST` hist-member-role mit App-Code (`translator`) → 422 | T-95 Tampering | unit (handler) | `go test ./internal/handlers/... -run TestCreateHistGroupMemberRoleWhitelistReject` | ❌ W0 | ⬜ pending |
| D-14 (WR-02) | `GET` hist-member-roles mit fremder `member_id` → 422 | T-95 Info-Disclosure | unit (handler) | `go test ./internal/handlers/... -run TestListHistGroupMemberRolesCrossGroupGuard` | ❌ W0 | ⬜ pending |
| D-15 (WR-01) | Capability-Tests treffen Produktions-Handler (nicht `adminCapabilityHandlerWithStubs`) | — | unit (handler) | `go test ./internal/handlers/... -run TestGrantCapability` | ✅ (umschreiben) | ⬜ pending |
| D-16 (WR-03/04) | `ProposalForm.tsx` ≤ 450 Z. · `dev/ui-system/page.tsx` ≤ 450 Z. | — | statisch (wc -l) | `wc -l frontend/src/components/contributions/ProposalForm.tsx frontend/src/app/dev/ui-system/page.tsx` | N/A | ⬜ pending |
| D-17 (WR-05) | Deterministische Kategorie-Reihenfolge in `RoleCapabilityDetail` | — | unit (React) | `npm run test -- RoleCapabilityDetail` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/repository/hist_group_member_roles_whitelist_test.go` — deckt D-06
- [ ] `backend/internal/repository/fansub_group_app_members_auto_archive_test.go` — deckt D-10
- [ ] `backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go` — neue Tests für CR-01/WR-02 (Datei existiert, Tests ergänzen)
- [ ] `backend/internal/handlers/admin_fansub_group_roles_handler_test.go` — deckt D-12
- [ ] `frontend/src/app/admin/role-capabilities/RoleCapabilityDetail.test.tsx` — deckt D-17

---

## Manual-Only Verifications

| Behavior | Decision | Why Manual | Test Instructions |
|----------|----------|------------|-------------------|
| Neue Rolle erscheint live in Capability-Matrix `/admin/role-capabilities` nach Migration + Backend-Rebuild | D-07/08, D-12 | Erfordert Docker-Backend-Rebuild (`:8092`) + Browser gegen Dev-Server `:3000` | Migration anwenden → `docker compose up -d --build team4sv30-backend` → `/admin/role-capabilities` öffnen, `techadmin`+`gfxler` mit allen Switches AUS prüfen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

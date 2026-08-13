---
phase: 87
slug: sichtbarkeits-steuerung-per-rolle-capability-pflege-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-18
---

# Phase 87 — Validation Strategy

> Per-phase validation contract. Detail-Begründung: `## Validation Architecture` in `87-RESEARCH.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `testify` (Backend); Vitest 3 (Frontend) |
| **Config file** | `frontend/vitest.config.ts`; Backend Go-Defaults; DB `team4s_v2` via pgx |
| **Quick run command** | `cd backend && go test ./internal/permissions ./internal/handlers -run "Capability\|Reload\|RoleCapabilit\|Visibility\|LastAction\|ViewCapabilityEnforcement\|IsStandalone" -count=1` |
| **Full suite command** | `cd backend && go build ./... && go test ./... -count=1` plus `cd frontend && npm test` |
| **Estimated runtime** | ~90–150 Sekunden |

---

## Sampling Rate

- **After every task commit:** Quick run command
- **After every plan wave:** Full suite (Backend-Build + betroffene Tests)
- **Before `/gsd:verify-work`:** Backend + Frontend grün; Cache-Reload-Test grün
- **Max feedback latency:** 150 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|------|--------|
| 87-W0 | 87-01 | 0 | D-01..D-08 | — | RED-Stubs für Reload, Fail-safe, IsStandalone, Lockout-Guard, View-Enforcement, UI | unit | `go test ./internal/permissions ./internal/handlers -run "Reload\|IsStandalone\|Capability\|ViewCapabilityEnforcement" -count=1` | mehrere (Wave-0) | ⬜ pending |
| 87-RL | 87-01 | 0 | D-06 | — | ReloadCache lädt role_capabilities neu; Mutation wirkt ohne Restart | unit | `go test ./internal/permissions -run TestReloadCacheReplacesCacheAtomically -count=1` | `permissions_reload_test.go` | ⬜ pending |
| 87-FS | 87-01 | 0 | D-06 | T-87-02b | Fail-safe: fehlgeschlagener Reload überschreibt nie den gültigen Cache (kein fail-open) | unit | `go test ./internal/permissions -run TestReloadCacheFailsafe -count=1` | `permissions_reload_test.go` | ⬜ pending |
| 87-SA | 87-01 | 0 | — | T-87-03 | IsStandaloneAction(ActionFansubGroupInvitationsAccept)=true; IsStandaloneAction(ActionReleaseView)=false | unit | `go test ./internal/permissions -run TestIsStandaloneAction -count=1` | `permissions_standalone_test.go` | ⬜ pending |
| 87-GUARD | 87-01/02 | 0/2 | D-07 | T-lockout | Letzte-Rolle-für-Action-Entzug → abgelehnt vor DB-Mutation (kein Reload-Fail) | unit | `go test ./internal/handlers -run "LastAction\|CapabilityRevokeGuard\|TestRevokeCapabilityLastActionGuard" -count=1` | `admin_capability_handler_test.go` | ⬜ pending |
| 87-ENF | 87-01/02 | 0/2 | D-01/D-02 | T-priv-esc | Gegateter Lese-Endpunkt: ohne View-Capability 403, mit 200 | unit | `go test ./internal/handlers -run "ViewCapabilityEnforcement" -count=1` | `fansub_view_enforcement_test.go` (Wave-0-RED in Plan 87-01; GREEN in Plan 87-02) | ⬜ pending |
| 87-UI | 87-01/03 | 0/3 | D-04/D-05 | — | Pflege-UI rendert Rollen×Actions, Vergeben/Entziehen via @/components/ui | unit | `npm test -- src/app/admin/role-capabilities/` | `RoleCapabilityClient.test.tsx` | ⬜ pending |
| 87-AUDIT | 87-01/02 | 0/2 | D-06 | T-repudiation | Jede Capability-Mutation schreibt AuditLogEntry | unit | `go test ./internal/handlers -run "CapabilityAudit" -count=1` | `admin_capability_handler_test.go` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/permissions/permissions_reload_test.go`: TestReloadCacheReplacesCacheAtomically (RED→GREEN in Plan 87-01), TestReloadCacheFailsafe (RED→GREEN in Plan 87-01)
- [ ] `backend/internal/permissions/permissions_standalone_test.go`: TestIsStandaloneAction (RED→GREEN in Plan 87-01)
- [ ] `backend/internal/handlers/admin_capability_handler_test.go`: TestGrantCapabilityRequiresPlatformAdmin, TestRevokeCapabilityLastActionGuard, TestCapabilityAuditOnGrant (RED in Plan 87-01; GREEN in Plan 87-02)
- [ ] `backend/internal/handlers/fansub_view_enforcement_test.go`: TestViewCapabilityEnforcementGroupMembers, TestViewCapabilityEnforcementUnifiedMembers, TestViewCapabilityEnforcementAnimeCoverage (RED in Plan 87-01; GREEN in Plan 87-02)
- [ ] `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx`: Wave-0-RED-Test (RED in Plan 87-01; GREEN in Plan 87-03)

*Bestehende permissions-/admin-Tests bleiben grün (behavior-preserving für nicht-gegatete Pfade).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| „Capability-Änderung wirkt ohne Deploy" end-to-end | D-06 | Reload + Live-Wirkung im Browser | Als Admin Capability einer Rolle entziehen → betroffener User verliert Sicht ohne Server-Restart |
| Lese-Sichtbarkeit pro Rolle | D-01 | Echte Session zweier Rollen | Mit Rolle A (mit View-Recht) sichtbar, mit Rolle B (ohne) → 403/leer |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 150s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

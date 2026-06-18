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
| **Quick run command** | `cd backend && go test ./internal/permissions ./internal/handlers -run "Capability\|Reload\|RoleCapabilit\|Visibility\|LastAction" -count=1` |
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

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 87-W0 | — | 0 | D-01..D-07 | — | RED-Stubs für Reload, Lockout-Guard, Enforcement, UI | unit | `go test ./internal/permissions ./internal/handlers -run "Reload\|Capability" -count=1` | ❌ W0 | ⬜ pending |
| 87-RL | — | — | D-06 | — | ReloadCache lädt role_capabilities neu; Mutation wirkt ohne Restart | unit | `go test ./internal/permissions -run ReloadCache -count=1` | ❌ W0 | ⬜ pending |
| 87-GUARD | — | — | D-07 | T-lockout | Letzte-Rolle-für-Action-Entzug → abgelehnt vor DB-Mutation (kein Reload-Fail) | unit | `go test ./internal/handlers -run "LastAction\|CapabilityRevokeGuard" -count=1` | ❌ W0 | ⬜ pending |
| 87-ENF | — | — | D-01/D-02 | T-priv-esc | Gegateter Lese-Endpunkt: ohne View-Capability 403, mit 200 | unit | `go test ./internal/handlers -run "Visibility\|RoleCapabilityView" -count=1` | ❌ W0 | ⬜ pending |
| 87-UI | — | — | D-04/D-05 | — | Pflege-UI rendert Rollen×Actions, Vergeben/Entziehen via @/components/ui | unit | `npm test -- src/app/admin/.../RoleCapabilities` | ❌ W0 | ⬜ pending |
| 87-AUDIT | — | — | D-06 | T-repudiation | Jede Capability-Mutation schreibt AuditLogEntry | unit | `go test ./internal/handlers -run "CapabilityAudit" -count=1` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Backend-Testdateien (RED): `ReloadCache`, Lockout-Guard (letzte Rolle für Action), View-Enforcement (403/200), Capability-Mutations-Audit
- [ ] Frontend-Testdatei (RED): Capability-Pflege-Komponente (Rollen×Actions, Mutation, @/components/ui)

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

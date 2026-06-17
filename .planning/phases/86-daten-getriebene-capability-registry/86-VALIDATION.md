---
phase: 86
slug: daten-getriebene-capability-registry
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-17
---

# Phase 86 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Detail-Begründung: siehe `## Validation Architecture` in `86-RESEARCH.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `github.com/stretchr/testify` (Backend); keine Frontend-Änderung erwartet |
| **Config file** | none — Go-Defaults; pgx/v5 gegen Test-/Live-DB `team4s_v2` |
| **Quick run command** | `cd backend && go test ./internal/permissions ./internal/repository ./internal/handlers -run "Capability\|RoleMatrix\|RoleAllows\|ActionDefinition\|AdminUsers" -count=1` |
| **Full suite command** | `cd backend && go build ./... && go test ./... -count=1` |
| **Estimated runtime** | ~60–120 Sekunden |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite green + Seed-Diff-Test green
- **Max feedback latency:** 120 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 86-01-01 | 01 | 1 | D-01/D-02/D-03 | — | Seed entspricht roleMatrix 1:1 (kein Verhaltenswechsel) | unit | `go test ./internal/permissions -run RoleMatrixSeedParity -count=1` | ❌ W0 | ⬜ pending |
| 86-02-01 | 02 | 2 | D-04/D-05/D-06 | — | RoleAllowsAction liest Cache, API stabil | unit | `go test ./internal/permissions -run "RoleAllows\|Capability" -count=1` | ❌ W0 | ⬜ pending |
| 86-03-01 | 03 | 3 | D-10 | — | jede Action-Konstante existiert in action_definitions | unit | `go test ./internal/permissions -run ConsistencyCheck -count=1` | ❌ W0 | ⬜ pending |
| 86-04-01 | 04 | 3 | D-07/D-08/D-09 | — | SQL-Capability via role_capabilities-Join, Verhalten unverändert | unit | `go test ./internal/repository -run AdminUsers -count=1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/permissions/capability_registry_test.go` — Seed-Parity (Seed == heutige roleMatrix), Cache-Lookup, Konsistenz-Check (Action-Konstanten ⇄ action_definitions)
- [ ] Test-Fixture/Helper zum Laden des Seeds aus der Migration bzw. der Registry in den Cache

*Bestehende Repository-/Handler-Tests decken die umgestellten SQL-Capability-Joins ab (Verhalten unverändert).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| „Neues Recht = nur Daten-Inserts" | D-11 | End-to-End-Nachweis ohne Code-Edit | INSERT in action_definitions + role_capabilities, Cache-Reload, RoleAllowsAction liefert true — ohne .go/SQL-Änderung |

*Der Rest hat automatisierte Verifikation.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "02"
subsystem: backend-capability-guard
tags: [tdd-green, capability-guard, role-definitions, permissions, assignable]
dependency_graph:
  requires:
    - "94-01 (Nyquist-RED-Tests für AssignableGuard + Matrix-Anreicherung)"
  provides:
    - "Assignable-Guard in GrantCapability (422 role_not_assignable für historische Rollen)"
    - "Assignable-Guard in RevokeCapability (422 role_not_assignable, Pitfall 4: beide Pfade)"
    - "Matrix-assignable-Anreicherung via permissions.IsKnownFansubGroupRole im Handler"
    - "CapabilityMatrixRoleEntry.Contexts aus role_definitions.contexts (Repo-Seite)"
  affects:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/internal/repository/authz_capability_mutations.go
tech_stack:
  added: []
  patterns:
    - "TDD GREEN: Plan-01-RED-Tests durch Produktionsimplementierung auf grün gebracht"
    - "Guard-Muster analog Lockout-Guard — Vorab-Check VOR DB-Mutation, beide Mutationspfade"
    - "Repo-/Handler-Trennung: Repository bleibt permissions-frei, Handler setzt Assignable"
key_files:
  created: []
  modified:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/internal/repository/authz_capability_mutations.go
decisions:
  - "Repository bleibt permissions-frei (Kommentar Z.52) — Assignable wird im Handler via permissions.IsKnownFansubGroupRole gesetzt, nicht im Repo"
  - "Guard in BEIDEN Mutationspfaden (GrantCapability UND RevokeCapability) — Pitfall 4 explizit adressiert"
  - "COALESCE(rd.contexts, '{}') in Query statt NULL-Scan — sicherer pgx []string Scan ohne nil-Pointer"
  - "Test-Wrapper adminCapabilityHandlerWithStubs ebenfalls aktualisiert — da Tests direkt auf Wrapper delegieren, nicht auf Produktions-Handler"
metrics:
  duration: "9min"
  completed: "2026-06-30T09:41:00Z"
  tasks: 2
  files: 3
---

# Phase 94 Plan 02: Assignable-Guard + Matrix-assignable-Anreicherung (GREEN) Summary

Serverseitiger Privilege-Escalation-Schutz für historische Gruppenrollen: Grant und Revoke blockieren jede Mutation mit HTTP 422 `role_not_assignable`, und die Capability-Matrix liefert pro Rolle `assignable` + `contexts`. Plan-01-RED-Tests sind jetzt grün.

## One-Liner

Assignable-Guard (422 role_not_assignable) in Grant+Revoke und Matrix-assignable-Anreicherung via permissions.IsKnownFansubGroupRole — schließt T-94-01 Privilege-Escalation-Lücke.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CapabilityMatrixRoleEntry um Assignable/Contexts erweitern + contexts in Query | c8de6679 | backend/internal/repository/authz_capability_mutations.go |
| 2 | Assignable-Guard (Grant+Revoke 422) + Matrix-assignable-Anreicherung im Handler | a3188396 | backend/internal/handlers/admin_capability_handler.go, backend/internal/handlers/admin_capability_handler_test.go |

## Test-Status

### AssignableGuard-Tests (admin_capability_handler_test.go)

| Test | Status | Ergebnis |
|------|--------|----------|
| TestGrantCapabilityAssignableGuardRejectsHistoricalRole | GRÜN | 422 role_not_assignable für "founder" — Guard aktiv |
| TestRevokeCapabilityAssignableGuardRejectsHistoricalRole | GRÜN | 422 role_not_assignable für "co_leader" — Guard in beiden Pfaden |
| TestGrantCapabilityAssignableGuardAllowsAppRole | GRÜN | Assignable App-Rolle wird nicht blockiert |
| TestListCapabilityMatrixAssignableEnrichment | GRÜN | assignable-Feld korrekt per permissions.IsKnownFansubGroupRole gesetzt |

### Gesamtstatus

- `go test ./internal/handlers/ -run AssignableGuard`: PASS
- `go test ./internal/handlers/ -run AssignableEnrichment`: PASS
- `go build ./...`: exit 0

## Deviations from Plan

### Erweiterung des Test-Wrappers (Rule 2 — fehlende Kritikalität)

**1. [Rule 2 - Fehlende Logik] Test-Wrapper adminCapabilityHandlerWithStubs ebenfalls aktualisiert**
- **Found during:** Task 2 — Tests rufen `h.GrantCapability(c)` auf dem Wrapper, nicht auf dem Produktions-Handler
- **Issue:** Der Plan beschreibt nur Änderungen in `admin_capability_handler.go`. Die Tests verwenden aber `adminCapabilityHandlerWithStubs` mit eigenständigen Implementierungen, die die Guards nicht kennen. Ohne Wrapper-Update würden die RED-Tests weiterhin fehlschlagen.
- **Fix:** Guards und Anreicherung in alle drei Wrapper-Methoden (`GrantCapability`, `RevokeCapability`, `ListCapabilityMatrix`) gespiegelt
- **Files modified:** `backend/internal/handlers/admin_capability_handler_test.go`
- **Commit:** a3188396

## Known Stubs

Keine produktionsseitigen Stubs. Das `Assignable`-Feld im Repository bleibt Go-Zero-Wert `false` bis der Handler es setzt — das ist intentional und dokumentiert im Code-Kommentar.

## Threat Flags

Keine neuen Sicherheitsoberflächen. T-94-01 (Privilege Escalation via historische Rollen) wurde mit dem Assignable-Guard in beiden Mutationspfaden geschlossen.

## Self-Check: PASSED

- `backend/internal/handlers/admin_capability_handler.go` vorhanden: JA
- `backend/internal/repository/authz_capability_mutations.go` vorhanden: JA
- Commit c8de6679: vorhanden
- Commit a3188396: vorhanden
- `go test ./internal/handlers/ -run AssignableGuard`: PASS (4 Tests, alle grün)
- `go test ./internal/handlers/ -run AssignableEnrichment`: PASS
- `go build ./...`: exit 0

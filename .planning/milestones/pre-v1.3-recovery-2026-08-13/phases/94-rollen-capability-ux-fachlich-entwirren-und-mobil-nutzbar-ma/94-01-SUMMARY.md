---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "01"
subsystem: backend-tests
tags: [nyquist, tdd-red, capability-guard, role-definitions, permissions]
dependency_graph:
  requires: []
  provides:
    - "AssignableGuard-Verhaltensspezifikation (422 role_not_assignable für Grant+Revoke)"
    - "Matrix-Assignable-Anreicherungstest (assignable-Feld pro RoleEntry)"
    - "group_history-Whitelist-Invariante (Disjunktheit zu FansubGroupRoles)"
  affects:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/repository/authz_capability_mutations.go
    - backend/internal/repository/hist_group_member_roles_repository.go
tech_stack:
  added: []
  patterns:
    - "Nyquist RED-Phase: Tests schreiben bevor Produktionscode existiert"
    - "Interface-Assertion-Stil für geplante Methoden ohne Live-DB"
    - "permissions.IsKnownFansubGroupRole als Erwartungsorakel (keine hartkodierten Listen)"
key_files:
  created:
    - backend/internal/repository/role_definitions_context_test.go
  modified:
    - backend/internal/handlers/admin_capability_handler_test.go
decisions:
  - "AssignableGuard-Tests in adminCapabilityHandlerWithStubs eingebettet (kein neuer Handler-Typ nötig)"
  - "stubCapabilityAuthzRepo.matrixRoles-Feld additiv ergänzt für Matrix-Fixture-Tests"
  - "RoleDefinitionsContext-Tests deterministisch ohne Live-DB (Whitelist-Konstante + Set-Schnitt)"
  - "groupHistoryRoleWhitelist als Paket-Konstante in Test-Datei (verbindliche Spezifikation für Plan 94-03)"
metrics:
  duration: "8min"
  completed: "2026-06-30T09:11:00Z"
  tasks: 2
  files: 2
---

# Phase 94 Plan 01: Nyquist RED-Tests (AssignableGuard + group_history-Whitelist) Summary

Vier rote Go-Tests und zwei Whitelist-Tests verankern die Verhaltensspezifikation für Phase-94-Backend-Guards, bevor deren Produktionsimplementierung (Plan 02/03) existiert.

## One-Liner

Nyquist-RED-Tests fixieren 422 role_not_assignable (Grant+Revoke), assignable-Anreicherung in der Capability-Matrix und die kuratierte group_history-Whitelist {founder, leader, co_leader, project_manager}.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rote Tests für AssignableGuard (Grant+Revoke 422) und Matrix-Anreicherung | 7865cad0 | backend/internal/handlers/admin_capability_handler_test.go |
| 2 | Roter/kompilierender Test für group_history-Read-Whitelist | 48870053 | backend/internal/repository/role_definitions_context_test.go |

## Test-Status

### AssignableGuard-Tests (admin_capability_handler_test.go)

| Test | Status | Erwartung |
|------|--------|-----------|
| TestGrantCapabilityAssignableGuardRejectsHistoricalRole | ROT | 422 für "founder" — Guard fehlt noch |
| TestRevokeCapabilityAssignableGuardRejectsHistoricalRole | ROT | 422 für "co_leader" — Guard fehlt noch |
| TestGrantCapabilityAssignableGuardAllowsAppRole | GRÜN | Beabsichtigt — assignable Rolle darf nicht 422 erhalten |
| TestListCapabilityMatrixAssignableEnrichment | ROT | assignable-Feld fehlt noch im JSON-Response |

### RoleDefinitionsContext-Tests (role_definitions_context_test.go)

| Test | Status | Erwartung |
|------|--------|-----------|
| TestRoleDefinitionsContextWhitelistOnly | GRÜN | Deterministisch ohne Live-DB — Set-Schnitt == leer |
| TestRoleDefinitionsContextWhitelistExpectedCodes | GRÜN | Genau 4 Codes in Whitelist |

## Deviations from Plan

Keine — Plan exakt ausgeführt.

## Known Stubs

Keine produktionsseitigen Stubs eingeführt. Die Test-Datei `role_definitions_context_test.go` enthält `GroupHistoryRoleDefinition`-Typ und Methoden-Signatur als Kommentar — das ist beabsichtigte Spezifikation, kein Stub.

## Threat Flags

Keine neuen Sicherheitsoberflächen eingeführt. Nur Test-Dateien geändert/erstellt.

## Self-Check: PASSED

- `backend/internal/handlers/admin_capability_handler_test.go` vorhanden: JA
- `backend/internal/repository/role_definitions_context_test.go` vorhanden: JA
- Commit 7865cad0: vorhanden
- Commit 48870053: vorhanden
- `go test ./internal/handlers/ -run AssignableGuard`: schlägt fehl (RED — erwartet)
- `go test ./internal/repository/ -run RoleDefinitionsContext`: ok (GRÜN — deterministisch)

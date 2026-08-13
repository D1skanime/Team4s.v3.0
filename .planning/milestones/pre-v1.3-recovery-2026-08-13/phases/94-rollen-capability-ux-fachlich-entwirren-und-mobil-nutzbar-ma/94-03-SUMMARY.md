---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "03"
subsystem: backend-api
tags: [role-definitions, group_history, whitelist, auth-gate, permissions, read-endpoint]
dependency_graph:
  requires:
    - "94-01 (groupHistoryRoleWhitelist-Konstante + Plan-01-Repo-Test)"
  provides:
    - "GET /api/v1/admin/fansubs/:id/role-definitions (kuratierte group_history-Liste)"
    - "Repo-Methode ListGroupHistoryRoleDefinitions mit kuratiertier Whitelist"
    - "Auth-Gate-Test: nicht-berechtigter Actor → 403"
  affects:
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go
    - backend/cmd/server/admin_routes.go
tech_stack:
  added: []
  patterns:
    - "Kuratierte Whitelist-Variable als Paket-Konstante statt naivem ANY(contexts)"
    - "CanForFansubGroup(ActionFansubGroupMembersView)-Gate vor DB-Read"
    - "Fake-Resolver-Muster (fansubMediaPermissionResolver) für nil-DB-Handler-Tests"
key_files:
  created:
    - backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go
  modified:
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/cmd/server/admin_routes.go
decisions:
  - "groupHistoryDialogRoleWhitelist als benannte Paketvariable im Repository (nicht exportiert) — Plan-01-Test referenziert eigene lokale Whitelist-Kopie, beide sind identisch"
  - "auditLogRepo=nil im Test ist nil-safe — auditPermissionDenied prüft nil vor Write (Z.79 permission_authz.go)"
  - "Route GET /admin/fansubs/:id/role-definitions direkt neben den member-roles-Routen platziert (gleicher Handler, gleicher Scope)"
metrics:
  duration: "7min"
  completed: "2026-06-30T09:46:30Z"
  tasks: 3
  files: 4
---

# Phase 94 Plan 03: group_history-Read-Endpunkt (kuratierte Rollenliste) Summary

Neuer schlanker GET-Endpunkt liefert kuratierte group_history-Rollenliste aus role_definitions via expliziter Whitelist — verhindert Migration-0103-Drift, autorisiert via CanForFansubGroup(MembersView), Auth-Gate durch Handler-Test belegt.

## One-Liner

GET /admin/fansubs/:id/role-definitions liefert genau {Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement} über SQL-Whitelist-Filter statt naivem group_history-Kontext-Scan.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Repo-Methode ListGroupHistoryRoleDefinitions (kuratierte Whitelist) | 0f3e7e3f | backend/internal/repository/hist_group_member_roles_repository.go |
| 2 | Read-Handler ListGroupHistoryRoleDefinitions + Route-Registrierung | c57b4060 | backend/internal/handlers/fansub_hist_group_member_roles_handler.go, backend/cmd/server/admin_routes.go |
| 3 | Handler-Test Auth-Gate (nicht-berechtigter Actor → 403) | 8fbb3e85 | backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go |

## Test-Status

| Test | Status | Erwartung |
|------|--------|-----------|
| TestRoleDefinitionsContextWhitelistOnly (Plan-01) | GRÜN | Whitelist ∩ FansubGroupRoles() == leer |
| TestRoleDefinitionsContextWhitelistExpectedCodes (Plan-01) | GRÜN | Genau 4 Codes |
| TestListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor | GRÜN | recorder.Code == 403 |

## Deviations from Plan

Keine — Plan exakt ausgeführt.

## Known Stubs

Keine produktionsseitigen Stubs eingeführt.

## Threat Flags

Kein neuer Threat. T-94-04 (Information Disclosure) durch CanForFansubGroup-Gate mitigiert; T-94-05-B (Elevation of Privilege durch naives ANY(contexts)) durch Whitelist-Filter mitigiert.

## Self-Check: PASSED

- `backend/internal/repository/hist_group_member_roles_repository.go` enthält ListGroupHistoryRoleDefinitions: JA
- `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` enthält ListGroupHistoryRoleDefinitions: JA
- `backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go` enthält TestListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor: JA
- `backend/cmd/server/admin_routes.go` enthält role-definitions-Route: JA
- Commit 0f3e7e3f: vorhanden
- Commit c57b4060: vorhanden
- Commit 8fbb3e85: vorhanden
- `go test ./internal/repository/ -run RoleDefinitionsContext`: PASS
- `go test ./internal/handlers/ -run ListGroupHistoryRoleDefinitionsDeniesUnauthorizedActor`: PASS
- `go build ./...`: PASS
- `go vet ./internal/handlers/ ./cmd/server/`: PASS

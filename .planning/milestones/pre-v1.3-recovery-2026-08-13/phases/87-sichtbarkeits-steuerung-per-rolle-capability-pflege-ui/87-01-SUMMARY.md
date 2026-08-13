---
phase: 87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui
plan: "01"
subsystem: permissions
tags: [permissions, capability-registry, openapi, tdd, wave-0]
dependency_graph:
  requires:
    - "86: daten-getriebene-capability-registry (permissions.go LoadCache, action_definitions, role_capabilities)"
  provides:
    - "ReloadCache-API für Handler nach Mutation"
    - "IsStandaloneAction als exportierte Paket-Funktion"
    - "OpenAPI-Contract admin-capabilities.yaml (3 Endpunkte)"
    - "TypeScript-Typen RoleCapabilityMatrix/RoleEntry/ActionEntry/RoleActionState"
    - "Wave-0-RED-Tests als Sicherheitsnetz für Plan 87-02 + 87-03"
  affects:
    - "87-02: Handler-Implementierung (liest gegen ReloadCache + IsStandaloneAction)"
    - "87-03: Pflege-UI (liest gegen TypeScript-Typen + OpenAPI-Contract)"
tech_stack:
  added: []
  patterns:
    - "TDD Wave-0: RED-Tests vor Produktionscode als Sicherheitsnetz"
    - "Delegation statt Duplizierung: ReloadCache → LoadCache (kein eigener D-10-Check)"
    - "Exportierte API statt paket-private Slice direkt: IsStandaloneAction"
key_files:
  created:
    - backend/internal/permissions/permissions_reload_test.go
    - backend/internal/permissions/permissions_standalone_test.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/internal/handlers/fansub_view_enforcement_test.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
  modified:
    - backend/internal/permissions/permissions.go
decisions:
  - "ReloadCache delegiert vollständig an LoadCache — kein eigener Mutex, kein eigener D-10-Check; Fail-safe ist inhärent durch LoadCache-Semantik (loadedCache wird erst nach bestandenem Check gesetzt)"
  - "IsStandaloneAction als Paket-Funktion ohne Empfänger — Consumer brauchen keinen Service-Pointer für reine Action-Klassifikation"
  - "RoleCapabilityClient.test.tsx importiert nicht-existente Komponente als Wave-0-RED-Signal (Modul-nicht-gefunden statt t.Fatalf)"
  - "Handler-Stub-Tests nutzen t.Fatalf('not implemented — Plan 87-02') — kompilieren, schlagen beim Run fehl"
metrics:
  duration: "5 Minuten"
  completed: "2026-06-18"
  tasks: 2
  files: 8
---

# Phase 87 Plan 01: Wave-0-Fundament — ReloadCache, IsStandaloneAction, Contracts Summary

**One-liner:** ReloadCache-Delegation + IsStandaloneAction-Export in permissions.go, 5 RED-Testdateien als Sicherheitsnetz, OpenAPI-Contract mit 3 Endpunkten und TypeScript-Interfaces für die Capability-Matrix.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | ReloadCache + IsStandaloneAction + Wave-0-Backend-RED-Tests | 0240f547 | permissions.go, permissions_reload_test.go, permissions_standalone_test.go, admin_capability_handler_test.go, fansub_view_enforcement_test.go |
| 2 | OpenAPI-Contract + TypeScript-Typen | 98099e37 | admin-capabilities.yaml, admin-capability.ts, RoleCapabilityClient.test.tsx |

## Verification Results

| Kriterium | Status |
|-----------|--------|
| `go test ./internal/permissions/... -run "TestReloadCache\|TestIsStandaloneAction"` → alle PASS | PASS |
| `go test ./internal/handlers/... -run "TestGrantCapability\|TestRevokeCapability\|TestCapabilityAudit\|TestViewCapabilityEnforcement"` → alle FAIL mit "not implemented" | PASS (erwartet RED) |
| shared/contracts/admin-capabilities.yaml mit GET/PUT/DELETE vorhanden | PASS |
| frontend/src/types/admin-capability.ts exportiert 4 Interfaces | PASS |
| `go build ./...` erfolgreich | PASS |
| `grep "func IsStandaloneAction" permissions.go` → Treffer auf Zeile 496 | PASS |

## Implementation Notes

### ReloadCache (permissions.go)
- Signatur: `func (s *Service) ReloadCache(ctx context.Context, loader CacheLoader) error`
- Gibt direkt `return s.LoadCache(ctx, loader)` zurück — keine Eigenlogik
- Fail-safe ist durch LoadCache garantiert: `loadedCache` wird erst nach bestandenem D-10-Check gesetzt; ein fehlender Loader-Fehler lässt den alten Cache intakt

### IsStandaloneAction (permissions.go)
- Exportierte Paket-Funktion (kein Methoden-Empfänger)
- `func IsStandaloneAction(a Action) bool { return slices.Contains(standaloneActions, a) }`
- Einziger Wahrheitsort für Standalone-Klassifikation; Consumer hardcoden keine Action-Codes mehr

### Wave-0-RED-Tests
- `TestReloadCacheReplacesCacheAtomically` + `TestReloadCacheFailsafe`: GRÜN nach permissions.go-Ergänzung
- `TestIsStandaloneAction`: GRÜN
- 6 Handler-Stub-Tests: FAIL mit "not implemented" — erwartetes RED-Signal für Plan 87-02

### OpenAPI-Contract (admin-capabilities.yaml)
- OpenAPI 3.0.3, eigenständiges Dokument
- 3 Pfade: GET /api/v1/admin/role-capabilities, PUT + DELETE /api/v1/admin/role-capabilities/{roleCode}/{actionCode}
- Schemas: RoleCapabilityMatrix, RoleEntry, RoleActionState, ActionEntry, LockoutErrorResponse
- 409-Response für DELETE mit `error.code = "lockout_guard"` dokumentiert

### TypeScript-Typen (admin-capability.ts)
- 4 exportierte Interfaces: RoleActionState, RoleEntry, ActionEntry, RoleCapabilityMatrix
- Spiegelbildlich zum OpenAPI-Schema; `tsc --noEmit` ohne Fehler

## Deviations from Plan

None — Plan executed exactly as written.

## Threat Flags

None — keine neuen Netzwerk-Endpunkte oder Auth-Pfade in diesem Plan (reine Fundament-Vorbereitung; Endpunkte werden in Plan 87-02 implementiert).

## Self-Check: PASSED

Checked:
- `backend/internal/permissions/permissions.go` — enthält ReloadCache (Zeile ~487) und IsStandaloneAction (Zeile 496) ✓
- `backend/internal/permissions/permissions_reload_test.go` — existiert ✓
- `backend/internal/permissions/permissions_standalone_test.go` — existiert ✓
- `backend/internal/handlers/admin_capability_handler_test.go` — existiert ✓
- `backend/internal/handlers/fansub_view_enforcement_test.go` — existiert ✓
- `shared/contracts/admin-capabilities.yaml` — existiert, 8955 Bytes ✓
- `frontend/src/types/admin-capability.ts` — existiert ✓
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` — existiert ✓
- Commit 0240f547 — vorhanden ✓
- Commit 98099e37 — vorhanden ✓

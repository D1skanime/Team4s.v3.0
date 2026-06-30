---
phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
plan: "04"
subsystem: backend
tags: [interface-refactor, testing, go-backend, audit-log, tdd]
dependency_graph:
  requires:
    - 95-01 (DB-Migration + Go-Backend-SQL-Sync)
    - 95-02 (CatalogLoader, fansubGroupRoleCatalog dynamisiert)
  provides:
    - AdminCapabilityHandler mit Interface-Feldern statt *repository.AuthzRepository (D-15/WR-01)
    - adminCapabilityHandlerWithStubs gelöscht — Tests gegen Produktions-Handler
    - Audit-Log in RevokeCapability jetzt durch Tests abgedeckt (Divergenz behoben)
  affects:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/cmd/server/main.go
tech_stack:
  added: []
  patterns:
    - Interface-Segregation: capabilityAuthzRepo + capabilityMutationRepo + capabilityPermissionSvc + capabilityAuditRepo
    - capabilityMutationRepo implementiert permissions.CacheLoader (LoadRoleCapabilities eingebettet)
    - authzRepo zweimal übergeben in main.go (erfüllt beide Interfaces)
    - context.Context statt interface{Done() <-chan struct{}} in Interface-Deklarationen
key_files:
  created: []
  modified:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/cmd/server/main.go
decisions:
  - "capabilityMutationRepo enthält LoadRoleCapabilities damit der Stub das permissions.CacheLoader-Interface erfüllt — Handler übergibt h.mutationRepo an permissionSvc.ReloadCache"
  - "context.Context statt interface{Done() <-chan struct{}} in Interface-Deklarationen — *repository.AuthzRepository-Methodensignaturen nehmen context.Context, Go-Interface-Matching erfordert exakten Typ"
  - "authzRepo zweimal an NewAdminCapabilityHandler übergeben in main.go — *repository.AuthzRepository erfüllt sowohl capabilityAuthzRepo als auch capabilityMutationRepo"
  - "stubCapabilityAuthzRepo.LoadRoleCapabilities-Rückgabetyp auf map[string][]permissions.Action korrigiert — war vorher map[string]permissions.Action (Typ-Fehler)"
metrics:
  duration: "5min"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_changed: 3
---

# Phase 95 Plan 04: Interface-Refaktorierung WR-01 (D-15) — Zusammenfassung

**Ergebnis:** AdminCapabilityHandler hält jetzt Interface-Felder statt konkrete `*repository.AuthzRepository`-Typen; der duplizierte `adminCapabilityHandlerWithStubs`-Struct ist entfernt; alle Tests treffen den Produktions-Handler inklusive Audit-Log-Schreibung in Grant und Revoke.

## Abgeschlossene Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | AdminCapabilityHandler auf Interface-Felder umstellen | 0df66dd4 | admin_capability_handler.go, main.go |
| 2 | Stub-Struct entfernen + Tests auf NewAdminCapabilityHandler umstellen | 21a22d33 | admin_capability_handler_test.go |

## Gelieferte Artefakte

### Neue Interfaces in `admin_capability_handler.go`

Vier Interface-Typen deklariert:

| Interface | Methoden | Erfüllt durch |
|-----------|----------|---------------|
| `capabilityAuthzRepo` | `AppUserHasGlobalRole` | `*repository.AuthzRepository` |
| `capabilityMutationRepo` | `ListCapabilityMatrix`, `GrantRoleCapability`, `RevokeRoleCapability`, `CountRolesWithAction`, `LoadRoleCapabilities` | `*repository.AuthzRepository` |
| `capabilityPermissionSvc` | `ReloadCache` | `*permissions.Service` |
| `capabilityAuditRepo` | `Write` | `*repository.AuditLogRepository` |

### AdminCapabilityHandler Struct

```go
type AdminCapabilityHandler struct {
    authzRepo     capabilityAuthzRepo
    mutationRepo  capabilityMutationRepo
    permissionSvc capabilityPermissionSvc
    auditLogRepo  capabilityAuditRepo
}
```

### Konstruktor

```go
func NewAdminCapabilityHandler(
    authzRepo     capabilityAuthzRepo,
    mutationRepo  capabilityMutationRepo,
    permissionSvc capabilityPermissionSvc,
    auditLogRepo  capabilityAuditRepo,
) *AdminCapabilityHandler
```

### main.go (Z.416)

```go
adminCapabilityHandler := handlers.NewAdminCapabilityHandler(authzRepo, authzRepo, permissionSvc, auditLogRepo)
```

authzRepo zweimal — erfüllt beide Interface-Parameter.

### Test-Datei

- `adminCapabilityHandlerWithStubs` (Z.506-626) vollständig gelöscht
- Alle 7 Tests konstruieren `NewAdminCapabilityHandler(authzStub, authzStub, permStub, auditStub)` direkt
- Stub `stubCapabilityAuthzRepo` erfüllt beide Interfaces (authzRepo + mutationRepo)
- Divergenz behoben: `TestCapabilityAuditOnGrant` und `TestRevokeCapabilityLastActionGuard` testen jetzt Produktions-Handler mit echtem Audit-Log-Aufruf

## Abweichungen vom Plan

### Auto-Fix [Regel 1 - Bug] Interface-Typ-Mismatch context.Context vs. interface{Done()}

**Gefunden in:** Task 1 (go build ./...)

**Problem:** Die bestehenden Interfaces verwendeten `interface{ Done() <-chan struct{} }` als Ctx-Typ (historisches Pattern um context ohne Import zu akzeptieren). `*repository.AuthzRepository`-Methoden nehmen `context.Context`. Go's Interface-Matching erfordert exakten Typ-Match — daher Compile-Fehler.

**Fix:** Interface-Deklarationen auf `context.Context` umgestellt. `import "context"` bereits vorhanden.

**Dateien:** `admin_capability_handler.go`

**Commit:** 0df66dd4

### Auto-Fix [Regel 1 - Bug] stubCapabilityAuthzRepo.LoadRoleCapabilities falscher Rückgabetyp

**Gefunden in:** Task 2 (go vet ./internal/handlers/...)

**Problem:** Bestehende Stub-Methode gab `map[string]permissions.Action` zurück, aber `capabilityMutationRepo`-Interface erwartet `map[string][]permissions.Action` (Slice von Actions pro Rolle).

**Fix:** Rückgabetyp in der Stub-Methode korrigiert.

**Dateien:** `admin_capability_handler_test.go`

**Commit:** 21a22d33

## Verifikation

- `go build ./...` — grün (0 Fehler)
- `go test ./...` — 11/11 Pakete PASS
- `grep "\*repository.AuthzRepository" admin_capability_handler.go` → 0 Treffer
- `grep "adminCapabilityHandlerWithStubs" admin_capability_handler_test.go` → 0 Treffer
- `TestGrantCapabilityRequiresPlatformAdmin` — PASS
- `TestRevokeCapabilityLastActionGuard` — PASS (409 vom Produktions-Handler)
- `TestGrantCapabilityAssignableGuardRejectsHistoricalRole` — PASS
- `TestRevokeCapabilityAssignableGuardRejectsHistoricalRole` — PASS
- `TestGrantCapabilityAssignableGuardAllowsAppRole` — PASS
- `TestListCapabilityMatrixAssignableEnrichment` — PASS
- `TestCapabilityAuditOnGrant` — PASS (Audit-Log durch Produktions-Handler geschrieben)

## Known Stubs

Keine — alle Implementierungen sind vollständig. Die Stub-Typen (`stubCapabilityAuthzRepo`, `stubCapabilityPermissionSvc`, `captureAuditLogRepo`) sind Test-Doubles, keine Stubs in Produktionscode.

## Threat Flags

- T-95-04-T mitigiert: Stub-Handler ohne Audit-Log in RevokeCapability entfernt; `TestRevokeCapabilityLastActionGuard` trifft jetzt Produktions-Handler — Divergenz zwischen Stub und Produktion beseitigt.

## Self-Check: PASSED

- [x] `backend/internal/handlers/admin_capability_handler.go` enthält Interface-Felder (4 Interfaces deklariert)
- [x] `backend/internal/handlers/admin_capability_handler_test.go` enthält KEINEN `adminCapabilityHandlerWithStubs`-Struct
- [x] Commit 0df66dd4 existiert (Task 1)
- [x] Commit 21a22d33 existiert (Task 2)
- [x] `go build ./...` grün
- [x] `go test ./...` grün (11/11 Pakete)

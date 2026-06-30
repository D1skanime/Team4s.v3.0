---
phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
plan: "02"
subsystem: backend
tags: [permissions, catalog, data-driven, go-backend, api-endpoint, tdd]
dependency_graph:
  requires:
    - 95-01 (Migration 0112 — assignable-Spalte und neue Rollen in role_definitions)
  provides:
    - CatalogLoader-Interface in permissions.go (D-12)
    - LoadFansubGroupCatalog()-Methode auf *permissions.Service (D-12)
    - RoleTechadmin/RoleGfxler-Konstanten in permissions.go (D-07)
    - LoadFansubGroupRoles() in authz_permissions.go + CatalogLoader-Compile-Assertion
    - Neuer Handler admin_group_roles_handler.go mit GET /admin/fansub-group-roles
    - TestMain-Setup in handlers- und repository-Paket für catalog-abhängige Tests
  affects:
    - backend/internal/permissions/permissions.go
    - backend/internal/repository/authz_permissions.go
    - backend/internal/handlers/admin_group_roles_handler.go
    - backend/internal/handlers/admin_fansub_group_roles_handler_test.go
    - backend/internal/handlers/testmain_test.go
    - backend/internal/repository/testmain_test.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
tech_stack:
  added: []
  patterns:
    - CatalogLoader-Interface analog zu CacheLoader (gleiche Datei, gleiche Startup-Sequenz)
    - package-level var mit sync.RWMutex analog zu loadedCache/cacheMu
    - LoadFansubGroupCatalog NACH LoadCache (Fallstrick 5 aus RESEARCH.md)
    - TestMain in Test-Paketen die dynamischen Catalog benötigen
    - Handler mit `any`-Typ für roleChecker (analog zu requirePlatformAdminIdentity-Signatur)
key_files:
  created:
    - backend/internal/handlers/admin_group_roles_handler.go
    - backend/internal/handlers/admin_fansub_group_roles_handler_test.go
    - backend/internal/handlers/testmain_test.go
    - backend/internal/repository/testmain_test.go
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/repository/authz_permissions.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
decisions:
  - "fansubGroupRoleCatalog wird jetzt als package-level var mit catalogMu sync.RWMutex gehalten statt als statische []string — LoadFansubGroupCatalog() übernimmt den atomaren Swap beim Server-Start (D-12)"
  - "AdminGroupRolesHandler.authzRepo ist any (nicht capabilityAuthzRepo) da requirePlatformAdminIdentity() roleChecker als any erwartet und intern per Type-Assertion auf AppUserHasGlobalRole(ctx context.Context, ...) prüft"
  - "TestMain in handlers- und repository-Paket nötig weil der Catalog nicht mehr statisch ist — ohne Setup gibt permissions.FansubGroupRoles() leer zurück und bestehende Tests scheitern an Vorbedingungen"
  - "LoadFansubGroupCatalog wird nach LoadCache aufgerufen (main.go) — Reihenfolge ist kritisch (Fallstrick 5): LoadCache ZUERST da permissions-Konsistenz-Check vorher laufen muss"
metrics:
  duration: "15min"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_changed: 8
---

# Phase 95 Plan 02: CatalogLoader-Interface und GET /admin/fansub-group-roles — Zusammenfassung

**Ergebnis:** fansubGroupRoleCatalog dynamisiert — wird jetzt beim Server-Start aus role_definitions (WHERE assignable=true) geladen; neuer API-Endpunkt GET /admin/fansub-group-roles liefert den Catalog als JSON; RoleTechadmin/RoleGfxler als Konstanten; TestListFansubGroupRoles GREEN.

## Abgeschlossene Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | Wave-0-Test + LoadFansubGroupRoles Repository | 4a79d919 | authz_permissions.go, admin_fansub_group_roles_handler_test.go |
| 2 | CatalogLoader-Interface + Handler + Route + main.go | ae314212 | 6 Dateien (permissions.go, admin_group_roles_handler.go, admin_routes.go, main.go, 2x testmain_test.go) |

## Gelieferte Artefakte

### permissions.go

- `RoleTechadmin = "techadmin"`, `RoleGfxler = "gfxler"` — neue Konstanten (D-07)
- `type CatalogLoader interface { LoadFansubGroupRoles(ctx context.Context) ([]string, error) }` — neues Interface analog zu CacheLoader
- `var catalogMu sync.RWMutex` + `var fansubGroupRoleCatalog []string` — dynamisiert (war statische Slice mit 10 Codes)
- `func (s *Service) LoadFansubGroupCatalog(ctx, CatalogLoader) error` — analoger Loader zu LoadCache
- `FansubGroupRoles()` und `IsKnownFansubGroupRole()` jetzt mit `catalogMu.RLock()` abgesichert

### authz_permissions.go

- `LoadFansubGroupRoles(ctx) ([]string, error)` — Query `SELECT code FROM role_definitions WHERE assignable=true ORDER BY sort_order, code`
- `var _ permissions.CatalogLoader = (*AuthzRepository)(nil)` — Compile-Assertion aktiv

### admin_group_roles_handler.go (46 Zeilen, unter Limit 80)

- `AdminGroupRolesHandler` mit `authzRepo any`
- `ListFansubGroupRoles`: requirePlatformAdminIdentity → permissions.FansubGroupRoles() → JSON `{data:[{code:...}]}`

### admin_routes.go + main.go

- Route: `GET /admin/fansub-group-roles` (null-guard über deps.adminGroupRolesHandler != nil)
- main.go: `permissionSvc.LoadFansubGroupCatalog(ctx, authzRepo)` nach `LoadCache` (Fallstrick 5)

### Test-Setup

- `testmain_test.go` in handlers- und repository-Paket: TestMain befüllt Catalog mit 12 Rollen vor allen Unit-Tests

## Abweichungen vom Plan

### Auto-Fix [Regel 1 - Bug] TestMain erforderlich wegen dynamisiertem Catalog

**Gefunden in:** Task 2 (nach `go test ./...`)

**Problem:** Vier Tests in `handlers`-Paket und zwei in `repository`-Paket scheiterten nach der Dynamisierung von `fansubGroupRoleCatalog` — sie nutzten `permissions.FansubGroupRoles()` als Vorbedingung, die nun leer zurückgibt wenn `LoadFansubGroupCatalog` nicht aufgerufen wurde.

**Betroffene Tests:** TestRevokeCapabilityLastActionGuard, TestGrantCapabilityAssignableGuardAllowsAppRole, TestListCapabilityMatrixAssignableEnrichment, TestCapabilityAuditOnGrant (handlers); TestSetRoleRejectsHistoricalRoleCode, TestRoleDefinitionsContextWhitelistOnly (repository)

**Fix:** `testmain_test.go` mit `TestMain` + `testCatalogLoader`-Stub in beiden Paketen. Canonical Rollenliste (12 Rollen: 10 bisherige + techadmin + gfxler) als Test-Fixture.

**Dateien:** `backend/internal/handlers/testmain_test.go`, `backend/internal/repository/testmain_test.go`

**Commit:** ae314212

### Architektur-Beobachtung [kein Auto-Fix — pre-existing]

`permissions.go` hat 556 Zeilen (Limit: 450). Diese Datei hatte bereits vor Plan 95-02 ca. 534 Zeilen — das Limit war schon vorher verletzt. Plan 95-02 fügte ca. 22 Zeilen hinzu. Ein Split wäre eine architekturelle Entscheidung (Regel 4) und gehört in einen eigenen Plan. Deferred nach `deferred-items.md`.

## Verifikation

- `go build ./...` grün (kein Kompilierfehler)
- `go test ./...` grün — alle 11 Pakete OK
- `TestListFansubGroupRoles` PASS (200 + JSON mit 3 Rollen aus Stub-Catalog)
- `TestListFansubGroupRolesRequiresPlatformAdmin` PASS (403 für Nicht-Admins)
- `grep -n "RoleTechadmin\|RoleGfxler" permissions.go` — Zeilen 58-59 gefunden
- `grep -n "CatalogLoader" permissions.go` — Interface Z.250-253, LoadFansubGroupCatalog Z.297
- `grep -n "LoadFansubGroupCatalog" main.go` — Z.131 (nach LoadCache)
- fansubGroupRoleCatalog ist package-var (nicht mehr statische Slice)
- admin_group_roles_handler.go: 46 Zeilen (Limit 80 eingehalten)

## Known Stubs

Keine — alle Implementierungen sind vollständig. Der Catalog wird beim Server-Start aus der DB geladen; Tests nutzen einen expliziten Stub-Loader.

## Threat Flags

Keine neuen Sicherheitsflächen über den Plan hinaus. GET /admin/fansub-group-roles ist durch requirePlatformAdminIdentity abgesichert (T-95-02-ID mitigiert). Neue Rollen techadmin/gfxler starten ohne Capabilities in role_capabilities (T-95-02-EoP mitigiert — IsKnownFansubGroupRole-Gate aktiv, aber leere Capabilities bedeuten kein Recht-Grant ohne explizite Zuweisung via /admin/role-capabilities).

## Self-Check: PASSED

- [x] `backend/internal/permissions/permissions.go` enthält CatalogLoader, LoadFansubGroupCatalog, RoleTechadmin, RoleGfxler
- [x] `backend/internal/repository/authz_permissions.go` enthält LoadFansubGroupRoles + Compile-Assertion
- [x] `backend/internal/handlers/admin_group_roles_handler.go` existiert (46 Zeilen)
- [x] `backend/internal/handlers/admin_fansub_group_roles_handler_test.go` existiert
- [x] Commit 4a79d919 (Task 1) existiert
- [x] Commit ae314212 (Task 2) existiert
- [x] `go build ./...` grün
- [x] `go test ./...` grün (11/11 Pakete)

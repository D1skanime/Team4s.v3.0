---
phase: 86-daten-getriebene-capability-registry
plan: "02"
subsystem: permissions
tags:
  - cache
  - capability-registry
  - permissions
  - tdd
dependency_graph:
  requires:
    - "86-01: Migration 0108 + Wave-0-RED-Tests + CacheLoader-Interface-Stub"
    - "database/migrations/0108_capability_registry.up.sql (role_capabilities-Tabelle, bereits angewandt)"
  provides:
    - "permissions.go: echter LoadCache + paket-globale cacheMu/loadedCache + allKnownActions + standaloneActions"
    - "permissions.go: roleAllows() + AllowedActionsForRole() mit cache-first, Fallback auf roleMatrix"
    - "authz_permissions.go: LoadRoleCapabilities() via pgx SELECT auf role_capabilities"
    - "main.go: LoadCache-Aufruf beim Start mit log.Fatalf bei Fehler"
    - "Wave-0-Tests TestRoleMatrixSeedParity + TestCacheLoadAndLookup + TestStartupConsistencyCheck: GREEN"
  affects:
    - "86-03 und folgende Pläne: Cache ist bereit; SQL-Bypass-Umstellung (D-07/D-08) kann gegen role_capabilities joinen"
tech_stack:
  added:
    - "sync.RWMutex (stdlib) für thread-safe Read-Heavy-Cache"
  patterns:
    - "Paket-globale Cache-Variable mit sync.RWMutex + nil-Fallback auf statische Map (für Unit-Tests ohne DB)"
    - "D-10 Konsistenz-Check via seenActions-Map gegen allKnownActions + standaloneActions-Whitelist"
    - "Compile-Zeit-Interface-Assertion: var _ permissions.CacheLoader = (*AuthzRepository)(nil)"
key_files:
  created: []
  modified:
    - "backend/internal/permissions/permissions.go"
    - "backend/internal/repository/authz_permissions.go"
    - "backend/cmd/server/main.go"
key_decisions:
  - "Cache als paket-globale Variable (nicht Service-Feld), damit RoleAllowsAction (paket-globale Funktion ohne Receiver) D-05-konform auf den Cache zugreifen kann"
  - "nil-Cache = roleMatrix-Fallback: Unit-Tests ohne DB-Anbindung laufen weiterhin korrekt"
  - "standaloneActions-Whitelist für ActionFansubGroupInvitationsAccept: hat action_definitions-Eintrag, aber kein role_capabilities-Eintrag — valide, kein Startup-Fehler"
  - "log.Fatalf auf Deutsch ('Capability-Registry laden fehlgeschlagen') per CLAUDE.md-Anforderung"

requirements-completed:
  - D-04
  - D-05
  - D-06
  - D-10
  - D-11

duration: 15min
completed: "2026-06-18"
tasks_completed: 2
files_created: 0
files_modified: 3
---

# Phase 86 Plan 02: Cache + Konsistenz-Check + main.go-Verdrahtung Summary

**paket-globaler RWMutex-Cache in permissions.go mit D-10-Konsistenz-Check + AuthzRepository.LoadRoleCapabilities() via pgx + main.go-Startup-Verdrahtung; alle Wave-0-RED-Tests jetzt GREEN.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-06-18
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- LoadCache-Stub durch echte Implementierung ersetzt: lädt Rolle→Action-Matrix aus `role_capabilities`, prüft alle 18 Action-Konstanten per D-10-Check, setzt paket-globalen Cache thread-safe via sync.RWMutex
- roleAllows() und AllowedActionsForRole() lesen cache-first (RLock); Fallback auf statische roleMatrix wenn loadedCache == nil (Unit-Tests ohne DB bleiben grün)
- AuthzRepository implementiert CacheLoader-Interface via neue LoadRoleCapabilities()-Methode (pgx SELECT + rows.Err()-Check)
- main.go verdrahtet LoadCache nach NewService, vor Router-Init; log.Fatalf bei Fehler (fail-closed, D-09)
- Alle 14 permissions-Tests grün, davon 3 neue Wave-0-Tests die vorher RED waren

## Task Commits

1. **Task 1: CacheLoader-Interface + LoadCache + roleAllows-Fallback** - `a740b7ae` (feat)
2. **Task 2: LoadRoleCapabilities + LoadCache-Verdrahtung** - `5f122a10` (feat)

## Files Created/Modified

- `backend/internal/permissions/permissions.go` — cacheMu + loadedCache + allKnownActions + standaloneActions + LoadCache-Implementierung + roleAllows-Fallback + AllowedActionsForRole-Fallback
- `backend/internal/repository/authz_permissions.go` — neue LoadRoleCapabilities()-Methode + Compile-Zeit-Interface-Assertion
- `backend/cmd/server/main.go` — permissionSvc.LoadCache(ctx, authzRepo) nach NewService + log.Fatalf bei Fehler

## Verification Results

```
go build ./...                                  → OK (kein Fehler)
go test ./internal/permissions/... -v -count=1 → PASS (14/14)
  TestRoleMatrixSeedParity      PASS  (vorher RED)
  TestCacheLoadAndLookup        PASS  (vorher RED)
  TestStartupConsistencyCheck   PASS  (vorher RED)
  TestCanForFansubGroup*        PASS  (unverändert)
  TestCanForReleaseVersion*     PASS  (unverändert)
  TestRoleAllowsAction*         PASS  (unverändert)
```

## Deviations from Plan

Keine — Plan exakt wie beschrieben ausgeführt.

## Known Stubs

Keine — LoadCache ist vollständig implementiert. Der 86-01-Stub ist ersetzt.

## Threat Flags

Keine neuen Threat-Flags. Alle im Plan spezifizierten Mitigationen umgesetzt:
- T-86-05 (SQL-Injection): pgx prepared statements, kein String-Concat
- T-86-06 (Cache-Poisoning): D-10-Konsistenz-Check in LoadCache; Fehler = log.Fatalf
- T-86-09 (DoS bei Start): log.Fatalf verhindert Start mit inkonsistenter Registry

## Self-Check: PASSED

- `backend/internal/permissions/permissions.go` — vorhanden, enthält CacheLoader-Interface + LoadCache + allKnownActions + standaloneActions
- `backend/internal/repository/authz_permissions.go` — vorhanden, enthält LoadRoleCapabilities
- `backend/cmd/server/main.go` — vorhanden, enthält LoadCache-Aufruf
- Commit a740b7ae — vorhanden
- Commit 5f122a10 — vorhanden
- Wave-0-Tests GREEN: BESTÄTIGT (go test ./internal/permissions/... 14/14 PASS)
- go build ./...: BESTÄTIGT

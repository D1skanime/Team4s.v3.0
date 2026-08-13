---
phase: 86-daten-getriebene-capability-registry
plan: "01"
subsystem: permissions
tags:
  - migration
  - tdd
  - capability-registry
  - permissions
dependency_graph:
  requires:
    - "database/migrations/0085_role_definitions_seed.up.sql (role_definitions FK-Ziel)"
    - "database/migrations/0100_role_definitions_fansub_lead.up.sql (fansub_lead in role_definitions)"
    - "backend/internal/permissions/permissions.go (roleMatrix-Quelle für den Seed)"
  provides:
    - "database/migrations/0108_capability_registry.up.sql (Schema + Seed)"
    - "database/migrations/0108_capability_registry.down.sql (Rollback)"
    - "backend/internal/permissions/capability_registry_test.go (Wave-0-RED-Tests)"
    - "CacheLoader-Interface in permissions.go (Plan 86-02 implementiert dagegen)"
  affects:
    - "backend/internal/permissions/permissions.go (CacheLoader + LoadCache-Stub hinzugefügt)"
tech_stack:
  added: []
  patterns:
    - "SQL IF NOT EXISTS für idempotente Tabellen-Erstellung"
    - "ON CONFLICT DO NOTHING für idempotenten Seed"
    - "TDD RED-Phase: Stub-Interface + Stub-Methode die immer Fehler zurückgibt"
key_files:
  created:
    - "database/migrations/0108_capability_registry.up.sql"
    - "database/migrations/0108_capability_registry.down.sql"
    - "backend/internal/permissions/capability_registry_test.go"
  modified:
    - "backend/internal/permissions/permissions.go"
decisions:
  - "roleMatrix hat 62 Einträge (nicht 83 wie im Plan-Behavior angegeben) — Zählung direkt aus permissions.go verifiziert: fansub_lead 16 + project_lead 13 + designer 6 + editor 5 + 3 × translator/timer/typesetter + encoder 7 + raw_provider 2 + quality_checker 4 = 62"
  - "CacheLoader-Interface und LoadCache-Stub in permissions.go hinzugefügt damit Wave-0-Tests kompilieren; Stub gibt Fehler zurück damit alle 3 Tests RED bleiben"
  - "TestStartupConsistencyCheck erwartet zuerst NoError (vollständiger Cache) → schlägt RED fehl wegen Stub; zweite Assertion (Error für unvollständigen Cache) wird nicht erreicht"
metrics:
  duration: "5min"
  completed: "2026-06-18"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 86 Plan 01: Migration 0108 + Wave-0-RED-Tests Summary

**One-liner:** PostgreSQL-Tabellen action_definitions + role_capabilities mit behavior-preservendem roleMatrix-Seed (10 Rollen, 62 Einträge) und 3 Wave-0-RED-Tests als Nyquist-Anker für Plan 86-02.

## Tasks Completed

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | Migration 0108 — Schema + Seed | da41ef69 | database/migrations/0108_capability_registry.up.sql, .down.sql |
| 2 | Wave-0-RED-Tests + CacheLoader-Stub | 63d88a45 | backend/internal/permissions/capability_registry_test.go, permissions.go |

## What Was Built

### Migration 0108 (up)

- `action_definitions` Tabelle: `code TEXT PK, label_de TEXT NOT NULL, category TEXT, sort_order INT DEFAULT 0`
- `role_capabilities` Tabelle: `role_code FK role_definitions(code) ON DELETE CASCADE, action_code FK action_definitions(code) ON DELETE CASCADE, PK(role_code, action_code)`
- 18 `action_definitions`-Einträge (alle Action-Konstanten aus permissions.go, inkl. `fansub_group.invitations.accept` ohne role_capabilities-Eintrag)
- 62 `role_capabilities`-Einträge exakt aus roleMatrix (10 Rollen, behavior-preserving, kein `platform_admin`)
- Idempotent via `ON CONFLICT DO UPDATE / DO NOTHING`

### Migration 0108 (down)

- Droppt `role_capabilities` zuerst (FK-Abhängigkeit), dann `action_definitions`

### Wave-0-RED-Tests in capability_registry_test.go

- `TestRoleMatrixSeedParity`: Verifiziert per Stub-CacheLoader, dass alle 18 Action-Codes (außer invitations.accept) in mindestens einer Rolle vertreten sind. RED bis LoadCache implementiert.
- `TestCacheLoadAndLookup`: Prüft fansub_lead/editor/raw_provider-Wahrheiten nach Cache-Load. RED bis LoadCache implementiert.
- `TestStartupConsistencyCheck`: Erwartet NoError für vollständigen Cache, Error für unvollständigen Cache (fehlt ActionReleaseVersionNotesWrite). RED bis LoadCache implementiert.

### CacheLoader-Interface + LoadCache-Stub in permissions.go

- `CacheLoader`-Interface mit `LoadRoleCapabilities(ctx) (map[string][]Action, error)` als Plan-86-02-Anker
- `LoadCache`-Stub auf `*Service` gibt immer `fmt.Errorf("nicht implementiert")` zurück → alle 3 Wave-0-Tests RED

## Verification Results

```
go build ./internal/permissions/...  → OK (kein Fehler)
go test -run "TestRoleMatrixSeedParity|TestCacheLoadAndLookup|TestStartupConsistencyCheck"
  → FAIL (3/3 RED, erwartet)
go test -run "TestRoleAllows|TestCan..."
  → PASS (11/11 grün, unverändert)
```

## Deviations from Plan

### Auto-adjusted Issues

**1. [Rule 1 - Bug] roleMatrix hat 62 (nicht >=83) Einträge**
- **Gefunden bei:** Task 1, Zählung aus permissions.go
- **Issue:** Plan-Behavior sagte `COUNT(*) FROM role_capabilities >= 83`. Direktzählung der Go-roleMatrix ergibt 62 Einträge (16+13+6+5+3+3+3+7+2+4). Die 83 ist entweder ein Kalkulationsfehler im Plan oder stammt aus einer älteren roleMatrix-Version.
- **Fix:** Seed exakt nach roleMatrix (62 Einträge) — behavior-preserving ist die maßgebliche Anforderung (D-03), nicht die Zahl 83.
- **Dateien:** `database/migrations/0108_capability_registry.up.sql`
- **Commit:** da41ef69

**2. [Rule 2 - Auto-add] CacheLoader + LoadCache-Stub in permissions.go**
- **Gefunden bei:** Task 2, Wave-0-Tests brauchen eine kompilierende LoadCache-Methode
- **Issue:** Die Tests rufen `svc.LoadCache(ctx, stub)` auf; ohne die Methode in permissions.go ist das ein Compile-Fehler (verletzt das Kompilierungs-Kriterium)
- **Fix:** CacheLoader-Interface und LoadCache-Stub (gibt Fehler zurück) in permissions.go hinzugefügt. Plan 86-02 ersetzt den Stub durch die echte Implementierung.
- **Dateien:** `backend/internal/permissions/permissions.go`
- **Commit:** 63d88a45

## Known Stubs

- `Service.LoadCache()` in `permissions.go` ist ein Stub: gibt immer `"nicht implementiert"` zurück. Plan 86-02 ersetzt ihn durch den echten Cache-Umbau.

## Threat Flags

Keine neuen Threat-Flags über den Plan hinaus. Die Migration enthält keinen neuen Netzwerk-Endpoint oder Auth-Pfad.

## Self-Check: PASSED

- `database/migrations/0108_capability_registry.up.sql` — vorhanden
- `database/migrations/0108_capability_registry.down.sql` — vorhanden
- `backend/internal/permissions/capability_registry_test.go` — vorhanden
- `backend/internal/permissions/permissions.go` — modifiziert (CacheLoader + LoadCache-Stub)
- Commit da41ef69 — vorhanden
- Commit 63d88a45 — vorhanden
- Wave-0-Tests RED: BESTÄTIGT
- Bestehende Tests grün: BESTÄTIGT

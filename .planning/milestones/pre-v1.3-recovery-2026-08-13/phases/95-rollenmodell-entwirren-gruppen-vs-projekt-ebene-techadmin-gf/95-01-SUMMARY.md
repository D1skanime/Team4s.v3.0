---
phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
plan: "01"
subsystem: database/backend
tags: [migration, role-model, go-backend, db-migration, whitelist]
dependency_graph:
  requires: []
  provides:
    - Migration 0112 (up+down) mit assignable-Spalte, Label-Updates, hist-Datenmigration, neuen Rollen
    - groupHistoryDialogRoleWhitelist aktualisiert auf kanonische Codes (D-06)
    - Alle 5 Go-Backend-SQL-Fundstellen mit 'leader' auf 'fansub_lead' umgestellt (D-04)
  affects:
    - database/migrations/0112_role_model_cleanup.up.sql
    - database/migrations/0112_role_model_cleanup.down.sql
    - backend/internal/repository/admin_users_queries.go
    - backend/internal/repository/admin_users_tab_repository.go
    - backend/internal/repository/anime_contributions_public_repository.go
    - backend/internal/services/badge_service.go
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/repository/role_definitions_context_test.go
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx
tech_stack:
  added: []
  patterns:
    - BEGIN/COMMIT-Transaktion in Migration (FK-sichere Reihenfolge)
    - UPDATE hist_group_member_roles VOR DELETE aus role_definitions (FK ON DELETE RESTRICT)
    - ALTER TABLE ADD COLUMN IF NOT EXISTS für idempotente Spalten-Erweiterung
key_files:
  created:
    - database/migrations/0112_role_model_cleanup.up.sql
    - database/migrations/0112_role_model_cleanup.down.sql
  modified:
    - backend/internal/repository/admin_users_queries.go
    - backend/internal/repository/admin_users_tab_repository.go
    - backend/internal/repository/anime_contributions_public_repository.go
    - backend/internal/services/badge_service.go
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/repository/role_definitions_context_test.go
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx
decisions:
  - "Migration 0112 führt assignable BOOLEAN NOT NULL DEFAULT false als neue Spalte in role_definitions ein — ermöglicht data-driven Laden des fansubGroupRoleCatalog in späteren Plänen (D-12)"
  - "hist-Datenmigration VOR DELETE aus role_definitions ausgeführt — FK ON DELETE RESTRICT auf hist_group_member_roles.role_code erzwingt diese Reihenfolge zwingend (Fallstrick 1)"
  - "TestRoleDefinitionsContextWhitelistOnly-Logik auf Phase-95-Realität angepasst: Gruppen-Rollen (fansub_lead, project_lead) dürfen in Whitelist UND FansubGroupRoles() erscheinen (D-01 Zwei-Ebenen-Design)"
metrics:
  duration: "5min"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_changed: 9
---

# Phase 95 Plan 01: DB-Migration und Go-Backend-Code-Sync — Zusammenfassung

**Ergebnis:** Migration 0112 legt das DB-Fundament für Phase 95 (assignable-Spalte, neue Rollen techadmin/gfxler, Label-Updates, hist-Datenmigration) und alle 5 Go-Backend-SQL-Fundstellen mit 'leader' wurden auf 'fansub_lead' umgestellt.

## Abgeschlossene Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | Migration 0112 erstellen | afba12b9 | 0112_role_model_cleanup.up.sql, 0112_role_model_cleanup.down.sql |
| 2 | Go-Backend-SQL-Fundstellen und Whitelist umstellen | 232e60db | 7 Dateien |

## Gelieferte Artefakte

### Migration 0112 (up)

Sieben-Schritte-Migration in korrekter Reihenfolge:

1. `ALTER TABLE role_definitions ADD COLUMN IF NOT EXISTS assignable BOOLEAN NOT NULL DEFAULT false`
2. UPDATE label_de: `fansub_lead` → 'Gruppenleitung', `project_lead` → 'Fansub-Projektleitung' (D-05)
3. UPDATE `hist_group_member_roles`: `leader` → `fansub_lead`, `project_manager` → `project_lead` (D-04, VOR DELETE)
4. DELETE `role_definitions` WHERE code IN ('leader', 'project_manager')
5. INSERT `techadmin` ('Techadmin'), `gfxler` ('GFX / Grafik') mit assignable=true (D-07/D-08)
6. UPDATE assignable=true für `fansub_lead`, `co_leader`, `founder`, `project_lead` (D-03)
7. UPDATE contexts += 'fansub_group' für Gruppen-Rollen (D-03)

### Go-Backend-Sync

| Datei | Änderung |
|-------|----------|
| `admin_users_queries.go` Z.68 | `IN ('leader')` → `IN ('fansub_lead')` |
| `admin_users_queries.go` Z.247 | `= 'leader'` → `= 'fansub_lead'` |
| `admin_users_tab_repository.go` Z.118 | `IN ('leader', ...)` → `IN ('fansub_lead', ...)` |
| `anime_contributions_public_repository.go` Z.243 | `IN ('leader', 'founder')` → `IN ('fansub_lead', 'founder')` |
| `badge_service.go` Z.93 | `IN ('leader', 'founder')` → `IN ('fansub_lead', 'founder')` |

### Whitelist-Update (D-06)

`groupHistoryDialogRoleWhitelist` in `hist_group_member_roles_repository.go`:
- Entfernt: "leader", "project_manager"
- Neu: "fansub_lead", "project_lead", "techadmin", "gfxler"

### Test-Fixture-Aktualisierungen

- `role_definitions_context_test.go`: Whitelist-Invariante und erwartete Codes aktualisiert
- `GroupHistRoleDialog.test.tsx`: Mock-Daten und historyRoles auf 6 kanonische Codes

## Abweichungen vom Plan

### Auto-Fix [Regel 1 - Bug] TestRoleDefinitionsContextWhitelistOnly-Testlogik veraltet

**Gefunden in:** Task 2 (Go-Tests)

**Problem:** Der ursprüngliche Test prüfte, dass `groupHistoryRoleWhitelist` und `permissions.FansubGroupRoles()` disjunkt sind. Nach dem Phase-95-Umbau sind `fansub_lead` und `project_lead` sowohl in der Whitelist (historischer Kontext) als auch im FansubGroupRoles-Katalog (aktive Gruppenrolle) — was genau dem Zwei-Ebenen-Design (D-01) entspricht.

**Fix:** Testlogik umgeschrieben: Prüft jetzt, dass (a) Projekt-/Anime-Ebenen-Rollen (translator, editor, …) nicht in der Whitelist erscheinen und (b) historisch-pure Codes (founder, co_leader) nicht im App-Katalog sind.

**Dateien:** `backend/internal/repository/role_definitions_context_test.go`

**Commit:** Enthalten in `232e60db`

## Verifikation

- `go build ./...` grün (kein Kompilierfehler)
- `go test ./internal/repository/... -run TestRoleDefinitionsContext` — 2/2 PASS
- `npm run test -- GroupHistRoleDialog --reporter=dot` — 4/4 PASS
- FK-Reihenfolge bestätigt: UPDATE hist (Z.19-20) vor DELETE role_definitions (Z.23)
- Grep auf 5 Backend-Dateien: 0 verbleibende 'leader'-SQL-Literale (nur Kommentare)

## Known Stubs

Keine — alle Änderungen sind vollständige Implementierungen ohne Stub-Werte.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. Migration läuft in BEGIN/COMMIT-Transaktion (T-95-01-MIG mitigiert). String-Ersetzungen ohne Logikänderungen (T-95-01-FIX mitigiert).

## Self-Check: PASSED

- [x] `database/migrations/0112_role_model_cleanup.up.sql` existiert
- [x] `database/migrations/0112_role_model_cleanup.down.sql` existiert
- [x] Commit afba12b9 existiert (Task 1)
- [x] Commit 232e60db existiert (Task 2)
- [x] Go-Build grün
- [x] Tests grün

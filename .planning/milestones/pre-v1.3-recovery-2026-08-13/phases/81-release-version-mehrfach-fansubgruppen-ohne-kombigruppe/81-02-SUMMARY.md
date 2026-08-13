---
phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
plan: "02"
subsystem: database-migrations
tags: [sql, migration, fansub-collaboration, data-migration, schema-drop]

requires:
  - phase: 81-01
    provides: Wave-0 RED test suite including migration contract tests for 0101+0102

provides:
  - Migration 0101: Collaboration members expanded into release_version_groups + anime_fansub_groups
  - Migration 0102: fansub_collaboration_members table dropped, group_type column removed
  - Both Phase81 migration contract tests now GREEN (were RED from Plan 01)

affects:
  - 81-03, 81-04 (further backend/frontend changes that depend on clean collaboration removal)

tech-stack:
  added: []
  patterns:
    - "Idempotent backfill: INSERT ... ON CONFLICT (composite PK) DO NOTHING"
    - "DO $$ guard before destructive schema change: RAISE EXCEPTION when precondition violated"
    - "Forward-only data migration down.sql: RAISE WARNING instead of structural rollback"
    - "Defensive NULL-set before DELETE for CASCADE-FK references (theme_segments, segment_library)"

key-files:
  created:
    - database/migrations/0101_expand_release_version_groups_from_collaborations.up.sql
    - database/migrations/0101_expand_release_version_groups_from_collaborations.down.sql
    - database/migrations/0102_drop_collaboration_schema.up.sql
    - database/migrations/0102_drop_collaboration_schema.down.sql
  modified: []

key-decisions:
  - "Migration 0101 steps 3+4 NULL-set theme_segments and segment_library before the DO $$ delete loop — theme/segment tables use ON DELETE CASCADE so they are not RESTRICT-blocked, but may still hold stale collab-IDs that would corrupt the lateral join in listReleaseVariantsByAnimeID (Pitfall 1 from RESEARCH.md)"
  - "DO $$ has_restrict_refs check still includes theme_segments and segment_library in the guard after steps 3+4 — belt-and-suspenders: if any concurrent write re-creates a reference between the UPDATE and DELETE steps, the guard catches it"
  - "Migration 0102 down.sql adds index definitions (idx_fansub_collab_members_collab, idx_fansub_collab_members_member) that were in the original 0015 migration for structural completeness"

metrics:
  duration: 15min
  completed: "2026-06-09"
  tasks: 2
  files: 4
---

# Phase 81 Plan 02: SQL-Migrationen 0101+0102 Summary

**Forward-only Datenmigration + Schema-Drop: Kombigruppen auf echte Mitglieds-IDs aufgelöst, Kollaborations-Entität entfernt (D-11, D-12)**

## Performance

- **Duration:** 15 min
- **Completed:** 2026-06-09
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- Migration 0101 expandiert Kombigruppen auf echte Mitglieds-IDs in `release_version_groups` und `anime_fansub_groups` (idempotent, ON CONFLICT DO NOTHING), bereinigt `theme_segments`/`segment_library` von Kombigruppen-IDs (Pitfall 1), löscht Kombigruppen-Zeilen aus den Junction-Tabellen und deaktiviert/löscht Kombigruppen je nach RESTRICT-Referenzlage
- Migration 0102 enthält DO $$ Guard (RAISE EXCEPTION bei aktiven Kollaborationen), droppt `fansub_collaboration_members` und entfernt `group_type`-Spalte aus `fansub_groups`; down.sql stellt Schema-Skelett wieder her
- Beide Phase81 Migrations-Contract-Tests (aus Plan 01 RED) drehen GREEN

## Task Commits

1. **Task 1: Migration 0101** — `c5d8a8ca` (feat)
2. **Task 2: Migration 0102** — `9fef1a9b` (feat)

## Files Created

- `database/migrations/0101_expand_release_version_groups_from_collaborations.up.sql` — 87 Zeilen: 7-stufige Datenmigration (Expansion, Bereinigung, Löschen, DO $$ deactivate/delete)
- `database/migrations/0101_expand_release_version_groups_from_collaborations.down.sql` — RAISE WARNING (irreversibler Rollback nicht möglich)
- `database/migrations/0102_drop_collaboration_schema.up.sql` — DO $$ Guard + DROP TABLE + ALTER TABLE DROP COLUMN
- `database/migrations/0102_drop_collaboration_schema.down.sql` — ADD COLUMN + CREATE TABLE (strukturelles Restore ohne Daten)

## Decisions Made

- `theme_segments` und `segment_library` werden in Schritten 3+4 per UPDATE auf NULL gesetzt, bevor der DO $$ Delete-Loop läuft — so entstehen keine Orphan-Joins in `listReleaseVariantsByAnimeID` nach der Migration (Pitfall 1, RESEARCH.md Q1)
- Der DO $$ has_restrict_refs-Check enthält dennoch `theme_segments` und `segment_library` als Belt-and-Suspenders — falls between Steps 3/4 und dem Delete-Loop ein concurrent Write eingreift
- Migration 0102 down.sql enthält auch die Indexes aus der originalen 0015-Migration für vollständiges Restore

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SQL-Formatierung: mehrere Leerzeichen in SET-Klausel**
- **Found during:** Task 1 (GREEN-Phase nach erstem Test-Run)
- **Issue:** `SET    status     = 'dissolved'` (mehrere Spaces) matched nicht auf `status = 'dissolved'` in `strings.Contains` nach `strings.ToLower`
- **Fix:** Ausrichtungs-Spaces entfernt: `SET status = 'dissolved', updated_at = NOW()`
- **Files modified:** `database/migrations/0101_expand_release_version_groups_from_collaborations.up.sql`
- **Verification:** `go test ./internal/migrations/... -run TestPhase81` grün

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Minimale Format-Korrektur; kein semantischer Unterschied im SQL.

## Verification Results

```
=== RUN   TestPhase81CollaborationExpansionMigrationContract
--- PASS
=== RUN   TestPhase81CollaborationSchemaDropMigrationContract
--- PASS
PASS  team4s.v3/backend/internal/migrations
```

Alle übrigen Migrations-Tests ebenfalls grün (kein Regression).

## Known Stubs

Keine — beide Migrationsdateien sind vollständig und funktional.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. Die in PLAN.md dokumentierten Bedrohungen (T-81-MIG-01, T-81-MIG-02, T-81-MIG-03) sind durch den implementierten Guard und die NULL-Setzung mitigiert.

## Next Phase Readiness

- Plan 03 (Write-Helper N-fach-Upsert) kann mit sauberem Schema fortfahren
- Plan 04 (Lesepfad-Aggregation) profitiert davon, dass keine Kombigruppen-IDs mehr in den Junction-Tabellen sind
- Migration 0101 ist deploybar sofort; Migration 0102 erst nach Deployment des neuen Go-Codes (kein Schreibzugriff auf `group_type='collaboration'` oder `fansub_collaboration_members` mehr im Laufzeit-Code)

---
*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Completed: 2026-06-09*

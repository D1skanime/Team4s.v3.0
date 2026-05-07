---
phase: quick-260507-de2
plan: 01
subsystem: database-migrations, frontend-segments
tags: [theme-types, rename, migration, kara]
key-files:
  created:
    - database/migrations/0058_rename_theme_types_kara.up.sql
    - database/migrations/0058_rename_theme_types_kara.down.sql
  modified:
    - database/migrations/0050_normalize_theme_types.up.sql
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts
decisions:
  - Migration 0058 adressiert bestehende Live-DB-Eintraege; Migration 0050 wird ebenfalls angepasst fuer korrekte Fresh-Install-Namen
  - Badge-Substring-Logik in SegmenteTab.helpers.tsx erfordert keinen Change — 'OP Kara'.toUpperCase().includes('OP') === true
metrics:
  duration: 8min
  completed: "2026-05-07"
  tasks: 2
  files: 4
---

# Quick Task 260507-de2: Rename Theme Types OP/ED/Insert → OP Kara/ED Kara/Insert Kara

**One-liner:** Migration 0058 (up/down) und 0050-Patch benennen DB-Typen auf Kara-Namen um; Frontend-Labels in useReleaseSegments.ts synchronisiert.

## Objective

Theme-Typen OP, ED und Insert in Datenbank und Frontend auf "OP Kara", "ED Kara" und "Insert Kara" umbenennen. Outro bleibt unveraendert.

## Tasks Executed

### Task 1: Migration 0058 erstellen und 0050 aktualisieren

**Commit:** `239acde3`

**Aenderungen:**
- `database/migrations/0058_rename_theme_types_kara.up.sql` neu: UPDATE theme_types fuer id=1,3,5 auf neue Kara-Namen
- `database/migrations/0058_rename_theme_types_kara.down.sql` neu: Rollback auf OP/ED/Insert
- `database/migrations/0050_normalize_theme_types.up.sql` geaendert: Fresh-Install-Namen auf 'OP Kara', 'ED Kara', 'Insert Kara' aktualisiert; 'Outro' unveraendert

**Verifikation:** 3 UPDATE-Statements in 0058.up; 0050 zeigt neue Namen; kein Outro-UPDATE in 0058.

### Task 2: Frontend-Labels in useReleaseSegments.ts aktualisieren

**Commit:** `9e3234cc`

**Aenderungen:**
- `'Opening (OP)'` → `'OP Kara'`
- `'Ending (ED)'` → `'ED Kara'`
- `'Insert Song'` → `'Insert Kara'`
- `'Outro'` unveraendert
- Keine Aenderung an kind-Variablen, classify-Logik oder Vergleichen

**Verifikation:** TypeScript-Kompilierung: 0 neue Fehler; alte Labels nicht mehr vorhanden.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `database/migrations/0058_rename_theme_types_kara.up.sql` — FOUND
- `database/migrations/0058_rename_theme_types_kara.down.sql` — FOUND
- `database/migrations/0050_normalize_theme_types.up.sql` — FOUND (modified)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts` — FOUND (modified)
- Commit `239acde3` — FOUND
- Commit `9e3234cc` — FOUND

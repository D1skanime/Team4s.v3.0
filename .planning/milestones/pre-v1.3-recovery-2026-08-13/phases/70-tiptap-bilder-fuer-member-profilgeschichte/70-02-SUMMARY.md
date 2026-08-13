---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "02"
subsystem: database
tags: [migration, media_assets, member-story, owner-binding]
dependency_graph:
  requires: []
  provides: [owner_member_id Spalte auf media_assets, idx_media_assets_owner_member Partial-Index]
  affects: [media_assets Tabelle, IDOR-Schutz D-03, Pfad-Eigentuemer-Validierung D-08, Cleanup-on-Save D-13/D-22]
tech_stack:
  added: []
  patterns: [append-only SQL migration, idempotent DDL mit IF NOT EXISTS, Partial-Index auf nullable FK]
key_files:
  created:
    - database/migrations/0090_member_story_images.up.sql
    - database/migrations/0090_member_story_images.down.sql
  modified: []
decisions:
  - "Migration-Nummer auf 0090 angehoben: 0089 war bereits durch anime_contributions_review_note belegt (entdeckt beim Verzeichnis-Check vor Anlage)"
  - "ON DELETE SET NULL: Member-Loeschung bewahrt media_assets-Zeilen, setzt owner_member_id auf NULL — kein kaskadiertes Delete"
  - "Partial-Index WHERE owner_member_id IS NOT NULL: Index deckt nur Story-Bilder, nicht alle NULL-Altzeilen"
metrics:
  duration: "5min"
  completed_date: "2026-06-02"
  tasks_completed: 1
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 70 Plan 02: Migration owner_member_id auf media_assets Summary

**One-liner:** Append-only Migration 0090 fuegt owner_member_id BIGINT FK (ON DELETE SET NULL) plus Partial-Index auf media_assets hinzu — Grundlage fuer IDOR-Schutz und Cleanup-on-Save in Phase 70.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrations-Dateien anlegen | 09e66df1 | database/migrations/0090_member_story_images.up.sql, database/migrations/0090_member_story_images.down.sql |

## Checkpoint Pending

Task 2 ist ein `checkpoint:human-verify`. Die Migration ist angelegt und committed, aber noch nicht gegen die lokale Datenbank getestet. Der Checkpoint wartet auf manuelle Verifikation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration-Nummer von 0089 auf 0090 angehoben**
- **Found during:** Task 1 (Verzeichnis-Check vor Anlage)
- **Issue:** Der Plan nannte Dateinamen mit Praefix `0089`, aber `0089_anime_contributions_review_note.up/down.sql` existierte bereits in `database/migrations/`
- **Fix:** Beide Dateien als `0090_member_story_images.up/down.sql` angelegt; Plan-Spec hatte explizit die Pruefung vorgesehen und Nummer-Anpassung angewiesen
- **Files modified:** database/migrations/0090_member_story_images.up.sql, database/migrations/0090_member_story_images.down.sql
- **Commit:** 09e66df1

## Known Stubs

Keine Stubs — Migration-Dateien enthalten ausschliesslich DDL.

## Threat Flags

Keine neuen Threat-Surfaces jenseits des Plans (T-70-02-01, T-70-02-02 abgedeckt).

## Self-Check: PASSED

- [x] database/migrations/0090_member_story_images.up.sql existiert
- [x] database/migrations/0090_member_story_images.down.sql existiert
- [x] Commit 09e66df1 vorhanden
- [x] up.sql enthaelt "owner_member_id" (3x) und "idx_media_assets_owner_member" (1x)
- [x] down.sql enthaelt "DROP COLUMN IF EXISTS owner_member_id" (1x)

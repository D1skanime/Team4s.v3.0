---
phase: 34-release-version-media-schema-foundation
plan: "01"
subsystem: database
tags: [postgres, migrations, sql, release_version_media, media_assets, media_files]

# Dependency graph
requires:
  - phase: 20.1-db-schema-v2-physical-cutover
    provides: release_versions table (FK target for release_version_id)
  - phase: 07-generic-upload-and-linking
    provides: media_assets and media_files tables (extended with status column)
provides:
  - "CREATE TABLE release_version_media with category CHECK, preview CHECK, soft-delete, sort_order, 4 indexes"
  - "media_assets.status VARCHAR(20) NOT NULL DEFAULT 'ready' with CHECK constraint and index"
  - "media_files.status VARCHAR(20) NOT NULL DEFAULT 'ready' with CHECK constraint and index"
  - "Migration 0059 up + down (fully reversible)"
affects:
  - 35-release-version-media-backend
  - 36-release-version-media-frontend

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Soft-delete via deleted_at TIMESTAMPTZ NULL + deleted_by_user_id, no physical DELETE"
    - "FK ON DELETE RESTRICT for media_asset_id to prevent orphan-safe deletion"
    - "Partial index idx_rvm_public covers active (non-deleted) rows only"
    - "status column added to existing tables via ALTER TABLE ADD COLUMN with DEFAULT — no backfill needed"

key-files:
  created:
    - database/migrations/0059_release_version_media_schema.up.sql
    - database/migrations/0059_release_version_media_schema.down.sql
  modified: []

key-decisions:
  - "ON DELETE RESTRICT for media_asset_id: a media_asset referenced by release_version_media cannot be deleted without first removing the join rows"
  - "ON DELETE CASCADE for release_version_id: deleting a release_version removes all its media join rows"
  - "ON DELETE SET NULL for uploaded_by_user_id and deleted_by_user_id: user deletes do not cascade to release_version_media"
  - "No DB-UNIQUE partial index for is_preview_candidate=true per release_version — max-one-preview rule enforced transactionally in Phase 35 backend"
  - "media_files.status has an extra value 'missing' vs media_assets.status — aligns with the file-level missing-variant semantic"
  - "All existing media_assets and media_files rows automatically get status='ready' via DEFAULT — no explicit backfill SQL needed"

patterns-established:
  - "Migration style: numbered comments (-- 1., -- 2., -- 3.) matching the down-migration reverse order"
  - "Down-migration order always reverses up-migration section order for clean idempotent rollback"

requirements-completed:
  - RVM-SCHEMA-01

# Metrics
duration: 1min
completed: "2026-05-07"
---

# Phase 34 Plan 01: Release-Version-Media Schema Foundation Summary

**Migration 0059 legt release_version_media-Tabelle mit Kategorie/Preview-Constraints, Soft-Delete, und status-Spalten in media_assets/media_files als Datenbankgrundlage fuer Phase 35 (Backend) und 36 (Frontend)**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-07T14:13:10Z
- **Completed:** 2026-05-07T14:14:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Neue Tabelle `release_version_media` mit 4 Feldern, 2 CHECK-Constraints (Kategorie und Preview-Regel), Soft-Delete-Feldern und 4 Indexen (inkl. partiellem idx_rvm_public)
- `media_assets` um `status VARCHAR(20) NOT NULL DEFAULT 'ready'` mit CHECK-Constraint und Index erweitert
- `media_files` um `status VARCHAR(20) NOT NULL DEFAULT 'ready'` mit CHECK-Constraint und Index erweitert (zusaetzlicher Wert 'missing' fuer fehlende Varianten)
- Down-Migration setzt alle Aenderungen vollstaendig zurueck in umgekehrter Reihenfolge

## Task Commits

Each task was committed atomically:

1. **Task 1: Up-Migration 0059 schreiben** - `a836b168` (feat)
2. **Task 2: Down-Migration 0059 schreiben** - `238ffad7` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `database/migrations/0059_release_version_media_schema.up.sql` - CREATE TABLE release_version_media + ALTER TABLE media_assets/media_files status-Spalten
- `database/migrations/0059_release_version_media_schema.down.sql` - Vollstaendiger Rollback aller Up-Aenderungen

## Decisions Made
- ON DELETE RESTRICT fuer `media_asset_id` statt CASCADE, damit kein `media_assets`-Datensatz geloescht werden kann, der noch von `release_version_media` referenziert wird — verhindert ungewollte Datenverluste im Medien-Pool
- ON DELETE SET NULL fuer User-FKs, da User-Loeschungen nie Medien-Join-Zeilen kaskadierend entfernen sollen
- Kein DB-UNIQUE-Constraint fuer das "maximal 1 Preview pro release_version"-Regel — Transaktionslogik in Phase 35 ist flexibler als DB-Constraint bei Soft-Delete

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - keine externe Konfiguration noetig. Migration wird beim naechsten `make migrate` oder Container-Neustart automatisch angewendet.

## Next Phase Readiness

Phase 35 (Backend-Service) kann jetzt aufbauen auf:
- `release_version_media` Tabelle mit vollstaendigem Schema
- `media_assets.status` und `media_files.status` fuer Upload-Workflow-Tracking

Phase 35 muss implementieren:
- Repository-Methoden fuer CRUD auf release_version_media
- Transaktionssichere Durchsetzung des "maximal 1 Preview pro release_version"-Limits
- Upload-Handler mit status-Tracking (processing → ready / failed)

---
*Phase: 34-release-version-media-schema-foundation*
*Completed: 2026-05-07*

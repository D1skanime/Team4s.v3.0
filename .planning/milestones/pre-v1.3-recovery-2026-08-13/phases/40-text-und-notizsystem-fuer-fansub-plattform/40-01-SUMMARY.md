---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "01"
subsystem: database
tags: [postgres, migrations, soft-delete, fansub, notes]

requires:
  - phase: 34-release-version-media-schema-foundation
    provides: release_version_media als kanonisches Migrations-Muster (soft-delete, audit-Felder, sort_order)
  - phase: 20-release-native-episode-import-schema
    provides: release_versions Tabelle als FK-Ziel für release_version_notes

provides:
  - fansub_group_notes Tabelle (Migration 0061)
  - member_group_stories Tabelle (Migration 0062)
  - anime_fansub_project_notes Tabelle mit UNIQUE-Partial-Index (Migration 0063)
  - release_version_notes Tabelle mit UNIQUE-Partial-Index (Migration 0064)

affects:
  - 40-02 (Repository-Schicht für alle 4 Note-Typen)
  - 40-03 (Backend Handler)
  - 40-04 bis 40-10 (weitere Phase-40-Pläne)

tech-stack:
  added: []
  patterns:
    - "Dual-Feld body_markdown/body_html für Markdown-Speicherung mit gerendertem HTML"
    - "Soft-Delete-Pattern mit deleted_at + deleted_by_user_id"
    - "Partial UNIQUE Index WHERE deleted_at IS NULL für logische Einzigartigkeit"
    - "CHECK-Constraints als Inline-Constraint-Name für Fehlermeldungsklarheit"

key-files:
  created:
    - database/migrations/0061_fansub_group_notes.up.sql
    - database/migrations/0061_fansub_group_notes.down.sql
    - database/migrations/0062_member_group_stories.up.sql
    - database/migrations/0062_member_group_stories.down.sql
    - database/migrations/0063_anime_fansub_project_notes.up.sql
    - database/migrations/0063_anime_fansub_project_notes.down.sql
    - database/migrations/0064_release_version_notes.up.sql
    - database/migrations/0064_release_version_notes.down.sql
  modified: []

key-decisions:
  - "Neue Tabellen statt Erweiterung bestehender Strukturen: member_episode_notes und anime_fansub_groups.notes sind zu rudimentär"
  - "release_version_notes.role_id ist NOT NULL mit ON DELETE RESTRICT — jede Note gehört zu einer konkreten Rolle"
  - "member_group_stories.role_id ist NULLABLE — Mitglieder-Geschichten sind nicht rollengebunden"
  - "anime_fansub_project_notes UNIQUE Partial Index für MVP-Ein-Text-pro-Anime+Gruppe-Constraint"
  - "visibility als VARCHAR mit CHECK-Constraint (public/internal) statt FK auf visibilities-Tabelle"

patterns-established:
  - "Migrations-Muster folgt 0059_release_version_media_schema.up.sql: IF NOT EXISTS, benannte Constraints, Partial Indexes"
  - "UNIQUE Partial Indexes WHERE deleted_at IS NULL für soft-delete-kompatible Einzigartigkeit"

requirements-completed: []

duration: 2min
completed: "2026-05-11"
---

# Phase 40 Plan 01: DB Migrations — 4 neue Note-Tabellen (0061–0064) Summary

**Vier neue Postgres-Tabellen für das Fansub-Text-/Notizsystem angelegt: fansub_group_notes, member_group_stories, anime_fansub_project_notes und release_version_notes — alle mit soft-delete, dual body_markdown/body_html Felder, CHECK-Constraints für visibility/status und Partial Indexes**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-11T19:18:29Z
- **Completed:** 2026-05-11T19:20:39Z
- **Tasks:** 4
- **Files modified:** 8

## Accomplishments

- `fansub_group_notes` (0061): Offizielle Gruppentexte mit vollständigem Audit-Trail und soft-delete
- `member_group_stories` (0062): Persönliche Mitglieder-Geschichten mit optionalem role_id-Bezug und Indexes auf group_id + member_id
- `anime_fansub_project_notes` (0063): Projekttexte Gruppe×Anime mit UNIQUE Partial Index für MVP-Einzigartigkeit
- `release_version_notes` (0064): Rollenbezogene Produktionsnotizen an release_versions.id mit UNIQUE-Constraint (release_version_id, member_id, role_id)

## Task Commits

Jede Task wurde atomisch committed:

1. **Task 1: Migration 0061 fansub_group_notes** - `33f37892` (feat)
2. **Task 2: Migration 0062 member_group_stories** - `39cf257b` (feat)
3. **Task 3: Migration 0063 anime_fansub_project_notes** - `f50ade74` (feat)
4. **Task 4: Migration 0064 release_version_notes** - `a37c0001` (feat)

## Files Created/Modified

- `database/migrations/0061_fansub_group_notes.up.sql` — fansub_group_notes Tabelle mit Partial Index
- `database/migrations/0061_fansub_group_notes.down.sql` — DROP TABLE fansub_group_notes
- `database/migrations/0062_member_group_stories.up.sql` — member_group_stories mit group_id + member_id Indexes
- `database/migrations/0062_member_group_stories.down.sql` — DROP TABLE member_group_stories
- `database/migrations/0063_anime_fansub_project_notes.up.sql` — anime_fansub_project_notes mit UNIQUE Partial Index
- `database/migrations/0063_anime_fansub_project_notes.down.sql` — DROP TABLE anime_fansub_project_notes
- `database/migrations/0064_release_version_notes.up.sql` — release_version_notes mit UNIQUE Constraint für member+role+version
- `database/migrations/0064_release_version_notes.down.sql` — DROP TABLE release_version_notes

## Decisions Made

- Neue Tabellen statt Erweiterung: `member_episode_notes` (falsches FK-Ziel, fehlt title/html/status/visibility) und `anime_fansub_groups.notes` (nur ein TEXT-Feld) wären zu rudimentär für Erweiterung
- `release_version_notes.role_id` als NOT NULL mit ON DELETE RESTRICT — Produktionsnotizen gehören zwingend zu einer Rolle; Rollenlöschung blockiert solange Notes vorhanden
- `member_group_stories.role_id` als NULLABLE — persönliche Geschichten können ohne Rollenbezug existieren
- `visibility` als VARCHAR(20) mit inline CHECK-Constraint statt FK auf `visibilities`-Lookup-Tabelle — einfacher und konsistenter mit dem release_version_media-Muster

## Deviations from Plan

Keine — Plan wurde exakt wie spezifiziert ausgeführt.

## Issues Encountered

Keine.

## User Setup Required

Keine externe Service-Konfiguration erforderlich. Migrations werden beim nächsten `go run cmd/migrate/main.go up` oder Docker-Compose-Neustart angewendet.

## Next Phase Readiness

- Plan 40-02 (Repository-Schicht) kann direkt auf den 4 neuen Tabellen aufbauen
- Plan 40-05 (Migration 0065: 11 Kernrollen-Seed) ist ebenfalls unblockiert

---
*Phase: 40-text-und-notizsystem-fuer-fansub-plattform*
*Completed: 2026-05-11*

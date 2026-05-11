---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "02"
subsystem: database
tags: [postgres, migration, contributor_roles, roles, seeds]

# Dependency graph
requires: []
provides:
  - contributor_roles table extended with label and description columns
  - 11 Kernrollen seeded (translator, editor, timer, typesetter, encoder, raw_provider, quality_checker, project_lead, designer, admin, other)
  - German labels and role-specific Hilfetexte from CONTEXT.md role contract
affects:
  - 40-03-PLAN (fansub_group_notes — may use contributor_roles FK)
  - 40-04-PLAN (member_group_stories — role_id FK on contributor_roles)
  - 40-05-PLAN (release_version_notes — role_id FK on contributor_roles)
  - release_member_roles (CASCADE cleared by TRUNCATE — test data only)
  - member_episode_notes (CASCADE cleared by TRUNCATE — test data only)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TRUNCATE ... CASCADE for safe test-data replacement in seeding migrations"
    - "ADD COLUMN IF NOT EXISTS for safe schema extension before data migration"
    - "No-op SELECT 1 DOWN migration when CASCADE cannot be reversed"

key-files:
  created:
    - database/migrations/0065_seed_contributor_roles_kernrollen.up.sql
    - database/migrations/0065_seed_contributor_roles_kernrollen.down.sql
  modified: []

key-decisions:
  - "TRUNCATE contributor_roles CASCADE chosen over additive INSERT ON CONFLICT — user decision: existing 6 seeds are test data only"
  - "DOWN migration is a no-op (SELECT 1) because TRUNCATE CASCADE cannot be safely reversed"
  - "label VARCHAR(100) and description TEXT added with DEFAULT '' so existing rows are not broken before TRUNCATE"

patterns-established:
  - "contributor_roles now has name (lowercase, machine-readable), label (German, user-facing), description (Hilfetext)"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-05-11
---

# Phase 40 Plan 02: contributor_roles Cleanup und 11 Kernrollen Summary

**Migration 0065 ersetzt 6 veraltete Test-Seeds durch 11 Kernrollen mit deutschen Labels und Hilfetexten per TRUNCATE CASCADE**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-11T19:19:00Z
- **Completed:** 2026-05-11T19:24:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Migration 0065 UP: ALTER TABLE contributor_roles fügt label VARCHAR(100) und description TEXT (DEFAULT '') hinzu
- TRUNCATE contributor_roles CASCADE löscht die 6 alten Test-Seeds (Translator, Timer, Typesetter, Encoder, QC, Karaoke) inklusive abhängiger Zeilen in release_member_roles und member_episode_notes
- INSERT der exakt 11 Kernrollen aus CONTEXT.md mit lowercase name, deutschem label und rollenspezifischem Hilfetext
- Migration 0065 DOWN ist ein No-op (SELECT 1) mit erklärendem Kommentar — CASCADE-Löschungen sind nicht reversibel

## Task Commits

1. **Task 1: Migration 0065 erstellen** - `720624db` (feat)

**Plan metadata:** (wird nach SUMMARY-Commit hinzugefügt)

## Files Created/Modified

- `database/migrations/0065_seed_contributor_roles_kernrollen.up.sql` — ALTER TABLE + TRUNCATE CASCADE + INSERT 11 Kernrollen
- `database/migrations/0065_seed_contributor_roles_kernrollen.down.sql` — No-op DOWN migration mit Kommentar

## Decisions Made

- TRUNCATE CASCADE statt additivem INSERT ON CONFLICT: User-Entscheidung aus `<key_decisions>` — bestehende Seeds sind Test-Daten und dürfen gelöscht werden
- DOWN als No-op: Die abhängigen Zeilen in release_member_roles und member_episode_notes sind nach TRUNCATE CASCADE weg; eine automatische Wiederherstellung ist nicht zuverlässig möglich
- label und description mit DEFAULT '' hinzugefügt, damit ALTER TABLE nicht scheitert falls Zeilen vor TRUNCATE vorhanden sind

## Deviations from Plan

None — Plan exakt wie beschrieben ausgeführt. TRUNCATE CASCADE Ansatz aus `<key_decisions>` im Prompt überschreibt die additive Strategie aus RESEARCH.md Entscheidung 3 (User-Entscheidung hat Vorrang).

## Issues Encountered

None.

## Known Stubs

None — diese Migration enthält keine UI-Stubs. Die Spalten label und description werden von späteren Plänen (Backend-Handler, Frontend-UI) genutzt.

## Next Phase Readiness

- contributor_roles enthält jetzt genau 11 Kernrollen mit deutschen Labels und Hilfetexten
- Migrations 0061-0064 (fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes) können die role_id FK auf contributor_roles.id referenzieren
- Die TRUNCATE CASCADE Auswirkung auf release_member_roles und member_episode_notes ist dokumentiert (nur Test-Daten betroffen)

---
*Phase: 40-text-und-notizsystem-fuer-fansub-plattform*
*Completed: 2026-05-11*

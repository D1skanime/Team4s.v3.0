---
phase: 41-globalen-tiptap-rich-text-editor-einfuehren
plan: "01"
subsystem: database
tags: [tiptap, postgres, jsonb, migrations, sql]

# Dependency graph
requires:
  - phase: 40-text-und-notizsystem-fuer-fansub-plattform
    provides: "Vier Texttabellen mit body_markdown/body_html (Migrations 0061-0064)"
provides:
  - "body_json JSONB NULL in fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes"
  - "body_text TEXT NOT NULL DEFAULT '' in allen vier Tabellen"
  - "editor_type TEXT NOT NULL DEFAULT 'tiptap' in allen vier Tabellen"
  - "content_schema_version INT NOT NULL DEFAULT 1 in allen vier Tabellen"
affects: [42, 43, 44, backend-notes-handlers, frontend-tiptap-editor]

# Tech tracking
tech-stack:
  added: []
  patterns: ["ADD COLUMN IF NOT EXISTS mit JSONB NULL für TipTap-Dokumente; body_html/body_markdown bleiben als Legacy-Felder erhalten"]

key-files:
  created:
    - database/migrations/0067_fansub_group_notes_tiptap.up.sql
    - database/migrations/0067_fansub_group_notes_tiptap.down.sql
    - database/migrations/0068_member_group_stories_tiptap.up.sql
    - database/migrations/0068_member_group_stories_tiptap.down.sql
    - database/migrations/0069_anime_fansub_project_notes_tiptap.up.sql
    - database/migrations/0069_anime_fansub_project_notes_tiptap.down.sql
    - database/migrations/0070_release_version_notes_tiptap.up.sql
    - database/migrations/0070_release_version_notes_tiptap.down.sql
  modified: []

key-decisions:
  - "TipTap-Migrations beginnen bei 0067 (0066 ist durch context_guard bereits vergeben)"
  - "body_html und body_markdown werden nicht verändert — additive Erweiterung, kein Ersatz"
  - "body_json ist JSONB NULL (kein NOT NULL, da bestehende Zeilen keinen TipTap-Inhalt haben)"

patterns-established:
  - "Idempotente ADD COLUMN IF NOT EXISTS / DROP COLUMN IF EXISTS für alle neuen Migrationsspalten"
  - "content_schema_version als INT für spätere Schema-Evolution des TipTap-Dokuments"

requirements-completed: [TIPTAP-EDITOR-01]

# Metrics
duration: 2min
completed: 2026-05-12
---

# Phase 41 Plan 01: TipTap DB-Migrations-Foundation Summary

**8 idempotente SQL-Migrations (0067-0070) ergänzen vier Texttabellen um body_json JSONB, body_text, editor_type und content_schema_version ohne bestehende Spalten zu verändern**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-12T10:50:51Z
- **Completed:** 2026-05-12T10:53:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Migrationen 0067/0068 für fansub_group_notes und member_group_stories angelegt
- Migrationen 0069/0070 für anime_fansub_project_notes und release_version_notes angelegt
- Alle 8 Dateien (.up.sql + .down.sql) vollständig und idempotent (IF NOT EXISTS / IF EXISTS)
- Kein ADD COLUMN body_html (bereits in Phase 40 vorhanden) — verhindert Runtime-Fehler

## Task Commits

1. **Task 1: Migrations 0067 und 0068** - `a3278d64` (chore)
2. **Task 2: Migrations 0069 und 0070** - `55780700` (chore)

## Files Created/Modified

- `database/migrations/0067_fansub_group_notes_tiptap.up.sql` - TipTap-Spalten für fansub_group_notes
- `database/migrations/0067_fansub_group_notes_tiptap.down.sql` - Rollback für 0067
- `database/migrations/0068_member_group_stories_tiptap.up.sql` - TipTap-Spalten für member_group_stories
- `database/migrations/0068_member_group_stories_tiptap.down.sql` - Rollback für 0068
- `database/migrations/0069_anime_fansub_project_notes_tiptap.up.sql` - TipTap-Spalten für anime_fansub_project_notes
- `database/migrations/0069_anime_fansub_project_notes_tiptap.down.sql` - Rollback für 0069
- `database/migrations/0070_release_version_notes_tiptap.up.sql` - TipTap-Spalten für release_version_notes
- `database/migrations/0070_release_version_notes_tiptap.down.sql` - Rollback für 0070

## Decisions Made

- TipTap-Migrations beginnen bei 0067, da 0066 durch `0066_anime_fansub_project_notes_context_guard` (ungetrackt aber im Working Tree) belegt ist
- body_json ist JSONB NULL — bestehende Zeilen erhalten NULL, kein Datenverlust
- body_html und body_markdown bleiben unangetastet (additive Strategie)

## Deviations from Plan

**Worktree-Merge vor Execution:** Der Worktree-Branch war auf einem älteren Stand (bis commit 7dfc688e) und hatte die Phase-40-Migrations 0061-0066 noch nicht. Vor der Ausführung wurde `git merge main --no-edit` durchgeführt, um den Kontext herzustellen. Dies war eine technische Voraussetzung, keine inhaltliche Abweichung.

Ansonsten: Plan executed exactly as written.

## Issues Encountered

None — alle Migrations-Dateien wurden gemäß Plan erstellt und verifiziert.

## User Setup Required

None — Migrations werden beim nächsten Docker-Start automatisch angewendet.

## Next Phase Readiness

- DB-Schema-Fundament für TipTap ist bereit
- Nächste Pläne (41-02+) können body_json in Go-Handlers lesen/schreiben
- Docker-Rebuild mit `docker-compose up --build backend` erforderlich, um Migrations anzuwenden

---
*Phase: 41-globalen-tiptap-rich-text-editor-einfuehren*
*Completed: 2026-05-12*

---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "04"
subsystem: database
tags: [go, pgx, repository, soft-delete, bulk-upsert, fansub, notes]

requires:
  - phase: 40-01
    provides: "DB-Migrationen 0061-0064 (fansub_group_notes, member_group_stories, anime_fansub_project_notes, release_version_notes)"
  - phase: 40-02
    provides: "contributor_roles mit 11 Kernrollen (label-Feld für GetMemberRolesForVersion)"

provides:
  - "FansubNotesRepository: List/Create/Update/Delete für fansub_group_notes, member_group_stories, Upsert für anime_fansub_project_notes"
  - "ReleaseVersionNotesRepository: List, BulkUpsert (Transaktion), GetMemberRolesForVersion (JOIN-Pfad), Delete"

affects:
  - "40-05 (Handler-Schicht für Note-APIs nutzt diese Repositories)"
  - "40-06 (Frontend nutzt Note-APIs)"

tech-stack:
  added: []
  patterns:
    - "Soft-delete: deleted_at=NOW(), deleted_by_user_id=$n, WHERE deleted_at IS NULL in allen Queries"
    - "PATCH-Semantik via COALESCE: nur non-nil Felder werden überschrieben"
    - "BulkUpsert in einer einzigen DB-Transaktion: INSERT (id=0) oder UPDATE (id>0)"
    - "ErrConflict bei isUniqueViolation(), ErrNotFound bei pgx.ErrNoRows / RowsAffected()==0"

key-files:
  created:
    - backend/internal/repository/fansub_notes_repository.go
    - backend/internal/repository/release_version_notes_repository.go
  modified: []

key-decisions:
  - "BulkUpsertReleaseVersionNotes liest nach COMMIT via ListReleaseVersionNotes (Pool) statt IN-Tx zurück — einfacher, konsistenter"
  - "GetMemberRolesForVersion nutzt JOIN release_versions → fansub_releases → release_member_roles → members + contributor_roles"
  - "Hilfsfunktionen (scanReleaseVersionNote, listReleaseVersionNotesInTx) entfernt — nicht benötigt nach Pool-Leserückkehr"

patterns-established:
  - "FansubNotesRepository: ein Repository für 3 verwandte fansub-seitige Note-Typen"
  - "ReleaseVersionNotesRepository: separates Repository für release_version_notes mit Bulk-Semantik"

requirements-completed: []

duration: 25min
completed: 2026-05-11
---

# Phase 40 Plan 04: Backend — Repositories für alle 4 Note-Typen

**Zwei Go-Repository-Dateien mit vollständigem CRUD, Soft-Delete, PATCH-Semantik und transaktionalem Bulk-Upsert für alle vier Note-Tabellen der Phase 40**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-11T00:00:00Z
- **Completed:** 2026-05-11
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `FansubNotesRepository` mit ListFansubGroupNotes, CreateFansubGroupNote, UpdateFansubGroupNote (PATCH), DeleteFansubGroupNote, ListMemberGroupStories, CreateMemberGroupStory, UpdateMemberGroupStory, DeleteMemberGroupStory, GetAnimeFansubProjectNote, UpsertAnimeFansubProjectNote, DeleteAnimeFansubProjectNote
- `ReleaseVersionNotesRepository` mit ListReleaseVersionNotes, GetMemberRolesForVersion (JOIN-Pfad über release_versions → fansub_releases → release_member_roles), BulkUpsertReleaseVersionNotes (eine DB-Transaktion), DeleteReleaseVersionNote
- Soft-Delete-Pattern durchgängig: `deleted_at = NOW(), deleted_by_user_id = $n`, Filter `WHERE deleted_at IS NULL`
- ErrConflict bei UNIQUE-Verletzung, ErrNotFound bei fehlendem/bereits gelöschtem Datensatz

## Task Commits

1. **Task 1: fansub_notes_repository.go** — `4521a414` (feat)
2. **Task 2: release_version_notes_repository.go** — `c6174ae3` (feat)

## Files Created/Modified

- `backend/internal/repository/fansub_notes_repository.go` — FansubNotesRepository (521 Zeilen): CRUD für fansub_group_notes, member_group_stories, Upsert für anime_fansub_project_notes
- `backend/internal/repository/release_version_notes_repository.go` — ReleaseVersionNotesRepository (246 Zeilen): List, BulkUpsert, GetMemberRolesForVersion, Delete

## Decisions Made

- BulkUpsertReleaseVersionNotes liest nach Commit via `r.ListReleaseVersionNotes(ctx, ...)` auf dem Pool zurück (nicht im TX) — einfacher, korrekt nach Commit
- `scanReleaseVersionNote` und `listReleaseVersionNotesInTx` nicht als tote Helper im File belassen — entfernt zugunsten klarer Struktur
- `UpdateFansubGroupNote` und `UpdateMemberGroupStory` verwenden COALESCE-Semantik: nur übergebene (non-nil) Pointer-Felder werden geändert

## Deviations from Plan

Keine — Plan exakt wie geschrieben umgesetzt.

## Issues Encountered

- Initialer Import `"errors"` in `release_version_notes_repository.go` war ungenutzt (pgx.ErrNoRows-Check wird via `ErrNotFound` in BulkUpsert-Error-Path von anderem Typ gehandelt) — sofort entfernt, Build sauber.
- Pre-existierende Kompilierfehler in `backend/internal/handlers/admin_content_release_version_media.go` (zu viele Argumente in `InsertMediaFileWithStatus`, unbekanntes Feld `CaptionSet`) — diese Fehler existierten vor diesem Plan, sind außerhalb des Scopes von Plan 40-04, Repository-Package baut sauber via `go build ./internal/repository/...` und `go vet ./internal/repository/...`.

## User Setup Required

Keine — nur Backend-Code, keine externen Services.

## Next Phase Readiness

- `FansubNotesRepository` und `ReleaseVersionNotesRepository` sind bereit für die Handler-Schicht (Plan 40-05)
- Beide Repositories folgen dem bestehenden Muster (pgxpool.Pool, ErrNotFound, ErrConflict, Soft-Delete)
- Pre-existierende Handler-Fehler in `admin_content_release_version_media.go` sollten vor oder mit Plan 40-05 behoben werden

---
*Phase: 40-text-und-notizsystem-fuer-fansub-plattform*
*Completed: 2026-05-11*

---
phase: 62-fansub-contributions-admin-api
plan: "01"
subsystem: backend/repository
tags: [repository, hist-group-members, hist-group-member-roles, crud, pgx]
dependency_graph:
  requires: [phase-61-migrations]
  provides: [HistGroupMembersRepository, HistGroupMemberRolesRepository]
  affects: [62-02-handlers]
tech_stack:
  added: []
  patterns: [pgxpool-repository, patch-with-double-pointer, ErrNotFound-mapping]
key_files:
  created:
    - backend/internal/repository/hist_group_members_repository.go
    - backend/internal/repository/hist_group_member_roles_repository.go
  modified: []
decisions:
  - "Double-pointer verwendet fuer JoinedYear/LeftYear/StartedYear/EndedYear/SourceNote im PatchInput — erlaubt explizites Null-Setzen vs. 'nicht aendern'"
  - "ErrConflict bei UNIQUE-Verletzung in HistGroupMembersRepository.Create (fansub_group_id + member_id)"
  - "RoleCodeExistsForContext gibt bool zurueck — Handler-Layer entscheidet ueber 422-Response"
metrics:
  duration: "15min"
  completed: "2026-06-01"
  tasks_completed: 2
  files_created: 2
---

# Phase 62 Plan 01: Repository-Schicht fuer historische Gruppenmitglieder

Zwei neue Go-Repositories fuer die Tabellen `hist_fansub_group_members` und `hist_group_member_roles` nach bestehendem Team4s-Stil mit pgxpool.Pool.

## Tasks

| # | Name | Commit | Dateien |
|---|------|--------|---------|
| 1 | HistGroupMembersRepository | 7064d683 | hist_group_members_repository.go (196 Zeilen) |
| 2 | HistGroupMemberRolesRepository | 2cba8f3c | hist_group_member_roles_repository.go (222 Zeilen) |

## Deviations from Plan

None — Plan executed exactly as written.

## Self-Check: PASSED

- `backend/internal/repository/hist_group_members_repository.go` — vorhanden (196 Zeilen, <= 450)
- `backend/internal/repository/hist_group_member_roles_repository.go` — vorhanden (222 Zeilen, <= 450)
- Commit 7064d683 — gefunden
- Commit 2cba8f3c — gefunden
- `go build ./backend/...` — kein Fehler
- `NewHistGroupMembersRepository` — exportiert
- `NewHistGroupMemberRolesRepository` — exportiert
- `RoleCodeExistsForContext` — vorhanden

---
phase: 41-globalen-tiptap-rich-text-editor-einfuehren
plan: "03"
subsystem: backend-handlers-repository
tags: [tiptap, handler-split, repository-migration, body_json]
dependency_graph:
  requires: [41-01, 41-02]
  provides: [fansub-notes-tiptap-handlers, member-stories-tiptap-handlers, anime-project-notes-tiptap-handlers]
  affects: [backend/internal/handlers, backend/internal/repository, backend/cmd/server]
tech_stack:
  added: []
  patterns: [handler-split, WithDeps-chain, tiptapSvc-validation]
key_files:
  created:
    - backend/internal/handlers/admin_content_fansub_group_notes.go
    - backend/internal/handlers/admin_content_member_stories.go
    - backend/internal/handlers/admin_content_anime_project_notes.go
  modified:
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/repository/fansub_group_notes_repository.go
    - backend/internal/repository/member_group_stories_repository.go
    - backend/internal/repository/anime_project_notes_repository.go
    - backend/internal/repository/errors.go
    - backend/cmd/server/main.go
  deleted:
    - backend/internal/handlers/admin_content_fansub_notes.go
decisions:
  - admin_content_fansub_notes.go in 3 Dateien aufgeteilt; requireFansubGroupNoteWriteAccess bleibt in fansub_group_notes da es nur dort referenziert wird
  - tiptapSvc als separate WithTipTapDeps()-Methode verdrahtet, nicht in bestehende WithNoteDeps integriert
  - ErrInvalidAnimeFansubContext und ErrInvalidReleaseVersionContributorContext in errors.go ergaenzt (fehlten im Worktree nach merge)
metrics:
  duration: 9min
  completed: "2026-05-12"
  tasks_completed: 2
  files_changed: 9
---

# Phase 41 Plan 03: Go-Backend TipTap-Migration + Handler-Split Summary

**One-liner:** admin_content_fansub_notes.go in 3 Handler-Dateien aufgeteilt, DTOs auf body_json migriert, Repository-Structs mit BodyJSON/BodyText/EditorType/ContentSchemaVersion erweitert, TipTapService in AdminContentHandler verdrahtet.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Handler-Split + DTO-Migration + Repository-Erweiterung | 5f4cf188 | 9 |
| 2 | TipTapService in main.go verdrahten | 38985801 | 1 |

## What Was Built

**Task 1: Handler-Split und DTO-Migration**

- `admin_content_fansub_notes.go` (451 Zeilen) wurde geloescht und durch drei Dateien ersetzt:
  - `admin_content_fansub_group_notes.go` (190 Zeilen): requireFansubGroupNoteWriteAccess + fansub_group_notes-Handler
  - `admin_content_member_stories.go` (188 Zeilen): member_group_stories-Handler
  - `admin_content_anime_project_notes.go` (157 Zeilen): anime_fansub_project_notes-Handler
- Alle Handler-DTOs: `BodyMarkdown string` → `BodyJSON json.RawMessage`
- Handler-Logik: `h.markdownSvc.RenderMarkdown()` → `h.tiptapSvc.ValidateJSON() + RenderHTML() + ExtractText()`
- `AdminContentHandler`: Feld `tiptapSvc *services.TipTapService` + Methode `WithTipTapDeps()` hinzugefuegt
- Repository-Structs: `FansubGroupNote`, `MemberGroupStory`, `AnimeFansubProjectNote` um BodyJSON/BodyText/EditorType/ContentSchemaVersion erweitert
- SQL INSERT/UPDATE/SELECT-Queries entsprechend aktualisiert

**Task 2: main.go Wiring**

- `tiptapSvc := services.NewTipTapService()` instanziiert
- `adminContentHandler.WithTipTapDeps(tiptapSvc)` in Deps-Kette eingehaengt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] ErrInvalidAnimeFansubContext fehlte in Worktree errors.go**
- **Found during:** Task 1 — go build Fehler nach Schreiben von anime_project_notes_repository.go
- **Issue:** Worktree-Branch hatte aeltere errors.go ohne ErrInvalidAnimeFansubContext und ErrInvalidReleaseVersionContributorContext (aus Phase 40)
- **Fix:** errors.go um beide Fehler-Variablen ergaenzt
- **Files modified:** backend/internal/repository/errors.go
- **Commit:** 5f4cf188

**2. [Rule 3 - Blocker] main.go Worktree fehlte Phase-40-Features**
- **Found during:** Aufgabe in Worktree — merge main benoetigt weil 41-01 und 41-02 nicht im Worktree waren
- **Fix:** `git merge main` vor Implementierungsstart durchgefuehrt
- **Commit:** N/A (merge commit 339cfe72 war bereits vorhanden)

## Verification Results

```
cd backend && go build ./... → kein Fehler
cd backend && go test ./internal/services/... -run TestTipTap → ok (19 Tests)
wc -l admin_content_fansub_group_notes.go → 190 (unter 450)
wc -l admin_content_member_stories.go → 188 (unter 450)
wc -l admin_content_anime_project_notes.go → 157 (unter 450)
grep BodyJSON fansub_group_notes_repository.go → findet Treffer
grep tiptapSvc admin_content_fansub_group_notes.go → findet Treffer
ls admin_content_fansub_notes.go → existiert nicht mehr
```

## Known Stubs

Keine. Alle Handler rufen echte TipTap-Service-Methoden auf; body_markdown bleibt als Legacy-Feld fuer bestehende Daten erhalten (kein Stub).

## Self-Check: PASSED

- `backend/internal/handlers/admin_content_fansub_group_notes.go` → FOUND
- `backend/internal/handlers/admin_content_member_stories.go` → FOUND
- `backend/internal/handlers/admin_content_anime_project_notes.go` → FOUND
- Commit 5f4cf188 → FOUND
- Commit 38985801 → FOUND
- `backend/internal/handlers/admin_content_fansub_notes.go` → DELETED (correct)

---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "05"
subsystem: api
tags: [go, gin, handler, fansub, notes, markdown, admin]

requires:
  - phase: 40-03
    provides: MarkdownService.RenderMarkdown (goldmark + bluemonday)
  - phase: 40-04
    provides: FansubNotesRepository (CRUD für fansub_group_notes, member_group_stories, anime_fansub_project_notes)

provides:
  - HTTP-Handler für alle 3 fansub-seitigen Note-Typen (11 Handler-Methoden)
  - Routing-Einträge für /admin/fansubs/:id/notes, /member-stories, /anime/:animeId/notes
  - WithNoteDeps() Wiring-Methode an AdminContentHandler
  - requireFansubGroupNoteWriteAccess() als MVP-Admin-Wrapper

affects:
  - 40-06
  - 40-07
  - Phase 40 Frontend-Pläne (API-Endpunkte sind ab jetzt nutzbar)

tech-stack:
  added: []
  patterns:
    - WithNoteDeps() Wiring-Methode (analog zu WithMediaDeps) für post-construction dependency injection
    - requireFansubGroupNoteWriteAccess() als extensibler Auth-Wrapper statt direktem requireAdmin() an Call-Sites

key-files:
  created:
    - backend/internal/handlers/admin_content_fansub_notes.go
  modified:
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - backend/internal/repository/release_version_media_repository.go

key-decisions:
  - "WithNoteDeps() statt Konstruktor-Parameter: konsistent mit bestehendem WithMediaDeps()-Pattern"
  - "requireFansubGroupNoteWriteAccess() delegiert MVP an requireAdmin() — spätere Erweiterung ohne Call-Site-Änderungen"
  - "Routing: PUT für Upsert statt POST/PATCH (semantisch korrekt da idempotent)"

patterns-established:
  - "Markdown-Rendering-Pattern: bodyHTML via markdownSvc.RenderMarkdown vor jedem Create/Update-Aufruf"
  - "Nil-Pointer PATCH-Semantik: BodyHTML nur neu rendern wenn BodyMarkdown im Request übergeben (Zeiger != nil)"

requirements-completed: []

duration: 25min
completed: 2026-05-11
---

# Phase 40 Plan 05: Backend Handler + Routes für Fansub-Notes

**11 HTTP-Handler-Methoden für fansub_group_notes, member_group_stories und anime_fansub_project_notes mit Markdown-Rendering, soft-delete und Admin-Auth.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-05-11T19:18:00Z
- **Completed:** 2026-05-11T19:43:00Z
- **Tasks:** 3 (+ 2 Auto-Fixes)
- **Files modified:** 5

## Accomplishments

- Neue Datei `admin_content_fansub_notes.go` (genau 450 Zeilen, CLAUDE.md-Limit eingehalten) mit allen 11 Handler-Methoden für die 3 fansub-seitigen Note-Typen
- Routing in `admin_routes.go` vollständig registriert (CRUD für fansub_group_notes, member_group_stories, GET/PUT/DELETE für anime_fansub_project_notes)
- `WithNoteDeps()` Wiring-Methode in `main.go` eingehängt — FansubNotesRepository und MarkdownService instanziiert

## Task Commits

1. **Task 1+2+3: Handler, Struct-Erweiterung, Auto-Fixes** - `172ca77d` (feat)
2. **Task 2+3: Routing und main.go-Wiring** - `52ecee2c` (feat)

## Files Created/Modified

- `backend/internal/handlers/admin_content_fansub_notes.go` — 11 Handler-Methoden für alle 3 fansub-Note-Typen, requireFansubGroupNoteWriteAccess, alle Request-Structs
- `backend/internal/handlers/admin_content_handler.go` — fansubNotesRepo + markdownSvc Felder, WithNoteDeps() Methode
- `backend/cmd/server/admin_routes.go` — 11 neue Routing-Einträge für Phase-40-Endpunkte
- `backend/cmd/server/main.go` — .WithNoteDeps(...) an AdminContentHandler-Konstruktor-Kette
- `backend/internal/repository/release_version_media_repository.go` — Auto-Fix (s.u.)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] InsertMediaFileWithStatus Signatur-Mismatch nach Merge**
- **Found during:** Task 1 (go build ./...)
- **Issue:** Handler rief InsertMediaFileWithStatus mit 9 Argumenten (inkl. width, height) auf, Repository-Funktion akzeptierte nur 7 (width/height fehlten, SQL-INSERT hatte hardcoded 0,0)
- **Fix:** Repository-Signatur auf `width int, height int` erweitert, SQL auf `$4, $5` umgestellt
- **Files modified:** `backend/internal/repository/release_version_media_repository.go`
- **Commit:** `172ca77d`

**2. [Rule 2 - Missing field] CaptionSet bool fehlte in ReleaseVersionMediaPatchInput**
- **Found during:** Task 1 (go build ./...)
- **Issue:** Handler referenzierte `CaptionSet: captionSet` im Struct-Literal, Feld existierte nicht in ReleaseVersionMediaPatchInput
- **Fix:** `CaptionSet bool` Feld mit erklärendem Kommentar hinzugefügt
- **Files modified:** `backend/internal/repository/release_version_media_repository.go`
- **Commit:** `172ca77d`

## Self-Check: PASSED

- `backend/internal/handlers/admin_content_fansub_notes.go` — FOUND
- `backend/internal/handlers/admin_content_handler.go` — FOUND
- `backend/cmd/server/admin_routes.go` — FOUND
- `backend/cmd/server/main.go` — FOUND
- Commit `172ca77d` — FOUND
- Commit `52ecee2c` — FOUND
- `go build ./...` — PASSED (clean build)

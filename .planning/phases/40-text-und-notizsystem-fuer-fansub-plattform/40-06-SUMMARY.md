---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "06"
subsystem: backend-api
tags:
  - release-version-notes
  - bulk-save
  - handler
  - routing
dependency_graph:
  requires:
    - 40-03
    - 40-04
    - 40-05
  provides:
    - release_version_notes HTTP-Endpunkte (GET/POST/DELETE notes, GET member-roles)
  affects:
    - AdminContentHandler (neues Feld + neue Methode)
    - admin_routes.go (4 neue Routen)
    - main.go (WithReleaseVersionNoteDeps Verkettung)
tech_stack:
  added: []
  patterns:
    - BulkSave-Pattern (Array-Payload, einzelne TX im Repository)
    - Soft-Delete via deleted_at + userID
    - markdownSvc.RenderMarkdown pro Note in Schleife
    - requireReleaseVersionNoteWriteAccess als MVP-Delegierung an requireAdmin
key_files:
  created:
    - backend/internal/handlers/admin_content_release_version_notes.go
  modified:
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
decisions:
  - WithReleaseVersionNoteDeps() als eigene Methode statt WithNoteDeps-Erweiterung — Trennung von FansubNotes- und ReleaseVersionNotes-Abhängigkeiten
  - markdownSvc wird von WithNoteDeps gesetzt und in release_version_notes Handler via h.markdownSvc wiederverwendet — keine zweite Instanz
  - 409-Konfliktmeldung auf Deutsch ("Für dieses Mitglied und diese Rolle existiert bereits eine Notiz")
  - ErrNotFound aus BulkUpsert (Update ohne Match) gibt 404 zurück
metrics:
  duration: 15min
  completed: "2026-05-11"
  tasks_completed: 3
  files_changed: 4
---

# Phase 40 Plan 06: Backend — Handler + Routes für release_version_notes (Bulk-Save) Summary

HTTP-Handler und Routing für `release_version_notes` mit Bulk-Save-Endpoint, Member-Rollen-Hilfendpunkt und Soft-Delete, vollständig auf `AdminContentHandler` als Receiver aufgebaut.

## What Was Built

### Task 1: admin_content_release_version_notes.go (neu, 170 Zeilen)

Vier Handler-Methoden auf `*AdminContentHandler`:

- `ListReleaseVersionNotes` — GET `:versionId/notes`, gibt `{"data": [...]}` zurück, leere Liste als `[]` statt `null`
- `GetMemberRolesForVersion` — GET `:versionId/member-roles`, gibt beteiligte Member+Rollen zurück
- `BulkUpsertReleaseVersionNotes` — POST `:versionId/notes` mit Array-Payload; rendert Markdown pro Note, baut `[]repository.BulkNoteInput` auf, delegiert an Repository; bei `ErrConflict` → 409 mit deutschem Fehlertext
- `DeleteReleaseVersionNote` — DELETE `:versionId/notes/:noteId`, Auth-Check, Soft-Delete via Repository

Auth-Hilfsfunktion `requireReleaseVersionNoteWriteAccess` delegiert im MVP an `requireAdmin`.

Request-Structs `bulkNoteItemRequest` und `bulkUpsertReleaseVersionNotesRequest` im selben File definiert.

### Task 2: admin_routes.go (4 neue Routen)

```
GET  /admin/release-versions/:versionId/notes
POST /admin/release-versions/:versionId/notes
DELETE /admin/release-versions/:versionId/notes/:noteId
GET  /admin/release-versions/:versionId/member-roles
```

Alle mit `auth`-Middleware, unterhalb des bestehenden Release-Version-Media-Blocks registriert.

### Task 3: main.go — WithReleaseVersionNoteDeps

- Neue Methode `WithReleaseVersionNoteDeps(*repository.ReleaseVersionNotesRepository)` zur `AdminContentHandler`-Struct hinzugefügt
- Neues Feld `releaseVersionNotesRepo *repository.ReleaseVersionNotesRepository` in `AdminContentHandler`
- In `main.go` als drittes Glied der Dependency-Kette eingehängt:
  `.WithMediaDeps(...).WithNoteDeps(...).WithReleaseVersionNoteDeps(repository.NewReleaseVersionNotesRepository(dbPool))`
- `markdownSvc` bleibt eine einzige Instanz (via WithNoteDeps gesetzt, im release_version_notes Handler via `h.markdownSvc` genutzt)

## Verification

`go build ./...` — kompiliert ohne Fehler oder Warnungen.

Routing-Registrierung via `grep -n "notes\|member-roles" cmd/server/admin_routes.go` bestätigt alle 4 Routen.

## Deviations from Plan

Keine — Plan exakt wie spezifiziert umgesetzt.

## Known Stubs

Keine — alle Endpunkte sind vollständig implementiert und verdrahtet.

## Self-Check: PASSED

- [x] `backend/internal/handlers/admin_content_release_version_notes.go` vorhanden (170 Zeilen)
- [x] `admin_routes.go` enthält 4 neue release_version_notes Routen
- [x] `admin_content_handler.go` hat `releaseVersionNotesRepo`-Feld und `WithReleaseVersionNoteDeps()`
- [x] `main.go` ruft `WithReleaseVersionNoteDeps()` auf
- [x] `go build ./...` erfolgreich
- [x] Commit be57a53d vorhanden

---
phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel
plan: 02
subsystem: api
tags: [go, gin, openapi, public-read, cursor-pagination]

requires:
  - phase: 122-01
    provides: ProjectMemberPublicRepository (Relation-Gate, Summary, Cursor-Listen)
provides:
  - ProjectMemberPublicHandler (GetSummary/GetNotes/GetMedia/GetReleases) + 404-Gate + /media-URL-Bau
  - 4 oeffentliche Routen /anime/:id/group/:groupId/members/:memberSlug[/notes|/media|/releases]
  - OpenAPI-Contract (4 Pfade + 7 Schemas) fuer die Frontend-Typgenerierung
affects: [122-03, 122-05, 122-06, 122-07, 122-08]

tech-stack:
  added: []
  patterns:
    - "Einheitlicher Cursor-Envelope {items, next_cursor, has_more} pro Liste"
    - "404-Gate im Handler via repo.ResolveMemberRelation (kein Redirect auf /members/:slug)"
    - "Storage-Pfad -> /media/-URL analog AdminContentHandler.buildRVMPublicURL"

key-files:
  created:
    - backend/internal/handlers/project_member_public_handler.go
    - backend/internal/handlers/project_member_public_handler_test.go
  modified:
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "Backend-Routing folgt bestehender Konvention /anime/:id/group/:groupId/... (Brief 21) — nicht /fansubs/:groupId/..."
  - "Preview-URL = 'original'-Variante (kein separater 'preview'-Variant im Media-Pipeline), Thumbnail = 'thumb'"

patterns-established:
  - "Source-Assertion-Handler-Tests inkl. Routen-Registrierung in main.go (../../cmd/server/main.go)"

requirements-completed: [D-08, D-09, D-10]

duration: ~25 min (sequential inline auf Linux via SSH)
completed: 2026-08-10
---

# Phase 122 Plan 02: Öffentlicher Handler-/Routen-Satz + OpenAPI Summary

**Vier oeffentliche Read-Endpunkte (Summary + cursor-paginierte Notes/Media/Releases) mit 404-Gate und /media-URL-Bau, verdrahtet in main.go und im OpenAPI-Contract verankert.**

## Performance
- **Duration:** ~25 min
- **Completed:** 2026-08-10
- **Tasks:** 4 (Handler, Routen, OpenAPI, Handler-Tests)
- **Files:** 2 created, 2 modified

## Accomplishments
- `ProjectMemberPublicHandler`: `GetSummary` + `GetNotes`/`GetMedia`/`GetReleases`; gemeinsames `resolve()` mit 404-Gate (repo.ResolveMemberRelation → notFound); `buildMediaURL` (thumbnail_url + preview_url); einheitlicher `{items,next_cursor,has_more}`-Envelope.
- `main.go`: Repo+Handler konstruiert, 4 Routen unter `/anime/:id/group/:groupId/members/:memberSlug` registriert (Konvention der Nachbar-group-public-Routen).
- OpenAPI: 4 Pfade + 7 Schemas (ProjectMemberSummary/Counts/Note/Media/Release + 3 Cursor-Responses) — validiert (`yaml.safe_load`), bereit fuer `npm run generate` (122-03).
- 5 Source-Assertion-Handler-Tests grün (Methoden, 404-Gate, Envelope+Limit, Media-URLs, Routen-Registrierung).

## Task Commits
1. **Task 1-4: Handler + Routen + OpenAPI + Tests** - `feat(122-02)` (ein production-Commit)
**Plan metadata:** `docs(122-02)` (SUMMARY + ROADMAP)

## Files Created/Modified
- `backend/internal/handlers/project_member_public_handler.go` - 4 Endpunkte + 404-Gate + URL-Bau
- `backend/internal/handlers/project_member_public_handler_test.go` - 5 Source-Assertion-Tests
- `backend/cmd/server/main.go` - Konstruktion + 4 Routen
- `shared/contracts/openapi.yaml` - 4 Pfade + 7 Schemas

## Decisions Made
- Routing-Konvention `/anime/:id/group/:groupId/...` (Brief 21 erlaubt), Frontend-URL unveraendert.
- `preview_url` = 'original'-Variante (kein 'preview'-Variant vorhanden); Original-Vollansicht bleibt optional.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. Build+Tests via Einweg-Container gegen Host-Code (Container backt Quellcode).

## User Setup Required
None.

## Next Phase Readiness
- Backend (Wave 1) vollstaendig: Repo + Handler + Routen + OpenAPI, alle Backend-Tests grün.
- **Betriebsnotiz:** Neue Routen erst nach `docker compose up -d --build team4sv30-backend` live (vor 122-10-UAT).
- Bereit fuer Wave 2 (122-03 Frontend-Datenschicht + 122-04 Link-Change).

---
*Phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel*
*Completed: 2026-08-10*

---
phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel
plan: 01
subsystem: api
tags: [go, pgx, postgres, cursor-pagination, visibility-policy, public-read]

requires:
  - phase: 99/114
    provides: bestehende oeffentliche Fansub-Projekt-/Contribution-/Notes-/Media-Modelle
provides:
  - ProjectMemberPublicRepository (ResolveMemberRelation, GetSummary, ListNotes/Media/Releases)
  - Zentrale Public-Visibility-Praedikate (Notes/Media/Contribution) + Member↔User-CTE (D-06)
affects: [122-02, 122-03, 122-05, 122-06, 122-07, 122-08]

tech-stack:
  added: []
  patterns:
    - "Zentrale Visibility-Praedikat-Konstanten, von Count- UND List-Pfad gemeinsam genutzt (Count==sichtbar)"
    - "Uploader->Member-Aufloesung ueber Legacy users.id via members.user_id + verifizierte member_claims->app_users.legacy_user_id (D-06)"
    - "Seek-Cursor-Pagination via release_cursor_pagination.go-Helper (clampCursorLimit/trimCursorPage/encodeTime|Int32Int64Cursor)"

key-files:
  created:
    - backend/internal/repository/project_member_visibility.go
    - backend/internal/repository/project_member_public_repository.go
    - backend/internal/repository/project_member_public_repository_test.go
  modified: []

key-decisions:
  - "Kanonisches Public-Media-Gate uebernommen: v.name='public' AND rs.code='approved' AND ma.status='ready' AND deleted_at IS NULL (INNER JOINs)"
  - "Media-Uploader-Spalte ist uploaded_by_user_id (Legacy users), NICHT created_by_user_id wie im Brief vermutet"
  - "Backend-Routing folgt Konvention /anime/:id/group/:groupId/... statt /fansubs/:groupId/... (Brief 21 erlaubt)"

patterns-established:
  - "Public-Read-Repo mit Source-Assertion-Tests (kein Live-Postgres-Harness im repository-Paket)"

requirements-completed: [D-01, D-04, D-05, D-06, D-07, D-09]

duration: ~35 min (sequential inline auf Linux via SSH)
completed: 2026-08-10
---

# Phase 122 Plan 01: Backend Repo-Layer + zentrale Visibility-Policy Summary

**Member-scoped oeffentliche Read-Datenschicht (Member × Fansubgruppe × Anime): ProjectMemberPublicRepository mit 404-Gate, Summary/Rollen/Counts und cursor-paginierten Notes/Media/Releases, plus zentraler Visibility-Policy.**

## Performance
- **Duration:** ~35 min (hand-getrieben, sequenziell auf Linux)
- **Completed:** 2026-08-10
- **Tasks:** 4 (Visibility-Policy, Repo Relation+Summary, Cursor-Listen, Tests)
- **Files created:** 3

## Accomplishments
- `project_member_visibility.go`: drei Public-Praedikate (Notes/Media/Contribution) + `projectMemberUserIDsCTE` fuer die D-06-Uploader-Aufloesung — von allen vier Collections wiederverwendet (Count==sichtbar, Brief 23).
- `project_member_public_repository.go`: `ResolveMemberRelation` (404-Gate via EXISTS ueber release_member_roles/anime_contributions), `GetSummary` (Hero + Rollen-Union + 4 Counts), `ListNotes`/`ListMedia`/`ListReleases` (Seek-Cursor, limit+1-Overfetch, strikt Member×Anime×Gruppe).
- `project_member_public_repository_test.go`: 7 Source-Assertion-Tests (Scoping, Visibility-Gates, Count-Wiederverwendung, Cursor, D-06, Relation-Gate).

## Task Commits
1. **Task 1-3: Visibility-Policy + Repository (Relation/Summary/Listen)** - `feat(122-01)` (production code, ein Commit)
2. **Task 4: Source-Assertion-Tests** - im selben feat-Commit
**Plan metadata:** `docs(122-01)` (SUMMARY)

## Files Created/Modified
- `backend/internal/repository/project_member_visibility.go` - Zentrale Public-Visibility-Praedikate + Member↔User-CTE
- `backend/internal/repository/project_member_public_repository.go` - Repository mit 5 Methoden (Relation-Gate, Summary, 3 Cursor-Listen)
- `backend/internal/repository/project_member_public_repository_test.go` - 7 Source-Assertion-Tests

## Decisions Made
- **Kanonisches Media-Gate** aus release_detail_public uebernommen (`ma.status='ready'` ergaenzt) statt eigener COALESCE-Variante — verhindert Anzeige nicht-freigegebener Medien.
- **Spaltenname `uploaded_by_user_id`** (Legacy `users`) statt des im Brief/D-06 vermuteten `created_by_user_id` — DECISIONS.md + 122-CONTEXT.md D-06 entsprechend korrigiert.
- **Routing-Konvention** `/anime/:id/group/:groupId/...` (nicht `/fansubs/:groupId/...`) — Brief 21 erlaubt konventionskonformes Routing; das oeffentliche Frontend-URL bleibt unveraendert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Korrektheit] Media-Gate + Spaltenname korrigiert**
- **Found during:** Task 4 (read_first der Nachbar-Tests)
- **Issue:** Plan/CONTEXT nahmen `created_by_user_id` an und ein COALESCE-Media-Filter; kanonisch ist `uploaded_by_user_id` und das Gate `v.name='public' AND rs.code='approved' AND ma.status='ready'`.
- **Fix:** Predicate + INNER JOINs angepasst; Doku (DECISIONS/CONTEXT D-06) auf `uploaded_by_user_id` korrigiert.
- **Verification:** go build ./... RC 0; 7 Repo-Tests gruen.

---

**Total deviations:** 1 auto-fixed (1 Korrektheit). **Impact:** Erhoeht die Korrektheit der Sichtbarkeit; kein Scope-Creep.

## Issues Encountered
- Infrastruktur: Der Backend-Container backt den Quellcode ins Image; Host-Edits werden erst via Einweg-Container (`docker run -v .../backend:/app team4s-team4sv30-backend go ...`) oder Image-Rebuild wirksam. Build+Tests wurden korrekt via Einweg-Container gegen den Host-Code gefahren.

## User Setup Required
None.

## Next Phase Readiness
- Datenschicht steht und kompiliert (go build RC 0, 7 Tests gruen). Bereit fuer 122-02 (Handler/Routen/OpenAPI).
- **Offen:** SQL-Laufzeitkorrektheit wird erst im Live-UAT (122-10) gegen echte Daten bewiesen; Source-Assertion sichert Scoping/Visibility auf Quelltext-Ebene.

---
*Phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel*
*Completed: 2026-08-10*

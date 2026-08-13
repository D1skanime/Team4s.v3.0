---
phase: 75-anime-gruppen-deep-dive-anime-id-group-groupid
plan: "01"
subsystem: backend-api
tags:
  - go-repository
  - gin-handler
  - openapi
  - typescript-types
  - public-endpoints
dependency_graph:
  requires:
    - Phase 72 (status/projection foundation — media_assets.status='ready' fallback used)
  provides:
    - GET /api/v1/anime/:id/group/:groupId/contributors (public)
    - GET /api/v1/anime/:id/group/:groupId/themes (public)
    - GET /api/v1/anime/:id/group/:groupId/release-media (public)
  affects:
    - backend/cmd/server/main.go (route registration)
    - frontend/src/lib/api.ts (three new helpers)
tech_stack:
  added: []
  patterns:
    - Projektions-Repository-Muster (analog anime_contributions_public_repository.go)
    - Zwei-Query-Projektion (external contributors + team members getrennt)
    - Visibility-Gate: media_assets.status='ready' (Phase-72-Fallback)
    - TDD RED/GREEN Zyklus (testify, t.Skip()-Muster)
key_files:
  created:
    - backend/internal/repository/group_contributors_repository.go
    - backend/internal/repository/group_themes_repository.go
    - backend/internal/repository/group_release_media_repository.go
    - backend/internal/repository/group_contributors_repository_test.go
    - backend/internal/handlers/group_contributors_handler.go
    - frontend/src/types/groupContributors.ts
  modified:
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
    - frontend/src/lib/api.ts
decisions:
  - "Sichtbarkeits-Gate: media_assets.status='ready' als Phase-72-Fallback (keine Review-/Visibility-Felder vorausgesetzt)"
  - "GroupReleaseMediaRepository bekommt mediaStorageDir als Parameter (analog AdminContentHandler)"
  - "Beide Queries (external + team) laufen sequenziell statt in einer Query, analog bestehende Projektions-Repos"
  - "Alle Tests nutzen t.Skip()-Muster (kein Test-DB vorhanden) — SKIP = PASS bei go test"
metrics:
  duration: "15min"
  completed_date: "2026-06-05"
  tasks: 2
  files: 9
---

# Phase 75 Plan 01: Öffentliche Gruppen-Projektions-Endpunkte — Summary

Drei neue öffentliche Backend-Endpoints (contributors, themes, release-media) scoped auf Anime+Gruppe, mit vollständigen OpenAPI-Schemas, TypeScript-DTOs und api.ts-Helpern.

## Was gebaut wurde

**Task 1: Backend-Repositories + Handler (TDD)**

Drei neue Repository-Dateien + ein Handler, alle als Projektions-Repositories nach dem bewährten `anime_contributions_public_repository.go`-Muster:

- `group_contributors_repository.go`: `GetProjectContributors(ctx, animeID, groupID)` — zwei sequenzielle Queries:
  - Query A: Externe Mitwirkende aus `anime_contributions` (gescoped mit `fansub_group_id=$2`, `is_public_on_anime_page=true`, `hfgm.visibility='public'`, `release_version_id IS NULL`)
  - Query B: Team-Beteiligte aus `release_member_roles` (JOIN über `episodes.anime_id=$1`, `release_version_groups.fansub_group_id=$2`), ARRAY_AGG DISTINCT für Rollen-Labels
  - Verwendet `memberSlugExpr`/`memberDisplayExpr` aus demselben Package (keine Neudefinition)
  - Beide Slices niemals nil

- `group_themes_repository.go`: `GetPublicGroupThemes(ctx, animeID, groupID)` — themes → release_theme_assets → fansub_releases → episodes (anime_id=$1) + release_version_groups (fansub_group_id=$2), WHERE media_assets.status='ready'

- `group_release_media_repository.go`: `GetPublicReleaseMedia(ctx, animeID, groupID)` — release_version_media → release_versions → fansub_releases → episodes + release_version_groups, WHERE status='ready'; Items-Slice niemals nil

- `group_contributors_handler.go`: `GroupPublicHandler` mit drei Handler-Methoden, `parseAnimeID`/`parseGroupID` mit `badRequest` auf Fehler, `internalError` bei Repo-Fehler; Umlaute in Fehlermeldungen korrekt

- `group_contributors_repository_test.go`: Vier Testfunktionen (TDD RED → GREEN):
  - `TestGetProjectContributors_EmptyResult`
  - `TestGetProjectContributors_Scoping`
  - `TestGetPublicGroupThemes_VisibilityGate`
  - `TestGetPublicReleaseMedia_VisibilityGate`
  — Alle SKIP (kein Test-DB), PASS bei `go test`

**Task 2: Contracts + Routing + Frontend-Typen**

- `backend/cmd/server/main.go`: Drei neue Repo-Instanzen + Handler-Instanz + drei Routen ohne `authMiddleware`
- `shared/contracts/openapi.yaml`: Drei neue Pfade + 8 neue Schema-Komponenten
- `frontend/src/types/groupContributors.ts`: 8 TypeScript-Interfaces (snake_case, passend zu Go JSON-Tags)
- `frontend/src/lib/api.ts`: Import + `getGroupContributors`, `getGroupThemes`, `getGroupReleaseMedia` (authorizedFetch-Muster, cache:'no-store', ApiError)

## Verifikation

| Kriterium | Ergebnis |
|-----------|----------|
| `go build ./...` | PASS |
| `go test ./internal/repository/ -run GroupContributors` | PASS (4 tests SKIP — kein Test-DB, projektkonformes Muster) |
| `npm run typecheck` | PASS (nur pre-existierende Fehler aus Phase-78-Arbeit, keine neuen Fehler in Phase-75-Dateien) |
| Drei Routen in main.go ohne authMiddleware | PASS |
| OpenAPI-Pfade für contributors/themes/release-media | PASS |
| groupContributors.ts exportiert alle 8 Interfaces | PASS |
| api.ts exportiert getGroupContributors, getGroupThemes, getGroupReleaseMedia | PASS |

## Abweichungen vom Plan

Keine — Plan wurde exakt wie geschrieben ausgeführt.

## Known Stubs

Keine Stubs: Die Repositories liefern echte SQL-Queries. URLs für Thumbnails werden via `/media/` + `storage_path` aufgelöst (analog bestehende Handler).

## Threat Flags

Keine neuen Bedrohungsflächen außerhalb des Plan-Threat-Modells:
- T-75-01-01: `parseAnimeID`/`parseGroupID` mit `id > 0`-Check implementiert (badRequest auf Fehler)
- T-75-01-02/03: Visibility-Gate `status='ready'` in beiden Queries implementiert
- T-75-01-04: `is_public_on_anime_page=true` + `visibility='public'` Gate für externe Contributors

## TDD Gate Compliance

- RED commit: `5bb676fb` — test(75-01): 4 failing tests (undefined types)
- GREEN commit: `5cbd7419` — feat(75-01): Implementierung aller 5 Dateien, Tests PASS

## Self-Check: PASSED

Dateien erstellt:
- backend/internal/repository/group_contributors_repository.go: FOUND
- backend/internal/repository/group_themes_repository.go: FOUND
- backend/internal/repository/group_release_media_repository.go: FOUND
- backend/internal/repository/group_contributors_repository_test.go: FOUND
- backend/internal/handlers/group_contributors_handler.go: FOUND
- frontend/src/types/groupContributors.ts: FOUND

Commits:
- 5bb676fb (test RED): FOUND
- 5cbd7419 (feat GREEN): FOUND
- 2a2a0c00 (feat contracts+routing): FOUND

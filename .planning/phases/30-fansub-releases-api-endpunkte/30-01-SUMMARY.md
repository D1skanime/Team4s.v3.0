---
phase: 30-fansub-releases-api-endpunkte
plan: 01
subsystem: api
tags: [go, gin, fansub-releases, release-identity, admin-api, tdd]

requires:
  - phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
    provides: fansub_releases, release_versions, release_version_groups as normalized tables
  - phase: 23-op-ed-theme-verwaltung
    provides: release-anchored theme asset upload seam (GetCanonicalFansubAnimeRelease)

provides:
  - Explicit admin API for fansub release identity: list, canonical resolve, fetch by ID
  - AdminFansubReleaseSummary DTO with release identity, anime context, group context, episode anchor
  - CanonicalFansubAnimeReleaseResponse wrapper for canonical-release resolution (nil-safe)
  - Three new GET routes: /admin/fansubs/:id/anime/:animeId/releases, .../canonical, /admin/releases/:releaseId

affects:
  - 30-02 (controlled release metadata patch seam)
  - 30-03 (frontend adoption of explicit release seam)
  - ReleaseThemeAssetsSection.tsx (can now load release identity explicitly)

tech-stack:
  added: []
  patterns:
    - TDD RED→GREEN for repository methods and handler integration
    - Separate dedicated file (admin_content_fansub_releases.go) to stay within 450-line CLAUDE.md limit
    - adminThemeRepository interface extended with release-read methods for handler testability

key-files:
  created:
    - backend/internal/repository/admin_content_fansub_releases.go
    - backend/internal/handlers/admin_content_fansub_releases_handlers.go
    - backend/internal/repository/admin_content_fansub_releases_test.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
  modified:
    - backend/internal/models/admin_release_theme_assets.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go

key-decisions:
  - "Release read methods land in a new admin_content_fansub_releases.go file so admin_content_anime_themes.go (already 2056 lines) stays untouched and within its own scope"
  - "ListFansubAnimeReleases uses GROUP BY to deduplicate releases shared across multiple groups — avoids N rows per group member"
  - "GetCanonicalFansubAnimeReleaseSummary returns 200 with release=null when no release anchor exists — nil-safe design avoids special-casing on the client"
  - "GetAdminReleaseByID uses LEFT JOIN for group context so a release without any version-group rows still resolves gracefully"
  - "Route /admin/releases/:releaseId is a GET-only surface — no standalone create/delete because release lifecycle stays controlled through episode-version operations"

requirements-completed:
  - P30-SC1
  - P30-SC2

duration: 45min
completed: 2026-04-30
---

# Phase 30 Plan 01: Fansub-Releases API-Endpunkte Summary

**Explicit admin release identity API: fansub releases are now addressable resources with list, canonical-resolve, and direct-fetch endpoints, ending hidden release discovery via theme-asset side effects.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-04-30T07:30:00Z
- **Completed:** 2026-04-30T08:20:00Z
- **Tasks:** 2 of 2
- **Files modified:** 7

## Accomplishments

### Task 1: Define explicit admin release DTOs and repository reads

Added `AdminFansubReleaseSummary` and `CanonicalFansubAnimeReleaseResponse` to `backend/internal/models/admin_release_theme_assets.go`.

The summary DTO surfaces: release_id, anime_id, anime_title, fansub_group_id, fansub_name, episode_id, episode_number, source, version_count, has_theme_assets, created_at. This is enough context for admin UIs to understand "what release am I touching?" without loading a second entity.

New repository methods in `admin_content_fansub_releases.go`:
- `ListFansubAnimeReleases(fansubGroupID, animeID)` — all releases for scope, ordered by episode sort index
- `GetCanonicalFansubAnimeReleaseSummary(fansubGroupID, animeID)` — canonical anchor with nil-safe response
- `GetAdminReleaseByID(releaseID)` — direct fetch with LEFT JOIN for group context

All grounded in `fansub_releases`, `release_versions`, `release_version_groups`, `episodes`, `anime`, `fansub_groups`, and `release_theme_assets`. No `fansub_group_media` used (per CONTEXT.md constraint).

### Task 2: Register explicit admin routes and handlers for release reads

Three new Gin handlers in `admin_content_fansub_releases_handlers.go`:
- `ListFansubAnimeReleases` — GET /admin/fansubs/:id/anime/:animeId/releases
- `GetCanonicalFansubAnimeReleaseSummary` — GET /admin/fansubs/:id/anime/:animeId/releases/canonical
- `GetAdminRelease` — GET /admin/releases/:releaseId

Routes registered in `admin_routes.go` alongside existing fansub/release-theme-asset routes. The `adminThemeRepository` interface extended with the three new release-read methods to keep handler tests purely unit-testable.

Existing theme-asset routes unchanged — they remain for asset management, not release discovery.

## Verification

- `go test ./internal/handlers ./internal/repository -count=1` → all pass
- `go build ./...` → clean compile
- All 4 new TDD tests (2 repository, 2 handler integration) pass GREEN
- Acceptance criteria met:
  - `AdminFansubRelease|CanonicalRelease` found in models
  - `ListFansubAnimeReleases|GetCanonicalFansubAnimeReleaseSummary|GetAdminReleaseByID` found in repository
  - Route patterns found in admin_routes.go
  - Handler methods found in handler file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repository methods in new file instead of admin_content_anime_themes.go**
- **Found during:** Task 1
- **Issue:** `admin_content_anime_themes.go` is already 2056 lines — adding more methods would push it even further over the 450-line CLAUDE.md limit
- **Fix:** Created `admin_content_fansub_releases.go` as a dedicated Phase-30 file for release-read repository methods
- **Files modified:** New file instead of modifying the existing 2056-line file
- **Commit:** 61603ea2

**2. [Rule 3 - Blocking] Test helper name conflict for readHandlerSource**
- **Found during:** Task 2 test compilation
- **Issue:** `admin_content_test.go` already declared `readHandlerSource`, causing a redeclared-function error in the new test file
- **Fix:** Renamed the helper in the new test to `readFansubReleaseHandlerSource`
- **Files modified:** backend/internal/handlers/admin_content_fansub_releases_test.go
- **Commit:** 04ac77b3

## Known Stubs

None — all DTOs and repository queries are wired to real database tables. The handlers return real data from the repository. No placeholder text or hardcoded empty values in the production code path.

## Self-Check: PASSED

- backend/internal/repository/admin_content_fansub_releases.go — FOUND
- backend/internal/handlers/admin_content_fansub_releases_handlers.go — FOUND
- backend/internal/models/admin_release_theme_assets.go — FOUND (updated)
- Commits e9799d7c, 61603ea2, 93e77351, 04ac77b3 — all FOUND in git log
- go test ./internal/handlers ./internal/repository — PASS
- go build ./... — PASS

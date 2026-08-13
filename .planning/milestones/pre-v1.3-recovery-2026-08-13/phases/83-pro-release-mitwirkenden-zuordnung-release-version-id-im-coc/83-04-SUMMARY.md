---
phase: 83
plan: "04"
subsystem: backend-endpoint
tags: [endpoint, repository, handler, idor, has_override, d-02, d-08, d-10, d-12, wave-3]
dependency_graph:
  requires: [83-02, 83-03]
  provides: [effective-contributions-endpoint, has-override-listing-flag]
  affects:
    - backend/internal/models/admin_release_theme_assets.go
    - backend/internal/repository/admin_content_fansub_releases.go
    - backend/internal/repository/admin_content_fansub_releases_contributions_repository.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-content.yaml
tech_stack:
  added: []
  patterns: [two-step-resolution, idor-before-data, interface-injection-for-testing, narrow-interface]
key_files:
  created:
    - backend/internal/repository/admin_content_fansub_releases_contributions_repository.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go
    - backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go
  modified:
    - backend/internal/models/admin_release_theme_assets.go
    - backend/internal/repository/admin_content_fansub_releases.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-content.yaml
decisions:
  - "adminFansubReleasesContributionsRepo typed as narrow interface (not concrete *repository type) — enables test injection without DB"
  - "requireReleaseVersionViewAccess prüft CanForReleaseVersion(ActionReleaseVersionView) VOR Datenabfrage — T-83-IDOR mitigiert und test-verankert"
  - "has_override Subquery nutzt rv_sub.release_id = fr.id (Release-Ebene, nicht version) — konsistent mit der Listing-Gruppierung auf fr.id (D-08)"
  - "contributionsPermissionResolverDenied gibt FansubGroupIDs: []int64{5} zurück aber keine Rollen → ReasonNoMembership → 403 (korrekte IDOR-Test-Signatur)"
metrics:
  duration_minutes: 30
  completed_date: "2026-06-12"
  tasks_completed: 2
  files_changed: 9
---

# Phase 83 Plan 04: Effective-Contributions-Endpoint + has_override-Flag Summary

Neuer Backend-Endpoint `GET /admin/release-versions/:versionId/contributions/effective` mit zweistufiger Repository-Auflösung + `has_override`-Flag im Listing für D-08-Badge beim initialen Load. IDOR-Mitigation test-verankert (403 denied, 200 allowed).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | FansubReleasesContributionsRepository + EffectiveContributions-Typen | 2f1e3cb0 | backend/internal/repository/admin_content_fansub_releases_contributions_repository.go |
| 2 | HasOverride + has_override-Subquery + Handler + Test + Route + main.go + Contract | 66623a3b | 8 Dateien (models, repository, handlers, cmd, contracts) |

## What Was Built

**Task 1 — admin_content_fansub_releases_contributions_repository.go (NEU):**

Neue Typen:
- `EffectiveContributionRow` mit `ContributionID int64 json:"contribution_id"` (Pitfall 4 compliant), `MemberID`, `MemberName`, `MemberAvatarURL`, `RoleCodes []string`
- `EffectiveContributionsResult` mit `Rows`, `IsOverride bool`, `Source string`
- `FansubReleasesContributionsRepository` struct + `NewFansubReleasesContributionsRepository`

`ListEffectiveContributionsForVersion` — zweistufige Auflösung (D-02):
- Schritt 1: versions-spezifisch (release_version_id = $1 AND fansub_group_id = $2) → IsOverride=true, Source="release_version"
- Schritt 2: anime-weit Fallback (release_version_id IS NULL, anime_id via rv→fr→ep) → IsOverride=false, Source="anime_default"
- Defensiv-Check: `releaseVersionID <= 0 || fansubGroupID <= 0` → return nil, nil

**Task 2 — Acht Änderungen:**

1. `admin_release_theme_assets.go`: `HasOverride bool json:"has_override"` in `AdminFansubReleaseSummary` nach `HasThemeAssets`.

2. `admin_content_fansub_releases.go` — has_override-Subquery (D-08):
   - EXISTS-Subquery als letztes SELECT-Feld (vor FROM): `rv_sub.release_id = fr.id` (kein nicht-existenter `rv.id`-Alias)
   - `&item.HasOverride` am Ende der rows.Scan-Liste (nach `&item.CreatedAt`)

3. `admin_content_fansub_releases_contributions_handlers.go` (NEU):
   - `requireReleaseVersionViewAccess` — `CanForReleaseVersion(ActionReleaseVersionView)` VOR Datenabfrage (T-83-IDOR)
   - `GetEffectiveContributionsForVersion` — parst versionId + fansub_group_id, ruft Repo auf, gibt `data` + `meta.{is_override, source}` zurück

4. `admin_content_handler.go`:
   - `adminFansubReleasesContributionsRepo` Interface (narrow interface für Testbarkeit)
   - Feld `fansubReleasesContributionsRepo adminFansubReleasesContributionsRepo` in Struct
   - `WithFansubReleasesContributionsDeps` Methode

5. `admin_content_fansub_releases_contributions_handlers_test.go` (NEU):
   - `TestGetEffectiveContributionsForVersion/denied` → 403 (T-83-IDOR test-verankert)
   - `TestGetEffectiveContributionsForVersion/allowed` → 200 + is_override=false

6. `admin_routes.go`: `GET /admin/release-versions/:versionId/contributions/effective`

7. `main.go`: `.WithFansubReleasesContributionsDeps(repository.NewFansubReleasesContributionsRepository(dbPool))` — nil-Pointer-Panic ausgeschlossen

8. `shared/contracts/admin-content.yaml`:
   - `admin-release-version-contributions-effective` Endpoint-Eintrag
   - `has_override` in `AdminFansubReleaseSummary`
   - `EffectiveContributionRow`, `EffectiveContributionsMeta`, `EffectiveContributionsResponse` Typen

## Verification Results

```
TestGetEffectiveContributionsForVersion/denied:  PASS (403)
TestGetEffectiveContributionsForVersion/allowed: PASS (200)
go build ./...: exit 0
contributions/effective in admin_routes.go: FOUND
WithFansubReleasesContributionsDeps in main.go: FOUND
HasOverride in admin_release_theme_assets.go: FOUND
rv_sub.release_id = fr.id in admin_content_fansub_releases.go: FOUND
admin-release-version-contributions-effective in admin-content.yaml: FOUND
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] releasePermissionResolverStub in admin_content_fansub_releases_test.go fehlte ListActorContributionRolesForVersion**
- **Found during:** Task 2 (Compiler-Check für Handler-Tests)
- **Issue:** Nach Interface-Erweiterung in Plan 83-02 implementierte `releasePermissionResolverStub` das `permissions.Resolver`-Interface nicht mehr vollständig.
- **Fix:** Stub-Methode `ListActorContributionRolesForVersion` (gibt nil, nil zurück) hinzugefügt.
- **Files modified:** `backend/internal/handlers/admin_content_fansub_releases_test.go`
- **Commit:** 66623a3b

**2. [Rule 3 - Blocking] permissionResolverStub in app_auth_test.go fehlte ListActorContributionRolesForVersion**
- **Found during:** Task 2 (gleicher Compile-Blocker)
- **Fix:** Stub-Methode hinzugefügt.
- **Files modified:** `backend/internal/handlers/app_auth_test.go`
- **Commit:** 66623a3b

**3. [Rule 3 - Blocking] fansubMediaPermissionResolver in fansub_media_permission_test.go fehlte ListActorContributionRolesForVersion**
- **Found during:** Task 2 (gleicher Compile-Blocker)
- **Fix:** Stub-Methode hinzugefügt.
- **Files modified:** `backend/internal/handlers/fansub_media_permission_test.go`
- **Commit:** 66623a3b

**4. [Rule 3 - Blocking] AnimeContributionRow fehlte FansubGroupMemberID Feld**
- **Found during:** Task 2 (Compile-Blocker in contribution_proposals_me_test.go)
- **Issue:** Tests in `contribution_proposals_me_test.go` nutzten `repository.AnimeContributionRow{FansubGroupMemberID: 3}` aber das Feld fehlte in `AnimeContributionRow`. Pre-existing Bug, der Tests am Kompilieren hinderte.
- **Fix:** `FansubGroupMemberID int64 json:"fansub_group_member_id"` zu `AnimeContributionRow` hinzugefügt.
- **Files modified:** `backend/internal/repository/anime_contributions_inputs.go`
- **Commit:** 66623a3b

**5. [Design] adminFansubReleasesContributionsRepo als Interface statt konkretem Typ**
- **Found during:** Task 2 (Test-Erstellung)
- **Issue:** Plan sah `*repository.FansubReleasesContributionsRepository` als Feldtyp vor. Bei konkretem Typ kann der Test keinen Stub injizieren (DB-Verbindung fehlt in Tests).
- **Fix:** Narrow interface `adminFansubReleasesContributionsRepo` eingeführt (gleiche Methode), Feld auf Interface-Typ umgestellt. `WithFansubReleasesContributionsDeps` nimmt weiterhin den konkreten Typ an (implizite Interface-Erfüllung).
- **Files modified:** `backend/internal/handlers/admin_content_handler.go`
- **Commit:** 66623a3b

## Pre-existing Failures (Out of Scope)

`contribution_proposals_me_test.go` hatte `FansubGroupMemberID` auf dem falschen Struct — behoben via Rule 3 (war Compile-Blocker für unsere Test-Ausführung).

## Known Stubs

None — keine Stubs in Produktionscode.

## Threat Surface Scan

Neuer Endpoint `GET /admin/release-versions/:versionId/contributions/effective`:
- T-83-IDOR: `CanForReleaseVersion(ActionReleaseVersionView)` greift VOR Datenabfrage — mitigiert und test-verankert
- T-83-CROSSGROUP: `WHERE ac.fansub_group_id = $fansubGroupID` im Repository — Cross-Gruppen-Leckage verhindert
- T-83-NILPANIC: `WithFansubReleasesContributionsDeps` in main.go verdrahtet — nil-Pointer-Panic ausgeschlossen

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_endpoint | backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go | GET /contributions/effective — abgesichert via CanForReleaseVersion (T-83-IDOR mitigiert) |

## Self-Check: PASSED

- `backend/internal/repository/admin_content_fansub_releases_contributions_repository.go` FOUND
- `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers.go` FOUND
- `backend/internal/handlers/admin_content_fansub_releases_contributions_handlers_test.go` FOUND
- Commit 2f1e3cb0 FOUND (Task 1)
- Commit 66623a3b FOUND (Task 2)
- `TestGetEffectiveContributionsForVersion/denied` PASS (403)
- `TestGetEffectiveContributionsForVersion/allowed` PASS (200)
- `go build ./...` exit 0
- `HasOverride` in admin_release_theme_assets.go FOUND
- `rv_sub.release_id = fr.id` in admin_content_fansub_releases.go FOUND
- `contributions/effective` in admin_routes.go FOUND
- `WithFansubReleasesContributionsDeps` in main.go FOUND
- `admin-release-version-contributions-effective` in admin-content.yaml FOUND

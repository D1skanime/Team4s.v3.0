---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
reviewed: 2026-10-10T22:59:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - backend/internal/handlers/admin_content_fansub_releases_test.go
  - backend/internal/handlers/admin_content_release_theme_assets.go
  - backend/internal/handlers/admin_content_release_theme_assets_persist.go
  - backend/internal/handlers/admin_content_release_theme_assets_test.go
  - backend/internal/handlers/app_auth_test.go
  - backend/internal/handlers/dashboard_me_handler_test.go
  - backend/internal/handlers/fansub_media_permission_test.go
  - backend/internal/handlers/fansub_media_upload.go
  - backend/internal/permissions/capability_registry_test.go
  - backend/internal/permissions/permissions.go
  - backend/internal/permissions/permissions_reload_test.go
  - backend/internal/repository/authz_permissions_test.go
  - backend/internal/repository/media_repository.go
  - backend/internal/repository/media_soft_delete.go
  - backend/internal/repository/media_soft_delete_test.go
  - backend/internal/repository/membership_baseline_registry_test.go
  - backend/internal/repository/release_review_query_repository_test.go
  - backend/internal/repository/release_version_media_repository.go
  - backend/internal/services/effective_rights_service_test.go
  - backend/internal/services/review_service_test.go
  - database/migrations/0182_release_version_theme_asset_upload.down.sql
  - database/migrations/0182_release_version_theme_asset_upload.up.sql
  - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.test.tsx
  - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx
findings:
  critical: 0
  warning: 4
  info: 1
  total: 5
status: issues_found
---

# Phase 179: Code Review Report

**Reviewed:** 2026-10-10T22:59:00Z
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

This phase (179, "Media-Backend-Rechte vereinheitlichen — F-15 Teil 1") introduces a
dedicated `release_version_theme_asset.upload` capability (migration 0182), swaps the two
theme-asset upload handlers off the borrowed `release_version_media.upload` action onto it,
extracts the duplicated create-media-asset/insert-file/link persistence tail into a shared
`persistReleaseThemeAsset` helper, removes a second/legacy "custom media permission" fallback
path from `UploadFansubMedia`, consolidates two near-identical soft-delete SQL call sites
behind a new `execSoftDelete` helper, and adds a `D-13` platform-admin UI mirror to
`AnimeJellyfinAssetUploadControls`. Most of the files in the review scope only received a
single-line fixture update (adding `ActionReleaseThemeAssetUpload` to test stub role maps) and
were not meaningfully changed by this phase.

I read every file in scope, diffed each against the stated base commit to separate genuinely
new/changed code from pre-existing fixture content, ran `go vet`/`go build` for the touched
packages (clean), ran the relevant Go unit tests, ran the new frontend Vitest file, ran eslint
on the changed `.tsx`, and cross-checked the migration's role grant list against the live
Postgres instance (`docker compose exec team4sv30-db psql ...`).

The backend permission-swap and the `execSoftDelete`/`persistReleaseThemeAsset` extractions are
behavior-preserving and correctly implemented; the migration's 11-role grant list is verified
byte-for-byte against the live `role_capabilities` table for `release_version_media.upload`
(not just the stale Go test-fixture documentation), so no bug there. Two real issues were
found and proven by actually running the code: (1) a provably order-dependent/flaky backend
test file whose assertions pass only when another test in the package happens to run first and
populate a shared global cache, and (2) an inconsistent application of the new frontend D-13
platform-admin UI gate — it protects the upload controls but not the sibling delete controls
for the exact same backend-platform-admin-gated resources, defeating the stated "mirror the
backend 1:1, don't rely solely on the outer wrapper" rationale. A few lower-severity items
(ASCII-umlaut violations surviving into a newly created file; a source-grep test pattern
extended instead of fixed) round out the findings.

## Warnings

### WR-01: `AnimeJellyfinAssetUploadControls`'s D-13 platform-admin gate protects uploads but not deletes for the same platform-admin-only resources

**File:** `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx:376-665`
**Issue:** This phase adds a `useEffect`-driven `isPlatformAdmin` flag (via `getCurrentUser()`)
and wraps every *upload* trigger (the "Cover hochladen" / "Banner hochladen" / "Logo
hochladen" / "Background hochladen" / "Background-Video hochladen" buttons, and all five
hidden `<input type="file">` elements) in `isPlatformAdmin ? ... : null`. The component's own
comment states the explicit rationale: "D-13: Eigenständige Anzeige-Berechtigungsprüfung,
spiegelt das bestehende Backend-Enforcement (`requirePlatformAdminIdentity`) 1:1 auf UI-Seite,
statt sich ausschließlich auf den umgebenden `<PlatformAdminGate>`-Wrapper... zu verlassen."

However, every *delete* control in the same component — "Cover entfernen" (line ~386-393),
"Entfernen" for a background item (line ~458-465), and "Entfernen" for banner/logo/
background_video (line ~560-567) — remains unconditionally rendered and enabled (gated only by
`isBusy`/`!asset`), even though I confirmed the backend enforces the identical
`requirePlatformAdminIdentity` (`h.requireAdmin(c)`) check on both the `PUT` (assign) and
`DELETE` routes for every one of these asset kinds
(`backend/internal/handlers/admin_content_anime_assets.go:57-122`, routed in
`admin_routes.go:66-67` etc.). I confirmed by running the new Vitest file
(`AnimeJellyfinAssetUploadControls.test.tsx`) that only the upload buttons are asserted/hidden
for a non-platform-admin actor; no assertion exists for the delete buttons, and manual
inspection confirms they stay visible and clickable.

If this component is ever reached by a non-platform-admin actor without the outer
`<PlatformAdminGate>` (precisely the threat model D-13's own comment calls out), that actor
sees fully enabled "entfernen" buttons that always fail server-side with 403 — an inconsistent,
half-finished implementation of the stated goal, and a confusing UX regression in that specific
scenario (clickable buttons that can never succeed).
**Fix:** Gate the three delete code paths the same way the uploads are gated, e.g.:
```tsx
{isPlatformAdmin ? (
  <button
    type="button"
    className={`${styles.button} ${styles.buttonDanger}`}
    disabled={!hasActiveCover || isBusy}
    onClick={() => void handleRemoveCover()}
  >
    Cover entfernen
  </button>
) : null}
```
and the analogous wrap for the backgrounds-gallery "Entfernen" button and the banner/logo/
background_video "Entfernen" button. Add a Vitest assertion mirroring the existing upload-gate
tests (`screen.queryByRole('button', { name: /entfernen/i })` should be null when
`is_platform_admin=false`).

### WR-02: `admin_content_fansub_releases_test.go`'s permission-gated tests are order-dependent on shared global cache state (proven flaky)

**File:** `backend/internal/handlers/admin_content_fansub_releases_test.go:311-587`
**Issue:** `TestAdminFansubReleases_ListFansubAnimeAllowsFansubLead`,
`TestAdminFansubReleases_ListFansubAnimeReleasesReturnsData`,
`TestAdminFansubReleases_GetCanonicalReturnsNilReleaseWhenNoneExists`, and
`TestAdminFansubReleases_GetAdminReleaseByIDReturns404WhenMissing` all construct
`permissions.NewService(releasePermissionResolverStub{})` and expect a `fansub_lead`-roled
actor to be allowed `permissions.ActionReleaseView`, but none of them call
`loadAppAuthCapabilityTestCache(t)` (or any other `LoadCache`) first. `permissions.loadedCache`
is a single package-level variable shared by every test in the `handlers` test binary.

I proved this is a real, reproducible flake by actually running the suite two ways in the
backend container:
```
go test ./internal/handlers/... -run 'TestAdminFansubReleases' -v
# => all 4 listed tests FAIL with 403 "insufficient_role" / unexpected 403 instead of 404

go test ./internal/handlers/... -run '.' -v   # full package run
# => all 4 of the same tests PASS
```
The only difference is whether some other test file in the same package (which happens to call
`loadAppAuthCapabilityTestCache(t)`, e.g. `fansub_media_permission_test.go` or
`app_auth_test.go`) ran first and populated the shared cache as a side effect. This is a latent
test-isolation bug in a file directly inside this phase's review scope, on the exact subsystem
(permission capability resolution) this phase modifies — a `go test -run` subset, a reordering
of files, or a future extraction of these tests into their own file/package will silently start
failing (or silently mask a real regression if the opposite happens: a different test's cache
state happens to make a broken check look green).
**Fix:** Call `loadAppAuthCapabilityTestCache(t)` (or an equivalent local `LoadCache`) at the
top of each of the four affected tests, the same way
`TestFansubMediaUploadAllowsFansubLeadPastPermissionGate` and
`TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete` already do, so each test is
self-contained and does not depend on sibling test execution order.

### WR-03: ASCII-umlaut substitutions in a newly created file violate the project's Sprachqualität rule

**File:** `backend/internal/handlers/admin_content_release_theme_assets_persist.go:75`
**Issue:** `admin_content_release_theme_assets_persist.go` is a brand-new file introduced by
this phase (D-06 extraction). Its last error branch contains the user-facing German string
`"Theme-Video konnte nicht verknuepft werden."` — `verknuepft` should be `verknüpft`. The
project's `CLAUDE.md` is explicit and unconditional: *"Deutscher UI-Text in Produktcode
verwendet immer korrekte Umlaute... ASCII-Ersetzungen wie ae/oe/ue/... sind in user-facing
Strings verboten,"* and the scope section explicitly names *"Go-Response-Strings."* The same
ASCII substitution (`"Theme-Regel konnte nicht geprueft werden."`, should be `geprüft`) is
carried unchanged into the surrounding, heavily-refactored `admin_content_release_theme_assets.go`
(lines 241, 254, 373, 386) — pre-existing text, but one this phase's refactor had the
opportunity to fix while touching those exact call sites.
**Fix:** Correct both strings to use real umlauts:
```go
writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht verknüpft werden.")
...
writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Regel konnte nicht geprüft werden.")
```

### WR-04: `TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists` extends a source-grep test pattern CLAUDE.md flags as legacy debt, instead of converting it

**File:** `backend/internal/handlers/admin_content_fansub_releases_test.go:282-309`
**Issue:** This phase's own diff modifies `TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists`
to keep working after the D-06 extraction — but it does so by *adding a second*
`os.ReadFile`+`strings.Contains` source-inspection pass (now checking both
`admin_content_release_theme_assets.go` and the new `admin_content_release_theme_assets_persist.go`
for literal substrings like `"adminreleasethemeassetcreateinput{"`), rather than replacing it
with a real `httptest` call that exercises `persistReleaseThemeAsset`/`UploadReleaseThemeAssetForRelease`
and asserts on the resulting response/DB state (which the same test file already does
successfully elsewhere, e.g. `TestAdminFansubReleases_ListFansubAnimeReleasesReturnsData`).
`CLAUDE.md`'s Teststil section explicitly forbids this exact pattern ("Das Lesen der eigenen
`.go`-Quelldatei eines Handlers per `os.ReadFile` und die Prüfung eines Substrings... ohne den
Code je aufzurufen und eine echte Response zu prüfen") and explicitly says the existing 49-file
legacy backlog is "kein Vorbild zum Weiterkopieren" (not a precedent to keep copying) — this
diff doesn't copy a *new* instance of the pattern, but it does deepen an existing one (one
file became two) during a touch-point where it could instead have been retired, since this
same file demonstrates the correct real-execution alternative a few hundred lines below.
**Fix:** Replace both `os.ReadFile`/`strings.Contains` checks with a behavior assertion: call
`handler.UploadReleaseThemeAssetForRelease` (or `UploadReleaseThemeAsset`) through `httptest`
against a stub `themeRepo.createReleaseThemeAsset` that records the `AdminReleaseThemeAssetCreateInput`
it received, and assert on the captured `ReleaseID`/`ThemeID`/`MediaID` fields instead of
grepping source text — mirroring `TestReleaseThemeAsset_InsertMediaFileCalled` in
`admin_content_release_theme_assets_test.go`, which already does this correctly for the same
production code path.

## Info

### IN-01: Legacy "custom media permission" fallback remains live on the Delete path while this phase removes it from Upload, within the very same fansub-media domain

**File:** `backend/internal/handlers/fansub_media_delete.go:77-101`
**Issue:** This phase removes the `GetFansubGroupMediaPermissionsForAppUser`-backed legacy
fallback from `UploadFansubMedia` (proven by the new
`TestFansubMediaUploadRejectsDespiteCustomUploadPermissionFallback`), so upload denial by the
capability registry is now final. `DeleteFansubMedia`'s `deleteFansubGroupMedia` path (not
touched by this diff) still falls back to the same legacy `fansub_group_member_media_permissions`
table (`can_delete_all`/`can_delete_own`) when the capability-registry check denies. Given the
phase's stated title is "...vereinheitlichen — **Teil 1**," this is presumably deliberately
out of scope for this slice, but it does mean the "unified rights" claim does not yet hold for
the sibling delete endpoint in the same handler file/domain — worth tracking explicitly for the
Teil-2 follow-up so it isn't forgotten, since the upload/delete asymmetry is easy to miss once
this diff lands.
**Fix:** No action required for this phase if intentionally deferred; cross-reference this
gap from the Teil-2 planning notes so the removal in `fansub_media_delete.go` doesn't get lost.

---

_Reviewed: 2026-10-10T22:59:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
fixed_at: 2026-10-10T23:10:00Z
review_path: .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/179-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: all_fixed
---

# Phase 179: Code Review Fix Report

**Fixed at:** 2026-10-10T23:10:00Z
**Source review:** .planning/phases/179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht/179-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (4 warnings, 1 info)
- Fixed: 4
- Skipped: 1 (IN-01 — no action required, explicitly out of scope by the review's own text)

## Fixed Issues

### WR-01: D-13 platform-admin gate protected uploads but not deletes for the same resources

**Files modified:** `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx`,
`AnimeJellyfinAssetUploadControls.test.tsx`
**Commit:** `f3ce289d`
**Applied fix:** Wrapped all three delete code paths — "Cover entfernen", the backgrounds-gallery
"Entfernen" button, and the banner/logo/background_video "Entfernen" button — in the same
`{isPlatformAdmin ? (...) : null}` conditional already used for the upload controls, so a
non-platform-admin actor sees neither the upload nor the delete side of any platform-admin-only
asset. Extended the existing admin/non-admin tests to assert on the delete buttons too, and added
a dedicated test for the backgrounds-gallery "Entfernen" button (which needed its own persisted-
background fixture, since the shared `assetCards`/`persistedAssets` fixtures used by the other
tests carry no backgrounds). Verified: `npx vitest run AnimeJellyfinAssetUploadControls.test.tsx`
(4/4 passing) and the broader `npx vitest run src/app/admin/anime` (55 files / 495 tests, up from
494 before this fix, all green — no regression in either page call site).

### WR-02: Order-dependent tests sharing `permissions.loadedCache` across the test binary

**File modified:** `backend/internal/handlers/admin_content_fansub_releases_test.go`
**Commit:** `3138c98c`
**Applied fix:** Added `loadAppAuthCapabilityTestCache(t)` at the top of
`TestAdminFansubReleases_ListFansubAnimeAllowsFansubLead`,
`TestAdminFansubReleases_ListFansubAnimeReleasesReturnsData`,
`TestAdminFansubReleases_GetCanonicalReturnsNilReleaseWhenNoneExists`, and
`TestAdminFansubReleases_GetAdminReleaseByIDReturns404WhenMissing`, matching the self-contained
pattern already used elsewhere in the package. Reproduced the review's claim first (`-run` subset
→ 403 on all four) and confirmed the fix (`-run` subset → 200/200/200/404, and the same result in
a full-package run).

### WR-03: ASCII-umlaut substitutions in theme-asset error strings

**Files modified:** `backend/internal/handlers/admin_content_release_theme_assets_persist.go`,
`admin_content_release_theme_assets.go`
**Commit:** `a4140d57`
**Applied fix:** Corrected `"Theme-Video konnte nicht verknuepft werden."` →
`"...verknüpft..."` (new file) and all 4 occurrences of `"Theme-Regel konnte nicht geprueft
werden."` → `"...geprüft..."` (pre-existing call sites this phase's own refactor touched). Scanned
both files afterward for any other `ae/oe/ue` substitution — none found. `go build ./...` and the
`TestReleaseThemeAsset*` subset still pass.

### WR-04: Source-grep test deepened the Teststil-forbidden pattern instead of retiring it

**Files modified:** `backend/internal/handlers/admin_content_fansub_releases_test.go`,
`admin_content_release_theme_assets_test.go`
**Commit:** `251b0178`
**Applied fix:** Removed `TestAdminFansubReleases_DirectReleaseThemeUploadHandlerExists`'s
`os.ReadFile`/`strings.Contains` source inspection entirely (left a comment pointing to its
replacement) and added `TestReleaseThemeAsset_PersistsResolvedReleaseIDPerCallSite` in
`admin_content_release_theme_assets_test.go`, which calls `UploadReleaseThemeAsset` and
`UploadReleaseThemeAssetForRelease` through `httptest` against the real,
schema-isolated-Postgres-backed `mediaRepo` fixture and a `themeRepo` stub that captures the
`AdminReleaseThemeAssetCreateInput` each handler actually passes into the shared
`persistReleaseThemeAsset` method, asserting the correct `ReleaseID` is resolved per call site
(via `GetCanonicalFansubAnimeRelease` for the fansub-group entry point vs. the plain path
parameter for the release entry point). Verified passing against a live Postgres fixture
(`TEAM4S_PHASE106_TEST_DSN=postgres://team4s:***@team4sv30-db:5432/team4s_phase106_test_173`), not
just the `SKIP`-without-DSN path — both subtests pass for real.

## Skipped Issues

### IN-01: Legacy custom-media-permission fallback remains live on the Delete path

**Reason:** The review itself states "No action required for this phase if intentionally
deferred" — this is the explicit, user-confirmed D-10 scope boundary for this "Teil 1" phase (the
delete-side fallback is deliberately out of scope; only the upload-side fallback was removed in
Plan 179-03). No code change applies here; the gap is already tracked for Teil-2 by virtue of this
review and `deferred-items.md` existing on disk.

## Post-Fix Verification

Ran after all four fixes landed:
- `cd backend && go build ./... && go vet ./...` — clean
- `cd backend && go test ./internal/handlers/... -run 'TestAdminFansubReleases|TestReleaseThemeAsset'` — all pass (DSN-gated subtests `SKIP` without `TEAM4S_PHASE106_TEST_DSN`, as before)
- `cd backend && go test ./...` (no DSNs exported) — same FAIL set as documented in `deferred-items.md` before this fix pass (missing Jellyfin fixtures, missing Phase-128/134 DSNs, `release_version_media.reorder` pre-existing gap, stale `member_claims` source-grep test, Keycloak-dependent matrix tests) — no new failures introduced
- `cd backend && go test ./internal/handlers/... -run 'TestReleaseThemeAsset_PersistsResolvedReleaseIDPerCallSite|TestReleaseThemeAsset_InsertMediaFileCalled'` with `TEAM4S_PHASE106_TEST_DSN` exported — both pass for real against Postgres
- `cd backend && go test ./internal/migrations/... -run TestPhase134MigrationFreshUpDownProof -v` with `TEAM4S_PHASE134_MIGRATION_DSN` exported — PASS (migration 0182 still round-trips)
- `cd frontend && npx vitest run src/app/admin/anime` — 55 files / 495 tests passing (was 494 before WR-01's new test)
- `git diff --check` — clean

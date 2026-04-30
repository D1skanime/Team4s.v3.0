# Phase 30 Verification

**Status:** ready  
**Updated:** 2026-04-30 (Phase 30 Plan 03 closeout)

## Automated Verification Steps

### Backend: Repository and handler tests

```bash
cd backend && go test ./internal/handlers ./internal/repository -count=1
```

Expected: all tests pass (green). This covers:

- `admin_content_fansub_releases_test.go` — repository query correctness for `ListFansubAnimeReleases`, `GetCanonicalFansubAnimeReleaseSummary`, `GetAdminReleaseByID`
- `admin_content_fansub_releases_test.go` (handlers) — handler integration tests for all three release-read routes

### Frontend: TypeScript compile check

```bash
cd frontend && npx tsc --noEmit
```

Expected: no type errors. Covers `AdminFansubRelease`, `AdminCanonicalFansubAnimeReleaseResponse`, `AdminReleaseResponse` types and the rewired `ReleaseThemeAssetsSection`.

### Frontend: Production build

```bash
cd frontend && npm.cmd run build
```

Expected: all routes compile cleanly (no TypeScript, JSX, or import errors).

### Schema-only guard

Confirm that no new code paths write through `fansub_group_media` for release or release-media operations:

```bash
grep -r "fansub_group_media" backend/internal/handlers/ backend/internal/repository/
```

Expected: no matches in Phase 30 handler or repository files (`admin_content_fansub_releases.go`, `admin_content_fansub_releases_handlers.go`). Any match in those two files is a boundary violation.

## Evidence Checklist

| Evidence | What To Capture | Status |
|----------|-----------------|--------|
| Release list API response | JSON payload from `GET /admin/fansubs/:id/anime/:animeId/releases` for a fansub with existing releases | pending live test |
| Canonical release API response | JSON payload from `GET /admin/fansubs/:id/anime/:animeId/releases/canonical` showing `release` field populated | pending live test |
| Missing-release response | JSON from canonical endpoint when no release anchor exists — must show `{"release": null}`, not a 404 or theme-asset error | pending live test |
| Release-by-ID response | JSON from `GET /admin/releases/:releaseId` with release identity fields present | pending live test |
| Theme-asset continuity | Upload one theme asset → reload → asset listed → delete → release context intact throughout | pending live test |

## Case 1: Existing canonical release (fansub-anime pair with release activity)

**Automated:** `go test ./internal/handlers ./internal/repository -count=1` passes.

**Manual:**
1. Open a fansub edit page that has at least one anime with a canonical release and theme-asset history.
2. Navigate to the release-aware section (e.g., the theme-assets area).
3. Confirm the UI calls `GET /admin/fansubs/:id/anime/:animeId/releases/canonical` before any asset mutation.
4. Confirm `release_id` is visible/available in the UI state without depending on the theme-asset list response.

**Pass criteria:** release context is known before theme-asset operations and the UI does not require the theme-asset list to discover `release_id`.

## Case 2: Fansub-anime pair without a release anchor

**Automated:** `GetCanonicalFansubAnimeReleaseSummary` returns `{"release": null}` for a scoped pair with no releases — verified through the nil-safe handler design in Plan 01.

**Manual:**
1. Open a fansub-anime context with no episode-version history and thus no release anchor.
2. Call or observe the canonical-release API response.
3. Confirm the API returns `{"release": null}` (200 OK, empty release) rather than 404 or an opaque empty-assets response.
4. Confirm the UI renders an honest "no release anchor" state rather than pretending theme assets are just empty.

**Pass criteria:** missing-release state is explicit and clearly distinguished from "no theme assets."

## Case 3: Theme-asset flow on explicit release context

**Automated:** `npx tsc --noEmit` and `npm.cmd run build` pass, confirming `ReleaseThemeAssetsSection` no longer imports `getAdminFansubAnimeThemeAssets` and theme-asset reloads use `getAdminReleaseThemeAssets(releaseID)` directly.

**Manual:**
1. Resolve release context through the canonical-release endpoint.
2. Upload one theme asset using the admin fansub edit UI.
3. Reload the page and verify the asset remains listed.
4. Delete the asset and confirm release context remains stable throughout.

**Pass criteria:** upload/list/delete round-trip succeeds. Release identity is stable throughout. The UI does not lose `release_id` after upload or reload.

## Write-Boundary Constraints (for future phases)

The following constraints must not be violated by later work:

| Constraint | Reason |
|------------|--------|
| Release create remains controlled through episode-version operations only | Free blank `POST /admin/releases` has no episode/version anchor and would violate the release model's structural invariant |
| Release delete remains controlled through the last-version/variant lifecycle | Deleting a release that still has dependent versions/variants would orphan episode-version rows |
| `fansub_group_media` must not become a Phase 30+ write target for release or release-adjacent media | `media_assets` is the active runtime seam; activating `fansub_group_media` requires an explicit dedicated phase decision |
| `anime_fansub_groups` scope axis must not be bypassed | Release queries and admin contexts must use fansub+anime scoping; going around it risks returning wrong-group data |

## Manual Verification Sign-Off

Before Phase 30 can be fully closed:

- [ ] Case 1 live check passed (canonical release loads explicitly)
- [ ] Case 2 live check passed (nil release state is honest)
- [ ] Case 3 live check passed (theme-asset round-trip intact)
- [ ] Automated backend tests pass after Docker rebuild
- [ ] Frontend build clean after Docker rebuild

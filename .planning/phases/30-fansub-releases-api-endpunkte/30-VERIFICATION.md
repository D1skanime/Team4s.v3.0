---
phase: 30-fansub-releases-api-endpunkte
verified: 2026-04-30T12:00:00Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Scenario 1 — Existing canonical release is discoverable"
    expected: "GET /admin/fansubs/:id/anime/:animeId/releases/canonical fires before any theme-asset request; response contains release_id, anime_title, fansub_name, version_count; UI does not need the theme-asset response to know release_id"
    why_human: "Requires a live fansub-anime pair with existing episode-version history; network call ordering must be observed in browser DevTools"
  - test: "Scenario 2 — Missing canonical release returns an honest state"
    expected: "GET .../releases/canonical returns HTTP 200 with {\"release\": null}; UI renders a 'no release anchor' message, not a silent empty asset list"
    why_human: "Requires a fansub-anime pair with no release history; UI behavior for nil-release branch must be confirmed visually"
  - test: "Scenario 3 — Theme-asset round-trip after explicit release context"
    expected: "Upload succeeds, asset persists after page reload, delete succeeds, release_id stays stable throughout; context panel shows release identity after deletion"
    why_human: "Requires live upload/list/delete round-trip with file upload; release stability after deletion can only be confirmed through real session"
---

# Phase 30: Fansub-Releases API-Endpunkte Verification Report

**Phase Goal:** Expose fansub_releases as explicit admin read/resolve endpoints so release identity stops hiding behind helper responses. Adopt the explicit release API in the frontend so the UI knows its release context without piggybacking on theme-asset side effects. Lock the authority map and documentation boundary.
**Verified:** 2026-04-30
**Status:** human_needed — all automated artifacts verified; live operator UAT pending
**Re-verification:** No — initial verification (previous file was a planning checklist, not a GSD VERIFICATION.md)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Releases become explicit admin-readable resources instead of being discovered only through episode-version or theme-asset side effects | VERIFIED | Three explicit routes registered in `admin_routes.go` (lines 95-99); repository queries target `fansub_releases` directly with full SQL |
| 2 | Scoped release lookup for fansub + anime reuses the already-wired `anime_fansub_groups` reality | VERIFIED | SQL in `GetCanonicalFansubAnimeReleaseSummary` and `ListFansubAnimeReleases` joins `release_version_groups` and `fansub_groups` using `rvg.fansub_group_id = $1` and `ep.anime_id = $2` — scoping matches `anime_fansub_groups` axis |
| 3 | Theme-asset UX consumes explicit release context instead of using theme-assets responses as hidden release discovery | VERIFIED | `ReleaseThemeAssetsSection.tsx` line 48 calls `getAdminCanonicalFansubRelease` in its own `useEffect` before any theme-asset request; theme-asset load depends on `releaseID` being set from this call |
| 4 | Release authority is documented explicitly across fansub_releases, release children, and release-bound theme assets | VERIFIED | `db-runtime-authority-map.md` lines 154-193 and `db-schema-v2.md` lines 346, 482-488 explicitly document all four tables with authority labels |
| 5 | The phase does not treat fansub_group_media as the authoritative release/fansub media seam | VERIFIED | No matches for `fansub_group_media` in `admin_content_fansub_releases.go` or `admin_content_fansub_releases_handlers.go`; `db-runtime-authority-map.md` marks it as **blocked** |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/cmd/server/admin_routes.go` | Contains `/admin/fansubs/:id/anime/:animeId/releases`, `.../canonical`, and `/admin/releases/:releaseId` routes | VERIFIED | Lines 95-99; all three routes registered with auth middleware |
| `backend/internal/models/admin_release_theme_assets.go` | Contains `AdminFansubReleaseSummary` and `CanonicalFansubAnimeReleaseResponse` types | VERIFIED | Lines 35-56; types are substantive structs with 11 fields each |
| `backend/internal/repository/admin_content_fansub_releases.go` | Contains `ListFansubAnimeReleases`, `GetCanonicalFansubAnimeReleaseSummary`, `GetAdminReleaseByID` | VERIFIED | All three methods exist with real SQL queries, proper scanning, nil-safe handling for no-rows case |
| `backend/internal/handlers/admin_content_fansub_releases_handlers.go` | Contains `ListFansubAnimeReleases`, `GetCanonicalFansubAnimeReleaseSummary`, `GetAdminRelease` handler functions | VERIFIED | All three handlers present; proper auth checks, param validation, error routing |
| `backend/internal/handlers/admin_content_handler.go` | Interface declares the three new repository methods | VERIFIED | Lines 74-76; `adminThemeRepository` interface extended with all three method signatures |
| `frontend/src/lib/api.ts` | Contains `getAdminFansubAnimeReleases`, `getAdminCanonicalFansubRelease`, `getAdminRelease` | VERIFIED | Lines 1866, 1887, 1907; all three helpers implemented with proper fetch, error handling, typed return |
| `frontend/src/types/fansub.ts` | Contains `AdminFansubRelease`, `AdminCanonicalFansubAnimeReleaseResponse`, `AdminReleaseResponse` | VERIFIED | Lines 286-317; all types present with correct fields matching Go structs |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` | Uses `getAdminCanonicalFansubRelease` instead of inferring release_id from theme-asset responses | VERIFIED | Imports `getAdminCanonicalFansubRelease` on line 7; dedicated `useEffect` at line 45-62 calls it before any theme-asset load |
| `docs/architecture/db-runtime-authority-map.md` | Contains `fansub_releases`, `anime_fansub_groups`, `media_assets`, `fansub_group_media` | VERIFIED | All four table entries present with authority labels; Phase 30 section at lines 185-188 |
| `docs/architecture/db-schema-v2.md` | Contains `fansub_releases`, `media_assets`, `fansub_group_media` with Phase 30 notes | VERIFIED | Runtime authority notes at lines 346, 482-488 |
| `.planning/phases/30-fansub-releases-api-endpunkte/30-UAT.md` | Contains operator scenarios for release discovery and theme-asset continuity | VERIFIED | Three scenarios fully documented with pre-conditions, steps, expected results, and pass signals |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `admin_routes.go` | `AdminContentHandler.ListFansubAnimeReleases` | `deps.adminContentHandler.ListFansubAnimeReleases` | WIRED | Line 95 |
| `admin_routes.go` | `AdminContentHandler.GetCanonicalFansubAnimeReleaseSummary` | `deps.adminContentHandler.GetCanonicalFansubAnimeReleaseSummary` | WIRED | Line 96 |
| `admin_routes.go` | `AdminContentHandler.GetAdminRelease` | `deps.adminContentHandler.GetAdminRelease` | WIRED | Line 99 |
| `admin_content_fansub_releases_handlers.go` | `AdminContentRepository.ListFansubAnimeReleases` | `h.themeRepo.ListFansubAnimeReleases` | WIRED | Handler line 35 |
| `admin_content_fansub_releases_handlers.go` | `AdminContentRepository.GetCanonicalFansubAnimeReleaseSummary` | `h.themeRepo.GetCanonicalFansubAnimeReleaseSummary` | WIRED | Handler line 72 |
| `admin_content_fansub_releases_handlers.go` | `AdminContentRepository.GetAdminReleaseByID` | `h.themeRepo.GetAdminReleaseByID` | WIRED | Handler line 102 |
| `ReleaseThemeAssetsSection.tsx` | `getAdminCanonicalFansubRelease` in `api.ts` | import on line 7; called in useEffect line 48 | WIRED | Release context loaded before theme-asset fetch; `releaseID` set from response |
| `api.ts` helpers | Backend routes | fetch to `/api/v1/admin/fansubs/${fansubID}/anime/${animeID}/releases`, `.../canonical`, `/api/v1/admin/releases/${releaseID}` | WIRED | URL patterns match registered routes exactly |
| `api.ts` imports | `frontend/src/types/fansub.ts` | `AdminFansubAnimeReleasesResponse`, `AdminCanonicalFansubAnimeReleaseResponse`, `AdminReleaseResponse` | WIRED | Lines 102-105 of api.ts |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ReleaseThemeAssetsSection.tsx` | `releaseID` | `getAdminCanonicalFansubRelease` → `GET .../releases/canonical` → `GetCanonicalFansubAnimeReleaseSummary` → SQL query on `fansub_releases` | Yes — SQL joins `fansub_releases`, `episodes`, `anime`, `release_version_groups`, `fansub_groups` | FLOWING |
| `ReleaseThemeAssetsSection.tsx` | `assets` | `getAdminReleaseThemeAssets(releaseID)` — depends on `releaseID` being non-null; loads only after release context resolves | Yes — depends on real `releaseID` from DB | FLOWING |
| Handler `GetCanonicalFansubAnimeReleaseSummary` | `resp.Release` | `r.db.QueryRow` with parameterized SQL; returns `nil` on `pgx.ErrNoRows` | Yes — real DB query or explicit nil | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — routes require a running Docker Compose stack with Postgres; no standalone runnable entry point. Live checks covered by human verification scenarios.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| P30-SC1 | 30-01 | Explicit repository reads for release list, canonical release, and release-by-ID | SATISFIED | All three repository methods exist with real SQL in `admin_content_fansub_releases.go` |
| P30-SC2 | 30-01 | Explicit handler routes for the three release-read endpoints | SATISFIED | All three routes registered in `admin_routes.go`; handlers in `admin_content_fansub_releases_handlers.go` |
| P30-SC3 | 30-02 | Typed frontend API helpers and response types for release endpoints | SATISFIED | `getAdminFansubAnimeReleases`, `getAdminCanonicalFansubRelease`, `getAdminRelease` in `api.ts`; types in `fansub.ts` |
| P30-SC4 | 30-02 | `ReleaseThemeAssetsSection` rewired to use explicit release context | SATISFIED | Component imports and calls `getAdminCanonicalFansubRelease`; theme-asset load depends on resolved `releaseID` |
| P30-SC5 | 30-03 | Architecture docs explicitly document authority map for `fansub_releases`, `anime_fansub_groups`, `media_assets`, `fansub_group_media` | SATISFIED | Both `db-runtime-authority-map.md` and `db-schema-v2.md` updated with Phase 30 authority notes |

All five requirement IDs from PLAN frontmatter are accounted for. No orphaned requirements found in REQUIREMENTS.md (P30-SC* IDs exist only in planning phase files and ROADMAP.md).

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | None found | — | — |

No stubs, placeholder returns, `TODO`/`FIXME` comments, empty implementations, or `fansub_group_media` boundary violations found in any Phase 30 files.

---

### Human Verification Required

#### 1. Canonical release loads explicitly (Scenario 1)

**Test:** Open `/admin/fansubs/:id/edit` for a fansub group that has at least one anime with existing episode-version history. Navigate to the theme-assets section. Open browser DevTools network tab.
**Expected:** `GET .../releases/canonical` fires and returns a populated `release_id` before any theme-asset request is made. The UI does not need the theme-asset response to know `release_id`.
**Why human:** Requires live data (real fansub-anime pair with release history) and network call ordering can only be confirmed through browser DevTools observation.

#### 2. Nil-release state is honest (Scenario 2)

**Test:** Open a fansub-anime pair with no episode-version history (no canonical release anchor). Observe the canonical-release API response and UI state.
**Expected:** API returns HTTP 200 with `{"release": null}`. UI renders a visible "no release anchor" message, not a silent empty asset list or 404.
**Why human:** Requires a real fansub-anime pair with no release rows in the DB; the UI nil-state branch must be confirmed visually.

#### 3. Theme-asset round-trip with stable release context (Scenario 3)

**Test:** With a known canonical release, upload one theme asset, reload the page, confirm the asset is still listed, delete it, and confirm release identity is still shown after deletion.
**Expected:** Upload/reload/delete round-trip succeeds. `release_id` is consistent throughout. Release context panel remains visible after deletion.
**Why human:** Requires a live file upload to the running backend and multi-step session verification.

---

### Gaps Summary

No automated gaps found. All artifacts exist, are substantive, are wired, and data flows from real database queries. The three human verification items represent behavioral integration checks that require a live running environment and real data — they are not code defects.

The VALIDATION.md task statuses remain "pending" (not a code issue — these are tracking rows that would be updated after live test runs).

---

_Verified: 2026-04-30_
_Verifier: Claude (gsd-verifier)_

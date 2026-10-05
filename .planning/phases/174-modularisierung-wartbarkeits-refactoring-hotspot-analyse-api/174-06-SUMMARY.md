---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 06
subsystem: api
tags: [refactoring, api-client, media-assets, release-media, segments, admin-anime, fansub-media, vitest-guard-tests, barrel-module]

# Dependency graph
requires:
  - phase: 174-03
    provides: "frontend/src/lib/api/admin/anime-core.ts (and sibling anime-* sub-split files), the D-24 sub-split precedent this plan's admin/anime-assets.ts, admin/fansub-media.ts, admin/segment-assets.ts follow"
  - phase: 174-04
    provides: "frontend/src/lib/api/members.ts, fansubs-groups.ts, contributions-me.ts (this plan adds members-media.ts as members.ts's D-24 sibling, and appends to fansubs-groups.ts/contributions-me.ts directly based on real sibling-function evidence)"
  - phase: 174-05
    provides: "the live api.ts at 2348 lines (down from 174-03/04's 7253/4634) that this plan's live re-verification re-measured and triaged"
provides:
  - "frontend/src/lib/api/releases.ts (new): getReleaseAssets, the 8-function release-version-media CRUD/reorder/highlight bucket, and replaceReleaseCrew"
  - "frontend/src/lib/api/admin/anime-assets.ts (new): 13 general admin-anime asset functions (banner/cover/logo/background-video assign/delete, uploadAdminAnimeMedia, deleteUploadedCoverFile) plus 2 private helpers"
  - "frontend/src/lib/api/admin/fansub-media.ts (new): 7 admin/fansubs/** asset functions (fansub-entity media + Phase-78 group-media review workflow)"
  - "frontend/src/lib/api/admin/segment-assets.ts (new): 10 segment-asset/preview-image functions consumed exclusively from the episode-version editor"
  - "frontend/src/lib/api/members-media.ts (new): 3 own-profile avatar/background/story-image upload functions (D-24 split from members.ts)"
  - "frontend/src/lib/api/media.ts (new): getMediaOwnershipProjection only -- the one genuine truly-shared function in the triaged bucket"
  - "getGroupReleaseMedia relocated into the existing fansubs-groups.ts (sibling of getGroupThemes/getGroupReleases/getGroupAssets)"
  - "uploadMediaSuggestion relocated into the existing contributions-me.ts (sibling of submitSuggestion/getMySuggestions)"
affects: [174-07, 174-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Evidence-based triage over the plan's illustrative destination menu: this plan's own text offered 4 named destinations (admin/anime.ts, releases.ts, members.ts, media.ts-if-truly-shared), but real grep call-site evidence for 2 of the 46 functions (getGroupReleaseMedia, uploadMediaSuggestion) pointed to existing sibling files (fansubs-groups.ts, contributions-me.ts) not in that menu -- followed the same 'trace the real graph, not the plan's abbreviated excerpt' discipline 174-02/03/04 already established, rather than forcing them into an artificial media.ts catch-all just because the plan didn't name their true home"
    - "D-24 sub-split continues for every bucket that would exceed 450 lines: admin/anime-assets.ts, admin/fansub-media.ts, admin/segment-assets.ts are new siblings of 174-03's admin/anime-*.ts files (not one flat admin/anime.ts, which never existed as a single file post-174-03); members-media.ts is a new sibling of 174-04's members.ts (already at 403/450 lines, no headroom for 3 more upload functions)"
    - "Zero-call-site functions kept via D-01 behavior-preservation, not deleted: getGroupReleaseMedia has no production call sites (Phase 155's dead-fetch cleanup removed its last caller) but a test still asserts it is intentionally never called -- relocated verbatim next to its still-live siblings instead of removing it, since deleting unused-but-still-exported API surface is out of this phase's behavior-preserving scope"
    - "'Truly shared' resolved to exactly 1 function out of 46 (getMediaOwnershipProjection, ~2%), confirming RESEARCH.md's 0-5 expectation and falsifying the god-module risk the plan was explicitly designed to avoid -- identified by its generic `ownerType` string parameter (not hardcoded to one domain), the textbook shape RESEARCH.md anticipated"

key-files:
  created:
    - frontend/src/lib/api/releases.ts
    - frontend/src/lib/api/media.ts
    - frontend/src/lib/api/members-media.ts
    - frontend/src/lib/api/admin/anime-assets.ts
    - frontend/src/lib/api/admin/fansub-media.ts
    - frontend/src/lib/api/admin/segment-assets.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/fansubs-groups.ts
    - frontend/src/lib/api/contributions-me.ts
    - frontend/src/lib/api.no-token-boundary.test.ts
    - frontend/src/types/__tests__/v12-projection-contract.test.ts

key-decisions:
  - "Re-verified the live api.ts (2348 lines post-174-05) via grep before moving anything, re-confirming the plan's locked 45+1-function interface list matched exactly (46/46 found, 0 surprises) -- same discipline every prior 174-0x plan established"
  - "getGroupReleaseMedia -> fansubs-groups.ts (not media.ts, not releases.ts): its 3 siblings (getGroupThemes/getGroupReleases/getGroupAssets, the same 'Öffentliche Gruppen-Projektions-Endpunkte' bucket) already live there from 174-04; it has zero production call sites (dead per Phase 155's documented cleanup) and the sibling grouping is far stronger evidence than the plan's abbreviated 4-destination menu"
  - "uploadMediaSuggestion -> contributions-me.ts (not media.ts, not members.ts): its direct siblings submitSuggestion/getMySuggestions already live there from 174-04, sharing the exact same /api/v1/me/suggestions* endpoint family and target_type/target_id/category suggestion-field shape; its sole call site (ReportFormMedia.tsx) is a member-report flow, not a profile-media or generic-media flow"
  - "admin/anime-assets.ts (13 fns) and admin/fansub-media.ts (7 fns) created as new siblings in admin/ rather than one 'admin/anime.ts' or inline additions to existing anime-*.ts/fansub-members.ts files, following 174-03's established per-sub-concern D-24 split; admin/segment-assets.ts (10 fns, 442 lines) is a new sibling of 174-03's admin/segments.ts (core segment CRUD) -- distinct sub-concern (asset/render/preview-image vs. CRUD), confirmed via grep: all 10 consumed exclusively from admin/episode-versions/[versionId]/edit/**"
  - "members-media.ts (3 fns) split out of members.ts rather than appended, because members.ts was already at 403/450 lines with zero headroom for the ~130 additional lines the 3 upload functions + their local types would add"
  - "2 pre-existing guard/contract tests needed updating because their self-inspection logic hardcoded the pre-move file location (same class of fix 174-04 already made twice): api.no-token-boundary.test.ts's publicNoAuthFetchAllowlist (deleteUploadedCoverFile's same-origin Next.js-route fetch, now in admin/anime-assets.ts) and v12-projection-contract.test.ts's apiClientSource (getMediaOwnershipProjection, now in media.ts)"

requirements-completed: [D-08, D-09, D-11, D-12, D-19, D-22]

# Metrics
duration: ~95min
completed: 2026-10-05
---

# Phase 174 Plan 06: Media/Assets Bucket Triage (Releases, Admin Anime, Fansub Media, Segments, Members, Media) Summary

**Resolved RESEARCH.md's explicitly-flagged hardest Welle-2 decision point by triaging the live 46-function media/assets bucket (re-verified against the real 2348-line api.ts, not RESEARCH.md's superseded 30-function estimate) into 6 new consumer-specific files plus 2 existing sibling files by actual grep call-site evidence, leaving only 1 genuinely shared function (2%) in the new `media.ts` -- falsifying the god-module risk this plan existed to prevent.**

## Performance

- **Duration:** ~95 min
- **Completed:** 2026-10-05
- **Tasks:** 3 (all `type="auto"`; Task 1 was read-only grep-triage, folded into this summary's classification table and Task 2's execution rather than a separate commit)
- **Files modified:** 11 (5 modified, 6 created)

## Accomplishments

- Re-verified all 46 function names (45 media/assets + `replaceReleaseCrew`) against the live `frontend/src/lib/api.ts` by grep-locating each one before moving anything — confirmed 46/46 found, 0 surprises, matching the plan's locked interface list exactly.
- Ran the plan's exact per-function call-site grep (`grep -rl "<fn>" src/app src/components | grep -v '\.test\.'`) for all 45 named functions and classified every one by its real consumer domain — full table below.
- Extracted all 46 functions (plus 2 private helper functions that travel with their callers: `assignAdminAnimeSingularAsset`, `deleteAdminAnimeSingularAsset`) using precise line-range extraction verified against function-count greps per block, then spot-checked byte-identity via `git diff`-equivalent manual comparison of each destination file against the pre-move source.
- Created 6 new files: `releases.ts` (9 fns: `getReleaseAssets` + the 8-function release-version-media bucket + `replaceReleaseCrew`), `admin/anime-assets.ts` (13 fns + 2 private helpers), `admin/fansub-media.ts` (7 fns + 9 local types), `admin/segment-assets.ts` (10 fns), `members-media.ts` (3 fns), `media.ts` (1 fn — the sole "truly shared" case).
- Relocated 2 functions into **existing** sibling files based on stronger real evidence than the plan's 4-destination menu: `getGroupReleaseMedia` → `fansubs-groups.ts` (zero production call sites, dead per Phase 155's documented cleanup, but its 3 live siblings — `getGroupThemes`/`getGroupReleases`/`getGroupAssets` — already live there) and `uploadMediaSuggestion` → `contributions-me.ts` (direct sibling of `submitSuggestion`/`getMySuggestions`, same `/api/v1/me/suggestions*` endpoint family).
- Cleaned up `api.ts`'s import block: removed 6 now-fully-unused `@/types/*` import groups (`@/types/admin`, `@/types/profile`'s `MemberProfileResponse`, 4 of 5 names from `@/types/fansub`, all of `@/types/releaseVersionMedia`, `@/types/mediaAsset`, `@/types/media-ownership`, `@/types/groupContributors`) and the now-unused `authorizedUploadXhr` client re-import; collapsed 2 now-dangling orphaned section-header comments (`// Fansub merge operations` / `// Group operations`, leftover from 174-04's earlier extraction of the functions that used to sit under them) and normalized all resulting multi-blank-line runs back to the project's single-blank-line convention.
- `api.ts` shrank from 2,348 to 707 lines.
- Wired the barrel: added 6 new `export * from "./api/..."` lines (`admin/anime-assets`, `admin/fansub-media`, `admin/segment-assets`, `members-media`, `releases`, `media`) alongside the 20 already-existing ones — no barrel change needed for `fansubs-groups.ts`/`contributions-me.ts` since they already export from the barrel.
- Found and fixed 2 genuine regressions during the full-suite gate, both guard/contract tests whose self-inspection logic hardcoded the pre-move file location (same class 174-04 already fixed twice): `api.no-token-boundary.test.ts`'s `publicNoAuthFetchAllowlist` needed `admin/anime-assets.ts` added (its `deleteUploadedCoverFile` hits a same-origin Next.js route, not the backend API, pre-existing shape unchanged by the move); `v12-projection-contract.test.ts`'s `apiClientSource` needed to also read `api/media.ts` (it only read `api.ts`'s raw text to verify `getMediaOwnershipProjection`'s central-seam usage).
- Full regression suite matches the 174-01 documented baseline **exactly** across 2 independent full-suite runs after the fixes: `npx tsc --noEmit` — same 6 pre-existing errors (unrelated `ReleaseDetailHero.test.tsx`/`page.ts` type issues), 0 new. `npx eslint` on every touched/created file — 0 errors (2 pre-existing unrelated warnings in `v12-projection-contract.test.ts` at lines 108/115, untouched by this plan). `npx vitest run` — 4 failed test files / 6 failed tests (all pre-existing, documented in `174-HOTSPOTS.md`), 357 passed files / 3192 passed tests. One intermediate run (before the 2 guard-test fixes were in place) additionally showed 1-2 transient full-suite-contention flakes (`AdminFansubEditPage`'s "refreshes anime coverage" test, `ProjectMemberMediaGallery`'s pagination test) that both passed cleanly when re-run in isolation — confirmed not regressions, matching the exact flake class 174-04's summary already documented.

## Task Commits

All 3 tasks (triage, execute-move, barrel-wire-and-gate) land in a single commit, for the same reason every prior 174-0x plan did: Task 1 was read-only grep analysis with nothing to commit on its own (folded into this summary's classification table); Task 2's extraction alone would leave `api.ts` in a transiently-broken state (missing barrel exports for the 6 new files, dangling unused imports) until Task 3's barrel wiring and import cleanup completed. An intermediate per-task commit would have captured a build-broken `api.ts`:

1. **Tasks 1-3: media/assets bucket triage + extraction + barrel wiring + guard-test fixes + full gate** - `a99ce540` (refactor)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md)

## Classification Table (Task 1 — grep call-site evidence)

| Function | Destination | Call-site evidence |
|---|---|---|
| `uploadFansubMedia` | `admin/fansub-media.ts` | `components/admin/MediaUpload.tsx` (hardcoded fansub-entity media import) |
| `uploadFansubGroupMedia` | `admin/fansub-media.ts` | `admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` |
| `deleteFansubMedia` | `admin/fansub-media.ts` | `components/admin/MediaUpload.tsx` |
| `deleteFansubGroupMedia` | `admin/fansub-media.ts` | `admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` |
| `listFansubGroupMedia` | `admin/fansub-media.ts` | `admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` |
| `patchFansubMediaReview` | `admin/fansub-media.ts` | `admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` |
| `reorderFansubGroupMedia` | `admin/fansub-media.ts` | `admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` |
| `uploadOwnProfileAvatar` | `members-media.ts` | `app/me/profile/page.tsx` |
| `uploadOwnProfileBackground` | `members-media.ts` | `app/me/profile/page.tsx` |
| `uploadOwnProfileStoryImage` | `members-media.ts` | `app/me/profile/page.tsx` |
| `uploadAdminAnimeMedia` | `admin/anime-assets.ts` | `useSegmentPreviewImageHandlers.ts`, `useAnimePatchMutations.ts`, `createAssetUploadPlan.ts`, `AnimeJellyfinAssetUploadControls.tsx` |
| `assignAdminAnimeBannerAsset` / `CoverAsset` / `LogoAsset` / `BackgroundVideoAsset` | `admin/anime-assets.ts` | `useAnimePatchMutations.ts`, `createAssetUploadPlan.ts`, `AnimeJellyfinAssetUploadControls.tsx` |
| `addAdminAnimeBackgroundVideoAsset` / `addAdminAnimeBackgroundAsset` | `admin/anime-assets.ts` | `createAssetUploadPlan.ts` (+ patch mutations / controls) |
| `deleteAdminAnimeCoverAsset` / `BannerAsset` / `LogoAsset` / `BackgroundVideoAsset` / `BackgroundAsset` | `admin/anime-assets.ts` | `AnimeEditWorkspace.tsx`, `AnimeJellyfinAssetUploadControls.tsx`, `AnimePatchForm.tsx` |
| `deleteUploadedCoverFile` | `admin/anime-assets.ts` | `AdminAnimeOverviewClient.tsx` (create flow) |
| `getReleaseVersionMedia` | `releases.ts` | `useReleaseVersionMedia.ts`, `ReleaseVersionMediaReviewSection.tsx` |
| `uploadReleaseVersionMedia` / `patchReleaseVersionMediaItem` / `replaceReleaseVersionMediaFile` / `deleteReleaseVersionMediaItem` / `reorderReleaseVersionMedia` / `setReleaseVersionMediaHighlight` / `reorderReleaseVersionMediaHighlights` | `releases.ts` | `useReleaseVersionMedia.ts`, `ReleaseVersionMediaSection.helpers.tsx` |
| `renderAnimeSegment` | `admin/segment-assets.ts` | `useReleaseSegments.ts` |
| `getAnimeSegmentSuggestions` | `admin/segment-assets.ts` | `SegmenteTab.tsx` |
| `getSegmentLibraryCandidates` / `attachSegmentLibraryAsset` / `uploadSegmentAsset` / `deleteSegmentAsset` | `admin/segment-assets.ts` | `useSegmentAssetHandlers.ts` |
| `assignSegmentPreviewImage` / `getSegmentPreviewImageCandidates` / `attachSegmentPreviewImage` / `resetSegmentPreviewImage` | `admin/segment-assets.ts` | `useSegmentPreviewImageHandlers.ts` |
| `uploadMediaSuggestion` | `contributions-me.ts` (existing) | `components/contributions/ReportFormMedia.tsx`; sibling of `submitSuggestion`/`getMySuggestions` already in this file |
| `getMediaOwnershipProjection` | `media.ts` | No production call sites; generic `ownerType` string param, not hardcoded to one domain — the textbook "truly shared" case |
| `getGroupReleaseMedia` | `fansubs-groups.ts` (existing) | No production call sites (Phase 155 dead-fetch cleanup); sibling of `getGroupThemes`/`getGroupReleases`/`getGroupAssets` already in this file |
| `getReleaseAssets` | `releases.ts` | `MediaAssetsSection.tsx`, `episodes/[id]/page.tsx` |
| `replaceReleaseCrew` | `releases.ts` | `ReleaseContributionDrawer.tsx` (plan-locked regardless of triage) |

**Triage result: 0 functions landed in the "unclear/span 3+ domains" bucket; 1/46 (2%) is truly shared.** This confirms RESEARCH.md's 0-5 expectation and falsifies the god-module risk the plan was designed to prevent.

## Files Created/Modified

- `frontend/src/lib/api/releases.ts` - New (344 lines). `getReleaseAssets`, the 8-function release-version-media CRUD/reorder/highlight bucket, `replaceReleaseCrew`.
- `frontend/src/lib/api/admin/anime-assets.ts` - New (347 lines). 13 functions + 2 private helpers (`assignAdminAnimeSingularAsset`, `deleteAdminAnimeSingularAsset`): general anime asset management.
- `frontend/src/lib/api/admin/fansub-media.ts` - New (330 lines). 7 functions + 9 local types: fansub-entity media + Phase-78 group-media review workflow.
- `frontend/src/lib/api/admin/segment-assets.ts` - New (442 lines). 10 segment-asset/preview-image functions.
- `frontend/src/lib/api/members-media.ts` - New (171 lines). 3 own-profile upload functions.
- `frontend/src/lib/api/media.ts` - New (41 lines). `getMediaOwnershipProjection` only.
- `frontend/src/lib/api.ts` - Modified. Removed all 46 relocated functions + 2 private helpers, 6 now-unused `@/types/*` import groups, the now-unused `authorizedUploadXhr` client re-import, and 2 dangling orphaned section-header comments. Added 6 barrel `export * from "./api/..."` lines. Shrank from 2348 to 707 lines.
- `frontend/src/lib/api/fansubs-groups.ts` - Modified. Appended `getGroupReleaseMedia` + its `GroupReleaseMediaResponse` type import.
- `frontend/src/lib/api/contributions-me.ts` - Modified. Appended `uploadMediaSuggestion` + `UploadMediaSuggestionOptions` interface + `authorizedUploadXhr` import.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Modified. Added `admin/anime-assets.ts` to `publicNoAuthFetchAllowlist`.
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` - Modified. `apiClientSource` now concatenates `api.ts` + `api/media.ts`.

## Decisions Made

See `key-decisions` in frontmatter above for the full rationale on the 2 evidence-based placements outside the plan's named 4-destination menu (`getGroupReleaseMedia`, `uploadMediaSuggestion`), the D-24 sub-split naming/boundaries for the 4 new multi-function files, and the "truly shared = 1/46" triage result.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two pre-existing guard/contract tests broke because their self-inspection logic hardcoded the pre-move physical file location**
- **Found during:** Task 3 (full-suite regression run)
- **Issue:** `api.no-token-boundary.test.ts`'s `publicNoAuthFetchAllowlist` is a hardcoded file-path allowlist gating which files may use raw `fetch(` instead of the central client — failed on `admin/anime-assets.ts`'s relocated `deleteUploadedCoverFile` (a pre-existing same-origin `fetch('/api/admin/upload-cover', ...)` call to the Next.js app's own route handler, not the backend API) since the new file wasn't in the allowlist. `v12-projection-contract.test.ts`'s `apiClientSource` read only `api.ts`'s raw text to verify `getMediaOwnershipProjection`'s central-API-seam usage — failed once that function moved to `media.ts`.
- **Fix:** Added `admin/anime-assets.ts` to `publicNoAuthFetchAllowlist` with an explanatory comment matching the established style. Extended `apiClientSource` to concatenate `api.ts` + `api/media.ts`.
- **Files modified:** `frontend/src/lib/api.no-token-boundary.test.ts`, `frontend/src/types/__tests__/v12-projection-contract.test.ts`
- **Verification:** Both files re-run in isolation plus 2 full-suite re-runs confirm no regression, matching the 174-01 baseline exactly.
- **Committed in:** `a99ce540`

---

**Total deviations:** 1 auto-fixed (bug/test-coupling, 2 occurrences)
**Impact on plan:** Necessary consequence of enforcing the plan's own D-10 unchanged-import-path guarantee once the real file locations were traced, exactly matching 174-02/03/04's established discipline. No scope creep, no behavior change — pure test-infrastructure fixes with zero runtime effect, confirmed by 2 independent full-suite runs matching baseline exactly.

## Known Stubs

None — this plan relocates existing, working code; no new UI surfaces or data sources were introduced. `getGroupReleaseMedia`'s zero production call sites are a **pre-existing** state from Phase 155's documented dead-fetch cleanup, not a stub introduced by this plan — the function and its still-passing "never called" test both predate this relocation.

## Threat Flags

None — T-174-02-01 (the only threat this plan's `<threat_model>` names) is exactly what the verbatim-relocation discipline (precise line-range extraction verified by per-block function-count greps, zero renamed/merged functions, barrel-export-name collision check) and the 2x full-suite-baseline-match verification close. No new network endpoints, auth paths, or trust-boundary-crossing surface were introduced — this is a pure file-layout change.

## Self-Check: PASSED

- `frontend/src/lib/api/releases.ts` — FOUND
- `frontend/src/lib/api/media.ts` — FOUND
- `frontend/src/lib/api/members-media.ts` — FOUND
- `frontend/src/lib/api/admin/anime-assets.ts` — FOUND
- `frontend/src/lib/api/admin/fansub-media.ts` — FOUND
- `frontend/src/lib/api/admin/segment-assets.ts` — FOUND
- Commit `a99ce540` — FOUND (`git log --oneline --all | grep a99ce540`)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `api.ts` is now 707 lines (down from the original ~11,508), with 26 barrel `export * from "./api/..."` lines covering every relocated domain module from 174-02 through 174-06.
- The remaining ~700 lines of `api.ts` are the "other/unclear" bucket explicitly reserved for 174-07's scope per `174-HOTSPOTS.md`'s bucket table (e.g. `getGroupReleaseDetail`, `getReleasePlaybackAccess`, `getGroupReleaseListCursor`, `getGroupReleaseImages`, `getFansubGroupDomainProjection`, `getMyMemberships`, `getMyBadges`, watchlist, comments, member-correction functions).
- The "evidence over the plan's illustrative menu" and "D-24 sub-split per actual sub-concern, write-full-file-first-then-measure" disciplines are now proven across 3 different bucket shapes (174-03 admin anime, 174-04 fansubs/contributions, this plan's media/assets) — 174-07/08 facing an oversized or ambiguously-homed bucket should follow the same approach.
- No blockers. Full regression baseline (6 tsc errors, 4 failed test files/6 failed tests, 357/3192 passing) is unchanged and documented for 174-07 to compare against.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

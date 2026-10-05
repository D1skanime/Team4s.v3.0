---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 03
subsystem: api
tags: [refactoring, api-client, admin-anime, admin-users, admin-fansub, vitest-mocking, barrel-module]

# Dependency graph
requires:
  - phase: 174-02
    provides: "frontend/src/lib/api/client.ts (shared API-client infrastructure) and the locked barrel-path decision (api.ts stays the permanent barrel, re-exporting ./api/client and every subsequent domain module via `export * from`)"
provides:
  - "frontend/src/lib/api/admin/anime-core.ts, anime-jellyfin.ts, anime-relations.ts, anime-themes.ts, anime-taxonomy.ts, anime-release-assets.ts: the 42-function 'admin anime' bucket, sub-split by sub-concern (D-24, each file well under 450 lines)"
  - "frontend/src/lib/api/admin/segments.ts (9 functions), episodes.ts (8), users.ts (14), fansub-members.ts (23, single-file D-24 cohesion exception)"
  - "frontend/src/lib/api/client.ts gained 2 more shared-infra exports this plan needed to avoid duplication/cycles: parsePayloadApiError and authorizedUploadXhr (XHR-upload-with-auth-retry wrapper)"
  - "A reusable Python brace-aware TS function extractor (context-stack scanner handling nested template literals/${} interpolation/strings/comments) used to verbatim-relocate all 96 functions with zero manual-copy risk"
affects: [174-04, 174-05, 174-06, 174-07, 174-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-24 sub-split within one domain bucket: when a single RESEARCH.md bucket (admin anime, 42 functions) would exceed 450 lines in one file, split by sub-concern (core/jellyfin/relations/themes/taxonomy/release-assets) and re-export all sub-files from the barrel — not a single admin/anime.ts"
    - "D-24 cohesion exception (single large file, justified in a header comment): used for fansub-members.ts (~750 lines) per the plan's own artifact-path lock, mirroring 174-02's client.ts precedent"
    - "Helper-function relocation rule: a function used only by functions moving together relocates with them (buildCreateAnimeConflictAwareApiError, parseAniSearchEditConflictPayload, parseAniSearchCreateConflictPayload → anime-core.ts); a function used both inside and outside the moving bucket relocates to client.ts instead of being duplicated or creating a cycle (parsePayloadApiError, authorizedUploadXhr)"

key-files:
  created:
    - frontend/src/lib/api/admin/anime-core.ts
    - frontend/src/lib/api/admin/anime-jellyfin.ts
    - frontend/src/lib/api/admin/anime-relations.ts
    - frontend/src/lib/api/admin/anime-themes.ts
    - frontend/src/lib/api/admin/anime-taxonomy.ts
    - frontend/src/lib/api/admin/anime-release-assets.ts
    - frontend/src/lib/api/admin/segments.ts
    - frontend/src/lib/api/admin/episodes.ts
    - frontend/src/lib/api/admin/users.ts
    - frontend/src/lib/api/admin/fansub-members.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/client.ts

key-decisions:
  - "Admin anime bucket (42 functions, would be ~1,200 lines in one file) sub-split into 6 files by sub-concern (core/jellyfin/relations/themes/taxonomy/release-assets) per the plan's own Task 1 instruction, rather than kept as a single admin/anime.ts — all 6 files land well under 450 lines"
  - "fansub-members.ts kept as a single ~750-line file (not sub-split) because the plan's must_haves artifact section explicitly locks it as one artifact (unlike anime.ts, which the plan explicitly offers a sub-split escape hatch for) — justified with a D-24 header comment citing the 174-02 client.ts precedent"
  - "parsePayloadApiError and the authorizedUploadXhr/sendAuthorizedUploadXhrOnce/parseUploadXhrPayload XHR-upload chain relocated to client.ts (not part of this plan's named interfaces) because both are used by functions moving into admin/anime-core.ts AND admin/anime-release-assets.ts (buildCreateAnimeConflictAwareApiError, uploadAdminReleaseThemeAsset*) as well as by functions staying in api.ts (uploadFansubMedia, uploadGroupMedia, uploadReleaseVersionMedia, uploadMediaSuggestion, uploadStoryImage, etc.) — D-09 forbids duplicating them, and importing them from api.ts into admin/anime-core.ts would create exactly the api.ts↔admin/* cycle D-11 forbids"
  - "Built a dedicated Python brace-aware extraction/removal tool (context-stack scanner distinguishing code/template-literal/${}-expression/string/comment states) instead of manual copy-paste for all 96 function relocations — verified byte-for-byte against the pre-move source for every function, and verified zero unintended deletions (diffed the full before/after exported-function-name sets, confirming exactly the 96 planned names were removed and nothing else)"

requirements-completed: [D-08, D-09, D-11, D-12, D-19, D-22]

# Metrics
duration: ~70min
completed: 2026-10-05
---

# Phase 174 Plan 03: Admin Anime, Segments, Episodes, Users, Fansub-Member API Modules Summary

**Relocated all 5 admin-surface domain buckets (~96 functions, re-verified live counts: 42 admin-anime split into 6 sub-concern files, 9 segments/themes, 8 episode/import, 14 admin-users, 23 fansub-app-members) verbatim out of the 10,646-line `api.ts` monolith into `frontend/src/lib/api/admin/`, using a custom brace-aware extraction tool to guarantee byte-for-byte relocation, and moved 2 additional shared-infra helpers (`parsePayloadApiError`, `authorizedUploadXhr`) into `client.ts` to avoid a duplication/cycle that only became visible once the real dependency graph was traced.**

## Performance

- **Duration:** ~70 min
- **Completed:** 2026-10-05
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 12 (2 modified, 10 created)

## Accomplishments

- Re-verified all 5 bucket function-name lists against the live `frontend/src/lib/api.ts` by grep-locating every one of the 96 named functions before moving anything — confirmed all names and locations matched the plan's locked interface list exactly (0 surprises).
- Built a Python brace-aware TS function extractor (`find_matching_brace`/`extract_function`) that correctly handles nested template-literal `${...}` interpolation, single/double/backtick strings, and line/block comments via a context-stack scanner — naive brace-counting or "first `{` after `)`" heuristics both failed on real functions in this file (e.g. `loadAdminAnimeEditAniSearchEnrichment`'s `Promise<{ data: X }>` return-type object-literal brace, and `${API_BASE_URL}` template interpolations). Verified the tool against every one of the 96 target functions plus 7 helper functions with zero brace-count mismatches and spot-diffed several against the raw source.
- Moved the 42-function "admin anime" bucket into 6 sub-concern files per the plan's own D-24 escape hatch (none of the 6 exceed 450 lines): `anime-core.ts` (create/update/delete + AniSearch-conflict helpers), `anime-jellyfin.ts` (sync/preview/discovery), `anime-relations.ts`, `anime-themes.ts`, `anime-taxonomy.ts` (genre/tag tokens), `anime-release-assets.ts` (fansub release/theme-asset upload).
- Moved segments/themes (9), episode/import (8), admin users (14), and fansub-app-members (23, kept as a single `fansub-members.ts` per the plan's own artifact-path lock, justified over 450 lines with a D-24 header comment) into their own files.
- Traced the real dependency graph (not the plan's abbreviated interface excerpt) and discovered 2 shared-infra items the plan didn't name that needed relocation to `client.ts` to avoid either duplicating them or creating an api.ts↔admin/* import cycle: `parsePayloadApiError` (used by `admin/anime-core.ts`'s `buildCreateAnimeConflictAwareApiError` AND by the still-resident `authorizedUploadXhr`) and the entire `authorizedUploadXhr`/`sendAuthorizedUploadXhrOnce`/`parseUploadXhrPayload` XHR-upload-with-auth-retry chain (used by `admin/anime-release-assets.ts`'s theme-asset uploaders AND by 6 other still-resident upload functions: `uploadFansubMedia`, `uploadGroupMedia`, release-version-media uploads, suggestion uploads, story-image uploads).
- Wired the barrel: `frontend/src/lib/api.ts` now has 10 `export * from "./api/admin/..."` lines (one per sub-module), keeping every `import { x } from "@/lib/api"` call site — including `lib/api/admin-anime-intake.ts`'s import of `buildCreateAnimeConflictAwareApiError`, now physically in `admin/anime-core.ts` — unchanged.
- Cleaned up 6 `@/types/*` import blocks in `api.ts` that became fully unused after the relocation (confirmed via grep-count before removing each one), plus the 3 now-unused `client.ts` re-imports (`ensureFreshRuntimeSession`, `isAuthRelatedError`, `parsePayloadApiError` — all only needed by the relocated `authorizedUploadXhr`).
- Post-removal cleanup: stripped the orphaned JSDoc comment blocks that were left dangling above each moved function (confirmed via a baseline check that the pre-existing `api.ts` has zero runs of 2+ consecutive blank lines — all 22 such runs introduced by the mechanical removal were collapsed back to the project's single-blank-line convention).
- `api.ts` shrank from 10,646 to 7,253 lines (-3,393, counting both the 96 relocated functions and their associated types/comments).
- Full regression suite matches the 174-01/174-02 documented baseline **exactly**: `npx tsc --noEmit` — same 6 pre-existing errors (unrelated `ReleaseDetailHero.test.tsx`/`page.ts` type issues), 0 new. `npx eslint` on every touched file (`api.ts`, `api/client.ts`, `api/admin/*.ts`) — 0 errors, 0 warnings. `npx vitest run` — 4 failed test files / 6 failed tests (all pre-existing, documented in `174-HOTSPOTS.md`), 357 passed files / 3192 passed tests (identical counts to 174-02's baseline).

## Task Commits

All 3 tasks land in a single commit, for the same reason 174-02 did: the shared-infra relocation (`parsePayloadApiError`/`authorizedUploadXhr` → `client.ts`) was discovered while executing Task 1 but is needed by Task 1's `admin/anime-release-assets.ts`, and the mechanical removal pass across all 96 functions was executed as one holistic operation (extract-verify-then-remove-all) rather than function-by-function, since the extraction tooling and import-cleanup analysis naturally spanned all 5 buckets at once. An intermediate per-task commit would have captured a transiently-broken `api.ts` (e.g., after Task 1's removals alone, `api.ts` would still reference `parsePayloadApiError`/`authorizedUploadXhr` locally while `client.ts` doesn't yet export them until the same pass that also touches Task 1's files) — so, as with 174-02, the full plan is one atomic commit:

1. **Tasks 1-3: admin anime/segments/episodes/users/fansub-members extraction + client.ts shared-infra carve-out + barrel wiring + full gate** - `c6c80a8e` (refactor)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `frontend/src/lib/api/admin/anime-core.ts` - New. `createAdminAnime`, `updateAdminAnime`, `deleteAdminAnime`, `loadAdminAnimeEditAniSearchEnrichment`, plus the 3 AniSearch-conflict helper functions they use (`buildCreateAnimeConflictAwareApiError`, `parseAniSearchEditConflictPayload`, `parseAniSearchCreateConflictPayload`).
- `frontend/src/lib/api/admin/anime-jellyfin.ts` - New. 10 functions: Jellyfin sync/preview/metadata/discovery for admin anime.
- `frontend/src/lib/api/admin/anime-relations.ts` - New. 5 relation CRUD functions.
- `frontend/src/lib/api/admin/anime-themes.ts` - New. 8 theme/theme-segment CRUD functions.
- `frontend/src/lib/api/admin/anime-taxonomy.ts` - New. 6 genre/tag token and name-update functions.
- `frontend/src/lib/api/admin/anime-release-assets.ts` - New. 9 functions: fansub release/theme-asset listing and upload (uses `authorizedUploadXhr` from `client.ts`).
- `frontend/src/lib/api/admin/segments.ts` - New. 9 anime-segment CRUD/assignment functions.
- `frontend/src/lib/api/admin/episodes.ts` - New. 8 episode CRUD + episode-import context/preview/apply functions.
- `frontend/src/lib/api/admin/users.ts` - New. 14 admin-user management functions, including the `toRangeStartRFC3339`/`toRangeEndRFC3339`/`ISO_DATE_ONLY_PATTERN` date-range helpers used only by `getAdminUserContributions`/`getAdminUserMedia`.
- `frontend/src/lib/api/admin/fansub-members.ts` - New. 23 fansub-app-member/invitation/claim functions, kept as a single file per the plan's artifact lock (D-24 exception documented in a header comment).
- `frontend/src/lib/api/client.ts` - Modified. Added `parsePayloadApiError` (exported, synchronous payload-based error parser) and the `authorizedUploadXhr`/`sendAuthorizedUploadXhrOnce`/`parseUploadXhrPayload` XHR-upload-with-auth-retry chain (only `authorizedUploadXhr` exported; the other two stay module-private).
- `frontend/src/lib/api.ts` - Modified. Removed all 96 relocated functions, their dangling JSDoc comments, the 3 local-only interfaces (`ListAdminJellyfinDiscoveryParams`, `AdminReleaseThemeAssetUploadOptions`, `AdminReleaseThemeAssetUploadForReleaseOptions`), the 2 shared-infra functions moved to `client.ts`, and 6 `@/types/*` import blocks' worth of now-unused type imports. Added 10 barrel `export * from "./api/admin/..."` lines and the 2 new `client.ts` re-imports (`authorizedUploadXhr`, plus keeping existing imports current).

## Decisions Made

- **Admin-anime sub-split naming and boundaries** (Claude's discretion per 174-CONTEXT.md): grouped by the natural sub-concern each function's URL path and purpose already implied — `anime-core` (base CRUD + AniSearch conflict handling), `anime-jellyfin` (10 Jellyfin-sync/discovery functions), `anime-relations` (5), `anime-themes` (8), `anime-taxonomy` (6 genre/tag), `anime-release-assets` (9 fansub-release/theme-asset). This is not identical to the plan's example names (`anime-core.ts`/`anime-relations.ts`/`anime-jellyfin.ts`) but follows the same spirit; `anime-themes.ts`/`anime-taxonomy.ts`/`anime-release-assets.ts` were added as 3 further sub-splits beyond the plan's 3 examples because the full 42-function bucket needed 6 groups, not 3, to stay under 450 lines each.
- **fansub-members.ts stays a single ~750-line file** rather than being sub-split like anime.ts, because the plan's `must_haves.artifacts` section names it as one artifact ("Admin fansub app members/invitations/claims functions ... 23 functions") without offering the sub-split escape hatch it explicitly gives anime.ts — documented as a D-24 cohesion exception in the file's own header comment, citing the 174-02 `client.ts` precedent for the same kind of exception.
- **parsePayloadApiError and authorizedUploadXhr relocated to client.ts**, not named in this plan's `<interfaces>` block, because tracing their real call graphs showed both are needed by functions moving in this plan (anime-core.ts, anime-release-assets.ts) AND by functions staying in api.ts — the same "trace the real graph, not the plan's abbreviated excerpt" discipline 174-02 established for `authorizedFetch`'s closure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `parsePayloadApiError` and the `authorizedUploadXhr` XHR-upload chain needed relocation to `client.ts`, not named in the plan's interfaces**
- **Found during:** Task 1 (extracting `admin/anime-core.ts` and `admin/anime-release-assets.ts`)
- **Issue:** `createAdminAnime`'s conflict-aware error builder (`buildCreateAnimeConflictAwareApiError`) and `loadAdminAnimeEditAniSearchEnrichment` both call `parsePayloadApiError`, a function the plan's interfaces didn't mention. Tracing its full call-site list showed it is also called twice inside the still-resident `authorizedUploadXhr` (used by `uploadAdminReleaseThemeAsset*`, which IS moving, but also by 6 functions that stay in `api.ts`). Leaving `parsePayloadApiError`/`authorizedUploadXhr` in `api.ts` and importing them into `admin/anime-core.ts`/`admin/anime-release-assets.ts` would create the exact `api.ts` → `admin/*` → `api.ts` cycle D-11 forbids (since the barrel in `api.ts` re-exports `admin/*`). Duplicating them in two places would violate D-09.
- **Fix:** Moved `parsePayloadApiError` (exported) and the `authorizedUploadXhr`/`sendAuthorizedUploadXhrOnce`/`parseUploadXhrPayload` chain (only `authorizedUploadXhr` exported) into `client.ts`, verified their own dependencies (`ApiError`, `ensureFreshRuntimeSession`, `resolveAuthToken`, `isAuthRelatedError`, `getRuntimeRefreshToken`, `refreshRuntimeSession`) were all already present in `client.ts` from 174-02, then updated `api.ts`'s import list to pull both back in from `./api/client` for its own still-resident callers.
- **Files modified:** `frontend/src/lib/api/client.ts`, `frontend/src/lib/api.ts`
- **Verification:** `tsc --noEmit` clean (baseline-only errors); `eslint` 0 errors/warnings on all touched files; full `vitest run` matches 174-02 baseline exactly.
- **Committed in:** `c6c80a8e`

**2. [Rule 1 - Cleanup] Removed orphaned JSDoc comments and 6 `@/types/*` import blocks' worth of unused imports left behind by the mechanical removal**
- **Found during:** Task 3 (full-suite/eslint regression run)
- **Issue:** Removing a function's body left its preceding JSDoc/doc-comment block dangling (e.g. a comment documenting `getAdminUserContributions`'s date-range handling, with the function itself now in `admin/users.ts`). Separately, `eslint`'s `@typescript-eslint/no-unused-vars` flagged ~50 now-dead type imports across the `@/types/admin`, `@/types/fansub`, `@/types/admin-users`, `@/types/episodeClassification`, `@/types/episodeImport`, `@/types/profile`, and `@/types/admin-capability` import blocks, plus 3 dead `client.ts` re-imports (`ensureFreshRuntimeSession`, `isAuthRelatedError`, the now-reinstated-but-differently-used `parsePayloadApiError`).
- **Fix:** Extended the function-removal tool to also absorb an immediately-preceding `/** ... */` or `//`-run comment block when removing a function (verified safe: each such comment documents exactly the one function directly below it, confirmed by reading every removed comment's content). Collapsed the resulting blank-line runs (verified via a baseline check that pre-existing `api.ts` has zero 2+-blank-line runs, so every run found was a genuine removal artifact, not pre-existing style). Removed each now-unused type import individually after confirming (via `grep -c`) it had exactly 1 remaining occurrence (the import line itself).
- **Files modified:** `frontend/src/lib/api.ts`
- **Verification:** `eslint src/lib/api.ts src/lib/api/admin/*.ts src/lib/api/client.ts` → 0 errors, 0 warnings. Full suite re-run matches baseline.
- **Committed in:** `c6c80a8e`

---

**Total deviations:** 2 auto-fixed (1 blocking/cycle-avoidance, 1 cleanup)
**Impact on plan:** Both were necessary consequences of tracing the real dependency graph rather than the plan's abbreviated interface excerpt (same pattern 174-02 established) and of doing a mechanical, verifiably-complete extraction. No scope creep, no behavior change — both deviations are pure code-location/import-hygiene changes with zero runtime effect, confirmed by the full regression suite matching baseline exactly.

## Known Stubs

None — this plan relocates existing, working code; no new UI surfaces or data sources were introduced.

## Threat Flags

None — T-174-02-01 (the only threat this plan's `<threat_model>` names) is exactly what the verbatim-relocation discipline (byte-for-byte diffed extraction tool, zero renamed/merged functions) and the full-suite-baseline-match verification close. No new network endpoints, auth paths, or trust-boundary-crossing surface were introduced — this is a pure file-layout change.

## Self-Check: PASSED

- `frontend/src/lib/api/admin/anime-core.ts` — FOUND
- `frontend/src/lib/api/admin/anime-jellyfin.ts` — FOUND
- `frontend/src/lib/api/admin/anime-relations.ts` — FOUND
- `frontend/src/lib/api/admin/anime-themes.ts` — FOUND
- `frontend/src/lib/api/admin/anime-taxonomy.ts` — FOUND
- `frontend/src/lib/api/admin/anime-release-assets.ts` — FOUND
- `frontend/src/lib/api/admin/segments.ts` — FOUND
- `frontend/src/lib/api/admin/episodes.ts` — FOUND
- `frontend/src/lib/api/admin/users.ts` — FOUND
- `frontend/src/lib/api/admin/fansub-members.ts` — FOUND
- Commit `c6c80a8e` — FOUND (`git log --oneline --all | grep c6c80a8e`)

## Next Phase Readiness

- Welle 2 (`frontend/src/lib/api.ts` modularization) has now relocated the shared client infrastructure (174-02) and all 5 admin-surface buckets (174-03, ~96 functions). `api.ts` is down to 7,253 lines from the original ~11,508.
- Remaining Welle-2 plans (174-04 through 174-08, per the dependency graph) can continue extracting the non-admin domain buckets (anime/episodes/fansubs/members/contributions/media/releases/reviews/permissions/projects/history per D-08's target shape) using the same brace-aware extraction discipline and the same "trace the real graph before moving" rule this plan and 174-02 both needed.
- No blockers. Full regression baseline (6 tsc errors, 4 failed test files/6 failed tests, 357/3192 passing) is unchanged and documented for the next plan to compare against.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

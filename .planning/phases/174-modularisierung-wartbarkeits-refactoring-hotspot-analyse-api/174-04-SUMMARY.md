---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 04
subsystem: api
tags: [refactoring, api-client, fansubs, episodes, members, projects, contributions, vitest-guard-tests, barrel-module]

# Dependency graph
requires:
  - phase: 174-03
    provides: "frontend/src/lib/api/client.ts shared infra, the locked barrel-path decision (api.ts stays the permanent barrel, re-exporting every domain module via `export * from`), and the admin/* sub-split precedent this plan's D-24 fansubs/contributions splits follow"
provides:
  - "frontend/src/lib/api/fansubs-core.ts, fansubs-aliases.ts, fansubs-members.ts, fansubs-groups.ts: the 39-function 'fansubs/groups' bucket, D-24 sub-split by sub-concern (core anime+fansub reads / alias+link CRUD / member CRUD / group CRUD+merge+projections+anime-fansub-link), each well under 450 lines"
  - "frontend/src/lib/api/episodes.ts (9 functions): public episode/episode-version reads and admin episode-version CRUD"
  - "frontend/src/lib/api/members.ts (13 functions): own-profile, public-member, member-claim, and default-crew functions"
  - "frontend/src/lib/api/projects.ts (7 functions): own-dashboard, me-project-detail, and project-member summary/notes/media + fansub-project-timeline functions"
  - "frontend/src/lib/api/contributions-admin.ts, contributions-me.ts: the 21-function 'contributions/suggestions/proposals' bucket, D-24 sub-split by sub-concern (admin-side CRUD+proposal review / me-side mutations+suggestions+public reads)"
  - "A reusable Python brace-aware TS function extractor (context-stack scanner distinguishing code/template-literal/string/comment states, plus paren-depth/angle-depth tracking to correctly skip type-literal and default-value braces in function signatures before locating the real body-opening brace) used to verbatim-relocate all 89 functions with zero manual-copy risk"
affects: [174-05, 174-06, 174-07, 174-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-24 sub-split within one domain bucket (continuing 174-03's precedent): when a RESEARCH.md-named bucket would exceed 450 lines in one file, split by sub-concern and re-export all sub-files from the barrel. Applied here to both fansubs/groups (39 fns -> 4 files) and contributions/suggestions/proposals (21 fns -> 2 files), neither of which the plan's own text named explicit sub-split filenames for beyond an example hint ('e.g. fansubs-aliases.ts, fansubs-merge.ts') -- sub-split boundaries and names were Claude's discretion, grouped by the natural sub-concern each function's URL path and purpose already implied"
    - "Cross-bucket same-wave dependency resolved via direct sibling import, not barrel self-import: searchAnimeForProposal (contributions-me.ts) calls getAnimeList (fansubs-core.ts) via `import { getAnimeList } from './fansubs-core'` -- both are domain modules living under frontend/src/lib/api/, so a direct sibling import avoids importing from the barrel (api.ts) itself, which would be circular since api.ts re-exports both"
    - "Function-signature body-brace detection via paren-depth/angle-depth tracking: the naive 'first brace in code-state' heuristic breaks on real TS signatures with inline type-literal defaults (e.g. `options: { include_disabled?: boolean } = {}` or `Promise<{ data: AnimeDetail }>`) -- the extractor now only treats a '{' as the function body opener when paren_depth==0 AND angle_depth==0, correctly skipping nested type-literal/default-value braces encountered while still inside the parameter list or generic return type"
    - "Vitest guard tests coupled to a function's physical file location need updating when that function relocates: api.auth-refresh.test.ts's exportedFunctionSource() read only api.ts's raw source text to verify 5 function signatures (getMemberProfile, getMemberProjects, getProjectMemberSummary, getProjectMemberNotes, getProjectMemberMedia) still used the central no-store fetch seam; api.no-token-boundary.test.ts's centralClientAllowlist file-path allowlist gated which files may use raw `fetch(` instead of the central client. Both needed updates (search across the new module files; add the new files containing pre-existing raw-fetch public reads to the allowlist) -- mirrors the exact pattern 174-02 already established for client.ts's own relocation"

key-files:
  created:
    - frontend/src/lib/api/fansubs-core.ts
    - frontend/src/lib/api/fansubs-aliases.ts
    - frontend/src/lib/api/fansubs-members.ts
    - frontend/src/lib/api/fansubs-groups.ts
    - frontend/src/lib/api/episodes.ts
    - frontend/src/lib/api/members.ts
    - frontend/src/lib/api/projects.ts
    - frontend/src/lib/api/contributions-admin.ts
    - frontend/src/lib/api/contributions-me.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/lib/api.no-token-boundary.test.ts

key-decisions:
  - "fansubs/groups (39 functions, would be ~1,230 lines in one file) sub-split into 4 files by sub-concern: fansubs-core.ts (core anime+fansub reads: anime list/detail/backdrops/relations, fansub list/detail/slug/public-profile/project-resolution, ~348 lines), fansubs-aliases.ts (alias+external-link CRUD, ~261 lines), fansubs-members.ts (fansub member CRUD + unified/hist group-member listing + generic group-member CRUD, ~286 lines), fansubs-groups.ts (group CRUD, merge, group detail/releases/assets/themes projections, anime<->fansub attach/detach, ~372 lines) -- all comfortably under the 450-line CLAUDE.md limit"
  - "contributions/suggestions/proposals (21 functions, would be ~610 lines in one file) sub-split into 2 files: contributions-admin.ts (admin-side CRUD + proposal review: getGroupContributors, getAnimeCoverage, listAnimeContributions, upsertAnimeContribution, deleteAnimeContribution, listEffectiveContributionsForVersion, listGroupProposals, confirmProposal, rejectProposal, ~295 lines) and contributions-me.ts (member-authored mutations, suggestions, proposal creation, and public anime/fansub contribution reads, ~334 lines)"
  - "episodes.ts (9 fns, ~258 lines), members.ts (13 fns, ~403 lines), projects.ts (7 fns, ~197 lines) stayed as single files since none approached the 450-line limit"
  - "searchAnimeForProposal (contributions-me.ts) imports getAnimeList directly from './fansubs-core' rather than from the api.ts barrel, since importing from the barrel inside a module the barrel itself re-exports would be a self-import cycle (D-11)"

requirements-completed: [D-08, D-09, D-11, D-12, D-19, D-22]

# Metrics
duration: ~100min
completed: 2026-10-05
---

# Phase 174 Plan 04: Fansubs, Episodes, Members, Projects, Contributions API Modules Summary

**Relocated all 5 core-domain buckets (89 functions, re-verified live counts: 39 fansubs/groups split into 4 D-24 sub-concern files, 9 episodes, 13 members, 7 projects, 21 contributions split into 2 D-24 sub-concern files) verbatim out of the `api.ts` monolith into `frontend/src/lib/api/`, using a brace-aware extraction tool with paren/angle-depth tracking to correctly handle real TS signatures with inline type-literal defaults, and fixed 2 vitest guard tests whose self-inspection logic was coupled to the physical pre-split file location.**

## Performance

- **Duration:** ~100 min
- **Completed:** 2026-10-05
- **Tasks:** 3 (all `type="auto"`)
- **Files modified:** 12 (3 modified, 9 created)

## Accomplishments

- Re-verified all 5 bucket function-name lists against the live `frontend/src/lib/api.ts` by grep-locating every one of the 89 named functions before moving anything — confirmed all names and locations matched the plan's locked interface list exactly (0 surprises, same discipline 174-03 established).
- Extended the 174-03 Python brace-aware TS function extractor with paren-depth/angle-depth tracking: the original "first brace in code-state" heuristic incorrectly treated inline type-literal braces in function signatures (e.g. `getAnimeByID(id: number, options: { include_disabled?: boolean } = {}): Promise<{ data: AnimeDetail }> {`) as the function body opener, truncating extraction after just the first type annotation. Fixed by only accepting a `{` as the body opener when both paren_depth and angle_depth are 0 at that point — verified against every suspect signature found via a dedicated pre-scan (`grep` for `=\s*\{|:\s*\{` in each target function's signature block) before trusting any extraction.
- Moved the 39-function "fansubs/groups" bucket into 4 D-24 sub-concern files (none exceed 450 lines): `fansubs-core.ts`, `fansubs-aliases.ts`, `fansubs-members.ts`, `fansubs-groups.ts`.
- Moved episodes (9), members (13), projects (7) into single files, and the 21-function "contributions/suggestions/proposals" bucket into 2 D-24 sub-concern files (`contributions-admin.ts`, `contributions-me.ts`).
- Traced and relocated 5 function-local helper blocks that travel with their sole caller: `buildQuery`+`AnimeListRequestOptions` (getAnimeList), `buildFansubListQuery`+`FansubListParams` (getFansubList), `buildGroupReleasesQuery` (getGroupReleases), `ProjectMemberListOpts`+`buildProjectMemberListURL` (getProjectMemberSummary/Notes/Media), `RawAnimeFansubProjectTimeline`+`mapAnimeFansubProjectTimeline` (getAnimeFansubProjectTimeline/updateAnimeFansubProjectTimeline), and 2 function-local interfaces (`AnimeCoverage`+`AnimeCoverageListResponse` for getAnimeCoverage, `SubmitSuggestionBody` for submitSuggestion) — all confirmed single-caller via grep before moving.
- Discovered and resolved 1 cross-bucket same-wave dependency not named in the plan's interfaces: `searchAnimeForProposal` (moving to contributions-me.ts) calls `getAnimeList` (moving to fansubs-core.ts) — wired as a direct sibling import (`./fansubs-core`) rather than through the barrel, avoiding a self-import cycle.
- Wired the barrel: `frontend/src/lib/api.ts` now has 20 `export * from "./api/..."` lines total (9 new this plan, on top of 174-02/03's 11).
- Cleaned up ~15 now-fully-unused `@/types/*` import identifiers in `api.ts` (verified via eslint `no-unused-vars` + `grep -c` single-occurrence check before removing each) and fixed one cross-bucket call site remaining in `api.ts` (`getFansubs()` calling the now-relocated `getFansubList()`) by adding a direct import from `./api/fansubs-core`.
- Found and fixed 2 genuine regressions during the full-suite gate (both guard tests whose logic read raw source files at hardcoded paths): `api.auth-refresh.test.ts`'s `exportedFunctionSource()` now searches `api.ts` + `api/members.ts` + `api/projects.ts`; `api.no-token-boundary.test.ts`'s `centralClientAllowlist` now includes `fansubs-core.ts`, `fansubs-groups.ts`, `contributions-me.ts` (the 3 new files that use pre-existing raw `fetch(` for public, no-auth, server-cacheable reads, exactly the same pattern 174-02 already established for `client.ts`'s own relocation).
- `api.ts` shrank from 7,253 to 4,634 lines (-2,619, continuing the 174-02/03 trend toward zero).
- Full regression suite matches the 174-01 documented baseline **exactly**: `npx tsc --noEmit` — same 6 pre-existing errors (unrelated `ReleaseDetailHero.test.tsx`/`page.ts` type issues), 0 new. `npx eslint` on every touched file — 0 errors, 0 warnings. `npx vitest run` — 4 failed test files / 6 failed tests (all pre-existing, documented in `174-HOTSPOTS.md`: `cssCustomProperties.guard.test.ts` dead-CSS-var, `PublicReleaseSurfacesShowcase.test.tsx` missing accessible link, 2x `EpisodeImportEpisodeGroup.test.tsx` DOM-structure mismatches, 1x `ProjectMemberPage` stale-label expectation), 357 passed files / 3192 passed tests (identical counts to the documented baseline). One additional transient failure (`ReleaseVersionNotesTab.test.tsx`) observed once under full-suite CPU contention, confirmed flaky by re-running in isolation (passed cleanly) — not a regression, matches the exact flake class `174-HOTSPOTS.md` already documents for full-suite contention.

## Task Commits

All 3 tasks land in a single commit, for the same reason 174-02/174-03 did: the fansubs/episodes extraction (Task 1), members/projects extraction (Task 2), and contributions extraction + barrel wiring + full gate (Task 3) each left `api.ts` in a transiently-broken state until the corresponding barrel exports and cross-references were wired — Task 1 alone would leave every caller of `@/lib/api`'s fansub/episode functions unresolved until the barrel is updated, which this plan's own text defers to Task 3. Additionally, the D-24 sub-split of fansubs.ts and contributions.ts (discovered necessary only after writing the full single-file versions and measuring line counts) spans content from all of Tasks 1-3. An intermediate per-task commit would have captured a build-broken `api.ts`:

1. **Tasks 1-3: fansubs/episodes/members/projects/contributions extraction + D-24 sub-split + barrel wiring + guard-test fixes + full gate** - `ee2aadea` (refactor)

**Plan metadata commit:** pending (this SUMMARY + STATE.md + ROADMAP.md)

## Files Created/Modified

- `frontend/src/lib/api/fansubs-core.ts` - New (~348 lines). Core anime+fansub reads: `getAnimeList`, `getAnimeByID`, `getAnimeBackdrops`, `getAnimeRelations`, `getFansubList`, `getFansubByID`, `getFansubBySlug`, `getPublicFansubProfileBySlug`, `resolveFansubProject`, plus `buildQuery`/`buildFansubListQuery`/`FansubListParams`/`AnimeListRequestOptions` helpers.
- `frontend/src/lib/api/fansubs-aliases.ts` - New (~261 lines). 8 functions: fansub alias CRUD + reassignment, external-link CRUD.
- `frontend/src/lib/api/fansubs-members.ts` - New (~286 lines). 9 functions: fansub member CRUD, unified/hist group-member listing, generic group-member CRUD.
- `frontend/src/lib/api/fansubs-groups.ts` - New (~372 lines). 13 functions: fansub group CRUD, merge preview/execute, group detail/releases/release-count/assets/themes projections, anime<->fansub attach/detach/list.
- `frontend/src/lib/api/episodes.ts` - New (~258 lines). 9 functions: public episode/episode-version reads (`getEpisodeByID`, `getGroupedEpisodes` with its 2-overload signature, `getEpisodeVersionByID`, `getEpisodeVersionEditorContext`) and admin episode-version CRUD (`scanEpisodeVersionFolder`, `createEpisodeVersion`, `updateEpisodeVersion`, `deleteEpisodeVersion`, `syncEpisode`).
- `frontend/src/lib/api/members.ts` - New (~403 lines). 13 functions: own-profile, public-member-profile/viewer/projects, member-claim/request, and default-crew functions.
- `frontend/src/lib/api/projects.ts` - New (~197 lines). 7 functions: own-dashboard, me-project-detail, project-member summary/notes/media, fansub-project-timeline read/update.
- `frontend/src/lib/api/contributions-admin.ts` - New (~295 lines). 9 functions: admin-side anime-contribution CRUD, anime-coverage aggregate, effective-contributions-for-version, group proposal listing/confirm/reject.
- `frontend/src/lib/api/contributions-me.ts` - New (~334 lines). 12 functions: member-authored contribution mutations (confirm/reject/self-publish/visibility), suggestion submission + listing, proposal search/creation, and public fansub/anime contribution reads.
- `frontend/src/lib/api.ts` - Modified. Removed all 89 relocated functions, their 5 co-located helper blocks, 2 function-local interfaces, and ~15 now-unused `@/types/*` import identifiers. Added 9 barrel `export * from "./api/..."` lines (20 total) and a direct `getFansubList` import for `getFansubs()`'s remaining call site.
- `frontend/src/lib/api.auth-refresh.test.ts` - Modified. `exportedFunctionSource()` now reads `api.ts` + `api/members.ts` + `api/projects.ts` (the 3 files where the 5 checked functions now live) instead of only `api.ts`.
- `frontend/src/lib/api.no-token-boundary.test.ts` - Modified. `centralClientAllowlist` extended with `fansubs-core.ts`, `fansubs-groups.ts`, `contributions-me.ts` — the files now containing pre-existing public no-auth `fetch(` calls that previously lived inline in the allowlisted `api.ts`.

## Decisions Made

- **D-24 sub-split naming and boundaries** (Claude's discretion per 174-CONTEXT.md, following 174-03's precedent): fansubs/groups grouped into core/aliases/members/groups by the natural sub-concern each function's URL path and purpose already implied; contributions/suggestions/proposals grouped into admin/me by actor (admin-authored CRUD+review vs. member-authored mutations+public reads). Neither split matches the plan's own illustrative example names (`fansubs-aliases.ts`, `fansubs-merge.ts`) exactly, but follows the same spirit — the full 39/21-function buckets needed 4/2 groups respectively to stay under 450 lines each, discovered only after writing the full single-file version first and measuring (1231 and 611 lines respectively).
- **searchAnimeForProposal imports getAnimeList directly from `./fansubs-core`**, not through the `@/lib/api` barrel, because both modules are re-exported by the same barrel (`api.ts`) — importing from the barrel inside a module the barrel re-exports would create exactly the self-import cycle D-11 forbids. This mirrors 174-02/03's established discipline of tracing the real dependency graph rather than assuming every cross-function call can go through the public barrel path.
- **Guard-test fixes treated as Rule 1 (auto-fix bug), not deferred**: both `api.auth-refresh.test.ts` and `api.no-token-boundary.test.ts` encode real architectural invariants (central no-store fetch seam, central-client fetch-authority boundary) that still hold true after this relocation — only their *file-path-coupled implementation* needed updating, not the invariant itself. This is the identical pattern 174-02 already established for `client.ts`'s relocation, applied consistently here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] fansubs.ts and contributions.ts both exceeded the 450-line CLAUDE.md modularity limit as single files, requiring D-24 sub-split**
- **Found during:** Task 3 (final line-count check before the full gate)
- **Issue:** The plan's own text anticipated this risk for fansubs.ts ("If `fansubs.ts` exceeds ~450 lines, sub-split... — D-24") but did not name it for contributions.ts. Both landed well over budget as single files: fansubs.ts at 1,231 lines, contributions.ts at 611 lines.
- **Fix:** Split fansubs.ts into `fansubs-core.ts`/`fansubs-aliases.ts`/`fansubs-members.ts`/`fansubs-groups.ts` (348/261/286/372 lines) and contributions.ts into `contributions-admin.ts`/`contributions-me.ts` (295/334 lines), all under 450. Updated the barrel and the 2 guard-test allowlists/searches to reference the actual sub-split filenames rather than the originally-planned single-file names.
- **Files modified:** All 6 new sub-split files (superseding the originally-written `fansubs.ts`/`contributions.ts`), `frontend/src/lib/api.ts`, both guard test files.
- **Verification:** `tsc --noEmit` clean (baseline-only errors); `eslint` 0 errors/warnings; full `vitest run` matches baseline exactly; `wc -l` confirms all 9 new files ≤ 403 lines.
- **Committed in:** `ee2aadea`

**2. [Rule 1 - Bug] Two vitest guard tests broke because their self-inspection logic hardcoded the pre-split file location**
- **Found during:** Task 3 (full-suite regression run)
- **Issue:** `api.auth-refresh.test.ts`'s `exportedFunctionSource()` read only `api.ts`'s raw text to locate 5 function signatures and assert they still used the central no-store fetch seam — failed with `getMemberProfile must remain exported from api.ts: expected -1 to be greater than or equal to 0` once that function moved to `members.ts`. `api.no-token-boundary.test.ts`'s `centralClientAllowlist` is a hardcoded file-path allowlist gating which files may use raw `fetch(` instead of the central client — failed on `src/lib/api/contributions.ts:565` (pre-existing `getFansubContributions`/`getAnimeContributions` raw-fetch calls, now physically relocated) since the new file wasn't in the allowlist.
- **Fix:** Extended `exportedFunctionSource()` to concatenate and search `api.ts` + `api/members.ts` + `api/projects.ts`. Added `fansubs-core.ts`, `fansubs-groups.ts`, `contributions-me.ts` to `centralClientAllowlist` with an explanatory comment matching the style of 174-02's existing `client.ts` entry.
- **Files modified:** `frontend/src/lib/api.auth-refresh.test.ts`, `frontend/src/lib/api.no-token-boundary.test.ts`
- **Verification:** Both files re-run in isolation (41/41 tests pass); full suite re-run confirms no regression, matches 174-01 baseline exactly.
- **Committed in:** `ee2aadea`

**3. [Rule 3 - Blocking issue] `getFansubs()`'s remaining call to the now-relocated `getFansubList()` needed an explicit import**
- **Found during:** Task 3 (tsc check after wiring the barrel)
- **Issue:** `getFansubs()` (not itself in this plan's named bucket, stays in `api.ts`) calls `getFansubList()`, which moved to `fansubs-core.ts`. `tsc` reported `Cannot find name 'getFansubList'`.
- **Fix:** Added `import { getFansubList } from "./api/fansubs-core";` to `api.ts`.
- **Files modified:** `frontend/src/lib/api.ts`
- **Verification:** `tsc --noEmit` clean (baseline-only errors).
- **Committed in:** `ee2aadea`

---

**Total deviations:** 3 auto-fixed (1 missing-critical/modularity, 1 bug/test-coupling, 1 blocking/import)
**Impact on plan:** All three were necessary consequences of enforcing the plan's own named constraints (D-24 line budget, D-10 unchanged import paths) once the real file sizes and real dependency graph were measured/traced, exactly matching 174-02/03's established discipline. No scope creep, no behavior change — all three are pure code-location/test-infrastructure fixes with zero runtime effect on production behavior, confirmed by the full regression suite matching baseline exactly.

## Known Stubs

None — this plan relocates existing, working code; no new UI surfaces or data sources were introduced.

## Threat Flags

None — T-174-02-01 (the only threat this plan's `<threat_model>` names) is exactly what the verbatim-relocation discipline (brace-aware extraction tool, zero renamed/merged functions, combined-export-name collision check across all 9 new files before committing) and the full-suite-baseline-match verification close. No new network endpoints, auth paths, or trust-boundary-crossing surface were introduced — this is a pure file-layout change.

## Issues Encountered

None beyond the 3 documented deviations above — all resolved within this plan's execution.

## Self-Check: PASSED

- `frontend/src/lib/api/fansubs-core.ts` — FOUND
- `frontend/src/lib/api/fansubs-aliases.ts` — FOUND
- `frontend/src/lib/api/fansubs-members.ts` — FOUND
- `frontend/src/lib/api/fansubs-groups.ts` — FOUND
- `frontend/src/lib/api/episodes.ts` — FOUND
- `frontend/src/lib/api/members.ts` — FOUND
- `frontend/src/lib/api/projects.ts` — FOUND
- `frontend/src/lib/api/contributions-admin.ts` — FOUND
- `frontend/src/lib/api/contributions-me.ts` — FOUND
- Commit `ee2aadea` — FOUND in `git log`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The barrel (`api.ts`) now re-exports 20 domain modules; remaining monolith content (4,634 lines) is the target of subsequent 174-05..174-08 waves per `174-HOTSPOTS.md`'s bucket table.
- The D-24 sub-split pattern (grouping by sub-concern, re-exporting all sub-files from the barrel) is now proven across 2 different bucket shapes (admin anime in 174-03, fansubs/groups and contributions in this plan) — later waves facing an oversized bucket should follow the same discipline: write the full single-file version first, measure, then split only if over budget.
- No blockers for 174-05 onward.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 07
subsystem: api
tags: [typescript, nextjs, api-client, module-boundaries]

# Dependency graph
requires:
  - phase: 174-06
    provides: media/asset bucket triage and the established D-24 sub-split precedent (fansubs-core.ts, releases.ts, admin/* files)
provides:
  - Final triage of api.ts's 27-name "other/unclear" bucket (grep-evidence-backed, not name-pattern guessing)
  - frontend/src/lib/api.ts reduced to pure barrel re-exports (zero remaining domain-function definitions)
  - Two new cohesive small modules (watchlist.ts, comments.ts) and one new self-service split (members-me.ts)
affects: [any future phase touching frontend/src/lib/api.ts or frontend/src/lib/api/*]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grep-evidence-backed function placement: grep -rl per function name across src/app and src/components, read at least one real call site, classify by actual consumer domain, not by name heuristic"
    - "When zero production consumers exist, classify by endpoint-domain reasoning and document the absence of evidence explicitly rather than silently guessing"
    - "D-24 450-line budget enforced by splitting an existing domain file into a sibling self-service file (members.ts -> members-me.ts) when appending would exceed the limit, instead of invoking a cohesion exception"

key-files:
  created:
    - frontend/src/lib/api/watchlist.ts
    - frontend/src/lib/api/comments.ts
    - frontend/src/lib/api/members-me.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/members.ts
    - frontend/src/lib/api/fansubs-core.ts
    - frontend/src/lib/api/fansubs-members.ts
    - frontend/src/lib/api/contributions-admin.ts
    - frontend/src/lib/api/releases.ts
    - frontend/src/lib/api/admin/users.ts
    - frontend/src/lib/api.no-token-boundary.test.ts
    - frontend/src/types/__tests__/v12-projection-contract.test.ts

key-decisions:
  - "Watchlist CRUD cluster (4 functions, confirmed via components/watchlist/* consumers) got its own new watchlist.ts rather than being forced into an existing file"
  - "createAnimeComment has zero production consumers (grep -rl returns nothing under src/app or src/components); placed in a new comments.ts by endpoint-domain reasoning and flagged as a known-unused function rather than silently dropped or force-fit into an unrelated file"
  - "Self-service '/me' member functions split into a new members-me.ts instead of appending to members.ts, because appending would have pushed members.ts well past the project's 450-line budget"
  - "listClaims/listChanges placed in admin/users.ts (not a new file) because they share the exact same @/types/admin-users type module and /api/v1/admin/* trust boundary as every other function already there"

requirements-completed: [D-08, D-09, D-11, D-12, D-19, D-22]

# Metrics
duration: 85min
completed: 2026-10-05
---

# Phase 174 Plan 07: Final api.ts unclear-bucket triage Summary

**Resolved all 27 "other/unclear" function names from RESEARCH.md via per-function grep import-site evidence, leaving `frontend/src/lib/api.ts` as a pure barrel file with zero remaining domain-function definitions.**

## Performance

- **Duration:** ~85 min
- **Completed:** 2026-10-05
- **Tasks:** 2 (Task 1 read-only triage, Task 2 execute + commit)
- **Files modified:** 12 (3 created, 9 modified)

## Accomplishments

- Every one of the 27 names in RESEARCH.md's "other/unclear" bucket now has an evidence-backed destination (grep call-site evidence, not name-pattern guessing)
- `frontend/src/lib/api.ts` contains only 34 `export * from "./api/..."` barrel lines — confirmed via `grep -E "^export" | grep -vcE "^export (\*|type \*) from"` returning 0
- Two genuinely new cohesive modules created (`watchlist.ts`, `comments.ts`) plus one new self-service split (`members-me.ts`) to respect the 450-line budget
- Full `tsc --noEmit` + `eslint .` + `vitest run` gate green relative to the pre-existing baseline (2 real regressions found and fixed; 4 confirmed pre-existing failures in unrelated files left untouched)

## Task 1: Import-site grep classification table

Ran `grep -rl "$fn" frontend/src/app frontend/src/components | grep -v '\.test\.'` for each of the 24 names remaining after excluding the 3 already-relocated shared-infra functions (`apiClientFetch`/`parseApiErrorPayload`/`resolveApiUrl`, confirmed still only in `client.ts`). Discovered during triage that 2 more of the 24 (`buildCreateAnimeConflictAwareApiError`, `getCurrentUser`) had *also* already been physically relocated to `admin/anime-core.ts`/`auth.ts` in an earlier plan (174-03) — `api.ts` itself never actually contained them at the start of this plan, confirmed via `grep -n` returning no matches. Net: 22 functions genuinely triaged in this plan.

| Function | Grep evidence (consumers) | Destination | Reasoning |
|---|---|---|---|
| `activateClaimedMember` | `ClaimDecisionImpactPanel.tsx`, `useGroupMembersClaimActions.ts` | `fansubs-members.ts` | Member-claim activation, same `/api/v1/admin/fansubs/:id/...` member-scoped domain as the rest of the file |
| `addWatchlistEntry` | `components/watchlist/WatchlistAddButton.tsx` | **new** `watchlist.ts` | Part of the 4-function watchlist CRUD cluster |
| `buildCreateAnimeConflictAwareApiError` | none (already relocated) | `admin/anime-core.ts` (174-03, no action) | Skip — already resolved |
| `createAnimeComment` | **none found** (only `api.auth-refresh.test.ts`, which imports many cross-domain functions purely to prove shared auth-refresh behavior) | **new** `comments.ts` | Zero production consumers; placed by endpoint-domain reasoning (`POST /api/v1/anime/:id/comments`), flagged as known-unused rather than force-fit |
| `getCurrentUser` | none (already relocated) | `auth.ts` (174-03, no action) | Skip — already resolved |
| `getFansubAnimeReleaseVersions` | **none found in app/components**; own docstring explicitly says "Leader-Contribution-Formular (Phase 67-04)" | `contributions-admin.ts` | Matches the file's existing `AnimeContributionListResponse`/leader-contribution-review scope exactly |
| `getFansubGroupDomainProjection` | `app/fansubs/[slug]/page.tsx` | `fansubs-core.ts` | Public fansub-group read, same boundary as `getFansubList`/`getFansubByID` |
| `getFansubs` | `admin/anime/[id]/episodes/page.tsx`, `archiv/page.tsx` | `fansubs-core.ts` | Thin public alias of `getFansubList`, which already lives there |
| `getGroupReleaseDetail` | `projectPageData.ts`, `LatestReleaseSection.tsx`, `releaseDetailPageData.tsx` | `releases.ts` | Public group-release read, release-domain |
| `getGroupReleaseImages` | `ReleaseGallery.tsx` | `releases.ts` | Public release-image read, release-domain |
| `getGroupReleaseListCursor` | `OlderReleasesList.helpers.ts`/`.tsx`, `projectPageData.ts` | `releases.ts` | Public release-list cursor read, release-domain |
| `getMemberPointRanking` | `members/ranking/page.tsx` | `members.ts` | Public member-domain read; file had budget headroom (403 -> 441 lines) |
| `getMyBadges` | `me/profile/page.tsx`, `DashboardMetrics.tsx` | **new** `members-me.ts` | Self-service "/me" member endpoint; split out to respect 450-line budget |
| `getMyMemberships` | `me/contributions/page.tsx` | **new** `members-me.ts` | Self-service "/me" member endpoint |
| `getReleasePlaybackAccess` | `ReleaseEpisodePlayer.tsx` | `releases.ts` | Public release-playback read, release-domain |
| `getWatchlist` | `watchlist/page.tsx`, `WatchlistAddButton.tsx` | **new** `watchlist.ts` | Watchlist CRUD cluster |
| `getWatchlistEntry` | `WatchlistAddButton.tsx` | **new** `watchlist.ts` | Watchlist CRUD cluster |
| `listChanges` | `admin/changes/ChangesClient.tsx`, `AdminGroupsClient.tsx`, `GroupChangesTab.tsx` | `admin/users.ts` | Shares `@/types/admin-users` and the `/api/v1/admin/*` platform-admin boundary with every other function already in this file |
| `listClaims` | `AdminGroupsClient.tsx`, `ClaimsClient.tsx` | `admin/users.ts` | Same `@/types/admin-users` / platform-admin boundary |
| `listMemberGroupStories` | **none in app/components** (only `api.fansubNotes.test.ts`) | `fansubs-members.ts` | Endpoint `/api/v1/admin/fansubs/:id/member-stories` is squarely fansub-member domain; needed `mapMemberGroupStory`/`RawMemberGroupStory` cross-import from `history.ts` (no circular dependency — `history.ts` only imports from `client.ts`) |
| `patchMyBadgeVisibility` | `me/profile/page.tsx` | **new** `members-me.ts` | Self-service "/me" member endpoint |
| `patchNoindex` | `me/profile/page.tsx` | **new** `members-me.ts` | Self-service "/me" member endpoint |
| `removeWatchlistEntry` | `WatchlistAddButton.tsx`, `WatchlistList.tsx` | **new** `watchlist.ts` | Watchlist CRUD cluster |
| `submitMemberCorrection` | `CorrectionReportModal.tsx` | **new** `members-me.ts` | Self-service "/me" member endpoint |

## Task Commits

1. **Task 1: Import-site grep classification** — no file changes (read-only triage); classification table above and inline source comments in each destination file serve as the record
2. **Task 2: Execute triage, wire barrel, run full gate** — `9122f1ed` (refactor)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `frontend/src/lib/api/watchlist.ts` (new, 127 lines) — watchlist CRUD cluster
- `frontend/src/lib/api/comments.ts` (new, 63 lines) — `createAnimeComment`, documented as production-unused
- `frontend/src/lib/api/members-me.ts` (new, 182 lines) — self-service "/me" badges/memberships/noindex/correction
- `frontend/src/lib/api/members.ts` (441 lines, +38) — added `getMemberPointRanking`
- `frontend/src/lib/api/fansubs-core.ts` (385 lines, +37) — added `getFansubGroupDomainProjection`, `getFansubs`
- `frontend/src/lib/api/fansubs-members.ts` (348 lines, +61) — added `activateClaimedMember`, `listMemberGroupStories`
- `frontend/src/lib/api/contributions-admin.ts` (330 lines, +35) — added `getFansubAnimeReleaseVersions`
- `frontend/src/lib/api/releases.ts` (444 lines, +99) — added `getGroupReleaseDetail`, `getReleasePlaybackAccess`, `getGroupReleaseListCursor`, `getGroupReleaseImages`
- `frontend/src/lib/api/admin/users.ts` (391 lines, +64) — added `listClaims`, `listChanges`
- `frontend/src/lib/api.ts` (34 lines, was 707) — reduced to pure barrel re-exports
- `frontend/src/lib/api.no-token-boundary.test.ts` — added `members.ts`/`releases.ts` to the central-client fetch allowlist (governance test tracking physical relocation)
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` — added `fansubs-core.ts` to the concatenated source the contract guard reads (governance test tracking physical relocation)

## Decisions Made

- Watchlist cluster (4 functions) warranted a dedicated new file per the plan's own interface hint and D-02 (legitimate new module, not artificial fragmentation)
- `createAnimeComment` has zero production consumers today; rather than silently dropping it or force-fitting it into an unrelated domain file, it was moved verbatim into a new `comments.ts` with an explicit source comment documenting the absence of evidence
- `members.ts` would have exceeded the 450-line budget if all 6 candidate member functions were appended (403 + ~186 = ~589 lines); split the self-service "/me" subset into `members-me.ts` instead of invoking a D-24 cohesion exception, since the split has a clean, cohesive boundary (self-service vs. public/admin member reads)
- `getGroupReleaseDetail`/`getGroupReleaseImages`/`getGroupReleaseListCursor`/`getReleasePlaybackAccess` joined `releases.ts` despite that file's header comment originally scoping it to "release-version-media/notes/crew" — the public-read vs. admin-write split already exists informally in other domain files (e.g. `fansubs-core.ts`, `members.ts`), and grep evidence confirms these are squarely release-domain reads, not a fit for any other file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated `api.no-token-boundary.test.ts`'s central-client fetch allowlist**
- **Found during:** Task 2 full-gate verification (`npx vitest run`)
- **Issue:** This governance test scans the real `frontend/src` tree for raw `fetch(` calls outside an explicit allowlist of files. Moving `getMemberPointRanking` (raw `fetch`) into `members.ts` and `getGroupReleaseDetail`/`getGroupReleaseListCursor`/`getGroupReleaseImages` (raw `fetch`, intentionally bypassing the authorized-fetch wrapper for public no-auth release reads) into `releases.ts` tripped the test, since neither file was in the allowlist
- **Fix:** Added `src/lib/api/members.ts` and `src/lib/api/releases.ts` to `centralClientAllowlist` with dated comments explaining the relocation, following the exact precedent pattern already used for `fansubs-core.ts`/`fansubs-groups.ts`/`contributions-me.ts`/`auth.ts`/`history.ts`/`search.ts` from 174-04/174-05
- **Files modified:** `frontend/src/lib/api.no-token-boundary.test.ts`
- **Verification:** `npx vitest run` — the specific test ("keeps direct fetch outside the central client limited to...") now passes
- **Committed in:** `9122f1ed` (Task 2 commit)

**2. [Rule 3 - Blocking] Updated `v12-projection-contract.test.ts`'s concatenated source list**
- **Found during:** Task 2 full-gate verification (`npx vitest run`)
- **Issue:** This contract test literally reads `api.ts` + `media.ts` source text to locate `export async function getFansubGroupDomainProjection(` and assert it uses the central client seam. Moving the function to `fansubs-core.ts` made the literal string search fail (`expect(start).toBeGreaterThanOrEqual(0)` → `-1`)
- **Fix:** Added `frontend/src/lib/api/fansubs-core.ts` to the concatenated `apiClientSource` array, following the exact precedent comment pattern 174-06 used when `getMediaOwnershipProjection` moved to `media.ts`
- **Files modified:** `frontend/src/types/__tests__/v12-projection-contract.test.ts`
- **Verification:** `npx vitest run` — "keeps projection reads behind the central api.ts helpers" now passes
- **Committed in:** `9122f1ed` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking test failures caused directly by this plan's physical relocations, both following established precedent patterns from prior 174-0x plans)
**Impact on plan:** Both fixes are mechanical governance-test maintenance, not scope creep — they keep two existing architectural guard tests honest about the code's real physical location, exactly as 174-02 through 174-06 already did for every prior relocation.

## Issues Encountered

**Pre-existing test failures, confirmed unrelated to this plan's changes (left untouched per the deviation-rules scope boundary):**

- `src/lib/cssCustomProperties.guard.test.ts` (2 failing assertions) — flags a dead `--surface-muted` custom-property reference in `lib/roleCatalog.accessibility.test.ts:268`; no relationship to `@/lib/api` or any file this plan touched
- `src/app/dev/ui-system/showcase/PublicReleaseSurfacesShowcase.test.tsx` — a static demo/showcase page using hardcoded mock data with no `@/lib/api` import at all; missing "Release öffnen" link text is a pre-existing UI mismatch
- `src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` (2 failing assertions) — mocks the entire `@/lib/api` module and only imports the untouched `getFansubList`; failure is a DOM duplicate-text-match assertion unrelated to any moved function
- `src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` — imports only `ApiError`/`getGroupDetail`/`getProjectMemberSummary`/`resolveFansubProject`, none of which moved in this plan; failure is a pre-existing rendered-text mismatch ("Vollständiges Memberprofil" vs. actual "Fansubberprofil")

Verified via `grep -rn "@/lib/api"` on each failing test/component file that none reference any function this plan relocated. Confirmed these 4 test files were already failing before this plan's changes (git log shows none were touched by 174-07, and the two real regressions this plan did introduce — the no-token-boundary and v12-projection-contract failures — were found and fixed, see Deviations above).

Full before/after counts: before the two fixes, 6 test files / 8 tests failed; after, 4 test files / 6 tests failed (the 2 fixed tests are the only ones this plan's changes actually caused).

## Known Stubs

None — `createAnimeComment` is relocated verbatim (not stubbed); its lack of a production consumer is documented above as a known-unused function, not a stub masquerading as working code.

## Threat Flags

None — all relocated functions keep their existing trust boundaries (same endpoints, same auth wrappers, same request/response shapes). No new network surface, auth path, or schema change was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Welle-2 function-level migration of `api.ts`'s 371 original exports is now complete: every function has a grep-evidence-backed domain-module home, and `api.ts` itself is a pure barrel file
- No known blockers for subsequent phases touching `frontend/src/lib/api/*`
- `createAnimeComment`'s zero-consumer status may be worth a future dead-code removal pass, but that is out of this plan's scope (relocation only, not pruning)

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

All 13 referenced files found on disk; both referenced commits (`9122f1ed`, `5482d375`) found in git log.

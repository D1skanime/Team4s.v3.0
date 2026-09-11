---
phase: 155-fansub-projektseite-read-model-und-query-budget
plan: 04
subsystem: api
tags: [nextjs, typescript, vitest, ssr, read-model]

# Dependency graph
requires:
  - phase: 155-fansub-projektseite-read-model-und-query-budget
    provides: "GroupRepository.GetGroupReleaseVersionCount + GET /api/v1/anime/:id/group/:groupId/releases/count + getGroupReleaseCount() client function (Plan 155-02)"
provides:
  - "loadPublicFansubProjectPageData no longer fetches getGroupThemes/getGroupReleaseMedia or the offset per_page:100 getGroupReleases call (incl. its duplicate catch-retry)"
  - "PublicFansubProjectPageData contract: releaseVersionCount replaces releaseEpisodes/themesData/releaseMediaData/hasThemes/hasMedia"
  - "Exported PrecomputedProjectNavigation type + optional precomputed param on loadPublicFansubProjectPageData — the resolver integration seam for Plan 155-06's three pretty routes"
  - "projectPageData.releasePreview.ts (pure release-preview builder functions, extracted to stay under the 450-line ceiling)"
affects: [155-05, 155-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional precomputed-navigation param that lets a caller skip a shared SSR loader's own internal resolution branch entirely (no promise created), while an omitted param falls back byte-identically to the original internal resolution — used here so the numeric legacy route needs zero changes"
    - "Mechanical pure-function extraction into a sibling file when a file exceeds the 450-line CLAUDE.md ceiling by a small margin, per the project's existing group_repository_cursor.go precedent"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts
    - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
    - frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx

key-decisions:
  - "ReleasesSection's own `episodes.length === 0` early-return gate was redundant with (and, once releaseEpisodes was removed from the loader contract, would have silently defeated) the outer `data.hasReleases` gate already applied in ProjectPage.tsx. Removed the dead `episodes` prop and its internal gate rather than passing a placeholder empty array, because a placeholder array would have hidden the required 'Neuestes Fansub-Release' block entirely whenever hasReleases was true but no per_page:100 list existed anymore — an immediate, non-deferred regression of a block the run constraints explicitly require to stay."
  - "HeroSection.tsx is deliberately left unwired in this plan (still receives releaseEpisodes=[] from ProjectPage.tsx) per the plan's explicit read_first instruction not to touch HeroSection.tsx in this task. ProjectStats' 'Releases' number and GroupAssetShowcase's episode->release_id mapping are Plan 155-05's documented job (wiring releaseVersionCount and GroupEpisodeAssets' own release_id/episode_id/title fields respectively). Tracked as a Known Stub below."
  - "Split projectPageData.ts into itself (357 lines) plus projectPageData.releasePreview.ts (128 lines) because removing the dead fetches alone left the file at 451 lines, one over the ceiling — extracted the six pure, orchestration-independent release-preview-builder functions exactly as RESEARCH.md/PATTERNS.md pre-identified, rather than trimming arbitrarily elsewhere."

requirements-completed: [P155-02, P155-07, P155-08, P155-09, P155-10]

# Metrics
duration: 20min
completed: 2026-09-11
---

# Phase 155 Plan 04: Project Loader Read-Model Cleanup + Resolver Seam Summary

**Removed the project loader's dead themes/release-media fetches and the duplicate-retrying per_page:100 offset release call, replaced the "Releases" count source with the new standalone `getGroupReleaseCount` endpoint, and added an optional `precomputed` navigation param so the three pretty routes (Plan 155-06) can skip the loader's own internal public-profile resolution.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-11T15:42Z
- **Tasks:** 3/3 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- `projectPageData.ts` no longer imports or calls `getGroupThemes`, `getGroupReleaseMedia`, or `getGroupReleases` at all. The `per_page: 100` offset call and its duplicate nested-catch retry (a genuine double-load-on-failure bug) are gone, replaced by the existing `getAnimeFansubs` branch (now a standalone `withFallback` entry, unbundled from the deleted release branch) plus a new `withFallback<number>` branch calling `getGroupReleaseCount(animeID, groupID)` (Plan 155-02's endpoint) to feed `releaseVersionCount`.
- `PublicFansubProjectPageData` drops `releaseEpisodes`, `themesData`, `releaseMediaData`, `hasThemes`, `hasMedia` and gains `releaseVersionCount: number`. `hasReleases` is redefined as `releaseVersionCount > 0 || publicReleasePreviews.length > 0`.
- `loadPublicFansubProjectPageData` accepts an optional `precomputed: PrecomputedProjectNavigation` param (`{canonicalProjectPath, fansubProjectNavigation}`, exported for Plan 155-06 to construct from the resolver's response). When present, no `profilePromise` is ever created and `getPublicFansubProfileBySlug` is never called; the precomputed values are used directly in both the profile-derived branch and the release-preview href-building branch. When omitted — the numeric legacy route's exact call shape (`{animeID, groupID}` only) — behavior is byte-identical to before.
- `projectPageData.ts` (357 lines) plus the new `projectPageData.releasePreview.ts` (128 lines) replace the original 487-line file; both are under the 450-line ceiling. The extracted file holds the six pure, no-side-effect release-preview-builder functions (`stripHtmlExcerpt`, `formatDuration`, `formatEpisodeLabel`, `parseTimelineTime`, `buildTimelineSegment`, `buildPublicReleasePreview`).
- New `projectPageData.test.ts` (7 tests, fully mocked `@/lib/api`) proves: precomputed skips the profile fetch and is used verbatim; omitting it falls back correctly; the three removed functions are never called and the removed fields are genuinely absent from the returned object; `releaseVersionCount` reflects the count endpoint and drives `hasReleases` even with zero release previews, degrading independently to 0 on rejection without affecting sibling branches (contributors); and every mocked `@/lib/api` function is called exactly once per load regardless of response payload size (25 cursor items / 40 contributors vs. 1 / 0).
- `tsc --noEmit`, `eslint` (touched files), and the full `src/app/anime/[id]/group/[groupId]` vitest suite (17 files / 110 tests) all pass clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove dead fetches, consolidate release data paths, add releaseVersionCount** - `7b1885d0` (feat)
2. **Task 2: Optional precomputed navigation param — resolver integration seam** - `8929f751` (feat)
3. **Task 3: Mocked-fetch tests for the rewritten loader** - `d222228c` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

## Files Created/Modified

- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` - dead-fetch removal, `releaseVersionCount` wiring, `precomputed` param, now 357 lines
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts` (NEW) - extracted pure release-preview builder functions, 128 lines
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts` (NEW) - 7 mocked-fetch tests covering the precomputed seam, dead-fetch removal, releaseVersionCount wiring, and bounded request count
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` - stopped passing the now-removed `data.releaseEpisodes` to `HeroSection`/`ReleasesSection`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx` - removed the dead `episodes` prop and its now-redundant/regression-causing internal gate (see Deviations)
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx` - updated to the new prop contract (removed `episodes` from all three render calls; the "renders nothing when there are no episodes" case is now covered one level up by `ProjectPage.tsx`'s `data.hasReleases` gate, so that test was replaced with an equivalent no-previews case against the still-present "Alle Releases" fallback list)

## Decisions Made

See `key-decisions` in frontmatter. In short: removed dead `episodes` gating in `ReleasesSection` rather than papering over it with a placeholder array (Rule 1, correctness); left `HeroSection.tsx` untouched per the plan's explicit instruction, deferring its `releaseVersionCount`/`GroupEpisodeAssets` wiring to Plan 155-05; split the loader file into two to respect the 450-line ceiling using the plan's pre-identified pure-function boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed `ReleasesSection`'s dead `episodes` prop/gate instead of passing a placeholder array**
- **Found during:** Task 1 (removing `releaseEpisodes` from `PublicFansubProjectPageData`)
- **Issue:** `ProjectPage.tsx` passed `data.releaseEpisodes` to both `HeroSection` and `ReleasesSection`. Once that field was removed from the loader's contract, the only type-safe options were (a) pass `[]` everywhere, or (b) remove the now-dead prop where it caused a real behavior bug. `ReleasesSection`'s internal `if (episodes.length === 0) return null` was already redundant with the outer `data.hasReleases ? <ReleasesSection .../> : null` gate in `ProjectPage.tsx` — but if fed `[]` as a placeholder, it would have unconditionally hidden the entire release section, including the "Neuestes Fansub-Release" block, even when `hasReleases` (now correctly derived from `releaseVersionCount`/`publicReleasePreviews.length`) was true. That block is explicitly required to stay per this plan's run constraints.
- **Fix:** Removed the `episodes` prop and its internal early-return gate from `ReleasesSection`; the outer `data.hasReleases` gate in `ProjectPage.tsx` is now the sole authority, exactly mirroring what it already computes. Updated `ReleasesSection.test.tsx` to the new prop contract.
- **Files modified:** `sections/ReleasesSection.tsx`, `sections/ReleasesSection.test.tsx`, `ProjectPage.tsx`
- **Verification:** `tsc --noEmit` clean; full `src/app/anime/[id]/group/[groupId]` vitest suite (110 tests) green; `ReleasesSection.test.tsx`'s remaining two tests explicitly assert the "Neuestes Fansub-Release" heading appears when a preview exists and is absent (with the "Alle Releases" fallback still rendered) when it doesn't.
- **Committed in:** `7b1885d0` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — correctness/regression prevention)
**Impact on plan:** Necessary to avoid silently hiding the "Neuestes Fansub-Release" block, which the run constraints explicitly protect. No scope creep — the plan's own file list already anticipated `ReleasesSection`-adjacent fallout was possible via the `hasReleases` redefinition; this fix stays within that same blast radius.

## Known Stubs

- **`frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx`** (line ~35): `HeroSection` is called with `releaseEpisodes={[]}` (a hardcoded empty array) instead of real data, per this plan's explicit instruction not to touch `HeroSection.tsx` in Task 1. Two downstream effects until Plan 155-05 wires it up:
  - `ProjectStats`'s "Releases" metric (`sections/HeroSection.tsx:130`, `releaseCount={releaseEpisodes.length}`) will display `0` regardless of the actual `releaseVersionCount`, instead of the correct count.
  - `GroupAssetShowcase`'s episode→release mapping (fed from the same now-empty array) will be empty, so any episode-asset cards that previously showed a release link/label via that mapping will show none — only reachable when `hasGroupFolder && hasEpisodeAssets` is true (i.e., a group asset showcase is configured for the project).
  - **Resolution:** Plan 155-05, per the interfaces already documented in this plan's `<read_first>` (wire `ProjectStats` to `releaseVersionCount`; update `GroupAssetsExperience`/`GroupAssetShowcase` to read `release_id`/`episode_id`/`title` off its own `episodes: GroupEpisodeAssets[]` prop, which is already populated server-side, instead of a second separately-fetched `releaseEpisodes` list).
  - This gap is intra-phase and does not reach any deployed/UAT-visible state on its own — Plan 155-05 is the very next plan in this phase's execution sequence.

## Issues Encountered

None beyond the deviation documented above.

## Requirements Tracking Note

`requirements.mark-complete P155-02 P155-07 P155-08 P155-09 P155-10` will very likely return `not_found` for these IDs, matching the same phase-crossing gap already documented in 155-01-SUMMARY.md and 155-02-SUMMARY.md — `.planning/REQUIREMENTS.md` has no `P155-*` section. Not fixed here for the same reason those two plans gave: no established Phase-155 precedent in that file to follow without inventing a section format unilaterally.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The resolver integration seam (`PrecomputedProjectNavigation`, the optional `precomputed` param) is ready for Plan 155-06 to wire the three pretty routes to the Plan 155-01 resolver.
- Plan 155-05 has clear, pre-documented wiring work: `HeroSection.tsx`'s `ProjectStats.releaseCount` needs to move from `releaseEpisodes.length` to `data.releaseVersionCount`, and `GroupAssetShowcase`/`GroupAssetsExperience` needs to stop taking a separate `releaseEpisodes` prop and instead read `release_id`/`episode_id`/`title` directly off its own `episodes: GroupEpisodeAssets[]` prop (already populated server-side per `group_assets_handler.go`'s `buildGroupAssetsPayload`).
- The numeric legacy route (`frontend/src/app/anime/[id]/group/[groupId]/page.tsx`) required zero source changes and still compiles/behaves identically (confirmed via `tsc --noEmit` and the full existing `page.test.tsx` suite passing unchanged).

---
*Phase: 155-fansub-projektseite-read-model-und-query-budget*
*Completed: 2026-09-11*

## Self-Check: PASSED

Verified `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts`,
`frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts`, and this SUMMARY.md exist
on disk. Verified all 3 task commit hashes (`7b1885d0`, `8929f751`, `d222228c`) present in
`git log --oneline --all`.

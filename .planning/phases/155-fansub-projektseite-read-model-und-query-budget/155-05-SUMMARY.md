---
phase: 155-fansub-projektseite-read-model-und-query-budget
plan: 05
subsystem: frontend
tags: [nextjs, typescript, vitest, react, read-model]

# Dependency graph
requires:
  - phase: 155-fansub-projektseite-read-model-und-query-budget
    provides: "PublicFansubProjectPageData.releaseVersionCount replacing releaseEpisodes/themesData/releaseMediaData/hasThemes/hasMedia (Plan 155-04)"
provides:
  - "HeroSection/ProjectStats read the release count from releaseVersionCount, no releaseEpisodes prop anywhere in the render tree"
  - "GroupAssetsExperience/GroupAssetShowcase read release_id/episode_id/title directly off their own episodes: GroupEpisodeAssets[] prop, no releaseByEpisode Map"
affects: [155-06, 155-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read denormalized fields directly off an already-passed array item instead of building a second lookup Map keyed by a field already present on the same item (GroupEpisodeAssets.release_id/episode_id/title)"

key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx
    - frontend/src/components/groups/GroupAssetsExperience.tsx

key-decisions:
  - "Task 3 (ReleasesSection.tsx episodes->hasReleases prop rewrite) is a documented no-op: Plan 155-04 already went further than its own file scope and removed ReleasesSection's episodes prop entirely (no hasReleases prop added either), because ProjectPage.tsx's existing outer `data.hasReleases ? (<ReleasesSection .../>) : null` ternary already made an internal gate redundant. Re-adding a hasReleases prop to ReleasesSection now would create two gates for the same fact (the outer ternary and a new inner prop), which is the exact duplication Task 3 was written to remove in the first place. Current state already satisfies the plan's must_haves/verification (no episodes-array dependency, correct gating, byte-identical visible behavior) — confirmed by reading the live ReleasesSection.tsx/ReleasesSection.test.tsx/ProjectPage.tsx before making any change, and by grep (ReleasesSection.tsx contains 'episodes'/'hasReleases' only inside an explanatory doc comment, never as a prop)."

requirements-completed: [P155-08, P155-09, P155-10, P155-11]

# Metrics
duration: 12min
completed: 2026-09-11
---

# Phase 155 Plan 05: Wire HeroSection/GroupAssetsExperience to the New Read Model Summary

**Finished removing `releaseEpisodes` from the render tree by wiring `HeroSection`/`ProjectStats` to the new `releaseVersionCount` number and `GroupAssetsExperience` to read `release_id`/`episode_id`/`title` directly off its own already-populated `episodes` prop, leaving `ReleasesSection` untouched because Plan 155-04 already resolved its gating redundantly with the outer `ProjectPage.tsx` ternary.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-09-11T15:48Z
- **Tasks:** 2/2 code tasks executed (Task 3 reconciled as an already-satisfied no-op, documented, not executed)
- **Files modified:** 5

## Accomplishments

- `HeroSection.tsx`'s `HeroSectionProps` drops `releaseEpisodes: EpisodeReleaseSummary[]` and gains `releaseVersionCount: number`. `ProjectStats`'s `releaseCount` prop is now sourced from `releaseVersionCount` instead of `releaseEpisodes.length`. The `EpisodeReleaseSummary` import is removed (no longer referenced anywhere in the file). `GroupAssetShowcase` is no longer passed a `releaseEpisodes` prop.
- `ProjectPage.tsx` passes `releaseVersionCount={data.releaseVersionCount}` into `HeroSection` instead of the Plan-155-04 placeholder `releaseEpisodes={[]}`. Its `ReleasesSection` render block is unchanged — see key-decisions for why.
- `page.test.tsx`'s four `HeroSection navigation (102-03)` test call-sites now pass `releaseVersionCount={0}` instead of `releaseEpisodes={[]}`; no assertion in these tests changed.
- `GroupAssetShowcase.tsx` drops its `releaseEpisodes: EpisodeReleaseSummary[]` prop and pass-through; the `EpisodeReleaseSummary` import is removed.
- `GroupAssetsExperience.tsx` drops its `releaseEpisodes` prop and the `releaseByEpisode` `useMemo` Map entirely. The per-episode lookup now reads `episode.title`, `episode.episode_id`, and `episode.release_id` directly off the already-present `episode: GroupEpisodeAssets` object (these fields are populated server-side by `buildGroupAssetsPayload`, per Plan 155-05's interfaces documentation and confirmed live in `frontend/src/types/groupAsset.ts`).
- No test files exist for `GroupAssetShowcase.tsx`/`GroupAssetsExperience.tsx`, so no test updates were needed for Task 2.
- `Task 3` required no code change: `ReleasesSection.tsx` and `ReleasesSection.test.tsx` were already updated by Plan 155-04's documented deviation (see that plan's SUMMARY.md, "Deviations from Plan" #1) to remove the `episodes` prop entirely, with the gate moved one level up to `ProjectPage.tsx`'s `data.hasReleases` ternary. Re-reading both files confirmed this before deciding not to touch them (see key-decisions).
- `tsc --noEmit` and the full `src/app/anime/[id]/group/[groupId]` vitest suite (17 files / 110 tests, including the 4 HeroSection navigation tests and the unmodified 2 `ReleasesSection.test.tsx` tests) pass clean. ESLint on all touched files shows 0 errors (3 pre-existing `<img>`-vs-`next/image` warnings in `GroupAssetsExperience.tsx`, unrelated to this plan's changes, not introduced by it).

## Task Commits

1. **Task 1: ProjectPage.tsx + HeroSection.tsx — wire releaseVersionCount, drop releaseEpisodes** - `ffad046c` (feat)
2. **Task 2: GroupAssetShowcase.tsx + GroupAssetsExperience.tsx — read release fields off the existing episodes prop** - `79d69d16` (feat)
3. **Task 3: ReleasesSection.tsx — episodes array to hasReleases boolean** - no commit; already-satisfied no-op per Plan 155-04's prior deviation (see key-decisions and "Deviations from Plan" below)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

## Files Created/Modified

- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - `releaseEpisodes` prop replaced with `releaseVersionCount: number`; `ProjectStats.releaseCount` now reads it; `EpisodeReleaseSummary` import removed; `GroupAssetShowcase` no longer receives `releaseEpisodes`
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` - `HeroSection` now receives `releaseVersionCount={data.releaseVersionCount}` instead of `releaseEpisodes={[]}`
- `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` - 4 `HeroSection navigation (102-03)` call-sites: `releaseEpisodes={[]}` → `releaseVersionCount={0}`
- `frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx` - dropped `releaseEpisodes` prop/pass-through and its now-unused `EpisodeReleaseSummary` import
- `frontend/src/components/groups/GroupAssetsExperience.tsx` - dropped `releaseEpisodes` prop, `EpisodeReleaseSummary` import, and the `releaseByEpisode` `useMemo` Map; per-episode lookup reads `episode.title`/`episode.episode_id`/`episode.release_id` directly

## Decisions Made

See `key-decisions` in frontmatter for the Task 3 reconciliation rationale in full.

## Deviations from Plan

### Auto-fixed Issues

None — Tasks 1 and 2 were executed exactly as written, with no bugs, missing functionality, or blockers encountered.

### Task 3 — Reconciled as an already-satisfied no-op (not a Rule 1-4 deviation)

Plan 155-05's `<interfaces>` section describes `ReleasesSection.tsx`/`ProjectPage.tsx` as they existed *before* Plan 155-04 ran (an `episodes: EpisodeReleaseSummary[]` prop with an internal `.length === 0` gate). Plan 155-04 already executed and, per its own documented deviation ("Deviations from Plan" #1 in `155-04-SUMMARY.md`), went further than its stated file scope: it removed `ReleasesSection`'s `episodes` prop entirely — **not** replacing it with a `hasReleases` prop as this plan's Task 3 originally called for — because the internal gate was redundant with (and, once `releaseEpisodes` left the loader contract, would have actively regressed) the outer `data.hasReleases ? (<ReleasesSection .../>) : null` ternary already present in `ProjectPage.tsx`.

Before touching anything, `ReleasesSection.tsx`, `ReleasesSection.test.tsx`, and `ProjectPage.tsx` were re-read in full (see files_to_read in this run's context). Current live state:
- `ReleasesSection.tsx` takes no `episodes` and no `hasReleases` prop — it renders unconditionally when mounted. A doc comment at the top of the file explicitly documents this history (mentions `data.hasReleases` and the removed `episodes` list, but only as prose, not as code).
- `ProjectPage.tsx` still gates it externally via the exact same ternary the interfaces section described as "current shape" pre-155-04.
- `ReleasesSection.test.tsx`'s two tests already assert against `publicReleasePreviews` only; no `makeEpisode` helper or `EpisodeReleaseSummary` import exists to remove.

Adding a `hasReleases: boolean` prop to `ReleasesSection` now, on top of the outer ternary that already fully encodes the same fact, would reintroduce exactly the two-gates-for-one-fact duplication that Task 3 exists to eliminate — just moved from "episodes array + `.length` check" to "external ternary + internal boolean prop echoing the same value". The plan's own `must_haves.truths` ("visible information architecture... pixel/behavior-identical... only the data source changed") and `<verification>` ("no `releaseEpisodes` reference remains") are already satisfied by the current state. Treated as a no-op per the run's explicit drift-note instruction; no code change made, no commit created for this task.

---

**Total deviations:** 0 auto-fixed (Rules 1-4). 1 documented reconciliation (Task 3, judged already-satisfied per explicit run instruction).
**Impact on plan:** None on scope — Tasks 1 and 2 fully executed as specified; Task 3's intent (hasReleases-based gating, no episodes-array dependency, unchanged visible behavior) was already delivered by Plan 155-04.

## Known Stubs

None. No hardcoded empty/placeholder values were introduced by this plan; `releaseVersionCount` and the `episode.release_id`/`episode.episode_id`/`episode.title` fields are all real, already-populated data sources.

## Threat Flags

None. This plan only changed where already-public, already-rendered fields are read from (prop-source swap); no new endpoint, auth path, file access pattern, or schema change was introduced. Matches the plan's own threat_model disposition (`T-155-08`, accept, no new data exposure).

## Issues Encountered

None.

## Requirements Tracking Note

`requirements.mark-complete P155-08 P155-09 P155-10 P155-11` will very likely return `not_found` for these IDs, matching the same phase-crossing gap already documented in 155-01/02/04-SUMMARY.md — `.planning/REQUIREMENTS.md` has no `P155-*` section. Not fixed here for the same reason those plans gave.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Zero remaining functional references to `releaseEpisodes`/`releaseByEpisode` under `frontend/src/app/anime/[id]/group/[groupId]/` or `frontend/src/components/groups/`. The only textual match left is two negative-assertion strings inside `projectPageData.test.ts` (added by Plan 155-04, asserting the field's absence from the loader's return value) — an intentional test of the removal, not a functional dependency.
- The visible project page (Hero stats, episode asset cards, Releases section gating incl. the required "Neuestes Fansub-Release" block) renders identically to before this plan; only the data source changed, confirmed by the full existing test suite passing unchanged.
- Plans 155-06/155-07 can proceed without any remaining `releaseEpisodes`-shaped data dependency anywhere in this render subtree.

---
*Phase: 155-fansub-projektseite-read-model-und-query-budget*
*Completed: 2026-09-11*

## Self-Check: PASSED

Verified all 5 modified files exist on disk (`HeroSection.tsx`, `ProjectPage.tsx`, `page.test.tsx`,
`GroupAssetShowcase.tsx`, `GroupAssetsExperience.tsx`) and this SUMMARY.md exists. Verified both
task commit hashes (`ffad046c`, `79d69d16`) present in `git log --oneline --all`.

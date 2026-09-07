---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 05
subsystem: ui
tags: [react, nextjs, typescript, badges, gamification, thresholds, member-profile, dashboard]

# Dependency graph
requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 02)
    provides: "OwnDashboardData.points_progress and OwnDashboardRoleVolumeEntry.current_threshold (dashboard companion contract fields)"
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 03)
    provides: "PublicMemberBadgeProgress.current_tier/role_code/stages (all seven badge families, including the Go-synthesized role_volume 'entry' stage)"
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 04)
    provides: "role_entry_<code> emitted exactly once per role, always carrying a real current_count -- the precondition that made this plan's roleCounts fallback removal safe"
provides:
  - "MemberProfileContent.tsx, CategoryProgressTable.tsx, and MemberBadgeChain.tsx no longer derive tier/threshold/remaining/stage-lists themselves -- every number comes from the API response"
  - "memberBadgeLabels.ts loses deriveMilestoneBadge, resolveNextPointMilestone, resolveNextRoleVolumeThreshold, ROLE_VOLUME_TIER_THRESHOLDS, POINT_MILESTONES, ROLE_PROGRESS_STAGES, and FAMILY_DEFINITIONS' inline stage arrays -- zero survivors, verified by grep"
  - "resolveRoleVolumePresentation returns the bare tier label only (no embedded threshold number); the one live call site that needs the suffixed string (buildRoleVolumeRow) reconstructs it from entry.current_threshold"
  - "memberBadgeLabels.ts split into memberBadgeLabels.ts (186 lines) and the new memberBadgeFamilies.ts (341 lines), both under CLAUDE.md's 450-line cap"
affects: [150-06, 150-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "stageBadgeCode(familyKey, code): the one place that reconstructs a full badge_code from a family's bare tier-token stage code (contribution_* families only) -- mirrors current_tier's existing per-family code convention instead of inventing a new one"
    - "FAMILY_STAGE_FIXTURES: a shared, table-driven test fixture (duplicated once per test file: memberBadgeLabels.test.ts, MemberBadgeChain.test.tsx, members/[slug]/page.test.tsx) supplying the same seven per-family stage lists the backend now sends, replacing ad-hoc `stages: []` placeholders"
    - "roleVolumeProgress(count) / roleVolumeBadgeProgress(roleCode, count): small per-test-file helpers that build a minimal role_volume-shaped badge_progress entry for resolveRoleProgressPresentation's new (entry, fallbackCount) signature"

key-files:
  created:
    - frontend/src/components/profile/memberBadgeFamilies.ts
  modified:
    - frontend/src/app/members/[slug]/MemberProfileContent.tsx
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
    - frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx
    - frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/memberBadgeLabels.test.ts
    - frontend/src/types/dashboard.ts
    - .planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/deferred-items.md

key-decisions:
  - "Tasks 1, 2 and 3's own <verify> commands could not each pass in isolation, because the plan's own text makes them mutually dependent: Task 1's buildRoleVolumeRow assumes Task 3's bare-label resolveRoleVolumePresentation output, and Task 2/Task 3 both declare memberBadgeLabels.ts/memberBadgeLabels.test.ts in their <files> list. Resolved by implementing all three tasks' code together, then splitting the git history into 3 commits by final file ownership (Task 1's 4 exclusive files; Task 2's MemberBadgeChain.tsx/.test.tsx plus the full final state of memberBadgeLabels.ts/.test.ts; Task 3's memberBadgeFamilies.ts file-split extraction plus incidental doc fixes). The cumulative diff across all 3 commits matches the plan's intent exactly; only the per-commit isolation guarantee was relaxed, and is documented here rather than silently glossed over."
  - "Every badge_progress/role_volume test fixture across memberBadgeLabels.test.ts, MemberBadgeChain.test.tsx, and members/[slug]/page.test.tsx that previously used an empty `stages: []` placeholder (added by Plan 150-03 purely to satisfy TypeScript) needed a REAL per-family stage list, because resolveMemberBadgeFamilies/resolveRoleProgressPresentation now derive their rendered output entirely from that field. This was a large but mechanical fixture update (a shared FAMILY_STAGE_FIXTURES table per test file), not a behavior change -- every fixed test asserts the exact same rendered strings as before."
  - "buildRoleVolumeRow's nextLabel (e.g. 'Silber' in 'noch 88 bis Silber') is derived by calling getMemberBadgePresentation(`role_volume_${role_code}_${next_tier}`).label -- the same resolver/lookup pattern the row already uses for its own current-tier label -- rather than inventing a second local tier-label map, per the plan's explicit 'do not invent a new label map' instruction."

requirements-completed: [SC-2, SC-3, SC-8]

# Metrics
duration: ~75min
completed: 2026-09-07
---

# Phase 150 Plan 05: Frontend threshold rollback -- badge-family stage ladders and role-volume label now fully server-sourced

**Removed all six client-side threshold literals from `memberBadgeLabels.ts` (deriveMilestoneBadge, resolveNextPointMilestone, resolveNextRoleVolumeThreshold, ROLE_VOLUME_TIER_THRESHOLDS, POINT_MILESTONES, ROLE_PROGRESS_STAGES) and rewired all six numbered frontend computation sites plus the badge-family/role-volume stage ladders to read tier/threshold/remaining/stages directly from `badge_progress`/dashboard response fields, with zero rendered-string changes.**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-09-06T23:20:00Z (approximate)
- **Completed:** 2026-09-07T00:35:00Z
- **Tasks:** 3
- **Files modified:** 11 (10 modified + 1 created)

## Accomplishments
- `MemberProfileContent.tsx` reads the "points" family's `current_tier` from `profile.badge_progress` instead of calling `deriveMilestoneBadge(total_points)`.
- `CategoryProgressTable.tsx`'s `buildPointsRow`/`buildRoleVolumeRow` mirror `buildCategoryRow`'s existing pattern exactly, reading `current_tier`/`current_threshold`/`next_threshold`/`remaining_count`/`next_tier` straight off the response; `buildRoleVolumeRow` reconstructs the `"<Label> · <n>+"` badge text from the new `current_threshold` field.
- `resolveMemberBadgeFamilies` (moved to the new `memberBadgeFamilies.ts`) builds every badge family's stage ladder from `badge_progress[].stages` instead of the deleted `FAMILY_DEFINITIONS` inline arrays.
- `resolveRoleProgressPresentation` takes the matching `role_volume` `badge_progress` entry (plus a display-only fallback count) instead of a raw count, and `MemberBadgeChain.tsx`'s "roles" carousel now looks that entry up by `role_code` via a new `roleVolumeProgressByCode` map.
- `MemberBadgeChain.tsx`'s role-count fallback (`ROLE_VOLUME_TIER_THRESHOLDS[tier]` guess) is deleted; `roleCounts` now reads `badge.current_count` directly, relying on Plan 150-04's guarantee that it is always present.
- `resolveRoleVolumePresentation`'s threshold survivor is fixed: its label is now the bare tier name, with the suffixed string reconstructed at the one real call site that needs it.
- `memberBadgeLabels.ts` (544 lines pre-phase) is split into `memberBadgeLabels.ts` (186 lines) and the new `memberBadgeFamilies.ts` (341 lines), both under the 450-line cap.

## Task Commits

Each task was committed atomically:

1. **Task 1: Repoint the three tier-derivation call sites** - `f775ac37` (feat)
2. **Task 2: Rewire badge-family stage ladders onto server-supplied stages; simplify MemberBadgeChain's role-count fallback** - `9593a4b5` (feat) -- also contains Task 3's changes to the same two files (`memberBadgeLabels.ts`/`memberBadgeLabels.test.ts`); see Decisions Made below
3. **Task 3: Delete dead constants, fix resolveRoleVolumePresentation, split the file** - `6e1f9959` (refactor)

## Files Created/Modified
- `frontend/src/app/members/[slug]/MemberProfileContent.tsx` - reads `profile.badge_progress`'s "points" family instead of `deriveMilestoneBadge(total_points)`
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` - dropped the now-nonexistent `deriveMilestoneBadge` mock export
- `frontend/src/app/members/[slug]/page.test.tsx` - `badge_progress` fixtures gained real per-family `stages` (previously `stages: []` placeholders that no longer produce any rendered family card)
- `frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx` - `buildPointsRow`/`buildRoleVolumeRow` rewritten to mirror `buildCategoryRow`'s pattern; no more `resolveNextPointMilestone`/`resolveNextRoleVolumeThreshold`/`POINT_MILESTONES` imports
- `frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx` - points-milestone test now supplies `points_progress` instead of relying on `total_points` alone; default fixture's `points_progress` corrected to a realistic zero-point shape (`next_threshold: 1`, matching what the backend actually sends at 0 points)
- `frontend/src/components/profile/MemberBadgeChain.tsx` - `roleCounts` fallback removed; new `roleVolumeProgressByCode` lookup feeds the "roles" carousel's `resolveRoleProgressPresentation` call; imports split between `memberBadgeLabels.ts` and the new `memberBadgeFamilies.ts`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - large fixture pass: every `badgeProgress` array gained real `stages`; every `role_entry_*`/`role_volume_*` earned-badge fixture gained an explicit `current_count`; every role-carousel-rendering test gained a matching `badgeProgress` role_volume entry via a new `roleVolumeBadgeProgress(roleCode, count)` helper
- `frontend/src/components/profile/memberBadgeLabels.ts` - six dead exports deleted; `resolveRoleVolumePresentation` fixed; file split (186 lines remain: catalog, presentations, `getMemberBadgePresentation`)
- `frontend/src/components/profile/memberBadgeLabels.test.ts` - three describe blocks for deleted functions removed; `getMemberBadgePresentation — role_volume_-Resolver` block updated to bare-label expectations; D-22 anti-drift test replaced with a documented cross-reference; remaining `resolveMemberBadgeFamilies`/`resolveRoleProgressPresentation` fixtures gained real `stages`
- `frontend/src/components/profile/memberBadgeFamilies.ts` (new) - `resolveMemberBadgeFamilies`, `resolveRoleProgressPresentation`, `resolveRoleVolumePresentation`, and their supporting types/constants (341 lines)
- `frontend/src/types/dashboard.ts` - doc comment updated to reference the now-deleted helper names in past tense
- `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/deferred-items.md` - logs a pre-existing, out-of-scope test failure (see Deviations)

## Decisions Made
See `key-decisions` in frontmatter: the Task 2/Task 3 commit-split rationale, the mechanical `FAMILY_STAGE_FIXTURES` test-fixture rebuild, and the `buildRoleVolumeRow` nextLabel resolver reuse (no new label map).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `CategoryProgressTable.test.tsx`'s default `points_progress` fixture produced an incorrect "Höchste Stufe erreicht" for a genuine zero-point member**
- **Found during:** Task 1 (full-suite verification)
- **Issue:** `makeData()`'s default `points_progress` (`next_threshold: null, next_tier: null`) is not what the real backend sends for a member with 0 points -- the backend's first points milestone threshold is 1, so `next_threshold` is never actually `null` at zero points. The stale placeholder made one unrelated test ("Höchste Stufe erreicht wenn next_threshold null ist") fail because the points row rendered a second, unintended "Höchste Stufe erreicht".
- **Fix:** Corrected the default fixture to `next_threshold: 1, remaining_count: 1, next_tier: "point_milestone_first"`, matching the real backend contract at zero points.
- **Files modified:** `frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx`
- **Verification:** `npx vitest run src/app/me/dashboard/components/CategoryProgressTable.test.tsx` -- 6/6 passing.
- **Committed in:** `f775ac37`

**2. [Rule 1/3 - Bug/Blocking] `stages: []` test placeholders (Plan 150-03's TS-satisfying stubs) broke real rendering after Task 2's rewiring**
- **Found during:** Tasks 2 and 3 (full-suite verification, iterative)
- **Issue:** Plan 150-03 added `stages: []` to numerous `badge_progress` test fixtures purely to satisfy the newly-non-optional `stages` field's TypeScript shape -- those fixtures were never exercised for stage content until this plan made `resolveMemberBadgeFamilies`/`resolveRoleProgressPresentation` derive their entire output from that field. With an empty `stages` array, `heroStage` computes to `undefined` and the whole family is silently skipped (no card renders at all), and role-carousel stage ladders/tier labels come out empty/null.
- **Fix:** Added a shared `FAMILY_STAGE_FIXTURES` table (one per affected test file: `memberBadgeLabels.test.ts`, `MemberBadgeChain.test.tsx`, `members/[slug]/page.test.tsx`) with the real seven-family stage lists from this plan's own reference table, and replaced every `stages: []`/missing-`stages` fixture with the matching real list. Also added a `roleVolumeBadgeProgress(roleCode, count)` helper and wired it into every test that renders the "roles" carousel, since that carousel now needs a matching `role_volume` `badge_progress` entry (not just `roleCounts`) to resolve a tier at all.
- **Files modified:** `frontend/src/components/profile/memberBadgeLabels.test.ts`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`, `frontend/src/app/members/[slug]/page.test.tsx`
- **Verification:** Full `npx vitest run` -- 2222/2223 tests passing (the one remaining failure is pre-existing and unrelated, see below).
- **Committed in:** `9593a4b5`

**3. [Rule 3 - Blocking] `role_entry_*`/`role_volume_*` earned-badge test fixtures lost their implicit `current_count`**
- **Found during:** Task 2 (full-suite verification)
- **Issue:** The old `roleCounts`-building loop in `MemberBadgeChain.tsx` synthesized a `current_count` fallback (1 for `role_entry_*`, the tier threshold for `role_volume_*_<tier>`) when a badge fixture omitted the field. Removing that fallback (per this plan's explicit instruction, since Plan 150-04 guarantees the field is always present in production) made every earned-badges fixture without an explicit `current_count` render with count 0 and disappear from the "roles" carousel entirely.
- **Fix:** Added realistic `current_count` values (1 for `role_entry_*`, the matching tier threshold for `role_volume_*_<tier>`) to every affected fixture across `MemberBadgeChain.test.tsx`.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` -- 110/111 passing, 1 pre-existing `.skip`.
- **Committed in:** `9593a4b5`

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking/mechanical fixture rebuilds needed to keep the existing test suite green after the intended production-code behavior change).
**Impact on plan:** All three were necessary consequences of the plan's own intended change (moving stage-ladder/tier derivation to the server) landing on a test suite that had only ever been shape-satisfied, not content-verified, for the newly-load-bearing `stages` field. No scope creep -- no production behavior was added beyond what the plan specified; only test fixtures were corrected to supply the same server-shaped data added by Plans 150-02/150-03.

## Issues Encountered
- Tasks 1, 2, and 3's own `<verify>` commands are, by the plan's own explicit design, not independently satisfiable in isolation (Task 1's `buildRoleVolumeRow` output is only byte-identical once Task 3's `resolveRoleVolumePresentation` fix lands; Task 2 and Task 3 both declare the same two files in their `<files>` list). Resolved by implementing all three tasks' code together and splitting the resulting diff into three commits by final file ownership; see `key-decisions`. Cumulative, post-all-three-commits verification (full `npx vitest run`, `npx tsc --noEmit`, and the plan's own grep checks) all pass.
- `frontend/src/types/__tests__/v12-projection-contract.test.ts`'s "Phase 119 additive badge_progress contract" test fails, but this is confirmed pre-existing since Plan 150-03's commit `0497e928` (which widened `PublicMemberBadgeProgress`'s OpenAPI schema with `current_tier`/`role_code`/`stages` without updating this test's own hardcoded expected `required:` list). Neither this test file nor `shared/contracts/openapi.yaml` were touched by this plan (confirmed via `git diff`/`git log`). Logged in `deferred-items.md`, not fixed here (out of scope, pre-existing, not a 150-05 regression).

## Next Phase Readiness
- All numbered frontend computation sites from this plan's inventory are closed:
  1. `MemberProfileContent.tsx:47` (`deriveMilestoneBadge`) -- fixed, Task 1
  2. `CategoryProgressTable.tsx` `buildPointsRow` -- fixed, Task 1
  3. `CategoryProgressTable.tsx` `buildRoleVolumeRow` -- fixed, Task 1
  4. `MemberBadgeChain.tsx` role-count fallback (`ROLE_VOLUME_TIER_THRESHOLDS` guess) -- fixed, Task 2
  5. `MemberBadgeChain.tsx`'s "roles" carousel `resolveRoleProgressPresentation` call (found during planning, D-25) -- fixed, Task 2
  6. `resolveRoleVolumePresentation`'s embedded threshold in its label (found during planning, second revision, D-29) -- fixed, Task 3
- **Site 7** (`frontend/src/app/me/profile/components/AchievementBadgesCard.tsx`, the `/me/profile` badge visibility manager) is confirmed still `resolveRoleVolumePresentation`-reachable via `getMemberBadgePresentation`'s dispatch, and is intentionally left untouched here -- it is addressed by the separate, already-scheduled Plan 150-07 (wave 5, `depends_on: ["150-01", "150-05"]`), not by this plan, per D-30's explicit no-silent-exception instruction. No 8th site was found beyond the seven already on record.
- Plan 150-04's entry-tier count correction (the `role_entry_<code>` count now reflecting the real awarded amount instead of a hardcoded `1`) renders correctly through this plan's simplified `roleCounts` loop: since the loop now reads `badge.current_count` directly with no fallback, any real, non-1 entry-tier count Plan 150-04 now sends flows straight through to the rendered "N Mitwirkungen" text and to `resolveRoleProgressPresentation`'s tier derivation -- verified via `MemberBadgeChain.test.tsx`'s existing role-count assertions (e.g. "zeigt exakt 11 verdiente Rollenfamilien", the Phase-121 hero-rank matrix over `[1, 12, 108, 320, 510]`).
- `CategoryProgressTable.test.tsx:98` (`expect(screen.getAllByText("Bronze · 12+"))`) and `MemberBadgeChain.test.tsx:783` (`getByLabelText('Silber · 108+ gesperrt')`, moved from its pre-phase line 695 by earlier plans' insertions) both still pass with their **expected strings byte-for-byte unmodified** -- confirmed by grep before finalizing this summary. They exercise `buildRoleVolumeRow` and `resolveRoleProgressPresentation` respectively, two different call sites than Task 3's `resolveRoleVolumePresentation` fix, exactly as the plan predicted.
- No additional (8th) frontend threshold-literal survivor was found beyond the six sites this plan and its two context revisions already named.
- Ready for Plan 150-06 (checkpoint/Live-UAT, non-autonomous) and Plan 150-07 (the seventh site, `AchievementBadgesCard.tsx`).

---
*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Completed: 2026-09-07*

## Self-Check: PASSED

All created/modified files confirmed on disk; all three task commits (`f775ac37`, `9593a4b5`, `6e1f9959`) found in git history.

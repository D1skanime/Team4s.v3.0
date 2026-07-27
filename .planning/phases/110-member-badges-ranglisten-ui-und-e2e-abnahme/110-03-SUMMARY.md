---
phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
plan: 03
subsystem: ui
tags: [react, next.js, typescript, vitest, hero-metrics, badges, gamification]

# Dependency graph
requires:
  - phase: 110-02
    provides: PublicMemberProfile.TotalPoints (json total_points) + live role_entry_<code> badges emitted from loadPublicBadges
provides:
  - frontend/src/types/profile.ts PublicMemberProfileData.total_points (non-optional number)
  - MemberProfileHero public-view "Punkte" HeroMetrics rendering (D-02), honest for 0, never on own-profile edit view
  - memberBadgeLabels.ts 8 role_entry_* catalog entries (D-03) consumed unchanged by MemberBadgeChain
affects: [110-04 (grouped Auszeichnungen container refactor of memberBadgeLabels.ts/MemberBadgeChain.test.tsx)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Union-narrowing helper (getTotalPoints) alongside existing getAccountDisplayName/getProfileStatus helpers in MemberProfileHero.tsx, each narrowing MemberProfileData | PublicMemberProfileData via 'field' in profile"
    - "Own-profile-preview DTO converters (OwnHiddenProfilePreview.tsx toPublicProfile) default fields absent from the own-profile DTO to a safe empty/zero value, documented inline — total_points follows the same convention already used for public_badges"

key-files:
  created: []
  modified:
    - frontend/src/types/profile.ts
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx
    - frontend/src/app/members/[slug]/page.test.tsx

key-decisions:
  - "getTotalPoints returns number | null (not a default 0) so isPublicView && totalPoints !== null gates rendering — the own-profile edit view (MemberProfileData, no total_points field) never renders the metric, matching D-02's own-profile exclusion"
  - "OwnHiddenProfilePreview.tsx's toPublicProfile converter defaults total_points to 0 for the own-profile-preview-as-public context, mirroring the existing public_badges: [] fallback already in that file (own-profile DTO has neither field) — a Rule 3 blocking-issue fix required by this plan's type change, not a new feature"
  - "Role-entry badge catalog entries appended after the existing 9 in both MEMBER_BADGE_PRESENTATIONS and PUBLIC_MEMBER_BADGE_CATALOG, matching MemberBadgeChain's catalogWithEarnedBadges() append order — MemberBadgeChain.tsx itself was not modified per the interfaces contract"

patterns-established: []

requirements-completed: [D-02, D-03]

# Metrics
duration: ~35min
completed: 2026-07-27
---

# Phase 110 Plan 03: Hero-Punktzahl + Rollen-Einstiegs-Badges Summary

**Public member profile hero now renders an honest "Punkte" HeroMetrics value from `profile.total_points`, and the existing `MemberBadgeChain` "Auszeichnungen" catalog gained the 8 locked `role_entry_*` entries (Übersetzung/Timing/Encode/Typesetting/Qualitätsprüfung/Projektleitung/Editing/Raw-Bereitstellung) with indigo styling — zero new UI components introduced.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 (both TDD RED→GREEN)
- **Files modified:** 7

## Accomplishments
- `PublicMemberProfileData.total_points: number` (non-optional) mirrors the Go/OpenAPI field added in Plan 110-02.
- `MemberProfileHero` renders `<HeroMetrics items={[{ label: 'Punkte', value: totalPoints }]} ariaLabel="Mitglied-Punktzahl" />` only in the `isPublicView` branch, including the honest `0` case, and never on the own-profile edit view — no ranking placement ("Platz N") or breakdown anywhere.
- `memberBadgeLabels.ts` gained the 8 locked `role_entry_*` presentation + catalog entries (all `variant: 'info'`, `palette: 'indigo'`, `badge_category: 'role_entry'`), rendered through the unmodified `MemberBadgeChain` component in locked (Lock icon) or earned (real icon) state based on `earnedBadges`.
- All new German copy uses correct umlauts (`Übersetzung`, `Qualitätsprüfung`).

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1 (RED): total_points hero metric test** - `98ab83b6` (test)
2. **Task 1 (GREEN): implement total_points hero metric + fix blocking typecheck errors** - `960393b8` (feat)
3. **Task 2 (RED): role-entry badge catalog test** - `a34b31de` (test)
4. **Task 2 (GREEN): add 8 role-entry badge catalog entries** - `60928061` (feat)

_TDD Gate Compliance: both tasks show `test(...)` immediately followed by `feat(...)` — RED/GREEN gate sequence satisfied for each. No REFACTOR commit was needed._

## Files Created/Modified
- `frontend/src/types/profile.ts` - Added `total_points: number` to `PublicMemberProfileData`, sibling to `public_badges`
- `frontend/src/components/profile/MemberProfileHero.tsx` - Imported `HeroMetrics`, added `getTotalPoints` narrowing helper, rendered the metric gated on `isPublicView && totalPoints !== null`
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - `makePublicProfile` builder gained `total_points` default; new `makePrivateProfile` helper; 3 new RED→GREEN cases (real points, honest zero, own-profile never renders)
- `frontend/src/components/profile/memberBadgeLabels.ts` - Added 8 lucide-react icon imports + 8 `MEMBER_BADGE_PRESENTATIONS`/`PUBLIC_MEMBER_BADGE_CATALOG` entries
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - 2 new behavior cases (locked/earned role-entry badge) + 1 new catalog-content suite asserting all 8 codes/labels/palette
- `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` - `toPublicProfile` converter defaults `total_points: 0` (Rule 3 fix, blocking typecheck error caused by the type change)
- `frontend/src/app/members/[slug]/page.test.tsx` - Test fixture gained `total_points: 0` (Rule 3 fix, same cause)

## Decisions Made
- `getTotalPoints` returns `number | null` rather than defaulting to `0`, so the own-profile edit view (which has no `total_points` field at all) cleanly never renders the metric instead of showing a misleading `0`.
- `OwnHiddenProfilePreview.tsx`'s own-profile-preview-as-public converter defaults `total_points: 0`, following the exact same pattern already used there for `public_badges: []` (own-profile DTO doesn't carry either field) — documented inline as a known preview limitation, not silently swallowed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed two typecheck errors caused by making `total_points` non-optional**
- **Found during:** Task 1, post-implementation `npm run typecheck` verification
- **Issue:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx`'s `toPublicProfile` converter and `frontend/src/app/members/[slug]/page.test.tsx`'s test fixture both constructed `PublicMemberProfileData` object literals without `total_points`, which is now a required field — `tsc --noEmit` failed with TS2741/TS2322.
- **Fix:** Added `total_points: 0` to both (matching the existing `public_badges: []` own-profile-preview fallback convention in `OwnHiddenProfilePreview.tsx`).
- **Files modified:** `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx`, `frontend/src/app/members/[slug]/page.test.tsx`
- **Verification:** `npm run typecheck` clean; `npm run test -- "src/app/members/[slug]/page.test.tsx" MemberProfileHero` — 11/11 pass
- **Committed in:** `960393b8` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary consequence of making the new field non-optional per the plan's own instruction ("non-optional, matching the required-in-OpenAPI contract"). No scope creep — no new UI/behavior was added, only type-safety defaults.

## Issues Encountered

- A broad regression pass (`npm run test -- profile`) surfaced 2 pre-existing failures unrelated to this plan's changes: `MemberContributionFilters` empty-state test and `MyProfilePage`'s background-crop-reuse test. Confirmed via `git diff --stat` against this plan's own commits that neither test file was touched by Plan 110-03. Logged to `.planning/phases/110-member-badges-ranglisten-ui-und-e2e-abnahme/deferred-items.md` per the scope-boundary rule; not fixed in this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- D-02 and D-03 are now both fully wired end-to-end (backend from 110-02, frontend from this plan) — the public member profile hero and Auszeichnungen chain reflect real backend state.
- Plan 110-04 (grouped Auszeichnungen container, D-04) can proceed: it will refactor `memberBadgeLabels.ts` into grouped categories and touch `MemberBadgeChain.test.tsx` again — both files this plan intentionally kept as flat/additive per the explicit plan boundary note.
- Live UAT per `110-VALIDATION.md` (visiting a public profile with `total_points > 0` and one with `0`, confirming role-entry badge locked/earned states on mobile) remains a manual step outside this executor's scope (no browser tool available) — same pattern as prior Phase 110 plans.

---
*Phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme*
*Completed: 2026-07-27*

## Self-Check: PASSED

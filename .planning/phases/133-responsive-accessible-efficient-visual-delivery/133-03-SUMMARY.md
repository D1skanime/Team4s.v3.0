---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 03
subsystem: ui
tags: [css, container-queries, profile, responsive]

# Dependency graph
requires: []
provides:
  - "`.heroPanel` in profile.module.css declares `container: member-profile-hero / inline-size;`"
  - "`.heroPanel`/`.heroAvatar` responsive geometry driven by `@container member-profile-hero` instead of viewport `@media`"
  - "MemberProfileHero.test.tsx CSS-locking regression test updated to assert the `@container` rules"
affects: [member-profile, profile-page-two-column-layout]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reusable-component responsive CSS uses `container: <name> / inline-size;` on the sizing-driving element plus `@container <name> (...)` blocks, mirroring the already-shipped FocalCarousel.module.css pattern (UI-SPEC.md's 'every reusable component uses @container exclusively for its own internal responsive behavior')."

key-files:
  created: []
  modified:
    - frontend/src/components/profile/profile.module.css
    - frontend/src/components/profile/MemberProfileHero.test.tsx

key-decisions:
  - "The container declaration was placed on `.heroPanel` (the element whose grid-template-columns actually changes), not on the outer `.hero` wrapper, per the plan's explicit instruction."
  - "The full pre-existing `@media (max-width: 760px)` block — which bundles `.heroPanel`/`.heroAvatar` together with `.heroCopy`/`.heroTitleRow`/`.heroBio`/`.heroMetaLine`/`.knownForBlock`/`.heroSpecialAwardsList` min-width:0/max-width:100% overflow-safety rules in the real file (differing from the plan's simplified two-block interface snippet) — was converted as one unit to a single `@container member-profile-hero (max-width: 760px)` block, so the overflow-safety rules for hero-internal text stay in sync with the panel/avatar's own container-width-driven layout switch instead of falling out of sync at wide-viewport/narrow-container states (e.g. inside the two-column `.profilePair` layout)."

requirements-completed: [PMUI-01, PMUI-02, PMUI-03, PMUI-06]

# Metrics
duration: ~5min
completed: 2026-08-16
---

# Phase 133 Plan 03: Hero Panel @container Conversion Summary

**Converted `profile.module.css`'s `.heroPanel`/`.heroAvatar` responsive rules from viewport `@media (max-width: 1099px/760px)` to `@container member-profile-hero (...)`, so the member-profile hero resizes based on its own wrapping container instead of the browser viewport, with the existing CSS-locking regression test updated in the same change.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `.heroPanel` now declares `container: member-profile-hero / inline-size;`, making it a query container for its own inline size.
- Both `@media` blocks (`max-width: 1099px` and `max-width: 760px`) that previously drove `.heroPanel`/`.heroAvatar` compact geometry are now `@container member-profile-hero (max-width: 1099px/760px)` — every declared property/value (min-height 220px/0, grid-template-columns 120px minmax(0,1fr)/minmax(0,1fr), padding 24px/16px, avatar 120px/120px and 100px/100px) is byte-identical to the pre-conversion values.
- `profile.module.css` no longer contains any `@media (max-width: 1099px)` or `@media (max-width: 760px)` block (verified via grep — zero matches).
- `MemberProfileHero.test.tsx`'s existing `it('locks the Hero B responsive geometry and local copy-zone treatment', ...)` now asserts the `@container member-profile-hero` at-rules plus a new assertion locking the `container: member-profile-hero / inline-size` declaration itself; all other assertions in that `it(...)` and every other `it(...)`/`describe` block in the file are untouched.
- Full `MemberProfileHero.test.tsx` suite: 28/28 passing.

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert .heroPanel/.heroAvatar responsive rules to @container** - `7bd2149a` (feat)
2. **Task 2: Update the existing Hero-B CSS-locking regression test for the new @container rules** - `df5d1cf4` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/profile/profile.module.css` - `.heroPanel` gained `container: member-profile-hero / inline-size;`; both hero-scoped `@media` blocks converted to `@container member-profile-hero (...)` with identical declared values; no other selector in the file touched
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - `@media` regexes in the CSS-locking test replaced with `@container member-profile-hero` equivalents; one new assertion added for the `container:` declaration; no other test in the file modified

## Decisions Made
See `key-decisions` in frontmatter above (container placement on `.heroPanel`; merging the full 760px block including the non-`.heroPanel`/`.heroAvatar` overflow-safety selectors that were already co-located in the same `@media` block in the real file).

## Deviations from Plan

None - plan executed exactly as written. The only judgment call (converting the full 760px block including `.heroCopy`/`.heroTitleRow`/`.heroBio`/`.heroMetaLine`/`.knownForBlock`/`.heroSpecialAwardsList` alongside `.heroPanel`/`.heroAvatar`) was explicitly anticipated by the plan's own interface note: "the real file may differ slightly from the snippet — grep for `.heroPanel`/`.heroAvatar` ... do not assume the snippet is a verbatim contiguous excerpt," and stays within the plan's stated scope (these selectors were already inside the same `@media (max-width: 760px)` block being converted; leaving them behind as viewport-only `@media` would have broken the must-have truth of not introducing overflow at narrow-container/wide-viewport states).

## Issues Encountered

- Running the broader `npx vitest run src/components/profile/` (beyond this plan's own target file) surfaced 6 pre-existing failures in `MemberBadgeChain.test.tsx` (Phase 119/120/127 assertions + the already-logged TS2552/TS2322 typecheck errors) and `MembershipsSection.test.tsx` (`.membershipsList` grid-template-columns lock), none caused by this plan — confirmed via `git show HEAD~2:...profile.module.css` that the `.membershipsList` value the failing test rejects already existed before either of this plan's commits, and neither failing test file is in this plan's `files_modified`. Logged to `deferred-items.md` for whichever later Phase 133 plan (per STATE.md, 133-04/07/08/09) next touches those components; not auto-fixed per SCOPE BOUNDARY.
- `npm run typecheck` (in-container) shows only the already-documented pre-existing `MemberBadgeChain.test.tsx` errors (TS2552 `containe`/`container` typos, one TS2322 `badgeProgress` prop-shape mismatch) — no new errors from this plan's changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The member-profile hero now correctly resizes based on its own container width, satisfying PMUI-03 for the largest visible reusable block on the profile page, and is ready to render correctly inside a future narrower two-column `.profilePair` layout.
- `FocalCarousel.module.css` and `profile.module.css`'s hero rules are now both fully migrated to `@container`; remaining `@media` blocks in `profile.module.css` (`.membershipsList`, `.recentMediaGrid`, `.recentContributionCard`, `.roleTimelineEntry`, `prefers-reduced-motion`-style rules) are out of this plan's scope and available for a later Phase 133 plan per RESEARCH.md's `@media`/`@container` count table.
- Pre-existing unrelated failures in `MemberBadgeChain.test.tsx` and `MembershipsSection.test.tsx` remain open — see `deferred-items.md`.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`frontend/src/components/profile/profile.module.css` contains `container: member-profile-hero / inline-size` and two `@container member-profile-hero` blocks (verified via grep, count 2, zero remaining `@media (max-width: 1099px)`/`@media (max-width: 760px)` matches). Task commits `7bd2149a` and `df5d1cf4` verified present in `git log`. `MemberProfileHero.test.tsx` 28/28 tests passing (in-container `npx vitest run`).

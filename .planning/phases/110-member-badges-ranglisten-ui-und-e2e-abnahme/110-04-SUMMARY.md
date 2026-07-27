---
phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
plan: 04
subsystem: ui
tags: [react, next.js, typescript, vitest, badges, gamification]

# Dependency graph
requires:
  - phase: 110-03
    provides: the 8 flat role_entry_* catalog entries in memberBadgeLabels.ts + unmodified MemberBadgeChain.tsx
provides:
  - frontend/src/components/profile/memberBadgeLabels.ts MemberBadgeGroup type, group/roleCode metadata on all 17 catalog entries, MEMBER_BADGE_GROUP_LABELS + MEMBER_BADGE_GROUP_ORDER exports
  - frontend/src/components/profile/MemberBadgeChain.tsx buildMemberBadgeGroups() pure grouping/row-merge helper + category-grouped rendering of the Auszeichnungen section
affects: ["112-member-punkt-meilenstein-badges (Typ-3 volume badges can now join the Rollen group's per-role row via a single memberBadgeLabels.ts entry sharing an existing roleCode -- zero component rebuild)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure, injectable-presentation grouping function (buildMemberBadgeGroups) separated from rendering -- fixed MEMBER_BADGE_GROUP_ORDER iteration, per-group row bucketing, empty-group filtering, all unit-testable without DOM"
    - "Generic same-roleCode row merge: bucket key = presentation.roleCode ?? item.badge_code, so any future badge sharing an existing roleCode automatically joins the same row"

key-files:
  created: []
  modified:
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "Group assignment followed the plan's locked mapping table exactly: membership (founding_member, long_term_member), special (historical_leader, all_rounder, verified, and the unknown-badge fallback), progress (first_contribution, productive_bronze/silver/gold), roles (all 8 role_entry_* with matching roleCode) -- no discretion needed, table was fully specified"
  - "Layout properties (flex, scroll-snap-align) moved off .badgeStep/.badgeStepLocked onto a new .badgeRow class on the <li> per row, while .badgeStep/.badgeStepLocked became inner <span>s carrying only the --badge-accent variable -- enables a future multi-badge role row to mix earned/locked per-badge without CSS rework"

patterns-established: []

requirements-completed: [D-04]

# Metrics
duration: ~25min
completed: 2026-07-27
---

# Phase 110 Plan 04: Kategorie-gruppierter Auszeichnungen-Container Summary

**Die "Auszeichnungen"-Sektion rendert jetzt vier beschriftete Kategorie-Gruppen (Rollen, Fortschritt, Mitgliedschaft, Besondere Auszeichnungen) statt einer flachen Liste, gebaut ueber eine reine, generisch same-roleCode-mergende `buildMemberBadgeGroups`-Hilfsfunktion, sodass Phase 112s Typ-3-Volumen-Badge nur einen neuen Katalog-Eintrag braucht.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 (TDD RED -> GREEN)
- **Files modified:** 4

## Accomplishments
- `memberBadgeLabels.ts` gained `MemberBadgeGroup` type, a `group` field (and `roleCode` for the 8 role_entry_* entries) on all 17 `MEMBER_BADGE_PRESENTATIONS` entries, plus `MEMBER_BADGE_GROUP_LABELS`/`MEMBER_BADGE_GROUP_ORDER` exports. The unknown-badge fallback now also carries `group: 'special'`.
- `MemberBadgeChain.tsx` exports a new pure `buildMemberBadgeGroups()` helper: iterates the fixed `['roles', 'progress', 'membership', 'special']` order, buckets `roles` items by `roleCode ?? badge_code` into merged rows, treats every other group's items as one-badge-per-row, and omits any group with zero rows.
- The flat `<ul aria-label="Auszeichnungen">` was replaced with a `styles.groupList` wrapper rendering one labeled `<div className={styles.group}>` per non-empty group, each with an `<h3>` heading and its own `role="list"` region named after the group label.
- CSS: new `.groupList`/`.group`/`.groupTitle` rules (matching existing `--space-5`/`--space-2` token usage and the UI-SPEC's 12px/700/1.2 "Label" typography role); `.badgeRow` now owns the layout properties previously duplicated on `.badgeStep`/`.badgeStepLocked`, which became inner `<span>`s carrying only the accent-color custom property.
- All 17 real catalog badges sort into the correct groups (verified by a dedicated real-catalog test); a synthetic same-roleCode pair proves the generic row merge Phase 112 will rely on.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1 (RED): failing tests for the grouped container** - `b973b599` (test)
2. **Task 2 (GREEN): implement grouping/rendering/CSS** - `8e94da1a` (feat)

_TDD Gate Compliance: `test(...)` immediately followed by `feat(...)` -- RED/GREEN gate sequence satisfied. No REFACTOR commit was needed._

## Files Created/Modified
- `frontend/src/components/profile/memberBadgeLabels.ts` - Added `MemberBadgeGroup` type, `group`/`roleCode` fields on all 17 presentation entries, `MEMBER_BADGE_GROUP_LABELS`, `MEMBER_BADGE_GROUP_ORDER`; fallback presentation now includes `group: 'special'`
- `frontend/src/components/profile/MemberBadgeChain.tsx` - Added exported `buildMemberBadgeGroups()` pure helper; replaced the flat badge `<ul>` with grouped, labeled sections built from it; progress bar block and `SectionHeader` untouched
- `frontend/src/components/profile/MemberBadgeChain.module.css` - Added `.groupList`, `.group`, `.groupTitle`; added `.badgeRow` carrying the layout properties moved off `.badgeStep`/`.badgeStepLocked`
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - New `describe('buildMemberBadgeGroups (D-04)')` block (4 pure-function cases); new RTL case asserting the four group headings; updated the pre-existing flat-list query from `{ name: 'Auszeichnungen' }` to `{ name: 'Besondere Auszeichnungen' }` (the fallback group all three local fixture codes land in)

## Decisions Made
- Followed the plan's locked group-assignment table verbatim -- no discretion required since every badge code was already mapped to an exact group/roleCode in the plan's `<interfaces>` block.
- Kept the progress bar computed over the full flattened `visibleCatalog` (not per-group), per the plan's explicit instruction, so the "X von Y Auszeichnungen" summary still reflects the whole catalog regardless of grouping.

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria (grep checks, group counts, real-catalog sorting, roleCode merge, CSS class presence, 450-line limit) verified directly.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- D-04 is now fully implemented: the Auszeichnungen container is extensible (new families = new `MemberBadgeGroup` value + presentation entries), empty categories are hidden, and the Rollen group's row-merge is proven generic via a synthetic same-roleCode test.
- Phase 112 (point-milestone / role-volume badges, Typ 3) can add its badges as pure `memberBadgeLabels.ts` entries sharing an existing `roleCode` (for role-volume badges) or a new `group` value (for point-milestone badges) with zero `MemberBadgeChain.tsx` changes required.
- Live UAT per `110-VALIDATION.md` (visiting a public member profile, confirming four labeled groups render with correct umlauts, mobile width, and that a profile without role-entry badges hides the Rollen group) remains a manual step outside this executor's scope (no browser tool available in this session) -- same pattern as prior Phase 110 plans.

---
*Phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme*
*Completed: 2026-07-27*

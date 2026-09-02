---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 15
subsystem: ui
tags: [react, nextjs, css-modules, dashboard, design-tokens]

# Dependency graph
requires:
  - phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
    provides: "AttentionSection.tsx/.module.css rejected-own-notes lane (plan 143-14, commit b7ac77cc)"
provides:
  - "noteRevisionListSingle conditional spacing override for single-item rejected-notes groups"
  - "Zero raw hex color fallbacks in AttentionSection.module.css (var(--color-primary)/var(--text-soft) now token-only)"
affects: [dashboard, attention-section, live-uat-gap-closure]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Conditional CSS-module class applied via template-literal className when a list has exactly one item"]

key-files:
  created: []
  modified:
    - frontend/src/app/me/dashboard/components/AttentionSection.tsx
    - frontend/src/app/me/dashboard/components/AttentionSection.module.css
    - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx

key-decisions:
  - "Kept .noteRevisionList and .noteRevisionRow rules untouched; noteRevisionListSingle is append-only with a compound selector override, per plan's explicit append-only constraint"
  - "Removed raw hex fallback arguments (not just the hex value) from all 6 var(--color-primary/--text-soft, #...) occurrences, matching the real globals.css token values"

requirements-completed: ["UAT-03", "UAT-04"]

# Metrics
duration: 5min
completed: 2026-09-02
---

# Phase 143 Plan 15: Rejected-Notes Lane Spacing + Hardcoded Color Fallback Fix Summary

**Conditional `noteRevisionListSingle` CSS class shrinks the single-entry rejected-notes card footprint, and all 6 raw hex color fallbacks in `AttentionSection.module.css` are replaced with bare design tokens.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-02T08:24:00Z
- **Completed:** 2026-09-02T08:25:28Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Fixed UAT-03: a rejected-own-notes group with exactly one item now renders with reduced `margin-top` (`var(--space-1)` instead of `var(--space-3)`) and zero vertical row padding, while a 2+-item group is byte-identical to before
- Fixed UAT-04: removed all 6 raw hex fallback values (`#2f5fe3`, `#6b6b70`) from `var(--color-primary, ...)` / `var(--text-soft, ...)` declarations across the file — 4 pre-existing plus the 2 introduced by plan 143-14
- Added 2 new regression assertions proving the conditional class is present for single-item groups and absent for multi-item groups

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix UAT-03 — reduce the single-entry rejected-notes card footprint** - `b9c84b76` (fix)
2. **Task 2: Fix UAT-04 — remove all hardcoded color fallback values from AttentionSection.module.css** - `69c0b5bf` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/app/me/dashboard/components/AttentionSection.tsx` - Applies `styles.noteRevisionListSingle` conditionally to the rejected-notes `<ul>` when `group.items.length === 1`
- `frontend/src/app/me/dashboard/components/AttentionSection.module.css` - Adds `.noteRevisionListSingle` + compound `.noteRevisionListSingle .noteRevisionRow` override rules; removes all raw hex fallback arguments from `var(--color-primary, ...)`/`var(--text-soft, ...)`
- `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` - New test proving `noteRevisionListSingle` is present for a 1-item group and absent for a 2-item group

## Decisions Made
- Overrode only `margin-top` on `.noteRevisionListSingle` (not the full margin shorthand) and only vertical padding on the compound `.noteRevisionListSingle .noteRevisionRow` selector, preserving horizontal padding/click-target width exactly as the plan's interface block specified
- Left `.noteRevisionList`, `.noteRevisionRow`, and `.noteGroupHeader` untouched — append-only CSS change, no redesign
- Token-fallback removal (Task 2) was scoped exactly to `AttentionSection.module.css` per the plan; other files with the same hardcoded-fallback pattern are explicitly out of this plan's scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Both UAT-03 and UAT-04 findings from `143-UAT.md` are closed. No blockers for the remaining Wave 1 gap-closure plans (143-16, 143-17), which touch different files.

## Self-Check: PASSED

- FOUND: frontend/src/app/me/dashboard/components/AttentionSection.tsx
- FOUND: frontend/src/app/me/dashboard/components/AttentionSection.module.css
- FOUND: frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
- FOUND commit: b9c84b76
- FOUND commit: 69c0b5bf

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-02*

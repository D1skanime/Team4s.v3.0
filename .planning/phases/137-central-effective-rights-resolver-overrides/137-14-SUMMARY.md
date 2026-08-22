---
phase: 137-central-effective-rights-resolver-overrides
plan: 14
subsystem: ui
tags: [react, typescript, authorization, fansub, capabilities, gap-closure]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: FansubBasicInfoTab.tsx, fansubEditAccess.ts capability-gating conventions from earlier 137 plans (137-09..137-13)
provides:
  - canEditFansubBranding(isPlatformAdmin, capabilities) helper mirroring the backend fansub_group.edit condition
  - Logo/Banner section in FansubBasicInfoTab.tsx now fully hidden (not just disabled) for actors lacking can_edit_group
affects: [fansub-admin-edit, fansub-media-upload, gap-closure-137]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UI visibility gates mirror backend authorization conditions exactly (1:1 capability flag mapping), not just disabling controls a user cannot actually use"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx

key-decisions:
  - "canEditFansubBranding checks only capabilities.can_edit_group (plus isPlatformAdmin) — no fallback to can_update_group_media — exactly mirroring backend's permissions.ActionFansubGroupEdit gate for kind=logo/banner uploads"
  - "The branding section is removed from the DOM entirely (conditional render) rather than merely disabled, per the user's locked GAP-08 decision that rights (fansub_group.edit) stay fansub_lead/project_lead-only"
  - "canEditMedia (can_update_group_media-based) was fully removed from FansubBasicInfoTab.tsx since it had no other use in the file besides gating this section"

patterns-established:
  - "New capability-gating helpers in fansubEditAccess.ts follow the exact isPlatformAdmin-first, capabilities-second signature and isPlatformAdmin || Boolean(capabilities?.FLAG) body used by canViewReleaseContributors/canManageReleaseContributors/etc."

requirements-completed: [QUAL-03]

# Metrics
duration: 5min
completed: 2026-08-22
---

# Phase 137 Plan 14: Hide Logo/Banner Upload for Non-can_edit_group Actors (GAP-08 Closure) Summary

**Closed GAP-08 (UAT-137-02) by adding `canEditFansubBranding`, a helper that mirrors the backend's `fansub_group.edit` check exactly, and using it to fully hide (not just disable) the "Logo und Banner" section for co_leader/founder/gfxler/techadmin-shaped roles that hold `can_update_group_media` but not `can_edit_group`.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-22T01:57:07Z
- **Completed:** 2026-08-22T01:58:36Z
- **Tasks:** 2 completed (both TDD: RED then GREEN)
- **Files modified:** 4

## Accomplishments
- Added `canEditFansubBranding(isPlatformAdmin, capabilities)` to `fansubEditAccess.ts`, returning `isPlatformAdmin || Boolean(capabilities?.can_edit_group)` — the exact frontend projection of the backend's `permissions.ActionFansubGroupEdit` check used for `kind=logo`/`kind=banner` uploads.
- Wired the new helper into `FansubBasicInfoTab.tsx`: the entire "Logo und Banner" `<section>` (heading + both `MediaUpload` controls) is now conditionally rendered, fully absent from the DOM when `canEditBranding` is `false`, instead of merely being `disabled`.
- Removed the now-unused `canEditMedia` (`can_update_group_media`-based) derivation, since it had no other purpose in the file.
- `fansub_lead`/`project_lead` (who hold `can_edit_group`) and Platform-Admin continue to see and use the section unchanged; `co_leader`/`founder`/`gfxler`/`techadmin` (who hold `can_update_group_media` but not `can_edit_group`) no longer see the upload controls at all and therefore cannot trigger the backend's 403.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN per task):

1. **Task 1 RED: failing tests for canEditFansubBranding** - `98fd10a1` (test)
2. **Task 1 GREEN: canEditFansubBranding helper** - `627f4c2e` (feat)
3. **Task 2 RED: failing visibility tests for Logo und Banner** - `3cb52c52` (test)
4. **Task 2 GREEN: wire canEditFansubBranding, hide section** - `0772f6be` (feat)

_Note: TDD tasks produced two commits each (test -> feat); no refactor commit was needed._

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts` - Added `canEditFansubBranding` export, colocated after `canEditReleaseNotes`
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts` - Added 5 new unit-test cases for `canEditFansubBranding` inside the existing `describe("fansub edit access", ...)` block
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx` - Imported `canEditFansubBranding`, added `canEditBranding` derived boolean, wrapped the branding `<section>` in a `{canEditBranding ? (...) : null}` conditional, replaced both `MediaUpload` `disabled` expressions' `!canEditMedia` with `!canEditBranding`, removed the unused `canEditMedia` declaration
- `frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx` - Extended `renderTab` with an optional `isPlatformAdmin` parameter (default `false`); added 3 new visibility test cases (hidden for co_leader-shaped set, shown for `can_edit_group`, shown for `isPlatformAdmin`)

## Decisions Made
- Followed the plan's exact interface contract: `canEditFansubBranding` checks only `can_edit_group`, with no substitute or fallback capability, matching the backend's single authoritative condition.
- Confirmed via full-file read that `canEditMedia` had no other reference in `FansubBasicInfoTab.tsx` before removing its declaration, as instructed by the plan.

## Deviations from Plan

None - plan executed exactly as written. Both tasks followed the plan's exact interfaces, file locations, and TDD RED/GREEN sequence; all acceptance criteria greps matched expected values on first attempt.

## Self-Check Inputs (see Self-Check section below)
- Verified `canEditFansubBranding` export exists exactly once in `fansubEditAccess.ts`
- Verified `can_update_group_media` no longer appears anywhere in `fansubEditAccess.ts`
- Verified `canEditMedia` no longer appears anywhere in `FansubBasicInfoTab.tsx`
- Verified `FansubEditHeaderCard.tsx` has zero diff (untouched, as required)

## Issues Encountered
None.

## TDD Gate Compliance
Both tasks followed the mandatory RED -> GREEN sequence, confirmed in git log:
- Task 1: `98fd10a1` (test, RED — 5 new tests failed with `canEditFansubBranding is not a function`) -> `627f4c2e` (feat, GREEN — all 15 tests in `fansubEditAccess.test.ts` passed)
- Task 2: `3cb52c52` (test, RED — 1 new test failed, section still rendered) -> `0772f6be` (feat, GREEN — all 8 tests in `FansubBasicInfoTab.test.tsx` passed)

No REFACTOR commit was needed for either task.

## Next Phase Readiness
GAP-08 (UAT-137-02) is closed. This was the final gap-closure plan for phase 137's UAT round covering GAP-07 and GAP-08; the phase's remaining verification is the combined test run and `git diff --name-only` scope check performed below.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Plan: 14*
*Completed: 2026-08-22*

## Self-Check: PASSED

All 4 declared files plus this SUMMARY.md exist on disk; all 4 task commit hashes (98fd10a1, 627f4c2e, 3cb52c52, 0772f6be) are present in git log.

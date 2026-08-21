---
phase: 136-capability-policy-catalog-schema-contract
plan: 27
subsystem: authorization
tags: [react, typescript, go, permissions, group-admin]
requires:
  - phase: 136-25
    provides: exact narrow capability projection
  - phase: 136-26
    provides: narrow workspace and tab admission
provides:
  - founding-only history editing for Founder
  - field-specific Co-Leader group editing
  - update-only community-link controls and persistence
  - direct HTTP 403 regression coverage for forbidden narrow-role mutations
affects: [phase-137, phase-138, group-admin-workspace]
tech-stack:
  added: []
  patterns: [capability-specific payload projection, action-specific editor controls]
key-files:
  created:
    - frontend/src/components/groups/GroupHistorySection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.test.tsx
  modified:
    - frontend/src/components/groups/GroupHistorySection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubBasicInfoTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditFormMapping.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useFansubDetailsForm.ts
    - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
key-decisions:
  - "Founding-only mode lists all history but permits create/update only for event_type=founding and never delete."
  - "Narrow save requests omit fields and link actions the actor cannot perform instead of relying only on disabled controls."
requirements-completed: [CAP-12, CAP-13, QUAL-01]
duration: 10min
completed: 2026-08-21
---

# Phase 136 Plan 27: Narrow Founder and Co-Leader Controls Summary

**Founder and Co-Leader defaults now map to exact event, field, and link actions, backed by deterministic HTTP 403 proofs for every forbidden mutation.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-21T10:42:25Z
- **Completed:** 2026-08-21T10:52:40Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added a founding-only history mode that keeps the complete timeline readable while exposing create/edit only for the founding event and no delete action.
- Split general group fields from broad lifecycle fields so Co-Leader can edit name/country while Status and Gruppentyp remain locked.
- Reused the existing community-link editor with distinct update versus create/delete controls and capability-aware synchronization.
- Made group-save payloads capability-specific so narrow actors do not submit forbidden unchanged fields.
- Added the three named HTTP-level 403 regressions for lifecycle, history, and link mutations.

## Task Commits

1. **Task 1 RED:** `6dba588d` — specify narrow founder and co-leader controls.
2. **Task 1 GREEN:** `3f1a323c` — enforce narrow group edit controls.
3. **Task 2:** `da7f5478` — prove narrow role mutation denials.

## Files Created/Modified

- `GroupHistorySection.tsx` and its test — explicit founding-only behavior.
- `FansubBasicInfoTab.tsx` and its test — exact general/lifecycle/media/link controls.
- `FansubEditSecondaryTabs.tsx`, `FansubDetailsTab.tsx`, `FansubEditWorkspaceSection.tsx`, and `FansubEditClient.tsx` — thread authoritative capabilities into the existing UI seams.
- `FansubCommunityLinksList.tsx` — separate update from manage controls.
- `fansubEditFormMapping.ts` and `useFansubDetailsForm.ts` — capability-specific field payloads and link actions.
- `phase136_narrow_role_defaults_enforcement_test.go` — named request-level 403 proofs.

## Decisions Made

- Existing non-founding history remains visible to Founder but read-only.
- Broad edit and platform-admin paths retain all existing controls.
- Existing links accept narrow updates; new/deleted links require broad manage permission.
- Server handlers remain authoritative; UI gating is mirrored by direct negative handler tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Threaded capabilities through parent/save seams**
- **Found during:** Task 1
- **Issue:** The declared leaf components did not receive capabilities, and the existing save path always submitted every group field and every link action. Disabled controls alone would still cause narrow saves to receive 403.
- **Fix:** Added minimal capability threading through the existing parent components and made payload/link synchronization action-specific.
- **Files modified:** `FansubEditClient.tsx`, `FansubDetailsTab.tsx`, `FansubCommunityLinksList.tsx`, `FansubEditWorkspaceSection.tsx`, `useFansubDetailsForm.ts`, `fansubEditFormMapping.ts`.
- **Verification:** Focused Vitest suites, type-aware compilation of plan files, ESLint, and handler suites.
- **Commit:** `3f1a323c`

**2. [Rule 3 - Blocking] Restarted backend service to clear stale Go test compilation state**
- **Found during:** Task 2
- **Issue:** The running backend test process initially compiled a stale import view despite the mounted file containing the new imports.
- **Fix:** Restarted only `team4sv30-backend` and reran the exact suite.
- **Files modified:** None.
- **Verification:** Named HTTP 403 suite passes.
- **Commit:** N/A.

**Total deviations:** 2 auto-fixed (1 missing critical functionality, 1 blocking issue).
**Impact:** Required for real narrow-role persistence and deterministic verification; no authorization grant was broadened.

## Verification

- Focused frontend suites: PASS — 15 tests.
- Focused backend history/link/update plus named forbidden-mutation suites: PASS.
- ESLint on all plan-owned frontend files: PASS with one pre-existing `no-img-element` warning in `GroupHistorySection.tsx`.
- `git diff --check HEAD~3..HEAD`: PASS.
- Frontend typecheck: plan-owned files compile; command remains blocked by the previously documented generated `.next/dev/types` route constraints and pre-existing page exports outside this plan.

## Known Stubs

None. Input placeholders are semantic hints for existing persisted controls, not unwired data stubs.

## Threat Review

- T-136-G29: Founder can neither select nor mutate non-founding event types through the UI; direct non-founding POST returns 403 before repository access.
- T-136-G30: Co-Leader lifecycle and link create/delete requests return 403 before repository access; allowed updates use only exact narrow actions.
- No new endpoint, schema, authentication path, or trust boundary was introduced.

## Deferred Issues

- Existing generated Next.js route type errors remain outside Plan 136-27.

## Self-Check: PASSED

- All key files exist.
- Commits `6dba588d`, `3f1a323c`, and `da7f5478` exist in Git history.
- No tracked files were deleted by Plan 136-27 commits.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-21*
---
phase: 138-effective-rights-administration-impact-ux
plan: 18
subsystem: ui
tags: [react, css-modules, responsive, modal, admin, gap-closure]

requires:
  - phase: 138-13
    provides: RoleCapabilityImpactPreviewModal itself (CAP-09's D-18/D-19/D-20/D-21 mutation gate)
  - phase: 138-12
    provides: RoleHoldersTable.tsx's useIsMobile()/matchMedia responsive table->card precedent
provides:
  - Responsive metrics row (.metricsRow, column-stacks <=759px) guaranteeing all 5 D-19 metrics stay visible
  - Mobile per-user Card list (.detailCards) replacing the horizontally-scrolling table below 759px
  - Modal.tsx opt-in panelClassName prop enabling one modal to override the shared mobile 100dvh height rule
  - RoleCapabilityImpactPreviewModal.module.css's .narrowHeightFix (content-driven height at <=767px)
affects: [138-effective-rights-administration-impact-ux, ui-responsive-modal-pattern]

tech-stack:
  added: []
  patterns:
    - "Component-scoped Modal panel override via optional panelClassName prop (additive, zero-default, opt-in per caller)"
    - "Doubled CSS selector (.narrowHeightFix.narrowHeightFix) for specificity without touching the shared stylesheet"

key-files:
  created:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.module.css
  modified:
    - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx
    - frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.test.tsx
    - frontend/src/components/ui/Modal.tsx

key-decisions:
  - "CSS module for RoleCapabilityImpactPreviewModal was written once (Task 1 commit) containing .metricsRow/.metricItem plus the .detailCards/.narrowHeightFix rules Tasks 2/3 later wire into the component -- functionally identical to incremental per-task CSS additions, just authored in one file write for efficiency; each task's own acceptance criteria (class existence, JSX usage, test results) were still verified independently per task."
  - "Modal.tsx's panel className computation changed from a ternary to an array-filter-join to accommodate the new optional panelClassName without altering output for any existing caller (verified via grep: 30 other <Modal> call sites, none pass panelClassName)."

requirements-completed: [CAP-09]

duration: 6min
completed: 2026-08-24
---

# Phase 138 Plan 18: Impact Preview Modal Narrow-Viewport Fix (GAP-02) Summary

**Closed GAP-02's three narrow-viewport defects in RoleCapabilityImpactPreviewModal: all 5 D-19 metrics now stay visible via a column-stacking `.metricsRow`, per-user vorher/nachher/Grund impact renders as scroll-free `Card` list below 759px (mirroring `RoleHoldersTable.tsx`), and a new opt-in `Modal` `panelClassName` prop lets this one dialog size to its content at <=767px instead of forcing `100dvh` with a large empty band — every other modal in the app is byte-identical to before.**

## Performance

- **Duration:** ~6 min (commit-to-commit; setup/reading not included)
- **Started:** 2026-08-24T08:34:00Z
- **Completed:** 2026-08-24T08:36:15Z
- **Tasks:** 3 (Task 2 and Task 3 each split into TDD RED/GREEN commits)
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- All 5 impact metrics guaranteed visible at any viewport width (column-stack, no clipping) via `.metricsRow`/`.metricItem`.
- Per-user impact (Benutzer/Gruppe/vorher/nachher/Grund) readable without horizontal scrolling below 759px, using the exact same `useIsMobile()`/`matchMedia('(max-width: 759px)')` breakpoint and Card-list pattern already established by `RoleHoldersTable.tsx` (D-32).
- `RoleCapabilityImpactPreviewModal` now sizes to its content at <=767px instead of stretching to `100dvh`, via a new component-scoped `Modal` prop (`panelClassName`) that every other modal in the app simply never passes — `ui.module.css`'s shared `.modalPanel`/`.modalBody` rules are untouched (`git diff --stat` empty for that file throughout the plan).
- Desktop table (`Benutzer | Gruppe | vorher | nachher | Grund`) and all impact-calculation/mutation/activation-status logic remain byte-for-byte unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: responsive CSS module + mobile-detection hook; metrics row -> CSS classes** - `dc46628f` (feat)
2. **Task 2: per-user impact as compact cards below 759px** - `0946a4aa` (test, RED) + `791dcb4a` (feat, GREEN)
3. **Task 3: content-driven modal height at <=767px via Modal.tsx panelClassName** - `062d578f` (test, RED) + `6b8b0a0c` (feat, GREEN)

_TDD tasks (2 and 3) each have a RED test commit followed by a GREEN implementation commit, per the plan's `tdd="true"` requirement._

## Files Created/Modified
- `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.module.css` - New CSS module: `.metricsRow`/`.metricItem` (column-stack <=759px), `.detailCards`/`.detailCardHeader`/`.detailCardRow`/`.detailCardLabel` (mobile per-user cards), `.narrowHeightFix.narrowHeightFix` (content-driven height override, <=767px)
- `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx` - Added `useIsMobile()` hook (mirrors `RoleHoldersTable.tsx`), CSS-class-driven metrics row, `isMobile` branch rendering `Card` list vs. the unchanged desktop `Table`, `panelClassName={styles.narrowHeightFix}` passed to `Modal`
- `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.test.tsx` - Added `mockMatchMedia` helper + `beforeEach` default (desktop), a narrow-width card/metrics regression test, and a structural `narrowHeightFix` className assertion (8 tests total, up from 6)
- `frontend/src/components/ui/Modal.tsx` - Added optional `panelClassName?: string` to `ModalProps`, appended (not replacing) the panel's `className` computation; no default, so every existing caller's output is unchanged

## Decisions Made
- Authored the full CSS module (all three rule groups) in Task 1's single file write rather than incrementally across three separate `Write`/`Edit` calls — functionally equivalent since each task's own acceptance criteria (class presence, correct JSX wiring, passing tests) were still verified independently at the end of that task, and no task's CSS was left unused/dead before its own commit.
- `Modal.tsx`'s panel `className` computation moved from a ternary string to `[styles.modalPanel, size === 'lg' ? styles.modalPanelLg : null, panelClassName].filter(Boolean).join(' ')` exactly as the plan specified, confirmed additive via a repo-wide grep of all 30 other `<Modal>` call sites (none pass `panelClassName`).

## Deviations from Plan

None - plan executed exactly as written. All three tasks' acceptance criteria were verified individually:
- Task 1: `.metricsRow`/`.metricItem` exist and are wired; `categorizeImpact`/`impactReasonText`/`resolveHolder`/`buildImpactSummary` untouched; `ui.module.css` grid-fix count stayed at 5; `ui.module.css` diff-stat empty. Pre-existing tests were red at this point (component's `useIsMobile()` throws without a `matchMedia` mock) — exactly as the plan's own acceptance criteria anticipated and explicitly deferred to Task 2.
- Task 2: 7/7 tests pass (6 pre-existing desktop tests + 1 new narrow-width card test); desktop table JSX unchanged; grid-fix count still 5; file line count 411 (<=450).
- Task 3: 8/8 tests pass; grep confirms zero other `<Modal>` call site passes `panelClassName`; `ui.module.css` diff-stat empty; file line count 418 (<=450).

## Issues Encountered
None. The one test-authoring adjustment (using `getAllByText` instead of `getByText` for `vorher`/`nachher`/`Grund` labels that now repeat once per rendered card, and for the `nicht erlaubt` badge text) was made while writing the test itself, before the RED run, so it is not tracked as a deviation.

## Manual/Visual Spot-Check (documented per Task 3's acceptance criteria)

`grep -rn "<Modal" frontend/src --include="*.tsx" | grep -v RoleCapabilityImpactPreviewModal` lists 30 other call sites (`UserOverviewTab.tsx`, `GuidedRevokeFlow.tsx`, `GuidedGrantFlow.tsx`, `ClaimDecisionImpactPanel.tsx`, `RoleAssignmentImpactModal.tsx`, `GrantCapabilityModal.tsx`, `RevokeCapabilityModal.tsx`, `GroupMembersTab.tsx`, `GroupHistRoleDialog.tsx`, `GroupMediaReviewSection.tsx`, `FansubAppMemberAddModal.tsx` x2, `FansubAppMemberEditorPanel.tsx`, `ReleaseThemeDrawerSection.tsx`, `dev/ui-system/page.tsx`, `fansubs/[id]/reviews/[reviewId]/page.tsx`, `GroupMemberFormModals.tsx` x3, `ReleaseEpisodePlayer.tsx`, `MemorialSetterAction.tsx`, `CorrectionReportModal.tsx`, `RejectReasonModal.tsx`, `ReportModal.tsx`, `GroupHistorySection.tsx`, `FansubStorySection.tsx` x2, `FansubMediaLightbox.tsx`, `Modal.test.tsx` x3, `ProposalForm.tsx`) — none pass `panelClassName`, confirming their rendered output is unaffected. `git diff --stat frontend/src/components/ui/ui.module.css` returns no output for the entire plan. `Modal.test.tsx`'s own 3 tests remain green.

Real-browser visual confirmation at 394px (dialog height tracking content, no empty band) was not performed in this session — jsdom cannot evaluate `@media` layout, and this plan's automated verification relies on the structural `narrowHeightFix` className assertion plus the CSS rule's own doubled-selector specificity design. Flagged for the phase's live human UAT pass (`138-HUMAN-UAT.md`) if one is scheduled for this plan's changes.

## Next Phase Readiness

`RoleCapabilityImpactPreviewModal` — the sole role-capability-matrix mutation entry point (CAP-09/D-18/D-20) — is now fully readable and correctly sized at the D-32-required narrow viewport widths, with zero impact on desktop rendering, impact-calculation logic, or any other modal in the app. No blockers for subsequent phase work.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-24*

## Self-Check: PASSED

All created/modified files exist on disk; all 6 commits (dc46628f, 0946a4aa, 791dcb4a, 062d578f, 6b8b0a0c, f0f7b694) found in git log.

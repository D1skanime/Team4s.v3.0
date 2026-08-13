---
phase: 07-generic-upload-and-linking
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, vitest, admin-upload, anime-assets, create-flow]
requires:
  - phase: 07-generic-upload-and-linking
    provides: frontend typed upload helpers and generic anime upload seam from 07-02
provides:
  - extracted create-route asset-kind config and post-create upload/link orchestration
  - manual create staging controls for banner, logo, background, and background_video
  - regression coverage for create-route non-cover staging and additive background linking
affects: [admin-anime-create, phase-08-lifecycle-cleanup]
tech-stack:
  added: []
  patterns:
    - config-driven create-route upload orchestration keyed by anime asset kind
    - extracted manual-create asset staging panel hosted by the workspace shell
key-files:
  created:
    - frontend/src/app/admin/anime/create/createAssetUploadPlan.ts
    - frontend/src/app/admin/anime/create/createAssetUploadPlan.test.ts
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateAssetUploadPanel.tsx
  modified:
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx
decisions:
  - "Create-route staging now uses one asset-kind plan so post-create linking stays typed and background remains additive."
  - "ManualCreateWorkspace stays a shell while ManualCreateAssetUploadPanel owns the visible cover and non-cover staging controls."
metrics:
  duration: 25 min
  completed: 2026-04-04
  tasks: 2
  files: 6
---

# Phase 07 Plan 04: Create Upload Reachability Summary

**Generic create-route staging and post-create upload/link orchestration for non-cover anime assets through the verified V2 seam**

## Performance

- **Duration:** 25 min
- **Started:** 2026-04-04T21:49:09Z
- **Completed:** 2026-04-04T22:14:09Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added a RED regression net for the create route so banner, logo, background, and background-video reachability is pinned alongside the existing cover contract.
- Extracted `createAssetUploadPlan.ts` to own create-route asset labels, upload alias mapping, and typed post-create link behavior.
- Moved visible staging controls into `ManualCreateAssetUploadPanel.tsx` and reduced `ManualCreateWorkspace.tsx` to hosting the extracted panel plus the existing draft form shell.
- Updated `create/page.tsx` to stage non-cover manual files, upload them after create, and preserve additive `background` semantics while singular slots replace.

## Task Commits

1. **Task 1: Add failing create-route regression coverage for staged non-cover assets** - `8cc2d58` (test)
2. **Task 2: Implement staged create-route upload and linking for non-cover manual assets** - `62a8a73` (feat)

## Files Created/Modified

- `frontend/src/app/admin/anime/create/createAssetUploadPlan.ts` - Extracted create-route asset config, staging helper, and generalized post-create upload/link flow.
- `frontend/src/app/admin/anime/create/createAssetUploadPlan.test.ts` - Added focused helper coverage for full asset reachability and additive background linking.
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateAssetUploadPanel.tsx` - Added operator-facing staging controls for cover, banner, logo, background, and background_video.
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - Converted the workspace to a shell that hosts the extracted upload panel.
- `frontend/src/app/admin/anime/create/page.tsx` - Rewired create to stage manual assets through extracted helpers and upload them after record creation.
- `frontend/src/app/admin/anime/create/page.test.tsx` - Added rendered-surface assertions for non-cover create controls while preserving the cover regression contract.

## Decisions Made

- Kept create-route post-create linking in one helper module so the slot mapping stays aligned with the phase-02 typed client seam instead of drifting back into inline branches.
- Treated `background` as the only additive staged asset list on create; `cover`, `banner`, `logo`, and `background_video` remain single staged replacements.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first helper implementation captured link functions inside static config, which blocked Vitest spies; the orchestration was adjusted to resolve the typed link helper at upload time without changing runtime behavior.
- `state record-metric` could not append execution metrics because the current `STATE.md` has no `Performance Metrics` section; position, decisions, and session metadata were still updated.

## User Setup Required

None for code changes.

## Known Stubs

None.

## Next Phase Readiness

- Create now exposes the same in-scope asset kinds as the generic upload seam and can upload/link them after anime creation.
- Manual browser verification from the plan was not run in this execution because no local create session was driven interactively here.

## Self-Check: PASSED

- Found `.planning/phases/07-generic-upload-and-linking/07-04-SUMMARY.md`
- Found commit `8cc2d58`
- Found commit `62a8a73`

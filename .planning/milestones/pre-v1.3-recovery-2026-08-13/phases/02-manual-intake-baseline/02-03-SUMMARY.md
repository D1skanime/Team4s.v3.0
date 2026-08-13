---
phase: 02-manual-intake-baseline
plan: 03
subsystem: ui
tags: [react, nextjs, vitest, manual-create, admin-anime]
requires:
  - phase: 02-01
    provides: manual intake entry and reusable draft-state seam
  - phase: 02-02
    provides: backend title-plus-cover create enforcement
provides:
  - preview-before-save manual create workspace on the shared anime editor shell
  - create-shell readiness gating for empty, incomplete, and ready draft states
  - regression coverage for create redirect, draft cover upload, and persisted edit-cover seam
affects: [phase-02-manual-intake-baseline, admin-create, anime-editor-shell]
tech-stack:
  added: []
  patterns: [shared-shell manual create flow, save-bar readiness gating, draft preview before persistence]
key-files:
  created:
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreatePreview.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateValidationSummary.tsx
    - .planning/phases/02-manual-intake-baseline/02-03-SUMMARY.md
  modified:
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/components/shared/AnimeEditorShell.tsx
    - frontend/src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx
    - frontend/src/app/admin/anime/hooks/useAnimeEditor.ts
    - frontend/src/app/admin/anime/types/admin-anime-editor.ts
    - frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts
    - frontend/src/app/admin/anime/create/page.test.tsx
key-decisions:
  - "Manual create now stays fully draft-only until explicit save, with a live preview and validation summary inside the shared editor shell."
  - "The shared save bar now respects an explicit canSubmit readiness gate instead of dirty-state alone."
  - "Successful create hands off directly to /admin/anime/{id}/edit; the old ?context redirect path is removed from create."
requirements-completed: [INTK-02, INTK-04, ASST-04]
completed: 2026-03-24
---

# Phase 02 Plan 03: Manual Create Workspace Summary

The manual create route now behaves like a true preview-before-save draft. Admins can review title and cover in a lightweight preview, see when the draft is empty vs. incomplete vs. ready, upload the cover before persistence, and land on `/admin/anime/{id}/edit` after a successful create.

## Accomplishments

- Refactored [`page.tsx`](C:\Users\admin\Documents\Team4s\frontend\src\app\admin\anime\create\page.tsx) into a manual draft flow with exported helpers for redirect and pre-save cover upload.
- Added a dedicated ManualCreate workspace with preview and validation summary components under [`ManualCreate`](C:\Users\admin\Documents\Team4s\frontend\src\app\admin\anime\components\ManualCreate).
- Extended the shared editor controller/shell so create can disable the CTA until readiness is true without breaking the edit surface.
- Locked the persisted edit-cover upload seam with [`useAnimePatchMutations.test.ts`](C:\Users\admin\Documents\Team4s\frontend\src\app\admin\anime\hooks\internal\anime-patch\useAnimePatchMutations.test.ts).

## Verification

- `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/components/shared/AnimeEditorShell.test.tsx src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`
- Result: 3 test files passed, 9 tests passed.

## Notes

- The wave-2 executor only completed the initial failing-test commit before stalling, so the remaining implementation was finished in the main execution flow using the same Phase 2 plan constraints.
- No Jellyfin UI, provenance controls, relation controls, or non-cover upload work were pulled into this plan.

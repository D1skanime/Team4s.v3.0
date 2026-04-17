---
phase: quick
plan: 260417-qtu
subsystem: frontend/admin-anime-create
tags: [ux, asset-upload, clickable-slots, hover-overlay]
dependency_graph:
  requires: []
  provides: [clickable-empty-asset-slots, upload-hover-overlay]
  affects: [CreateAssetCard, CreateAssetSection]
tech_stack:
  added: []
  patterns: [conditional-prop-driven-interactivity, css-hover-overlay]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/anime/create/CreateAssetCard.tsx
    - frontend/src/app/admin/anime/create/CreateAssetSection.tsx
    - frontend/src/app/admin/anime/create/page.module.css
decisions:
  - onEmptyClick only active when slot is empty; filled slots retain no click affordance on the preview area
  - Upload icon overlay uses absolute positioning inside the empty div so existing text remains visible
  - Adder slot intentionally excluded from onEmptyClick pattern
metrics:
  duration: 10min
  completed: 2026-04-17
  tasks_completed: 2
  files_modified: 3
---

# Quick Task 260417-qtu: Asset Upload UX — leere Slots klickbar und Buttons klar beschriften

**One-liner:** Added `onEmptyClick` prop to `CreateAssetCard` with CSS hover-upload-overlay; wired Cover/Banner/Logo/Background-Video empty slots to trigger `onOpenFileDialog` on click.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | CreateAssetCard onEmptyClick-Prop + CSS-Klasse | 2fc17a6 | CreateAssetCard.tsx, page.module.css |
| 2 | CreateAssetSection — onEmptyClick verdrahten | 136161b | CreateAssetSection.tsx |

## What Was Built

- `CreateAssetCard` now accepts an optional `onEmptyClick?: () => void` prop.
- When `onEmptyClick` is set, the empty slot div renders with:
  - `assetCardEmptyClickable` CSS class (pointer cursor, purple hover tint, relative positioning)
  - `onClick`, `role="button"`, `tabIndex={0}`, and keyboard handler (Enter/Space)
  - An `Upload` icon (lucide-react) absolutely centered inside, visible on hover via `assetCardEmptyUploadIcon`
- `CreateAssetSection` passes `onEmptyClick={() => onOpenFileDialog(kind)}` for Cover, Banner, Logo, and Background-Video slots — only when those slots are currently empty.
- Adder slot left unchanged.
- Three new CSS classes added to `page.module.css`: `.assetCardEmptyClickable`, `.assetCardEmptyClickable:hover`, `.assetCardEmptyUploadIcon`, `.assetCardEmptyClickable:hover .assetCardEmptyUploadIcon`.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check

- [x] `CreateAssetCard.tsx` modified and committed (2fc17a6)
- [x] `page.module.css` modified and committed (2fc17a6)
- [x] `CreateAssetSection.tsx` modified and committed (136161b)
- [x] TypeScript: no errors in modified files (`npx tsc --noEmit` shows no errors for CreateAssetCard or CreateAssetSection)
- [x] Pre-existing TypeScript errors in unrelated test files are out of scope and unchanged

## Self-Check: PASSED

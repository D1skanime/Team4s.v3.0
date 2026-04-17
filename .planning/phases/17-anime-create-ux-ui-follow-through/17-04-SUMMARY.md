---
phase: 17
plan: "04"
subsystem: frontend/admin/create
tags: [ux, assets, components, create-page, jellyfin]
dependency_graph:
  requires: [17-01, 17-02, 17-03]
  provides: [CreateAssetCard, CreateAssetSection, unified-asset-section-2]
  affects: [frontend/src/app/admin/anime/create]
tech_stack:
  added: []
  patterns: [unified-asset-card-grid, source-badge-per-slot, manual-jellyfin-coexistence]
key_files:
  created:
    - frontend/src/app/admin/anime/create/CreateAssetCard.tsx
    - frontend/src/app/admin/anime/create/CreateAssetSection.tsx
  modified:
    - frontend/src/app/admin/anime/create/page.module.css
    - frontend/src/app/admin/anime/create/page.tsx
decisions:
  - CreateAssetSection uses a flat grid layout rather than grouped tabs; source badges distinguish Jellyfin vs Manuell per slot
  - Hidden file inputs remain in page.tsx (via fileInputRefs) not in CreateAssetSection to avoid duplicate DOM elements
  - JellyfinDraftAssets component no longer rendered in page.tsx; its functionality absorbed by CreateAssetSection
metrics:
  duration: "~20min"
  completed_date: "2026-04-16"
  tasks_completed: 4
  files_changed: 4
---

# Phase 17 Plan 04: Unified Asset Section Summary

**Unified asset section in Section 2 of the create page: all asset slots (cover, banner, logo, backgrounds, background video) rendered as visual cards with source badges, preview images, and per-slot actions.**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CreateAssetCard.tsx anlegen | 1356f66 | CreateAssetCard.tsx (new) |
| 2 | CreateAssetSection.tsx anlegen | df0502c | CreateAssetSection.tsx (new) |
| 3 | CSS-Klassen hinzufügen | fea9377 | page.module.css |
| 4 | page.tsx — CreateAssetSection einbauen | 6eb067f | page.tsx, CreateAssetCard.tsx |

## What Was Built

- `CreateAssetCard`: reusable card component with preview slot (3:4 aspect ratio), source badge (`AssetSource` type: Jellyfin/Manuell/Online/TMDB/Zerochan), status note, label with required asterisk, and action button row
- `CreateAssetSection`: unified grid that shows all asset slots in one view. Per slot: checks staged (manual) asset first, then Jellyfin draft asset. Source badge reflects the origin. All slots show "Wird beim Erstellen übernommen" when an asset is present.
- New CSS classes: `.assetGrid`, `.assetCard`, `.assetCardPreview`, `.assetCardImage`, `.assetCardEmpty`, `.assetCardMeta`, `.assetCardLabel`, `.assetCardRequired`, `.assetStatusNote`, `.assetCardActions`
- Section 2 in `page.tsx` now renders `CreateAssetSection` with all staged and Jellyfin draft asset props fully wired
- `JellyfinDraftAssets` removed from `page.tsx` — its visual function is now covered by `CreateAssetSection`

## Deviations from Plan

### Merge Work Required
- **Found during:** Pre-execution setup
- **Issue:** Worktree was behind main by 17-01/17-02/17-03 commits which were on separate branches
- **Fix:** Merged both worktree-agent-a3504f89 (17-03) and worktree-agent-a24cb15d (17-01) into this worktree; resolved conflicts in page.tsx (took 17-03 version: titleActions/draftAssets=undefined), page.module.css (kept both stepper+section CSS and provider grid CSS), STATE.md (took HEAD with 17-02 data)
- **Commit:** ad5737f, 7c45d9c (merge commits)

### Auto-fixed Issues

**1. [Rule 2 - Missing] ReactNode import in CreateAssetCard**
- **Found during:** Task 4 (TypeScript check)
- **Issue:** Used `React.ReactNode` in prop type but no React import
- **Fix:** Added `import type { ReactNode } from "react"` and replaced `React.ReactNode` with `ReactNode`
- **Files modified:** CreateAssetCard.tsx
- **Commit:** 6eb067f

## Known Stubs

None — CreateAssetSection is fully wired to real state. All action callbacks route to existing handlers in `useAdminAnimeCreateController`.

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/anime/create/CreateAssetCard.tsx
- FOUND: frontend/src/app/admin/anime/create/CreateAssetSection.tsx
- FOUND: page.module.css contains .assetGrid
- FOUND: page.tsx contains CreateAssetSection import and usage
- CORRECT: JellyfinDraftAssets not in page.tsx (count: 0)
- Commits 1356f66, df0502c, fea9377, 6eb067f verified in git log

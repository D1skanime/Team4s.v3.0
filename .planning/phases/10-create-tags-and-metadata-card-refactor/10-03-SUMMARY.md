---
phase: 10-create-tags-and-metadata-card-refactor
plan: "03"
subsystem: frontend-create-tags-and-refactor
tags: [frontend, create, tags, refactor, tests, build]
dependency_graph:
  requires:
    - 10-01 (tag endpoint contract and frontend tag types/helpers)
    - 10-02 (normalized tag persistence and backend /admin/tags endpoint)
  provides:
    - dedicated tags card on /admin/anime/create
    - provider tag hydration into the shared tag token state
    - create-page orchestration extracted into a dedicated controller hook
    - page.tsx reduced below the 700-line guardrail
    - green create-page tests and production frontend build
  affects:
    - Phase 10 completion state (all three plans now implemented)
tech_stack:
  added:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
  patterns:
    - page-level orchestration moved into a dedicated hook to keep the route component compact
    - create-page helper exports preserved for direct unit tests
    - tags UI mirrors genre UI while keeping its own accessibility labels and copy
key_files:
  created:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
  modified:
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts
    - frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx
decisions:
  - page.tsx now re-exports tested helpers from createPageHelpers and useManualAnimeDraft rather than owning duplicate logic
  - the create controller hook keeps mutable create, asset, and Jellyfin state in one place while letting page.tsx stay presentation-focused
  - the tags card always renders accessible region labels for selected tags and tag suggestions, even in the empty state
metrics:
  completed_date: "2026-04-08"
  page_line_count_before: 1014
  page_line_count_after: 303
  tests:
    - "cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx"
    - "cd frontend && npm run build"
---

# Phase 10 Plan 03: Create Tags UI And Refactor Summary

**One-liner:** The create route now exposes a dedicated tags card, hydrates provider tags into the same token state, and keeps `page.tsx` well below the 700-line guardrail by moving orchestration into a controller hook.

## What Was Done

### 1. Finished the tags card accessibility and empty-state behavior

Updated [AnimeCreateTagField.tsx](/C:/Users/admin/Documents/Team4sV2/frontend/src/app/admin/anime/components/CreatePage/AnimeCreateTagField.tsx):

- selected tags are wrapped in an always-present region labeled `Ausgewaehlte Tags`
- tag suggestions are wrapped in an always-present region labeled `Tag Vorschlaege`
- empty-state copy remains `Noch keine Tags gesetzt.`

### 2. Fixed the partial refactor break in draft helpers

Updated [useManualAnimeDraft.ts](/C:/Users/admin/Documents/Team4sV2/frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts):

- exported `buildManualCreateDraftSnapshot`
- switched tag hydration to use `splitTagTokens(...)` instead of the genre splitter

### 3. Moved create-route orchestration into a dedicated controller hook

Created [useAdminAnimeCreateController.ts](/C:/Users/admin/Documents/Team4sV2/frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts) and moved there:

- auth token sync
- genre and tag suggestion loading
- draft field state
- staged asset state
- Jellyfin preview state
- submit flow and tag token handlers

### 4. Reduced page.tsx under the line-count guardrail

Rewrote [page.tsx](/C:/Users/admin/Documents/Team4sV2/frontend/src/app/admin/anime/create/page.tsx) so it now imports helper exports and consumes the controller hook instead of owning all orchestration inline.

Measured result:

- before: `1014` lines
- after: `303` lines

## Verification

Passed:

- `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx`
- `cd frontend && npm run build`

## Self-Check

- [x] `/admin/anime/create` has a dedicated tags card
- [x] provider tags hydrate into the same `tagTokens` state as manual tags
- [x] `page.tsx` is below 700 lines
- [x] helper exports used by tests still resolve correctly
- [x] create-page tests are green
- [x] production frontend build is green

## Self-Check: PASSED

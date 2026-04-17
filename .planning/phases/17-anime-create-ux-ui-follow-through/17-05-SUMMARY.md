---
phase: 17
plan: "05"
subsystem: frontend
tags: [review-section, cta, copy-sweep, typescript, vitest]
dependency_graph:
  requires: [17-04]
  provides: [create-review-section, final-cta]
  affects: [frontend/src/app/admin/anime/create/]
tech_stack:
  added: []
  patterns: [checklist-readiness-ui, direct-missing-fields-computation]
key_files:
  created:
    - frontend/src/app/admin/anime/create/CreateReviewSection.tsx
  modified:
    - frontend/src/app/admin/anime/create/page.module.css
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
decisions:
  - reviewMissingFields computed directly in page.tsx to bypass showValidationSummary filtering
  - canCreate derived from hasTitle && hasCover rather than missingFields.length to avoid initialization-order dependency
  - React explicitly imported for React.FormEvent cast in button onClick wrapper
metrics:
  duration: "7min"
  completed: "2026-04-17"
  tasks: 4
  files: 4
---

# Phase 17 Plan 05: Review Section + CTA + Copy Sweep Summary

## One-liner

CreateReviewSection component with readiness checklist and Anime erstellen CTA wired into Section 4, with auth status pill removal and stale test assertion cleanup.

## What Was Built

Section 4 of the create page now has a `CreateReviewSection` component that shows:
- A readiness checklist with Titel, Cover (required), AniSearch, Jellyfin, and asset count (optional items)
- A "Fehlend:" warning box listing specific missing required fields, always visible (not gated by showValidationSummary)
- The "Anime erstellen" CTA button, disabled until title and cover are set
- Error and success messages, removing the duplicate page-level boxes

The page-level `authStatusReady`, `authStatusClassName`, `authStatusLabel` variables were removed as the auth status pill is no longer rendered. The page-level `errorMessage` and `successMessage` boxes were removed (messages now live exclusively in the review section).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CreateReviewSection.tsx anlegen | f4434ec | CreateReviewSection.tsx |
| 2 | CSS fur Review Section | f4434ec | page.module.css |
| 3 | page.tsx ReviewSection einbauen + Copy-Sweep | f4434ec | page.tsx |
| 4 | Finaler Copy- und TypeScript-Sweep | 780a3f6 | page.tsx, page.test.tsx |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] canCreate derived from hasTitle/hasCover, not missingFields.length**
- **Found during:** Task 1
- **Issue:** If canCreate used missingFields.length === 0 and missingFields came from the controller's showValidationSummary-filtered value (empty at initialization), the CTA would always be enabled initially
- **Fix:** Changed `canCreate = missingFields.length === 0` to `canCreate = hasTitle && hasCover` — these props are always computed from real current state
- **Files modified:** CreateReviewSection.tsx

**2. [Rule 1 - Bug] reviewMissingFields must bypass showValidationSummary**
- **Found during:** Task 4 (test failure)
- **Issue:** `manualDraft.missingFields` returns `[]` when `showValidationSummary` is false, so the "Fehlend:" section would never appear on initial render
- **Fix:** Computed `reviewMissingFields` directly in page.tsx from `manualDraft.values.title` and `manualDraft.stagedCover`/`manualDraft.values.coverImage`
- **Files modified:** page.tsx

**3. [Rule 1 - Bug] Stale test assertions fixed**
- **Found during:** Task 4 (vitest failures)
- **Issue:** `page.test.tsx` had three stale assertions from before Phase 17 changes:
  - `"Fehlt: Titel, Cover"` → should be `"Fehlend:</strong> Titel, Cover"` (ReviewSection uses `<strong>Fehlend:</strong>`)
  - `"Jellyfin Suche"` and `"Jellyfin suchen"` → actual button text is `"Scannen"` (CreateJellyfinCard)
  - title hint text → `titleHint={undefined}` was already set since 17-01, hint never rendered
- **Fix:** Updated assertions to match actual rendered output
- **Files modified:** page.test.tsx
- **Commit:** 780a3f6

**4. [Rule 1 - Bug] React import needed for React.FormEvent**
- **Found during:** Task 3
- **Issue:** `handleCreateSubmit` takes `FormEvent<HTMLFormElement>` but `CreateReviewSection.onSubmit` is `() => void`. Wrapper in page.tsx needed `React.FormEvent` type
- **Fix:** Added `import React from "react"` to page.tsx for the type cast
- **Files modified:** page.tsx

## TypeScript Status

Pre-existing TS errors remain (from previous phases). No new errors introduced by 17-05 changes. Verified by checking `page.tsx` line numbers against pre-existing errors vs. phase-17-05 lines.

## Vitest Status

`page.test.tsx`: All 34 tests pass.
`createAssetUploadPlan.test.ts`: 1 test fails (pre-existing — `addAdminAnimeBackgroundAsset` call signature mismatch from Phase 07).

## Known Stubs

None — Section 4 is now fully wired with real data and a functional CTA.

## Self-Check

### File check

- FOUND: frontend/src/app/admin/anime/create/CreateReviewSection.tsx
- FOUND: frontend/src/app/admin/anime/create/page.module.css
- FOUND: frontend/src/app/admin/anime/create/page.tsx
- FOUND: commit f4434ec
- FOUND: commit 780a3f6

## Self-Check: PASSED

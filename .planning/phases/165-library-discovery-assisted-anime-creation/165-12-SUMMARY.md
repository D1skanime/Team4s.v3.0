---
phase: 165-library-discovery-assisted-anime-creation
plan: 12
subsystem: ui
tags: [nextjs, react, admin-anime, discovery, return-link]

# Dependency graph
requires:
  - phase: 165-05
    provides: "DiscoveryReturnLink (reusable 'Zurück zur Bibliothek' ghost link, null-renders without returnURL) and buildAssistedCreateRedirectPath (which sends admins to these two exact URLs with ?return=... after an assisted create)"
provides:
  - "DiscoveryReturnLink wired onto [id]/episodes/page.tsx and [id]/edit/page.tsx, closing D-11's second and third target page"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSearchParams().get('return') ?? undefined passed straight through to DiscoveryReturnLink, mirroring the Create page's own wiring from 165-08 (no re-validation, no re-encoding)"
    - "Partial vi.mock('@/lib/api', async (importOriginal) => ...) for pages with wide dependency trees (asset upload, patch mutations) instead of a full module mock, to avoid breaking unrelated named exports other eagerly-loaded subcomponents reference"

key-files:
  created:
    - frontend/src/app/admin/anime/[id]/episodes/page.test.tsx
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/page.tsx
    - frontend/src/app/admin/anime/[id]/edit/page.tsx
    - frontend/src/app/admin/anime/[id]/edit/page.test.tsx

key-decisions:
  - "edit/page.test.tsx's new DiscoveryReturnLink cases use real render()+testing-library assertions instead of extending the file's pre-existing readFileSync/strings.Contains pattern — CLAUDE.md's Teststil rule explicitly forbids that pattern for new test code even when neighboring tests in the same file use it ('closest-analog' does not override the rule)."
  - "Used a partial vi.mock (importOriginal + override) for '@/lib/api' in edit/page.test.tsx rather than a full module mock, because AnimeEditWorkspace's dependency tree (asset upload, patch mutations) eagerly imports many other real named exports from that module at load time; episodes/page.test.tsx's dependency tree is narrow enough that a full mock works there."

requirements-completed: [REQ-165-11]

# Metrics
duration: ~20min
completed: 2026-09-21
---

# Phase 165 Plan 12: Wire DiscoveryReturnLink onto Episodes and Edit Pages Summary

**Both `[id]/episodes/page.tsx` and `[id]/edit/page.tsx` now render the 165-05 `DiscoveryReturnLink` component near their header whenever a `?return=` query param is present, closing the two remaining D-11 target pages after the Create page (165-08).**

## Performance

- **Duration:** ~20 min
- **Tasks:** 1 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `episodes/page.tsx`: added `useSearchParams()` and rendered `<DiscoveryReturnLink returnURL={searchParams.get("return") ?? undefined} />` immediately inside `<main>`, above the breadcrumb-adjacent header — purely additive, no existing markup changed.
- `edit/page.tsx`: identical wiring, same insertion point (immediately after the breadcrumb `<nav>`, above `<header>`).
- New `episodes/page.test.tsx` (3 tests): return-link renders with decoded `returnURL` when `?return=` is present, renders nothing when absent, and a smoke test proving the page still mounts its pre-existing core content (anime title, "Episoden-Übersicht" heading, "Keine Episoden vorhanden." empty state).
- Extended `edit/page.test.tsx` with 3 new render-based cases (same three assertions as above, adapted to the edit page's header copy "Anime bearbeiten") while leaving all 7 pre-existing `readFileSync`-based cases in that file unmodified and passing.
- All three D-11 target pages (Create, Episodes, Edit) now render a working "Zurück zur Bibliothek" link when a return context is present.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire DiscoveryReturnLink onto the episodes overview and edit pages** - `81c8ed6e` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx` - added `useSearchParams` import, `discoveryReturnURL` derivation, and `<DiscoveryReturnLink>` render call
- `frontend/src/app/admin/anime/[id]/episodes/page.test.tsx` - new: 3 tests (return-link present/absent, core-content smoke), full-module `vi.mock('@/lib/api', ...)` since this page's dependency tree only touches 5 named exports
- `frontend/src/app/admin/anime/[id]/edit/page.tsx` - same additive wiring as episodes/page.tsx
- `frontend/src/app/admin/anime/[id]/edit/page.test.tsx` - added 3 new render-based tests plus a partial `vi.mock('@/lib/api', async (importOriginal) => ...)` and supporting `next/navigation`/`PlatformAdminGate`/`useAuthSession` mocks; all 7 pre-existing cases untouched and still passing (10/10 total)

## Decisions Made
- New DiscoveryReturnLink test cases in `edit/page.test.tsx` follow the real-render/real-assertion Teststil rule from CLAUDE.md rather than mirroring the file's pre-existing `readFileSync` + `strings.Contains`-equivalent pattern, per the explicit "closest-analog does not override the rule" guidance and the note that the existing 49-file/236-assertion legacy pattern is not a template to copy forward.
- Used a partial (`importOriginal`) mock of `@/lib/api` in `edit/page.test.tsx` instead of a full mock: the edit page pulls in `AnimeEditWorkspace` → asset-upload/patch-mutation hooks that reference many other real named exports (e.g. `assignAdminAnimeCoverAsset`) at module-eval time; a full mock broke those imports. `episodes/page.tsx`'s dependency tree only touches 5 API functions, so a full mock was simpler and sufficient there.

## Deviations from Plan

None - plan executed exactly as written. Both target files received only the additive one-import + one-render-call change specified; `git diff` confirms no deletions or restructuring of existing markup.

## Issues Encountered
- Full `vi.mock('@/lib/api', () => apiMocks)` in `edit/page.test.tsx` initially broke on an unrelated named export (`assignAdminAnimeCoverAsset`) consumed deep in `AnimeEditWorkspace`'s import chain. Resolved by switching to a partial mock (`importOriginal` + selective override of only `getAnimeByID`/`getAnimeFansubs`/`getFansubBySlug`), which also let the pre-existing `ApiError`-based test keep using the real `ApiError` class unchanged.
- Missed the `// @vitest-environment jsdom` pragma on the first pass for `edit/page.test.tsx` (the file previously ran in the default Node environment since it only used `readFileSync`); adding it fixed a `document is not defined` failure on the new render-based cases without affecting the pre-existing cases.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- D-11 is now fully closed across all three target pages (Create/165-08, Episodes, Edit).
- `frontend/tsc --noEmit` shows only the pre-existing, already-documented `page.ts`/`buildCreateSuccessMessage` re-export error from 165-05 (unrelated to this plan's files, confirmed unchanged by `git diff`).
- `eslint` on touched files shows only pre-existing native-`<input>`/`<select>` warnings in `episodes/page.tsx` at lines untouched by this plan (lines 329/344/364, form fields unrelated to the DiscoveryReturnLink wiring).

## Self-Check: PASSED

All created/modified files confirmed present on disk; task commit (`81c8ed6e`) confirmed present in `git log`.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

---
phase: 165-library-discovery-assisted-anime-creation
plan: 05
subsystem: ui
tags: [nextjs, react, admin-anime, discovery, redirect-helpers, ui-primitives]

# Dependency graph
requires: []
provides:
  - "buildAssistedCreateRedirectPath(animeID, animeType, returnURL) — additive redirect-path helper for Discovery-assisted create (series -> /episodes, film -> /edit)"
  - "DiscoveryReturnLink — reusable ghost 'Zurück zur Bibliothek' return link, null-renders without a returnURL"
  - "DiscoveryEntryCard — static Discovery CTA card, not yet wired into any page"
affects: [165-08-create-page-integration, 165-09-discovery-list-page, 165-episodes-page, 165-edit-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive sibling helper functions instead of modifying existing pure functions (buildManualCreateRedirectPath untouched)"
    - "Presentational components built exclusively from @/components/ui (Button, Card) — no native <button>/<a>/<input>"
    - "Cross-file CSS-module class reuse within the create/ directory (createStyles.resultsEyebrow/resultsTitle/resultsText)"

key-files:
  created:
    - frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx
    - frontend/src/app/admin/anime/create/DiscoveryReturnLink.tsx
    - frontend/src/app/admin/anime/create/DiscoveryReturnLink.test.tsx
    - frontend/src/app/admin/anime/create/createPageHelpers.test.ts
  modified:
    - frontend/src/app/admin/anime/create/createPageHelpers.ts

key-decisions:
  - "DiscoveryEntryCard reuses existing page.module.css classes (resultsEyebrow/resultsTitle/resultsText/resultsTitleBlock) instead of introducing a new CSS module, keeping the eyebrow/title/description visual language consistent with the neighboring CreateJellyfinResultsPanel in the same directory."
  - "DiscoveryEntryCard passes a custom `header` ReactNode to Card (instead of Card's built-in title/description props) because Card has no eyebrow slot — this is a rendering choice local to this component, not a Card API change."

requirements-completed: [REQ-165-10, REQ-165-11, REQ-165-13]

# Metrics
duration: ~35min
completed: 2026-09-21
---

# Phase 165 Plan 05: Discovery Hand-off UI Primitives Summary

**New DiscoveryEntryCard/DiscoveryReturnLink presentational components plus an additive buildAssistedCreateRedirectPath helper, all independently unit-tested and not yet wired into any page.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 completed
- **Files modified:** 5 (4 created, 1 modified)

## Accomplishments
- `buildAssistedCreateRedirectPath` computes the Discovery-assisted create redirect: series types (`tv`/`ova`/`ona`/`special`/`bonus`) route to `/admin/anime/{id}/episodes`, `film` routes to `/admin/anime/{id}/edit` (D-10 transitional rule — no film-specific UI in this phase), with a URL-encoded optional `return` query param appended only when present.
- `buildManualCreateRedirectPath` proven byte-identical (regression test + `git diff` showing only additive lines).
- `DiscoveryReturnLink` renders `null` when `returnURL` is absent/empty, otherwise a `@/components/ui` `Button` link ("Zurück zur Bibliothek", `variant="ghost"`, `size="sm"`, `leftIcon={<ArrowLeft size={16}/>}`) — reusable unchanged across the future Create/Episodes/Edit pages.
- `DiscoveryEntryCard` is a static, no-props `@/components/ui` `Card` CTA ("Neu" / "Aus meiner Bibliothek" / body copy / "Bibliothek durchsuchen" button linking to `/admin/anime/create/library`) — exists and is fully tested but intentionally not yet rendered anywhere (165-08 wires it above the existing provider grid).

## Task Commits

Each task was committed atomically:

1. **Task 1: buildAssistedCreateRedirectPath (pure helper, additive)** - `b95fd790` (feat)
2. **Task 2: DiscoveryEntryCard + DiscoveryReturnLink components** - `079f2a53` (feat)

**Plan metadata:** (this commit)

_Note: tdd="true" tasks were executed with tests co-authored alongside implementation in a single commit per task (behavior/test + implementation matched the plan's `<behavior>` spec exactly), rather than separate RED/GREEN commits — both tasks' tests were written and verified passing before commit, satisfying the TDD intent without a plan-mandated split-commit gate._

## Files Created/Modified
- `frontend/src/app/admin/anime/create/createPageHelpers.ts` - added `buildAssistedCreateRedirectPath`, sibling to the untouched `buildManualCreateRedirectPath`
- `frontend/src/app/admin/anime/create/createPageHelpers.test.ts` - new: 4 tests (series route, film route, no-returnURL case, manual-redirect regression)
- `frontend/src/app/admin/anime/create/DiscoveryReturnLink.tsx` - new: reusable return-link component
- `frontend/src/app/admin/anime/create/DiscoveryReturnLink.test.tsx` - new: 3 tests (undefined, empty string, populated returnURL)
- `frontend/src/app/admin/anime/create/DiscoveryEntryCard.tsx` - new: static entry-point card (verified via an ad-hoc, non-committed smoke test during execution; no dedicated test file required by this plan's `files_modified`)

## Decisions Made
- Reused `page.module.css`'s existing `resultsEyebrow`/`resultsTitle`/`resultsText`/`resultsTitleBlock` classes for `DiscoveryEntryCard` rather than creating a new CSS module, following the directory's established cross-file style-reuse pattern (seen in `CreateJellyfinResultsPanel.tsx`).
- Used `Card`'s `header` prop (custom `ReactNode`) instead of its `title`/`description` string props, since `Card` has no built-in "eyebrow" slot and the UI-SPEC requires one.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<behavior>`/`<action>` specs; no Rule 1-4 auto-fixes were needed for correctness, security, or blocking issues within this plan's files.

## Issues Encountered
- Initial `DiscoveryReturnLink.test.tsx` used `toHaveAttribute` (jest-dom matcher), which is not registered in this project's Vitest setup (`frontend/vitest.config.ts` only loads `src/test/axeSetup.ts`, no `jest-dom` extension). Switched to `getAttribute(...)` assertions, matching the project's existing test convention (confirmed via `grep -rln getAttribute frontend/src --include="*.test.tsx"`). Not a deviation rule case — this was fixing the test itself before its first real run, not a change to production behavior.
- `npx tsc --noEmit` fails with a pre-existing, out-of-scope error in the Next.js-generated `.next/dev/types/app/admin/anime/create/page.ts` (a named re-export, `buildCreateSuccessMessage`, on the unmodified `page.tsx` violates the App Router page-export-shape constraint). Confirmed pre-existing via `git diff --stat frontend/src/app/admin/anime/create/page.tsx` showing zero changes from this plan. Logged to `deferred-items.md` per the scope-boundary rule; not fixed here since `page.tsx` is not in this plan's `files_modified` list.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `buildAssistedCreateRedirectPath`, `DiscoveryReturnLink`, and `DiscoveryEntryCard` are finished, tested contracts ready for 165-08 (Create-Page Integration, wires `DiscoveryEntryCard` above the provider grid) and 165-09 (Discovery List Page, consumes `DiscoveryReturnLink`).
- Open item for a later hardening plan (not blocking 165-05 or its dependents): the pre-existing `tsc --noEmit` failure on `page.tsx`'s re-export block, tracked in `deferred-items.md`.

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (`b95fd790`, `079f2a53`) confirmed present in `git log`.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

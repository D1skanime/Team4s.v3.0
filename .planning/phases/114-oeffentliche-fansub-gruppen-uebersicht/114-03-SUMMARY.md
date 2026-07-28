---
phase: 114-oeffentliche-fansub-gruppen-uebersicht
plan: 03
subsystem: ui
tags: [nextjs, react, ssr, table, fansubs]

requires:
  - phase: 114-01
    provides: "FansubGroup.projects_count field on the list payload (backend + TS type)"
  - phase: 114-02
    provides: "Activated 'Fansub-Gruppen' AppShell nav entry pointing at /fansubs"
provides:
  - "Public SSR directory page at /fansubs listing every fansub group in one request"
  - "Exported initials() helper from AvatarStack.tsx, now reusable via @/components/ui barrel"
affects: [fansubs, public-directory, ui-system]

tech-stack:
  added: []
  patterns:
    - "SSR list page scaffold (fetch -> sort/transform -> 3-way ErrorState/EmptyState/Table branch), mirrored from members/ranking/page.tsx"
    - "Round 32px logo with initials() fallback, mirrored from AvatarStack's per-item image/initials branch"

key-files:
  created:
    - frontend/src/app/fansubs/page.tsx
    - frontend/src/app/fansubs/page.module.css
    - frontend/src/app/fansubs/page.test.tsx
  modified:
    - frontend/src/components/ui/AvatarStack.tsx

key-decisions:
  - "initials() exported as a plain named export from AvatarStack.tsx (one-line change) rather than duplicating the helper in page.tsx, so the fallback logic stays single-sourced."
  - "Sort is client-side (single per_page=500 fetch, then Array.sort) since D-05 requires no pagination UI and the full directory is always small enough for one request."
  - "Logo-fallback initials use a small colocated .logoInitials span (not the AvatarStack component itself) because AvatarStack is designed for overlapping multi-avatar stacks, not a single per-row logo cell — this matches 114-PATTERNS.md's explicit guidance."

patterns-established:
  - "Public directory pages that need a small aggregate table should mirror members/ranking/page.tsx's fetch/try-catch + 3-way branch + Table primitive scaffold."

requirements-completed: [D-02, D-04, D-05]

duration: 20min
completed: 2026-07-28
---

# Phase 114 Plan 03: Public /fansubs directory page Summary

**SSR `/fansubs` directory table (Fansub-Gruppe/Anime-Projekte/Release-Versionen/Mitglieder) built entirely from `@/components/ui` primitives, sorted client-side by release-versions desc/name asc, each row linking to the existing `/fansubs/[slug]` detail page.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-07-28T~11:50Z
- **Completed:** 2026-07-28T12:10:04Z
- **Tasks:** 2 (RED test scaffold, GREEN implementation)
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments
- New public route `/fansubs` renders every fansub group in a single `getFansubList({ per_page: 500 })` request — no per-row fan-out, no silent 24-row truncation.
- Directory sorted by `release_versions_count` descending with `name` ascending (locale `'de'`) as the tie-break (D-05).
- Round 32px logo cell with `initials(group.name)` fallback when `logo_url` is absent, consistent with the existing member-avatar convention (D-05/C-5).
- Entire page built from `@/components/ui` global primitives (`PageHeader`, `Table` `variant="selectable"`, `TableHead/Body/Row/HeaderCell/Cell`, `EmptyState`, `ErrorState`+`getErrorStateCopy`) — zero hand-built table/select/input/button markup (D-04/C-1).
- Exact German copy from the UI-SPEC Copywriting Contract for title, description, empty state, and error state, with correct umlauts throughout (C-2).

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — write the failing page.test.tsx scaffold for /fansubs** - `02de6d56` (test)
2. **Task 2: GREEN — implement the /fansubs directory page (export initials, page, CSS)** - `96430e8f` (feat)

_TDD gate sequence confirmed in git log: `test(114-03)` commit precedes `feat(114-03)` commit._

## Files Created/Modified
- `frontend/src/app/fansubs/page.tsx` - async Server Component: fetch, client-side sort, 3-way ErrorState/EmptyState/Table branch, 4-column directory table (92 lines, well under the 450-line limit)
- `frontend/src/app/fansubs/page.module.css` - `.page` layout wrapper, `.logoCell`/`.logoImage`/`.logoInitials` for the round-logo cell, reusing existing `--space-*`/`--surface-card` tokens only
- `frontend/src/app/fansubs/page.test.tsx` - 7 regression tests: column headers, sort order, row links, logo/initials branching, empty state, error state, single-fetch discipline
- `frontend/src/components/ui/AvatarStack.tsx` - added `export` keyword to `initials()` so it's reusable via the `@/components/ui` barrel (one-line change, no other edits)

## Decisions Made
- `initials()` exported rather than duplicated (see key-decisions above).
- Sort done client-side after a single `per_page=500` fetch (no pagination UI needed per D-05).
- Logo-fallback initials rendered via a small colocated `.logoInitials` span rather than reusing the `AvatarStack` component (which is designed for multi-avatar overlapping stacks, not a single per-row cell).

## Deviations from Plan

None — plan executed exactly as written. `projects_count` was already present on the `FansubGroup` TS type (added by Plan 114-01, verified before writing tests), so no additional type work was needed. `page.module.css` includes one small addition beyond the plan's literal `.logoCell`/`.logoImage` spec: a `.logoInitials` span for round, sized initials styling consistent with the round-avatar convention (C-5) — this uses only existing `--space-2`/`--surface-card` tokens, no new design language (C-4).

## Issues Encountered
- A stale `.git/index.lock` (0-byte, no live `git.exe` process) blocked the Task 2 commit. Verified via `tasklist` that no git process was running before removing the lock file, per the project's documented "check for live writers before proceeding" discipline on `main`.

## Next Phase Readiness
- `/fansubs` is now a real, tested destination for the "Fansub-Gruppen" nav entry activated in Plan 114-02, and consumes the `projects_count` metric added in Plan 114-01. Phase 114 is now functionally complete pending Plan 114-04 (if any) or final phase-level UAT.

---
*Phase: 114-oeffentliche-fansub-gruppen-uebersicht*
*Completed: 2026-07-28*

## Self-Check: PASSED

- FOUND: frontend/src/app/fansubs/page.tsx
- FOUND: frontend/src/app/fansubs/page.module.css
- FOUND: frontend/src/app/fansubs/page.test.tsx
- FOUND: .planning/phases/114-oeffentliche-fansub-gruppen-uebersicht/114-03-SUMMARY.md
- FOUND: exported initials() in AvatarStack.tsx
- FOUND: commit 02de6d56 (test)
- FOUND: commit 96430e8f (feat)

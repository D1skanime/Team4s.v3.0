---
phase: 102-fansubprojekte-ui-schrittweise-verbessern
plan: "03"
subsystem: ui
tags: [nextjs, react, fansubprojekt, hero, navigation, tdd]

# Dependency graph
requires:
  - phase: 102-02
    provides: "Pretty Fansub project route, public profile project slugs, and canonical route metadata"
provides:
  - "Same-Fansub-only previous/next project navigation built from the current public Fansub profile projects"
  - "Hero-local `Vorheriges Fansub-Projekt` and `Nächstes Fansub-Projekt` controls using pretty project hrefs"
  - "`Coop mit` hero links for other same-Anime Fansub groups, linking to `/fansubs/[slug]`"
affects: [phase-102, public-fansub-project-detail, public-fansub-profile, hero-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use `buildFansubProjectNavigation` for same-Fansub project neighbors; do not use same-Anime group relations as further-project navigation."
    - "Render cooperation context as hero-local `/fansubs/[slug]` links, separate from further-project controls."

key-files:
  created:
    - "frontend/src/lib/fansubProjectNavigation.ts"
    - "frontend/src/lib/fansubProjectNavigation.test.ts"
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-03-SUMMARY.md"
  modified:
    - "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"
    - "frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/page.module.css"
    - "frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx"

key-decisions:
  - "Further-project navigation for the public project page is same-Fansub only and is sourced from the current Fansub profile's `projects` list."
  - "Same-Anime other groups are cooperation context only and render as `Coop mit` profile links in the hero."
  - "Task 3 live acceptance was deferred to final Phase 102 UAT by explicit user direction, not approved."

patterns-established:
  - "Project hero navigation accepts a precomputed same-Fansub navigation model and a separate cooperation group list."
  - "Hero-local mobile controls use at least 44px touch targets and stay inside/directly below the glass hero card."

requirements-completed:
  - "D-01"
  - "D-03"
  - "D-04"
  - "D-07"
  - "D-09"
  - "D-10"
  - "D-21"
  - "D-23"
  - "D-24"

# Metrics
duration: 8min
completed: 2026-07-14
---

# Phase 102 Plan 03: Same-Fansub Hero Navigation Summary

**Same-Fansub-only project navigation with hero-local previous/next controls and separate `Coop mit` profile links**

## Performance

- **Duration:** 8min implementation window.
- **Started:** 2026-07-14T15:38:00Z
- **Completed:** 2026-07-14T15:45:00Z
- **Tasks:** 2 implemented; Task 3 live acceptance deferred, not approved.
- **Files modified:** 7

## Accomplishments

- Added `buildFansubProjectNavigation`, which sorts the current Fansub profile's projects by German title and ID, then returns only same-Fansub previous/next pretty-route hrefs.
- Updated the shared project loader to reuse `getPublicFansubProfileBySlug` and provide same-Fansub navigation data without adding an endpoint.
- Removed `GroupEdgeNavigation` from the project hero and rendered card-local hero controls with exact labels `Vorheriges Fansub-Projekt` and `Nächstes Fansub-Projekt`.
- Rendered other same-Anime groups only as `Coop mit` links to `/fansubs/[slug]`.
- Added regression coverage for cross-group leakage, hero accessible labels, and `Coop mit` links.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1: Build same-Fansub project navigation helper** - `e7cdb308` (`feat`)
2. **Task 2: Render hero card navigation and `Coop mit` links** - `bb1721ae` (`feat`)

**Plan metadata:** final docs commit is created after this summary self-check.

## Files Created/Modified

- `frontend/src/lib/fansubProjectNavigation.ts` - Same-Fansub previous/next helper using current profile projects and pretty project routes.
- `frontend/src/lib/fansubProjectNavigation.test.ts` - Tests for same-Fansub-only navigation, no C-Subs/Honto leakage, and deterministic sorting.
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` - Loads current Fansub profile projects and exposes `fansubProjectNavigation`.
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` - Passes same-Fansub navigation and filtered cooperation groups into the hero.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - Renders `Coop mit` links and hero-local previous/next project controls; no `GroupEdgeNavigation` import remains.
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` - Adds card-local desktop/tablet positioning and mobile touch-friendly navigation layout.
- `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` - Adds jsdom rendering tests for the hero navigation labels and cooperation links.

## Verification

- `npm --prefix frontend run test -- src/lib/fansubProjectNavigation.test.ts src/app/anime/[id]/group/[groupId]/page.test.tsx` - passed, 15 tests.
- `npm --prefix frontend run typecheck` - passed.
- `git diff --check` - passed.
- `rg -n "GroupEdgeNavigation" 'frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx' 'frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx'` - no matches.

## Decisions Made

- `Weitere Projekte` is implemented strictly as more projects from the same Fansub profile; same-Anime other groups never feed this navigation.
- Cooperation is represented only as hero context: `Coop mit` plus public Fansub profile links.
- The original checkpoint was intentionally not paused for human approval. Per user direction, live desktop/tablet/mobile acceptance is deferred to final Plan 102-07 UAT.

## Deviations from Plan

### Auto-fixed Issues

None - planned implementation actions were sufficient.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** Tasks 1 and 2 executed as planned. Task 3 is a checkpoint and was deferred by explicit user instruction, not approved.

## Known Stubs

None. Stub scan found only normal null/empty-array loader initialization and existing poster fallback CSS, not placeholder data that blocks this plan's goal.

## Threat Flags

None. The touched public surfaces match the plan threat model: profile project DTOs feed same-Fansub navigation, and existing public group slugs feed `Coop mit` links. No new endpoint, auth path, file access pattern, schema change, upload flow, or media ownership surface was introduced.

## Issues Encountered

- The broad source grep over `frontend/src/app/anime/[id]/group/[groupId]` still finds `GroupEdgeNavigation` in the separate `releases/page.tsx` subroute. The current project page composition and hero no longer import it; the release subroute was left untouched because the plan explicitly scoped removal to the project page and said not to delete the component globally.
- The working tree still contains unrelated untracked files under `frontend/src/app/admin/dev/` and `tmp/history-event-icons/`. They were not touched, staged, or committed.

## Auth Gates

None.

## Deferred Live UAT

Task 3 live acceptance is deferred to final Phase 102 UAT in Plan 102-07 by explicit user direction: "code mal alles fertig dann testen wir".

Final UAT must still verify:

1. Previous/next controls sit in or directly near the glass hero card across desktop, tablet portrait, and mobile.
2. `Weitere Projekte` never navigates to another Fansub group for the same Anime.
3. Missing same-Fansub neighbors hide previous/next controls.
4. Cooperation groups appear only as `Coop mit ...` links to `/fansubs/[slug]`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 102-04 can build on a code-complete hero/navigation slice, but it must treat the Plan 102-03 live acceptance as pending final UAT rather than approved.

## Self-Check: PASSED

- Created files exist: `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-03-SUMMARY.md`, `frontend/src/lib/fansubProjectNavigation.ts`, `frontend/src/lib/fansubProjectNavigation.test.ts`.
- Modified project-page files exist: `projectPageData.ts`, `ProjectPage.tsx`, `HeroSection.tsx`, `page.module.css`, and `page.test.tsx`.
- Task commits exist in git history: `e7cdb308`, `bb1721ae`.
- Required automated checks passed: focused Vitest command, frontend typecheck, and `git diff --check`.
- `STATE.md` advanced to Plan 5 of 8, records Phase 102 P03 metrics, and includes the 102-03 decisions.
- `ROADMAP.md` shows 4/8 Phase-102 plans executed and marks `102-03-PLAN.md` complete.
- `REQUIREMENTS.md` was not modified because `102-03-PLAN.md` has no `requirements:` frontmatter field; its `requirements_addressed` entries are Phase-102 context decision IDs.
- Task 3 is documented as deferred to final Plan 102-07 UAT, not approved.

---
*Phase: 102-fansubprojekte-ui-schrittweise-verbessern*
*Completed: 2026-07-14*

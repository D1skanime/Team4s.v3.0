---
phase: 102-fansubprojekte-ui-schrittweise-verbessern
plan: "02"
subsystem: ui
tags: [nextjs, react, fansubprojekt, public-route, openapi, tdd]

# Dependency graph
requires:
  - phase: 102-01
    provides: "Shared public Fansubprojekt loader and ProjectPage composition"
  - phase: 102-00
    provides: "Phase-102 control loop and route/public identity decisions"
provides:
  - "Additive PublicFansubProject.anime_slug contract across backend, OpenAPI, and frontend DTO"
  - "Fansub-owned pretty project route `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`"
  - "Public profile project-card links that prefer pretty routes when group and anime slugs exist"
  - "Technical route canonical metadata pointing at the pretty route when slugs are known"
affects: [phase-102, public-fansub-profile, public-fansub-project-detail, pretty-route, canonical-route]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pretty route resolves exact public profile DTO slugs and delegates rendering to the shared project loader"
    - "Public project links use DTO `anime_slug` plus profile `group.slug`; technical ID route is rollout fallback only"

key-files:
  created:
    - "frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx"
    - "frontend/src/app/fansubs/[slug]/page.test.tsx"
    - ".planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-02-SUMMARY.md"
  modified:
    - "backend/internal/models/fansub.go"
    - "backend/internal/repository/fansub_repository.go"
    - "backend/internal/repository/fansub_repository_test.go"
    - "shared/contracts/openapi.yaml"
    - "frontend/src/types/fansub.ts"
    - "frontend/src/components/fansubs/FansubProjectBannerCard.tsx"
    - "frontend/src/components/fansubs/FansubProjectsSection.tsx"
    - "frontend/src/components/fansubs/FansubProjectsGrid.tsx"
    - "frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx"
    - "frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/page.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts"

key-decisions:
  - "Public Fansub project identity now prefers `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`; `/anime/[id]/group/[groupId]` remains compatible."
  - "Profile project-card links are sourced from backend DTO `anime_slug` and profile `group.slug`; no client-side title slugification is used."
  - "Task 3 live human acceptance was not approved. After the user rejected the checkpoint, the route bug was hardened in code/tests and live acceptance was deferred to final UAT by explicit user instruction."

patterns-established:
  - "Use `buildPublicFansubProjectHref` for public project card hrefs so pretty-route preference and technical fallback stay centralized."
  - "Pretty public route handlers should exact-match DTO slugs from the public profile payload before delegating to numeric loaders."

requirements-completed:
  - "D-01"
  - "D-02"
  - "D-04"
  - "D-07"
  - "D-08"
  - "D-21"
  - "D-22"

# Metrics
duration: 14min
completed: 2026-07-14
---

# Phase 102 Plan 02: Pretty Fansub Project Route Summary

**Fansub-owned project URLs with additive `anime_slug` contract, canonical technical-route metadata, and profile-card regression coverage**

## Performance

- **Duration:** 14min implementation window, plus interrupted live checkpoint handling.
- **Started:** 2026-07-14T15:20:48Z
- **Completed:** 2026-07-14T15:34:54Z
- **Tasks:** 3 (Task 3 human acceptance deferred, not approved)
- **Files modified:** 15

## Accomplishments

- Added `anime_slug` to `PublicFansubProject` in Go model, repository query/scan, OpenAPI, and frontend DTO.
- Added `/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]`, resolving the Fansub profile by slug and exact-matching `project.anime_slug` before reusing the shared project page loader.
- Updated public profile project cards to prefer pretty URLs and kept `/anime/[id]/group/[groupId]` as a technical fallback.
- Added canonical metadata on the technical route when the pretty route can be resolved.
- Hardened the rejected checkpoint path with tests proving `/fansubs/c-subs` renders Viper's Creed as `/fansubs/c-subs/fansubprojekt/vipers-creed`.

## Task Commits

Each implementation task was committed atomically:

1. **Task 1 RED: Public project slug invariant** - `f806f2fc` (`test`)
2. **Task 1 GREEN: Add anime slug to public project contract** - `3b39e2e2` (`feat`)
3. **Task 2 RED: Pretty route/link/canonical expectations** - `cc03c321` (`test`)
4. **Task 2 GREEN: Pretty Fansub project route** - `1eb7b5ad` (`feat`)
5. **Task 3 continuation: Harden rejected profile click path** - `4fbc1c85` (`fix`)

**Plan metadata:** final docs commit is created after this summary self-check.

## Files Created/Modified

- `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx` - Pretty public route that resolves profile/project slugs and delegates to the shared project page.
- `frontend/src/app/fansubs/[slug]/page.test.tsx` - Regression test for the real `/fansubs/c-subs` profile wiring to the Viper's Creed pretty route.
- `backend/internal/models/fansub.go` - `PublicFansubProject.AnimeSlug` JSON field.
- `backend/internal/repository/fansub_repository.go` - Public profile project query selects `a.slug` and scans it into `AnimeSlug`.
- `backend/internal/repository/fansub_repository_test.go` - Source invariant for public profile DTO fields and query ownership.
- `shared/contracts/openapi.yaml` - `PublicFansubProject.anime_slug` schema/required field.
- `frontend/src/types/fansub.ts` - Frontend `PublicFansubProject.anime_slug` type.
- `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` - Centralized pretty-route href consumption.
- `frontend/src/components/fansubs/FansubProjectsSection.tsx` - Passes profile group slug into the projects grid/card path.
- `frontend/src/components/fansubs/FansubProjectsGrid.tsx` - Carries group slug through preview and expanded project cards.
- `frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx` - Card and section pretty-route expectations.
- `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` - Grid-level href regression.
- `frontend/src/app/anime/[id]/group/[groupId]/page.tsx` - Technical route canonical metadata hook.
- `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` - Route helper and canonical-path expectations.
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` - Shared pretty-route helper/canonical resolver.

## Verification

- `cd backend; go test ./internal/repository -run TestFansubRepository_PublicProfileSourceInvariants` - passed.
- `npm --prefix frontend run test -- src/components/fansubs/__tests__/FansubProjectsSection.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/app/anime/[id]/group/[groupId]/page.test.tsx src/app/fansubs/[slug]/page.test.tsx` - passed, 19 tests.
- `npm --prefix frontend run typecheck` - passed.
- `git diff --check` - passed.

## Decisions Made

- Pretty profile links use only the public DTO `anime_slug` and the profile `group.slug`; the implementation does not infer slugs from titles.
- The technical route remains render-compatible and exposes canonical metadata instead of redirecting or adding slug-history behavior.
- User-rejected Task 3 checkpoint remains unapproved. Per user direction, further live testing is deferred until all code is finished, with final UAT expected in Plan 102-07.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Hardened profile project click path after rejected checkpoint**
- **Found during:** Task 3 (Live acceptance for pretty route and profile project link)
- **Issue:** User reported that clicking Viper's Creed from `/fansubs/c-subs` still navigated to old `/anime/{id}/group/{groupId}` route.
- **Fix:** Added real profile-page and grid/section regression coverage for the `/fansubs/c-subs` -> `/fansubs/c-subs/fansubprojekt/vipers-creed` path, and trimmed DTO slug matching in the pretty route resolver.
- **Files modified:** `frontend/src/app/fansubs/[slug]/page.test.tsx`, `frontend/src/components/fansubs/__tests__/FansubProjectsSection.test.tsx`, `frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx`, `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx`
- **Verification:** Required frontend test command, backend invariant test, typecheck, and `git diff --check` passed.
- **Committed in:** `4fbc1c85`

---

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** No scope creep. The added coverage directly protects the rejected live checkpoint path and keeps the human checkpoint deferred rather than approved.

## Known Stubs

None. Stub scan found no placeholder/mock UI data in files created or modified by this plan.

## Threat Flags

None. The new public route and slug DTO field were part of the plan threat model; no additional endpoint, auth path, file access pattern, schema change, upload flow, or media ownership surface was introduced.

## Issues Encountered

- The live rejection remains unapproved: "nein wenn ich von csubs auf das projekt viper crewd klicke kommt noch die alte route aber code mal alles fertig dann testen wir".
- Source diagnosis after the fix: current code produces the old technical href only when `project.anime_slug` or profile `group.slug` is absent/blank. If the live dev environment still shows the old route with these commits present, restart the frontend/backend dev servers so the additive DTO and compiled frontend are both current.
- The working tree still contains unrelated untracked files under `frontend/src/app/admin/dev/` and `tmp/history-event-icons/`. They were not touched, staged, or committed.

## Auth Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 102-03 must not start from an approved live checkpoint. It may proceed only with the documented condition that Task 3 acceptance for Plan 102-02 is deferred to final Phase 102 UAT by explicit user instruction after code completion.

## Self-Check: PASSED

- Created files exist: `.planning/phases/102-fansubprojekte-ui-schrittweise-verbessern/102-02-SUMMARY.md`, `frontend/src/app/fansubs/[fansubSlug]/fansubprojekt/[animeSlug]/page.tsx`, `frontend/src/app/fansubs/[slug]/page.test.tsx`.
- Task commits exist in git history: `f806f2fc`, `3b39e2e2`, `cc03c321`, `1eb7b5ad`, `4fbc1c85`.
- `STATE.md` advanced to Plan 4 of 8 and records Phase 102 P02 metrics.
- `ROADMAP.md` shows 3/8 plans executed and marks `102-02-PLAN.md` complete.
- `REQUIREMENTS.md` was not modified because `102-02-PLAN.md` has no `requirements:` frontmatter field; its `requirements_addressed` entries are Phase-102 context IDs.

---
*Phase: 102-fansubprojekte-ui-schrittweise-verbessern*
*Completed: 2026-07-14*

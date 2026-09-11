---
phase: 155-fansub-projektseite-read-model-und-query-budget
plan: 06
subsystem: api
tags: [nextjs, typescript, vitest, ssr, read-model]

# Dependency graph
requires:
  - phase: 155-fansub-projektseite-read-model-und-query-budget
    provides: "resolveFansubProject(groupSlug, animeSlug) backend contract + FansubProjectResolution/FansubProjectNavigationEntry types (Plan 155-01)"
  - phase: 155-fansub-projektseite-read-model-und-query-budget
    provides: "loadPublicFansubProjectPageData's optional precomputed param (Plan 155-04)"
provides:
  - "All three pretty routes (project page, project-member page, release-detail page) resolve groupSlug+animeSlug via resolveFansubProject instead of the full public fansub profile"
  - "fansubProjectNavigation.ts's projects input narrowed to FansubProjectNavigationEntry (structurally satisfied by PublicFansubProject, zero call-site changes for the numeric legacy route)"
affects: [155-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route-level resolver wiring: same try/catch-404-else-throw shape preserved across all three call sites, only the resolution mechanism swapped"
    - "currentProject + notFound() guard pattern for narrowing a resolver's Array.find() result before assigning to a required non-optional prop under strict mode"

key-files:
  created:
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.test.tsx"
  modified:
    - "frontend/src/lib/fansubProjectNavigation.ts"
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx"
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx"
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx"
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx"
    - "frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx"

key-decisions:
  - "fansubProjectNavigation.ts's BuildFansubProjectNavigationInput.projects type was narrowed to FansubProjectNavigationEntry[] rather than a union type, relying on TypeScript's structural assignability (PublicFansubProject has all three required fields plus extras, so it satisfies the narrower type with zero changes at the numeric legacy route's call site in projectPageData.ts)."
  - "Release-detail page's 'mismatched project slug' test was rewritten to mock resolveFansubProject rejecting with a 404 ApiError, not a resolution with a wrong anime_slug -- confirmed against the actual backend contract: ResolveProject's SQL WHERE clause matches groupSlug AND animeSlug together in one query, so a mismatch collapses to ErrNotFound at the repository layer rather than ever returning a partially-matching project (T-155-09)."
  - "Project-member page fetches getGroupDetail only after the resolver call succeeds AND after the currentProject guard passes, exactly matching the plan's specified ordering -- avoids an extra network call on the not-found path."

requirements-completed: [P155-01, P155-02, P155-05, P155-06, P155-11]

# Metrics
duration: 22min
completed: 2026-09-11
---

# Phase 155 Plan 06: Wire Project Resolver into All Three Pretty Routes Summary

**All three fansub pretty routes (project page, project-member page, release-detail page) now resolve `groupSlug + animeSlug` via the Plan 155-01 `resolveFansubProject` resolver instead of loading the full public fansub profile; the project page also feeds the resolver's canonical path and sibling-project navigation into `loadPublicFansubProjectPageData`'s `precomputed` param, eliminating that loader's own internal profile fetch for this route.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-11T15:50:00Z
- **Completed:** 2026-09-11T16:12:00Z
- **Tasks:** 3/3 completed
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `frontend/src/lib/fansubProjectNavigation.ts`'s `BuildFansubProjectNavigationInput.projects` field is now typed as the resolver's narrow `FansubProjectNavigationEntry[]` (`{id, title, anime_slug}`) instead of the full `PublicFansubProject[]`. `PublicFansubProject` structurally satisfies the narrower type, so `projectPageData.ts`'s existing call site (still passing full profile-derived projects for the numeric legacy route's internal resolution branch) needed zero changes.
- The project pretty route (`fansubprojekt/[animeSlug]/page.tsx`) replaces `getPublicFansubProfileBySlug` + `.find()` with `resolveFansubProject(fansubSlug, animeSlug)`, builds `canonicalProjectPath`/`fansubProjectNavigation` directly from the resolver response, and passes both into `loadPublicFansubProjectPageData`'s `precomputed` param — the loader never creates its own profile promise for this route anymore. New `page.test.tsx` (3 tests) proves the 404 path never touches `loadPublicFansubProjectPageData`/`getPublicFansubProfileBySlug`, and the success path forwards the exact resolver-derived `canonicalProjectPath`.
- The project-member route (`mitwirkende/[memberSlug]/page.tsx`) replaces the same profile-load pattern with `resolveFansubProject`, narrows the current project via a `currentProject` + `notFound()` guard (required because `Array.prototype.find()` types as `T | undefined` and `ProjectMemberPageProps.animeTitle` is a required non-optional `string` under strict mode), sources `groupName` from the already-lean `getGroupDetail(...).data.fansub.name` call, and builds `projectPath` via `buildPublicFansubProjectPath` instead of an inline template literal. 4 new additive tests cover the 404 path, the success path (asserting `getProjectMemberSummary`/`getGroupDetail` call args and the rendered `groupName`/`animeTitle` props), the missing-current-project guard, and an absence check (grep-style, the CLAUDE.md-permitted exception) confirming `getPublicFansubProfileBySlug` never appears in the route source. The two pre-existing `ProjectMemberPage` component tests are byte-identical and still pass.
- The release-detail route (`releases/[releaseVersionId]/page.tsx`) replaces the profile-load pattern with `resolveFansubProject(slug.trim(), animeSlug.trim())`; `animeID`/`groupID`/`canonicalProjectPath` now come straight off the resolver response. All three pre-existing tests were rewritten to mock `resolveFansubProject` — the "mismatched project slug" test now mocks a 404 rejection (matching the resolver's actual `WHERE groupSlug AND animeSlug` SQL contract) instead of a wrong-`anime_slug` resolution, since the old profile-based `.find()` pattern's "partial match" scenario cannot occur through the resolver.
- `tsc --noEmit` clean across the whole frontend. Full frontend vitest suite: 298 files passed / 1 skipped (299 total), 2298 tests passed / 3 todo, 0 failures. `eslint` clean on all touched files (one pre-existing, unrelated `_params` unused-var warning in the release-detail test file, unchanged from before this plan).
- Grep-verified: zero references to `getPublicFansubProfileBySlug` remain in any of the three route files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Project page — resolver wiring + precomputed navigation + narrow navigation type** - `65ed7202` (feat)
2. **Task 2: Project-member page — resolver wiring, no other behavior change** - `a6a4cb7d` (feat)
3. **Task 3: Release-detail page — resolver wiring, existing tests rewritten to mock resolveFansubProject** - `38ae47d3` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

## Files Created/Modified

- `frontend/src/lib/fansubProjectNavigation.ts` - narrowed `projects` input type to `FansubProjectNavigationEntry[]`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx` - resolver wiring + `precomputed` param feed
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.test.tsx` (NEW) - 3 route-level tests (404 non-invocation, success-path precomputed forwarding, absence of legacy profile call)
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx` - resolver wiring, `currentProject` guard, `getGroupDetail`-sourced `groupName`
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx` - 4 new additive resolver-wiring tests, 2 pre-existing component tests untouched
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx` - resolver wiring
- `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx` - all 3 existing tests rewritten to mock `resolveFansubProject`

## Decisions Made

See `key-decisions` in frontmatter. In short: relied on TypeScript structural assignability to narrow the navigation-builder's input type without touching the numeric legacy route; rewrote the release-detail "mismatched slug" test to match the resolver's real not-found semantics (confirmed by reading the Go repository's SQL); ordered the project-member route's `getGroupDetail` call after both the resolver call and the `currentProject` guard to avoid an extra fetch on any not-found path.

## Deviations from Plan

None - plan executed exactly as written. All three route files, the navigation type narrowing, and all required tests match the plan's action text and acceptance criteria.

## Issues Encountered

None.

## Requirements Tracking Note

`.planning/REQUIREMENTS.md` has no `P155-*` section (same phase-crossing tracking-artifact gap already documented in 155-01-SUMMARY.md, 155-02-SUMMARY.md, and 155-04-SUMMARY.md — `grep -c "P155"` → 0). Not fixed here for the same reason those plans gave: no established Phase-155 precedent in that file to follow without inventing a section format unilaterally. Flagged for the phase-level verifier/closeout.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three pretty routes now share the resolver as their sole slug-resolution mechanism; no route in this plan calls `getPublicFansubProfileBySlug` anymore (grep-verified, zero occurrences).
- The project page's `canonicalProjectPath`/navigation flow through `loadPublicFansubProjectPageData`'s `precomputed` param, closing the double-profile-load gap Workstream A targeted (155-CONTEXT.md).
- Workstream F (measurement, edge-cases, security/visibility review) is the natural next plan — this plan's routes are ready for the phase's before/after query-budget audit.

---
*Phase: 155-fansub-projektseite-read-model-und-query-budget*
*Completed: 2026-09-11*

## Self-Check: PASSED

Verified `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.test.tsx` exists on disk.
Verified all 3 task commit hashes (`65ed7202`, `a6a4cb7d`, `38ae47d3`) present in
`git log --oneline --all`.

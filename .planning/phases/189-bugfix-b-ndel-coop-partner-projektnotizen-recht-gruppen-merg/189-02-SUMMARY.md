---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 02
subsystem: frontend
tags: [nextjs, react, typescript, vitest, fansub-project-page]

# Dependency graph
requires: ["189-01 (backend coop_groups field)"]
provides:
  - "buildTechnicalFansubProjectPath(animeID, groupID) -- single source of truth for the bare /anime/<id>/group/<id> path"
  - "discoverableOtherGroups(otherGroups, coopGroups, selfGroupId) pure function + discoverableGroups field on PublicFansubProjectPageData"
  - "ProjectStats 1/2/3+ coop-partner name-link rendering with zero AvatarStack/logo usage"
  - "BacklinksSection renders one extra deepLink-styled Link per discoverable group"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Project-page technical-path builder added as a sibling export in fansubProjectRoutes.ts, mirroring buildTechnicalFansubReleasePath"
    - "Pure set-difference helper (discoverableOtherGroups) colocated with its consuming loader (projectPageData.ts), unit-tested without network mocking"
    - "Component data-swap (coop_groups replacing other_groups) kept the existing prop/variable name (cooperationGroups/coopGroups) end-to-end, confirming the original author already anticipated this fix"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.test.tsx
  modified:
    - frontend/src/types/releaseDetail.ts
    - frontend/src/lib/fansubProjectRoutes.ts
    - frontend/src/lib/fansubProjectRoutes.test.ts
    - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
    - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx

key-decisions:
  - "Dropped the viewport-responsive AvatarStack-feeding apparatus (coopPartnerLimitForMatches/subscribeToViewport/currentVisibleLimit/visibleLimit) entirely rather than leaving it as dead code -- D-05's fixed 1/2/3+ name-link format has no viewport-dependent branch, and grep confirmed no other file imported these exports"
  - "Kept the existing coopPartnerDetails/coopPartnerList expandable-list structure and DETAIL_INITIAL_LIMIT=7 pagination unchanged, only swapping the gate condition from AvatarStack overflow math to a fixed coopGroups.length > 2 threshold and the Link href from /fansubs/<slug> to the technical project path"
  - "Placed discoverableOtherGroups in projectPageData.ts (sibling of the loader that assembles otherGroups/cooperationGroups) rather than a new file -- keeps the pure function next to its one real caller and its test next to the loader's existing test suite"

requirements-completed: [D-05, D-06]

# Metrics
duration: ~40min (12:16-12:56 UTC, plan read to final verification)
completed: 2026-10-20
---

# Phase 189 Plan 02: Coop-Partner Frontend Wiring (Header + Mehr entdecken) Summary

**ProjectStats now renders 1/"A · B"/"A · B +N" coop-partner name-links to the partner's own project page (zero AvatarStack/logo), and "Mehr entdecken" gained a provably disjoint discoverable-groups list sourced from the corrected `coop_groups` backend field.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-10-20T12:16:xxZ (plan read)
- **Completed:** 2026-10-20T12:56Z
- **Tasks:** 3
- **Files modified:** 12 (1 created, 11 modified)

## Accomplishments

- `buildTechnicalFansubProjectPath(animeID, groupID)` added to `fansubProjectRoutes.ts` as the single source of truth for the bare `/anime/<id>/group/<id>` path, TDD RED→GREEN, 4/4 tests pass.
- `CursorPage<T>` in `releaseDetail.ts` now types `coop_groups?: FansubGroupSummary[]`, matching the backend field Plan 189-01 shipped.
- `ProjectStats.tsx` fully rewritten per D-05: 0 partners hides the metric, 1 partner renders a single name-link to the partner's project page (reusing the existing `singleCoopPartner` style, link target only changed), 2 partners render `"A · B"` as two independently clickable links, 3+ render `"A · B +N"` where `+N` toggles the pre-existing expandable list (now gated on `coopGroups.length > 2` instead of `AvatarStack`'s viewport-responsive overflow math). `AvatarStack`, `avatarItems`, `resolveApiUrl`, and the entire viewport-responsive apparatus (`coopPartnerLimitForMatches`/`subscribeToViewport`/`currentVisibleLimit`/`MOBILE_QUERY`/`TABLET_QUERY`) were removed as dead code once avatars were dropped — confirmed via grep that no other file imported them. `HeroSection.tsx` now passes `animeID` through to `ProjectStats`.
- `projectPageData.ts`: `cooperationGroups` now sourced from `activityPage.coop_groups` (was the unfiltered `other_groups`, the exact bug D-02/D-04 targeted). A new `otherGroups` field carries the unchanged `activityPage.other_groups`. A new exported pure function `discoverableOtherGroups(otherGroups, coopGroups, selfGroupId)` computes the provably disjoint "Mehr entdecken" set (excludes the viewing group and every coop partner, even when a group appears in both input arrays). `discoverableGroups` added to `PublicFansubProjectPageData`.
- `BacklinksSection.tsx` gained an optional `discoverableGroups` prop; renders one additional `styles.deepLink`-styled `Link` per group targeting the technical project path via `buildTechnicalFansubProjectPath`. Empty/undefined prop renders byte-identical output to before this plan (verified by test). No chip/logo visual component was reused from `releases/page.tsx` — only `buildTechnicalFansubProjectPath` (data/URL logic) is shared, per D-06.
- `ProjectPage.tsx` wires `discoverableGroups={data.discoverableGroups}` into the `BacklinksSection` call.
- Live-verified against the running frontend (after `docker restart team4sv30-frontend`): `GET /anime/4/group/29` renders the header coop-partner metric as a single link `<a href="/anime/4/group/30">Project Messiah</a>` (previously `/fansubs/project-messiah`), and "Mehr entdecken" renders the two pre-existing links with no spurious discoverable-group entries for this anime/group pair (empty-set case, matches expectation since this anime only has the one coop pair). `GET /anime/2/group/26` (the next/image-crash anime mentioned in CONTEXT.md D-07, explicitly out of scope for this plan) still returns 200 with no regression introduced here.
- Full frontend suite green after the change: `npm run test` inside `team4sv30-frontend` → 395 files / 3642 tests passed, 1 skipped file, 0 failures. `npx tsc --noEmit` clean.

## Task Commits

Each task followed the TDD RED/GREEN cycle (`tdd="true"` on all three):

1. **Task 1 (RED):** add failing test for `buildTechnicalFansubProjectPath` — `947569ec5` (test)
2. **Task 1 (GREEN):** `coop_groups` type field + `buildTechnicalFansubProjectPath` helper — `4b48b8f93` (feat)
3. **Task 2 (RED):** add failing tests for ProjectStats 1/2/3+ coop-partner rendering — `88911983a` (test)
4. **Task 2 (GREEN):** ProjectStats 1/2/3+ coop-partner rendering, drop AvatarStack — `9e0f8241a` (feat)
5. **Fix (discovered during Task 2 verification):** update pre-existing `HeroSection`/`page.test.tsx` tests for new coop-partner link targets — `df711cfda` (fix)
6. **Task 3 (RED):** add failing tests for `discoverableOtherGroups` and `BacklinksSection` `discoverableGroups` — `48717fc51` (test)
7. **Task 3 (GREEN):** `discoverableOtherGroups` helper + `coop_groups` data fix + `BacklinksSection` wiring — `19216448f` (feat)

_No plan-metadata commit yet -- STATE.md/ROADMAP.md updates follow this SUMMARY._

## Files Created/Modified

- `frontend/src/types/releaseDetail.ts` - `coop_groups?: FansubGroupSummary[]` added to `CursorPage<T>`
- `frontend/src/lib/fansubProjectRoutes.ts` / `.test.ts` - new `buildTechnicalFansubProjectPath` export + test
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` / `.test.ts` - `coop_groups` data-source fix, `otherGroups` field, `discoverableOtherGroups` pure function + 3 tests, `discoverableGroups` on the result type
- `frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx` / `.test.tsx` - full rewrite of the coop-partner rendering branch (1/2/3+ name-links), AvatarStack/viewport apparatus removed
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - passes `animeID` to `ProjectStats`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx` - new `discoverableGroups` prop, created `BacklinksSection.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx` - wires `discoverableGroups` into `BacklinksSection`
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` - new `.coopPartnerSummary` inline-flex wrapper style for the "A · B [+N]" layout
- `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx` - 2 pre-existing tests updated for the new link targets/format (see Deviations)

## Decisions Made

- Followed the plan's interface spec exactly for all four edit points (href swap, 2+/3+ rewrite, `discoverableOtherGroups` shape, `BacklinksSection` prop).
- Chose to remove the entire viewport-responsive AvatarStack-feeding apparatus rather than leave unused exports in place, since D-05's fixed-format rendering has no breakpoint-dependent branch and grep confirmed zero external consumers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing `HeroSection`/`page.test.tsx` tests broke on the new coop-partner rendering**
- **Found during:** Task 2 full-suite verification (`npm run test` inside the container)
- **Issue:** `page.test.tsx` (not listed in this plan's `files_modified`, but directly downstream of `ProjectStats.tsx`) had two tests written against the old AvatarStack-based 1-partner `/fansubs/<slug>` href and the old 3-partner AvatarStack `title`-attribute rendering. Both assertions became false once Task 2 switched the href target and removed AvatarStack.
- **Fix:** Updated the single-partner href assertion to `/anime/13/group/2`, and rewrote the three-partner test ("rendert auch drei Coop-Gruppen ohne unnötigen Aufklappbutton") to assert the new, factually-different real behavior: D-05 always shows an expand button at 3+ partners (`"A · B +N"`), so the old test's premise ("no overflow button needed for exactly 3 under the desktop viewport") no longer matches the product's chosen UI format. Renamed the test to reflect the new behavior and added `fireEvent.click` on the `+1` button before asserting the third partner's link appears.
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx`
- **Verification:** `npm test -- page.test.tsx` → 20/20 pass; full suite re-run afterward also green.
- **Committed in:** `df711cfda`

---

**Total deviations:** 1 auto-fixed (Rule 1, pre-existing test fixture broken by Task 2's product change — not a product-behavior change, purely updating test expectations to match the plan's explicitly specified new UI format).
**Impact on plan:** No scope creep into product code; the fix only touched test assertions in a file the plan didn't list because the plan's author evidently didn't anticipate this specific pre-existing test's coupling to `AvatarStack` internals.

## Issues Encountered

None beyond the one auto-fixed deviation above.

## User Setup Required

None - no external service configuration required. `docker restart team4sv30-frontend` was run before live verification per the phase's operational constraints.

## Next Phase Readiness

- Plan 189-02 fully delivers D-05/D-06 on top of Plan 189-01's `coop_groups` backend field. The project page header now shows only real coop partners by name with correct links, and "Mehr entdecken" shows the disjoint discoverable-groups set.
- D-07 (next/image crash on the release list) remains explicitly out of scope for this plan and is unaffected — `GET /anime/2/group/26` still returns 200, confirming no regression was introduced by this plan's changes.
- No blockers for subsequent plans in this phase (projektnotizen-recht, gruppen-merge-entfernung, lösch-sperre).

## Self-Check: PASSED

- FOUND: frontend/src/types/releaseDetail.ts
- FOUND: frontend/src/lib/fansubProjectRoutes.ts
- FOUND: frontend/src/lib/fansubProjectRoutes.test.ts
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/sections/ProjectStats.test.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/sections/BacklinksSection.test.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/page.module.css
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx
- FOUND commit: 947569ec5 (test, RED)
- FOUND commit: 4b48b8f93 (feat, GREEN)
- FOUND commit: 88911983a (test, RED)
- FOUND commit: 9e0f8241a (feat, GREEN)
- FOUND commit: df711cfda (fix)
- FOUND commit: 48717fc51 (test, RED)
- FOUND commit: 19216448f (feat, GREEN)

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*

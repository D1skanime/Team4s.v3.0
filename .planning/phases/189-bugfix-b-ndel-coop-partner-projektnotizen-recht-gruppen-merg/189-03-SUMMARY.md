---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 03
subsystem: frontend
tags: [nextjs, react, typescript, vitest, next-image, releases-page]

# Dependency graph
requires: []
provides:
  - "releases/page.tsx split into page.tsx + ReleasesFilterBar.tsx + OtherGroupsChips.tsx + ReleaseEpisodeCard.tsx, all <=450 lines"
  - "Both legacy-logo render sites (group header, 'Weitere Gruppen' chip) route through ResponsiveImage instead of raw next/image"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ResponsiveImage (central publicImagePatterns allowlist + unoptimized fallback) applied to a third call site, mirroring HeroSection.tsx's already-correct usage"
    - "Pure JSX-extraction-first-commit, behavior-fix-second-commit split discipline per CLAUDE.md's 450-line rule"

key-files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/ReleaseEpisodeCard.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.test.tsx
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx

key-decisions:
  - "Redeclared OtherGroup/Episode prop shapes locally in each new component file rather than exporting the page's local types -- avoids importing from a Next.js page module and keeps each component's contract self-contained, per the plan's explicitly allowed alternative"
  - "anyFilterActive (originally boolean | string via `filterOp || filterEd || filterKaraoke || debouncedSearchTerm`) is coerced with Boolean(...) at the ReleasesFilterBar call site to match the plan's declared `anyFilterActive: boolean` prop type -- preserves the exact truthiness behavior used by the two call sites inside the component (style class, aria-pressed), zero behavior change"
  - "episode.thumbnail_url inside the new ReleaseEpisodeCard.tsx intentionally keeps raw next/image, unchanged -- out of D-07's scope per the plan's explicit interfaces note (different URL shape, produced via publicMediaURLForPath, not the legacy /api/v1/media/files/... form)"

requirements-completed: [D-07]

# Metrics
duration: ~55min (12:16-13:11 UTC, plan read to live verification)
completed: 2026-10-20
---

# Phase 189 Plan 03: Releases-Seite next/image-Absturz (D-07) Summary

**`/anime/<id>/group/<id>/releases` no longer crashes for legacy `/api/v1/media/files/...` group-logo URLs -- both render sites now route through the existing ResponsiveImage allowlist-and-fallback component, and the 556-line page.tsx is split into four files under the 450-line limit.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-20T12:16Z (plan read)
- **Completed:** 2026-10-20T13:11Z
- **Tasks:** 2
- **Files modified:** 5 (4 created, 1 modified further in Task 2)

## Accomplishments

- **Task 1 (pure refactor, no behavior change):** `releases/page.tsx` (556 lines) split into itself (417 lines) plus three new presentational components: `ReleasesFilterBar.tsx` (filter chips + search input, wired via explicit props instead of parent closures), `OtherGroupsChips.tsx` ("Weitere Gruppen zu diesem Anime" scroller, still using raw `next/image` at this point -- pure move), and `ReleaseEpisodeCard.tsx` (the two-branch per-episode card, including its own out-of-scope `episode.thumbnail_url` `<Image>` usages, unchanged). All four files are now comfortably under the 450-line CLAUDE.md limit (417/75/56/90 lines respectively). `npx tsc --noEmit` clean; the existing 15-file/134-test `releases` test slice stayed green with zero changes needed, confirming no behavior drift from the extraction.
- **Task 2 (D-07 fix, TDD):** RED -- `OtherGroupsChips.test.tsx` added, asserting a legacy `/api/v1/media/files/logo_..._example.png` logo renders with `data-unoptimized="true"` (mirroring `ResponsiveImage.test.tsx`'s own mock pattern); confirmed failing first (`data-unoptimized="false"` with raw `next/image`). GREEN -- both logo sites swapped: `releases/page.tsx`'s header `group.fansub.logo_url` and `OtherGroupsChips.tsx`'s `otherGroup.logo_url` now import `{ ResponsiveImage } from '@/components/ui/ResponsiveImage'` instead of `next/image`, with identical `src`/`alt`/`width`/`height`/`className` props. New test passes; `npx tsc --noEmit` clean; all four grep-based acceptance checks from the plan (no raw `next/image` import in `page.tsx`, no production `next/image` import in `OtherGroupsChips.tsx`, `ResponsiveImage` present >=1x in both files) pass.
- **Full verification:** `docker exec team4sv30-frontend npm test -- --run` -> 396 files / 3643 tests passed, 1 skipped file, 0 failures (the 3 failures seen on a bare-host `npm run test` -- `badgeArtwork.test.ts`, `ResponsiveImage.config.test.ts`, `RoleCapabilityDetail.membershipBaselineDrift.test.ts` -- are pre-existing, environment-gated tests that require `API_INTERNAL_URL` and an in-container `/backend` mount; they are unrelated to this plan's files and pass cleanly inside the container, confirming they are a host-vs-container environment artifact, not a regression). `npx tsc --noEmit` clean throughout.
- **Live verification (after `docker restart team4sv30-frontend`):** confirmed live via the backend API that group 26's `fansub.logo_url` is exactly the reported crash-triggering legacy shape (`/api/v1/media/files/logo_1789627959614_c8ae19d9dbe2fdda.png`). A headless-browser check of `GET /anime/2/group/26/releases` (the exact URL from the original bug report) rendered both the header logo (`<img alt="Strawhat Subs">`) and the "Weitere Gruppen" chip logo (`<img alt="Bloody-Shadow">`) with their real legacy `/api/v1/media/files/...` `src` values, zero console errors, zero uncaught page errors, and real episode content visible (no error-state fallback) -- proving the fix end-to-end, not just via unit test. (CORS from this sandboxed host required `--disable-web-security` for the automated browser check only, since `CORS_ALLOWED_ORIGINS` defaults to the Windows SSH-tunnel origin `http://127.0.0.1:3300` per project convention; this is a verification-harness detail only, no product/server config was touched.)

## Task Commits

1. **Task 1 (pure refactor, no behavior change):** `486efa97e` -- releases/page.tsx split into ReleasesFilterBar/OtherGroupsChips/ReleaseEpisodeCard (refactor)
2. **Task 2 (RED):** `b8a512325` -- failing test for legacy logo URL in OtherGroupsChips (test)
3. **Task 2 (GREEN):** `28d3cc448` -- D-07 next/image swapped for ResponsiveImage at both sites (feat)

## Files Created/Modified

- `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx` (new) -- filter chips + search input, prop-driven
- `frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.tsx` (new, then modified in Task 2) -- "Weitere Gruppen" chip scroller; now uses `ResponsiveImage`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleaseEpisodeCard.tsx` (new) -- per-episode card, two branches (with/without `episode_id`); `thumbnail_url` `<Image>` usages intentionally unchanged
- `frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.test.tsx` (new) -- D-07 regression test proving the legacy URL shape renders unoptimized instead of crashing
- `frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx` (modified) -- 556 -> 417 lines; renders the three new components; header logo uses `ResponsiveImage`

## Decisions Made

- Redeclared the `OtherGroup`/`Episode` prop shapes locally inside each new component file (the plan explicitly allowed this as an alternative to exporting the types from `page.tsx`), keeping each extracted component's contract self-contained rather than importing from a page module.
- Coerced `anyFilterActive` to `Boolean(...)` at the `ReleasesFilterBar` call site to satisfy the plan's declared `boolean` prop type while preserving the original `boolean | string` truthiness semantics exactly (no behavior change -- only `!anyFilterActive` truthiness checks consume it inside the component).
- Left `ReleaseEpisodeCard.tsx`'s `episode.thumbnail_url` `<Image>` usages on raw `next/image`, unchanged, per the plan's explicit scope note (`publicMediaURLForPath`-produced URLs, a different shape not implicated in D-07).

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed; the only environment-driven detour was the CORS-bypass flag used purely for this plan's own live-verification harness (not a product or server-config change), documented above.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. `docker restart team4sv30-frontend` was run before live verification per the phase's operational constraints.

## Next Phase Readiness

- D-07 is fully closed: both known crash sites on the releases page are fixed and regression-tested; `releases/page.tsx` is under the 450-line limit.
- `episode.thumbnail_url` (a different URL shape, produced via `publicMediaURLForPath`) was explicitly out of scope and remains unaffected -- if a future bug report surfaces a crash for that field, it would need its own investigation (not assumed fixed by this plan).
- No blockers for subsequent plans in this phase (projektnotizen-recht, gruppen-merge-entfernung, lösch-sperre).

## Self-Check: PASSED

- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/ReleaseEpisodeCard.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/OtherGroupsChips.test.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx
- FOUND commit: 486efa97e (refactor, Task 1)
- FOUND commit: b8a512325 (test, RED)
- FOUND commit: 28d3cc448 (feat, GREEN)

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*

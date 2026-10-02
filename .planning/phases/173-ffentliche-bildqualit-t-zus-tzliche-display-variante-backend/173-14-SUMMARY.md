---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 14
subsystem: ui
tags: [nextjs, react, image-optimization, fansub, display-variant]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "display_url field on PublicFansubMediaItem (173-08/173-11) and display-preferring backend resolution of getPublicGroupBase logo_url/banner_url (173-10) and fansub_project_artwork.go banner_url/cover_image (173-09), plus the /media/fansub/** localPatterns + quality=85 Next.js config (173-12)"
provides:
  - "FansubGroupMediaBlock.tsx's media tiles render via ResponsiveImage (quality 85), preferring item.display_url over thumbnail_url/original_url"
  - "FansubBannerDisplay.tsx, FansubProfileTabs.tsx's archive-tab banner, and FansubProjectBannerCard.tsx all render via ResponsiveImage (quality 85) instead of raw next/image with unoptimized"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component swap from raw next/image Image with unoptimized to @/components/ui/ResponsiveImage with an explicit quality={85} prop, importing from the direct file path (matching the project's existing ResponsiveImage import convention, not the @/components/ui barrel index which does not re-export it)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubGroupMediaBlock.tsx
    - frontend/src/components/fansubs/FansubBannerDisplay.tsx
    - frontend/src/components/fansubs/FansubProfileTabs.tsx
    - frontend/src/components/fansubs/FansubProjectBannerCard.tsx
    - frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx

key-decisions:
  - "Imported ResponsiveImage via '@/components/ui/ResponsiveImage' (direct file path) rather than '@/components/ui' (barrel index), matching the established import convention used by every other ResponsiveImage consumer in the codebase (ArtworkHero, PublicReleaseBlock, MemberProfileHero, etc.) -- the barrel index.ts does not re-export ResponsiveImage."
  - "Fixed FansubMediaSection.test.tsx's pre-existing raw-path assertion (Rule 1): now that FansubGroupMediaBlock routes through ResponsiveImage (unoptimized=false), the rendered markup contains an encoded /_next/image?url=... src/srcSet instead of the bare path. Updated the assertion to check for the URL-encoded path, which is the correct and intended new behavior, not a regression."

patterns-established: []

requirements-completed: [REQ-173-28]

# Metrics
duration: ~5min
completed: 2026-10-02
---

# Phase 173 Plan 14: Fansub public media/banner components switch to ResponsiveImage Summary

**FansubGroupMediaBlock, FansubBannerDisplay, FansubProfileTabs (archive banner), and FansubProjectBannerCard now render their public images via `ResponsiveImage` (quality 85) instead of raw `next/image` with `unoptimized`, with FansubGroupMediaBlock additionally preferring `display_url` in its src selection.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-10-02T21:21:45Z (approx, immediately after 173-12's completion)
- **Completed:** 2026-10-02T21:26:11Z
- **Tasks:** 2/2
- **Files modified:** 5 (4 production components + 1 test assertion fix)

## Accomplishments
- `FansubGroupMediaBlock.tsx`'s media-tile `imageUrl` now resolves `item.display_url || item.thumbnail_url || item.original_url` (display_url, added server-side in 173-08/173-11, takes first priority) and renders via `ResponsiveImage` with `quality={85}` instead of raw `<Image unoptimized>`.
- `FansubBannerDisplay.tsx`, `FansubProfileTabs.tsx`'s archive-tab banner, and `FansubProjectBannerCard.tsx` all now render via `ResponsiveImage` (`quality={85}`), with zero src/field changes -- `bannerURL`/`group.banner_url`/`project.banner_url` already resolve through 173-10's `getPublicGroupBase` fix and 173-09's `fansub_project_artwork.go` fix, respectively.
- The existing `onSelect`/`openLightbox` click-to-lightbox flow in `FansubGroupMediaBlock.tsx` is untouched -- D-03 (click shows original) continues to work exactly as before.
- No new HTTP route, no admin/`/me/**` file touched, no src/field-logic change beyond the one explicit priority addition in Task 1 -- confirmed via `git diff --stat` across both commits (only the 4 named TSX components + 1 pre-existing test file).
- All 30 test files / 222 tests under `frontend/src/components/fansubs` pass; `tsc --noEmit` shows zero new errors attributable to these files (pre-existing, unrelated errors in `ReleaseDetailHero.test.tsx` and a generated route type remain, as already documented in 173-11's SUMMARY).

## Task Commits

Each task was committed atomically:

1. **Task 1: FansubGroupMediaBlock.tsx — display-preferring src + ResponsiveImage** - `1f4d5579` (feat)
2. **Task 2: FansubBannerDisplay.tsx, FansubProfileTabs.tsx, FansubProjectBannerCard.tsx — ResponsiveImage component swap** - `d21ce2b1` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `frontend/src/components/fansubs/FansubGroupMediaBlock.tsx` - `imageUrl` now prefers `item.display_url`; swapped `next/image` `<Image unoptimized>` for `ResponsiveImage` (`quality={85}`); removed the now-unused `next/image` import
- `frontend/src/components/fansubs/FansubBannerDisplay.tsx` - swapped `<Image unoptimized priority>` for `<ResponsiveImage quality={85} priority>`; removed the `next/image` import
- `frontend/src/components/fansubs/FansubProfileTabs.tsx` - archive-tab banner swapped `<Image unoptimized>` for `<ResponsiveImage quality={85}>`; removed the `next/image` import
- `frontend/src/components/fansubs/FansubProjectBannerCard.tsx` - swapped `<Image unoptimized>` for `<ResponsiveImage quality={85}>`; removed the `next/image` import
- `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx` - updated one assertion to check for the URL-encoded `/_next/image` path instead of the raw unoptimized path (see Deviations)

## Decisions Made
- Imported `ResponsiveImage` from `@/components/ui/ResponsiveImage` (direct file path), matching the established convention used by every other consumer in the codebase, since `@/components/ui`'s barrel `index.ts` does not re-export `ResponsiveImage`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated FansubMediaSection.test.tsx's stale raw-path assertion**
- **Found during:** Task 2 verification (full `src/components/fansubs` test sweep beyond the plan's own scoped per-task `<verify>` commands)
- **Issue:** `FansubMediaSection.test.tsx` (a different test file than the plan's own `FansubGroupMediaBlock.test.tsx`, which mocks `next/image` and was unaffected) renders `FansubGroupMediaBlock` via `renderToStaticMarkup` without mocking `next/image`, then asserts the raw path `/media/group-gallery-thumb.jpg` appears verbatim in the output. Once `FansubGroupMediaBlock` renders via `ResponsiveImage` (which sets `unoptimized={false}`), the real Next.js `<Image>` component instead emits an encoded `/_next/image?url=%2Fmedia%2F...` src/srcSet -- this is the correct, intended behavior per this plan's objective (route through the Next.js optimizer), not a regression.
- **Fix:** Changed the assertion from `expect(html).toContain('/media/group-gallery-thumb.jpg')` to `expect(html).toContain(encodeURIComponent('/media/group-gallery-thumb.jpg'))`, which passes against the new, correct optimizer-routed markup.
- **Files modified:** `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx`
- **Verification:** Full `npx vitest run src/components/fansubs` sweep: 30/30 test files, 222/222 tests passing.
- **Committed in:** `d21ce2b1` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1, test assertion correction for intended behavior change)
**Impact on plan:** No scope creep -- the fix only updates a test assertion to match the plan's own explicitly intended outcome (routing fansub media through the Next.js image optimizer); no production code beyond what the plan specified was touched.

## Issues Encountered
- `cd frontend && npx tsc --noEmit` fails immediately on the host with npx's "this is not the tsc command you are looking for" banner (no local `typescript` install under the host's `frontend/node_modules`, consistent with 173-11/173-12's documented environment gap). Ran `docker compose exec -T team4sv30-frontend npx tsc --noEmit` and `docker compose exec -T team4sv30-frontend npx vitest run ...` against the running frontend container instead. `tsc` surfaced the same two pre-existing, unrelated error groups 173-11 already documented (a Next.js 16 `PageProps` generated-route-type mismatch, and `ReleaseDetailHero.test.tsx` missing a `previous` fixture property) -- neither mentions any file this plan touched.
- No dedicated test files exist for `FansubProfileTabs.tsx` or `FansubProjectBannerCard.tsx` (the plan's own `<verify>` command for Task 2 referenced them with a `2>/dev/null` guard anticipating this). Verified these two components instead via: (a) `tsc --noEmit` showing zero new errors, (b) the two existing test files that DO render them (`ReadinessTab.test.tsx`, `FansubProjectsSection.test.tsx`) passing unchanged, and (c) the full `src/components/fansubs` sweep passing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four fansub-surface public components named in `173-CONTEXT.md`'s `<findings>` now consume the display-preferring source via `ResponsiveImage` (D-02's fansub half); the release/gallery/hero half (173-13) and the member-profile half (173-15) are the remaining component-wiring plans.
- No regressions: 30/30 test files and 222/222 tests pass under `frontend/src/components/fansubs`; `tsc --noEmit` shows zero new errors; `git diff --stat` across both commits touches only the 4 plan-named files plus the one test-assertion fix.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/FansubGroupMediaBlock.tsx
- FOUND: frontend/src/components/fansubs/FansubBannerDisplay.tsx
- FOUND: frontend/src/components/fansubs/FansubProfileTabs.tsx
- FOUND: frontend/src/components/fansubs/FansubProjectBannerCard.tsx
- FOUND: frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx
- FOUND commit: 1f4d5579
- FOUND commit: d21ce2b1

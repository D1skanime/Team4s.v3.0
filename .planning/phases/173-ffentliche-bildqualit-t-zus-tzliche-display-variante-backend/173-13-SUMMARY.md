---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 13
subsystem: ui
tags: [nextjs, react, image-optimization, display-variant, release-gallery]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "display_url DTO field (173-08), backend display-priority fixes for preview_url/banner_url (173-09), OpenAPI/frontend TS type sync for display_url (173-11), and the /media/fansub/** localPatterns + quality=85 Next.js config (173-12)"
provides:
  - "ReleaseGallery.tsx's grid thumbnails and Kara preview render via ResponsiveImage (quality 85), grid src preferring image.display_url over thumbnail_url/original_url"
  - "projectPageData.releasePreview.ts's buildPublicReleasePreview prefers image.display_url for heroImage/imagePreviews"
  - "PublicReleaseBlock.tsx's FeaturedRelease heroImage + preview tiles render via ResponsiveImage (quality 85)"
  - "HeroSection.tsx's self-hosted banner/poster branch renders via ResponsiveImage (quality 85); the Jellyfin/API-proxy branch keeps the exact unchanged raw next/image unoptimized call"
affects: [173-14, 173-15, 173-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component-level D-02 rollout: swap raw next/image unoptimized -> ResponsiveImage (quality 85) at public-surface components whose backend source is already display-preferring, while preserving any existing click-to-original (D-03) or conditional-unoptimized (Jellyfin proxy) exception unchanged"

key-files:
  created: []
  modified:
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts"
    - "frontend/src/components/fansubs/PublicReleaseBlock.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx"

key-decisions:
  - "Imported ResponsiveImage directly from '@/components/ui/ResponsiveImage' (not the '@/components/ui' barrel), matching the established codebase convention -- the barrel's index.ts does not re-export ResponsiveImage, and every other existing consumer (MemberProfileHero.tsx, FansubHeroSection.tsx, UserMediaTab.tsx, etc.) already imports it from the direct path."
  - "HeroSection.tsx's banner and poster blocks were restructured into an explicit heroImageUrl.includes('/api/') ? <Image unoptimized> : <ResponsiveImage quality=85> ternary rather than keeping the old unconditional <Image unoptimized={...}> call, since ResponsiveImage hard-codes unoptimized={false} with no override -- this is the exact split the plan specified, not a deviation."

patterns-established:
  - "Pattern: when swapping a conditionally-unoptimized next/image call to ResponsiveImage, split into an explicit ternary on the condition rather than trying to parameterize ResponsiveImage, since its props type omits 'unoptimized' entirely."

requirements-completed: [REQ-173-26, REQ-173-27]

# Metrics
duration: 25min
completed: 2026-10-02
---

# Phase 173 Plan 13: Release-gallery/hero public components switch to display-preferring ResponsiveImage Summary

**ReleaseGallery, PublicReleaseBlock's FeaturedRelease, and HeroSection's self-hosted banner/poster branch now render their public images via `ResponsiveImage` (quality 85) sourced from `display_url`/the already-fixed `preview_url`/`banner_url`, with the lightbox's click-to-original and the Jellyfin-proxy `unoptimized` exception both left unchanged.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-02T20:03:00Z (approx)
- **Completed:** 2026-10-02T20:28:00Z (approx)
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments
- `ReleaseGallery.tsx`'s `renderImage` now sources `image.display_url ?? image.thumbnail_url ?? image.original_url` and renders via `ResponsiveImage` (quality 85, no `unoptimized`); `renderKara`'s preview (already display-preferring server-side per 173-09) got the same component swap. The lightbox (`toLightboxItem`, `FansubMediaLightbox`) is untouched -- `original_url ?? thumbnail_url` still drives click-to-original (D-03).
- `projectPageData.releasePreview.ts`'s `buildPublicReleasePreview` now prefers `image.display_url` ahead of `thumbnail_url`/`original_url` when building `heroImage`/`imagePreviews`, feeding `PublicReleaseBlock.tsx`'s `FeaturedRelease`, whose heroImage frame and preview tiles both now render via `ResponsiveImage` (quality 85).
- `HeroSection.tsx`'s banner and poster blocks are each split into `heroImageUrl.includes("/api/")` branches: the Jellyfin/API-proxy branch keeps the exact original raw `next/image` `<Image unoptimized>` call unchanged; the self-hosted branch (backed by `anime.banner_url`, already display-preferring via 173-09) now renders `ResponsiveImage` (quality 85).
- No admin (`/admin/**`) or `/me/**` file touched; no new HTTP route registered (pure TSX/TS component edits).
- No `unoptimized` prop remains anywhere in `ReleaseGallery.tsx` or `PublicReleaseBlock.tsx`; `HeroSection.tsx` retains exactly two `unoptimized` usages, both inside the preserved Jellyfin-proxy branches.

## Task Commits

Each task was committed atomically:

1. **Task 1: ReleaseGallery.tsx — display-preferring grid source + ResponsiveImage, Kara preview component swap** - `03cd0b66` (feat)
2. **Task 2: PublicReleaseBlock.tsx heroImage/preview tiles — display-preferring source via projectPageData.releasePreview.ts** - `acc68166` (feat)
3. **Task 3: HeroSection.tsx — ResponsiveImage for the self-hosted branch, preserve the Jellyfin/API-proxy exception** - `f2bd6817` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` - `renderImage`'s `src` priority gains `display_url`; both `renderImage` and `renderKara` swap raw `next/image unoptimized` for `ResponsiveImage` (quality 85); the now-unused `next/image` `Image` import was removed
- `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts` - `buildPublicReleasePreview`'s `imagePreviews` mapping's `src` now prefers `image.display_url`
- `frontend/src/components/fansubs/PublicReleaseBlock.tsx` - `FeaturedRelease`'s heroImage frame and preview-tile `<Image>` calls both swap to `ResponsiveImage` (quality 85); the now-unused `next/image` `Image` import was removed
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx` - banner and poster blocks each split into a Jellyfin-proxy (`<Image unoptimized>`, unchanged) vs. self-hosted (`<ResponsiveImage quality=85>`, new) ternary; the `next/image` `Image` import is retained for the still-needed Jellyfin branch

## Decisions Made
- Imported `ResponsiveImage` from `@/components/ui/ResponsiveImage` directly rather than the `@/components/ui` barrel, since the barrel's `index.ts` does not re-export it and every other existing consumer in the codebase uses the direct path (confirmed via grep across `frontend/src/components/profile/`, `frontend/src/components/fansubs/`, `frontend/src/app/admin/users/tabs/`, etc.). The plan's interface note said "alongside the existing Button, Badge, Modal, SectionHeader import" (which does come from the barrel) — this is a Rule 3 (blocking) correction to keep the import resolvable, matching the codebase's actual, consistent convention rather than the plan's imprecise phrasing.
- Followed the plan's exact HeroSection ternary structure: `heroImageUrl.includes("/api/") ? <Image unoptimized> : <ResponsiveImage quality=85>` for both the banner and poster blocks, since `ResponsiveImage`'s props type (`Omit<ImageProps, 'src' | 'unoptimized'>`) makes a single parameterized component impossible.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Imported ResponsiveImage from its direct module path, not the `@/components/ui` barrel**
- **Found during:** Task 1 (ReleaseGallery.tsx edit)
- **Issue:** The plan's interface section implied importing `ResponsiveImage` "alongside the existing Button, Badge, Modal, SectionHeader import" from `@/components/ui`. Checked `frontend/src/components/ui/index.ts` — it does not export `ResponsiveImage` (confirmed by grep; `ResponsiveImage.tsx` exists but has no barrel re-export line). Importing from the barrel would fail to resolve the named export.
- **Fix:** Imported `ResponsiveImage` from `@/components/ui/ResponsiveImage` directly in all three touched components, matching every other existing consumer in the codebase (`MemberProfileHero.tsx`, `FansubHeroSection.tsx`, `AchievementArtwork.tsx`, `UserMediaTab.tsx`, and others all use the direct path).
- **Files modified:** `ReleaseGallery.tsx`, `PublicReleaseBlock.tsx`, `HeroSection.tsx`
- **Verification:** `npx tsc --noEmit` inside the frontend container shows zero new errors attributable to these imports; all 50 vitest files in `src/components/fansubs` + `src/app/anime` pass (424 tests).
- **Committed in:** `03cd0b66`, `acc68166`, `f2bd6817` (Task 1/2/3 commits)

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking import-path correction)
**Impact on plan:** No scope creep — the plan's actual must_haves truths (display_url priority, ResponsiveImage usage, D-03/Jellyfin-exception preservation) are all satisfied; only the plan's imprecise import-source phrasing needed correcting to match the barrel's actual exports.

## Issues Encountered
- `cd frontend && npx tsc --noEmit` on the host has no local `typescript`/`node_modules` install (consistent with prior 173-* plans). Ran `docker exec -w /app team4sv30-frontend npx tsc --noEmit` against the running frontend container instead. That run surfaces the same pre-existing, unrelated errors already documented in 173-11's summary (a Next.js 16 `PageProps` constraint mismatch on a generated route type, and `ReleaseDetailHero.test.tsx` fixtures missing a `previous` property) — confirmed via inspection that none reference `display_url`, `ResponsiveImage`, or any of this plan's four touched files.
- No test file exists for `projectPageData.releasePreview.ts` or `HeroSection.tsx` (the plan's own `<verify>` commands pipe these through `2>/dev/null` with a fallback, anticipating this). Verified those two files' changes via the full `tsc --noEmit` pass and, for `PublicReleaseBlock.tsx` (which consumes `releasePreview.ts`'s output), the existing `PublicReleaseBlock.test.tsx` (4 tests, all passing).
- `npx eslint` on all four touched files found zero new issues; one pre-existing warning (`'groups' is assigned a value but never used` in `ReleaseGallery.tsx`, an unrelated destructured prop) is unchanged by this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three public components named in `173-CONTEXT.md`'s `<findings>` now consume display-preferring sources via `ResponsiveImage`; 173-14/173-15 (remaining public surfaces) and 173-16 (live D-13 UAT measurement) can proceed without further changes to these four files.
- No regressions introduced: the full `src/components/fansubs` + `src/app/anime` vitest sweep (50 files, 424 tests) is green; `tsc --noEmit` shows zero new errors; `eslint` shows zero new findings.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

All 5 claimed files (4 production + this summary) found on disk; all 3 claimed commits (`03cd0b66`, `acc68166`, `f2bd6817`) found in git log.

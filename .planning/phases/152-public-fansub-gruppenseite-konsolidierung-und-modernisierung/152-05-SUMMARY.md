---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 05
subsystem: ui
tags: [next-image, image-optimizer, fansubs, hero, accessibility-naming, documentation]

requires:
  - phase: 151-badge-gemeinsame-artwork-praesentation
    provides: "ResponsiveImage optimizer-with-unoptimized-retry wrapper (@/components/ui/ResponsiveImage), already proven live for MemberProfileHero's backdrop/avatar"

provides:
  - "FansubHeroSection.tsx's logo/banner now render via next/image's real optimizer (webp, responsive srcset) instead of always-unoptimized full-size PNGs"
  - "A documented, intentional divergence between FansubHeroSection.buildInitials (group-name initials) and fansubTeamInitials.getMemberInitials (person-name initials), preventing an accidental silent behavior merge"
  - "A recorded, non-code-changing analysis of FansubProjectBannerCard.tsx's image path (E3): sizes/lazy already adequate, optimizer swap deliberately not applied because the live source is a dynamic Jellyfin-proxied endpoint, not a static file"

affects: [fansub-public-page, image-optimization]

tech-stack:
  added: []
  patterns:
    - "ResponsiveImage (optimizer-first, single unoptimized retry on onError, same src never swapped) is now the standard for Hero-tier above-the-fold images across both member and fansub-group heroes"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubHeroSection.tsx

key-decisions:
  - "Hero banner/logo swapped from next/image+unoptimized to ResponsiveImage after live-verifying the DB's logo_url/banner_url shape (/api/v1/media/files/*.png) against next.config.mjs's existing configuredApiMediaPatterns() remotePattern -- zero config changes needed."
  - "buildInitials's divergence from getMemberInitials is documented via a German code comment, not consolidated -- consolidating would visibly change the Hero's single-word-group-name fallback avatar ('C' -> 'CO') and needs explicit product sign-off per USER-REQUEST C3."
  - "FansubProjectBannerCard.tsx (E3) is left unchanged: its sizes/loading=lazy usage is already adequate, and its live banner_url resolves to a dynamic Jellyfin-proxy endpoint (/api/v1/media/image?item_id=...&kind=banner&provider=jellyfin), not a static file -- optimizing a dynamic per-request proxy image is the 'schwierig' (difficult) case the user's E3 instruction anticipates leaving alone."

patterns-established:
  - "Hero-tier images (always above the fold) use loading=\"eager\" with ResponsiveImage; priority is preserved separately where the original next/image already had it (banner keeps priority, matching MemberProfileHero's backdrop convention of eager+high fetchPriority)."

requirements-completed: [P152-06, P152-10]

duration: 35min
completed: 2026-09-08
---

# Phase 152 Plan 05: Hero Image Optimization and buildInitials Documentation Summary

**Hero logo/banner now serve through Next's real image optimizer (live-verified 200s via `/_next/image`), `buildInitials`'s deliberate divergence from `getMemberInitials` is documented in German rather than silently merged, and the project-banner image path is confirmed already-adequate and left untouched per explicit analysis-only instruction.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-08T17:16:00Z
- **Completed:** 2026-09-08T17:50:00Z
- **Tasks:** 3 (2 code changes, 1 analysis-only)
- **Files modified:** 1

## Accomplishments

- Hero banner and logo images in `FansubHeroSection.tsx` migrated from plain `next/image` with a hardcoded `unoptimized` prop to `ResponsiveImage` (the same optimizer-retry wrapper `MemberProfileHero.tsx` already uses), after live-verifying the group's `logo_url`/`banner_url` DB values match `next.config.mjs`'s existing `configuredApiMediaPatterns()` remotePattern with zero config changes.
- Live proof of the optimizer swap: `curl` against the resolved `/_next/image?url=...` URLs for both the actual logo and banner returned `200` (31,454 bytes / 108,044 bytes respectively, both valid re-encoded PNGs), and the rendered page HTML's `srcset` uses `/_next/image?...` URLs across all configured `deviceSizes`/`imageSizes` steps — the optimizer path is genuinely active, not silently falling back to the `unoptimized` retry.
- `buildInitials`'s deliberate divergence from `fansubTeamInitials.getMemberInitials` (group-name vs. person-name truncation rules) is now documented with a German-language code comment giving concrete before/after examples, per USER-REQUEST C3 — no logic or call-site change.
- `FansubProjectBannerCard.tsx` (E3, analysis-only) was investigated: its `sizes`/`loading="lazy"` usage is confirmed already correct for its grid geometry (minor note: the `480px` desktop `sizes` hint is somewhat larger than the card's actual max rendered width of 320px per `.bannerGrid`'s `minmax(240px, 320px)` — a mild, non-regressive over-fetch, not a bug). The live project's `banner_url` resolves to a **dynamic Jellyfin-proxy endpoint** (`/api/v1/media/image?item_id=...&kind=banner&provider=jellyfin`), not a static file — per the user's explicit E3 instruction ("wenn ... Image-Optimierung schwierig wäre, belassen"), this dynamic-proxy case was left unchanged with no code modification.

## Task Commits

1. **Task 1: Verify Hero image URL shape and swap to optimized ResponsiveImage rendering** - `728cfecf` (perf)
2. **Task 2: Document the buildInitials/getMemberInitials divergence (C3)** - `e3492894` (docs)
3. **Task 3: Analyze the project-banner image path (E3, analysis-only)** - no commit (analysis-only, no code change; finding recorded in this SUMMARY per plan instruction)

**Plan metadata:** (this commit, pending)

## Files Created/Modified

- `frontend/src/components/fansubs/FansubHeroSection.tsx` - Hero banner/logo now use `ResponsiveImage` with `sizes`/`loading="eager"` instead of `next/image`+`unoptimized`; `buildInitials` now carries a documenting comment explaining its intentional divergence from `getMemberInitials`.

## Decisions Made

- See `key-decisions` in frontmatter above. In summary: the Hero image optimizer swap was applied because the live URL shape provably matches the existing remotePattern (verified via a fresh `psql` query against the live DB at execution time, not just trusting the plan's planning-time finding); the `buildInitials` divergence was documented, not merged, because merging is a visible product-facing behavior change requiring separate sign-off; the project-banner path was left untouched because its source is dynamically Jellyfin-proxied, not a static file, matching the user's own "schwierig" carve-out.

## Deviations from Plan

None — plan executed exactly as written. Task 3 correctly produced no code change per its own explicit "analysis-only" instruction; this is expected behavior, not a deviation.

## Issues Encountered

- A pre-existing, unrelated test failure was found while running the full `src/components/fansubs` test suite: `FansubMediaLightbox.test.tsx` (3 failing assertions against `FansubGroupMediaBlock`, an alt-text lookup mismatch). Neither the test file nor `FansubGroupMediaBlock.tsx` were touched by this plan (confirmed via `git status --short` showing only `FansubHeroSection.tsx` modified, and via `git log` showing both files were last changed in an unrelated prior commit `842ee118`). Per the executor's scope-boundary rule, this was not fixed here — logged to `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/deferred-items.md` for a future hardening pass.
- A pre-existing, unrelated `tsc --noEmit` error was observed in the gitignored generated file `frontend/.next/dev/types/app/anime/page.ts` (an `AnimePageProps`/`PageProps` type mismatch on the unrelated `/anime` route). Confirmed gitignored via `git check-ignore`, confirmed no error references any file this plan touched (`grep -i fansub` on the full `tsc` output returned nothing). Not fixed — out of scope, pre-existing build-artifact drift.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Hero's image optimization pattern (`ResponsiveImage`, `sizes`, `loading="eager"`) is now consistent between `MemberProfileHero.tsx` and `FansubHeroSection.tsx`, closing E1/E2.
- C3's divergence is now explicit in code, unblocking any future reviewer decision on whether to actually consolidate (a decision this plan explicitly did not make, per instruction).
- E3 is closed as "confirmed already-adequate, no change" with a documented reason, ready for the phase's remaining workstreams (History-artwork migration, CSS consolidation, etc. in other 152-* plans) which are independent of this file.
- `deferred-items.md` in the phase directory now tracks the one pre-existing, out-of-scope test failure discovered during this plan's verification run.

---
*Phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/FansubHeroSection.tsx
- FOUND: .planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/deferred-items.md
- FOUND commit: 728cfecf (Task 1)
- FOUND commit: e3492894 (Task 2)

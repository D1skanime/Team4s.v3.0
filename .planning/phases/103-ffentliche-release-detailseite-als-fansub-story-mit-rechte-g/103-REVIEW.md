---
phase: 103
reviewed: 2026-07-16
status: issues_found
base: c4c31636
head: HEAD
files_reviewed: 41
findings:
  critical: 0
  warning: 2
  info: 0
  total: 2
---

# Phase 103 Gap Implementation Code Review

## Scope

Reviewed all source changes in `git diff c4c31636..HEAD`, excluding planning artifacts, `frontend/next-env.d.ts`, and lockfiles. The intentionally deleted playback-access Next relay and its test were treated as expected architecture cleanup, not missing files.

Cross-file review covered:

- release-version media PATCH/list permission annotation and preview mutation;
- public Pretty route resolution and numeric ownership validation;
- project/release link construction and adjacent navigation;
- public release composition, Anime-logo render fallback, timeline and full-episode access;
- central `apiClientFetch` refresh behavior and retained stream relays;
- unified gallery pagination/deduplication and shared lightbox behavior;
- responsive notes/gallery layout and associated tests.

## Findings

### [WARNING] Preview card opener styles apply only below 760px

**Evidence:** `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css:467-492`

`ReleaseVersionMediaSection.tsx` replaces the former fully styled `.mediaCard` button with a wrapper `<div className={styles.mediaCard}>` and a nested `<button className={styles.mediaCardOpen}>`. The only `.mediaCardOpen` rule, together with the margin rule for the new preview button, is declared *inside* `@media (max-width: 760px)` at lines 467-492.

On desktop the nested native button therefore has no reset/layout rules: its border, background, padding, font inheritance, width/grid behavior, and cursor fall back to browser defaults. The new preview action also lacks its intended card margin. This directly affects the primary desktop admin workspace and can make the thumbnail/body opener render as a small default button instead of filling the media card.

**Revision:** Move the base `.mediaCardOpen` and `.mediaCard > :global(button:last-child)` declarations outside the mobile media query. Keep only genuinely responsive overrides inside the query. Add a component/CSS contract assertion or desktop visual test that the opener fills the card and the preview action remains separately clickable.

### [WARNING] Viewport-dependent initial state can hydrate the gallery with a different item count

**Evidence:** `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/responsiveGalleryReveal.ts:18-26`; consumer at `ReleaseGallery.tsx:47-53`

`useResponsiveGalleryReveal` initializes React state with `useState(currentLimit)`. During server rendering `currentLimit()` returns the desktop limit `6` because `window` is unavailable. During mobile/tablet hydration the same initializer can immediately return `2` or `4` from `window.matchMedia`. `ReleaseGallery` uses that value to slice the actual rendered card list.

The server and first browser render can therefore contain different numbers of `<article>` elements, which risks a hydration mismatch/regeneration on every non-desktop initial load. Existing tests mount only in jsdom and exercise resize events; they do not render server HTML and hydrate it at a mobile breakpoint.

**Revision:** Give React a stable server/client hydration snapshot, then subscribe to the real viewport after hydration (for example a deterministic initial limit plus effect update, or `useSyncExternalStore` with an explicit server snapshot). Add an SSR-plus-`hydrateRoot` regression at mobile/tablet widths and retain the current resize/expanded-state tests.

## Confirmed contracts

- Public and admin release images remain on `release_version_media` and are addressed by a real `release_version_id`; no episode media ownership or parallel media API was introduced.
- Anime logo is read only as a presentation fallback and is never linked to the release.
- Pretty route resolution maps slugs to numeric anime/group context, while the existing aggregate performs the final release/group ownership check.
- Full-episode access now uses the central browser `apiClientFetch` seam; grant and byte-stream relays remain protected and server-authoritative.
- Public Karaoke projection is session-neutral; authenticated state only adds playback affordances.
- PATCH media responses now reuse actor-specific permission annotation, and preview selection continues through the existing atomic max-one backend seam.

## Review result

`issues_found` — no critical security or ownership defect found, but the two responsive/layout issues above should be corrected before Phase 103 is considered visually complete.

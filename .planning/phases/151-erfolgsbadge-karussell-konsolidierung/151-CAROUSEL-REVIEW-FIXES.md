# Phase 151 Carousel Review Fixes

## Scope

This bounded pass addresses only the three `FocalCarousel` findings in
`151-INTEGRATION-REVIEW.md`. It does not approve the full phase or waive the
separate Karaoke artwork findings.

## RED evidence

### Native `inert` click activation

Linux Playwright 1.55.0 with Chromium 140.0.7339.16 opened the real gallery at
`/dev/ui-system/achievements`, waited for
`[data-achievement-gallery][data-gallery-ready="true"]`, and exercised
`[data-stress-count="100"]` with a coordinate-based mouse click.

- Before the fix, the inactive second item had native `inert`.
- `document.elementFromPoint(593.640625, 450.046875)` resolved to the owned
  items container, not the inert item subtree.
- A real mouse click left the active index at `0` instead of selecting index
  `1`.
- Browser console and HTTP error collection for this bounded probe was empty.

Artifacts:

- `/tmp/team4s-phase151-carousel-review/native-inert-red.json`
- `/tmp/team4s-phase151-carousel-review/native-inert-red.png`

### Focused component regressions

The first focused run after adding behavioral tests produced the intended RED:

```text
src/components/ui/FocalCarousel.test.tsx
Test Files  1 failed (1)
Tests       3 failed | 34 passed (37)
```

The three failures independently covered track-level inactive-item selection,
animation cancellation plus physical collapse restoration, and cancellation /
first-command behavior after shrinking five items to two.

## Changes

### 1. Native `inert` and direct selection

- Inactive item wrappers and all descendants remain native `inert`.
- Selection moved from the inert wrapper to the non-inert carousel track.
- `ownedItemIndexAtPoint` checks only direct owned items against the real click
  coordinates, retaining nested-carousel isolation.
- Clicks originating from active nested controls remain untouched.
- The existing capture-phase drag-click suppression still runs before track
  selection.

### 2. Expand/collapse lifecycle

- Expansion cancels settle timers, measurement RAFs, and programmatic RAFs
  before switching to the expanded branch.
- The track callback ref performs an immediate, non-animated physical center
  restore whenever the collapsed track mounts.
- Focus restoration remains in the following effect, so positioning happens
  before focus returns to the disclosure control.

### 3. Shrinking visible items

- A guarded render-time item-count synchronization clamps the active state and
  active ref together, avoiding `setState` in an effect.
- The item-count-specific track ref cancels obsolete work and immediately
  recenters the clamped item after the direct item set changes.
- One Previous command after a five-to-two shrink now moves index `1` to `0`.

The adjacent duration remains 210 ms, manual settle remains 120 ms, and the
existing reduced-motion, direct-jump, wheel ownership, full-mount, focus,
keyboard-bound, nested-track, drag suppression, and request-free contracts are
unchanged.

## GREEN evidence

### Focused and consumer tests

```text
npx vitest run src/components/ui/FocalCarousel.test.tsx
37 passed

npx vitest run \
  src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx \
  src/components/profile/MemberBadgeChain.test.tsx \
  src/app/dev/ui-system/showcase/AchievementBadgeShowcase.test.tsx
105 passed
```

The Focal suite includes both 100- and 200-item stress cases and continues to
assert exactly four additional `renderItem` calls over End + Home with zero
`fetch` or XHR calls.

The final combined run passed all 142 tests. It retained the pre-existing React
`act(...)` warnings in the manual-scroll and horizontal-wheel tests; those
warnings were already present in the RED baseline and are not new failures.

### Native Chromium

The GREEN Chromium probe on `[data-stress-count="100"]` recorded:

- real coordinate click: active `0 -> 1`;
- inert flags for the first three items after selection: `[true, false, true]`;
- an injected button under the inactive item could not receive focus;
- a drag-release over the inactive neighbor kept active index `0`;
- collapse restored logical index `1`, physical `scrollLeft = 374`, and an
  active-item center delta of `0.296875 px` before focus was observed on
  `Alle 100 Auszeichnungen anzeigen`;
- 100 direct items stayed mounted;
- End + Home produced render delta `4` and request delta `0`.

The dedicated in-flight probe captured index `1` at 24 ms with navigation state
`moving`, the programmatic class present, and `scrollLeft = 160`. Expansion
removed the animation class, detached the old track, and no further mutation
occurred during the following 300 ms.

Artifacts:

- `/tmp/team4s-phase151-carousel-review/native-inert-collapse-green.json`
- `/tmp/team4s-phase151-carousel-review/native-inert-collapse-green.png`
- `/tmp/team4s-phase151-carousel-review/inflight-expand-green.json`

### Static checks

```text
npx eslint src/components/ui/FocalCarousel.tsx \
  src/components/ui/FocalCarouselInternals.tsx \
  src/components/ui/FocalCarousel.test.tsx --max-warnings=0
0 errors, 0 warnings

wc -l src/components/ui/FocalCarousel.tsx \
  src/components/ui/FocalCarouselInternals.tsx
450 FocalCarousel.tsx
242 FocalCarouselInternals.tsx

git diff --check -- <owned files>
passed
```

Full `npm run typecheck` reaches only the known unrelated generated Next type
failure for `GroupReleasesPageProps` in
`.next/dev/types/app/anime/[id]/group/[groupId]/releases/page.ts:36`. No changed
FocalCarousel file reports a type error.

## Uncertainties and exclusions

- Native `inert`, interruption, collapse geometry, focus exclusion, drag
  suppression, full mount, render count, and request count were browser-proven.
- The gallery has no runtime control for replacing a mounted carousel's props,
  so the five-to-two shrink is covered with deterministic DOM geometry in the
  component test rather than a gallery mutation.
- Missing Karaoke artwork is outside this worker's ownership and remains a
  separate phase-approval concern; this bounded result does not waive it.
- No CSS, gallery, collector script, profile, artwork, API, runtime, or data
  changes were made.

## Coordinator follow-up

The real full viewport matrix found disclosure buttons at36px high. The shared `.toggle` now has44px minimum width/height. Chromium at390px measured every six gallery disclosure controls at44px height, with widths223–286px (`/tmp/team4s-151-root-targets-and-nav.json`). This preserves their styling and labels. Scoped ESLint and diff checks pass.

---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
reviewed: 2026-10-09T23:50:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx
  - frontend/src/components/fansubs/FansubMediaLightbox.tsx
  - frontend/src/components/fansubs/FansubMediaLightbox.module.css
  - frontend/src/components/fansubs/MediaViewerCaption.module.css
  - frontend/src/components/fansubs/MediaViewerCaption.tsx
  - frontend/src/components/fansubs/MediaViewerStage.module.css
  - frontend/src/components/fansubs/MediaViewerStage.tsx
  - frontend/src/components/ui/Modal.module.css
  - frontend/src/components/ui/index.ts
  - frontend/src/lib/mediaViewerCaptionPanel.test.ts
  - frontend/src/lib/mediaViewerCaptionPanel.ts
  - frontend/src/lib/mediaViewerNavigation.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: clean
---

# Phase 177: Code Review Report (Final Verification Pass)

**Reviewed:** 2026-10-09T23:50:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** clean

## Summary

This is the final verification pass on the diff `5434a019..HEAD` (10 commits,
`a9f7d4fd` through `82cce7d2`) for the unified media viewer (F-18), after two
prior Live-UAT rejection rounds and multiple review/fix cycles. The specific
target of this pass was the Critical regression found in the previous review
round: commit `7316f608` ("WR-05") reused the `originalLoaded` flag to mean
both "preload attempt has settled" (pill-hiding) and "preload succeeded, safe
to swap the visible `<img>` to `originalUrl`" (`selectDisplaySrc`'s contract) —
causing a confirmed-broken `original_url` to replace a correctly-displayed
fallback image with a hard load error.

**That regression is now genuinely fixed** by commit `82cce7d2`. Verified by
reading both `MediaViewerStage.tsx` and `mediaViewerNavigation.ts` directly and
tracing every path through the state machine (see "Regression Re-Verification"
below), confirming unit test behavior, and running the actual test suite
(`mediaViewerNavigation.test.ts`, `mediaViewerCaptionPanel.test.ts`,
`MediaViewerStage.test.ts` — 43/43 passing).

No new Critical or Warning issues were found in this pass across all 12 files.
One pre-existing (not introduced by this diff, confirmed unchanged by `git
diff`) minor cosmetic inconsistency is noted at Info level for completeness,
but it does not rise to Warning: it is a transient visual mismatch, not an
incorrect/broken display.

## Regression Re-Verification: `originalLoaded` / `originalFailed` state machine

Traced `MediaViewerStage.tsx`'s full state machine end-to-end:

1. **On item change** (`useEffect` keyed on `item.id`, lines 92–97): all three
   flags (`originalLoaded`, `originalFailed`, `hasError`) are synchronously
   reset to `false`. No stale carry-over from the previous image.

2. **On preload success** (`preload.onload`, line 105–107): only
   `setOriginalLoaded(true)` fires. `originalFailed` stays `false`.

3. **On preload failure** (`preload.onerror`, line 108–117): only
   `setOriginalFailed(true)` fires. `originalLoaded` stays `false`. The two
   flags are now structurally independent — `onload`/`onerror` on a single
   `window.Image()` are mutually exclusive per load attempt, so both flags
   being `true` simultaneously for the same preload cycle is not reachable.

4. **`selectDisplaySrc` call site** (line 130):
   `selectDisplaySrc({ displayUrl, originalUrl, thumbnailUrl, originalLoaded })`
   — passes the strict, success-only `originalLoaded`. `originalFailed` is
   never passed here. This means a confirmed-broken `originalUrl` can never
   cause the function's `if (originalLoaded && originalUrl) return originalUrl`
   branch to fire; the display/thumbnail fallback chain
   (`displayUrl ?? originalUrl ?? thumbnailUrl ?? null`) is preserved exactly
   as intended. This directly closes the previously-found regression.

5. **Pill-hide condition** (line 131):
   `shouldShowLoadingPill(displayUrl, originalUrl, originalLoaded ||
   originalFailed)` — merges both flags only for the pill decision. Since
   `shouldShowLoadingPill` returns `false` once its third argument is `true`,
   the pill correctly disappears on *either* settle outcome (success or
   failure), closing the original "eternal loading pill" bug (`WR-05`'s
   original intent) without reintroducing the swap-to-broken-URL regression.

6. **Hard `<img>` load error** (`onError={() => setHasError(true)}`, line 193):
   independent third flag, only ever set from the real rendered `<img>`
   element's own `error` event (e.g. the currently-displayed `displaySrc`
   itself — which, per point 4, can never be a known-bad `originalUrl` —
   fails for some other reason, such as the display/thumbnail URL itself
   being broken). `showLoadingPill` is gated by `!hasError` (line 131) and the
   width-measurement effect is gated by `!hasError` (line 145), so once a hard
   error occurs the pill and width reporting both correctly stand down in
   favor of `ErrorState`.

No path exists where a known-bad URL is displayed, no path where the pill
sticks forever, and no path where `originalLoaded`/`originalFailed` can both
hold a value that confuses `selectDisplaySrc` — the two flags are read by two
different, single-purpose consumers (`selectDisplaySrc` reads success-only;
the pill reads the merged settle state), matching the exact contract fix from
the prior review.

Cross-checked against the existing unit tests: `mediaViewerNavigation.test.ts`
("fällt auf die Original-URL zurück, wenn keine Display-URL vorhanden ist" /
"wechselt nahtlos zur Original-URL, sobald das Original geladen ist") confirm
`selectDisplaySrc`'s contract is unchanged and still success-only.
`MediaViewerStage.test.ts`'s `shouldShowLoadingPill` tests confirm the pure
pill-visibility logic is unaffected by the flag-merging, which happens only at
the call site in the component, not inside the tested pure function. All 43
tests across the three relevant test files pass.

## Info

### IN-01: Loading pill can show briefly while the real `<img>` is already requesting `original_url` directly (pre-existing, not introduced by this diff)

**File:** `frontend/src/components/fansubs/MediaViewerStage.tsx:130-131`, `frontend/src/lib/mediaViewerNavigation.ts:62-69`
**Issue:** When an item has no `display_url` (e.g. `ScreenshotGallery`'s
mapping leaves `display_url` `undefined` for some `PublicReleaseImage`
records), `selectDisplaySrc` falls through directly to `originalUrl` on the
very first render — `displayUrl ?? originalUrl ?? thumbnailUrl ?? null` — even
though the separate preload `Image()` object for that same `originalUrl` has
not yet settled. The real `<img>` element is therefore already attempting to
load `originalUrl` directly while `shouldShowLoadingPill` still shows
"Originalbild wird geladen …", because its condition
(`displayUrl !== originalUrl`) is `true` (`null !== 'original.jpg'`). The pill
text is momentarily misleading (implies a pending swap that has, in effect,
already happened) until the preload settles and the pill is hidden. This is
unchanged by the diff under review (confirmed via `git diff
5434a019..HEAD` — the `selectDisplaySrc` fallback chain and
`shouldShowLoadingPill` logic are untouched except for the `originalFailed`
OR-merge added in `82cce7d2`), is purely cosmetic (no broken/duplicate image
is ever shown — both the real `<img>` and the preload `Image()` request the
same, eventually-resolving URL), and self-resolves within one round-trip.
**Fix (optional, non-blocking):** If this is worth polishing later, gate the
pill on `displayUrl !== null && displayUrl !== originalUrl` instead of merely
`displayUrl !== originalUrl`, since a `null` `displayUrl` never represents a
pending swap (there is nothing to swap away from).

---

_Reviewed: 2026-10-09T23:50:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

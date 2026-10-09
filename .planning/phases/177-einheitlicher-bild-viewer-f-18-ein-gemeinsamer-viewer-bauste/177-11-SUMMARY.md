---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 11
subsystem: ui
tags: [react, nextjs, css-modules, media-viewer, design-system]

# Dependency graph
requires:
  - phase: 177-09
    provides: "Modal variant=\"stage\" fullscreen chrome, additive onEscapeKeyDown hook, NavArrow primitive (size=\"large\")"
  - phase: 177-10
    provides: "mediaViewerNavigation.ts wheel/visibility functions, mediaViewerCaptionPanel.ts caption-panel pure functions, ThumbnailStrip primitive"
provides:
  - "MediaViewerHeader.tsx -- top-of-stage title/category/episode/release-version block, graceful-omission-as-a-whole (D-30)"
  - "MediaViewerCaption.tsx -- bottom caption block with 3-4 line fade clamp, Weiterlesen slide-up panel, Release-öffnen CTA (D-30/D-31)"
  - "MediaViewerStage.tsx -- NavArrow size=\"large\" at screen edges with gutter reservation (D-27), throttled wheel-navigation (D-29), single-image hide (D-32)"
  - "FansubMediaLightbox.tsx -- lifted captionPanelOpen state, Modal two-stage Escape wiring, Header/Stage/Caption/ThumbnailStrip composition"
affects: ["Plan 177-08's re-run Live-UAT checkpoint"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Caption-panel lifted state owned by the viewer shell (not the leaf caption component) because it gates three siblings: Modal's Escape handling, the stage's gesture gating, and the caption panel's own open/closed render"
    - "DOM-measurement effects that call setState use the codebase's existing react-hooks/set-state-in-effect disable-comment precedent rather than refactoring away from the ref+useLayoutEffect pattern"

key-files:
  created:
    - frontend/src/components/fansubs/MediaViewerHeader.tsx
    - frontend/src/components/fansubs/MediaViewerHeader.module.css
    - frontend/src/components/fansubs/MediaViewerCaption.tsx
    - frontend/src/components/fansubs/MediaViewerCaption.module.css
  modified:
    - frontend/src/components/fansubs/MediaViewerStage.tsx
    - frontend/src/components/fansubs/MediaViewerStage.module.css
    - frontend/src/components/fansubs/FansubMediaLightbox.tsx
    - frontend/src/components/fansubs/FansubMediaLightbox.module.css
  deleted:
    - frontend/src/components/fansubs/MediaViewerMetadataPanel.tsx
    - frontend/src/components/fansubs/MediaViewerMetadataPanel.module.css

key-decisions:
  - "MediaViewerCaption's non-render gate is '!caption && !hasReleaseHref' (narrower than a literal 'no caption -> no caption area' reading) to keep the already-shipped, already-tested CTA-without-caption case in ProjectMemberMediaGallery.test.tsx working"
  - "captionPanelOpen is lifted into FansubMediaLightbox, not local to MediaViewerCaption, because Modal's onEscapeKeyDown and MediaViewerStage's gesture gating both need to read it"

patterns-established:
  - "Top-header + bottom-caption split layout for the unified media viewer (D-30), each independently graceful-omitted as a whole block rather than field-by-field"

requirements-completed: [D-25, D-26, D-27, D-28, D-29, D-30, D-31, D-32]

# Metrics
duration: 17min
completed: 2026-10-09
---

# Phase 177 Plan 11: Final Shell Wiring for the Live-UAT Redesign Summary

**FansubMediaLightbox now composes MediaViewerHeader (top) + MediaViewerStage (NavArrow size="large" edges, throttled wheel-nav) + MediaViewerCaption (fade clamp + two-stage-Escape read-more panel) + ThumbnailStrip (full-width auto-scroll strip) on top of Modal's fullscreen stage chrome — the Live-UAT Runde 1-rejected build is now wired end-to-end.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-10-09T16:04:00Z (approx.)
- **Completed:** 2026-10-09T16:14:19Z
- **Tasks:** 3
- **Files modified:** 10 (4 created, 4 modified, 2 deleted)

## Accomplishments
- Split the old single stacked `MediaViewerMetadataPanel` into `MediaViewerHeader` (top-left, title + category/episode/release-version, whole-block graceful omission per D-30) and `MediaViewerCaption` (bottom, 3-4 line fade-clamped caption + "Weiterlesen" slide-up panel + "Release öffnen" CTA, D-30/D-31) — porting the exact title/category dedup and caption/CTA fallback logic verbatim, with the deliberately narrower CTA-without-caption omission gate preserved from the regression note.
- Replaced `MediaViewerStage`'s `Button variant="floating"` prev/next pair with `NavArrow size="large"` positioned at the screen edges via a 96px `padding-inline` stage gutter (D-27); both the gutter and the arrow pair are gated on `shouldShowNavigationControls(total)` (D-32). The zoom-toggle button is untouched (D-26).
- Added a throttled (500ms), non-passive native `wheel` listener to the stage that navigates prev/next via `resolveWheelNavigation`/`shouldThrottleWheelNavigation`, disabled while zoomed or while the caption's read-more panel is open (D-29), gated through the new `resolveWheelOrSwipeTarget(captionPanelOpen)` function also now guarding the pre-existing touch-swipe handler as defense in depth.
- `.stage` now fills its allocated grid-row height (`height: 100%`) instead of a `vh`-based cap, so the viewer actually reaches Modal's `variant="stage"` fullscreen panel instead of leaving a visible gap of dead `--surface-stage` space.
- Lifted `captionPanelOpen` state into `FansubMediaLightbox`, reset to closed on every image-change via `resetCaptionPanelOpen()`, and wired Modal's additive `onEscapeKeyDown` hook through `resolveEscapeTarget`: a first Escape while the panel is open closes only the panel (claims the event); a second Escape closes the viewer as before.
- Composed `ThumbnailStrip` below the caption, fed a resolved per-item thumbnail URL (`thumbnail_url -> display_url -> original_url` fallback chain) and `activeIndex`/`onSelect` wired to the existing `onNavigate` prop — self-guards on fewer than two items (D-32).
- Zero edits to any of the five pre-existing consumer call sites (`ReleaseGallery.tsx`, `FansubGroupMediaBlock.tsx`, `ScreenshotGallery.tsx`, `ProjectMemberMediaGallery.tsx`, `GroupAssetsExperience.tsx`) and zero edits to their regression test files — all verified passing unmodified.

## Task Commits

Each task was committed atomically:

1. **Task 1: Split MediaViewerMetadataPanel into MediaViewerHeader (D-30 top) and MediaViewerCaption (D-30/D-31 bottom + read-more panel)** - `8bf97544` (feat)
2. **Task 2: MediaViewerStage -- NavArrow size="large" at screen edges (D-27), throttled wheel-navigation (D-29), single-image hide (D-32)** - `b39786af` (feat)
3. **Task 3: Wire the shell -- lifted caption-panel state, Modal Escape interception, Header/Stage/Caption/ThumbnailStrip composition** - `4e3faaf2` (feat)

**Plan metadata:** (next commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/fansubs/MediaViewerHeader.tsx` - New top-of-stage header; ported title/category dedup verbatim; whole-block graceful omission
- `frontend/src/components/fansubs/MediaViewerHeader.module.css` - Absolute top-left positioning, `max-width: calc(100% - 96px)` to avoid the close button
- `frontend/src/components/fansubs/MediaViewerCaption.tsx` - New bottom caption block; fade-clamp overflow detection via `isCaptionOverflowing`; lifted `panelOpen`/`onPanelOpenChange` props
- `frontend/src/components/fansubs/MediaViewerCaption.module.css` - Clamp/fade/panel/CTA styles using `--surface-stage`/`--accent-primary`/`--space-*` tokens
- `frontend/src/components/fansubs/MediaViewerStage.tsx` - `NavArrow` swap, renamed `onGestureNavigate` prop, new `captionPanelOpen` prop, native throttled wheel listener, removed old in-stage counter
- `frontend/src/components/fansubs/MediaViewerStage.module.css` - `height: 100%` instead of `vh` caps, `padding-inline: 96px` gutter + `.stageSingle` override, narrow-viewport arrow semi-transparency
- `frontend/src/components/fansubs/FansubMediaLightbox.tsx` - Lifted `captionPanelOpen`, panel-reset effect, Modal `onEscapeKeyDown` wiring, `thumbnailItems` construction, full Header/Stage/Caption/ThumbnailStrip composition
- `frontend/src/components/fansubs/FansubMediaLightbox.module.css` - `.lightboxBody` now a 3-row (`minmax(0,1fr) auto auto`) grid filling 100% height
- `frontend/src/components/fansubs/MediaViewerMetadataPanel.tsx` / `.module.css` - Deleted (superseded by Header + Caption split)

## Decisions Made
- Followed the plan's exact narrower omission gate for `MediaViewerCaption` (`!caption && !hasReleaseHref`) rather than the literal UI-SPEC wording, matching the plan's own REGRESSION-CRITICAL note.
- Kept `captionPanelOpen` lifted at the `FansubMediaLightbox` level rather than local state in `MediaViewerCaption`, since it gates three independent siblings (Modal, Stage, Caption).
- Followed the existing `FansubGroupContext.module.css` `.moreLink` precedent for overriding `Button variant="text"`'s inherited color via a composed feature-local class, without `!important`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a `react-hooks/set-state-in-effect` ESLint error in `MediaViewerCaption`'s DOM-measurement effect**
- **Found during:** Task 3 (verification sweep after wiring the shell)
- **Issue:** `MediaViewerCaption`'s `useLayoutEffect` that measures `scrollHeight`/`clientHeight` and calls `setOverflowing(...)` tripped the project's `react-hooks/set-state-in-effect` lint rule as an error (not just a warning) on the early-return branch (`setOverflowing(false)` when the ref is not yet attached).
- **Fix:** Added the exact `// eslint-disable-next-line react-hooks/set-state-in-effect` comment the codebase already uses in four other files for this identical measure-then-setState pattern (`FansubMediaLightbox.tsx`, `MediaViewerStage.tsx`, `UserDetailPageClient.tsx`, `GroupMediaReviewSection.tsx`). Only the branch that actually triggered the rule needed the comment; a second copy on the main measurement call was flagged as an unused directive and removed.
- **Files modified:** `frontend/src/components/fansubs/MediaViewerCaption.tsx`
- **Verification:** `npx eslint src/components/fansubs/MediaViewerCaption.tsx` reports zero problems; `npx tsc --noEmit` clean.
- **Committed in:** `4e3faaf2` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Lint-only fix using an existing codebase precedent, zero behavior change. No scope creep.

## Issues Encountered

The plan's three tasks are necessarily interdependent (Task 1 deletes `MediaViewerMetadataPanel.tsx` while `FansubMediaLightbox.tsx` still imports it until Task 3; Task 2 renames `MediaViewerStage`'s `onSwipeNavigate` prop to `onGestureNavigate` and adds a required `captionPanelOpen` prop while the only caller, `FansubMediaLightbox.tsx`, isn't updated until Task 3). `npx tsc --noEmit` therefore showed exactly one expected transient error after Task 1's commit and again after Task 2's commit (both pointing at the not-yet-rewired `FansubMediaLightbox.tsx`), resolving to a clean compile only once Task 3 landed. This is an inherent property of the plan's own task split (confirmed by tracing the plan's own `<action>`/`<files>` assignments across all three tasks), not a plan defect introduced during execution — the plan's own top-level `<verification>` section is explicitly scoped to "after all tasks," which is what was run and passed.

One unrelated pre-existing test failure (`ResponsiveImage.config.test.ts`, last touched in Phase 173, long before this plan's files) was found during the broader regression sweep and logged to `177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste/deferred-items.md` rather than fixed, per the executor's scope boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All eight Live-UAT Runde 1 gap-fix decisions (D-25 through D-32) are now implemented and wired end-to-end in the actual `FansubMediaLightbox.tsx` viewer shell:
- D-25 (fullscreen stage, 177-09) + D-26 (NavArrow primitive, 177-09) were already in place; this plan is what actually *uses* them in the real viewer instead of just making them available.
- D-27 (arrows at screen edges, gutter-reserved), D-29 (throttled wheel-nav), D-32 (single-image hides arrows + strip) are implemented in `MediaViewerStage.tsx`.
- D-28 (full-width auto-scrolling thumbnail strip) is composed in `FansubMediaLightbox.tsx`.
- D-30 (split top-header/bottom-caption layout) and D-31 (fade-clamp + two-stage-Escape read-more panel) are implemented across `MediaViewerHeader.tsx`/`MediaViewerCaption.tsx`/`FansubMediaLightbox.tsx`.

`tsc --noEmit` is clean; `FansubMediaLightbox.test.tsx` (2/2), `ReleaseGallery.test.tsx` (18/18), `FansubGroupMediaBlock.test.tsx` (9/9), `ProjectMemberMediaGallery.test.tsx` (7/7), `MediaViewerStage.test.ts` (4/4), `Modal.test.tsx` (3/3), `FocalCarousel.test.tsx` (40/40), `mediaViewerNavigation.test.ts` (23/23), and `mediaViewerCaptionPanel.test.ts` (7/7) are all green — 113/113 across the full relevant regression surface. No blockers. Ready for the orchestrator to re-run Plan 177-08's Task 2 Live-UAT checkpoint against the actual redesigned viewer.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

All 8 created/modified files found on disk; `MediaViewerMetadataPanel.tsx`/`.module.css` confirmed
deleted; `deferred-items.md` found on disk; all 3 task commit hashes (`8bf97544`, `b39786af`,
`4e3faaf2`) found in git history.

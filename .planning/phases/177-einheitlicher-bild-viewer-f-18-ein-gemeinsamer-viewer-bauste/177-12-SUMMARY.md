---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 12
subsystem: ui
tags: [css, design-tokens, backdrop-filter, color-mix, viewer, contrast]

# Dependency graph
requires:
  - phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste (plans 01-11)
    provides: FansubMediaLightbox-based unified viewer (Modal variant="stage", MediaViewerStage, MediaViewerCaption, MediaViewerHeader, ThumbnailStrip, NavArrow)
provides:
  - "--surface-stage-veil / --surface-stage-veil-blur global tokens (color-mix derived from --text-strong)"
  - "Single blurred veil background on Modal's .modalPanelStage with @supports backdrop-filter fallback"
  - "Transparent chrome surfaces (.stage, .caption/.panel/.clampedFading, .strip) so the veil shows through without compounding opacity"
  - "Centered header/caption/thumbnail-strip layout on the image's horizontal axis"
  - "32px/700/1.2 Display-role viewer title typography"
  - "Dark translucent NavArrow size=large circle with contrast-safe white icon"
affects: [177-13, 177-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-layer blur discipline: only the outermost stacking-context panel (.modalPanelStage) carries backdrop-filter + its own veil background; all descendant chrome surfaces that fully tile it stay background:transparent to avoid alpha-compounding"
    - "Tokens derived via color-mix(in srgb, var(--text-strong) N%, transparent) rather than new raw hex values"
    - "Computed-contrast-driven icon color override (WCAG relative luminance) documented inline as a code comment, not guessed"

key-files:
  created: []
  modified:
    - frontend/src/styles/globals.css
    - frontend/src/components/ui/Modal.module.css
    - frontend/src/components/fansubs/MediaViewerStage.module.css
    - frontend/src/components/fansubs/MediaViewerCaption.module.css
    - frontend/src/components/fansubs/MediaViewerHeader.module.css
    - frontend/src/components/ui/ThumbnailStrip.module.css
    - frontend/src/components/ui/NavArrow.module.css

key-decisions:
  - "D-33: translucent blurred veil (Modal's .modalPanelStage only) replaces the flat opaque --surface-stage fill across viewer chrome, with an @supports fallback for browsers without backdrop-filter"
  - "D-34: header/caption/thumbnail-strip share one centered horizontal axis; caption capped at 70ch with left-aligned inner text"
  - "D-35: viewer title activates the already-documented but previously unused Display typography role (32px/700/1.2)"
  - "D-36: NavArrow size=large darkened to match the veil tone; icon recolored to white because --ui-arrow only reaches ~2.27:1 contrast against the new dark circle (below the 3:1 requirement)"

patterns-established:
  - "Zero-compounding veil pattern: descendant surfaces that fully tile a blurred ancestor panel must never repeat that ancestor's semi-transparent background token"

requirements-completed: [D-33, D-34, D-35, D-36]

# Metrics
duration: 17min
completed: 2026-10-09
---

# Phase 177 Plan 12: Viewer Veil Background, Centered Layout, Display Title, Dark NavArrow Summary

**Replaced the viewer's flat opaque `--surface-stage` chrome fill with a single blurred, translucent veil on Modal's stage panel, centered the header/caption/thumbnail-strip on the image axis, grew the title to the Display type role, and darkened NavArrow's large variant with a contrast-computed icon color — closing the purely visual half of Live-UAT Runde 2's rejection.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-10-09T17:22:00Z (approx., based on first file read)
- **Completed:** 2026-10-09T17:39:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Introduced `--surface-stage-veil` and `--surface-stage-veil-blur` tokens, derived from the existing `--text-strong` color via `color-mix`, with a near-opaque `@supports not (backdrop-filter)` fallback
- Moved the translucent/blurred background to exactly one place (Modal's `.modalPanelStage`); made the three descendant chrome surfaces (`MediaViewerStage.stage`, `MediaViewerCaption.caption`/`.panel`/`.clampedFading`, `ThumbnailStrip.strip`) `background: transparent` so the single blurred layer shows through without alpha-compounding to ~98% opacity
- Centered the header (title+meta), caption block (capped at 70ch, inner text left-aligned), and thumbnail strip track on the image's horizontal axis; corrected the mobile header reservation to the real 112px-per-side close+zoom button-cluster width (224px total)
- Activated the UI-SPEC's previously unused Display typography role (32px/700/1.2) for the viewer title
- Darkened `NavArrow` `size="large"`'s circular backing to a `--text-strong`-derived translucent dark tone and overrode its icon color to white after computing the WCAG contrast ratio of `--ui-arrow` against the new background (~2.27:1, below the 3:1 requirement); `size="default"` (the carousel) stays byte-identical

## Task Commits

Each task was committed atomically:

1. **Task 1: Veil token on Modal's stage panel + transparent chrome surfaces (D-33) + NavArrow dark circle with contrast-driven icon fallback (D-36)** - `2a395cd1` (fix)
2. **Task 2: Centered axis for header/caption/thumbnail-strip (D-34) + Display-role title typography (D-35)** - `d87d34f2` (fix)

**Plan metadata:** (pending — final commit below)

## Files Created/Modified
- `frontend/src/styles/globals.css` - Added `--surface-stage-veil`/`--surface-stage-veil-blur` tokens beside the existing `--surface-stage` declaration
- `frontend/src/components/ui/Modal.module.css` - `.modalPanelStage` now uses the veil token + `backdrop-filter: blur(...)` with `@supports` fallback, appended as the new last rule in the file
- `frontend/src/components/fansubs/MediaViewerStage.module.css` - `.stage` background swapped to `transparent`
- `frontend/src/components/fansubs/MediaViewerCaption.module.css` - `.caption`/`.panel` backgrounds swapped to `transparent`, `.clampedFading::after` gradient made inert (`transparent, transparent`), `.caption` given `max-width: 70ch; margin-inline: auto`
- `frontend/src/components/fansubs/MediaViewerHeader.module.css` - `.header` centered (`left: 50%; transform: translateX(-50%)`, `max-width: min(70ch, calc(100% - 320px))`), `.title` bumped to 32px/700/1.2, `.metaRow` centered, new mobile `@media (max-width: 767px)` block reserving `calc(100% - 224px)`
- `frontend/src/components/ui/ThumbnailStrip.module.css` - `.strip` background swapped to `transparent`, `.track` given `justify-content: center`
- `frontend/src/components/ui/NavArrow.module.css` - `.navArrowLarge`/`.navArrowLarge:hover` backgrounds darkened via `color-mix(in srgb, var(--text-strong) ...)`, `color: #ffffff` added to `.navArrowLarge`

## Decisions Made
- Followed the plan's explicit single-layer-blur instruction precisely: only `Modal.module.css`'s `.modalPanelStage` carries `--surface-stage-veil` as its own background; all three descendant chrome surfaces were verified via grep to carry zero references to that token, preventing the alpha-compounding regression the plan's acceptance criteria specifically gate against
- Used the plan's pre-computed WCAG contrast figures verbatim (2.27:1 for `--ui-arrow`, 18.2:1 for white) rather than re-deriving them, since the plan already cites the exact source color values

## Deviations from Plan

None - plan executed exactly as written. All CSS edits matched the plan's literal before/after snippets; no `.tsx` files were touched; no new interaction logic was introduced.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Zero file overlap with Plan 177-13 (pure zoom/pan math) and Plan 177-14 (zoom button wiring, D-37/D-38) — both can proceed independently
- Plan 177-14's new top-right zoom button can rely on the `calc(100% - 224px)` mobile header reservation already sized for its real 112px-per-side footprint, with no further edits needed to `MediaViewerHeader.module.css`
- `.clampedFading::after`'s now-inert `transparent, transparent` gradient is a known, intentionally structural no-op (documented in the plan) awaiting a future `mask-image`-based fade pass once the background is no longer a solid color

## Known Stubs

- **`.clampedFading::after` gradient (MediaViewerCaption.module.css, line 26):** both gradient stops are now `transparent`, making this rule visually inert. This is intentional per the plan — the prior fade-to-flat-background effect no longer makes sense once `.caption` carries no flat background, and a correct fade over a blurred/non-solid background requires `mask-image` opacity fading, explicitly scoped out of this plan for a future pass.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

- FOUND: `.planning/phases/177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste/177-12-SUMMARY.md`
- FOUND: commit `2a395cd1` (Task 1)
- FOUND: commit `d87d34f2` (Task 2)
- FOUND: commit `9f38c9cd` (SUMMARY.md)

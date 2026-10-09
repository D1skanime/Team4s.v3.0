---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 09
subsystem: ui
tags: [react, nextjs, css-modules, modal, carousel, design-system]

# Dependency graph
requires:
  - phase: 177-02
    provides: "Modal variant=\"stage\" chrome-suppressing branch (header/footer/overlay-close/close-button-position)"
provides:
  - "Modal variant=\"stage\" is a real fullscreen dark stage (fills 100vw/100dvh with --surface-stage, no window chrome)"
  - "Modal additive onEscapeKeyDown?(event) => boolean interception hook (D-31 groundwork)"
  - "NavArrow global primitive (components/ui/NavArrow.tsx), size=\"default\" (pixel-identical to the old CarouselArrow) and size=\"large\" (viewer-scale, light circular backing), hover-jump-free"
  - "FocalCarousel migrated onto NavArrow with zero visual/behavioral regression"
affects: [177-11, "image viewer shell wiring"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Global interaction primitives render their own native <button>, not the Button component, when they must guarantee a hover recipe that differs from Button's global hover/transform rule"
    - "Modal escape handling: additive interception hook pattern (onX?.(event) => boolean short-circuits the default action) for later two-stage close sequences, backward compatible for every existing caller"

key-files:
  created:
    - frontend/src/components/ui/NavArrow.tsx
    - frontend/src/components/ui/NavArrow.module.css
  modified:
    - frontend/src/components/ui/Modal.tsx
    - frontend/src/components/ui/Modal.module.css
    - frontend/src/components/ui/FocalCarouselInternals.tsx
    - frontend/src/components/ui/index.ts
    - frontend/src/app/dev/ui-system/page.tsx

key-decisions:
  - "D-25: Modal variant=\"stage\" fills the viewport edge-to-edge with --surface-stage, overriding variant=\"default\"'s light-chrome rule only for the stage variant"
  - "D-26: Navigation arrows use a new global NavArrow primitive (native <button>, never inherits Button's hover translateY), not Button variant=\"floating\""
  - "D-31 groundwork: Modal exposes onEscapeKeyDown as an additive, opt-in hook; no existing caller is affected"

patterns-established:
  - "NavArrow (components/ui) -- reusable chevron nav-arrow primitive with size=\"default\"|\"large\", exported via @/components/ui, used by FocalCarousel today and intended for the fullscreen image viewer (177-11)"

requirements-completed: [D-25, D-26]

duration: 15min
completed: 2026-10-09
---

# Phase 177 Plan 09: Modal Fullscreen Stage + NavArrow Primitive Summary

**Modal `variant="stage"` now fills the viewport edge-to-edge and gained an additive Escape-interception hook; the carousel's wine-red chevron arrow is extracted into a new global `NavArrow` primitive with a hover-jump-free `size="large"` variant for the viewer.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-09T15:49:00Z (approx.)
- **Completed:** 2026-10-09T15:56:06Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments
- Fixed the Live-UAT "looks like a small window" gap (D-25): `Modal` `variant="stage"`'s `modalPanel` now sets `width: 100vw; height: 100dvh; max-width: none;` with no border/box-shadow/border-radius and `background: var(--surface-stage)`, with a `grid-template-rows: 1fr` override so the lone `modalBody` child stretches to fill the panel. `variant="default"` is untouched (zero-diff `Modal.test.tsx`, all 3 tests green).
- Added an additive `onEscapeKeyDown?: (event) => boolean` hook to `Modal` (D-31 groundwork for Plan 177-11's two-stage Escape sequence) — every existing caller omits the prop and keeps closing on Escape exactly as before.
- Fixed the Live-UAT "arrows hop on hover" gap (D-26): extracted the private `CarouselArrow` function out of `FocalCarouselInternals.tsx` into a new global `components/ui/NavArrow.tsx` primitive, exported via `@/components/ui`. It renders a native `<button>` (not `Button`), so it never inherits `.button:hover { transform: translateY(-1px) }`. `size="default"` (44px, transparent, `--ui-arrow` icon) is pixel-identical to the old carousel arrow; `size="large"` (56px, light circular `--surface-card` backing) is new, for the dark viewer stage.
- Migrated `FocalCarousel`'s `CollapsedCarousel` onto `NavArrow` with zero regression: all 40 `FocalCarousel.test.tsx` tests pass unmodified.
- Added a `NavArrow` showcase panel (`size="default"` and `size="large"` against a `--surface-stage` swatch) to `/dev/ui-system`'s existing "Button Showcase" interaction-primitive grid.

## Task Commits

Each task was committed atomically:

1. **Task 1: Modal full-bleed stage chrome (D-25) + additive Escape-interception hook (D-31 groundwork)** - `635d6c60` (feat)
2. **Task 2: Extract NavArrow primitive from CarouselArrow, migrate FocalCarousel, add size="large" showcase** - `0f4080f2` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/ui/NavArrow.tsx` - New global nav-arrow primitive (`direction`, `label`, `onClick`, `disabled?`, `size?`, `className?`), native `<button>`, no inherited hover-transform
- `frontend/src/components/ui/NavArrow.module.css` - `.navArrow`/`.navArrowLarge` recipes; hover changes only color/opacity/background, never `transform`
- `frontend/src/components/ui/Modal.tsx` - `onEscapeKeyDown` prop + conditional call in `handleKeyDown`; `modalWrapStage`/`modalPanelStage` classes applied only for `variant === 'stage'`
- `frontend/src/components/ui/Modal.module.css` - `.modalWrapStage`/`.modalPanelStage` appended as the last rules in the file (after the mobile media query) so they win the specificity tie
- `frontend/src/components/ui/FocalCarouselInternals.tsx` - Removed `CarouselArrow`/`CarouselArrowProps` and the now-unused `ChevronLeft`/`ChevronRight` import; both `CollapsedCarousel` call sites now render `NavArrow` with `className={styles.arrow}`
- `frontend/src/components/ui/index.ts` - Added `export * from './NavArrow'`
- `frontend/src/app/dev/ui-system/page.tsx` - Added `NavArrow` import and a third interaction-primitive panel demonstrating both sizes

## Decisions Made
- Followed the plan's prescribed CSS source-order rule exactly: `.modalWrapStage`/`.modalPanelStage` were appended at the literal end of `Modal.module.css` (after the `@media (max-width: 767px)` block) to win the equal-specificity tie against the mobile override.
- `NavArrow`'s `className` prop composes the carousel's layout class (`styles.arrow`, which sets `flex: 0 0 auto; min-width/min-height: 44px` and child-SVG color) onto the new primitive's own base class exactly as the plan's interface contract specified, preserving the carousel's existing container-query grid-row/grid-column rules for `.arrow`.

## Deviations from Plan

None - plan executed exactly as written. One pre-existing environment issue was fixed as a side effect of running the required verification commands: `frontend/tsconfig.tsbuildinfo` was owned by `root` (stale from a previous root-run build), blocking `tsc --noEmit` with `EACCES`. Re-chowned it to the current user via `sudo -n chown` so the plan's mandated `npx tsc --noEmit` verification step could run; this is a filesystem permission fix with no code or behavior change and is not tracked as a deviation rule (no file under `files_modified` was touched).

## Issues Encountered
None beyond the `tsconfig.tsbuildinfo` permission issue described above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `Modal` `variant="stage"` and `onEscapeKeyDown` are ready for Plan 177-11 to consume for the real viewer shell (fullscreen stage + two-stage Escape sequence for the caption "Weiterlesen" panel, D-31).
- `NavArrow` (`size="large"`) is ready for Plan 177-11 to place at the screen edges per D-27 (outside the `object-fit: contain` image area, vertically centered).
- No blockers. `FocalCarousel.test.tsx` (40/40) and `Modal.test.tsx` (3/3) stay green; `tsc --noEmit` is clean.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

All 7 files-created/modified claims verified present on disk; both task commits (`635d6c60`, `0f4080f2`) verified present in `git log`.

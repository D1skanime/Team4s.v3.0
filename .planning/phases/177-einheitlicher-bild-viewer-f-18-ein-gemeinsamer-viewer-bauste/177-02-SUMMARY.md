---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 02
subsystem: ui
tags: [react, nextjs, design-tokens, css-modules, modal, button]

# Dependency graph
requires:
  - phase: 177-01
    provides: pure media-viewer navigation logic (no UI dependency)
provides:
  - "Modal variant='stage': chrome-suppressing dark full-bleed stage with single close affordance"
  - "Button variant='floating': dark-stage-readable icon button, >=44x44px when combined with iconOnly"
  - "--surface-stage: #10141c design token scoped to the viewer's dark image stage"
  - "Dead file ReleaseVersionMediaDetailPanel.tsx removed (D-06)"
affects: [177-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive primitive variant extension: new variant prop with default preserving byte-identical old behavior for every existing caller (per D-11)"
    - "Reuse existing visual recipes (ui.module.css .closeButton) for new variants instead of inventing new colors/shadows"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/Modal.tsx
    - frontend/src/components/ui/Modal.module.css
    - frontend/src/components/ui/Button.tsx
    - frontend/src/components/ui/Button.module.css
    - frontend/src/styles/globals.css

key-decisions:
  - "Stage variant ignores the footer prop entirely (per UI-SPEC) rather than rendering it hidden"
  - "Stage variant's title stays screen-reader-only via the existing .visually-hidden utility, preserving aria-labelledby without visible chrome"

patterns-established:
  - "Dark-stage primitives (Modal stage, Button floating) copy existing light-theme visual recipes verbatim rather than introducing new color values, keeping the design system's token surface minimal"

requirements-completed: [D-06, D-11, D-15]

# Metrics
duration: ~15min
completed: 2026-10-09
---

# Phase 177 Plan 02: Viewer Primitive Extensions Summary

**Modal gains a chrome-suppressing `stage` variant and Button gains a `floating` icon variant, both purely additive and byte-identical for all existing callers; one confirmed-dead admin panel file removed.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-09T12:21:10Z (first task after 177-01 completion)
- **Completed:** 2026-10-09T12:24:20Z
- **Tasks:** 3
- **Files modified:** 5 modified, 1 deleted

## Accomplishments
- `Modal` now supports `variant?: 'default' | 'stage'` — stage mode suppresses the header, footer, and backdrop-click-close, keeps the title accessible via a `.visually-hidden` span for `aria-labelledby`, and repositions the close button as an absolute floating control inside a zero-padding body
- `Button` now supports `variant: 'floating'`, reusing the exact `ui.module.css` `.closeButton` visual recipe (same colors/shadow, no new values) and reaching >=44x44px when combined with the existing `iconOnly` prop
- `globals.css` gained the `--surface-stage: #10141c` token, scoped and commented as exclusive to the new viewer's dark image stage
- Deleted the confirmed zero-importer dead file `ReleaseVersionMediaDetailPanel.tsx` (D-06), re-verifying the zero-importer grep before removal

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Modal's chrome-suppressing "stage" variant** - `16afe462` (feat)
2. **Task 2: Add Button's "floating" variant and the --surface-stage token** - `14fd0d85` (feat)
3. **Task 3: Delete confirmed dead code ReleaseVersionMediaDetailPanel.tsx (D-06)** - `0429daba` (chore)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/ui/Modal.tsx` - added `variant` prop; stage branch skips header/footer/overlay-close and renders a repositioned absolute close button plus a visually-hidden title span
- `frontend/src/components/ui/Modal.module.css` - added `.closeButtonFloating` (copy of `.closeButton` + absolute positioning) and `.modalBodyStage` (zero padding/gap)
- `frontend/src/components/ui/Button.tsx` - widened `ButtonVariant` union with `'floating'`, wired into the existing `classNames(...)` conditional chain
- `frontend/src/components/ui/Button.module.css` - added `.buttonFloating` (same custom-property values as `ui.module.css`'s `.closeButton`) and its `:hover` state
- `frontend/src/styles/globals.css` - added `--surface-stage: #10141c` with a scoping comment, placed in the existing `--surface-*` token group
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` - deleted (dead code, D-06)

## Decisions Made
- Stage variant deliberately ignores the `footer` prop rather than rendering it conditionally hidden, matching the UI-SPEC's explicit "Stage-Variante ignoriert footer bewusst"
- No `:disabled` override added for `.buttonFloating` per UI-SPEC ("nicht genutzt im Viewer — Navigation ist immer Wrap-around, nie disabled")

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Local `npx tsc` failed because `frontend/node_modules` is not installed on the host (Docker-only dev environment per CLAUDE.md). Resolved by running `npx tsc --noEmit` inside the running `team4sv30-frontend` container instead — consistent with the project's canonical Docker Compose workflow. All three tasks' `tsc --noEmit` verification passed this way (exit 0, no output).
- The acceptance-criteria grep `grep -rn 'variant="floating"' frontend/src/app frontend/src/components | grep -v components/ui/Button` surfaced two matches (`dev/ui-system/page.tsx`, `AdjacentNavigation.test.tsx`). Investigated: both belong to an unrelated pre-existing `AdjacentNavigation` component that already had its own, unrelated `floating` variant (committed in Phase 151, long before this plan). Zero existing `Button` callers use the new variant — the grep's false-positive match on a same-named-but-different component is not a deviation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `Modal variant="stage"` and `Button variant="floating"` are ready for Plan 177-04 (the viewer shell: `FansubMediaLightbox.tsx` and the new `MediaViewerStage.tsx`) to consume via `<Modal variant="stage">` and `<Button variant="floating">`
- `--surface-stage` token is available for the dark image stage background
- No blockers; all existing Modal/Button/globals.css consumers verified unaffected (`tsc --noEmit` green, zero forced-prop grep matches)

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

- FOUND: frontend/src/components/ui/Modal.tsx
- FOUND: frontend/src/components/ui/Modal.module.css
- FOUND: frontend/src/components/ui/Button.tsx
- FOUND: frontend/src/components/ui/Button.module.css
- FOUND: frontend/src/styles/globals.css
- CONFIRMED DELETED: frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx
- FOUND commit: 16afe462 (Task 1)
- FOUND commit: 14fd0d85 (Task 2)
- FOUND commit: 0429daba (Task 3)

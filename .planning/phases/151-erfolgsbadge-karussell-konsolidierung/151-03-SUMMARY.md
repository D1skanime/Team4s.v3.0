---
phase: 151-erfolgsbadge-karussell-konsolidierung
plan: 03
subsystem: ui
tags: [react, carousel, accessibility, performance, vitest]

requires:
  - phase: 151-erfolgsbadge-karussell-konsolidierung
    provides: approved D05 carousel behavior and Phase 151 UI/validation contracts
provides:
  - live nearest-item updates during manual horizontal scrolling
  - deterministic interruption and rapid-retarget handling for the canonical carousel
  - direct-child carousel ownership that excludes nested carousel items
  - bounded renderItem work with all carousel items still mounted
affects: [151-05-integration-and-evidence, FocalCarousel consumers]

tech-stack:
  added: []
  patterns: [single-RAF geometry measurement, direct-owned-child enumeration, memoized slide renderer]

key-files:
  created:
    - .planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-03-SUMMARY.md
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.test.tsx

key-decisions:
  - "Retain the existing 210ms adjacent animation and 120ms free-scroll settle; update only live measurement and cancellation seams."
  - "Mark the existing items container and its direct children explicitly while retaining data-focal-item compatibility."
  - "Memoize only the private direct-slide renderer; keep the public FocalCarousel props and FocalCarouselItemState shape unchanged."

patterns-established:
  - "Carousel geometry enumerates the owned container through trackRef.current.children, then only that container's marked direct children."
  - "Manual scroll work shares one pending measurement RAF and one replaceable 120ms settle timer."

requirements-completed: [P151-05, P151-09]

duration: 11min
completed: 2026-09-07
---

# Phase 151 Plan 03: FocalCarousel Interaction Hardening Summary

**The canonical full-mount carousel now tracks live manual geometry, excludes nested slides, cancels interrupted motion deterministically, and limits active-state rendering to the two changed slides.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-07T13:08:23Z
- **Completed:** 2026-09-07T13:18:50Z
- **Tasks:** 2
- **Files modified:** 2 source/test files plus this summary; CSS required no change

## Pre-existing Green Behavior

The untouched focused suite passed **29/29** before Phase 151 edits. Existing mounted/inert behavior, expanded-grid focus restoration, pointer drag/click suppression, endpoint pass-through, vertical wheel and pointer intent, Arrow/Home/End handling, reduced motion, 210ms adjacent motion, full-mount coverage, container CSS contracts, and all three axe checks were retained.

The baseline run emitted the already-known `act(...)` warnings in the free-scroll and horizontal-wheel tests. No existing assertions were weakened or removed.

## Reproduced Defects (RED)

Command:

`docker compose exec -T team4sv30-frontend npx vitest run src/components/ui/FocalCarousel.test.tsx --reporter=verbose`

Result against the pre-fix source: **5 failed, 30 passed**.

- Manual scroll did not change `aria-current` after the scheduled animation frame; it waited for the 120ms timer.
- Pointer interruption removed the programmatic CSS class/RAF but left `data-navigation-state="moving"` stale.
- Descendant-wide item lookup allowed nested carousel slides to corrupt the parent's nearest-item result.
- The 100-item stress case made **300** `renderItem` calls after End then Home instead of the bounded **104**.
- The 200-item stress case made **600** `renderItem` calls after End then Home instead of the bounded **204**.

The new rapid next/next/previous regression was already green, proving the existing retarget geometry was sound; it remains as protection against competing timers or frames.

## Minimal Fixes

- Added a single pending measurement RAF for live manual-scroll active state while retaining the replaceable **120ms** final settle timer.
- Centralized cancellation of the settle timer, measurement RAF, programmatic RAF, snap-suppression class, and navigation state. Pointer-down and horizontal wheel now use that seam; pointer interruption also reconciles the active item from current geometry.
- Replaced descendant-wide lookup with an owned direct-child enumerator. The existing `.items` wrapper is found only among `trackRef.current.children`, and only its direct `[data-focal-carousel-item]` children participate.
- Added a private memoized direct-slide renderer with stable `showAll` and selection callbacks. All slides stay mounted and inactive slides remain `inert`; only previous/current slides rerender when active state changes.
- Preserved the public generic prop surface, exported `FocalCarouselItemState`, list/listitem semantics, focus restoration, click behavior, reduced motion, vertical page intent, and **210ms** adjacent timing.
- `FocalCarousel.module.css` was intentionally unchanged because no RED case demonstrated a CSS contract defect.

## Stress and Request Counts (GREEN)

| Mounted items | Initial calls | End + Home calls | Final total | fetch | XMLHttpRequest |
|---:|---:|---:|---:|---:|---:|
| 100 | 100 | 4 | **104** | 0 | 0 |
| 200 | 200 | 4 | **204** | 0 | 0 |

Each navigation changes exactly the previous and current item state. No virtualization or request/cache behavior was introduced.

## Files Created/Modified

- `frontend/src/components/ui/FocalCarousel.tsx` — direct ownership, live measurement/cancellation, and memoized mounted slide rendering.
- `frontend/src/components/ui/FocalCarousel.test.tsx` — manual, interruption, rapid, nested, timing, request, and 100/200-item regressions.
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-03-SUMMARY.md` — this execution record.

No profile/artwork file, backend, API, auth, dependency, configuration, state, roadmap, requirement, database, or CSS file was changed by Plan 03.

## Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/components/ui/FocalCarousel.test.tsx --reporter=dot` — **PASS, 35/35** after implementation.
- `docker compose exec -T team4sv30-frontend sh -lc 'for run in 1 2; do npx vitest run src/components/ui/FocalCarousel.test.tsx --reporter=dot || exit 1; done'` — **PASS twice, 35/35 each run**, fake timers/frames drained.
- `docker compose exec -T team4sv30-frontend npx eslint src/components/ui/FocalCarousel.tsx src/components/ui/FocalCarousel.test.tsx` — **PASS, 0 errors and 0 warnings**.
- `docker compose exec -T team4sv30-frontend npm run typecheck -- --pretty false` — **baseline failure only** in `.next/dev/types/app/anime/[id]/group/[groupId]/releases/page.ts(36,29)` (`GroupReleasesPageProps.params` versus generated `PageProps`); no Plan 03 error was reported.
- `git diff --check -- frontend/src/components/ui/FocalCarousel.tsx frontend/src/components/ui/FocalCarousel.module.css frontend/src/components/ui/FocalCarousel.test.tsx` — **PASS**.

The final focused runs continue to show only the pre-existing `act(...)` warnings in two older test cases. The acknowledged full-lint 13-error baseline was not repaired or expanded; scoped ESLint is clean.

## Plan Alignment and Mechanical Adjustment

The plan's key-link pattern named `data-focal-carousel-item`, while the pre-existing source exposed `data-focal-item` and kept slides one level below the scroll track in `.items`. The implementation resolves that naming/structure mismatch without changing layout: it adds explicit private ownership markers to the existing wrapper/direct slides, retains `data-focal-item` for compatibility, and enumerates the wrapper from `trackRef.current.children` before reading only its direct children.

## Deviations from Plan

None in behavior or scope. The mechanical marker reconciliation above implements the plan's direct-child ownership requirement without rewriting the engine.

## Known Stubs

None.

## Threat Flags

None. No network, auth, filesystem, schema, or trust-boundary surface was added.

## Commits

None — the coordinator explicitly owns staging and commits for this concurrent wave.

## Next Phase Readiness

Plan 03 is ready for coordinator review and later Plan 05 integration/evidence. No Plan 03 blocker remains.

---
*Phase: 151-erfolgsbadge-karussell-konsolidierung*
*Completed: 2026-09-07*

## Coordinator review and modularity correction

The review found the modified engine at620 lines, above CLAUDE.md's450-line production guideline.
Moved existing private types, memoized slide/expanded rendering, pure geometry and click-suppression handling
into `frontend/src/components/ui/FocalCarouselInternals.tsx` without changing the public import surface.
The engine is449 lines; its private internal module is207 lines. Existing `classNames`, `Button`, CSS,
interaction timing and data ownership are reused. The expanded/full-mount/focus behavior remains covered.

After extraction: all35 FocalCarousel tests PASS; scoped ESLint on engine/internal module/test PASS;
`git diff --check` PASS. Log: `/tmp/team4s-151-carousel-split-tests.log`.
This bounded extra private file is a coordinator-approved modularity correction within Plan03 ownership.

## Integration review closure

The independent review reopened three behavioral gaps after initial execution. Track-level native-inert selection, expand/collapse cancellation and physical recentering, and item-count shrink synchronization are fixed and covered by37 component tests plus105 consumer tests and native Chromium proofs. See151-CAROUSEL-REVIEW-FIXES.md. The shared disclosure target minimum is now44px, confirmed by real rectangles. Full Phase151 acceptance remains dependent on artwork and exhaustive final QA.

## Final review follow-up

Cancellation no longer leaks click suppression into the next gesture; reduced motion preserves static active emphasis. Native trusted-touch cancel/click and0.72/1 opacity proof pass in both motion modes. The interaction engine is normally formatted at404 lines, with a private collapsed/expanded presenter module at443 lines;39 carousel and105 consumer tests pass. See151-FINAL-CODE-REVIEW.md coordinator closure and checks/check-native-touch.cjs.

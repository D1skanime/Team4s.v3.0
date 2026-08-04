---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "06"
subsystem: frontend-ui
tags: [react, intersection-observer, ssr, carousel, performance]
requires:
  - phase: 120-01
    provides: User-authorized Phase-119 overlap snapshot and immutable chain validator
  - phase: 120-04
    provides: Expected-red carousel activation and SSR preservation contracts
  - phase: 119-05
    provides: Final Phase-119 FocalCarousel behavior and collection semantics
provides:
  - Generic one-shot near-viewport activation hook with 600px margin and no-observer fallback
  - Opt-in FocalCarousel interaction deferral that preserves complete dormant SSR markup
  - Immutable authorized overlap transition for all three FocalCarousel files
affects: [120-12, 120-13, FocalCarousel, MemberBadgeChain]
tech-stack:
  added: []
  patterns: [callback-ref capability fallback, behavior-only viewport deferral, immutable overlap evidence]
key-files:
  created:
    - frontend/src/hooks/useNearViewportActivation.ts
    - frontend/src/hooks/useNearViewportActivation.test.ts
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/evidence/120-06-task2-overlap.json
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
key-decisions:
  - "FocalCarousel deferral remains generic and opt-in via deferInteractionUntilNearViewport=false by default, preserving unrelated consumers."
  - "Dormant carousels retain every item, counter, label and control; only measurement, listeners, drag, momentum and snap behavior is gated."
patterns-established:
  - "Near-viewport activation observes once at 600px 0px, disconnects permanently, and activates immediately through the target ref when IntersectionObserver is absent."
  - "Deferred generic UI exposes data-interaction-enabled on its accessible region for deterministic external verification."
requirements-completed: [D-15, D-16, D-17, D-18]
duration: 10m
completed: 2026-08-04
---

# Phase 120 Plan 06: Near-Viewport Carousel Activation Summary

**A generic one-shot 600px activation seam now defers FocalCarousel measurement and interaction while preserving complete, geometry-stable SSR content.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-04T13:34:07Z
- **Completed:** 2026-08-04T13:44:21Z
- **Tasks:** 2
- **Files modified:** 6 task artifacts

## Accomplishments

- Added a domain-free hook that activates once near the viewport, disconnects after activation, cleans up on unmount, never reverts, and immediately falls back when `IntersectionObserver` is unavailable.
- Extended the sole global `FocalCarousel` with opt-in behavior deferral while keeping all items, semantic labels, controls and counters in initial markup.
- Kept the default non-deferred path unchanged for `FansubProjectsGrid`, including Phase-119 keyboard, nested-control, wheel-passthrough, focus-return and Reduced Motion behavior.
- Sealed the exact authorized FocalCarousel TSX/CSS/test transition in manifest `120-06:task2:c63ceae0-2075-4393-bf19-eee10223dba9`.

## Task Commits

1. **Task 1 RED: generic activation contract** — `de92e954`
2. **Task 1 GREEN: one-shot activation hook** — `44eadd95`
3. **Task 1 refinement: lint-clean no-observer fallback** — `e1a3efc4`
4. **Task 2 GREEN: behavior-only FocalCarousel deferral and overlap evidence** — `398e2f80`

Task 2 consumes Plan 120-04's committed RED contract (`e6521177`) and makes the global FocalCarousel activation case green without weakening its required behavior.

## Files Created/Modified

- `frontend/src/hooks/useNearViewportActivation.ts` - Generic once-only observer and immediate capability fallback.
- `frontend/src/hooks/useNearViewportActivation.test.ts` - Exact margin, one-shot, fallback, disabled-deferral and cleanup coverage.
- `frontend/src/components/ui/FocalCarousel.tsx` - Opt-in interaction gate and stable public activation marker.
- `frontend/src/components/ui/FocalCarousel.module.css` - Snap, motion and drag affordances activate without changing layout geometry.
- `frontend/src/components/ui/FocalCarousel.test.tsx` - SSR-content and deterministic activation assertions.
- `evidence/120-06-task2-overlap.json` - Immutable three-file predecessor/after manifest.

## Verification

- Hook, carousel and fansub focused suites: **21/21 passed**.
- Carousel, fansub, hook and inherited MemberBadgeChain suite: **75 passed, 1 future Plan-120 RED skipped**. The skipped `MemberBadgeChain` opt-in contract belongs to Plan 120-12 and was not weakened or edited here.
- Targeted ESLint over all six relevant source/test files: **PASS**, zero warnings or errors.
- Full TypeScript check with only stale generated `.next/dev/types` temporarily isolated inside the frontend container: **PASS**. The direct check remains blocked by the two pre-existing generated member-route signature errors; generated files were restored immediately.
- `git diff --check` and commit whitespace check: **PASS**.
- Final immutable 18-file overlap audit with exact latest overrides: **PASS** (`{"ok":true}`).

## Decisions Made

- Kept `deferInteractionUntilNearViewport` defaulted to `false`; profile badge consumers opt in later without silently changing global fansub carousel behavior.
- Attached observation to the stable carousel root while exposing activation state on the accessible region, so expanding/collapsing cannot orphan the observer target.
- Used a callback-ref fallback instead of an effect-state update, preserving immediate no-observer behavior without timers or lint suppression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repaired the incomplete Task-1 authorization audit invocation**
- **Found during:** Task 1 precondition
- **Issue:** The planned `check --authorization` command omitted the validator-required `--initial` or `--expect` input.
- **Fix:** Ran a complete `--initial` audit with the exact Plan-120-04 latest overrides; no evidence was refreshed or recaptured.
- **Verification:** Validator returned `{"ok":true}` before implementation reads/edits.

**2. [Rule 1 - Bug] Made immediate fallback lint-clean without changing SSR state**
- **Found during:** Task 1 targeted lint
- **Issue:** Synchronous fallback state inside an effect violated `react-hooks/set-state-in-effect`.
- **Fix:** Activated the no-observer fallback from the stable target-ref callback.
- **Verification:** Hook tests and targeted ESLint pass.
- **Committed in:** `e1a3efc4`

**3. [Rule 1 - Bug] Fixed fallback listener test instrumentation timing**
- **Found during:** Task 2 focused verification
- **Issue:** The inherited RED test installed its fallback wheel-listener spy after React had already flushed the immediate activation effect.
- **Fix:** Installed the same listener spy before render; the required wheel-listener assertion remains unchanged.
- **Verification:** Exact activation test and all Phase-119 carousel cases pass.
- **Committed in:** `398e2f80`

**4. [Rule 3 - Blocking] Reconciled validator receipt and planned final manifest names**
- **Found during:** Task 2 evidence finish
- **Issue:** The plan used unsupported `--begin` and differing begin/final output names, while the validator requires `--receipt` and a cryptographically bound output path.
- **Fix:** Finished the unique receipt to its bound unused path, then atomically renamed unchanged manifest bytes to the declared final evidence path, matching the established Plan-120-04 pattern.
- **Verification:** Manifest digest and final full-chain audit pass.

**Total deviations:** 4 auto-fixed (2 blocking execution issues, 2 correctness issues). **Impact:** No scope expansion, evidence refresh, profile-specific carousel fork, or behavior weakening.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Review

No network endpoint, auth path, file-access boundary or schema surface was introduced. T-120-07 is mitigated by complete SSR content, stable geometry, one-shot disconnection, cleanup, and immediate no-observer activation. T-120-05 remains unaffected because no auth code changed.

## Next Phase Readiness

- Plan 120-12 can opt `MemberBadgeChain` into the generic deferral prop without creating a profile-local carousel.
- Plan 120-13 can record the stable `data-interaction-enabled` activation boundary.
- Shared dirty `STATE.md`, `ROADMAP.md`, Phase-119 source/assets and unrelated untracked files remain untouched and unstaged.

## Self-Check: PASSED

- All six task artifacts exist.
- Commits `de92e954`, `44eadd95`, `e1a3efc4` and `398e2f80` exist.
- Manifest ID `120-06:task2:c63ceae0-2075-4393-bf19-eee10223dba9` exists and validates.
- No known stub prevents the plan goal.

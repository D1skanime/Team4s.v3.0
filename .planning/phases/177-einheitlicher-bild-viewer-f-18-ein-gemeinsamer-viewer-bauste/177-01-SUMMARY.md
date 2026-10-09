---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 01
subsystem: ui
tags: [vitest, typescript, frontend, media-viewer, pure-functions, tdd]

# Dependency graph
requires: []
provides:
  - "frontend/src/lib/mediaViewerNavigation.ts with 4 standalone pure functions: wrapIndex, computeSwipeNavigation, nextZoomState, selectDisplaySrc"
  - "D-13-compliant test coverage (zero render/fireEvent) for all four functions"
affects: ["177-04 (shared unified viewer shell)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-logic extraction for D-13 test-style compliance: non-React-dependent decision logic lives in frontend/src/lib/*.ts, tested without @testing-library/react"

key-files:
  created:
    - frontend/src/lib/mediaViewerNavigation.ts
    - frontend/src/lib/mediaViewerNavigation.test.ts
  modified: []

key-decisions:
  - "Combined RED+GREEN into a single test(...) commit rather than two separate commits, since the plan's single task writes both files together and the implementation was correct on first run (no plan-level TDD gate applies — this plan's frontmatter type is execute, not tdd)"

patterns-established:
  - "selectDisplaySrc's loaded-but-missing-original fallback reuses the same displayUrl ?? thumbnailUrl ?? null chain as the not-loaded case, guaranteeing a valid URL is never dropped in favor of null"

requirements-completed: [D-03, D-23]

# Metrics
duration: ~12min
completed: 2026-10-09
---

# Phase 177 Plan 01: Pure Media-Viewer Navigation Logic Summary

**Extracted wrap-around index math, swipe-threshold navigation, zoom toggle, and progressive-load URL selection into a standalone, zero-React `mediaViewerNavigation.ts` module with 14 D-13-compliant pure-function tests.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-10-09
- **Tasks:** 1 completed
- **Files modified:** 2 (both created)

## Accomplishments
- `wrapIndex(current, total, delta)` — single modular-arithmetic wrap-around function covering ArrowLeft/ArrowRight/Home/End/swipe navigation, including the single-item (`total === 1`) edge case without NaN/throw
- `computeSwipeNavigation(deltaX, deltaY, threshold)` — horizontal-dominant swipe-threshold gate (32px per UI-SPEC) that returns `null` for vertical-dominant gestures so normal scrolling is never hijacked
- `nextZoomState(current)` — binary zoom toggle matching the UI-SPEC's "click image = 100% zoom, no pinch/pan" contract
- `selectDisplaySrc(params)` — progressive-load URL selection (display → original once loaded, with a safe fallback chain when `originalUrl` is absent)
- 14 German-language `it(...)` test cases, zero `render`/`fireEvent`/`@testing-library` usage, matching the exact shape of `fansub-summary.test.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract and test the four pure viewer-logic functions** - `066f7af2` (test)

**Plan metadata:** (this commit)

_Note: This task's RED and GREEN steps were combined into a single commit — see Deviations below._

## Files Created/Modified
- `frontend/src/lib/mediaViewerNavigation.ts` - 4 exported pure functions (wrapIndex, computeSwipeNavigation, nextZoomState, selectDisplaySrc), zero React/testing-library imports
- `frontend/src/lib/mediaViewerNavigation.test.ts` - 14 vitest cases across the 4 functions, zero render/fireEvent, German description strings with real umlaute

## Decisions Made
- Combined the task's RED and GREEN steps into one `test(177-01): ...` commit instead of two sequential commits. Rationale: this plan's frontmatter `type` is `execute` (not `tdd`), so the plan-level TDD gate-sequence validation (separate `test(...)` then `feat(...)` commits) does not apply — only the task-level `tdd="true"` annotation requesting behavior-driven test coverage applies, which is satisfied by the 14 passing assertions. No functional impact; both files were written and verified together before the single commit.

## Deviations from Plan

None - plan executed exactly as written. The single auto-fix-adjacent decision (combined commit, see above) is a process deviation only, not a code deviation, and is documented for transparency.

## Issues Encountered
- Local `npx vitest` outside the Docker container failed to resolve `vitest/config` (no local `node_modules` install on the host outside the container). Resolved per CLAUDE.md's canonical-environment rule by running the verification command inside the running `team4sv30-frontend` container instead: `docker compose exec team4sv30-frontend npx vitest run src/lib/mediaViewerNavigation.test.ts`. All 14 tests passed; `tsc --noEmit` inside the same container reported zero errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `frontend/src/lib/mediaViewerNavigation.ts` is ready for Plan 177-04 (shared unified viewer shell) to import `wrapIndex`, `computeSwipeNavigation`, `nextZoomState`, and `selectDisplaySrc` directly rather than re-inlining the logic a sixth time.
- No blockers. `FansubMediaLightbox.tsx` and `ProjectMemberMediaViewer.tsx` were read for reference only and were not modified in this plan, per the plan's explicit scope boundary (wiring happens in 177-04).

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED
- FOUND: frontend/src/lib/mediaViewerNavigation.ts
- FOUND: frontend/src/lib/mediaViewerNavigation.test.ts
- FOUND: 066f7af2

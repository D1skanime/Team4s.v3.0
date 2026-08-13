---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "09"
subsystem: frontend
tags: [member-profile, performance, responsive-images, ssr]
requires:
  - phase: 120-05
    provides: shared responsive image and near-viewport primitives
  - phase: 120-06
    provides: stable profile section geometry
provides:
  - stable SSR project cards with responsive lazy cover images
  - near-viewport activation for project load-more controls
affects: [120-verification, public-member-profile]
tech-stack:
  added: []
  patterns: [shared ResponsiveImage, shared near-viewport activation, geometry-identical skeleton]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
    - frontend/src/components/profile/MemberCurrentProjectsSection.module.css
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
key-decisions:
  - "Keep project cards SSR-readable while deferring only optional interaction and skeleton state."
  - "Reuse getMemberProjects and the central authenticated API seam without adding transport or DTO layers."
patterns-established:
  - "Responsive project covers reserve 96x136 intrinsic geometry and advertise 68px/90px responsive slots."
requirements-completed: [D-06, D-07, D-08, D-09, D-15, D-16, D-17, D-19, D-22]
duration: 20min
completed: 2026-08-04
---

# Phase 120 Plan 09: Optimized Member Projects Summary

Stable SSR project cards now use responsive lazy cover images and activate optional load-more interaction only near the viewport without changing project ownership, links, or API behavior.

## Performance

- Replaced the unoptimized project cover with the shared ResponsiveImage component.
- Reserved 96x136 intrinsic cover geometry with 68px mobile and 90px desktop slot hints.
- Preserved the existing 136px desktop and 102px mobile card heights.
- Added a geometry-identical, aria-hidden skeleton layer without displacing SSR-readable cards.
- Used the shared one-shot near-viewport hook to enable load-more interaction.

## API, Auth, and Domain Review

- getMemberProjects remains the only load-more transport.
- No Authorization header, cookie access, runtime-token helper, new DTO, or backend endpoint was introduced.
- Project links remain scoped to /anime/{anime_id}/group/{fansub_group_id}.
- ResponsiveImage receives only the resolved display cover URL, never source_original.
- Existing scoped loading and error behavior remains intact.

## Tests and Verification

- MemberCurrentProjectsSection focused suite: 6/6 passed.
- Frontend TypeScript check: passed in the isolated Compose runner.
- Targeted ESLint for the component and tests: passed.
- git diff --check: passed.
- Auth, cookie, token, and source-original seam scan: passed.
- Corrected overlap-chain audit with the initial snapshot and latest overlapping-plan evidence: passed before both tasks.

## Commits

- 38bfb09c: test(120-09): lock deferred project activation
- 4d3ca185: perf(120-09): defer project interactions with stable covers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supplied the overlap audit evidence required by the verifier**
- **Found during:** Task 1 precondition
- **Issue:** The abbreviated command in the plan omitted the initial snapshot and latest overlapping-plan evidence required by the verifier.
- **Fix:** Ran the immutable authorization check with the recorded initial snapshot and the latest evidence for all overlapping files.
- **Files modified:** None

**2. [Rule 1 - Bug] Kept visible projects synchronized with updated props**
- **Found during:** Task 1 GREEN verification
- **Issue:** A rerender from populated initial projects to an empty project list retained stale local state.
- **Fix:** Synchronized the local visible-project state when the authoritative projects prop changes.
- **Files modified:** frontend/src/components/profile/MemberCurrentProjectsSection.tsx
- **Commit:** 4d3ca185

## Known Stubs

None.

## Threat Review

No new network endpoint, authentication path, file access pattern, schema change, or media ownership seam was introduced. T-120-03, T-120-05, and T-120-07 are covered by the display-only responsive image input, central API helper reuse, fixed geometry, one-shot observer, and scoped errors.

## Self-Check: PASSED

---
phase: 171-kara-segmente-in-release-media-und-public-story-integrie
plan: 04
subsystem: verification
tags: [uat, release-story, kara, media, timeline, playback]

requires:
  - phase: 171-kara-segmente-in-release-media-und-public-story-integrie
    provides: Admin release media/Kara ordering and public mixed story implementation
provides:
  - Cross-surface automated verification evidence
  - Explicit human UAT acceptance for the admin and public Release 27 routes
  - Closed Phase 171 verification gate
affects: [phase-171, release-media, public-release-story]

requirements-completed: [D-01, D-02, D-05, D-09, D-11, D-12, D-14, D-15, D-16]

metrics:
  completed: 2026-10-01
---

# Phase 171 Plan 04: Cross-surface verification Summary

Phase 171 is accepted and closed after explicit user confirmation that all live UAT checks passed.

## Verification evidence

- Admin focused Vitest: 149 tests passed.
- Public focused Vitest: 37 tests passed.
- Follow-up regression suites for the release story: 46 tests passed.
- Backend canonical segment-type regression: TestCanonicalSegmentTypePrecedence passed.
- Backend compile/test checks and git diff --check passed for the verified changes.
- Shared browser routes were used for the Release 27 admin and public release flows.

## Accepted UAT

The user confirmed acceptance of:

- mixed admin release-media/Kara ordering;
- public mixed story order and responsive gallery collapse;
- timeline-to-card navigation, including unavailable Kara targets and deep links;
- preview fallback and contributor-origin display;
- guest Play/login affordance with return-to-release URL;
- exclusive playback between gallery cards and the timeline player;
- authenticated playback behavior;
- canonical Insert-Lied classification as INSERT.

## Known non-blocking baseline issues

The full frontend typecheck still reports pre-existing errors in the Next page prop typing and ReleaseDetailHero.test.tsx fixtures. The production build retains the previously documented unrelated global-error prerender failure. These are recorded as baseline risks and are not Phase 171 acceptance blockers.

## Status

**Complete — human UAT passed.**

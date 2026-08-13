---
phase: 128-canonical-public-identity-visibility-foundation
plan: 16
subsystem: frontend-auth-routing
tags: [nextjs, react, optional-auth, refresh-session, privacy]
requires:
  - phase: 128-03
    provides: Public member profile composition
  - phase: 128-13
    provides: Visibility-aware public member payload
  - phase: 128-15
    provides: Canonical slug semantics
provides:
  - Route-local neutral hidden-profile access gate
  - Pathname-derived token-free canonical member lookup
  - Authoritative viewer access reuse for profile toolbar actions
affects: [128-19, 128-20, 128-21, 128-22]
tech-stack:
  added: []
  patterns: [optional-auth central refresh, server-owned viewer authorization, request-keyed race guard]
key-files:
  created:
    - frontend/src/app/members/[slug]/not-found.tsx
  modified:
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx
    - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
    - frontend/src/app/members/[slug]/OwnProfileEditLink.tsx
    - frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx
    - frontend/src/app/members/[slug]/MemberProfileContent.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
key-decisions:
  - Hidden-profile resolution derives the canonical slug from usePathname and keeps initialization neutral.
  - Preview passes authoritative viewer access into shared composition and toolbar.
  - Toolbar ownership uses getMemberProfile with stored slug, never current-user or numeric-ID authority.
requirements-completed: [PMPR-01, PMPR-04, PMPR-05]
metrics:
  duration: 22min
  completed: 2026-08-13
---

# Phase 128 Plan 16: Authoritative Hidden Profile Preview Summary

Hidden profiles upgrade only from server-owned viewer access facts while anonymous, missing, and non-owner requests remain indistinguishable.

## Performance

- Started: 2026-08-13T17:31:05Z
- Completed: 2026-08-13T17:52:58Z
- Duration: 22 minutes
- Tasks: 2
- Files changed: 7

## Accomplishments

- Replaced the reduced hidden preview with full MemberProfileContent after authoritative owner resolution.
- Added one route-local neutral state for anonymous, missing, and non-owner outcomes.
- Preserved refresh-only sessions through the central API refresh seam.
- Reused resolved viewer access in the existing edit/correction toolbar boundary.
- Guarded pathname changes and unmounts against stale responses.

## Task Commits

1. RED 87f25f72 — hidden-profile access-gate tests
2. GREEN 2ba9c39c — authoritative hidden-profile access gate
3. RED 8a8ac88f — authoritative toolbar tests
4. GREEN 2045495c — viewer-access-driven toolbar actions

## Files Created/Modified

- frontend/src/app/members/[slug]/not-found.tsx — neutral unavailable presentation.
- frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx — pathname lookup, session gate, retry, and owner composition.
- frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx — seven privacy/auth/race cases.
- frontend/src/app/members/[slug]/OwnProfileEditLink.tsx — authoritative toolbar boundary.
- frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx — six toolbar cases.
- frontend/src/app/members/[slug]/MemberProfileContent.tsx — preview notice and viewer propagation.
- frontend/src/app/members/[slug]/page.test.tsx — viewer-aware integration mock.

## Decisions Made

- Canonical slug resolution remains URL-owned through usePathname.
- The token-free getMemberProfile helper is the only browser transport seam.
- Only viewer.is_owner authorizes owner composition or edit actions.
- Hidden outcomes share neutral copy and action to prevent disclosure.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated the page integration mock**
- **Found during:** Task 2 RED
- **Issue:** The existing mock rendered an unconditional edit link and could not exercise viewer authority.
- **Fix:** The mock now follows initialViewer.is_owner and preserves mutual-exclusion coverage.
- **Files modified:** frontend/src/app/members/[slug]/page.test.tsx
- **Commit:** 8a8ac88f

## Verification

- Route tests 41/41: preview 7/7, toolbar 6/6, page 28/28.
- Auth-refresh tests 25/25, including refresh-only owner upgrade.
- No-token suite: all eight production assertions passed; only the known archived Phase-49 planning inventory check failed.
- Focused ESLint passed for all changed TS/TSX files.
- Full typecheck found no Plan 128-16 errors; known unrelated generated ranking, legacy members_only, and user-dirty badge-test failures remain.
- Source and responsive invariants passed, including forbidden-auth scans and existing container-query layout.
- git diff --check passed.
- Live backend UAT was deferred to migration 0145 reset checkpoint; no backend action was attempted.

## Known Stubs

None.

## TDD Gate Compliance

PASSED — each task has an ordered RED commit followed by GREEN.

## Issues Encountered

- React lint required deriving transitional state during render instead of synchronous effect resets.
- Full-repository typecheck and planning-only inventory retain known unrelated failures.
- Live UAT remains deferred until the explicit reset checkpoint.

## User Setup Required

None.

## Next Phase Readiness

- Plan 128-19 can consume the canonical identity and optional-auth seams.
- Plans 128-20 and 128-21 retain their live reset checkpoint dependency.

## Self-Check: PASSED

All implementation files and task commits were verified.

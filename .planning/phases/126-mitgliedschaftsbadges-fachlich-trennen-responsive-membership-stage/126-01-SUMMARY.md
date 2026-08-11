---
phase: 126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage
plan: 01
subsystem: frontend-profile
tags: [membership, badges, resolver, ssr, tdd]
requires:
  - phase: 125-beitragsbadges-als-echtes-familien-carousel-mit-visuellen-st
    provides: dirty release-native profile badge baseline
provides:
  - independent founding membership presentation state
  - exact authoritative 5/7/10 duration resolver contract
  - zero-to-four-year public SSR visibility regression
affects: [126-02, 126-03, member-profile]
tech-stack:
  added: []
  patterns: [presentation-only domain split, backend-authoritative progress, dirty-worktree patch isolation]
key-files:
  created: [.planning/phases/126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage/126-01-SUMMARY.md]
  modified: [frontend/src/components/profile/memberBadgeLabels.ts, frontend/src/components/profile/memberBadgeLabels.test.ts, frontend/src/app/members/[slug]/page.test.tsx]
key-decisions:
  - "Founding is membership-owned through foundingStage but never participates in duration stages, current, next, or hero resolution."
  - "Membership duration continues to consume the backend current_count and next/remainder/complete projection without membership-row arithmetic."
metrics:
  duration: 15min
  completed: 2026-08-11
---

# Phase 126 Plan 01: Membership Resolver Split Summary

**Independent founding ownership with an exact backend-authoritative 5/7/10 membership-duration progression.**

## Accomplishments

- Added a table-driven 0/1/4/5/6/7/8/9/10/11/24 duration contract with exact current, next, remainder, completion, hero, earned, and locked semantics.
- Covered founder and non-founder behavior at 3, 6, and 24 years while preventing special-badge duplication.
- Added SSR coverage proving zero-to-four-year non-founders remain visible without rendering a founding achievement.
- Added `foundingStage` as independent membership presentation state and removed `founding_member` from the duration threshold sequence.

## TDD Gate Compliance

- RED: `be6f7f60` — exactly four Phase-126 contracts failed; 104 existing tests passed.
- GREEN: `169e34c4` — 108 focused tests passed.

## Verification

- `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts "src/app/members/[slug]/page.test.tsx"` — PASS, 108/108.
- Exact required path set comparison — PASS.
- Owned/cached byte comparison — PASS.
- Owned/cached SHA-256 — `3883f3fc1d2b103201747b59698c8210663205391052552cc7b027b2260c7986`.
- Base index tree — `29d2553a3644f2b617ec9576698aff104322b8e9`.
- Final isolated index tree — `4e69bcff1ed38526a3126b05827608b46b8a0a48`.
- Protected non-target hash verification — PASS.
- `git diff --cached --check` and `git diff --check` — PASS.
- Self-review confirmed the remaining unstaged `Medienbeitrag` change in `memberBadgeLabels.ts` is predecessor-owned and was not committed.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No endpoint, auth path, file-access boundary, schema, or transport surface changed.

## Deferred Issues

- Existing React test warnings for mocked image `fill` and `fetchPriority` attributes remain outside this plan.
- Phase 125 remains unapproved; this plan does not alter that gate.

## Self-Check: PASSED

All three required source/test paths are present, commits `be6f7f60` and `169e34c4` exist, and the audit manifest records matching owned/cached hashes.

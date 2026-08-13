---
phase: 124-punkte-meilensteine-als-responsive-single-family-achievement
plan: 01
subsystem: frontend-profile-tests
tags: [vitest, testing-library, tdd, accessibility, ssr]
requires: [phase-121-role-baseline, phase-123-anime-project-stage]
provides: [points-boundary-oracle, points-stage-red-contract, points-ssr-red-contract]
affects: [124-02, 124-03]
tech-stack:
  added: []
  patterns: [table-driven-boundary-oracle, semantic-component-contract, deterministic-ssr-regression]
key-files:
  modified:
    - frontend/src/components/profile/memberBadgeLabels.test.ts
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/app/members/[slug]/page.test.tsx
decisions:
  - Terminal progressbar ARIA is bounded at 2500 while visible point text remains unbounded.
  - Preview changes only hero presentation; authoritative progress remains unchanged.
metrics:
  duration: 12m
  completed: 2026-08-11
---

# Phase 124 Plan 01: Points Achievement Test Contract Summary

Executable boundary, semantic stage, accessibility, CSS, and SSR contracts for the six-stage points achievement family.

## Accomplishments

- Added the canonical 14-total oracle with stage order, earned/locked flags, next target, remainder, completion, and rounded percentages.
- Added deliberate RED contracts for the six-station stage, earned-only preview, authoritative progress, terminal ARIA, artwork, local overflow, and reduced motion.
- Added deliberate RED SSR tests for zero, middle, terminal, over-terminal, and repeat-render determinism.
- Preserved pre-existing Phase-121/123 and FocalCarousel work; only plan-owned test hunks were staged.

## Task Commits

1. b7043973 ? test(124-01): lock points boundary oracle
2. 02fa96f6 ? test(124-01): specify points achievement stage
3. e939b627 ? test(124-01): add deterministic points SSR coverage

## Verification

- memberBadgeLabels.test.ts: 67 passed.
- MemberBadgeChain.test.tsx: 67 passed, 1 skipped, 7 expected RED failures, all new Phase-124 tests.
- page.test.tsx: 10 passed, 5 expected RED failures, all new Phase-124 tests.
- git diff --check passed for owned files.
- FocalCarousel and badge assets were not modified by this plan.

## Deviations from Plan

### Auto-fixed Issues

1. [Rule 3 - Blocking] Adapted the route regression to the live Phase-123 baseline.
   - Found during Task 3.
   - The prior assertion expected obsolete pre-Phase-123 progress copy.
   - Retained route/visibility coverage without pinning obsolete presentation copy.
   - File: frontend/src/app/members/[slug]/page.test.tsx
   - Commit: e939b627

## TDD Gate Compliance

This is a test-only RED plan. Task 1 passed immediately because the existing resolver already satisfied the oracle. Tasks 2 and 3 fail only on missing Phase-124 presentation behavior. GREEN implementation is deferred to the following plan.

## Known Stubs

None.

## Threat Review

- Existing public visibility-gating tests remain green.
- Locked point stages must be static and non-focusable.
- SSR initial state must be deterministic and props-only.

## Self-Check: PASSED

All three modified test files and all three task commits exist. Expected RED failures map only to missing Phase-124 presentation behavior.

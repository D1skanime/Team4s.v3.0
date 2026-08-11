---
phase: 126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage
plan: 02
subsystem: frontend-profile
tags: [membership, badges, accessibility, responsive, blocked]
requires:
  - phase: 126-01
    provides: independent founding state and authoritative 5/7/10 duration resolver
provides:
  - four isolated MembershipStage behavior, accessibility, asset, and CSS contracts
  - worktree-only MembershipStage implementation pending predecessor baseline integration
affects: [126-03, membership-stage, dirty-worktree-integration]
tech-stack:
  added: []
  patterns: [direct single-family stage routing, authoritative preview state, exact patch isolation]
key-files:
  created: [.planning/phases/126-mitgliedschaftsbadges-fachlich-trennen-responsive-membership-stage/126-02-SUMMARY.md]
  modified: [frontend/src/components/profile/MemberBadgeChain.test.tsx]
key-decisions:
  - "Do not stage MemberBadgeChain.tsx or CSS because their Phase-126 hunks depend on predecessor-owned unstaged Phase-123–125 foundations absent from the incoming index."
requirements-completed: []
metrics:
  duration: 38min
  completed: 2026-08-11
---

# Phase 126 Plan 02: Membership Stage Blocked Summary

**Accessible membership-stage contracts are committed; the working implementation is verified locally but cannot be isolated from uncommitted predecessor Stage foundations.**

## Status

Plan 126-02 is **not complete**. The required production commit and exact three-path cached-delta gate could not be produced without mixing predecessor-owned TSX/CSS hunks.

## Accomplishments

- Added four isolated tests covering direct membership routing without `FocalCarousel`, exact 5/7/10 nodes, locked/current semantics, independent founding presentation, authoritative 24-year preview behavior, central v4 artwork, and responsive contained geometry.
- Built `MembershipStage` in the current worktree with a duration hero/progress/three-node track and optional separate founding panel.
- Confirmed the worktree implementation passes all four new Phase-126 tests and all 92 resolver tests.
- Preserved protected `FocalCarousel.*` files and membership/contribution artwork byte-for-byte.

## Commit

- `68bf244b` — `test(126-02): add membership stage contracts`

No production commit was made. No TSX/CSS hunk was staged.

## Isolation Manifest

- Incoming Plan-02 index tree: `16d7e573502a7ef36f06d81e595c8dada65e12c7`.
- Recorded Plan-01 pre-commit final index tree: `4e69bcff1ed38526a3126b05827608b46b8a0a48`.
- The mismatch is expected after Plan-01 code and metadata commits advanced `HEAD`; the incoming index was clean and contained commits `169e34c4` and `de15d2b2`.
- Full Plan-02 owned worktree patch SHA-256: `1dc022ae353e834a5856b36a47f4e8b1792a5582dda4e21520285d069c2bfd8e`.
- Independently separable test patch SHA-256: `d1ecd14d4f7b9b48a80f5e527b118f45ea6bc675699bcacf68f9002453d7801b`.
- Manifest and evidence live under `.git/phase126/plan02/`.

## Blocker

`git apply --cached --check .git/phase126/plan02/owned.patch` fails at:

- `frontend/src/components/profile/MemberBadgeChain.tsx:584`
- `frontend/src/components/profile/MemberBadgeChain.module.css:2114`

The Phase-126 insertion points are inside Phase-123–125 Stage/routing/CSS foundations that exist only as predecessor-owned unstaged worktree changes. Those foundations are absent from the incoming index. Staging the dirty files wholesale would contaminate Plan 126 with foreign work, violate D-39/D-54/D-55 isolation requirements, and make the cached patch differ from the owned snapshot delta.

## Verification

- Phase-126 component contracts: PASS, 4/4.
- `memberBadgeLabels.test.ts`: PASS, 92/92.
- Protected-file SHA-256 comparison: PASS.
- `git diff --check` for all three target files: PASS.
- Separately staged test path allowlist and cached diff-check: PASS before commit.
- Full `MemberBadgeChain.test.tsx`: baseline has three unrelated Phase-125 failures; before implementation the four expected Phase-126 RED failures raised the total to seven.
- `npm run typecheck`: blocked by pre-existing generated `.next/dev/types` route errors and the pre-existing `MemberBadgeChain.test.tsx:1011` prop-type error; no new Phase-126 implementation error was reported.
- Focused lint did not run because typecheck failed first in the chained command.

## Deviations from Plan

### Isolation stop

The plan required exact byte equality between the owned three-file patch and the cached delta. That condition is impossible against the current incoming index because two production hunks require unstaged predecessor context. Per the plan and D-39-style contamination guard, execution stopped instead of staging foreign hunks.

## Known Stubs

None in the worktree implementation.

## Threat Flags

None. No endpoint, auth path, file access, schema, transport, shared carousel, or asset surface changed.

## Next Step

Integrate or commit the predecessor Phase-123–125 `MemberBadgeChain.tsx` and CSS foundations first, then regenerate the Plan-02 baseline and apply the recorded Phase-126 owned patch. Wave 3 technical verification may inspect and test the current worktree, but it must not treat Plan 126-02 as committed or complete.

## Self-Check: PASSED (partial/blocker artifact)

Commit `68bf244b` exists, the four contracts are present, production files remain unstaged, and the blocker evidence and patch hashes are recorded. Plan completion criteria remain intentionally unmet.

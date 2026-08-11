---
phase: 127-besondere-auszeichnungen-kompakt-in-bestehenden-member-header-integrieren
plan: 02
subsystem: frontend
tags: [member-profile, badges, ssr, responsive]
provides: [compact hero awards, centralized badge artwork resolver, legacy Special suppression]
key-files:
  created: [frontend/src/components/profile/badgeArtwork.ts]
  modified: [frontend/src/app/members/[slug]/page.tsx, frontend/src/components/profile/MemberProfileHero.tsx, frontend/src/components/profile/profile.module.css, frontend/src/components/profile/MemberBadgeChain.tsx]
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-23, D-24, D-25, D-26, D-27, D-28, D-29, D-30, D-41, D-42, D-43, D-44, D-45, D-46, D-47]
duration: 32min
completed: 2026-08-11
---

# Phase 127 Plan 02: Compact Hero Awards Summary

**Existing SSR public badges now drive a compact, wrapping Historical Leader/Allrounder list in the current hero, with one centralized artwork resolver and no legacy Special collection.**

## Accomplishments

- Forwarded existing `profile.public_badges` without another request.
- Rendered only Historical Leader and Allrounder, deduplicated in catalog order.
- Preserved Verified in the title row and Founding exclusively in Membership.
- Extracted every existing artwork mapping/fallback and suppressed only the `special` collection consumer.

## Task Commit

- `93cef0b3` — `feat(127-02): integrate compact hero awards`

## Verification

- RED gates: PASS (hero/page exactly 6; chain/artwork exactly 2).
- Phase 127 hero/artwork: 6 PASS; Phase 127 page SSR: 1 PASS.
- Full hero/page/artwork: 36/37 PASS; inherited Phase 99 heading assertion expects removed Special heading.
- Labels: 92 PASS; FocalCarousel: 22 PASS; lint: zero errors (326 inherited warnings).
- Shared chain: 85 PASS, 1 skipped, 4 inherited/stale failures. Phase 127 suppression checks pass before its fixture reaches missing contribution-progress assertions.
- Typecheck: Phase 127 production is clean; inherited generated-route and incoming chain-test mock errors remain.
- Diff checks: PASS.

## Isolation Manifest

- Incoming index tree: `034a3c3d911aa0188711e4faca514d9ba833a8d7`.
- Incoming status, patches, blobs, hashes and byte copies: `evidence/127-02-incoming/`.
- Transactional cached delta contained exactly the five declared production paths.
- FocalCarousel, `api.ts`, assets, backend/contracts/types and `.planning/STATE.md` remained byte-equal incoming.
- The incoming evidence tree and unrelated shared work remain untouched.

## Deviations from Plan

None in production behavior. Stale positive Special-heading tests were left for the test-owned follow-up because Plan 02's transaction permits exactly five production paths.

## Deferred Issues

- Update stale Phase 99/120 heading assertions and repair the retained-contribution fixture.
- Resolve inherited `.next/dev/types` route errors and incoming chain-test mock typing.

## Known Stubs

None.

## Self-Check: PASSED

All five production files and commit `93cef0b3` exist; protected hashes and exact staged paths were verified.
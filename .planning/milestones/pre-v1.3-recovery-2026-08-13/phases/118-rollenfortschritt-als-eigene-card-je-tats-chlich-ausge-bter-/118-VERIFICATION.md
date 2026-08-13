---
phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
verified: 2026-08-03T06:40:00Z
status: gaps_found
score: 9/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "D-10: pointer, touch, trackpad and wheel continuously interpolate the incoming and outgoing cards during movement"
    status: failed
    reason: "Wheel input updates --focal-proximity, but pointer/touch drag only assigns track.scrollLeft; handleScroll only schedules settling and never updates proximity. Direct drag therefore does not drive the promised continuous scale/opacity/saturation state."
    artifacts:
      - path: "frontend/src/components/ui/FocalCarousel.tsx"
        issue: "handlePointerMove changes scrollLeft without recomputing item proximity; proximity is recomputed only inside handleWheel."
      - path: "frontend/src/components/ui/FocalCarousel.test.tsx"
        issue: "No deterministic proximity/continuous-interpolation assertion exists for pointer or touch movement."
    missing:
      - "Update normalized proximity for every continuous scroll/drag input through one shared path."
      - "Add deterministic pointer/touch tests proving intermediate 0..1 proximity and continuous visual state."
  - truth: "D-15: reduced motion removes momentum and continuous scaling and settles within 80-120 ms"
    status: failed
    reason: "Reduced motion suppresses the 240 ms velocity projection, but handlePointerEnd still calls settleNearest(), which always requests behavior='smooth'. There is no reduced-motion-specific duration or instant/short settling path, and no reduced-motion test."
    artifacts:
      - path: "frontend/src/components/ui/FocalCarousel.tsx"
        issue: "settleNearest always calls focusItem(..., 'smooth'); matchMedia changes do not cancel or alter an in-flight smooth scroll."
      - path: "frontend/src/components/ui/FocalCarousel.test.tsx"
        issue: "No matchMedia/reduced-motion fixture verifies projection, scaling, cancellation, or the 80-120 ms contract."
    missing:
      - "Implement a reduced-motion settling path that meets the 80-120 ms contract and cancels incompatible motion on preference changes."
      - "Add deterministic reduced-motion regressions."
  - truth: "D-18 and the UI-SPEC single-owner lifecycle contract are verified for cancellable motion and all continuous inputs"
    status: partial
    reason: "The global component is the sole carousel seam, but it has no rAF motion owner, no rAF interruption/cleanup coverage, and the required continuous pointer/reduced-motion behaviors are absent. Existing seven tests do not implement the mandatory Wave-0 rAF, wheel-boundary, reduced-motion, or transformed-width rejection matrix."
    artifacts:
      - path: "frontend/src/components/ui/FocalCarousel.tsx"
        issue: "No requestAnimationFrame owner exists despite the binding UI-SPEC; motion is split between direct scrollLeft writes and native smooth scroll."
      - path: "frontend/src/components/ui/FocalCarousel.test.tsx"
        issue: "Only seven tests; no rAF/cancelAnimationFrame fixture, reduced-motion test, explicit wheel endpoint test, or pointer momentum/proximity test."
    missing:
      - "Consolidate motion into the specified cancellable owner or document and approve an explicit contract override."
      - "Add the missing lifecycle, endpoint-wheel, transformed-geometry, momentum, and reduced-motion regressions."
---

# Phase 118 Verification Report

**Phase Goal:** Public member profiles show an independent, earned-only role-progress card for every actually exercised fansub role, with exact live threshold/reversal progress and the complete medal chain, inside one reusable responsive FocalCarousel whose continuous input, endpoint, keyboard, reduced-motion and compatibility behavior is verified.
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | D-01–D-04 independent exact live progress | VERIFIED | `roleVolumeProgressBadge` derives count/tier/absolute next threshold/remaining per role from `loadRoleVolumeCounts`; focused Go boundary tests pass. |
| 2 | D-20–D-23 entry, platinum, reversal and zero removal | VERIFIED | Go matrix covers 0/1/11/12/107/108/319/320/509/510; zero returns nil and terminal metadata clamps remaining to zero. |
| 3 | Go/OpenAPI/TypeScript parity | VERIFIED | Five optional fields align; current tier is entry/bronze/silver/gold/platinum and terminal `next_tier` is null. Mounted parity Vitest passes 5/5. |
| 4 | Earned-only privacy and one card per actual role | VERIFIED | Rendering is sourced from public earned badges; explicit zero and foreign-role tests pass. No new endpoint/auth/query/schema seam exists. |
| 5 | D-05–D-09 complete five-medal card and approved copy | VERIFIED | MemberBadgeChain renders hero, rank, progress, semantic five-stage list, locks and `Aktuell`; 44 component tests and 35 resolver tests pass. |
| 6 | D-08/D-13 responsive/mobile containment | VERIFIED | CSS uses five `minmax(0,1fr)` columns and 248 px mobile hero; live UAT measured equal medal/progress client and scroll widths at 390 px and verified tablet/desktop composition. |
| 7 | D-10 continuous interpolation for all inputs | FAILED | Pointer/touch drag changes only `scrollLeft`; it does not update `--focal-proximity`. |
| 8 | D-11/D-12 momentum and endpoint wheel pass-through | UNCERTAIN | Bounded pointer projection and conditional wheel prevention exist, but required deterministic fast multi-card and both-end wheel regressions are absent; live summary does not supply reproducible fixtures. |
| 9 | D-14 exact endpoint centering | VERIFIED | Offset geometry is used, transformed widths are not used for targets, and the explicit 11-card End regression passes; live End remained 11/11. |
| 10 | D-15 reduced-motion behavior | FAILED | Momentum projection is skipped, but snap remains native smooth and no 80–120 ms/cancellation test exists. Live reduced motion was unavailable. |
| 11 | D-16/D-17 keyboard station, controls and counter | VERIFIED | One region tab stop, Arrow/Home/End, 44 px Button controls, `aria-current`, singular/plural counter and non-interactive medal list are present and tested. |
| 12 | D-18/D-19 one reusable carousel and FansubProjectsGrid compatibility | VERIFIED with limitation | One global FocalCarousel is consumed by both surfaces; grid tests pass and live preview/show-all had no counter. The lifecycle portion of D-18 remains a gap above. |

**Score:** 9/12 must-haves verified. Failed truths are BLOCKERS; the uncertain wheel/momentum evidence is a WARNING.

## Required Artifacts and Wiring

| Artifact | Status | Details |
|---|---|---|
| `backend/internal/repository/member_profile_role_volume_repository.go` | VERIFIED | Substantive, called from the existing public profile repository seam, single existing count query, real live awarded-count data. |
| `backend/internal/models/member_profile.go` | VERIFIED | Runtime DTO contains all five optional metadata fields. |
| `shared/contracts/openapi.yaml` | VERIFIED | PublicMemberBadge schema matches runtime/TypeScript tier domains. |
| `frontend/src/types/profile.ts` | VERIFIED | Browser DTO matches the OpenAPI contract. |
| `frontend/src/components/profile/MemberBadgeChain.tsx` | VERIFIED | Wired from `/members/[slug]/page.tsx`, consumes enriched badges, uses shared Card/Badge/FocalCarousel, and contains no local input/motion/auth seam. |
| `frontend/src/components/ui/FocalCarousel.tsx` | PARTIAL | Wired to both consumers and endpoint-safe, but continuous pointer proximity and reduced-motion settling are incomplete. |

## Data-Flow Trace

`release_role_credit_lifecycles` awarded rows → `loadRoleVolumeCounts` → `roleVolumeProgressBadge` → existing public profile response → `page.tsx` `public_badges` → `MemberBadgeChain`. The flow is real and role-independent; zero counts cannot create a card.

## Automated Checks

| Check | Result |
|---|---|
| Focused Go repository tests | PASS |
| FocalCarousel, MemberBadgeChain, labels and FansubProjectsGrid Vitest | PASS, 89 tests |
| OpenAPI/TypeScript parity Vitest with `/shared` read-only mount | PASS, 5 tests |
| Current container typecheck | FAIL from generated `.next/dev/types` route-signature errors affecting existing fansub/member/ranking pages; not shown to originate in Phase 118 files |
| Executor production build/typecheck/lint evidence | Recorded PASS; lint had 328 pre-existing warnings and zero errors |
| Anti-pattern/debt-marker scan | PASS; no unreferenced TBD/FIXME/XXX in changed production files |

The first parity run without the required `/shared` mount failed only because `/shared/contracts/openapi.yaml` was unavailable; the mounted rerun passed.

## Security and Seam Review

ASVS L1 HIGH privacy/contract checks pass for earned-only visibility, explicit-zero removal, live reversal, typed contract parity, and absence of new network/auth/schema/query seams. The resource-lifecycle HIGH mitigation is not fully demonstrated because there is no cancellable rAF lifecycle and no reduced-motion change/cancellation regression.

## Live UAT Evidence and Limitations

The 118-04 record contains user-visible navigation plus desktop, tablet, mobile, keyboard, stable first/last endpoint, 108/320 boundary, and FansubProjectsGrid evidence. It explicitly did not verify reduced motion, and live fixtures for 0, 1, 12, 107, 509 and 510 were unavailable. Those boundary states have automated coverage; reduced motion does not.

## Requirements Coverage

There are no formal REQUIREMENTS.md IDs. D-01–D-09, D-13–D-14, D-16–D-17 and D-19–D-23 are supported by code/tests/live evidence. D-10 and D-15 fail. D-11/D-12 have implementation evidence but incomplete deterministic verification. D-18 is only partially satisfied because global ownership exists but the binding lifecycle/motion contract does not.

## Gaps Summary

The cards, data projection, API parity, endpoint geometry, keyboard accessibility, responsive composition and second-consumer compatibility are real. The phase goal is nevertheless not achieved: continuous pointer/touch visual interpolation is absent, reduced-motion settling is neither compliant nor tested, and the mandatory carousel lifecycle/input regression matrix was not built. These gaps are not assigned to a later roadmap phase.

---

_Verified: 2026-08-03T06:40:00Z_
_Verifier: the agent (gsd-verifier)_

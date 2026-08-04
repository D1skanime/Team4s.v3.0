---
phase: 120
slug: ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-04
---

# Phase 120 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Testing Library 16.3.0; live browser/trace for responsive CLS |
| **Config file** | `frontend/vitest.config.ts` |
| **Quick run command** | `docker compose exec -T team4sv30-frontend npm test -- --run src/app/members/[slug]/page.test.tsx src/components/profile/MemberProfileHero.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| **Full suite command** | `docker compose exec -T team4sv30-frontend npm test` |
| **Estimated runtime** | Measure in Wave 0; focused feedback target under 90 seconds |

## Sampling Rate

- **After every task commit:** Run the focused tests covering the touched profile/image/carousel seam.
- **After every plan wave:** Run the full frontend suite, typecheck, lint where feasible, and `git diff --check`.
- **Before `$gsd-verify-work`:** Full relevant suite and live responsive UAT must be green.
- **Max feedback latency:** 90 seconds for focused automated feedback.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 120-W0-01 | Wave 0 | 0 | D-15–D-18 | T-120-01 | auth-aware cache isolation and stable lazy activation | unit | focused route/carousel tests | ❌ W0 | ⬜ pending |
| 120-W0-02 | Wave 0 | 0 | D-19–D-22 | T-120-02 | restricted image optimizer and fallback behavior | unit/smoke | image prop tests + optimizer smoke | ❌ W0 | ⬜ pending |
| 120-VIS-01 | final | final | D-01–D-17 | — | N/A | live UAT | 390/768/1440 responsive trace | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] Same-key, different-auth and error-path tests for the shared server profile loader.
- [ ] Mocked `IntersectionObserver` plus no-observer fallback tests.
- [ ] Image `priority`/`loading`/`sizes`/dimensions tests and runtime responsive-WebP smoke.
- [ ] Layout-shift/network trace at approximately 390 px, 768 px and 1440 px.
- [ ] Access-token-missing plus valid-refresh-session regression for protected owner actions.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bright and dark member-cropped hero backgrounds remain visible and readable | D-01–D-05 | visual contrast and crop quality | Open representative public profiles in the shared browser at mobile/tablet/desktop widths. |
| No perceptible layout shift while images, skeletons and carousel interaction activate | D-16–D-19 | perceived motion and browser layout trace | Slow network/CPU, scroll through every section, inspect CLS and visual stability. |
| Rhythm C, Weinlinie and responsive section pairs match Sketch 004 | D-06–D-14 | visual fidelity | Compare live route against `.planning/sketches/004-memberprofil-hero/index.html`. |

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all MISSING references.
- [ ] No watch-mode flags.
- [ ] Feedback latency < 90s.
- [ ] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending

---
phase: 118
slug: rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-02
---

# Phase 118 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Testing Library 16.3.2; Go package tests |
| **Config file** | `frontend/vitest.config.ts`; Go package-local `*_test.go` files |
| **Quick run command** | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/profile/MemberBadgeChain.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` |
| **Full suite command** | `docker compose exec -T team4sv30-frontend npm test -- --run && docker compose exec -T team4sv30-backend go test ./...` |
| **Estimated runtime** | ~180 seconds |

## Sampling Rate

- **After every task commit:** Run the focused tests named by that task.
- **After every plan wave:** Run the quick frontend command plus relevant Go package tests when the public badge projection changed.
- **Before `$gsd-verify-work`:** Full frontend and backend suites must be green.
- **Max feedback latency:** 180 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 118-01-01 | 01 | 1 | D-01–D-04, D-20–D-23 | T-118-01, T-118-03 | Only public earned roles are exposed; counts and contract stay aligned | Go repository + contract | Planner must name focused Go package tests and contract checks | yes, extend | pending |
| 118-02-01 | 02 | 1 | D-10–D-19 | T-118-02 | Indices/counts are clamped and animation work is cancellable | Vitest component | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` | yes, extend | pending |
| 118-03-01 | 03 | 2 | D-01–D-09, D-16–D-23 | T-118-01 | Hidden roles remain absent; medals add no extra tab stops | Vitest component | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` | yes, extend | pending |

## Wave 0 Requirements

- [ ] Extend `frontend/src/components/ui/FocalCarousel.test.tsx` with deterministic geometry/rAF fixtures for `offsetLeft`, `offsetWidth`, `clientWidth`, and `scrollWidth`.
- [ ] Extend the existing Go public-profile repository fixtures for exact role counts at thresholds, downward reversal, and zero.
- [ ] Prepare live test profiles with zero, one, and multiple publicly earned roles.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive card composition | D-05–D-09, D-13 | Exact neighbor visibility, artwork scale, wrapping, and five-medal fit require rendered layout | Open `http://127.0.0.1:3300/members/{slug}` through the visible profile flow at desktop, tablet, and mobile widths; verify no inner medal scrolling |
| Direct manipulation and momentum | D-10–D-12, D-14 | Pointer/touch/trackpad feel and wheel pass-through cannot be fully represented by jsdom | Exercise slow drag, fast multi-card swipe/drag, vertical wheel, interruption, and first/last endpoint centering |
| Reduced motion and keyboard | D-15–D-17 | OS preference and complete focus flow need browser verification | Enable reduced motion, confirm short calm snap without continuous scaling; Tab once into the carousel and navigate whole cards with arrow keys |
| Live threshold/reversal states | D-20–D-23 | Seeded profile state and visual output must be checked end-to-end | Verify entry and exact Bronze/Silver/Gold/Platinum states, downward reversal after cancellation, and complete hiding at zero |

## Validation Sign-Off

- [x] All planned task areas have an automated verification target or Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 identifies all missing fixtures
- [x] No watch-mode flags
- [x] Feedback latency target < 180s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-02

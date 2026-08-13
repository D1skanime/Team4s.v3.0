# Phase 124 Validation Strategy

**Created:** 2026-08-11  
**Nyquist validation:** enabled (`workflow.nyquist_validation: true`) [VERIFIED: `.planning/config.json`]

## Test Framework

| Property | Value |
|---|---|
| Framework | Vitest `^3.2.4`, jsdom, Testing Library React `^16.3.0` [VERIFIED: `frontend/package.json`] |
| Config | `frontend/vitest.config.ts` [VERIFIED: codebase] |
| Quick run | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx` |
| Profile regression | `docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx'` |
| Carousel regression | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx` |
| Full frontend suite | `docker compose exec -T team4sv30-frontend npm test` |
| Static checks | `docker compose exec -T team4sv30-frontend npm run typecheck` and `docker compose exec -T team4sv30-frontend npm run lint` |

Commands follow the canonical Docker Compose runtime rule; exact service command syntax should be confirmed against current container tooling before plan execution. [VERIFIED: `AGENTS.md`, running Compose service]

## Requirement-to-Test Map

The PRD does not assign formal requirement IDs, so stable validation IDs below are local planning identifiers. [VERIFIED: Phase 124 roadmap says Requirements TBD]

| ID | Behavior | Test type | Automated command / evidence | File Exists? |
|---|---|---|---|---|
| P124-01 | Points branch has no outer `FocalCarousel`, arrows, counter, quiet semantics, or carousel skeleton | component | focused `MemberBadgeChain.test.tsx` | ✅ extend |
| P124-02 | Exactly six stages in order `1,50,200,500,1000,2500` with exact badge codes | pure + component | `memberBadgeLabels.test.ts`, `MemberBadgeChain.test.tsx` | ✅ extend |
| P124-03 | Active artwork resolves to five `-v2` files plus veteran `-v3`; hero/thumbnail use contained square slots | component + CSS contract + visual | focused tests + screenshots | ✅ extend |
| P124-04 | Default hero is current stage; prior earned stages selectable; locked future stages static/non-focusable | component interaction | focused `MemberBadgeChain.test.tsx` | ✅ extend |
| P124-05 | Preview changes only artwork/name/status; true count, bar, next target and remainder remain unchanged | component interaction | focused `MemberBadgeChain.test.tsx` | ✅ extend |
| P124-06 | Boundary matrix `0,1,49,50,199,200,499,500,999,1000,2499,2500,2733,5000` yields correct current/earned/locked/next/remainder/complete | table-driven pure tests | `memberBadgeLabels.test.ts` | ✅ extend |
| P124-07 | At 0 points section remains visible, first milestone locked, no current earned milestone | pure + component + SSR | labels/chain/page tests | ✅ extend |
| P124-08 | Terminal 2500 and >2500 retain true visible count, full completion, no invented next/remainder | component | focused `MemberBadgeChain.test.tsx` | ✅ extend |
| P124-09 | Initial stage derives deterministically from SSR `total_points`; no hydration/browser-derived state | page + component | page test + server render/hydration regression if harness supports it | ✅ partial / Wave 0 hydration case |
| P124-10 | Same DOM/data structure across breakpoints; only local track overflow; no page overflow | CSS contract + browser | unit CSS assertions + 6 viewport screenshots | ✅ partial / live UAT required |
| P124-11 | Current uses `aria-current`; state is not color-only; progress values/copy correct; reduced motion respected | accessibility component | Testing Library semantic assertions | ✅ extend |
| P124-12 | Roles, Anime Projects, contributions, membership, special awards unchanged | regression | existing `MemberBadgeChain.test.tsx` | ✅ |
| P124-13 | `FocalCarousel` and `FansubProjectsGrid` remain green and files unchanged by Phase 124 | regression + diff | carousel/grid tests + `git diff --name-only` | ✅ |
| P124-14 | Public profile continues visibility-gated data behavior | backend/frontend regression | existing public handler and page tests | ✅ |

## Boundary Oracle

Use this exact expected semantic matrix. Percent is cumulative total divided by the next authoritative threshold, rounded for display as current UI does; terminal rows are complete. [VERIFIED: backend `buildBadgeProgress`, existing family UI, PRD examples]

| Points | Current | Next threshold | Remaining | Display percent | Complete |
|---:|---|---:|---:|---:|---|
| 0 | none | 1 | 1 | 0% | no |
| 1 | Erste Punkte | 50 | 49 | 2% | no |
| 49 | Erste Punkte | 50 | 1 | 98% | no |
| 50 | Aktiv dabei | 200 | 150 | 25% | no |
| 199 | Aktiv dabei | 200 | 1 | 100% (rounded) | no |
| 200 | Erfahrungsstufe | 500 | 300 | 40% | no |
| 499 | Erfahrungsstufe | 500 | 1 | 100% (rounded) | no |
| 500 | Stark engagiert | 1000 | 500 | 50% | no |
| 999 | Stark engagiert | 1000 | 1 | 100% (rounded) | no |
| 1000 | Veteranenstatus | 2500 | 1500 | 40% | no |
| 2499 | Veteranenstatus | 2500 | 1 | 100% (rounded) | no |
| 2500 | Archiv-Legende | none | none | 100% | yes |
| 2733 | Archiv-Legende | none | none | 100% | yes |
| 5000 | Archiv-Legende | none | none | 100% | yes |

The rounded 100% just below a threshold is mathematically produced by `Math.round`; implementation should decide whether visible percent should cap at 99% until earned. The PRD says preserve current progress semantics and does not lock this edge display, so the planner should make this explicit rather than silently changing it. [VERIFIED: current component arithmetic; PRD section 17]

## Sampling Rate

- **Per task commit:** focused labels + chain tests, then `git diff --check`.
- **Per wave merge:** focused profile/carousel/grid regressions plus typecheck and lint.
- **Phase gate:** full frontend suite, build if feasible, all live viewport checks, screenshots, then explicit human `approved` checkpoint. [VERIFIED: PRD sections 25, 29–36; `AGENTS.md`]

## Baseline Status (2026-08-11)

The focused pre-implementation baseline is green: `memberBadgeLabels.test.ts`, `MemberBadgeChain.test.tsx`, `FocalCarousel.test.tsx`, and `FansubProjectsGrid.test.tsx` completed with 146 passing tests and 1 skipped test. Vitest emitted existing React `act(...)` warnings from two FocalCarousel interaction cases; these are warnings, not failures, and should be tracked separately from Phase-124 regressions. [VERIFIED: canonical Docker Compose test run]

## Wave 0 Gaps

- [ ] Add a table-driven boundary test covering all 14 mandated totals in `memberBadgeLabels.test.ts`.
- [ ] Add a points-stage rendering/interaction describe block in `MemberBadgeChain.test.tsx` before production edits (RED for no outer carousel and thumbnail track).
- [ ] Add an explicit SSR/hydration determinism regression. The current page tests verify derivation at representative values but no dedicated hydration mismatch test was found. [VERIFIED: focused test inspection]
- [ ] Add CSS contract assertions for square contained hero/thumbnail slots and local-only overflow.
- [ ] Decide and encode the two ambiguous edge contracts: terminal ARIA boundedness and rounded 100% immediately below a threshold.

No framework/config/fixture installation is required. [VERIFIED: existing Vitest setup]

## Live UAT Matrix

Use the real public member-profile route reached through visible navigation, through `http://127.0.0.1:3300`. Do not treat a hidden direct route or headless test as final acceptance. [VERIFIED: `AGENTS.md`]

| Viewport | Required evidence |
|---|---|
| 390×844 | centered hero, compact vertical flow, native local thumbnail scroll, no page overflow |
| 768×1024 | transition layout, readable six-stage navigation |
| 1024×768 | desktop split without clipping |
| 1440×900 | wide stage, hero/information balance |
| 1920×1080 | controlled growth and all six thumbnails visible |
| 2560×1440 | visual max width respected; no giant hero |

Capture `points-390.png`, `points-768.png`, `points-1024.png`, `points-1440.png`, `points-1920.png`, `points-2560.png`, plus `points-preview.png` and `points-max.png`. Visually inspect at least three distinct artworks for distortion, background overhang, centering, and desktop/mobile geometry. [VERIFIED: PRD sections 31–32]

## Dirty-Worktree Safety Gate

Before every implementation wave:

1. Run `git status --short` and save the relevant pre-wave diff.
2. Confirm current dirty files include user-owned Phase-121/123 and FocalCarousel work.
3. Edit only the planned `MemberBadgeChain`/label/page test seams.
4. Assert `FocalCarousel.tsx`, its CSS/tests, and badge PNG hashes did not change as part of Phase 124.
5. Review `git diff --check` and targeted diff; never reset or replace whole files.

[VERIFIED: current worktree and `AGENTS.md`]

## Human Gate

After automated checks and live UAT, stop and present desktop/mobile/track/preview/max evidence. Phase 124 must not be marked formally complete until the user replies `approved` or requests corrections. [VERIFIED: PRD section 36]

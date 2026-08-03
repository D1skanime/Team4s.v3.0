---
phase: 119
slug: sammlungskarten-f-r-fortschritt-punkte-beitr-ge-mitgliedscha
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-08-03
reviewed_at: 2026-08-03
---

# Phase 119 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Testing Library 16.3.2; Go package tests with `testing`/testify |
| **Config file** | `frontend/vitest.config.ts`; Go package-local `*_test.go` files |
| **Quick run command** | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| **Full suite command** | `docker compose exec -T team4sv30-frontend npm test -- --run && docker compose exec -T team4sv30-backend go test ./...` |
| **Estimated runtime** | ~180 seconds |

## Sampling Rate

- **After every task commit:** Run the focused automated command listed for that task, followed by `git diff --check`.
- **After every plan wave:** Run the quick frontend command plus `docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers` whenever the public-profile projection or visibility seam changed.
- **Before `$gsd-verify-work`:** Full frontend and backend suites, frontend typecheck/lint, production build when feasible, and `git diff --check` must be green.
- **Max feedback latency:** 180 seconds for focused checks; record separately if the full suite exceeds this target.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 119-01-01 | 01 | 0 | D-01–D-06, D-14 | T-119-02 | Every badge code has one canonical family; unknown earned specials render once and no category duplicates occur | Vitest unit | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx; test $? -ne 0 && git diff --check` | ✅ extend | ⬜ pending |
| 119-01-02 | 01 | 0 | D-11, D-15–D-16 | T-119-03 | Single-card, stage-strip and second-consumer tests lock bounded carousel motion, independent grids and unchanged FansubProjectsGrid behavior | Vitest component | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/components/profile/MemberBadgeChain.test.tsx; test $? -ne 0 && git diff --check` | ✅ extend | ⬜ pending |
| 119-01-03 | 01 | 0 | D-01–D-04, D-06–D-08 | T-119-01, T-119-02 | Failing repository, handler and contract tests lock exact raw metrics, earned/public separation and gated visibility before runtime changes | Go repository/handler + contract | `docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers -run 'Test.*(Badge|Progress|Membership|Contribution|PublicProfile)' -count=1; test $? -ne 0 && docker compose exec -T team4sv30-frontend npm test -- --run src/types/__tests__/v12-projection-contract.test.ts; test $? -ne 0 && git diff --check` | ✅ extend | ⬜ pending |
| 119-02-01 | 02 | 1 | D-01–D-04, D-07–D-08 | T-119-01, T-119-02 | The existing gated profile read projects all six exact families, keeps membership rows unsummed and leaves earned badge visibility separate | Go repository | `docker compose exec -T team4sv30-backend go test ./internal/repository -run 'Test.*(Badge|Progress|Membership|Contribution|PublicProfile)' -count=1 && git diff --check` | ✅ extend | ⬜ pending |
| 119-02-02 | 02 | 1 | D-01–D-04, D-06–D-08 | T-119-01, T-119-02 | Handler, OpenAPI and TypeScript contracts agree while anonymous/owner visibility minimization and typed page pass-through remain intact | Go handler + contract + Vitest + typecheck | `docker compose exec -T team4sv30-backend go test ./internal/handlers -run TestGetPublicMemberProfile -count=1 && docker compose exec -T team4sv30-frontend npm test -- --run src/types/__tests__/v12-projection-contract.test.ts 'src/app/members/[slug]/page.test.tsx' && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ✅ extend | ⬜ pending |
| 119-03-01 | 03 | 2 | D-01–D-09, D-12–D-14 | T-119-02 | The canonical catalog resolves stable families, numeric stages, earned state and unknown specials exactly once | Vitest unit + typecheck | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ✅ extend | ⬜ pending |
| 119-03-02 | 03 | 2 | D-01–D-14 | T-119-01, T-119-02, T-119-10 | MemberBadgeChain renders accessible family cards, truthful selection/lock/progress states, earned-only specials and internal stage scrolling | Vitest component + typecheck | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ✅ extend | ⬜ pending |
| 119-03-03 | 03 | 2 | D-15–D-16 | T-119-03, T-119-10 | The public route passes family metrics into the one global carousel; quiet cards, independent grids and FansubProjectsGrid regressions remain correct | Vitest integration + typecheck | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/components/profile/MemberBadgeChain.test.tsx 'src/app/members/[slug]/page.test.tsx' && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ✅ extend | ⬜ pending |
| 119-04-01 | 04 | 3 | D-01–D-16 | T-119-01–T-119-03, T-119-10 | Focused and full contract, visibility, security, cross-consumer, static and production-build gates run without modifying source | Full automated gate | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/types/__tests__/v12-projection-contract.test.ts 'src/app/members/[slug]/page.test.tsx' && docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers -count=1 && docker compose exec -T team4sv30-frontend npm test -- --run && docker compose exec -T team4sv30-backend go test ./... && docker compose exec -T team4sv30-frontend npm run typecheck && docker compose exec -T team4sv30-frontend npm run lint && docker compose exec -T team4sv30-frontend npm run build && git diff --check` | ✅ | ⬜ pending |
| 119-04-02 | 04 | 3 | D-01–D-16 | T-119-01–T-119-03, T-119-10 | Blocking shared-browser UAT verifies the real route, responsive inputs, independent grids, specials, exact thresholds and second consumer after automated smoke checks | Human verify + Vitest smoke | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx && git diff --check` | ✅ + live UAT | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Threat References

| Threat | Risk | Required mitigation |
|--------|------|---------------------|
| T-119-01 | Hidden/private member or badge-progress data leaks through the additive profile projection | Keep the existing `members_only` owner gate and `visibility='public' AND status='active'` badge filter; add metrics only to the existing gated profile response, never a parallel endpoint |
| T-119-02 | A badge is duplicated, assigned to the wrong family, or a below-threshold metric is announced as earned | Canonical family registry, exactly-once tests, and a separate metric-versus-earned representation |
| T-119-03 | Carousel/stage scrolling traps input, leaks state across categories, or ignores Reduced Motion | One global `FocalCarousel`, per-instance disclosure state, bounded inner-strip scrolling, cleanup and deterministic reduced-motion/pointer tests |

## Wave 0 Requirements

- [ ] Extend `frontend/src/components/profile/memberBadgeLabels.test.ts` with canonical family ownership, threshold ordering, automatic stage insertion, exactly-once assignment and unknown earned-special fallback fixtures.
- [ ] Extend `frontend/src/components/profile/MemberBadgeChain.test.tsx` with no-earned, exact-threshold and terminal fixtures for progress, points, all three contribution families and membership; include 0/1/multiple specials.
- [ ] Extend `frontend/src/components/ui/FocalCarousel.test.tsx` with single-item quiet mode, independent expanded instances, pointer proximity, endpoint wheel pass-through and deterministic Reduced Motion behavior left open by Phase 118.
- [ ] Add deterministic stage-strip geometry fixtures proving that auto-centering changes only the inner horizontal strip and uses non-smooth behavior under Reduced Motion.
- [ ] Extend existing Go repository fixtures for exact distinct-Anime progress, all three below-Bronze contribution counts, 5/7/10-year membership boundaries, terminal states and non-summed separate memberships.
- [ ] Extend `frontend/src/types/__tests__/v12-projection-contract.test.ts` for the additive family-metric DTO and its Go/OpenAPI/TypeScript parity.
- [ ] Preserve and run `backend/internal/handlers/app_public_profile_test.go` cases for anonymous public, anonymous hidden, other-user hidden and owner-visible `members_only` profiles.
- [ ] Prepare live public profile fixtures for: no earned stages, intermediate values, exact thresholds, completed series, zero/one/multiple special awards, and a non-founder with membership duration.

## Refresh Session / Public Visibility Regression

The Phase-119 badge surface is read-only on the public `/members/[slug]` route and must remain usable anonymously. It adds no protected browser action or client-side auth gate, so the standard “missing/expired access token + valid refresh token” protected-action regression is not newly applicable to the badge component itself.

The existing SSR owner preview for a `members_only` profile is auth-adjacent and must not be broadened by this phase. Automated handler/page tests must prove public anonymous visibility and hidden-profile owner/non-owner behavior. If implementation changes `getMemberProfile`, cookie handling, `authorizedFetch`, `OwnHiddenProfilePreview`, or introduces a client-side protected branch, Wave 0 must additionally add the canonical valid-refresh/no-access-token regression through the central API client before that task can complete; direct refresh helpers, cookie reads, bearer construction or token props remain forbidden.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Complete public-profile information architecture | D-14 | Real navigation, section rhythm and product fit require the shared browser | Navigate visibly to `http://127.0.0.1:3300/members/{slug}` and verify exact order: Rollen, Fortschritt, Punkte-Meilensteine, Beiträge, Mitgliedschaft, Besondere Auszeichnungen |
| Responsive collection-card composition | D-07–D-12, D-15 | Artwork scale, wrapping, neighbor visibility, inner-strip containment and no page overflow require rendered layout | Test at 1440×900, 1024×768 and 390×844; verify 1480-px shell, expected card width/hero size, no horizontal page overflow, and long points strip scrolling only internally |
| Pointer, touch, wheel, keyboard and Reduced Motion | D-10–D-12, D-15 | jsdom cannot fully represent native scroll feel, OS motion preference or focus/scroll interaction | Exercise slow drag, fast swipe, wheel at both endpoints, Arrow/Home/End, stage selection by click/Enter/Space, then repeat with Reduced Motion; verify calm motion and current-stage auto-centering |
| Independent inline grids | D-16 | Focus return and simultaneous rendered layout need full browser behavior | Open grids in two categories simultaneously, close one, verify the other remains open and focus returns to the closed grid's own toggle |
| Special-award visibility | D-05, D-13 | Requires seeded live profiles and final artwork/fallback review | Visit profiles with zero, one and multiple specials; verify absent section at zero, quiet single card at one, carousel at multiple, no locked future specials and no duplicates |
| Exact threshold and membership semantics | D-01–D-09 | End-to-end seed/database projection plus visual copy must agree | Verify below, exact and terminal values for Anime-Projekte, points, each contribution family and 5/7/10 years; verify separate memberships are not summed and a non-founder is not told they can progress toward `Gründungsmitglied` |
| FansubProjectsGrid regression | D-15–D-16 | Shared carousel changes can alter real preview links/expansion despite unit coverage | Open the public fansub-project surface, navigate first/last cards and toggle its grid; confirm links, preview interaction and absence of an unwanted badge-style counter |

## Validation Sign-Off

- [x] All anticipated plan tasks have an automated verification target or explicit Wave 0 dependency
- [x] Sampling continuity: no 3 consecutive tasks without automated verification
- [x] Wave 0 covers all missing repository, contract, component, geometry and live fixtures
- [x] Public visibility and conditional refresh-session applicability are explicit
- [x] Live UAT covers desktop, tablet, mobile, keyboard, pointer/touch/wheel, Reduced Motion and independent grids
- [x] No watch-mode flags
- [x] Every task commit includes `git diff --check`
- [x] Feedback latency target is 180 seconds for focused checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-03

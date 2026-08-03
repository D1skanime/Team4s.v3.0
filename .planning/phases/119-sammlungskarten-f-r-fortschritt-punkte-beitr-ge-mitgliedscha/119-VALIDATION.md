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

> Exakte Spiegelung der finalen fünf Pläne, zehn Tasks, Waves 1–5 und lokalen Threat-IDs.

## Test Infrastructure

| Property | Value |
|---|---|
| **Framework** | Vitest 3.2.4 + Testing Library 16.3.2; Go package tests with `testing`/testify |
| **Config file** | `frontend/vitest.config.ts`; Go package-local `*_test.go` files |
| **Quick run command** | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx` |
| **Full suite command** | `docker compose exec -T team4sv30-frontend npm test -- --run && docker compose exec -T team4sv30-backend go test ./...` |
| **Estimated runtime** | ~180 seconds |

## Sampling Rate

- Nach jedem Task-Commit: exakt den unten aufgeführten fokussierten Befehl und `git diff --check` ausführen.
- Nach jeder Plan-Wave: Quick-Frontend-Suite; zusätzlich Repository-/Handler-Tests, sobald Public-Profile-Projektion oder Sichtbarkeit berührt wurden.
- Vor `$gsd-verify-work`: vollständige Frontend-/Backend-Suiten, Typecheck, Lint, Build soweit möglich und `git diff --check`.
- Maximale Feedback-Latenz für fokussierte Checks: 180 Sekunden; längere Full-Suite-Laufzeiten separat protokollieren.

## Per-Task Verification Map

| Task ID | Plan | Wave | Decision Ownership | Threat Ref | Exact semantics | Automated Command | Status |
|---|---:|---:|---|---|---|---|---|
| 119-01-01 | 01 | 1 | D-01–D-13 | T-119-02, T-119-05, T-119-08 | Failing family/resolver/component fixtures lock all family stages, exact/terminal progress, selection, locks, exactly-once ownership and earned-only specials; D-14 is intentionally not owned here | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx; test $? -ne 0 && git diff --check` | ⬜ pending |
| 119-01-02 | 01 | 1 | D-11, D-15–D-16 | T-119-03, T-119-10 | Failing global-carousel/stage-strip fixtures lock quiet-one-item, independent grids, bounded input, inner-only centering, Reduced Motion and the FansubProjectsGrid consumer | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/components/profile/MemberBadgeChain.test.tsx; test $? -ne 0 && git diff --check` | ⬜ pending |
| 119-01-03 | 01 | 1 | D-01–D-04, D-06–D-08 | T-119-01, T-119-02, T-119-06 | Failing repository, handler and parity fixtures lock six raw families, earned/public separation, exact boundaries and existing public/members_only visibility before runtime changes | `docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers -run 'Test.*(Badge|Progress|Membership|Contribution|PublicProfile)' -count=1; phase119_backend_red_status=$?; docker compose exec -T team4sv30-frontend npm test -- --run src/types/__tests__/v12-projection-contract.test.ts; phase119_frontend_red_status=$?; if [ "$phase119_backend_red_status" -eq 0 ]; then exit 1; fi; if [ "$phase119_frontend_red_status" -eq 0 ]; then exit 1; fi; git diff --check` | ⬜ pending |
| 119-02-01 | 02 | 2 | D-01–D-04, D-07–D-08 | T-119-01, T-119-02, T-119-06, T-119-07 | Existing gated repository read emits exact six-family metrics, never sums memberships, and keeps founding-member/earned visibility separate | `docker compose exec -T team4sv30-backend go test ./internal/repository -run 'Test.*(Badge|Progress|Membership|Contribution|PublicProfile)' -count=1 && git diff --check` | ⬜ pending |
| 119-02-02 | 02 | 2 | D-01–D-04, D-06–D-08 | T-119-01, T-119-02, T-119-04, T-119-06 | Handler, Go/OpenAPI/TypeScript and page contracts agree; anonymous/owner visibility remains minimized and auth/transport owners remain unchanged | `docker compose exec -T team4sv30-backend go test ./internal/handlers -run TestGetPublicMemberProfile -count=1 && docker compose exec -T team4sv30-frontend npm test -- --run src/types/__tests__/v12-projection-contract.test.ts 'src/app/members/[slug]/page.test.tsx' && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ⬜ pending |
| 119-03-01 | 03 | 3 | D-01–D-09, D-12–D-13 | T-119-02 | Canonical typed catalog resolves numeric family stages, exact progress, exactly-once ownership and unknown earned specials without localized-label parsing | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ⬜ pending |
| 119-03-02 | 03 | 3 | D-01–D-14 | T-119-01, T-119-02, T-119-03, T-119-05, T-119-08, T-119-10 | MemberBadgeChain owns accessible family cards, truthful hero/lock/progress/special states, exact section order and inner-only stage scrolling while consuming the existing carousel seam | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ⬜ pending |
| 119-04-01 | 04 | 4 | D-15–D-16; D-11 regression | T-119-01, T-119-03, T-119-09, T-119-10 | Public route passes authoritative metrics into the one global carousel; quiet cards, independent grids, bounded interactions and FansubProjectsGrid stay correct without new API/auth/carousel seams | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/components/profile/MemberBadgeChain.test.tsx 'src/app/members/[slug]/page.test.tsx' && docker compose exec -T team4sv30-frontend npm run typecheck && git diff --check` | ⬜ pending |
| 119-05-01 | 05 | 5 | D-01–D-16 | T-119-01–T-119-10 | Strict validation-only gate runs focused/full contract, visibility, cross-consumer, static and production-build checks without source fixes | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/types/__tests__/v12-projection-contract.test.ts 'src/app/members/[slug]/page.test.tsx' && docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers -count=1 && docker compose exec -T team4sv30-frontend npm test -- --run && docker compose exec -T team4sv30-backend go test ./... && docker compose exec -T team4sv30-frontend npm run typecheck && docker compose exec -T team4sv30-frontend npm run lint && docker compose exec -T team4sv30-frontend npm run build && git diff --check` | ⬜ pending |
| 119-05-02 | 05 | 5 | D-01–D-16 | T-119-01–T-119-10 | Blocking shared-browser UAT verifies real navigation, responsive/motion/focus states, independent grids, specials, thresholds and second consumer after automated smoke checks | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/MemberBadgeChain.test.tsx src/components/ui/FocalCarousel.test.tsx src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx && git diff --check` | ⬜ pending |

## Local Threat Register

| Threat ID | STRIDE / Gate | Local definition and required mitigation |
|---|---|---|
| T-119-01 | Information Disclosure | Exact metrics remain inside the existing visible PublicMemberProfile response; public/members_only owner/non-owner tests block hidden-profile leaks. |
| T-119-02 | Tampering / Integrity | Server metrics and earned `public_badges` stay separate; canonical exactly-once ownership prevents fabricated or duplicated stages. |
| T-119-03 | Denial of Service | FocalCarousel and inner stage-strip listeners/motion are bounded, cancellable, endpoint-safe and Reduced-Motion aware. |
| T-119-04 | Elevation of Privilege | Optional SSR auth behavior is unchanged; public access adds no client refresh, cookie, bearer or token-prop seam. |
| T-119-05 | Spoofing | Temporary hero selection is presentation-only; authoritative highest earned stage retains visible `Aktuell`. |
| T-119-06 | Information Disclosure | Membership exposes only maximum duration of one row, never group names, dates or row facts. |
| T-119-07 | Denial of Service | Existing count loaders and one profile read are reused; no endpoint fan-out or per-stage queries. |
| T-119-08 | Spoofing | Selected hero is explicitly `Ausgewählt`, resets on family/data change and cannot replace the authoritative rank. |
| T-119-09 | Elevation of Privilege | Route integration changes only typed pass-through and leaves getMemberProfile/authorizedFetch/owner preview untouched. |
| T-119-10 | Accessibility interaction gate | Locks are non-tabbable; 44px controls, nested-key boundaries, progressbar/pressed/expanded/controls semantics and per-instance focus restoration are mandatory. |

All T-119-01/T-119-02 findings are HIGH and block completion. Any undefined threat reference is forbidden.

## Wave 1 Test-First Requirements

- Extend the canonical registry, MemberBadgeChain, FocalCarousel, FansubProjectsGrid, repository, handler and contract tests named by Plan 119-01 before production changes.
- Preserve Phase-118 artifacts and `backend/internal/services/badge_service_test.go` as mandatory semantic analogs.
- Prepare live fixtures for no earned stage, intermediate/exact/terminal values, zero/one/multiple special awards and a non-founder membership.

## Auth / Visibility Regression

The public badge surface adds no protected browser action. Existing anonymous public and optional SSR owner preview behavior must remain unchanged. If `getMemberProfile`, `authorizedFetch`, cookies, `OwnHiddenProfilePreview` or a protected client branch changes, execution must first add the canonical missing-access-token plus valid-refresh-token regression through the central API client; direct refresh helpers, cookie reads, bearer construction and token props remain forbidden.

## Live UAT Matrix

Plan 119-05 Task 2 is the sole blocking human gate and must use visible navigation to `http://127.0.0.1:3300/members/{slug}`. It verifies exact section order; 1440×900, 1024×768 and 390×844; pointer/touch/wheel/keyboard/Reduced Motion; older-stage selection and locks; two independent grids; zero/one/multiple specials; below/exact/terminal thresholds; non-summed memberships/non-founder semantics; the Phase-118 roles section; and real FansubProjectsGrid navigation. Headless evidence cannot replace this gate.

## Validation Sign-Off

- [x] Every final plan task has exactly one row with its real plan and frontmatter wave.
- [x] D ownership mirrors the task action/behavior; 119-01-01 no longer claims D-14.
- [x] Every referenced T-119 identifier is defined locally.
- [x] Plan 119-05 remains strictly validation/UAT-only; Task 1 owns only the executor evidence artifact `119-05-SUMMARY.md`, while Task 2 adds no file ownership.
- [x] No watch-mode flags; every task command includes `git diff --check`.
- [x] Sampling continuity and ASVS L1 blocking gates are explicit.

**Approval:** approved 2026-08-03

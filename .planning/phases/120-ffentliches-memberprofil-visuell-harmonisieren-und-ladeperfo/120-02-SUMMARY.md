---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "02"
subsystem: validation
tags: [vitest, go-test, docker-compose, typecheck, next-build, auth-boundary]
requires:
  - phase: 120-01
    provides: User-authorized Phase-119 byte snapshot and overlap-chain baseline
  - phase: 119-05
    provides: Reproducible inherited baseline failure inventory
provides:
  - Deterministic green frontend and backend full-suite baseline
  - Read-only Compose visibility for repository-owned frontend contract fixtures
  - Isolated Next.js typecheck and 23-page production build evidence
affects: [120-03, 120-04, 120-05, 120-06, 120-07, 120-08, 120-09, 120-10, 120-11, 120-12]
tech-stack:
  added: []
  patterns: [environment-isolated assertions, client-gate-aware SSR tests, read-only contract fixture mounts]
key-files:
  created:
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-02-SUMMARY.md
  modified:
    - frontend/src/lib/api.test.ts
    - frontend/src/components/contributions/ReportModal.test.tsx
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/fansubs/__tests__/publicPageWidthContract.test.ts
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
    - backend/internal/config/config_test.go
    - backend/internal/migrations/phase106_member_points_test.go
    - frontend/src/lib/publicApiUrl.test.ts
    - frontend/src/app/admin/anime/page.test.tsx
    - docker-compose.override.yml
key-decisions:
  - "The user authorized a narrow corrective deviation for seven deterministic residual frontend failures after the original Plan 120-02 scope was exhausted."
  - "Repository-owned docs, planning contracts, Keycloak theme sources, OpenAPI contracts, and Go model sources are exposed read-only at their existing absolute test paths rather than copied or duplicated."
requirements-completed: [D-14]
duration: 25m
completed: 2026-08-04
---

# Phase 120 Plan 02: Inherited Baseline Stabilization Summary

**Deterministic green frontend/backend baseline with environment-isolated URL and SSR tests, read-only contract fixtures, and isolated Next.js build state**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-04T11:59:23Z
- **Completed:** 2026-08-04T12:23:50Z
- **Tasks:** 3
- **Files modified:** 10 implementation/test/config files plus this summary

## Accomplishments

- Corrected all nine originally declared inherited frontend failures without changing production behavior.
- Isolated the two backend suite assumptions from Compose SMTP defaults and container path layout.
- Resolved the seven user-authorized residual frontend failures without weakening auth or token-boundary contracts.
- Made repository-owned test inputs reproducibly visible through read-only Compose mounts; no live environment data or secrets were copied.
- Proved the complete frontend and backend suites, isolated typecheck, isolated production build, lint, and diff check green.

## Failure Disposition Matrix

| Inherited failure | Count | Disposition | Correction/evidence |
|---|---:|---|---|
| Runtime-host URL expectation in api.test.ts | 1 | corrected | Expected URL derives from configured runtime origin |
| ReportModal SSR createPortal cases | 5 | corrected | Deterministic test-only portal normalization |
| Profile retained-background crop fetch | 1 | corrected | Assertion uses resolved retained display URL |
| Public fansub width contract | 1 | corrected | Assertion matches shipped public shell width contract |
| Jellyfin cover runtime URL | 1 | corrected | Expected URL derives from configured runtime origin |
| Backend legacy SMTP fallback | 1 | corrected | Canonical Compose variables explicitly cleared in unit premise |
| Phase-106 migration boundary fixture path | 1 | corrected | Backend source root resolves independently from migration root |
| publicApiUrl configured-origin assumptions | 2 | corrected | Each same-origin case explicitly stubs its own environment |
| Admin anime SSR auth-gate expectations | 3 | corrected | Page shell bypasses only the gate in SSR tests; list behavior renders through the real client component |
| Auth docs allowlist path | 1 | corrected | Canonical docs and planning inputs mounted read-only |
| Keycloak registration script path | 1 | corrected | Canonical infra source mounted read-only at /infra |
| Stale .next/dev type drift | 1 gate | stale-green | Fresh one-shot container with anonymous /app/.next passes |
| /_not-found production prerender | 1 gate | stale-green | Isolated NODE_ENV=production build completes 23/23 static pages |

## Verification

- Focused original frontend set: 64/64 passed.
- Focused residual set after correction: 29/29 passed.
- Complete frontend suite: 224 passed files, 1 intentionally skipped file; 1541 passed tests, 3 todo.
- Complete backend suite: all packages passed.
- Isolated frontend typecheck: passed with anonymous /app/.next.
- Isolated Next.js production build: compiled and generated 23/23 static pages.
- Lint: passed with 0 errors and 326 pre-existing warnings.
- git diff --check: passed.
- Dedicated PlatformAdminGate coverage remains green, including access-token-absent/refresh-token-valid admin access.

## Deviations from Plan

### User-Authorized Scope Expansion

**1. Corrected seven deterministic residual full-frontend failures**
- **Found during:** Task 3 complete frontend suite
- **Authorization:** User selected option 1 at the scope checkpoint.
- **Scope:** publicApiUrl assumptions, admin anime SSR expectations, auth docs fixture visibility, and Keycloak registration fixture visibility.
- **Impact:** Test/config-only changes; no production, auth, API, security, or schema behavior changed.
- **Commit:** 338e352d

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exposed additional canonical contract fixtures read-only**
- **Found during:** Task 3 full-suite reruns
- **Issue:** After docs and infra became available, the Phase-119 projection contract reached additional existing absolute fixtures at /shared and /backend.
- **Fix:** Added read-only shared and backend mounts alongside docs, planning, and infra.
- **Files modified:** docker-compose.override.yml
- **Verification:** Complete frontend suite passed 1541 tests.
- **Commit:** 338e352d

## Authentication Gates

None.

## Known Stubs

None. The placeholder prop in the profile test harness is ordinary semantic test markup and does not flow from a hardcoded missing data source.

## Threat Review

No new threat surface was introduced. Changes are limited to tests and read-only local Compose source mounts. The production auth gate and refresh-session behavior were not modified, and the dedicated refresh-token-only gate regression remains green.

## Commits

- `d41efa14` - Correct inherited frontend test assumptions.
- `e056d705` - Isolate inherited backend suite assumptions.
- `338e352d` - Stabilize complete frontend test baseline and Compose fixture visibility.

## Unrelated Existing State

Phase-119 source/tests/CSS/badge assets, frontend/next-env.d.ts, and shared STATE.md/ROADMAP.md changes remain unmodified and unstaged by this plan. Existing lint and React/jsdom warnings remain out of scope.

## Next Phase Readiness

Plan 120-03 may begin from a deterministic green project-wide baseline.

## Self-Check: PASSED

- All ten scoped implementation/test/config files exist.
- Task commits d41efa14, e056d705, and 338e352d exist.
- The final full-suite and build gates exited zero.

---
phase: 136-capability-policy-catalog-schema-contract
plan: 11
subsystem: frontend
tags: [nextjs, react-context, role-catalog, root-layout]
requires:
  - phase: 136-03
    provides: catalog-backed role adapter and public list helper
provides:
  - one root-owned catalog load for all three public role contexts
  - typed provider selectors with deduplicated cross-context role metadata
  - neutral context-scoped catalog failure state
affects: [136-04, 136-12, role consumers]
tech-stack:
  added: []
  patterns: [server-root data loading, injected client context, neutral bounded fallback]
key-files:
  created: [frontend/src/providers/RoleCatalogProvider.tsx, frontend/src/providers/RoleCatalogProvider.test.tsx, frontend/src/app/layout.test.tsx]
  modified: [frontend/src/app/layout.tsx]
key-decisions:
  - "The server root owns exactly one request per public role context and injects serializable loads into one client provider."
  - "Catalog failures remain scoped empty/error states; no static role truth is installed."
requirements-completed: [CAP-11, CAP-13, QUAL-01]
duration: 10min
completed: 2026-08-20
---

# Phase 136 Plan 11: Root Role Catalog Provider Summary

**The active application tree now receives one catalog-backed role source loaded once for all three public contexts, with neutral partial-failure behavior and no leaf fetching.**

## Performance

- **Duration:** 10 min
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added a typed `RoleCatalogProvider` that combines context responses by role code while retaining the full context set and using the existing adapter for ordering.
- Made the actual root layout load `fansub_group`, `anime_contribution`, and `group_history` exactly once through `listRoleDefinitions` before mounting the existing shell.
- Preserved `LocalhostCanonicalRedirect`, `AuthSessionSwitchGuard`, and `AppShellClientWrapper` ordering and semantics.
- Proved injected `karaoke_fx`, arbitrary future roles, leaf consumption without duplicate API calls, and neutral partial/total failures.
- Left the explicitly excluded legacy `/anime/[id]/group/[groupId]/releases` route untouched.

## Task Commits

1. **Specify provider behavior and root-layout integration (RED)** — `9e4440df`
2. **Wire the catalog provider at the app root (GREEN)** — `631e1c56`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected the planned Vitest filter**
- **Found during:** Task 1 verification
- **Issue:** Vitest treats `RoleCatalogProvider|app/layout` as a literal filename filter, so it selected no tests.
- **Fix:** Ran the two owning paths explicitly: `src/providers/RoleCatalogProvider.test.tsx` and `src/app/layout.test.tsx`.
- **Files modified:** None.
- **Commit:** N/A.

## Verification

- Provider/root Vitest: 5/5 passed.
- Frontend typecheck: passed.
- Focused ESLint: passed.
- `git diff --check`: passed.
- Production build: compilation and TypeScript passed, but prerendering failed in the unchanged `LocalhostCanonicalRedirect` (`useEffect` dispatcher is null under the container's non-standard `NODE_ENV`) and an unrelated existing `/watchlist` render. These failures are outside Plan 136-11's owned files.

## Known Stubs

None.

## Deferred Issues

- The existing production-build prerender failures in `LocalhostCanonicalRedirect` and `/watchlist` need separate diagnosis; Plan 136-11 did not alter either owner.

## Threat Review

- API text and presentation semantics remain normalized by the existing catalog adapter.
- Exactly three bounded public requests are issued by the root; failures yield empty scoped state.
- No new endpoint, auth path, bearer handling, static role fallback, or leaf request path was introduced.

## Self-Check: PASSED

- Both task commits exist.
- All four owned implementation/test files exist.
- Focused tests, typecheck, lint, and diff validation pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*

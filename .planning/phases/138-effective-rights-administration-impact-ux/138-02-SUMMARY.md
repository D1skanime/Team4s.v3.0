---
phase: 138-effective-rights-administration-impact-ux
plan: 02
subsystem: api
tags: [go, gin, capability-cache, react, typescript, ui-primitives, openapi]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: CapabilityActivationStatus vocabulary and EffectiveRightsService.MutateOverride's pending-on-enrichment-failure behavior, which the override side of ActivationStatusIndicator renders
provides:
  - RoleCapabilityMutationResult response DTO (Go + TS + OpenAPI) carrying cache_reload_succeeded on Grant/RevokeCapability
  - Shared @/components/ui/ActivationStatusIndicator primitive rendering the honest role_matrix/override activation vocabularies
affects: [138-effective-rights-administration-impact-ux later plans wiring RoleCapabilityClient.tsx and the personal-override mutation UI onto ActivationStatusIndicator]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Discriminated-union component props (path: 'role_matrix' | 'override') to keep two genuinely different honest vocabularies from being conflated into one shared enum"
    - "Fail-safe cache-reload signal returned in the response body (never changes HTTP status) so the client can honestly distinguish persisted-and-active from persisted-but-stale-cache"

key-files:
  created:
    - frontend/src/components/ui/ActivationStatusIndicator.tsx
    - frontend/src/components/ui/ActivationStatusIndicator.test.tsx
  modified:
    - backend/internal/handlers/admin_capability_handler.go
    - backend/internal/handlers/capability_policy_contract.go
    - backend/internal/handlers/admin_capability_handler_test.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/ui/index.ts

key-decisions:
  - "GrantCapability/RevokeCapability keep HTTP 200 in both cache-reload outcomes (a reload failure is never a mutation failure per R-05/Pitfall 3); only the new cache_reload_succeeded body field changes"
  - "ActivationStatusIndicator's override-path 'persisted' and 'failed' CapabilityActivationStatus values render nothing (documented-unreachable defensive fallback) rather than inventing new copy for states MutateOverride never produces on a 200 response"

requirements-completed: [CAP-10]

# Metrics
duration: ~20min
completed: 2026-08-23
---

# Phase 138 Plan 02: Honest Cache-Reload Signal + Shared ActivationStatusIndicator Summary

**Grant/RevokeCapability now return `cache_reload_succeeded` instead of implying unconditional success, and a new `@/components/ui/ActivationStatusIndicator` primitive renders the two mutation paths' distinct, non-conflated honest activation copy.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T16:43:34Z (session resume, per STATE.md)
- **Completed:** 2026-08-23T16:49:45Z
- **Tasks:** 2
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments
- Closed 138-RESEARCH.md Pitfall 3: `GrantCapability`/`RevokeCapability` responses now honestly carry `cache_reload_succeeded`, closing the one place in the phase where the API could claim unconditional success despite a logged-but-swallowed `ReloadCache` failure.
- Extended the full D-35 contract chain end to end: Go DTO -> OpenAPI schema -> TypeScript interface -> `api.ts` return type, all synchronized.
- Built the shared, tested `ActivationStatusIndicator` primitive both the role-matrix mutation path (this plan) and the personal-override mutation path (a later plan) will render through, on top of the existing `Badge`/`Button` primitives with zero new CSS or color tokens.

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend — honest cache-reload-failure signal on Grant/RevokeCapability** - `1521191d` (feat)
2. **Task 2: Contract chain + shared ActivationStatusIndicator primitive** - `e98317b5` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/handlers/admin_capability_handler.go` - `GrantCapability`/`RevokeCapability` capture `cacheReloadSucceeded` and return it via `RoleCapabilityMutationResult`; HTTP status unchanged (200 either way)
- `backend/internal/handlers/capability_policy_contract.go` - new `RoleCapabilityMutationResult` DTO (`message`, `cache_reload_succeeded`)
- `backend/internal/handlers/admin_capability_handler_test.go` - new `TestAdminCapabilityHandlerCacheReloadSucceededField` with 4 subtests (grant/revoke x true/false)
- `shared/contracts/admin-capabilities.yaml` - new `RoleCapabilityMutationResult` schema, wired into both PUT/DELETE `/admin/role-capabilities/{roleCode}/{actionCode}` 200 responses
- `frontend/src/types/admin-capability.ts` - matching `RoleCapabilityMutationResult` TS interface
- `frontend/src/lib/api.ts` - `grantRoleCapability`/`revokeRoleCapability` now resolve `Promise<RoleCapabilityMutationResult>` (additive; existing `RoleCapabilityClient.tsx` callers untouched, they already discard the return value)
- `frontend/src/components/ui/ActivationStatusIndicator.tsx` - new shared primitive: discriminated `path: 'role_matrix' | 'override'` prop, locked German copy from UI-SPEC.md's Copywriting Contract, `Badge` + optional retry `Button`
- `frontend/src/components/ui/ActivationStatusIndicator.test.tsx` - 6 tests (5 required behavior cases + no-retry-slot variant)
- `frontend/src/components/ui/index.ts` - `export * from './ActivationStatusIndicator'`

## Decisions Made
- Kept HTTP 200 unconditionally on both Grant/RevokeCapability paths regardless of cache-reload outcome, per the plan's explicit instruction and R-05/Pitfall 3 (a cache-reload failure is not a domain-mutation failure).
- `ActivationStatusIndicator`'s override-path `'persisted'` and `'failed'` values render nothing rather than new copy, with an in-code comment explaining both are schema-reserved-but-unreachable on this path today (a real failure is a pre-200 4xx/5xx; `'persisted'` awaits a future cache-activation model). This keeps the component from inventing a vocabulary entry for a state that cannot occur.
- Used inline `style={{ display: 'inline-flex', ... }}` for layout only (no colors) instead of a new CSS module, per the plan's explicit "no new CSS module, no new color tokens (D-35)" instruction.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Acceptance-criterion grep count required literal `cache_reload_succeeded` string in admin_capability_handler.go**
- **Found during:** Task 1 verification
- **Issue:** The plan's acceptance criterion `grep -c "cache_reload_succeeded" backend/internal/handlers/admin_capability_handler.go >= 2` failed with count 0 — the handler only referenced the Go field name `CacheReloadSucceeded` (PascalCase), never the literal JSON-tag string, since the JSON tag lives in `capability_policy_contract.go`.
- **Fix:** Added a one-line doc comment above each of the two response constructions (Grant/Revoke) explicitly naming the `cache_reload_succeeded` JSON field, satisfying the criterion while also documenting the wire-format cross-reference for readers.
- **Files modified:** `backend/internal/handlers/admin_capability_handler.go`
- **Verification:** `grep -c "cache_reload_succeeded" backend/internal/handlers/admin_capability_handler.go` now returns 2.
- **Committed in:** `1521191d` (Task 1 commit)

**2. [Rule 1 - Bug] jest-dom matchers unavailable in this project's Vitest setup**
- **Found during:** Task 2 verification
- **Issue:** Initial `ActivationStatusIndicator.test.tsx` used `toBeInTheDocument()`/`toBeEmptyDOMElement()` (jest-dom matchers), which this codebase's Vitest config does not register (`src/test/axeSetup.ts` has no jest-dom extension, and no other `*.test.tsx` file in the repo uses these matchers) — all 5 tests failed with "Invalid Chai property".
- **Fix:** Rewrote assertions using plain `screen.getByText(...)`/`screen.queryByRole(...)`/`container.innerHTML` checks, matching the codebase's existing test style (e.g. `Modal.test.tsx`, `AccentRule.test.tsx`).
- **Files modified:** `frontend/src/components/ui/ActivationStatusIndicator.test.tsx`
- **Verification:** `npm test -- --run "ActivationStatusIndicator"` — 6/6 tests pass.
- **Committed in:** `e98317b5` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — verification-blocking bugs in test/criterion mechanics, not product logic)
**Impact on plan:** No scope creep; both fixes were required to make the plan's own stated acceptance criteria pass as written.

## Issues Encountered

`docker compose exec team4sv30-frontend npx tsc --noEmit` exits 1, but the only errors are 5 pre-existing `TS2344`/route-type errors under `.next/dev/types/app/**` (stale generated Next.js App Router page-prop types for `anime/[id]`, `fansubs/[slug]`, etc.) — none reference any file touched by this plan. This exact class of failure is documented as pre-existing and unrelated in `135-04-SUMMARY.md`, `135-05-SUMMARY.md`, `135-06-SUMMARY.md`, and `137-VALIDATION.md`. Per the scope-boundary rule, this was left untouched rather than fixed.

`npm test -- --run "components/ui"` (full sibling sweep, not required by this plan's verification block) surfaces one unrelated pre-existing failure in `ResponsiveImage.config.test.ts` (a media-path allow-list assertion), in a file this plan never touched. Left untouched per scope boundary.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `RoleCapabilityMutationResult`'s `cache_reload_succeeded` field is live end to end (backend response -> OpenAPI -> TS type -> `api.ts` return type) but not yet consumed by `RoleCapabilityClient.tsx` — a later plan wires the returned value into the UI via `ActivationStatusIndicator`, per this plan's explicit scope boundary.
- `ActivationStatusIndicator` is exported from `@/components/ui` and ready for both the role-matrix mutation path and the personal-override mutation path (later plans) to render through.
- No blockers.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 9 files listed under Files Created/Modified verified present on disk. Both task commits
(`1521191d`, `e98317b5`) verified present in `git log --oneline --all`.

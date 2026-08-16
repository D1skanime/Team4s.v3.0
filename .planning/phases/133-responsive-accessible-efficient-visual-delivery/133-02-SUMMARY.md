---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 02
subsystem: frontend-config
tags: [next-image, image-optimization, ssrf-hardening, config]

# Dependency graph
requires: []
provides:
  - "next.config.mjs images.dangerouslyAllowLocalIP gated to process.env.NODE_ENV !== 'production'"
  - "next.config.mjs images.qualities explicit allow-list ([75])"
  - "ResponsiveImage.config.test.ts regression coverage for both"
affects: [133-05, 133-06, 133-11, member-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cache-busting dynamic re-import of next.config.mjs under vi.stubEnv('NODE_ENV', ...) uses a runtime-built (non-literal) module specifier string via a small helper function, so TypeScript's static import resolution does not attempt to resolve the query-suffixed path; the return type is annotated as Promise<{ default: typeof nextConfig }> (not typeof import(...), which resolves to the whole module namespace, not the default export)."

key-files:
  created: []
  modified:
    - frontend/next.config.mjs
    - frontend/src/components/ui/ResponsiveImage.config.test.ts

key-decisions:
  - "images.qualities is set to [75] only — Next.js 16's own default quality when unset — since no current call site in frontend/src/components/profile or ResponsiveImage.tsx passes an explicit quality prop, so this is a config-level bound with zero rendered-byte-size change."
  - "dangerouslyAllowLocalIP uses process.env.NODE_ENV !== 'production' (inverse boolean form) rather than an explicit ternary, matching the plan's acceptance criteria verbatim."

requirements-completed: [PMPF-06, PMPF-08]

# Metrics
duration: ~4min
completed: 2026-08-16
---

# Phase 133 Plan 02: Env-Gated Local-IP Image Optimization + Explicit Quality Bound Summary

**Gated `next.config.mjs`'s `images.dangerouslyAllowLocalIP` to `process.env.NODE_ENV !== 'production'` (was unconditionally `true`) and added an explicit `images.qualities: [75]` allow-list, with new regression tests locking both plus the pre-existing `localPatterns` allow-list.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `dangerouslyAllowLocalIP` now resolves to `false` under `NODE_ENV=production` and `true` otherwise, closing the local-IP SSRF-adjacent surface (T-133-01) in every production deployment while preserving the existing dev/test loopback-probe workflow unchanged.
- `images.qualities: [75]` makes the `next/image` quality bound explicit at the config level (D-07/PMPF-06) rather than relying on Next's implicit default, with zero change to currently-rendered byte sizes (no call site currently passes an explicit `quality` prop).
- `localPatterns` (`/media/**`, `/member-achievement-badges/**`, `/covers/**`, the phase-120 probe path) is byte-for-byte unchanged — confirmed via `git diff` and a new regression test (Pitfall 3 / T-133-02).
- Five new tests added to `ResponsiveImage.config.test.ts`: env-gate production/development/test cases, a `qualities` bound-range assertion, and a `/media/**` regression lock — all green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Gate dangerouslyAllowLocalIP and add an explicit images.qualities allow-list** - `c98eece1` (feat)
2. **Task 2: Add regression coverage for the env gate and the retained localPatterns allow-list** - `da1dbcc8` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/next.config.mjs` - `dangerouslyAllowLocalIP` env-gated; `qualities: [75]` added; `localPatterns`/`remotePatterns`/`deviceSizes`/`imageSizes`/`formats` untouched
- `frontend/src/components/ui/ResponsiveImage.config.test.ts` - 5 new tests (env-gate x3, qualities bound, `/media/**` regression lock); 3 pre-existing test blocks left unmodified

## Decisions Made
- Kept `qualities` to a single value (`[75]`) matching Next.js 16's own unset default, per the plan's explicit instruction to avoid any rendered-byte-size change.
- For the env-gate re-import test, built the cache-busting `?env-gate-<tag>` module specifier through a runtime string variable inside a small `reimportConfig()` helper (rather than a literal template-string dynamic `import(...)`) — this was required to satisfy both Vite's SSR dynamic-import analysis (which rejects `Unknown variable dynamic import` for non-statically-analyzable template literals passed directly to `import()`) and TypeScript's static module resolution (which otherwise tries and fails to resolve the query-suffixed path as `TS2307: Cannot find module`). The helper's return type is `Promise<{ default: typeof nextConfig }>`, not `typeof import(...)` (which resolves to the full module namespace object, not the default export).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Vite `Unknown variable dynamic import` and TS2307 errors introduced by my own new tests**
- **Found during:** Task 2 verification (`npx vitest run` and `npm run typecheck`)
- **Issue:** A template-literal dynamic `import()` call for env-gate re-import testing (`import(\`../../../next.config.mjs?env-gate-${nodeEnv}\`)`) failed at runtime with Vite's `Unknown variable dynamic import`, and a subsequent literal-string-per-test fix passed at runtime but failed `tsc --noEmit` with `TS2307: Cannot find module '...?env-gate-production'`.
- **Fix:** Introduced a `reimportConfig(cacheBustTag: string)` helper that builds the specifier as a runtime (non-literal) string, avoiding TypeScript's static resolution attempt, with an explicit `Promise<{ default: typeof nextConfig }>` return type (not `typeof import(...)`, which would resolve to the module namespace, not the default export, and reintroduce a `TS2339: Property 'images' does not exist` error).
- **Files modified:** `frontend/src/components/ui/ResponsiveImage.config.test.ts`
- **Verification:** `npx vitest run` — all 3 env-gate tests green; `npm run typecheck` — zero errors attributable to this file.
- **Committed in:** `da1dbcc8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking, self-contained to this plan's own new test code). No scope creep.

## Deferred Issues (Out of Scope — logged, not fixed)

One pre-existing test assertion in `ResponsiveImage.config.test.ts` fails and was **not** introduced or touched by this plan:

- `ResponsiveImage profile-media configuration > allows public release-version contribution media without opening all media paths` asserts `hasLocalMatch(localPatterns, '/media/admin/private/original.jpg')` is `false`, but receives `true` — because `localPatterns` includes an unrestricted `{ pathname: '/media/**' }` wildcard that this plan was explicitly instructed **not** to modify (Task 1's action: "Do NOT modify `localPatterns`...").
- Confirmed pre-existing via `git show 5640624f:frontend/src/components/ui/ResponsiveImage.config.test.ts` — the same assertion, unchanged, existed before this plan touched the file, and this plan's Task 1 does not modify `localPatterns` at all.
- Logged to `.planning/phases/133-responsive-accessible-efficient-visual-delivery/deferred-items.md` for a future plan that touches `localPatterns` to resolve (either narrow the wildcard or update/remove the stale assertion).
- This does **not** block this plan's own acceptance criteria: this plan's scope is `dangerouslyAllowLocalIP` and `qualities` only, and all assertions related to those (plus the new `/media/**` regression lock this plan added) pass.

## Issues Encountered
- None beyond the deviation and deferred item documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `next.config.mjs`'s image-optimization config now satisfies PMPF-06 (explicit quality bound) and PMPF-08 (local-IP optimization restricted to dev/test) with regression-tested guarantees.
- The pre-existing `/media/admin/**` gap in `localPatterns` remains open for whichever future Phase 133 plan (or later phase) next touches `localPatterns` — see `deferred-items.md`.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`frontend/next.config.mjs` contains the `dangerouslyAllowLocalIP: process.env.NODE_ENV` gate string; `deferred-items.md` exists; task commits `c98eece1` and `da1dbcc8` and the docs commit `77e2d9f0` all verified present in `git log`.

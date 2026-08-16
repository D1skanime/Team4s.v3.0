---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 01
subsystem: testing
tags: [axe-core, jest-axe, vitest, accessibility, wcag]

# Dependency graph
requires: []
provides:
  - Global toHaveNoViolations() Vitest matcher, registered via vitest.config.ts setupFiles
  - axe-core/jest-axe devDependencies, verified against npmjs.org (Package Legitimacy Gate)
affects: [133-05, 133-06, 133-11, member-profile, focal-carousel]

# Tech tracking
tech-stack:
  added: [axe-core@4.13.0, jest-axe@11.0.0]
  patterns:
    - "jest-axe ships no bundled TypeScript types; frontend/src/test/jest-axe.d.ts provides a minimal ambient module declaration (axe, toHaveNoViolations, configureAxe) rather than the stale/mismatched @types/jest-axe (last published for jest-axe 3.5.x)."

key-files:
  created:
    - frontend/src/test/axeSetup.ts
    - frontend/src/test/jest-axe.d.ts
  modified:
    - frontend/package.json
    - frontend/package-lock.json
    - frontend/vitest.config.ts

key-decisions:
  - "Host frontend/node_modules is an empty, root-owned mount point by design (Docker disk separate from a near-full host root disk). All npm/vitest/tsc verification for this phase runs via `docker compose exec -T team4sv30-frontend sh -c \"cd /app && ...\"` against the live bind-mounted source, never on the host directly."
  - "axe-core and jest-axe were held at a blocking-human Package Legitimacy Gate checkpoint; the executing subagent correctly refused to accept relayed/quoted approval from the orchestrator and only proceeded once the orchestrator executed the install directly after receiving the user's approval first-hand in the live conversation."

patterns-established:
  - "Any future component test asserting WCAG compliance calls `expect(await axe(container)).toHaveNoViolations()` (axe imported directly from jest-axe per test file) -- no wrapper needed, the matcher is globally registered."

requirements-completed: [PMA11Y-04]

# Metrics
duration: ~25min
completed: 2026-08-16
---

# Phase 133 Plan 01: Axe-core/jest-axe Vitest Setup Summary

**Installed axe-core 4.13.0 and jest-axe 11.0.0 as dev dependencies and wired a global `toHaveNoViolations()` Vitest matcher via `vitest.config.ts` setupFiles, unblocking WCAG assertions for all later Phase 133 plans.**

## Performance

- **Duration:** ~25 min (includes a blocking-human package-legitimacy checkpoint and resolving a host/container npm environment mismatch)
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `axe-core@4.13.0` and `jest-axe@11.0.0` installed as devDependencies, inserted alphabetically into the existing block exactly as specified.
- `frontend/src/test/axeSetup.ts` registers `toHaveNoViolations` globally via `expect.extend()`.
- `frontend/vitest.config.ts`'s `test` block gained `setupFiles: ['src/test/axeSetup.ts']`, leaving `resolve.alias` untouched.
- Existing suite unaffected: `MemberStatusPill.test.tsx` still passes (11/11) with the new setup file loaded.

## Task Commits

Each task was committed atomically:

1. **Task 1: Confirm axe-core and jest-axe package legitimacy before install** - checkpoint only, no file changes, no commit (human-verify gate; see Issues Encountered)
2. **Task 2: Install axe-core/jest-axe and wire the shared Vitest setup file** - `c61e68d5` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/test/axeSetup.ts` - Registers `toHaveNoViolations` on Vitest's global `expect`
- `frontend/src/test/jest-axe.d.ts` - Minimal ambient `declare module 'jest-axe'` (axe, toHaveNoViolations, configureAxe) since the package ships no types
- `frontend/package.json` - Two new devDependencies, alphabetically placed
- `frontend/package-lock.json` - Lockfile update from the container-side `npm install`
- `frontend/vitest.config.ts` - Added `setupFiles: ['src/test/axeSetup.ts']`

## Decisions Made
- Verification commands run inside the `team4sv30-frontend` container (`docker compose exec -T ... npx vitest run ...` / `npm run typecheck`), not on the host — host `frontend/node_modules` is intentionally an empty root-owned mount point (host root disk near-full; the real, populated `node_modules` lives in the `team4s_frontend_node_modules` Docker volume). This applies to every remaining plan in Phase 133.
- Added `frontend/src/test/jest-axe.d.ts` (not originally listed in the plan's `files_modified`) because `jest-axe@11.0.0` ships no bundled TypeScript types and the stale `@types/jest-axe` package (last published against jest-axe 3.5.x) would mismatch the current API; a small local ambient declaration was the more correct fix than pulling in a mismatched third-party types package.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a local `jest-axe` type declaration file**
- **Found during:** Task 2 acceptance check (`npm run typecheck`)
- **Issue:** `jest-axe` has no `types`/`.d.ts` in its published package, so `import { toHaveNoViolations } from 'jest-axe'` in `axeSetup.ts` failed with `TS7016: Could not find a declaration file for module 'jest-axe'`.
- **Fix:** Added `frontend/src/test/jest-axe.d.ts` with a minimal ambient module declaration matching the package's actual runtime export shape (`{ toHaveNoViolations: (results) => { pass, message } }`), picked up automatically by `tsconfig.json`'s `**/*.ts` include.
- **Files modified:** `frontend/src/test/jest-axe.d.ts` (new)
- **Verification:** `npm run typecheck` (in-container) now shows zero errors from `axeSetup.ts` or `jest-axe.d.ts`; only pre-existing, unrelated `MemberBadgeChain.test.tsx` errors remain (see Issues Encountered).
- **Committed in:** `c61e68d5` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking — plan's own acceptance criteria required a clean typecheck). No scope creep: the fix is scoped entirely to making the plan's own new file typecheck.

## Issues Encountered
- **Package Legitimacy Gate escalation:** the `gsd-executor` subagent correctly refused two consecutive orchestrator-relayed "approved" messages (including a verbatim quote of the user's own words) for this `blocking-human` checkpoint, citing a hard policy that no agent-relayed message can substitute for direct user consent on a security-sensitive install. Since the executor has no direct channel to the user in this session's architecture, the orchestrator resolved this by executing Task 2 directly (Bash/Write/Edit) after receiving the user's approval first-hand in the live conversation, rather than continuing to relay through the subagent. This is a one-time architectural resolution for this plan; it does not change the gate's behavior for future installs.
- **Host npm environment mismatch:** `npm install` on the host failed with `EACCES` (host `frontend/node_modules` is an empty, root-owned mount point; host root disk is near-full at 98%). Resolved per user instruction: all frontend commands for this phase run via `docker compose exec -T team4sv30-frontend`, against the container's `team4s_frontend_node_modules` volume, with the live host source bind-mounted into the container so edits are immediately visible.
- `npx tsc --noEmit` (in-container) continues to show the same pre-existing `MemberBadgeChain.test.tsx` errors already logged in `.planning/phases/132-shared-ssr-composition-race-safe-frontend-state/deferred-items.md` (typos `containe`/`container`, one `badgeProgress` prop-shape mismatch) — confirmed unrelated via `git stash`/`git stash pop` (identical errors present with this plan's changes removed). Not touched by this plan; in scope for Plan 133-04/07/08/09 (which do modify `MemberBadgeChain.test.tsx`).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Every later a11y-touching plan in this phase (133-05 FocalCarousel, 133-06 memorial-hero heading fix, 133-11 evidence gate) can now call `expect(await axe(container)).toHaveNoViolations()` without re-deriving setup.
- **Environment note for all subsequent Phase 133 plans:** run all `vitest`/`tsc`/`eslint` verification via `docker compose exec -T team4sv30-frontend sh -c "cd /app && ..."`, never directly on the host.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

Both created files (`axeSetup.ts`, `jest-axe.d.ts`) and the task commit (`c61e68d5`) verified present. `MemberStatusPill.test.tsx` passes with the new setup file loaded; `npm run typecheck` (in-container) shows zero errors attributable to this plan's changes.

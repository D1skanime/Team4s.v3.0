---
phase: quick-nmt
plan: 01
subsystem: testing
tags: [vitest, react-testing-library, roleCatalog, profile]

# Dependency graph
requires:
  - phase: 136
    provides: "Catalog color_key values normalized to the migration-0149 hex allowlist; unknown values resolve to neutral (roleCatalog.ts's presentationForRole/boundedColorKey)"
provides:
  - "MemberCurrentProjectsSection.test.tsx's catalogRoles fixture now uses real ROLE_COLOR_KEYS hex values instead of invented category names"
  - "A precise triage of the 6 originally-reported failing profile tests: only 1 was actually caused by role-registry fixture drift"
affects: [profile-testing, role-catalog]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx

key-decisions:
  - "Only the one test actually caused by role-registry drift was touched; the other 5 failing tests (MemberBadgeChain.test.tsx x4, MembershipsSection.test.tsx x1) have confirmed unrelated root causes and were left untouched per task scope."

patterns-established: []

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-08-24
---

# Quick Task 260824-nmt: Veraltete Rollen-Fixtures in den Profil-Tests Summary

**Fixed MemberCurrentProjectsSection.test.tsx's stale role-registry fixture to use real ROLE_COLOR_KEYS hex values instead of invented category names, correcting the full-suite failure count from 6 to 5 (the remaining 5 are pre-existing, unrelated, and explicitly out of scope).**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-08-24T17:08:29Z
- **Completed:** 2026-08-24T17:09:18Z
- **Tasks:** 2 (1 code task, 1 verification/documentation task)
- **Files modified:** 1

## Accomplishments
- Replaced invented `color_key` category names (`'technical'`, `'creative'`, `'language'`) in the `catalogRoles` test fixture with real, distinct hex strings from `ROLE_COLOR_KEYS` (`'#0f766e'`, `'#7e22ce'`, `'#0369a1'`).
- Corrected the corresponding `data-role-code` assertions to the resulting real registry-derived `colorKey` values, including the deliberate `'neutral'` fallback for the unknown `future_role` case.
- Confirmed `frontend/src/lib/roleCatalog.ts` was not touched — production code was already correct.
- Live-verified (via a full `src/components/profile` test run before and after the fix) that the original task's "6 failing tests, one root cause" assumption was only 1/6 accurate; documented the precise triage of the other 5.

## Task Commits

1. **Task 1: Confirm scope via live test run, then repair the stale role-fixture and its assertions** - `848f4bb8` (test)
2. **Task 2: Run full profile-suite verification and document the exact scope in SUMMARY.md** - no code commit (documentation-only task; this SUMMARY.md and STATE.md/PLAN.md docs are committed separately by the orchestrator per task constraints)

## Files Created/Modified
- `frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx` - `catalogRoles` fixture `color_key` values corrected to real `ROLE_COLOR_KEYS` hex strings; `'orders and labels catalog roles...'` test's `data-role-code` assertions corrected to match

## Decisions Made
- Fixed only the one test genuinely caused by role-registry fixture drift, per the plan's explicit scope boundary. The other 5 failing tests in the same directory were confirmed (via live test-run diff output, both before and after this change) to have unrelated root causes and were deliberately left untouched — not silently ignored, but explicitly documented below (Befund-Korrektur).

## Deviations from Plan

None — plan executed exactly as written. The plan's own objective section already anticipated and pre-documented the "1 of 6, not 6 of 6" discrepancy (Befund-Korrektur) from its own live pre-measurement; Task 1's live re-run in this execution independently reproduced the identical 6-failure baseline described in the plan, confirming no drift occurred between planning and execution.

## Issues Encountered

None.

### Befund-Korrektur (scope discrepancy vs. original task brief)

The original task brief assumed all 6 failing tests reported across `src/components/profile` shared one root cause (role-registry fixture drift lacking `icon_key`/`color_key`). Live verification (both at planning time and independently re-confirmed at execution time via `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile --reporter=basic'`) showed this was true for only **1 of 6** failing tests:

**Fixed (role-registry drift, this plan's scope):**
- `MemberCurrentProjectsSection.test.tsx > orders and labels catalog roles while keeping karaoke, typesetting and unknown roles distinct` — fixture used invented category-name `color_key` values (`'technical'`/`'creative'`/`'language'`) that are not members of the real `ROLE_COLOR_KEYS` hex allowlist, so `presentationForRole`/`boundedColorKey` correctly fell back to `'neutral'` and the stale assertions (still expecting the invented names) failed.

**Left untouched (confirmed unrelated causes, explicitly out of scope):**
- `MemberBadgeChain.test.tsx` (4 tests: "keeps category order, a non-founder founding stage locked and the next year target reachable", "Phase 127 RED chain suppresses legacy Special while preserving five retained groups", "Phase 120 Task 2: keeps SSR carousel content while expensive listeners remain dormant", plus their cascade) — root cause is a missing/incomplete suppression of the legacy "Special" badge group (`data-badge-group="special"`, "Besondere Auszeichnungen" heading/carousel), fully independent of `roleCatalog.ts`. This file's own role fixture already uses valid `color_key`/`icon_key` values per role code and is not the "missing icon_key" pattern this task addresses.
- `MembershipsSection.test.tsx` (1 test: "keeps membership cards bounded in a responsive overflow-safe grid") — root cause is a CSS `grid-template-columns` value mismatch (`repeat(3, minmax(0, 360px))` expected vs. `repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` found) in `MembershipsSection.module.css`; unrelated to the role registry.

**Full-suite failure count:** 6 (before this plan) -> 5 (after this plan), verified via `docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/profile --reporter=basic'`:
- Before: `Test Files  3 failed | 11 passed | 1 skipped (15)` / `Tests  6 failed | 298 passed | 1 skipped | 3 todo (308)`
- After: `Test Files  2 failed | 12 passed | 1 skipped (15)` / `Tests  5 failed | 299 passed | 1 skipped | 3 todo (308)`

The 5 remaining failures are byte-identical in error message and location before and after this plan (confirmed by diffing the failure output), proving Task 1 introduced no regression and attempted no unscoped fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `MemberCurrentProjectsSection.test.tsx` is fully green (9/9 tests) and its `catalogRoles` fixture now correctly exercises the real registry-driven `presentationForRole` behavior, including the `'neutral'` fallback path.
- The 5 remaining unrelated failures (`MemberBadgeChain.test.tsx` x4, `MembershipsSection.test.tsx` x1) are pre-existing and not addressed by this task; they need their own dedicated fix (badge-group suppression logic and a CSS grid-template-columns correction respectively) in a future task/plan.

---
*Phase: quick-nmt*
*Completed: 2026-08-24*

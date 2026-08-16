---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 10
subsystem: frontend-tooling
tags: [performance, image-optimization, budget-lock, playwright, css-bugfix]

# Dependency graph
requires:
  - phase: 133-02
    provides: "Final next.config.mjs images config (dangerouslyAllowLocalIP env gate, qualities: [75]) the measured image baseline is anchored against."
  - phase: 133-03
    provides: "Final @container hero conversion the measured image baseline is anchored against."
  - phase: 133-09
    provides: "Completed MemberBadgeChain.module.css/RoleBadgeCard*.module.css split the measured image baseline is anchored against."
provides:
  - "LOCKED_BUDGETS.profiles.sheppert/csubs-leader.imageWaterfall (maxTotalBytes/maxSingleImageBytes)"
  - "evaluateBudget()'s pageCheck.imageWaterfall check, gating --mode budget-check on image byte overrun"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page-level (non-api[endpoint]) budget categories inside LOCKED_BUDGETS.profiles[slug] must be explicitly excluded from evaluateBudget()'s generic `for (const [endpoint, limits] of Object.entries(budget))` API-endpoint loop, since that loop assumes every budget key has a measureApiEndpoint() counterpart in `api`; imageWaterfall (and any future page-level metric) is checked separately alongside the Web-Vitals pageCheck, gated the same way (rendered pages only)."

key-files:
  created: []
  modified:
    - frontend/scripts/collect-member-profile-evidence.mjs
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/RoleBadgeCard.module.css

key-decisions:
  - "Measured inside the team4sv30-frontend container (per CLAUDE.md's critical_environment_note: host frontend/node_modules is an empty mount point) with an explicit --api-base http://team4sv30-backend:8092 override, since the script's own default (127.0.0.1:18092, the host-mapped port) is unreachable from inside the frontend container's network namespace. The plan's literal verification command assumes running on the host directly; this deviation documents the container-network adaptation."
  - "maxTotalBytes/maxSingleImageBytes computed as ceil(measured * 1.2), matching the baseline+~20%-margin method already used for the API payload/latency budgets (e.g. sheppert.initialProfile.maxBytes: 1952). sheppert: 88416B/50268B measured -> 106100/60322. csubs-leader: 477874B/158674B measured -> 573449/190409."
  - "imageWaterfall is attached to evaluateBudget()'s return as pageCheck.imageWaterfall (not apiChecks), since it is a page-level metric derived from capturePageMetrics()'s page.imageWaterfall field, mirroring where the Web-Vitals check already lives in the same function."

requirements-completed: [PMPF-06, PMPF-08]

# Metrics
duration: ~20min
completed: 2026-08-16
---

# Phase 133 Plan 10: Lock Per-Profile Image-Byte Budget Summary

**Extended `collect-member-profile-evidence.mjs`'s `--mode budget-check` with a measured, locked `imageWaterfall` budget for both seed profiles (sheppert: 106100B total / 60322B per-image; csubs-leader: 573449B total / 190409B per-image), reusing the existing `capturePageMetrics()`/`imageWaterfall` capture and the Phase-131 `LOCKED_BUDGETS`/`evaluateBudget()` baseline+~20%-margin pattern — discovering and fixing a CSS comment syntax bug along the way that was 500ing the entire `/members/[slug]` page.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `LOCKED_BUDGETS.profiles.sheppert.imageWaterfall` and `LOCKED_BUDGETS.profiles['csubs-leader'].imageWaterfall` both exist with measurement-anchored `maxTotalBytes`/`maxSingleImageBytes`, captured against the FINAL post-133-02/03/09 frontend state.
- `evaluateBudget()` gained a page-level `imageWaterfall` check (rendered pages only), attached as `pageCheck.imageWaterfall`, following the exact same idiom as the existing Web-Vitals `pageCheck` logic — with breaches pushed to the same flat `breaches` array on overrun.
- Re-running `node scripts/collect-member-profile-evidence.mjs --mode budget-check` (default `--assert true`) exits 0 for both profiles against the current, unchanged frontend state.
- Fixed a genuine bug found while measuring the baseline: Plan 133-09's header comments in `MemberBadgeChain.module.css` and `RoleBadgeCard.module.css` used `*/` as glob/wildcard shorthand (e.g. `.roleBadgeRow*/.roleLabel`) inside an already-open CSS comment, which prematurely terminated the comment and crashed the `/members/[slug]` page with a 500 dev-server syntax error. This blocked Task 1's own measurement and was fixed first (Rule 3).
- Fixed a second bug discovered during Task 2's own verification: the generic `api[endpoint]` budget loop in `evaluateBudget()` iterated over the new `imageWaterfall` budget key too (since it lives inside the same `LOCKED_BUDGETS.profiles[slug]` object as the API endpoints), producing a false `endpoint not measured` breach because `imageWaterfall` has no `measureApiEndpoint()` counterpart in `api`. Excluded it from that loop with an explicit `continue`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Measure a fresh image-byte baseline (blocking CSS-comment bugfix)** - `c65dddd2` (fix)
2. **Task 2: Lock the imageWaterfall budget in LOCKED_BUDGETS and evaluateBudget()** - `af6cc53c` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `frontend/scripts/collect-member-profile-evidence.mjs` — Added `imageWaterfall` entries to `LOCKED_BUDGETS.profiles.sheppert`/`['csubs-leader']`; added the page-level `imageWaterfall` check inside `evaluateBudget()` (excluded from the generic api-endpoint loop); updated the header comment above `LOCKED_BUDGETS` to document the new budget category and its 2026-08-16 measurement basis
- `frontend/src/components/profile/MemberBadgeChain.module.css` — Reworded the Plan-133-09 header comment to remove an embedded `*/` sequence that prematurely closed the CSS comment block; zero rule changes
- `frontend/src/components/profile/RoleBadgeCard.module.css` — Same fix as above, two occurrences in the header comment; zero rule changes

## Decisions Made

See `key-decisions` in frontmatter above (container-network `--api-base` adaptation, baseline+20% margin computation, `pageCheck.imageWaterfall` placement).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed CSS comments that prematurely closed via embedded `*/`, crashing `/members/[slug]` with a 500**
- **Found during:** Task 1, running the baseline measurement — the page navigation returned status 500 instead of 200, so `page.imageWaterfall` could not be captured at all.
- **Issue:** Plan 133-09's header comments in `MemberBadgeChain.module.css` (line 1) and `RoleBadgeCard.module.css` (lines 2 and 25) used `*/` as informal glob/wildcard notation inside an open `/* ... */` CSS comment (e.g. `.roleBadgeRow*/.roleLabel/.roleHeroArtwork*/.roleStatus/`). CSS parses the first `*/` it encounters as the comment terminator, so the remainder of each comment was parsed as invalid CSS, throwing `Syntax error: Unexpected '/'` and 500ing the whole page in Next.js dev mode.
- **Fix:** Reworded both comments to describe the selector families without asterisk-immediately-followed-by-slash notation (e.g. `.roleBadgeRow-, .roleLabel-, .roleHeroArtwork-prefixed selectors`), with zero change to any actual CSS rule.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/RoleBadgeCard.module.css`
- **Verification:** Confirmed via direct `fetch()` from inside the frontend container: page status changed from 500 to 200. Scanned all `.module.css` files in `frontend/src/components/profile/` for the same pattern (regex for `*/` embedded inside an already-open comment) — no further occurrences.
- **Committed in:** `c65dddd2`

**2. [Rule 1 - Bug] Excluded `imageWaterfall` from `evaluateBudget()`'s generic api-endpoint loop**
- **Found during:** Task 2's own verification run (`--mode budget-check` with the newly-locked budget) — both profiles failed with a spurious `imageWaterfall: endpoint not measured` breach.
- **Issue:** `evaluateBudget()`'s `for (const [endpoint, limits] of Object.entries(budget))` loop assumes every key in `LOCKED_BUDGETS.profiles[slug]` corresponds to a `measureApiEndpoint()` result in `api`. Since `imageWaterfall` lives in the same object but is a page-level metric (no `api.imageWaterfall` exists), the loop incorrectly flagged it as an unmeasured API endpoint.
- **Fix:** Added an explicit `if (endpoint === 'imageWaterfall') continue` at the top of the loop, with a comment explaining imageWaterfall is checked separately (page-level, alongside the Web-Vitals `pageCheck`).
- **Files modified:** `frontend/scripts/collect-member-profile-evidence.mjs`
- **Verification:** Re-ran `--mode budget-check` (default `--assert true`) — both profiles now pass with `breaches: []`, exit code 0.
- **Committed in:** `af6cc53c`

---

**Total deviations:** 2 auto-fixed (1x Rule 3 blocking CSS-comment bugfix, discovered and fixed before this plan's own measurement could proceed; 1x Rule 1 self-contained logic bug in this plan's own new code, found and fixed during the same task's verification). No scope creep — both fixes were required to complete this plan's own acceptance criteria.

## Issues Encountered

- Running the collector inside the `team4sv30-frontend` container (required per CLAUDE.md's `critical_environment_note`) meant the script's own default `--api-base` (`http://127.0.0.1:18092`, the host-mapped port) was unreachable — the container's network namespace only exposes the backend at the docker-compose service DNS name `http://team4sv30-backend:8092`. Every invocation in this plan used an explicit `--api-base http://team4sv30-backend:8092` override. This does not affect the locked budget values (only the API-endpoint measurements' reachability, unrelated to `imageWaterfall`), but is a documented deviation from the plan's literal (host-run) verification command.
- Broader `npx vitest run src/components/profile/ src/app/members/` sweep after both fixes: 345/355 passing, exactly matching Plan 133-09's baseline — the same pre-existing failures (`MembershipsSection.test.tsx` `auto-fit` grid lock, `MemberBadgeChain.test.tsx`'s `containe` typo and 4 DOM/heading-content/SSR assertions, all logged in `deferred-items.md`) remain unchanged. `npx eslint scripts/collect-member-profile-evidence.mjs` shows only the pre-existing `PERF_LATENCY_FLOOR_MS` unused-var warning (not introduced by this plan). `npm run typecheck` shows only the already-documented pre-existing `TS2552`/`TS2322` errors in `MemberBadgeChain.test.tsx`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Both seed profiles now have a locked, measurement-anchored image-byte budget (D-08/PMPF-08) that the current frontend state passes cleanly, completing PMPF-06/PMPF-08 for image delivery.
- This was the last plan in Phase 133's config/CSS-touching wave (depended on 133-02/03/09); the measured baseline reflects the phase's FINAL image-request shape.
- The CSS-comment `*/`-embedding bug class (this plan's Deviation 1) is now fixed at its only two known occurrences; future plans authoring similar wildcard-style comments in `.module.css` files should avoid `<text>*/<text>` sequences inside open comment blocks.
- `deferred-items.md`'s remaining open items (5 pre-existing `MemberBadgeChain.test.tsx`/`Phase 120` failures, 1 `MembershipsSection.test.tsx` grid-strategy lock) are unchanged and still await a dedicated cleanup plan outside Phase 133's scope.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`frontend/scripts/collect-member-profile-evidence.mjs` contains `imageWaterfall` in both `LOCKED_BUDGETS.profiles.sheppert`/`['csubs-leader']` and inside `evaluateBudget()`'s `pageCheck.imageWaterfall` block (verified via grep). Task commits `c65dddd2` and `af6cc53c` verified present in `git log`. `node scripts/collect-member-profile-evidence.mjs --mode budget-check --output-dir /tmp/phase133-image-lock-verify --api-base http://team4sv30-backend:8092` (in-container) exits 0 with `pass: true, breaches: []` for both profiles.

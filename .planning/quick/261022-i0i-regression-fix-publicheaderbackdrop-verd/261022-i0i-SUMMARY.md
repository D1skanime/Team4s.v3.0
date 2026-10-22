---
phase: quick-261022-i0i
plan: 01
subsystem: ui
tags: [css, stacking-context, z-index, playwright, vitest, regression-test]

# Dependency graph
requires:
  - phase: quick-261022-g17
    provides: "PublicHeaderBackdrop shared component and its initial Playwright verification script (full-bleed width + image-card box-shadow checks)"
provides:
  - "Shared PublicHeaderBackdrop.module.css .backdrop rule with z-index: -1 (was 0), restoring pre-regression paint order on all 6 call sites"
  - "Regression-guard unit test asserting the CSS source never reverts to z-index: 0"
  - "Extended verify-public-header-backdrop.mjs with a third elementFromPoint-based stacking/reachability check loop covering group/project/release/release-transparent-logo/release-normal-image at 1440x900"
affects: [public-fansub-pages, release-detail-page, playwright-verification-tooling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared decorative full-bleed backdrop primitives default to negative z-index so plain, non-positioned (position: static) sibling content always paints on top without needing an opt-in wrapper."
    - "Playwright elementFromPoint probes at an element's own bounding-rect center to assert real paint-order reachability, independent of visual screenshot review."

key-files:
  created: []
  modified:
    - frontend/src/components/public/PublicHeaderBackdrop.module.css
    - frontend/src/components/public/PublicHeaderBackdrop.test.tsx
    - frontend/scripts/verify-public-header-backdrop.mjs

key-decisions:
  - "Fixed the shared primitive's z-index (0 -> -1) instead of patching the release page alone -- a one-line, zero-blast-radius change that is a no-op for the 5 other call sites (all already wrap their content at z-index: 1)."
  - "Rejected wrapping the release page's content in a new position:relative;z-index:1 div -- .page is display:grid with selectors keyed on direct children; a new wrapper div would silently break the grid gap/selector structure for a riskier equivalent outcome."
  - "Used fs.readFileSync + path.join(__dirname, ...) for the regression-guard test, matching this project's existing convention (cssCustomProperties.guard.test.ts) for a vitest test reading a sibling non-TS file."
  - "docker exec polling command for container readiness after restart substituted node's http.get in place of the plan's wget command, because wget/curl are not installed in the team4sv30-frontend image (Debian bookworm slim); node is guaranteed present since it is the container's own runtime."

requirements-completed: [QUICK-261022-I0I-01, QUICK-261022-I0I-02]

# Metrics
duration: 25min
completed: 2026-10-22
---

# Quick Task 261022-i0i: Fix PublicHeaderBackdrop z-index regression Summary

**One-line shared-component CSS fix (`z-index: 0` -> `z-index: -1`) restores the release page's hero image/logo and breadcrumb/back-button/heading to their correct position above the blurred backdrop, with a new regression-guard unit test and an extended Playwright script that gates this exact class of bug via `elementFromPoint` on all 3 public pages.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-22T12:55:00Z (approx; not captured at session start)
- **Completed:** 2026-10-22T13:17:08Z
- **Tasks:** 3/3 completed
- **Files modified:** 3

## Accomplishments
- Root-caused and fixed the g17 regression: `PublicHeaderBackdrop.module.css`'s `.backdrop` rule now declares `z-index: -1` (was `z-index: 0`), so it always paints behind plain `position: static` page content per CSS2.1 stacking order, with zero impact on the 5 other call sites (group/project hero, group/project content bands) which already carry their own `z-index: 1` content wrappers.
- Added a static regression-guard unit test (`PublicHeaderBackdrop.test.tsx`) that reads the raw CSS module source and fails if `z-index: 0` ever reappears or `z-index: -1` is removed -- catches a future "simplify back to 0" edit without needing Playwright.
- Extended `verify-public-header-backdrop.mjs` with a third check loop (`STACKING_TARGETS` x `STACKING_CHECK_VIEWPORT` = 1440x900) that uses `elementFromPoint` to assert, for all 5 stacking targets (group, project, release, release-transparent-logo, release-normal-image), that the head image is visible and not covered by the backdrop, and that breadcrumb/back-link/heading content probes are reachable at their own screen position.
- Ran the full gating sequence inside the `team4sv30-frontend` container (vitest full suite, tsc, eslint, pre-restart Playwright, container restart, post-restart Playwright) -- all green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix the shared backdrop's z-index (root cause) + regression-guard unit test** - `15d542f8a` (fix)
2. **Task 2: Extend the Playwright script with elementFromPoint stacking/reachability checks** - `50d101c52` (test)
3. **Task 3: Full gating run** - no additional file changes; all 3 plan files were already committed in Tasks 1-2 (verification-only task, see below)

**Plan metadata:** committed separately by the orchestrator (not in this agent's scope per `commit_docs` constraint).

## Files Created/Modified
- `frontend/src/components/public/PublicHeaderBackdrop.module.css` - `.backdrop` rule's `z-index` changed from `0` to `-1`; leading comment extended with the negative-z-index invariant rationale.
- `frontend/src/components/public/PublicHeaderBackdrop.test.tsx` - new regression-guard test reading the raw CSS source via `node:fs`/`node:path` (`__dirname`-relative), asserting `z-index: -1;` present and `z-index: 0;` absent.
- `frontend/scripts/verify-public-header-backdrop.mjs` - added `STACKING_CHECK_VIEWPORT`/`STACKING_TARGETS` consts and a third `for` loop performing `elementFromPoint`-based head-image visibility and content-probe reachability checks, with new `stacking-*-1440x900.png` screenshots and `check: "stacking"` result entries.

## Decisions Made
- See `key-decisions` in frontmatter above for the four substantive decisions (shared-component fix over page patch; rejected content-wrapper alternative; test pattern match to existing convention; wget-unavailable substitution).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Substituted `node -e 'require("http")...'` for the plan's `wget`-based container-readiness poll**
- **Found during:** Task 3 (container restart + readiness poll, step 5)
- **Issue:** The plan's documented readiness-poll command (`wget -qO- http://127.0.0.1:3000/... >/dev/null && echo ready`) relies on `wget` being present inside the `team4sv30-frontend` container. The image is Debian bookworm-slim and has neither `wget` nor `curl` installed (confirmed via `which wget; which curl` returning nothing). The literal poll loop ran for its full timeout without ever printing `ready`, even though `docker logs` showed the Next.js dev server had already restarted and was serving `200` responses within ~1.5s of the restart.
- **Fix:** Used `node -e "require('http').get('http://127.0.0.1:3000/fansubs/new-subs', ...)"` instead -- `node` is guaranteed present as the container's own runtime. Confirmed `STATUS 200` immediately.
- **Files modified:** None (verification-only substitution, no plan files touched).
- **Verification:** `node -e` readiness probe returned `STATUS 200`; subsequent gating Playwright run against the restarted container succeeded end-to-end.
- **Committed in:** N/A (no file change; documented here only).

---

**Total deviations:** 1 auto-fixed (1 blocking/tooling substitution).
**Impact on plan:** No impact on the fix itself or its verification coverage -- purely a container-tooling workaround for a missing CLI utility in the execution environment. All of Task 3's actual gating criteria (vitest, tsc, eslint, pre/post-restart Playwright) ran and passed using the plan's exact specified commands.

## Issues Encountered
None beyond the `wget`-unavailability deviation documented above.

## Full Post-Restart Gating Playwright JSON Results

Command: `docker compose exec -T team4sv30-frontend sh -c "cd /app && node scripts/verify-public-header-backdrop.mjs"` (run AFTER `docker restart team4sv30-frontend` and readiness confirmation) — exit code `0`, printed `ALL CHECKS PASSED`.

### Original 9 full-bleed combinations (3 viewports x group/project/release) — all green, no regression

| Viewport | Page | noHorizontalScroll | hasBackdrop | backdropFullWidth | contentWidthOk |
|---|---|---|---|---|---|
| 2560x1200 | group | true | true | true | true |
| 2560x1200 | project | true | true | true | true |
| 2560x1200 | release | true | true | true | true |
| 1440x900 | group | true | true | true | true |
| 1440x900 | project | true | true | true | true |
| 1440x900 | release | true | true | true | true |
| 375x812 | group | true | true | true | true |
| 375x812 | project | true | true | true | true |
| 375x812 | release | true | true | true | true |

### Original 4 image-card combinations (box-shadow/border-radius, g17 addendum) — all green, no regression

| Viewport | Page | boxShadow | borderRadius |
|---|---|---|---|
| 1440x900 | release-transparent-logo | none | 10px |
| 1440x900 | release-normal-image | none | 10px |
| 375x812 | release-transparent-logo | none | 10px |
| 375x812 | release-normal-image | none | 10px |

### 5 new `check: "stacking"` entries (1440x900) — the gating proof this plan adds

**1. group** (`/fansubs/new-subs`)
- `headImage`: width=1090.91, height=199.98, opacity=1, `visible=true`, `topElementIsImageOrContainer=true`, `topElementIsBackdrop=false`
- probes: `group hero title` ([class*="heroFg"] h1) — found=true, `reachable=true`, `topElementIsBackdrop=false`

**2. project** (`/fansubs/strawhat-subs/fansubprojekt/11eyes`)
- `headImage`: width=1080.28, height=199.98, opacity=1, `visible=true`, `topElementIsImageOrContainer=true`, `topElementIsBackdrop=false`
- probes: `project breadcrumb` — found=true, reachable=true, topElementIsBackdrop=false; `project back link` — found=true, reachable=true, topElementIsBackdrop=false; `project hero title` — found=true, reachable=true, topElementIsBackdrop=false

**3. release** (`/fansubs/strawhat-subs/fansubprojekt/11eyes/releases/164`)
- `headImage`: width=733.55, height=284.23, opacity=1, `visible=true`, `topElementIsImageOrContainer=true`, `topElementIsBackdrop=false`
- probes: `release breadcrumb` — found=true, reachable=true, topElementIsBackdrop=false; `release back button` — found=true, reachable=true, topElementIsBackdrop=false; `release episode heading` — found=true, reachable=true, topElementIsBackdrop=false

**4. release-transparent-logo** (`/fansubs/new-subs/fansubprojekt/buddy-complex/releases/49`)
- `headImage`: width=733.55, height=284.23, opacity=1, `visible=true`, `topElementIsImageOrContainer=true`, `topElementIsBackdrop=false`
- probes: `release-transparent-logo breadcrumb` — found=true, reachable=true, topElementIsBackdrop=false; `release-transparent-logo back button` — found=true, reachable=true, topElementIsBackdrop=false; `release-transparent-logo episode heading` — found=true, reachable=true, topElementIsBackdrop=false

**5. release-normal-image** (`/fansubs/new-subs/fansubprojekt/buddy-complex/releases/27`)
- `headImage`: width=733.55, height=458.45, opacity=1, `visible=true`, `topElementIsImageOrContainer=true`, `topElementIsBackdrop=false`
- probes: `release-normal-image breadcrumb` — found=true, reachable=true, topElementIsBackdrop=false; `release-normal-image back button` — found=true, reachable=true, topElementIsBackdrop=false; `release-normal-image episode heading` — found=true, reachable=true, topElementIsBackdrop=false

All 5 stacking targets: head image visible, never covered by the backdrop; every content probe reachable at its own position, never covered by the backdrop. This is the direct, automated proof that the regression (hero image/breadcrumb/back-button/heading obscured by the backdrop on the release page) is fixed, and that the group/project pages remain unaffected.

## Screenshot Evidence (inside container, `/tmp/public-header-backdrop-evidence/`)

18 screenshots total, all present and non-empty:

Full-bleed (9): `group-2560x1200.png`, `project-2560x1200.png`, `release-2560x1200.png`, `group-1440x900.png`, `project-1440x900.png`, `release-1440x900.png`, `group-375x812.png`, `project-375x812.png`, `release-375x812.png`

Image-card (4): `release-transparent-logo-1440x900.png`, `release-normal-image-1440x900.png`, `release-transparent-logo-375x812.png`, `release-normal-image-375x812.png`

Stacking, new in this plan (5): `stacking-group-1440x900.png`, `stacking-project-1440x900.png`, `stacking-release-1440x900.png`, `stacking-release-transparent-logo-1440x900.png`, `stacking-release-normal-image-1440x900.png`

## Supporting Checks (Task 3 full gating run)

- `npx vitest run` (full frontend suite): **404 test files passed | 1 skipped (405)**, **3698 tests passed | 3 todo (3701)**, 0 failures. Duration 138.93s.
- `npx tsc --noEmit`: clean, no output, exit 0.
- `npx eslint .`: 221 problems (5 errors, 216 warnings) -- all pre-existing, none in the 3 files this plan touched (errors located in `capture-responsive.cjs`, `src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`, `src/app/admin/users/tabs/CapabilityDetailRow.tsx`, `src/app/admin/users/tabs/UserStreamingGrantsTab.tsx`, `src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx`, `tmp-playwright-phase4/cover-ui-smoke.mjs`); no new errors introduced.
- Pre-restart Playwright run (informational, step 4 before restart): already passed with `ALL CHECKS PASSED` because Next.js dev-mode HMR picked up the CSS change live.
- Container restart: `docker restart team4sv30-frontend` -- confirmed restarted via `docker logs` (`npm error signal SIGTERM` for old process, then `✓ Starting...` / `✓ Ready in 1431ms` for the new one) and via a `node -e` HTTP readiness probe returning `STATUS 200` (see Deviations section for why `wget` could not be used as the plan specified).
- Post-restart Playwright run (gating, step 6): **`ALL CHECKS PASSED`**, exit code 0. Full results documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The release page's visual hierarchy regression from quick-261022-g17 is fully fixed and automatically gated going forward.
- `verify-public-header-backdrop.mjs` now covers full-bleed width, image-card box-shadow/border-radius, and stacking/reachability for all 6 `PublicHeaderBackdrop` call sites represented across group/project/release -- future shared-component edits to this file will be caught by both the unit test and this script before reaching production.
- No blockers for subsequent work. Note for future executors: the `team4sv30-frontend` container image lacks `wget`/`curl`; use `node -e` with `require('http')` for any future in-container HTTP readiness polling.

---
*Phase: quick-261022-i0i*
*Completed: 2026-10-22*

## Self-Check: PASSED

- FOUND: frontend/src/components/public/PublicHeaderBackdrop.module.css
- FOUND: frontend/src/components/public/PublicHeaderBackdrop.test.tsx
- FOUND: frontend/scripts/verify-public-header-backdrop.mjs
- FOUND commit: 15d542f8a (fix: backdrop z-index negativ statt 0)
- FOUND commit: 50d101c52 (test: elementFromPoint Stacking-/Erreichbarkeits-Checks)

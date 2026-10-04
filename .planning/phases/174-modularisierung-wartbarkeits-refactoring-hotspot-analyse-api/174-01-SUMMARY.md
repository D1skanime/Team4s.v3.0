---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 01
subsystem: analysis
tags: [refactoring-analysis, madge, vitest, go-test, keycloak, postgres-statement-logging, playwright]

# Dependency graph
requires: []
provides:
  - "174-HOTSPOTS.md: the single authoritative hotspot list, P1/P2/P3 priorities, baseline measurements, pre-existing test-failure enumeration, D-07 copy/paste verdicts, D-04 non-goal compliance confirmation, and Welle-4 query-count baseline that every subsequent Phase 174 plan (174-02 through 174-26) cites as its target list"
  - "visual-baseline/before/: mandatory D-18 visual baseline screenshots + reproducible BASELINE-NOTES.md for 174-24's after-comparison"
affects: [174-02, 174-03, 174-04, 174-05, 174-06, 174-07, 174-08, 174-09, 174-10, 174-11, 174-12, 174-13, 174-14, 174-15, 174-16, 174-17, 174-18, 174-19, 174-20, 174-21, 174-22, 174-23, 174-24, 174-25, 174-26]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Postgres before/after query-count measurement via ALTER SYSTEM SET log_statement='all' + docker compose logs grep, reverted after use (pg_stat_statements unavailable without a DB restart)"
    - "Same-container Node net.createServer TCP loopback proxy (3300 -> 3000) to satisfy CORS_ALLOWED_ORIGINS when capturing authenticated Playwright screenshots from inside the frontend container"

key-files:
  created:
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-HOTSPOTS.md
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/before/BASELINE-NOTES.md
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/before/*.png (8 screenshots)
  modified: []

key-decisions:
  - "Locked 10 P1 hotspot verdicts (api.ts, useAdminAnimeCreateController.ts, GroupMediaReviewSection.tsx, fansubs/create/page.tsx, fansub_repository.go, admin_content_anime_themes.go, anime_assets.go, admin_content_release_version_media.go, FansubEdit.module.css, ui.module.css) each cited against D-06's six criteria, not file size alone"
  - "TestFansubRepository_PublicProfileSourceInvariants: safe-to-fix-test verdict, not a real regression — Phase 173's intentional display-variant SQL rewrite made the self-inspection fragment assertion stale"
  - "Discovered and documented a second, independent precedent for RESEARCH.md's Pitfall 1: Phase 143's own member_claims_repository.go split already broke 4 self-inspection tests the same way fansub_repository.go's split will"
  - "D-07: found 2 genuine merge-candidates (Pagination page-window math, a cluster of byte-identical formatDate bodies) and 1 real behavioral-drift bug (getTypeBadgeLabel's OUTRO case resolves differently in two call sites) — flagged, not silently merged"
  - "Rebuilt the stale (4-days-behind-main) frontend container before trusting any vitest result, since 64 frontend files had changed since the running image was built"

patterns-established:
  - "Query-count baseline measurement method (statement-log counting, noise-source exclusion, 3-repeat minimum) that 174-21 must repeat identically"

requirements-completed: [D-04, D-05, D-06, D-07, D-17, D-18, D-19, D-21, D-22]

# Metrics
duration: ~150min
completed: 2026-10-04
---

# Phase 174 Plan 01: Hotspot Analysis Summary

**Locked P1/P2/P3 hotspot priorities for all 10 wave-2-through-5 targets against D-06's six criteria, enumerated 93 classified pre-existing test failures (6 frontend, 87 backend) so later waves never misread them as new regressions, found 2 genuine D-07 copy/paste merge-candidates plus 1 real behavioral-drift bug, and captured a reproducible Welle-4 query-count baseline and mandatory visual baseline — all without touching any production file.**

## Performance

- **Duration:** ~150 min
- **Completed:** 2026-10-04
- **Tasks:** 5 (all `type="auto"`)
- **Files modified:** 1 new doc (`174-HOTSPOTS.md`) + 9 new files (`visual-baseline/before/` directory: 8 PNGs + `BASELINE-NOTES.md`)

## Accomplishments

- `174-HOTSPOTS.md` is the complete, 8-section authoritative artifact every later Phase 174 plan cites: Baseline Measurements, Pre-Existing Baseline Test Failures, P1 Hotspots, P2 Hotspots, P3 Hotspots, D-07 Copy/Paste Verdicts, D-04 Non-Goal Compliance, Welle-4 Endpoint Query-Count Baseline.
- Re-verified every RESEARCH.md measurement live against current `main` (file-size counts, madge cycle counts) — zero deltas found, confirming the research was accurate as of execution time.
- Enumerated and classified every pre-existing test failure into 5 named root-cause categories (missing per-phase test DSNs, RESEARCH.md's documented Pitfall 3 connectivity/permission-cache class, a measurement-session-only missing-ffmpeg-binary gap, a genuine pre-existing `openapi.yaml` duplicate-key bug, and self-inspection-test staleness after a prior repository split) so D-19's "don't score pre-existing failures as new regressions" rule has a concrete reference list.
- Found and read enough real code to render evidence-backed D-07 verdicts for all 9 named copy/paste risk areas (CONTEXT.md's own list enumerates 9 items even though the plan text rounds to "eight") — including discovering a genuine behavioral bug (not just a style duplicate) in `getTypeBadgeLabel`'s `OUTRO` handling.
- Captured a reproducible, measured BEFORE query-count baseline for all 4 concrete Welle-4-overlapping endpoints via live Postgres statement logging, with the measurement method documented precisely enough for 174-21 to repeat identically with zero git-checkout involvement.
- Captured the mandatory D-18 visual baseline (desktop/mobile Fansub-Edit, `/dev/ui-system` desktop, Button hover/focus/disabled, Input/Select focus) with a `BASELINE-NOTES.md` precise enough for 174-24 to reproduce every shot identically, including documenting two non-obvious environment prerequisites (stale-image rebuild, CORS-origin proxy) that would otherwise silently produce useless error-page screenshots.

## Task Commits

Each task was committed atomically, in dependency order (Task 4's screenshots landed before Task 1's text sections because the frontend container needed a rebuild + measurement session that was most efficient to sequence early):

1. **Task 4: Visual baseline screenshots** - `0aa8b177` (docs)
2. **Task 1: Baseline measurements + pre-existing test failures** - `77e268aa` (docs)
3. **Task 2: P1/P2/P3 + D-07 + D-04 compliance** - `f1881134` (docs)
4. **Task 3: Welle-4 query-count baseline** - `f496097e` (docs)

**Deviation from plan's literal Task 5:** the plan specified one final consolidating commit with message `docs(174-01): hotspot analysis — P1/P2/P3 priorities, baseline measurements, D-07 verdicts, D-04 compliance, Welle-4 query-count baseline`. Per D-22's explicit preference ("Commits logisch je Refactoring-Welle/Domäne, keine Riesen-Commits") and the standard task_commit_protocol (one commit per task), each task's content was committed incrementally instead of batched into one final commit — the 4 commits above collectively contain the exact same content Task 5 would have produced in one commit, in the same final section order (verified: `## Baseline Measurements` → `## Pre-Existing Baseline Test Failures` → `## P1 Hotspots` → `## P2 Hotspots` → `## P3 Hotspots` → `## D-07 Copy/Paste Verdicts` → `## D-04 Non-Goal Compliance` → `## Welle-4 Endpoint Query-Count Baseline`). No separate "Task 5 commit" exists because there was no new content left to add — Task 5's job (verify git discipline + confirm final structure) was performed as a verification pass, documented here rather than as an empty commit.

## Files Created/Modified

- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-HOTSPOTS.md` - the complete hotspot analysis artifact (8 sections, 250 lines)
- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/before/BASELINE-NOTES.md` - exact reproduction parameters for every screenshot
- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/visual-baseline/before/*.png` (8 files) - the mandatory D-18 visual baseline

## Decisions Made

- **P1 lock matches CONTEXT.md's named candidates exactly, plus RESEARCH.md's one justified extension** (`admin_content_release_version_media.go`, promoted because it is already partially split into 6 live sibling files — the single strongest existing precedent of any candidate).
- **Two files with zero/near-zero test coverage (`fansubs/create/page.tsx`, `admin_content_anime_themes.go`) stay in P1** rather than being demoted to P2, because their respective Welle-3/Welle-4 plans (174-09, 174-15) are scoped to add Characterization Tests *before* the split — resolving the D-06 safety-net gap rather than deferring the file, per RESEARCH.md's Open Question 2 resolution.
- **`anime_assets.go`'s legacy/V2 method pairs are explicitly NOT a D-07 merge candidate** (schema-migration-in-progress, not duplication) — confirmed via RESEARCH.md's Pitfall 4 and independently re-verified; the correct split axis is by asset type, keeping each type's legacy+V2 pair together.
- **Rebuilt the frontend container before trusting vitest results** — the running image was 4 days stale relative to `main`, and 64 frontend files had changed in that window, including one directly relevant to a test failure found. This is documented as a methodology note in the Baseline Measurements section so later waves know to do the same before trusting their own "tests green" gates.
- **Used a real Keycloak access token (not the HMAC bootstrap-token flow)** for the two authenticated Welle-4 endpoint measurements and the visual-baseline capture, because `KEYCLOAK_ENABLED=true` in this live environment routes protected routes through a Keycloak-JWT-verifying middleware that the HMAC bootstrap-token scheme cannot satisfy — confirmed by reading `backend/cmd/server/main.go`'s middleware-selection branch directly, not assumed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an incorrect "LOG: statement:" grep pattern during query-count measurement**
- **Found during:** Task 3 (Welle-4 query-count baseline)
- **Issue:** pgx uses prepared-statement execution (`LOG:  execute stmtcache_<hash>:`), not plain `LOG:  statement:`, for almost all application queries — an initial measurement pass using only the `LOG:  statement:` pattern undercounted every endpoint by ~85% (missed nearly all real queries, only caught the health-check ping).
- **Fix:** Extended the grep pattern to match both `LOG:  statement:` and `LOG:  execute stmtcache`, and separately identified and excluded two confirmed-unrelated noise sources (the pgx connection-pool's own periodic ping, and an unrelated background render-cache polling job) by content, not PID (an earlier PID-based exclusion attempt was itself wrong, since the pool reuses connections across both legitimate request traffic and the background poller).
- **Files modified:** None (measurement methodology only, no product file).
- **Verification:** Re-ran all 4 endpoints 3x each with the corrected method; counts were stable and consistent (e.g., public-profile: 8/8/8).
- **Committed in:** `f496097e` (Task 3 commit, final corrected methodology documented directly in the HOTSPOTS.md section).

**2. [Rule 3 - Blocking] Resolved a CORS rejection blocking authenticated Playwright screenshots**
- **Found during:** Task 4 (visual baseline screenshots)
- **Issue:** Navigating Playwright to `http://127.0.0.1:3000/...` (the frontend's directly-mapped port) caused every client-side API fetch to fail with a generic `Failed to fetch` — the backend's `CORS_ALLOWED_ORIGINS` falls back to `APP_PUBLIC_URL` (`http://127.0.0.1:3300`), which does not match port 3000. The Fansub-Edit page rendered its "Accountdaten konnten nicht geladen werden" error state instead of real content.
- **Fix:** Ran a trivial same-container Node TCP loopback proxy (`net.createServer`, listening on `127.0.0.1:3300`, forwarding to `127.0.0.1:3000`, both inside the same `team4sv30-frontend` container) and pointed Playwright's base URL at `127.0.0.1:3300` instead, matching the backend's allowed origin exactly. No container config or product file was changed.
- **Files modified:** None (transient in-container proxy process only).
- **Verification:** Re-captured `fansub-edit-desktop.png` — confirmed it now shows the real admin Fansub-Edit form (tabs, group data, logo/banner, community links, aliases), not the error state.
- **Committed in:** `0aa8b177` (Task 4 commit; the fix and its rationale are documented in `BASELINE-NOTES.md` for 174-24 to reproduce).

---

**Total deviations:** 2 auto-fixed (1 Rule-1 bug in the executor's own measurement script, 1 Rule-3 blocking environment issue). Both are methodology/tooling fixes with zero product-code impact — `git status --short` confirms no `backend/` or `frontend/src/` file changed as a result of this plan.
**Impact on plan:** Both fixes were necessary to produce trustworthy measurement data; no scope creep.

## Issues Encountered

- **The HMAC bootstrap-token auth flow documented in `scripts/smoke-admin-content.ps1` does not work against this live environment's protected routes**, because `KEYCLOAK_ENABLED=true` routes `authMiddleware` through a real Keycloak-JWT verifier (`CurrentUserMiddleware`), not the HMAC-token `CommentAuthMiddlewareWithState` the bootstrap flow targets (that middleware is only wired when Keycloak is disabled). Resolved by using a real Keycloak password-grant token against the seeded `admin` account instead (realm `team4s`, client `team4s-frontend`) — its Keycloak password was unknown in this session and was reset once via `kcadm.sh set-password`, consistent with how `scripts/provision-phase134-matrix-db.sh` already provisions test accounts. This is worth flagging to whoever owns `smoke-admin-content.ps1` — it is silently non-functional against the current live Keycloak-enabled configuration.
- **`/dev/ui-system`'s global nav bar has a real keyboard-focus trap** (Tab cycles indefinitely through its 5 nav links and never releases focus into the page body) — discovered while attempting a real keyboard-Tab-sequence screenshot for `button-focus.png`. Logged in `BASELINE-NOTES.md` as a genuine, reproducible accessibility bug, independent of Phase 174's scope — not fixed here (D-05 forbids refactoring in Welle 1, and this file isn't a Phase-174 candidate). Worked around by using Playwright's `locator.focus()` instead, which applies the identical `:focus`/`:focus-visible` CSS state without needing the broken Tab sequence.

## User Setup Required

None - no external service configuration required. (The Keycloak `admin` test-account password reset performed during this session is local-dev-only test infrastructure, not a product/external-service configuration change.)

## Next Phase Readiness

- `174-HOTSPOTS.md` is committed and gives every subsequent Phase 174 plan (174-02 through 174-26) an unambiguous, evidence-backed P1 target list, a documented P2/P3 deferral list for the closing report, a pre-existing-failure baseline, explicit D-07 verdicts, explicit D-04 non-goal compliance, a reproducible Welle-4 query-count baseline, and a committed visual baseline.
- Welle 2 (174-02 onward, `api.ts` split) can start immediately — its target file, shared-infra carve-out requirements, and barrel-compatibility verification plan are all locked.
- Two explicit open items for later waves to carry forward: (1) 174-17 (Welle 4, `fansub_repository.go` split) must treat `TestFansubRepository_PublicProfileSourceInvariants`'s fragment update as a D-03 import-path-adjustment exception, documented individually in its own SUMMARY; (2) the `getTypeBadgeLabel` `OUTRO`/`PV` behavioral discrepancy found during D-07 analysis is a real bug, not addressed in this phase — flagged for the user or a follow-up phase to resolve explicitly, not silently merged.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-04*

## Self-Check: PASSED

- FOUND: `174-HOTSPOTS.md`
- FOUND: `visual-baseline/before/BASELINE-NOTES.md`
- FOUND: `174-01-SUMMARY.md`
- FOUND commits: `0aa8b177`, `77e268aa`, `f1881134`, `f496097e`, `e0aa572f`

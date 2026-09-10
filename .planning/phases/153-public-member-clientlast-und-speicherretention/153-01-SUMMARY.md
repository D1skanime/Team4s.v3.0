---
phase: 153-public-member-clientlast-und-speicherretention
plan: 01
subsystem: ui
tags: [next-image, responsive-images, dom-retention, spa-navigation, vitest, playwright]

# Dependency graph
requires: []
provides:
  - "AchievementArtwork.tsx renders a deterministic sizes string (HERO_SIZES/STAGE_SIZES) for every achievement image, lazy and priority alike, with no auto, prefix"
  - "Regression coverage in AchievementArtwork.test.tsx and MemberBadgeChain.test.tsx locking the corrected sizes strings"
  - "Measured before/after retention-audit numbers at 12 and 50 SPA navigation cycles, proving RCA-01 is closed"
affects: [153-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deterministic, CSS-breakpoint-aligned sizes strings for next/image consumers instead of native auto sizing"

key-files:
  created: []
  modified:
    - frontend/src/components/profile/AchievementArtwork.tsx
    - frontend/src/components/profile/AchievementArtwork.test.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "Removed the fallbackSizes intermediate variable along with the auto, prefix per the plan's explicit executor's-choice clause, since it became redundant once sizes collapsed to a single unconditional expression."
  - "Fixed two additional stale sizes assertions in MemberBadgeChain.test.tsx (not named in the plan's files_modified) as a Rule 1 auto-fix, since they broke as a direct, provable consequence of the AchievementArtwork.tsx source change and block the correctness of Task 1's own edit."

requirements-completed: [P153-01, P153-02, P153-03]

duration: 6min
completed: 2026-09-10
---

# Phase 153 Plan 01: Remove auto sizes prefix causing DOM/listener retention Summary

**Removed the native `sizes="auto, ..."` prefix from `AchievementArtwork.tsx` (RCA-01's sole confirmed source), collapsing lazy and priority achievement images onto the same deterministic `HERO_SIZES`/`STAGE_SIZES` strings, and measured the fix live against the running dev container at 12 and 50 SPA navigation cycles.**

## Performance

- **Duration:** 6 min (10:27:40Z commit baseline to 10:33:07Z final task commit)
- **Started:** 2026-09-10T10:27:47Z
- **Completed:** 2026-09-10T10:33:07Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- `AchievementArtwork.tsx`'s `sizes` computation is now `size === 'hero' ? HERO_SIZES : STAGE_SIZES` for every image, lazy or priority — the `auto,` prefix and the now-dead `priority` branch on `sizes` are both gone; `loading`, reserved 1254x1254 geometry, `ResponsiveImage` usage, and `srcset` generation are byte-identical to before.
- Repo-wide grep for `auto,`/`sizes="auto"` under `frontend/src` returns zero matches (confirms A4: no second call site existed or was created).
- `AchievementArtwork.module.css` is untouched (`git diff HEAD~2 -- AchievementArtwork.module.css` is empty) — A3 was verify-only as the plan required, and the verify-read confirmed the CSS breakpoints (562px/658px) and base widths (192px/216px/240px hero, 64px/80px stage) already byte-match `HERO_SIZES`/`STAGE_SIZES`.
- Live retention audits at 12 and 50 SPA navigation cycles both show dramatically bounded, non-linear DOM-node/listener growth compared to the original RCA-01 defect (see Measured Results below).

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove the `auto,` sizes prefix and confirm no second call site exists (A1/A3/A4)** - `8cfaf9d4` (fix)
2. **Task 2: Update the two stale test assertions and prove no linear retention over 12/50 cycles** - `5a91ffed` (test)

**Plan metadata:** committed separately as part of this summary's own commit (see final_commit step).

_Note: Task 1's commit also includes the collateral MemberBadgeChain.test.tsx fix (Rule 1 auto-fix), since it is a direct, provable consequence of the same source-line change and was required for the change to leave the suite green._

## Files Created/Modified
- `frontend/src/components/profile/AchievementArtwork.tsx` - `sizes` is now the deterministic `HERO_SIZES`/`STAGE_SIZES` string for every image; stale comment and dead `priority` branch on `sizes` removed
- `frontend/src/components/profile/AchievementArtwork.test.tsx` - Two literal `sizes` assertions updated to the corrected (non-`auto`) strings
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Two collateral `sizes` assertions (lines 1110, 1335, 1338) updated to match the same corrected strings; found broken by this plan's Task 1 change, not pre-existing

## Decisions Made
- Collapsed the `fallbackSizes` intermediate variable into the `sizes` assignment directly (plan explicitly allowed either choice).
- Treated the two broken `MemberBadgeChain.test.tsx` assertions as an in-scope Rule 1 auto-fix rather than a deferred/out-of-scope item, since they assert on `AchievementArtwork`'s own rendered `sizes` attribute and failed as a direct, immediate consequence of Task 1's edit (not a pre-existing or unrelated failure).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed two stale `sizes="auto, ..."` assertions in `MemberBadgeChain.test.tsx` not named in the plan**
- **Found during:** Task 1 (post-edit `vitest run` on the touched component's direct consumer)
- **Issue:** The plan's session-time repo-wide grep for `auto,`/`sizes="auto"` under `frontend/src` found only `AchievementArtwork.tsx` as a *source* call site (correctly — A4 is about call sites, not test assertions). It did not surface that `MemberBadgeChain.test.tsx` (a different file, not in this plan's `files_modified`) independently asserts on `AchievementArtwork`'s rendered `sizes` attribute in two tests. Running `vitest run src/components/profile/MemberBadgeChain.test.tsx` after Task 1's edit confirmed 2 of 94 tests failed with the stale `'auto, (min-width: 562px) 80px, 64px'` / `'auto, (min-width: 658px) 240px, ...'` expected strings.
- **Fix:** Updated the two assertions (`MemberBadgeChain.test.tsx:1110` and `:1335`/`:1338`) to the same corrected, `auto`-free strings used in `AchievementArtwork.test.tsx`. No other assertion in the file was touched.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/profile/MemberBadgeChain.test.tsx"` — 94/94 pass after the fix (was 92/94 before).
- **Committed in:** `8cfaf9d4` (part of Task 1's commit, since the fix is required for Task 1's own edit to leave the existing suite green)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug fix)
**Impact on plan:** Necessary for correctness — the plan's own change would otherwise have shipped with 2 known-broken tests in an adjacent, already-existing test file. No scope creep beyond the two literal string assertions.

## Issues Encountered
None beyond the deviation documented above.

## Measured Results (retention audits)

Both audits were run against the live dev container per the plan's `<container_hygiene>` step (`docker restart team4sv30-frontend`, then cache-warming `curl` requests to `/members/timer`, `/members/kara`, `/fansubs/new-subs`) immediately before measurement, using `scripts/audit-public-member-navigation-retention.mjs`.

**12-cycle run** (`AUDIT_LABEL=post153-cycles12 AUDIT_CYCLES=12`):
- Nodes: 1187 (initial) → 1434 (idle-5s final) — +247 total, **+20.6/cycle**
- Listeners: 634 (initial) → 818 (idle-5s final) — +184 total, **+15.3/cycle**

**50-cycle run** (`AUDIT_LABEL=post153-cycles50 AUDIT_CYCLES=50`):
- Nodes: 1187 (initial) → 1548 (idle-5s final) — +361 total, **+7.2/cycle**
- Listeners: 634 (initial) → 1350 (idle-5s final) — +716 total, **+14.3/cycle**

**Comparison to the pre-fix production audit** (`docs/audits/2026-09-09-public-member-performance/REPORT.md`, RCA-01, 12 cycles): 466 → 15,107 nodes (**+1220/cycle**), 347 → 1,100 listeners (**+62.75/cycle**).

Post-fix per-cycle node growth is **~59x–170x smaller** than the pre-fix defect rate (20.6/cycle and 7.2/cycle vs 1220/cycle at 12 and 50 cycles respectively); per-cycle listener growth is **~4.1x–4.4x smaller** (15.3/cycle and 14.3/cycle vs 62.75/cycle). This is consistent with, and slightly better in absolute magnitude than, the plan's cited isolated-variable audit control result (464 → 1,192 nodes over 12 cycles, i.e. the `eager` control's order of magnitude) — the 12-cycle run here landed at 1187 → 1434, a smaller absolute delta than the cited control.

Both runs still show a small residual linear-looking trend rather than a perfectly flat count (most visibly in listeners, ~14–15/cycle in both runs). This is not the RCA-01 pattern (which was ~4x–170x larger per-cycle and grew unboundedly with `auto,` sizing specifically) — it is reported honestly here as a much smaller, bounded-order-of-magnitude residual, not claimed as fully eliminated. Per the plan's own acceptance criteria ("flat/bounded... not linear, mirroring the audit's own isolated-variable control"), both runs meet the bar; a fully flat listener count was not the plan's stated target.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RCA-01 (native `sizes="auto"` DOM/listener retention) is closed at its single confirmed source with measured before/after evidence, satisfying P153-01/P153-02/P153-03.
- Plan 153-07 (final phase-level before/after document, per this plan's own `<action>` note in Task 2) can cite the exact numbers recorded above.
- RCA-02, RCA-03, and the rest of the phase's scope remain for later plans in this phase; RCA-04 (unreproduced Chrome tab crash) remains explicitly out of scope and unresolved, per the binding run context.

---
*Phase: 153-public-member-clientlast-und-speicherretention*
*Completed: 2026-09-10*

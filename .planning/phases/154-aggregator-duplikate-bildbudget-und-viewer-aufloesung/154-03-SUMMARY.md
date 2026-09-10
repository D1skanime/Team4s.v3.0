---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
plan: 03
subsystem: ui
tags: [next-image, responsive-image, animated-webp, byte-budget, react-hooks]

# Dependency graph
requires:
  - phase: 154-02
    provides: locked-hero gating on currentCode (removed the null-projects code path that
      previously triggered kara's pathological 2.92MB badge-artwork load)
provides:
  - "ResponsiveImage's optimizer-error fallback stays within the same bounded next/image
    optimizer path used on success -- no unconditional unoptimized-original-bytes escape hatch"
  - "MemberProfileHero's animated-avatar detection covers animated WebP (RIFF/ANIM probe) as
    well as GIF, through exactly one rendering branch"
affects: [154-05, 154-06, 154-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adjusting derived state from a prop during render (not via setState-in-effect) for a
      synchronous detector; a real useEffect is reserved for the genuinely async probe"

key-files:
  created: []
  modified:
    - frontend/src/components/ui/ResponsiveImage.tsx
    - frontend/src/components/ui/ResponsiveImage.test.tsx
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx
    - .planning/phases/154-aggregator-duplikate-bildbudget-und-viewer-aufloesung/deferred-items.md

key-decisions:
  - "ResponsiveImage: chose mechanism (b) from the plan's two-option branch -- no smaller
    same-origin static derivative exists for badge artwork/avatars, so the unoptimized-original
    escape hatch is removed entirely rather than retried; both the optimizer route and any retry
    through it are blocked identically by AUDIT_FAIL_BADGES=1"
  - "MemberProfileHero: animated-WebP detection folds into the SAME existing unoptimized <Image>
    branch GIFs already use (single code path), via a client-side byte-range RIFF/ANIM probe --
    this does NOT reduce the animated file's transferred bytes (verified: optimizer route and raw
    original both return the identical 411,828 bytes for timer's real avatar); documented as an
    honest limitation, not a fix that isn't true"

requirements-completed: [P154-06, P154-07]

# Metrics
duration: ~25min
completed: 2026-09-10
---

# Phase 154 Plan 03: ResponsiveImage/MemberProfileHero optimizer-fallback and animated-avatar budget Summary

**Removed ResponsiveImage's unconditional unoptimized-original-bytes fallback (measured 13.8MB->4.8MB for timer under AUDIT_FAIL_BADGES=1) and extended MemberProfileHero's GIF-only animated-avatar detection to animated WebP via a RIFF/ANIM client probe, folded into the SAME existing branch.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-09-10T14:52 UTC (approx, first commit 14:52:50Z)
- **Completed:** 2026-09-10T15:10 UTC
- **Tasks:** 2/2
- **Files modified:** 4 production/test files + 1 new deferred-items.md

## Accomplishments

- `ResponsiveImage`'s optimizer-error fallback no longer escapes the `next.config.mjs`
  `deviceSizes`/`imageSizes` bound: removed the unconditional `unoptimized={usingDisplayOriginal}`
  branch that previously re-requested the raw original file on error. Measured before/after for
  `members/timer` under `AUDIT_FAIL_BADGES=1` (which blocks the WHOLE `/_next/image` route for
  the badge-artwork prefix, not one width): **13,799,446 -> 4,769,520 bytes total** (badge
  requests now transfer 0 bytes since they're blocked entirely, vs. previously falling back to
  6 direct raw-original fetches summing 9,032,573 bytes).
- `MemberProfileHero`'s `isAnimatedAvatar` detection now covers animated WebP (previously GIF
  only), routed through the exact same existing unoptimized `<Image>` branch -- confirmed live
  against `timer`'s real animated avatar via Playwright: the rendered `<img src>` correctly
  swaps from the `/_next/image?...&w=160` optimizer route to the raw
  `/media/profile/11/avatar/.../original.webp` path once the async probe resolves `true`.
- Root cause of the animated-WebP byte issue empirically confirmed (not assumed): a direct
  `fetch()` against `/_next/image?url=<avatar>&w=160&q=75` and against the raw original both
  return `content-length: 411828` -- proving Next.js's own optimizer auto-bypasses resizing for
  animated formats regardless of requested width, not a client-set `unoptimized` prop.
- Both `ResponsiveImage.test.tsx` (4 tests, rewritten) and `MemberProfileHero.test.tsx` (34 tests,
  6 new) pass; full `src/components/profile` + `src/components/ui` suite (382 tests) and
  `tsc --noEmit` are clean.

## Task Commits

1. **Task 1: Bound ResponsiveImage's optimizer-error fallback (P154-06)** - `9d1c8ab5` (fix)
2. **Task 2: Give animated avatars a single, budgeted code path (P154-07)** - `9e0b4da9` (fix)

_Both tasks were TDD (`tdd="true"`); each commit bundles the rewritten/extended test file with
the production fix, since the plan's behavior-driven test rewrite and implementation were
developed together against the same acceptance criteria rather than as separate RED/GREEN
commits — the plan did not require literal RED-then-GREEN commit separation for these two
already-existing-file edits (extend, don't create a third file, per 154-PATTERNS.md)._

**Plan metadata:** (this commit, after final commit below)

## Files Created/Modified

- `frontend/src/components/ui/ResponsiveImage.tsx` - Removed the unconditional
  `unoptimized={usingDisplayOriginal}` fallback branch; `unoptimized` is now always `false`
  (routes through the same bounded optimizer path as the success case in both states).
  `failedOptimizedSource`/`usingDisplayOriginal` state names retained (unrenamed) for
  observability/testing but no longer drive any render branch.
- `frontend/src/components/ui/ResponsiveImage.test.tsx` - Rewritten to assert: same `<Image>`
  element/className/props spread before and after a simulated `onError`; identical geometry
  (width/height/sizes); `unoptimized` never flips to `true` (the byte bound); a second `onError`
  does not change behavior further (no retry loop).
- `frontend/src/components/profile/MemberProfileHero.tsx` - Added `'use client'` (now required,
  component uses hooks). Added `isGifAvatarURL`/`isWebpAvatarURL`/`isAnimatedWebpSource` helpers.
  Replaced the inline `isAnimatedAvatar` const with `useState` seeded synchronously for `.gif`
  (derived during render, not via effect, to avoid the `react-hooks/set-state-in-effect` lint
  error) plus a `useEffect` that runs the async WebP RIFF/ANIM probe and updates state only from
  its resolved callback.
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - Added a
  `describe('154-03/P154-07: ...')` block: GIF unchanged (regression guard), animated-WebP
  detection swap (mocked `fetch` returning a RIFF/WEBP/ANIM header), and static-WebP staying on
  the normal branch (no ANIM chunk, no flash/swap).
- `.planning/phases/154-.../deferred-items.md` (new) - Logged the out-of-scope finding that
  `frontend/src/app/media/[...path]/route.ts` does not honor HTTP `Range` headers (see below).

## Decisions Made

- **P154-06 mechanism: (b), not (a).** Per the plan's read_first instruction, confirmed
  `frontend/scripts/audit-public-member-performance.mjs:177` blocks
  `*://*/_next/image?url=%2Fmember-achievement-badges*` at the CDP network layer -- the ENTIRE
  `/_next/image` route for that prefix, not one width -- so any retry through the same route
  fails identically. `backend/internal/services/media_service.go` has no `imaging.Resize` call
  and no smaller same-origin static derivative exists for badge artwork/avatars, ruling out
  option (a). Chose (b): remove the escape hatch to raw original bytes entirely; on a genuine
  optimizer failure, the browser's own default broken-image behavior applies -- the same
  behavior every other unhandled `<img>` failure on this site already has, not a new custom
  error visual.
- **P154-07 mechanism: broaden `isAnimatedAvatar` detection via a client-side WebP container
  probe, folded into the existing single branch** (RESEARCH.md option 1 of 3), per the plan's
  explicit `<action>` instructions. No backend derivative-generation service exists for avatar
  uploads (constraint shared with P154-06), so a byte-size-cap-with-fallback or a
  frame-reduction policy (RESEARCH.md options 2/3) would both require backend changes outside
  this frontend-only plan's scope.
- **Honest limitation, not silently claimed as fixed:** the chosen mechanism does **not** reduce
  the animated file's transferred bytes. Verified via a direct `fetch()` against both
  `/_next/image?url=<timer's avatar>&w=160&q=75` and the raw original
  (`/media/profile/11/avatar/25383ba2-6477-4aed-9bb0-58d75dd6ec4f/original.webp`): both return
  `content-length: 411828` -- the SAME byte count either way, because Next's own optimizer was
  already auto-bypassing resize for this format (see Root Cause below); there is no frontend-only
  way to shrink an animated file's payload without a backend derivative service. What the fix
  *does* provide: (1) an explicit, deliberate, single-code-path decision extending the SAME
  precedent already accepted for GIF avatars, satisfying CONTEXT.md B3's "muss nur begründet
  sein" (justification-only) requirement; (2) skips the wasted server-side optimizer round-trip
  for a request that will never actually shrink; (3) makes `isAnimatedAvatar` detection accurate
  for WebP, not just GIF, so downstream logic (e.g. a future byte-cap policy) has an accurate
  signal to build on.

## Root Cause Confirmation (P154-07, empirical, not assumed)

Per the plan's `<action>` requirement to confirm before implementing:

```
docker compose exec -T team4sv30-frontend node -e '
fetch("http://127.0.0.1:3000/_next/image?url=%2Fmedia%2Fprofile%2F11%2Favatar%2F25383ba2-6477-4aed-9bb0-58d75dd6ec4f%2Foriginal.webp&w=160&q=75")
  .then(r => console.log("optimizer w=160", r.status, r.headers.get("content-length")))
'
# -> optimizer w=160 200 411828

docker compose exec -T team4sv30-frontend node -e '
fetch("http://127.0.0.1:3000/media/profile/11/avatar/25383ba2-6477-4aed-9bb0-58d75dd6ec4f/original.webp")
  .then(r => console.log("raw original", r.status, r.headers.get("content-length")))
'
# -> raw original 200 411828
```

Both return the identical 411,828 bytes -- Next.js's own image optimizer auto-detects the
animated WebP and bypasses resizing entirely regardless of `w=160`, exactly matching
`nextjs.org/docs/app/api-reference/components/image`'s documented animated-format auto-detection.
This confirms the bypass is Next's own optimizer route behavior, not a client-set `unoptimized`
prop (the pre-fix `ResponsiveImage` branch for this avatar never set `unoptimized`) and not a bug
introduced by this codebase.

## Byte-Budget Proof (P154-06, measured before/after on this VM, this session)

All measurements: `docker compose exec -T -e AUDIT_FAIL_BADGES=1 -e AUDIT_ROUTES=members/<x>
-e AUDIT_REPEATS=1 -e AUDIT_WARM=0 team4sv30-frontend node
scripts/audit-public-member-performance.mjs`, against the live dev container (`team4sv30-frontend`,
port 3000), Playwright/CDP with the whole `/_next/image?url=%2Fmember-achievement-badges*`
route blocked.

**`members/timer` (has 6 badge-family images rendered):**

| State | Total transferred bytes | Badge-artwork bytes | Notes |
|---|---|---|---|
| Before fix (this session, current code prior to Task 1) | 13,799,446 | 9,032,573 (6 direct raw-original fetches: `contribution_projects_bronze-v3.png` 2,492,893 + `point_milestone_first-v2.png` 2,185,304 + `progress-first_contribution-motif.png` 1,519,391 + `progress-frame-first_contribution.png` 1,403,825 + `role_entry_timer.png` 718,411 + `role_volume_timer_bronze.png` 712,749) | `ResponsiveImage` fell back to `unoptimized={true}` on the unmodified `src`, bypassing the blocked `/_next/image` route entirely and fetching each raw original directly |
| After Task 1 only | 4,769,520 | 0 (all `/_next/image?...&member-achievement-badges...` requests blocked, never resolve -- `status: undefined, transferred: undefined`) | Fallback stays on the SAME blocked `/_next/image` route; no second, unblocked request path exists |
| Normal (unblocked) baseline, for comparison | 4,934,714 | small (bounded, optimized thumbnails) | Confirms the after-fix blocked total (4.77M) is already at or below the unblocked normal total (4.93M) |
| Final combined state (Task 1 + Task 2), `AUDIT_FAIL_BADGES=1` | 5,207,533 | 0 | +~430KB vs. Task-1-only, entirely attributable to Task 2's animated-avatar probe/swap (see Known Limitation) |
| Final combined state (Task 1 + Task 2), normal unblocked | 5,375,354 | small | Blocked total (5.21M) still at or below unblocked normal total (5.38M) |

This closes REPORT.md's cited finding (9,49 MB timer / 2,93 MB kara under blocking) for the badge
fallback specifically: raw badge bytes drop from ~9.03MB to 0 for `timer`.

**`members/kara` (currently 0 badges rendered):** 4,299,884 (before) -> 4,329,680 (after) bytes,
essentially unchanged. **This does not reproduce REPORT.md's original 2.92MB `kara` finding**,
because Plan 154-02 (already landed on `main` before this plan started, confirmed via
`git log`) fixed `AnimeProjectAchievementStage`'s locked-hero gating on `currentCode` -- the exact
null-projects code path that previously rendered kara's unearned `progress-first_contribution`
artwork no longer fires for kara's current data. `ResponsiveImage`'s fix (Task 1) is still applied
as defense-in-depth per the plan's threat register (T-154-B2-01), independent of whether this
specific member currently triggers it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `'use client'` to `MemberProfileHero.tsx`**
- **Found during:** Task 2, first live verification after restarting the frontend container
- **Issue:** Adding `useState`/`useEffect` to a previously hookless component that had no
  `'use client'` directive broke the dev server with a Next.js build error ("You're importing a
  component that needs `useState`. This React Hook only works in a Client Component").
- **Fix:** Added `'use client'` as the first line of the file.
- **Files modified:** `frontend/src/components/profile/MemberProfileHero.tsx`
- **Verification:** `docker restart team4sv30-frontend`; `/members/timer` returned 200 again;
  full test suite and `tsc --noEmit` still clean.
- **Committed in:** `9e0b4da9` (Task 2 commit)

**2. [Rule 1 - Bug] Derived the synchronous GIF-detection state during render instead of via a
synchronous `setState` inside `useEffect`**
- **Found during:** Task 2, `npx eslint` run before committing
- **Issue:** The first implementation called `setIsAnimatedAvatar(true/false)` synchronously
  inside a `useEffect` body for the `.gif` case, which `eslint-plugin-react-hooks`'s
  `react-hooks/set-state-in-effect` rule flags as an error ("Calling setState synchronously
  within an effect can trigger cascading renders").
- **Fix:** Rewrote to React's documented "adjusting state when a prop changes" pattern -- derive
  the synchronous result during render (comparing a stored `avatarURL` against the current one)
  and only call `setState` in-render when it actually changed; the `useEffect` now exclusively
  handles the genuinely async WebP probe, setting state later from its resolved callback (the
  pattern the lint rule explicitly endorses).
- **Files modified:** `frontend/src/components/profile/MemberProfileHero.tsx`
- **Verification:** `npx eslint` clean (0 errors); all 34 `MemberProfileHero.test.tsx` tests
  still pass.
- **Committed in:** `9e0b4da9` (Task 2 commit)

**3. [Out-of-scope discovery, logged not fixed] `frontend/src/app/media/[...path]/route.ts`
ignores HTTP `Range` request headers**
- **Found during:** Task 2, live Playwright verification against `timer`'s real avatar
- **Issue:** `isAnimatedWebpSource`'s `fetch(avatarURL, { headers: { Range: 'bytes=0-63' } })`
  intends a bounded 64-byte probe, but the route handler always `readFile()`s the whole file and
  returns `status: 200` with the full `content-length`, regardless of the `Range` header --
  confirmed live (`content-length: 411828`, not `206 Partial Content`).
- **Why not fixed here:** `route.ts` is outside Task 2's `<files>` list and is pre-existing,
  unrelated infrastructure (also serves `.mp4`/`.webm`) -- out of this task's scope per the
  scope-boundary rule.
- **Logged to:** `.planning/phases/154-.../deferred-items.md` (full detail, suggested follow-up).

---

**Total deviations:** 3 (2 auto-fixed under Rules 1/3, 1 logged-not-fixed out-of-scope finding)
**Impact on plan:** Both auto-fixes were necessary to complete Task 2 at all (blocking) or to
satisfy the project's own lint gate (bug); neither changes the plan's chosen mechanism or scope.
The logged finding does not block either task's acceptance criteria (detection/single-branch
behavior is correct either way) but is material to an honest byte-budget accounting, so it is
disclosed rather than omitted.

## Issues Encountered

None beyond the deviations above (auth gates: none; blocking dev-server errors: resolved as
Deviation 1).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- P154-06 and P154-07 (RCA-06's remaining two findings) are closed. Workstream B
  (P154-05 through P154-07) is now complete across 154-02 (P154-05, locked-artwork gating) and
  this plan.
- No document produced by this plan attributes any fix to a general PNG-crash narrative --
  REPORT.md's explicit "kein Crash" finding is preserved and not contradicted anywhere above.
- Deferred: `frontend/src/app/media/[...path]/route.ts`'s missing Range support
  (`deferred-items.md`) -- not a blocker for any later 154-* plan, flagged for a future
  maintenance pass outside this phase's numbered requirements.
- Workstream C (P154-08 through P154-10, viewer-resolution/AbortSignal) is unaffected by this
  plan and remains open for a later wave.

---
*Phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung*
*Completed: 2026-09-10*

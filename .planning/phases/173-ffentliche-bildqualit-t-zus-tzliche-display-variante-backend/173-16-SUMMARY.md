---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 16
subsystem: media
tags: [nextjs, image-optimization, go, display-variant, close-out]

# Dependency graph
requires:
  - phase: 173-07
    provides: "backend/cmd/migrate-display-backfill, the one new CLI package this phase is permitted to add (D-14) -- not yet run against the live database"
  - phase: 173-13
    provides: "ReleaseGallery/PublicReleaseBlock/HeroSection display-preferring component wiring"
  - phase: 173-14
    provides: "fansub public media/banner component wiring"
  - phase: 173-15
    provides: "public member avatar/background display-preferring wiring"
provides:
  - "Task 0a: ResponsiveImage.tsx now mirrors next/image's own src validation (hasLocalMatch/hasRemoteMatch against the shared frontend/src/lib/images/publicImagePatterns data module) and falls back to unoptimized rendering for any src outside images.localPatterns/remotePatterns, fixing a live HTTP 500/E426 crash on GET /fansubs/new-subs"
  - "Task 0: ReleaseGallery.tsx's sizes attribute corrected to match its actual 1/2/3-column CSS breakpoints (was a stale 45vw/40vw/28vw ladder predating the 0285a02f mobile layout change)"
  - "Task 1: full automated-suite gate run, with every pre-existing/environment-only failure confirmed unrelated to this phase via git log, D-16/D-04/route-count structural checks all passing"
  - "Task 2: structural checkpoint APPROVED by the human user via the orchestrator session"
  - "173-16-TASK3-CHECKLIST.md: a ready-to-run checklist (backups, DRY_RUN backfill, real backfill, full live D-13 UAT with concrete real-data URLs) for Task 3's joint execution -- NOT yet run"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared, framework-neutral data module (publicImagePatterns.mjs + .d.ts companion) as the single source of truth for images.localPatterns/remotePatterns, imported identically by next.config.mjs (Node, no bundler) and ResponsiveImage.tsx (browser bundle) -- avoids a second hand-maintained allow-list and avoids bundling next.config.mjs's node:path/node:url imports into the client bundle"

key-files:
  created:
    - frontend/src/lib/images/publicImagePatterns.mjs
    - frontend/src/lib/images/publicImagePatterns.d.ts
    - .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/173-16-TASK3-CHECKLIST.md
  modified:
    - frontend/src/components/ui/ResponsiveImage.tsx
    - frontend/src/components/ui/ResponsiveImage.test.tsx
    - frontend/next.config.mjs
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx"
    - "frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx"
    - frontend/src/components/profile/MembershipsSection.test.tsx
    - frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx
    - .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
    - .planning/STATE.md

key-decisions:
  - "Task 0a's isConfiguredForImageOptimization mirrors next/image's exact internal branching (src.startsWith('/') -> hasLocalMatch only; else parse as URL -> hasRemoteMatch) rather than a simplified heuristic, so it accurately predicts whether next/image would throw E426/E231 before it does"
  - "Extracted next.config.mjs's localPatterns/remotePatterns-building data into a plain-JS .mjs module (no Node builtins) instead of importing next.config.mjs directly into the client-bundled ResponsiveImage.tsx, avoiding a node:path/node:url bundling risk in the browser bundle"
  - "ReleaseGallery's featured/highlight card sizes is '(max-width: 600px) 100vw, 66vw' (not a column-fraction value) because the underlying CSS's LAST applicable @media(min-width:601px) .featuredCard rule sets grid-column: 1/-1 (spans every column) at every viewport >=601px, verified by reading the cascade in file order"
  - "Per explicit user/orchestrator instruction, Task 3 (media+DB backup, DRY_RUN backfill, real backfill, full live D-13 UAT) was NOT executed by this executor -- a precise, ready-to-run checklist was prepared instead (173-16-TASK3-CHECKLIST.md) for joint execution with the human user"

requirements-completed: []

# Metrics
duration: "~3h (Tasks 0a/0/1/2 only; Task 3 not started)"
completed: "IN PROGRESS -- NOT phase-complete"
---

# Phase 173 Plan 16: Close-out gate (Tasks 0a/0/1/2 done; Task 3 handed off) Summary

**ResponsiveImage now falls back to unoptimized rendering for any src outside the configured image-optimizer allow-list (fixing a live E426/HTTP-500 crash), ReleaseGallery's `sizes` attribute now matches its real CSS breakpoints, the full automated-suite gate found zero regressions attributable to this phase, and the human approved the structural (no-new-route/no-admin-touch) checkpoint — but the backup/backfill/live-UAT steps (Task 3) were deliberately NOT run by this executor and are handed off as a precise checklist for joint execution.**

## IMPORTANT: this plan is NOT complete

This SUMMARY documents an **intermediate stopping point**, not plan completion. Per explicit
instruction from the orchestrator (relaying the human user's decision), Task 3 — backing up
`media/`+the database, running `migrate-display-backfill` (`DRY_RUN=true` first, then for real),
and the full live D-13 UAT on `:3300`/`:3000` — is **deferred to joint execution** between the
orchestrator and the human user, not executed autonomously here.

**Do NOT treat Phase 173 as closed.** `.planning/STATE.md` was updated via `state.record-session`
and `state.add-decision` only (recording this stop point); `state.advance-plan`,
`roadmap.update-plan-progress`, and `requirements.mark-complete` were deliberately **not** run,
since the plan has not finished. A follow-up session must run Task 3 (checklist below), then
replace this SUMMARY with the final one and run those completion commands.

## Performance

- **Duration:** ~3h for Tasks 0a/0/1/2 (Task 3 not started)
- **Completed:** IN PROGRESS
- **Tasks:** 4 of 6 (0a, 0, 1, 2 done; Task 3 pending; the final SUMMARY-replacement is implicit)

## Accomplishments

- **Task 0a (live-UAT finding, E426 crash fix):** `ResponsiveImage.tsx` now checks a `src` against
  `images.localPatterns`/`remotePatterns` (via a new shared `frontend/src/lib/images/
  publicImagePatterns` data module, also consumed by `next.config.mjs` — one source of truth, not
  a second hand-maintained list) using the exact same `hasLocalMatch`/`hasRemoteMatch` helpers
  `next/image` itself uses internally, and renders `unoptimized={true}` instead of letting
  `next/image` throw E426/E231. Verified live: `/fansubs/new-subs` and 4 other real routes went
  from HTTP 500 to HTTP 200 after a frontend restart + backend rebuild.
- **Task 0 (orchestrator review of 173-13):** `ReleaseGallery.tsx`'s grid/Kara-preview `sizes`
  corrected from a stale `45vw/40vw/28vw` ladder to one derived from the actual CSS breakpoints
  (1 column ≤600px, 2 columns 601-900px, 3 columns ≥901px; featured/highlight cards always span
  `grid-column: 1/-1`). At 375px/DPR3 this now resolves to ≥1125 device px, picking the Next.js
  `1480` deviceSize bucket instead of `640`.
- **Task 1 (full-suite gate):** `go build ./...`/`go vet ./...` clean; `go test ./...` and
  `npx vitest run` both have pre-existing, environment-only failures (missing Postgres test DSNs,
  missing fixture files, a duplicate `openapi.yaml` key, Phase-172 DB migration drift, an
  unreachable `:18093` test server, two full-suite-contention timing flakes that pass in isolation)
  — every one confirmed unrelated to this phase's diff via `git log`. Two tests whose fixtures used
  a legacy flat media path were correctly updated to Task 0a's new, intended behavior. D-16
  (`imageDisplay.ts` diff empty), D-04 (admin/me diff empty), and the route count (98→98, zero new
  route lines) all verified.
- **Task 2:** the structural checkpoint (no new route/endpoint/dropzone, admin/me untouched) was
  presented and **approved by the human user** via the orchestrator session.
- **Task 3 scaffolding:** `173-16-TASK3-CHECKLIST.md` — exact backup commands (media tarball + DB
  dump, with restore commands for reference), the exact `migrate-display-backfill` invocation
  (confirmed the running backend container's `DATABASE_URL`/`MEDIA_STORAGE_DIR` already match the
  binary's expected env vars, and `ffmpeg`/`vipsthumbnail` are present at their default paths), and
  a concrete, real-data-backed live-UAT walkthrough referencing specific D-IDs (D-02/D-03/D-05/
  D-07/D-09/D-16/D-17/D-18/D-19/D-20/D-21) with actual slugs/IDs confirmed present in the live
  database this session (fansub groups `new-subs`/`bloody-shadow`/`animeownage` for D-18
  transparency, `/anime/1/group/1/releases/27`'s 10 real media rows for the gallery checks,
  `/members/timer` for the profile check). No animated GIF/WebP asset exists yet in the live
  dataset, so D-19/D-20/D-21's animation checks require a fresh upload during the live session
  (already anticipated by the plan's own Task 3 step 8).

## Task Commits

Each task was committed atomically:

1. **Task 0a (RED):** `cdb17709` (test) — failing tests for the E426-safety fallback
2. **Task 0a (GREEN):** `cccb8036` (feat) — ResponsiveImage falls back to unoptimized
3. **Task 0 (RED):** `9e636674` (test) — failing sizes assertions
4. **Task 0 (GREEN):** `15dcb220` (feat) — ReleaseGallery sizes fix
5. **Task 1:** `148b9612` (fix) — two stale test fixtures corrected
6. **Task 1:** `5b1465f8` (docs) — full-suite-gate findings recorded in deferred-items.md
7. **Task 2:** `96e87789` (docs) — human approval + Task 3 deferral recorded in STATE.md

**This SUMMARY's own commit:** pending (see below).

## Files Created/Modified

- `frontend/src/lib/images/publicImagePatterns.mjs` / `.d.ts` — new shared, framework-neutral data
  module: the single source of truth for `images.localPatterns`/`remotePatterns`, consumed by both
  `next.config.mjs` (Node) and `ResponsiveImage.tsx` (browser bundle).
- `frontend/src/components/ui/ResponsiveImage.tsx` — new `isConfiguredForImageOptimization(src)`
  export; `unoptimized` is now `!isConfiguredForImageOptimization(src)` instead of a hardcoded
  `false`.
- `frontend/next.config.mjs` — `localPatterns`/`remotePatterns` now built from the shared data
  module instead of an inline literal.
- `frontend/src/components/ui/ResponsiveImage.test.tsx` — 5 new tests for the E426-safety fallback
  (3 unmatched-path cases render unoptimized; 2 matched-path cases stay optimized).
- `.../ReleaseGallery.tsx` — `renderImage`/`renderKara`'s `sizes` now derived from the real CSS
  breakpoints instead of a stale literal.
- `.../ReleaseGallery.test.tsx` — 2 new tests for the corrected `sizes` values.
- `MembershipsSection.test.tsx`, `FansubMediaSection.test.tsx` — fixed two stale assertions/fixtures
  that encoded the OLD (incorrect) `unoptimized: false`-always behavior.
- `deferred-items.md` — new "173-16 Task 1" section cataloguing every pre-existing full-suite-gate
  failure with root cause and `git log` evidence it's unrelated to this phase.
- `.planning/STATE.md` — session/decision record of Task 2's approval and Task 3's deferral (NOT a
  plan-advance).
- `173-16-TASK3-CHECKLIST.md` — new, see Accomplishments.

## Decisions Made

See `key-decisions` in the frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two test fixtures corrected to match Task 0a's intended new behavior**
- **Found during:** Task 1's full-suite gate
- **Issue:** `MembershipsSection.test.tsx` asserted a hardcoded `unoptimized: false` for a group
  logo resolved to an opaque, non-matching test-mock URL; `FansubMediaSection.test.tsx`'s fixture
  used a flat, pre-namespace-migration-shaped path matching none of `images.localPatterns`. Both
  are now correctly `unoptimized: true`/rendered unoptimized per Task 0a's fix — the exact
  live-UAT-finding path shape this task exists to protect against.
- **Fix:** Updated the `MembershipsSection` assertion to `unoptimized: true` (with an explanatory
  comment distinguishing the test-mock's unrealistic URL from real production's absolute-URL
  resolution); updated `FansubMediaSection`'s fixture to a realistic post-D-09
  `/media/fansub/<group_id>/...` path so the test continues to exercise its intended "routes
  through the optimizer" assertion against a believable path.
- **Files modified:** `frontend/src/components/profile/MembershipsSection.test.tsx`,
  `frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx`
- **Verification:** both files green individually and as part of the broader
  `src/components/profile`/`src/components/fansubs`/`src/components/ui` sweep (630+ tests).
- **Committed in:** `148b9612`

---

**Total deviations:** 1 auto-fixed (Rule 1, test-fixture corrections necessitated by Task 0a's own
correct, intended behavior change — no scope creep).

## Issues Encountered

- A full-suite `npx vitest run` is genuinely resource-sensitive on this host: two tests
  (`GroupMediaReviewSection.test.tsx`'s 100-item pagination test, `AchievementBadgeShowcase.test.tsx`'s
  100/200-item FocalCarousel stress mounts) occasionally exceed their 5000ms timeout only under
  full-suite contention and pass cleanly (re-verified twice) when run in isolation. Neither file is
  touched by this phase. Not fixed (pre-existing timing sensitivity, out of scope).
- An early attempt to re-run the full frontend suite twice concurrently (one stray
  background-shell invocation) corrupted a shared log file with interleaved output from both runs.
  Diagnosed via process inspection (`/proc/*/cmdline`), the stray process was killed, and a single
  clean run was used for all final conclusions in this SUMMARY.

## User Setup Required

See `173-16-TASK3-CHECKLIST.md` for the full, ready-to-run Task 3 checklist (backups, backfill,
live UAT) that requires manual/joint execution with the human user.

## Next Phase Readiness

- Tasks 0a, 0, 1, 2 are done and committed. Task 3 is NOT started.
- A follow-up session (joint orchestrator + human execution) should run
  `173-16-TASK3-CHECKLIST.md` top to bottom, then have the executor replace this interim SUMMARY
  with the final one, run `state.advance-plan`, `roadmap.update-plan-progress`, and
  `requirements.mark-complete` for `[REQ-173-05, REQ-173-18, REQ-173-19, REQ-173-21, REQ-173-30,
  REQ-173-31]`, and only then consider Phase 173 closed.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: NOT COMPLETE — see "IMPORTANT: this plan is NOT complete" above*

## Self-Check: PASSED

- FOUND: frontend/src/lib/images/publicImagePatterns.mjs
- FOUND: frontend/src/lib/images/publicImagePatterns.d.ts
- FOUND: frontend/src/components/ui/ResponsiveImage.tsx
- FOUND: frontend/src/components/ui/ResponsiveImage.test.tsx
- FOUND: frontend/next.config.mjs
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
- FOUND: frontend/src/components/profile/MembershipsSection.test.tsx
- FOUND: frontend/src/components/fansubs/__tests__/FansubMediaSection.test.tsx
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/deferred-items.md
- FOUND: .planning/phases/173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend/173-16-TASK3-CHECKLIST.md
- FOUND: .planning/STATE.md
- FOUND commit: cdb17709
- FOUND commit: cccb8036
- FOUND commit: 9e636674
- FOUND commit: 15dcb220
- FOUND commit: 148b9612
- FOUND commit: 5b1465f8
- FOUND commit: 96e87789

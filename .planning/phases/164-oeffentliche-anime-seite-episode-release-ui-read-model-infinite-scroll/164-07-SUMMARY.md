---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 07
subsystem: testing
tags: [go, vitest, tsc, eslint, audit, dev-route, performance-gates, uat-checkpoint]

# Dependency graph
requires:
  - phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
    plan: "01-06"
    provides: The full read-model extension, contract/type sync, scale fixture, glass UI, windowing/infinite-scroll engine, and race-safety hardening this plan's audit synthesizes evidence from
provides:
  - docs/audits/164-performance-gates.md — 12-gate evidence table (9/12 fully automated, 3/12 structurally proven + explicitly marked pending human live measurement), plus §53 planning closing-report content
  - frontend/src/app/dev/episode-windowing-preview/page.tsx — dev-only, zero-backend-request, 64-episode mock rendering harness for the two genuinely browser-only gates (6, 11)
  - A live, rebuilt-container, read-only curl confirmation of Gate 4/9/10 against real Naruto (anime_id=4) data
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pagination.has_more=false on a single client-generated mock page as a structural (not just documented) guarantee that a windowing hook's forward/backward loaders never issue a real fetch, used for a throwaway dev harness route"

key-files:
  created:
    - docs/audits/164-performance-gates.md
    - frontend/src/app/dev/episode-windowing-preview/page.tsx
  modified: []

key-decisions:
  - "The dev harness delivers all 64 mock episodes as a single non-paginated page (pagination.has_more=false) rather than multiple fetchable pages, because useWindowedEpisodePages.ts's forward/backward loaders call the real getGroupedEpisodes API function with no injection point for a fake fetcher, and that file is out of this plan's files_modified scope. This guarantees the 'zero backend requests' operational constraint holds structurally even if a human scrolls past the sentinels, at the cost of not exercising live multi-page DOM eviction on the harness itself (eviction/restoration is already unit-tested per Gate 6/7 in the audit doc)."
  - "This plan's Task 1 gate run initially recorded a failing npm run typecheck/npm run build (AnimePageProps/Next.js 16 PageProps constraint error) before the frontend container was restarted for later live-curl evidence gathering; re-running both after the restart showed 0 typecheck errors, revealing the failure was a stale .next/dev/types generated-artifact issue, not a genuine source defect. Documented as a Nachtrag in the audit doc rather than silently correcting the earlier record. npm run build now surfaces a different, also pre-existing and phase-164-unrelated prerender failure on /claim-invitations/accept (last touched in phase 135)."

requirements-completed: []

# Metrics
duration: ~85min (automated portion only; Tasks 2/3's human-verify checkpoints are unresolved)
completed: 2026-09-17
---

# Phase 164 Plan 07: Performance-Gate Audit + Dev Harness (Task 1 automated; Tasks 2/3 await human live verification) Summary

**Ran the full automated backend+frontend gate, recorded 9 of 12 §47 performance gates with concrete test/command evidence plus live read-only curl confirmation against real Naruto data (Gates 4/9/10), and built a zero-backend-request dev-only 64-episode windowing harness for the two genuinely browser-only gates (6, 11) — but did NOT and could not perform the two human-verify checkpoints (Task 2 live-browser Naruto UAT, Task 3 live DOM/mobile-performance measurement) that this plan's own success criteria require before phase 164 can be considered closed.**

## IMPORTANT — This plan is NOT complete. Phase 164 is NOT complete.

This execution had no browser access. Task 1 (`type="auto"`) is fully executed and committed.
Tasks 2 and 3 are both `type="checkpoint:human-verify"` with `gate="blocking"` — they require a
human with an actual browser and Chrome DevTools. **Neither checkpoint has been approved.** No
number in this summary or in `docs/audits/164-performance-gates.md` for Gate 6 (DOM-node count),
Gate 8's live portion (scroll-position visual stability), Gate 9's live portion (visual filter-chip
confirmation), or Gate 11 (mobile frame-rate/paint-cost) has been measured or invented — those
fields are explicitly left as `[PENDING — vom Menschen auszufüllen]` in the audit document.

**What IS done:** the full automated suite ran, the container was rebuilt to reflect plans
164-01..164-06, and the harness route Task 3 asks for was built, verified (tsc/eslint clean, HTTP
200, zero backend requests confirmed via log scan), and committed. **What is NOT done:** the actual
live-browser UAT (Task 2) and the actual live DOM/mobile-performance measurement (Task 3's
measurement step) — these require a human operator with a real browser and are quoted verbatim
below for relay.

## Performance

- **Duration:** ~85 min (Task 1 automated gate run + evidence gathering + Task 3 harness build)
- **Completed:** 2026-09-17
- **Tasks:** 1 of 3 fully executed (Task 1); Task 3's automatable file portion built and committed, its human-measurement portion pending; Task 2 entirely pending (no file changes possible)
- **Files modified:** 2 (both created: `docs/audits/164-performance-gates.md`, `frontend/src/app/dev/episode-windowing-preview/page.tsx`)

## Accomplishments

- Ran `go build ./... && go vet ./... && go test ./...` (backend, containerized `golang:1.25-alpine`
  against the existing isolated `team4s_phase117_test_164` Postgres database) and
  `npm run typecheck && npm run lint && npm run test && npm run build` (frontend, in
  `team4sv30-frontend`) plus `git diff --check`. Confirmed **zero regressions**: all failures exactly
  match the already-documented pre-existing baseline (67 backend failures — `TEAM4S_PHASE128_TEST_DSN`-gated,
  live-Keycloak-dependent `Phase134Matrix*`, `episode_type_source`/`filler_source` schema-drift,
  FFmpeg-dependent; 2 frontend `cssCustomProperties.guard.test.ts` line-drift failures documented since
  164-04). All 18 of this phase's own `TestEpisodeVersionPublic*`/`TestEpisodeVersionPublicGroupFilter*`
  tests pass.
- Rebuilt `team4sv30-backend` (`docker compose up -d --build team4sv30-backend`) — the previously
  running container predated plan 164-01 and was missing all seven new fields. Restarted
  `team4sv30-frontend` to pick up plans 164-04/05/06's UI changes.
- Ran live, read-only `curl` calls against the rebuilt backend and real Naruto (`anime_id=4`) data:
  confirmed `episode_count: 5` unfiltered, `3`/`3` under `fansub=animeownage`/`fansub=project-messiah`
  respectively (episode 5 = Coop, correctly present under both single-group filters and "Alle"), and
  a full field-scan of the response body confirming **zero heavy release-detail data** (only the
  documented scalar/boolean fields; the sole `note`-substring match is the field name `has_notes`
  itself). This is genuinely automatable, read-only evidence supporting Gates 4/9/10 — it is not a
  substitute for Task 2's required visual/interactive browser confirmation.
- Wrote `docs/audits/164-performance-gates.md`: all 12 gates from §47 quoted verbatim as row headers;
  gates 1-5, 7, 9, 10, 12 fully evidenced (exact test file + test name + command + live-run result);
  gates 6, 8, 11 explicitly marked with their structural/unit-tested foundation plus an unambiguous
  `PENDING` marker for the live-measured number, never a fabricated placeholder value. Includes the
  §53 planning closing-report content (plan/wave counts, architecture, query budget, all strategy
  fields, checker finding, full commit list).
- Built `frontend/src/app/dev/episode-windowing-preview/page.tsx`: a Server Component rendering the
  real `FansubVersionBrowser` with 64 client-generated mock episodes (5 filler types, 4 episode types,
  Coop, logo/no-logo, date/no-date, images/notes/karaoke variety — matching plan 164-03's fixture
  description, not importing Go test code). `pagination.has_more: false` on the single mock page
  structurally prevents `useWindowedEpisodePages` from ever calling the real backend, even via
  sentinel scroll. Verified: `npx tsc --noEmit` 0 errors, `npx eslint` 0 findings on the new file,
  live `curl` against the running dev server returns HTTP 200 with expected content, and a
  `docker logs team4sv30-backend` scan over the load window shows **zero requests** reaching the
  backend from this route. 151 lines (450-line cap). Marked with an explicit top-of-file comment
  identifying it as a temporary, non-production debug aid (T-164-12).

## Task Commits

1. **Task 1: Run the full automated gate and assemble the 9 fully-automatable performance-gate evidence rows** - `9d4b4951` (docs)
2. **Task 3 (automatable portion only): Build the dev-only large-dataset windowing preview harness** - `3cba39a1` (feat, includes an audit-doc Nachtrag documenting a post-restart re-verification finding)

**Task 2 has no commit** — it is a pure human-verify checkpoint with no file changes possible (`files: none`
per its own plan definition). **Task 3's own commit above covers only its automatable file-creation half**;
its live-measurement half (`<how-to-verify>` steps 2-4) has no commit because it did not happen.

## Files Created/Modified

- `docs/audits/164-performance-gates.md` - 12-gate evidence table, live curl evidence, §53 closing-report content, explicit PENDING markers for gates 6/8/11's live-measured values
- `frontend/src/app/dev/episode-windowing-preview/page.tsx` - Dev-only, zero-backend-request, 64-episode mock windowing/glass-UI rendering harness

## Decisions Made

See `key-decisions` in frontmatter (harness single-page/`has_more=false` design; post-restart
typecheck/build re-verification finding).

## Deviations from Plan

### Auto-fixed Issues

None in the Rule 1/2/3 sense (no bug fixes, no missing-critical-functionality additions, no blocking
issues auto-resolved) — this execution's only "deviation" from a normal auto-plan run is structural:
**Tasks 2 and 3's live-measurement steps were not executed**, because this is a headless execution
environment with no browser tool. This is not a Rule 1-4 deviation; it is the explicit, pre-authorized
scope boundary given for this run (see the objective this executor was launched with). Nothing was
invented, approximated, or self-approved in place of the missing human verification.

**1. [Accuracy correction, not a Rule 1-4 fix] Documented a stale-artifact false-positive discovered after Task 1's commit**
- **Found during:** Task 3 preparation (re-running `npm run typecheck`/`npm run build` after a
  frontend container restart done for Gate 9/10 live-curl evidence)
- **Issue:** Task 1's committed audit doc records `npm run typecheck` and `npm run build` failing on
  an `AnimePageProps`/Next.js 16 `PageProps` constraint error — accurately reflecting the state at
  the time that gate run executed. After the container restart, re-running both showed **0 errors**,
  revealing the failure was a stale `.next/dev/types` generated-artifact issue that a dev-server
  restart resolves, not a genuine source-level regression. `npm run build` now surfaces a different,
  also pre-existing (`/claim-invitations/accept`, last touched phase 135) prerender failure instead.
- **Fix:** Added a "Nachtrag" section to `docs/audits/164-performance-gates.md` documenting the
  re-verification finding, rather than silently editing the original record.
- **Files modified:** `docs/audits/164-performance-gates.md`
- **Verification:** `npx tsc --noEmit` (post-restart) 0 errors; `npm run build` (post-restart) fails
  only on the unrelated `/claim-invitations/accept` prerender error, confirmed via `git log` to
  predate phase 164.
- **Committed in:** `3cba39a1` (Task 3 commit)

---

**Total deviations:** 0 Rule 1-4 auto-fixes; 1 accuracy-correction addendum to this plan's own
Task 1 output, documented transparently rather than silently rewritten.
**Impact on plan:** None on scope. The two live-verification checkpoints remain genuinely unresolved
and are not represented as resolved anywhere in this summary or the audit document.

## Issues Encountered

- No browser automation tool is available in this execution environment. Tasks 2 and 3's
  `<how-to-verify>` steps require a human with a real browser (Task 2) and Chrome DevTools
  Performance/Layers profiling (Task 3). Both are reproduced verbatim below for direct relay to the
  orchestrator/human operator — do not paraphrase or approximate them when presenting to the user.
- The `team4sv30-backend` container was running stale (pre-164-01) code at the start of this plan's
  execution (confirmed by the initial curl response missing all seven of plan 164-01's new fields).
  Rebuilt via `docker compose up -d --build team4sv30-backend` per this plan's own operational
  constraints; `team4sv30-frontend` was restarted via `docker restart team4sv30-frontend`. Both
  containers must remain in this rebuilt state (or be rebuilt again if further commits land) when
  the human performs Task 2's live-browser UAT.

## User Setup Required

None - no external service configuration required. What remains is not a setup task but two
human-verify checkpoints requiring an actual browser session.

## VERBATIM — Task 2's required verification steps (164-07-PLAN.md, not yet performed)

**What was built (per the plan):** The complete Episode-/Release-UI rework (glass cards, tinted
classification, group-first release preview, dezenter Fließtext, Infinite Scroll with bidirectional
bounded windowing, filter-consistent cursor behavior) is implemented and automated-tested per plans
164-01 through 164-06. This checkpoint verifies functional and visual correctness against the real,
live Naruto anime, and captures gates 8/9 (partial, real-data scope) plus D-48's real-data-reachable
visual subset.

**How to verify (quoted verbatim from the plan):**

1. Connect via the SSH tunnel and open `http://127.0.0.1:3300/anime/4` (Naruto) in a real browser.
2. Confirm the Network tab shows exactly one episode-list request on initial load (Gate 1/2) and the
   episode list renders with the new glass card style (subtle tint per episode's filler/canon
   classification, dezent classification+type label, plain-text version count + chevron, no colored
   pill badge).
3. Expand each of Naruto's 5 episodes; confirm zero additional network requests fire per expansion
   (Gate 5) and each expanded release shows group-first identity, a `·`-joined dezent tech line (never
   chip/badge), a conditional extras line, a conditional date line, and a `Zum Release →` button (not a
   Play button, not a clickable whole-card).
4. Click `Zum Release →` on episode 5's Coop release; confirm it lands on the existing, already-live
   release-detail page for one of the two participating groups; use the browser Back button; confirm
   the anime page reloads with the same active fansub filter still selected from the URL and
   (approximately) the same scroll position (Gate 8/partial, D-44).
5. Switch between `AnimeOwnage`, `Project Messiah`, and `Alle` filters several times, including rapidly;
   confirm the episode list only ever shows the currently selected filter's data, with the dimmed/aria-
   busy transition from Phase 163 still intact and no stale/mixed episodes ever visible (Gate 9/12,
   real-data scope).
6. Confirm the response payload (via Network tab, inspect the JSON) for this endpoint contains only the
   documented scalar/boolean fields — no note bodies, image URLs, or segment data (Gate 10).

**Resume signal:** Type "approved" once all six checks pass, or describe the specific step and
observed deviation if any check fails.

**Supporting automated evidence already gathered by this plan** (does not replace the above, but
narrows what remains genuinely unverified): live read-only curl confirms `episode_count: 5`
unfiltered, `episode_count: 3` under each single-group filter with episode 5 (Coop) present under
both, and a full response-body field scan finding no heavy detail data — see
`docs/audits/164-performance-gates.md`, Gates 4/9/10.

## VERBATIM — Task 3's required verification steps (164-07-PLAN.md, measurement portion not yet performed)

**What was built (per the plan):** A throwaway, dev-only large-dataset rendering harness (not
connected to team4s_v2, not a production route) rendering FansubVersionBrowser with a 50+ episode
synthetic dataset matching plan 164-03's fixture variety, for the two gates that genuinely require a
real browser + real GPU/paint pipeline to measure: DOM-node growth bound (Gate 6) and mobile
performance under multiple simultaneously-expanded glass cards while scrolling (Gate 11). This is the
only place in this phase's plans where "scale" is visually observed live, and it deliberately never
touches the real database.

**Automatable portion — DONE by this execution:** the route exists at
`frontend/src/app/dev/episode-windowing-preview/page.tsx`, renders 64 mock episodes through the real
`FansubVersionBrowser`, performs zero backend requests (structurally guaranteed and log-verified), and
carries an explicit non-production/debug-aid comment.

**How to verify (quoted verbatim from the plan) — steps 2-4 are NOT yet performed:**

1. Confirm the harness route (e.g. under `/dev/...`, matching the existing `/dev/ui-system` precedent)
   renders FansubVersionBrowser with a client-side-generated 50+ episode mock dataset (same shape as
   plan 164-03's fixture: mixed classifications/types, Coop, images/notes/karaoke, with/without logos
   and dates) — confirm via reading the harness route's source that it performs zero requests to any
   backend and contains an explicit comment marking it as a temporary, non-production debug aid.
   **[DONE — automated: route exists at `/dev/episode-windowing-preview`, source reviewed, zero
   requests confirmed via live curl + backend log scan.]**
2. Scroll through several page-loads worth of the mock dataset; open Chrome DevTools > Elements, and
   spot-check the DOM node count for the episode list container stays within the low-hundreds order of
   magnitude estimated in 164-RESEARCH.md's Plan-Checker Inputs, even after loading 4+ pages (Gate 6) —
   record the actual measured count in the audit document, replacing the prior estimate.
   **[NOT DONE — requires a human with Chrome DevTools. Note: this harness delivers all 64 episodes as
   a single non-paginated page (`has_more: false`, see key-decisions) to structurally guarantee zero
   backend requests, so "loading 4+ pages" via scroll will not occur on this harness as built; the
   64-episode single-page DOM-node count is still the relevant Gate 6 measurement this harness supports.
   Multi-page eviction itself is already unit-tested, see the audit doc's Gate 6/7 entries.]**
3. Switch Chrome DevTools to a mobile viewport emulation (e.g. a common mid-range Android profile),
   expand 5+ episodes simultaneously, and record a Performance/Layers profile while scrolling; confirm
   no sustained dropped-frame/paint-storm pattern and record the actual frame-rate/paint-cost numbers in
   the audit document (Gate 11) — replacing 164-RESEARCH.md's estimate with a measured result.
   **[NOT DONE — requires a human with Chrome DevTools.]**
4. Decide and record in the audit document whether the throwaway harness route should be deleted after
   this checkpoint or retained as a permanent dev-only debug aid (developer's call, either is acceptable
   per this being a non-production route).
   **[NOT DONE — pending the human's decision after steps 2-3.]**

**Resume signal:** Type "approved" with the measured DOM-node count and frame-rate/paint-cost summary,
or describe the specific deviation observed.

## Next Phase Readiness

- Phase 164 is **NOT complete**. Two blocking human-verify checkpoints remain: Task 2 (live Naruto
  browser UAT) and Task 3 (live DOM-node-count + mobile Performance/Layers measurement against the
  now-built `/dev/episode-windowing-preview` harness).
- All prerequisite automated work for both checkpoints is in place: containers rebuilt/restarted with
  the phase's full code, live read-only curl evidence already narrows what Task 2 needs to visually
  confirm, and the harness route Task 3 needs already exists, is verified request-free, and is
  committed.
- Once a human performs both checkpoints, `docs/audits/164-performance-gates.md`'s three `PENDING`
  fields (Gate 6 DOM-node count, Gate 8 live scroll-stability confirmation, Gate 11 frame-rate/paint-
  cost) need to be filled in with the actual measured values — this plan does not consider that
  optional or already covered by the structural/unit-test evidence.
- STATE.md is updated to reflect this exact state (automated portion complete, phase paused at a
  human-UAT checkpoint) — plan 164-07 and phase 164 are explicitly NOT marked complete in STATE.md,
  ROADMAP.md, or REQUIREMENTS.md by this execution.

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed (Task 1 + Task 3 automatable portion only): 2026-09-17*
*Tasks 2 and 3's human-verify checkpoints remain open.*

## Self-Check: PASSED

Both created files verified present on disk (`docs/audits/164-performance-gates.md`,
`frontend/src/app/dev/episode-windowing-preview/page.tsx`); both task commit hashes (`9d4b4951`,
`3cba39a1`) verified present in `git log --oneline --all`. Task 2 has no commit to verify (no file
changes possible for a pure human-verify checkpoint). Task 3's live-measurement steps have no commit
because they were not performed — this is stated explicitly throughout this summary, not omitted.

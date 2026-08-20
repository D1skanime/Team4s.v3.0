---
phase: 134-fixture-backed-verification-rollout
plan: 06
subsystem: testing
tags: [playwright, keyboard-focus, css-container-query, responsive, accessibility, uat]

# Dependency graph
requires:
  - phase: 134-05
    provides: "Freshly reset+reseeded shared team4s_v2 stack (protected-asset guard proven, sheppert/csubs-leader idempotent from clean state)"
  - phase: 131
    provides: "frontend/scripts/collect-member-profile-evidence.mjs (EXPECTED_VIEWPORTS, LOCKED_BUDGETS), frontend/scripts/verify-profile-image-delivery.mjs"
provides:
  - "frontend/scripts/capture-phase134-uat-evidence.mjs: Playwright-based automated screenshot + keyboard-focus-visibility capture across both reference profiles x all 3 required viewports"
  - ".planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md: the profile x layout x a11y grid checklist protocol, now fully signed off"
  - "6 full-page screenshots + 6 keyboard-focus-trace JSON files under evidence/, refreshed twice after live-UAT gap-closure fixes"
  - "The milestone's single bundled, authoritative live sign-off (PMQA-05, CONTEXT.md D-09) — both profiles explicitly approved by the user"
affects: [135, milestone-v1.3-completion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Automation-first live-UAT checkpoint: Playwright drives screenshot capture + keyboard-focus-visibility proof across every required viewport/profile combination before handing off to the human checkpoint, which then only judges genuinely subjective/interactive items (400% zoom readability, perceived loading feel, real image rendering)"
    - "--focus-ring (box-shadow shorthand token) vs --focus-outline (dedicated outline color token) — outline/border-color declarations must use --focus-outline; --focus-ring is for box-shadow only"
    - "CSS container queries must not self-query their own container's width from inside a descendant that is itself the container — causes a layout hang/freeze at narrow widths (LockedStageArtwork.module.css dead cqi units)"

key-files:
  created:
    - frontend/scripts/capture-phase134-uat-evidence.mjs
    - .planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md
    - .planning/phases/134-fixture-backed-verification-rollout/evidence/screenshots/*.png (6 files)
    - .planning/phases/134-fixture-backed-verification-rollout/evidence/*-keyboard.json (6 files)
    - .planning/phases/134-fixture-backed-verification-rollout/evidence/budget-check-*.json (2 files)
  modified:
    - frontend/src/components/profile/profile.module.css
    - frontend/src/components/profile/AnimeProjectStage.module.css
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/profile/LockedStageArtwork.module.css
    - frontend/src/components/profile/RoleBadgeCard.stages.module.css
    - frontend/src/components/profile/MemberProfileHero.test.tsx
    - frontend/next.config.mjs
    - frontend/Dockerfile
    - frontend/src/components/ui/ResponsiveImage.config.test.ts

key-decisions:
  - "Task 1's automated capture found a real, pre-existing bug during this plan's own execution (not injected by this plan): --focus-ring (a box-shadow shorthand token) was misused as an outline color in profile.module.css/FocalCarousel.module.css/AnimeProjectStage.module.css, silently collapsing keyboard focus rings to invisible on the live member-profile page. Fixed all three to use the dedicated --focus-outline color token (Rule 1 — bug). The identical misuse in GroupMediaReviewSection.module.css (admin-only, outside /members/{slug}'s blast radius) was deliberately left and logged to deferred-items.md rather than fixed, since it falls outside this plan's scope boundary."
  - "Two live-UAT gap-closure rounds happened before final sign-off, both scoped to named visual bugs surfaced by the human checkpoint walkthrough, not re-litigating already-automated coverage: (1) a mobile hero container-query self-query bug (dead cqi units in LockedStageArtwork.module.css) that froze/hung the layout at 390x844, plus a badge-chain connector-line alignment fix (roles + anime-projects) and mid-word badge-label wrap fix; (2) a tablet/desktop hero-avatar top-alignment correction. Evidence was refreshed after each fix (commits 96b8bbeb, c285414d) rather than trusting stale screenshots."
  - "The known, separate tablet-band (600-765px) container-query hang is explicitly out of scope for this plan's 3 required viewports (390x844/768x1024/1440x900) and is documented as an accepted known limitation in uat-checklist.md's own text, not a defect blocking this sign-off — it needs its own future decision/plan."

requirements-completed: [PMQA-05]

# Metrics
duration: multi-session (resumed 2026-08-20 after an out-of-band shared-stack reset; live-UAT checkpoint itself spanned two gap-closure rounds before approval)
completed: 2026-08-20
---

# Phase 134 Plan 06: Live UAT Evidence Capture & Human Sign-off Summary

**Playwright-automated screenshot + keyboard-focus-visibility evidence across both reference profiles x all 3 required viewports, two live-UAT gap-closure rounds (mobile hero container-query hang + badge-chain alignment, then hero-avatar top-alignment), and the user's explicit live-browser "approved" sign-off closing PMQA-05 (CONTEXT.md D-09).**

## Performance

- **Duration:** Multi-session — resumed 2026-08-20 after the shared team4s_v2/Keycloak stack was reset out-of-band; Task 1/2 automation plus two live-UAT gap-closure rounds landed same-day before final approval.
- **Started:** 2026-08-16 (initial Task 1 attempt, blocked mid-session by the out-of-band stack reset)
- **Completed:** 2026-08-20 (user typed "approved" for both profiles)
- **Tasks:** 3 (Task 1: automated evidence capture, Task 2: checklist protocol, Task 3: live human sign-off checkpoint)
- **Files modified:** 8 source/config files (profile.module.css, AnimeProjectStage.module.css, FocalCarousel.module.css, LockedStageArtwork.module.css, MemberProfileHero.test.tsx, next.config.mjs, Dockerfile, ResponsiveImage.config.test.ts), plus the new capture script, the checklist, and 14 evidence files (6 screenshots, 6 keyboard traces, 2 budget-check JSON, each screenshot/trace refreshed twice)

## Accomplishments

- Built `frontend/scripts/capture-phase134-uat-evidence.mjs`: a Playwright-based harness that, for each of `sheppert`/`csubs-leader` x `390x844`/`768x1024`/`1440x900`, navigates to the real `/members/{slug}` route, waits for `networkidle`, captures a full-page screenshot, and presses Tab up to 15 times recording each focused element's visible-focus-indicator state to a JSON trace — failing loudly (non-zero exit) on any `networkidle` timeout or missing focus indicator rather than silently accepting a broken page.
- Ran the two existing evidence harnesses (`collect-member-profile-evidence.mjs --mode budget-check`, `verify-profile-image-delivery.mjs`) against the freshly reset+reseeded shared stack from Plan 134-05 — both exit 0, confirming Phase 131/133's locked performance/image budgets still hold.
- Task 1's own automated capture surfaced a genuine pre-existing accessibility bug during this session: `--focus-ring` (a box-shadow token) was misused as an outline color in three member-profile CSS modules, silently making keyboard focus invisible; fixed by switching to the dedicated `--focus-outline` token. All 6 profile x viewport keyboard-focus captures now report `keyboardPass: true` with zero missing focus indicators across the first 15 Tab stops.
- Wrote `uat-checklist.md`: the profile x layout x a11y grid (2 profiles x 3 viewports x 5 human-judgment items) referencing every Task 1 screenshot/keyboard-trace path as the automated baseline, so the live human checkpoint compares against evidence instead of starting from a blank slate.
- Live UAT checkpoint (Task 3) surfaced two real visual bugs during the walkthrough, both fixed and re-evidenced before final approval:
  1. A mobile hero container-query self-query bug (dead `cqi` units in `LockedStageArtwork.module.css`) that froze/hung the layout at the 390x844 viewport, plus a badge-chain connector-line misalignment (roles progression + anime-project milestones) and mid-word badge-label wrapping — fixed together, evidence refreshed (`96b8bbeb`).
  2. A tablet/desktop hero-avatar top-alignment issue — fixed, evidence refreshed a second time (`c285414d`).
- User performed the live browser walkthrough over the canonical SSH-tunnel path (`127.0.0.1:3300`) across all 3 required viewports plus real 400% browser zoom, confirmed the seeded story image renders correctly and keyboard Tab focus is visible throughout, and typed explicit approval for both profiles — both Sign-off checkboxes in `uat-checklist.md` now checked.

## Task Commits

Each task was committed atomically (spanning the 2026-08-16 initial attempt and the 2026-08-20 resumed session):

1. **Task 1: Automated evidence capture — budgets, image delivery, screenshots, keyboard focus**
   - `bf4303d1` (fix) — repaired `verify-profile-image-delivery.mjs`'s production harness (Dockerfile/next.config.mjs/ResponsiveImage config test)
   - `da44d845` (feat) — added `frontend/scripts/capture-phase134-uat-evidence.mjs`
   - `e838f950` (fix) — repaired `--focus-ring` misuse breaking keyboard focus visibility (profile.module.css, FocalCarousel.module.css, AnimeProjectStage.module.css)
   - `1a0cdbe3` (feat) — completed Task 1 evidence capture (6 screenshots, 6 keyboard traces, 2 budget-check JSON)
2. **Task 2: Write the documented UAT checklist protocol** - `bfe7d4a1` (feat)
3. **Task 3: Live browser UAT sign-off** — two gap-closure rounds plus final approval:
   - `23958eb7` (fix) — dropped dead `cqi` units freezing the mobile member profile
   - `c59a0137` (fix) — mobile hero layout bug + badge mid-word wrap
   - `d3abbaff` (fix) — aligned badge-chain connector lines to marker centers (roles + anime-projects)
   - `96b8bbeb` (docs) — refreshed Task 1 evidence after the mobile/visual bug fixes
   - `25f86f64` (fix) — top-aligned hero avatar at tablet/desktop widths
   - `c285414d` (docs) — refreshed evidence after the tablet/desktop avatar-alignment fix
   - `9c8ac464` (docs) — recorded the user's explicit live-UAT sign-off (both Sign-off checkboxes checked)

Interleaved bookkeeping/resume commits: `5c0b9963` (recorded Task 1 blocker in STATE.md before the resume), `00cfd139` (cleared stale Task 1 blocker in STATE.md, recorded resume-session findings after the out-of-band stack reset).

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `frontend/scripts/capture-phase134-uat-evidence.mjs` - New: Playwright screenshot + keyboard-focus-trace capture across both profiles x 3 viewports
- `.planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md` - New: the profile x layout x a11y human-checkpoint grid, now fully signed off
- `.planning/phases/134-fixture-backed-verification-rollout/evidence/screenshots/*.png` (6 files, refreshed twice) - Full-page screenshots per profile x viewport
- `.planning/phases/134-fixture-backed-verification-rollout/evidence/*-keyboard.json` (6 files, refreshed twice) - Keyboard-focus traces per profile x viewport
- `.planning/phases/134-fixture-backed-verification-rollout/evidence/budget-check-*.json` (2 files) - Locked-budget verification for both profiles
- `frontend/src/components/profile/profile.module.css` - Fixed `--focus-ring`→`--focus-outline` misuse; mobile hero container-query fix + badge mid-word wrap; hero-avatar top-alignment fix
- `frontend/src/components/profile/AnimeProjectStage.module.css` - Fixed `--focus-ring`→`--focus-outline` misuse
- `frontend/src/components/ui/FocalCarousel.module.css` - Fixed `--focus-ring`→`--focus-outline` misuse
- `frontend/src/components/profile/LockedStageArtwork.module.css` - Dropped dead `cqi` units causing the mobile self-query freeze
- `frontend/src/components/profile/RoleBadgeCard.stages.module.css` - Aligned badge-chain connector lines to marker centers
- `frontend/src/components/profile/MemberProfileHero.test.tsx` - Updated to cover the mobile hero/badge-wrap fix
- `frontend/next.config.mjs`, `frontend/Dockerfile`, `frontend/src/components/ui/ResponsiveImage.config.test.ts` - Repaired `verify-profile-image-delivery.mjs`'s production harness

## Decisions Made

See `key-decisions` in frontmatter: the `--focus-ring`/`--focus-outline` bug fix scope boundary (fixed on the 3 member-profile-facing files, deliberately left on the admin-only `GroupMediaReviewSection.module.css` and logged to deferred-items.md), the two live-UAT gap-closure rounds and why evidence was refreshed after each, and the tablet-band (600-765px) hang being an accepted, explicitly out-of-scope known limitation rather than a defect blocking this sign-off.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `--focus-ring` misused as outline color, collapsing keyboard focus visibility**
- **Found during:** Task 1 (automated keyboard-focus capture)
- **Issue:** `profile.module.css`, `FocalCarousel.module.css`, and `AnimeProjectStage.module.css` used `--focus-ring` (a box-shadow shorthand token) as an `outline`/`border-color` value, which resolved to an effectively invisible outline on the live member-profile page.
- **Fix:** Switched all three files to the dedicated `--focus-outline` color token.
- **Files modified:** `frontend/src/components/profile/profile.module.css`, `frontend/src/components/ui/FocalCarousel.module.css`, `frontend/src/components/profile/AnimeProjectStage.module.css`
- **Verification:** Re-ran `capture-phase134-uat-evidence.mjs`; all 6 profile x viewport keyboard traces report `keyboardPass: true`.
- **Committed in:** `e838f950`

**2. [Rule 1 - Bug] Mobile hero container-query self-query freeze**
- **Found during:** Task 3 (live UAT checkpoint, first gap-closure round)
- **Issue:** `LockedStageArtwork.module.css` contained dead `cqi` units that caused the mobile hero container query to effectively self-query its own container, hanging/freezing the layout at the 390x844 viewport.
- **Fix:** Dropped the dead `cqi` units.
- **Files modified:** `frontend/src/components/profile/LockedStageArtwork.module.css`
- **Verification:** Live re-check at 390x844 plus refreshed screenshot evidence (`96b8bbeb`).
- **Committed in:** `23958eb7`

**3. [Rule 1 - Bug] Mobile hero layout bug + badge mid-word wrap**
- **Found during:** Task 3 (live UAT checkpoint, first gap-closure round)
- **Issue:** A related mobile hero layout bug and badge labels wrapping mid-word at the 390x844 viewport.
- **Fix:** `profile.module.css` mobile hero + badge-wrap fixes.
- **Files modified:** `frontend/src/components/profile/profile.module.css`, `frontend/src/components/profile/MemberProfileHero.test.tsx`
- **Verification:** Live re-check across viewports plus refreshed screenshot/keyboard evidence (`96b8bbeb`).
- **Committed in:** `c59a0137`

**3b. [Rule 1 - Bug] Badge-chain connector lines not aligned to marker centers**
- **Found during:** Task 3 (live UAT checkpoint, first gap-closure round)
- **Issue:** Badge-chain connector lines (roles progression + anime-project milestones) did not align to marker centers.
- **Fix:** Aligned connector lines to marker centers in both affected stage files.
- **Files modified:** `frontend/src/components/profile/AnimeProjectStage.module.css`, `frontend/src/components/profile/RoleBadgeCard.stages.module.css`
- **Verification:** Live re-check across viewports plus refreshed screenshot/keyboard evidence (`96b8bbeb`).
- **Committed in:** `d3abbaff`

**4. [Rule 1 - Bug] Hero avatar not top-aligned at tablet/desktop widths**
- **Found during:** Task 3 (live UAT checkpoint, second gap-closure round)
- **Issue:** At tablet/desktop widths the hero avatar was not top-aligned as intended, found during the live walkthrough after the first round's fixes were already re-verified.
- **Fix:** Top-aligned the hero avatar at tablet/desktop widths.
- **Files modified:** `frontend/src/components/profile/profile.module.css`
- **Verification:** Live re-check at 768x1024 and 1440x900 plus a second refreshed evidence capture (`c285414d`).
- **Committed in:** `25f86f64`

**5. [Rule 3 - Blocking issue] `verify-profile-image-delivery.mjs`'s production harness broken**
- **Found during:** Task 1 (running the two existing evidence harnesses before writing new capture code)
- **Issue:** The harness's production-mode image-delivery checks failed against the current Dockerfile/`next.config.mjs` configuration.
- **Fix:** Repaired the Dockerfile and `next.config.mjs` configuration plus added a covering config test.
- **Files modified:** `frontend/Dockerfile`, `frontend/next.config.mjs`, `frontend/src/components/ui/ResponsiveImage.config.test.ts`
- **Verification:** `verify-profile-image-delivery.mjs` exits 0.
- **Committed in:** `bf4303d1`

---

**Total deviations:** 6 auto-fixed (5 Rule 1 bug fixes surfaced by automated evidence capture and the live human checkpoint, 1 Rule 3 blocking-issue fix to a pre-existing harness). All were within this plan's own blast radius (the `/members/{slug}` route and its evidence harnesses); none required an architectural decision (Rule 4).
**Impact on plan:** No scope creep — every fix was either required for Task 1's own acceptance criteria (harness exit-0, keyboard-focus pass) or was a named, live-UAT-surfaced defect on the exact page under review, immediately re-evidenced rather than assumed fixed.

## Issues Encountered

- The shared team4s_v2/Keycloak stack was reset out-of-band between the plan's initial 2026-08-16 start and its 2026-08-20 resumption (both `team4s_postgres_data` and `team4s_keycloak_db_data` volumes recreated), meaning `sheppert`/`csubs-leader` existed nowhere on resume. Resolved by bootstrapping both members via the exact identity/authz pattern already established in `provision-phase134-matrix-db.sh` Step 4.5, then re-running the Plan-134-01 seed script (15/15 checks pass) before Task 1's automated capture could proceed. Documented in STATE.md's Phase 134 decision log.

## User Setup Required

None for this plan's automated tasks. Task 3's live checkpoint required the user to confirm the canonical SSH tunnel (`127.0.0.1:3300` -> Linux frontend `:3000`, per CLAUDE.md) was active before performing the live browser walkthrough — this was the plan's own `user_setup` requirement, satisfied as part of the checkpoint, not a new external service.

## Known Stubs

None. All evidence artifacts (screenshots, keyboard traces, budget-check JSON) are real captures against the live reset+reseeded stack, not placeholders.

## Threat Flags

None. This plan's threat register (T-134-16, T-134-17) was already fully addressed by the plan's own design (fail-loud automated capture; explicit human sign-off per D-09) — no new, unregistered security-relevant surface was introduced by the gap-closure CSS fixes (all client-side layout/accessibility corrections, no new endpoints, auth paths, or schema changes).

## Next Phase Readiness

- PMQA-05 is complete: both reference profiles are proven live across all 3 required viewports with real seeded images, Phase 131/133's locked performance/image budgets still hold against the reset fixture, and the user has explicitly signed off per CONTEXT.md D-09.
- This closes the final plan (6/6) of Phase 134, and Phase 134 was the last of the seven sequential v1.3-numbered phases (128-134) — milestone v1.3's phase-level and milestone-level completion steps (code review gate, regression gate, phase-goal verification, ROADMAP/STATE phase-complete marking, `/gsd:complete-milestone`) are explicitly the orchestrator's next step, not this plan's.
- Two items already logged in `deferred-items.md` from this plan's rounds remain open, out-of-scope follow-ups: the admin-only `--focus-ring` misuse in `GroupMediaReviewSection.module.css` (item 4), and pre-existing, unrelated `MemberBadgeChain.test.tsx`/`MembershipsSection.test.tsx` test failures found and deliberately left untouched (items 5-6) since they predate and are outside this plan's own CSS-only fix scope.
- The known, separate tablet-band (600-765px) container-query hang (documented in commit `23958eb7` and in `uat-checklist.md`'s own text) remains an accepted, explicitly out-of-scope limitation for a future dedicated decision/plan — it does not affect any of the 3 required viewports and was not a blocker for this sign-off.

---
*Phase: 134-fixture-backed-verification-rollout*
*Completed: 2026-08-20*

## Self-Check: PASSED

All referenced created/modified files confirmed on disk (`frontend/scripts/capture-phase134-uat-evidence.mjs`, `.planning/phases/134-fixture-backed-verification-rollout/uat-checklist.md`, `evidence/screenshots/sheppert-390x844.png`, `evidence/csubs-leader-1440x900-keyboard.json`, `frontend/src/components/profile/LockedStageArtwork.module.css`, `frontend/src/components/profile/RoleBadgeCard.stages.module.css`). All 14 referenced commit hashes (`bf4303d1`, `da44d845`, `23958eb7`, `e838f950`, `1a0cdbe3`, `c59a0137`, `d3abbaff`, `96b8bbeb`, `25f86f64`, `c285414d`, `bfe7d4a1`, `00cfd139`, `5c0b9963`, `9c8ac464`) confirmed in `git log`.

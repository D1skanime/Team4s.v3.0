---
phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
plan: "04"
subsystem: ui-verification
tags: [react, carousel, responsive, accessibility, live-uat]
requires:
  - phase: 118-01
    provides: Exact public earned-role counts and tier metadata
  - phase: 118-02
    provides: Shared continuous FocalCarousel interaction
  - phase: 118-03
    provides: Earned role-progress cards and five-medal composition
provides:
  - Verified public role-progress flow across desktop, tablet, and mobile
  - Stable explicit carousel endpoints through delayed smooth-scroll settling
  - Full-width mobile carousel track with contained medal and progress composition
affects: [public-member-profile, FocalCarousel, FansubProjectsGrid]
tech-stack:
  added: []
  patterns: [preserved explicit scroll target, mobile full-track controls layout, CSS contract regression]
key-files:
  created:
    - .planning/phases/118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-/118-04-SUMMARY.md
  modified:
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - "Explicit keyboard/button carousel targets remain authoritative until their unscaled target offset is reached."
  - "Mobile arrows occupy a separate controls row so the shared track receives the full available width."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09, D-10, D-11, D-12, D-13, D-14, D-15, D-16, D-17, D-18, D-19, D-20, D-21, D-22, D-23]
duration: 34min
completed: 2026-08-03
---

# Phase 118 Plan 04: Final Gates and Live Role-Progress UAT Summary

**Public earned-role cards and the shared FocalCarousel passed live desktop, tablet, mobile, keyboard, endpoint, and second-consumer verification after three focused geometry corrections.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-08-03T05:58:27Z
- **Completed:** 2026-08-03T06:31:59Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Completed final focused contract tests, typecheck, lint, production build, diff checks, and ASVS HIGH review.
- Verified the public ranking-to-member flow and responsive role-card composition in the shared browser.
- Corrected CSS parsing, delayed endpoint settling, and mobile card containment without adding a local carousel or changing domain ownership.
- Preserved FansubProjectsGrid preview/show-all behavior with the generic counter disabled.

## Task Commits

1. **Task 1: Restore valid shared-carousel CSS** - `977bb2e4` (fix)
2. **Task 2: Preserve final endpoint tie behavior** - `ab581784` (fix)
3. **Task 2: Preserve explicit targets through smooth-scroll settling** - `93b27c59` (fix)
4. **Task 2: Correct mobile carousel and role-card geometry** - `62b202a3` (fix)

## Live UAT Results

- User-visible member ranking navigation to CSubs Leader passed.
- Desktop keyboard: ArrowRight moved 1 to 2; Home returned to 1/11 with Previous disabled; End remained 11/11 after both one and two seconds with Next disabled.
- Mobile 390x844: region width 309px, active card approximately 272.2px, medal row client/scroll width 250/250, progress client/scroll width 250/250, wrapped copy, both arrows 44x44, all five medals including Platin visible, and End stable at 11/11.
- Tablet 1024x768: active card approximately 572.9px in a 774px region, next neighbour visible, and full medal/progress composition visible.
- Live 108 Silver and 320 Gold boundary roles were present and semantically correct.
- C-Subs FansubProjectsGrid exposed zero generic status counters; its unique show-all action switched from preview to 50 project links.
- Browser UAT used the canonical frontend at `http://192.168.235.196:3000` because the original `http://127.0.0.1:3300` tunnel was unavailable.
- Screenshot and DOM evidence were reviewed in the shared browser session; no screenshot files were written into the repository.

## Live Limitations

- Reduced-motion preference could not be toggled through the available in-app browser capability. Cleanup and reduced-motion behavior remain covered by automated regressions.
- Live fixtures for 0, 1, 12, 107, 509, and 510 were unavailable. These states remain covered by exhaustive automated boundary tests and were not falsely reported as live-tested.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored the carousel arrow CSS block**
- **Found during:** Task 1 production build
- **Issue:** The 44px arrow declarations were outside `.arrow`, causing a production CSS parse failure.
- **Fix:** Moved both declarations back into the shared rule.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.module.css`
- **Commit:** `977bb2e4`

**2. [Rule 1 - Bug] Corrected final-card endpoint resolution**
- **Found during:** Task 2 live keyboard UAT
- **Issue:** End settled from 11/11 to 10/11 and re-enabled Next.
- **Fix:** Added endpoint-aware resolution and then preserved explicit navigation targets through intermediate smooth-scroll debounce events.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`, `frontend/src/components/ui/FocalCarousel.test.tsx`
- **Commits:** `ab581784`, `93b27c59`

**3. [Rule 1 - Bug] Corrected mobile carousel/card containment**
- **Found during:** Task 2 live 390x844 UAT
- **Issue:** Side-by-side arrows reduced the track to 221px; the fifth medal and progress copy clipped.
- **Fix:** Gave the mobile track the full controls width, moved arrows below it, constrained role-card children, and reduced mobile padding/medal gaps.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.module.css`, `frontend/src/components/ui/FocalCarousel.test.tsx`, `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Commit:** `62b202a3`

---

**Total deviations:** 3 auto-fixed Rule 1 bugs.
**Impact on plan:** All changes stayed within the existing global carousel and role-card seams; no endpoint, query, schema, migration, auth seam, dependency, or parallel interaction owner was added.

## Verification

- Focused backend role-volume/public-badge regressions: PASS.
- Focused frontend FocalCarousel, MemberBadgeChain, labels, and FansubProjectsGrid regressions: PASS; final responsive subset 54/54.
- Frontend typecheck: PASS.
- Frontend lint: PASS with zero errors and 328 existing warnings.
- Production build: PASS with `NODE_ENV=production`.
- `git diff --check`: PASS.
- ASVS HIGH review: public earned-only projection, target clamping, listener cleanup, contract parity, and no new trust boundary all pass.
- Complete backend/frontend suites exposed unrelated environment/pre-existing failures documented during execution; no focused Phase 118 regression remained.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file, schema, or persisted-data trust boundary was introduced.

## User Setup Required

None.

## Next Phase Readiness

- Phase 118 is implementation- and live-UAT-complete.
- Reduced-motion and unavailable live boundary fixtures remain honestly automated-only evidence, not blockers to the approved flow.

## Self-Check: PASSED

- Summary and all four modified production/test files exist.
- Commits `977bb2e4`, `ab581784`, `93b27c59`, and `62b202a3` exist in the canonical repository.
- No unrelated dirty or untracked files were staged.

---

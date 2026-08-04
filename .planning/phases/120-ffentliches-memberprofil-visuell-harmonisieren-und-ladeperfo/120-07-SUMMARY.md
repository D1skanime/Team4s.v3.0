---
phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo
plan: "07"
subsystem: frontend-ui
tags: [react, next-image, responsive-images, hero, accessibility]
requires:
  - phase: 120-03
    provides: Expected-red Hero B dual-priority and responsive geometry contract
  - phase: 120-05
    provides: Geometry-stable ResponsiveImage optimizer fallback seam
provides:
  - Locked Sketch-004 Hero B semantic composition with one public H1
  - Differentiated eager delivery for the public Hero background and avatar
  - Stable 230/220/content-growing responsive geometry with 140/120/100px avatars
  - Local copy-zone scrim that preserves the member-owned centered crop
affects: [120-11, 120-13, MemberProfileHero, public-member-profile]
tech-stack:
  added: []
  patterns: [public-display-only responsive images, differentiated image discovery, content-growing single-column hero]
key-files:
  created:
    - .planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-07-SUMMARY.md
  modified:
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/MemberProfileHero.test.tsx
    - frontend/src/components/profile/profile.module.css
key-decisions:
  - "The public profile name is the Hero panel's sole H1; the own-profile PageHeader and edit actions remain unchanged."
  - "The background is eager/high as the primary image candidate, while the avatar is eager at default fetch priority; animated GIF avatars retain the existing unoptimized Next path so animation survives."
patterns-established:
  - "Hero artwork keeps symmetric object-position:center and receives only a left copy-zone scrim that is nearly transparent by 65%."
  - "Public Hero text may grow vertically at every width; mobile reserves a 100px avatar in a true one-column layout."
requirements-completed: [D-01, D-02, D-03, D-04, D-05, D-17, D-19, D-22]
duration: 10m
completed: 2026-08-04
---

# Phase 120 Plan 07: Locked Hero B Summary

**Sketch-004 Hero B now preserves arbitrary member artwork behind a local readability zone while serving a stable, single-H1 identity composition with prioritized responsive background and avatar images.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-04T13:47:58Z
- **Completed:** 2026-08-04T13:58:00Z
- **Tasks:** 2
- **Files modified:** 3 implementation/test files plus this summary

## Accomplishments

- Moved the public eyebrow, dominant H1, verified/status UI, points, complete bio, activity and known-for metadata into the locked Hero B order without changing their derivation.
- Reused `ResponsiveImage` for the full-shell public background and normal avatar display URLs, with eager/high discovery for the background and eager/default discovery for the avatar; no public rendering reads `source_original_url`.
- Replaced biased crop positions and full-image dark treatment with symmetric centering and a moderate horizontal copy-zone gradient that is nearly transparent at 65%.
- Reserved exact desktop/tablet/mobile geometry: 230/220/content-growing Hero and 140/120/100px Avatar, with `min-width:0`, unrestricted bio wrapping and no mobile aspect-ratio clipping.
- Added explicit dark-artwork, light-artwork and no-image fallback coverage alongside the inherited Plan-120-03 RED contract.

## Task Commits

1. **Task 1 RED: Lock Hero B semantic order** — `7d5c4f37`
2. **Task 1 GREEN: Compose prioritized public Hero** — `8ca81773`
3. **Task 2 RED: Lock responsive geometry** — `ea5889b8`
4. **Task 2 GREEN: Apply responsive Hero B geometry** — `5b7d4e03`
5. **Task 2 coverage: Light, dark and default artwork states** — `af9dd1be`

## Files Created/Modified

- `frontend/src/components/profile/MemberProfileHero.tsx` — Public Hero B semantics and differentiated `ResponsiveImage` delivery.
- `frontend/src/components/profile/MemberProfileHero.test.tsx` — Priority, semantic order, source-leak, geometry and artwork-state contracts.
- `frontend/src/components/profile/profile.module.css` — Centered crop, local scrim, token surfaces and 140/120/100px responsive geometry.
- `.planning/phases/120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo/120-07-SUMMARY.md` — Execution evidence and downstream handoff.

## Decisions Made

- Public view no longer renders a separate `PageHeader`; its name is the Hero panel's only H1. The own-profile edit branch still uses its existing PageHeader and actions.
- Static avatars use `ResponsiveImage`; animated GIF avatars keep the established unoptimized `next/image` exception so animation is not destroyed.
- The stored member crop remains centered and unfiltered. Contrast comes from the local left-side scrim, quiet text shadow and compact outlined status/points surfaces.

## Verification

- Hero suite: **14/14 passed**, including the exact Plan-120-03 differentiated-priority test.
- Isolated production typecheck with anonymous `/app/.next`: **passed**.
- Targeted ESLint with `--max-warnings=0`: **passed**.
- `git diff --check` and all five task-commit whitespace checks: **passed**.
- Source contract scan confirms no Hero `center 42%`/`center 34%`, Hero bio clamp or Hero 800+ typography remains.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supplied the validator's committed root and latest predecessor manifests**
- **Found during:** Task 1 and Task 2 preconditions
- **Issue:** The literal `check --authorization` command is incomplete and exits with `check requires --expect or --initial`.
- **Fix:** Ran `check` against committed `120-01-initial-overlap.json` with exact Plan-120-04 and Plan-120-06 latest overrides. No authorization or evidence bytes were refreshed.
- **Files modified:** None.
- **Verification:** Both corrected preconditions returned `{"ok":true}`.

**2. [Rule 1 - Bug] Preserved animated GIF avatar delivery**
- **Found during:** Task 1 implementation
- **Issue:** Routing animated GIFs through the optimizer-first fallback seam would remove the existing explicit animation-preservation guarantee.
- **Fix:** Kept the narrow unoptimized `next/image` branch for `.gif` avatars while routing all normal avatars and Hero backgrounds through `ResponsiveImage`.
- **Files modified:** `frontend/src/components/profile/MemberProfileHero.tsx`
- **Verification:** The inherited GIF regression and all 14 Hero tests pass.
- **Committed in:** `8ca81773`

---

**Total deviations:** 2 auto-fixed (1 blocking validator invocation, 1 compatibility bug prevention).
**Impact on plan:** No scope expansion, backend/API/media ownership change or weakened Hero contract.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Review

- T-120-03 remains mitigated: the component consumes only the public display URL props, and the negative leak test proves a DTO `source_original_url` sentinel never reaches rendered markup.
- T-120-07 remains mitigated: explicit image dimensions, panel minimum heights, exact avatar stages, unrestricted wrapping and no size transitions reserve geometry.
- No endpoint, auth path, schema, file-access boundary or backend media surface changed.

## Unrelated Existing State

Dirty Phase-119 components and badge assets plus shared `.planning/STATE.md` and `.planning/ROADMAP.md` remain untouched and unstaged, as required by the plan boundary.

## Next Phase Readiness

- Plans 120-11 and 120-13 can compose and live-verify the completed Hero without reopening its media or crop ownership.
- Final light/dark crop quality, AA contrast and 390/768/1440 shared-browser approval remain intentionally assigned to Plan 120-13.

## Self-Check: PASSED

- All three scoped implementation/test files and this summary exist.
- Task commits `7d5c4f37`, `8ca81773`, `ea5889b8`, `5b7d4e03` and `af9dd1be` exist.
- Hero tests, isolated typecheck, targeted lint and whitespace checks all pass.

---
*Phase: 120-ffentliches-memberprofil-visuell-harmonisieren-und-ladeperfo*
*Completed: 2026-08-04*

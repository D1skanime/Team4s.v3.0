# Phase 125 Validation Strategy

**Created:** 2026-08-11  
**Nyquist validation:** enabled (`workflow.nyquist_validation: true`) [VERIFIED: `.planning/config.json`]

## Test Framework

| Property | Value |
|---|---|
| Framework | Vitest `^3.2.4`, jsdom, Testing Library React `^16.3.0` [VERIFIED: `frontend/package.json`] |
| Config | `frontend/vitest.config.ts` [VERIFIED: codebase] |
| Quick | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/profile/memberBadgeLabels.test.ts src/components/profile/MemberBadgeChain.test.tsx` |
| Carousel | `docker compose exec -T team4sv30-frontend npm test -- --run src/components/ui/FocalCarousel.test.tsx` |
| Public profile | `docker compose exec -T team4sv30-frontend npm test -- --run 'src/app/members/[slug]/page.test.tsx'` |
| Backend projection | `docker compose exec -T team4sv30-backend go test ./internal/repository ./internal/handlers` |
| Full frontend | `docker compose exec -T team4sv30-frontend npm test` |
| Static | `npm run typecheck`, `npm run lint`, `npm run build` in frontend container |

[VERIFIED: canonical Docker Compose runtime and package scripts]

## Requirement-to-Test Map

The PRD has no formal IDs, so these are stable local planning IDs. [VERIFIED: roadmap Requirements TBD]

| ID | Behavior | Test type | File |
|---|---|---|---|
| P125-01 | Exactly three ordered contribution families in one outer carousel | component | chain test extend |
| P125-02 | Zero families visible with no current tier and locked Bronze hero | pure/component | labels + chain |
| P125-03 | Exact boundary current/earned/locked/next/remainder/complete | table-driven | labels test |
| P125-04 | Nine codes resolve only to active versioned assets | component/resolver | chain test |
| P125-05 | Hero/thumbnail slots square, contained, unstretched | CSS + visual | Wave 0 |
| P125-06 | Current default; earlier earned selectable; future static/unfocusable | interaction/a11y | chain test |
| P125-07 | Preview changes hero/tier/status only; metrics stable | interaction | chain test |
| P125-08 | Terminal true count, completion, bounded ARIA | component/a11y | chain test |
| P125-09 | Inner track has no observer/timer/wheel/swipe engine | code/component | Wave 0 |
| P125-10 | Thumbnail tap does not change family; outer drag suppresses click | integration | carousel + chain |
| P125-11 | Vertical intent preserves page scroll and `touch-action: pan-y` | CSS/live | carousel + UAT |
| P125-12 | Arrows/neighbors/keyboard/Home/End/reduced motion remain | regression | carousel test |
| P125-13 | Expanded three-card grid has no peek/transform/skeleton leakage | component/visual | chain + UAT |
| P125-14 | Phase-123/124 single-family stages unchanged | regression | chain test |
| P125-15 | Hidden profile never discloses progress | backend/frontend | existing handler/page |
| P125-16 | Correct German family-specific singular/plural copy | component | chain test |

## Boundary Oracle

Percent is cumulative `current / next_threshold`, rounded; terminal is full. [VERIFIED: backend and current semantic]

### Mitgetragene Projekte

| Value | Current | Next | Remaining | Percent | Complete |
|---:|---|---:|---:|---:|---|
| 0 | none | 1 Bronze | 1 | 0% | no |
| 1 | Bronze | 5 Silber | 4 | 20% | no |
| 4 | Bronze | 5 Silber | 1 | 80% | no |
| 5 | Silber | 15 Gold | 10 | 33% | no |
| 14 | Silber | 15 Gold | 1 | 93% | no |
| 15 | Gold | none | none | 100% | yes |
| 20 | Gold | none | none | 100% | yes |

### Chronikpflege / Bildarchivpflege

| Value | Current | Next | Remaining | Percent | Complete |
|---:|---|---:|---:|---:|---|
| 0 | none | 10 Bronze | 10 | 0% | no |
| 10 | Bronze | 50 Silber | 40 | 20% | no |
| 49 | Bronze | 50 Silber | 1 | 98% | no |
| 50 | Silber | 150 Gold | 100 | 33% | no |
| 149 | Silber | 150 Gold | 1 | 99% | no |
| 150 | Gold | none | none | 100% | yes |
| 200 | Gold | none | none | 100% | yes |

[VERIFIED: thresholds, `buildBadgeProgress`, existing formula]

## Nested Interaction Matrix

| Action | Start | Expected |
|---|---|---|
| Tap | earned thumbnail | Preview only; family unchanged. [VERIFIED: PRD] |
| Tap | locked tier | No action/focus. [VERIFIED: PRD] |
| Click | inactive neighbor free area | Activate neighbor. [VERIFIED: carousel] |
| Horizontal drag >6px | free Stage area | Outer drag/snap; following click suppressed. [VERIFIED: carousel] |
| Vertical drag >6px | free Stage area | Outer drag abandoned; page scroll available. [VERIFIED: carousel] |
| Horizontal movement | thumbnail | No tier click after outer drag. [VERIFIED: PRD risk/current capture] |
| Enter/Space | earned tier button | Native activation once. [VERIFIED: native control] |
| Arrow/Home/End | outer region | Family navigation only. [VERIFIED: carousel] |

## Wave 0 Gaps

- [ ] Table-driven contribution boundary cases in `memberBadgeLabels.test.ts`.
- [ ] RED tests in `MemberBadgeChain.test.tsx` for three-family carousel, tier artwork, zero, preview, terminal ARIA, expanded mode.
- [ ] Nested-control integration regression for thumbnail tap and drag-click suppression.
- [ ] CSS contracts for three columns, contained square slots, mobile overflow, expanded reset.
- [ ] Explicit nine-entry active asset resolver test.

No framework installation is required. [VERIFIED: existing infrastructure]

## Sampling Rate

- Per task: focused labels/chain tests + `git diff --check`.
- Per wave: profile/carousel/public regressions + typecheck/lint.
- Gate: full frontend, backend projection regression, build if feasible, live viewport/touch evidence.

## Live UAT Matrix

Use the real public profile via visible navigation at `http://127.0.0.1:3300`; headless is supporting only. [VERIFIED: `AGENTS.md`]

| Viewport | Evidence |
|---|---|
| 390?844 | full hero, three thumbnails, tap, free-area family swipe, vertical scroll, no page overflow |
| 768?1024 | stacked/transitional Stage, stable height, neighbors, tap/drag split |
| 1024?768 | landscape composition, tier row, no clipping |
| 1440?900 | dominant family, visible neighbors, controlled hero |
| 1920?1080 | balanced wide Stage, no excess whitespace |
| 2560x1440 | controlled max width, expanded grid clean |

Capture six viewport images plus preview, zero, max, and expanded states. Inspect all nine artworks at least once for perceived bounds, background overhang, clipping, and distortion. [VERIFIED: PRD ??10-11,21-23,31]

## Dirty-Worktree Safety Gate

1. Re-run `git status --short` and save relevant diff.
2. Preserve existing `MemberBadgeChain*`, `FocalCarousel*`, roadmap, and PNG edits.
3. Use targeted patches only; never reset whole files.
4. Verify all nine active PNG paths; never reactivate unversioned files.
5. Require a generic failing regression before changing `FocalCarousel`.
6. Run `git diff --check` and scoped diff review.

[VERIFIED: current dirty tree and `AGENTS.md`]

## Exit Criteria

All P125 tests green; three families visible at zero/earned states; nine assets visually correct; real-touch nested gestures conflict-free; expanded and Phase-123/124 regressions clean; required static/full checks complete or documented. [VERIFIED: PRD and `AGENTS.md`]

## RESEARCH COMPLETE

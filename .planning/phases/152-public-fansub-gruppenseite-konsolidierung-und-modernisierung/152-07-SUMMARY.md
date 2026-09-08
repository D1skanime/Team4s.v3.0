---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 07
subsystem: ui
tags: [nextjs, react, css-modules, accessibility, next-image, group-history, achievement-artwork]

# Dependency graph
requires:
  - phase: 152-01
    provides: "/history-event-badges-transparent/** localPatterns entry enabling next/image for history badges"
  - phase: 151
    provides: "AchievementArtwork shared artwork slot (direct/layered descriptor, hero/stage container-query sizing)"
provides:
  - "FansubHistorySection badges render through AchievementArtwork (next/image, lazy, WebP-capable) instead of a raw <img>"
  - "group-history-events.ts registry additively extended with emphasis ('none'|'legendary') and static publicLabel fields"
  - "FansubPublicSections.module.css fully delegates History badge geometry to AchievementArtwork; zero --history-badge-size/--history-image-x/y references remain"
  - "One shared, token-driven .historyTimelineEmphasisLegendary selector replaces two hardcoded-hex per-event glow blocks"
  - "Admin-authored free-text history titles render byte-for-byte unchanged (publicDomainTerms runtime rewrite deleted)"
  - "FansubHistorySection.test.tsx rewritten to behavior assertions (data-achievement-art, data-emphasis, aria-hidden) with jest-axe coverage"
affects: [152-08, 152-09, 152-10, visual-qa]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Second consumer of the Phase-151 AchievementArtwork slot pattern (direct descriptor, artworkStyles.container wrapping the full-width ancestor row, not the tight badge box)"
    - "Additive registry-field extension (emphasis, publicLabel) instead of a parallel lookup table"

key-files:
  created: []
  modified:
    - frontend/src/lib/group-history-events.ts
    - frontend/src/components/fansubs/FansubHistorySection.tsx
    - frontend/src/components/fansubs/FansubPublicSections.module.css
    - frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx

key-decisions:
  - "Grid-track/min-height for .historyTimelinePair fixed at 240px (AchievementArtwork's largest hero step) instead of a variable, per 152-UI-SPEC.md's locked Migration Contract"
  - "The two bespoke legendary-tier glow treatments (projects_500 violet/amber, releases_10000 gold/cyan) collapsed into one shared .historyTimelineEmphasisLegendary selector driven by var(--ach-color)/var(--ach-grad) already set by .achLegendary on the same <li> — an intentional, expected visual delta flagged for Visual QA sign-off"
  - "Mobile/narrow badges now render at AchievementArtwork's fixed 192px base hero step instead of the old shrinking clamp range (previously as small as ~108-180px) — badges appear larger on mobile than before; intended per A3's 'no family-specific breakpoint logic' constraint"

requirements-completed: [P152-02, P152-03, P152-04, P152-05, P152-10, P152-12, P152-13]

# Metrics
duration: 30min
completed: 2026-09-08
---

# Phase 152 Plan 07: History Badge Artwork Migration & CSS Consolidation Summary

**History badges now render through the shared Phase-151 AchievementArtwork slot with zero achievement-specific CSS sizing, one token-driven legendary emphasis treatment, and admin free text guaranteed byte-for-byte unchanged.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-08T17:56:39Z (approx., per prior STATE.md session timestamp)
- **Completed:** 2026-09-08T18:12:28Z
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments

- Migrated `FansubHistorySection`'s badge rendering from a raw `<img>` (no lazy loading, no `srcset`) onto the Phase-151 `AchievementArtwork` component (`direct` descriptor, `size="hero"`, `decorative`), wrapped in `artworkStyles.container` around the full `.historyTimelinePair` row (not the tight badge box) so `AchievementArtwork`'s 562px/658px container-query steps actually activate.
- Extended `group-history-events.ts`'s `GroupHistoryEventPresentation` additively with `emphasis: 'none' | 'legendary'` and static `publicLabel: string` fields across all 23 entries, replacing the runtime `publicDomainTerms()` 13-step string-rewrite chain and the hard 5-code `achievementEventStyle` if-chain.
- Fixed a real data-integrity defect: admin-authored free-text history titles (e.g. "Projektor gekauft") are now guaranteed to render byte-for-byte unchanged — the old code ran every admin title through `publicDomainTerms`, silently producing "Fansub-Projektor gekauft" for any title containing "Projekt"/"Release".
- Deleted all 10 `--history-badge-size` declaration sites and resolved all 5 consumption sites; deleted the 4 `--history-image-x/y` pixel-shift declarations and `.historyTimelineImage` (targeted the now-removed raw `<img>`); deleted the 11 confirmed-dead CSS classes and the 3 media-query blocks whose bodies contained only dead classes — verified against all 6 components importing `FansubPublicSections.module.css`.
- Fixed the duplicate-year accessibility defect (D3): the timeline's spine year marker now carries `aria-hidden="true"`; the card's own year stays in the accessible tree.
- Rewrote `FansubHistorySection.test.tsx` from CSS-class-name-substring assertions to behavior assertions (order/title/public-label via DOM queries, artwork presence via `data-achievement-art`, emphasis via `data-emphasis`, freetext preservation, `aria-hidden` on the axis-year span) and added `jest-axe` coverage — 9/9 tests green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the registry and migrate FansubHistorySection to the AchievementArtwork slot** - `bbaa2e11` (feat)
2. **Task 2: Delete History-badge geometry CSS and collapse the emphasis blocks onto tokens** - `8fa14d8f` (fix)
3. **Task 3: Rewrite FansubHistorySection.test.tsx to behavior assertions and add axe coverage** - `67bbf0a7` (test)

**Plan metadata:** committed alongside this SUMMARY (see final commit)

## Files Created/Modified

- `frontend/src/lib/group-history-events.ts` — additive `emphasis`/`publicLabel` fields on all 23 registry entries
- `frontend/src/components/fansubs/FansubHistorySection.tsx` — AchievementArtwork-based badge rendering, emphasis-driven wrapper class, `publicLabel` consumption, `publicDomainTerms`/`achievementEventStyle` removed
- `frontend/src/components/fansubs/FansubPublicSections.module.css` — History badge geometry fully delegated to `AchievementArtwork`; single `.historyTimelineEmphasisLegendary` selector; 11 dead classes + 3 dead-class-only media blocks removed
- `frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx` — behavior-based rewrite + axe coverage
- `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/deferred-items.md` — logged 3 pre-existing, out-of-scope full-suite failures discovered during Task 3's regression run (not fixed, see Deviations)

## Decisions Made

- Grid-track/min-height for `.historyTimelinePair` fixed at `240px` (not `min-content`/`auto`) — matches `AchievementArtwork`'s largest hero step, per the UI-SPEC's locked Migration Contract; not re-derived here.
- Collapsed the two bespoke legendary glow treatments into one `.historyTimelineEmphasisLegendary` selector, per Research Pattern 3 / the UI-SPEC's Emphasis Contract — an intentional visible simplification (gold→violet→cyan shared gradient replacing two distinct bespoke palettes), not a bug.
- Did not introduce a `'rare'` emphasis tier (UI-SPEC explicitly reserves it for a future phase, no current entry needs it).

## Deviations from Plan

### Auto-fixed Issues

None required for the plan's own scope — Tasks 1-3 executed as specified in `152-07-PLAN.md` with no blocking defects encountered.

### Out-of-Scope Discoveries (logged, not fixed — Rule "scope boundary")

During Task 3's mandatory full-suite `vitest run` regression pass (run twice, single-worker), 3 pre-existing failures were found, all outside 152-07's `files_modified` list and confirmed via `git log`/`git show --stat` to originate from other plans/phases:

1. **`FansubMediaLightbox.test.tsx`** (3 tests) — `getByAltText('Medium N')` no longer finds the thumbnail because Plan 152-04 (`842ee118`) already changed the inner `next/image` to `alt=""` (correct accessibility fix: the enclosing `Button`'s `aria-label` is now the sole accessible name) without updating this test file's queries. Already logged once before under 152-05 in `deferred-items.md`; re-confirmed here.
2. **`ResponsiveImage.config.test.ts`** ("allows the production badge namespace without opening unrelated static paths") — asserts the history-badge `localPatterns` wildcard should NOT match `/history-event-badges-transparent/unrelated.png`, but Plan 152-01 (`0228f473`, this plan's own precondition) added exactly that wildcard, which by definition also matches "unrelated.png" in the same folder. Stale negative-guard test from 152-01, not touched by 152-07.
3. **`DefaultCrewManager.test.tsx`** (button-disabled-state timing assertion) — unrelated admin fansub-edit component (Phase 136), appeared in only one of two full-suite runs; consistent with the Docker-parallelism timing flakiness already documented for Phase 149 in `STATE.md`.

All three are logged in `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/deferred-items.md` with full reproduction/root-cause detail. `FansubHistorySection.test.tsx` (9/9), `GroupHistoryForm.test.tsx` (6/6), and `GroupHistorySection.test.tsx` (2/2) — the plan's own verification surface — were green in every run.

## Known Stubs

None — no stub patterns (hardcoded empty values, placeholder text, unwired data sources) were introduced by this plan.

## Threat Flags

None — this plan touches only public, read-only, server-controlled History registry presentation. No new trust boundary, endpoint, or auth path was introduced (matches the plan's own threat_model: T-152-07-01 mitigated by deleting the `publicDomainTerms` free-text rewrite chain; T-152-07-02 accepted, no new asset path).

## Verification Results

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` — clean (Task 1 and final).
- `grep -c "history-badge-size" FansubPublicSections.module.css` → 0; `grep -c "history-image-x\|history-image-y"` → 0 (Task 2's automated verify, both PASS).
- `docker compose build team4sv30-frontend` — succeeded (Task 2's `<done>` criterion).
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/__tests__/FansubHistorySection.test.tsx"` — 9/9 tests green (Task 3).
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run --pool=forks --poolOptions.forks.maxForks=1 src/components/groups/GroupHistoryForm.test.tsx src/components/groups/GroupHistorySection.test.tsx"` — 8/8 tests green (registry additive-safety confirmed for the other two consumers named in the plan's verification block).
- Two full-repo single-worker `vitest run` passes: 2250-2251/2258 tests green across both runs; the 4-5 failures are all pre-existing and out of scope (see Deviations above).

## Self-Check: PASSED

- FOUND: `frontend/src/lib/group-history-events.ts` (modified, verified via Read + tsc)
- FOUND: `frontend/src/components/fansubs/FansubHistorySection.tsx` (modified, verified via Read + tsc)
- FOUND: `frontend/src/components/fansubs/FansubPublicSections.module.css` (modified, verified via Read + `docker compose build`)
- FOUND: `frontend/src/components/fansubs/__tests__/FansubHistorySection.test.tsx` (modified, verified via vitest run, 9/9 green)
- FOUND commit `bbaa2e11` (Task 1) in `git log --oneline`
- FOUND commit `8fa14d8f` (Task 2) in `git log --oneline`
- FOUND commit `67bbf0a7` (Task 3) in `git log --oneline`

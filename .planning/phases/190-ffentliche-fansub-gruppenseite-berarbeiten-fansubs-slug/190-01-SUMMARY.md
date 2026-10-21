---
phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug
plan: 01
subsystem: ui
tags: [nextjs, react, css-modules, vitest, fansubs]

# Dependency graph
requires: []
provides:
  - "Exported statusLabel + includeStatus-aware buildFansubFactSummary in fansub-summary.ts, backward compatible with all three existing call sites"
  - "FansubHeroSection.tsx renders status exactly once (Badge only), no duplicate local statusLabel"
  - ".heroCard on the group page matches the project page's frame-less pattern (no background/backdrop-filter/border/box-shadow)"
affects: [190-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional options-object parameter with default (FansubFactSummaryOptions) added to a pure function to add a new output mode without breaking existing callers"

key-files:
  created: []
  modified:
    - frontend/src/lib/fansub-summary.ts
    - frontend/src/lib/fansub-summary.test.ts
    - frontend/src/components/fansubs/FansubHeroSection.tsx
    - "frontend/src/app/fansubs/[slug]/page.module.css"

key-decisions:
  - "Kept the Badge as the sole visual status indicator (not the meta-line text), per 190-PATTERNS.md recommendation — the meta line's status segment is dropped via includeStatus:false instead of removing the Badge"
  - "Added includeStatus as an optional parameter (default true) instead of removing the status segment unconditionally, to keep ReadinessTab.tsx/FansubProfileTabs.tsx/episode-helpers.ts call sites' output unchanged"

patterns-established:
  - "Status-label single source of truth: fansub-summary.ts now owns statusLabel for both badge and meta-line use, FansubHeroSection.tsx has no local duplicate"

requirements-completed: [D-a, D-d, D-o]

# Metrics
duration: 15min
completed: 2026-10-21
---

# Phase 190 Plan 01: Hero-Rahmen entfernen und Status-Dopplung schließen Summary

**`.heroCard` auf der Gruppenseite verliert Glas-Hintergrund/Blur/Rahmen/Schatten (deckt sich jetzt exakt mit der Projektseite); der Status einer Fansub-Gruppe erscheint für alle drei Werte (aktiv/inaktiv/aufgelöst) nur noch einmal im Badge statt zusätzlich als Klartext in der Meta-Zeile.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-10-21T08:49:00Z (approx.)
- **Completed:** 2026-10-21T08:53:34Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `fansub-summary.ts` exports `statusLabel` and gives `buildFansubFactSummary` a new optional `{ includeStatus: boolean }` parameter (default `true`) that is fully backward compatible with its three unrelated call sites (`ReadinessTab.tsx`, `FansubProfileTabs.tsx`, `episode-helpers.ts`).
- `FansubHeroSection.tsx` no longer defines its own local `statusLabel` — it imports the one exported from `fansub-summary.ts` and calls `buildFansubFactSummary(group, { includeStatus: false })`, so the status word now appears exactly once (in the Badge) for every `FansubStatus` value, not just `dissolved`.
- `.heroCard` on `/fansubs/<slug>` now matches the project page's frame-less pattern verbatim — no more `background`/`backdrop-filter`/`border`/`box-shadow`, only `position: relative; display: grid; margin-top: 18px; overflow: hidden;`.
- Collaboration panel and banner image markup/CSS were left completely untouched, as required.

## Task Commits

Each task was committed atomically:

1. **Task 1: Status-Label konsolidieren (D-o/D-d, Datenschicht)** - `6fed297f1` (feat)
2. **Task 2: Hero ohne Rahmen-Karte, Status nur noch im Badge (D-a, D-o Wiring)** - `7cb2ceb86` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `frontend/src/lib/fansub-summary.ts` - `statusLabel` exported; `buildFansubFactSummary` gained `FansubFactSummaryOptions` (`includeStatus`, default `true`)
- `frontend/src/lib/fansub-summary.test.ts` - added `statusLabel` branch tests and `includeStatus:false` coverage for all three `FansubStatus` values, plus a regression test confirming the no-options call keeps including the status word
- `frontend/src/components/fansubs/FansubHeroSection.tsx` - deleted the local duplicate `statusLabel`, imports the shared one; `factSummary` built with `includeStatus: false`
- `frontend/src/app/fansubs/[slug]/page.module.css` - `.heroCard` rule replaced with the project page's frame-less layout-only rule

## Decisions Made
- Badge stays as the single visible status indicator; the meta-line text drops its status segment (not the other way around) — matches the 190-PATTERNS.md recommendation and keeps the Badge's existing color-coded `statusVariant` styling as the primary status signal.
- `includeStatus` implemented as an optional options-object parameter with a safe default, rather than a positional boolean, to keep the signature self-documenting at call sites and avoid an ambiguous bare `true`/`false` argument.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>`/`<behavior>` specs verbatim; no Rule 1-4 triggers encountered.

## Issues Encountered

The project's bare-host `npm test`/`npx vitest` are not the canonical environment per the mandatory constraints — both the targeted test run (Task 1 verification) and the full suite + typecheck (Task 2 verification) were run via `docker compose exec team4sv30-frontend ...` instead. The full-suite run (`npm test`) took ~131s and was executed as a background task to stay within the tool's foreground timeout; its completion was awaited via notification rather than polling.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

This plan is Wave 1 of Phase 190 and is the prerequisite for the mandatory live checkpoint in Plan 190-02 (D-p): the frontend container must be restarted (`docker restart team4sv30-frontend`) and the result shown live to the user on `/fansubs/<slug>` (e.g. `new-subs`, `strawhat-subs`, `dragon-subs`) before any banner-size decision or further plan in the phase proceeds. No blockers identified for that checkpoint — full suite (3650 tests) and typecheck are green.

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (`6fed297f1`, `7cb2ceb86`) confirmed present in `git log --oneline --all`.

---
*Phase: 190-ffentliche-fansub-gruppenseite-berarbeiten-fansubs-slug*
*Completed: 2026-10-21*

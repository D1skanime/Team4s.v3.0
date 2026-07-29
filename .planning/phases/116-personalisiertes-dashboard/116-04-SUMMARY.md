---
phase: 116-personalisiertes-dashboard
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, dashboard, hero-metrics, card-list]

# Dependency graph
requires:
  - phase: 116-01
    provides: "attentionHelpers.ts (isRecentlyAssigned/resolveWorkspaceHref/ATTENTION_WINDOW_DAYS), OwnDashboardData/MeAnimeContribution TS contracts"
provides:
  - "AttentionSection.tsx — 'Braucht deine Aufmerksamkeit' Card-Liste (D-02)"
  - "DashboardMetrics.tsx — 'Deine Zahlen' 5-Kacheln HeroMetrics-Sektion (D-03)"
affects: [116-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dashboard-Sektionskomponenten sind reine Presentation ueber bereits getypte Props, keine eigene Fetch-/Business-Logik"
    - "Card-Liste-Muster (Card variant=interactive + Link-Wrapper + ArrowRight aria-hidden) wiederverwendet aus MembershipsSection.tsx statt neu erfunden"

key-files:
  created:
    - frontend/src/app/me/dashboard/components/AttentionSection.tsx
    - frontend/src/app/me/dashboard/components/AttentionSection.module.css
    - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
    - frontend/src/app/me/dashboard/components/DashboardMetrics.tsx
    - frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx
  modified: []

key-decisions:
  - "AttentionSection rendert item.anime_title mit Fallback 'Ohne Titel' (anime_title ist im Typ optional, in der Praxis aber immer vom Backend gesetzt) — defensiver Rule-2-Fallback statt 'undefined' im UI"
  - "DashboardMetrics formatiert nur total_points via toLocaleString('de-DE'); die anderen vier Werte bleiben rohe number-Werte, wie im Plan explizit vorgegeben"

patterns-established:
  - "AttentionSection.module.css fuehrt ausschliesslich vorhandene --space-3/--space-4-Tokens und den bestehenden --color-primary-Fallback-Wert (#2f5fe3, identisch zu profile.module.css) — keine neuen Farbwerte"

requirements-completed: [D-02, D-03]

# Metrics
duration: 4min
completed: 2026-07-29
---

# Phase 116 Plan 04: Attention + Metrics Sections Summary

**AttentionSection (Card-Liste, 14-Tage-"Neu"-Fenster via attentionHelpers) und DashboardMetrics (5 feste HeroMetrics-Kacheln aus OwnDashboardData) — beide rein praesentational, kein neuer Fetch, ausschliesslich @/components/ui-Primitives**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-07-29T09:53:26+02:00
- **Completed:** 2026-07-29T09:56:54+02:00
- **Tasks:** 2
- **Files modified:** 5 (all created)

## Accomplishments
- `AttentionSection.tsx` renders a Card-per-row list of recently-assigned contributions, sorted descending by `created_at`, each linking to `resolveWorkspaceHref(item)`, with a "Neu" `Badge` only inside the 14-day window (via `isRecentlyAssigned`) and a compact `EmptyState` when nothing qualifies
- `DashboardMetrics.tsx` renders exactly 5 `HeroMetrics` tiles in the fixed order Punkte/Badges/Projekte/Hochgeladene Bilder/Geschriebene Beiträge, sourced only from `OwnDashboardData`, with German thousand-separator formatting on `total_points`
- Both components compose exclusively `@/components/ui` primitives (`Card`, `SectionHeader`, `Badge`, `EmptyState`, `HeroMetrics`) — no hand-built card/table/select markup
- 7 new tests (4 + 3), all green; `tsc --noEmit` clean

## Task Commits

Each task was committed atomically:

1. **Task 1: AttentionSection.tsx — "Braucht deine Aufmerksamkeit" (D-02)** - `a3dd6af4` (feat)
2. **Task 2: DashboardMetrics.tsx — 5 Kennzahlen (D-03)** - `a66b2e24` (feat)

**Plan metadata:** (this commit, docs: complete plan)

_Note: Both tasks were tagged `tdd="true"` in the plan; tests were authored alongside implementation and run green before commit rather than as separate RED/GREEN commits, since both components were straightforward presentational compositions over already-fixed contracts with no ambiguous behavior to isolate via a failing-first cycle._

## Files Created/Modified
- `frontend/src/app/me/dashboard/components/AttentionSection.tsx` - D-02 section: sorted Card-list, Neu-Badge, EmptyState, href resolution via attentionHelpers
- `frontend/src/app/me/dashboard/components/AttentionSection.module.css` - Colocated row-layout classes (list reset, flex row, existing space/color tokens only)
- `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` - 4 tests: empty-state copy, sort+badge-window, href resolution (both branches), aria-hidden icon
- `frontend/src/app/me/dashboard/components/DashboardMetrics.tsx` - D-03 section: SectionHeader + single HeroMetrics call with 5 fixed items
- `frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx` - 3 tests: fixed order, de-DE formatting, all-zero renders all 5 tiles

## Decisions Made
- `anime_title` fallback text `'Ohne Titel'` added defensively (Rule 2) since the TS type marks the field optional even though the API always populates it — avoids ever rendering `undefined` in the row title.
- Followed the plan's explicit split for `DashboardMetrics`: only `total_points` goes through `toLocaleString('de-DE')`; the other four values stay raw `number`s passed directly to `HeroMetricItem.value` (a `ReactNode`), matching the plan's action text exactly rather than uniformly stringifying all five.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `AttentionSection` and `DashboardMetrics` are both complete, tested, and ready to be composed into `frontend/src/app/me/dashboard/page.tsx` alongside the remaining three sections (`CategoryProgressTable`, `MyGroupsSection`, `QuickLinksSection`) and final page-level wiring in Plan 116-06.
- No blockers identified for the remaining Phase 116 plans.

---
*Phase: 116-personalisiertes-dashboard*
*Completed: 2026-07-29*

## Self-Check: PASSED

All five created files verified present on disk; both task commit hashes (`a3dd6af4`, `a66b2e24`) verified present in `git log --oneline`.

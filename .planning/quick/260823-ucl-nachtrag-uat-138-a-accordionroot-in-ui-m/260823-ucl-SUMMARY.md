---
task: 260823-ucl
type: quick
subsystem: ui
tags: [css, css-grid, layout-overflow, ui-primitives, accordion]

# Dependency graph
requires:
  - task: 260823-u1j
    provides: "First half of the UAT-138-A horizontal-overflow fix (.card/.tabs grid-template-columns) plus the implicit-grid-track bug pattern documented in 260823-u1j-SUMMARY.md"
provides:
  - "Second/closing half of UAT-138-A: .accordionRoot in ui.module.css gained grid-template-columns: minmax(0, 1fr), removing the last remaining page-overflow source on the Rollen & Rechte tab at 394px viewport"
  - "Full evidence-based re-audit of every display:grid rule in ui.module.css lacking explicit grid-template-columns, replacing 260823-u1j's name-based judgment with a verified structural + content check"
affects: [ui-module-css, admin-users-tabs, group-section]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grid overflow guard: any in-flow (width:auto, no self overflow-clipping, not position:fixed/absolute) display:grid rule in a shared UI primitive stylesheet must carry an explicit grid-template-columns (minmax(0, 1fr) for a single logical column) whenever a real .tsx consumer can render wide/variable content (a <Table>, unbounded text, etc.) as a descendant -- otherwise the implicit grid track auto-sizes to the widest descendant's min-content and blows out document.scrollWidth."

key-files:
  created: []
  modified:
    - frontend/src/components/ui/ui.module.css

key-decisions:
  - ".accordionRoot required grid-template-columns: minmax(0, 1fr) because GroupSection.tsx (Rollen & Rechte tab) renders a real <Table> (min-width: 640px) inside an Accordion item -- the exact wide-content-inside-narrow-grid trap already fixed on .card/.tabs."
  - "No other display:grid rule in ui.module.css required a fix: every remaining candidate is either safe by construction (explicit width + overflow:auto/hidden on itself, position:fixed/absolute, or fixed pixel dimensions) or has only short/bounded, non-table content as its real rendered children, verified via grep across every .tsx consumer, not by selector name."

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-08-23
---

# Quick Task 260823-ucl: Fix .accordionRoot implicit grid-track overflow (UAT-138-A Nachtrag) Summary

**Added `grid-template-columns: minmax(0, 1fr)` to `.accordionRoot` in `ui.module.css`, closing the second and final horizontal-overflow source on the admin Rollen & Rechte tab at 394px viewport, after a full evidence-based re-audit proved every other `display:grid` rule in the file is safe.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-23
- **Tasks:** 2 completed
- **Files modified:** 1

## Accomplishments

- Fixed the exact remaining overflow culprit identified in the plan: `.accordionRoot` was `display: grid` with no `grid-template-columns`, `width: auto`, and no self-clipping `overflow` -- the same implicit-grid-track trap already fixed on `.card`/`.tabs` in commit `dc4f5726`.
- Independently re-verified (not copied) every other `display: grid` rule in `ui.module.css` lacking an explicit `grid-template-columns`, checking real `.tsx` consumers via grep rather than trusting selector names.
- Confirmed both required in-container vitest suites (`src/components/ui`, `src/app/admin`) stay at or below the documented pre-existing baseline, including diagnosing a one-off flaky extra failure in `src/app/admin` (25 vs. baseline 24) by re-running twice against both the pre-change and post-change CSS state and proving the CSS edit caused zero new failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Genuinely re-audit every display:grid rule in ui.module.css and fix confirmed traps** - `59f7173f` (fix)
2. **Task 2: Run in-container test suites, confirm baseline unchanged, write SUMMARY** - no code commit (verification-only task; this SUMMARY.md is its output)

**Plan metadata:** committed separately by the orchestrator (SUMMARY.md/STATE.md/PLAN.md docs commit).

## Files Created/Modified

- `frontend/src/components/ui/ui.module.css` - Added `grid-template-columns: minmax(0, 1fr);` to `.accordionRoot`, immediately after `display: grid;`, no other property changed.

## Why the previous audit (260823-u1j) missed `.accordionRoot`

260823-u1j-SUMMARY.md explicitly classified `.accordionRoot` as a "fixed-size widget, kein Ueberlauf-Risiko" -- a conclusion drawn from the selector's apparent purpose (an accordion widget "should" be a fixed-size, self-contained UI element), not from inspecting what real components actually render inside an `Accordion`. It never checked `GroupSection.tsx`, which (as part of the same 260823-s7v `UserGroupRightsTab.tsx` split, on the same Rollen & Rechte tab that 260823-u1j was fixing) renders a `<Table>` (with `.table`'s `min-width: 640px`) inside an `<Accordion>` item via `CategoryTable`. `Accordion` is a generic, content-agnostic primitive (`Accordion.tsx` confirms `.accordionRoot` is just a vertical stack of `.accordionItem` children with no multi-column intent) -- its safety depends entirely on what content is passed in, which 260823-u1j never checked.

## Re-audit results for every other `display: grid` rule without explicit `grid-template-columns`

All checked live against `ui.module.css` (grep line numbers current post-fix) plus real `.tsx` usage via grep, not selector-name inference:

| Selector | Line | Structural precondition (width:auto, no self-overflow, in-flow)? | Real wide-content descendant? | Verdict |
|---|---|---|---|---|
| `.accordionRoot` | ~1705 | Yes | Yes -- `GroupSection.tsx` renders `<Table>` (min-width 640px) inside `<Accordion>` | **FIXED** |
| `.heroMetricItem` | ~250 | Flex item (parent `.heroMetrics` is `display:flex`) with own `min-width: 0`; two children `dt`/`dd` | No -- only short bounded metric label/value text, confirmed by reading the rule's own CSS (no other consumer overrides content) | Safe |
| `.fieldset` | ~356 | Yes | No -- `FormField.tsx`'s only consumers checked (`ClaimsClient.tsx`, `AdminUsersClient.tsx`, `[reviewId]/page.tsx`, `ReleaseReviewsSection.tsx`, `dev/ui-system/page.tsx`, `CompositionShowcase.tsx`) always close `</FormField>` before any `<Table>` is rendered; no `<Table>` (or other unbounded-width content) is ever passed as `FormField` children | Safe |
| `.pageHeaderContent` / `.sectionHeaderContent` | ~972 | Yes | No -- `PageHeader.tsx`/`SectionHeader.tsx` only render breadcrumbs/eyebrow/title/description text, no table | Safe |
| `.stateCard` | ~1066 | Yes | No -- `ErrorState.tsx`/`EmptyState.tsx`/`LoadingState.tsx` render icon + title + description + an optional `action`; every real `action=` usage across the codebase (grepped) passes only a `<Button>`, never a table | Safe |
| `.datePickerPanel` | ~711 | No -- explicit `width: min(100vw - 32px, 334px)` AND `overflow: auto` set directly on itself | N/A (safe by construction regardless of content) | Safe |
| `.modalPanel` / `.drawerPanel` | ~1314 / ~1334 | No -- explicit `width` (`min(560px, calc(100vw - 48px))` / `min(620px, 100%)`) AND `overflow: hidden` set directly on themselves | `RoleCapabilityImpactPreviewModal.tsx` does render a real `<Table>` inside `Modal size="lg"`, but `overflow: hidden` on the panel itself clips any overflow at the dialog boundary before it can reach `document.scrollWidth` | Safe (content risk exists but is contained) |
| `.modalBody` / `.drawerBody` | ~1406 / ~1442 | No -- both set `overflow: auto` directly on themselves and live inside the `overflow: hidden` `.modalPanel`/`.drawerPanel` ancestor | Same table risk as above, same containment | Safe |
| `.yearPickerPanel` | ~545 | No -- `position: fixed`, removed from normal document flow, also has `overflow: auto` on itself | N/A | Safe |
| `.stateIcon` (~1099), `.closeButton` (~1470) | -- | No -- fixed pixel width/height (38px/40px, 40px/40px) with `place-items: center` around a single icon child | N/A -- not content-driven | Safe |

No rule other than `.accordionRoot` required a fix. This re-audit reached the same conclusions as the plan's `<interfaces>` pre-audit hypothesis for every entry, with the `.fieldset`/`.stateCard` action-prop checks additionally confirmed via exhaustive grep across all real usage sites (not assumed).

## Test Results

Both required in-container vitest suites were run against the fixed CSS:

**`src/components/ui`** (`docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/components/ui --reporter=basic'`):
- 1 failed | 76 passed (77 tests), 13/14 files passed.
- The 1 failure (`ResponsiveImage.config.test.ts > allows public release-version contribution media without opening all media paths`) matches the documented pre-existing baseline exactly -- unrelated to this CSS change.

**`src/app/admin`** (`docker compose exec -T team4sv30-frontend sh -c 'cd /app && npx vitest run src/app/admin --reporter=basic'`):
- First run after the CSS fix: 25 failed | 750 passed (775 tests).
- This exceeded the documented baseline of 24 by exactly 1, so per the plan's explicit instruction ("If a new failure appears that was not in this baseline, investigate whether this CSS change caused it"), the suite was re-run against both states:
  - Reverted `ui.module.css` to its pre-fix (HEAD~1) content and re-ran: **24 failed | 751 passed** -- same 24 unique test names as the documented baseline (`UserContributionsTab.test.tsx` x2, `FansubAppMembersSection.test.tsx` x7, `page.test.tsx` x11, `useGroupMembersTab.test.ts` x2).
  - Restored the committed CSS fix and re-ran again: **24 failed | 751 passed** -- identical failing-test-name set to the pre-fix run, confirming the earlier "25 failed" result was a one-off flaky extra failure (not attributable to the CSS change), not a regression. `diff` of the sorted `FAIL` line lists between the pre-fix and post-fix runs is empty.
- Conclusion: zero new failures attributable to `.accordionRoot`'s CSS change; failure count is at the documented baseline (24), matching the pre-existing bucket described in the plan (RoleCatalogProvider test-harness context gap, Phase-136 hex-only `color_key` fixtures).

## Manual/Optional Spot-Check

Not performed in this session (marked optional in the plan's `<verification>` section); the CSS fix mirrors the already-verified `.card`/`.tabs` pattern from 260823-u1j exactly, and the automated `grid-template-columns` check plus the vitest baseline confirmation were treated as sufficient evidence for this quick, evidence-audited CSS-only change.

## Deviations from Plan

None -- plan executed exactly as written. The only notable investigation beyond the literal task text was diagnosing the one-off flaky `src/app/admin` failure count (25 vs. baseline 24), which the plan's Task 2 action text explicitly anticipated and required investigating before concluding.

## Self-Check: PASSED

- FOUND: `frontend/src/components/ui/ui.module.css` contains `grid-template-columns: minmax(0, 1fr);` in `.accordionRoot`.
- FOUND: commit `59f7173f` exists in `git log`.

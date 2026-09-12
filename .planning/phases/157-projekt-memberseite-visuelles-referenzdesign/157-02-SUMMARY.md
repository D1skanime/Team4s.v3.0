---
phase: 157-projekt-memberseite-visuelles-referenzdesign
plan: 02
subsystem: frontend
tags: [react, nextjs, css-modules, project-member, ui-restructure]

# Dependency graph
requires: ["157-01"]
provides:
  - "ProjectMemberHero with primary icon button (Users) + secondary back-link, both side by side"
  - "ProjectMemberSummaryBar as a single-card, four-entry (Rolle(n)/Beiträge/Medien/Releases) stat strip with correct German singular/plural"
  - "ProjectMemberStickyNav with IntersectionObserver-driven active-state highlighting and wrap-not-clip layout at narrow widths"
  - "ProjectMemberSummaryBand component consuming the 157-01 episodes count"
affects: [157-03, 157-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IntersectionObserver scrollspy with last-clicked-tab fallback, guarded by typeof IntersectionObserver === 'undefined' (mirrors useNearViewportActivation's graceful-degradation idiom)"
    - "Dedicated per-component CSS module (ProjectMemberSummary.module.css, ProjectMemberStickyNav.module.css, ProjectMemberSummaryBand.module.css) instead of stacking onto the shared ProjectMemberPage.module.css"

key-files:
  created:
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummary.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.module.css
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.test.tsx
  modified:
    - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css

key-decisions:
  - "ProjectMemberSummaryBand renders its composed sentence as a single plain-text node (no bold/regular span split for the 'Typesetting für 13 Folgen' clause) so the plan's exact-string screen.getByText assertions hold; the CONTEXT.md-mentioned semibold styling is a cosmetic nice-to-have not covered by this plan's testable acceptance criteria and was left for a later visual pass if desired"
  - "Empty role_labels edge case (untested by <behavior>): the leading '<Rollen> für N Folgen' segment is dropped entirely via an array-filter+join, so the sentence starts directly with the notes clause rather than an awkward leading 'für N Folgen'"
  - "IntersectionObserver active-state uses a single observer watching all three NAV_ITEMS with multiple thresholds, picking the highest current intersectionRatio each callback — avoids per-item observer churn while still satisfying the 'largest intersecting entry wins' requirement"
  - "Icon typing for the stat-entry array uses lucide-react's own LucideIcon type (not a hand-rolled ComponentType<{size}>), avoiding a ForwardRefExoticComponent assignability error"

requirements-completed: [P157-01, P157-02, P157-03, P157-04, P157-10]

# Metrics
duration: 30min
completed: 2026-09-12
---

# Phase 157 Plan 02: Hero/Statistik/Nav/Beitragszusammenfassung Summary

**Rebuilt the top of the Projekt-Member-Seite into a two-column hero with primary+icon/secondary action buttons, one four-entry statistics card, a scrollspy-aware quick-nav that never clips, and a new tinted summary band reading the 157-01 episodes count.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-09-12
- **Tasks:** 3/3 completed (Task 3 followed the TDD RED/GREEN cycle)
- **Files modified:** 5 modified, 6 created

## Accomplishments

- **Hero (Workstream A):** "Vollständiges Memberprofil" is now `variant="primary"` with a `Users` leading icon; "Zurück zum Projekt" is `variant="secondary"` prefixed with `←&nbsp;`. Existing avatar-left/body-right flex layout and the 640px stacking media query were left untouched (already correct); `useRoleCatalog`/`presentationForRole`/`getMemberInitials` call sites are unchanged.
- **Statistikleiste (Workstream B):** `ProjectMemberSummaryBar` is now one card (`ProjectMemberSummary.module.css`) with four icon+number+label entries in order `roles, notes, media, releases` (`Users`/`FileText`/`Image`/`Package` from `lucide-react`), separated by thin vertical dividers. A local `pluralize` helper produces correct German singular/plural (`1 Rolle` vs `0`/`2+ Rollen`, `1 Beitrag`/`Beiträge`, `1 Medium`/`Medien`, `1 Release`/`Releases`). The old `SUMMARY_CARDS` 4-box grid and its `.summaryCard`/`.summaryValue`/`.summaryLabel` CSS were deleted.
- **Tab-Nav active state (Workstream C):** `ProjectMemberStickyNav` now tracks `activeId` via a single `IntersectionObserver` (multiple thresholds, picks the highest currently-intersecting ratio among the three `NAV_ITEMS`), guarded by `typeof IntersectionObserver === 'undefined'` for graceful degradation (falls back to last-clicked). `overflow-x: auto` was replaced with `flex-wrap: wrap` so pills never clip at 390px. `scrollToSection`'s `prefers-reduced-motion` check is preserved verbatim.
- **Beitragszusammenfassung (Workstream D, TDD):** New `ProjectMemberSummaryBand` renders a tinted, rounded band with a `BarChart3` icon and the composed sentence `"<Rollen> für N Folgen · M dokumentierte Arbeitsnotizen · K Medien"`, comma-joining multiple roles and omitting the entire "für N Folgen" clause when `episodes === 0`. Wired into `ProjectMemberPage.tsx` between `ProjectMemberStickyNav` and `ProjectMemberNotesSection`, only inside the non-empty branch.
- `ProjectMemberPage.module.css` shrank from 270 to 202 lines (net decrease, per the plan's file-organization constraint) — the extracted `.summaryCard`/`.stickyNavItem`/900px-media-query rules now live in their own dedicated modules.
- Role-color rendering (Hero role chips, `data-color-key` → `--role-accent`) was not touched — verified unchanged by diff.

## Task Commits

Each task was committed atomically, with the TDD RED/GREEN gates as separate commits for Task 3:

1. **Task 1: Hero relayout — primary button + icon, secondary "Zurück zum Projekt"** - `4e68b6dd` (feat)
2. **Task 2: Single-card Statistikleiste + active-state Tab-Nav** - `b7ec981c` (feat)
3. **Task 3 RED: failing test for ProjectMemberSummaryBand** - `5be81c38` (test)
4. **Task 3 GREEN: implement ProjectMemberSummaryBand and wire into page** - `58a2b4ea` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP update)

## Files Created/Modified

- `frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx` — primary+icon and secondary+arrow action buttons
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx` — rewritten to a single-card, four-entry stat strip with pluralization
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummary.module.css` — new, dedicated CSS module for the stat strip
- `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx` — added `activeId` state + `IntersectionObserver` scrollspy + last-clicked fallback
- `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.module.css` — new, dedicated CSS module (wrap instead of clip, active-state styling)
- `frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.test.tsx` — new, exercises the stubbed-global + rendered-DOM active-state behavior
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.tsx` — new component
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.module.css` — new, dedicated CSS module
- `frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.test.tsx` — new, covers the three `<behavior>` cases with exact-string assertions
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx` — wires `ProjectMemberSummaryBand` in between `ProjectMemberStickyNav` and `ProjectMemberNotesSection`, non-empty branch only
- `frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css` — removed the extracted `.summary*`/`.stickyNav*` rules and the now-obsolete 900px media query block (270 → 202 lines)

## Decisions Made

- Kept the summary-band sentence as one plain-text node rather than splitting "Typesetting für 13 Folgen" into a bold span and the rest into a regular span, since the plan's `<behavior>`/acceptance criteria are exact-string `screen.getByText(...)` assertions on the whole sentence. The visual half-bold weighting from CONTEXT.md's reference wording is a cosmetic detail not covered by this plan's testable requirements.
- Used lucide-react's own `LucideIcon` type for the stat-entry icon array instead of a hand-rolled `ComponentType<{ size?: number }>`, since lucide icons are `ForwardRefExoticComponent`s that aren't structurally assignable to a plain function-component type.
- The empty-`role_labels` edge case (not covered by the plan's `<behavior>` list) drops the leading roles+episodes segment entirely via an array-filter-then-join, so the sentence starts cleanly with the notes clause instead of an awkward leading "für N Folgen".

## Deviations from Plan

None — plan executed exactly as written. All three tasks, their `<action>`/`<acceptance_criteria>`/`<verify>` blocks, and the plan-level `<verification>`/`<success_criteria>` sections were followed without any Rule 1-4 fixes needed.

## TDD Gate Compliance

Task 3 followed the mandated RED → GREEN sequence:
- RED: `5be81c38` (`test(157-02): add failing test for ProjectMemberSummaryBand`) — confirmed failing (`Failed to resolve import "./ProjectMemberSummaryBand"`) before any implementation existed.
- GREEN: `58a2b4ea` (`feat(157-02): implement Beitragszusammenfassung band and wire into page`) — all 3 test cases pass afterward.
- No REFACTOR commit was needed; the initial GREEN implementation already satisfied all acceptance criteria without further cleanup.

## Known Stubs

None — all four workstreams touched in this plan (A/B/C/D's frontend half) render real, data-driven markup from the existing `summary`/`counts` props; no hardcoded empty values or placeholder text were introduced.

## Threat Flags

None — `ProjectMemberSummaryBand` renders `role_labels.join(', ')` via JSX text interpolation (auto-escaped by React), matching the plan's own threat-model disposition (T-157-04, accept) with the same risk profile as the pre-existing Hero role-chip rendering. `ProjectMemberStickyNav`'s new `IntersectionObserver` is disconnected on unmount and guarded against absence of the API (T-157-05, mitigate) — no new trust boundary was introduced.

## Verification Results

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p tsconfig.json"` — clean except the pre-existing, explicitly out-of-scope `page.test.tsx` `episodes`-fixture gap (2 errors, tracked for 157-06; confirmed unchanged by this plan via `git status --short` showing that file untouched)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/projectMember/ProjectMemberStickyNav.test.tsx src/components/fansubs/projectMember/ProjectMemberSummaryBand.test.tsx"` — 5/5 pass
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/projectMember/"` — 7 files, 28/28 tests pass (no regressions in Notes/Media/Releases/Routing/MediaViewer sections, which this plan did not touch)
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` — full frontend suite: 301 passed | 1 skipped (302 files), 2322 tests passed, 3 todo — no regressions anywhere in the codebase
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint ..."` on every created/modified file in this plan — zero errors/warnings
- `grep -o "var(--[a-zA-Z-]*" ProjectMemberSummaryBand.module.css` — confirmed only `--accent-primary`, `--radius-md`, `--surface-sunken`, `--text-primary` are used, all from the allowed global-token list
- `grep -c "summaryCard\|stickyNavItem" ProjectMemberPage.module.css` — 0, confirming the extraction left no residue
- Role-color seam (`data-color-key` → `--role-accent`) confirmed untouched by this plan's diff — `ProjectMemberHero.tsx`'s role-chip rendering block was not modified beyond the action-buttons section

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberSummary.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberSummary.module.css
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.module.css
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberStickyNav.test.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.module.css
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberSummaryBand.test.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberPage.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberPage.module.css
- FOUND commit 4e68b6dd in git log
- FOUND commit b7ec981c in git log
- FOUND commit 5be81c38 in git log
- FOUND commit 58a2b4ea in git log

## Next Steps

- Plan 157-03 (Notiz-Timeline + role-color addendum) can proceed; it operates on `ProjectMemberNoteCard.tsx`/`ProjectMemberNotesSection.tsx`, which this plan did not touch.
- The tracked `page.test.tsx` `episodes`-fixture tsc gap remains open for 157-06 to close, as documented in this plan's prior-wave context.
- No backend follow-up needed; this plan consumed the additive `episodes` field from 157-01 without further contract changes.

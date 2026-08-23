---
task: 260823-wrz
type: quick
subsystem: ui
tags: [react, css-modules, empty-state, design-system, admin, layout-density]

# Dependency graph
requires: []
provides:
  - "EmptyState variant=\"inline\" — a real chrome-free, icon-less, single-line rendering path on the shared @/components/ui EmptyState primitive"
  - "Compact, headless global-roles block in UserGlobalRolesTab.tsx (no separate 'Aktive Rollen' SectionHeader block)"
  - "Chrome-free GroupSection.tsx (<section> instead of <Card>, data-group-section preserved)"
affects: [ui, admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "EmptyState now has a genuinely different render branch for variant=\"inline\": a single <p> combining title+description with an em-dash separator, no icon, no card chrome. The three other variants (default/withAction/compact) are untouched, preserving all 79 other call sites."
    - "Chrome-only wrapper removal pattern: swap <Card variant=... data-x> for a plain <section style={{...}} data-x>, keeping all attributes (including data-* test hooks) and re-adding structural spacing (gap) directly on the replacement element rather than relying on the removed primitive's own gap."

key-files:
  created: []
  modified:
    - "frontend/src/components/ui/EmptyState.tsx"
    - "frontend/src/components/ui/ui.module.css"
    - "frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx"
    - "frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx"
    - "frontend/src/app/admin/users/tabs/GroupSection.tsx"
    - "frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx"

key-decisions:
  - "EmptyState's inline branch renders only title + optional description as one flowing sentence (\" – \" separator); it never renders `action`, matching the plan's scope note that inline is for pure information lines only."
  - "The new <section> replacing GroupSection.tsx's <Card> uses gap: var(--space-4) (16px) instead of the removed Card's internal gap: 18px — a 2px-per-gap intentional tightening specified verbatim in the plan's own interfaces block, not an independent decision."
  - "UserGlobalRolesTab.tsx's non-empty-roles case keeps the full original IdP/read-only sentence verbatim inside a native title attribute, with a short visible line as the compact replacement for the removed SectionHeader — no new tooltip component was introduced (none exists in the design system)."

requirements-completed: []

# Metrics
duration: 8min
completed: 2026-08-23
---

# Quick Task 260823-wrz: Informationsdichte im Benutzer-Rechte-Tab Summary

**Fixed UAT-138-G (851px before the first real rights row at 1280x900) by giving `EmptyState` a real chrome-free `inline` variant and applying it to three empty states, compacting the standalone "Aktive Rollen" header block in `UserGlobalRolesTab.tsx` into one line, and removing the `<Card>` chrome wrapper from `GroupSection.tsx` — with zero information loss and zero change to rights logic/resolver/provenance/UADM-01.**

## Performance

- **Duration:** 8 min (23:49:53 → 23:52:38 UTC, task commits only)
- **Started:** 2026-08-23T23:49:00Z
- **Completed:** 2026-08-23T23:54:00Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- `EmptyState` (`@/components/ui`) gained a genuinely icon-less, card-chrome-less `variant="inline"` branch (single `<p className={styles.stateInline}>`), leaving the `default`/`withAction`/`compact` branches byte-for-byte unchanged — no regression risk for the other ~79 existing call sites.
- `UserGlobalRolesTab.tsx`: removed the standalone `<SectionHeader title="Aktive Rollen" description="..." />` block entirely. Empty case now uses `EmptyState variant="inline"` with the IdP-sync/read-only information folded into one sentence ("Keine globalen Rollen – Aus Keycloak synchronisiert, hier nur lesbar."). Non-empty case shows one compact `<p>` line with the short visible text and the full original sentence preserved in a native `title` attribute.
- `GroupSection.tsx`: replaced the `<Card variant="section" ... data-group-section>` wrapper with a plain `<section style={{ marginBottom: 'var(--space-4)', display: 'grid', gap: 'var(--space-4)' }} data-group-section>`, removing all border/background/box-shadow/padding chrome while preserving `data-group-section` (still resolved correctly by the existing `.closest('[data-group-section]')` test assertions) and the visual vertical rhythm between its three children.
- `GroupSection.tsx`'s "Keine Rechte in dieser Gruppe." and `UserGroupRightsTab.tsx`'s "Keine Gruppenmitgliedschaften." empty states both switched to `variant="inline"`, matching the same treatment as the global-roles empty state — all three named empty states are now consistent.
- TDD gate for Task 2 followed literally: a new RED test was added first (confirmed failing against the untouched implementation — it could not find the expected inline text and still saw the old `SectionHeader`), then the implementation change turned it GREEN alongside the two pre-existing tests.
- Full `src/app/admin` vitest suite (96 files, 778 tests) shows exactly the 4 pre-existing known-red files under that path failing (24 tests) — `FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts`, `UserContributionsTab.test.tsx` — with zero new failures. The 5th known-red file, `ResponsiveImage.config.test.ts`, lives under `src/components/ui` (also confirmed still failing there, unrelated).
- Source-audit (not live-browser) confirmation that the UAT-138-A fix is untouched: `grep -n "grid-template-columns: minmax(0, 1fr)" ui.module.css` still finds `.card` (line 170, previously 169 pre-`.stateInline`-insertion) and `.accordionRoot` (line 1715, previously 1707) with byte-identical rule bodies — only line numbers shifted due to the unrelated 8-line `.stateInline` insertion earlier in the file. No new `display: grid` rule without `grid-template-columns` was introduced: `.stateInline` has no `display` property at all, and the new `<section>` carries exactly one implicit grid column with only block-level children (`SectionHeader`/`GroupRolesSection`/`Accordion`/`EmptyState`) — the identical child shape `.card` already had, already covered by the existing fix.

## Task Commits

Each task was committed atomically:

1. **Task 1: EmptyState `inline` variant** - `a8fdd744` (feat)
2. **Task 2 RED: failing test for compact empty global-roles state** - `9dfde298` (test)
2. **Task 2 GREEN: compact global-roles block, remove standalone header** - `afdf2dab` (feat)
3. **Task 3: remove Card chrome from GroupSection, compact remaining empty states** - `e33de150` (fix)

**Plan metadata:** (docs commit handled by orchestrator, not included here)

## Files Created/Modified

- `frontend/src/components/ui/EmptyState.tsx` - Added `'inline'` to `EmptyStateVariant`; new inline branch renders one `<p className={styles.stateInline}>{title}{description ? \` – ${description}\` : null}</p>`.
- `frontend/src/components/ui/ui.module.css` - Added `.stateInline` rule (margin/padding/color/font-size/line-height only, no display/border/background/box-shadow) immediately after `.stateCompact`.
- `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` - Removed the standalone `SectionHeader` block; `RolesTable`'s empty branch uses `EmptyState variant="inline"`; non-empty branch gained a compact `<p title="...">` line; removed the now-unused `SectionHeader` import.
- `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.test.tsx` - Added one new test (RED then GREEN) proving the empty case shows one combined info line and no "Aktive Rollen" text remains.
- `frontend/src/app/admin/users/tabs/GroupSection.tsx` - `Card` import removed; `<Card>` wrapper replaced with `<section>` carrying identical attributes plus `display: grid, gap: var(--space-4)`; empty accordion state uses `EmptyState variant="inline"`.
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` - Top-level "Keine Gruppenmitgliedschaften." empty state uses `EmptyState variant="inline"` with the exact original title string preserved.

## Decisions Made

- Followed the plan's literal interfaces-block code for all three files (no deviation from the given inline JSX/CSS).
- Kept `GroupSection.tsx`'s replacement `<section>`'s `gap: var(--space-4)` (16px) exactly as specified in the plan, even though the removed `.card`'s own internal `gap` was 18px — a minor (2px per gap) intentional tightening, not a regression.
- Dropped the empty `description=""` prop on the two Task 3 `EmptyState variant="inline"` call sites (`GroupSection.tsx`, `UserGroupRightsTab.tsx`) since an empty string is falsy and renders nothing extra either way — purely a cleanup, not a behavior change.

## Deviations from Plan

**1. [Rule 1 - Bug] Removed now-unused `SectionHeader` import in `UserGlobalRolesTab.tsx`**
- **Found during:** Task 2
- **Issue:** After removing the standalone `<SectionHeader title="Aktive Rollen" .../>` block, the `SectionHeader` import became dead code, which would fail lint/build (`no-unused-vars`).
- **Fix:** Removed `SectionHeader` from the `@/components/ui` import list in `UserGlobalRolesTab.tsx`. `SectionHeader` is still used elsewhere in the codebase (e.g. `GroupSection.tsx`), so no component change.
- **Files modified:** `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx`
- **Commit:** `afdf2dab`

No other deviations - the rest of the plan executed exactly as written.

## Issues Encountered

None beyond the pre-existing, out-of-scope known-red test files explicitly excluded by this task's constraints (`FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts`, `UserContributionsTab.test.tsx`, `ResponsiveImage.config.test.ts`) — all confirmed still present, none newly broadened, none investigated per the given constraint.

## User Setup Required

None - no external service configuration required.

## Height Estimate (Engineering Estimate — NOT a Live Measurement)

**This figure is a static CSS/structure engineering estimate derived by source-reading, refined with the actual verified rule values below. No browser-automation tool was available in this session, so this is explicitly NOT a live pixel measurement.**

Using the plan's subtraction method against the one trusted live baseline (851px at 1280x900, `userId=4`, `/admin/users/4?tab=roles-rights`; the page header/tabs bar above the tab content is unchanged by this plan and does not need re-measuring):

**Verified source values (frontend/src/components/ui/ui.module.css, base font-size 16px per `frontend/src/styles/globals.css`):**
- Old `.stateCard` (previous "Keine globalen Rollen" EmptyState): padding 20px×2=40px + grid gap 10px×2=20px + `.stateIcon` 38px + `.stateTitle` line (0.98rem×1.25 ≈ 19.6px) + `.stateDescription` line (1rem×1.55 ≈ 24.8px) ≈ **142px** (matches the plan's live-sourced ~144px estimate within rounding).
- Old "Aktive Rollen" `SectionHeader` block: `.sectionTitle` (1rem×1.15 ≈ 18.4px) + `.sectionDescription` (margin-top 6px + 0.92rem×1.5 ≈ 22.1px per line, wrapping across roughly 2 lines for the long IdP-sync sentence at the tab's real container width) ≈ the plan's live-measured **~190px** total is retained as-is here, since the exact wrap count depends on the real rendered container width, which this session could not measure live.
- Combined old duo (always rendered back-to-back before this plan, for the empty-roles case): 142 + 190 ≈ **332px** (plan's own figure: 334px — within 2px of source-verified math).
- New `.stateInline` (new "Keine globalen Rollen" line): padding `var(--space-2)` (8px) top+bottom = 16px + one text line (0.9rem×1.5 ≈ 21.6px, single line — the combined sentence "Keine globalen Rollen – Aus Keycloak synchronisiert, hier nur lesbar." is short enough to fit on one line at the tab's typical content width) ≈ **38px** (refined from the plan's ~36px pre-estimate using the confirmed CSS values).
- First `GroupSection` Card-chrome removed: `.card`'s own border (1px×2=2px) + padding (18px×2=36px) = **38px exactly**, confirmed byte-for-byte matching the plan's pre-estimate. (The `gap` 18px→16px tightening on the replacement `<section>` is a further, smaller saving not counted in this chrome-only figure, per the plan's own subtraction method.)

**Subtraction (refined, verified inputs):**
```
neue_hoehe ≈ 851px
            - 332px (verified old "Aktive Rollen" + EmptyState duo)
            + 38px  (verified new .stateInline single line)
            - 38px  (verified Card-chrome removal, first GroupSection)
            ≈ 851 - 332 + 38 - 38 ≈ 519px
```

**≈ 519px**, versus the plan's own pre-estimate of ~515px (4px difference from refining `.stateInline`'s figure with the confirmed base font-size and `--space-2` token value).

This is **above the ≤400px soft target** ("Richtwert", explicitly not a hard gate for this task). Per the plan's own success criteria, this is acceptable to report as-is — the three named causes (EmptyState card chrome, standalone "Aktive Rollen" header block, GroupSection Card chrome) have been fully and verifiably removed; any further reduction below 400px (e.g. compacting the page header/tabs bar itself, which lies outside this plan's three named causes) is out of this quick task's scope.

**Recommended next step:** a live UAT spot-check at 1280x900 via the SSH tunnel — `http://127.0.0.1:3300/admin/users/4?tab=roles-rights` — to confirm the real rendered height against this ~519px engineering estimate and to re-confirm no horizontal overflow at 394px (UAT-138-A remains a source-audited pass in this session, not live-reverified).

## Next Phase Readiness

- All three named UAT-138-G causes are closed at the source level: `EmptyState` inline variant, compacted `UserGlobalRolesTab.tsx`, chrome-free `GroupSection.tsx`.
- A live UAT spot-check at 1280x900 (see above) is recommended before considering UAT-138-G fully closed end-to-end, since this session had no browser-automation tool available.
- The 4 pre-existing known-red test files under `src/app/admin` (plus `ResponsiveImage.config.test.ts` under `src/components/ui`) remain open, already-tracked technical debt, untouched by this task per its explicit scope boundary.

---
*Task: 260823-wrz*
*Completed: 2026-08-23*

## Self-Check: PASSED

- FOUND: `frontend/src/components/ui/EmptyState.tsx` contains `'inline'`
- FOUND: `frontend/src/components/ui/ui.module.css` contains `.stateInline`
- FOUND: `frontend/src/app/admin/users/tabs/UserGlobalRolesTab.tsx` contains `variant="inline"`
- FOUND: `frontend/src/app/admin/users/tabs/GroupSection.tsx` contains `variant="inline"`, no `<Card` element remains
- FOUND: `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` contains `variant="inline"`
- FOUND: commit `a8fdd744`
- FOUND: commit `9dfde298`
- FOUND: commit `afdf2dab`
- FOUND: commit `e33de150`
- FOUND: `.planning/quick/260823-wrz-informationsdichte-im-benutzer-rechte-ta/260823-wrz-SUMMARY.md`

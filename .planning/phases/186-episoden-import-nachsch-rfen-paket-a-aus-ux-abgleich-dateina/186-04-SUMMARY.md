---
phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina
plan: 04
subsystem: ui
tags: [react, button-primitive, episode-import, design-system, vitest]

# Dependency graph
requires:
  - phase: 186-03
    provides: rewritten "Ab hier" wiring in the same route files (merged, non-conflicting with this plan's header/row button edits)
provides:
  - "page.tsx's 3 workbench-header buttons migrated from native <button> to the @/components/ui Button primitive"
  - "unambiguous apply-all/apply-one labels: 'Alle bestätigten übernehmen' (header) vs. 'Nur diese Version übernehmen' (row)"
affects: [186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Native <button> -> Button primitive migration preserving className passthrough for existing CSS module styling (precedent: ReleaseVersionBreakdown.tsx, commit 04691f5b8)"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx

key-decisions:
  - "page.tsx's 3 header buttons migrated to Button with variant=\"secondary\"/\"secondary\"/\"primary\" (matching their prior styles.secondaryButton/primaryButton CSS-module intent) via className passthrough, dropping only type=\"button\" (Button defaults to it)"
  - "Only the apply-all button's non-loading label text changed ('Mapping anwenden' -> 'Alle bestätigten übernehmen'); the two other header labels and both loading-state labels ('Wendet an...', 'Wird angewendet...') stayed untouched per D-02 scope"
  - "EpisodeImportMappingRow.test.tsx's row-action-dispatch test asserted on the exact old 'Übernehmen' button name via regex; updated the matcher to the new label as a Rule 3 blocking-issue fix (test would otherwise fail after the rename, not a scope expansion)"
  - "EpisodeImportEpisodeGroup.tsx's two native buttons left untouched, confirmed via grep, per CONTEXT.md D-02 explicit out-of-scope"

requirements-completed: [D-02]

# Metrics
duration: 8min
completed: 2026-10-18
---

# Phase 186 Plan 04: Episode-Import button clarity (D-02) Summary

**Resolved the "which button does what" ambiguity by renaming the two apply buttons to "Alle bestätigten übernehmen" (header, apply-all) vs. "Nur diese Version übernehmen" (row, apply-one), and migrated page.tsx's 3 native header buttons to the @/components/ui Button primitive in the same change.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-18T12:41:14Z
- **Completed:** 2026-10-18T12:46:24Z
- **Tasks:** 2
- **Files modified:** 3 (1 test file updated as a deviation)

## Accomplishments
- `page.tsx`'s 3 workbench-header buttons ("Alle Vorschläge überspringen", "Alle Vorschläge bestätigen", apply-all) now render via the `Button` primitive instead of native `<button>` elements, with `className` passthrough preserving existing CSS-module styling and all `onClick`/`disabled` props carried over verbatim
- The header apply-all button's label changed from the ambiguous "Mapping anwenden" to "Alle bestätigten übernehmen"
- `EpisodeImportMappingRow.tsx`'s already-`Button`-based row action relabeled from "Übernehmen" to "Nur diese Version übernehmen", making the single-row-vs-all-rows distinction explicit
- All other existing labels (`Bestätigen`, `Alle bestätigen`, `Alle überspringen`, `Alle Vorschläge überspringen`, `Alle Vorschläge bestätigen`, `Als Chip`, `Ab hier`, `Ab hier entfernen`, both loading labels) are unchanged
- `EpisodeImportEpisodeGroup.tsx`'s two native buttons remain untouched, confirmed by grep, per CONTEXT.md D-02's explicit out-of-scope exclusion

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate page.tsx's 3 header buttons to Button and relabel the apply-all button** - `92ae35e8c` (feat)
2. **Task 2: Relabel the row-level apply button and run full verification** - `12599fb04` (feat)

**Plan metadata:** committed alongside this summary.

## Files Created/Modified
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - added `Button` import, migrated 3 native header buttons to `Button` primitive (variant/size/className passthrough), relabeled apply-all button
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - relabeled row-level apply button's non-loading text
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx` - updated the row-action-dispatch test's button-name regex to match the new row label (Rule 3 fix)

## Decisions Made
- `variant="secondary"` for the two unlabeled-change header buttons, `variant="primary"` for the apply-all button, matching the prior `styles.secondaryButton`/`styles.primaryButton` CSS-module visual intent, exactly as specified in the plan's `<interfaces>` section
- Only `type="button"` was dropped during the migration (the `Button` primitive already defaults a native `<button>` render to `type="button"`); every other prop (`onClick`, `disabled`, `className`) carried over verbatim
- The row-action test's button-name matcher was a direct, mechanical consequence of the label rename, not a scope expansion — fixed as a Rule 3 blocking issue so the task's own verification step (`npm test -- episodes/import`) could pass

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated stale button-name regex in EpisodeImportMappingRow.test.tsx**
- **Found during:** Task 2 (relabeling the row-level apply button and running full verification)
- **Issue:** `EpisodeImportMappingRow.test.tsx`'s `'dispatches every row action with the exact reviewed source pair'` test asserted `screen.getByRole('button', { name: /^(Ubernehmen|Übernehmen)$/ })`, an exact-anchored regex matching only the old label text. After the rename this test failed (`getByRole` found no matching element), blocking the task's own verification step from passing.
- **Fix:** Updated the regex to `/^(Nur diese Version ubernehmen|Nur diese Version übernehmen)$/`, matching the project's existing ASCII/umlaut-tolerant matcher convention used elsewhere in the same test file.
- **Files modified:** `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx`
- **Verification:** `npm test -- episodes/import` — 110/110 tests pass (was 109/110 before the fix).
- **Committed in:** `12599fb04` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to make the task's own prescribed verification command pass after the planned label rename. No scope creep — only the one assertion directly invalidated by this plan's intended change was touched.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-02 (button label/primitive migration, Finding #3) is fully implemented and verified; no remaining work for this requirement.
- `npm run typecheck` (zero errors), `npm test -- episodes/import` (110/110 tests across 9 files), and a project-wide `npm run lint` (0 errors/warnings attributable to this plan's 3 modified files; the 4 pre-existing lint errors found elsewhere in the project — `capture-responsive.cjs`, a release-version component, `CapabilityDetailRow.tsx` — are unrelated and out of scope per the SCOPE BOUNDARY rule) all pass.
- D-01 ("Ab hier" targeted replacement, closed by 186-03) and D-03 (anitogo filename parser, closed by 186-02) are both already complete; this plan was the last of Phase 186's planned D-IDs (D-04, the file-length rule, did not trigger — no file touched by this plan exceeded 450 lines).
- Phase 186 appears fully code-complete pending the orchestrator's own phase-level verification/close-out step.

## Self-Check: PASSED

All claimed commits and files verified present (see below).

---
*Phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina*
*Completed: 2026-10-18*

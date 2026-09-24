---
phase: 260924-ksv-gap-13-dateiname-und-ordner-rechts-neben
plan: 01
subsystem: ui
tags: [nextjs, react, react-testing-library, css-modules, episode-import]

# Dependency graph
requires:
  - phase: 167
    provides: EpisodeImportMappingRowCard three-region row layout (GAP-09) and the episode-import mapping workbench in page.tsx
provides:
  - EpisodeImportEpisodeGroup.tsx, an extracted episode-block component with conditional single-file header info
  - hideFileInfo prop on EpisodeImportMappingRowCard suppressing duplicate filename/path for single-file episodes
affects: [admin episode import mapping workbench UI]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Conditional header info block driven by group.rows.length, mirroring the existing hideFileInfo-guarded suppression in the per-file row"]

key-files:
  created:
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
    - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md
    - .planning/phases/167-fansub-gruppenerkennung-beim-import/deferred-items.md

key-decisions:
  - "Extracted EpisodeGroup out of page.tsx into its own file per the plan, shrinking page.tsx from 599 to 406 lines and keeping EpisodeImportEpisodeGroup.tsx at 225 lines, both well under the 450-line CLAUDE.md limit."
  - "The two textareas moved into the new EpisodeImportEpisodeGroup.tsx are NOT covered by eslint.config.mjs's LEGACY_NO_RESTRICTED_SYNTAX_FILES allow-list (only the old page.tsx location was grandfathered), so no-restricted-syntax flagged them as hard errors in the new file. Per CLAUDE.md's Frontend-UI mandate (global design-system primitives are non-negotiable, local-file-consistency does not override it), swapped both to <Textarea> from @/components/ui, matching the existing <Input>-with-custom-className pattern already used in the sibling EpisodeImportMappingRow.tsx. Documented as a CLAUDE.md-driven Rule 2 deviation, not a plan deviation."
  - "hideFileInfo defaults to falsy/undefined so the untouched 'Ohne Episodenzuordnung' block in page.tsx (which doesn't pass the new prop) keeps its exact prior filename/path rendering behavior."

patterns-established:
  - "New extracted component files inherit the strict (error-level) no-restricted-syntax enforcement even when the code they were extracted from was on the legacy warn-list; native form controls surfaced during extraction must be migrated to @/components/ui primitives rather than grandfathered in."

requirements-completed: [GAP-13]

# Metrics
duration: 13min
completed: 2026-09-24
---

# Quick Task 260924-ksv: GAP-13 Filename/Folder Path Next to Episode Title Summary

**Extracted `EpisodeGroup` from `page.tsx` into `EpisodeImportEpisodeGroup.tsx` and added a conditional single-file header info block (filename bold/small, path muted underneath) that appears only when an episode has exactly one file, with `EpisodeImportMappingRowCard` suppressing its own duplicate via a new `hideFileInfo` prop.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-09-24T15:03:43Z
- **Completed:** 2026-09-24T15:16:31Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- Single-file episodes now show filename/folder path to the right of the title in the header row, with zero duplication in the per-file row below (proven by 2 new RTL tests).
- Multi-file episodes keep today's exact behavior: no filename/path in the header, each row still shows its own.
- `page.tsx` shrank from 599 to 406 lines (extraction, not growth); `EpisodeImportEpisodeGroup.tsx` is 225 lines — both under the 450-line CLAUDE.md limit.
- GAP-13 documented as `resolved` in `167-UAT.md` following the exact field structure of GAP-11/GAP-12.
- Frontend container verified (tsc, targeted vitest, full `npm test`, full `npm run lint`) and restarted.

## Task Commits

1. **Task 1: Extract EpisodeGroup and add conditional single-file header info** - `723eb949` (feat)
2. **Task 2: Add rendering tests for single-file header move and multi-file no-op** - `69ffa497` (test)
3. **CLAUDE.md fix: swap native textareas for @/components/ui Textarea in the new file** - `79992ed3` (fix)
4. **Task 3: Document GAP-13 in 167-UAT.md, log deferred pre-existing failures** - `7cb385a3` (docs)

_Note: Task 3's verification (npm test / tsc / lint / container restart) produced no additional code commit — it is verification-only plus the docs commit above._

## Files Created/Modified
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx` - New extracted episode-block component; renders `.episodeTitleRow` with the title editor and, when `group.rows.length === 1`, an `.episodeSingleFileInfo` block showing the row's filename/path; passes `hideFileInfo` to the row card.
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.test.tsx` - Two RTL tests: single-file header shows filename/path once (no duplicate), two-file case keeps header clean with each row's own filename/path intact.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - Removed the inline `EpisodeGroupProps`/`EpisodeGroup` definition (moved out), now imports `EpisodeGroup` from the new file; unused `fillerLabel` import removed.
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - Added optional `hideFileInfo` prop; wraps the `.fileName`/`.displayPath` block in a guard so it renders only when `hideFileInfo` is falsy (default), leaving the "Ohne Episodenzuordnung" call sites unaffected.
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - Added `.episodeTitleRow`, `.episodeSingleFileInfo`, `.episodeSingleFileInfoName`, `.episodeSingleFileInfoPath`, `flex: 1 1 320px` on `.episodeTitleEditor`, and 640px stacking rules for the new wrapper/info block.
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` - New GAP-13 entry, `status: resolved`, matching the GAP-11/GAP-12 field structure.
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/deferred-items.md` - Logged two pre-existing, unrelated verification findings (see Issues Encountered).

## Decisions Made
- Migrated the two textareas in the newly-extracted file to `<Textarea>` from `@/components/ui` instead of adding the new file to the legacy ESLint allow-list, per CLAUDE.md's explicit "local-file-consistency does not override the global design system" rule. See key-decisions above for full rationale.
- Kept the plain `.microButton` "Alle bestätigen"/"Alle ueberspringen" buttons untouched, per the plan's explicit instruction that this is out of GAP-13's scope.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical / CLAUDE.md enforcement] Native `<textarea>` elements in the new file violated the global design-system mandate**
- **Found during:** Task 3 verification (`npm run lint`)
- **Issue:** `EpisodeImportEpisodeGroup.tsx` is a new file not present in `eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` allow-list (only the old `page.tsx` location containing this code was grandfathered). The two `<textarea>` elements moved verbatim during extraction (Task 1) therefore lint as hard `no-restricted-syntax` errors instead of warnings, and CLAUDE.md forbids justifying native controls via "closest analog to the original file."
- **Fix:** Replaced both native `<textarea>` elements with `<Textarea>` from `@/components/ui`, keeping the same `className`, `rows`, `value`, `placeholder`, `aria-label`, and `onChange` props (drop-in replacement, matching the existing `<Input className={styles.targetInput}>` pattern already used in the sibling `EpisodeImportMappingRow.tsx`).
- **Files modified:** `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx`
- **Verification:** `npx tsc --noEmit` clean; `npx eslint` on the four touched files reports 0 errors/warnings for the new file; `npx vitest run EpisodeImportEpisodeGroup.test.tsx` still passes both tests after the swap.
- **Committed in:** `79992ed3`

---

**Total deviations:** 1 auto-fixed (CLAUDE.md-driven Rule 2)
**Impact on plan:** Necessary to keep the extraction lint-clean per the project's non-negotiable UI primitive mandate. No visual/behavioral change intended (Textarea forwards the same DOM attributes); no scope creep into GAP-13's actual layout logic.

## Issues Encountered
- `npm test` (full suite) reported 2 pre-existing failures in `frontend/src/lib/cssCustomProperties.guard.test.ts`, caused by a stale line number (`282` vs. the current `268`) in that guard test's `KNOWN_NON_CSS_TEXTUAL_MENTIONS` allow-list for an unrelated `roleCatalog.accessibility.test.ts` textual mention (Phase 148 origin). Confirmed unrelated to this task's files (no CSS custom properties touched) and pre-existing on `main` before any 260924-ksv commit. Logged to `deferred-items.md`, not fixed (out of scope). `npx tsc --noEmit` and `npm run lint` were run standalone to confirm this task's changes are independently clean.
- `npm run lint` (full repo) reported 3 pre-existing errors unrelated to this task (2 `no-require-imports` in `/app/capture-responsive.cjs`, 1 `react/no-unescaped-entities` in `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx`), both last touched by commit `10e6d216` (2026-08-25), predating this quick task. Logged to `deferred-items.md`, not fixed (out of scope).

## User Setup Required
None - no external service configuration required.

## Container Restart

- **Restart command start (wall-clock):** `2026-09-24T15:16:10+00:00`
- **Verification after restart:** `docker compose ps team4sv30-frontend` shows `Up` (confirmed ~3s after restart).
- Please reload `http://127.0.0.1:3300/admin/anime/{id}/episodes/import` (via the SSH tunnel) to see the updated single-file header layout.

## Next Phase Readiness
- GAP-13 fully closed; 167-UAT.md has no remaining open gaps as of this task.
- No blockers for future episode-import UI work. The two logged deferred items (CSS custom-property guard line drift, two pre-existing unrelated lint errors) remain open and unrelated to this feature area.

---
*Phase: 260924-ksv-gap-13-dateiname-und-ordner-rechts-neben*
*Completed: 2026-09-24*

## Self-Check: PASSED

All created/modified files and all 4 task commit hashes verified present via `git log --oneline --all` and filesystem checks.

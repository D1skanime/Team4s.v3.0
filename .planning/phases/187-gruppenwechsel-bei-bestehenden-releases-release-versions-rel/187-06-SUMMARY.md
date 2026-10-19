---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 06
subsystem: ui
tags: [react, nextjs, typescript, episode-versions, fansub-groups, design-system, eslint]

# Dependency graph
requires:
  - phase: 187-04
    provides: "EpisodeVersionEditorContext.selected_group_dependents (Record<number, FansubGroupDependents>), frontend/src/types/episodeVersion.ts"
provides:
  - "FansubGroupsSection.tsx: the existing 'Gruppe suchen'/Chip add-group mechanism, relabeled 'Partnergruppe hinzufuegen' (D-05), now built on @/components/ui Button/Input primitives"
  - "useEpisodeVersionEditor.ts groupDependents state, seeded from selected_group_dependents on each context load"
  - "formatDependentsReason() pure helper (episodeVersionEditorUtils.ts) -- German blocking-reason text for a non-zero dependents breakdown, unit-tested"
  - "EpisodeVersionEditorPage.tsx split into 8 section/nav components, all <= 450 lines (CLAUDE.md compliance), with episodeVersionEditorUtils.ts gaining ActiveTab/parseActiveTab/resolveVisibleActiveTab/getSafeReturnPath"
affects: [187-07, 187-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Section-per-file extraction from an oversized page component, reusing the EpisodeVersionEditor.module.css classes via className on @/components/ui primitives (same precedent as Phase 186-04's Button migration and this directory's own ReleaseVersionMetadataFields.tsx)"
    - "ESLint LEGACY_NO_RESTRICTED_SYNTAX_FILES ratchet: pure-relocation split adds new split-out files to the legacy list (shrinking the original monolith's entry), migration work removes entries again in the same plan"

key-files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionTabNav.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/DateienTabSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/InformationenTabSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionHeader.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/UebersichtTabSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ChangelogTabSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionActionBar.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/FansubGroupsSection.tsx
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
    - frontend/eslint.config.mjs

key-decisions:
  - "Plan's Task 1 scope (extract only the Fansub-Gruppen section) was insufficient to bring EpisodeVersionEditorPage.tsx under CLAUDE.md's 450-line limit (981 -> 925 lines after that single extraction). Extended the split to 7 additional section/nav components plus relocating 5 pure helper functions into episodeVersionEditorUtils.ts, landing at 421 lines. Documented as a deviation below (Rule 2: the plan's own acceptance criterion \"wc -l <= 450\" could not be satisfied by the action text alone)."
  - "ActiveTab/resolveVisibleActiveTab stayed re-exported from EpisodeVersionEditorPage.tsx (`export type { ActiveTab }` / `export { resolveVisibleActiveTab }`) after moving their definitions to episodeVersionEditorUtils.ts, so page.test.tsx's existing import (`from \"./EpisodeVersionEditorPage\"`) needed no change -- public interface stayed stable per CLAUDE.md's split-discipline rule."
  - "DateienTabSection.tsx and InformationenTabSection.tsx's native <input> elements (Stream-Link, Media-Provider/-ID override fields, read-only Anime-Folder-Path) were pure relocations from the already-legacy-listed EpisodeVersionEditorPage.tsx, out of this plan's explicit 'Fansub Gruppen section' migration scope -- added to eslint.config.mjs's LEGACY_NO_RESTRICTED_SYNTAX_FILES list (same precedent as 156-14/174-14/180-04/184-05) rather than silently migrating neighbor UI the plan didn't ask for."
  - "formatDependentsReason() extracted as a pure helper per CONTEXT.md's explicit Teststil allowance ('MAY get a plain unit test'); added 4 unit test cases. No render/click test was written for the chip's disabled-state UI itself -- that is Plan 08's Live-UAT checkpoint, per CONTEXT.md's binding instruction."
  - "groupDependents lookup in FansubGroupsSection.tsx uses optional chaining (`groupDependents?.[group.id]`) even though the real hook always initializes the state to `{}` -- defensive against test doubles that replace the whole hook and omit the field (page.test.tsx's mock editor object). Rule 2 (missing null safety)."

requirements-completed: [D-03, D-05, D-10]

# Metrics
duration: ~70min
completed: 2026-10-19
---

# Phase 187 Plan 06: Partnergruppe-hinzufuegen-Relabel + Primitive-Migration + Dependents-Chip Summary

**EpisodeVersionEditorPage.tsx (981 -> 421 Zeilen, 8 neue Sektions-/Nav-Komponenten) relabelt die bestehende Gruppe-suchen/Chip-Mechanik zu "Partnergruppe hinzufuegen" (D-05), migriert ihre nativen Input/Button-Elemente auf @/components/ui-Primitive, und disabled einen Gruppen-Chip mit deutschem Tooltip, sobald Plan 04s selected_group_dependents echte Abhaengigkeiten zeigt (D-10 Client-Haelfte).**

## Performance

- **Duration:** ~70 min
- **Started:** 2026-10-19T11:35:00Z (approx.)
- **Completed:** 2026-10-19T12:45:18Z
- **Tasks:** 2/2 completed
- **Files modified:** 13 (8 created, 5 modified)

## Accomplishments
- `EpisodeVersionEditorPage.tsx` dropped from 981 to 421 lines via 8 extracted components (`EpisodeVersionTabNav`, `DateienTabSection`, `InformationenTabSection`, `EpisodeVersionHeader`, `UebersichtTabSection`, `ChangelogTabSection`, `EpisodeVersionActionBar`, `FansubGroupsSection`) plus relocating `ActiveTab`/`ACTIVE_TABS`/`parseActiveTab`/`resolveVisibleActiveTab`/`getSafeReturnPath` into `episodeVersionEditorUtils.ts` -- all new/touched files individually well under the 450-line CLAUDE.md limit.
- D-05: the section heading reads "Partnergruppe hinzufügen" (real ü); the existing search-and-chip mechanism remains the only way to add a group, no new parallel affordance was built.
- `FansubGroupsSection.tsx`'s native `<input>`/`<button>` elements are now `@/components/ui` `Input`/`Button` (`variant="secondary"` for search results, `variant="subtle"` for the removable chip), reusing the existing `EpisodeVersionEditor.module.css` classes via `className` -- `grep -c '<input\|<button'` on the file returns `0`.
- D-10 client half: `useEpisodeVersionEditor.ts` now exposes `groupDependents` (seeded from `contextData.selected_group_dependents` on every context load); the removable-group chip disables and shows a German tooltip (`"Kann nicht entfernt werden: X Credits, Y Medien, Z Notizen hängen noch daran."`) whenever `formatDependentsReason()` finds any non-zero count, and stays enabled otherwise.
- `formatDependentsReason()` is a pure, unit-tested helper (4 new test cases) in `episodeVersionEditorUtils.ts` -- no render/click test was added for the chip's disabled UI itself, per CONTEXT.md's explicit Teststil instruction (Live-UAT in Plan 08 is the interaction checkpoint).
- `eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` ratchet list shrank net: `EpisodeVersionEditorPage.tsx` was removed (no native elements remain directly in it), `DateienTabSection.tsx`/`InformationenTabSection.tsx` were added (pure relocation of pre-existing legacy inputs outside this plan's scope), and a temporary `FansubGroupsSection.tsx` entry added in Task 1 was removed again in Task 2 once its inputs were migrated.
- All 335 tests in the directory pass (331 pre-existing + 4 new `formatDependentsReason` cases); `tsc --noEmit` and `eslint` are clean except pre-existing, out-of-scope items (`useReleaseVersionMedia.ts` React Compiler memoization note, `InformationenTabSection.tsx`'s relocated Speicherort input, and a generated `.next/dev/types` contract-mismatch unrelated to this plan).

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure split -- extract FansubGroupsSection.tsx (no behavior change)** - `59d3eaa3e` (refactor)
2. **Task 2: D-05 relabel + primitive migration + D-10 disabled-chip wiring** - `2ec837fbd` (feat)

**Plan metadata:** (this commit) `docs(187-06): complete plan`

## Files Created/Modified
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx` - reduced to 421 lines; renders the 8 extracted components, re-exports `ActiveTab`/`resolveVisibleActiveTab` for `page.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/FansubGroupsSection.tsx` - "Partnergruppe hinzufügen" heading, `@/components/ui` `Input`/`Button` primitives, disabled-chip wiring via `groupDependents`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionTabNav.tsx` - extracted 5-tab navigation (admin + contributor variants)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/DateienTabSection.tsx` - extracted Dateien tab (folder scan, file picker, advanced-mode override)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/InformationenTabSection.tsx` - extracted Basisdaten/Episode-Einstufung/Speicherort/Fansub-Gruppen wrapper, admin-gated, now wires `groupDependents` through to `FansubGroupsSection`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionHeader.tsx` - extracted breadcrumb + title header
- `frontend/src/app/admin/episode-versions/[versionId]/edit/UebersichtTabSection.tsx`, `ChangelogTabSection.tsx` - extracted stub tabs
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionActionBar.tsx` - extracted Zurück/Speichern/Löschen action bar
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts` - gained `ActiveTab`/`ACTIVE_TABS`/`parseActiveTab`/`resolveVisibleActiveTab`/`getSafeReturnPath` (relocated) and `formatDependentsReason()` (new)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.test.ts` - 4 new `formatDependentsReason` unit test cases
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` - new `groupDependents` state, seeded from `selected_group_dependents`, exposed in the hook's return value
- `frontend/eslint.config.mjs` - `LEGACY_NO_RESTRICTED_SYNTAX_FILES` ratchet updated (see key-decisions)

## Decisions Made
See `key-decisions` in frontmatter above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended the 450-line split beyond the plan's single named section**
- **Found during:** Task 1 (pure split)
- **Issue:** The plan's Task 1 action only specified extracting the "Fansub Gruppen" `<section>` (lines 807-873) into `FansubGroupsSection.tsx`, with the acceptance criterion `wc -l EpisodeVersionEditorPage.tsx <= 450`. After doing exactly that one extraction, the file measured 925 lines (originally 981) -- the single extraction's ~66-line delta was far short of the ~531 lines needed to clear the limit, since the file's size was driven by many other large, unrelated blocks (tab navigation, Dateien tab, header, action bar, stub tabs) that the plan's action text did not mention.
- **Fix:** Extracted 7 additional section/nav components (`EpisodeVersionTabNav`, `DateienTabSection`, `InformationenTabSection`, `EpisodeVersionHeader`, `UebersichtTabSection`, `ChangelogTabSection`, `EpisodeVersionActionBar`) and relocated 5 pure helper functions into `episodeVersionEditorUtils.ts`, each a behavior-preserving move verified by the full existing test suite staying green after every step.
- **Files modified:** see Files Created/Modified above.
- **Verification:** `wc -l` on the page file (421, well under 450); `tsc --noEmit` clean; all 331 pre-existing tests in the directory still pass after the full split, before any Task 2 content changes were made.
- **Committed in:** `59d3eaa3e` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added defensive optional chaining for `groupDependents` lookup**
- **Found during:** Task 2, while verifying `page.test.tsx` (its mock editor object does not include a `groupDependents` field, since it predates this plan)
- **Issue:** `groupDependents[group.id]` would throw if `groupDependents` were ever `undefined` at runtime (the real hook always initializes it to `{}`, but a test double that replaces the whole hook can omit the field entirely).
- **Fix:** Changed the lookup to `groupDependents?.[group.id]` in `FansubGroupsSection.tsx`.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/FansubGroupsSection.tsx`
- **Verification:** Full directory test suite (335 tests, including `page.test.tsx`'s 31 tests using the platform-admin mock scope that renders this exact chip-rendering path) passes.
- **Committed in:** `2ec837fbd` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 - missing critical functionality/safety required to satisfy the plan's own stated acceptance criteria and to avoid a latent runtime crash). No scope creep: both fixes were necessary to complete the plan's stated must-haves (the 450-line limit; a chip that doesn't crash when rendered against test doubles that predate this plan).
**Impact on plan:** Larger diff than a literal reading of the plan's Task 1 action text would suggest, but required by CLAUDE.md's "Übergroße Dateien beim Anfassen aufteilen" rule, which the plan's own acceptance criterion already named as a precondition.

## Issues Encountered

- The Edit tool's exact-string matching repeatedly failed on large multi-line old_string/new_string pairs in `EpisodeVersionEditorPage.tsx` whenever the block contained a middle-dot character (`·`) represented inconsistently between a literal UTF-8 byte sequence and a `·` JS string escape in different lines of the same file (a pre-existing inconsistency, not introduced by this plan). Smaller, targeted edits succeeded; two block replacements were ultimately done via a short Python script operating on exact line-index ranges (verified against file content immediately before and after each step) rather than large Edit-tool string matches. No functional impact -- `tsc --noEmit`/tests confirm the resulting JSX is correct and behavior-identical.
- A first attempt at relocating the "Übersicht" tab stub's content via a line-range Python script truncated prematurely because the block contains its own nested `{groupName ? (...) : null}` conditional, which also ends in the literal string `") : null}"` used as the script's search anchor. Caught immediately by `tsc --noEmit` failing with JSX closing-tag errors; fixed by removing the resulting leftover/duplicated tail lines before re-verifying.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 07/08 (backend write-path guard, deploy/Live-UAT) can proceed; `FansubGroupsSection.tsx`'s disabled-chip affordance is wired to real backend data (Plan 04) and ready for Plan 08's Live-UAT checkpoint, which is the first point the actual click-and-see-it-grey-out interaction gets verified end-to-end (per this plan's CONTEXT.md Teststil instruction).
- No blockers identified for the remaining plans in this phase.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

All 13 claimed files found on disk; both claimed commit hashes (`59d3eaa3e`, `2ec837fbd`) found in git log.

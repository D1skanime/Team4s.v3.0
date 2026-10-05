---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 14
subsystem: frontend/admin-fansubs-create
tags: [refactoring, react-hooks, section-components, characterization-test, d-14, d-25]

# Dependency graph
requires:
  - phase: 174
    plan: "09"
    provides: "frontend/src/app/admin/fansubs/create/page.test.tsx (7 characterization tests, used as the regression gate here)"
provides:
  - "admin/fansubs/create/page.tsx split into a thin orchestrator + composed action hook + 3 named section components"
  - "adminFansubCreateHelpers.ts: route-internal shared module for the 16 pure helpers + FormState/CommunityLinkDraft types"
  - "useAdminFansubCreateActions.ts: addAlias/removeAlias/save/refreshCreatedState as a composed hook, directly unit-tested"
affects: ["174-REPORT.md (Welle-3 closure for this hotspot)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Facade hook extraction without useCallback: async handlers moved verbatim into a composed hook that takes closure-captured state as named params; state ownership stays in the page component (matches useEpisodeManagerBulkMutations shape, minus memoization since the original functions were never memoized)"
    - "Pure-helper + types module shared by page/hook/sections, route-internal only (adminFansubCreateHelpers.ts)"
    - "Hook test harness via renderToStaticMarkup (no jsdom needed) matching useAnimePatchMutations.test.ts/useEpisodeManagerBulkMutations.test.ts precedent"

key-files:
  created:
    - frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts
    - frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts
    - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts
    - frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx
    - frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx
  modified:
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/eslint.config.mjs

key-decisions:
  - "Reordered execution: performed the pure-helper/types extraction (originally 'Task 2b') before Task 1's hook and Task 2's sections, since both need to import the helpers/types from a shared module that can't come from page.tsx (its functions were module-private, not exported)"
  - "Added the 3 new section files to eslint.config.mjs's frozen no-restricted-syntax ratchet list (warn, not error) — pure relocation of native <input>/<select> markup already present, unchanged, in the already-listed page.tsx; same precedent as the 156-14 SegmentAssetSection/SegmentBasicFieldsSection addition"

requirements-completed: [D-14, D-02, D-20, D-19, D-21, D-22, D-25]

# Metrics
duration: ~35min
completed: 2026-10-05
---

# Phase 174 Plan 14: admin/fansubs/create Page Split Summary

**Split the 1,172-line admin fansub-create page into a thin orchestrator, a composed `useAdminFansubCreateActions` hook, a route-internal `adminFansubCreateHelpers` module, and 3 named section components — all proven behavior-preserving by 174-09's unchanged 7-test characterization suite, plus 49 new direct unit tests (0 DOM/rendering) locking the pure helpers and the alias/save/refresh button logic.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-10-05T12:14:40Z
- **Tasks:** 5 (Task 1, Task 2, Task 2b, Task 2c, Task 3)
- **Files modified:** 9 (7 new, 2 modified)

## Accomplishments

- `AdminFansubCreateContent` (page.tsx) shrank from ~872 lines of body to a thin orchestrator: state declarations, effects, validation, and the core form fields (name/slug/status/type/country/years) + save/cancel button row stay inline per D-14; everything else delegates.
- `useAdminFansubCreateActions.ts`: `refreshCreatedState`/`addAlias`/`removeAlias`/`save` extracted verbatim as a composed hook taking every closure-captured value/setter as a named parameter. State ownership stays centralized in the page component (no `useState` in the hook itself).
- `adminFansubCreateHelpers.ts`: all 16 pure helpers (`slugify`, `isValidSlug`, `isAbsoluteURL`, `parseYear`, `toOptional`, `mapGroupToForm`, `mapGroupMedia`, `legacyLinksFromGroup`, `mapGroupLinks`, `emptyForm`, `createEmptyLink`, `errMessage`, `formToCreatePayload`, `formToPatchPayload`, `sortAliases`, `syncFansubLinks`) plus the `FormState`/`CommunityLinkDraft` types, moved verbatim; route-internal (no imports from outside `admin/fansubs/create/`).
- `AdminFansubCreateAliasesSection.tsx` / `AdminFansubCreateLinksSection.tsx` / `AdminFansubCreateMediaSection.tsx`: the Tags/Community-Links/Media JSX blocks extracted as props-driven presentational components, matching the `FansubEditClient` → named-section-component shape already live in the sibling `[id]/edit/` directory. No new client boundary (only `page.tsx` carries `"use client"`).
- 49 new direct unit tests added (38 for the pure helpers, 11 for the action hook), all running in well under 50ms combined — independent of 174-09's rendering-based suite, covering exact API call arguments and state-setter values per D-25's "test the function behind the button" principle.
- 174-09's 7-test characterization suite passes unchanged against the fully restructured component, proving behavior preservation for a file that had zero coverage before Phase 174.

## Task Commits

1. **Task 1 + Task 2 + Task 2b (extraction half): action hook, pure helpers, and section components** - `f9d15cfb` (refactor)
2. **Task 2b (test half): direct unit tests for adminFansubCreateHelpers** - `856b0603` (test)
3. **Task 2c: function-level tests for useAdminFansubCreateActions** - `2335e1d4` (test)
4. **Task 3: regression gate (tsc/eslint/vitest) — verification only, no additional code changes** - covered by the above commits; no separate commit created (nothing left to stage)

**Plan metadata:** (final commit, see below)

## Files Created/Modified

- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts` - the 16 pure helpers + `FormState`/`CommunityLinkDraft` types, verbatim, route-internal
- `frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.test.ts` - 38 direct unit tests for the pure helpers
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts` - composed hook: `refreshCreatedState`/`addAlias`/`removeAlias`/`save`
- `frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.test.ts` - 11 function-level tests for the hook's returned actions
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx` - Tags section, props-driven
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx` - Community Links section, props-driven
- `frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx` - Logo/Banner media-upload section, props-driven
- `frontend/src/app/admin/fansubs/create/page.tsx` - now the thin orchestrator composing the hook + 3 sections
- `frontend/eslint.config.mjs` - added the 3 new section files to the frozen `no-restricted-syntax` ratchet list (deviation, see below)

## Decisions Made

- **Execution reordering (not a plan deviation in substance, just sequencing):** The plan lists the pure-helper extraction as "Task 2b", after Task 1 (hook) and Task 2 (sections). In practice, Task 1's hook and Task 2's sections both call the pure helpers (`mapGroupToForm`, `errMessage`, `slugify`, etc.), which were module-private functions in `page.tsx` — a sibling file cannot import a non-exported function from a Next.js page module without either introducing a page→hook circular import or temporarily exporting helpers from `page.tsx` only to delete the export again in Task 2b. Performing the helper/types extraction first (into `adminFansubCreateHelpers.ts`) avoided both, and produces the exact same final tree as doing it in the plan's listed order. All 5 tasks' acceptance criteria are independently satisfied; see verification below.
- **eslint ratchet-list addition:** moving the Tags/Links/Media JSX into new files triggered `no-restricted-syntax` `error` (native `<input>`/`<select>`) because the project's lint config only grandfathers already-listed legacy files at `warn`. Since this is a pure relocation of markup that already existed, unchanged, in the already-listed `page.tsx`, the 3 new files were added to the frozen `LEGACY_NO_RESTRICTED_SYNTAX_FILES` list — exactly the precedent set by the 156-14 `SegmentAssetSection`/`SegmentBasicFieldsSection` addition (see that list's own comment in `frontend/eslint.config.mjs`). This is a conscious, documented ratchet-list addition (not a silent edit), per the list's own governance comment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] eslint.config.mjs ratchet-list addition for the 3 new section files**
- **Found during:** Task 2 / Task 3 verification (`npx eslint src/app/admin/fansubs/create/`)
- **Issue:** The newly created `AdminFansubCreateAliasesSection.tsx`/`AdminFansubCreateLinksSection.tsx`/`AdminFansubCreateMediaSection.tsx` contain native `<input>`/`<select>` elements moved verbatim from `page.tsx`. `page.tsx` is already in the project's frozen legacy-warn ratchet list (so its native elements only warn), but brand-new files default to `error` under the global UI-primitives guard, blocking the lint gate.
- **Fix:** Added the 3 new files to `LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`, with a comment explicitly citing this as a pure relocation (no new native elements introduced) and referencing the identical 156-14 precedent.
- **Files modified:** `frontend/eslint.config.mjs`
- **Verification:** `npx eslint src/app/admin/fansubs/create/` → 0 errors, 9 warnings (same warning count/kind as `page.tsx` already carried before this plan)
- **Committed in:** `f9d15cfb` (Task 1+2+2b-extraction commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to keep the extraction lint-clean without either rewriting the moved markup to use `@/components/ui` primitives (a visual-behavior change forbidden by D-01/D-14) or leaving a broken lint gate. No scope creep — documented per the project's own ratchet-list governance.

## Issues Encountered

- Two self-authored test files initially shared `vi.fn()` mocks across `it()` blocks without `vi.resetAllMocks()`/`vi.clearAllMocks()` in a `beforeEach`, causing state (mock resolved/rejected values, call counts) to leak between tests. Fixed before committing by adding `beforeEach(() => vi.resetAllMocks())` (hook test) and a scoped `beforeEach(() => vi.clearAllMocks())` (helpers test, `syncFansubLinks` describe block only). Both test files pass cleanly now; not a deviation from the plan, just a test-authoring bug caught before commit.
- `npx tsc --noEmit` repo-wide reports 7 pre-existing baseline errors (two `.next/dev/types` PageProps-constraint errors unrelated to any admin/fansubs file, five `ReleaseDetailHero.test.tsx` type errors from a missing `previous` field) — none touch any file this plan modified (confirmed via `grep -i "fansubs/create"` on the tsc output: zero matches). Treated as pre-existing baseline per D-19, not a new regression.

## Next Phase Readiness

- This closes the `admin/fansubs/create/page.tsx` entry in Welle 3's P1 hotspot list (`174-HOTSPOTS.md`/`174-PATTERNS.md`). Ready for `174-REPORT.md`'s Welle-6 closure accounting.
- Interaction-level click-through (alias add/remove, second save/patch with link sync, first-render defaults) remains a live-UAT item per `174-UAT-CHECKLIST.md` (D-25) — not re-verified here beyond the 7 characterization tests, which were already confirmed stable in 174-09.

## Self-Check: PASSED

- `[ -f frontend/src/app/admin/fansubs/create/adminFansubCreateHelpers.ts ]` → FOUND
- `[ -f frontend/src/app/admin/fansubs/create/useAdminFansubCreateActions.ts ]` → FOUND
- `[ -f frontend/src/app/admin/fansubs/create/AdminFansubCreateAliasesSection.tsx ]` → FOUND
- `[ -f frontend/src/app/admin/fansubs/create/AdminFansubCreateLinksSection.tsx ]` → FOUND
- `[ -f frontend/src/app/admin/fansubs/create/AdminFansubCreateMediaSection.tsx ]` → FOUND
- `git log --oneline --all | grep -q f9d15cfb` → FOUND
- `git log --oneline --all | grep -q 856b0603` → FOUND
- `git log --oneline --all | grep -q 2335e1d4` → FOUND
- `npx vitest run src/app/admin/fansubs/create/` → 3 files, 56 tests, all passed
- `npx eslint src/app/admin/fansubs/create/` → 0 errors, 9 warnings
- `grep -rn '"use client"' frontend/src/app/admin/fansubs/create/*.tsx` → only `page.tsx`
- `git diff --quiet -- frontend/src/app/admin/fansubs/create/page.test.tsx` → unchanged

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 04
subsystem: ui
tags: [css-custom-properties, role-colors, fansub-admin, frontend]

# Dependency graph
requires: ["148-01", "148-02"]
provides:
  - "FansubAppMembersOverview.tsx with zero getRoleClassName()/colorClassMap; its three role-badge call sites (member roles, invitation roles desktop, invitation roles mobile) use ROLE_CATALOG_CHIP_CLASS + data-color-key"
  - "FansubEdit.module.css's .fansubEditMemberRoleToggle with the dead --role-accent-default self-assignment removed; --role-accent now resolves via the [data-color-key] seam FansubAppMemberEditorPanel.tsx already sets"
  - "A real-render test proving the data-color-key seam reacts only to color_key and is independent of label_de (plan-checker SC7 gap closure)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FansubAppMembersOverview.tsx's role badges now match the six-plus working admin surfaces' established ROLE_CATALOG_CHIP_CLASS + data-color-key pattern (UserContributionsTab.tsx precedent), removing the third and last broken category-name-keyed color mapping in the codebase."
    - "useRoleCatalog is mocked via a vi.hoisted vi.fn() wrapper (useRoleCatalogMock) in FansubAppMembersSection.test.tsx, allowing per-test catalog fixture overrides without touching the API-layer mocks -- needed to prove the data-color-key seam reacts to color_key independent of label_de."

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css

key-decisions:
  - "The plan-checker's SC7 gap (a missing pure data-color-key-seam-in-isolation test) was closed with a dedicated new test that overrides useRoleCatalog's mock return value three times across one render/cleanup/render cycle: baseline (real fixture), color_key changed with label_de held constant (must change data-color-key), and label_de changed with color_key held constant (must NOT change data-color-key) -- proving both directions of the seam's independence in one real-render-based test, not by source inspection."
  - "styles.fansubEditRoleBadge/.fansubEditRoleOption*/.fansubEditRoleLead...Default in FansubEdit.module.css (lines ~550-630) were intentionally left untouched -- they are used only by FansubAppMemberAddModal.tsx's and GroupMembersHistTable.tsx's own, separate, still-correct role-code-keyed getRoleClassName() functions, neither of which is named by any CONTEXT decision or the UI-SPEC's accent-reserved-for list. Verified via git diff that both files have zero changes in this plan."

requirements-completed: []

# Metrics
duration: ~35min
completed: 2026-09-05
---

# Phase 148 Plan 04: Wire FansubAppMembersOverview's role badges and remove the FansubEdit role-toggle's dead self-assignment Summary

**Removed `FansubAppMembersOverview.tsx`'s third and last broken color mapping (`getRoleClassName()`/`colorClassMap`, keyed by category-name strings that `presentationForRole().colorKey` has not returned since commit `84a38c0f`) and wired its three role-badge call sites to the same `ROLE_CATALOG_CHIP_CLASS` + `data-color-key` seam every other working admin surface already uses; separately removed `FansubEdit.module.css`'s dead `--role-accent: var(--role-accent-default)` self-assignment from the role-toggle rule, unblocking `--role-accent` resolution via the seam `FansubAppMemberEditorPanel.tsx` already sets — closed with a real-render test proving the seam is driven purely by `color_key`, independent of `label_de`.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `FansubAppMembersOverview.tsx` no longer contains `getRoleClassName`/`colorClassMap` at all; the function always fell through to `styles.fansubEditRoleDefault` in practice because its category-name keys (`leadership`, `creative`, ...) have not matched `presentationForRole().colorKey`'s bounded-hex/`neutral` output since an earlier commit — confirmed dead code, now removed.
- All three identical role-badge call sites (member roles compact card, invitation roles desktop table, invitation roles mobile card) now render `<Badge variant="info" className={ROLE_CATALOG_CHIP_CLASS} data-color-key={presentationForRole(roles, role).colorKey}>`, matching `UserContributionsTab.tsx`'s exact working precedent (no `data-role-code` on this Badge pattern).
- `FansubEdit.module.css`'s `.fansubEditMemberRoleToggle` no longer self-assigns `--role-accent: var(--role-accent-default)`; every other declaration in the unselected rule and the entire `.fansubEditMemberRoleToggleSelected` rule stays byte-for-byte unchanged, per the Restoration Rule. Confirmed via grep that the media-query overrides of `.fansubEditMemberRoleToggle` (padding/min-height only) never repeated the dead assignment.
- `FansubAppMemberAddModal.tsx` and `GroupMembersHistTable.tsx`'s own, separate, still-correct role-code-keyed `getRoleClassName()` functions were confirmed untouched (`git diff` shows zero changes to either file).
- Extended the existing "renders current app members with active roles" test with a real assertion that the `fansub_lead` role badge's `data-color-key` attribute equals `'#183b7c'` and that its class list no longer contains `fansubEditRoleLead`/`fansubEditRoleDefault`.
- Added a new dedicated test (closing the plan-checker's SC7 gap) that overrides the mocked `useRoleCatalog` catalog fixture across three renders: baseline, `color_key` changed with `label_de` held constant (badge's `data-color-key` must follow the new hex), and `label_de` changed with `color_key` held constant (badge's `data-color-key` must stay identical to baseline) — proving the seam reacts to real DOM output, not source text, in both directions.
- Full `FansubAppMembersSection.test.tsx` suite: 9/9 tests pass (7 pre-existing + 1 extended assertion + 1 new seam test), zero regressions.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove getRoleClassName/colorClassMap; wire FansubAppMembersOverview's role badges via the catalog-chip seam** - `c767ed17` (feat)
2. **Task 2: Remove the dead --role-accent-default self-assignment from the FansubEdit role-toggle** - `cb273707` (fix)

## Files Created/Modified

- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx` - `getRoleClassName`/`colorClassMap` removed; `ROLE_CATALOG_CHIP_CLASS` imported; all three role-badge call sites now use `ROLE_CATALOG_CHIP_CLASS` + `data-color-key`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx` - `useRoleCatalog` mock converted to an overridable `vi.hoisted` `vi.fn()`; existing member-roles test extended with a `data-color-key` assertion; new dedicated seam-independence test added
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` - `.fansubEditMemberRoleToggle`'s dead `--role-accent: var(--role-accent-default);` line removed; every other declaration untouched

## Decisions Made

See `key-decisions` in the frontmatter above for the full rationale on: (1) how the plan-checker's SC7 gap was closed with a three-render mock-override test proving both directions of the `color_key`/`label_de` independence, and (2) why `FansubEdit.module.css`'s separate `.fansubEditRoleBadge`/`.fansubEditRoleOption*`/`.fansubEditRoleLead...Default` class family was intentionally left untouched.

## Deviations from Plan

### Auto-fixed Issues

None — Task 1 and Task 2 were both byte-for-byte, single-source-swap restorations exactly as specified by the Restoration Rule; no bugs were found requiring an inline fix.

### Plan-checker gap closure (not a Rule 1-4 deviation, an explicit execution-brief requirement)

The execution brief required closing an open plan-checker warning: Success Criterion 7 lacked a test proving the pure `data-color-key` seam in isolation (independent of `label_de`). Added the dedicated seam-independence test described above, in addition to the plan's own Task 1 test requirement. This required converting the test file's static `useRoleCatalog` mock (a fixed factory function) into an overridable `vi.hoisted` `vi.fn()` wrapper so per-test catalog fixtures could be swapped without touching the API-layer mocks — a test-infrastructure change, not a production-code change, and it does not alter any existing test's behavior (the `beforeEach` now explicitly sets the same default catalog the static mock previously always returned).

### Out-of-scope discoveries (logged, not fixed)

None new. The pre-existing `tsc --noEmit` failure in a generated Next.js route-type file (already logged in `deferred-items.md` from Plan 01) is unrelated and unaffected by this plan; confirmed still the only `tsc` error after this plan's changes.

## Issues Encountered

None beyond the plan-checker gap closure documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All of Task 1's acceptance criteria pass: `grep -n "getRoleClassName\|colorClassMap"` on `FansubAppMembersOverview.tsx` returns empty; `grep -c "ROLE_CATALOG_CHIP_CLASS"` returns 4 (1 import + 3 call sites); `npx vitest run "src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx"` exits 0 (9/9 pass).
- All of Task 2's acceptance criteria pass: `grep -n -- "--role-accent: var(--role-accent-default)"` on `FansubEdit.module.css` returns empty; `grep -c "border: 1px solid var(--role-accent)"` returns 1 (formula line untouched).
- `npx tsc --noEmit` shows only the one pre-existing, unrelated route-type error already logged in earlier plans' `deferred-items.md`.
- `npx eslint` reports zero errors on the touched `.tsx`/`.test.tsx` files (the `.module.css` file is correctly unmatched by the JS/TS lint config, not an error).
- `FansubAppMemberAddModal.tsx`/`GroupMembersHistTable.tsx`'s separate, unrelated role-code-keyed `getRoleClassName()` functions remain untouched and functioning, per Success Criterion 3.
- The Phase 148-02 contrast-formula finding (`FansubEdit` role-toggle both states measurably fail 4.5:1 for `#c26a2e`/`#6b7f2a`) is unaffected by this plan — this plan only removed the dead token source, it did not touch the toggle's raw-strength color-mix formula, per the Restoration Rule. That open question remains tracked in `deferred-items.md` for phase-level closure.

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 3 `files_modified` paths verified present on disk; both task commit hashes (`c767ed17`,
`cb273707`) verified present in `git log --oneline --all`.

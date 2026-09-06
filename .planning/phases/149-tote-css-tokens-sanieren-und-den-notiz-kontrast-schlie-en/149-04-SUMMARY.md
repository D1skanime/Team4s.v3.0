---
phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en
plan: 04
subsystem: ui
tags: [css, color-mix, wcag-contrast, vitest, public-note-card, role-catalog]

# Dependency graph
requires:
  - phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
    provides: "restored --role-accent formulas across all role-color surfaces, including PublicNoteCard.module.css's .head/.role documented known-gap snapshot in roleCatalog.accessibility.test.ts"
provides:
  - "PublicNoteCard.module.css's .head band lowered from 55% to 45% role-accent mix, closing the WCAG AA 4.5:1 text-contrast gap for all 15 ROLE_COLOR_KEYS"
  - "roleCatalog.accessibility.test.ts's .head/.role test converted from a toEqual(ROLE_COLOR_KEYS) known-gap snapshot to a real per-hex contrast(...) >= 4.5 threshold assertion"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["TDD RED/GREEN cycle for a CSS color-mix() contrast fix: strengthen the test assertion first (RED, fails against the old CSS), then change the CSS value (GREEN)"]

key-files:
  created: []
  modified:
    - frontend/src/lib/roleCatalog.accessibility.test.ts
    - frontend/src/components/public/PublicNoteCard.module.css

key-decisions:
  - "Lowered only the .head band's color-mix() percentage (55% -> 45%); .role's 38% text mix stays untouched, per the ROADMAP's own worked calculation and the UI-SPEC's explicit single permitted exception to Phase 148's Restoration Rule."
  - "Corrected the adjacent German comment's umlaut defect (Gedaempftes/fruehreren -> Gedämpftes/früheren) while already touching that exact line, per CLAUDE.md Sprachqualität (optional per the plan, taken since the line was already being edited)."

patterns-established: []

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-09-06
---

# Phase 149 Plan 04: PublicNoteCard Role-Text Contrast Fix Summary

**Lowered PublicNoteCard's `.head` band color-mix from 55% to 45% role-accent, closing the WCAG AA 4.5:1 text-contrast gap for all 15 catalog hexes, and converted the test's known-gap snapshot into a real enforced threshold.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-09-06T06:56:00Z (approx, first commit 06:56:59Z)
- **Completed:** 2026-09-06T06:57:39Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- The public note card's `.role` text now clears >=4.5:1 contrast against the `.head` header band for every one of the 15 `ROLE_COLOR_KEYS` catalog hexes (worst case measured 4.83:1 for `#183b7c`, matching the ROADMAP's worked calculation).
- `roleCatalog.accessibility.test.ts`'s `.head`/`.role` test now enforces a real `contrast(...) >= 4.5` threshold per hex instead of asserting a `toEqual(ROLE_COLOR_KEYS)` "all fail" known-gap snapshot.
- The one deliberate, explicit exception to Phase 148's frozen Restoration Rule is applied narrowly: only the `.head` band's mix percentage changed; every other formula in `PublicNoteCard.module.css` and every other known-gap snapshot in the test file remains byte-identical to what Phase 148 left.

## Task Commits

Each task was committed atomically (TDD RED -> GREEN):

1. **Task 1: Convert the .head/.role known-gap snapshot to a real >= 4.5 threshold assertion** - `12029b8e` (test, RED)
2. **Task 2: Lower the PublicNoteCard .head band mix from 55% to 45%** - `7ccc2e59` (feat, GREEN)

_TDD gate sequence verified in git log: `test(149-04): ...` (12029b8e) precedes `feat(149-04): ...` (7ccc2e59)._

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/lib/roleCatalog.accessibility.test.ts` - the `.head`/`.role` `it` block now loops over all 15 `ROLE_COLOR_KEYS` asserting `contrast(roleText, headBackground) >= 4.5`, with `headPct`/`rolePct` extracted from real CSS text via the existing `extractMixPercents` helper; every other `describe`/`it` block in the file is byte-identical to Phase 148.
- `frontend/src/components/public/PublicNoteCard.module.css` - `.head`'s `background: color-mix(in srgb, var(--role-accent) 45%, var(--color-border))` (was 55%); `.role`'s 38% text mix and every other rule (`.card`, `.avatar`, `.date`, `.author*`, `.content*`, `.toggle`, `.footer`) unchanged; the adjacent German comment's umlauts corrected.

## Decisions Made
- Lowered only the `.head` band mix percentage; `.role`'s text mix stays at 38% (per plan and UI-SPEC Part B).
- Fixed the adjacent German comment's umlaut defect since the exact line was already being edited (optional per plan, taken).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

ROADMAP Phase 149 Success Criteria 5 and 6 are both closed: the `.head`/`.role` pair clears 4.5:1 for all 15 catalog hexes, and the test enforces this as a real threshold rather than a known-gap snapshot. Every other known-gap snapshot in `roleCatalog.accessibility.test.ts` (chip borders, `RoleBadgeCard.stages`/`MemberBadgeChain`, `FansubEdit` role-toggle rows, historical-role label) remains byte-identical to what Phase 148 left. `npx vitest run src/lib/roleCatalog.accessibility.test.ts` and `src/components/public/PublicNoteCard.test.tsx` both fully green (17 + 21 tests). Live UAT (getComputedStyle evidence, visual band-lightening confirmation) remains for Phase 149's later verification/UAT plan per the UI-SPEC.

---
*Phase: 149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en*
*Completed: 2026-09-06*

## Self-Check: PASSED

- FOUND: `.planning/phases/149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en/149-04-SUMMARY.md`
- FOUND: `frontend/src/components/public/PublicNoteCard.module.css`
- FOUND: `frontend/src/lib/roleCatalog.accessibility.test.ts`
- FOUND commit: `12029b8e`
- FOUND commit: `7ccc2e59`

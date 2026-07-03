---
status: complete
quick_id: 260703-bmp
slug: fix-datepicker-react-hooks-set-state-in-
date: 2026-07-03
---

# Quick Task 260703-bmp: Fix DatePicker React Hooks Lint Blocker

## Outcome

Fixed the broad frontend lint blocker in the global `DatePicker`.

The redundant closed-state synchronization effect was removed. The picker still derives `visibleMonth` and `yearPageStart` from the current selected date when it opens through the existing `openPicker()` path, so the public API and visible control behavior stay unchanged.

## Files Changed

- `frontend/src/components/ui/DatePicker.tsx`
- `.planning/quick/260703-bmp-fix-datepicker-react-hooks-set-state-in-/260703-bmp-PLAN.md`
- `.planning/quick/260703-bmp-fix-datepicker-react-hooks-set-state-in-/260703-bmp-SUMMARY.md`
- `.planning/STATE.md`

## Verification

- `npx eslint src/components/ui/DatePicker.tsx` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with existing warnings only.
- `git diff --check` passed with CRLF warnings only.

## Remaining Notes

Broad lint still reports existing warnings across untouched files, mostly native form-control migration warnings and a few unused variables. There are no remaining lint errors.

## Next Step

Return to the fresh UI-first Viper's Creed E2E retest from reset, now that the auth blocker and the broad lint blocker are both cleared.

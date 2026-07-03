---
status: planned
quick_id: 260703-bmp
slug: fix-datepicker-react-hooks-set-state-in-
date: 2026-07-03
---

# Quick Task 260703-bmp: Fix DatePicker React Hooks Lint Blocker

## Goal

Remove the `react-hooks/set-state-in-effect` lint blocker in the global `DatePicker` component without redesigning the control or changing its public API.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/components/ui/DatePicker.tsx`
- Existing DatePicker consumers found via `rg "DatePicker"`

## Plan

1. Keep the change scoped to `frontend/src/components/ui/DatePicker.tsx`.
2. Remove the closed-state synchronization effect that calls `setVisibleMonth` and `setYearPageStart` synchronously.
3. Preserve existing behavior by relying on `openPicker()`, which already derives `visibleMonth` and `yearPageStart` from the current `selectedDate` when the picker opens.
4. Run focused lint for `DatePicker.tsx`, typecheck, broad lint, and `git diff --check`.

## Acceptance Criteria

- `DatePicker.tsx` no longer triggers `react-hooks/set-state-in-effect`.
- No new DatePicker API or visual behavior is introduced.
- Broad `npm run lint` is no longer blocked by `DatePicker.tsx`.
- Quick summary and `STATE.md` are updated and committed with the code fix.

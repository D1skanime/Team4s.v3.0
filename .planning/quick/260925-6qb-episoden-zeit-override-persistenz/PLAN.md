# Quick Plan

1. Add optional override time fields to the existing assignment model, repository response, frontend type, and API contract.
2. Restore the segment panel's override start field from the current assignment's persisted override value.
3. Add a focused helper regression test for the per-assignment start lookup.
4. Run frontend focused tests/typecheck and backend package compilation; record unrelated pre-existing backend failures.
5. Commit atomically, push to `origin main`, and restart the affected backend/frontend containers.

## Acceptance Criteria

- A saved per-episode override returns its persisted start/end values in the assignment metadata.
- Reopening the same segment and episode shows the saved override start instead of the base start.
- Other assigned episodes remain unaffected.
- No new endpoint, table, or duplicate persistence seam is introduced.

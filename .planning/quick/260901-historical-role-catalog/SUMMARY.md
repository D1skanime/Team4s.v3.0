---
id: 260901-historical-role-catalog
status: complete
---

# Historical Role Catalog Completeness - Summary

- Added migration `0158_historical_role_contexts` with an exact context backup for reversible up/down behavior.
- Made `Technik-Admin`, `GFX`, `Karaoke-FX`, and `Administration` available for historical group credits through the canonical `group_history` role catalog.
- Confirmed the live database has the four expected `group_history` contexts after the standard backend migration runner executed.
- Added focused migration and historical-picker regression coverage.

## Checks

- `GroupHistRoleDialog.test.tsx`: 4 tests passed.
- `TestPhase142HistoricalRoleContextsSourceContract`: passed.
- `git diff --check`: passed.

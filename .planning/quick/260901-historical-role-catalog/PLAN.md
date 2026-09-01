---
id: 260901-historical-role-catalog
status: in_progress
---

# Historical Role Catalog Completeness

## Scope

Expose the existing `Technik-Admin`, `GFX`, `Karaoke-FX`, and `Administration` role definitions in the canonical historical-member role picker. Do not create a frontend fallback or grant active capabilities.

## Plan

1. Add a reversible migration that adds `group_history` to the four existing catalog roles while preserving their original contexts for rollback.
2. Extend the existing historical-role dialog test and add a migration source-contract test.
3. Restart the backend so the canonical migration runner applies the migration, verify the live catalog rows, then commit the scoped change.

## Acceptance

- The picker receives all four roles only from the existing role catalog.
- Active permissions and active-role assignability remain unchanged.
- Migration up/down contract and dialog regression tests pass.

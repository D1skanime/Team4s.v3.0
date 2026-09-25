# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts`

## Actions

1. Set the Version column to a fixed compact width in both `.mappingRow` and `.mappingColumnHeader`.
2. Keep the Episode width stable and let the Group column use the released space.
3. Update the focused layout assertion, run tests and diff checks, then commit.

## Acceptance criteria

- Version values such as `v1` and `v10` fit in a compact field.
- Header and data columns remain aligned.
- Responsive behavior below the existing breakpoint is unchanged.

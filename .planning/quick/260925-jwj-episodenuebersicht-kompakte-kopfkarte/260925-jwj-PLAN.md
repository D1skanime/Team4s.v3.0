# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx`
- `frontend/src/app/admin/anime/AdminStudio.module.css`
- `frontend/src/app/admin/anime/[id]/episodes/page.test.tsx`

## Actions

1. Merge the summary metrics into the existing overview header card.
2. Replace nested metric cards with a compact context row and balanced responsive columns.
3. Add a focused structure assertion, run tests/typecheck/lint, document and push.

## Acceptance criteria

- The overview uses one shared header card instead of a separate summary card container.
- Anime, episodes, and total versions remain readable in a compact aligned row.
- Mobile layout stacks the context values without nested card borders.

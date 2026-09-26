# Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/create/page.test.tsx src/app/admin/anime/[id]/edit/page.test.tsx` — 47/47 passed.
- `git diff --check` — passed.
- `npm run typecheck` — blocked by the pre-existing/generated Next error that `create/page.tsx` exports helper functions not allowed by the App Router page type.

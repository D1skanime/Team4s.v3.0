# Verification

- `docker compose exec -T team4sv30-frontend npm run typecheck` — passed.
- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/edit/page.test.tsx src/app/admin/anime/create/aniSearchJellyfinPrecedence.test.ts` — 14/14 passed.
- `git diff --check` — passed.

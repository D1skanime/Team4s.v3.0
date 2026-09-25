# Verification

- `docker compose exec -T team4sv30-frontend npm run typecheck` — passed.
- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/edit/page.test.tsx` — 10/10 passed.
- `git diff --check` — passed.

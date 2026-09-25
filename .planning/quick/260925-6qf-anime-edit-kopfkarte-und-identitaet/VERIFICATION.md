# Verification

- `docker compose exec -T team4sv30-frontend npm run typecheck` — passed.
- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/edit/page.test.tsx src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.test.tsx` — 15/15 passed.
- `git diff --check` — passed.
- In-app browser route `/admin/anime/1/edit` confirms the edit header, linked cover, stepper, and restored identity values are rendered.

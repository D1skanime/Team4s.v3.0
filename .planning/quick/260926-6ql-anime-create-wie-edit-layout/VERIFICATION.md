# Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/create/page.test.tsx src/app/admin/anime/[id]/edit/page.test.tsx` — 47/47 passed.
- `git diff --check` — passed.
- `npm run typecheck` remains blocked by the existing Next App Router generated type error for named helper exports in `create/page.tsx`.

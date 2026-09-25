# Quick Task Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/episodes/page.test.tsx` — 3 Tests bestanden.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — bestanden.
- `docker compose exec -T team4sv30-frontend npx eslint src/app/admin/anime/[id]/episodes/page.tsx src/app/admin/anime/[id]/episodes/page.test.tsx` — keine Fehler; 3 bestehende Warnungen zu nativen Formularfeldern.
- `git diff --check` — bestanden.

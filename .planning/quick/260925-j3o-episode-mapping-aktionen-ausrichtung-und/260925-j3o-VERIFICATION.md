# Quick Task Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/episodes/import/page.layout.test.ts src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx` — 68 Tests bestanden.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — bestanden.
- `docker compose exec -T team4sv30-frontend npx eslint src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx src/app/admin/anime/[id]/episodes/import/page.layout.test.ts` — bestanden.
- `git diff --check` — bestanden.
- Live-Browser-UAT bleibt wegen des vorgeschalteten Admin-Logins offen.

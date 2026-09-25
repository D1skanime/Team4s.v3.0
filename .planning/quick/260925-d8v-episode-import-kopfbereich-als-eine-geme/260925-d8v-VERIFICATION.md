# Quick Task Verification

- `docker compose ps` — alle Team4s-Dienste laufen.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — bestanden.
- `docker compose exec -T team4sv30-frontend npx eslint 'src/app/admin/anime/[id]/episodes/import/page.tsx'` — bestanden.
- `docker compose exec -T team4sv30-frontend npx vitest run 'src/app/admin/anime/[id]/episodes/import/page.layout.test.ts' 'src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx'` — 2 Testdateien, 7 Tests bestanden.
- `git diff --check` — bestanden.
- Authentifizierter Live-Browser-Check — offen, da die Sitzung am Admin-Login-Gate steht.

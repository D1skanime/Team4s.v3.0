# Quick Task Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/episodes/page.test.tsx src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx` — 14 Tests bestanden.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — bestanden.
- `docker compose exec -T team4sv30-frontend npx eslint src/app/admin/anime/[id]/episodes/page.tsx src/components/episodes/EpisodesOverview/EpisodeAccordion.tsx` — keine Fehler; 3 bestehende Warnungen zu nativen Formularfeldern in der Episodenseite.
- `git diff --check` — bestanden.

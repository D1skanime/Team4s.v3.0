# Quick Task Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/app/admin/anime/[id]/episodes/page.test.tsx src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx src/app/admin/anime/utils/episode-bulk-fansub-group.test.ts` — 16 Tests bestanden.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — bestanden.
- `docker compose exec -T team4sv30-frontend npx eslint src/components/episodes/EpisodesOverview/EpisodesOverview.tsx src/app/admin/anime/[id]/episodes/page.tsx` — keine Fehler; 3 bestehende Warnungen zu nativen Formularfeldern in der Episodenseite.
- `git diff --check` — bestanden.
- Zwei nicht betroffene `EpisodeImportEpisodeGroup`-Tests bleiben mit bestehenden Dateipfad-Erwartungen rot.

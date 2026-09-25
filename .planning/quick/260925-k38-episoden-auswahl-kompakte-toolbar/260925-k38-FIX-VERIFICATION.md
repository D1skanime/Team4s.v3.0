# Quick Fix Verification

- `docker compose exec -T team4sv30-frontend npm run typecheck` — bestanden.
- `docker compose exec -T team4sv30-frontend npm run build` — CSS-Kompilierung bestanden; Build stoppt anschließend am bestehenden Prerender-Fehler `/_global-error` (`Cannot read properties of null (reading 'useContext')`).
- `git diff --check` — bestanden.

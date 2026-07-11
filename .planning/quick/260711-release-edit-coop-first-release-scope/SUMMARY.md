---
status: complete
date: 2026-07-11
---

# Summary

Quick-Fix abgeschlossen:

- Admin-Release-Summaries liefern `fansub_names` als alle beteiligten Gruppen eines Release-Kontexts.
- Fansub-Edit-Drawer, Release-Zeilen und Episode-Version-Editor zeigen Coop-Releases als Namensliste, z. B. `Honto & ZSubs`.
- First-Release-Freischaltung zaehlt Textbeitraege nur, wenn der Member ueber `anime_contributions` derselben Fansubgruppe zugeordnet ist.
- First-Release-Freischaltung zaehlt Media nur, wenn der Uploader ueber einen verifizierten `member_claims`-Link auf einen Contributor derselben Fansubgruppe aufloesbar ist.
- Shared Contracts und Source-Inspection-Tests wurden aktualisiert.

Checks:

- `go test ./internal/repository ./internal/handlers ./internal/migrations`
- `npm test -- src/components/groups/GroupHistorySection.test.ts src/app/admin/fansubs/[id]/edit/page.test.tsx src/app/admin/fansubs/[id]/edit/ReleaseThemeDrawerSection.test.tsx`
- `npm run typecheck`
- `npm run lint -- --quiet`
- `git diff --check`
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
- Health: backend `http://localhost:18092/health` 200, frontend `http://localhost:3000` 200

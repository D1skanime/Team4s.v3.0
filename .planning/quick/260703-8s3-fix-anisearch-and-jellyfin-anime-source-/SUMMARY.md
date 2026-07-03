# GSD Quick 260703-8s3 Summary

## Kritische Bewertung

Der Ansatz ist richtig, wenn `source_links` die kanonische Provenance fuer mehrere Provider bleibt und `anime.anisearch_id` nur als Kompatibilitaetsfeld fuer bestehende Mapper-/Episode-Import-Flows gespiegelt wird.

Die erste Umsetzung war dafuer noch unvollstaendig: einzelne Jellyfin-Pfade und die Edit-Review-Anzeige lasen weiterhin nur die Primaerquelle `anime.source`. Dadurch konnte ein Anime mit `source = anisearch:<id>` und `source_links = [jellyfin:<id>, anisearch:<id>]` weiterhin als nicht vollstaendig verknuepft erscheinen.

## Umgesetzt

- AniSearch-ID wird beim Anime-Create aus `source` oder `source_links` in `anime.anisearch_id` gespiegelt, sofern die Runtime-Spalte existiert.
- Anime-Detail und Admin-Anime-Item liefern `source`, `source_links`, `folder_name`, `anisearch_id` und `jellyfin_series_id`.
- Jellyfin Preview, Sync, Episode-Sync, Metadata-Resync und Episode-Version-Editor lesen die Jellyfin-ID jetzt zentral aus `source` oder `source_links`.
- Edit-Review-UI erkennt AniSearch und Jellyfin auch dann, wenn nur einer der Provider in `source` und der andere in `source_links` steht.
- OpenAPI/admin-content/anime-detail Contracts und Frontend-Typen wurden angepasst.

## Checks

- `go test ./internal/repository ./internal/handlers`
- `npm run typecheck`
- `npm test -- --run src/app/admin/anime/create/useAdminAnimeCreateController.test.ts -t "keeps Jellyfin as the authoritative create source"`
- `npm test -- --run src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx`
- `git diff --check`

## Rest-Risiken

- Die vollstaendige UI-first E2E-Wiederholung steht noch aus.
- Der bekannte vollstaendige Test `useAdminAnimeCreateController.test.ts` enthaelt weiterhin einen bestehenden Erwartungs-Konflikt bei absoluten vs. relativen Jellyfin-Cover-URLs; der fokussierte Source-Link-Test ist gruen.

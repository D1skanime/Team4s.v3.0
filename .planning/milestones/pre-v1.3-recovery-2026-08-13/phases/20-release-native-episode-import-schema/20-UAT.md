# Phase 20 UAT

## Final Status
- Phase 20 live UAT completed successfully on 2026-04-23.
- The disposable live replay used `3x3 Eyes` (`anime_id=6`) on the local Docker stack.
- The release-native import flow is verified end to end against persisted normalized tables.

## Verified Live Flow

### Create and linkage
- Anime was created through the admin create flow with explicit Jellyfin selection.
- Persisted anime state confirms:
  - `anime.source = jellyfin:ecfd07fdca0dd2210735dfc7fb2ef1e3`
  - `anime.folder_name = /media/Anime/OVA/Anime.OVA.Sub/3x3 Eyes`
  - `anime_source_links` contains both:
    - `jellyfin:ecfd07fdca0dd2210735dfc7fb2ef1e3`
    - `anisearch:2747`

### Import workbench and apply
- Preview loaded Jellyfin-backed media candidates correctly for `3x3 Eyes`.
- Mapping apply completed without legacy `episode_versions` fallback.
- UI result after apply:
  - `Episoden erstellt: 0, vorhanden: 4, Versionen erstellt: 0, aktualisiert: 4, Mappings: 4.`
- This reflects idempotent replay behavior on already-persisted rows: the apply step found and updated the existing normalized graph instead of duplicating it.

## SQL Evidence Collected

### Anime and provider linkage
```sql
SELECT id, title, source, folder_name
FROM anime
WHERE id = 6;
```

Observed:
- `id = 6`
- `title = 3x3 Augen`
- `source = jellyfin:ecfd07fdca0dd2210735dfc7fb2ef1e3`
- `folder_name = /media/Anime/OVA/Anime.OVA.Sub/3x3 Eyes`

```sql
SELECT anime_id, source
FROM anime_source_links
WHERE anime_id = 6
ORDER BY source;
```

Observed:
- `anisearch:2747`
- `jellyfin:ecfd07fdca0dd2210735dfc7fb2ef1e3`

### Canonical episodes
```sql
SELECT anime_id, episode_number, title, status
FROM episodes
WHERE anime_id = 6
ORDER BY sort_index NULLS LAST, episode_number;
```

Observed:
- `1 Reinkarnation`
- `2 Yakumo`
- `3 Lebenswille`
- `4 Verlust`

### Multilingual episode titles
```sql
SELECT e.anime_id, l.code, et.title, et.episode_id
FROM episode_titles et
JOIN episodes e ON e.id = et.episode_id
JOIN languages l ON l.id = et.language_id
WHERE e.anime_id = 6
ORDER BY e.episode_number::int, l.code;
```

Observed:
- Each of the 4 episodes has persisted `de`, `en`, and `ja` titles.

### Release-native versions and groups
```sql
SELECT e.anime_id, rv.id AS release_version_id, rv.title, rv.version, fg.name AS group_name
FROM episodes e
JOIN fansub_releases fr ON fr.episode_id = e.id
JOIN release_versions rv ON rv.release_id = fr.id
LEFT JOIN release_version_groups rvg ON rvg.release_version_id = rv.id
LEFT JOIN fansub_groups fg ON fg.id = rvg.fansub_group_id
WHERE e.anime_id = 6
ORDER BY e.episode_number::int, rv.id;
```

Observed:
- 4 release versions persisted.
- Each release version is linked to `NazcaSubs`.
- Each version retained its Jellyfin-derived filename as version title.

### Variant coverage and Jellyfin stream linkage
```sql
SELECT e.anime_id, rv.id AS release_version_id, e2.episode_number, rve.position, rvv.filename
FROM episodes e
JOIN fansub_releases fr ON fr.episode_id = e.id
JOIN release_versions rv ON rv.release_id = fr.id
JOIN release_variants rvv ON rvv.release_version_id = rv.id
JOIN release_variant_episodes rve ON rve.release_variant_id = rvv.id
JOIN episodes e2 ON e2.id = rve.episode_id
WHERE e.anime_id = 6
ORDER BY e.episode_number::int, rv.id, rvv.id, rve.position;
```

Observed:
- 4 release variants persisted.
- Each variant covers the expected canonical episode with `position = 1`.

```sql
SELECT ss.external_id, rs.variant_id
FROM release_streams rs
JOIN stream_sources ss ON ss.id = rs.stream_source_id
JOIN release_variants rv ON rv.id = rs.variant_id
JOIN release_versions rver ON rver.id = rv.release_version_id
JOIN fansub_releases fr ON fr.id = rver.release_id
JOIN episodes e ON e.id = fr.episode_id
WHERE e.anime_id = 6
ORDER BY ss.external_id;
```

Observed:
- 4 Jellyfin-backed stream source links persisted.
- Each variant is linked to exactly one Jellyfin `external_id`.

## Automated Evidence Still Current

### Targeted tests
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services -count=1`
  - Passed.
- `cd frontend && npm.cmd test -- src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts`
  - Passed.

### Build and deploy
- `cd frontend && npm.cmd run build`
  - Passed.
- `docker compose up -d --build team4sv30-backend team4sv30-frontend`
  - Services rebuilt and are reachable.

### Route health
- `http://127.0.0.1:8092/health` -> `200`
- `http://127.0.0.1:3002/admin/anime/create` -> `200`

## Pass Condition
Phase 20 is now satisfied:
- release-native apply writes verified live
- multilingual titles verified in `episode_titles`
- Jellyfin stream linkage verified in `release_streams` / `stream_sources`
- provider linkage persistence verified through `anime.source` + `anime_source_links`

## Follow-up Notes
- The import workbench currently remains actionable after a successful apply, even when the result was an idempotent update. This is a UX follow-up, not a Phase 20 blocker.

# Anime Search Query Plan Tracking

## Goal
Track `ILIKE %query%` search behavior over time after `0017_anime_search_trgm` and react early if query plans drift.

## Baseline Snapshot (2026-03-03)
- Dataset size: `anime_rows=13351`
- Query A (`%nar%`, selective):
  - Plan uses `Bitmap Index Scan` on:
    - `idx_anime_title_trgm`
    - `idx_anime_title_de_trgm`
    - `idx_anime_title_en_trgm`
  - Execution time: `~0.985 ms`
- Query B (`%a%`, very broad):
  - Plan uses `Index Scan` on `idx_anime_title` with filter
  - Execution time: `~0.197 ms`

## Phase 115 — search_foundation Baseline (2026-07-28) — AUSSTEHEND (Live-Terminal erforderlich)

> **Status: NICHT angewandt / kein Plan erfasst.** Migration `0140_search_foundation` ist
> geschrieben und committet, aber die Docker-Postgres war zum Ausführungszeitpunkt nicht
> erreichbar (Docker-Desktop-WSL2-Engine down: `500 Internal Server Error` auf
> `dockerDesktopLinuxEngine`). Die Bash-Sandbox erreicht Host-Ports ohnehin nicht. Es wurde
> **kein** EXPLAIN-Plan fabriziert. Untenstehende Kommandos + erwartete Assertion sind der
> exakte Live-Schritt, den ein Mensch im echten Terminal ausführen muss.

### Schritt 1 — Migration anwenden (Migrate-Runner)
Bevorzugt über den Container (Backend enthält den Migrate-Runner) oder lokal gegen die DB:
```powershell
# realer DB-Container-/Portname zuerst via `docker ps` prüfen (Namen/Ports weichen ggf. von .env ab)
docker compose exec -T team4sv30-backend /app/migrate up
# ODER: docker compose exec -T team4sv30-backend /app/migrate status   # muss 0140 als applied listen
```
Erwartung: `migrations applied: >=1`; `migrate status` zeigt `140  applied  search_foundation`.

### Schritt 2 — Index-Nutzung per EXPLAIN ANALYZE nachweisen (kein Seq Scan)
```powershell
# Anime-Titel-Match (Tippfehler „narotu" -> „Naruto") über funktionalen Trigram-Index
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT id, title FROM anime WHERE f_unaccent(title) % f_unaccent('narotu') ORDER BY similarity(f_unaccent(title), f_unaccent('narotu')) DESC LIMIT 20;"

# Fansub-Alias-Match („t4s") über funktionalen Trigram-Index auf normalized_alias
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT fga.fansub_group_id, fga.alias FROM fansub_group_aliases fga WHERE f_unaccent(fga.normalized_alias) % f_unaccent('t4s') LIMIT 20;"
```
Hinweis: `%` nutzt `pg_trgm.similarity_threshold` (Default 0.3). Falls der Planner bei sehr
kleinen Tabellen einen Seq Scan wählt, testweise `SET enable_seqscan = off;` voranstellen, um die
Index-Nutzbarkeit zu belegen — für die eigentliche Baseline gilt der Default-Plan.

### Erwartete Assertion (Akzeptanzkriterium Task 2)
- Anime-Plan zeigt `Bitmap Index Scan on idx_anime_title_unaccent_trgm`
  (bzw. `idx_anime_titles_title_unaccent_trgm` beim `anime_titles`-Zweig).
- Fansub-Plan zeigt `Bitmap Index Scan on idx_fansub_group_aliases_normalized_unaccent_trgm`.
- **Kein** `Seq Scan` auf der jeweiligen Suchspalte im Default-Plan.
- Ergebnis (Plan-Auszug + Datum) HIER unter „Angewandter Plan" eintragen, sobald ausgeführt.

### Angewandter Plan
_(noch leer — nach Live-Ausführung durch Schritt 2 hier einfügen)_

## Weekly Check Commands
Run from repo root:

```powershell
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "SELECT COUNT(*) AS anime_rows FROM anime;"
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT id, title FROM anime WHERE (title ILIKE '%nar%' OR title_de ILIKE '%nar%' OR title_en ILIKE '%nar%') ORDER BY title ASC LIMIT 20;"
docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2dump -c "EXPLAIN (ANALYZE, BUFFERS) SELECT id, title FROM anime WHERE (title ILIKE '%a%' OR title_de ILIKE '%a%' OR title_en ILIKE '%a%') ORDER BY title ASC LIMIT 20;"
```

## Drift Triggers
Treat as drift if one of these happens consistently across repeated runs:
- Selective query (`%nar%`) no longer uses trigram indexes.
- Selective query execution time degrades by >2x vs prior baseline at comparable row counts.
- Broad query switches to expensive full scan with high buffer churn under normal load.

## Tuning Playbook
1. Confirm migration/index presence:
   - `\d+ anime`
   - check `idx_anime_title_trgm`, `idx_anime_title_de_trgm`, `idx_anime_title_en_trgm`
2. Refresh planner stats:
   - `ANALYZE anime;`
3. Re-run checks and compare.
4. If drift persists, inspect query variants and consider:
   - query normalization refinements
   - partial index strategy adjustments
   - search endpoint constraints (`limit`, fallback behavior)

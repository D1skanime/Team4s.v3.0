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

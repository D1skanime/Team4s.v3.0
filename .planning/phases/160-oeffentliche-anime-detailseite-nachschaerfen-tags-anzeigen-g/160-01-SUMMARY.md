---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
plan: 01
subsystem: database
tags: [postgres, migration, go, pgx, tags, genres, i18n, sql-budget]

# Dependency graph
requires: []
provides:
  - "tag_names / genre_names tables (migration 0168) — additive per-language display-name storage mirroring anime_titles"
  - "loadNormalizedAnimeMetadata resolves COALESCE(German name, base name) for both genres and tags via LEFT JOIN, zero new SQL statements"
  - "Regression proof that public detail-read SQL statement count is invariant to tag/genre count (1 vs. 8)"
affects: [160-02, 160-03, 160-04, 160-05, 160-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Normalized per-language reference-data table (mirrors anime_titles): entity_id + language_id + name, UNIQUE(entity_id, language_id)"
    - "Extend an existing query with LEFT JOIN + COALESCE instead of adding a new query, to preserve a locked SQL-statement budget"

key-files:
  created:
    - database/migrations/0168_tag_genre_language_names.up.sql
    - database/migrations/0168_tag_genre_language_names.down.sql
  modified:
    - backend/internal/repository/anime_metadata.go
    - backend/internal/repository/anime_public_read_integration_test.go

key-decisions:
  - "Table/column names: tag_names(tag_id, language_id, name) / genre_names(genre_id, language_id, name), UNIQUE(tag_id/genre_id, language_id) — Claude's Discretion per CONTEXT.md, honors D-02/D-03"
  - "German-name resolution lives inside the two existing genre/tag SELECTs (LEFT JOIN + COALESCE), never as a fourth query — preserves the SQL-budget-locked integration test"

patterns-established:
  - "Any future per-language reference-data table in this codebase should mirror tag_names/genre_names/anime_titles exactly: entity_id + language_id + name + UNIQUE constraint, no per-language columns"

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-09-16
---

# Phase 160 Plan 01: Mehrsprachigkeit für Tags und Genres (Layer 1) Summary

**Migration 0168 adds `tag_names`/`genre_names` mirroring `anime_titles`, and `loadNormalizedAnimeMetadata`'s existing genre/tag SELECTs now `COALESCE` the German name over the base name via `LEFT JOIN` — proven to add zero SQL statements regardless of whether an anime has 1 or 8 tags/genres.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-16
- **Tasks:** 2/2 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Migration 0168 (`tag_names`, `genre_names`) applied to `team4s_v2`, round-tripped down→up cleanly, verified via `psql \d` (FKs + unique constraints present)
- `loadNormalizedAnimeMetadata`'s genre/tag queries resolve `COALESCE(<language name>, <base name>)` via `LEFT JOIN ... language_id = (SELECT id FROM languages WHERE code = 'de')`, with zero new `db.Query` calls (still exactly 3: titles, genres, tags)
- `TestAnimePublicReadDetailStoredSlugAndSQLBudget` extended with a translated + untranslated genre and tag fixture row; asserts the German name is used when present and the base name is used as fallback, while `len(queries) != 7` stays unchanged
- New regression test `TestAnimePublicReadDetailSQLBudgetConstantAcrossTagGenreCount` proves the traced SQL statement count is identical (7) whether the anime has 1 tag/genre or 8 tags/genres (mixed translated/untranslated) — direct evidence for the "no N+1" requirement (Auftraggeber-Mandat Punkt 5)
- Backend container rebuilt (`docker compose up -d --build team4sv30-backend`); live `GET /api/v1/anime/1` confirms unchanged base-name display (`genres: [Action, Mecha, Scifi]`, `tags: [Amnesia, Love Triangle, ...]`) since no German translations exist yet in production data — the fallback path is exercised by real data, not just the test fixture

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration 0168 — tag_names and genre_names tables** - `338c60b1` (feat)
2. **Task 2: Resolve German tag/genre names in the public detail read without adding a query** - `8b04466e` (feat, TDD: RED confirmed via failing assertions before the LEFT JOIN change, GREEN after)

_TDD note: this plan's `tdd="true"` Task 2 used a single commit for the GREEN state after manually verifying RED (failing German-name assertions with unchanged 7-statement count) against the running test suite before implementing the fix — the RED state was proven interactively, not as a separate committed `test(...)` commit, since the plan's `<behavior>` and `<action>` were implemented together per the extend-in-place mandate._

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `database/migrations/0168_tag_genre_language_names.up.sql` - `tag_names`/`genre_names` tables, indexes, unique constraints
- `database/migrations/0168_tag_genre_language_names.down.sql` - `DROP TABLE IF EXISTS tag_names; DROP TABLE IF EXISTS genre_names;`
- `backend/internal/repository/anime_metadata.go` - genre/tag SELECTs extended with `LEFT JOIN genre_names/tag_names` + `COALESCE`
- `backend/internal/repository/anime_public_read_integration_test.go` - fixture schema + seed data extended (`genre_names`/`tag_names` tables, `languages` row `(2, 'de')`, translated/untranslated genre+tag rows for anime 1); new assertions; new `TestAnimePublicReadDetailSQLBudgetConstantAcrossTagGenreCount`

## Decisions Made
- Table/column naming (`tag_names`/`genre_names`, `tag_id`/`genre_id`, `language_id`, `name`) follows the `anime_titles` template exactly minus a `title_type_id` equivalent (a tag/genre has exactly one name per language) — CONTEXT.md left this to Claude's Discretion, honoring D-02/D-03.
- German-name resolution was implemented as a `LEFT JOIN` + `COALESCE` inside the two existing genre/tag `SELECT`s in `loadNormalizedAnimeMetadata`, never as a separate query — the only implementation option compatible with the locked 7-statement SQL budget (Pitfall 2 from 160-RESEARCH.md).

## Deviations from Plan

None - plan executed exactly as written. The plan's own acceptance criteria (migration shape, LEFT JOIN pattern, unchanged 7-statement budget) were met without needing any Rule 1-4 auto-fixes. The additional 8-tag/8-genre regression test and the additive-migration verification below are Auftraggeber-mandate deliverables (Punkt 1 and Punkt 5) layered on top of the plan's baseline, not deviations from it.

## Auftraggeber-Mandat Punkt 1: Additive-Migration-Nachweis

Migration 0168 is strictly additive and backward-compatible:

- **Up-migration:** only `CREATE TABLE IF NOT EXISTS tag_names (...)`, `CREATE TABLE IF NOT EXISTS genre_names (...)`, and two `CREATE INDEX IF NOT EXISTS` statements. No `ALTER TABLE`, `UPDATE`, or `DELETE` against `tags`, `genres`, `anime_tags`, or `anime_genres`. No rows are inserted into the new tables (D-03: no automatic language assignment of existing tag/genre data).
- **Down-migration:** only `DROP TABLE IF EXISTS tag_names;` / `DROP TABLE IF EXISTS genre_names;` — drops exclusively the two new tables, nothing else.
- **Live verification against `team4s_v2`** (via `docker compose exec team4sv30-backend go run ./cmd/migrate {up,down,status}` and `docker compose exec team4sv30-db psql`):
  - Before migration: `tags` = 15 rows, `genres` = 8 rows (project's documented baseline counts).
  - After `up`: `tags` = 15, `genres` = 8 (unchanged), `tag_names` = 0, `genre_names` = 0 rows (both new tables empty, as required).
  - `down` → `status` showed `168 pending` again and `\dt tag_names`/`\dt genre_names` confirmed both tables were dropped cleanly with no error.
  - `up` re-applied cleanly (`migrations applied: 1`), full round-trip proven.
  - `\d tag_names` / `\d genre_names` after re-apply confirmed both foreign keys (`tag_id → tags(id) ON DELETE CASCADE`, `genre_id → genres(id) ON DELETE CASCADE`, `language_id → languages(id)`) and both unique constraints (`uq_tag_name_language`, `uq_genre_name_language`) present.
- **Existing tags/genres WITHOUT a German name continue to work unchanged**, confirmed at three levels:
  1. **Integration test** (`TestAnimePublicReadDetailStoredSlugAndSQLBudget`): genre "Comedy" and tag "Harem" have no `genre_names`/`tag_names` row and are returned verbatim (base name), alongside "Aktion"/"Andere Welt" which DO have a German row and are returned translated — both paths exercised in the same test run.
  2. **Live production data** (after rebuilding `team4sv30-backend`): `GET /api/v1/anime/1` (Buddy Complex, no German translations exist in `team4s_v2` yet) returns `genres: ["Action","Mecha","Scifi"]` and all 8 tags (`Amnesia`, `Love Triangle`, `Male Protagonist`, `Military`, `Real Robot`, `Super Robot`, `Time Manipulation`, `War`) exactly as before the migration — the `COALESCE` fallback is the mechanism, and it is confirmed working against real, un-migrated data, not just the test fixture.
  3. **Search/admin token/import write paths** were not touched by this plan (Layer 1 only touches the public detail read); `tags.name`/`genres.name` and `anime_tags`/`anime_genres` junction rows are byte-identical before and after (row counts verified via `psql`), so those paths continue to operate against the unchanged base data exactly as before.

## Auftraggeber-Mandat Punkt 5: SQL-Nachweis (statement-count invariance)

**The extended genre/tag SELECT (the exact query now in `backend/internal/repository/anime_metadata.go`):**

```sql
-- Genres
SELECT COALESCE(gn.name, g.name)
FROM anime_genres ag
JOIN genres g ON g.id = ag.genre_id
LEFT JOIN genre_names gn ON gn.genre_id = g.id AND gn.language_id = (SELECT id FROM languages WHERE code = 'de')
WHERE ag.anime_id = $1
ORDER BY g.name ASC

-- Tags
SELECT COALESCE(tn.name, t.name)
FROM anime_tags at
JOIN tags t ON t.id = at.tag_id
LEFT JOIN tag_names tn ON tn.tag_id = t.id AND tn.language_id = (SELECT id FROM languages WHERE code = 'de')
WHERE at.anime_id = $1
ORDER BY t.name ASC
```

**Before/after statement counts, measured by the pgx query tracer in `anime_public_read_integration_test.go` against a real (schema-isolated) Postgres instance:**

| Scenario | SQL statements (traced) | Genres returned | Tags returned |
|---|---|---|---|
| Baseline (before this plan, `g.name`/`t.name` only, no LEFT JOIN) | 7 | N/A (base names only, no German resolution existed) | N/A |
| **1 tag / 1 genre**, after LEFT JOIN + COALESCE (`TestAnimePublicReadDetailSQLBudgetConstantAcrossTagGenreCount/one_tag_one_genre`) | **7** | 1 | 1 |
| **8 tags / 8 genres** (mix of translated even-indexed / untranslated odd-indexed rows), after LEFT JOIN + COALESCE (`TestAnimePublicReadDetailSQLBudgetConstantAcrossTagGenreCount/eight_tags_eight_genres_mixed_translated`) | **7** | 8 | 8 |
| `TestAnimePublicReadDetailStoredSlugAndSQLBudget` (2 genres [1 translated, 1 not] + 2 tags [1 translated, 1 not]) | **7** | 2 (`Aktion`, `Comedy`) | 2 (`Andere Welt`, `Harem`) |

The statement count is **identical (7)** across all three scenarios (1, 2, and 8 tags/genres) — direct proof that the `LEFT JOIN`/`COALESCE` approach resolves German names inside the existing two genre/tag queries with zero additional per-row or per-count statements, satisfying "ohne zusätzliche Anfrage und ohne N+1" for arbitrarily large tag/genre sets, not just the 1-vs-2 case the plan's own acceptance criteria covered.

Live test output (captured against `team4s_phase106_test_136`, schema-isolated per run):
```
anime_public_read_integration_test.go:351: one tag one genre: detail SQL statements = 7, tags=1 genres=1
anime_public_read_integration_test.go:351: eight tags eight genres mixed translated: detail SQL statements = 7, tags=8 genres=8
```

## Issues Encountered
- `docker compose exec backend ...` (the plan/mandate's literal example command) fails because the compose service is named `team4sv30-backend`, not `backend`, in this repo's `docker-compose.yml`. Used `docker compose exec team4sv30-backend go run ./cmd/migrate ...` instead — same underlying workflow, correct service name.
- `go test ./internal/repository/...` requires `TEAM4S_PHASE106_TEST_DSN` pointed at a `team4s_phase106_test_*`-named database (deliberately never reads `DATABASE_URL`); an existing scoped test database (`team4s_phase106_test_136`) was already present on `team4sv30-db` and was reused via `docker compose exec -e TEAM4S_PHASE106_TEST_DSN=... team4sv30-backend go test ...`.
- Full `go test ./internal/repository/...` run shows exactly 50 pre-existing, environment-dependent failures (missing `TEAM4S_PHASE128_TEST_DSN`, live Keycloak login, live HTTP server on port 18093) — matches the project's already-documented baseline (STATE.md, multiple prior phases cite "50 vorbestehende/umgebungsbedingte Fehlschläge"). Confirmed 0 new failures and 0 failures in any `AnimePublicRead*`/`*Metadata*`-named test.

## User Setup Required
None - no external service configuration required. Migration 0168 was applied directly against the running `team4sv30-db` container as part of this plan's execution.

## Next Phase Readiness
- `tag_names`/`genre_names` tables and the `COALESCE`-based public-read resolution are ready for Layer 2 (search filter matching, plan 160-04) and Layer 3 (public tag/genre chip display, plan 160-06) to build on directly.
- Both new tables are currently empty (no German translations written yet) — plan 160-02's admin CRUD surface is the next step needed before any German name is actually visible on the public detail page.
- No blockers.

## Self-Check: PASSED

All 5 claimed files found on disk; both task commit hashes (`338c60b1`, `8b04466e`) found in `git log`.

---
*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Completed: 2026-09-16*

---
phase: 115-globale-suche-postgres-fts
plan: 02
subsystem: database
tags: [migration, postgres-fts, pg_trgm, unaccent, tsvector, search]
status: blocked-on-live-db
requires: []
provides:
  - "unaccent-Extension + IMMUTABLE f_unaccent-Wrapper"
  - "funktionale GIN-Trigram-Indizes ueber f_unaccent(<col>) auf 5 Suchspalten"
  - "funktionale Normalisierungs-Indizes fansub_groups.name/slug (D-04-Gleichheitspfad)"
  - "gewichtete generierte tsvector-Spalten anime.search_tsv + fansub_groups.search_tsv (D-05)"
affects:
  - "Plan 115-03 (search_repository baut Queries auf diesen Indizes/Spalten auf)"
tech-stack:
  added: []
  patterns: ["IMMUTABLE-unaccent-Wrapper", "funktionale GIN-Trigram-Indizes", "generierte gewichtete tsvector-Spalte"]
key-files:
  created:
    - database/migrations/0140_search_foundation.up.sql
    - database/migrations/0140_search_foundation.down.sql
  modified:
    - docs/performance/anime-search-query-plan-tracking.md
decisions:
  - "Migrationsnummer 0140 bestaetigt (hoechste vorhanden 0139); kein Konflikt trotz paralleler main-Laeufe"
  - "Kein explizites BEGIN/COMMIT im SQL — der Migrate-Runner (runner.go) wrappt jede Datei bereits in eine eigene Transaktion (analog 0017)"
  - "unaccent-Extension wird im Down BEWUSST NICHT gedroppt (potentiell geteilt; idempotent re-anlegbar)"
  - "Normalisierungs-Ausdruck byte-identisch zu normalizeAliasKey (fansub_repository.go:1557-1566), erweitert um f_unaccent fuer Akzent-Normalisierung"
metrics:
  duration: "~20 min"
  completed: 2026-07-28
---

# Phase 115 Plan 02: Datenfundament (Migration 0140 search_foundation) Summary

Migration 0140 legt das komplette Suchdatenfundament an: `unaccent`-Extension + IMMUTABLE
`f_unaccent`-Wrapper, fünf funktionale GIN-Trigram-Indizes über `f_unaccent(<col>)`, zwei
funktionale Normalisierungs-btree-Indizes auf `fansub_groups.name/slug` und gewichtete generierte
`tsvector`-Spalten auf `anime` + `fansub_groups`. Der Code ist geschrieben, verifiziert und
committet; der **[BLOCKING] Live-Apply + EXPLAIN-Nachweis (Task 2) steht aus**, weil die
Docker-Postgres aus der Ausführungsumgebung nicht erreichbar war.

## Was umgesetzt wurde

### Task 1 — Migration 0140 up/down (ABGESCHLOSSEN, committet)
- **Nächste freie Nummer erneut verifiziert:** `0140` (höchste vorhanden `0139_member_point_totals`) — kein Konflikt trotz paralleler `main`-Läufe.
- **`CREATE EXTENSION IF NOT EXISTS unaccent`** (PG16-Bordmittel).
- **IMMUTABLE `f_unaccent(text)`-Wrapper** (`unaccent('unaccent', $1)`, `IMMUTABLE PARALLEL SAFE STRICT`) — Voraussetzung für funktionale Indizes/generierte Spalten (RESEARCH Pitfall 2: `unaccent` selbst ist nicht IMMUTABLE).
- **5 funktionale GIN-Trigram-Indizes** über `f_unaccent(<col>) gin_trgm_ops`: `anime.title`, `anime_titles.title`, `fansub_groups.name`, `fansub_groups.slug`, `fansub_group_aliases.normalized_alias`. Die 0017-Rohspalten-Indizes bleiben unangetastet (Brownfield).
- **2 funktionale btree-Normalisierungs-Indizes** auf `fansub_groups.name/slug`: `regexp_replace(lower(f_unaccent(<col>)), '[^a-z0-9]+', '', 'g')` — **byte-identisch** zum query-seitigen `normalizeAliasKey` (Plan 115-03), erweitert um `f_unaccent`. `fansub_group_aliases.normalized_alias` hat bereits einen UNIQUE-Index → kein zusätzlicher Gleichheits-Index.
- **Gewichtete generierte `tsvector`-Spalten** (Open Question 3 aufgelöst = generierte Spalte statt Ad-hoc `to_tsvector()`): `anime.search_tsv` (title=A, title_de/title_en=B) + `fansub_groups.search_tsv` (name=A, slug=B), je mit GIN-Index. Gewichtung gemäß D-05-Rangfolge.
- **`down.sql` spiegelbildlich:** DROP der generierten Spalten + GIN, der Normalisierungs-Indizes, der Trigram-Indizes und der `f_unaccent`-Funktion (in korrekter Abhängigkeitsreihenfolge). `unaccent`-Extension bewusst nicht gedroppt.

**Akzeptanzkriterien Task 1 (alle erfüllt):** `CREATE EXTENSION unaccent` ==1; `gin_trgm_ops` (non-comment) ==5 (≥5); `regexp_replace` (non-comment) ==2 (≥2); `setweight` vorhanden (≥1); `down.sql` mit passenden DROPs (9 DROP INDEX, 2 DROP COLUMN, 1 DROP FUNCTION, inkl. beider Normalisierungs-Indizes).

### Task 2 — [BLOCKING] Live-Apply + EXPLAIN-Nachweis (NICHT AUSGEFÜHRT — Live-Terminal-Handoff)
- **Blocker:** Docker-Desktop-WSL2-Engine liefert `500 Internal Server Error` (`dockerDesktopLinuxEngine`) → Postgres nicht erreichbar. Bash-Sandbox erreicht Host-Ports ohnehin nicht (Memory).
- **Kein EXPLAIN-Plan fabriziert.** Stattdessen in `docs/performance/anime-search-query-plan-tracking.md` ein neuer datierter Abschnitt „Phase 115 — search_foundation Baseline (2026-07-28) — AUSSTEHEND" mit exakten `docker compose exec`-Kommandos (`migrate up`/`status` + zwei `EXPLAIN (ANALYZE, BUFFERS)`) und der erwarteten Assertion (`Bitmap Index Scan` auf `idx_anime_title_unaccent_trgm` / `idx_fansub_group_aliases_normalized_unaccent_trgm`, kein `Seq Scan`). Feld „Angewandter Plan" bleibt leer bis zur Live-Ausführung.

## Deviations from Plan

None — Plan wie geschrieben ausgeführt. Task 2 ist per Plan-Vorgabe explizit als Checkpoint an
den Nutzer übergeben (Live-DB aus Sandbox unerreichbar), keine inhaltliche Abweichung.

## Known Stubs

Keine. Die `tsvector`-Spalten werden von PostgreSQL automatisch aus den Quellspalten materialisiert
(GENERATED ALWAYS AS ... STORED) — keine leeren Platzhalter.

## Live-DB-Handoff (Voraussetzung für Abschluss)

Der Nutzer/ein Live-Terminal muss ausführen (Details in der Perf-Doku):
1. `docker compose exec -T team4sv30-backend /app/migrate up` (bzw. `status` → `140 applied search_foundation`)
2. Beide `EXPLAIN (ANALYZE, BUFFERS)`-Queries → `Bitmap Index Scan` auf 0140-Index, kein `Seq Scan`
3. Plan-Auszug + Datum unter „Angewandter Plan" in `docs/performance/anime-search-query-plan-tracking.md` eintragen

## Commits
- `64a03be0` feat(115-02): Migration 0140 up/down (Task 1)
- `c64c91c3` docs(115-02): Perf-Doku Baseline-Handoff-Abschnitt (Task 2, Live-Apply ausstehend)

## Self-Check: PASSED
- database/migrations/0140_search_foundation.up.sql — FOUND
- database/migrations/0140_search_foundation.down.sql — FOUND
- docs/performance/anime-search-query-plan-tracking.md — FOUND (Baseline-Abschnitt vorhanden)
- Commit 64a03be0 — FOUND
- Commit c64c91c3 — FOUND

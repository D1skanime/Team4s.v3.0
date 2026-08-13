---
phase: 115-globale-suche-postgres-fts
plan: 03
subsystem: backend
tags: [search, postgres-fts, pg_trgm, unaccent, ranking, repository, search-provider]
status: complete
requires:
  - "Plan 115-02 (Migration 0140: f_unaccent, GIN-Trigram-Indizes, Normalisierungs-Indizes, tsvector-Spalten)"
provides:
  - "models.SearchQuery/SearchResult/SearchResultItem/SearchSuggestion + schmales SearchProvider-Interface (D-02)"
  - "repository.SearchRepository (einzige Postgres-Impl von SearchProvider)"
  - "Anime-Suche: f_unaccent+trgm-Matching über title/anime_titles/slug/genre/tag/tsvector, D-05-Ranking, D-11-Sichtbarkeit"
  - "Fansub-Suche: normalisierte Kürzel-/Alias-Gleichheit (D-04) + trgm-Tippfehler, D-05-Ranking, dissolved erscheint (D-11(1))"
affects:
  - "Plan 115-04 (Handler ruft SearchRepository.Search/Suggest auf)"
  - "Plan 115-08 (Live-UAT/Smoke gegen echte Daten + Meilisearch-Andockpunkt via SearchProvider)"
tech-stack:
  added: []
  patterns:
    - "WHERE/ORDER-Builder als pure Funktion (conditions/args/argPos, alle Werte $n-Bind)"
    - "SET LOCAL pg_trgm.similarity_threshold in EINER Suchtransaktion (bewusste Schwelle, nicht Session-Default)"
    - "query-seitige Normalisierung via geteilter normalizeAliasKey, byte-identisch zum funktionalen Index"
    - "deterministische ORDER-BY-CASE-Rangstufen (D-05), Popularität nur letzte Tie-Break-Ebene"
    - "Compile-time-Interface-Assertion (var _ models.SearchProvider)"
key-files:
  created:
    - backend/internal/models/search.go
    - backend/internal/repository/search_anime.go
    - backend/internal/repository/search_fansub.go
    - backend/internal/repository/search_repository.go
    - backend/internal/repository/search_repository_test.go
  modified: []
decisions:
  - "D-02: SearchProvider ist ein schmales Zwei-Methoden-Interface mit genau einer Postgres-Impl; kein Factory/Registry/Multi-Provider-Switch (dokumentierter Meilisearch-Andockpunkt)"
  - "D-04: qNorm = normalizeAliasKey(q) als eigener $n-Bind; Spalten-Seite spiegelt regexp_replace(lower(f_unaccent(name/slug)),'[^a-z0-9]+','','g') byte-identisch zum Index aus 0140"
  - "SET LOCAL pg_trgm.similarity_threshold als geteilte Konstante searchTrgmThresholdSQL in search_anime.go, einmal pro Suchtransaktion via search_repository.go ausgeführt"
  - "Fansub-Ranking-Stufe 6 (Beschreibung) entfällt in v1 (Open Question 4: fansub_groups.description in 0071 entfernt; Notes visibility-gated)"
  - "Anime-Suche setzt V2-Schema (anime.slug/cover_image) voraus — konsistent zum Live-DB-Stand; Nicht-V2-Fallback nicht nachgebaut (Live-Verhalten Plan 115-08)"
  - "SearchResultItem trägt gemeinsame Anzeigeform (Typ-Diskriminator anime|fansub); PaginationMeta nicht neu definiert (Wiederverwendung im Handler-Envelope)"
metrics:
  duration: "~30 min"
  completed: 2026-07-28
  tasks: 3
  files: 5
---

# Phase 115 Plan 03: Such-Repository-Schicht + D-05-Ranking + Sichtbarkeit + schmaler SearchProvider Summary

Die Postgres-Repository-Schicht der globalen Suche steht: `SearchRepository` durchsucht Anime
(`anime.title` + alle `anime_titles`-Typen + `slug` + Genre/Tag + tsvector) und Fansubgruppen
(`name`/`slug`/Aliase) indexgestützt über `f_unaccent()`+`pg_trgm` (statt der abgelösten
ungeindexten Teilstring-Suche), mit deterministischem D-05-CASE-Ranking (Popularität nur als letzte
Tie-Break-Ebene), serverseitiger D-11-Sichtbarkeit (disabled aus, dissolved rein) und einem
schmalen `SearchProvider`-Interface mit genau einer Impl. Bindestrich-/Leerzeichen-/Kürzel-Varianten
(`team-4s`/`team 4s`/`T4S`) lösen deterministisch über die geteilte `normalizeAliasKey`-Normalisierung
auf beiden Seiten auf. Alle drei Dateien liegen unter 450 Zeilen; `go build ./...` und
`go test ./internal/repository -run TestSearch` sind grün.

## Was umgesetzt wurde

### Task 1 — models/search.go (Contract zuerst) · Commit b96ad765
- `SearchQuery` mit optionalen Filtern als Zeiger (`*int16`/`*string`/`*int64`, analog AdminAnimeFilter):
  `Q, Type, YearFrom, YearTo, Genre, Tag, Format, Status, FansubGroup, Page, PerPage, Sort, IncludeDisabled`.
- `SearchResultItem` (Typ-Diskriminator `anime|fansub`, snake_case JSON-Tags), `SearchSuggestion`,
  `SearchEntityResult{Items,Total}`, `SearchResult{Anime,Fansub}`.
- Schmales `SearchProvider`-Interface (`Search`/`Suggest`) mit dokumentiertem Meilisearch-Andockpunkt
  (D-02/D-10). Kein Factory/Registry. `PaginationMeta` NICHT neu definiert (Wiederverwendung).

### Task 2 — search_anime.go · Commit aa8c9c83
- Pure `buildSearchAnimeQuery` (WHERE) + `buildSearchAnimeOrder` (ORDER) — conditions/args/argPos,
  alle Werte als `$n`-Bind.
- Matching: `f_unaccent(anime.title) % f_unaccent($1)` + EXISTS auf `anime_titles` (alle Typen) +
  Slug-Präfix + `search_tsv @@ plainto_tsquery` + Genre/Tag (`anime_genres`/`anime_tags`).
- D-05-CASE: (0) exakter Haupttitel → (1) exakter alt. Titel → (2) Präfix → (3) trgm → (4) Genre/Tag →
  (5) tsvector → (6) Rest; danach `ts_rank`, dann `COALESCE(view_count,0) DESC` NUR als letzte
  Tie-Break-Ebene, dann `display_title ASC`.
- Sichtbarkeit: `status <> 'disabled'` außer explizitem `status=` oder `IncludeDisabled` (Admin).
- Bewusste trgm-Schwelle als geteilte Konstante `searchTrgmThresholdSQL` ("SET LOCAL pg_trgm.similarity_threshold = 0.30").

### Task 3 — search_fansub.go + search_repository.go + Tests · Commit 6d0fcd30
- `buildSearchFansubQuery`/`buildSearchFansubOrder`: `qNorm := normalizeAliasKey(q)` als eigener
  `$2`-Bind; Match über trgm-Name, Slug-Präfix, `regexp_replace(...) = $qNorm`/Präfix auf name/slug
  (byte-identisch zum 0140-Index), `normalized_alias = $qNorm` + Alias-trgm, tsvector.
- D-05-CASE: (0) exaktes Kürzel (normalized_alias ODER normalisierter Name) → (1) exakter Name →
  (2) exakter Slug → (3) alt./früherer Name (Alias-trgm) → (4) Teiltreffer Name (trgm) → (5) Rest.
  Beschreibung entfällt in v1.
- KEIN impliziter Statusausschluss → `dissolved` erscheint (D-11(1)); nur expliziter `status=` filtert.
- `SearchRepository` (`*pgxpool.Pool`, Konstruktor wie AnimeRepository) implementiert
  `models.SearchProvider` (`var _ models.SearchProvider = (*SearchRepository)(nil)`); `Search`
  dispatcht nach `Type` (all|anime|fansub) und komponiert Items+Total je Entität in EINER Transaktion
  (zuerst `SET LOCAL`-Schwelle). `Suggest` liefert Präfix-basierte Vorschläge über beide Entitäten.
- `search_repository_test.go`: Pure-Function-Tests der WHERE/ORDER-Komposition, Sichtbarkeit
  (Default/IncludeDisabled/explizit), Injection-Bind (`'; DROP TABLE …` bleibt Bind-Param), kein
  impliziter Fansub-Statusfilter und der D-04-Determinismus (`normalizeAliasKey("team-4s")==
  "team 4s"=="team4s"`, `"T4S"=="t4s"`).

## Abweichungen vom Plan

Keine Rule-1/2/3-Fixes nötig. Zwei planinterne Umsetzungsentscheidungen dokumentiert:
- **Task-2-Acceptance `pg_trgm.similarity_threshold` in search_anime.go:** Die tatsächliche
  `SET LOCAL`-Ausführung liegt architektursauber in `search_repository.go` (einmal pro Transaktion).
  Damit die Schwelle bei der Match-Logik sichtbar/gepinnt bleibt (und die Task-2-Acceptance greift),
  ist sie als geteilte Konstante `searchTrgmThresholdSQL` in search_anime.go definiert und wird von
  dort referenziert.
- **V2-Schema-Annahme (Anime):** `searchAnime` selektiert `anime.slug`/`anime.cover_image` direkt
  (V2-Schema, wie im Live-Stand vorhanden). Der ältere Nicht-V2-Zweig aus `AnimeRepository.List`
  wurde bewusst NICHT nachgebaut — der Plan verlangt slug-Match und die Live-DB ist V2. Das
  Live-Verhalten wird in Plan 115-08 verifiziert.

## Sicherheit (Threat-Register)

- **T-115-03-01 (Tampering):** Alle q-/qNorm-/Filterwerte fließen ausschließlich als `$n`-Bind-Parameter;
  Normalisierung passiert in Go VOR dem Binden. Pure-Function-Test beweist, dass bösartiger Input
  (`'; DROP TABLE anime; --`) nicht in den SQL-String gelangt.
- **T-115-03-02 (Info Disclosure):** `status <> 'disabled'` serverseitig durchgesetzt, nur mit
  Admin-`IncludeDisabled` deaktivierbar.
- **T-115-03-04 (Info Disclosure):** Fansub-Notes/Beschreibung in v1 NICHT durchsucht → kein Leak
  visibility-gated Freitext.

## Verifikation

- `cd backend && go build ./...` — grün.
- `cd backend && go test ./internal/repository -run TestSearch` — grün (`ok … 3.122s`).
- Grep-Gates erfüllt: f_unaccent≥2, keine `ILIKE '%`-Art (0), Schwelle gesetzt, normalizeAliasKey
  wiederverwendet, `normalized_alias =` + `regexp_replace` vorhanden, keine `abbreviation`-Spalte,
  kein `dissolved`-Ausschlussfilter, `var _ models.SearchProvider` == 1.
- Dateigrößen: models/search.go 71 Z., search_anime.go 208 Z., search_fansub.go 149 Z.,
  search_repository.go 124 Z. — alle ≤450.

## Deferred / nächste Schritte

- **Live-DB-Verhalten** (findet „Koe no Katachi", echte Ranking-Reihenfolge, dissolved erscheint,
  „team-4s"→„Team4s"-Auflösung gegen echte Daten) ist NICHT hier automatisiert beweisbar → Plan
  115-08 Smoke/UAT (Manual-Only, Docker war während dieser Ausführung down). Die WHERE/ORDER-
  Komposition ist hier pure-function abgesichert.
- Handler-Anbindung (`Search`/`Suggest`, q≥2, page_size-Cap) folgt in Plan 115-04.

## Known Stubs

Keine. Alle Funktionen sind vollständig verdrahtet; die einzige nicht hier ausführbare Ebene ist
die Live-DB-Ausführung (Docker down → Plan 115-08), keine hartcodierten Platzhalterwerte im Code.

## Self-Check: PASSED
- FOUND: backend/internal/models/search.go
- FOUND: backend/internal/repository/search_anime.go
- FOUND: backend/internal/repository/search_fansub.go
- FOUND: backend/internal/repository/search_repository.go
- FOUND: backend/internal/repository/search_repository_test.go
- FOUND commit: b96ad765 (Task 1)
- FOUND commit: aa8c9c83 (Task 2)
- FOUND commit: 6d0fcd30 (Task 3)

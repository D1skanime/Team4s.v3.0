---
phase: 115-globale-suche-postgres-fts
plan: 04
subsystem: backend
tags: [search, handler, openapi, route-wiring, pagination-envelope, smoke, keycloak]
status: complete
requires:
  - "Plan 115-03 (repository.SearchRepository.Search/Suggest + models.SearchQuery/SearchResult/SearchResultItem)"
provides:
  - "handlers.SearchHandler.Search + .Suggestions (Param-Validierung, per_page-Cap, q-Mindestlaenge, Admin-Gate, {data,meta}-Envelope)"
  - "repository.SearchRepository.SearchSuggestions (gruppiert, je Gruppe LIMIT 5, D-09)"
  - "Oeffentliche Routen GET /api/v1/search (+ /search/suggestions) mit authOptionalMiddleware (Admin-Override)"
  - "OpenAPI-Kontrakt /api/v1/search (+ /suggestions) + Schemas SearchResultItem/SearchEntityResult/SearchResult/PaginatedSearchResponse/SearchSuggestionsResponse"
  - "scripts/smoke-search.ps1 (Keycloak-Direct-Grant Validierungs-Harness fuer D-04/D-05/D-11/D-12/D-07)"
affects:
  - "Plan 115-05 (Frontend-Datenschicht konsumiert genau diesen Kontrakt)"
  - "Plan 115-08 (Live-Smoke/UAT fuehrt smoke-search.ps1 gegen echte Daten aus)"
tech-stack:
  added: []
  patterns:
    - "Param-Validierung 1:1 nach handlers/anime.go (parsePositiveInt, badRequest, TrimSpace, per_page-Cap, Enum-Whitelist)"
    - "q-Mindestlaenge runen-basiert (utf8.RuneCountInString) — 1-Zeichen-Umlaut wird nicht per Byte-Laenge durchgelassen"
    - "type-Whitelist bildet API-Wert 'alle' auf internen Repository-Diskriminator 'all' ab"
    - "Pagination-Envelope: strukturiertes data (anime/fansub) + wiederverwendete PaginationMeta; total_pages aus groesserer Entitaets-Trefferzahl"
    - "Handler baut KEINE SQL-Strings (kein fmt.Sprintf); alle Werte als Struct-Felder ins Repository"
key-files:
  created:
    - backend/internal/handlers/search.go
    - backend/internal/handlers/search_test.go
    - backend/internal/repository/search_suggestions.go
    - scripts/smoke-search.ps1
  modified:
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
decisions:
  - "D-07-Envelope: data ist strukturiert {anime:{items,total}, fansub:{items,total}} statt flacher Liste, weil das Repository jede Entitaet unabhaengig paginiert; top-level {data,meta} + PaginationMeta bleiben wiederverwendet (kein neuer Envelope-Typ)"
  - "total_pages = ceil(max(anime.total, fansub.total)/per_page) — Seiten erst erschoepft, wenn die groessere Trefferliste durch ist; fuer type=anime/fansub degradiert das korrekt zur jeweiligen Entitaet"
  - "sort-Whitelist enthaelt in v1 nur 'relevance' (deterministisches D-05-Ranking); weitere Sortierungen bewusst nicht verdrahtet (kein Over-Claim), invalider sort -> 400"
  - "status wird als getrimmter, laengenbegrenzter Bind-Parameter durchgereicht (keine Enum-Whitelist), da gueltige Status-Werte zwischen Anime und Fansub differieren"
  - "Suggestions nutzt die neue SearchSuggestions-Methode (LIMIT 5/Gruppe) statt der generischen SearchProvider.Suggest-Methode; letztere bleibt fuer den Interface-Kontrakt bestehen"
metrics:
  duration: "~40 min"
  completed: 2026-07-28
  tasks: 3
  files: 6
---

# Phase 115 Plan 04: GET /api/v1/search (+ /suggestions) Handler + Route + OpenAPI + Smoke Summary

Der oeffentliche Suchendpunkt steht: `handlers.SearchHandler` validiert alle Query-Parameter nach den
Bestandskonventionen (`handlers/anime.go`), erzwingt die q-Mindestlaenge (≥2, runen-basiert) und
-Maxlaenge (100), klemmt `per_page` auf 100, whitelistet `type` (alle|anime|fansub → intern all/anime/
fansub) und `sort` (v1: nur relevance), gated disabled-Anime ueber die Plattform-Admin-Identitaet und
liefert den `{"data": SearchResult, "meta": PaginationMeta}`-Envelope. Alle Werte fliessen ausschliesslich
als Struct-Felder in `SearchRepository.Search` — der Handler bildet keine SQL-Strings (kein `fmt.Sprintf`).
Die Routen sind oeffentlich mit `authOptionalMiddleware` registriert; der OpenAPI-Kontrakt ist rein
additiv ergaenzt (`/api/v1/anime` + `/api/v1/fansubs` unangetastet). `scripts/smoke-search.ps1` deckt die
Live-Verhaltensfaelle D-04/D-05/D-11/D-12/D-07 ab (Ausfuehrung in Plan 115-08).

## Was umgesetzt wurde

### Task 1 — SearchHandler + Suggestions + SearchSuggestions-Repository · Commit e69b0964
- `handlers/search.go`: `SearchHandler{repo}` + `NewSearchHandler`; `Search` parst page/per_page/q/type/
  sort/year_from/year_to/genre/tag/format/status/fansub_group/include_disabled, jeweils mit `badRequest`
  (deutsche Meldungen, korrekte Umlaute). q-Mindestlaenge via `utf8.RuneCountInString` (1-Zeichen-Umlaut
  wird abgewiesen), maxLength via `len(q)`. Admin-Gate exakt wie `anime.go:119-127`.
- `Suggestions`: q≥2/≤100, ruft `repo.SearchSuggestions`, liefert gruppierte, je Gruppe auf 5 begrenzte
  Vorschlaege.
- `buildSearchMeta`: reine Envelope-Funktion (total = Summe beider Entitaeten; total_pages aus groesserer
  Trefferzahl) — DB-frei testbar.
- `repository/search_suggestions.go`: `SearchSuggestions` (LIMIT `searchSuggestionsPerGroup`=5, EINE
  Transaktion mit bewusst gesetzter trgm-Schwelle; Praefix-Prioritaet stammt aus dem bestehenden
  ORDER-BY-CASE der Such-Queries).
- `handlers/search_test.go`: Validierungs-/Status-Code-Tests (q fehlt, q<2, 1-Zeichen-Umlaut, q>100,
  ungueltiger type/sort/page/per_page/year_from/fansub_group → 400), Whitelist-Mapping-Test und
  Envelope-Meta-Tests (`buildSearchMeta`, Serialisierbarkeit). `go test ./internal/handlers -run TestSearch`
  gruen.

### Task 2 — Route-Wiring (main.go) + OpenAPI-Kontrakt · Commit ef5960e6
- `main.go`: `searchRepo := repository.NewSearchRepository(dbPool)` + `searchHandler := handlers.
  NewSearchHandler(searchRepo)`; Routen `v1.GET("/search", authOptionalMiddleware, searchHandler.Search)`
  und `v1.GET("/search/suggestions", authOptionalMiddleware, searchHandler.Suggestions)` (oeffentlich,
  Admin-Override via authOptional).
- `openapi.yaml` additiv (+230 Zeilen, 0 Loeschungen): Pfade `/api/v1/search` (+ `/suggestions`) mit
  Params (q minLength:2/maxLength:100, type/sort Enums, year_from/year_to/genre/tag/format/status/
  fansub_group, page/per_page mit minimum/maximum/default), responses 200/400/500 mit examples; Schemas
  `SearchResultItem`/`SearchEntityResult`/`SearchResult`/`PaginatedSearchResponse`/
  `SearchSuggestionsResponse`. YAML parst (js-yaml). `/api/v1/anime` + `/api/v1/fansubs` unveraendert.

### Task 3 — scripts/smoke-search.ps1 · Commit 2640db58
- Keycloak-Direct-Grant-Harness (csubs-leader/123, Client team4s-frontend) analog `smoke-fansubs.ps1`.
- Host-Ports zur Laufzeit aus `docker ps` (Backend 8092, Keycloak 8080) — NICHT aus .env (per Kommentar
  dokumentiert). Sauberer Skip (Exit 0) bei fehlender Live-Umgebung (kein Hard-Fail im CI).
- Assertions: (a) D-12 "Koe no Katachi"/"Eiga Koe no Katachi" → Ziel-Anime; (b) D-04 "Narotu"→Naruto,
  "T4S"/"team-4s"→Team4s; (c) D-05 exakter Haupttitel Rang 1; (d) D-11 dissolved erscheint, disabled
  admin-gated (mit/ohne Admin-Token); (e) D-07 q<2/q>100/invalider type → 400. PowerShell-Parser: OK.

## Abweichungen vom Plan

Keine Rule-1/2/3-Fixes noetig. Zwei planinterne Umsetzungsentscheidungen dokumentiert:
- **Envelope-Form (kritischer Constraint):** Der Constraint verlangt `{"data": …, "meta": PaginationMeta}`
  ohne neuen Envelope-Typ. Da `SearchRepository.Search` strukturiert `SearchResult{anime,fansub}` mit je
  eigener `total` zurueckgibt (unabhaengige Pagination pro Entitaet), ist `data` bewusst strukturiert statt
  flach: eine flache Liste wuerde die pro-Entitaet-Trefferzahlen verlieren, die die Frontend-Tabs (D-08)
  brauchen, und zwei getrennt paginierte Listen liessen sich nicht sinnvoll zu einer flachen Seite
  zusammenfuehren. Top-level `{data, meta}` und `models.PaginationMeta` bleiben wiederverwendet — es wird
  KEIN neuer Envelope-Typ erfunden.
- **sort v1-Umfang:** Das Repository (`buildSearchAnimeOrder`/`buildSearchFansubOrder`) wertet `Sort`
  aktuell nicht aus; die Reihenfolge ist immer das D-05-Relevanz-Ranking. Die sort-Whitelist enthaelt
  daher nur `relevance` (ehrlich, kein Over-Claim). Weitere Sortierungen sind ein spaeteres Increment.

## Sicherheit (Threat-Register)

- **T-115-04-01 (Tampering / Injection):** Handler baut keine SQL-Strings (`grep -c "fmt.Sprintf"` = 0);
  q und alle Filter gehen als Struct-Felder in `SearchQuery` und dort als `$n`-Bind-Parameter (Plan 03).
- **T-115-04-02 (DoS):** q-Mindestlaenge ≥2 (runen-basiert) + maxLength 100; per_page-Cap 100;
  Filter-Strings laengenbegrenzt (100); Suggestions-LIMIT 5/Gruppe (D-09).
- **T-115-04-03 (Info Disclosure):** disabled-Anime nur mit `identity.IsPlatformAdmin` +
  `include_disabled=true` (exakt wie anime.go); sonst `status <> 'disabled'` (Repository, Plan 03).
- **T-115-04-04 (DoS via Enum):** type/sort per Whitelist vor jedem Repository-Aufruf → 400.
- **T-115-04-SC (Paketinstalls):** Keine neuen Pakete; nur Go-Stdlib + Bordmittel-PowerShell.

## Verifikation

- `cd backend && go build ./...` — gruen.
- `cd backend && go build ./cmd/server` — gruen.
- `cd backend && go test ./internal/handlers -run TestSearch` — gruen (`ok … 3.712s`).
- Grep-Gates: `len(q)`=2, `fmt.Sprintf`=0 (Handler), `/search` in main.go=2, `/api/v1/search` in
  openapi=2, `PaginatedSearchResponse`=2; openapi-Diff rein additiv (+230/-0).
- OpenAPI parst (js-yaml); PowerShell-Skript parst (.NET-Parser: PARSE_OK).
- Dateigroessen: search.go 271 Z., search_suggestions.go 58 Z., search_test.go 160 Z. — alle ≤450.

## Deferred / naechste Schritte

- **Live-End-to-End** (D-12 "Koe no Katachi" findet Ziel, D-04-Alias-Aufloesung, D-05-Ranking-Reihenfolge,
  D-11 dissolved/disabled) ist hier NICHT automatisiert beweisbar (Docker down) → Plan 115-08 fuehrt
  `smoke-search.ps1` gegen echte Daten aus. Der 200-Envelope-Pfad (DB-gebunden) ist deshalb nur ueber die
  reine `buildSearchMeta`-Funktion getestet; die 400-Validierung ist vollstaendig unit-getestet.
- Container-Rebuild vor Live-Test noetig (`docker compose up -d --build team4sv30-backend`), damit die neue
  Route erscheint (Memory „Backend ist Docker auf :8092").

## Known Stubs

Keine. Handler, Route, Kontrakt und Smoke-Harness sind vollstaendig verdrahtet. Die einzige nicht hier
ausfuehrbare Ebene ist die Live-DB-Ausfuehrung (Docker down → Plan 115-08) — keine hartcodierten
Platzhalterwerte im Code.

## Self-Check: PASSED
- FOUND: backend/internal/handlers/search.go
- FOUND: backend/internal/handlers/search_test.go
- FOUND: backend/internal/repository/search_suggestions.go
- FOUND: scripts/smoke-search.ps1
- FOUND: .planning/phases/115-globale-suche-postgres-fts/115-04-SUMMARY.md
- FOUND commit: e69b0964 (Task 1)
- FOUND commit: ef5960e6 (Task 2)
- FOUND commit: 2640db58 (Task 3)

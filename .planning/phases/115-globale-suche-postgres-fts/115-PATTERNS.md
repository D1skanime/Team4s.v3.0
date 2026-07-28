# Phase 115: Globale Suche (PostgreSQL FTS + Trigram) - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 26 (neu + geändert)
**Analogs found:** 22 / 26 (4 ohne engen Analog → RESEARCH-Muster)

> Alle neuen Dateien orientieren sich an bestehenden Brownfield-Mustern. **Globales UI-System
> (`@/components/ui`) schlägt jeden lokalen Analog** (CLAUDE.md). `AnimeBrowserFilters.tsx`
> (rohe `<input>/<button>`) und die V1/V2-Schema-Introspektion (`anime_schema.go`/`anime_v2.go`)
> sind **explizit keine** Vorlagen. Nächste **freie** Migrationsnummer = **0140** (höchste vorhanden: `0139`).

---

## File Classification

| Neue/Geänderte Datei | Rolle | Data Flow | Nächster Analog | Match |
|----------------------|-------|-----------|-----------------|-------|
| `backend/internal/handlers/search.go` | handler | request-response | `backend/internal/handlers/anime.go` (`List`) | exact |
| `backend/internal/handlers/search_test.go` | test | request-response | `backend/internal/handlers/fansub_test.go` + `anime`-Handler-Tests | role-match |
| `backend/internal/repository/search_repository.go` | repository | CRUD/query | `repository/anime.go` (`buildAnimeListWhere`) + `fansub_repository.go` (`buildFansubGroupWhere`) | exact |
| `backend/internal/repository/search_anime.go` | repository | query | `repository/anime.go` (`primaryNormalizedTitleSQL`, List) | exact |
| `backend/internal/repository/search_fansub.go` | repository | query | `repository/fansub_repository.go` (`buildFansubGroupWhere`, `scanFansubGroup`) | exact |
| `backend/internal/repository/search_suggestions.go` (opt.) | repository | query | `repository/admin_content.go` (`ListGenreTokens`/`filterGenreTokens`) | exact |
| `backend/internal/models/search.go` | model | — | `models/admin_content.go` (`AdminAnimeFilter`/`PaginationMeta` in `models/anime.go`) | role-match |
| `database/migrations/0140_search_foundation.up/down.sql` | migration | schema | `database/migrations/0017_anime_search_trgm.up.sql` | exact |
| `shared/contracts/openapi.yaml` (`/api/v1/search`) | config/contract | — | `shared/contracts/openapi.yaml` (`/api/v1/anime`) | exact |
| `backend/cmd/server/main.go` (Route + Handler-Wiring) | config | — | `main.go:73,361` (`NewAnimeHandler`, `v1.GET("/anime", …)`) | exact |
| `backend/internal/repository/admin_content_anime_metadata.go` (D-12) | repository | write-path | *selbst* (Mapping-Fix an `:51`,`:83`) | in-place |
| `backend/internal/services/anime_create_enrichment.go` (D-12) | service | write-path | *selbst* (`buildAniSearchAltTitles:1380-1383`) | in-place |
| `backend/internal/models/admin_content.go` (D-12 Persistenz) | model | — | *selbst* (`AdminAnimeCreateInput`/`PatchInput`) | in-place |
| `backend/internal/repository/admin_content.go` (D-12 Persistenz) | repository | write-path | *selbst* (`upsertAuthoritativeAnimeTitle`) | in-place |
| `backend/internal/repository/admin_content_test.go` (D-12) | test | — | *selbst* erweitern | in-place |
| `backend/internal/services/anime_create_enrichment_test.go` (D-12) | test | — | *selbst* erweitern | in-place |
| `frontend/src/app/suche/page.tsx` | route/page | request-response | `frontend/src/app/anime/page.tsx` (searchParams → API → Render) | role-match |
| `frontend/src/app/suche/SearchField.tsx` | component | event-driven | UI-SPEC → `@/components/ui` `Input` | ui-primitive |
| `frontend/src/app/suche/SuggestionList.tsx` | component | event-driven | UI-SPEC → `Card`/`Badge`/`SectionHeader` | ui-primitive |
| `frontend/src/app/suche/SearchResults.tsx` | component | request-response | UI-SPEC → `Tabs`/`Card`/`Pagination` | ui-primitive |
| `frontend/src/app/suche/SearchFilters.tsx` | component | event-driven | UI-SPEC → `Select`/`YearPicker`/`Badge`(Chips) | ui-primitive |
| `frontend/src/app/suche/SearchFilterDrawer.tsx` | component | event-driven | UI-SPEC → `Drawer` | ui-primitive |
| `frontend/src/app/suche/useDebouncedSearch.ts` | hook | event-driven | **kein Analog** (neu, RESEARCH Punkt 9) | no-analog |
| `frontend/src/app/suche/*.test.tsx` | test | — | Vitest-Muster `frontend/src/components/ui/*.test.tsx` | role-match |
| `frontend/src/lib/api.ts` (`getSearch`/`getSearchSuggestions`) | utility | request-response | `api.ts` (`getAnimeList`+`buildQuery`, `getFansubList`+`buildFansubListQuery`) | exact |
| `frontend/src/components/layout/AppShell.tsx` (Nav) | component | — | *selbst* (`AppShellNavGroups:120`, `AppShellAnonNavGroups:186`) | in-place |

---

## Pattern Assignments

### `backend/internal/handlers/search.go` (handler, request-response)

**Analog:** `backend/internal/handlers/anime.go` (`AnimeHandler.List`, Zeilen 18–172)

**Handler-Struct + Konstruktor** (anime.go:31–61) — gleiche explizite DI, `strings.TrimSpace` im Konstruktor:
```go
type AnimeHandler struct {
    repo            *repository.AnimeRepository
    // ...
}
func NewAnimeHandler(repo *repository.AnimeRepository, ...) *AnimeHandler { ... }
```
Übernehmen als `SearchHandler{ repo *repository.SearchRepository }` / `NewSearchHandler(...)`.

**Param-Validierung (V5 Input Validation, D-07)** (anime.go:64–138) — genau dieses Muster kopieren:
```go
page, err := parsePositiveInt(c.DefaultQuery("page", "1"))
if err != nil { badRequest(c, "ungültiger page parameter"); return }
perPage, err := parsePositiveInt(c.DefaultQuery("per_page", "24"))
if err != nil { badRequest(c, "ungültiger per_page parameter"); return }
if perPage > 100 { perPage = 100 }
q := strings.TrimSpace(c.Query("q"))
if len(q) > 100 { badRequest(c, "ungültiger q parameter"); return }
```
- **Enum-Whitelist** wie `allowedAnimeStatuses`/`allowedContentTypes` (anime.go:18–29) für `type` (`alle|anime|fansub`) und `sort`.
- **Mindestlänge `q ≥ 2`** serverseitig erzwingen (Security-DoS-Mitigation, UI-SPEC) — zusätzlich zur `maxLength`-Prüfung.
- **Admin-Gate** für disabled-Anime exakt wie anime.go:119–127 (`middleware.CommentAuthIdentityFromContext` → `identity.IsPlatformAdmin`). Ohne Admin: `status <> 'disabled'`.

**Envelope + Pagination** (anime.go:152–172) — identisch übernehmen:
```go
items, total, err := h.repo.Search(c.Request.Context(), query)
if err != nil { writeInternalErrorResponse(c, "interner serverfehler", err, "Suche konnte nicht geladen werden."); return }
totalPages := 0
if total > 0 { totalPages = int(math.Ceil(float64(total) / float64(perPage))) }
c.JSON(http.StatusOK, gin.H{
    "data": items,
    "meta": models.PaginationMeta{ Total: total, Page: page, PerPage: perPage, TotalPages: totalPages },
})
```

---

### `backend/internal/repository/search_repository.go` (+ `search_anime.go`, `search_fansub.go`)

**Analog:** `repository/anime.go` (`buildAnimeListWhere` 330–394, `primaryNormalizedTitleSQL` 298–328) und `repository/fansub_repository.go` (`buildFansubGroupWhere` 1338–1374).

**WHERE-Builder-Muster** — `conditions []string` + `args []any` + `argPos`, alle Werte als `$n`-Bind-Parameter (NIE String-Konkatenation von `q`):
```go
// Source: anime.go:330-394 — Struktur beibehalten, ILIKE '%..%' durch unaccent()+pg_trgm ersetzen
conditions := make([]string, 0, 3); args := make([]any, 0, 3); argPos := 1
if filter.Q != "" {
    conditions = append(conditions, fmt.Sprintf("(%s ILIKE $%d OR title_de ILIKE $%d OR ... EXISTS (SELECT 1 FROM anime_titles at WHERE at.anime_id = anime.id AND at.title ILIKE $%d))", displayTitleExpr, argPos, argPos, argPos))
    args = append(args, "%"+filter.Q+"%"); argPos++
}
```
→ **Ersetzen:** `ILIKE '%q%'` durch `unaccent(<col>) % unaccent($n)` (pg_trgm-Match) + `ts_rank(<tsvector>, plainto_tsquery(...))` fürs Ranking. Struktur/`argPos`-Schema bleibt.

**Titel-Rang bereits vorhanden** (anime.go:298–328) — `primaryNormalizedTitleSQL` ordnet Sprachen/Typen; `tt.name='romaji'` ist bereits vorgesehen und passt exakt zum D-12-Zielmapping. Die Suche muss `anime_titles` über **alle** Typen (main/de/en/official/japanese/**romaji**/synonym) plus `anime.title` durchsuchen.

**Sichtbarkeitsfilter Anime** (anime.go:342–348) — übernehmen:
```go
if filter.Status != "" { /* explizit */ } else if !filter.IncludeDisabled {
    conditions = append(conditions, "status <> 'disabled'")
}
```

**Fansub-Match + KEIN impliziter Statusausschluss** (fansub_repository.go:1338–1374) — `dissolved` ERSCHEINT (D-11(1)); Status nur bei explizitem `status=`-Param:
```go
// name ILIKE $ OR slug ILIKE $ OR EXISTS(fansub_group_aliases fga WHERE fga.alias ILIKE $)
if filter.Status != "" { conditions = append(conditions, fmt.Sprintf("status = $%d", argPos)); args = append(args, filter.Status) }
```
→ D-05 „exaktes Kürzel" = exakter Treffer auf `fansub_group_aliases.normalized_alias`; „alt./früherer Name" = weitere Aliase. **Keine** neue `abbreviation`-Spalte (Pitfall 4).

**Ranking-Determinismus (D-05):** D-05-Rangstufen als deterministische `ORDER BY CASE …`-Ebenen (analog dem CASE-Ranking in `primaryNormalizedTitleSQL`). Popularität/`view_count` nur **letzte** Tie-Break-Ebene — nie in die Primärsortierung (Anti-Pattern RESEARCH).

**Split-Grund:** ≤450 Zeilen/Datei (CLAUDE.md). Anime-Teil → `search_anime.go`, Fansub-Teil → `search_fansub.go`, Komposition/Envelope → `search_repository.go` (Vorbild: `anime.go`/`fansub_repository.go` sind bereits so gesplittet).

---

### `backend/internal/repository/search_suggestions.go` (optional, query) — falls `/suggestions`

**Analog:** `repository/admin_content.go` (`ListGenreTokens` 255–279, `filterGenreTokens` 219–253).

**Präfix-priorisiertes Ranking** (admin_content.go:229–246) — exakte Vorlage für D-05-Stufe „Präfix vor ähnlich" und gruppierte Vorschläge:
```go
sort.Slice(filtered, func(i, j int) bool {
    if q != "" {
        leftPrefix := strings.HasPrefix(leftName, q); rightPrefix := strings.HasPrefix(rightName, q)
        if leftPrefix != rightPrefix { return leftPrefix }
    }
    if leftName != rightName { return leftName < rightName }
    return filtered[i].Count > filtered[j].Count
})
if limit > 0 && len(filtered) > limit { filtered = filtered[:limit] }   // LIMIT für Vorschläge (D-09)
```
→ Vorschläge **serverseitig begrenzen** (z. B. max 5/Gruppe, UI-SPEC Interaction Contract).

---

### `backend/internal/models/search.go` (model)

**Analog:** `models/anime.go` (`AnimeFilter`, `PaginationMeta`) — Referenzen in `handlers/anime.go:140-171`.

- `SearchQuery{ Q, Type, YearFrom, YearTo, Genre, Tag, Format, Status, FansubGroup, Page, PerPage, Sort, IncludeDisabled }` — Feldbenennung/`*int16`/`*string`-Optionalität wie `AnimeFilter` (models/admin_content.go:75–95).
- `SearchResult`/`SearchSuggestion`-Structs mit JSON-Tags im snake_case-Stil (vgl. `AdminAnimeCreateDraftPayload`, models/admin_content.go:111–129).
- **`PaginationMeta` wiederverwenden** (nicht neu definieren) — `models.PaginationMeta{Total,Page,PerPage,TotalPages}`.
- `SearchProvider`-Interface (D-02) **nur** aufnehmen, wenn pattern-konform/kein Overengineering — RESEARCH: derzeit optional (kein zweiter Provider). Bei Aufnahme: schmales Interface, eine Postgres-Impl.

---

### `database/migrations/0140_search_foundation.up.sql` (migration, schema)

**Analog:** `database/migrations/0017_anime_search_trgm.up.sql` (kompletter Inhalt):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_anime_title_trgm ON anime USING gin (title gin_trgm_ops);
```
**Übernehmen + erweitern:**
- `CREATE EXTENSION IF NOT EXISTS unaccent;` (fehlt bislang — RESEARCH).
- **Funktionale** GIN-Trigram-Indizes über `unaccent(<col>)` (nicht Rohspalte!) — sonst Seq Scan (Pitfall 2). `unaccent` ist nicht IMMUTABLE → IMMUTABLE-Wrapper oder generierte Spalte nötig.
- Trigram-/GIN-Indizes auch auf `anime_titles.title`, `fansub_groups.name/slug`, `fansub_group_aliases.normalized_alias` (bisher keine).
- Optional generierte, gewichtete `tsvector`-Spalte(n) + GIN-Index (`setweight()` für D-05).
- **`.down.sql`** spiegelbildlich (`DROP INDEX`/`DROP EXTENSION` — Extension-Drop nur, wenn sicher ungenutzt).
- **Migrationsnummer 0140** (nächste freie; vor Umsetzung erneut höchste `database/migrations/*.sql` prüfen — parallele Läufe, Pitfall 5).

---

### `shared/contracts/openapi.yaml` — `/api/v1/search` (+ `/api/v1/search/suggestions`)

**Analog:** `/api/v1/anime`-Block (Zeilen 564–653). Struktur 1:1 übernehmen: `parameters` (page/per_page mit `minimum`/`maximum`/`default`; `q` `maxLength: 100`; Enum-Refs via `$ref`), `responses` mit `200`/`400`/`500` und `examples`-Fehlermeldungen. Neue Params: `type` (Enum `alle|anime|fansub`), `year_from`, `year_to`, `genre`, `tag`, `format`, `status`, `fansub_group`, `sort`. Neue Schemas `PaginatedSearchResponse`/`SearchResultItem` analog `PaginatedAnimeResponse`. **Brownfield:** `/api/v1/anime` + `/api/v1/fansubs` unangetastet lassen (CLAUDE.md).

---

### `backend/cmd/server/main.go` — Route + Handler-Wiring

**Analog:** `main.go:73` (`NewAnimeHandler(...)`) und `main.go:361` (`v1.GET("/anime", animeHandler.List)`).
```go
searchHandler := handlers.NewSearchHandler(searchRepo)   // Repo mit shared *pgxpool.Pool konstruieren (wie AnimeRepository)
v1.GET("/search", searchHandler.Search)                  // öffentlich (kein authMiddleware); optional authOptional für Admin-Override
v1.GET("/search/suggestions", searchHandler.Suggestions) // optional
```
Öffentlich lesend → kein `authMiddleware` (vgl. `/anime`); Admin-Override für disabled via `authOptionalMiddleware` + Identity-Check im Handler.

---

## D-12 Titel-Speicher-Fix (VORAUSSETZUNG — Write-Path-Korrektur, rein in-place)

> Drei verifizierte Write-Sites; alle drei müssen auf **konsistentes** Mapping `(ja, romaji)` / `(ja, japanese|official)` gebracht werden. Reiner Mapping-Fix reicht NICHT — es fehlt ein Persistenzpfad (Pitfall 1). Betrifft KEINE neuen Referenzzeilen (`languages.ja`/`title_types.romaji` existieren, Migration `0020`).

### Site 1 — `backend/internal/repository/admin_content_anime_metadata.go` (Create `:51`, Patch `:83`)
**BROKEN:** Haupttitel-Slot nutzt `LanguageCode: "romaji"` — kein gültiger `languages.code`:
```go
// Zeile 48-54 (Create) / 80-86 (Patch)
{ Set: true, LanguageCode: "romaji", TitleType: "main", Title: trimOptionalStringPtr(&input.Title) }
```
**Fix:** Haupttitel als gültiger Sprachcode (z. B. `LanguageCode: "ja", TitleType: "romaji"` bzw. `"main"` je nach fachlicher Herkunft — final gegen `0020`-Seed prüfen, A2). `"romaji"` als `LanguageCode` ist der Defekt.

### Site 2 — `backend/internal/repository/admin_content.go:94-108` (`upsertAuthoritativeAnimeTitle`)
Strenger JOIN verwirft still bei ungültigem Code — **nicht** ändern, nur mit gültigen Codes füttern:
```go
INSERT INTO anime_titles (anime_id, language_id, title, title_type_id)
SELECT $1, l.id, $4, tt.id
FROM languages l JOIN title_types tt ON tt.name = $3
WHERE l.code = $2   -- 0 Zeilen bei code='romaji'  ← Ursache des stillen Verwerfens
```

### Site 3 — `backend/internal/services/anime_create_enrichment.go:1380-1383` (`buildAniSearchAltTitles`)
**BROKEN:** `"ja-Latn"`/`"romanized"` existieren weder in `languages` noch `title_types`:
```go
appendIfPresent("ja", "official", anime.OriginalTitle)
appendIfPresent("ja-Latn", "romanized", anime.RomajiTitle)   // → ("ja","romaji")
```
**Gegenbeispiel (korrekt):** `anime_metadata_backfill.go:162` mappt `(ja, main)` sauber.

### Persistenzpfad (Pitfall 1 — der eigentliche Umfang)
`AdminAnimeCreateInput`/`AdminAnimePatchInput` (`models/admin_content.go:75-95`) haben **kein `AltTitles`-Feld**; `AdminAnimeAltTitle`/`AltTitles` existieren nur im Draft-Payload (`:105-109,:125`). → **Fix:** `AltTitles []AdminAnimeAltTitle` in Create-/Patch-Input aufnehmen und in `buildAuthoritativeAnimeMetadataCreate/Patch` (`admin_content_anime_metadata.go:46-103`) zu zusätzlichen `authoritativeAnimeTitleSlotWrite`-Slots verketten, die durch `upsertAuthoritativeAnimeTitle` laufen. **Frontend-Save-Payload gegen den tatsächlich konsumierten Backend-Input abgleichen** (A3).

### D-12-Tests (in-place erweitern)
- `admin_content_test.go` — Slot-`LanguageCode` ∈ `languages`, `TitleType`=`romaji`/`main` (nie `"romaji"` als Sprachcode).
- `anime_create_enrichment_test.go` — `buildAniSearchAltTitles` ohne `"ja-Latn"`/`"romanized"`.
- **Datenkorrektur (B):** Re-Import statt Bestands-Backfill-Zwang (Runtime State Inventory) — Planner-Aufgabe getrennt vom Code-Fix.

---

## Frontend Pattern Assignments

### `frontend/src/lib/api.ts` — `getSearch` / `getSearchSuggestions`

**Analog:** `getAnimeList`+`buildQuery` (Zeilen 483–499, 1420–1454), `getFansubList`+`buildFansubListQuery` (470–475, 520–528).

**Query-Builder** (nur gesetzte Params anhängen) — exakt dieses Muster:
```ts
function buildSearchQuery(params: SearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.type) query.set("type", params.type);
  if (params.page) query.set("page", String(params.page));
  // ...year_from/year_to/genre/tag/format/status/fansub_group/sort
  return query.toString();
}
```
**Fetch** (analog getAnimeList:1424–1453) — `getApiBaseUrl()`, `ApiError` bei `!response.ok`, öffentlicher `fetch` (kein `authorizedFetch`, da öffentlich). `AbortController`-`signal` durchreichen (für Request-Abbruch). Neue Param-/Response-Typen in `frontend/src/types/` (Konvention: Domain-Typen dort, vgl. `AnimeListParams`).

### `frontend/src/app/suche/page.tsx`

**Analog:** `frontend/src/app/anime/page.tsx` (searchParams-Auflösung 17–58, `export const dynamic = 'force-dynamic'`). Übernehmen: Promise-fähige `searchParams`-Typisierung, `toNumber`-Defaults, Whitelist-Arrays für Enums. **Abweichung:** Interaktive Such-UX (Debounce/Abbruch/Combobox) erfordert Client-Component(en) unter der Page — Page bleibt schlank (Layout + URL-Zustand-Bootstrap), interaktive Teile in `SearchField`/`SuggestionList`/`SearchResults`.

### Such-UI-Komponenten (`SearchField`, `SuggestionList`, `SearchResults`, `SearchFilters`, `SearchFilterDrawer`)

**Analog = 115-UI-SPEC.md Component Inventory → ausschließlich `@/components/ui`-Primitives** (Import `@/components/ui`, Barrel `index.ts` exportiert alle). **NICHT** `AnimeBrowserFilters.tsx` kopieren (bestehende Verletzung).

| Element | Primitiv | Konkret |
|---------|----------|---------|
| Suchfeld | `Input` (`InputProps extends InputHTMLAttributes`, `invalid?`) | `lucide-react` `Search`-Icon inline; `placeholder`/`aria-label` gemäß Copy |
| Vorschläge | `Card` + `SectionHeader` + `Badge variant="neutral"` | zwei Gruppen (Anime/Fansubgruppen), Trefferzahl je Gruppe |
| Ergebnis-Tabs | `Tabs` (`TabItem[]{ id,label,badge?,content }`) | `id`=`alle`/`anime`/`fansub`, `badge`=Trefferzahl |
| Ergebniskarte | `Card` | Titel Body/600, Meta in `--text-soft`, klickbar → Detailseite |
| Filter-Chips | `Badge` (aktiv=accent) + `Button variant="ghost"` | Entfernen-Button `aria-label="Filter {name} entfernen"` |
| Filter-Controls | `Select`, `YearPicker`, `FormField` | Genre/Tag/Typ/Jahr/Status/Fansubgruppe (D-06) |
| Mobile Filter | `Drawer` | Footer „Filter anwenden" / „Filter zurücksetzen" |
| Pagination | `Pagination` (`{ currentPage, totalPages, onPageChange }`) | Seitenzustand in URL |
| Leer/Laden/Fehler | `EmptyState` / `LoadingState` / `ErrorState`+`getErrorStateCopy` | Copy + Retry gemäß UI-SPEC |

**⚠️ Wichtiger Befund für den Planner:** Die `Tabs`-Primitive (`Tabs.tsx:16-24`) ist **unkontrolliert** — nur `items` + `defaultTabId`, interner `useState`, **kein** `activeId`/`onChange`-Prop. Der URL-basierte Tab-Zustand (D-08) lässt sich damit nicht direkt binden. Optionen: (a) `key`-Remount + `defaultTabId` aus `searchParams`, (b) Tabs-Primitive um kontrollierte Props erweitern (dann `@/components/ui`-Änderung → separater Plan/Review). Nicht als natives Markup umgehen.

### `frontend/src/app/suche/useDebouncedSearch.ts` (hook) — KEIN Analog

Neuer wiederverwendbarer Hook (RESEARCH Punkt 9, „Don't Hand-Roll"): 250 ms Debounce + `AbortController` (Abbruch veralteter Requests) + `useSearchParams`-Sync (`q`/`type`/Filter/`page`). Kein bestehendes Muster im Repo → RESEARCH-Vorgabe folgen. Vitest-Test Pflicht (Abbruch/Debounce/URL-Sync).

### `frontend/src/components/layout/AppShell.tsx` — Nav-Aktivierung (in-place, beide Gruppen)

**Analog:** die Datei selbst. **Zwei** Stellen ändern (Navigation Activation Contract):
```tsx
// AppShellAnonNavGroups (Zeile 186-191): toten Eintrag aktivieren
{ label: 'Suche', icon: <Search size={17} />, disabled: true, badge: 'bald' }   // IST (Zeile 190)
→ { label: 'Suche', href: '/suche', icon: <Search size={17} />, current: isCurrent(currentPath, '/suche') }

// AppShellNavGroups (publicItems, Zeile 120-124): NEUEN Eintrag ergänzen (fehlt bislang)
{ label: 'Suche', href: '/suche', icon: <Search size={17} />, current: isCurrent(currentPath, '/suche') }
```
`Search` aus `lucide-react` importieren (ersetzt Platzhalter-`Compass`), Größe 17 (bestehendes `AppShellNavItemView`-Muster). Nav-Item-Shape unverändert.

---

## Shared Patterns (querschnittlich)

### Input-Validierung / Fehler-Helper (Backend)
**Source:** `handlers/anime.go:64-138` (`parsePositiveInt`, `badRequest`, `strings.TrimSpace`, `maxLength`, Enum-Whitelist `allowedAnimeStatuses`) + `writeInternalErrorResponse`.
**Apply to:** `handlers/search.go` — alle Query-Params; `q` als Bind-Parameter (`$n`), nie interpoliert (SQL-Injection-Mitigation V5).

### Pagination-Envelope
**Source:** `models.PaginationMeta{Total,Page,PerPage,TotalPages}` + `handlers/anime.go:163-171`.
**Apply to:** `handlers/search.go` (pro Tab/Entitätstyp) — Format wiederverwenden, nicht neu erfinden.

### WHERE-Builder + Sichtbarkeit
**Source:** `repository/anime.go:330-394` (Anime, `status <> 'disabled'`), `fansub_repository.go:1338-1374` (Fansub, kein impliziter Statusfilter).
**Apply to:** `search_anime.go` / `search_fansub.go` — serverseitige Sichtbarkeit; Frontend erhält nie ungefilterte Rohdaten (V4).

### URL-Query-Builder (Frontend)
**Source:** `api.ts:483-528` (`buildQuery`/`buildFansubListQuery`) — nur gesetzte Params, `URLSearchParams`.
**Apply to:** `buildSearchQuery`; URL = Source of Truth des UI-Zustands (D-08).

### UI-Primitives-Pflicht
**Source:** `@/components/ui/index.ts` (Barrel), 115-UI-SPEC.md.
**Apply to:** ALLE Frontend-Komponenten der Suche. Native `<input>/<select>/<button>` verboten (ESLint `no-restricted-syntax`). Deutsche Strings mit korrekten Umlauten. ≤450 Zeilen/Datei.

---

## No Analog Found

| Datei | Rolle | Data Flow | Grund → Fallback |
|-------|-------|-----------|------------------|
| `frontend/src/app/suche/useDebouncedSearch.ts` | hook | event-driven | Kein Debounce/AbortController/searchParams-Hook im Repo → RESEARCH Punkt 9 + „Don't Hand-Roll" |
| `scripts/smoke-search.ps1` (Validation) | script | — | Kein DB-gebundener Test-Harness; `smoke-*`-Namensmuster existiert → RESEARCH Wave 0 (Keycloak-Direct-Grant) |
| `tsvector`-generierte Spalte in `0140` | migration | schema | Kein `tsvector` im Schema → RESEARCH Standard Stack (`setweight()`) + Open Question 3 |
| `SearchProvider`-Interface | model | — | Kein zweiter Provider; D-02 „nur wenn pattern-konform" → schmal halten oder weglassen (RESEARCH) |

---

## Metadata

**Analog search scope:** `backend/internal/{handlers,repository,models,services}`, `backend/cmd/server`, `database/migrations`, `shared/contracts`, `frontend/src/{app,components,lib,types}`.
**Files scanned (targeted reads):** anime.go (handler+repo), fansub_repository.go, admin_content.go, admin_content_anime_metadata.go, anime_create_enrichment.go, models/admin_content.go, main.go, openapi.yaml, 0017-Migration, api.ts, AppShell.tsx, anime/page.tsx, LetterFilter.tsx, ui/{index,Tabs,Input,Pagination}.
**Next free migration:** 0140 (verifizieren vor Umsetzung — parallele main-Läufe).
**Pattern extraction date:** 2026-07-28
</content>
</invoke>

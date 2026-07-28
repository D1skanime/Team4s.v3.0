# Phase 115: Globale Suche (PostgreSQL FTS + Trigram) - Research

**Researched:** 2026-07-28
**Domain:** Globale Suche (Anime + Fansubgruppen), PostgreSQL FTS/pg_trgm/unaccent, Go-Backend, Next.js-Frontend
**Confidence:** HIGH (alle Kernaussagen gegen aktuellen Code/Migrationen verifiziert, Datei:Zeile zitiert; D-12-Schreibpfade in dieser Session neu und tiefer verifiziert)
**Status:** Reiner Research-/Analyse-Report. Kein Produktivcode geändert, keine Tabelle/Index/API angelegt.

> Dieser Report ersetzt/erweitert `115-RESEARCH.analysis-report.md` (13-Punkte-Analyse, weiterhin gültig).
> Alle dort verifizierten Datei:Zeile-Befunde sind hier übernommen; **neu** hinzugekommen sind (a) eine
> vertiefte, in dieser Session erneut verifizierte D-12-Write-Site-Analyse und (b) die
> **`## Validation Architecture`**-Sektion für die Nyquist-VALIDATION.md (Dimension 8).

---

<user_constraints>
## User Constraints (aus 115-CONTEXT.md)

### Locked Decisions
- **D-01:** Erste Implementierung baut auf PostgreSQL Full-Text Search + `pg_trgm`, ggf. `unaccent`, GIN/GiST-Indizes und gewichtetem Relevanz-Ranking auf. **Kein** OpenSearch/Elasticsearch. PostgreSQL bleibt fachliche Source of Truth.
- **D-02:** Backend/API so entkoppeln, dass später ein externer Suchanbieter (z. B. Meilisearch) als Provider ergänzt werden kann (`SearchProvider`-Interface-Skizze), **aber nur** wenn es zu bestehenden Service-/Repository-/Interface-Patterns passt — kein Overengineering. Erste Impl. = Postgres-Provider.
- **D-03:** Fachlicher Suchumfang mind.: Anime (Haupttitel, de/en/jp/Romaji-Titel, alt. Titel/Aliase, Slug, Jahr, Typ/Format, Genre, Tags, Beschreibung); Fansubgruppen (Name, Kürzel, Slug, alt. Namen, frühere Namen, Beschreibung). Mitglieder/Releases/Projekte nur als geprüfte spätere Erweiterung.
- **D-04:** Suchverhalten: exakte Treffer, Präfix, Teiltreffer, Groß-/Kleinschreibung, Bindestriche/Leerzeichen, Sonderzeichen/Akzente, leichte Tippfehler, alt. Schreibweisen, Gruppenkürzel, Slugs (Beispiele „Naruto"/„Narotu"/„team4s"/„team-4s"/„T4S").
- **D-05:** Relevanz-Ranking fachlich nachvollziehbar. **Anime:** 1) exakter Haupttitel, 2) exakter alt. Titel, 3) Präfix, 4) ähnlich (Tippfehler), 5) Genre/Tags, 6) Beschreibung. **Fansubgruppen:** 1) exaktes Kürzel, 2) exakter Name, 3) exakter Slug, 4) alt./früherer Name, 5) Teiltreffer Name, 6) Beschreibung. **Ein exakter Treffer darf NIE durch Popularitäts-/Aktualitätssignale verdrängt werden.**
- **D-06:** Filter/Facetten gegen Datenmodell prüfen (Jahr/Zeitraum, Genre, Tags, Typ/Format, Status, Fansubgruppe, Sprache, Release-/Projektstatus). Trefferzahlen darstellbar, wenn Aufwand/Performance vertretbar.
- **D-07:** Suche läuft über das Go-Backend; Frontend greift **nie** direkt auf PostgreSQL zu. Zu prüfen: `GET /api/v1/search` (Params `q, type, year_from, year_to, genre, tag, format, status, fansub_group, page, page_size, sort`), optional `GET /api/v1/search/suggestions`.
- **D-08:** UI im bestehenden UI-System (`@/components/ui`), Search-as-you-type, gruppierte Vorschläge, Tabs/Filter, Filter-Chips, Trefferzahlen, Debouncing, Request-Abbruch, URL-basierter Suchzustand, mobile Filter als Drawer.
- **D-09:** Performance von Beginn an: keine unindexierten `%LIKE%` über große Tabellen, keine N+1, `EXPLAIN ANALYZE` prüfen, Mindestlänge für Tippfehlersuche, Pagination/Cursor, Vorschläge begrenzen, ggf. Caching. Allgemein langsame Seite **separat** untersuchen — nicht automatisch Windows/WSL/Docker annehmen.
- **D-10:** Meilisearch **nur dokumentieren**, nicht einbauen.
- **D-11 (MASSGEBLICH — echter Code schlägt Auftrags-Annahmen):**
  - Nur **ein** toter „Suche"-Nav-Punkt (im **anonymen** Drawer, `AppShell.tsx:190`); eingeloggter Drawer hat **keinen**. Suche muss in **beiden** Shell-Varianten bereitgestellt werden.
  - **Genre** = „der zweite Begriff neben Tag". **`themes`** ist eine andere Domäne (OP/ED-Videosegmente) — NICHT mit Genre/Tag vermischen.
  - Nur `pg_trgm` aktiv; **`unaccent` NICHT aktiviert** → neu aktivieren. Keine FTS-/Trigram-Indizes auf Suchfeldern (außer 3 Anime-Kernspalten).
  - Bestehende `LIKE`-Basissuche auf `/anime` + `/fansubs` = Pattern-Vorlage, aber genau die Art, die abgelöst wird.
  - **(1) Aufgelöste Gruppen (`dissolved`) ERSCHEINEN** in der Suche.
  - **(2) Suche arbeitet auf REALEM DB-Bestand:** Haupttitel aus `anime.title` (verlässlich), Sprachtitel de/en aus `anime_titles`. Romaji-Haupttitel-Schreibpfad ist defekt — siehe D-12.
  - **(3) Fansub-„Kürzel"/alt./frühere Namen = das Alias-System** (`fansub_group_aliases`, in Edit-UI als „Tag" beschriftet). **Keine** separate Kürzel-Spalte; keine erfinden. „exaktes Kürzel" → exakter Treffer auf `fansub_group_aliases.normalized_alias`.
- **D-12 (VORAUSSETZUNG dieser Phase):** Romaji/japanischer Titel muss durchsuchbar sein (Beispiel: „Koe no Katachi" muss „A Silent Voice" finden). Der Titel-Speicher-Fix gehört **in** Phase 115. Mapping korrigieren: Romaji → `(language="ja", type="romaji")`, japanischer Original → `(ja, "japanese"|"official")`; kein Re-Crawl nötig; Re-Import statt Bestandsdaten-Backfill-Zwang. Danach durchsucht die Suche `anime_titles` über alle Titel-Typen + `anime.title`. **Vor Umsetzung: alle Write-Sites final verifizieren, nichts annehmen.** → in dieser Session erledigt (siehe Runtime State Inventory + Pitfall 1).

### Claude's Discretion
- Konkrete API-/DTO-/Interface-Form nach bestehenden Konventionen.
- Ob/wie die `SearchProvider`-Abstraktion eingeführt wird (nur wenn pattern-konform, kein Overengineering).

### Deferred Ideas (OUT OF SCOPE)
- Member/Releases/Release-Versionen/Projekte als Suchentitäten — erst nach separater Prüfung.
- Meilisearch/externer Provider — nur dokumentieren, nicht bauen.
- „Public Dashboard" (dritter toter Nav-Eintrag) — eigene spätere Phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

Die Phase hat keine numerischen `REQUIREMENTS.md`-IDs, sondern arbeitet gegen die Locked Decisions
D-01..D-12 (eigener Tracking-Namespace, vgl. Memory „Eigener Tracking-Namespace → Gap-Analyse-Fehlalarm"
— echtes Gate ist Decision-Coverage, nicht REQ-ID-Coverage). Vom Orchestrator genannte Pflicht-Themen:

| Thema (Auftrag) | Research Support (Fundstelle) |
|-----------------|-------------------------------|
| Bestehendes Anime-/Fansub-Datenmodell (nicht raten) | Standard Stack / Datenmodell; Migrationen `0001/0003/0009/0014/0019–0022/0045/0061/0071` verifiziert |
| Bereits aktivierte PG-Extensions/Indizes | `pg_trgm` seit `0017`; `unaccent` **fehlt**; Trigram nur auf `anime.title/title_de/title_en` — Sektion „Indizes" |
| Vorhandene Listen-/Filter-/Pagination-/Query-Patterns | `buildAnimeListWhere` (`anime.go:330-394`), `buildFansubGroupWhere` (`fansub_repository.go:1338-1374`), `PaginationMeta`, `ListGenreTokens` — Architecture Patterns |
| Globales UI-System | 115-UI-SPEC.md (approved) — nur `@/components/ui`-Primitives |
| Kein Elasticsearch/OpenSearch | D-01; „State of the Art" |
| Romaji-Titel durchsuchbar (D-12) | Runtime State Inventory + Pitfall 1 (drei Write-Sites verifiziert) |
</phase_requirements>

---

## Summary

Team4s hat **keine** einsatzfähige globale Suche — nur einen einzigen toten „Suche"-Nav-Punkt im
anonymen Drawer und eine unindexierte `ILIKE`-Teiltreffer-Suche (`q`-Param) auf den Listen-Endpunkten
`GET /api/v1/anime` und `GET /api/v1/fansubs`. Für Anime existiert bereits viel Infrastruktur
(`anime_titles` mit Sprachen/Titel-Typen inkl. `romaji`/`japanese`/`synonym`, `genres`/`tags` + Junction-
Tabellen, `pg_trgm`-Trigram-Indizes auf `anime.title/title_de/title_en` seit `0017`); für Fansubgruppen
`slug`, `name` + Alias-System (`fansub_group_aliases`), aber **kein Kürzel-Feld** und **keine** Trigram-
Indizes. `unaccent` ist nirgends aktiviert. `tsvector`/`ts_rank` existiert im Schema nicht.

**Der D-12-Titel-Defekt ist in dieser Session tiefer verifiziert und größer als bisher dokumentiert:**
Es gibt **drei** getrennte Write-Sites nach `anime_titles`, die den Haupttitel **inkonsistent** mappen.
Der interaktive Create/Patch-Pfad schreibt den Haupttitel mit `LanguageCode:"romaji"` (kein gültiger
`languages.code`) → der strenge JOIN in `upsertAuthoritativeAnimeTitle` liefert 0 Zeilen → **still
verworfen**. Der Batch-Backfill-Pfad schreibt denselben Titel korrekt als `(ja, main)`. Und die aus dem
Crawl geholten Romaji-/Japanisch-Titel (`buildAniSearchAltTitles`) landen als `("ja-Latn","romanized")`
(beide ungültig) — **und werden zusätzlich gar nicht erst persistiert**, weil `AltTitles` nur Teil des
Draft-Preview-Payloads sind und der Repository-Create/Patch-Input (`AdminAnimeCreateInput`/`PatchInput`)
**kein `AltTitles`-Feld** besitzt. Der D-12-Fix ist deshalb nicht nur „zwei Sprachcodes korrigieren",
sondern zusätzlich „einen Persistenzpfad für Romaji/Japanisch/Synonym-Titel schaffen".

**Primärempfehlung:** PostgreSQL FTS + `pg_trgm` (+ `unaccent`) reicht für den aktuellen Umfang
(~13.351 Anime-Zeilen) klar aus; kein Meilisearch. Der neue `GET /api/v1/search` sollte die bestehenden
Repository-/Handler-/Pagination-Konventionen (`AnimeRepository`/`FansubRepository`) unmittelbar
weiterverwenden. Eine `SearchProvider`-Abstraktion ist derzeit **optional** (kein zweiter Provider; D-02
verlangt sie nur „wenn pattern-konform") — höchstens ein schmales Interface mit einer Postgres-Impl.
Reihenfolge: Datenfundament (unaccent + Trigram-Indizes + D-12-Fix inkl. neuem Alt-Titel-Persistenzpfad)
→ Backend-Suchendpunkt mit gewichtetem Ranking → UI (per approved UI-SPEC) → Performance-Absicherung.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Volltext-/Trigram-Suche (Matching, Ranking) | Database (PostgreSQL FTS/pg_trgm/unaccent) | API/Backend (Query-Komposition, Gewichtung) | `tsvector`/`pg_trgm`-Matching ist DB-nativ, wird vom Backend parametrisiert (D-01/D-05). |
| Sichtbarkeits-/Statusfilterung | API/Backend | Database (WHERE) | Bestehendes Muster: `status <> 'disabled'` serverseitig (`anime.go:346-348`); Frontend erhält nie ungefilterte Rohdaten (D-11). |
| Facetten-/Trefferzählung (Genre/Tag/Typ) | API/Backend | Database | `ListGenreTokens`/`buildAuthoritativeGenreTokensQuery` (`admin_content.go:210-280`): Aggregation im Repository, nicht im Frontend (D-06). |
| Autocomplete/Suggestions | API/Backend | Database | Analog Präfix-Ranking `ListGenreTokens` — nicht im Frontend nachbauen. |
| Debounce / Request-Abbruch / URL-Suchzustand | Browser/Client (Next.js Client Component) | — | Reine Client-UX (`AbortController`, `useSearchParams`), keine Backend-Beteiligung (D-08). |
| Titel-Persistenz-Fix (D-12) | API/Backend (Write-Path) + Database (Referenzdaten) | — | Betrifft drei Write-Sites (Pitfall 1); Suche liest nur, repariert nicht (Datenhoheit CLAUDE.md). |
| Späterer externer Provider (Meilisearch) | API/Backend (Provider-Austausch) | — | D-02/D-10: hinter derselben Backend-Schnittstelle; Frontend/DB unverändert. |

---

## Standard Stack

Diese Phase installiert **keine neuen npm-/Go-Registry-Pakete**. Sie nutzt ausschließlich vorhandene
Abhängigkeiten (Go: `pgx/v5`, Gin, testify; Frontend: Next 16, React 18.3.1, Vitest 3, `lucide-react`)
plus **PostgreSQL-Bordmittel-Extensions** (keine Registry-Artefakte).

### Core (PostgreSQL-native — keine Registry-Pakete)
| Baustein | Version | Zweck | Warum Standard |
|----------|---------|-------|----------------|
| `pg_trgm` | in PG16 enthalten, aktiv seit `0017_anime_search_trgm.up.sql:1` | Trigram-Ähnlichkeit/Tippfehlertoleranz (D-04) | Bereits produktiv (Anime-Trigram-Indizes); Sub-ms-Messwerte belegt |
| `unaccent` | in PG16 (`contrib`), **NOCH NICHT aktiviert** | Akzent-/Sonderzeichen-Normalisierung (D-04) | Standard-Postgres-Weg; per `CREATE EXTENSION IF NOT EXISTS unaccent;` als neue Migration aktivieren |
| FTS `tsvector`/`ts_rank`/`setweight` | in PG16 enthalten | gewichtetes Relevanz-Ranking (D-05) | Native FTS; deterministische Rangstufen → „exakter Treffer nie durch Popularität verdrängt" |

### Supporting (bereits im Repo)
| Baustein | Ort | Zweck |
|----------|-----|-------|
| `github.com/jackc/pgx/v5` | backend/go.mod | DB-Treiber; alle Repositories nutzen `*pgxpool.Pool` |
| Gin `gin-gonic/gin` | backend/go.mod | HTTP-Handler; `GET /api/v1/search` in `cmd/server/main.go` v1-Gruppe |
| `stretchr/testify` | backend/go.mod | Go-Tests (aktuell überwiegend pure-function/source-inspection, kein Live-DB-CI) |
| Vitest 3 | frontend/package.json | Frontend-Unit/Component-Tests (`vitest run`, `globals:true`) |
| `@/components/ui` | frontend/src/components/ui | Pflicht-Primitives (siehe 115-UI-SPEC.md) |

### Alternatives Considered
| Statt | Möglich | Tradeoff |
|-------|---------|----------|
| PostgreSQL FTS+trgm | Meilisearch/OpenSearch | Bei ~13k Zeilen überdimensioniert, widerspricht D-01; nur Doku-Andockpunkt (D-10) |
| `tsvector` generierte Spalte | Ad-hoc `to_tsvector()` pro Query | Generated column + GIN-Index indexierbar/schneller; Ad-hoc verhindert Index-Nutzung (D-09) |
| `SearchProvider`-Interface jetzt | Direktes Repository ohne Interface | D-02 verlangt Interface nur „wenn pattern-konform"; kein zweiter Provider → schmal halten oder weglassen |

**Installation:** Keine Paketinstallation. Nur neue SQL-Migration(en):
```sql
-- Skizze (konkrete Nummer/Form = Umsetzungsarbeit, nächste FREIE Migrationsnummer prüfen!)
CREATE EXTENSION IF NOT EXISTS unaccent;
-- + Trigram-Indizes (siehe Indizes) + ggf. tsvector-Spalte(n) mit setweight()
```
**Version verification:** Nicht anwendbar (keine Registry). PostgreSQL = 16 (docker-compose/CLAUDE.md);
`pg_trgm`/`unaccent`/FTS sind PG16-Bordmittel.

---

## Package Legitimacy Audit

**Diese Phase installiert keine externen Pakete.** Keine npm-/PyPI-/crates-Artefakte. Der einzige „neue"
Baustein ist die PostgreSQL-Contrib-Extension `unaccent` (Teil der PostgreSQL-Distribution, nicht Registry).

| Package | Registry | Disposition |
|---------|----------|-------------|
| — (keine) | — | Nicht anwendbar — reine SQL-Migration + vorhandene Repo-Abhängigkeiten |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*slopcheck nicht erforderlich (keine Registry-Installation). Sieht die Planung wider Erwarten doch ein neues
Paket vor (z. B. Go-Query-Builder), muss vorher der Package-Legitimacy-Gate laufen und der Eintrag als
`[ASSUMED]` markiert werden, bis verifiziert.*

---

## Architecture Patterns

### System Architecture Diagram

```
                        Browser (Next.js Client Component: /suche)
                        - Suchfeld (@/components/ui Input)
                        - useDebouncedSearch (250ms) + AbortController
                        - useSearchParams (q, type, filters, page)  <-- URL = Source of Truth des UI-Zustands
                                   |
                                   |  GET /api/v1/search?q=&type=&year_from=&...&page=
                                   |  GET /api/v1/search/suggestions?q=   (optional, begrenzt)
                                   v
                        Go-Backend (Gin, /api/v1/search)
                        - Handler: Param-Validierung (parsePositiveInt, maxLength q, badRequest, Enum-Whitelist)
                        - SearchRepository (Postgres-Provider; optional hinter SearchProvider-Interface)
                        - Sichtbarkeit: Anime status<>'disabled'   |  Fansub: dissolved ERSCHEINT (D-11)
                        - Ranking: D-05-Rangstufen als deterministische ORDER BY-Ebenen (Popularität nur Tie-Break)
                                   |
                                   v
                        PostgreSQL 16 (Source of Truth)
                        - anime / anime_titles(+romaji/japanese/synonym) / genres+anime_genres / tags+anime_tags
                        - fansub_groups / fansub_group_aliases
                        - Matching: unaccent(...) + pg_trgm(similarity) ; Ranking: tsvector/ts_rank/setweight
                        - GIN/Trigram-Indizes (NEU) + bestehende Anime-Trigram-Indizes (0017)

  Deferred (nur dokumentiert, D-10): SearchProvider -> Meilisearch (Sync aus PG, Sichtbarkeit erhalten)
```

Primärer Use-Case („Koe no Katachi" → „A Silent Voice"): Suchfeld → debounced GET /search → Handler →
SearchRepository sucht gegen `anime.title` **und** `anime_titles`(inkl. `romaji`, **erst nach D-12-Fix
befüllt**) → unaccent+trgm-Match → Ranking → JSON-Envelope. **Ohne D-12-Fix schlägt genau dieser Fall fehl.**

### Recommended Project Structure (Backend, ≤450 Zeilen/Datei — CLAUDE.md)
```
backend/internal/
├── handlers/search.go               # GET /api/v1/search (+ /suggestions), Param-Validierung, Envelope
├── repository/search_repository.go  # Postgres-Provider: Query-Komposition, Ranking (D-05)
├── repository/search_anime.go       # Anime-Teil (Titel/anime_titles/genre/tag) — Split falls >450
├── repository/search_fansub.go      # Fansub-Teil (name/slug/aliases) — Split falls >450
├── models/search.go                 # SearchQuery, SearchResult, SearchSuggestion, SearchProvider(optional)
database/migrations/0NNN_search_foundation.up.sql   # unaccent, Trigram-Indizes, ggf. tsvector-Spalte(n)
```
```
frontend/src/app/suche/
├── page.tsx SearchField.tsx SuggestionList.tsx SearchResults.tsx
├── SearchFilters.tsx SearchFilterDrawer.tsx useDebouncedSearch.ts   # jede Datei ≤450 Z.
```

### Pattern 1: Bestehende Listen-WHERE-Builder als Vorlage (nicht neu erfinden)
```go
// Source: backend/internal/repository/anime.go:370-377 (bestehende q-Teiltreffer-Suche, die abzulösende ILIKE-Art)
if filter.Q != "" {
    conditions = append(conditions, fmt.Sprintf(
        "(%s ILIKE $%d OR title_de ILIKE $%d OR title_en ILIKE $%d OR EXISTS (SELECT 1 FROM anime_titles at WHERE at.anime_id = anime.id AND at.title ILIKE $%d))",
        displayTitleExpr, argPos, argPos, argPos, argPos))
    args = append(args, "%"+filter.Q+"%"); argPos++
}
```
Struktur/Envelope/Pagination beibehalten; `ILIKE '%...%'` durch `unaccent()+pg_trgm` (Match) + `tsvector`
(Ranking) ersetzen.

### Pattern 2: Normalisierter Anzeige-Titel — Romaji-Rang ist bereits vorgesehen
```go
// Source: backend/internal/repository/anime.go:298-328 (primaryNormalizedTitleSQL)
// ORDER BY CASE l.code WHEN 'ja' THEN 0 WHEN 'romaji' THEN 1 WHEN 'en' THEN 2 WHEN 'de' THEN 3 ...
//          CASE tt.name WHEN 'main' THEN 0 WHEN 'romaji' THEN 1 WHEN 'official' THEN 2 ...
```
Der Display-Ausdruck erwartet **`tt.name='romaji'`** (existiert in `title_types`) — passt exakt zum
D-12-Zielmapping `(language="ja", type="romaji")`. **Keine neuen Referenzzeilen nötig.**

### Pattern 3: Präfix-priorisierte Facetten/Suggestions
`buildAuthoritativeGenreTokensQuery`/`filterGenreTokens`/`ListGenreTokens` (`admin_content.go:210-280`) —
direkte Vorlage für Suggestions und D-05-Stufe „Präfix vor ähnlich".

### Anti-Patterns to Avoid
- **`AnimeBrowserFilters.tsx` als UI-Vorlage kopieren:** rohe `<input>`/`<button>` (`.../AnimeBrowserFilters.tsx:56-73`) — **bestehende Verletzung** der `@/components/ui`-Pflicht; NICHT übernehmen (UI-SPEC Constraint 1).
- **`unaccent(title) ILIKE ...` ohne funktionalen Index:** macht bestehende Trigram-Indizes (Rohspalte) unbrauchbar → Seq Scan. Funktionalen/generated-Index über `unaccent()` anlegen (D-09).
- **Popularität/`view_count` in die Primärsortierung mischen:** verletzt D-05. Popularität nur **letzte** Tie-Break-Ebene.
- **V1/V2-Schema-Introspektion (`anime_schema.go`) kopieren:** reine Alt-Kompat; direkt gegen aktuelles Schema entwickeln.

---

## Don't Hand-Roll

| Problem | Nicht selbst bauen | Stattdessen | Warum |
|---------|--------------------|-------------|-------|
| Tippfehlertoleranz/Ähnlichkeit | eigene Levenshtein-Logik in Go | `pg_trgm` `similarity()`/`%` | DB-nativ, indexierbar, produktiv |
| Akzent-/Umlaut-Normalisierung | manuelle Zeichenersetzung | `unaccent()` + funktionaler Index | Standard, deckt Sonderfälle (D-04) |
| Gewichtetes Ranking | Score-Rechnung im Go-Code | `tsvector`+`setweight()`+`ts_rank` + deterministische ORDER-BY-Stufen | skaliert, DB-seitig sortiert/paginierbar (D-05/D-09) |
| Pagination-Envelope | neues Format | `models.PaginationMeta{Total,Page,PerPage,TotalPages}` (`fansub_groups.go:70-77`) | Brownfield-Konsistenz |
| Debounce/Request-Abbruch | pro Seite ad-hoc | ein `useDebouncedSearch`-Hook (AbortController + searchParams) | wiederverwendbar, keine veralteten Ergebnisse (D-08) |
| Fehlerzustand-Copy | eigenes Mapping | `getErrorStateCopy` aus `@/components/ui/ErrorState` (behandelt 403) | UI-SPEC vorgeschrieben |

**Key insight:** Fast alles aus D-04/D-05 ist PostgreSQL-Bordmittel. Aufwand liegt in
Migration/Indizierung/Query-Komposition, **nicht** in eigener Suchlogik.

---

## Runtime State Inventory

> Diese Phase enthält einen Refactor-/Datenkorrektur-Anteil (D-12). Inventur beantwortet explizit, was nach
> reinem Code-Fix noch an Laufzeit-/Bestandszustand offen ist.

| Kategorie | Gefundene Items | Erforderliche Aktion |
|-----------|-----------------|----------------------|
| Stored data | `anime_titles`: Haupttitel manuell angelegter/bearbeiteter Anime **fehlen** (Create/Patch schrieb `LanguageCode:"romaji"` → 0 Zeilen). Romaji/Japanisch aus Crawl **nie persistiert** (Draft-only). Backfill-erzeugte `(ja, main)`-Zeilen existieren dagegen. | Code-Fix (Mapping + **neuer Alt-Titel-Persistenzpfad**) **plus** Datenkorrektur: betroffene Anime **neu importieren/anreichern** (D-12: disponible Testdaten, kein Zwangs-Backfill). Backfill-befüllte Anime brauchen keine Migration. |
| Live service config | Keine — Suche hat keine externe Service-Konfiguration (kein Meilisearch/n8n/Datadog). | None — verifiziert (kein externer Suchdienst im Scope, D-01/D-10). |
| OS-registered state | Keine — kein Task-Scheduler/pm2/systemd-Bezug. | None — verifiziert. |
| Secrets/env vars | Keine neuen. `unaccent`/Trigram brauchen keine Secrets; PG-Verbindung über `backend/internal/config/config.go`. | None. |
| Build artifacts | Backend = Docker (`:8092`/realer Port via `docker ps`) — neue Route/Extension erst nach `docker compose up -d --build team4sv30-backend`; Migration über Migrate-Runner. | Container-Rebuild + Migration vor Live-UAT einplanen. |

**Kanonische Frage — „Nach jedem File-Fix: welcher Laufzeitzustand hält den alten Zustand?":**
Antwort für D-12 = die **`anime_titles`-Bestandsdaten**. Ein reiner Code-Fix macht neue Speichervorgänge
korrekt, repariert aber **nicht** rückwirkend Anime, deren Romaji/Haupttitel nie in `anime_titles` landete.
→ Zwei getrennte Planner-Aufgaben: **(A) Code-Fix** (neue Schreibvorgänge korrekt) und **(B) Datenkorrektur
per Re-Import** (D-12: Testdaten neu einlesen). Kein automatischer Bestands-Backfill-Zwang.

---

## Common Pitfalls

### Pitfall 1: D-12-Fix zu eng verstehen („nur zwei Sprachcodes ändern")
**Was schiefgeht:** Man korrigiert `admin_content_anime_metadata.go:51/83` und `buildAniSearchAltTitles`,
aber Romaji ist danach **immer noch** nicht durchsuchbar.
**Warum:** Die aus dem Crawl gebauten `AltTitles` sind nur Teil des Draft-Preview-Payloads
(`AdminAnimeCreateDraftPayload.AltTitles`, `models/admin_content.go:125`). Der Repository-Write-Input
(`AdminAnimeCreateInput`/`AdminAnimePatchInput`, `models/admin_content.go:75-95, 269-284`) hat **kein
`AltTitles`-Feld** — die Metadaten-Builder schreiben nur 3 feste Slots (main/de/en). `.AltTitles` wird im
gesamten Backend **nirgends** in einen `anime_titles`-INSERT überführt (verifiziert per Grep).
**Vermeidung:** D-12-Fix muss zusätzlich einen **Persistenzpfad** für Romaji/Japanisch/Synonym schaffen
(Input-Feld + Builder-Erweiterung, oder Draft-AltTitles in den Create-Input mappen) und alle drei
Write-Sites auf **konsistentes** Mapping `(ja, romaji)` / `(ja, japanese)` bringen.
**Warnzeichen:** Test „Koe no Katachi findet A Silent Voice" bleibt rot, obwohl Mapping-Zeilen geändert wurden.

### Pitfall 2: `unaccent()` bricht bestehende Trigram-Indizes
**Was schiefgeht:** `unaccent(title) ILIKE unaccent('%q%')` fällt auf Seq Scan zurück.
**Warum:** Indizes aus `0017` liegen auf der **Rohspalte**, nicht auf dem `unaccent()`-Ausdruck.
**Vermeidung:** Funktionale GIN-Trigram-Indizes über `unaccent(title)` (bzw. generierte Spalte); `unaccent`
ist per Default nicht IMMUTABLE → für Index oft IMMUTABLE-Wrapper/generierte Spalte nötig. `EXPLAIN ANALYZE`
muss Index-Nutzung zeigen (D-09).
**Warnzeichen:** `EXPLAIN ANALYZE` zeigt `Seq Scan` statt `Bitmap Index Scan` auf neuen Indizes.

### Pitfall 3: Fansub-`dissolved` versehentlich ausfiltern
**Was schiefgeht:** „nur aktive"-Statusfilter schließt aufgelöste Gruppen aus.
**Warum:** D-11(1) verlangt, dass `dissolved`-Gruppen **erscheinen**. `buildFansubGroupWhere` filtert Status
ohnehin nur bei explizitem `status=`-Param (`fansub_repository.go:1364-1367`).
**Vermeidung:** Fansub-Suche **ohne** impliziten Statusausschluss; `status` nur optionaler Filter (D-06).

### Pitfall 4: „Kürzel" als neue Spalte erfinden
**Was schiefgeht:** Migration `fansub_groups.abbreviation`.
**Warum:** D-11(3): keine Kürzel-Spalte, keine erfinden — „T4S" = Alias in `fansub_group_aliases.normalized_alias` (bzw. `slug`).
**Vermeidung:** D-05 „exaktes Kürzel" = exakter Treffer auf `normalized_alias`; „alt./früherer Name" = weitere Aliase (kein „früher vs. alternativ"-Flag).

### Pitfall 5: Migrationsnummer-Kollision
**Was schiefgeht:** Neue Migration mit belegter Nummer (parallele GSD-Läufe auf `main`).
**Warum:** Migrationen laufen bis mind. `0134`; Phasen 112/113/114 belegen Nummern.
**Vermeidung:** Höchste vorhandene `database/migrations/*.sql`-Nummer prüfen, nächste **freie** nehmen (Memory „Parallele GSD-Agenten auf main").

### Pitfall 6: Gefühlte Langsamkeit vorschnell PostgreSQL/Docker zuschreiben
**Warum:** Perf-Doku belegt: Bottleneck der datenreichsten Public-Seite war serieller SSR-Request-Fächer +
Dev-Cold-Compile, nicht SQL (alle Statements sub-ms).
**Vermeidung:** Erst prüfen, ob die Suchseite mehrere SSR-Requests seriell feuert und ob im Production-Build
gemessen wird (D-09), bevor DB/Docker/WSL beschuldigt werden.

---

## Code Examples (verifiziert, aktueller Code)

### D-12 Defekt-Trio (alle in dieser Session verifiziert)
```go
// (1) Create/Patch — BROKEN: "romaji" ist KEIN gültiger languages.code
// Source: backend/internal/repository/admin_content_anime_metadata.go:51 (Create), :83 (Patch)
{ Set: true, LanguageCode: "romaji", TitleType: "main", Title: ... }

// (2) Strenger Upsert-JOIN — verwirft still, wenn l.code nicht existiert
// Source: backend/internal/repository/admin_content.go:97-104
// INSERT INTO anime_titles ... SELECT $1, l.id, $4, tt.id
//   FROM languages l JOIN title_types tt ON tt.name = $3 WHERE l.code = $2   -> 0 Zeilen bei code='romaji'

// (3) Enrichment — BROKEN: "ja-Latn"/"romanized" existieren weder in languages noch title_types,
//     UND diese AltTitles werden NIE persistiert (nur Draft-Payload)
// Source: backend/internal/services/anime_create_enrichment.go:1380-1383
appendIfPresent("ja", "official", anime.OriginalTitle)
appendIfPresent("ja-Latn", "romanized", anime.RomajiTitle)   // Zielmapping D-12: ("ja","romaji")

// GEGENBEISPIEL — der Backfill macht es korrekt (ja, main):
// Source: backend/internal/services/anime_metadata_backfill.go:162
appendCandidate(title, jaLanguageID, mainTitleTypeID)   // (ja, main) -> funktioniert
```

### Bestehende Fansub-`q`-Suche (abzulösende ungeindexte ILIKE-Art)
```go
// Source: backend/internal/repository/fansub_repository.go:1343-1362
// name ILIKE '%q%' OR slug ILIKE '%q%' OR EXISTS(fansub_group_aliases.alias ILIKE '%q%')  (ungeindext)
```

### Sichtbarkeitsfilter (Vorlage Anime-Ausschluss)
```go
// Source: backend/internal/repository/anime.go:342-348
if filter.Status != "" { /* explizit */ } else if !filter.IncludeDisabled {
    conditions = append(conditions, "status <> 'disabled'")
}
```

---

## State of the Art

| Alt | Aktuell | Wann | Auswirkung |
|-----|---------|------|------------|
| `ILIKE '%q%'` auf Kernspalten | `pg_trgm` + `unaccent` + `tsvector`/`ts_rank` | diese Phase | Tippfehlertoleranz, Akzente, gewichtetes Ranking (D-04/D-05) |
| Suche an Listen-Endpunkte gekoppelt | eigener `GET /api/v1/search` | diese Phase | Globale, entitätsübergreifende Suche (D-07) |
| Haupttitel nur `anime.title` + de/en | zusätzlich romaji/japanese durchsuchbar | D-12-Fix | Kern-Requirement „Koe no Katachi → A Silent Voice" |

**Deprecated/veraltet für den Scope:**
- OpenSearch/Elasticsearch: bei ~13k Zeilen überdimensioniert; D-01 schließt aus.
- `themes`/`theme_types`/`theme_segments`: **NICHT** Genre/Tag — OP/ED-Videosegmente (`admin_content_anime_themes.go`), nicht suchrelevant (D-11).

---

## Validation Architecture

> **Kritische Sektion (diese Re-Research existiert primär hierfür).** `nyquist_validation` ist in
> `.planning/config.json` **aktiv** (`true`). Diese Sektion definiert, wie jede Phase-Fähigkeit validiert
> wird, und liefert dem Planner die Bausteine für per-Plan-Akzeptanzkriterien und eine templatebare VALIDATION.md.

### Test Framework

| Property | Value |
|----------|-------|
| Backend-Framework | Go `testing` + `stretchr/testify`; Paket-Setup via `TestMain` (`backend/internal/repository/testmain_test.go`, stubbt nur den Permissions-Catalog) |
| Backend-Testart (Realität) | **Überwiegend pure-function / source-inspection.** `admin_content_test.go` prüft `buildAuthoritativeAnimeMetadataCreate` (Slot-Anzahl/-Inhalt); `anime_test.go:237` prüft `primaryNormalizedTitleSQL` als **String**. **Kein Live-DB in der Test-Runtime.** |
| Frontend-Framework | Vitest 3 (`frontend/vitest.config.ts`, `globals:true`, `include: src/**/*.test.ts(x)`), `@testing-library` (jsdom pro Datei via `@vitest-environment jsdom`) |
| Config-Dateien | Backend — keine zentrale Testconfig (go test); `frontend/vitest.config.ts` |
| Quick-Run Backend | `cd backend && go test ./internal/repository/... ./internal/handlers/... ./internal/services/...` (oder gezielt `-run`) |
| Quick-Run Frontend | `cd frontend && npm run test` (`vitest run`) + `npm run typecheck` (`tsc --noEmit`) |
| Full-Suite | `cd backend && go test ./...` ; `cd frontend && npm run test && npm run lint && npm run typecheck` |

**Wichtige Konsequenz:** SQL-**Verhalten** (nutzt die Query den neuen Trigram-Index? persistiert der D-12-Fix
jetzt eine Romaji-Zeile? findet „Koe no Katachi" „A Silent Voice"?) ist mit dem bestehenden Unit-Harness
**nicht** beweisbar. Solche Fähigkeiten brauchen entweder (a) einen **Live-DB-Integrationstest**
(Docker-Postgres) oder (b) **manuelle Live-Verifikation** gegen das Docker-Backend mit Keycloak-Direct-Grant-
Token (Memory „Live-API-Verifikation per Token"; Bash-Sandbox erreicht Host-Ports nicht → echtes Terminal).
Der Planner muss pro Fähigkeit **eine** dieser Ebenen explizit wählen.

### Phase Requirements → Test Map

| Decision | Zu validierendes Verhalten | Test Type | Konkretes Signal / Kommando | Datei da? |
|----------|----------------------------|-----------|-----------------------------|-----------|
| D-12 (Mapping) | Create/Patch schreibt Haupttitel mit **gültigem** Sprachcode (nicht `"romaji"`) | unit (pure) | `go test ./internal/repository -run TestBuildAuthoritativeAnimeMetadata` — Slot-`LanguageCode` ∈ `languages`, `TitleType`=`romaji`/`main` | ⚠️ Wave 0 (`admin_content_test.go` erweitern) |
| D-12 (Enrichment) | `buildAniSearchAltTitles` mappt Romaji→`(ja,romaji)`, Japanisch→`(ja,japanese/official)` | unit (pure) | `go test ./internal/services -run TestBuildAniSearchAltTitles` — keine `"ja-Latn"`/`"romanized"` mehr | ⚠️ Wave 0 (`anime_create_enrichment_test.go` existiert) |
| D-12 (Persistenz) | Romaji/Japanisch landen tatsächlich in `anime_titles` | integration (Live-DB) / live-API | Nach Re-Import: `SELECT title FROM anime_titles at JOIN title_types tt ON tt.id=at.title_type_id WHERE tt.name='romaji'` liefert Zeile | ❌ Wave 0 (Live-DB-Harness oder UAT-Skript) |
| D-12 (End-to-End) | Suche „Koe no Katachi"/„Eiga Koe no Katachi" → „A Silent Voice" | live-API | `GET /api/v1/search?q=Koe%20no%20Katachi` enthält Ziel-Anime | ❌ Wave 0 (Smoke-Skript) |
| D-01/D-04 | Trigram-/GIN-Index wird genutzt (kein Seq Scan) | live-DB EXPLAIN | `EXPLAIN ANALYZE`-Plan zeigt `Bitmap Index Scan` auf neuem Index (vgl. `docs/performance/anime-search-query-plan-tracking.md`) | ❌ Wave 0 (Perf-Doku erweitern) |
| D-04 | Tippfehler/Akzent/Bindestrich: „Narotu"/„team-4s"/„T4S" liefern erwartete Treffer | live-API | `GET /api/v1/search?q=Narotu` findet „Naruto"; `q=T4S` findet Team4s über Alias | ❌ Wave 0 (Smoke-Skript) |
| D-05 (Anime) | Exakter Haupttitel vor Präfix/ähnlich; **nie** durch Popularität verdrängt | integration/live + pure | Exakter Titel + populärerer Teiltreffer → exakter Treffer Rang 1; ORDER-BY-Stufen deterministisch (Komposition zusätzlich pure-function-testbar) | ❌ Wave 0 |
| D-05 (Fansub) | exaktes Kürzel(Alias) > exakter Name > slug > alt. Name > Teiltreffer | integration/live | `GET /api/v1/search?type=fansub&q=T4S` → Kürzel-Match Rang 1 | ❌ Wave 0 |
| D-11(1) | `dissolved`-Gruppen **erscheinen** | live-API | `GET /api/v1/search?type=fansub&q=<dissolved-Gruppe>` liefert sie | ❌ Wave 0 (Smoke-Skript) |
| D-11 (Anime-Sichtbarkeit) | `status='disabled'` **ausgeschlossen** (ohne Admin-Override) | integration/live | disabled-Anime fehlt im anonymen Suchergebnis | ❌ Wave 0 |
| D-07 | Endpunkt-Kontrakt: Params/Envelope/Status 200/400 | handler-unit + contract | Handler-Test wie `anime.go` (badRequest bei ungültigen Params, maxLength `q`); `shared/contracts/openapi.yaml` gepflegt | ⚠️ Wave 0 (`handlers/search_test.go`) |
| D-08 | Debounce 250ms, Request-Abbruch, URL-Suchzustand, Tastaturnavigation | frontend-unit | Vitest: `useDebouncedSearch` bricht vorherigen Request ab; searchParams-Sync; Combobox-Keyboard | ⚠️ Wave 0 (`*.test.tsx`) |
| D-08 (UI-Pflicht) | nur `@/components/ui`; korrekte Umlaute; ≤450 Z. | lint/review | ESLint `no-restricted-syntax` (natives `<input>/<select>`); UI-Checker-Gate; Zeilenzähler | ✅ ESLint-Regel existiert (`frontend/eslint.config.mjs`) |
| D-09 | keine unindexierte `%LIKE%`; Suggestions begrenzt | live-DB + review | EXPLAIN-Plan + Code-Review (LIMIT auf Suggestions) | ❌ Wave 0 (Perf-Doku) |

### Sampling Rate
- **Per Task/Commit:** betroffenes Paket — `go test ./internal/<pkg>/... -run <Name>` bzw. `npm run test` +
  `npm run typecheck`. Migrations-Tasks: Migrate-Runner + `EXPLAIN ANALYZE` gegen Docker-Postgres.
- **Per Wave-Merge:** `go test ./...` (Backend) + `npm run test && npm run lint && npm run typecheck` (Frontend).
- **Phase-Gate (vor `/gsd:verify-work`):** Full-Suite grün **plus** Live-UAT-Smoke gegen `:3000`/Docker-
  Backend mit echten Daten (End-to-End-/Gap-Kriterien sind code-level nicht ausreichend — Memory „Gap-Fixes
  live UAT-en", „Verification-Reports over-claimen").

### Wave 0 Gaps (vor Implementierung anzulegen)
- [ ] `backend/internal/repository/admin_content_test.go` **erweitern** — D-12-Mapping-Assertions (gültiger Sprachcode statt `"romaji"`).
- [ ] `backend/internal/services/anime_create_enrichment_test.go` — Test für korrigiertes `buildAniSearchAltTitles`-Mapping.
- [ ] `backend/internal/handlers/search_test.go` — Param-Validierung/Envelope/Status-Codes (Vorbild `anime.go`-Handler-Tests).
- [ ] **Live-DB-/Smoke-Testpfad** — es gibt **keinen** DB-gebundenen Testharness. Entweder (a) Docker-Postgres-Integrationstest **oder** (b) PowerShell-Smoke-Skript (`scripts/smoke-search.ps1`, analog vorhandener `smoke-*`) mit Keycloak-Direct-Grant-Token für D-04/D-05/D-11/D-12-End-to-End.
- [ ] `docs/performance/anime-search-query-plan-tracking.md` **erweitern** — `EXPLAIN ANALYZE`-Baselines für neue Indizes/`/api/v1/search` (Vorlage existiert, Baseline 2026-03-03).
- [ ] `frontend/src/app/suche/*.test.tsx` — `useDebouncedSearch` (Abbruch/Debounce/URL-Sync) + Combobox-Tastaturnavigation.

*Die drei Datenmodell-Fähigkeiten (D-12-Persistenz, D-04/D-05-Matching/Ranking, D-11-Sichtbarkeit) sind die
einzigen, die das bestehende Unit-Harness nicht abdecken kann — Kern der „Live-DB vs. Live-API"-Entscheidung des Planners.*

---

## Security Domain

> `security_enforcement` ist in `.planning/config.json` nicht gesetzt → als aktiv behandelt. Für eine rein
> lesende, öffentliche Suche ist die relevante Angriffsfläche vor allem Input-Validierung und Sichtbarkeitskontrolle.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no (öffentlich; anonym + eingeloggt) | — (Endpunkt ohne Auth-Pflicht; Admin-Override für disabled bleibt gated) |
| V4 Access Control | yes | Sichtbarkeitsfilter serverseitig: Anime `status<>'disabled'` ohne Admin-Identität (`anime.go:346-348`, `include_disabled` admin-gated `anime.go:119-127`); Suche darf keine nicht-öffentlichen Daten leaken |
| V5 Input Validation | **yes** | Param-Validierung wie `AnimeHandler.List`: `parsePositiveInt`, `DefaultQuery`, `strings.TrimSpace`, `maxLength` für `q` (~100), Enum-Whitelist für `type`/`sort`; parametrisierte pgx-Queries (`$n`) — **keine** String-Konkatenation von `q` in SQL |
| V6 Cryptography | no | — |

### Known Threat Patterns for Go/Gin + PostgreSQL Suche
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL-Injection über `q`/Filter | Tampering | Nur parametrisierte pgx-Queries (`$n`); `q` als Bind-Parameter, nie interpoliert |
| Regex-/Trigram-DoS über sehr kurze/breite Muster | Denial of Service | Mindestlänge (≥2 Zeichen, UI-SPEC) serverseitig erzwingen; `page_size`/Suggestions-LIMIT begrenzen (D-09) |
| Leak nicht-öffentlicher Datensätze | Information Disclosure | Sichtbarkeitsfilter serverseitig, nie clientseitig; disabled-Anime nur mit Admin-Identität (V4) |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| PostgreSQL 16 | gesamte Suche, unaccent/pg_trgm/FTS | ✓ (docker-compose) | 16 | — |
| `pg_trgm` Extension | Trigram-Matching | ✓ aktiv seit `0017` | contrib | — |
| `unaccent` Extension | Akzent-Normalisierung (D-04) | ✗ nicht aktiviert | contrib (in PG16 verfügbar) | `CREATE EXTENSION IF NOT EXISTS unaccent;` (neue Migration) |
| Docker Compose | Backend/Frontend/DB-Runtime | ✓ | — | — |
| Go 1.25 toolchain | Backend-Build/Test | ✓ | 1.25 | — |
| Node/npm (Next 16, Vitest 3) | Frontend-Build/Test | ✓ | — | — |
| Keycloak (Direct-Grant) | Live-API-UAT auth-gated Fälle | ✓ (Docker, realer Port via `docker ps`) | — | Öffentliche Suche braucht kein Token; nur Admin-Override-Fälle |

**Missing dependencies with fallback:** `unaccent` — per Migration aktivierbar (kein Blocker).
**Missing dependencies with no fallback:** keine.
**Fehlender Testbaustein (kein Env-Blocker, aber planungsrelevant):** Kein DB-gebundener Go-Integrationstest-
Harness — Live-DB-Verhalten braucht neuen Harness oder Smoke-Skript (siehe Validation Architecture / Wave 0).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fansubgruppen-Anzahl deutlich kleiner als ~13.351 Anime | State of the Art / Performance | Falls unerwartet groß, ungeindexte `ILIKE` auf `fansub_groups`/`aliases` dringlicher — vor Umsetzung `SELECT COUNT(*) FROM fansub_groups;`. `[ASSUMED]` (kein DB-Zugriff in Session) |
| A2 | D-12-Zielweg „Romaji als `(ja, romaji)`" erzeugt keine neuen Referenzzeilen | Runtime State Inventory / Code Examples | Verifiziert: `title_types` enthält `romaji`, `languages` enthält `ja` (Migration `0020`); `primaryNormalizedTitleSQL` rangiert `romaji` bereits. Risiko gering — beim Umsetzen final gegen `0020`-Seed prüfen |
| A3 | Frontend sendet finale Anime-Daten so, dass Draft-`AltTitles` nicht in den Create-Input gelangen | Pitfall 1 | Verifiziert per Backend-Grep (`AdminAnimeCreateInput` ohne `AltTitles`; `.AltTitles` nur im Enrichment-Service). Falls es einen separaten Alt-Titel-Save-Endpunkt gäbe, wäre der Persistenzpfad teilweise vorhanden — **Planner: Frontend-Save-Payload gegen den tatsächlich konsumierten Backend-Input abgleichen** |

**Alle übrigen Aussagen** sind direkt in Code/Migrationen verifiziert (Datei:Zeile) oder explizit als
„nicht gefunden"/„nicht vorhanden" gekennzeichnet.

---

## Open Questions

1. **Live-DB-Validierung vs. Smoke-Skript**
   - Bekannt: Bestehendes Go-Harness ist pure-function/source-inspection; kein Live-DB-Test.
   - Unklar: Docker-Postgres-Integrationstest oder PowerShell-Smoke-Skript (analog `smoke-*`) für End-to-End (D-04/D-05/D-11/D-12).
   - Empfehlung: Smoke-Skript ist der kleinere, projektkonforme Weg; Ranking-Determinismus (D-05) zusätzlich als pure-function-Test der ORDER-BY-Komposition.

2. **Umfang des Alt-Titel-Persistenzpfads (D-12)**
   - Bekannt: Draft-`AltTitles` werden nicht persistiert; nur 3 feste Slots.
   - Unklar: Nur Romaji/Japanisch (minimal) oder alle Draft-Alt-Titel (synonym etc.).
   - Empfehlung: Minimal Romaji + Japanisch für D-12; weitere Typen optional, aber am selben Pfad.

3. **`tsvector`-Form: generierte Spalte vs. materialisierte Aggregat-Spalte**
   - Bekannt: Kein `tsvector` im Schema; Gewichtung (D-05) braucht FTS-Ebene.
   - Empfehlung: Pro Entität eine generierte, gewichtete `tsvector`-Spalte + GIN-Index; Genre/Tag als eigene Trigram-Felder für Stufe 5.

4. **Fansub-Beschreibung als Suchfeld**
   - Bekannt: `fansub_groups.description` in `0071` entfernt; Freitext in `fansub_group_notes` (`visibility`/`status`-gated).
   - Empfehlung: V1 weglassen oder nur `visibility='public' AND status='published'`-Notes; explizit entscheiden.

---

## Project Constraints (aus CLAUDE.md, Bezug Phase 115)

- **Modularität ≤450 Zeilen:** neue Search-Repository-/Handler-/UI-Dateien splitten (Vorbild `anime.go`/`fansub_groups.go`).
- **Sprachqualität (Umlaute):** alle user-facing Strings mit korrekten Umlauten (Copy siehe UI-SPEC).
- **Frontend-UI-Pflicht:** nur `@/components/ui`-Primitives; `AnimeBrowserFilters.tsx` (rohe `<input>/<button>`) ist bestehende Verletzung und **kein** Vorbild. ESLint `no-restricted-syntax` warnt.
- **Brownfield/Kompatibilität:** `GET /api/v1/anime`/`/fansubs` unangetastet lassen (höchstens Datenquelle).
- **Datenhoheit:** Suche ist rein lesend; darf `anime_titles`-Defekt **nicht** implizit über Suchlogik kompensieren — D-12-Fix ist eine eigene, explizite Write-Path-Korrektur.
- **GSD-Workflow / main:** Phase läuft komplett auf `main` (kein Worktree); Migrationen additiv, nächste freie Nummer; vor breitem `git add` Live-Writer prüfen.
- **Backend = Docker (:8092 / realer Port via `docker ps`):** neue Route/Extension erst nach `docker compose up -d --build team4sv30-backend` + Migration sichtbar.

---

## Sources

### Primary (HIGH — direkt gegen aktuellen Code/Migrationen verifiziert in dieser Session)
- `backend/internal/repository/admin_content_anime_metadata.go:46-108` (D-12 Create/Patch-Slots, `LanguageCode:"romaji"`).
- `backend/internal/repository/admin_content.go:62-118` (`upsertAuthoritativeAnimeTitle` strenger JOIN).
- `backend/internal/services/anime_create_enrichment.go:1358-1385` (`buildAniSearchAltTitles`, `ja-Latn/romanized`; AltTitles nur Draft).
- `backend/internal/services/anime_metadata_backfill.go:132-171` (Backfill mappt `(ja, main)` korrekt).
- `backend/internal/models/admin_content.go:75-134, 269-284` (`AdminAnimeCreateInput`/`PatchInput` **ohne** `AltTitles`; `AltTitles` nur Draft-Payload).
- `backend/internal/repository/anime.go:298-394` (`primaryNormalizedTitleSQL` rangiert `romaji`; `buildAnimeListWhere` q/Status-Filter).
- `backend/internal/repository/fansub_repository.go:1338-1374` (`buildFansubGroupWhere`, kein impliziter Statusfilter).
- `backend/internal/repository/anime_metadata_repository.go:53-87` (`GetLanguageID/GetTitleTypeID/UpsertAnimeTitle`).
- `backend/internal/repository/testmain_test.go`, `frontend/vitest.config.ts`, `frontend/package.json` (Testinfrastruktur).
- `.planning/config.json` (`nyquist_validation:true`, `use_worktrees:false`).
- Migrationen `0001/0003/0009/0014/0017/0019/0020/0021/0022/0045/0061/0071/0097` (Datenmodell, aus vorheriger Analyse übernommen).
- `docs/performance/anime-search-query-plan-tracking.md` (Perf-Baseline 2026-03-03, ~13.351 Zeilen).

### Secondary (MEDIUM)
- `115-RESEARCH.analysis-report.md` (13-Punkte-Analyse, HIGH-Confidence, Quellmaterial).
- `115-UI-SPEC.md` (approved UI Design Contract — Frontend-Kontrakte gelockt).
- `.planning/codebase/*.md`, MEMORY (Perf-Basis, Docker-Rebuild, Live-Token-Verifikation, main-Konvention).

### Tertiary (LOW)
- Keine.

## Metadata

**Confidence breakdown:**
- Datenmodell/Indizes: HIGH — jede Tabelle/Spalte/Index aus Migrationen zitiert.
- D-12 Write-Sites: HIGH — alle drei Pfade + fehlender Persistenzpfad in dieser Session neu verifiziert.
- Sucharchitektur/API/UI-Empfehlung: HIGH für Bestandsaufnahme, MEDIUM für abgeleitete Normativ-Empfehlung.
- Validation Architecture: HIGH für Testinfrastruktur-Ist-Zustand; MEDIUM für abgeleiteten Wave-0-Bedarf (hängt an Planner-Entscheidung Live-DB vs. Smoke).

**Research date:** 2026-07-28
**Valid until:** ca. 30 Tage; bei paralleler Entwicklung auf `main` vor Umsetzung höchste Migrationsnummer
und die zitierten Datei:Zeile-Stellen erneut prüfen (Code kann sich verschoben haben).

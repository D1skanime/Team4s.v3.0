# Phase 115: Globale Suche (PostgreSQL FTS + Trigram) - Analyse-Report

**Researched:** 2026-07-28
**Domain:** Globale Suche (Anime + Fansubgruppen), PostgreSQL FTS/pg_trgm, Go-Backend, Next.js-Frontend
**Confidence:** HIGH (alle Kernaussagen sind direkt im Code/in Migrationen verifiziert, Datei:Zeile zitiert)
**Status:** Reiner Analyse-Report. Es wurde **kein** Produktivcode geändert, keine neue Tabelle/Index/API angelegt.

---

<user_constraints>
## User Constraints (aus 115-CONTEXT.md)

### Locked Decisions
- **D-01:** Erste Implementierung baut auf PostgreSQL Full-Text Search + `pg_trgm`, ggf. `unaccent`, GIN/GiST-Indizes und gewichtetem Relevanz-Ranking auf. Kein OpenSearch/Elasticsearch. PostgreSQL bleibt fachliche Source of Truth.
- **D-02:** Backend/API so entkoppeln, dass später ein externer Suchanbieter (z. B. Meilisearch) als Provider ergänzt werden kann (`SearchProvider`-Interface-Skizze), aber nur wenn es zu bestehenden Service-/Repository-/Interface-Patterns passt — kein Overengineering.
- **D-03:** Fachlicher Suchumfang mind.: Anime (Haupttitel, de/en/jp/Romaji-Titel, alt. Titel/Aliase, Slug, Jahr, Typ/Format, Genre, Tags/Themen/Motive, Beschreibung); Fansubgruppen (Name, Kürzel, Slug, alt. Namen, frühere Namen, Beschreibung). Mitglieder/Releases/Projekte nur als geprüfte spätere Erweiterung.
- **D-04:** Suchverhalten: exakte Treffer, Präfix, Teiltreffer, Groß-/Kleinschreibung, Bindestriche/Leerzeichen, Sonderzeichen/Akzente, leichte Tippfehler, alt. Schreibweisen, Gruppenkürzel, Slugs.
- **D-05:** Relevanz-Ranking fachlich nachvollziehbar (Anime: exakter Haupttitel > exakter alt. Titel > Präfix > ähnlich > Genre/Tags > Beschreibung; Fansubgruppen: exaktes Kürzel > exakter Name > exakter Slug > alt./früherer Name > Teiltreffer Name > Beschreibung). Exakter Treffer darf nie durch Popularität verdrängt werden.
- **D-06:** Filter/Facetten gegen Datenmodell prüfen (Jahr/Zeitraum, Genre, Tags, Typ/Format, Status, Fansubgruppe, Sprache, Release-/Projektstatus); Trefferzahlen darstellbar, wenn Aufwand/Performance vertretbar.
- **D-07:** Suche läuft über das Go-Backend; Frontend greift nie direkt auf PostgreSQL zu. Zu prüfen: `GET /api/v1/search` (Params `q, type, year_from, year_to, genre, tag, format, status, fansub_group, page, page_size, sort`), optional `GET /api/v1/search/suggestions`.
- **D-08:** UI im bestehenden UI-System (`@/components/ui`), Search-as-you-type, gruppierte Vorschläge, Tabs/Filter, Filter-Chips, Trefferzahlen, Debouncing, Request-Abbruch, URL-basierter Suchzustand, mobile Filter als Drawer.
- **D-09:** Performance von Beginn an: keine unindexierten `%LIKE%` über große Tabellen, keine N+1, `EXPLAIN ANALYZE` prüfen, Mindestlänge für Tippfehlersuche, Pagination/Cursor, Caching ggf. Allgemein langsame Seite separat untersuchen — nicht automatisch Windows/WSL/Docker annehmen.
- **D-10:** Meilisearch nur dokumentieren, nicht einbauen.

### Claude's Discretion
- Konkrete API-/DTO-/Interface-Form nach bestehenden Konventionen.
- Ob/wie die `SearchProvider`-Abstraktion eingeführt wird (nur wenn pattern-konform, kein Overengineering).

### Deferred Ideas (OUT OF SCOPE)
- Member/Releases/Release-Versionen/Projekte als Suchentitäten — erst nach separater Prüfung.
- Meilisearch/externer Provider — nur dokumentieren, nicht bauen.
- „Public Dashboard" (dritter toter Nav-Eintrag) — eigene spätere Phase.
</user_constraints>

---

## Zusammenfassung (Executive Summary)

Team4s hat **keine** einsatzfähige globale Suche — nur einen toten „Suche"-Navigationspunkt und eine bereits recht ausgereifte, aber unindexierte Teiltreffer-Suche (`q`-Parameter) auf den bestehenden Listen-Endpunkten `GET /api/v1/anime` und `GET /api/v1/fansubs`. Für Anime existiert überraschend viel normalisierte Infrastruktur bereits (`anime_titles` mit Sprachen/Titel-Typen inkl. `romaji`/`japanese`/`synonym`, `genres`/`anime_genres`, `tags`/`anime_tags`, `pg_trgm`-Indizes auf `anime.title/title_de/title_en` seit Migration `0017`), für Fansubgruppen existieren `slug`, `name` und ein Alias-System (`fansub_group_aliases`), aber **kein Kürzel-Feld** und **keine Trigram-Indizes**. `unaccent` ist nirgends aktiviert. Ein konkreter, code-verifizierter Defekt wurde gefunden: Der Haupttitel eines Anime wird beim manuellen Anlegen/Bearbeiten mit einem falschen Sprachcode (`"romaji"` statt eines gültigen `languages.code`) in `anime_titles` geschrieben und landet dadurch **nie** in der normalisierten Titeltabelle (Datei:Zeile unten).

**Primärempfehlung:** PostgreSQL FTS + `pg_trgm` (+ `unaccent`) reicht für den aktuellen Umfang (~13.351 Anime-Zeilen It. bestehendem Perf-Tracking-Dokument) klar aus; kein Meilisearch nötig. Der neue `GET /api/v1/search`-Endpunkt sollte die bestehenden Repository-/Handler-Konventionen von `AnimeRepository`/`FansubRepository` unmittelbar weiterverwenden (gleiche Query-Builder-, Pagination- und Fehler-Patterns) statt eine neue Sucharchitektur danebenzustellen; eine `SearchProvider`-Abstraktion ist zum jetzigen Zeitpunkt **nicht** notwendig (kein zweiter Provider existiert, D-02 verlangt sie nur „wenn pattern-konform").

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Volltext-/Trigram-Suche (Ranking, Relevanz) | Database (PostgreSQL FTS/pg_trgm) | API/Backend (Query-Zusammensetzung) | `tsvector`/`pg_trgm`-Matching ist DB-nativ, muss aber vom Backend parametrisiert/gewichtet werden — siehe D-01. |
| Sichtbarkeits-/Statusfilterung (disabled/dissolved etc.) | API/Backend | Database (WHERE-Klauseln) | Bestehendes Muster: `AnimeHandler.List`/`AnimeRepository` filtert `status <> 'disabled'` serverseitig (`backend/internal/repository/anime.go:346-348`); Frontend erhält nie ungefilterte Rohdaten. |
| Facetten-/Filterzählung (Genre/Tag-Token) | API/Backend | Database | Existierendes Muster `ListGenreTokens`/`buildAuthoritativeGenreTokensQuery` (`backend/internal/repository/admin_content.go:210,255`) zeigt: Aggregation gehört ins Repository, nicht ins Frontend. |
| Debouncing / Request-Abbruch / URL-Suchzustand | Browser/Client (Next.js Client Component) | — | Reine Client-UX-Mechanik (AbortController, `useSearchParams`), keine Backend-Beteiligung nötig. |
| Autocomplete/Suggestions-Aggregation | API/Backend | Database | Analog zum bestehenden `ListGenreTokens`/`ListTagTokens`-Präfix-Ranking (`backend/internal/repository/admin_content.go:219,332`) — nicht im Frontend nachbauen. |
| Späterer externer Suchanbieter (Meilisearch) | API/Backend (Provider-Austausch) | — | D-02: Muss hinter derselben Backend-Schnittstelle liegen; Frontend/DB bleiben unverändert. |

---

## 1. Aktueller Stand der bestehenden Suche

- Es gibt **keine eigenständige Such-Route, keine Suchseite und keinen `/api/v1/search`-Endpunkt** im Repository. Grep nach `search`/`Search` im Backend (`backend/internal/handlers`, `backend/internal/repository`) liefert ausschließlich Treffer zu anderen Domänen: externe AniSearch-/Jellyfin-Metadaten-Suche (`backend/internal/services/anisearch_client.go`, `backend/internal/handlers/jellyfin_search.go`), Admin-interne Auswahl-Suchfelder (Genre-/Tag-Tokens, Mitgliedersuche, Release-Review-Suche) und Cover-/Asset-Suche im Admin-Bereich. Keiner davon ist eine öffentliche „globale Suche".
- Der einzige Endpunkt mit echter Teiltreffer-Logik über Anime-Titel ist der bestehende Listen-Endpunkt `GET /api/v1/anime` (`backend/cmd/server/main.go:361`, Handler `backend/internal/handlers/anime.go:64-84`, Query-Parameter `q`). Er baut `ILIKE '%...%'`-Bedingungen über `title`/`title_de`/`title_en` sowie eine `EXISTS`-Subquery gegen `anime_titles` (`backend/internal/repository/anime.go:370-377`, äquivalent in der V2-Variante `backend/internal/repository/anime_v2.go:389-394`).
- Analog existiert `GET /api/v1/fansubs` mit `q`-Parameter, der `name ILIKE`, `slug ILIKE` und eine `EXISTS`-Subquery gegen `fansub_group_aliases.alias ILIKE` kombiniert (`backend/internal/repository/fansub_repository.go:1338-1362`, Handler `backend/internal/handlers/fansub_groups.go:35-54`).
- Diese `q`-Filter sind aber **interne Bausteine**, keine nutzerseitig sichtbare globale Suche: `getAnimeList({ q, per_page: 8 })` wird z. B. für die interne Anime-Verknüpfung in Contribution-Proposals wiederverwendet (`frontend/src/lib/api.ts:8844-8851`, Funktion `searchAnimeForProposal`), und im Admin-Anime-Browser gibt es ein Suchfeld (`frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx:52-75`) — beides nicht öffentlich/global.
- **Korrektur einer Annahme aus dem Nutzer-Konzept:** Es gibt entgegen der CONTEXT.md-Annahme („die beiden „Suche"-Navigationspunkte") **nur einen einzigen** toten „Suche"-Navigationspunkt im gesamten Frontend (siehe Punkt 2/Frage 1 unten), nicht zwei.

## 2. Relevante Frontend- und Backend-Dateien

**Frontend (Navigation/Shell):**
- `frontend/src/components/layout/AppShell.tsx` — einzige Shell-Komponente (kein separates Desktop-/Mobile-Layout, sondern ein einziger Slide-in-Drawer, der per Edge-Hover (Desktop) oder Hamburger-Button (Mobile) geöffnet wird, siehe `styles.edgeStrip`/`styles.mobileNavButton`, Zeilen 360-392).

**Frontend (Listen-/Filter-/Pagination-Vorlagen, als Muster für die neue Suche):**
- `frontend/src/lib/api.ts` — `buildFansubListQuery` (Zeile 520-528), `getAnimeList`/`AnimeListParams` (Zeile 1420-1454, Typ in `frontend/src/types/anime.ts:26-36`), `searchAnimeForProposal` (Zeile 8844-8851).
- `frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx` — Such-/Buchstaben-/Cover-Filterleiste (Admin-Kontext), **verwendet aber natives `<input>`/`<button>` statt der Pflicht-Primitives aus `@/components/ui`** (Zeilen 56-73) — kein Vorbild für die UI-Umsetzung der neuen globalen Suche, sondern eine bestehende Abweichung von der CLAUDE.md-UI-Konvention, die nicht kopiert werden darf.
- `frontend/src/components/anime/LetterFilter.tsx`, `frontend/src/components/anime/Pagination.tsx` — bestehende Filter-/Pagination-Komponenten im öffentlichen Anime-Bereich.

**Backend (Listen-/Query-Muster als Vorlage):**
- `backend/internal/handlers/anime.go` (`AnimeHandler.List`, Zeile 64-130ff.) — Query-Parameter-Validierung (`page`, `per_page`, `q`, `letter`, `content_type`, `status`, `fansub_id`, `include_disabled`, `has_cover`), inkl. Admin-Gate für `include_disabled` (Zeile 119-127).
- `backend/internal/repository/anime.go` (`AnimeRepository.List`, `buildAnimeListWhere`, Zeile 28-87, 330-394) und die V2-Schattenmigration `backend/internal/repository/anime_v2.go` (`buildAnimeListWhereV2WithSchema`, Zeile 360-394).
- `backend/internal/handlers/fansub_groups.go` (`ListFansubs`, Zeile 19-79) und `backend/internal/repository/fansub_repository.go` (`ListGroups`, `buildFansubGroupWhere`, Zeile 36-89, 1338-1368).
- `backend/internal/repository/admin_content.go` — bestehendes Genre-/Tag-Token-Facetten-Muster mit Präfix-Priorisierung: `buildAuthoritativeGenreTokensQuery` (Zeile 210-217), `filterGenreTokens` (Zeile 219-254), `ListGenreTokens` (Zeile 255-280); analoges Tag-Pendant ab Zeile 288ff.
- `backend/internal/models/anime.go` — `AnimeFilter`, `AnimeListItem`, `AnimeDetail`, `GenreToken` (ganze Datei, 102 Zeilen).
- `backend/internal/models/fansub.go:28-33` — `FansubFilter{Page, PerPage, Q, Status}`.
- `shared/contracts/openapi.yaml:564-633` (`GET /api/v1/anime`) und `:2694` (`GET /api/v1/fansubs`) — Contract-Konvention (Response-Schema `PaginatedAnimeResponse`, Query-Doku inkl. `maxLength`, Beispielwerten).

## 3. Vorhandenes Datenmodell (Anime + Fansubgruppen)

**Anime — Kernspalten** (`database/migrations/0001_init_anime.up.sql:22-33`, erweitert u. a. in `0003`, `0008`, `0040`, `0045`):
- `id, title (TEXT NOT NULL), type (enum anime_type: tv/film/ova/ona/special/bonus), content_type (enum: anime/hentai), status (enum anime_status: disabled/ongoing/done/aborted/licensed), year, max_episodes, cover_image, created_at, updated_at`.
- `title_de, title_en, genre (TEXT, Freitext-Legacy-Spalte), description, view_count` — `database/migrations/0003_expand_anime_columns.up.sql:1-6`.
- `source, sub_comment, stream_comment, is_self_subbed, folder_name, anisearch_id` — `database/migrations/0008_expand_anime_episode_columns.up.sql:3-9`.
- `slug (VARCHAR(255))`, `anime_type_id`, `modified_at`, `modified_by` — nachträglich ergänzt in `database/migrations/0045_reconcile_db_schema_v2_columns.up.sql:4-8`, inkl. eindeutigem partiellen Index `uq_anime_slug` (Zeile 23-25). **Slug existiert also bereits**, entgegen einer naheliegenden Annahme, dass er noch fehlt.
- Es existieren **keine** eigenen Spalten `title_jp`/`title_romaji` auf der `anime`-Tabelle direkt — diese Sprachvarianten sind stattdessen normalisiert modelliert (siehe unten `anime_titles`).

**Anime — normalisierte Titel-Infrastruktur** (`database/migrations/0021_add_normalized_metadata_tables.up.sql:6-19`, Referenztabellen in `database/migrations/0020_add_metadata_reference_tables.up.sql`):
- `anime_titles(id, anime_id, language_id, title, title_type_id, ...)` mit `UNIQUE(anime_id, language_id, title_type_id)` und Indizes auf `anime_id`, `language_id`, `title_type_id`.
- `languages` ist geseedet mit u. a. `ja` (Japanese), `en`, `de`, `fr`, `es`, `it`, `pt`, `zh`, `ko` (`0020_add_metadata_reference_tables.up.sql:33-43`).
- `title_types` ist geseedet mit `main, official, short, synonym, romaji, japanese` (`0020_add_metadata_reference_tables.up.sql:14-21`).
- Damit ist die **Datenstruktur** für Haupttitel/alternative Titel/Synonyme/Romaji/Japanisch bereits vollständig vorbereitet und wird aktiv beschrieben (Schreibpfade unten in Punkt 4/5), nicht nur als leeres Schema-Fragment.
- `anime_relations(source_anime_id, target_anime_id, relation_type_id)` — normalisierte Anime-zu-Anime-Beziehungen (`0021_add_normalized_metadata_tables.up.sql:22-33`), für Phase 115 nicht direkt relevant, aber Teil desselben Migrationspakets.

**Anime — Genre/Tags** (Details siehe Punkt 7).

**Fansubgruppen — Kernspalten** (`database/migrations/0009_fansub_groups.up.sql:1-34`):
- `id, slug (VARCHAR(120) NOT NULL, UNIQUE), name (VARCHAR(120) NOT NULL, UNIQUE), description, history, logo_url, banner_url, founded_year, dissolved_year, status (active/inactive/dissolved), website_url, discord_url, irc_url, country`.
- `description`/`history` wurden später **entfernt**: `database/migrations/0071_drop_fansub_legacy_text_fields.up.sql:27-30` (`DROP COLUMN description, history, history_description`). Freitext-Beschreibungen laufen seitdem über eine separate `fansub_group_notes`-Tabelle mit `visibility ('public'|'internal')` und `status ('draft'|'published'|'archived'|'deleted')` (`database/migrations/0061_fansub_group_notes.up.sql:1-22`) — **nicht** mehr über eine einzelne Spalte auf `fansub_groups`.
- `closed_year, history_description` wurden zwischenzeitlich als Kompatibilitätsspalten ergänzt (`0045_reconcile_db_schema_v2_columns.up.sql:100-107`), sind aber laut `0071` inzwischen selbst wieder entfernt (history_description dort mitgedroppt).
- `logo_id, banner_id` (FK auf `media_assets`) — `database/migrations/0016_media_assets.up.sql:16-18`.
- **Kein Kürzel-/Abbreviation-Feld:** Es existiert **keine** Spalte wie `abbreviation`, `short_name`, `kuerzel` oder `acronym` auf `fansub_groups` — vollständiger Grep über alle Migrationen liefert null Treffer. „Kürzel" im Sinn von D-03/D-05 (z. B. „T4S") muss also entweder aus `slug` (`team4s` bzw. `team-4s`) oder aus `fansub_group_aliases.alias` (z. B. explizit gepflegtes Kürzel als Alias) abgeleitet werden — es gibt **kein eigenes fachliches Kürzel-Feld**.

**Fansubgruppen — Aliase/frühere Namen:**
- `fansub_group_aliases(id, fansub_group_id, alias VARCHAR(120), normalized_alias VARCHAR(120), ...)` mit `UNIQUE(normalized_alias)` global und `UNIQUE(fansub_group_id, normalized_alias)` (`database/migrations/0014_fansub_group_aliases.up.sql:1-13`), zusätzliche Spalte `group_id` (Duplikat/Kompat zu `fansub_group_id`) aus `0045_reconcile_db_schema_v2_columns.up.sql:109-117`.
- Es gibt **kein separates Feld/Flag „früherer Name" vs. „alternativer Name"** — beides landet undifferenziert in `fansub_group_aliases.alias`. D-03 verlangt beides („alternative Namen, frühere Namen") als Suchumfang; strukturell ist nur ein einziger, nicht kategorisierter Alias-Topf vorhanden.

**Visibility/Status-Achsen (öffentliche Sichtbarkeit):**
- `anime.status` (enum `disabled/ongoing/done/aborted/licensed`) — `disabled` wird von der öffentlichen Liste standardmäßig ausgeschlossen (`backend/internal/repository/anime.go:346-348`: `else if !filter.IncludeDisabled { conditions = append(conditions, "status <> 'disabled'") }`), `include_disabled=true` erfordert Plattform-Admin-Identität (`backend/internal/handlers/anime.go:119-127`).
- `fansub_groups.status` (`active/inactive/dissolved`, Check-Constraint `chk_fansub_groups_status`, `0009_fansub_groups.up.sql:18-19`) — **wird beim öffentlichen Listen-Endpunkt `GET /api/v1/fansubs` nicht automatisch gefiltert**: `buildFansubGroupWhere` (`backend/internal/repository/fansub_repository.go:1338-1368`) wendet einen Status-Filter nur an, wenn der Aufrufer explizit `status=` mitgibt (Zeile 1364-1367); ohne Parameter werden **auch `dissolved`-Gruppen** zurückgegeben. Für die globale Suche muss explizit entschieden werden, ob dieses bestehende (permissive) Verhalten übernommen oder verschärft wird — das ist derzeit **keine versteckte Filterung**, sondern schlicht **keine** Filterung.
- Eine generische `visibilities`-Referenztabelle existiert bereits (`database/migrations/0097_v12_status_foundation.up.sql:56-124`, FK von `anime_contributions.visibility_id`/`media_assets.visibility_id`), ist aber **nicht** an `anime` oder `fansub_groups` selbst angebunden — sie betrifft Beitrags-/Medien-Sichtbarkeit, nicht die Sichtbarkeit von Anime-/Fansub-Datensätzen als Suchobjekt.
- Entwürfe/gelöschte Datensätze: Für `anime`/`fansub_groups` gibt es kein Soft-Delete-Flag (`deleted_at`) — Löschung erfolgt hart (`DELETE FROM anime_titles ...`, `backend/internal/repository/admin_content_anime_delete.go:182,223` zeigt harte Löschpfade für abhängige Titel-Datensätze). Für die Suche bedeutet das: gelöschte Anime/Gruppen existieren schlicht nicht mehr in der Tabelle (kein Ausschluss-Filter nötig), aber `status='disabled'` ist der einzige „Entwurf"-artige Zustand bei Anime und muss aktiv ausgeschlossen werden.

## 4. Bereits nutzbare Felder für die Suche

- **Anime:** `title`, `title_de`, `title_en`, `slug`, `year`, `type` (Enum, gemappt über `anime_types`/`anime_type_id`), `status`, `genre` (Legacy-Freitext) sowie normalisiert `genres`/`tags` über die Junction-Tabellen (Details Punkt 7), `description`, `anisearch_id` (für Debugging/Datenherkunft, nicht für Nutzersuche gedacht).
- **Anime — alternative Titel:** `anime_titles.title` ist strukturell nutzbar und wird bereits in der bestehenden `q`-Suche als `EXISTS`-Subquery einbezogen (`backend/internal/repository/anime.go:373`). Geschrieben wird sie aktuell über `upsertAuthoritativeAnimeTitle` (`backend/internal/repository/admin_content.go:62-115`), aufgerufen aus `buildAuthoritativeAnimeMetadataCreate`/`buildAuthoritativeAnimeMetadataPatch` (`backend/internal/repository/admin_content_anime_metadata.go:46-73, 75-103`) für die Slots `title_de` (`language_id='de', title_type='main'`) und `title_en` (`language_id='en', title_type='official'`) — **diese beiden funktionieren nachweislich korrekt.**
  - **Konkreter, code-verifizierter Defekt:** Der Haupttitel-Slot wird mit `LanguageCode: "romaji"` statt eines gültigen Sprachcodes geschrieben (`backend/internal/repository/admin_content_anime_metadata.go:51` und `:83`, jeweils `LanguageCode: "romaji", TitleType: "main"`). Die `languages`-Tabelle kennt aber **keinen** Code `romaji` (nur `ja, en, de, fr, es, it, pt, zh, ko`, siehe `0020_add_metadata_reference_tables.up.sql:33-43`) — `romaji` ist stattdessen ein Eintrag in `title_types` (`0020_add_metadata_reference_tables.up.sql:19`). Der SQL-Join in `upsertAuthoritativeAnimeTitle` (`backend/internal/repository/admin_content.go:97-104`, `... FROM languages l JOIN title_types tt ON tt.name = $3 WHERE l.code = $2`) findet für `l.code = 'romaji'` **keine Zeile**, das `INSERT ... SELECT` schreibt dadurch **still keine Zeile**. Das heißt: **Der Haupttitel eines manuell angelegten/bearbeiteten Anime landet aktuell nie in `anime_titles`** — nur `title_de`/`title_en` werden normalisiert gespiegelt. Für die Sucharchitektur ist relevant: Man kann sich beim Aufbau der Suche **nicht** darauf verlassen, dass `anime_titles` bereits den Haupttitel enthält; der Haupttitel muss weiterhin über die Legacy-Spalte `anime.title` gesucht werden (was die bestehende `q`-Logik ohnehin schon so macht, `... ILIKE $n ...` auf `displayTitleExpr`).
- **Anime — Genre/Tags:** normalisierte Namen aus `genres.name`/`tags.name` via `anime_genres`/`anime_tags` (siehe Punkt 7), inkl. bestehender Präfix-Facetten-Funktion `ListGenreTokens`/analoges Tag-Pendant.
- **Fansubgruppen:** `slug` (eindeutig, NOT NULL), `name` (eindeutig, NOT NULL), `fansub_group_aliases.alias`/`normalized_alias` (alternative Namen/frühere Namen, undifferenziert), `status`, `founded_year`/`dissolved_year`/`closed_year`, `country`.
- **Fansubgruppen — Beschreibung:** aktuell **nicht** als einzelnes Suchfeld auf `fansub_groups` verfügbar (Spalte entfernt, siehe Punkt 3); vorhandene Freitexte liegen granular in `fansub_group_notes.body_markdown`/`body_html` mit `visibility`/`status`-Gating — für die Suche müsste hier eine explizite Entscheidung getroffen werden, ob/wie diese Notizen einbezogen werden (D-03 nennt Beschreibung „falls sinnvoll").

## 5. Fehlende Daten/Strukturen

- **Kein Kürzel-Feld für Fansubgruppen** (siehe Punkt 3) — muss über `slug`/Alias abgebildet werden oder erfordert eine neue Spalte (außerhalb des Analyse-Mandats dieser Phase zu entscheiden).
- **Keine Kategorisierung „alternativer Name" vs. „früherer Name"** bei `fansub_group_aliases` — beides ist derselbe undifferenzierte Alias-Datensatz.
- **Keine `fansub_groups.description`-Spalte mehr** — Beschreibungstext ist (falls vorhanden) in `fansub_group_notes` verteilt und visibility-/status-gated.
- **Haupttitel fehlt faktisch in `anime_titles`** wegen des oben beschriebenen Sprachcode-Defekts (Punkt 4) — nicht strukturell fehlend, aber faktisch nicht befüllt.
- **Kein `unaccent`-Extension-Einsatz** irgendwo im Repository (siehe Punkt 6) — für Akzent-/Sonderzeichen-Normalisierung (D-01/D-04, Beispiel „Naruto" vs. Umlaut-/Akzentvarianten) fehlt diese Grundlage vollständig.
- **Keine GIN/Trigram-Indizes auf `anime_titles.title`, `genres.name`, `tags.name`, `fansub_groups.name`, `fansub_groups.slug`, `fansub_group_aliases.alias`** — nur die drei Anime-Kernspalten (`title/title_de/title_en`) haben Trigram-Indizes (Details Punkt 6).
- **Keine tsvector-Spalte/kein gewichtetes Ranking** irgendwo im Schema — `to_tsvector`/`tsvector` liefert bei keiner Migration einen Treffer (verifiziert per Grep über `database/migrations/`).
- **Keine UI zum Pflegen von Romaji-/Japanisch-/Synonym-Titeln:** Die Struktur (`title_types` inkl. `romaji`, `japanese`, `synonym`) existiert, aber es gibt keinen Frontend-Formularpfad, der diese Slots befüllt (Grep nach `romaji`/`title_type`/`synonym` im Frontend liefert nur unabhängige Treffer zu Release-„Versionen", keine Anime-Titel-UI). Diese Titelarten sind also strukturell vorbereitet, aber **operativ leer**, solange kein Schreibpfad existiert.

## 6. Vorhandene und fehlende Indizes

**Vorhanden (verifiziert per Grep über alle `database/migrations/*.sql`):**
- `pg_trgm`-Extension aktiviert seit `database/migrations/0017_anime_search_trgm.up.sql:1` (`CREATE EXTENSION IF NOT EXISTS pg_trgm;`).
- GIN-Trigram-Indizes: `idx_anime_title_trgm` auf `anime.title`, `idx_anime_title_de_trgm` auf `anime.title_de`, `idx_anime_title_en_trgm` auf `anime.title_en` (`0017_anime_search_trgm.up.sql:3-10`).
- Klassische B-Tree-Indizes: `idx_anime_title` (`anime.title`), `idx_anime_status`, `idx_anime_content_type` (`0001_init_anime.up.sql:35-37`); `idx_anime_slug`/`uq_anime_slug` (partiell, `WHERE slug IS NOT NULL`) und `uq_anime_anisearch_id` (`0045_reconcile_db_schema_v2_columns.up.sql:20-26`).
- `idx_anime_title_anime`, `idx_anime_title_language`, `idx_anime_title_type` auf `anime_titles(anime_id/language_id/title_type_id)` (`0021_add_normalized_metadata_tables.up.sql:17-19`) — **keine** Volltext-/Trigram-Unterstützung auf `anime_titles.title` selbst.
- `idx_genre_name` (B-Tree auf `genres.name`), `idx_tag_name` (B-Tree auf `tags.name`) (`0019_add_reference_data_tables.up.sql:13,24`) — reine Exakt-/Präfix-Indizes, keine Substring-Suche.
- `idx_anime_genre_anime`/`idx_anime_genre_genre`, `idx_anime_tag_anime`/`idx_anime_tag_tag` auf den Junction-Tabellen (`0022_add_junction_tables.up.sql:13-14, 24-25`).
- `idx_fansub_groups_slug`/`idx_fansub_groups_name` (beide UNIQUE B-Tree) und `idx_fansub_groups_status` (`0009_fansub_groups.up.sql:28-33`).
- `idx_fansub_group_aliases_group_id` (`0014_fansub_group_aliases.up.sql:12-13`) und `idx_fansub_group_alias_group` auf der Kompat-Spalte `group_id` (`0045_reconcile_db_schema_v2_columns.up.sql:116-117`) — beide nur auf der FK-Spalte, nicht auf `alias`.

**Fehlend (relevante Lücken für D-01/D-04/D-09):**
- **Kein** Trigram-/GIN-Index auf `anime_titles.title` — die bestehende `EXISTS`-Subquery (`anime.go:373`) läuft pro Anime-Zeile mit `at.anime_id = anime.id AND at.title ILIKE $n`; durch die Gleichheitsbedingung auf `anime_id` (indiziert) ist der Scan pro Anime auf wenige Zeilen begrenzt, ist damit unkritisch, aber **nicht** für eine eigenständige globale `anime_titles`-Suche über alle Anime hinweg optimiert.
- **Kein** Trigram-/GIN-Index auf `genres.name`/`tags.name` — für Teiltreffer-Suche auf Genre-/Tag-Namen wie in D-04 gefordert nicht ausreichend (aktuelle Nutzung ist ohnehin nur Präfix-Filterung im Speicher, `filterGenreTokens`, `admin_content.go:219-254`, keine SQL-`ILIKE`-Suche).
- **Kein** Trigram-/GIN-Index auf `fansub_groups.name`, `fansub_groups.slug`, `fansub_group_aliases.alias` — die bestehende `q`-Suche (`buildFansubGroupWhere`, `fansub_repository.go:1343-1362`) verwendet ungeindexte `ILIKE '%...%'`-Vergleiche auf allen drei Feldern; bei wachsender Gruppenzahl ein klarer Performance-Risikopunkt (D-09 „keine unindexierten `%LIKE%` über große Tabellen").
- **Keine** `unaccent`-Extension und folglich kein funktionaler Index über eine `unaccent()`-normalisierte Ausdrucksspalte.
- **Kein** zusammengesetzter `tsvector`-Index (weder generated column noch materialisierte Spalte) für gewichtetes Ranking gemäß D-05 — aktuell existiert ausschließlich Trigram-basierte Ähnlichkeitssuche, kein FTS-Ranking-Mechanismus.

**Bestehendes Performance-Tracking als Startbasis (nicht neu erhoben, sondern vorhandene Dokumentation):**
`docs/performance/anime-search-query-plan-tracking.md` dokumentiert bereits eine Baseline vom 2026-03-03 bei `anime_rows=13351`: Eine selektive Suche (`%nar%`) nutzt `Bitmap Index Scan` auf den drei Trigram-Indizes und läuft in ~0,985 ms; eine sehr breite Suche (`%a%`) fällt auf `Index Scan` mit Filter zurück (~0,197 ms). Das Dokument definiert auch bereits Drift-Trigger und ein wöchentliches Prüfschema — eine direkte Vorlage für das in D-09 geforderte `EXPLAIN ANALYZE`-Monitoring der neuen Suche.

## 7. Fachliche Abgrenzung Genre vs. Tags vs. weitere Kategorien

- **Der zweite bereits vorhandene fachliche Begriff neben „Tag" ist eindeutig „Genre"** — nicht „Thema", „Kategorie" oder „Motiv". Belege:
  - Legacy-Freitextspalte `anime.genre TEXT` (`database/migrations/0003_expand_anime_columns.up.sql:4`).
  - Normalisierte Tabellen `genres`/`anime_genres` (`0019_add_reference_data_tables.up.sql:6-13`, `0022_add_junction_tables.up.sql:6-14`) — der Migrationskommentar in `0019` lautet wörtlich: *„Tags table - normalized anime tags (Phase 10: analogous to genres)"* (`0019_add_reference_data_tables.up.sql:15`) — Tags wurden also **explizit als Analogon zu Genres** nachgebaut, nicht umgekehrt.
  - Backend-Modell: `AnimeDetail.Genre *string` (Legacy-Einzelwert) und `AnimeDetail.Genres []string` (normalisiert) stehen im Code direkt neben `AnimeDetail.Tags []string` (`backend/internal/models/anime.go:52-54`).
  - Bestehende Facetten-Funktionen sind bewusst parallel benannt: `ListGenreTokens`/`buildAuthoritativeGenreTokensQuery`/`filterGenreTokens` (`admin_content.go:210-280`) neben dem strukturell identischen Tag-Pendant (`admin_content.go:288ff.`, `GET /api/v1/admin/tags` laut `admin_content_test.go:1855`).
- **„Themes" ist eine andere, unabhängige Fachdomäne und KEIN Kandidat für „der zweite Begriff neben Tag":** `backend/internal/repository/admin_content_anime_themes.go` und die Tabellen `themes`/`theme_types`/`theme_segments` beschreiben **Opening-/Ending-Videosegmente** eines Anime (Quelle: Jellyfin-Themes bzw. hochgeladene Release-Assets, referenziert über `source_type` wie `jellyfin_theme`/`release_asset`, siehe `admin_content_anime_themes.go:18-25`). Das hat mit der Genre-/Tag-Taxonomie nichts zu tun — eine Verwechslung wäre hier naheliegend, da der Name „Theme" im ersten Moment nach „Motiv/Thema" klingt, tatsächlich aber „OP/ED-Videosegment" bedeutet. Für die Suche ist diese Tabelle **nicht** relevant (kein Bestandteil von D-03).
- **Fazit für die Sucharchitektur:** Genre und Tag sind im Datenmodell bereits strukturell gleichwertig behandelt (zwei parallele, normalisierte n:m-Beziehungen über `anime_genres`/`anime_tags`). Ein neues, drittes „Kategorie/Motiv"-Konzept existiert **nicht** und muss für D-03 („Tags/Themen/Motive") nicht neu erfunden werden — „Tags" im bestehenden Datenmodell deckt diesen Bereich bereits ab, ergänzt um die separate (Video-)„Themes"-Domäne, die davon zu unterscheiden ist.

## 8. Vorschlag für Sucharchitektur

- **PostgreSQL FTS + `pg_trgm` (+ `unaccent`)** wie in D-01 verlangt und durch die bestehende Baseline (Punkt 6) technisch bereits vorbereitet. Konkret:
  - Bestehende Trigram-Indizes auf `anime.title/title_de/title_en` weiterverwenden; neue Trigram-Indizes ergänzen für `anime_titles.title`, `genres.name`, `tags.name`, `fansub_groups.name`, `fansub_groups.slug`, `fansub_group_aliases.alias` (konkrete `CREATE INDEX`-Anweisungen sind Umsetzungsarbeit einer Folgephase, nicht dieser Analyse).
  - `unaccent` als neue Extension aktivieren (bisher nirgends vorhanden) — wichtig für D-04 „Sonderzeichen/Akzente".
  - Für gewichtetes Ranking (D-05) wird eine `tsvector`-Ebene zusätzlich zu `pg_trgm` benötigt (aktuell existiert nur Trigram-Ähnlichkeit, kein FTS-Ranking) — z. B. generierte `tsvector`-Spalte mit `setweight()` über Haupttitel/alt. Titel/Genre-Tag/Beschreibung, kombiniert mit `pg_trgm` für Tippfehlertoleranz. Das ist konzeptionell zu entwerfen, aber **nicht** in dieser Analysephase umzusetzen.
- **`SearchProvider`-Abstraktion (D-02):** Die bestehende Backend-Architektur kennt **keine** generische Provider-Interface-Schicht für Domänen-Repositories — Repositories sind konkrete Structs mit `*pgxpool.Pool` (`AnimeRepository`, `FansubRepository`, `AdminContentRepository` usw., z. B. `backend/internal/repository/anime.go:20-26`), instanziiert direkt in `backend/cmd/server/main.go` ohne DI-Container (bestätigt durch `.planning/codebase/CONVENTIONS.md:5`: „dependencies are passed manually rather than through a DI container"). Eine schlanke `SearchProvider`-Interface-Definition (wie in D-02 skizziert) mit einer einzigen Postgres-Implementierung ist mit diesem Stil **kompatibel** (ein weiteres, schmales Interface analog zu bestehenden kleinen Interfaces wie `animeSchemaQuerier`, `backend/internal/repository/anime_schema.go:10-12`), sollte aber **nicht** mehr Abstraktionsebenen einführen als das (kein Factory-/Registry-Mechanismus, kein Konfigurations-Switch zwischen Providern, solange nur ein Provider existiert) — das wäre Overengineering im Sinn von D-02/CLAUDE.md.
- **Wiederverwendung statt Neubau:** Die Facetten-/Präfix-Ranking-Logik aus `ListGenreTokens`/`filterGenreTokens` (Punkt 2/7) ist ein direktes Vorbild für die in D-05 geforderte Priorisierung „Präfix vor Teiltreffer" und sollte als Muster übernommen, nicht neu entworfen werden.
- **Schema-Introspektion nicht nachbauen:** Die V1/V2-Schatten-Migrationslogik (`animeV2SchemaInfo`, `backend/internal/repository/anime_schema.go`) ist reine Rückwärtskompatibilität aus einer älteren Migrationsphase (Spalten wie `slug` existieren inzwischen immer, da die Migrationen bis mindestens `0134` durchlaufen sind) — die neue Suche sollte direkt gegen das aktuelle Schema entwickeln, ohne diese Laufzeit-Schemaprüfung zu kopieren.

## 9. Vorschlag für API und UI

**API** (an bestehende Konventionen angelehnt, siehe `shared/contracts/openapi.yaml:564-633`, `backend/internal/handlers/anime.go:64-130`):
- Neuer Endpunkt `GET /api/v1/search` mit Parametern gemäß D-07 (`q, type, year_from, year_to, genre, tag, format, status, fansub_group, page, page_size, sort`), validiert nach demselben Muster wie `AnimeHandler.List`: `parsePositiveInt`, `DefaultQuery`, `badRequest(c, "ungültiger ... parameter")`, `strings.TrimSpace` + `maxLength`-Prüfung für `q` (vgl. `anime.go:80-84`, `q` dort limitiert auf 100 Zeichen — vergleichbares Limit für die globale Suche sinnvoll).
- Response-Envelope konsistent mit bestehendem Muster `{"data": [...], "meta": models.PaginationMeta{Total, Page, PerPage, TotalPages}}` (siehe `fansub_groups.go:70-77`) — kein neues Envelope-Format erfinden.
- Optionaler `GET /api/v1/search/suggestions` analog zum bestehenden Präfix-Facetten-Muster (`ListGenreTokens`/Tag-Pendant), inkl. Begrenzung der Trefferzahl (D-09 „Vorschläge begrenzen").
- Contract-Pflege in `shared/contracts/openapi.yaml` nach demselben Stil wie der bestehende `/api/v1/anime`-Eintrag (Parameterbeschreibung, `maxLength`, Beispielwerte, Statuscodes 200/400).
- Route-Registrierung in `backend/cmd/server/main.go` in der bestehenden `v1`-Gruppe (Zeile 340ff.), kein Sonderweg.

**UI** (D-08, Pflicht-Primitives aus `@/components/ui`, siehe `./CLAUDE.md` „Frontend-UI (globales Design-System)"):
- Der einzige tote „Suche"-Eintrag liegt aktuell ausschließlich im **anonymen** Navigations-Drawer (`AppShellAnonNavGroups`, `frontend/src/components/layout/AppShell.tsx:186-191`, badge `'bald'`). Der **authentifizierte** Drawer (`AppShellNavGroups`, Zeilen 120-124) hat **keinen** „Suche"-Eintrag, sondern nur einen unabhängigen toten „Dashboard"-Eintrag. Für D-08 („zentrales Suchfeld") muss also entschieden werden, ob „Suche" **neu** in den authentifizierten Drawer aufgenommen wird (fehlt dort komplett) und/oder der bestehende anonyme Eintrag aktiviert wird — es ist technisch **ein** Nav-Item zu aktivieren/ergänzen, nicht zwei bestehende zu verknüpfen.
- Da AppShell ein einziger, responsiver Drawer ist (kein getrenntes Desktop-/Mobile-Rendering), betrifft jede Nav-Änderung automatisch beide Formfaktoren — es muss keine Duplizierung zwischen „Desktop-Menü" und „Mobile-Menü" gepflegt werden.
- Neue Suchseite/-komponenten sollten ausschließlich `@/components/ui`-Primitives verwenden (`FormField`, `Input`, `Tabs`, `Drawer`, `Card` etc., Referenz `/dev/ui-system`) — **nicht** das bestehende `AnimeBrowserFilters.tsx`-Muster mit rohem `<input>`/`<button>` kopieren (Punkt 2), das selbst bereits eine (unbehandelte) Abweichung vom globalen Design-System ist.
- URL-Suchzustand, Debouncing und Request-Abbruch (D-08) sind reine Client-Mechanik ohne bestehende Vorlage im Repository — hierfür gibt es noch kein wiederverwendbares Muster, sollte aber als eigenständige, kleine Client-Utility (z. B. `useDebouncedSearch`-Hook) entworfen werden, nicht pro Seite dupliziert.

## 10. Performance-Risiken

- **Ungeindexte `ILIKE '%...%'`-Suche auf Fansubgruppen** (`name`, `slug`, `fansub_group_aliases.alias`) ist der klarste konkrete Risikopunkt, der heute schon im Code existiert (Punkt 6) — bei wachsender Gruppenzahl (aktuell unbekannt, aber deutlich kleiner als die Anime-Tabelle) ein Kandidat für baldige Trigram-Indizierung, bevor die globale Suche produktiv geht.
- **`anime_titles`-EXISTS-Subquery bei einer künftigen globalen (nicht mehr pro-Anime-`anime_id`-beschränkten) Suche** könnte ohne Trigram-Index auf `title` zum Sequential Scan über die gesamte Tabelle führen, sobald die Suche nicht mehr korreliert pro Anime, sondern direkt gegen `anime_titles` über alle Anime hinweg filtert (z. B. bei kombiniertem Ranking über mehrere Entitäten).
- **Fehlendes `unaccent`** bedeutet: Wird Akzent-/Umlaut-Normalisierung nachträglich per Ausdruck (`unaccent(title) ILIKE unaccent('%...%')`) eingeführt, kann das bestehende Trigram-Indizes (die auf der Rohspalte liegen) unbrauchbar machen, falls nicht zusätzlich ein funktionaler Index über den `unaccent()`-Ausdruck angelegt wird — sonst Sequential Scan trotz Extension.
- **Kein Soft-Delete/Status-Filter bei Fansubgruppen:** Da `GET /api/v1/fansubs` `dissolved`-Gruppen standardmäßig mitliefert (Punkt 3), würde eine 1:1-Wiederverwendung dieses Verhaltens in der globalen Suche potenziell irreführende/unerwünschte Treffer liefern — das ist zwar kein reines Performance-, sondern ein fachliches Sichtbarkeitsrisiko, hat aber Query-Umfang-Implikationen (mehr Zeilen zu scannen/ranken als nötig).
- **„Allgemein langsame Seite" separat einordnen (D-09):** Das bestehende Perf-Tracking-Dokument für die öffentliche Projektseite (`docs/performance/anime-search-query-plan-tracking.md` für Suche selbst; Memory „Perf-Basis Public-Projektseite" für die allgemeine Seiten-Performance) zeigt bereits: Bei der bisher gemessenen, datenreichsten öffentlichen Seite war **nicht** SQL der Engpass (alle Statements sub-ms), sondern ein serieller Fächer aus ca. 12 SSR-Backend-Requests pro Render sowie der Dev-Modus-Cold-Compile (Turbopack), der die gefühlte Langsamkeit stark verzerrt. Für die neue Suchseite gilt dieselbe Vorsicht: Bevor Windows/WSL/Docker oder PostgreSQL als Ursache vermutet werden, sollte geprüft werden, ob die Suchseite mehrere SSR-Requests seriell statt parallel/aggregiert feuert, und ob im Produktions-Build gemessen wird statt im Dev-Modus.
- **Datenvolumen aktuell moderat:** ~13.351 Anime-Zeilen laut bestehendem Perf-Tracking-Dokument (Stand 2026-03-03) — bei diesem Volumen ist selbst eine breite `%a%`-Trigram-Suche laut Messung nur ~0,2 ms, es besteht also aktuell **kein** akutes Performance-Problem, sondern ein struktureller Absicherungsbedarf für künftiges Wachstum (D-09 verlangt Absicherung „von Beginn an", nicht erst bei nachgewiesenem Problem).

## 11. Notwendiger Umsetzungsumfang

Rein aus dieser Analyse abgeleitet (keine Aufwandsschätzung in Personentagen, sondern fachliche Bausteine):
1. Neue/erweiterte Migrationen: `unaccent`-Extension, zusätzliche Trigram-Indizes (`anime_titles.title`, `genres.name`, `tags.name`, `fansub_groups.name/slug`, `fansub_group_aliases.alias`), ggf. `tsvector`-Spalte(n) mit Gewichtung für Ranking.
2. Neues Backend-Repository/-Handler-Paar für `GET /api/v1/search` (+ optional `/suggestions`), das bestehende Anime-/Fansub-Repositories als Datenquelle nutzt (kein Duplikat der Filterlogik, sondern Kombination/Erweiterung).
3. Contract-Erweiterung in `shared/contracts/openapi.yaml`.
4. Frontend: neue Suchseite/-komponenten mit `@/components/ui`-Primitives, Aktivierung/Ergänzung des „Suche"-Nav-Eintrags in `AppShell.tsx` (fehlt aktuell im authentifizierten Drawer komplett, ist im anonymen Drawer nur ein deaktivierter Platzhalter), URL-Zustand, Debouncing, Request-Abbruch.
5. Fachliche Klärung/Entscheidung (nicht Teil dieser Analyse, aber notwendige Vorbedingung für Umsetzung): Sichtbarkeitsregel für `dissolved`-Fansubgruppen in der globalen Suche; Umgang mit dem fehlenden Kürzel-Feld; ob/wie der Haupttitel-Schreibpfad-Defekt in `anime_titles` behoben wird, bevor auf diese Tabelle als vollständige Titelquelle vertraut wird.
6. Optional (D-02, nur falls sinnvoll): schmales `SearchProvider`-Interface mit einer Postgres-Implementierung.
7. Dokumentation des Meilisearch-Andockpunkts (D-10) als reines Dokument, kein Code.

## 12. Aufteilung in sinnvolle Teilphasen

Vorschlag, abgeleitet aus den obigen Bausteinen (Reihenfolge = Abhängigkeitskette):
- **Teilphase A — Datenfundament:** Migrationen (`unaccent`, neue Trigram-Indizes, ggf. `tsvector`), plus Klärung/Behebung des `anime_titles`-Haupttitel-Schreibpfads, damit die Suchgrundlage verlässlich ist.
- **Teilphase B — Backend-Suchendpunkt:** `GET /api/v1/search` (+ ggf. `/suggestions`) inkl. Ranking-Logik (D-05) und Sichtbarkeitsfilterung (Anime `status<>disabled`, explizite Entscheidung zu Fansubgruppen-`status`), Contract-Update.
- **Teilphase C — Frontend-Suchoberfläche:** Suchseite, Tabs/Filter, Filter-Chips, mobile Drawer-Filter, Debouncing/Abbruch/URL-Zustand, Aktivierung des Nav-Eintrags in `AppShell.tsx`.
- **Teilphase D — Performance-Absicherung & Dokumentation:** `EXPLAIN ANALYZE`-Messungen analog zum bestehenden Tracking-Dokument, Erweiterung von `docs/performance/anime-search-query-plan-tracking.md` (oder neues Pendant) um die neuen Indizes/Endpunkte, Meilisearch-Andockpunkt-Dokumentation (D-10).
- **Nicht in Scope dieser Teilphasen (Deferred):** Mitglieder/Releases/Projekte als Suchentitäten, tatsächlicher Meilisearch-Einbau, „Public Dashboard"-Nav-Punkt.

## 13. Einschätzung: Reicht PostgreSQL für den aktuellen Umfang?

**Ja, eindeutig.** Begründung:
- Datenvolumen ist klein bis moderat (~13.351 Anime-Zeilen, Fansubgruppenzahl vermutlich eine bis zwei Größenordnungen kleiner) — bereits bestehende Trigram-Messungen zeigen Sub-Millisekunden-Antwortzeiten selbst bei breiten Mustern (Punkt 6/10).
- PostgreSQL bietet mit `pg_trgm` + `unaccent` + `tsvector`/`ts_rank` alle in D-01/D-04/D-05 geforderten Fähigkeiten (Tippfehlertoleranz, Präfix/Teiltreffer, Akzent-Normalisierung, gewichtetes Ranking) nativ ab — es fehlt lediglich die Aktivierung/Indizierung, nicht die grundsätzliche Eignung.
- Ein Wechsel zu Meilisearch/OpenSearch wäre bei diesem Datenvolumen und dieser Infrastruktur (Docker Compose, kein dedizierter Such-Cluster) klar überdimensioniert und steht im Widerspruch zu D-01. Die in D-10 genannten Trigger für einen späteren Wechsel (Suchlatenz, Dokumentenzahl, Tippfehlerqualität, Facetten-Kosten, PG-Ressourcen, Ranking-Aufwand, Search-as-you-type-Qualität) sind aktuell alle unauffällig bzw. nicht gemessen, weil noch keine globale Suche produktiv läuft.

---

## Beantwortung der konkreten Analysefragen (Kurzreferenz)

- **Suche-Navigationspunkte:** Nur **einer**, nicht zwei — `frontend/src/components/layout/AppShell.tsx:190` (`AppShellAnonNavGroups`, nur im **anonymen** Drawer, `disabled: true, badge: 'bald'`). Der authentifizierte Drawer (`AppShellNavGroups`, Zeilen 120-124) hat keinen „Suche"-Eintrag. AppShell ist eine einzige responsive Komponente (kein separates Desktop-/Mobile-Rendering) — Aktivierung wirkt automatisch auf beide Formfaktoren.
- **Bestehende Suchseite/-komponenten/-Backend-Endpunkte:** Keine globale Suche vorhanden. Vorhandene Teiltreffer-Logik ist an die bestehenden Listen-Endpunkte `GET /api/v1/anime`/`GET /api/v1/fansubs` gekoppelt (Punkt 1/2).
- **Aktivierte Extensions:** Nur `pg_trgm` (`0017_anime_search_trgm.up.sql:1`). `unaccent` ist **nicht** aktiviert (Grep über alle Migrationen: 0 Treffer). Kein `to_tsvector`/`tsvector` in irgendeiner Migration.
- **Indizes auf relevanten Tabellen:** Siehe vollständige Liste in Punkt 6.
- **Anime-Titelfelder/Slug/Jahr/Typ/Genre/Tags:** Siehe Punkt 3/4/7 — Haupttitel/de/en auf `anime`, alt. Titel/Romaji/Japanisch/Synonym strukturell in `anime_titles` (aber Haupttitel-Schreibpfad defekt, Punkt 4), Slug auf `anime.slug`, Genre/Tags normalisiert über `genres`/`tags` + Junction-Tabellen.
- **Fansubgruppen-Name/Kürzel/Slug/frühere Namen/alt. Namen/Beschreibung:** Name und Slug auf `fansub_groups`, kein Kürzel-Feld, alt./frühere Namen undifferenziert in `fansub_group_aliases`, Beschreibung nicht mehr auf `fansub_groups` (entfernt in `0071`), stattdessen granular/visibility-gated in `fansub_group_notes`.
- **Öffentlich sichtbare Felder/auszuschließende Datensätze:** Anime: `status <> 'disabled'` als Default-Ausschluss, admin-only Override. Fansubgruppen: **kein** Default-Ausschluss für `status='dissolved'` im bestehenden Endpunkt — offene fachliche Entscheidung für die neue Suche (Punkt 3/10).
- **Bestehende Listen-/Filter-/Pagination-Muster:** `buildAnimeListWhere`/`buildAnimeListWhereV2WithSchema`, `buildFansubGroupWhere`, `PaginationMeta{Total,Page,PerPage,TotalPages}`, Handler-seitige Query-Validierung mit `badRequest(...)` — siehe Punkt 2.
- **Auswirkung einer neuen Suchabstraktion auf die Architektur:** Bestehende Architektur kennt keine Provider-Interface-Schicht; ein schmales `SearchProvider`-Interface mit einer Postgres-Implementierung ist stilkonform ergänzbar, sollte aber keine zusätzlichen Abstraktionsebenen (Registry/Factory/Multi-Provider-Switch) einführen, solange nur ein Provider existiert (Punkt 8).

---

## Project Constraints (aus CLAUDE.md, mit Bezug zu Phase 115)

- **Modularität:** Produktionsdateien ≤ 450 Zeilen — bei neuen Repository-/Handler-Dateien für die Suche zu beachten (Vorbild: bestehende Dateien wie `anime.go`/`fansub_groups.go` sind bereits nach diesem Prinzip aufgeteilt).
- **Sprachqualität:** Deutsche UI-Texte müssen korrekte Umlaute verwenden — betrifft neue Suchseiten-Texte, Fehlermeldungen, Platzhalter, Toasts.
- **Frontend-UI:** Pflicht zur Nutzung von `@/components/ui`-Primitives — bestehendes `AnimeBrowserFilters.tsx` verstößt bereits dagegen (natives `<input>`/`<button>`) und darf **nicht** als Vorbild für die neue Suchoberfläche dienen.
- **Brownfield/Kompatibilität:** Neue Suchfunktion muss bestehende Routen/Endpunkte (`GET /api/v1/anime`, `GET /api/v1/fansubs`) unangetastet lassen und darf sie höchstens als Datenquelle wiederverwenden, nicht ersetzen.
- **Datenhoheit:** Manuelle Admin-Bearbeitung bleibt maßgeblich — die Suche darf keine Daten „reparieren" oder automatisch überschreiben (z. B. den in Punkt 4 gefundenen `anime_titles`-Defekt nicht implizit durch Suchlogik kompensieren, sondern als eigene fachliche Entscheidung behandeln).

---

## Sources

### Primary (HIGH confidence — direkt aus Code/Migrationen verifiziert)
- `database/migrations/0001_init_anime.up.sql`, `0003_expand_anime_columns.up.sql`, `0008_expand_anime_episode_columns.up.sql`, `0009_fansub_groups.up.sql`, `0014_fansub_group_aliases.up.sql`, `0016_media_assets.up.sql`, `0017_anime_search_trgm.up.sql`, `0019_add_reference_data_tables.up.sql`, `0020_add_metadata_reference_tables.up.sql`, `0021_add_normalized_metadata_tables.up.sql`, `0022_add_junction_tables.up.sql`, `0040_add_anime_cover_asset_slots.up.sql`, `0045_reconcile_db_schema_v2_columns.up.sql`, `0061_fansub_group_notes.up.sql`, `0071_drop_fansub_legacy_text_fields.up.sql`, `0097_v12_status_foundation.up.sql`.
- `backend/internal/repository/anime.go`, `anime_v2.go`, `anime_schema.go`, `anime_metadata.go`, `admin_content.go`, `admin_content_anime_metadata.go`, `admin_content_anime_themes.go`, `fansub_repository.go`.
- `backend/internal/handlers/anime.go`, `fansub_groups.go`.
- `backend/internal/models/anime.go`, `fansub.go`.
- `backend/cmd/server/main.go` (Routenregistrierung).
- `frontend/src/components/layout/AppShell.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/anime.ts`, `frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx`.
- `shared/contracts/openapi.yaml`.
- `docs/performance/anime-search-query-plan-tracking.md`.

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `CONCERNS.md` — Konventionsbeschreibungen, mit Code-Fundstellen abgeglichen.
- Memory `project_perf_baseline_project_page` (6 Tage alt zum Analysezeitpunkt) — für die allgemeine Seiten-Performance-Einordnung in Punkt 10 herangezogen, nicht als alleinige Quelle für Suchspezifisches.

### Tertiary (LOW confidence)
- Keine — alle Aussagen in diesem Report stützen sich auf direkte Code-/Migrationsbelege oder bereits vorhandene Projektdokumentation.

## Assumptions Log

Es wurden für diesen Report **keine** unbelegten Annahmen `[ASSUMED]` getroffen — jede Aussage ist entweder direkt im Code/in Migrationen verifiziert oder explizit als „nicht gefunden"/„nicht vorhanden" gekennzeichnet. Eine Ausnahme betrifft die Größenordnung der Fansubgruppen-Anzahl (Punkt 10 „vermutlich eine bis zwei Größenordnungen kleiner") — diese Zahl wurde **nicht** per SQL-COUNT verifiziert (kein DB-Zugriff in dieser Analyse-Session), sondern ist eine plausible Einschätzung relativ zur Anime-Zeilenzahl.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Fansubgruppen-Anzahl ist deutlich kleiner als Anime-Anzahl (~13.351) | Punkt 10 (Performance-Risiken) | Falls die Gruppenzahl unerwartet hoch ist, wäre die ungeindexte `ILIKE`-Suche auf `fansub_groups`/`fansub_group_aliases` dringender zu priorisieren als hier eingeschätzt — sollte vor Umsetzung per `SELECT COUNT(*) FROM fansub_groups;` verifiziert werden. |

## Open Questions

1. **Sichtbarkeitsregel für `dissolved`-Fansubgruppen in der globalen Suche**
   - Was wir wissen: Der bestehende `GET /api/v1/fansubs`-Endpunkt liefert `dissolved`-Gruppen standardmäßig mit (kein impliziter Statusfilter, Punkt 3/10).
   - Was unklar ist: Ob die globale Suche dieses Verhalten übernehmen oder verschärfen soll (D-06 erwähnt „Status" als Filter-Kandidat, aber keine explizite Default-Regel).
   - Empfehlung: In der Umsetzungsphase explizit mit dem Nutzer klären, bevor eine Default-Filterregel codiert wird.
2. **Umgang mit dem `anime_titles`-Haupttitel-Schreibpfad-Defekt**
   - Was wir wissen: `LanguageCode: "romaji"` statt eines gültigen `languages.code` führt dazu, dass der Haupttitel nie in `anime_titles` landet (Punkt 4, `admin_content_anime_metadata.go:51,83`).
   - Was unklar ist: Ob dieser Defekt im Rahmen der Umsetzungsphase behoben werden soll (außerhalb des Analyse-Mandats dieser Phase) oder ob die Suche dauerhaft mit `anime.title` als alleiniger Haupttitel-Quelle arbeitet.
   - Empfehlung: Als separate, explizit zu benennende Entscheidung in die Umsetzungsplanung aufnehmen — nicht stillschweigend umgehen.
3. **Kürzel-Feld für Fansubgruppen**
   - Was wir wissen: Kein eigenes Datenbankfeld vorhanden; `slug`/Alias sind die einzigen Kandidaten.
   - Was unklar ist: Ob D-05 „exaktes Kürzel" einen expliziten neuen Spaltenwunsch impliziert oder ob `slug` als Kürzel-Äquivalent ausreicht.
   - Empfehlung: Mit dem Nutzer klären, ob `slug` (z. B. „team4s") als Kürzel-Äquivalent für das Ranking ausreicht oder ob echte Kürzel (z. B. „T4S") separat gepflegt werden müssen.

## Metadata

**Confidence breakdown:**
- Datenmodell (Punkt 3/4/5/7): HIGH — jede Spalte/Tabelle direkt aus Migrationsdateien zitiert.
- Bestehende Suchmechanik (Punkt 1/2/6): HIGH — Handler-/Repository-Code direkt gelesen, keine Spekulation.
- Architektur-/API-/UI-Vorschlag (Punkt 8/9): HIGH für die Bestandsaufnahme bestehender Muster, MEDIUM für die daraus abgeleitete Empfehlung (normative Aussage, keine reine Tatsachenfeststellung).
- Performance (Punkt 10): HIGH für die zitierten Messwerte aus dem bestehenden Tracking-Dokument, MEDIUM für die daraus abgeleiteten Risikoeinschätzungen bei künftigem Wachstum.

**Research date:** 2026-07-28
**Valid until:** ca. 30 Tage (Datenmodell/Migrationen ändern sich nur bei neuen Migrationsdateien; bei laufender paralleler Entwicklung auf `main` vor Umsetzung erneut gegen aktuelle Migrationsnummer prüfen).

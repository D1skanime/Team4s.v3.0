# Phase 115: Globale Suche (PostgreSQL FTS + Trigram) - Context

**Gathered:** 2026-07-28
**Status:** Analysis-first — analyze before planning/implementing
**Source:** Vollständiges Nutzer-Konzept „Phase Suche – Analyse und Umsetzungskonzept"

<domain>
## Phase Boundary

Ausbau der bislang toten „Suche"-Navigationspunkte zu einer **modernen, umfassenden,
performanten globalen Suche** für Team4s — ausdrücklich **keine** simple `LIKE`/`ILIKE`-
Namenssuche.

**Analysis-first-Gebot (zwingend):** Zuerst wird der vorhandene Code analysiert und ein
Report (13 Punkte, s. u.) erstellt. **Es werden nicht vorschnell neue Tabellen, Suchindizes
oder APIs erstellt.** Datenmodelle und fachliche Begriffe **dürfen nicht durch Vermutungen
ersetzt** werden — alles gegen den echten Code verifizieren. Erst nach der Analyse wird die
konkrete Umsetzung geplant/begonnen.

</domain>

<decisions>
## Locked Decisions (aus dem Nutzer-Konzept)

### D-01 Technische Leitentscheidung
- Erste Implementierung baut auf **PostgreSQL Full-Text Search + `pg_trgm`** (Ähnlichkeit/
  Tippfehlertoleranz), ggf. **`unaccent`** (Normalisierung), geeigneten **GIN/GiST-Indizes**
  und **gewichtetem Relevanz-Ranking** auf.
- **Kein OpenSearch/Elasticsearch** (für aktuellen Umfang/Infrastruktur zu schwergewichtig).
- **PostgreSQL bleibt immer die fachliche Source of Truth.**

### D-02 Entkopplung für späteren externen Provider
- Backend/API so entkoppeln, dass später bei nachgewiesenem Bedarf ein externer Suchanbieter
  (z. B. **Meilisearch**) als Provider ergänzt werden kann. Prüf-Skizze eines Interfaces:
  ```go
  type SearchProvider interface {
      Search(ctx context.Context, query SearchQuery) (SearchResult, error)
      Suggest(ctx context.Context, query string) ([]SearchSuggestion, error)
  }
  ```
  Erste Impl. = **Postgres-Provider**. **Aber:** Abstraktion nur einführen, wenn sie zur
  vorhandenen Codearchitektur passt und **kein Overengineering** entsteht — zuerst bestehende
  Service-/Repository-/Interface-Patterns prüfen und sich daran orientieren.

### D-03 Fachlicher Suchumfang (mind.)
- **Anime:** Haupttitel, deutsche/englische/japanische/Romaji-Titel, alternative Titel/Aliase,
  Slug, Erscheinungsjahr, Anime-Typ/Format, Genre, Tags/Themen/Motive, Beschreibung (falls für
  Relevanz sinnvoll).
- **Fansubgruppen:** vollständiger Name, Kürzel, Slug, alternative Namen, frühere Namen,
  Beschreibung (falls sinnvoll).
- **Geprüfte spätere Erweiterung (nicht ungeprüft umsetzen):** Mitglieder/Fansubber, Releases,
  Release-Versionen, Projekte/Anime-Mitwirkungen.

### D-04 Suchverhalten
- Unterstützt mind.: exakte Treffer, Präfix, Teiltreffer, Groß-/Kleinschreibung, Bindestriche/
  Leerzeichen, Sonderzeichen/Akzente, leichte Tippfehler, alternative Schreibweisen,
  Gruppenkürzel, Slugs. Beispiele: „Naruto", „Narotu", „team4s", „team-4s", „T4S", alt. Titel,
  Gruppenkürzel/-Slug.

### D-05 Relevanz-Ranking (fachlich nachvollziehbar)
- **Anime:** 1) exakter Haupttitel, 2) exakter alt. Titel, 3) Titel beginnt mit Suchbegriff,
  4) ähnlicher Titel (Tippfehler), 5) Genre/Tags, 6) Beschreibung.
- **Fansubgruppen:** 1) exaktes Kürzel, 2) exakter Name, 3) exakter Slug, 4) alt./früherer Name,
  5) Teiltreffer Name, 6) Beschreibung.
- **Ein exakter Treffer darf nicht durch Popularitäts-/Aktualitätssignale verdrängt werden.**

### D-06 Filter/Facetten (Verfügbarkeit gegen Datenmodell prüfen)
- Anime mind. zu prüfen: Jahr/Zeitraum, Genre, Tags/Themen/Motive, Typ/Format, Status,
  Fansubgruppe, Sprache, Release-/Projektstatus.
- Trefferzahlen je Entität/Filter darstellbar, sofern mit vertretbarem Aufwand + guter Performance.

### D-07 Backend-Architektur & API
- Suche läuft über das **Go-Backend**; das **Frontend greift nie direkt auf PostgreSQL** oder
  einen späteren externen Suchdienst zu.
- Zu prüfender globaler Endpunkt: **`GET /api/v1/search`** mit Params `q, type, year_from,
  year_to, genre, tag, format, status, fansub_group, page, page_size, sort`. Optional separater
  **`GET /api/v1/search/suggestions`** (Autocomplete). Konkrete API-Struktur nach **bestehenden
  Backend-Konventionen** festlegen.

### D-08 UI/UX (im bestehenden UI-System, keine neue Designsprache)
- Zentrales Suchfeld, Search-as-you-type/Vorschläge (gruppiert nach Anime/Fansubgruppen),
  vollständige Ergebnisseite, Tabs/Filter je Entitätstyp, Filter-Chips, Trefferzahlen, Lade-/
  Empty-/Fehlerzustände, mobile Filter als Drawer/Bottom-Sheet, Tastaturbedienung/Fokusführung,
  **Debouncing**, **Abbruch veralteter Requests**, **URL-basierter Suchzustand** (teilbare Ergebnisse).
- Globale UI-Primitives Pflicht (`@/components/ui`).

### D-09 Performance (von Beginn an)
- Keine unindexierten `%LIKE%` über große Tabellen; keine N+1; keine unnötigen großen JOIN-Ketten
  pro Anfrage; Query-Pläne mit `EXPLAIN ANALYZE` prüfen; Mindestlänge für Tippfehlersuche;
  Pagination/Cursor; Vorschläge begrenzen; Frontend-Debouncing; Request-Abbruch; ggf. Caching;
  Suchlast auf PostgreSQL messen.
- **Die allgemein langsame Seite separat untersuchen** — NICHT automatisch Windows/WSL/Docker als
  alleinige Ursache annehmen. Prüfen: langsame SQL, fehlende Indizes, Backend-Latenzen, unnötige
  API-Calls, SSR, große JS-Bundles, Bildgrößen/Medien, Docker-Volume-Performance (Win/WSL),
  Dev- vs. Production-Build. (Vgl. Memory „Perf-Basis Public-Projektseite": Bottleneck war
  serieller SSR-Request-Fächer, nicht SQL.)

### D-10 Meilisearch nur dokumentieren (nicht einbauen)
- Dokumentieren: wo ein späterer Meilisearch-Provider andocken würde; Sync aus PostgreSQL;
  Erhalt von Sichtbarkeit/Berechtigungen; Messwerte, die einen Wechsel/Ergänzung rechtfertigen
  (Suchlatenz, #Dokumente, Tippfehlerqualität, Facetten-Kosten, PG-Ressourcen, Ranking-Aufwand,
  gewünschte Search-as-you-type-Qualität).

### Claude's Discretion
- Konkrete API-/DTO-/Interface-Form nach bestehenden Konventionen; Ob/Wie die `SearchProvider`-
  Abstraktion eingeführt wird (nur wenn pattern-konform, kein Overengineering).

</decisions>

<research_required>
## Analysis Report (ZWINGEND vor Umsetzung) — 13 Punkte

Der Bericht muss liefern:
1. aktueller Stand der bestehenden Suche
2. relevante Frontend- und Backend-Dateien
3. vorhandenes Datenmodell
4. bereits nutzbare Felder
5. fehlende Daten/Strukturen
6. vorhandene und fehlende Indizes
7. fachliche Abgrenzung Genre vs. Tags vs. weitere Kategorien (inkl.: **wie heißt der zweite
   bereits vorhandene fachliche Begriff neben „Tag"** — Genre/Thema/Kategorie/Motiv?)
8. Vorschlag für Sucharchitektur
9. Vorschlag für API und UI
10. Performance-Risiken
11. notwendiger Umsetzungsumfang
12. Aufteilung in sinnvolle Teilphasen
13. Einschätzung, ob PostgreSQL für den aktuellen Umfang ausreicht

**Konkrete Analysefragen (gegen echten Code, nicht raten):**
- Wo liegen die beiden „Suche"-Navigationspunkte? Gleiche Route oder Desktop-/Mobile-Navigation?
- Existieren bereits Suchseite/-komponenten/-filter/-Backend-Endpunkte?
- Allgemeine Listen-/Filter-/Pagination-/Query-Patterns?
- Welche PostgreSQL-Extensions sind bereits aktiviert (pg_trgm/unaccent/…)?
- Welche Indizes auf relevanten Tabellen?
- Wo liegen Anime-Titel (alle Sprachen), alt. Titel, Slug, Jahr, Typ, Genre, Tags/2. Begriff?
- Wo liegen Fansubgruppen-Name, Kürzel, Slug, frühere/alt. Namen?
- Welche Entitäten/Felder sind **öffentlich sichtbar** und dürfen in Ergebnissen erscheinen?
- Entwürfe/gelöschte/gesperrte/nicht-öffentliche Datensätze, die **ausgeschlossen** werden müssen?
- Auswirkungen einer neuen Suchabstraktion auf die bestehende Codearchitektur?

</research_required>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` — Phase-115-Grenze.
- `./CLAUDE.md` — globales UI-System Pflicht, Umlaute, 450-Zeilen-Limit, Go-/Repository-/Contract-
  Konventionen (Backend + `shared/contracts/openapi.yaml` + Frontend-Typen + `api.ts` gemeinsam).
- `.planning/codebase/*.md` (STACK/ARCHITECTURE/CONVENTIONS/STRUCTURE) — vorhandene Muster.
- Memory: „Perf-Basis Public-Projektseite" — Perf-Bottleneck war serieller SSR-Request-Fächer,
  nicht SQL; Dev-Compile verzerrt gefühlte Langsamkeit.

</canonical_refs>

<code_context>
## Existing Code Insights (Startpunkte für die Analyse — zu verifizieren)

- Nav „Suche": `frontend/src/components/layout/AppShell.tsx` (deaktiviert, `badge:'bald'`) —
  prüfen, ob Desktop UND Mobile denselben/zwei Einträge haben.
- Listen-/Filter-Patterns: `frontend/src/lib/api.ts` (`getFansubList`, Anime-Listing,
  `buildFansubListQuery`), `member_archive_repository.go` (Offset-Pagination + Bounds).
- Migrationen/Extensions/Indizes: `database/migrations/*.sql` (nach `CREATE EXTENSION`,
  `pg_trgm`, `unaccent`, `USING gin/gist` suchen).
- Anime-/Fansub-Domäne: Repositories/Handler unter `backend/internal/` (Titelfelder, Genre/Tags,
  Sichtbarkeits-/Status-Spalten).

</code_context>

<specifics>
## Specific Ideas

- Vollständiges Konzept liegt als DISCUSSION-LOG bei. Kern: Postgres-first, entkoppelt,
  analyse-getrieben, exakte Treffer nie durch Popularität verdrängen.

</specifics>

<deferred>
## Deferred Ideas

- Member/Releases/Release-Versionen/Projekte als Suchentitäten — erst nach Prüfung.
- Meilisearch/externer Provider — nur dokumentieren, nicht bauen.
- „Public Dashboard" (dritter toter Nav-Eintrag) — eigene spätere Phase.

</deferred>

---

*Phase: 115-globale-suche-postgres-fts*
*Context gathered: 2026-07-28*

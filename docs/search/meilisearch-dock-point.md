# Meilisearch-Andockpunkt (nur Dokumentation, D-10)

**Status:** Konzept-Dokumentation. **Kein Code, keine Paket-/Service-Installation.**
**Bezug:** Phase 115 (globale Suche), Entscheidungen D-01, D-02, D-10.
**Erstellt:** 2026-07-28 (Plan 115-08, Task 1).

> Diese Datei beschreibt **wo** und **wie** ein späterer externer Suchanbieter
> (z. B. Meilisearch) an die bestehende Team4s-Suche andocken **würde**, ohne dass
> heute irgendetwas davon gebaut wird. Sie ist die dokumentierte Umsetzung von D-10:
> „Meilisearch nur dokumentieren (nicht einbauen)". Der Andockpunkt existiert bereits
> als schmales Interface — mehr ist für V1 bewusst nicht vorgesehen.

---

## 1. Ausgangslage — der Andockpunkt existiert bereits

Die globale Suche ist in Phase 115 hinter einem schmalen Interface entkoppelt worden
(D-02, „Entkopplung für späteren externen Provider"). Der Andockpunkt ist das
`SearchProvider`-Interface in `backend/internal/models/search.go`:

```go
type SearchProvider interface {
    Search(ctx context.Context, query SearchQuery) (SearchResult, error)
    Suggest(ctx context.Context, query string) ([]SearchSuggestion, error)
}
```

Die **erste und aktuell einzige** Implementierung dieses `SearchProvider`-Interfaces
ist der Postgres-Provider `repository.SearchRepository`
(`backend/internal/repository/search_repository.go`). Er beantwortet jede Suche direkt
aus PostgreSQL über die in Migration 0140 angelegten funktionalen Trigram-/GIN-Indizes
und die gewichteten `tsvector`-Spalten.

**Wichtig:** Es gibt bewusst **kein** Factory-/Registry-/Multi-Provider-Switch, kein
Feature-Flag und keine zweite Codeebene. Der `SearchProvider`-Interface-Kontrakt ist
der **einzige** Erweiterungspunkt. Genau das ist der Sinn von D-02: die Abstraktion
bleibt so schmal, dass sie kein Overengineering ist, aber ein späterer Provider kann
ohne Handler- oder Frontend-Änderung eingehängt werden.

---

## 2. Wo Meilisearch andocken würde

Ein Meilisearch-Provider wäre eine **zweite Implementierung** desselben
`SearchProvider`-Interfaces — konzeptionell `search.MeilisearchProvider` neben dem
bestehenden `repository.SearchRepository`. Er würde:

1. `Search(ctx, query SearchQuery) (SearchResult, error)` erfüllen, indem er die
   validierte `SearchQuery` (dieselbe Struct wie heute: `Q`, `Type`, Filter-Zeiger,
   `Page`/`PerPage`, `Sort`, `IncludeDisabled`) in eine Meilisearch-Suchanfrage
   übersetzt und die Treffer in das bestehende `models.SearchResult`
   (`{ Anime: {Items,Total}, Fansub: {Items,Total} }`) zurückmappt.
2. `Suggest(ctx, query string) ([]SearchSuggestion, error)` über den
   Search-as-you-type-Pfad von Meilisearch bedienen.

### Was sich NICHT ändert

- **Handler-Schicht** (`handlers.SearchHandler`, `GET /api/v1/search` +
  `/suggestions`): unverändert. Der Handler validiert Parameter, klemmt `per_page`,
  erzwingt die q-Mindestlänge und baut den `{data, meta}`-Envelope — alles
  provider-agnostisch. Er kennt nur das Interface, nicht die Implementierung.
- **OpenAPI-Kontrakt** (`shared/contracts/openapi.yaml`): unverändert. Request-Parameter
  und Response-Schemas sind provider-unabhängig.
- **Frontend** (`api.ts`-Helfer, `useDebouncedSearch`, `/suche`-Fläche): unverändert.
  Das Frontend greift ausschließlich über das Go-Backend zu (D-07) und sieht nie einen
  Suchanbieter direkt — weder PostgreSQL noch Meilisearch.

Die einzige Verdrahtungsstelle wäre die manuelle Handler-Konstruktion in
`backend/cmd/server/main.go`: heute wird dort `repository.NewSearchRepository(dbPool)`
an `handlers.NewSearchHandler(...)` übergeben. Ein Wechsel/eine Ergänzung würde dort
(und nur dort) einen anderen `SearchProvider` injizieren — passend zur Team4s-Konvention
„Handler-Konstruktion explizit und zentral in main.go, Abhängigkeiten manuell übergeben".

---

## 3. Sync aus PostgreSQL — PostgreSQL bleibt Source of Truth

Meilisearch wäre **kein** eigener Datenspeicher der Wahrheit, sondern ein
**abgeleiteter Suchindex**. D-01 gilt unverändert: **PostgreSQL bleibt immer die
fachliche Source of Truth.** Meilisearch hielte nur eine denormalisierte Projektion
der durchsuchbaren Felder.

### Was indexiert würde (dieselben Felder wie heute)

- **Anime:** `anime.title` (Haupttitel), alle `anime_titles`-Zeilen über alle
  Titel-Typen (de, en/official, japanese, **romaji**, synonym — inklusive der in
  D-12 reparierten Romaji-Persistenz), Slug, Erscheinungsjahr, Typ/Format, Genre, Tags,
  ggf. Beschreibung.
- **Fansubgruppen:** `fansub_groups.name`, `slug`, alle `fansub_group_aliases`
  (Kürzel/alternative/frühere Namen), ggf. Beschreibung.

### Sync-Strategie (konzeptionell, nicht gebaut)

- **Initialer Voll-Sync:** Ein Batch-Job liest die durchsuchbaren Felder aus PostgreSQL
  (dieselben Quell-Spalten, die heute die `tsvector`-Spalten speisen) und schiebt sie
  als Meilisearch-Dokumente. Ein Anime-Dokument bündelt alle Titel-Typen; ein
  Gruppen-Dokument bündelt Name/Slug/Aliase.
- **Inkrementeller Sync:** Bei Schreibvorgängen auf den relevanten Tabellen (Anime-
  Anlage/Bearbeitung, Titel-Upsert, Alias-CRUD, Status-/Sichtbarkeitswechsel) wird das
  betroffene Dokument neu projiziert. Mögliche, bewusst offen gelassene Mechaniken:
  Outbox-Tabelle + Worker, `NOTIFY/LISTEN`, oder ein periodischer Delta-Job über
  `updated_at`. Die Wahl ist Teil einer späteren echten Umsetzung, nicht dieser Doku.
- **Konsistenzmodell:** Der Meilisearch-Index ist **eventually consistent**. Weil
  PostgreSQL die Wahrheit bleibt, ist ein Reindex jederzeit gefahrlos wiederholbar; ein
  divergierter Index wird durch einen erneuten Voll-Sync geheilt, nicht durch manuelle
  Reparatur.

---

## 4. Erhalt von Sichtbarkeit und Berechtigungen (kritischer Constraint)

Der heutige Postgres-Provider filtert **serverseitig** nach Sichtbarkeit (D-11): Anime
mit `status = 'disabled'` erscheinen nur mit Plattform-Admin-Identität und
`include_disabled=true`; aufgelöste (`dissolved`) Gruppen erscheinen dagegen regulär.
Diese Regeln dürfen bei einem Provider-Wechsel **nicht** verloren gehen — sonst leakt
ein externer Index nicht-öffentliche Datensätze (Threat: Information Disclosure).

Zwei tragfähige Muster, beide erhalten die Sichtbarkeit:

1. **Serverseitige Nachfilterung / Query-Zeit-Filter (bevorzugt):** Der
   Meilisearch-Provider setzt dieselbe Sichtbarkeitsbedingung als Meilisearch-Filter
   (z. B. `status != 'disabled'`, außer die Anfrage kommt von einer Admin-Identität mit
   `IncludeDisabled=true`). Der Sichtbarkeits-Gate bleibt damit — wie heute — eine
   **Backend-Entscheidung**, die aus der validierten `SearchQuery` und der Identität
   abgeleitet wird, nicht aus dem Client.
2. **Sichtbarkeits-Attribute im Dokument:** Jedes indexierte Dokument trägt seine
   Sichtbarkeitsmerkmale (Status, öffentlich/intern) als filterbare Attribute, damit
   Muster 1 ohne zusätzlichen PostgreSQL-Roundtrip greift.

**Invariante:** Der Client sieht nie mehr als heute. Weil das Frontend ausschließlich
über das Go-Backend geht (D-07) und der Sichtbarkeits-Gate im Backend sitzt, bleibt die
Berechtigungslogik unverändert — egal ob PostgreSQL oder Meilisearch die Treffer liefert.
Ein Reindex darf disabled/nicht-öffentliche Datensätze zwar **speichern** (für den
Admin-Override), aber die serverseitige Filterung entscheidet pro Anfrage, was
zurückgegeben wird.

---

## 5. Messwerte, die einen Wechsel/eine Ergänzung rechtfertigen

Ein externer Provider wird laut D-02 nur bei **nachgewiesenem Bedarf** eingeführt — nicht
auf Vorrat. Die folgenden Messwerte sind die Entscheidungsgrundlage. Erst wenn mehrere
davon reproduzierbar in den kritischen Bereich laufen, lohnt sich der Betriebs- und
Sync-Aufwand eines zweiten Suchsystems.

| Messwert | Was gemessen wird | Auslöser für einen Wechsel/Ergänzung |
|----------|-------------------|--------------------------------------|
| **Suchlatenz (p95/p99)** | Server-Antwortzeit von `GET /api/v1/search` unter realer Last | p95 überschreitet dauerhaft das UX-Ziel trotz Index-Nutzung (EXPLAIN belegt bereits Index-Scan → PostgreSQL ist ausgereizt) |
| **#Dokumente / Datenwachstum** | Zeilenzahl der durchsuchten Tabellen (Anime, `anime_titles`, Gruppen, Aliase) | Größenordnungswachstum, bei dem Trigram-GIN-Wartung/Speicher teuer wird |
| **Tippfehlerqualität** | Trefferquote bei Vertippern/alternativen Schreibweisen (D-04) | `pg_trgm`-Ähnlichkeit reicht für die gewünschte Toleranz nicht mehr; Meilisearchs Typo-Engine wäre spürbar besser |
| **Facetten-Kosten** | Kosten der Trefferzahlen je Filter/Facette (D-06) | Facetten-Aggregation wird pro Anfrage zu teuer / N+1-artig in PostgreSQL |
| **PG-Ressourcen** | CPU/IO/Buffer-Churn der Suchlast auf der Produktions-DB | Suche verdrängt spürbar die übrige DB-Last (OLTP-Konkurrenz) |
| **Ranking-Aufwand** | Komplexität/Kosten der gewichteten `tsvector`-/Ranking-Queries (D-05) | Ranking-Anforderungen übersteigen, was mit gewichteten `tsvector`-Spalten wartbar abbildbar ist |
| **Search-as-you-type-Qualität** | Latenz + Relevanz der Vorschläge (`/suggestions`) | Interaktives Tippen braucht sub-50-ms-Vorschläge, die der Postgres-Pfad nicht hält |

### Leitplanke gegen Fehlentscheidungen

Vor jeder „PostgreSQL ist zu langsam"-Schlussfolgerung gilt der Perf-Hinweis der Phase
(D-09, Memory „Perf-Basis Public-Projektseite"): **gefühlte Langsamkeit nicht
vorschnell der DB/Docker zuschreiben.** Zuerst prüfen, ob die Suchseite serielle
SSR-Requests feuert, ob im Production-Build gemessen wird und ob die Latenz aus Netzwerk/
Rendering statt aus SQL stammt. Die EXPLAIN-ANALYZE-Baseline (D-09,
`docs/performance/anime-search-query-plan-tracking.md`) ist die objektive Referenz: Nur
wenn sie belegt, dass die Suchspalten indexgestützt (Bitmap/Index Scan, kein Seq Scan)
laufen und die Latenz **trotzdem** das Ziel reißt, ist PostgreSQL wirklich der Engpass.

---

## 6. Zusammenfassung

- **Andockpunkt:** `SearchProvider`-Interface (`models/search.go`) — heute nur vom
  Postgres-Provider (`SearchRepository`) implementiert.
- **Einbau später:** zweite `SearchProvider`-Implementierung, nur in `main.go`
  verdrahtet; **keine** Handler-/OpenAPI-/Frontend-Änderung.
- **Daten:** PostgreSQL bleibt Source of Truth (D-01); Meilisearch ist ein
  abgeleiteter, eventually-consistent Index; Reindex jederzeit gefahrlos.
- **Sichtbarkeit:** serverseitiger Sichtbarkeits-Gate bleibt im Backend (D-11); der
  Client sieht nie mehr als heute.
- **Entscheidung:** erst bei nachgewiesenem Bedarf über die obigen Messwerte
  (Suchlatenz, #Dokumente, Tippfehlerqualität, Facetten-Kosten, PG-Ressourcen,
  Ranking-Aufwand, Search-as-you-type-Qualität) — nicht auf Vorrat.

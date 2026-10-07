# Fachaufgabe 7: Suchen & Filtern — globale Suchbibliothek vs. 7 Einzel-Browser-Filter

**Quelle:** 174-FOLLOWUPS.md F-16 ("Einheitliches Suchverhalten", Nutzer-Priorität hoch), 174-REPORT.md Empfehlung #3.
**Methode:** Backend-Suchbibliothek (`search_anime.go`, `search_fansub.go`, `search_suggestions.go`, `search.go`) gelesen; alle 7 in F-16 namentlich genannten Dateien einzeln gelesen und ihre Filter-Implementierung (`toLowerCase().includes()`-Stellen) per `grep -n` lokalisiert; Datenquelle (voll geladen vs. paginiert) je Stelle über die zugehörigen `per_page`/`getFansubList`-Aufrufe verifiziert; UI-Primitive-Nutzung (`@/components/ui` `Input` vs. natives `<input>`) je Stelle geprüft, da dies das CLAUDE.md-Design-System direkt betrifft und für die Vorbild-Wahl relevant ist.

Spalten gemäß D-03: (a) UI-Fläche, (b) Frontend-API-Funktion/Filterlogik, (c) Backend-Endpunkt, (d) Rechte, (e) Datenhaltung, (f) beobachtbares Verhalten (Umlaut-/Akzent-Toleranz). D-04-Klassifikation je Fund.

## Übersicht

| # | Implementierung | Art | D-04 |
|---|---|---|---|
| 0 | Globale Suchbibliothek (`/suche`) | Backend-indexgestützt | legitim getrennt (eigene Infrastruktur) |
| 1 | `AdminGroupsClient.tsx` | Client-Filter | Duplikat (Vorbild-Kandidat) |
| 2 | `admin/fansubs/page.tsx` | Client-Filter | Duplikat |
| 3 | `admin/fansubs/merge/page.tsx` | Client-Filter | Duplikat |
| 4 | `GroupMediaReviewSection.tsx` (Medien prüfen) | Client-Filter | Duplikat (Vorbild-Kandidat) |
| 5 | `useAnimePatchImpl.ts` (Genre/Tag-Autocomplete, Edit) | Client-Filter | Duplikat (engerer Fall: Katalog-Token-Filter) |
| 6 | `useAdminAnimeCreateControllerImpl.ts` (Genre/Tag-Autocomplete, Create) | Client-Filter | Duplikat (engerer Fall: Katalog-Token-Filter) |
| 7 | `projectPageData.ts` | **Kein Treffer — Korrektur zu F-16** | n/a (siehe Befund unten) |

**Wichtiger Korrekturbefund zu F-16 (analog zum F-18-Korrekturmuster aus 175-01):** `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts` enthält **keinen** text-basierten Such-/Filter-Eingabefeld-Code. Der einzige `toLowerCase().includes()`-Treffer in dieser Datei ist Zeile 304 — eine Bildauswahl-Heuristik (`firstEp?.images.find((img) => img.title.toLowerCase().includes("landscape"))`), die ein Vorschaubild nach Orientierungs-Schlüsselwort im Titel sucht, KEIN Nutzer-Sucheingabefeld über eine Liste. Diese Datei ist ein SSR-Daten-Lader für die öffentliche Projektseite (`git log --follow` zeigt ausschließlich Daten-Aggregations-Commits seit Phase 102, keine Filter-UI-Historie). Die Datei wird daher **nicht** als 7. Einzel-Filter gezählt; F-16s Dateiliste enthält an dieser Stelle einen Fehlverweis (möglicherweise Verwechslung mit einer anderen, seitdem entfernten oder umbenannten Stelle). Dieser Befund wird 175-07/175-09 als Korrektur übergeben, damit die Folgephase nicht nach einem nicht existierenden 7. Filter sucht.

**Tatsächliche Zahl der Einzel-Filter: 6 lebende Implementierungen** (statt 7 wie in F-16 behauptet) + die globale Suchbibliothek.

---

### 0. Globale Suchbibliothek (`/suche`)

- **(a) UI:** `frontend/src/app/suche/page.tsx`, `SearchField.tsx:35` (`useDebouncedSearch`, Search-as-you-type ≥ 2 Zeichen, 250ms Debounce), `SearchResults.tsx`, `SearchFilters.tsx`/`SearchFilterDrawer.tsx` (Jahr/Genre/Tag/Format/Status/Fansub-Gruppe-Filter), `SuggestionList.tsx` (Autocomplete-Vorschläge).
- **(b) Frontend-API:** `getSearch` — `frontend/src/lib/api/search.ts:40` (baut Query über `buildSearchQuery`, Zeile 10-33). `getSearchSuggestions` — `search.ts:71`.
- **(c) Backend:** `GET /api/v1/search` → `SearchHandler.Search` — `backend/internal/handlers/search.go:64` (Route `backend/cmd/server/main.go:393`, `authOptionalMiddleware` — öffentlich nutzbar). Zusätzlich `SearchHandler.Suggestions` — `search.go:192`.
- **(d) Rechte:** Öffentlich, `authOptionalMiddleware` — keine Capability-Prüfung nötig (öffentliche Suche über veröffentlichte Inhalte). Backend filtert implizit über Sichtbarkeits-Spalten in den SQL-Queries (kein separates Rechte-Flag in dieser Inventur gefunden, Sichtbarkeitsfilterung ist Teil der WHERE-Klausel, nicht der Permission-Schicht).
- **(e) Daten:** `backend/internal/repository/search_anime.go` (Anime + `anime_titles` + Genres + Tags + Fansub-Gruppen), `search_fansub.go` (Fansub-Gruppen + Aliase), `search_suggestions.go` (gruppierte Kurz-Vorschläge). Serverseitig **paginiert** (`page`/`per_page`-Parameter in `buildSearchQuery`), kein Vollabruf.
- **(f) Verhalten:** **Umlaut-/Akzent-tolerant** — `f_unaccent()` auf allen Vergleichsspalten (`search_anime.go:45,50,55,59,123-129`), zusätzlich `pg_trgm`-Ähnlichkeitsoperator `%` mit fest gesetzter Schwelle `SET LOCAL pg_trgm.similarity_threshold = 0.30` (`search_anime.go:17`) — das macht die Suche **tippfehlertolerant** (Trigram-Ähnlichkeit statt exaktem Substring). **Festes Ranking** über `CASE WHEN`-Stufen 0-5 (`buildSearchAnimeOrder`, `search_anime.go:150-166`: exakter Titel-Match zuerst, dann Alias-Exakt-Match, dann Präfix, dann Trigram-Ähnlichkeit, dann Genre/Tag-Treffer, dann Volltext-Rang) — **indexgestützt** (impliziert durch `pg_trgm`-GIN-Index-Nutzung, nicht separat in dieser Analyse verifiziert, aber durch den expliziten `SET LOCAL`-Threshold-Kommentar in `search_anime.go:13-17` als bewusste Performance-Entscheidung dokumentiert).

**D-04:** **legitim getrennt** von den 6 Einzel-Filtern — eigene Backend-Infrastruktur (SQL-Normalisierung + Trigram-Index), öffentlich, paginiert, kein Äquivalent in den Einzel-Filtern.

---

### 1. `AdminGroupsClient.tsx` (Gruppen-Übersicht, Nutzer-Verwaltungstab)

- **(a) UI:** `frontend/src/app/admin/groups/AdminGroupsClient.tsx:425-429` — `Input`-Primitive (`@/components/ui`, Import Zeile 12), `placeholder="Gruppe suchen ..."`, `value={searchValue}`.
- **(b) Filterlogik:** Rein clientseitig — `searchValue`-State (`:343`), Filter via `useMemo` (`:352-356`): `groups.filter((group) => group.name.toLowerCase().includes(query) || group.slug.toLowerCase().includes(query))` (`:355`), `query = searchValue.trim().toLowerCase()` (`:353`).
- **(c) Backend:** **Kein eigener Such-Endpunkt** — die zugrunde liegende Liste kommt aus `getFansubList({ page, per_page: perPage, status })` (`:370`) mit `perPage = 500` (`:362`) — ein **pseudo-voller Abruf** (500 ist praktisch "alle", keine echte serverseitige Volltextsuche beteiligt.
- **(d) Rechte:** n/a — reine Darstellungsfilterung über bereits serverseitig für den aufrufenden Admin autorisiert geladene Daten (keine Fremddaten-Problematik, da `getFansubList` selbst schon rechte-gefiltert ist).
- **(e) Daten:** Bereits vollständig geladene Liste (bis 500 Einträge), dann im Browser gefiltert — **kein** Nachladen bei Tippen.
- **(f) Verhalten:** **Keine Umlaut-Toleranz** — Beleg: `"Über".toLowerCase() === "über"`, aber `"über".includes("uber")` ist `false` in JavaScript (kein Akzent-Folding in `String.prototype.includes`) — Beispiel aus F-16 ("uber" findet "Über" nicht) bestätigt sich hier 1:1. Kein Tippfehler-Toleranz, kein Ranking (Filter-Reihenfolge = ursprüngliche Array-Reihenfolge).

**D-04:** **Duplikat** (Cluster mit #2,#3,#4). **Vorbild-Kandidat** innerhalb des Clusters — nutzt bereits die `Input`-UI-Primitive (CLAUDE.md-konform), einfachste/klarste Filterlogik (zwei Felder, kein Scoring).

---

### 2. `admin/fansubs/page.tsx` (Fansub-Gruppen-Liste)

- **(a) UI:** `frontend/src/app/admin/fansubs/page.tsx:428-436` — **natives** `<input id="fansub-query" value={queryInput} onChange={...} placeholder="Name, Slug oder Tag...">` (kein `Input`-Primitive-Import für dieses Feld — **CLAUDE.md-Design-System-Verstoß**, vorbestehend, außerhalb des D-01-Scopes dieser Phase zu beheben).
- **(b) Filterlogik:** `queryInput`-State (`:90`), debounced auf `query`-State (`:142`, 300ms impliziert durch den umgebenden Timeout-Code), Filter (`:159-165`): `name.includes(query) || slug.includes(query) || aliasMatches` wobei `name`/`slug` bereits `.toLowerCase()` vorverarbeitet sind (`:159-160`) und `aliasMatches` ebenfalls über `alias.toLowerCase().includes(query)` (`:163`).
- **(c) Backend:** Kein eigener Such-Endpunkt — `getFansubList` mit `per_page: perPage` (`:118`), `perPage = 500` (`:110`) — derselbe Pseudo-Vollabruf-Ansatz wie #1.
- **(d) Rechte:** n/a — wie #1.
- **(e) Daten:** Bereits voll geladene Liste (bis 500), inkl. Mitgliederzahlen/Aliase als separate State-Maps (`memberCounts`, `aliasesByGroup`, `:84-89`) — Alias-Suche ist eine **zusätzliche** Fähigkeit, die #1 nicht hat.
- **(f) Verhalten:** Keine Umlaut-Toleranz (gleicher Beleg wie #1). Zusätzlich durchsucht diese Implementierung auch Gruppen-Aliase — fachlich eine Erweiterung gegenüber #1, aber dieselbe Normalisierungslücke.

**D-04:** **Duplikat** (Cluster). Verwendet natives `<input>` statt UI-Primitive — **kein** Vorbild-Kandidat trotz der nützlichen Alias-Suche (die Alias-Fähigkeit sollte in die gemeinsame Filterhilfe übernommen werden, die UI-Feld-Implementierung aber nicht).

---

### 3. `admin/fansubs/merge/page.tsx` (Gruppen-Zusammenführung, Zielgruppen-Suche)

- **(a) UI:** `frontend/src/app/admin/fansubs/merge/page.tsx:398-405` — **natives** `<input id="merge-search" type="text" value={searchQuery} onChange={...} placeholder="Name oder Slug...">` — ebenfalls kein `Input`-Primitive, CLAUDE.md-Verstoß (vorbestehend).
- **(b) Filterlogik:** `searchQuery`-State (`:46`), Filter+Scoring kombiniert in einem `useMemo` (`:81-113`): `name.includes(query)` gibt Score `55`, `slug.includes(query)` gibt Score `45` (`:90-91`), zusätzliche Matches über `inName`/`inSlug` (`:98-99`) fließen in ein **eigenes Relevanz-Scoring** ein — die einzige der 6 Einzel-Implementierungen mit einem Ranking-Ansatz, allerdings ohne Umlaut-Normalisierung.
- **(c) Backend:** `getFansubList({ per_page: 500 })` (`:69`) — derselbe Pseudo-Vollabruf.
- **(d) Rechte:** n/a.
- **(e) Daten:** Vollständig geladene Liste (500), dann client-seitig gefiltert UND sortiert nach Score.
- **(f) Verhalten:** Keine Umlaut-Toleranz (gleicher Beleg). Das Scoring-Konzept (Name-Treffer höher gewichtet als Slug-Treffer) ist konzeptionell näher an der globalen Suchbibliothek als die anderen 5 Einzel-Filter, aber ohne deren Normalisierung.

**D-04:** **Duplikat** (Cluster). Scoring-Idee bewahrenswert für die gemeinsame Filterhilfe, UI-Feld selbst kein Vorbild (nativer Input).

---

### 4. `GroupMediaReviewSection.tsx` (Medien prüfen, Fansub-Edit)

- **(a) UI:** Eingabefeld ausgelagert in `GroupMediaReviewFilterBar.tsx:167-168` — **`Input`-Primitive** (`@/components/ui`, Import Zeile 3) — CLAUDE.md-konform, wie #1.
- **(b) Filterlogik:** `searchTerm`-State in der Elternkomponente (`GroupMediaReviewSection.tsx:154`), Filter in `filteredMediaItems`-`useMemo` (`:196-211`): durchsucht **4 Felder gleichzeitig** — `getMediaDisplayTitle(item)`, `item.description`, `item.alt_text`, `item.uploaded_by_display_name` (`:207`), jedes über `String(value).toLowerCase().includes(normalizedSearch)` (`:208`) — die **breiteste** Mehrfeld-Suche der 6 Implementierungen, kombiniert zusätzlich mit Kategorie-/Status-/Sichtbarkeits-Filtern in derselben Pipeline (`:199-201`).
- **(c) Backend:** Kein eigener Such-Endpunkt — `mediaItems` wird einmalig für die ganze Gruppe geladen (nicht paginiert, da Mediensatz einer Gruppe natürlich begrenzt ist), dann rein clientseitig gefiltert.
- **(d) Rechte:** n/a für die Suche selbst — ABER: die zugrunde liegende `mediaItems`-Liste wird vor jeder Rechteprüfung für die Review-Aktionen geladen; kein Hinweis darauf, dass clientseitig Datensätze geladen würden, die der aktuelle Nutzer nicht sehen dürfte (die Liste kommt bereits rechte-gefiltert vom Backend für diese Gruppe) — **kein Rechte-Thema** gefunden.
- **(e) Daten:** Einmaliger Voll-Abruf der Gruppen-Medienliste (keine Pagination nötig für diesen Anwendungsfall).
- **(f) Verhalten:** Keine Umlaut-Toleranz (gleicher Beleg: `includes()` ohne Normalisierung). Durchsucht aber mehr Felder als jede andere Einzel-Implementierung (Titel+Beschreibung+Alt-Text+Hochlader-Name) — funktional die reichhaltigste Suche im Cluster, trotz fehlender Normalisierung.

**D-04:** **Duplikat** (Cluster). **Vorbild-Kandidat** gemeinsam mit #1 — nutzt bereits die UI-Primitive UND hat die funktional reichhaltigste Mehrfeld-Suche; eine gemeinsame Filterhilfe sollte deren Mehrfeld-Ansatz übernehmen.

---

### 5. `useAnimePatchImpl.ts` (Genre/Tag-Autocomplete, Anime bearbeiten)

- **(a) UI:** Rendering in `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx:93-96` — **natives** `<input value={genreDraft} ...>` (Tag-Input mit Autocomplete, Kommentar in der Komponente selbst: `"Tag-Input mit Autocomplete aus den vorhandenen DB-Werten."`, Zeile 69) — kein `Input`-Primitive, CLAUDE.md-Verstoß (vorbestehend). Analoges Feld für Tags (nicht separat zeilen-belegt, gleiche Komponentenstruktur).
- **(b) Filterlogik:** `genreDraft`/`tagDraft`-States im Hook (`useAnimePatchImpl.ts`, verwaltet über `ReturnType`), Filterung der bereits geladenen Genre-/Tag-Katalog-Tokens: `token.name.toLowerCase().includes(q)` (Zeilen 158,170,180,192), `q = values.genreDraft.trim().toLowerCase()` (Zeile 153 bzw. 165 für Genre, 175/187 für Tag) — **4 nahezu identische Filterblöcke** innerhalb derselben Datei (zwei für Genre: offene Liste + begrenzte Vorschau, zwei analog für Tags).
- **(c) Backend:** **Kein eigener Such-Endpunkt** für diese Filterung — die Genre-/Tag-Kataloge werden vollständig vorab geladen (separate Admin-Taxonomie-Endpunkte außerhalb dieser Suche), dann hier rein clientseitig nach Tippeingabe gefiltert.
- **(d) Rechte:** n/a — reine Autocomplete-Filterung eines bereits geladenen, öffentlichen Taxonomie-Katalogs (Genres/Tags sind keine schützenswerten Daten).
- **(e) Daten:** Vollständig geladene Genre-/Tag-Kataloge (vermutlich < 200 Einträge je Katalog), rein clientseitig gefiltert.
- **(f) Verhalten:** Keine Umlaut-Toleranz (gleicher `includes()`-Beleg). Dies ist ein **engerer Fall** als #1-#4: es filtert einen Token-Katalog für Autocomplete, nicht eine Entitätsliste (Gruppen/Medien) — fachlich dieselbe Normalisierungslücke, aber ein anderer Anwendungsfall (Eingabehilfe statt Listenfilter).

**D-04:** **Duplikat** innerhalb des engeren Autocomplete-Teilclusters (mit #6). Teilt sich die Normalisierungslücke mit #1-#4, aber eigener Anwendungsfall (Token-Autocomplete) — eine gemeinsame Filterhilfe sollte BEIDE Fälle (Listenfilter UND Token-Autocomplete) über dieselbe normalisierte Vergleichsfunktion abdecken, auch wenn die UI-Komponenten unterschiedlich bleiben.

---

### 6. `useAdminAnimeCreateControllerImpl.ts` (Genre/Tag-Autocomplete, Anime anlegen)

- **(a) UI:** Dieselbe `AnimeEditGenreSection.tsx`-Komponente wie #5 wird wiederverwendet — die Create-Seite übergibt `genreDraft: createGenreDraft` / `tagDraft: createTagDraft` (`useAdminAnimeCreateControllerImpl.ts:948,953`) an dieselben Props. **Kein separates UI-Feld** — dieselbe native `<input>`-Stelle wie #5 wird für beide Flows durchlaufen.
- **(b) Filterlogik:** Eigener, aber strukturell identischer Satz von 4 Filterblöcken im Create-Controller-Hook: `createGenreDraft.trim().toLowerCase()` (Zeilen 403,415), `createTagDraft.trim().toLowerCase()` (Zeilen 425,437), jeweils gefolgt von `t.name.toLowerCase().includes(q)` (Zeilen 408,420,430,442) — **1:1 dieselbe Logik wie #5, nur auf separatem State (`createGenreDraft`/`createTagDraft` statt `genreDraft`/`tagDraft`)**, keine gemeinsame Hilfsfunktion zwischen Create- und Edit-Controller.
- **(c) Backend:** Wie #5 — kein eigener Such-Endpunkt, vollständig vorab geladene Kataloge.
- **(d) Rechte:** n/a — wie #5.
- **(e) Daten:** Wie #5.
- **(f) Verhalten:** Keine Umlaut-Toleranz (gleicher Beleg). **Vollständig identische Implementierung wie #5**, nur in einer anderen Datei mit anderem State-Namenspräfix (`create*` statt ohne Präfix) — dies ist der klarste 1:1-Code-Duplikat-Fall innerhalb des gesamten Fachaufgaben-7-Clusters (keine fachliche Variante, reine Kopie derselben vier Filterblöcke zwischen Create- und Edit-Hook).

**D-04:** **Duplikat** (engster Fall, nahezu wortgleiche Kopie von #5). Empfehlung: eine gemeinsame `filterTaxonomyTokens(tokens, draft, selected)`-Hilfsfunktion extrahieren, die von BEIDEN Hooks (Create und Edit) importiert wird — löst #5 und #6 gemeinsam, unabhängig von der größeren Listenfilter-Zusammenführung (#1-#4).

---

## Zusammenfassung Umlaut-/Akzent-Toleranz je Implementierung

| # | Implementierung | Umlaut-tolerant? | Beleg |
|---|---|---|---|
| 0 | Globale Suchbibliothek | **Ja** | `f_unaccent()` + `pg_trgm`, `search_anime.go:45` u.a. |
| 1 | `AdminGroupsClient.tsx` | **Nein** | `.toLowerCase().includes()`, `:355` |
| 2 | `admin/fansubs/page.tsx` | **Nein** | `:163-165` |
| 3 | `admin/fansubs/merge/page.tsx` | **Nein** | `:90-91,98-99` |
| 4 | `GroupMediaReviewSection.tsx` | **Nein** | `:208` |
| 5 | `useAnimePatchImpl.ts` | **Nein** | `:158,170,180,192` |
| 6 | `useAdminAnimeCreateControllerImpl.ts` | **Nein** | `:408,420,430,442` |

**Bestätigt (F-16-Beispiel):** Bei allen 6 Einzel-Filtern findet die Eingabe `"uber"` den Eintrag `"Über"` NICHT, weil `"über".includes("uber")` in JavaScript `false` liefert (kein Unicode-Normalisierungsschritt vor dem Substring-Vergleich) — die globale Suchbibliothek würde denselben Fall über `f_unaccent()` korrekt auflösen.

## UI-Primitive-Konformität (zusätzlicher Befund für die Vorbild-Wahl)

| # | Implementierung | `Input`-Primitive? |
|---|---|---|
| 1 | `AdminGroupsClient.tsx` | **Ja** (`:425`) |
| 2 | `admin/fansubs/page.tsx` | Nein — natives `<input>` (`:431`) |
| 3 | `admin/fansubs/merge/page.tsx` | Nein — natives `<input>` (`:401`) |
| 4 | `GroupMediaReviewSection.tsx` (via `GroupMediaReviewFilterBar.tsx`) | **Ja** (`:167`) |
| 5 | `useAnimePatchImpl.ts` (via `AnimeEditGenreSection.tsx`) | Nein — natives `<input>` (`:93`) |
| 6 | `useAdminAnimeCreateControllerImpl.ts` (dieselbe Komponente wie #5) | Nein — natives `<input>` (`:93`) |

## D-04 Vorbild/Altlast für die künftige gemeinsame Frontend-Filter-Hilfsfunktion

**Vorbild:** Eine NEUE gemeinsame Hilfsfunktion (noch nicht existent), die:
1. Die Normalisierung der globalen Suchbibliothek nachbildet (Umlaut-/Akzent-Faltung — in JS z. B. über `String.prototype.normalize('NFD')` + Diakritika-Entfernung, da `f_unaccent()` selbst nicht im Frontend verfügbar ist).
2. Das Mehrfeld-Muster von **#4** übernimmt (mehrere Felder gleichzeitig durchsuchen, nicht nur Name/Slug).
3. Das Scoring-Konzept von **#3** übernimmt (Name-Treffer vor Slug-Treffer gewichten) für Listen, bei denen Reihenfolge relevant ist.
4. Über die `Input`-Primitive gerendert wird (Muster bereits korrekt in **#1** und **#4**).

**Altlast (werden nach Einführung der gemeinsamen Hilfsfunktion ersetzt):** Alle 6 Einzel-Implementierungen (#1-#6) — keine davon bleibt bestehen, da D-06 ausdrücklich "kein Nebeneinander" fordert. **#2, #3, #5, #6** zusätzlich auf die `Input`-Primitive umstellen (CLAUDE.md-Pflicht, unabhängig von der Normalisierungsfrage).

**(b)-Empfehlung aus F-16, bestätigt:** Für #1-#3 (Fansub-Listen mit `per_page: 500`-Pseudo-Vollabruf) ist eine Umstellung auf die Backend-Suchbibliothek (globale `/search`-Infrastruktur mit `fansub_group`-Filterparameter, bereits in `search.ts`'s `SearchParams.fansub_group`/`fansub_group_query`, Zeilen 22-25 vorhanden) der nachhaltigere Weg als nur eine Frontend-Normalisierungsfunktion — das deckt sich mit F-16s eigener Empfehlung (b).

## Summenzeilen (reproduzierbar per `scripts/count-07-suchen-filtern.sh`)

- **Suchimplementierungen insgesamt: 7** (1 Backend-Bibliothek + 6 lebende Einzel-Filter; NICHT 8 wie F-16 behauptet — `projectPageData.ts` entfällt, siehe Korrekturbefund oben)
- **Einzel-Filter mit Umlaut-Toleranz: 0 von 6**
- **Einzel-Filter mit `Input`-UI-Primitive: 2 von 6** (`AdminGroupsClient.tsx`, `GroupMediaReviewSection.tsx`)

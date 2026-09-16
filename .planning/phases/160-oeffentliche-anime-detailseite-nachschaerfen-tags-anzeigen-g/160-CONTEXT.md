# Phase 160: Öffentliche Anime-Detailseite nachschärfen — Context

**Gathered:** 2026-09-16
**Status:** Teilschritt „Tags und Genres“ bereit für Planung; weitere Phase-160-Themen noch offen

<domain>
## Phase Boundary

Phase 160 schärft die öffentliche Anime-Detailseite `/anime/[id]` nach der Live-UAT 158/159 nach.

**Dieser CONTEXT deckt ausschließlich den Teilschritt „Tags und Genres“ ab:**
1. Mehrsprachige Namen für Tags und Genres (Datenmodell + Admin-Pflege), Deutsch als erste Sprache.
2. Tags als anklickbare Chips direkt unter der Beschreibung.
3. Genre-Chips links am Poster werden ebenfalls Links.
4. Die bestehende Suche `/suche` funktioniert für `tag` und `genre` auch ohne Suchbegriff.

**Ausdrücklich NICHT Teil dieses Teilschritts** (eigener Discuss-Schritt innerhalb Phase 160, noch nicht entschieden):
Fansub-Gruppenbutton-Semantik, mehrfach vorkommende Gruppennamen, „Gruppenbereich“, Projekt-/Fansub-Navigation,
Coop-Darstellung, Filler-/Canon- und Episodentyp-Filter oder -Anzeige an Episoden, serverseitige Episodenfilter,
Episoden-Pagination. Die offenen Entscheidungen dazu stehen in `160-LIVE-UAT-BEFUNDE.md` und bleiben offen.

</domain>

<decisions>
## Implementation Decisions

### Mehrsprachige Tag- und Genre-Namen (Ausführung VOR der öffentlichen Anzeige)
- **D-01:** Mehrsprachigkeit ist ein eigener Teilschritt, der vor der öffentlichen Tag-/Genre-Anzeige umgesetzt wird. Die Anzeige baut direkt auf dem neuen Modell auf.
- **D-02:** Speicherung nach dem Muster von `anime_titles`: je eine Tabelle „Tag + Sprache + Name“ und „Genre + Sprache + Name“ über die bestehende Tabelle `languages`. Keine festen Spalten je Sprache. Ersetzt bewusst die Auftragsvorgabe „keine neue Tag-Tabelle“ (Nutzerentscheidung 2026-09-16).
- **D-03:** `tags.name` und `genres.name` bleiben der eindeutige Grundname (bestehende 15 gemischt deutsch/englischen Tag-Namen unverändert). Sprachnamen werden ergänzt. Keine automatische Sprachzuordnung des Bestands.
- **D-04:** Pflege auf einer neuen Admin-Seite (Tags und Genres): Liste mit Grundname, Nutzungsanzahl und Namensfeld je Sprache, jetzt Deutsch. Übersetzung gilt global für alle Anime.
- **D-05:** aniSearch-/sonstiger Import legt weiterhin nur den Grundnamen an; er schreibt keine Sprachnamen.
- **D-06:** Öffentliche Anzeige in fester Sprache Deutsch: deutscher Name, sonst Grundname. Kein Sprachumschalter. Tags/Genres ohne deutschen Namen bleiben sichtbar.
- **D-07:** Genres erhalten dasselbe Mehrsprachen-Modell und dieselbe Pflege wie Tags.

### Suchziel ohne Suchbegriff
- **D-08:** `/suche` liefert Ergebnisse auch ohne `q`, wenn `tag` oder `genre` gesetzt ist (Backend-Handler und Frontend-Ergebnisfläche). Additive Änderung; für alle anderen Filter (Format, Status, Jahre, Fansubgruppe) bleibt die Suchbegriff-Pflicht (mind. 2 Zeichen) unverändert.
- **D-09:** Links verwenden den bestehenden Query-Contract mit Anime-Scope: `/suche?type=anime&tag=<angezeigter Name>` bzw. `/suche?type=anime&genre=<angezeigter Name>`, korrekt URL-encodiert (Leerzeichen, Umlaute, Sonderzeichen). Keine neue URL-Konvention, keine Tag-/Genre-Detailseite, kein ID-Parameter.
- **D-10:** Der Such-Filter findet einen Tag/ein Genre über jeden seiner Namen (Grundname und alle Sprachnamen), weiterhin ohne Groß-/Kleinschreibung.
- **D-11:** Aktiver Filter wird wie heute über das vorbelegte bestehende Filterfeld sichtbar; keine neue Filter-Hinweis-UI.

### Position und Trennlinie der Tags
- **D-12:** Reihenfolge in der rechten Infokarte: Titel → Status/Typ/Jahr → Beschreibung → **Tags** → Linie → Jellyfin-Banner → Verwandte Anime. Ersetzt die Entscheidung vom 2026-09-15 („Tags unter der Linie“).
- **D-13:** Die Linie bleibt an den Banner gebunden (`AnimeInfoBanner`); ohne Banner keine Linie nach den Tags, nur Abstand. Ohne Tags: keine Überschrift, kein Container, kein zusätzlicher Abstand.
- **D-14:** Tags gehören nicht in den Genre-Bereich links, nicht in die Statuszeile, nicht unter „Verwandte Anime“, nicht in die Episoden-Sektion.

### Beschriftung und Zugänglichkeit
- **D-15:** Überschrift über den Tag-Chips: „Tags“.
- **D-16:** Chips sind echte Links (`<a>`/Next `Link`), per Tastatur erreichbar, sichtbarer Fokus; sichtbarer und zugänglicher Linktext ist nur der Name. Die Chips stehen in einer Liste, die über die Überschrift „Tags“ benannt ist.
- **D-17:** Tag-Chips optisch als Inhaltsnavigation, nicht wie die Metadaten-Badges oben: normale Schreibweise (keine Großbuchstaben), kleine bis mittlere abgerundete Chips, dezenter Hintergrund, klare Hover-/Fokus-Rückmeldung, Pointer, ausreichender Kontrast, kein kräftiger CTA-Stil. Globale Design-Tokens.

### Reihenfolge, Menge, Genres
- **D-18:** Tags alphabetisch nach angezeigtem Namen sortiert.
- **D-19:** Alle Tags anzeigen, Chips brechen um (Desktop/Tablet/Mobile), keine horizontale Scrollleiste; lange Namen sprengen das Layout nicht. Kein Einklappen.
- **D-20:** Genre-Chips links am Poster werden Links auf `/suche?type=anime&genre=<Name>` im heutigen Chip-Stil, ergänzt um Hover, Pointer und sichtbaren Fokus. Genres und Tags bleiben optisch getrennt.

### Claude's Discretion
- Sortierung der Suchergebnisse ohne Suchbegriff (z. B. Titel alphabetisch statt Relevanz).
- Verhalten von `type=alle`/`type=fansub` bei reiner Tag-/Genre-Suche (Fansub-Teil leer, keine Fehlermeldung).
- Umgang mit dem heutigen Platzhalter-Chip „Anime“ bei fehlenden Genres (nicht verlinken).
- Genaue Tabellen-/Spaltennamen, Unique-Constraints und API-Form der Sprachnamen, solange D-02/D-03 eingehalten sind.
- Ob der öffentliche Anime-Detail-Contract zusätzlich zur Anzeige-Form strukturierte Namen liefert; ohne zusätzliche Anfrage und ohne N+1.
- Navigation/Platzierung der neuen Admin-Seite im Admin-Menü.
- Hinweis: Der Emby-Link auf der Detailseite existiert nur für eine fest eingetragene Test-Zuordnung (`frontend/src/lib/emby.ts`); falls er erscheint, steht er nach den Tags.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase-Befunde und Projektregeln
- `.planning/phases/160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g/160-LIVE-UAT-BEFUNDE.md` — Live-UAT-Befunde 2026-09-15; Befund 1 (Tags) ist Grundlage dieses Teilschritts; übrige offene Entscheidungen gehören NICHT in diesen Plan.
- `.planning/ROADMAP.md` §„Phase 160“ — Ziel und Abhängigkeiten.
- `CLAUDE.md` — Pflicht zu `@/components/ui`-Primitives, echte Umlaute, Dateien ≤ 450 Zeilen, Arbeit auf der VM.

### Such-Contract
- `frontend/src/app/suche/useDebouncedSearch.ts` — URL = Source of Truth; Parameter `q`, `type` (`alle|anime|fansub`), `page`, `year_from`, `year_to`, `genre`, `tag`, `format`, `status`, `fansub_group`; `MIN_QUERY_LENGTH = 2`.
- `frontend/src/app/suche/SearchResults.tsx` — zeigt ohne Suchbegriff nur den Leerzustand „Wonach suchst du?“ (muss für tag/genre angepasst werden).
- `frontend/src/app/suche/SearchFilters.tsx` — bestehende Filterfelder Genre/Tag.
- `backend/internal/handlers/search.go` — `parseSearchQueryTerm` erzwingt q ≥ 2 (400); `tag`/`genre` als freie Filterstrings.
- `backend/internal/repository/search_anime.go` — Tag-/Genre-Filter `lower(name) = lower($n)`; q-Match inkl. Genre/Tag-Trigramm.

### Anime-Detail und Datenmodell
- `frontend/src/app/anime/[id]/page.tsx` (301 Zeilen) — Infokarte, Genre-Chips (`genreChip`), Beschreibung, `AnimeInfoBanner`.
- `frontend/src/app/anime/[id]/page.module.css` — `.genreChip`, `.description`, `.divider`.
- `frontend/src/components/anime/AnimeMediaProvider.tsx` — `AnimeInfoBanner` zeichnet Linie nur mit Banner.
- `frontend/src/types/anime.ts` — `AnimeDetail.tags?: string[]`, `genres`.
- `backend/internal/repository/anime_v2.go` — öffentliches Anime-Detail inkl. Tags/Genres.
- `backend/internal/repository/admin_content.go` — `replaceAuthoritativeAnimeTags`, Tag-Token-Abfrage (`/admin/tags`).
- DB: `tags(id, name UNIQUE)`, `anime_tags`, `genres(id, name UNIQUE)`, `anime_genres`, `languages(id, code UNIQUE, name)`; Muster `anime_titles(anime_id, language_id, title_type_id, title)`.

### Bestehende Tests
- `frontend/src/app/anime/[id]/page.test.tsx`, `page.performance.test.ts`, `animeDetailData.test.ts` — erweitern, keine parallele Struktur.
- `frontend/src/app/suche/useDebouncedSearch.test.tsx`, `SearchResults.test.tsx`.
- `backend/internal/repository/anime_public_read_integration_test.go` — Public-Read inkl. SQL-Budget.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `anime_titles` + `languages`: Vorlage für Sprachnamen je Tag/Genre.
- `/admin/tags` (`ListTagTokens`) und Genre-Token-Abfrage: Basis für Nutzungsanzahl in der neuen Admin-Seite.
- `@/components/ui` (`Table`, `Input`, `FormField`, `Button`): Pflicht für die Admin-Seite.
- Bestehender Such-Query-Builder in `useDebouncedSearch.ts` (Serialisierung von `tag`/`genre`) zum Erzeugen der Links.

### Established Patterns
- URL ist Source of Truth der Suche; Filter werden aus `useSearchParams` rekonstruiert.
- Tag-/Genre-Schreibpfade sind „authoritative replace“ pro Anime über den Grundnamen.
- Öffentliche Detailseite ist SSR mit festem SQL-Budget (Performance-Test) — keine zusätzlichen Requests.

### Integration Points
- Backend: Search-Handler (q-Pflicht-Ausnahme), Search-Repository (Filter über alle Namen), Anime-Detail-Repository (deutscher Anzeigename), neue Admin-Endpunkte für Sprachnamen, Migration.
- Frontend: `page.tsx` Infokarte und Genre-Bereich, `/suche` Ergebnisfläche, neue Admin-Seite, API-Helfer in `lib/api.ts`.

</code_context>

<specifics>
## Specific Ideas

- Beispielanzeige unter der Beschreibung: „Tags“ → `[ Amnesia ] [ Dämon ] [ Schule ]` (normale Schreibweise, nicht `[ AMNESIA ]`).
- Beispiel-Link: Tag „Real Robot“ → `/suche?type=anime&tag=Real%20Robot`; Tag „PSI-Kräfte“ → korrekt encodiert.
- Testdaten vorhanden: Anime 1 (Buddy Complex) 8 Tags, Anime 2 (11eyes) 5 Tags, Anime 3 (OVA) 7 Tags.
- Abnahme im Browser Desktop + Mobile (Umbruch, Fokus per Tastatur).

</specifics>

<deferred>
## Deferred Ideas

- Sprachumschalter / weitere Sprachen neben Deutsch in der öffentlichen Oberfläche.
- Nur-Filter-Suche für Format, Status, Jahre, Fansubgruppe.
- Übrige Phase-160-Themen (Gruppenbuttons, „Gruppenbereich“, Coop, Episodenfilter/-anzeige) — nächster Discuss-Schritt in Phase 160.

### Reviewed Todos (not folded)
- „no-restricted-syntax Legacy-Datei-Migration“ — Stichworttreffer, fachlich kein Bezug zu Tags/Genres.
- „Contributor owned media and note edit delete“ — kein Bezug.
- „DELETE /admin/media/:id läuft gegen ein nicht mehr existierendes Legacy-Schema“ — kein Bezug.
- Zwei weitere Stichworttreffer der Todo-Suche — kein Bezug; Nutzer entschied, keines zu übernehmen.

</deferred>

---

*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Context gathered: 2026-09-16 (Teilschritt Tags und Genres)*

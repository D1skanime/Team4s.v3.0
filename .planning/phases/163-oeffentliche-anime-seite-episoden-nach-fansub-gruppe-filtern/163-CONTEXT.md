# Phase 163: Öffentliche Anime-Seite: Episoden nach Fansub-Gruppe und vorhandenen Releases filtern - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Die Episodenliste auf `/anime/[id]` wird ein echter, serverseitiger Episodenfilter:
- Es erscheinen nur Episoden mit mindestens einer öffentlichen Release-Version (auch bei „Alle“).
- Bei aktiver Fansub-Gruppe (Phase-162-URL-Zustand `?fansub=<slug>`) erscheinen nur Episoden, an deren Versionen die Gruppe beteiligt ist (Coop inklusive), und innerhalb der Episode nur diese Versionen.
- Filter ist in die Cursor-Pagination integriert, ohne N+1, ohne Umsortierung.

Verbindlicher Auftrag: `163-USER-REQUEST.md` (§1–§17). Nicht in dieser Phase: neue Coop-Kennzeichnung, zweite Gruppenauswahl, Datenänderungen durch Agenten, unrelated Refactorings.

</domain>

<decisions>
## Implementation Decisions

### Sichtbarkeit und Filtersemantik (aus Auftrag übernommen, gesperrt)
- **D-01:** Episode sichtbar ⇔ ≥1 öffentliche Version (bei „Alle“) bzw. ≥1 öffentliche Version mit `release_version_groups.fansub_group_id = aktive Gruppe` (bei konkreter Gruppe). Coop-Versionen gehören jeder beteiligten Gruppe; keine Primärgruppe. Umsetzung als Bedingung in der bestehenden Public-Query `publicEpisodeQuery` (EXISTS/Join-Filter im `inventory`-CTE), nicht als zweite Filterlogik und nicht clientseitig. Episoden ohne passende Version erzeugen **keine** Zeile mehr (die heutige „neutrale Zeile ohne Varianten“ entfällt in der Public-Projektion). Reihenfolge bleibt `episode_number, episode_id, variant_id`.
- **D-02 (Claude-Standard, nicht diskutiert):** „Öffentliche Version“ = `release_versions`-Zeile mit ≥1 `release_variants` **und** ≥1 `release_version_groups`, Anime `status <> 'disabled'` (bestehendes `ExistsVisible`). Es gibt **kein** Sichtbarkeitsfeld an Release/Version und es wird keins eingeführt. `episodes.status` ist **kein** Gate (Bestand: alle 246 Episoden `disabled`, würde alles ausblenden). `fansub_groups.status` (z. B. `dissolved`) ist kein Gate. Fail closed: Version ohne Gruppe oder ohne Variante macht keine Episode sichtbar (Bestand heute: 0 solcher Versionen).
- **D-03:** Innerhalb der Episode (Ebene B) liefert der Server bei aktiver Gruppe nur die passenden Varianten-Zeilen. `version_count` und `default_version_id` beziehen sich auf die gefilterte Menge.
- **D-04:** Filterschlüssel ist der Gruppen-**Slug** (wie 162 D-02). Query-Parameter additiv an `GET /api/v1/anime/{id}/episodes?projection=public`, in die bestehende Strict-Allowlist (`parseStrictNamedQuery`) aufnehmen; Name nach Projektkonvention, bevorzugt identisch zum Seitenparameter `fansub`. Frontend `getGroupedEpisodes` + `PublicGroupedEpisodesOptions`, Go-Handler, OpenAPI und TS-Typen synchron.
- **D-05:** Ungültiger/fremder Slug: Die Seite folgt der 162-Regel (Fallback „Alle“) und sendet dann **keinen** Filter. Backendverhalten für einen Slug, der keiner Gruppe dieses Anime entspricht: fail closed (Validierungsfehler oder leere Liste – Planner entscheidet und testet); niemals ungefilterte Daten.
- **D-06:** Der Filterkontext ist Teil des Cursors (z. B. Gruppen-ID/Slug im Cursor-JSON, Cursor-Version erhöhen). Ein Cursor aus Filter A wird bei Filter B oder „Alle“ abgelehnt (`ErrValidation` → 400).

### Gruppenwechsel und Laden (diskutiert)
- **D-07:** **Löst 162 D-03 teilweise ab:** Chip-Klick schreibt die URL weiter per `history.pushState` (kein RSC-/Seiten-Reload, neuer Historieneintrag, kein Scroll-Sprung), lädt aber die **erste Episodenseite der neuen Gruppe** clientseitig neu. Alte Liste und alter Cursor werden verworfen, nie gemergt.
- **D-08:** Während des Ladens bleibt die alte Liste sichtbar, **gedimmt und nicht interaktiv** (z. B. `aria-busy`), der neue Chip ist sofort aktiv. Kein Skeleton, kein Layoutsprung. Kein Vorabladen aller Gruppen.
- **D-09:** Browser Zurück/Vor (popstate) lädt **immer neu** – kein Cache pro Gruppe. „Weitere laden“ startet je Filter von vorn. Laufende Requests (Wechsel und „Weitere laden“) werden beim Wechsel abgebrochen; nur die letzte Auswahl darf Daten setzen.
- **D-10:** Fehler beim Neuladen: kompakter Hinweis „Episoden konnten nicht geladen werden.“ mit Button „Erneut versuchen“; keine Daten der alten Gruppe darunter/daneben; Chip und URL bleiben auf der neuen Gruppe.
- **D-11:** SSR: `page.tsx` lädt die erste Seite bereits mit dem gültigen `searchParams.fansub`-Filter (162 D-04, kein Flackern von „Alle“ auf Gruppe). Bei genau einer Gruppe gilt 162 D-02 (Parameter ignoriert; Filter wirkt faktisch wie „Alle“).

### Zahlen (diskutiert)
- **D-12:** Überschrift „Episoden (N)“ zeigt die **Trefferzahl**: Anzahl sichtbarer Episoden im aktuellen Filter über **alle Seiten** (nicht nur die geladenen). Der Server liefert diese Zahl im selben Read (z. B. Feld in `pagination`, Window-Aggregat im selben Statement, keine Zusatzquery pro Episode). Die Gesamtzahl des Anime bleibt am Poster („220 Episodes“). Folgen im Alltag: Naruto heute „Episoden (5)“, AnimeOwnage „(3)“, Project Messiah „(3)“; ein neu angelegter Anime ohne Releases zeigt „Episoden (0)“ plus Leerzustand. Die Überschrift aktualisiert sich beim Gruppenwechsel mit (Quelle ist die Client-Liste, nicht nur der SSR-Wert).
- **D-13:** Badge „+N Versionen“ zählt bei aktiver Gruppe nur deren Versionen (Coop zählt mit), bei „Alle“ alle – ergibt sich aus D-03.

### Leerzustand, Altlasten, Fallback (Claude-Standard, nicht diskutiert)
- **D-14:** Konkrete Gruppe ohne Treffer: kompakter neutraler Hinweis „Für diese Fansub-Gruppe sind derzeit keine öffentlichen Releases hinterlegt.“ Keine leeren Karten. Kommt im Bestand heute nicht vor (alle 7 Anime-Gruppen-Zuordnungen haben ≥1 Release), ist aber regulär erreichbar (Gruppe zugeordnet, Releases fehlen/entfernt) und muss per Fixture getestet werden. „Alle“ ohne Treffer: neutraler Hinweis ohne technischen Text.
- **D-15:** Der Hinweisblock „Keine Version dieser Gruppe verfügbar.“ / „Im geladenen Ausschnitt ist noch keine Version dieser Gruppe vorhanden.“ (`noVersionHint` in `FansubVersionBrowser.tsx`) sowie die clientseitige Gruppenfilterung über geladene Episoden werden **entfernt** (ersetzt, nicht parallel). `getSummaryVersion` darf nur noch aus bereits gefilterten Versionen wählen.
- **D-16:** Die Notfall-Liste in `page.tsx` (alle `anime.episodes`, wenn der Public-Endpoint fehlschlägt) darf keine Episoden ohne Release mehr zeigen; sie wird durch einen neutralen Fehlerhinweis ersetzt. (Standardwahl – Auftraggeber kann widersprechen.)
- **D-17:** Loading-, Fehler-, Leer- und Retry-Elemente nutzen `@/components/ui`-Primitives und globale Design-Tokens; deutsche UI-Texte mit echten Umlauten.

### Tests und Verifikation
- **D-18:** Naruto Folge 23 hat im aktuellen Bestand **kein** Release (Releases nur Folge 1–5: 1/2 nur AnimeOwnage, 3/4 nur Project Messiah, 5 Coop). Real-Daten-Regression daher: AnimeOwnage blendet Folge 3/4 aus, Project Messiah blendet 1/2 aus, Folge 5 bei beiden mit derselben Coop-Version, Folge 23 (und alle übrigen 215) in keinem Filter sichtbar. Das Auftragsszenario §15 (inkl. „Folge 23 nur Project Messiah“) wird als Postgres-Fixture-Test nachgebaut. Agenten ändern keine produktiven Daten (162 D-14).
- **D-19:** Pflichtfälle A–J aus §15 als Backend-Integrationstests (echte Query) und Frontend-Tests (Filterwechsel Alle→AO→PM→Alle ohne Mischdaten, Race/Abort, Cursor-Scope, Überschrift/Badge-Zahlen, Leer-/Fehlerzustand). Pagination-Fixture mit Treffern erst hinter Seite 1. Performance: `EXPLAIN (ANALYZE)` für Naruto vorher/nachher und Nachweis konstanter Query-Anzahl pro Request. Browser-UAT live über :3300/:3000 mit Naruto.

### Claude's Discretion
- Konkreter SQL-Aufbau (EXISTS vs. Join im Lateral, Window-Count für D-12), Cursor-Format/-Version, Name des Zählfelds.
- Genaues Backendverhalten bei fremdem Slug (D-05), solange fail closed und getestet.
- Mechanik der Dimmung (CSS-Klasse/Token, `inert` vs. `aria-busy` + pointer-events), solange Tastatur-/Screenreader-Verhalten sauber ist.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auftrag und Vorphasen
- `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/163-USER-REQUEST.md` — verbindlicher Auftrag §1–§17, Pflichttests A–J, Abschlussbericht-Inhalt
- `.planning/phases/162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation/162-CONTEXT.md` — D-01..D-04 URL-Zustand (Slug, Fallback, pushState, SSR); D-03 wird hier durch D-07 teilweise abgelöst; D-09 (clientseitiger Versionsfilter) wird durch D-01/D-03/D-15 ersetzt; D-14 keine Datenänderung
- `.planning/phases/162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation/162-RESEARCH.md` — Beleg, warum pushState statt Router (RSC-Refetch)
- `CLAUDE.md` — UI-Primitives-Pflicht, Umlaute, 450-Zeilen-Limit

### Code
- `backend/internal/repository/episode_version_public_query.go` — `publicEpisodeQuery`, `PublicEpisodeOptions`, Cursor v1, `ListPublicGroupedByAnimeID`
- `backend/internal/repository/episode_version_public_integration_test.go` — bestehende Integrationstests der Public-Projektion
- `backend/internal/handlers/episode_version_reads.go` — `ListGroupedEpisodes`, Strict-Query-Allowlist
- `backend/internal/repository/anime.go` — `ExistsVisible` (einziges bestehendes Public-Gate)
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` — clientseitiger Filter, `loadMore`, `mergeEpisodes`, `noVersionHint`, `updateFansubSelection`
- `frontend/src/app/anime/[id]/page.tsx` — SSR-Fetch `limit: 24`, `episodeCount = anime.episodes.length`, Fallback-Liste
- `frontend/src/lib/api.ts` — `getGroupedEpisodes`
- `shared/contracts/openapi.yaml` — Public-Episoden-Vertrag

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PublicEpisodeOptions.normalized` + `trimCursorPage`: bestehende, strikt validierte Cursor-Pagination – um Filterfeld erweitern statt neu bauen.
- `FansubVersionBrowser` hat bereits AbortController-/`requestRef`-Logik für „Weitere laden“ – für Gruppenwechsel wiederverwenden.
- `FansubGroupPicker` / `updateFansubSelection` (162): einzige Auswahlquelle; hier den Refetch anhängen.

### Established Patterns
- Pagination schneidet nach Varianten-Zeilen (LIMIT auf `inventory`-Zeilen), Gruppen-Aggregation erst nach LIMIT (keine Zeilenvervielfachung) – Filter muss vor dem Seek/LIMIT greifen.
- Heute enthält `inventory` für jede Episode eine Zeile, auch ohne Varianten (LEFT JOIN LATERAL) → Ursache, dass alle 220 Naruto-Folgen erscheinen.
- Gruppenfilter heute ausschließlich clientseitig über geladene Seiten → Ursache des gemeldeten Fehlers.
- Handler nutzt Strict-Query-Parsing: jeder neue Parameter muss explizit erlaubt werden.

### Integration Points
- SSR in `page.tsx` (`searchParams.fansub` → Filter) und Client-Refetch in `FansubVersionBrowser` müssen denselben Slug-Resolver nutzen.
- Überschrift „Episoden (N)“ liegt heute in `page.tsx` (Server) – für D-12 muss die Zahl aus dem Client-Zustand kommen.

### Bestand (read-only geprüft 2026-09-17)
- Naruto (anime 4): 220 Episoden, Releases nur Folge 1–5; Gruppen animeownage, project-messiah (beide nicht primär); 1 Coop (Folge 5).
- Anime 1: new-subs 13 Folgen; Anime 2: 3 Gruppen je 1 Folge; Anime 3: strawhat-subs 1 Folge.

</code_context>

<specifics>
## Specific Ideas

- Gruppenwechsel soll sich ruhig anfühlen: alte Liste gedimmt stehen lassen statt Skeleton.
- Überschrift als reine Trefferzahl; Gesamtzahl nur am Poster.

</specifics>

<deferred>
## Deferred Ideas

- Native `<button>` im Episodenkopf von `FansubVersionBrowser` (Altbestand, verstößt gegen UI-Primitives-Pflicht) – nur anfassen, wenn die Zeilen ohnehin geändert werden; sonst eigener Aufräumpunkt.
- Coop-Kennzeichnung in der Versionszeile (aus 162 deferred) – weiterhin offen.
- Eigenes Sichtbarkeitsfeld für Release-Versionen (veröffentlicht/intern) – existiert nicht; wäre eigene Phase.

### Reviewed Todos (not folded)
- `no-restricted-syntax Legacy-Datei-Migration` – nur Stichwort-Treffer, eigener Migrationsstrang.
- `Contributor owned media and note edit delete`, `Dynamischer Kontext-Text auf InviteAcceptFlow` – fachfremd.

</deferred>

---

*Phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern*
*Context gathered: 2026-09-17*

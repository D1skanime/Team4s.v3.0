# Phase 164: Öffentliche Anime-Seite: Episode-/Release-UI, performantes Public Read-Model und Infinite Scroll - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning
**Source:** 164-USER-REQUEST.md (fachlich vollständig entschieden, nicht erneut diskutiert)

<domain>
## Phase Boundary

Die Episoden-/Release-Darstellung auf `/anime/[id]` wird modernisiert:
- Episode-Cards erhalten einen glasigen Look mit subtilem Tint nach Filler-/Canon-Klassifikation
  (Haupthandlung/Filler/Gemischt/Rückblick/Unknown), Episodentyp bleibt farblich neutral.
- Aufgeklappte Episoden zeigen kompakte, gruppenzentrierte Release-Vorschauen (Gruppe zuerst, Technik
  als dezenter Text, kein Chip/Badge-Look, kein Klick auf die ganze Card, expliziter „Zum Release →“-Button).
- Das bestehende Public-Read-Model (`publicEpisodeQuery` / `ListPublicGroupedByAnimeID`, Phase 163) wird um
  Gruppen/Logos/has_images/has_notes/has_karaoke erweitert, ohne N+1 und ohne schwere Detaildaten.
- Die Episodenliste wechselt von „Weitere laden“ auf Infinite Scroll mit begrenztem bidirektionalem Fenster
  (alte Pages können aus dem DOM entfernt und bei Rückwärtsscrollen wiederhergestellt werden), stabiler
  Scrollposition, und bleibt filterkonsistent mit dem in Phase 163 gebauten serverseitigen Gruppenfilter
  (Cursor-Scope, `episode_count`).

Verbindlicher Auftrag: `164-USER-REQUEST.md` (§1–§53). Diese Phase ist **Planung ohne Ausführung** — der
Auftraggeber muss die fertigen Pläne freigeben, bevor irgendein Plan ausgeführt wird.

**Scopegrenze (aus Auftrag §Kopf/§19/§33):** keine Episode-Detailseite, kein Details-Dropdown auf der
Anime-Seite, keine Screenshots/Rich-Text/Segmentdetails in der Preview, keine neue Filler-/Canon-
Klassifikationsheuristik, keine neue Virtualization-Library ohne Nachweis (erst vorhandene Dependencies/DOM-
Kosten prüfen), keine Datenänderung an `team4s_v2` durch Agenten, keine erneute Produktdiskussion, keine
alternativen UX-Konzepte, keine automatische Ausführung der Pläne.

</domain>

<decisions>
## Implementation Decisions

Alle folgenden Punkte sind aus `164-USER-REQUEST.md` übernommen und **gesperrt** (nicht erneut zur
Diskussion stellen). Referenzparagraphen in Klammern.

### Episode-Darstellung (§2–§8)
- **D-01:** Episoden bleiben aufklappbar (kein Redesign des Grundprinzips, keine separate Detailseite).
- **D-02:** Sichtbare Episodendaten mindestens: Episodennummer, Episodentitel, Filler-/Canon-Klassifikation,
  Episodentyp, Anzahl sichtbarer Release-Versionen. Typografie/Anordnung aus bestehendem Team4s-Design ableiten.
- **D-03:** Filler-/Canon-Werte (canon, filler, mixed, recap, unknown) und deren öffentliche Bezeichnungen
  (Haupthandlung, Filler, Gemischt, Rückblick, neutral) sind fix — keine neue Heuristik.
- **D-04:** Episodentyp (episode, special, ova, ona, movie, recap, preview, prologue, epilogue, bonus) ist eine
  zweite, unabhängige Dimension und muss zusätzlich sichtbar sein (z. B. „Filler · Episode“).
- **D-05:** Glasiger Episodenstil ersetzt die weißen Cards: halbtransparente Flächen, Anime-Hintergrund leicht
  sichtbar, weiche Border, dezenter Blur, ruhige Typografie — kein Neon, keine massiven weißen Flächen. Tint
  pro Klassifikation: Haupthandlung bläulich, Filler rötlich, Gemischt violett, Rückblick amber/gelb, Unknown
  neutrales Glas — **nur subtil**, keine kräftigen vollflächigen Farben.
- **D-06:** Farbe ist ausschließlich der Klassifikations-Kanal; der Episodentyp bekommt keine eigene Farbe.
- **D-07:** Geöffnete Episode bleibt visuell übergeordnet; Releases erscheinen als kompakte neutrale glassige
  Unterelemente, keine zweite große weiße Kartenwelt.

### Release-Vorschau (§9–§20)
- **D-08:** Pro Release sichtbar: Fansub-Gruppe(n), Gruppenlogo(s) falls vorhanden, Release-Version/Label falls
  gepflegt, Auflösung, Container, Video-Codec, Softsub/Hardsub, Release-Datum falls gepflegt, Hinweise auf
  zusätzliche Inhalte (Bilder/Notizen/Karaoke), Button „Zum Release →“.
- **D-09:** Gruppe ist die primäre Information — visuell zuerst, vor den technischen Daten
  (`[Logo] AnimeOwnage` / `1080p · MKV · x264 · Softsub`, nicht umgekehrt).
- **D-10:** Gruppenlogo nur wenn im Bestand vorhanden (bestehende Logo-Datenstruktur wiederverwenden, keine neue
  parallele Struktur); ohne Logo nur Gruppenname, kein Dummy-Icon, kein leerer Platzhalter.
- **D-11:** Coop: alle beteiligten Gruppenlogos + -namen anzeigen plus kleine COOP-Kennzeichnung; keine
  Primärgruppe erfinden (konsistent mit Phase-163-Datenmodell — Coop-Versionen gehören allen beteiligten Gruppen).
- **D-12:** Technische Eckdaten (Auflösung, Container, Video-Codec, Softsub/Hardsub) ausdrücklich **nicht** als
  Chips/Badges — dezenter Fließtext mit `·`-Trennung, kleinere Schrift, dezente Farbe, keine Pills/Rahmen.
- **D-13:** NICHT direkt auf der Anime-Seite anzeigen: Audio-Codec, Dateigröße, CRC32, Dauer, Provider, Media-IDs,
  Produktionsbeginn/-ende, interne IDs, technische Vollmetadaten — gehören auf die (nicht in dieser Phase gebaute)
  Release-Seite.
- **D-14:** Release-Datum nur wenn gepflegt, Format „Veröffentlicht am DD.MM.YYYY“; fehlt es, Zeile vollständig
  weglassen (kein „Unbekannt“, kein Platzhalter, keine leere Höhe).
- **D-15:** Zusatzinhalte-Hinweise (📷 Bilder, 📝 Notizen, ♪ Karaoke) nur als dezenter Text mit Symbol, nur wenn
  vorhanden; Counts nur wenn praktisch kostenlos (sonst reine Boolean-Flags) — keine teuren Zusatzqueries nur für
  Counts.
- **D-16:** Episoden selbst haben keine Bilder; auf der Anime-Seite werden keine Screenshots/Thumbnails geladen,
  nur der Text „📷 Bilder“ (Boolean `has_images`). Tatsächliche Screenshots erst auf der Release-Seite.
- **D-17:** Die gesamte Release-Card ist nicht klickbar; expliziter Button „Zum Release →“, Desktop/Breitbild
  rechts in der Card, Mobile bei Platzmangel unter die Metadaten verschoben.
- **D-18:** Kein zusätzliches „Details ▾“-Dropdown auf der Anime-Seite — sie bleibt reine Preview.
- **D-19:** Kein Play-Button-zentriertes Design; Team4s ist kein Streaming-Frontend. Falls später eine
  Stream-Berechtigung greift, ist ein Stream-Button nur ein Nebenelement, kein zentrales Designmerkmal dieser
  Phase.

### Mobile First (§21)
- **D-20:** Planungs-/Umsetzungsreihenfolge zwingend Mobile → Tablet → Desktop → Breitbild. Mobile: kein
  horizontaler Overflow, lesbarer Gruppenname, umbrechende Technik-/Extras-Zeilen, ausreichend große Touch-Fläche
  für den Button, variable Card-Höhe erlaubt, keine gequetschten Logos. Tablet: erste horizontale Verdichtung.
  Desktop/Breitbild: linke Hauptspalte (Gruppe/Technik/Extras/Datum) + rechte Aktionsspalte, geringe vertikale
  Höhe.

### Public Read-Model / Performance (§22–§27)
- **D-21:** Bestehende Public-Projektion (Phase 163: `publicEpisodeQuery`, `PublicEpisodeOptions`,
  `ListPublicGroupedByAnimeID`) wird **erweitert**, nicht durch eine parallele Domain-Struktur ersetzt.
  Sinngemäß benötigte Form — tatsächliche Typ-/Feldnamen aus dem Code übernehmen, keine Erfindung:
  - `EpisodePreview`: id, number, title, filler_type, episode_type, visible_version_count, versions[]
  - `ReleasePreview`: id, release_version/label, fansub_groups[] (id, name, slug, logo), resolution, container,
    video_codec, subtitle_type, release_date, has_images, has_notes, has_karaoke, stabile öffentliche
    Release-Route/-Kennung.
- **D-22:** Vor der Planung ist der aktuelle Datenfluss zu messen (nicht zu schätzen): Public Anime-Endpoint,
  Episode-Endpoint, Repository-Queries, Release-Version-Auflösung, Gruppenauflösung, Logos, Assets, Notes,
  Karaoke/Segmente, Public Visibility, aktuelle Pagination, Frontend-State, aktuelle DOM-Struktur — SQL-Anzahl,
  API-Requests, Response-Größe, eager/lazy Ladeverhalten.
- **D-23 (kein N+1):** Verboten: Episode→Releases-Query, pro Release→Gruppen-Query, pro Gruppe→Logo-Query, pro
  Release→Bilder/Notes/Karaoke-Query. Ziel: Query-Anzahl weitgehend konstant pro Page-Request (2–6 saubere
  Queries akzeptabel), keine erzwungene Monsterquery auf Kosten der Wartbarkeit.
- **D-24:** `has_images`/`has_notes`/`has_karaoke` batched auflösen (EXISTS/aggregierte Query/Batch über
  sichtbare `release_version_id`s/vorhandene Resolver) — keine Einzelquery pro Release.
- **D-25:** Gruppen/Logos gesammelt auflösen (keine Einzelanfrage pro Gruppe), Coop korrekt aggregiert.
- **D-26:** Preview-Response enthält keine schweren Detaildaten (volle Rich-Text-Notizen, Screenshots,
  Segmentdetails, Karaoke-Detailinhalte, technische Vollmetadaten, vollständige Fansub-Profile).

### Infinite Scroll / Windowing (§28–§40)
- **D-27:** Infinite Scroll statt „Mehr anzeigen“/„Nächste Seite“; nächste Page lädt automatisch beim Nähern ans
  Ende der aktuell geladenen Page (Beispiel: geladen 1–24, Nutzer nähert sich 20–24 → 25–48 laden).
- **D-28:** Kein aggressives Prefetching — nur die unmittelbar nächste benötigte Page, keine stillen Requests für
  weitere Seiten beim Initial Load.
- **D-29:** Page Size aus aktuellem Code/Messungen ableiten (Erwartungsbereich ca. 20–24, nicht blind
  festschreiben, wenn Messung etwas anderes nahelegt — aktuell `limit: 24` in `page.tsx`, Planer verifiziert und
  begründet ggf. Abweichung).
- **D-30 (Bounded Window):** Kein append-only-Wachstum auf alle 220 Episoden; begrenztes aktives Fenster, weit
  entfernte ältere Pages dürfen aus dem aktiven DOM entfernt werden.
- **D-31 (Rückwärts Lazy Loading):** Beim Zurückscrollen nach Entfernen früherer Pages werden diese automatisch
  wieder bereitgestellt (Beispiel: aktiv 49–96 → hoch zu 25–48 → weiter hoch zu 1–24).
- **D-32 (Windowing-Strategie):** Planer wählt auf Basis des aktuellen Frontends zwischen klassischer Pagination,
  bidirektionalem Infinite Loading, bounded Page Window, Virtualisierung oder Kombination Cursor-Pagination +
  Windowing. Keine neue Virtualization-Library ohne vorherigen Nachweis, dass vorhandene Dependencies/DOM-Kosten/
  Card-Struktur dafür sprechen — kleinstmögliche robuste Lösung.
- **D-33 (Client-Cache):** Kleiner begrenzter Cache erlaubt (z. B. aktuelle/vorherige/nächste Page oder kleiner
  LRU), kein unbegrenzter Cache aller 220 Episoden; Cache-Größe/Eviction muss der Plan begründen.
- **D-34 (Scroll-Stabilität):** Entfernen/Wiedereinfügen alter Pages, Episode öffnen/schließen, Höhenänderung der
  Release-Liste, mobile variable Card-Höhe — jeweils ohne sichtbare Sprünge. Plan muss konkrete Technik nennen
  (Spacer, gemessene Page-Höhen, Anchor-Element, vorhandene Virtualization-Mechanismen, Browser Scroll Anchoring)
  — keine vage Aussage.
- **D-35 (Ladetrigger):** Bevorzugt IntersectionObserver mit Sentinel am unteren Ende, kein Scroll-Event-Polling;
  für Rückwärtsladen oberer Sentinel bzw. äquivalente Windowing-Logik.
- **D-36 (Loading UI):** Dezenter Skeleton-/Loader-Bereich am Listenende/-anfang; kein Fullscreen-Spinner, keine
  Sperre bereits sichtbarer Episoden.
- **D-37 (Fehler beim Nachladen):** Bereits geladene Episoden bleiben sichtbar; kompakter Fehlerzustand am
  betroffenen Ende mit „Weitere Episoden konnten nicht geladen werden. [ Erneut versuchen ]“ — kein
  Komplettseitenfehler.
- **D-38 (Ende der Liste):** Keine weitere Page → kein weiterer Request; optionale, sehr dezente Endemarkierung.
- **D-39 (Geöffnete Episoden + Windowing):** Plan muss Zusammenspiel von Open-State, Höhenänderungen, Scroll
  Anchoring und Wiederherstellung beim Zurückladen konkret klären; bestehenden State-Ansatz analysieren, klären
  ob geöffneter Zustand über Windowing hinweg erhalten bleibt.

### Filter-/Cursor-Integration (§41–§43, Aufbau auf Phase 163)
- **D-40:** Infinite Scroll muss vollständig mit dem in Phase 163 gebauten serverseitigen Gruppenfilter
  zusammenspielen. Bei Filterwechsel: laufende Requests abbrechen/ignorieren, aktives Window leeren, Cursor
  zurücksetzen, alten Filter-Cache nicht unkontrolliert weiterverwenden, erste Page des neuen Resultsets laden,
  Scrollposition auf Listenanfang setzen — keine Vermischung alter/neuer Resultate.
- **D-41:** Serverseitige Filterung bleibt bestehen (Phase 163) — Pagination arbeitet auf dem gefilterten
  Resultset, kein Client-seitiges Nachfiltern.
- **D-42:** Cursor-Scope aus Phase 163 (Cursor ist an den aktiven Filter gebunden) muss mit dem neuen
  Windowing/Infinite-Scroll-Zustand konsistent bleiben.

### Request-Verhalten, Back/Forward, Mobile, Gates (§44–§49)
- **D-43:** Aufklappen einer bereits geladenen Episode erzeugt idealerweise 0 zusätzliche API-Requests — Release-
  Previewdaten (inkl. Gruppen, Logos, has_images/has_notes/has_karaoke) müssen bereits im Page-Response
  enthalten sein.
- **D-44:** Plan muss Browser-History/Back-Forward und Rückkehr von der Release-Seite behandeln: möglichst
  aktiven Gruppenfilter, ungefähre Scrollposition und relevante Page(s) wiederherstellen, ohne unbegrenzte
  Persistenz zu erzwingen — vorhandene Next.js-/Browser-Mechanismen nutzen.
- **D-45:** Mobile Performance ist explizit zu bewerten: DOM-Nodes, React-Component-Count, Hydration, große
  Listen, viele Glass-Effekte/`backdrop-filter`, mehrere geöffnete Episoden — Glassmorphism darf nicht hunderte
  GPU-intensive Blur-Flächen dauerhaft rendern; Plan bewertet CSS-Kosten konkret.
- **D-46 (Performance-Gates, mindestens die 12 aus §47):**
  1. Initial Load lädt nur erste Episode-Page.
  2. Keine weiteren Episode-Pages werden vorab geladen.
  3. Nächste Page erst bei Scroll-Bedarf.
  4. Query-Anzahl wächst nicht linear mit Episodenanzahl.
  5. Episode-Aufklappen erzeugt keinen Request-Wasserfall.
  6. DOM wächst nicht unbegrenzt.
  7. Frühere Pages können beim Zurückscrollen wieder erscheinen.
  8. Scrollposition bleibt stabil.
  9. Gruppenfilter + Cursor bleiben konsistent.
  10. Response enthält keine schweren Release-Detaildaten.
  11. Mobile bleibt performant.
  12. Keine Race Conditions bei schnellem Scrollen/Filterwechsel.
  Jedes Gate muss im Plan konkret/verifizierbar sein (Testfall, Messmethode oder Codeassertion), nicht nur
  benannt.

### Referenzfall und Testfälle (§48–§49)
- **D-47:** Naruto (`anime_id=4`, 220 Episoden, Releases nur Folge 1–5, Folge 5 Coop) ist der primäre
  Last-/UAT-Fall; der in §48 beschriebene Testablauf ist die Blaupause für Performance-Gates/UAT-Pläne.
- **D-48:** Mindestens folgende visuelle Testfälle müssen geplant sein: alle 5 Filler-Klassifikationen, alle 4+
  genannten Episodentypen (Episode/Special/OVA/Movie), Release mit/ohne Logo, mit/ohne Datum, mit
  Bildern/Notizen/Karaoke, ohne Extras, Coop, mehrere Releases in einer Episode.

### Claude's Discretion (aus §33/§50/§51, dem Planer explizit überlassen)
- Konkrete Windowing-Implementierung (bounded window vs. Kombination mit Virtualisierung), solange keine neue
  Virtualization-Library ohne Nachweis eingeführt wird.
- Konkrete Cache-Größe/-Eviction-Strategie (nur Vorgabe: klein, begrenzt, begründet).
- Exakte Aufteilung der Phase in Pläne/Wellen (§51 nennt mögliche Themenblöcke: Public Read Projection,
  Repository/Query Optimization, Release Preview Aggregation, Pagination/Cursor, Infinite Scroll, Bidirectional
  Windowing, Episode Glass UI, Release Preview UI, Responsive Mobile→Breitbild, Browser/Performance-UAT) — die
  tatsächliche Aufteilung muss aus dem Codebefund (RESEARCH.md) abgeleitet werden, nicht blind aus dieser Liste
  übernommen.
- Exakte SQL-/Resolver-Umsetzung für D-24/D-25 (EXISTS vs. aggregierte Subquery vs. Batch-Resolver), solange das
  Query-Budget aus D-23 eingehalten und gemessen belegt wird.
- Exakte Scroll-Anchoring-Technik (D-34), solange konkret und nicht vage.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUSSEN diese vor Recherche/Planung lesen.**

### Auftrag und Vorphasen
- `.planning/phases/164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll/164-USER-REQUEST.md`
  — verbindlicher Auftrag §1–§53, Performance-Gates, Abschlussbericht-Inhalt (§53)
- `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/163-CONTEXT.md` — D-01..D-19,
  bestehendes Public-Read-Model, Cursor-Format v2, Filter-Slug-Auflösung
- `.planning/phases/163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern/163-VERIFICATION.md` —
  bestätigter Live-Zustand nach Phase 163 (Naruto: 220 Episoden, Releases nur Folge 1–5, Folge 5 Coop,
  Query-Budget 2–3 Statements, Cursor-Scope-Verhalten, Gruppenwechsel-Dimm-Logik)
- `.planning/phases/162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation/162-CONTEXT.md`
  — URL-Zustand `?fansub=<slug>`, pushState statt Router-Refetch
- `.planning/phases/162-oeffentliche-anime-seite-fansub-gruppenauswahl-kurzgeschichte-navigation/162-UI-SPEC.md`
  — bestehendes Token-Set (`--surface-card`, `--surface-sunken`, `--border-subtle`, `--border-strong`,
  `--text-primary`, `--text-muted`, `--accent-primary`, `--focus-ring`), Primitive-Konventionen
  (`Button`-basierte Chips statt neuer Primitive), Beispiel für „closest analog“-Vorgehen
- `.planning/phases/160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g/160-CONTEXT.md` — Herkunft
  des WCAG-AA-Token-Sets, bestehende Anime-Seiten-Konventionen
- `CLAUDE.md` — UI-Primitives-Pflicht, Design-Tokens, Umlaute-Pflicht, 450-Zeilen-Limit, Sprachqualität

### Code — Backend (Ausgangspunkt für RESEARCH.md, nicht abschließend)
- `backend/internal/repository/episode_version_public_query.go` — `publicEpisodeQuery`, `PublicEpisodeOptions`,
  Cursor v2, `ListPublicGroupedByAnimeID` (Phase 163, hier zu erweitern statt zu ersetzen)
- `backend/internal/repository/episode_version_public_integration_test.go`,
  `backend/internal/repository/episode_version_public_group_filter_test.go` — bestehende Integrationstests/Budget-
  Assertions der Public-Projektion
- `backend/internal/handlers/episode_version_reads.go` — `ListGroupedEpisodes`, Strict-Query-Allowlist
- `backend/internal/models/episode_version.go` — bestehende Public-DTOs (`PublicGroupedEpisodesData`, etc.)
- `backend/internal/repository/fansub_repository.go` — Gruppen-/Logo-Auflösung (`ResolveFansubGroupIDForAnime`
  u. a.), Kandidat für Batch-Gruppen-/Logo-Resolver
- `shared/contracts/openapi.yaml` — bestehender Public-Episoden-Vertrag (zu erweitern)

### Code — Frontend (Ausgangspunkt für RESEARCH.md, nicht abschließend)
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (+ `.module.css`, + Tests) — aktuelle Episodenliste,
  `loadMore`, `mergeEpisodes`, AbortController-Muster, Gruppenwechsel-Refetch (Phase 163)
- `frontend/src/app/anime/[id]/page.tsx` (+ `page.module.css`, `animeDetailData.ts`) — SSR-Fetch, aktuelle
  `limit: 24`-Pagination, Fallback-Verhalten
- `frontend/src/lib/api.ts` — `getGroupedEpisodes`
- `frontend/src/types/episodeVersion.ts` — bestehende Public-TS-Typen
- `frontend/src/components/ui/` — globale Primitives (Referenz `/dev/ui-system`)

### Live-Instanz (für Messungen in RESEARCH.md)
- Backend: `http://127.0.0.1:18092` (Compose-Service `team4sv30-backend`, Health bestätigt `200 ok`)
- Frontend: `http://127.0.0.1:3000` (Compose-Service `team4sv30-frontend`, bestätigt `200`)
- DB: `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2` (nur lesend, siehe Deferred/Sicherheits-
  hinweis unten)
- Browser-UAT/Login: `http://127.0.0.1:3300` (SSH-Tunnel, wie in bisherigen Phasen)
- Referenzfall: Naruto = `anime_id 4`, 220 Episoden, Releases nur Folge 1–5, Folge 5 Coop (bestätigt in
  163-VERIFICATION.md)

</canonical_refs>

<specifics>
## Specific Ideas

- Diese Phase ist reine Planung. Der Planer muss messen statt schätzen: SQL-Anzahl, `EXPLAIN`, tatsächliche
  API-Response-Größe und Requestanzahl gegen die laufende Instanz belegen, bevor Query-/Resolver-Entscheidungen
  getroffen werden.
- Der Plan-Checker muss die Punkte aus §52 hart prüfen (N+1, Query-Wachstum, Prefetching, Response-Größe,
  unbegrenzter Client-State/DOM, Scroll-Sprünge, Rückwärtsladen, Filterwechsel, Cursor-Scope, Race Conditions,
  Mobile-Performance, Blur-/GPU-Kosten, Episode-Open-State, Back/Forward) und vage Stellen an den Planer
  zurückgeben statt sie durchzuwinken.
- UI-SPEC.md ist Pflicht (Phase ist stark visuell, analog zu Phase 162) und muss vor der finalen Planung stehen.

</specifics>

<deferred>
## Deferred Ideas

- Episode-Detailseite, Details-Dropdown auf der Anime-Seite, Screenshots/Rich-Text/Segmentdetails in der
  Preview, neue Klassifikationsheuristik, neue Virtualization-Library ohne Nachweis — alle explizit außerhalb
  dieser Phase (§Kopf/§19/§33).
- Vollständige Release-Detailseite (technische Vollmetadaten, Audio-Codec, Dateigröße, CRC32, Provider,
  Media-IDs etc.) — wird in einer künftigen Phase behandelt, hier nur als „nicht anzeigen“-Grenze relevant.
- Stream-Button/Berechtigungslogik als zentrales Designmerkmal — nur als Randnotiz erwähnt (§20), keine
  Umsetzung in dieser Phase.

### Sicherheits-/Datenhinweis
- Keine Datenänderungen an `team4s_v2` durch Agenten in dieser Phase; alle Messungen sind lesende Operationen
  (`SELECT`, `EXPLAIN`, `curl GET`). Etwaige Testdaten/Fixtures für automatisierte Tests laufen ausschließlich
  gegen eine separate Test-DB (Muster: `team4s_phase117_test_163` aus Phase 163), niemals gegen `team4s_v2`.

</deferred>

---

*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Context gathered: 2026-09-17*

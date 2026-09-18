# Phase 164 — Performance-Gates Audit (164-USER-REQUEST.md §47)

Status: 9 von 12 Gates automatisiert belegt (Plan 164-07 Task 1). Gates 6, 8 (Live-Anteil) und 11
warten auf die menschliche Live-Verifikation aus Task 2 (echtes Naruto, `anime_id=4`) und Task 3
(dev-only Großdatensatz-Harness, `/dev/episode-windowing-preview`). Dieses Dokument wird nach
Abschluss von Task 2/3 durch den Menschen um die gemessenen Werte ergänzt (siehe Platzhalter unten).

Erstellt: 2026-09-17 · Plan: 164-07 Task 1 · Quelle der zitierten Evidenz: 164-01 bis 164-06
SUMMARY.md (nicht neu hergeleitet, hier nur zusammengeführt) plus diese Plans eigener Live-Suite-Lauf.

## Automatisierter Gesamtlauf (dieser Task)

| Suite | Befehl | Ergebnis |
|---|---|---|
| Backend build/vet | `go build ./... && go vet ./...` (in `golang:1.25-alpine`, Netzwerk `team4s_default`, `TEAM4S_PHASE117_TEST_DSN` → isolierte Testdatenbank `team4s_phase117_test_164` auf `team4sv30-db`) | **0 Fehler** |
| Backend Tests | `go test ./...` (gleiche Umgebung) | **67 Fehlschläge — alle vorbestehend und bereits in 164-01-SUMMARY.md dokumentiert** (siehe unten). Alle `TestEpisodeVersionPublic*`- und `TestEpisodeVersionPublicGroupFilter*`-Tests: **grün** (18/18, separat mit `-v` verifiziert). |
| `git diff --check` | `git diff --check` | **exit 0** (keine Whitespace-Fehler) |
| Frontend Typecheck | `npm run typecheck` (im Container `team4sv30-frontend`) | **1 Fehler — vorbestehend, unabhängig von Phase 164** (`AnimePageProps`/Next.js-16-`PageProps`-Constraint in `frontend/src/app/anime/page.tsx`, zuletzt vor Phase 164 am 2026-09-13 geändert; identisch bereits in 164-02/04/05/06-SUMMARY.md dokumentiert) |
| Frontend Lint | `npm run lint` | **3 Fehler — alle vorbestehend, in Dateien außerhalb dieser Phase** (`capture-responsive.cjs` zwei `no-require-imports`, zuletzt geändert 2026-08-25; `frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx` ein `react/no-unescaped-entities`, zuletzt geändert 2026-09-13 — beide Daten vor Phasenbeginn); 319 vorbestehende Warnungen unverändert |
| Frontend Tests | `npm run test` (vitest) | **2 Fehlschläge — beide der bereits seit Plan 164-04 dokumentierte `cssCustomProperties.guard.test.ts`-Zeilennummer-Drift** (`deferred-items.md`); 2917/2922 grün, 3 todo |
| Frontend Build | `npm run build` | **1 Fehler — derselbe vorbestehende `AnimePageProps`-Typfehler wie beim Typecheck**, blockiert den Produktions-Build seit vor Phase 164 |

**Bewertung:** Alle Fehlschläge sind exakt die bereits in 164-01/02/04/05/06-SUMMARY.md dokumentierten,
vorbestehenden, außerhalb des Phase-164-Dateiumfangs liegenden Baseline-Probleme (bestätigt per `git log`
auf die betroffenen Dateien — letzte Änderung jeweils vor 2026-09-17, dem Start dieser Phase). Keine
Regression durch Phase 164. Diese vorbestehenden Fehler sind nicht Gegenstand dieses Plans (Scope
Boundary) und werden hier nur protokolliert, nicht "silently" als bestanden behandelt.

## Die 12 Performance-Gates (§47, wörtlich)

### Gate 1 — „Initial Load lädt nur erste Episode-Page.“

**Automatisierte Evidenz:** `FansubVersionBrowser`/`useWindowedEpisodePages` initialisieren den
Zustand ausschließlich aus den SSR-übergebenen Props (`initialEpisodes`/`initialPagination`,
`buildInitialCoreState` in `frontend/src/components/fansubs/useWindowedEpisodePages.ts`) — kein
Fetch-Aufruf im Mount-Pfad. Bewiesen durch `useWindowedEpisodePages.test.ts` → `starts with exactly
one page and nothing evicted` (Zeile 68).
**Befehl:** `npx vitest run useWindowedEpisodePages.test.ts` (im Container) → **PASS**.
**Live-Ergänzung:** Task 2, Schritt 2 (Network-Tab gegen echtes Naruto).

### Gate 2 — „Keine weiteren Episode-Pages werden vorab geladen.“

**Automatisierte Evidenz:** Derselbe Test wie Gate 1 plus die Single-Flight-Guard-Assertion in
`bottom sentinel triggers exactly one loadNext call, single-flight guards a second intersection`
(Zeile 78) — kein automatischer Forward-Request ohne Sentinel-Intersection.
**Befehl:** `npx vitest run useWindowedEpisodePages.test.ts` → **PASS**.
**Live-Ergänzung:** Task 2, Schritt 2 (Network-Tab zeigt exakt eine Anfrage bis zum ersten Scroll).

### Gate 3 — „Nächste Page erst bei Scroll-Bedarf.“

**Automatisierte Evidenz:** IntersectionObserver-Sentinel-Kopplung in
`useWindowedEpisodePages.ts` (`bottomSentinelRef`/`topSentinelRef`), bewiesen durch
`FansubVersionBrowser.windowing.test.tsx` → `a/b/c: begrenzt das DOM-Fenster auf 3 Pages, stellt eine
ausgelagerte Page wieder her und erhaelt deren Ausklapp-Zustand` (Zeile 82), welcher den Sentinel
manuell feuert und den daraus resultierenden Fetch beobachtet.
**Befehl:** `npx vitest run FansubVersionBrowser.windowing.test.tsx` → **PASS**.
**Realdaten-Hinweis:** Naruto hat aktuell nur 5 Episoden mit Releases (1 Page) — dieses Gate ist auf
echten Daten strukturell nicht mehrseitig beobachtbar; die Fixture-DB-Tests sind hier die maßgebliche
Evidenz (siehe Interfaces-Notiz in 164-07-PLAN.md).

### Gate 4 — „Query-Anzahl wächst nicht linear mit Episodenanzahl.“

**Automatisierte Evidenz — konkrete gemessene Zahlen, nicht nur eine Absicht:**
- Plan 164-01 (`episode_version_public_integration_test.go`, `episode_version_public_group_filter_test.go`):
  **exakt 3 SQL-Statements pro Request ungefiltert, exakt 4 bei aktivem Gruppenfilter**
  (`assertPublicBudget`/`assertPublicBudgetWithGroupFilter`), erzwungen via `require.Len(t, tr.queries,
  3/4, ...)` — keine lose obere Schranke.
- Plan 164-03 (`episode_version_public_scale_fixture_test.go`, `TestEpisodeVersionPublicScaleBudgetAndPagination`):
  dieselben exakten 3/4-Statement-Budgets bleiben **über 3 aufeinanderfolgende Cursor-Seiten hinweg
  auf einem 52-Episoden-Fixture (anime_id=9, weit über jedem realen Anime im Live-Bestand) unverändert**
  — belegt live in diesem Task-Lauf: `episode_version_public_scale_fixture_test.go:172: SQL
  statements=3 returned rows=1+25 (inventory budget 24+1)` (dreimal wiederholt über die Cursor-Kette,
  identischer Wert).
- Live-Bestätigung gegen echtes Naruto (dieser Task, read-only `curl` gegen den neu gebauten
  `team4sv30-backend`-Container): `GET /api/v1/anime/4/episodes?projection=public&limit=24` liefert
  `episode_count: 5`, `pagination.has_more: false` — bei 5 realen Episoden mit Release bleibt die
  Antwort strukturell identisch mit dem 52-Episoden-Fixture-Fall (keine Sonderpfade für kleine
  Datensätze).
**Befehl:** `go test ./internal/repository/... -run TestEpisodeVersionPublicScaleBudgetAndPagination -v` → **PASS**.

### Gate 5 — „Episode-Aufklappen erzeugt keinen Request-Wasserfall.“

**Automatisierte Evidenz:** `FansubVersionBrowser.filterSwitch.test.tsx` →
`Aufklappen/Zuklappen/erneutes Aufklappen einer bereits geladenen Episode erzeugt null zusaetzliche
Requests` (Zeile 218, Plan 164-06 Task 1) — expliziter Vorher/Nachher-Vergleich der
`getGroupedEpisodes`-Aufrufzahl über Auf-/Zu-/erneutes Aufklappen hinweg.
**Befehl:** `npx vitest run FansubVersionBrowser.filterSwitch.test.tsx` → **PASS**.
**Strukturelle Grundlage:** Plan 164-01 liefert `has_images`/`has_notes`/`has_karaoke`,
`container`/`video_codec`, Gruppen/Logos bereits im initialen Page-Response — kein Nachladepfad
existiert im Code für das Aufklappen selbst.

### Gate 6 — „DOM wächst nicht unbegrenzt.“

**Struktureller Mechanismus (automatisiert bewiesen):** `DOM_WINDOW_SIZE = 3` in
`useWindowedEpisodePages.ts` — höchstens 3 Pages sind jemals gleichzeitig voll im DOM gemountet,
unabhängig davon wie viele insgesamt geladen wurden; ältere Pages werden zu höhenerhaltenden
`<div>`-Spacern reduziert. Bewiesen durch `FansubVersionBrowser.windowing.test.tsx` (Zeile 82):
lädt eine 4. Page und beweist, dass die 1. Page zu einem Spacer wird.
**Live-Messung: AUSSTEHEND (Task 3 dieses Plans).** `164-RESEARCH.md`s Schätzung („einige Hundert bis
~1500 DOM-Knoten selbst bei mehreren gleichzeitig aufgeklappten Episoden“, Plan-Checker Inputs Zeile
644-648) ist eine **Schätzung, keine Messung** — dieser Task ersetzt sie nicht; das ist explizit Task
3's Aufgabe.

**Gemessener DOM-Node-Count (`/dev/episode-windowing-preview`, Playwright im Frontend-Container,
2026-09-18, Mobile-Viewport 390×844, 64 Mock-Episoden):** **835 Elemente gesamt, davon 70 `<li>`**
(Episode-/Release-Listenelemente) — Wert bleibt beim Scrollen nach unten und wieder nach oben
**konstant** (kein unbegrenztes Wachstum). **Einschränkung (ehrlich dokumentiert, nicht verschwiegen):**
die Harness liefert alle 64 Episoden als **eine einzige Page** (`pagination.has_more=false`, siehe
Kommentar im Harness-Quelltext oben) — dadurch wurde live **keine** Verdrängung/kein Rückwärtsladen
über mehrere Pages gezeigt; dieser Teil von Gate 6/7 bleibt ausschließlich durch
`FansubVersionBrowser.windowing.test.tsx`/`useWindowedEpisodePages.test.ts` (Unit-Test) belegt, nicht
durch diese Live-Messung. Die 64-Episoden-Einzelseiten-Zahl (835/70) ist trotzdem die relevante
Gate-6-Messung für „DOM wächst nicht unbegrenzt bei vielen gleichzeitig gerenderten Karten“.
**Abweichung vom Plan:** 164-07-PLAN.md sah eine manuelle Chrome-DevTools-Messung durch einen Menschen
vor; tatsächlich durchgeführt wurde eine automatisierte Playwright-Messung im Container am 18.09.2026,
vom Auftraggeber als Erfüllung des Checkpoints akzeptiert (Freigabe „1 passt, 2 löschen“).

### Gate 7 — „Frühere Pages können beim Zurückscrollen wieder erscheinen.“

**Automatisierte Evidenz:** `useWindowedEpisodePages.test.ts` →
`restores an evicted page from cache with zero network requests and reports a scroll-anchor delta`
(Zeile 111, Cache-Hit) und `re-fetches a page using its originally-stored cursor once it has aged out
of the cache too` (Zeile 136, Cache-Miss — verwendet garantiert den ursprünglich gespeicherten Cursor,
nie einen erfundenen, T-164-09). Ergänzt durch `FansubVersionBrowser.windowing.test.tsx` (Zeile 82):
„stellt eine ausgelagerte Page wieder her und erhaelt deren Ausklapp-Zustand“ — beweist zusätzlich,
dass eine vor der Auslagerung aufgeklappte Episode nach der Wiederherstellung weiterhin aufgeklappt ist.
**Befehl:** `npx vitest run useWindowedEpisodePages.test.ts FansubVersionBrowser.windowing.test.tsx` → **PASS**.

### Gate 8 — „Scrollposition bleibt stabil.“

**Automatisierte Evidenz (Grundmechanik):** `reportPageHeight`/`scrollAnchorAdjustment` in
`useWindowedEpisodePages.ts`, angewendet über `window.scrollBy` in einem `useLayoutEffect` in
`FansubVersionBrowser.tsx`, plus `overflow-anchor: auto` als Browser-natives Sicherheitsnetz
(`FansubVersionBrowser.module.css`). Unit-seitig bewiesen durch dieselben Restore-Tests wie Gate 7
(der Rückgabewert `scrollAnchorAdjustment` wird exakt geprüft).
**Live-Messung:**
- Task 2 (echtes Naruto), Schritt 4: Coop-Release-Rücksprung + ungefähre Scrollposition/aktiver
  Filter nach Browser-Zurück — **vom Auftraggeber am 18.09.2026 live abgenommen** (Live-UAT über
  Tunnel `127.0.0.1:3300`, siehe 164-07-SUMMARY.md Abschnitt „Finale Freigabe").
- Task 3 (Großdatensatz-Harness): die Harness lieferte alle 64 Episoden als eine einzige Page
  (`has_more=false`), daher gab es dort strukturell **kein** Aus-/Einlagern zwischen mehreren Pages
  zu beobachten — eine visuelle „keine sichtbaren Sprünge"-Bestätigung für den Mehr-Page-Fall ist auf
  dieser Harness **nicht möglich** und wurde nicht behauptet. Die Eviction/Restoration-Mechanik selbst
  bleibt ausschließlich durch die Unit-Tests (Gate 7) belegt. Innerhalb der Single-Page-Harness blieb
  der gemessene DOM-Node-Count beim Scrollen konstant (siehe Gate 6).

### Gate 9 — „Gruppenfilter + Cursor bleiben konsistent.“

**Automatisierte Evidenz:**
- Cursor-Scope (aus Phase 163, unverändert seit deren Ursprungsimplementierung, in 164-01 nur um
  das erweiterte Budget ergänzt): `episode_version_public_group_filter_test.go` →
  `TestEpisodeVersionPublicGroupFilterCursorScope` (Zeile 220) und
  `TestEpisodeVersionPublicGroupFilterPaginationScope` (Zeile 190).
- Race-Sicherheit bei schnellem Filterwechsel: `FansubVersionBrowser.filterSwitch.test.tsx` (Plan
  164-06 Task 1), Tests „A->B->C in schneller Folge … nur C rendert jemals“ (Zeile 94), „ein
  vorwaerts-Nachladen in der Schwebe wird bei einem Filterwechsel verworfen“ (Zeile 132), „ein
  rueckwaerts-Wiederherstellungs-Fetch in der Schwebe wird bei einem Filterwechsel identisch
  verworfen“ (Zeile 166).
**Befehl:** `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilter -v` und
`npx vitest run FansubVersionBrowser.filterSwitch.test.tsx` → **beide PASS**.
**Live-Bestätigung (dieser Task, read-only curl gegen den neu gebauten Backend-Container, echtes
Naruto `anime_id=4`):**
```
fansub=animeownage      -> episode_count=3, Episoden 1,2,5 (Ep. 5 = Coop, beide Gruppen sichtbar)
fansub=project-messiah  -> episode_count=3, Episoden 3,4,5 (Ep. 5 = Coop, beide Gruppen sichtbar)
unfiltered ("Alle")     -> episode_count=5, Episoden 1-5
```
Kein episodenübergreifendes Mischen, Coop-Episode 5 korrekt unter beiden Einzelfiltern sichtbar.
**Live-Ergänzung (visuell, Browser):** Task 2, Schritt 5 (rasches Wechseln der Chips im echten
Browser) — **vom Auftraggeber am 18.09.2026 live abgenommen** (siehe 164-07-SUMMARY.md).

### Gate 10 — „Response enthält keine schweren Release-Detaildaten.“

**Automatisierte Evidenz:** Plan 164-01s DTO-Feldliste (`PublicEpisodeVersion`/`PublicGroupedEpisode`
in `backend/internal/models/episode_version.go` und `frontend/src/types/episodeVersion.ts`) enthält
ausschließlich Skalare/Booleans (`has_images`/`has_notes`/`has_karaoke` statt echter Notiz-/Bild-/
Karaoke-Inhalte).
**Live-Bestätigung (dieser Task, read-only `curl` gegen den neu gebauten `team4sv30-backend`-Container,
echtes Naruto `anime_id=4`):** `GET /api/v1/anime/4/episodes?projection=public&limit=24` (3159 Bytes
für 5 Episoden) — vollständiger Feld-Scan (`grep -io "note|segment|karaoke_detail|screenshot|image_url|
body_html|body_text"`) findet **ausschließlich den Substring `note` innerhalb des Feldnamens
`has_notes`**, keinen einzigen echten Notiz-/Bild-/Segment-Inhalt. Vollständige Schlüsselmenge über
alle Episoden/Versionen: `episode_id, episode_number, episode_title, default_version_id,
version_count, versions, filler_type, episode_type` (Episode) sowie `id, variant_id,
release_version_id, anime_id, episode_number, title, release_version, fansub_groups, video_quality,
container, video_codec, has_images, has_notes, has_karaoke` (Version) — keine weiteren Felder.
**Ergebnis: PASS (automatisiert + live bestätigt).**

### Gate 11 — „Mobile bleibt performant.“

**Struktureller Mechanismus (automatisiert bewiesen):** `@supports`-gekapseltes
`backdrop-filter: blur(14px) saturate(1.15)` mit Dual-Prefix-Fallback in
`EpisodeGlassCard.module.css` (Plan 164-04); `DOM_WINDOW_SIZE=3` begrenzt gleichzeitig gerenderte
Glass-/Blur-Flächen strukturell unabhängig von der Gesamtepisodenzahl (siehe Gate 6).
**Live-Messung: AUSSTEHEND (Task 3 dieses Plans, echtes Chrome-DevTools-Mobile-Viewport-Performance-/
Layers-Profil gegen den `/dev/episode-windowing-preview`-Großdatensatz).**
`164-RESEARCH.md`s Einschätzung ist eine Schätzung, keine Messung — Ersatz durch echte Zahlen ist
explizit Task 3's Aufgabe, nicht dieses Tasks.

**Gemessene Frame-Rate/Paint-Kosten (Chrome DevTools Performance/Layers, Mobile-Viewport, 5+ gleichzeitig
aufgeklappte Episoden, Scrollen):** **NICHT GEMESSEN.** Weder ein manuelles Chrome-DevTools-
Performance/Layers-Profil noch ein automatisiertes Äquivalent wurde für dieses Gate erhoben — nur der
DOM-Node-Count (Gate 6) wurde real gemessen. Es wird hier bewusst **keine** Zahl erfunden oder
geschätzt. Der Auftraggeber hat die Phase am 18.09.2026 ausdrücklich trotz dieser offenen Messung
abgenommen („1 passt, 2 löschen"); die Harness-Route wurde danach gelöscht (Entscheidung Task 3
Schritt 4: **löschen**, nicht als dauerhafter Debug-Aid behalten), sodass eine spätere Nachmessung an
dieser konkreten Route nicht mehr möglich ist. REQ-164-45 bleibt daher mit dieser expliziten Lücke
(Frame-/Paint-Profil ausständig, Client-Freigabe trotzdem erteilt) dokumentiert, siehe
`.planning/REQUIREMENTS.md`.

### Gate 12 — „Keine Race Conditions bei schnellem Scrollen/Filterwechsel.“

**Automatisierte Evidenz:**
- `FansubVersionBrowser.filterSwitch.test.tsx` (Plan 164-06 Task 1): rasches A→B→C-Wechseln mit
  außerhalb der Reihenfolge aufgelösten Antworten — nur die zuletzt gewählte Gruppe rendert jemals
  (Zeile 94); ein laufendes Forward-Nachladen wird bei Filterwechsel abgebrochen und beeinflusst den
  gerenderten Zustand nicht mehr (Zeile 132); dasselbe gilt symmetrisch für ein laufendes
  Backward-Restore (Zeile 166).
- `useWindowedEpisodePages.test.ts`: Single-Flight-Guard (Zeile 78) verhindert doppelte
  Forward-Requests bei mehrfacher Sentinel-Intersection während ein Request bereits läuft.
- Gefundener und behobener Bug (Plan 164-06 Task 1, dokumentiert in 164-06-SUMMARY.md): ein
  abgebrochener Forward-/Backward-Request ließ `forwardLoading`/`backwardLoading` zuvor hängen —
  jetzt in `resetForFilter` korrekt zurückgesetzt, mit eigenem Testfall abgedeckt.
**Befehl:** `npx vitest run FansubVersionBrowser.filterSwitch.test.tsx useWindowedEpisodePages.test.ts` → **PASS**.

## Gate-Zusammenfassung

| # | Gate (§47) | Automatisiert belegt | Live-Anteil ausstehend |
|---|---|---|---|
| 1 | Initial Load lädt nur erste Episode-Page | ✅ | Task 2 ✅ (18.09.2026 abgenommen) |
| 2 | Keine weiteren Episode-Pages vorab geladen | ✅ | Task 2 ✅ |
| 3 | Nächste Page erst bei Scroll-Bedarf | ✅ | — (Realdaten strukturell nicht mehrseitig) |
| 4 | Query-Anzahl wächst nicht linear | ✅ | — |
| 5 | Episode-Aufklappen ohne Request-Wasserfall | ✅ | Task 2 ✅ (visuell) |
| 6 | DOM wächst nicht unbegrenzt | Struktur ✅ / Messung ✅ (835 Elemente/70 li, 64 Episoden, 1 Page) | Task 3 ✅ (Playwright, s. o.) |
| 7 | Frühere Pages beim Zurückscrollen | ✅ (nur Unit-Test — Harness zeigte keine Mehr-Page-Eviction) | — |
| 8 | Scrollposition bleibt stabil | Struktur ✅ / Task 2 ✅ / Task 3: Harness einseitig, kein Mehr-Page-Sprungtest möglich | Task 2 ✅, Task 3 teilweise |
| 9 | Gruppenfilter + Cursor konsistent | ✅ (+ live curl) | Task 2 ✅ (visuell) |
| 10 | Keine schweren Release-Detaildaten | ✅ (+ live curl) | — |
| 11 | Mobile bleibt performant | Struktur ✅ / **Frame-/Paint-Messung NICHT durchgeführt** | Task 3 ❌ — Auftraggeber hat trotzdem abgenommen |
| 12 | Keine Race Conditions | ✅ | — |

9 von 12 Gates waren bereits nach Task 1 vollständig automatisiert belegt (1-5, 7, 9, 10, 12). Von den
verbleibenden 3 (6, 8, 11) wurde Gate 6 am 18.09.2026 real gemessen (Playwright, siehe oben) und Gate 8
über die Live-Naruto-UAT (Task 2) für seinen Naruto-Anteil bestätigt; **Gate 11s Frame-/Paint-Messung
wurde nicht durchgeführt** und dieser Umstand wird hier bewusst offen dokumentiert statt geschätzt oder
erfunden. Der Auftraggeber hat die Phase am 18.09.2026 ausdrücklich einschließlich dieser offenen
Messung abgenommen (Wortlaut „1 passt, 2 löschen").

## §53 — Abschlussbericht der Planung (nachträglich aus der Ausführung belegt)

- **Anzahl Pläne:** 7 (164-01 bis 164-07).
- **Anzahl Wellen:** 5 (Welle 1: 164-01/02 parallel; Welle 2: 164-03/04 parallel; Welle 3: 164-05;
  Welle 4: 164-06; Welle 5: 164-07, dieser Abschlussplan).
- **Gewählte Public-Read-Architektur:** Erweiterung der bestehenden `publicEpisodeQuery`
  (Single-Query-Ansatz aus Phase 163) um Klassifikations- (`filler_type`/`episode_type`) und
  technische Felder (`container`/`video_codec`) direkt in der Hauptabfrage, plus eine separate,
  batched `EXISTS(...)`-Flags-Query für `has_images`/`has_notes`/`has_karaoke` über alle
  `release_version_id`s der aktuellen Seite in einem Statement (`episode_version_public_flags.go`).
- **Erwartetes/gemessenes Query-Budget:** exakt 3 SQL-Statements pro Request ohne Gruppenfilter,
  exakt 4 mit Gruppenfilter — konstant nachgewiesen von 5 (echtes Naruto) bis 52 Episoden
  (Fixture) über mehrere Cursor-Seiten hinweg (Gate 4).
- **Erwartete API-Request-Struktur:** ein einzelner Endpunkt,
  `GET /api/v1/anime/{id}/episodes?projection=public&limit=24[&fansub=<slug>][&cursor=<cursor>]`,
  additiv erweitert (keine neuen Endpunkte).
- **Pagination-/Cursor-Strategie:** zeilenbasierter Cursor v2 aus Phase 163
  (`episode_number, episode_id, variant_id`), filterkontextscope-behaftet (ein Cursor aus
  „AnimeOwnage“ ist nicht in „Alle“/„Project Messiah“ gültig).
- **Infinite-Scroll-Trigger:** `IntersectionObserver` mit unterem und oberem Sentinel
  (`rootMargin: '200px'`), kein Scroll-Event-Polling.
- **Windowing-Strategie:** begrenztes bidirektionales Fenster, `DOM_WINDOW_SIZE=3` gleichzeitig voll
  gemountete Pages, ältere Pages werden zu höhenerhaltenden Spacer-`<div>`s.
- **Cache-Strategie:** `CACHE_MAX_PAGES=6` Page-Daten-Cache (Map-Einfüge-Reihenfolge-LRU), eviktiert
  nie eine aktuell im DOM-Fenster befindliche Page.
- **Umgang mit alten Pages:** aus dem DOM-Fenster entfernte Pages werden durch einen
  höhenerhaltenden Spacer ersetzt (kein Layout-Sprung), Daten bleiben bis zu 6 Pages im Cache.
- **Rückwärtsladen:** oberer Sentinel löst `loadPrevious` aus; Cache-Hit stellt sofort ohne
  Netzwerk-Request wieder her, Cache-Miss verwendet zwingend den ursprünglich gespeicherten Cursor
  der Page (nie einen client-seitig erfundenen, T-164-09).
- **Scroll-Stabilität:** `ResizeObserver`-gemessene Page-Höhen, ein bei der Wiederherstellung
  berechnetes `scrollAnchorAdjustment`-Delta wird per `window.scrollBy` in einem `useLayoutEffect`
  vor dem nächsten Paint ausgeglichen; `overflow-anchor: auto` als natives Sicherheitsnetz.
- **Episode-Aufklappen/Request-Verhalten:** 0 zusätzliche Requests — alle Release-Preview-Daten
  (inkl. `has_images`/`has_notes`/`has_karaoke`, Gruppen/Logos) sind bereits im Page-Response
  enthalten; explizit call-count-getestet (Gate 5).
- **Mobile-First-Plan:** `EpisodeGlassCard`/`ReleasePreviewRow` mobil gestapelt, ab 768px zweispaltig
  (Desktop/Breitbild); Technikzeile als dezenter, umbrechender Fließtext (kein Chip/Badge);
  `backdrop-filter` `@supports`-gekapselt mit Dual-Prefix-Fallback.
- **Geplante Performance-Gates:** die 12 Gates aus §47 (siehe Tabelle oben), 9 davon vollautomatisiert
  bewiesen, 3 mit strukturellem Beweis + ausstehender Live-Messung (dieser Plan, Task 2/3).
- **Checker-Befund:** Die Pläne wurden vor Ausführungsbeginn anhand von Checker-Feedback überarbeitet
  (Commit `326c2cce`, „fix(164): revise plans based on checker feedback“); während der Ausführung
  (164-01 bis 164-07) wurden 0 Regressionen gegenüber der vorbestehenden Baseline festgestellt (siehe
  Gesamtlauf-Tabelle oben).
- **Commits:** 164-01: `a22f7fb2`, `1705f29a`, `be807f83` · 164-02: `c9ff3c5d`, `1c00a00a` · 164-03:
  `de97e83e` · 164-04: `087c6a32`, `4f90dd09`, `0b84b8a6` · 164-05: `d92587a0`, `e5714aae` · 164-06:
  `442fb747`, `24b457c4` · 164-07: siehe 164-07-SUMMARY.md (dieser Plan, Task 1 + Task 3
  Harness-Route-Commit; Task 2/3s menschliche Freigabe-Commits existieren nicht, da reine
  Verifikations-Checkpoints ohne Dateiänderung bzw. bereits committete Harness-Route).

## Nachtrag — erneuter Frontend-Typecheck/Build nach Container-Neustart (dieser Task, Task 3-Vorbereitung)

Nach dem oben dokumentierten Gesamtlauf wurde `team4sv30-frontend` neu gestartet (`docker restart
team4sv30-frontend`, notwendig um die Live-Curl-Evidenz für Gate 9/10 gegen den neu gebauten
Backend-Container zu erheben, siehe Gate 9/10 oben). Ein erneuter `npm run typecheck`-Lauf danach
zeigt **0 Fehler** — der oben dokumentierte `AnimePageProps`-Fehler war ein durch den laufenden
Next.js-Dev-Prozess zwischenzeitlich verwaistes generiertes Typenartefakt
(`.next/dev/types/app/anime/page.ts`), kein tatsächlicher Quelltext-Fehler; ein Neustart hat es
korrekt neu generiert. `npm run lint` bleibt bei denselben 3 vorbestehenden, unveränderten Fehlern
(siehe oben). `npm run build` zeigt jetzt **einen anderen, ebenfalls vorbestehenden und
Phase-164-unabhängigen Fehler**: ein SSR-Prerender-Fehler auf `/claim-invitations/accept`
(`TypeError: Cannot read properties of null (reading 'useEffect')`) — diese Datei wurde zuletzt in
Phase 135 geändert (`git log`), lange vor Phase 164, und von keinem Plan dieser Phase berührt. Der
neue Harness-Route-Quelltext selbst (`frontend/src/app/dev/episode-windowing-preview/page.tsx`,
Task 3 dieses Plans) ist einzeln geprüft: `npx tsc --noEmit` 0 Fehler, `npx eslint
src/app/dev/episode-windowing-preview/page.tsx` 0 Findings, `curl` gegen die laufende Dev-Route
liefert HTTP 200 mit dem erwarteten Mock-Inhalt, und ein Backend-Log-Scan über den Ladezeitraum
bestätigt **0 Requests** gegen `team4sv30-backend` durch diese Route.

## Finale Freigabe — 18.09.2026 (Task 2 + Task 3 abgeschlossen)

Der Auftraggeber hat Phase 164 am 18.09.2026 per Live-UAT über den SSH-Tunnel (`127.0.0.1:3300`)
gegen drei reale Anime abgenommen: Naruto (`/anime/4`), 11eyes: Pink Phantasmagoria (`/anime/3`) und
Buddy Complex (`/anime/1`) — inklusive erneuter Prüfung der zwischenzeitlich behobenen GAP-01..GAP-15
aus `164-UAT.md`. Wörtliche Freigabe: **„1 passt, 2 löschen"** — Punkt 1 (Task 2, Live-Naruto-Browser-
UAT inkl. der sechs in 164-07-PLAN.md vorgegebenen Prüfschritte) gilt als **bestanden**; Punkt 2 (Task
3, Behalten-oder-Löschen-Entscheidung für die Dev-Harness-Route) wurde als **löschen** entschieden.

**Task 2 — Ergebnis:** Alle sechs Prüfschritte aus 164-07-PLAN.md (Network-Tab Initial-Load, Glass-
Card-Rendering, Zero-Request-Expand, Coop-Link + Back-Navigation/Filter-Erhalt, Filterwechsel ohne
Vermischung, Response-Feld-Scan) sowie die zusätzliche Prüfung von GAP-01..GAP-15 auf allen drei
genannten Anime gelten als vom Auftraggeber bestätigt. Siehe `164-07-SUMMARY.md` Abschnitt „Finale
Freigabe" für die vollständige Dokumentation.

**Task 3 — Ergebnis:** Die DOM-Node-Count-Messung wurde am 18.09.2026 per Playwright im
Frontend-Container gegen die Harness-Route (`/dev/episode-windowing-preview`, Mobile-Viewport
390×844, 64 Mock-Episoden) durchgeführt: **835 Elemente gesamt, 70 `<li>`, konstant beim Scrollen
hoch/runter** (siehe Gate 6 oben für die vollständige Einschränkung zur Single-Page-Harness). Das
Mobile-Frame-/Paint-Profil (Gate 11) wurde **nicht** gemessen — weder manuell noch automatisiert;
diese Lücke wird hier bewusst offen dokumentiert statt mit einer erfundenen oder geschätzten Zahl
geschlossen. Die Entscheidung lautete **löschen**: `frontend/src/app/dev/episode-windowing-preview/`
wurde nach der Messung vollständig aus dem Repository entfernt (kein permanenter Debug-Aid).

**Abweichung von der ursprünglichen Plan-Vorgabe:** 164-07-PLAN.md sah für Task 2/3 eine Ausführung
durch einen Menschen mit echtem Browser/Chrome-DevTools vor. Tatsächlich wurde Task 2 durch eine
Live-Browser-Sitzung des Auftraggebers selbst durchgeführt (kein Agent-Browserzugriff), und Task 3s
DOM-Messung wurde durch eine automatisierte Playwright-Messung im Container ersetzt statt durch ein
manuelles Chrome-DevTools-Profil — beides vom Auftraggeber ausdrücklich als ausreichend akzeptiert,
mit der einen offen bleibenden Lücke (Gate 11 Frame-/Paint) klar benannt statt verschwiegen.

## Nachtrag — Regressionslauf nach Löschung der Dev-Harness-Route (18.09.2026)

Nach dem Löschen von `frontend/src/app/dev/episode-windowing-preview/` wurde der volle Gate erneut
ausgeführt: `npm run typecheck` (0 Fehler, nach `rm -rf .next/types` gegen ein zwischenzeitlich
verwaistes generiertes Typenartefakt — derselbe bereits oben dokumentierte Next.js-Dev-Artefakt-
Mechanismus), `npm run lint` (dieselben 3 vorbestehenden, unveränderten Fehler wie oben), `npm run
test -- --run` (dieselben 2 vorbestehenden `cssCustomProperties.guard.test.ts`-Fehlschläge; ein
dritter, jeweils unterschiedlicher Testdatei-Fehlschlag pro Lauf — `PreviousContributionsSection.test.tsx`
bzw. `DefaultCrewManager.test.tsx` — erwies sich beim isolierten Wiederholungslauf als bestehend/grün,
also containerlast-bedingt flaky, keine Regression). `npm run build` schlägt weiterhin fehl, aber
**nachweislich vorbestehend**: ein gezielter Diagnoselauf mit der Harness-Route temporär aus dem
letzten Commit wiederhergestellt (`git checkout HEAD -- frontend/src/app/dev/episode-windowing-preview/page.tsx`,
danach wieder gelöscht) zeigt exakt denselben Fehlerklasse-Typ (`TypeError: Cannot read properties of
null`) auf `/claim-invitations/accept` (der bereits oben dokumentierten Stelle); ohne die Harness-Route
verschiebt sich derselbe Build-Defekt lediglich auf `/_global-error` (`reading 'useContext'` statt
`reading 'useEffect'`) — ein bereits vorbestehender, mehrseitiger Turbopack-Prerender-Defekt, der je
Lauf die zuerst betroffene Seite meldet, keine durch diese Löschung neu entstandene Regression.
Backend: `go build ./... && go vet ./...` fehlerfrei; `go test ./...` zeigt ausschließlich die bereits
dokumentierten umgebungsabhängigen Fehlschläge (fehlende `TEAM4S_PHASE128_TEST_DSN`, kein laufender
Live-Keycloak/Backend auf Port 18093 für `Phase134Matrix*`, fehlende Jellyfin-12-Fixture-Dateien für
`TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`/`Test11eyesSourceSelection_*`, ein vorbestehender
`TestFansubRepository_PublicProfileSourceInvariants`-Fehlschlag) — nichts davon berührt vom Löschen der
Dev-Route, da dieser Task keine Backend-Datei verändert hat. `docker restart team4sv30-frontend`
durchgeführt; `curl` bestätigt `/dev/episode-windowing-preview` → `404` und `/anime/4` → `200`.

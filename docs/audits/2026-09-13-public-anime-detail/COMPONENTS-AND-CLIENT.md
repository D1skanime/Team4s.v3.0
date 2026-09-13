# Öffentliche Anime-Detailseite – Komponenten und Client

**Analyse:** 2026-09-13. **Baseline:** `7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85`.
**Umgebung:** kanonisches Repository `/home/d1sk/team4s`, ausschließlich via `ssh team4s-linux`.
**Scope:** lesender Audit; einzige Schreibfläche dieses Agents ist dieses Dokument. Keine Produktänderung, Migration, Datenmutation, Browserautomation oder Commits. Vorbestehendes `frontend/scripts/shot2.mjs` bleibt unangetastet.
**Belegtyp:** Quellcodeanalyse; Live-Messungen liegen beim koordinierenden Agent. Kandidaten-Priorität bezeichnet vorgeschlagene Einordnung, keine freigegebene Implementierung.

## 1. Architekturmaßstab und Quellenstand

`AGENTS.md`, `AI-HANDOFF.md`, `.planning/STATE.md:1`, `.planning/PROJECT.md:94` und aktuelle Abschnitte 147–157 der `.planning/ROADMAP.md:941` bilden den Maßstab. Relevant sind Wiederverwendung, zentrale Auth-Refresh-Naht, dokumentierte API-Felder, kanonische Medienbesitzer, gebundene öffentliche Projektionen und ehrliche Fehlerzustände. Frühere CONTEXT-Istbeschreibungen sind keine Aussage über den aktuellen Code.

| Phase | Gelieferte Richtung / Abgrenzung | Maßgebliche Artefakte |
|---|---|---|
| 147 | Stabile Rollen-Codes statt Rückwärtsauflösung aus Labels; kein zweiter Rollenkatalog. | `.planning/phases/147-rollen-registry-letzte-parallelkataloge-aufl-sen/147-CONTEXT.md:23`, `147-06-SUMMARY.md:50`, `147-VERIFICATION.md:4` im selben Verzeichnis |
| 148 | Katalogfarbe über color_key / data-color-key / globale --role-accent-Naht; bewusst separate Artwork-Akzente sind keine Parallelregistry. | `.planning/phases/148-rollenfarben-wieder-an-den-katalog-anschlie-en/148-05-SUMMARY.md:56`, `148-08-SUMMARY.md:51`, `148-VERIFICATION.md:4` im selben Verzeichnis |
| 149 | Existierende Tokens verwenden; Guard gegen undefinierte fallbacklose Custom Properties; keine pauschale Behauptung, jeder Hexwert sei ein Fehler. | `.planning/phases/149-tote-css-tokens-sanieren-und-den-notiz-kontrast-schlie-en/149-05-SUMMARY.md:49`, `149-VERIFICATION.md:4` im selben Verzeichnis |
| 150 | Backend ist Schwellenautorität, Frontend stellt dar. Die Anime-Seite enthält keine Badge-Schwellenberechnung. | `.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/150-CONTEXT.md:21`, `150-05-SUMMARY.md:60`, `150-VERIFICATION.md:4` im selben Verzeichnis |
| 151 | Gemeinsamer Artwork-Slot und generisches Badge-Karussell. Ein einfacher Relationenslider muss deshalb nicht ungeprüft in ein Badge-Karussell umgebaut werden. | `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-CONTEXT.md:6`, `151-03-SUMMARY.md:45`, `151-VERIFICATION.md:49` im selben Verzeichnis |
| 152 | Öffentliche Daten nur für echte Consumer; Bildpipeline und Query-Budgets; Story-Fakten bereits im schlanken Gruppen-Summary statt Gruppen-Detail-N+1. | `.planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/152-CONTEXT.md:16`, `152-03-SUMMARY.md:46`, `152-VERIFICATION.md:215` im selben Verzeichnis |
| 153 | SSR-Inhalte nicht bis Hydration verdecken; renderer-only Imports; keine native auto-sizes-Retention. | `.planning/phases/153-public-member-clientlast-und-speicherretention/153-01-SUMMARY.md:40`, `153-02-SUMMARY.md:70`, `153-04-SUMMARY.md:44`, `153-VERIFICATION.md:4` im selben Verzeichnis |
| 154 | Fakten einmal laden, Bildbudget begrenzen, Viewer gezielt laden und AbortSignal wirklich durchreichen. | `.planning/phases/154-aggregator-duplikate-bildbudget-und-viewer-aufloesung/154-CONTEXT.md:35`, `154-03-SUMMARY.md:55`, `154-04-SUMMARY.md:59`, `154-VERIFICATION.md:4` im selben Verzeichnis |
| 155 | Pretty-Projektrouten über schlanken Resolver, Zählung statt Vollinventar, kanonischer Member-Drilldown. Numerische Route bleibt echter kompatibler Consumer. | `.planning/phases/155-fansub-projektseite-read-model-und-query-budget/155-CONTEXT.md:43`, `155-04-SUMMARY.md:49`, `155-06-SUMMARY.md:50`, `155-VERIFICATION.md:4` im selben Verzeichnis |
| 156 | Assignments und serverseitiger Segmenttyp; Segment-Contributor-Subset bestimmt Veröffentlichung. Aktuelle EpisodeVersion-Feldnamen sind allein kein Nachweis eines alten Datenmodells. | `.planning/phases/156-segment-domain-konsistenz-und-oeffentliche-release-projektion/156-CONTEXT.md:20`, `156-13-SUMMARY.md:83`, `156-15-SUMMARY.md:61` im selben Verzeichnis |
| 157 | Kompakte Projekt-Member-Oberfläche, später ausdrücklich entfernte Release-Historie; spätere Summaries gehen alter Layoutbeschreibung vor. Menschlicher Sign-off offen. | `.planning/phases/157-projekt-memberseite-visuelles-referenzdesign/157-CONTEXT.md:236`, `157-08-SUMMARY.md:7`, `157-10-SUMMARY.md:70`, `157-VERIFICATION.md:4` im selben Verzeichnis |

Lesedeckung: relevante Abschnitte aller vorhandenen CONTEXT-/SUMMARY-/VERIFICATION-Dateien dieser Phasen wurden abgeglichen. Im jeweiligen Phasenverzeichnis fehlen `148-CONTEXT.md`, `149-CONTEXT.md`, `153-CONTEXT.md` und `156-VERIFICATION.md`; für diese Stellen wurden vorhandene Roadmap/Summary/Verification bzw. 156-15 und STATE verwendet. Keine historische Testzahl wird als heutiger eigener Testlauf ausgegeben.

## 2. Rekonstruierter Renderbaum

S = Server Component; C = Client Boundary; c = unter einer Client Boundary ausgeführtes importiertes Blatt ohne eigene Direktive. Server-children als Prop werden durch einen Client Provider nicht automatisch zu Clientcode.

```text
app/layout.tsx (S; 3 Role-Catalog-Fetches)
├─ LocalhostCanonicalRedirect (C; null)
├─ AuthSessionSwitchGuard (C; null)
└─ RoleCatalogProvider (C; Context)
   └─ AppShellClientWrapper (C; own-profile bei Session)
      └─ AppShell (C)
         ├─ mobileHeader, edgeStrip, drawerBackdrop
         ├─ AppShellNavGroups / AppShellAnonNavGroups (c)
         │  └─ AppShellNavItemView → Link, Badge, lucide icons
         ├─ DrawerUserFooter → Image / initials / logout
         │  oder DrawerAnonymousFooter / DrawerLoadingFooter
         ├─ optional ProfileLoadErrorBanner → Button
         └─ children: app/anime/[id]/page.tsx (S)
            ├─ Fehlerzweig → main / Link / errorBox
            └─ AnimeMediaProvider key=anime.id (C)
               └─ main (serverseitig komponierte children)
                  ├─ AnimeBackdropRotator (C)
                  │  ├─ CSS image / video / overlay
                  │  └─ Portal(document.body): audio button/error
                  ├─ CSS heroBanner / cover background
                  ├─ Breadcrumbs (C) → Link / ChevronRight
                  ├─ heroContainer (S)
                  │  ├─ Image poster / CSS poster reflection / stats
                  │  ├─ WatchlistAddButton (C)
                  │  ├─ Genre spans
                  │  ├─ title / AnimeTitleLogo (C → Image)
                  │  ├─ StatusBadge (S → lucide icon) / type/content/year
                  │  ├─ description / views / optional Emby anchor
                  │  ├─ AnimeInfoBanner (C → Image)
                  │  ├─ optional AnimeRelations (C → Link / Image / arrows)
                  │  └─ optional AnimeEdgeNavigation (C → buttons / Image)
                  └─ contentArea (S)
                     ├─ episodes heading / fansub group Link chips
                     ├─ optional ActiveFansubStory (C → Link)
                     ├─ FansubVersionBrowser (C)
                     │  ├─ filter buttons / Image logos / group Link
                     │  └─ episode accordion → version rows / Image / Play anchor
                     │  oder legacy episode list (S → Link / icons)
                     ├─ AnimeContributionsSection (C)
                     │  └─ GroupContributionBlock (c)
                     │     └─ ReleaseVersionBreakdown (C → shared Button)
                     └─ CommentSection (C)
                        ├─ CommentForm (C)
                        └─ comment list / empty / error
```

Eigene Next-`dynamic()`-/React-`lazy()`-Grenzen sind in diesem Renderbaum nicht vorhanden. Bedingt ungemountete Accordions sparen DOM, verschieben aber keinen Datenabruf. `app/anime/[id]/loading.tsx:7` ist der serverseitige Next-Suspense-Ladezustand, kein Hydrationsoverlay. Es gibt keinen zusätzlichen Anime-Layout-Provider zwischen Root und Detailroute.

### Komponenten-Inventar

Alle nicht ausdrücklich genannten Komponenten-Fetches, Timer, Storagezugriffe oder Medien existieren in der jeweiligen Komponente nicht.

| Komponente / Datei | Boundary, Props und Datenquelle | State / Fetchtrigger / Cleanup | Navigation / Medien / CSS |
|---|---|---|---|
| `frontend/src/app/layout.tsx:30` | S; children; listRoleDefinitions für fansub_group/anime_contribution/group_history | Drei parallele SSR-Aufrufe; Fehler als leerer Katalog + Meldung | `frontend/src/styles/globals.css` |
| `frontend/src/providers/RoleCatalogProvider.tsx:46` | C; loads,children; merge per role.code und Context | useMemo, kein Nachfetch | Context, keine UI |
| `frontend/src/components/auth/LocalhostCanonicalRedirect.tsx:11` | C; keine Props | einmaliger Effect | Local/dev localhost→127.0.0.1, keine Loopback-Umschreibung in Produktion |
| `frontend/src/components/auth/AuthSessionSwitchGuard.tsx:15` | C; Session-Meta über zentrale API | Storagelistener und BroadcastChannel; remove/close bei Unmount | Sessionwechsel → Login/Reload; keine UI |
| `frontend/src/components/layout/AppShellClientWrapper.tsx:77` | C; children; useAuthSession + getOwnProfile | Session/Retry/Profilechanged löst Fetch aus; cancelled verhindert späte Updates, kein Abort | Wrapper.module.css; ProfileLoadErrorBanner mit shared Buttons |
| `frontend/src/components/layout/AppShell.tsx:279` | C; mode/path/user/memberships/rights | drawer,logout,renderedPath; keydown nur bei offenem Drawer, entfernt bei Cleanup | Links zu Anime/Suche/Ranking/Fansubs/Me/Admin; Avatar unoptimized; AppShell.module.css |
| `frontend/src/components/ui/Button.tsx:36`, `Badge.tsx:12` im selben Verzeichnis | C bzw. c; HTML-Props, Variants, children | reine Darstellung, Buttonloading via Props | shared `frontend/src/components/ui/ui.module.css` |
| `frontend/src/app/anime/[id]/page.tsx:45` | S; params/searchParams; Anime + fünf Detailzweige | erst Anime, danach Promise.allSettled; Cookies für Watchlist | lokales `page.module.css`; mehrere Cover-Darstellungen |
| `frontend/src/components/anime/AnimeMediaProvider.tsx:28` | C; animeID/children; getAnimeBackdrops | Manifest in State; modulweite Map von Promises; Mount/ID-Effekt; cancelled, kein Abort | Provider liefert gemeinsam an drei Kinder |
| `frontend/src/components/anime/AnimeMediaProvider.tsx:50` / `:68` | C; TitleLogo(title,className), InfoBanner(className,dividerClassName); Manifest Context | URL useMemo, kein eigener Fetch | Next Image unoptimized; Logo 120×48, Banner 600×180; CSS vom Page-Prop |
| `frontend/src/components/anime/AnimeBackdropRotator.tsx:19` | C; coverImage + Manifest | backdrops,index,videoURL,showVideo,muted,error; 0ms Manifesttimer, 9s Rotation; clearTimeout/clearInterval; Audio-Activationlistener entfernt | video autoplay/preload auto, CSS background; body Portal; lokales Modul |
| `frontend/src/components/navigation/Breadcrumbs.tsx:17` | C; items | stateless; kein Providerverbrauch | Link prefetch=false; eigenes CSS; rein darstellende Clientgrenze |
| `frontend/src/components/anime/StatusBadge.tsx:46` | S; AnimeStatus | Record für Präsentation, keine fachliche Ableitung | eigenes CSS, Statusicon |
| `frontend/src/components/watchlist/WatchlistAddButton.tsx:19` | C; animeID,initiallyInWatchlist,custom CSS | submitting,isAdded,hasAuthToken,message; einmaliger Tokencheck; click add/remove | eigenes CSS durch Pageklasse ersetzt; Meldung auf dieser Route unterdrückt |
| `frontend/src/components/anime/AnimeRelations.tsx:45` | C; relations,variant=default; SSR-Daten | scroll flags/ref; ResizeObserver, scroll/resize + RAF; alle sauber entfernt/abgebrochen | numerische Anime-Links prefetch=false; Image fill sizes=160px; lokales CSS |
| `frontend/src/components/anime/AnimeEdgeNavigation.tsx:36` | C; currentAnimeID,gridQuery; getAnimeList | prev/next,hover/loading; onMouseEnter/onFocus/onTouchStart/onClick; keine Abort-/Unmountkontrolle | router.push mit gridQuery; Preview Image; lokales CSS |
| `frontend/src/components/fansubs/ActiveFansubStory.tsx:46` | C; animeID,summary groups,animeFansubs | eigene aktive Gruppe; Storageinitialisierung; storage-Event + 200ms Poll; beide Cleanup | public fansub slug Link; eigenes CSS |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx:123` | C; animeID,fansubs,episodes,optionaler Callback (Page übergibt ihn nicht) | activeFansubGroupID,expandedEpisodes; Storage lesen bei Initialisierung, schreiben im Effect; keine Fetches beim Aufklappen | numerischer Projektlink, relay Play; unoptimized Gruppenlogos; lokales CSS |
| `frontend/src/components/anime/AnimeContributionsSection.tsx:15` | C; animeID; getAnimeContributions | groups,loading,expandedGroupId; Fetch sofort nach Mount; cancelled; keine Pagination | lokales CSS; kein SSR-Inhalt im loading-Zweig |
| `frontend/src/components/anime/GroupContributionBlock.tsx:12` | c; group,expanded,onToggle | zeigt zunächst drei Personen; Props statt eigener Zustandskopie | Namen als span; Roles aus response.role_labels; lokales CSS |
| `frontend/src/components/anime/ReleaseVersionBreakdown.tsx:18` | C; breakdown aus demselben vollständigen Response | open,useId; keine Nachladung | shared Button; wiederverwendetes GroupContributionBlock-CSS plus eigenes CSS |
| `frontend/src/components/comments/CommentSection.tsx:23` | C; animeID,initialComments,initialTotal,initialError | eigene comments/total/error; optimistic insert; keine Prop-Synchronisierung | statische Liste, lokales CSS; kein Pagination-Control |
| `frontend/src/components/comments/CommentForm.tsx:18` | C; animeID,onCommentCreated | content/auth/name/submitting/error/success; mount Tokencheck; submit POST und router.refresh | lokales CSS; Textarea maxLength=4000, kein RichTextEditor |

`frontend/src/components/ui/index.ts:1` ist ein breiter Export-Barrel. Sichtbare Consumer benötigen hier Button/Badge. Eine Behauptung, alle exportierten Widgets würden tatsächlich im Bundle laufen, wäre ohne Bundlerbeleg falsch. `frontend/src/components/media/crop/mediaCropA11y.ts:31` wird vom Shell nur für den reinen Fokushelper importiert; die Datei importiert keinen Crop-Editor. Im expliziten Detail-Komponentenbaum gibt es keinen RichText-/Tiptap-/ProseMirror-Consumer.

## 3. Requests und konsumierte Daten

| Phase / Auslöser | Helper / API-Pfad | Verbraucher / Bemerkung |
|---|---|---|
| SSR Root | `frontend/src/app/layout.tsx:33` → listRoleDefinitions | 3 Contextrequests; Route selbst nutzt die Katalog-Contextwerte nicht, Shell-Provider bleibt global |
| SSR primär | `frontend/src/lib/api.ts:1568` → GET /api/v1/anime/:id | Titel, Typ, Inhaltstyp, Status, Jahr, max_episodes, cover_image, genres, description, views; episodes als Fehlerfallback |
| SSR zweite Welle | `frontend/src/lib/api.ts:2064` → GET /api/v1/anime/:id/fansubs | Chips, Auswahl, Story; Storygruppen ohne zusätzliche Gruppen-Detailrequests |
| SSR zweite Welle | `frontend/src/lib/api.ts:2136` → GET /api/v1/anime/:id/episodes | sämtliche GroupedEpisodes und Versionsobjekte als Clientprops |
| SSR zweite Welle | `frontend/src/lib/api.ts:2928` → GET /api/v1/anime/:id/comments?page=1&per_page=10 | initialComments, meta.total; total_pages/page/per_page ohne UI-Navigation |
| SSR bedingt | `frontend/src/lib/api.ts:3040` → GET /api/v1/watchlist/:id | Erfolg→boolean; jeder Fehler→false |
| SSR zweite Welle | `frontend/src/lib/api.ts:1634` → GET /api/v1/anime/:id/relations | Relations vollständig angezeigt |
| Client Mount | `frontend/src/lib/api.ts:1606` → GET /api/v1/anime/:id/backdrops | Provider-Promise geteilt; Bilder/Banner/Logo/Videos |
| Client Mount | `frontend/src/lib/api.ts:9753` → GET /api/v1/anime/:id/contributions | gesamte Gruppen-/Contributor-/VersionBreakdownstruktur schon vor Disclosure |
| Client Session | `frontend/src/components/layout/AppShellClientWrapper.tsx:107` → getOwnProfile | nur bei aktiver Access-ODER-Refresh-Session |
| Hover/focus/touch/click | `frontend/src/components/anime/AnimeEdgeNavigation.tsx:64` → getAnimeList | aktuelle Gridseite; an Rand zusätzliche vorherige/nächste Seite |
| Mutation | `frontend/src/lib/api.ts:2950` createAnimeComment, `:3013` addWatchlistEntry, `:3068` removeWatchlistEntry | zentrale authorizedFetch-Naht hinter vorgeschaltetem fehlerhaftem UI-Gate |
| Play-Klick | `frontend/src/app/api/releases/[id]/stream/route.ts:65` | Relay /api/v1/releases/:id/stream + grant; Server liest auch Refreshcookie |

Gesicherte nicht genutzte Felder dieses Detail-Consumers, keine globale Löschfreigabe:

- Anime: `title_de`, `title_en`, `genre` (singular), `tags`, `banner_url`, `source`, `source_links`, `folder_name`, `anisearch_id`, `jellyfin_series_id`, `jellyfin_series_path` aus `frontend/src/types/anime.ts:50` werden von dieser Seite nicht gelesen. Banner stattdessen aus Manifest; Emby aus Testmapping.
- Versionen: `release_version`, `media_provider`, `media_item_id`, `production_started_on`, `crc32`, `stream_url`, `segment_count`, `has_segment_asset`, `duration_seconds`, `created_at`, `updated_at` aus `frontend/src/types/episodeVersion.ts:6` werden in `FansubVersionBrowser.tsx:192` nicht dargestellt. `id` wird tatsächlich zum Streamrelay verwendet.
- Gruppenbeiträge: `member_slug` wird in `GroupContributionBlock.tsx:37` und `ReleaseVersionBreakdown.tsx:49` nur als React-Key gelesen, nicht zur Navigation. Das ist fehlender Drilldown, kein Deadlink.
- Die primäre Anime-Episodenliste wird geladen, aber bei erfolgreichem grouped request nicht gerendert (`frontend/src/app/anime/[id]/page.tsx:293`). Das ist eine reale Fallbackabhängigkeit; Entfernen erfordert bewusstes Error-/DTO-Design.
- `getAnimeContributions` setzt `next.revalidate:60` (`frontend/src/lib/api.ts:9760`), wird hier aber im Browser aufgerufen. Das erzeugt weder einen 60s-Clientpoll noch einen deduplizierenden App-Cache.

## 4. Belegte Funktionsbefunde

### C-01 – Refresh-only Session sperrt Kommentar und Watchlist

**Kandidat P1 · Vertrauen hoch · Codebeweis.** `frontend/src/lib/api.ts:1139` prüft nur den Access-Token. `frontend/src/components/comments/CommentForm.tsx:29`, `:38`, `:111` und `frontend/src/components/watchlist/WatchlistAddButton.tsx:31`, `:38`, `:96` verwenden diese Funktion zum Gate.
**Trigger:** Seite mit fehlendem Accesscookie und gültiger Refreshsession mounten. **Ist:** Buttons erhalten disabled; ein zentraler Refresh wird durch die Aktionen gar nicht erreicht. Der nur einmalige Mountcheck reagiert auch nicht auf späteres Session-Refresh-Event, während die Shell es über `frontend/src/lib/useAuthSession.ts:33` tut.
**Wirkung:** widersprüchliche angemeldete Navigation bei gesperrten Aktionen. Shell-Mount kann parallel refreshen; dadurch ist die Sichtbarkeit timingabhängig, nicht jeder Warmload muss scheitern.
**Naht:** vorhandenes useAuthSession, hasAccessToken || hasRefreshToken; kein neuer Tokenleser.

### C-02 – Watchlistfehler verschwinden und SSR-Fehler werden als „nicht enthalten“ dargestellt

**Kandidat P2 · Vertrauen hoch · Codebeweis.** `frontend/src/app/anime/[id]/page.tsx:121` setzt bei jedem abgelehnten Watchlistrequest false; `:183` übergibt custom CSS. `frontend/src/components/watchlist/WatchlistAddButton.tsx:100` rendert message ausschließlich ohne custom CSS.
**Trigger:** Watchlist GET mit 401/5xx oder add/remove mit Netzwerkfehler. **Ist:** GET zeigt gegebenenfalls Add statt bestehenden Eintrag; Aktionfehler existiert nur im unsichtbaren State.
**Wirkung:** falscher Zustand und keine Erklärung/Retry-Rückmeldung. **Naht:** tri-state Laden/Fehler/Eintrag, sichtbare gemeinsame Meldung; mit C-01 abstimmen.

### C-03 – Erfundenes Rating und ID-spezifisches Emby-Testmapping

**Kandidat P2 · Vertrauen hoch · Codebeweis.** `frontend/src/app/anime/[id]/page.tsx:171` rendert immer 7.8. `frontend/src/lib/emby.ts:11` enthält ausschließlich Anime 22→Emby 2112, Basis und Server in `:2`/`:5`.
**Trigger:** beliebige zwei Anime ansehen; zusätzlich Anime 22. **Ist:** identische Bewertung ohne Bewertungsfeld im DTO; Emby-Verweis hängt an interner Test-ID, nicht `jellyfin_series_id` oder source_links.
**Wirkung:** nicht belastbare Produktdaten, instabile externe Zuordnung bei neuem Testdatensatz. Kein Livebeweis, dass Emby 2112 tatsächlich falsch belegt ist. **Naht:** vorhandene autoritative Quellen prüfen, andernfalls keine erfundene Bewertung/Zuordnung zeigen; Produktauswahl ausdrücklich festlegen.

### C-04 – Persistierte Gruppenauswahl kollidiert mit SSR-Hydration

**Kandidat P2 · Vertrauen hoch für Divergenz, Live-Reproduktion ausstehend.** `frontend/src/components/fansubs/FansubVersionBrowser.tsx:36`/`:124` und `ActiveFansubStory.tsx:21`/`:47` initialisieren State serverseitig aus primary/erster Gruppe, im Browser direkt aus localStorage.
**Trigger:** gültige nichtprimäre Gruppe speichern und Dokument neu laden. **Ist:** erste Clientausgabe kann andere Story/aria-pressed/Versionstitel als SSR haben. **Wirkung:** Hydrationsreparatur und/oder sichtbarer Wechsel. Storage getItem liegt außerhalb try/catch; blockierter Storage kann den Render zusätzlich werfen.
**Naht:** SSR-deterministische initiale Auswahl und zentrale Hydration/Persistierung in einem gemeinsamen Besitzer.

### C-05 – Zwei aktive Gruppenzustände werden per 200ms-Storagepoll abgeglichen

**Kandidat P2 · Vertrauen hoch · Codebeweis.** `frontend/src/components/fansubs/ActiveFansubStory.tsx:65` setzt Listener plus 200ms-Interval; `FansubVersionBrowser.tsx:129` schreibt dieselbe Storage-Naht. Der existierende Auswahlcallback `:139` wird von `page.tsx:294` nicht verbunden.
**Trigger:** Gruppenwechsel oder Seite offen lassen. **Ist:** Story folgt spätestens beim nächsten Poll; fünf Storagezugriffe/JSON-Parses pro Sekunde, auch ohne Benutzeraktivität. Kein Netzwerkpoll. Änderungen fremder Tabs können Story ändern, während Browserauswahl unverändert bleibt, weil dieser keinen Storagelistener besitzt.
**Wirkung:** zwei Wahrheiten, periodische Clientarbeit. Same-value setState kann React auslassen; kein Beleg für fünf vollständige Rerenders/s. Cleanup ist korrekt. **Naht:** shared client owner; C-04 gemeinsam lösen.

### C-06 – Edge-Navigation verliert Gridseite beim Überschreiten des Seitenrandes

**Kandidat P2 · Vertrauen hoch · Codebeweis.** `frontend/src/components/anime/AnimeEdgeNavigation.tsx:87` lädt Seite currentPage+1, aber `:123` übergibt unverändertes gridQuery. Nächster Load sucht aktuellen Anime in der alten Seite und gibt bei currentIndex<0 auf (`:68`).
**Trigger:** letzter Anime einer Gridseite → Weiter → erneut Weiter/Zurück. **Ist:** Zielroute besitzt alte Gridseite, Nachbarn fehlen.
**Zusatz:** Klick vor abgeschlossener Initialladung liest nach await die vorherige Renderclosure previousAnime/nextAnime (`:115`/`:119`); erster Klick/erster Hover kann ohne Aktion/Preview bleiben. Eigene Requests haben kein Abbruchsignal.
**Naht:** Zielseite zusammen mit Zielanime führen und Loadergebnis direkt zurückgeben. Separate Tests für Seitenrand, langsamen Erstklick, Tastatur und Navigation während Request.

### C-07 – Beitragsfehler wird als inhaltlich leeres Projekt ausgegeben

**Kandidat P2 · Vertrauen hoch · Codebeweis.** `frontend/src/components/anime/AnimeContributionsSection.tsx:29` verschluckt Fehler, finally setzt loading=false, `:53` zeigt „Noch keine Mitwirkenden eingetragen.“ Der Kommentar „Bereich wird einfach nicht angezeigt“ beschreibt den tatsächlichen Return nicht.
**Trigger:** contributions-Endpoint 500/Netzwerkfehler. **Wirkung:** fachlich falsche Leeranzeige statt Fehler/Retry. **Naht:** scoped ErrorState, echte Empty-Daten separat; kein Ausweiten in Backendberechtigungen.

### C-08 – Erfolgreiche Medienmanifeste haben keine Lebenszeit oder Invalidierung

**Kandidat P2 · Vertrauen hoch für Verhalten, Speicherwirkung ungemessen.** `frontend/src/components/anime/AnimeMediaProvider.tsx:11` hält modulweit für jede ID ein Promise; nur Fehler löschen den Eintrag (`:19`).
**Trigger:** viele verschiedene Anime per SPA besuchen oder Medien ändern und Anime im selben JS-Kontext erneut öffnen. **Ist:** erfolgreicher Manifestwert wird wiederverwendet; kein TTL/Cap/Invalidation. cancelled verhindert setState nach Unmount, bricht Request nicht ab.
**Wirkung:** stale URLs und linearer Cache nach besuchten IDs; keine Aussage über Crash, DOM-Retention oder Megabytes. **Naht:** gebundene Cachepolitik mit expliziter Aktualisierung; deduplizierten gemeinsamen Provider erhalten.

### C-09 – Kommentarhistorie ist auf zehn Einträge begrenzt, ohne Fortsetzung

**Kandidat P2/P3 je Produktanforderung · Vertrauen hoch · Codebeweis.** `frontend/src/app/anime/[id]/page.tsx:109` lädt per_page=10. `frontend/src/components/comments/CommentSection.tsx:43` rendert nur Liste; `commentSectionState.ts:3` begrenzt auch neue lokale Liste auf zehn.
**Trigger:** Anime mit mehr als zehn Kommentaren. **Ist:** Gesamtzahl sichtbar, ältere Kommentare unerreichbar. **Naht:** vorhandene API-Pagination über globales Pagination-Control, falls Historie zum Produktumfang gehört. Keine Behauptung, alle Daten müssten initial geladen werden.

### C-10 – IDs werden nur als Zahlenpräfix geparst; Fehlerseite ohne notFound

**Kandidat P3 · Vertrauen hoch · Codebeweis.** `frontend/src/app/anime/[id]/page.tsx:57` nutzt parseInt, prüft nur NaN/<=0; Fehlerzweige `:59`/`:83` returnen reguläres main statt notFound.
**Trigger:** /anime/1abc oder /anime/1.5; reine Slugroute /anime/buddy-complex. **Ist:** Zahlenpräfixe laden Anime1, reine Slugs ergeben „Ungültige Anime-ID“; kein eigener canonical/Metadata-Export. HTTP-Status im Root-Liveaudit prüfen.
**Naht:** bestehende Projekt-Route-Paramvalidierung als Analogie; keine neue Slugroute ohne Produktentscheidung.

## 5. Medien, Rendering und mögliche Belastung

- Eine Manifestquelle ist korrekt geteilt: `AnimeMediaProvider.tsx:34` → Rotator/Logo/Banner. `frontend/src/app/anime/[id]/page.performance.test.ts:8` schützt bewusst, dass SSR nicht auf Backdrops wartet. Diesen Fetch nicht reflexhaft zurück in das blockierende Promise.allSettled legen.
- Poster existiert als Next Image (`page.tsx:156`), als Hero-CSS-Background (`:139`), als CSS-Reflexion via --poster-image (`:153`, `page.module.css:218`) und Rotatorfallback (`AnimeBackdropRotator.tsx:29`). Das sind unterschiedliche Darstellungen, kein Beweis für vier Netzwerkdownloads; gleiche URL kann Browsercache teilen. Optimizer-/Original-Doppeltransfer muss live gemessen werden.
- `frontend/src/lib/animeBackdrops.ts:27` setzt für Backdrops width=1920/quality=86, Banner `:56` 1280/86, Logo `:70` 760/90; `AnimeMediaProvider.tsx:63`/`:83` umgehen Next Image. Ob die Zielroute diese Queryparameter tatsächlich in Resizing umsetzt, ist eine Backend-/Netzwerkprüfung, kein aus dem Parametername bewiesenes Budget.
- `AnimeBackdropRotator.tsx:123` autoplay/preload auto lädt ein zufälliges Themenvideo; `:87` aktiviert Ton auf beliebigem pointerdown/keydown der Seite. Nach erfolgreichem Aktivieren wird der Tonbutton entfernt; ein Mute-/Pause-Control gibt es dort nicht. **Kandidat P2 Produkt-/A11y-Prüfung**, nicht als bereits gemessene Browserautoplayverletzung melden. Rotation berücksichtigt weder Sichtbarkeit noch prefers-reduced-motion; CSS-Datei hat keinen entsprechenden Rotator-Gate.
- `AnimeContributionsSection.tsx:38` lädt direkt nach Mount, nicht erst near viewport. `FansubVersionBrowser.tsx:218` und `ReleaseVersionBreakdown.tsx:39` mounten Inhalt erst nach Klick, tragen vollständige Daten jedoch schon im initialen Payload. **Kandidat P2 für Skalierung nach Messung**, nicht automatisch alle SSR-Daten in Clientrequests verlagern.
- `AnimeRelations.tsx:118` zeigt Pfeile nach relations.length>3 statt realem Overflow. Bei zwei oder drei breiten Karten auf schmalem Viewport kann Overflow ohne Pfeile bestehen; Touch/Scrollbar bleiben verfügbar (`AnimeRelations.module.css:69`). Der berechnete hasOverflow-State `:50` wird nicht konsumiert. **Kandidat P3**, kein komplett unbedienbarer Slider.
- Timerbilanz: 200ms Storagepoll; 9000ms visuelle Backdroprotation; einmaliger 0ms Setup-Timeout; eventgetriebene RAF in Relations. Kein rekursiver API-Poll in den Detailkomponenten; keine Timer-Leak-Behauptung, vorhandene Timercleanup wurde gelesen.

## 6. Routen und bewusste Kompatibilität

| Quelle | Ziel / Einordnung |
|---|---|
| `frontend/src/app/anime/[id]/page.tsx:96` | Breadcrumb /anime; übergebener grid_query wird nicht zurück in Breadcrumb eingebaut. Filterkontextverlust bei Klick auf „Anime“, Browser-Back kann separat erhalten bleiben. |
| `frontend/src/components/anime/AnimeRelations.tsx:146` | /anime/:numericId; echte vorhandene Route |
| `frontend/src/components/fansubs/ActiveFansubStory.tsx:84`, `page.tsx:274` | /fansubs/:slug; echte öffentliche Gruppenroute |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx:179` | /anime/:id/group/:groupId; echte kompatible Route, kein Deadlink. `frontend/src/app/anime/[id]/group/[groupId]/page.tsx:19` erzeugt canonical Metadata; kein Redirect |
| `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:190` | Numerischer Einstieg hat kein precomputed-Resolverergebnis; lädt public profile zur kanonischen Navigation. Pretty-Routen umgehen das bewusst über Phase155-Resolver. Der Anime-CTA nutzt dadurch den breiteren Pfad; Kandidat P2 Optimierung bei bestätigtem Budget, keine ersatzlose Löschfreigabe |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx:258` | /api/releases/:version.id/stream; Relay tatsächlich vorhanden, liest Access UND Refresh, reicht Range weiter; Backend-Identitätsanalyse separat |
| `frontend/src/app/anime/[id]/page.tsx:311`/`:316` | Fehlerfallback: /episodes/:id für Play UND Download; vorhandene Episode-Detailseite, Downloadlabel führt also zunächst zu derselben Detailseite |
| `frontend/src/components/anime/GroupContributionBlock.tsx:40`, `ReleaseVersionBreakdown.tsx:52` | Namen als Text, keine Memberlinks. Projekt-Drilldown-Helper aus Phase155 könnte nach geklärtem Kontext wiederverwendet werden, kein vorhandener kaputter Link |

Backend-Agent bestätigt read-only: grouped version.id ist `release_variants.id`; Streamauflösung unterstützt variant- und release-version-ID bewusst. In der geprüften Live-DB gab es keine kollidierenden IDs mit abweichender Release-Version. Deshalb KEIN Befund „falsches Release abgespielt“ allein aufgrund der Benennung.

`frontend/src/lib/utils.ts:8`/`:35` dokumentiert bestehende /covers- und neue /media-Pfade als Bildresolver-Kompatibilität. `frontend/src/lib/api.ts`-Typnamen EpisodeVersion und der /episodes-Gruppierungsendpoint sind ohne Datenflussnachweis keine Legacyfehler.

## 7. CSS, Duplikate und Bereinigungsbedarf

**Kandidat P3 · Quellcodebeweis, keine ungeprüfte visuelle Neugestaltung.**

- `frontend/src/app/anime/[id]/page.module.css:1` benennt eine eigene „Plex/AniList Style“-Oberfläche; 789 Zeilen mit direktem Dark-Background (`:12`), Weiß-/Grau-/Orange-/Grünwerten (`:269`, `:284`, `:303`, `:337`), lokalem Glassmorphism und Blur (`:119`, `:139`, `:349`). Dies ist technische Theme-/Pflegedrift zu den gemeinsamen Primitives; allein daraus folgt keine Freigabe für ein Redesign.
- Nach Abgleich aller styles.X-Verwendungen gegen dieses Modul fehlen keine Pageklassen. Drei deklarierte Klassen werden im Page-Consumer nicht verwendet: edgeNavigation, relatedRailSection, relatedRailWrapper. Vor späterem Entfernen repositoryweiten Klassenzugriff prüfen.
- `page.module.css:702` versteckt die einzige Genreanzeige <=767px vollständig. **Kandidat P2/P3:** Inhalt fehlt auf Mobil, nicht nur Layoutänderung; keine alternative mobile Genreanzeige in page.tsx.
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx:62` besitzt eigenen Logo-Resolver statt der gemeinsamen Mediennaht; `/api/` wird dort unverändert zurückgegeben, während `frontend/src/lib/utils.ts:26` resolveApiUrl nutzt. Abweichende Ursprünge sind konfigurationsabhängig; kein pauschaler 404-Nachweis.
- ActiveFansubStory/FansubVersionBrowser duplizieren Storage-Key, Gruppeninitialisierung, Parsing und Fallback. Konsolidierung hat konkreten Effekt auf C-04/C-05.
- `GroupContributionBlock.tsx:34` und `ReleaseVersionBreakdown.tsx:46` duplizieren Personen-/Historisch-/Rollen-Markup; CSS wird bereits geteilt. Kleine Contributorzeile wäre eine saubere Wiederverwendung, keine fachliche Zusammenlegung von Serien- und Releasebeiträgen.
- AnimeRelations definiert eine eigene AnimeRelation-Struktur (`:10`) parallel zu `frontend/src/types/anime.ts:104`. Typenumlabels in Relations/EdgeNavigation sind Präsentationsmaps mit Fallback, keine zweite autoritative Rollenregistry.
- `WatchlistAddButton.tsx:55` enthält „hinzugefuegt“; auf der Anime-Seite derzeit durch C-02 verborgen. `CommentForm.tsx:49`/`:54` zeigt technische „content“-Fehlertexte. Richtige deutsche UI-Texte beim jeweiligen fokussierten Fix herstellen.
- Ein lokaler CSS-Farbwert oder ein 9000ms-Animationstimer ist nicht dieselbe Fehlerklasse wie die in Phase150 entfernten fachlichen Schwellen. Keine dieser Detailkomponenten berechnet Badgefortschritt oder Segmentautorität selbst.

## 8. Negativbefunde, Grenzen und Folgearbeit

**Gesichert legitime Muster:** Serverkomposition mit Client-children-Slots; parallele zweite SSR-Welle statt serieller Einzelrequests; allSettled für mehrere unabhängige Bereiche; gemeinsamer Manifestprovider; Story-Fakten ohne Gruppen-Detail-N+1; Key=anime.id setzt animebezogenen State bei echter ID-Navigation zurück; keine direkte UI-Bearerkonstruktion; Streamrelay hat Refreshunterstützung; klare Unterschiede zwischen Animation, Storagepoll und APIrequests; vorhandene Cleanup-Funktionen; Textausgabe statt dangerous HTML in Kommentaren.

**Offene Verifikation:** authentifizierter Refresh-only Livefall; Hydration mit gültiger gespeicherter Zweitgruppe; Cache-Retention/Medieninvalidierung; echte Optimizer-Bytes und Videotransfer; Edge-Gridseitenrand; Watchlistfehleranzeige; >10 Kommentare; Impact der CSS-Sonderoberfläche. Keine eigene Browsermessung oder neue Testdatei wurde ausgeführt/erstellt. Typecheck/build/lint sind für dieses reine Markdown-Artefakt nicht erforderlich; Root kann vorhandene fokussierte Tests zur Baseline ausführen. Gelesene Tests: `frontend/src/app/anime/[id]/page.performance.test.ts:8`; auffindbar außerdem `frontend/src/components/anime/AnimeMediaProvider.test.tsx`, `GroupContributionBlock.test.tsx` im selben Verzeichnis, `frontend/src/components/fansubs/__tests__/ActiveFansubStory.test.tsx`. Keine spezielle EdgeNavigation-/CommentForm-/WatchlistAddButton-Testdatei beim namensbasierten Scan gefunden; das ist keine Behauptung, indirekte Abdeckung existiere nicht.

| Begrenztes Folgethema | Dependency / vorhandene Naht | Verifikation |
|---|---|---|
| Auth-Gates und Watchlistzustand | C-01/C-02, useAuthSession + zentrale API; vorher SSR/Client-Vertrag festlegen | access fehlt/refresh gültig; echter Fehler; Sessionevent nach Mount; keine Cookie-/Bearerduplikation |
| Eine Gruppenwahl mit deterministischer Hydration | C-04/C-05 gemeinsam; vorhandener Callback | primary/gespeichert/stale IDs/Storage blockiert/multitab; null Idle-Poll |
| Gridnavigation | C-06, animeGridContext | erster Klick bei langsamer Antwort, Prev/Next Seitenrand, fehlender currentIndex, stale Request |
| Wahrheitsgemäße Daten und Fehler | C-03/C-07/C-09; keine neue Rating-/Embyquelle erfinden | zwei Anime ohne Rating; geänderte ID; contributions 500 vs []; Kommentarpagination falls freigegeben |
| Medienbudget und Cache | C-08 + Root-Netzwerkbefund; AnimeMediaProvider erhalten | wiederholte SPA-Wechsel, neuer Manifestwert, Budget kalt/warm/mobile, keine Mehrfachrequests |
| Projektroute/Read-Model | Phase155-Resolver + Backendbudget; Kanonisierung an bestehende Slugs binden | navigierbarer CTA mit bounded Queryzahl, identische Projekt-/Releasezuordnung |
| Kleine CSS-/Markup-Konsolidierung | nach Funktionsfixes, approved UI-Spec notwendig bei visueller Änderung | mobile Genreverfügbarkeit, globale Tokenvalidierung, keine generischen Layoutumbauten |

**Dokumentprüfung:** ausschließlich dieses Audit-Artefakt geschrieben. Remote `git diff --check` und `git diff --no-index --check /dev/null docs/audits/2026-09-13-public-anime-detail/COMPONENTS-AND-CLIENT.md` ohne Ausgabe bestanden; Status und Zeilenzahl kontrolliert. Keine Behauptung, die gesamte öffentliche Anime-Detailseite sei bereits modernisiert oder abgenommen.

**Read-only Fixtureprüfung:** GET `/api/v1/anime?page=1&per_page=1` und `page=1&per_page=30` liefern nur Anime 1 (Buddy Complex), total=1. Seite 2 ist leer; keine Mehrgruppenfixture gefunden. Der Edge-Seitenrand und Hydration mit gültiger Zweitgruppe bleiben daher codebelegte Testfälle ohne Livebeweis. Es wurden keine Fixtures angelegt.

## 9. Eng begrenzter Nachtrag: Live-Sichtbarkeit und CSS-Geometrie

**Anlass:** Der koordinierende Agent hat die Live-Screenshots persönlich geprüft: Episodentitel existieren im Accessibility-Baum, sind auf weißen Karten praktisch unsichtbar; die Beitragsüberschrift ist dunkel auf dunklem Hintergrund. Gemeldete Fullpage-Bildbreiten: 454px bei Viewport 390px und 1555px bei Viewport 1440px. Dieser Agent hat ausschließlich die CSS-Ursachen gelesen; Computed Styles, Geometrie und tatsächliches Scrollverhalten ermittelt der koordinierende Agent separat.

### C-11 – Lokale dunkle Seite und helle Karten haben keinen gemeinsamen Farbkontext

**Kandidat P1 · Vertrauen hoch · Quellcode, Screenshots und Live-Computed-Styles bestätigt.** Wesentliche Episodentitel der primären Inhaltsliste sind mit 1:1-Kontrast unsichtbar; dies betrifft nicht nur eine dekorative Randinformation.

Der unsichtbare Episodentitel ist keine fehlende API-Antwort:

1. `frontend/src/app/anime/[id]/page.module.css:13` setzt am gemeinsamen Seitenvorfahren `color: #fff`.
2. `frontend/src/components/fansubs/FansubVersionBrowser.module.css:103` setzt für `.episodeCard` einen weißen Hintergrund (`:106`), aber keine eigene Textfarbe.
3. `.episodeHeader` erzwingt `color: inherit` (`:114`); `.summaryLine` setzt nur Margin, Gewicht und Größe (`:130`), übernimmt also das Weiß.
4. `frontend/src/styles/globals.css:9` definiert `--color-white: #ffffff`. Daraus folgt für diesen Titel weißer Text auf weißem Kartenuntergrund. Folgezahl und Countbadge besitzen dagegen eigene Farben (`FansubVersionBrowser.module.css:124`/`:136`) und können sichtbar bleiben.
5. Auch `.versionGroupName` (`FansubVersionBrowser.module.css:203`) setzt keine Farbe, obwohl `.versionRow` den hellen `--color-bg-light`-Untergrund verwendet (`:161`). Das ist derselbe Quellmechanismus im ausgeklappten Zweig; dessen Live-Sichtbarkeit separat prüfen.

**Livebeleg:** Der Root-Agent hat in `docs/audits/2026-09-13-public-anime-detail/evidence/layout.json` für mobil und Desktop summaryLine `rgb(255,255,255)` auf episodeCard `rgb(255,255,255)` gemessen. Die Contribution-Überschrift ist `rgb(28,28,30)`, der Main-Hintergrund `rgb(15,15,18)`. Die zugehörigen Screenshots hat Root persönlich geprüft.

Bei der Beitragsüberschrift liegt die umgekehrte Fehlkombination vor: `frontend/src/components/anime/AnimeContributionsSection.module.css:11` verwendet `var(--color-text-primary, #e0e0e0)`. Der globale Token ist mit `#1c1c1e` definiert (`frontend/src/styles/globals.css:10`); deshalb greift der helle Fallback gerade NICHT. Die Section hat keinen deckenden eigenen Hintergrund (`AnimeContributionsSection.module.css:1`), ihr Page-Vorfahre ist `#0f0f12` (`page.module.css:12`). Gruppen-/Personennamen verwenden dieselbe Tokenkombination in `frontend/src/components/anime/GroupContributionBlock.module.css:20`/`:54`; die aktuelle Livefixture ohne Contributions erlaubt dort noch keine Sichtbarkeitsbestätigung.

**Wirkung:** zentrale Textinformation ist trotz vorhandenem DOM visuell nicht sinnvoll lesbar. **Begrenzte Folgemaßnahme:** Oberflächen- und Textfarben paarweise an die vorhandenen Tokens anschließen; Screenshot- und Kontrastnachweis für geschlossene/ausgeklappte Episode, Beiträge sowie mobile/desktop. Keine neue Palette und kein allgemeines Redesign nötig. Der Phase149-Guard kann diesen Fehler nicht entdecken: alle referenzierten Tokens existieren oder besitzen erlaubte Fallbacks; falsch ist ihre Kombination mit der lokalen Oberfläche.

### C-12 – Überstehendes Banner erzeugt echte horizontale Seitenscrollbarkeit

**Kandidat P2 · Vertrauen hoch · Quellcode, BoundingRect und tatsächlicher document scroll bestätigt.**

`frontend/src/app/anime/[id]/page.module.css:48` positioniert `.heroBanner` über die ganze Seitenbreite und lässt `overflow: visible` (`:54`). Das innere `.bannerImage` ragt mit `left: -40px`/`right: -40px` (`:61`/`:62`) über diesen Container hinaus und wird zusätzlich um Faktor 1.1 vergrößert (`:67`). Bei normalem mittigen Transform-Origin liegt die rechte Kante daher bei:

`pageLeft + pageWidth + 40px + 0.05 × (pageWidth + 80px)`.

- Mobil: PageLeft=0, PageWidth=390 ergibt **453.5px**, aufgerundet genau die gemeldeten **454px**.
- Desktop: `frontend/src/components/layout/AppShell.module.css:2`/`:5` reserviert 16px Shellrand, `:254` legt Content in Spalte 2. PageLeft=16, PageWidth=1424 ergibt **1555.2px**, passend zur gemeldeten **1555px**.
- Unter 860px wechselt die Shell auf block (`AppShell.module.css:259`); das erklärt, warum mobil kein 16px-Abzug angesetzt wird.
- Der separat skalierte Rotator (`frontend/src/components/anime/AnimeBackdropRotator.module.css:14`, Faktor 1.06) ist ebenfalls dekorativer Überhang, erklärt diese zwei Messwerte aber nicht so genau wie das Banner.

**Livebestätigung über die reine Screenshotbreite hinaus:** `docs/audits/2026-09-13-public-anime-detail/evidence/layout.json` dokumentiert mobil Viewport390 / documentScrollWidth454 / bannerImage.x=-63.5 / right=453.5 und nach `window.scrollTo(100,0)` tatsächlich `scrollX=64`. Desktop: Viewport1440 / documentScrollWidth1555 / bannerImage.x=-99.2 / right=1555.2 / erreichbares `scrollX=100`. Damit ist die Bannergeometrie exakt bestätigt und horizontales Scrollen tatsächlich möglich. `frontend/src/styles/globals.css:201` setzt zwar `body { overflow-x: clip }`, verhindert in dieser gemessenen Dokumentkonstellation aber nicht den Root-Scroll. Keine Behauptung über eine permanente sichtbare Scrollbar nötig; die programmatisch nachgewiesene horizontale Scrollbarkeit genügt.

**Begrenzte Folgemaßnahme:** dekorativen Bannerüberhang am zuständigen Bannercontainer begrenzen; keinen globalen overflow-hidden-Hotfix, der Sticky-Verhalten oder fokussierbare Inhalte beschädigt. Gegentests: Banner bleibt weich, Inhalt bleibt vollständig erreichbar, Desktop-/Mobile-Screenshot entspricht Viewport, keine abgeschnittenen Navigationselemente.

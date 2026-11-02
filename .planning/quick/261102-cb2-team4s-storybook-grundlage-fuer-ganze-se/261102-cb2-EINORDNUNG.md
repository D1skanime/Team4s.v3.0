# Einordnungs-Tabelle: /anime und /anime/[id] -- Baustein vs. Eigenbau

**Erstellt:** 2026-11-02 (Quick-Task 261102-cb2, Task 8)
**Zweck:** Rückfrage-Artefakt. Klassifiziert jeden visuell unterscheidbaren Teil der beiden
Pilotseiten nach dem Server/Ansicht-Split (Task 4/5) in eine von drei Kategorien:
`vorhandener Grundbaustein`, `vorhandener zusammengesetzter Baustein`, `Eigenbau (seiteneigenes
JSX/CSS)`. Trifft KEINE Entscheidung über neue Bausteine -- das ist laut CONTEXT.md bewusst
Schritt 3 für einen Folgeauftrag.

## /anime -- `frontend/src/app/anime/AnimeListView.tsx`

| Seitenteil | Bausteintyp | Datei:Zeile |
|---|---|---|
| Header/Kicker-Text ("P0 MVP", Titel, Treffer-Untertitel) | Eigenbau (seiteneigenes JSX/CSS) | `AnimeListView.tsx:48-54` (`page.module.css` `.header`/`.kicker`/`.title`/`.subtitle`) |
| A-Z-Buchstabenfilter | vorhandener zusammengesetzter Baustein (`LetterFilter`) | `AnimeListView.tsx:56` (`@/components/anime/LetterFilter.tsx`) |
| Anime-Grid | vorhandener zusammengesetzter Baustein (`AnimeGrid`) | `AnimeListView.tsx:57` (`@/components/anime/AnimeGrid.tsx`) |
| Scroll-Wiederherstellung | Eigenbau-Fachkomponente (`AnimeGridScrollRestorer`, reine `useEffect`-Logik ohne eigenes sichtbares Markup) | `AnimeListView.tsx:46` (`@/components/anime/AnimeGridScrollRestorer.tsx`) |
| Seitennavigation | vorhandener Grundbaustein (`Pagination`, `@/components/ui`) | `AnimeListView.tsx:64-68` |
| Fehlerzustand ("Liste konnte nicht geladen werden") | Eigenbau (seiteneigenes JSX/CSS) | `AnimeListView.tsx:33-39` (`page.module.css` `.errorBox`) |

## /anime/[id] -- `frontend/src/app/anime/[id]/AnimeDetailView.tsx`

| Seitenteil | Bausteintyp | Datei:Zeile |
|---|---|---|
| Breadcrumbs | vorhandener zusammengesetzter Baustein (`Breadcrumbs`) | `AnimeDetailView.tsx:83` (`@/components/navigation/Breadcrumbs.tsx`) |
| Backdrop-Rotator (Jellyfin-Videos/-Bilder) | vorhandener Fachbaustein (`AnimeBackdropRotator`, domänenspezifisch außerhalb `components/ui`) | `AnimeDetailView.tsx:70` (`@/components/anime/AnimeBackdropRotator.tsx`) |
| Banner-Hintergrund (unscharfer Fallback) | Eigenbau (seiteneigenes `<div>` mit Inline-`style`) | `AnimeDetailView.tsx:73-79` (`page.module.css` `.heroBanner`/`.bannerImage`/`.bannerOverlay`) |
| Poster-Bild | Eigenbau/Next.js-Primitive (`next/image`s `Image`, kein eigener Team4s-Grundbaustein) | `AnimeDetailView.tsx:95-103` |
| Poster-Statistik-Overlay ("X Episodes") | Eigenbau (seiteneigenes `<div>`/`<span>`) | `AnimeDetailView.tsx:105-106` (`page.module.css` `.posterStats`/`.posterEpisodes`) |
| Watchlist-Button | Eigenbau-Fachkomponente (`WatchlistAddButton`, domänenspezifische Komposition aus `Button` + eigenem Client-Fetch-State, kein `@/components/ui`-Baustein) | `AnimeDetailView.tsx:112-116` (`@/components/watchlist/WatchlistAddButton.tsx`) |
| Genres-Chip-Liste | Eigenbau (`Link` + eigene CSS-Klassen, kein Chip-/Tag-Grundbaustein) | `AnimeDetailView.tsx:118-131` (`page.module.css` `.genresSection`/`.genreChip`) |
| Titel + Logo | vorhandener Fachbaustein (`AnimeTitleLogo`) + Eigenbau-`<h1>` für den Titel selbst | `AnimeDetailView.tsx:138-141` (`@/components/anime/AnimeMediaProvider.tsx`; `page.module.css` `.titleRow`/`.title`/`.titleLogo`) |
| Status-/Typ-/Jahr-Badges | `StatusBadge` ist ein vorhandener Fachbaustein; die drei übrigen (`Typ`/`content_type`/`Jahr`) sind Eigenbau-`<span>` OHNE den `Badge`-Grundbaustein aus `@/components/ui` -- nur dokumentiert, NICHT geändert (Scope-Grenze "keine neuen UI-Bausteine bauen") | `AnimeDetailView.tsx:144-149` (`@/components/anime/StatusBadge.tsx` für `StatusBadge`; `page.module.css` `.badges`/`.badge` für die drei Eigenbau-Spans) |
| Beschreibung | Eigenbau (seiteneigenes `<p>`) | `AnimeDetailView.tsx:152-154` (`page.module.css` `.description`) |
| Tags-Liste | Eigenbau (`Link` + eigene CSS-Klassen, identisches Muster wie Genres-Chips) | `AnimeDetailView.tsx:157-171` (`page.module.css` `.tagsSection`/`.tagChip`) |
| Emby-Link | Eigenbau (seiteneigenes `<a>`) | `AnimeDetailView.tsx:175-183` (`page.module.css` `.statsRow`/`.embyLink`) |
| Info-Banner (Jellyfin) | vorhandener Fachbaustein (`AnimeInfoBanner`) | `AnimeDetailView.tsx:189` (`@/components/anime/AnimeMediaProvider.tsx`) |
| Verwandte Anime | vorhandener Fachbaustein (`AnimeRelations`) | `AnimeDetailView.tsx:192-195` (`@/components/anime/AnimeRelations.tsx`; `page.module.css` `.relatedSection`) |
| Edge-Navigation (Vorheriger/Nächster Anime im Grid-Kontext) | vorhandener Fachbaustein (`AnimeEdgeNavigation`) | `AnimeDetailView.tsx:200-203` (`@/components/anime/AnimeEdgeNavigation.tsx`) |
| Episoden-Browser (Fansub-Filter + Versionsliste) | vorhandener Fachbaustein (`FansubVersionBrowser`) | `AnimeDetailView.tsx:212-221` (`@/components/fansubs/FansubVersionBrowser.tsx`) |
| Episoden-Fehlerzustand ("Episoden konnten nicht geladen werden") | Eigenbau (seiteneigenes `<div role="alert">`, bewusst Literal-Text statt `ErrorState`-Primitive -- siehe Code-Kommentar zu `page.test.tsx`s flacher Baumwanderung) | `AnimeDetailView.tsx:230-233` (`page.module.css` `.emptyEpisodes`) |

## Rückfrage an den Menschen

Folgende Eigenbau-Teile sind Kandidaten für einen künftigen neuen Grundbaustein oder
zusammengesetzten Baustein -- diese Liste trifft bewusst KEINE Entscheidung und baut nichts,
das bleibt Schritt 3 für einen Folgeauftrag:

1. **Status-/Typ-/Jahr-Badges** (`AnimeDetailView.tsx:146-148`, die drei `<span className={styles.badge}>`-Elemente neben dem bereits per `StatusBadge` abgedeckten Status): visuell identisch zu einer Badge-artigen Pille, aber nicht über den vorhandenen `Badge`-Grundbaustein (`@/components/ui`) gebaut. Lohnt sich eine Migration auf `Badge`, oder ist die aktuelle Eigenbau-Form (schlichtes Pillenlabel ohne Farbsemantik) bewusst einfacher gehalten als `Badge`s Status-Varianten (`success`/`warning`/`danger` usw.)?
2. **Poster-Statistik-Overlay** (`AnimeDetailView.tsx:105-106`, "X Episodes" über dem Poster): ein wiederkehrendes visuelles Muster (Zahl-Overlay auf einem Bild), das bislang nur hier existiert. Wäre ein eigener kleiner Grundbaustein (z. B. "Bild-Statistik-Badge") für künftige Bild-Karten sinnvoll, oder bleibt das ein Einzelfall dieser Seite?
3. **Genres-/Tags-Chip-Listen** (`AnimeDetailView.tsx:118-131` und `157-171`): zwei strukturell identische Link-Chip-Listen (gleiche visuelle Form, unterschiedliche Such-Zielparameter). Lohnt sich ein gemeinsamer "Filter-Chip-Liste"-Baustein, oder bleiben die beiden Stellen zu seitenspezifisch (`buildFilterHref('genre'|'tag', ...)`) für eine sinnvolle Grundbaustein-Extraktion?

Alle drei Punkte sind rein dokumentierend -- keiner wurde in diesem Auftrag umgesetzt oder
entschieden.

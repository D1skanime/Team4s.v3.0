# Einordnungs-Tabelle: /anime und /anime/[id] -- Baustein vs. Eigenbau

**Erstellt:** 2026-11-02 (Quick-Task 261102-cb2, Task 8)
**Zweck:** Rückfrage-Artefakt. Klassifiziert jeden visuell unterscheidbaren Teil der beiden
Pilotseiten nach dem Server/Ansicht-Split (Task 4/5) in eine von drei Kategorien:
`vorhandener Grundbaustein`, `vorhandener zusammengesetzter Baustein`, `Eigenbau (seiteneigenes
JSX/CSS)`.

**Status (261102-hlg):** Schritt 3 (Quick-Task 261102-hlg) hat die unten stehende Rückfrage
vollständig beantwortet und umgesetzt -- siehe Abschnitt "Antwort umgesetzt (261102-hlg)" am Ende
dieser Datei. Beide Tabellen spiegeln den finalen Code nach diesem Auftrag wider (gegen den
tatsächlichen finalen Code per `grep -n` erneut geprüft, keine Zwischenstände).

**Hinweis:** Die Zeilenangaben wurden nach der abschließenden Code-Review-Korrekturrunde
(Pagination-Platzhalter-Kollision, Storybook-Cookie-Isolation, Kommentar-Präzisierungen) UND nach
Schritt 3 (261102-hlg: LinkChip/BannerSection/Card-Glas-Varianten, Design-System-Pflichtnutzung)
erneut gegen den finalen Code geprüft und aktualisiert.

## /anime -- `frontend/src/app/anime/AnimeListView.tsx`

| Seitenteil | Bausteintyp | Datei:Zeile |
|---|---|---|
| Header/Kopfzeile (Titel + Trefferzahl) | vorhandener zusammengesetzter Baustein (`PageHeader`) | `AnimeListView.tsx:34`/`47` (`@/components/ui/PageHeader.tsx`) |
| A-Z-Buchstabenfilter | vorhandener zusammengesetzter Baustein (`LetterFilter`) | `AnimeListView.tsx:49` (`@/components/anime/LetterFilter.tsx`) |
| Anime-Grid | vorhandener zusammengesetzter Baustein (`AnimeGrid`) | `AnimeListView.tsx:50` (`@/components/anime/AnimeGrid.tsx`) |
| Scroll-Wiederherstellung | Eigenbau-Fachkomponente (`AnimeGridScrollRestorer`, reine `useEffect`-Logik ohne eigenes sichtbares Markup) | `AnimeListView.tsx:45` (`@/components/anime/AnimeGridScrollRestorer.tsx`) |
| Seitennavigation | vorhandener Grundbaustein (`Pagination`, `@/components/ui`) | `AnimeListView.tsx:61-65` |
| Fehlerzustand ("Liste konnte nicht geladen werden") | vorhandener zusammengesetzter Baustein (`ErrorState`) | `AnimeListView.tsx:35-38` (`@/components/ui/ErrorState.tsx`) |
| Ladezustand (`AnimeListLoading.tsx`) | vorhandene zusammengesetzte Bausteine (`PageHeader` + `LoadingState`) | `AnimeListLoading.tsx:12-13` |

## /anime/[id] -- `frontend/src/app/anime/[id]/AnimeDetailView.tsx`

| Seitenteil | Bausteintyp | Datei:Zeile |
|---|---|---|
| Breadcrumbs | vorhandener zusammengesetzter Baustein (`Breadcrumbs`) | `AnimeDetailView.tsx:84` (`@/components/navigation/Breadcrumbs.tsx`) |
| Banner-Hintergrund (unscharfer Fallback + Scrim) | neuer zusammengesetzter Baustein (`BannerSection`) | `AnimeDetailView.tsx:78-80` (`@/components/ui/BannerSection.tsx`) -- `AnimeBackdropRotator` bleibt eigenständiger Fachbaustein, darin komponiert |
| Poster-Bild | vorhandene Grundbausteine (`MediaFrame` + `ResponsiveImage`) | `AnimeDetailView.tsx:96-105` |
| Poster-Statistik-Overlay ("N Folgen"/"1 Folge") | vorhandener Grundbaustein (`Badge`, `variant="onMedia"`, im `MediaFrame`-`bottomBadge`-Slot) | `AnimeDetailView.tsx:68-71`/`96` |
| Watchlist-Button | Eigenbau-Fachkomponente (`WatchlistAddButton`, domänenspezifische Komposition aus `Button` + eigenem Client-Fetch-State, kein `@/components/ui`-Baustein) | `AnimeDetailView.tsx:111-115` (`@/components/watchlist/WatchlistAddButton.tsx`) |
| Genres-Chip-Liste | neuer Grundbaustein (`LinkChip`, `tone="glass"`) | `AnimeDetailView.tsx:122-124` |
| Titel + Logo | `AnimeTitleLogo` bleibt vorhandener Fachbaustein; Titel selbst ist jetzt vorhandener Grundbaustein (`Heading`, `tone="onScrim"`) | `AnimeDetailView.tsx:140-141` |
| Info-Karte (Flächenoptik) | neue Card-Variante (`Card variant="glass"`) | `AnimeDetailView.tsx:137` (`@/components/ui/Card.tsx`) |
| Status-/Typ-/Jahr-Badges | `StatusBadge` bleibt eigenständiger Fachbaustein (eigenes CSS-Modul, eigene Status-Farblogik); die drei übrigen (`Typ`/`content_type`/`Jahr`) nutzen jetzt den vorhandenen Grundbaustein `Badge` (`variant="neutral"`) | `AnimeDetailView.tsx:150-153` |
| Beschreibung | vorhandener Grundbaustein (`Text`, `tone="onScrim"`) | `AnimeDetailView.tsx:157-159` |
| Tags-Liste | neuer Grundbaustein (`LinkChip`, `tone="scrim"`) | `AnimeDetailView.tsx:170-172` |
| Emby-Link | vorhandener Grundbaustein (`Button`, Link-Modus via `href`) | `AnimeDetailView.tsx:182-191` |
| Info-Banner (Jellyfin) | vorhandener Fachbaustein (`AnimeInfoBanner`) | `AnimeDetailView.tsx:196` (`@/components/anime/AnimeMediaProvider.tsx`) |
| Verwandte Anime | vorhandener Fachbaustein (`AnimeRelations`) | `AnimeDetailView.tsx:199-203` (`@/components/anime/AnimeRelations.tsx`; `page.infoCard.module.css` `.relatedSection`) |
| Edge-Navigation (Vorheriger/Nächster Anime im Grid-Kontext) | vorhandener Fachbaustein (`AnimeEdgeNavigation`) | `AnimeDetailView.tsx:207-211` (`@/components/anime/AnimeEdgeNavigation.tsx`) |
| Episoden-Browser (Fansub-Filter + Versionsliste) | vorhandener Fachbaustein (`FansubVersionBrowser`), dessen Episoden-/Release-Kartenebene jetzt selbst aus Grundbausteinen besteht (`EpisodeGlassCard`/`ReleasePreviewRow`, siehe unten) | `AnimeDetailView.tsx:219-229` (`@/components/fansubs/FansubVersionBrowser.tsx`) |
| Episoden-Fehlerzustand ("Episoden konnten nicht geladen werden") | vorhandener zusammengesetzter Baustein (`ErrorState`, kompakt) | `AnimeDetailView.tsx:235-239` |

### Episoden-/Release-Kartenebene innerhalb von `FansubVersionBrowser` (261102-hlg, Ebene 2)

| Seitenteil | Bausteintyp | Datei:Zeile |
|---|---|---|
| Episodenkarte (Klassifikations-Tönung, Kopfzeile, Versionsliste) | `EpisodeGlassCard` nutzt jetzt `Card variant="glass"` + generischen `tintHue`-Hook + `DisclosureTrigger` + `Text` statt feature-lokaler `--glass-*`-Literale | `frontend/src/components/fansubs/EpisodeGlassCard.tsx:43` (`<Card variant="glass" tintHue={tintHue} ...>`) |
| Release-/Versionszeile (Gruppenlogo, Technik-/Extras-/Datumszeile) | `ReleasePreviewRow` nutzt jetzt `Card variant="glassStrong"` + `Avatar` (Logo-Fallback) + `Text` | `frontend/src/components/fansubs/ReleasePreviewRow.tsx:44` (`<Card variant="glassStrong">`) |
| Episoden-Überschrift ("Episoden (N)") | vorhandener Grundbaustein (`Heading`, `tone="onScrim"`) statt rohem `<h2>` | `frontend/src/components/fansubs/FansubVersionBrowser.tsx:305` |

## Weitere öffentliche Karten-/Glas-Flächen außerhalb dieses Auftrags

D-05-Abnahme-Pflicht (261102-hlg): andere öffentliche Seiten mit derselben durchscheinenden/
dunklen Flächenoptik, die in DIESEM Auftrag NICHT umgestellt wurden, aber mit derselben Optik
künftig folgen können. Diese Liste ist **nicht tiefenanalysiert** -- sie listet per `grep -rln
"backdrop-filter"` gefundene Kandidaten, ohne jeden einzeln gegen den exakten Bestand (Werte,
Duplikate, Testabdeckung) zu prüfen, wie es `261102-hlg-RESEARCH-CARD.md` für `EpisodeGlassCard`/
`ReleasePreviewRow`/`/anime/[id]` getan hat:

- `frontend/src/app/fansubs/[slug]/page.module.css:44-58` (`.heroBackdropTuning` -- unscharfer
  Blur/Brightness/Saturate-Hintergrund, Vorbild für `BannerSection`s Rezeptur, selbst aber nicht
  umgestellt) und `:116-124` (`.heroBodyOnBanner::before` -- flächiger WCAG-AA-Scrim, KEINE
  Glaskarte, siehe RESEARCH-CARD.md Abschnitt 9 -- bewusst kein Kandidat für `Card variant="glass"`).
- `frontend/src/app/anime/[id]/group/[groupId]/page.module.css` (Projektseiten-Hero).
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.module.css`,
  `ReleaseGallery.module.css`, `ReleaseNotesList.module.css`, `ThemeTimeline.module.css`
  (Release-Detailseite).
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.module.css` (laut
  RESEARCH-CARD.md Abschnitt 5 die historische Quelle von `ReleasePreviewRow`s Blur/Saturate-Wert
  -- vermutlich bereits strukturell verwandt, nicht verifiziert).
- `frontend/src/components/fansubs/PublicReleaseBlock.module.css`, `FansubGroupPicker.module.css`,
  `FansubGroupContext.module.css` (Fansub-Browser-Umgebung).
- `frontend/src/components/anime/AnimeRelations.module.css`,
  `frontend/src/components/anime/AnimeEdgeNavigation.module.css` (beide bewusst NICHT angefasst,
  Scope-Grenze dieses Auftrags).
- `frontend/src/app/me/profile/page.module.css` (öffentliches Profil, außerhalb der Anime-/Fansub-
  Seitenfamilie).

## Rückfrage an den Menschen

Folgende Eigenbau-Teile waren Kandidaten für einen künftigen neuen Grundbaustein oder
zusammengesetzten Baustein -- diese Liste traf ursprünglich bewusst KEINE Entscheidung und baute
nichts (Quick-Task 261102-cb2, Task 8):

1. **Status-/Typ-/Jahr-Badges** (ursprünglich `AnimeDetailView.tsx:147-149`, die drei
   `<span className={styles.badge}>`-Elemente neben dem bereits per `StatusBadge` abgedeckten
   Status): visuell identisch zu einer Badge-artigen Pille, aber nicht über den vorhandenen
   `Badge`-Grundbaustein (`@/components/ui`) gebaut. Lohnt sich eine Migration auf `Badge`, oder
   ist die aktuelle Eigenbau-Form (schlichtes Pillenlabel ohne Farbsemantik) bewusst einfacher
   gehalten als `Badge`s Status-Varianten (`success`/`warning`/`danger` usw.)?
2. **Poster-Statistik-Overlay** (ursprünglich `AnimeDetailView.tsx:106-108`, "X Episodes" über dem
   Poster): ein wiederkehrendes visuelles Muster (Zahl-Overlay auf einem Bild), das bislang nur
   hier existiert. Wäre ein eigener kleiner Grundbaustein (z. B. "Bild-Statistik-Badge") für
   künftige Bild-Karten sinnvoll, oder bleibt das ein Einzelfall dieser Seite?
3. **Genres-/Tags-Chip-Listen** (ursprünglich `AnimeDetailView.tsx:119-132` und `159-174`): zwei
   strukturell identische Link-Chip-Listen (gleiche visuelle Form, unterschiedliche
   Such-Zielparameter). Lohnt sich ein gemeinsamer "Filter-Chip-Liste"-Baustein, oder bleiben die
   beiden Stellen zu seitenspezifisch (`buildFilterHref('genre'|'tag', ...)`) für eine sinnvolle
   Grundbaustein-Extraktion?

## Antwort umgesetzt (261102-hlg)

Der Mensch hat die obige Rückfrage wörtlich beantwortet (`261102-hlg-CONTEXT.md`); Quick-Task
261102-hlg hat ALLE vier Auflösungen umgesetzt:

1. **Status-/Typ-/Jahr-Badges** → **teilweise übernommen**: die drei Metadaten-Pillen (Typ/
   Content-Type/Jahr) nutzen jetzt `Badge variant="neutral"` (`AnimeDetailView.tsx:151-153`).
   `StatusBadge` bleibt bewusst ein eigenständiger Fachbaustein (eigene Status-Farblogik) --
   beide sind jetzt offiziell nebeneinander bestehende "Badge-Familien"-Mitglieder, keine
   vollständige Vereinheitlichung.
2. **Poster-Statistik-Overlay** → `Badge` (`variant="onMedia"`) + `MediaFrame`s `bottomBadge`-Slot
   (`AnimeDetailView.tsx:68-71`/`96`) -- löst gleichzeitig die 0/unbekannt-Ausblendung und die
   deutsche Singular-/Plural-Unterscheidung ("1 Folge"/"N Folgen").
3. **Genres-/Tags-Chip-Listen** → gemeinsamer neuer Grundbaustein `LinkChip` (`href`/`children`/
   optional `icon`/`count`/`tone`), Genres mit `tone="glass"`, Tags mit `tone="scrim"` -- EIN
   gemeinsamer Aufbau (Code-Struktur/API), beide Töne reproduzieren die bisherige, unterschiedliche
   Optik 1:1 (keine optische Vereinheitlichung).
4. **Öffentliche Karten-/Glas-Optik** (Nachtrag, über die ursprüngliche Rückfrage hinaus) →
   `Card` bekam zwei neue Varianten `variant="glass"`/`"glassStrong"` + einen generischen
   `tintHue`-Tönungs-Hook, komplett aus globalen Tokens in `styles/tokens/components.css`
   (`--card-glass-*`, `--card-tint-*`, `--border-on-media*`). Die Info-Karte der Detailseite
   sowie `EpisodeGlassCard`/`ReleasePreviewRow` (Episoden-/Release-Kartenebene im
   Fansub-Browser) wurden inhaltlich auf diese Varianten + weitere Grundbausteine
   (`DisclosureTrigger`, `Avatar`, `Heading`, `Text`) umgestellt; `FansubVersionBrowser` blieb
   verhaltensgleich (alle vier bestehenden Testdateien grün). Drei Storybook-Ebenen bilden das
   Ergebnis vollständig ab: Grundbaustein (`Card`-Glas-Varianten + alle vier Tönungen auf
   Bannerhintergrund), Zusammengesetzte Bausteine (`EpisodenKarte`/`Release-Versionszeile` mit
   allen im Code vorkommenden Zuständen), Im Einsatz (komplette `/anime`-/`/anime/[id]`-Seiten,
   ausgeloggt/eingeloggt über den bereits globalen Rollen-Umschalter).

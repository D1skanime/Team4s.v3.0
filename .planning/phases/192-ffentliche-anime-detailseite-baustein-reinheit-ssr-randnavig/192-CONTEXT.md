# Phase 192: Öffentliche Anime-Detailseite — Baustein-Reinheit, SSR-Randnavigation, Release-Zeilen-Einrückung - Context

**Gathered:** 2026-11-04
**Status:** Ready for planning
**Mode:** Autonomer ki-run-Auftrag 261102-226d — Entscheidungen liegen bereits als bindende Live-UAT-Rückmeldung vom Menschen vor (Befunde 19–23, Reihenfolge vorgegeben). Keine weiteren Rückfragen nötig; technische Details werden autonom entschieden.

<domain>
## Phase Boundary

Diese Phase behebt 5 Live-UAT-Befunde (19–23) auf der öffentlichen Anime-Detailseite (`/anime/[id]`), in der vom Menschen vorgegebenen Reihenfolge:

1. **Befund 23 — Layout-Grundbausteine fehlen:** `components/ui` hat keine Layout-Primitives (Stack/Inline-Cluster/SplitLayout). Jeder zusammengesetzte Baustein baut Raster/Abstände selbst. Neue Grundbausteine ergänzen, NUR mit Werten aus Space-/Radius-/Breakpoint-Tokens.
2. **Befund 22 — Seiten ordnen nur Bausteine an:** `AnimeDetailView.tsx`/`page*.module.css` dürfen nur noch Bereiche untereinander anordnen (Seitenbreite, Abstand zwischen Bereichen über Tokens) — kein inneres Raster/Optik eines Bausteins.
3. **Befund 21 — Anime-Kopf-Baustein unvollständig:** `AnimeDetailHero` (Storybook: „Zusammengesetzte Bausteine/Anime-Kopf") rendert nicht dasselbe wie die Live-Seite, weil Kartenrahmen + Zwei-Spalten-Raster in `AnimeDetailView`/`page.module.css` liegen statt im Baustein.
4. **Befund 19 — Randnavigation fehlt bis zur Hydration:** `AnimeEdgeNavigation` lädt Nachbarn rein client-seitig; auf main standen die Knöpfe sofort im Server-HTML.
5. **Befund 20 — Release-Zeile falsch eingerückt:** Datenzeile in `ReleasePreviewRow` beginnt links unter dem Avatar statt bündig mit Titel/Gruppenname.

**Explizit NICHT in dieser Phase:** andere Seiten (nur die Bausteine von `/anime/[id]` werden auf die neuen Layout-Grundbausteine umgestellt — `ArtworkHero`, `MetricList`, `PageHeader`, `SectionHeader`, `Toolbar` dienen nur als Belegbeispiele für Befund 23, bleiben aber unverändert, da sie auf anderen Seiten verwendet werden).

**Pilot-Bausteine dieser Seite** (müssen am Ende rein aus Grundbausteinen bestehen, kein eigenes Layout-/Optik-CSS mehr):
- Anime-Kopf (`AnimeDetailHero` + `AnimeDetailHero.module.css`/`AnimeDetailView.styles`)
- Episoden-Bereich (`AnimeEpisodesSection`)
- Fansubgruppen-Karte / Gruppen-Auswahl (`FansubVersionBrowser` und zugehörige Fansub-UI unter `components/fansubs/`, soweit auf dieser Seite eingesetzt)
- Release-Zeile (`ReleasePreviewRow`)
- Randnavigation inkl. Vorschaukarte (`AnimeEdgeNavigation` + `AnimeEdgeNavigation.module.css`)

</domain>

<decisions>
## Implementation Decisions

### Layout-Grundbausteine (Befund 23)

- Drei neue Grundbausteine in `frontend/src/components/ui/`, jeweils mit eigener `.module.css`, `.stories.tsx` (Kategorie `Grundbausteine/*`) und Test:
  - **`Stack`** — vertikale Anordnung, `gap` ausschließlich über ein Space-Token-Prop (z. B. `gap="2" | "3" | "4" | ...` gemappt auf `var(--space-N)`), optional `align`.
  - **`Cluster`** (bzw. `Inline`) — horizontale Anordnung mit Umbruch (`flex-wrap`), `gap`-Prop wie bei `Stack`, `align`/`justify`-Props.
  - **`SplitLayout`** — feste Spalte (Breite als Prop/Token, z. B. `firstColumnWidth`) + Rest (`minmax(0,1fr)`), mit Umbruch-Breakpoint als Prop (Default an den bestehenden `--media-frame-poster-*`-Breakpoints orientiert, aber als generischer Breakpoint-Token, keine Domänen-Kenntnis).
- Rundungen/Flächen kommen weiterhin aus `Card`/`MediaFrame`-Varianten — die neuen Primitives selbst setzen keine `border-radius`/Hintergrundfarbe.
- Gleiche Autodocs-/Katalog-Konventionen wie bestehende Grundbausteine (Storybook-Doku-Pflicht, `catalogTaxonomy.test.ts`-Konformität).

### Seiten vs. Bausteine (Befund 22)

- `AnimeDetailView.tsx` ordnet nach dieser Phase nur noch Bausteine untereinander an (Reihenfolge: Banner → Breadcrumbs → Anime-Kopf (inkl. Randnavigations-Slot) → Episoden-Bereich).
- `page.module.css`/`page.poster.module.css`/`page.infoCard.module.css`/`page.episodes.module.css` werden auf Bereichsanordnung reduziert (Seitenbreite/Gutter/Abstand zwischen Bereichen über bestehende Tokens) — kein `grid-template-columns`, kein `border-radius`, keine Farbwerte, kein inneres Spacing eines Bausteins mehr in diesen Dateien. Reste wandern in die jeweiligen Baustein-`.module.css` (oder entfallen, wenn der neue Grundbaustein sie übernimmt).
- Neuer Architektur-Abschnitt „Seiten vs. Bausteine" in `docs/FRONTEND_ARCHITEKTUR.md` (Grundregel aus Befund 22 + 23 zusammen dokumentieren).
- Guard/Test: ein regelbasierter Test (nach dem Muster von `detailStyleSystem.guard.test.ts`) verbietet in den Seiten-CSS-Modulen von `/anime/[id]` `grid-template`-Regeln, Farbwerte, `border-radius`/Schatten für Bausteininneres. Begründete Ausnahmen (z. B. reine Breitenverträge über bestehende Tokens) werden im Test dokumentiert, nicht stillschweigend ausgenommen.

### Anime-Kopf-Baustein (Befund 21)

- `Card variant="publicHero"` + das Zwei-Spalten-Raster (Poster-Spalte + Info-Spalte, Breakpoint <768px) wandern vollständig in `AnimeDetailHero` (über den neuen `SplitLayout`-Grundbaustein + `Card`), inklusive Slot für die Randnavigations-Overlay.
- `AnimeDetailHero.stories.tsx` rendert danach exakt das, was `AnimeDetailView` einsetzt — keine zweite, unvollständige Kompositionsebene mehr. Seite setzt nur noch `<AnimeDetailHero .../>` ein (plus Randnavigation als Children/Slot-Prop, falls die Seite weiterhin die `gridQuery`-Bedingung prüfen muss).
- Story-Nachweis: Desktop-Breite (1440) muss wie `/anime/6` auf main aussehen (Poster links, Info rechts); zusätzlich ein Mobil-Viewport (390) in der Story.
- Bildnachweis Story vs. Live-Seite ist Pflichtbestandteil der VERIFICATION dieser Phase.

### Randnavigation serverseitig (Befund 19)

- `page.tsx` (`AnimeDetailContent`) ermittelt die Nachbarn (`prev`/`next`) serverseitig über `getAnimeList` + dieselbe Grid-Logik wie `AnimeEdgeNavigation` bisher client-seitig (inkl. Seitenwechsel-Fall: letztes Element vorheriger Seite / erstes Element nächster Seite), und reicht sie als Props an die View/den Baustein durch.
- `AnimeEdgeNavigation` zeigt die Links serverseitig sofort im HTML (kein Warten auf Hydration). Die bisherige client-seitige `getAnimeList`-Logik bleibt NUR noch für die Hover-Vorschaukarte (Bild + Titel + Typ) erhalten — die Navigationslinks selbst brauchen dafür kein Nachladen mehr.
- Fehlerfall (`getAnimeList` schlägt serverseitig fehl): Button wird nicht angezeigt (kein kaputter Link), analog zum bisherigen `null`-Verhalten bei fehlendem `gridParams`. Kein zusätzlicher Retry-Mechanismus — das deckt sich mit dem bestehenden `Promise.allSettled`-Fehlermuster in `page.tsx`.
- Pflicht-Test: eine SSR-orientierte Prüfung (wie die bestehende Lightweight-Baumtechnik in `page.test.tsx`), dass bei vorhandenen Nachbarn die `AdjacentNavigation`/Edge-Navigation-Links bereits mit `href` in der von der Server-Komponente erzeugten Baumstruktur stehen, ohne dass eine Client-Hydration/ein Mock-Fetch dafür nötig ist.

### Release-Zeilen-Einrückung (Befund 20)

- `ReleasePreviewRow` nutzt für die Datenzeile dieselbe Grid-Spalte wie Titel/Gruppenname — umgesetzt über den neuen `SplitLayout`- oder `Cluster`-Grundbaustein (je nachdem, was dem bestehenden Avatar+Text-Aufbau am nächsten liegt), NICHT über einen lokalen `padding-left`/`margin-left`-Wert.
- Muss in allen 3 genannten Storys korrekt aussehen: „Mit allen Extras", „Koop" (mehrere Logos, breitere Avatar-Gruppe — die Spaltenbreite muss sich an der tatsächlichen Avatar-Gruppen-Breite orientieren, nicht an einem festen Einzel-Avatar-Maß), „Ohne Logo" (Datenzeile bündig ohne Einrückungs-Lücke).

### Reihenfolge (bindend, vom Menschen vorgegeben)

23 (Layout-Grundbausteine) + 22/21 (Seite ordnet nur an; Anime-Kopf vollständig aus Grundbausteinen) zusammen zuerst (22/21 bauen auf den in 23 geschaffenen Primitives auf) → dann 19 (SSR-Randnavigation) → dann 20 (Release-Zeilen-Einrückung, nutzt die neuen Grundbausteine aus 23).

### Claude's Discretion

- Exakte Prop-Namen/API der drei neuen Layout-Grundbausteine (`Stack`/`Cluster`/`SplitLayout`), solange sie token-basiert, domänenfrei und mit vollständiger Storybook-Zustandsabdeckung sind.
- Ob die Fansubgruppen-Karte/Gruppen-Auswahl-Migration (Teil der Pilot-Bausteine) in einem eigenen Wave-Schritt oder zusammen mit dem Anime-Kopf erfolgt — Reihenfolge innerhalb von „23+22/21" ist technisch frei, solange die Grundregel am Ende für alle 5 genannten Pilot-Bausteine gilt.
- Konkrete Guard-Test-Regex-Ausnahmeliste für die Seiten-CSS-Module (z. B. welche Breitenvertrags-Token-Zeilen explizit erlaubt bleiben).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Card` (`variant="publicHero"`, `publicPoster`, `glassStrong`), `MediaFrame`, `ResponsiveImage`, `Text`, `Heading`, `Badge`, `LinkChip` — bestehende Grundbausteine, die die neuen Layout-Primitives umschließen werden.
- `AvatarStack` existiert bereits als Grundbaustein für mehrere Logos (Koop-Fall in Befund 20) — relevant für die Release-Zeilen-Spaltenbreite.
- Card's Override-Hook-Muster (`--card-public-hero-columns` in `page.module.css:70-89`, siehe `Card.module.css` `.cardPublicHero`) ist der aktuelle (jetzt zu ersetzende) Mechanismus für das Zwei-Spalten-Raster — wird durch den neuen `SplitLayout`-Grundbaustein abgelöst, der Hook entfällt dann in der Seiten-CSS.
- `animeGridContext.ts` (`buildAnimeGridQuery`, `parseAnimeListParamsFromGridQuery`, `buildAnimeDetailHref`, `normalizeGridQuery`) und `getAnimeList` (`src/lib/api/fansubs-core.ts:73`) sind reine, server-sichere Funktionen ohne `'use client'` — direkt in `page.tsx` wiederverwendbar für die SSR-Nachbarn-Ermittlung (Befund 19), exakt dieselbe Logik wie aktuell in `AnimeEdgeNavigation.tsx` (inkl. Seitenwechsel-Zweig: `currentPage - 1`/`currentPage + 1`-Fetch).
- Lightweight-Komponentenbaum-Testtechnik (`elements()`-Walker, `Component(props)` direkt aufrufen) bereits etabliert in `page.test.tsx`, `page.performance.test.ts`, `AnimeDetailView.test.tsx` — Vorlage für den neuen SSR-Randnavigations-Test.
- `detailStyleSystem.guard.test.ts` ist die Vorlage für den neuen Seiten-CSS-Reinheits-Guard (Befund 22).

### Established Patterns
- CSS-Custom-Property-„Override-Hook"-Muster (`var(--hook-name, fallback)`, autorisierter externer Setter, überwacht durch `foreignVariableOverrides.regression.test.ts`) war bisher der Weg, wie Seiten in Baustein-Raster eingriffen — nach Befund 22/23 soll dieser Eingriff durch echte Baustein-Vollständigkeit ersetzt werden, nicht durch einen weiteren Hook.
- Storybook-Taxonomie: `Grundbausteine/*` (keine andere `components/ui`-Komponente importiert, volle Zustandsabdeckung), `Zusammengesetzte Bausteine/*` (komponiert mehrere benannte Grundbausteine, „Besteht aus"-Autodocs-Hinweis), `Im Einsatz/*` (ganze Seiten) — `catalogTaxonomy.test.ts` erzwingt das automatisch.
- „Stories ziehen mit"-Pflicht: jede sichtbare Änderung an einem Grundbaustein zieht sofort die zugehörige `.stories.tsx` nach.

### Integration Points
- `page.tsx` → `AnimeDetailView` (Props-Durchreichung) → `AnimeDetailHero`/`AnimeEpisodesSection`/`AnimeEdgeNavigation` — alle Integrationspunkte dieser Phase.
- `AnimeEdgeNavigation` wird von `'use client'` auf eine serverseitige Props-Quelle umgestellt; die Hover-Vorschaukarte bleibt client-seitig (separater, kleinerer Client-Teilbaum oder weiterhin `'use client'` auf Komponentenebene mit serverseitig vorbefüllten Nachbarn als Props statt eigenem Fetch).

</code_context>

<specifics>
## Specific Ideas

- Alle 4 konkreten Fundstellen-Zitate aus der Live-UAT-Rückmeldung (Dateipfade, Zeilennummern, Pixel-Koordinaten x≈81/x≈118) sind wörtlich zu nehmen und im VERIFICATION-Nachweis gegenzuprüfen.
- Pflicht-Nachweis laut Auftrag: Playwright-Bildpaare main vs. Branch (`/anime/6`, `/anime/13`, `/anime/2` — je 1440×900 und 390×844) UND Story-vs.-Live-Seite-Bildpaar je zusammengesetztem Baustein dieser Seite. Temporäre Container/Verzeichnisse danach löschen (etablierte Vorgehensweise aus vorherigen Runden dieses ki-run-Auftrags: `git worktree add --detach` für main-Snapshot, danach `docker rm`/`docker rmi`/`git worktree remove --force`).

</specifics>

<deferred>
## Deferred Ideas

- Migration von `ArtworkHero`, `MetricList`, `PageHeader`, `SectionHeader`, `Toolbar` und anderen Seiten auf die neuen Layout-Grundbausteine — explizit außerhalb dieser Phase (vom Menschen selbst so begrenzt: „Andere Seiten NICHT in diesem Auftrag umbauen").

</deferred>

<addendum_2026-11-04b>
## Nachtrag 04.11.2026 (Mensch) — Befunde 24–26

Zusätzlich zu den Befunden 19–23 oben, nach Plänen 192-01 bis 192-06 (bereits ausgeführt, bleiben
erhalten) und vor der noch offenen Nachweis-Verifikation (ehem. 192-07). Gilt als bindende
Diskussionsgrundlage für drei neue Gap-Pläne dieser Phase; keine weiteren Rückfragen nötig.

### Befund 24 — Zweck-Namen statt Größen-/Nummernnamen für Grundbausteine

**Ist-Zustand (geprüft):** `Stack`/`Cluster` nehmen `gap="1".."9"` (rohe Space-Token-Stufen direkt
als Prop-Wert), `SplitLayout` nimmt `firstColumnWidth` als freien CSS-Längen-String (z. B.
`"200px"`). Belegte Aufrufstellen: `AnimeDetailHero.tsx` (6×`gap=`), `FansubGroupPicker.tsx` (2×),
`FansubVersionBrowser.tsx` (1×), `ReleasePreviewRow.tsx` (3×) — alle mit rohen Zahlen (`gap="2"`,
`"3"`, `"4"`, `"5"`).

**Entscheidung:**
- `Stack`/`Cluster`s `gap`-Prop wird von `SpaceToken ('1'-'9')` auf eine benannte Zweck-Enum
  umgestellt (z. B. `'section' | 'heading' | 'inline' | 'tight'` — exakte Benennung an den
  tatsächlichen Einsatzstellen in `AnimeDetailHero`/`FansubGroupPicker`/`FansubVersionBrowser`/
  `ReleasePreviewRow` ausrichten, nicht erraten: pro Aufrufstelle den fachlichen Zweck benennen,
  z. B. „Abstand zwischen Titel und Untertitel im Kopf" statt „gap 2"). Jede Zweck-Stufe mappt
  intern über ein neues Zweck-Token (z. B. `--space-heading: var(--space-2)`) auf die bestehende
  Grundskala in `layout.css` — die Grundskala selbst bleibt unverändert, Zweck-Token sind ein
  zusätzlicher, benannter Zugriffspfad darauf.
- `SplitLayout`s `firstColumnWidth` wird von freiem String auf eine benannte Zweck-Enum umgestellt
  (mindestens `'poster'` für den Anime-Kopf-Anwendungsfall — weitere Werte nur bei echtem
  zweitem Bedarf ergänzen, nicht vorab spekulativ). Mapping über ein neues Zweck-Token (z. B.
  `--split-layout-column-poster: var(--media-frame-poster-width)`, mit Breakpoint-Varianten
  analog zum bisherigen `--card-public-hero-columns`-Hook).
- Zweck-Token leben in `layout.css` (oder einer neuen, thematisch passenden Sektion dort),
  verweisen per `var()` auf die bestehende `--space-N`/`--media-frame-poster-width*`-Grundskala,
  mit kurzem deutschem Kommentar zum Einsatzzweck.
- Betroffen sind NUR die in dieser Phase neu geschaffenen/geänderten Grundbausteine und ihre in
  dieser Phase bereits umgestellten Aufrufstellen (`Stack`, `Cluster`, `SplitLayout` selbst, sowie
  `AnimeDetailHero.tsx`, `FansubGroupPicker.tsx`, `FansubVersionBrowser.tsx`,
  `ReleasePreviewRow.tsx` — alle bereits in Plänen 192-01/02/03/06 angefasst). Keine Suche nach
  weiteren, von dieser Phase unberührten `gap=`-Aufrufstellen im übrigen Code.
- Storybook-Stories von `Stack`/`Cluster`/`SplitLayout` zeigen jede Zweck-Variante einzeln, mit
  deutscher Beschreibung, wofür sie da ist (nicht nur "gap section").
- Neuer Guard-Test (nach Vorbild `detailStyleSystem.guard.test.ts`): die bereits in dieser Phase
  umgestellten zusammengesetzten Bausteine/Seiten-Dateien dürfen keine rohen `gap="N"`-Werte oder
  freie `firstColumnWidth`-Strings mehr an `Stack`/`Cluster`/`SplitLayout` übergeben — nur die
  neuen Zweck-Varianten. Guard prüft die konkreten, in dieser Phase geänderten Dateien, nicht den
  gesamten Baum (konsistent mit Befund 23s Pilot-Begrenzung).
- `docs/FRONTEND_ARCHITEKTUR.md`: Namensregel „Zweck statt Größe" als kurzer Absatz im selben
  Abschnitt ergänzen, der bereits Stack/Cluster/SplitLayout dokumentiert (aus Plan 192-04).

### Befund 25 — Keine Klick-Simulationstests, direkte Logik-Tests statt fireEvent/userEvent

**Ist-Zustand (geprüft gegen den Branch-Diff seit dem Abzweigpunkt von main):** Auf diesem Branch
neu angelegt bzw. erweitert wurden Klick-/Interaktions-Tests in: `AnimeEdgeNavigation.test.tsx`
(deutlich umgebaut für SSR-Props, nutzt `fireEvent.mouseEnter`/`mouseLeave` für die
Hover-Vorschau — keine `fireEvent.click`), `FansubGroupPicker.test.tsx` (+11 Zeilen),
`FansubVersionBrowser.test.tsx` (+49/-12 Zeilen, mehrere `fireEvent.click` auf Gruppen-Chips/
Episoden-Umschalter), `FormField.test.tsx` (+15 Zeilen, neuer Test ist aber kein Klick-Test —
reine Attribut-Prüfung), `Pagination.test.tsx` (+49 Zeilen), `WatchlistAddButton.test.tsx`
(geänderte Assertions innerhalb bestehender `fireEvent.click`-Tests). Die unveränderten
`FansubVersionBrowser.groupSwitch/.filterSwitch/.windowing.test.tsx` sind NICHT auf diesem Branch
entstanden/erweitert und daher nicht Teil dieses Befunds.

**Entscheidung:**
- Wo eine Klick-Handler-Funktion echte Fachlogik enthält (API-Aufruf + Argumente,
  Zustandsübergang, Fehlerpfad) — insbesondere `switchTo`/`updateFansubSelection`/
  `toggleEpisode`/`resolveGroupSlugForFetch` in `FansubVersionBrowser.tsx` sowie
  `handleToggle`/`checkStatus` in `WatchlistAddButton.tsx` (`WatchlistAction`) — wird diese Logik
  als benannte Funktion oder Hook exportiert/exportierbar gemacht und im Test DIREKT aufgerufen
  (Argumente, Rückgabewert, Mock-Aufrufe prüfen), ohne `render()` + `fireEvent`/`userEvent`.
- Wo ein Klick nur eine triviale Weiterleitung ist (z. B. `onClick={() => onSelect(id)}` in
  `FansubGroupPicker.tsx`, `onClick={() => onPageChange?.(page)}` in `Pagination.tsx`, die
  Disabled-Passthrough-Probe in `FormField.test.tsx`) gibt es keine separat extrahierbare Logik —
  hier wird die bereits in diesem Projekt etablierte Technik verwendet: die Komponente direkt als
  Funktion aufrufen (`Component(props)`, wie bereits in `page.test.tsx`/`AnimeDetailView.test.tsx`
  praktiziert) und den `onClick`-Prop des gefundenen Elements direkt als Funktion aufrufen/prüfen,
  statt eines echten DOM-Klick-Events über `fireEvent`/`userEvent`.
- Die bestehenden `fireEvent.click`/`userEvent.click`-Assertions in den 6 genannten Dateien werden
  durch die jeweils passende der beiden Techniken ersetzt; wo eine Story denselben Zustand ohnehin
  bereits visuell abdeckt, bleibt die automatische Storybook-Render-Prüfung (`test-storybook`)
  als zusätzliches, unverändertes Sicherheitsnetz bestehen.
- Explizit NICHT in dieser Phase: die 131 anderen, von diesem Branch unberührten Dateien mit
  `fireEvent.click`/`userEvent.click` im übrigen Code (Admin-Oberflächen, andere Seiten) — Befund
  25 gilt nur für auf DIESEM Branch neu angelegte/erweiterte Klick-Tests, nicht als rückwirkende
  Aufräumphase für den gesamten Bestand (konsistent mit der Projektregel „beim Anfassen, keine
  eigene Aufräumphase").
- Echte DOM-Klickabläufe/End-to-End-Interaktion werden laut Mensch separat live abgenommen, nicht
  durch das automatisierte Test-Suite ersetzt.

### Befund 26 — Effekte (Blur/backdrop-filter/color-mix/rgba) sind Zweck-Tokens wie Abstand/Rundung

**Ist-Zustand (geprüft):** Die 5 vom Menschen genannten, in dieser Runde neuen Effekt-Tokens
(`--banner-backdrop-*`, `--linkchip-glass-*`, `--linkchip-scrim-*`, `--button-chip-glass-*`,
`--badge-onmedia-*`) sind bereits strukturell konform: definiert in
`frontend/src/styles/tokens/components.css`, verwendet ausschließlich in
`frontend/src/components/ui/*.module.css` (`BannerSection`, `LinkChip`, `Button`, `Badge`). Es
gibt noch KEINE eigene `effects.css`-Tokendatei — Blur-/`color-mix()`-/Scrim-`rgba()`-Werte liegen
verteilt in `components.css`, `colors.css`, `palette.css`. Eine Breitensuche zeigt ca. 941
rohe `filter:`/`backdrop-filter:`/`color-mix(`/`rgba(`/`hsla(`-Vorkommen AUSSERHALB von
`components/ui/` im gesamten übrigen Frontend (Fansub-Seiten, Anime-Komponenten jenseits dieser
Phase, Admin-Bereich) — das ist weit außerhalb des Piloten `/anime/[id]` dieser Phase entstanden
und nicht Teil der in dieser Phase geänderten Dateien.

**Entscheidung (Umsetzung bewusst auf diese Phase begrenzt, analog zur Pilot-Begrenzung aus
Befund 23 — „Andere Seiten NICHT in diesem Auftrag umbauen"):**
- Neue Tokendatei `frontend/src/styles/tokens/effects.css` anlegen: Zweck-Tokens für
  Blur/backdrop-filter/color-mix/Scrim-Transparenz, mit kurzem deutschem Kommentar pro Token
  (wofür, wo eingesetzt). In `globals.css`/die zentrale Token-Importliste einhängen wie die
  übrigen `styles/tokens/*.css`-Dateien.
- Die 5 vom Menschen genannten Tokens aus `components.css` nach `effects.css` verschieben
  (reine Verschiebung + Zweck-Kommentar, keine Wertänderung, keine Verhaltensänderung) und,
  soweit noch nicht zweckbenannt, umbenennen auf den tatsächlichen Einsatzzweck (z. B.
  `--banner-backdrop-*` = „unscharfer Bannerbild-Hintergrund", `--linkchip-glass-*` = „Glas-Fläche
  auf hellem Bildhintergrund", `--linkchip-scrim-*` = „Abdunklung unter Chip-Text auf Bild",
  `--button-chip-glass-*` = „Glas-Knopf auf Bildfläche", `--badge-onmedia-*` = „Abzeichen auf
  Bildfläche").
- Neue Storybook-Seite „Grundlagen/Effekte": jeder der 5 Effekte mit Vorschau auf einem echten
  Bild, Name, Zweck, welcher Grundbaustein ihn nutzt (analog zur bestehenden
  „Grundlagen/Design-Tokens"-Seite, aber für Effekt-Rezepturen statt Rohwerte).
  `catalogTaxonomy.test.ts`-konform einordnen.
- `docs/FRONTEND_ARCHITEKTUR.md`: neuer Abschnitt „Effekte" mit derselben Liste und der
  Grundregel „Effekte nur als Zweck-Token in `styles/tokens`, eingesetzt nur in `components/ui`
  als benannte Variante — zusammengesetzte Bausteine und Seiten schreiben kein
  `filter`/`backdrop-filter`/`color-mix`/`rgba` direkt."
- Guard-Test: verbietet rohe `filter:`/`backdrop-filter:`/`color-mix(`/`rgba(`/`hsla(`-Literale
  NUR in den von dieser Phase bereits angefassten zusammengesetzten Baustein-Dateien
  (`AnimeDetailHero.module.css`, `ReleasePreviewRow.module.css`, `FansubGroupPicker.module.css`,
  `FansubVersionBrowser.module.css`, `AnimeEdgeNavigation.module.css`, `Stack`/`Cluster`/
  `SplitLayout.module.css`) — bewusst NICHT repo-weit, da das die 941 bestehenden, von dieser
  Phase unberührten Vorkommen in unveränderten Seiten/Komponenten sofort als Regression melden
  würde, obwohl an jenen Dateien in dieser Phase nichts geändert wurde. Repo-weite Migration ist
  explizit künftige Arbeit, kein Teil dieses Auftrags.

### Reihenfolge Nachtrag

Zuerst 24 (Zweck-Namen für die Grundbausteine selbst und ihre bereits umgestellten
Aufrufstellen) — danach wirkt sich jede spätere Anpassung an denselben Dateien nicht mehr auf
rohe Prop-Werte aus. Dann 25 (Test-Umbau, unabhängig von 24/26, kann parallel laufen). Dann 26
(Effekt-Tokens, unabhängig von 24/25, kann parallel laufen). Die noch ausstehende
Abschluss-Verifikation (ehem. Plan 192-07: Playwright-Bildpaar-Nachweis main vs. Branch + Story
vs. Live-Seite, voller Regressionslauf) läuft ZULETZT, nach 24, 25 UND 26, nicht vorher — dieser
Nachtrag erweitert also, welche Pläne vor der Abschluss-Verifikation abgeschlossen sein müssen.

### Claude's Discretion (Nachtrag)

- Exakte Zweck-Bezeichner für `gap`/`firstColumnWidth`-Varianten (Befund 24) und für die 5
  Effekt-Token-Zwecknamen (Befund 26), solange sie den tatsächlichen Einsatzzweck beschreiben
  und nicht Größe/Nummer.
- Ob Befund 25s Logik-Extraktion als eigenständige Funktion oder als Hook erfolgt — je danach,
  was im jeweiligen Komponenten-Body bereits am nächsten liegt.
- Technische Umsetzung des Guard-Tests für Befund 24/26 (eigene Datei vs. Erweiterung eines
  bestehenden Guards), solange er sich auf die in dieser Phase bereits geänderten Dateien
  beschränkt und nicht repo-weit scheitert.

</addendum_2026-11-04b>

<addendum_2026-11-04c>
## Nachtrag 04.11.2026, Runde 3 (Mensch, nach Sichtung der roten Review-Befunde + eigener
Storybook-Sichtung) — Befunde A–D, 27, 28 plus bestätigte Sichtfunde

Der automatisierte Review (3 offene [high]-Befunde) wurde vom Menschen geprüft: alle drei treffen
zu. Zusätzlich hat der Mensch selbst Storybook gesichtet und 2 weitere Befunde (27, 28) sowie eine
echte visuelle Regression im Anime-Kopf gefunden. Alle Punkte unten sind bindend, keine weiteren
Rückfragen nötig. Bisherige Pläne 192-01 bis 192-10 bleiben als Grundlage bestehen; das hier ist
eine weitere Gap-Closure-Runde derselben Phase.

### Befund A — SplitLayout: gap nimmt noch rohe Stufen statt Zweck-Varianten

**Bestätigt:** `frontend/src/components/ui/SplitLayout.tsx` typisiert `gap` weiterhin als
`SpaceToken ('1'..'9')` und mappt in `mergedStyle` direkt auf `var(--space-${gap})`
(`SplitLayout.test.tsx` nutzt dies sogar mit `gap="2"`). Plan 192-08 hatte dies bewusst
ausgeklammert ("UNCHANGED by this plan -- not named in Befund 24's scope") — diese Ausklammerung
gilt jetzt nicht mehr.

**Entscheidung:**
- `SplitLayout.gap` wird wie `Stack`/`Cluster`s `gap` auf eine benannte Zweck-Enum umgestellt
  (eigene Werte, nicht zwingend identisch mit Stack/Clusters Enum — nur die tatsächlich an
  SplitLayout-Aufrufstellen benötigten Zwecke, aktuell im Wesentlichen "kein Abstand zwischen den
  Spalten" für den Anime-Kopf-Fall).
- Der `--split-gap`-Private-Variablen-Override in `AnimeDetailHero.module.css` (`.heroSplit {
  --split-gap: 0; }`) entfällt dabei vollständig (siehe Befund B — dieselbe Baustelle, Reihenfolge
  unten).
- `breakpoint: 'md' | 'lg'` wird NUR dann nach Zweck umbenannt, wenn sich ein klarer, nicht
  erratener Zweck ergibt (Beispiel-Vorschlag des Menschen: „Poster neben Inhalt ab Tablet" für den
  heutigen `'md'`-Fall). Prüfen, ob `'lg'` aktuell überhaupt noch an einer echten Aufrufstelle
  verwendet wird — wenn nicht, auf den tatsächlich benötigten Zweck reduzieren statt zwei Werte zu
  erzwingen.

### Befund B — Pilot-Kompositbausteine enthalten weiterhin eigenes Layout-CSS

**Bestätigt (Review + eigene Prüfung):** `AnimeDetailHero.module.css` enthält weiterhin
`display:flex`/`flex-direction`/`padding`/`gap`/`margin`-Regeln (`.posterColumn`, `.posterMeta`,
`.infoCardBody`, `.titleRow`, `.tagsSection`, u. a.) sowie zwei `<hr>`-Trennlinien mit eigenem
`background`/`height`/`margin` (`.posterDivider`, `.divider`) und den bereits unter Befund A
genannten `--split-gap`-Override. Ebenso betroffen: `ReleasePreviewRow.module.css` (`.row`:
flex/gap/padding), `EpisodeGlassCard.module.css` (`.headerTitleRow`: flex/gap;
`.versionList`: grid/gap/padding), `AnimeEdgeNavigation.module.css` (`.previewCard`:
flex/gap/padding). Der bestehende `detailStyleSystem.guard.test.ts` prüft ausschließlich
`page.module.css`/`page.episodes.module.css` (Seiten-Ebene), nicht diese Baustein-Dateien — die
Lücke, durch die diese Verstöße unentdeckt blieben.

**Entscheidung:**
- Jede der 4 genannten Baustein-Dateien verliert ihr eigenes Layout-CSS (Flex-Richtung, `gap`,
  `padding`, `margin`) zugunsten der bestehenden Grundbausteine (`Stack`/`Cluster` für
  Anordnung+Abstand). Wo ein Grundbaustein einen benötigten Zweck NICHT abbilden kann (wörtliches
  Beispiel des Menschen: ein Kommentar in `AnimeDetailHero.module.css` begründet die lokale
  Nachbildung ausdrücklich damit, der Grundbaustein könne es "nicht abbilden") — gilt das NICHT
  als Rechtfertigung für lokales CSS, sondern als Auftrag, den Grundbaustein um genau diese fehlende
  Zweck-Variante zu erweitern:
  - Trennlinien (`.posterDivider`, `.divider`): als eigener Grundbaustein (z. B. `Divider`) oder
    als Teil von `Card`/`Stack`-Zusammensetzung abbilden, nicht als lokales `<hr>` mit eigenem
    `background`/`margin` in der Baustein-CSS.
  - Innenabstand der Info-Karte (`.infoCardBody`s `padding: var(--space-6)`,
    `.posterMeta`s `padding: var(--space-4)`): als `Card`-Variante/-Prop abbilden (Card kennt
    bereits Innenabstand als Teil ihrer eigenen Varianten-Logik), nicht als Baustein-eigenes CSS.
  - Uneinheitliche vertikale Abstände im Info-Card-Body (Kommentar begründet dies bisher mit
    "Zero-Pixel-Diff-Vorgabe dieser Phase"): entweder eine neue, passend benannte
    `Stack`-Zweck-Variante dafür schaffen (wenn der Abstandsrhythmus wiederverwendbar/benennbar
    ist), oder — falls tatsächlich jede einzelne Lücke einen eigenen, nicht generalisierbaren Wert
    braucht — technisch als Einzelfall-Ausnahme im neuen Guard dokumentieren (siehe unten), nicht
    stillschweigend lokales CSS behalten.
  - `--split-gap`-Override (Befund A) entfällt durch SplitLayouts neue Zweck-Variante.
- **Guard-Erweiterung (bindend):** Ein neuer oder erweiterter Guard-Test prüft ab sofort auch die
  zusammengesetzten Baustein-Dateien der Pilot-Seite (`AnimeDetailHero.module.css`,
  `ReleasePreviewRow.module.css`, `EpisodeGlassCard.module.css`, `AnimeEdgeNavigation.module.css`)
  auf eigenes Layout-CSS (`display:\s*flex`, `flex-direction`, `grid-template`, `gap:` als direkte
  Deklaration außerhalb eines `var(--split-gap...)`-Lesezugriffs, `padding:`, `margin`) UND
  verbietet zusätzlich das Setzen (nicht Lesen) jeder privaten, nicht als öffentlicher Hook
  dokumentierten Baustein-Variable von außen (z. B. `--split-gap`, `--stack-gap`, `--cluster-gap`)
  — genau das "Fremd-Override"-Muster, das Befund B explizit verbietet. Bleibt wie die bisherigen
  Guards auf die Dateien dieser Phase beschränkt (kein repo-weiter Sweep).
- Visueller Nachweis Pflicht: nach der Umstellung erneut Story-vs.-Live-Bildpaare für den
  Anime-Kopf (Desktop 1440 + Mobil 390) erzeugen und im Bericht beilegen (siehe auch die
  bestätigte visuelle Regression unten — beide Nachweise können zusammen erbracht werden).

### Befund C — Verbotene Interaktionssimulationen bleiben im Branch

**Bestätigt:**
- `AnimeEdgeNavigation.test.tsx:78,81` nutzt weiterhin `fireEvent.mouseEnter`/`mouseLeave` für die
  Hover-Vorschaukarten-Logik (`AnimeEdgeNavigation.tsx`s `setHoverDirection`-State in
  `onMouseEnter`/`onMouseLeave`/`onFocus`/`onBlur`/`onTouchStart`).
- `FansubVersionBrowser.test.tsx:85` (`'verlinkt Zur-Fansub-Gruppe und Zum-Projekt...'`) nutzt
  weiterhin `fireEvent.click` auf Gruppen-Umschalt-Buttons.
- `WatchlistAddButton.test.tsx:60` (`'blocks both actions until status resolves...'`) nutzt
  weiterhin `fireEvent.click`.
- `AnimeDetailView.stories.tsx:165-170`s `play`-Funktion der Story "Merkliste umschalten" nutzt
  `userEvent.click` für einen echten Klickablauf.

**Entscheidung:**
- `AnimeEdgeNavigation`s Hover-Vorschau-Zustandslogik (welche Richtung aktuell gehovert/fokussiert
  ist, welches Vorschaubild daraus folgt) wird in eine eigenständige, direkt testbare
  Funktion/Hook ausgelagert (analog zu `useFansubGroupSwitch`/`useWatchlistAction` aus Plan
  192-09) und im Test direkt aufgerufen statt über `fireEvent.mouseEnter`/`mouseLeave`.
- `FansubVersionBrowser.test.tsx:85` und `WatchlistAddButton.test.tsx:60` werden auf dieselbe in
  Plan 192-09 etablierte Technik umgestellt (Logik-Hook direkt aufrufen bzw.
  `Component(props)`+Prop-Aufruf für reine Weiterleitungen) — auch wenn diese konkreten Tests
  selbst nicht in 192-09s ursprünglicher Dateiliste standen, gehören sie zu Dateien, die dieser
  Branch bereits verändert hat.
- `AnimeDetailView.stories.tsx`s "Merkliste umschalten"-Story verliert ihre `play`-Funktion
  (echten Klickablauf) — die Merklisten-Logik wird bereits durch `useWatchlistAction`s direkten
  Logik-Test abgedeckt (Plan 192-09); die Story selbst bleibt als reiner Anzeige-Fall bestehen
  (ggf. umbenannt, falls der Name sonst in die Irre führt). Echte Klickabläufe werden laut
  Grundregel live abgenommen, nicht durch Storybook-`play`-Funktionen simuliert.
- Branch-weite Grundregel bestätigt und verschärft: keine NEUEN oder ERWEITERTEN Tests mit
  `fireEvent`/`userEvent` in dieser und jeder folgenden Runde dieses Auftrags — betrifft sowohl
  Vitest-Unit-Tests als auch Storybook-`play`-Funktionen.

### Befund D — Stack-Variante 'tight' ist ein Größenname; --space-section vs. --space-action-row unstimmig

**Bestätigt:** `Stack.tsx`s `StackGapPurpose = 'section' | 'tight'` — `'tight'` beschreibt eine
Größe ("eng"), keinen Einsatzzweck, im Widerspruch zur eigenen Namensregel. Zusätzlich:
`--space-section: var(--space-3)` (12px) ist kleiner als `--space-action-row: var(--space-5)`
(24px) — unplausibel, wenn „section" im Sinne von „Abstand zwischen Seitenabschnitten" verstanden
würde (dann müsste er eher der größte, nicht ein kleinerer Wert sein als eine reine
Aktions-Button-Reihe). Tatsächlich wird `'section'` laut `Stack.tsx`s eigenem Kommentar aber für
feingranulare Innenabstände EINES Bausteins verwendet (Merklisten-Knopf/Trennlinie/
Genre-Abschnitt im Anime-Kopf, einzelne Episodenzeilen) — der Name suggeriert fälschlich etwas
Größeres.

**Entscheidung:**
- `'tight'` wird durch einen echten Zweck-Namen ersetzt, der beschreibt, WOFÜR er steht (z. B. der
  Abstand zwischen einem Eyebrow-Label und seiner Chip-Reihe) — exakte Bezeichnung an den
  tatsächlichen Verwendungsstellen ausrichten, nicht raten.
- `'section'` wird so umbenannt, dass der Name nicht mit "Abstand zwischen Seitenabschnitten"
  verwechselt werden kann (dieser Begriff ist page-Ebene, nicht Baustein-intern) — z. B. ein Name,
  der die tatsächliche Verwendung (interne Gliederung innerhalb EINES Bausteins) ausdrückt.
- Die zugrunde liegenden Token-WERTE (`--space-3`=12px für den bisherigen 'section'-Zweck,
  `--space-5`=24px für `--space-action-row`) bleiben unverändert, SOLANGE ein Soll/Ist-Vergleich
  gegen main (echter Pixel-Abstand zwischen denselben Elementen auf main vs. Branch) zeigt, dass
  der jeweils verwendete Wert korrekt ist. Falls der Vergleich eine tatsächliche Abweichung zu
  main aufdeckt, wird der zugrunde liegende `--space-N`-Wert korrigiert (Zero-Pixel-Diff bleibt
  das übergeordnete Ziel dieser Phase) — die Umbenennung selbst ändert an sich keine Werte.
- Guard/Test für Befund 24 (bereits vorhanden aus Plan 192-08) wird um die neuen Namen ergänzt.

### Befund 27 — Storybook „Grundlagen/Effekte": Vorschauen ohne erkennbaren Effekt

**Bestätigt (Sichtung):** Alle 5 Effekt-Vorschauen liegen auf derselben grauen Fläche, der Effekt
selbst (Unschärfe/Glas/Abdunklung) ist auf einer flachen grauen Fläche kaum sichtbar.

**Entscheidung:**
- Jede der 5 Effekt-Vorschauen bekommt ein echtes, farbiges, detailreiches Anime-Bild als
  Hintergrund (dasselbe bereits im Projekt vorhandene Fixture-Bild, das auch andere
  Storybook-Vorschauen nutzen — kein neues Asset erfinden, bestehendes wiederverwenden).
- Direkt daneben (Vorher/Nachher-Paar) dasselbe Bild OHNE den Effekt, zum direkten Vergleich.
- Beschreibungstexte werden auf klares, jargonfreies Deutsch umgeschrieben — insbesondere die
  Wörter „Rezepturen" und „domänenfreie CSS-Nachbildung" (oder sinngleiche Fachbegriffe) werden
  durch allgemein verständliche Formulierungen ersetzt (z. B. „Wirkung", „Darstellung" statt
  „Rezeptur"; „Beispiel ohne Fachbezug" statt „domänenfreie CSS-Nachbildung").

### Befund 28 — Storybook „Grundlagen/Design-Tokens": neu gliedern

**Bestätigt (Sichtung):** Heute 548 automatisch nach Namen sortierte Werte (~23.000 px Seitenlänge
laut Mensch), ohne Information über den Einsatzzweck.

**Entscheidung — dreistufige Gliederung:**
1. **Grundskala oben, mit sichtbarer Vorschau:** Farbfelder (Farbe), Abstands-Balken (Space),
   Rundungs-Ecken (Radius), Schatten-Muster (Shadow), Schrift-Beispiele (Typography),
   Effekt-Vorschauen (Verweis auf/Wiederverwendung von „Grundlagen/Effekte").
2. **Zweck-Werte darunter:** jeder Zweck-Token (z. B. `--space-section`, `--radius-surface`,
   die neuen Befund-24/26-Namen) mit einem kurzen deutschen Zweck-Satz UND einem Verweis auf
   seinen zugrunde liegenden Grundwert (z. B. „Abstand innerhalb des Anime-Kopfs (→ 12px,
   Grundstufe 3)").
3. **Bausteinwerte darunter, nach Baustein gruppiert und eingeklappt (Accordion/Disclosure):**
   jede Gruppe benennt den jeweiligen Grundbaustein (z. B. `Card`, `Button`, `AdjacentNavigation`,
   `DatePicker`, `MetricList`/`Empty`-State, `FocalCarousel`, `SplitLayout`, `DisclosureTrigger`
   — Gruppennamen durchgängig DEUTSCH, z. B. „Nebeneinander" statt „Adjacent", „Datum" statt
   „Date", „Leer-Zustand" statt „Empty", „Fokus-Karussell" statt „Focal", „Zwei-Spalten-Raster"
   statt „Split", „Aufklapp-Kopfzeile" statt „Disclosure"). Jede Gruppe markiert sichtbar, welche
   ihrer Werte noch feste Zahlen/Farben statt Zweck-Token nutzen (reine Kennzeichnung/Markierung
   als Hinweis — das Aufräumen dieser markierten Werte ist AUSDRÜCKLICH NICHT Teil dieser Phase,
   sondern ein eigener künftiger Auftrag).
- Beschreibungstexte durchgängig jargonfrei (keine Begriffe wie „CSS-Custom-Properties",
  „domänenspezifische Komposition" o. ä. in der für Menschen sichtbaren Storybook-Beschreibung —
  technische Begriffe dürfen in Code-Kommentaren bleiben, nicht in der Autodocs-Oberfläche).
- Automatischer Scan aller CSS-Custom-Properties (`frontend/src/lib/designTokens.ts`) bleibt die
  Datenquelle — die Neugliederung ändert die Darstellung/Gruppierung, nicht den Scan-Mechanismus
  selbst.

### Bestätigte visuelle Regression: Anime-Kopf Desktop zeigt schwarzen Block + unsichtbare Überschrift

**Bestätigt durch eigene Playwright-Sichtprüfung dieser Runde** (Story
„Zusammengesetzte Bausteine/Anime-Kopf" → „Standard", 1440×900, Screenshot angefertigt und
inspiziert): Poster-Spalte zeigt keinen erkennbaren Poster-Ausschnitt (nur ein diffuser
Verlauf), obwohl alle `<img>`-Elemente laut `naturalWidth`/`complete` fehlerfrei laden (keine
kaputten Bilder, keine Konsolenfehler). Darunter, im Info-Karten-Bereich unterhalb von
Titel/Badges/Beschreibung/Tags, erscheint ein großer (~900px hoher, über die volle Breite
reichender), vollständig schwarzer Block ohne erkennbaren Bildinhalt — vermutlich
`AnimeInfoBanner` (`AnimeMediaProvider.tsx`, rendert ein `<Image>` mit `width={600} height={180}`
auf das Portrait-Platzhalterbild `/covers/display/placeholder.png`, Seitenverhältnis-Fehlpassung
zum erwarteten Landscape-Banner) ODER die umgebende `Card variant="publicHeroInfo"`-Fläche
(`--card-public-hero-info-bg`) — Ursache in dieser Runde nicht abschließend verifiziert, siehe
unten. Die Überschrift „Verwandte Anime" (`AnimeRelations`, unterhalb des schwarzen Blocks) ist
auf dem hellen Kartenhintergrund nahezu unsichtbar (sehr geringer Kontrast, hellgrau auf weiß).

**Entscheidung:**
- Root-Cause-Analyse UND Fix sind Teil dieser Gap-Closure-Runde (nicht aufschieben) — vermutete
  Ansatzpunkte für die Untersuchung: (a) `AnimeInfoBanner`s `width={600} height={180}` erwartet ein
  Landscape-Seitenverhältnis, die Storybook-MSW-Fixture (`animeBackdropManifestFixture` in
  `.storybook/mocks/animeFixtures.ts`) liefert aber denselben Portrait-Platzhalter wie das Poster
  — eventuell braucht die Fixture ein eigenes, tatsächlich landscape-förmiges Platzhalterbild für
  den Banner-Anwendungsfall; (b) `Card variant="publicHeroInfo"`s Hintergrund-Token
  (`--card-public-hero-info-bg`, siehe `components.css`) auf korrekte Auflösung prüfen,
  insbesondere im Zusammenspiel mit `SplitLayout align="stretch"` (könnte die Karte unbegrenzt in
  die Höhe strecken, wenn ein Geschwister-Element unerwartet hoch wird); (c) Zusammenhang mit der
  in Plan 192-07 bereits gefundenen und behobenen SplitLayout-Container-Query-Eigenbezugs-Problematik
  prüfen — evtl. ein verwandter, noch nicht vollständig behobener Nachbareffekt. Die exakte Ursache
  bei Ausführung dieses Gap-Plans ermitteln, nicht raten.
- „Verwandte Anime"-Überschrift bekommt ausreichenden Kontrast gegen den (hellen)
  Info-Karten-Hintergrund — über die bestehende Text-/Heading-Tonalität des Bausteins lösen (siehe
  bereits etabliertes Muster für "Tags" weiter oben in derselben Karte, kein neues Farbliteral).
- Pflicht-Nachweis: Story-vs.-Live-Bildpaar Anime-Kopf (Desktop 1440 + Mobil 390) OHNE schwarzen
  Block und mit lesbarer „Verwandte Anime"-Überschrift, im Bericht beigelegt.

### Reihenfolge Runde 3

Zuerst **B** (Baustein-CSS-Reinheit inkl. Guard-Erweiterung) — danach lässt sich **A** (SplitLayout
gap) und die **visuelle Regression** im selben Aufwasch korrigieren, da B ohnehin den
`--split-gap`-Override entfernt und die betroffenen Dateien erneut anfasst. Dann **D**
(Zweck-Namen-Korrektur `'tight'`/`'section'`) — baut auf den in B/A bereits aufgeräumten
Aufrufstellen auf. Dann **C** (Test-Umbau), unabhängig, kann parallel zu D laufen. Dann **27** und
**28** (Storybook-Dokumentationsseiten), unabhängig von A/B/C/D, können parallel zueinander und zu
C laufen. Zuletzt eine aktualisierte Abschluss-Verifikation (Playwright-Bildpaare main vs. Branch
UND Story vs. Live je Pilot-Baustein, vollständiger Regressionslauf) — nach ALLEN Plänen dieser
Runde.

### Claude's Discretion (Runde 3)

- Exakter Zweck-Name für `SplitLayout.breakpoint` (Befund A) oder Beibehaltung ohne Umbenennung,
  falls sich kein eindeutiger, nicht geratener Zweck ergibt.
- Technische Form des neuen Trennlinien-/Innenabstand-Grundbausteins bzw. der erweiterten
  Card-Variante (Befund B) — Hauptsache: kein eigenes `<hr>`+`background`/`margin`/`padding` mehr
  in einer Pilot-Baustein-`.module.css`.
- Exakte neue Zweck-Namen für `'tight'`/`'section'` (Befund D).
- Ob die Root-Cause der visuellen Regression tatsächlich bei (a), (b), (c) oder einer anderen,
  bei der Untersuchung gefundenen Ursache liegt — Entscheidung nach tatsächlichem Befund, nicht
  vorab festgelegt.

</addendum_2026-11-04c>

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

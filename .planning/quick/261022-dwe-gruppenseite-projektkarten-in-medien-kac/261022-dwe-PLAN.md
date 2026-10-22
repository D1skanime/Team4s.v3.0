---
phase: quick-261022-dwe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/ui/FocalCarouselInternals.tsx
  - frontend/src/components/ui/FocalCarousel.tsx
  - frontend/src/components/ui/FocalCarousel.module.css
  - frontend/src/components/ui/FocalCarousel.test.tsx
  - frontend/src/components/fansubs/fansubProjectsLayout.ts
  - frontend/src/components/fansubs/fansubProjectsLayout.test.ts
  - frontend/src/components/fansubs/useFansubProjectsBreakpoint.ts
  - frontend/src/components/fansubs/FansubPublicSections.module.css
  - frontend/src/components/fansubs/FansubProjectsSection.module.css
  - frontend/src/components/fansubs/FansubProjectsGrid.tsx
  - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Bei 1-3 Projekten auf Desktop (>=1000px) und 1-2 Projekten auf Tablet (640-999px) erscheinen alle Projektkarten linksbündig in einem reinen CSS-Raster in Medien-Kachelgröße -- keine Karussell-Pfeile, keine zentrierte Fokus-Karte, keine abgedunkelten Nachbarkarten."
    - "Genau an der Grenze (3 Projekte Desktop, 2 Projekte Tablet) bleibt es Raster; ein Projekt mehr (4 Desktop bzw. 3 Tablet) schaltet auf eine horizontal scrollbare Kartenreihe mit Pfeilen um."
    - "Die scrollbare Kartenreihe (>3 Desktop bzw. >2 Tablet) zeigt Karten in Kachelgröße, beginnt linksbündig (keine Zentrierung des aktiven Elements) und dimmt inaktive Karten nicht ab."
    - "Mobile (<640px) ist bei 2 oder mehr Projekten bit-für-bit unverändert: eine Karte zentriert plus Anriss der nächsten Karte, exakt wie heute."
    - "Ein einzelnes Projekt (jede Breite) erscheint in Medien-Kachelgröße statt der bisherigen festen 320x180-Karte, weiterhin ohne Karussell."
    - "Die Breakpoint->Raster-oder-Scroll-Entscheidung lebt in einer reinen, DOM-freien Funktion mit direkten Unit-Tests (kein Render, kein Snapshot)."
    - "FocalCarousel-Nutzung auf Profilseiten (MemberBadgeChain) bleibt exakt unverändert, da die neue Fähigkeit rein additiv (neuer optionaler presentation-Wert) ist."
  artifacts:
    - path: "frontend/src/components/fansubs/fansubProjectsLayout.ts"
      provides: "resolveBreakpoint(width) und decideProjectsLayout(projectCount, breakpoint) als reine Funktionen"
      contains: "decideProjectsLayout"
    - path: "frontend/src/components/fansubs/fansubProjectsLayout.test.ts"
      provides: "Tabellentest aller Breakpoint-/Projektzahl-Grenzfälle, keine Render-Simulation"
      contains: "decideProjectsLayout"
    - path: "frontend/src/components/fansubs/useFansubProjectsBreakpoint.ts"
      provides: "Client-Hook, der window.innerWidth per resize-Listener in resolveBreakpoint() überführt"
      contains: "useFansubProjectsBreakpoint"
    - path: "frontend/src/components/ui/FocalCarouselInternals.tsx"
      provides: "Neue additive Funktion startAlignedScrollLeft (linksbündige Scroll-Position statt Zentrierung)"
      contains: "startAlignedScrollLeft"
    - path: "frontend/src/components/fansubs/FansubProjectsGrid.tsx"
      provides: "Verdrahtung: Raster- vs. Karussell-Pfad je nach decideProjectsLayout-Ergebnis"
      contains: "decideProjectsLayout"
  key_links:
    - from: "frontend/src/components/fansubs/FansubProjectsGrid.tsx"
      to: "frontend/src/components/fansubs/fansubProjectsLayout.ts"
      via: "decideProjectsLayout(items.length, breakpoint)"
      pattern: "decideProjectsLayout"
    - from: "frontend/src/components/fansubs/FansubProjectsGrid.tsx"
      to: "frontend/src/components/ui/FocalCarousel.tsx"
      via: "presentation=\"grid-scroll\" nur im scroll-strip-Fall"
      pattern: "grid-scroll"
    - from: "frontend/src/components/fansubs/FansubProjectsSection.module.css"
      to: "frontend/src/components/fansubs/FansubPublicSections.module.css"
      via: "composes: tileColumnGrid from './FansubPublicSections.module.css'"
      pattern: "composes:.*tileColumnGrid"
---

<objective>
Die Projektkarten auf der öffentlichen Gruppenseite (`/fansubs/[slug]`) rendern aktuell bei 2+
Projekten über FocalCarousel im Standard-"focal"-Modus: eine überbreite, zentrierte Großkarte
(718x404 bei 1440px Desktop) mit abgedunkelten Nachbarn und abgeschnittener zweiter Karte -- selbst
wenn beide Karten nebeneinander passen würden. Bei genau einem Projekt existiert bereits ein
Sonderfall (Commit b11150ebe), der FocalCarousel umgeht, aber mit einer festen 320x180-Karte statt
der Medien-Kachelgröße.

Dieser Plan ersetzt das durch eine breakpoint-bewusste Entscheidung: Passen alle Projekte
nebeneinander in die Spaltenzahl des bestehenden Medien-Kachelrasters (`.mediaItemGrid` in
`FansubPublicSections.module.css`, `repeat(3,1fr)` Desktop / `repeat(2,1fr)` Tablet), wird ein
reines, linksbündiges CSS-Raster in Medien-Kachelgröße gerendert -- kein Karussell. Passen sie nicht
(>3 Desktop, >2 Tablet), wird das bestehende FocalCarousel wiederverwendet, aber in einem neuen,
additiven `presentation="grid-scroll"`-Modus: Karten in Kachelgröße, linksbündig, kein
Center-Fokus, keine Abdunklung. Mobile (<640px) bleibt für 2+ Projekte komplett unberührt (heutiges
zentriertes Peek-Karussell).

Purpose: Projektkarten auf der Gruppenseite wirken nicht mehr überdimensioniert/zentriert
abgeschnitten, sondern einheitlich mit dem Medien-Raster derselben Seite.
Output: Reine Breakpoint-Entscheidungsfunktion + Tests, additive FocalCarousel-Fähigkeit
(`grid-scroll`), wiederverwendetes Kachel-CSS, verdrahtete FansubProjectsGrid-Komponente.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@frontend/src/components/fansubs/FansubProjectsGrid.tsx
@frontend/src/components/fansubs/FansubProjectsSection.module.css
@frontend/src/components/fansubs/FansubPublicSections.module.css
@frontend/src/components/ui/FocalCarousel.tsx
@frontend/src/components/ui/FocalCarouselInternals.tsx
@frontend/src/components/ui/FocalCarousel.module.css
@frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
</context>

<interfaces>
Aktueller Stand (vor diesem Plan), damit beide Tasks ohne weitere Code-Exploration arbeiten können:

`FocalCarouselInternals.tsx` exportiert u.a.:
```typescript
export function centeredScrollLeft(track: HTMLDivElement, element: HTMLElement): number
export function positionOwnedItem(track: HTMLDivElement | null, index: number): void
export function nearestOwnedItemIndex(track: HTMLDivElement | null, activeIndex: number, lastIndex: number): number
export function directItemElements(track: HTMLDivElement | null): HTMLElement[]
```
`FocalCarouselProps<T>.presentation` ist aktuell `'focal' | 'full-width'` (default `'focal'`, Default wird
in `CollapsedCarousel` gesetzt). `CollapsedCarousel` rendert die Root-Klasse als
`classNames(styles.root, presentation === 'full-width' && styles.fullWidth, className)`. `style`-Prop wird
unverändert auf das Root-Div durchgereicht (`style={style}`), kaskadiert also als CSS-Custom-Properties
nach unten.

`FocalCarousel.tsx` ruft `positionOwnedItem(track, index)` in `setTrackElement` und
`centeredScrollLeft(track, element)` in `focusItem` auf (jeweils einzige Aufrufstelle im Projekt).
`ThumbnailStrip.tsx` nutzt `centeredScrollLeft`/`directItemElements` separat und bleibt unberührt.

`FansubProjectsGrid.tsx` (aktuell, 84 Zeilen): bei `items.length === 1` wird `styles.bannerGrid`
gerendert (feste 240-320px-Karten); sonst immer FocalCarousel im Default-"focal"-Modus mit
`carouselClassName={styles.projectCarousel}`, `itemClassName={styles.projectWindow}`,
`activeItemClassName={styles.projectWindowActive}`, `gridClassName={styles.projectGrid}` (letzteres
nur für die ausgeklappte "Alle anzeigen"-Ansicht relevant, NICHT für die Default-Karussell-Ansicht).

`FansubPublicSections.module.css` `.mediaItemGrid` (Medien-Kachelraster, die Ziel-Referenzgröße):
```css
.mediaItemGrid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
@media (max-width: 999px) { .mediaItemGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 639px) { .mediaItemGrid { grid-template-columns: minmax(0, 1fr); } }
```
Bei einem einzelnen Kind in `repeat(3, minmax(0,1fr))` (kein `auto-fill`) nimmt die Karte exakt eine
Spaltenbreite ein und bleibt linksbündig -- das ist der Mechanismus, der "1 Projekt in Kachelgröße,
linksbündig" ohne Sonderfall-CSS liefert.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: FocalCarousel additiv um linksbündigen "grid-scroll"-Modus erweitern</name>
  <files>frontend/src/components/ui/FocalCarouselInternals.tsx, frontend/src/components/ui/FocalCarousel.tsx, frontend/src/components/ui/FocalCarousel.module.css, frontend/src/components/ui/FocalCarousel.test.tsx</files>
  <behavior>
    - `startAlignedScrollLeft(track, element)`: Element am rechten Rand -> scrollLeft richtet linke Kante
      des Elements an der linken Kante des Tracks aus (kein Zentrieren), geklemmt auf `[0, maxScroll]`
      wie `centeredScrollLeft`.
    - `presentation="grid-scroll"` auf einem FocalCarousel mit 3 Items: alle drei Item-Wrapper haben nach
      dem Rendern volle Opazität/keinen Filter (keine Abdunklung irgendeines Items, nicht nur des
      aktiven) -- im Unterschied zum Default-"focal"-Modus, wo inaktive Items `opacity: 0.72` behalten.
    - `presentation="grid-scroll"`: Klick auf den "Weiter"-Pfeil ruft intern `startAlignedScrollLeft`
      (nicht `centeredScrollLeft`) für die Scroll-Zielposition auf.
    - Bestehende Presentations (`'focal'`, `'full-width'`, kein `presentation`-Prop) bleiben exakt wie
      zuvor: bestehende Tests in dieser Datei dürfen NICHT geändert werden und müssen weiter grün sein
      (Regressionsschutz für die beiden `MemberBadgeChain.tsx`-Nutzungen).
  </behavior>
  <action>
    In `FocalCarouselInternals.tsx`: direkt neben `centeredScrollLeft` eine neue, parallele, exportierte
    Funktion `startAlignedScrollLeft(track: HTMLDivElement, element: HTMLElement): number` ergänzen, die
    dieselbe Grundstruktur wie `centeredScrollLeft` übernimmt (gleicher `maxScroll`, gleicher
    `trackRect`/`elementRect`-Aufbau, gleiches Clamping), aber die linke statt die zentrierte Kante
    berechnet: `track.scrollLeft + elementRect.left - trackRect.left` (Fallback bei `trackRect.width
    <= 0`: `element.offsetLeft`). `centeredScrollLeft`, `positionOwnedItem`, `nearestOwnedItemIndex`
    NICHT verändern. Nach dem Einfügen `wc -l FocalCarouselInternals.tsx` prüfen -- falls die Datei >450
    Zeilen überschreitet, VOR dem Verhaltens-Commit einen separaten reinen Umbau-Commit machen (z.B. die
    DOM-Mess-/Scroll-Hilfsfunktionen `centeredScrollLeft`/`startAlignedScrollLeft`/`positionOwnedItem`/
    `nearestOwnedItemIndex`/`directItemElements`/`ownedItemClickHandler`/`consumeSuppressedClick` in eine
    neue Datei `FocalCarouselGeometry.ts` auslagern und von dort re-exportieren), Tests/Typecheck danach
    grün, Importe in `FocalCarousel.tsx` und `ThumbnailStrip.tsx` entsprechend nachziehen, bevor der
    Verhaltens-Commit folgt.

    In `FocalCarousel.tsx`: Den Typ `presentation?: 'focal' | 'full-width'` in
    `FocalCarouselProps<T>` (in `FocalCarouselInternals.tsx`) um `'grid-scroll'` erweitern (additiv, Default
    bleibt `'focal'`). Im Funktionskörper von `FocalCarousel` eine Konstante
    `const align: 'center' | 'start' = props.presentation === 'grid-scroll' ? 'start' : 'center'`
    ergänzen. In `setTrackElement` den bestehenden Aufruf `positionOwnedItem(track, ...)` durch eine
    `align`-Verzweigung ersetzen: bei `align === 'start'` das Zielelement selbst holen
    (`directItemElements(track)[index]`) und `startAlignedScrollLeft` + `track.scrollTo?.({ left,
    behavior: 'auto' }) ?? (track.scrollLeft = left)` verwenden, sonst unverändert `positionOwnedItem(track,
    index)` aufrufen. In `focusItem` die Zeile `const targetLeft = centeredScrollLeft(track, element)` durch
    `const targetLeft = align === 'start' ? startAlignedScrollLeft(track, element) : centeredScrollLeft(track,
    element)` ersetzen. `startAlignedScrollLeft` entsprechend importieren. `nearestItemIndex`/
    `nearestOwnedItemIndex` (Center-Näherungs-Erkennung für freies Scrollen/Drag) bewusst UNVERÄNDERT
    lassen -- das ist eine akzeptierte Näherung für den seltenen Dreh-/Wisch-Fall, keine Anforderung.

    In `CollapsedCarousel` (FocalCarouselInternals.tsx) die Root-Klassenliste um
    `presentation === 'grid-scroll' && styles.gridScroll` erweitern (neben dem bestehenden
    `presentation === 'full-width' && styles.fullWidth`).

    In `FocalCarousel.module.css` NEUE, additive Selektoren ergänzen (keine bestehende Regel ändern):
    ```
    .gridScroll .items { gap: 12px; }
    .gridScroll .track { --focal-item-size: var(--grid-scroll-item-size, min(72%, 720px)); }
    .gridScroll .items::before, .gridScroll .items::after { content: none; }
    .gridScroll .itemWindow { scroll-snap-align: start; opacity: 1; filter: none; }
    ```

    In `FocalCarousel.test.tsx`: NICHTS an bestehenden Tests ändern. Einen neuen `describe`-Block
    ergänzen, der (a) das vorhandene `mockBrowserCarouselGeometry`-Setup aus dieser Datei wiederverwendet,
    um ein FocalCarousel mit 3 Items und `presentation="grid-scroll"` zu rendern und zu prüfen, dass KEIN
    Item die Klasse mit `opacity: 0.72`/Filter-Abdunklung sichtbar trägt (z.B. per
    `getComputedStyle`-Vergleich oder durch Prüfen, dass `styles.itemWindowActive`-exklusives Styling
    nicht nötig ist, weil `.gridScroll .itemWindow` bereits volle Opazität erzwingt -- orientiere dich an
    der bestehenden Assertion-Technik in dieser Datei für Opazität/Filter, falls vorhanden, sonst direkt
    über `window.getComputedStyle(item).opacity`), und (b) dass ein Klick auf den "Weiter"-Pfeil
    `region.scrollLeft` auf einen Wert setzt, der NICHT der zentrierten Position entspricht (zum
    Vergleich: miss zusätzlich denselben Testfall mit `presentation` weggelassen/`'focal'` und zeige, dass
    sich die resultierenden `scrollLeft`-Werte unterscheiden).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/ui/FocalCarousel.test.tsx"</automated>
  </verify>
  <done>Alle bestehenden FocalCarousel-Tests bleiben unverändert grün; neue grid-scroll-Tests grün; `wc -l` beider Internals-/Haupt-Dateien bleibt &lt;=450 (oder wurde vorher aufgeteilt).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Breakpoint-Entscheidungsfunktion + Kachel-CSS-Wiederverwendung + FansubProjectsGrid verdrahten</name>
  <files>frontend/src/components/fansubs/fansubProjectsLayout.ts, frontend/src/components/fansubs/fansubProjectsLayout.test.ts, frontend/src/components/fansubs/useFansubProjectsBreakpoint.ts, frontend/src/components/fansubs/FansubPublicSections.module.css, frontend/src/components/fansubs/FansubProjectsSection.module.css, frontend/src/components/fansubs/FansubProjectsGrid.tsx, frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx</files>
  <behavior>
    - `resolveBreakpoint(999)` -> `'tablet'`; `resolveBreakpoint(1000)` -> `'desktop'`; `resolveBreakpoint(639)`
      -> `'mobile'`; `resolveBreakpoint(640)` -> `'tablet'` (exakt an den bestehenden
      `.mediaItemGrid`-Medienquery-Grenzen 999/639 ausgerichtet).
    - `decideProjectsLayout(1, 'mobile'|'tablet'|'desktop')` -> immer `{ mode: 'grid', columns: ... }`.
    - `decideProjectsLayout(2, 'mobile')` -> `{ mode: 'carousel-peek', columns: 1 }` (heutiges
      Karussell-Verhalten bleibt für Mobile unverändert).
    - `decideProjectsLayout(2, 'tablet')` -> `{ mode: 'grid', columns: 2 }`;
      `decideProjectsLayout(3, 'tablet')` -> `{ mode: 'scroll-strip', columns: 2 }`.
    - `decideProjectsLayout(3, 'desktop')` -> `{ mode: 'grid', columns: 3 }`;
      `decideProjectsLayout(4, 'desktop')` -> `{ mode: 'scroll-strip', columns: 3 }`.
  </behavior>
  <action>
    Neue Datei `fansubProjectsLayout.ts`: Typ `Breakpoint = 'mobile' | 'tablet' | 'desktop'`, Konstante
    `COLUMNS_BY_BREAKPOINT: Record<Breakpoint, 1 | 2 | 3> = { mobile: 1, tablet: 2, desktop: 3 }`,
    Funktion `resolveBreakpoint(width: number): Breakpoint` (>=1000 desktop, >=640 tablet, sonst mobile --
    exakt die Grenzwerte aus `.mediaItemGrid`, im Kommentar darauf verweisen), Typ
    `ProjectsLayoutMode = 'grid' | 'carousel-peek' | 'scroll-strip'`, Typ
    `ProjectsLayoutDecision = { mode: ProjectsLayoutMode; columns: 1 | 2 | 3 }`, Funktion
    `decideProjectsLayout(projectCount: number, breakpoint: Breakpoint): ProjectsLayoutDecision`: bei
    `projectCount <= 1` immer `{ mode: 'grid', columns: COLUMNS_BY_BREAKPOINT[breakpoint] }`; bei
    `breakpoint === 'mobile'` sonst immer `{ mode: 'carousel-peek', columns: 1 }`; sonst
    `columns = COLUMNS_BY_BREAKPOINT[breakpoint]` und `projectCount <= columns ? 'grid' : 'scroll-strip'`.
    Alle Typen/Funktionen exportieren, keine DOM-Zugriffe in dieser Datei.

    Neue Datei `fansubProjectsLayout.test.ts`: Tabellentest über alle im `<behavior>`-Block genannten
    Fälle plus die Grenzwerte von `resolveBreakpoint` (639/640/999/1000). Reine Funktionsaufrufe, kein
    `@vitest-environment jsdom`-Pragma nötig, kein Render.

    Neue Datei `useFansubProjectsBreakpoint.ts` (`'use client'`): Hook nach dem Muster der bestehenden
    `useFansubEditMediaQuery` (Datei `frontend/src/app/admin/fansubs/[id]/edit/hooks/useFansubEditViewport.ts`,
    nur als Stil-Referenz, nicht importieren) -- State startet mit `'desktop'` (gleicher Wert auf
    Server und erstem Client-Render, verhindert Hydration-Mismatch-Warnungen), ein `useEffect` ruft beim
    Mount `resolveBreakpoint(window.innerWidth)` auf, setzt den State, registriert einen `resize`-Listener
    auf `window` der dasselbe tut, und entfernt ihn im Cleanup. Importiert `resolveBreakpoint`/`Breakpoint`
    aus `./fansubProjectsLayout`.

    In `FansubPublicSections.module.css`: Die bestehenden Spalten-Medienqueries aus `.mediaItemGrid` in
    eine neue Klasse `.tileColumnGrid` auslagern (3 Spalten Default, 2 Spalten `max-width:999px`, 1 Spalte
    `max-width:639px`, inklusive des bestehenden erklärenden Kommentars block). `.mediaItemGrid` wird zu
    `composes: tileColumnGrid; gap: 12px;` (keine eigenen Medienqueries mehr, keine duplizierten Werte).

    In `FansubProjectsSection.module.css`: Neue Klasse `.projectTileGrid { composes: tileColumnGrid from
    './FansubPublicSections.module.css'; gap: 12px; }` ergänzen. `.bannerGrid` entfernen (wird durch
    `.projectTileGrid` ersetzt, keine verbleibende Nutzung). `.projectCarousel`/`.projectWindow`/
    `.projectWindowActive`/`.projectGrid`/`.projectCountCard`/`.carouselSkeleton` NICHT ändern (werden für
    den weiterhin genutzten FocalCarousel-Pfad -- Mobile-Karussell UND neuer scroll-strip -- unverändert
    wiederverwendet).

    In `FansubProjectsGrid.tsx`: `useFansubProjectsBreakpoint()` aufrufen, `decideProjectsLayout(items.length,
    breakpoint)` auswerten (NACH dem bestehenden `if (items.length === 0) return null`, VOR der
    PREVIEW_COUNT-Logik). Bei `layout.mode === 'grid'`: `<div className={styles.projectTileGrid}>{items.map(renderProject)}</div>`
    zurückgeben (ersetzt sowohl den alten `items.length === 1`-Sonderfall als auch deckt jetzt 2-3
    Projekte Desktop / 2 Projekte Tablet ab). Andernfalls (`'carousel-peek'` oder `'scroll-strip'`) bleibt
    die bestehende FocalCarousel-JSX inkl. PREVIEW_COUNT/hasMore/"+N weitere"-Logik unverändert erhalten,
    ergänzt um zwei neue Props: `presentation={layout.mode === 'scroll-strip' ? 'grid-scroll' : undefined}`
    und `style={layout.mode === 'scroll-strip' ? ({ '--grid-scroll-item-size': \`calc((100% - 12px * ${layout.columns - 1}) / ${layout.columns})\` } as CSSProperties) : undefined}`
    (bei `'carousel-peek'` bleiben beide Props `undefined` -- das Mobile-Karussell bleibt dadurch exakt
    wie heute). `CSSProperties` aus `'react'` importieren.

    In `FansubProjectsGrid.test.tsx`: Bestehende Tests (1 Projekt, 3 Projekte, 25 Projekte) laufen bei
    jsdom-Default-`window.innerWidth` (1024, also `'desktop'`) weiter über den neuen Code-Pfad -- nach der
    Umsetzung gegenprüfen, dass sie weiterhin grün sind (3 Projekte landen jetzt im `'grid'`-Pfad statt im
    Default-FocalCarousel, die Assertions auf Projekttitel/Links/fehlende Zähler-Card bleiben gültig; 25
    Projekte bleiben im `'scroll-strip'`-Pfad über FocalCarousel, alle bestehenden Assertions dort bleiben
    gültig). Einen NEUEN Test ergänzen, der vor dem Rendern `window.innerWidth` auf `375` setzt (z.B. via
    `Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })` und danach
    `fireEvent(window, new Event('resize'))` nach dem Rendern mit 2 Projekten) und beweist, dass die
    Karussell-Region (`role: 'region', name: 'Projekt-Vorschau'`) bei Mobile-Breite weiterhin erscheint,
    während ein paralleler Test mit `window.innerWidth = 1024` (Desktop, Default) bei ebenfalls 2 Projekten
    zeigt, dass die Region NICHT erscheint (stattdessen `styles.projectTileGrid`-Markup).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/fansubs/fansubProjectsLayout.test.ts src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx src/components/fansubs/__tests__/FansubProjectsSection.test.tsx"</automated>
  </verify>
  <done>Reine Entscheidungsfunktion + Hook existieren mit Tests; `.mediaItemGrid` und `.projectTileGrid` teilen sich dieselbe Spalten-Definition über `composes` statt Duplikation; FansubProjectsGrid rendert je nach Breakpoint/Anzahl Raster, Mobile-Karussell (unverändert) oder scroll-strip; alle genannten Tests grün.</done>
</task>

<task type="auto">
  <name>Task 3: Vollständige Checks, Container-Neustart, Playwright-Verifikation an drei Breakpoints, Commit</name>
  <files>keine neuen Dateien (Verifikations- und Commit-Schritt)</files>
  <action>
    1. Im Frontend-Container volle Testsuite und Typecheck ausführen:
       `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test"` und
       `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"`. Beide müssen GREEN
       sein; Fehlschläge am Ursprung beheben (Verhalten nicht zugunsten grüner Tests verbiegen).
    2. `wc -l` auf allen in diesem Plan geänderten Produktionsdateien (nicht Tests) prüfen -- jede muss
       &lt;=450 Zeilen bleiben; falls eine Datei das überschreitet und noch nicht aufgeteilt wurde, jetzt
       per separatem reinem Umbau-Commit aufteilen, bevor committed wird.
    3. `docker restart team4sv30-frontend` ausführen, kurz warten bis der Container wieder "Up"/healthy
       ist (`docker compose ps team4sv30-frontend`).
    4. Mit echtem Chromium-Playwright (nicht nur Code-Review) über den SSH-Tunnel `http://127.0.0.1:3300`
       bei den Viewport-Breiten 1440, 768 und 375 folgende Routen prüfen:
       - `/fansubs/new-subs` (1 Projekt): bei jeder Breite erscheint die Karte in Medien-Kachelgröße
         (keine 320x180-Fixgröße mehr), linksbündig, ohne Karussell-Pfeile.
       - `/fansubs/strawhat-subs` (2 Projekte): bei 1440 und 768 erscheinen beide Karten nebeneinander in
         einem linksbündigen Raster ohne Pfeile/Zentrierung (behebt den ursprünglich gemeldeten Bug: keine
         718x404-Großkarte mehr, keine 300px Leerraum links, keine abgeschnittene zweite Karte); bei 375
         bleibt das heutige zentrierte Peek-Karussell unverändert (eine Karte zentriert + Anriss der
         zweiten).
       - `/fansubs/bloody-shadow` (3 Projekte -- Grenzfall): bei 1440 erscheinen alle drei Karten
         nebeneinander im Raster ohne Pfeile (3 == Spaltenzahl Desktop, also noch Raster-Modus, kein
         Scroll); bei 768 (Tablet, 2 Spalten, 3 > 2) erscheint die scrollbare Kartenreihe mit Pfeilen,
         linksbündig startend, keine Abdunklung der dritten Karte; bei 375 unverändertes Peek-Karussell.
         Falls die öffentliche Seite aus Sichtbarkeits-/Status-Gründen weniger als 3 Karten zeigt, die
         tatsächlich gerenderte Anzahl protokollieren und gegen die erwartete Einstufung prüfen statt den
         Schritt zu überspringen.
       Für jede Route/Breite einen Screenshot machen und auffällige Abweichungen (Layout-Sprung,
       Konsole-Fehler) notieren.
    5. Kein Gruppen-Datensatz in der lokalen DB hat mehr als 3 Projekte (geprüft per SQL gegen
       `team4sv30-db`/`team4s_v2`: `select fg.slug, count(*) from fansub_groups fg join
       anime_fansub_groups afg on afg.fansub_group_id = fg.id group by fg.slug order by count(*) desc;`,
       Maximum war 3 bei `bloody-shadow`). Der ">3 Projekte -> scroll-strip bei Desktop" bzw. ">2 bei
       Tablet"-Pfad für größere Gruppen ist daher NICHT live mit Playwright nachstellbar -- das ist
       explizit zulässig (keine Lücke): er ist bereits durch die Unit-Tests aus Task 2
       (`decideProjectsLayout(4, 'desktop')`/`decideProjectsLayout(3, 'tablet')` -> `'scroll-strip'`) und
       den Task-1-Test für `presentation="grid-scroll"` abgedeckt. Diesen Umstand in SUMMARY.md
       dokumentieren, nicht verschweigen.
    6. Geänderte Dateien gezielt einzeln stagen (kein `git add -A`/`.`) und committen, OHNE
       Co-Authored-By-Trailer, ohne Push:
       `git add frontend/src/components/ui/FocalCarouselInternals.tsx
        frontend/src/components/ui/FocalCarousel.tsx
        frontend/src/components/ui/FocalCarousel.module.css
        frontend/src/components/ui/FocalCarousel.test.tsx
        frontend/src/components/fansubs/fansubProjectsLayout.ts
        frontend/src/components/fansubs/fansubProjectsLayout.test.ts
        frontend/src/components/fansubs/useFansubProjectsBreakpoint.ts
        frontend/src/components/fansubs/FansubPublicSections.module.css
        frontend/src/components/fansubs/FansubProjectsSection.module.css
        frontend/src/components/fansubs/FansubProjectsGrid.tsx
        frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx`
       gefolgt von `git commit -m "fix(quick-261022-dwe): Projektkarten in Medien-Kachelgröße, Karussell erst bei Überlauf"`.
       Falls Task 1 oder 2 eine Datei aufteilen musste, deren reiner Umbau-Commit bereits VOR diesem
       Commit separat erstellt worden sein (nicht nachträglich vermischen).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test" 2>&1 | tail -20 && docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck" 2>&1 | tail -20</automated>
  </verify>
  <done>Test/Typecheck GREEN im Container; Container neu gestartet; Playwright-Screenshots für alle neun Route/Breite-Kombinationen (3 Routen x 3 Breiten) vorliegen und dokumentiert; >3-Projekte-Pfad explizit als "per Unit-Test abgedeckt, nicht live verfügbar" dokumentiert statt übersprungen; Commit erstellt ohne Co-Authored-By, kein Push.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Browser Viewport -> Client-Komponente | `window.innerWidth`/`resize`-Events sind rein clientseitige, nicht-sicherheitsrelevante Layout-Signale |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-261022-dwe-01 | Information Disclosure | keine | accept | Rein visuelle Layout-Änderung auf bereits öffentlichen Projektdaten, keine neuen Datenflüsse/Endpunkte |
| T-261022-dwe-02 | Denial of Service (Client) | useFansubProjectsBreakpoint resize-Listener | accept | Listener wird im useEffect-Cleanup entfernt, kein Leak; keine teure Berechnung pro Resize-Event |
</threat_model>

<verification>
- `fansubProjectsLayout.test.ts`: alle Grenzfälle (Breakpoint-Schwellen, Raster/Scroll-Umschaltung je Breite) GREEN
- `FocalCarousel.test.tsx`: bestehende Suite unverändert GREEN, neue grid-scroll-Tests GREEN
- `FansubProjectsGrid.test.tsx`/`FansubProjectsSection.test.tsx`: bestehende und neue Breakpoint-Tests GREEN
- Volle Frontend-Testsuite + Typecheck GREEN im Container
- Alle geänderten Produktionsdateien bleiben <=450 Zeilen
- Playwright-Sichtprüfung bei 1440/768/375 auf new-subs (1), strawhat-subs (2), bloody-shadow (3) bestätigt: Kachelgröße, Linksbündigkeit, kein Center-Fokus, Mobile-Karussell unverändert
</verification>

<success_criteria>
- Projektkarten auf der Gruppenseite haben dieselbe Größe wie die Medien-Kacheln derselben Seite, bei 1, 2, 3 und (laut Unit-Test) mehr Projekten
- Desktop/Tablet zeigen bis zur jeweiligen Spaltenzahl ein reines linksbündiges Raster ohne Karussell; erst bei Überlauf eine linksbündige, nicht abgedunkelte Scroll-Reihe mit Pfeilen
- Mobile-Karussell-Verhalten (Peek) ist für 2+ Projekte unverändert
- FocalCarousel-Nutzung auf Profilseiten bleibt unverändert (additive, optionale Erweiterung)
- Keine CSS-Wert-Duplikation zwischen Medien- und Projekt-Raster (geteilte `composes`-Klasse)
- Tests/Typecheck GREEN, Dateien <=450 Zeilen, Commit ohne Co-Authored-By/Push
</success_criteria>

<output>
Create `.planning/quick/261022-dwe-gruppenseite-projektkarten-in-medien-kac/261022-dwe-SUMMARY.md` when done, inklusive Playwright-Screenshot-Pfaden/Beobachtungen für alle neun Route/Breite-Kombinationen und der expliziten Dokumentation, dass der >3-Projekte-Pfad nur per Unit-Test (nicht live) verifiziert werden konnte.
</output>

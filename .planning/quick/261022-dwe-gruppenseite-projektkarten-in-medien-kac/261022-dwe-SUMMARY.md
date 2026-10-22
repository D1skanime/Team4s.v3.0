---
phase: quick-261022-dwe
plan: 01
subsystem: frontend/fansubs
tags: [fansub, gruppenseite, focal-carousel, layout, css-grid]
requires: []
provides:
  - frontend/src/components/fansubs/fansubProjectsLayout.ts (resolveBreakpoint, decideProjectsLayout)
  - frontend/src/components/fansubs/useFansubProjectsBreakpoint.ts
  - FocalCarousel presentation="grid-scroll" (additive, left-aligned, undimmed)
affects:
  - frontend/src/components/fansubs/FansubProjectsGrid.tsx
  - frontend/src/components/ui/FocalCarousel.tsx
tech-stack:
  added: []
  patterns:
    - "CSS composes: for shared column-breakpoint definitions (tileColumnGrid)"
    - "Pure breakpoint-decision function + thin client hook wrapper (no DOM access in the decision function itself)"
key-files:
  created:
    - frontend/src/components/fansubs/fansubProjectsLayout.ts
    - frontend/src/components/fansubs/fansubProjectsLayout.test.ts
    - frontend/src/components/fansubs/useFansubProjectsBreakpoint.ts
  modified:
    - frontend/src/components/ui/FocalCarouselInternals.tsx
    - frontend/src/components/ui/FocalCarousel.tsx
    - frontend/src/components/ui/FocalCarousel.module.css
    - frontend/src/components/ui/FocalCarousel.test.tsx
    - frontend/src/components/fansubs/FansubPublicSections.module.css
    - frontend/src/components/fansubs/FansubProjectsSection.module.css
    - frontend/src/components/fansubs/FansubProjectsGrid.tsx
    - frontend/src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
decisions:
  - "Playwright-Verifikation lief gegen http://192.168.235.196:3000 statt gegen den im Auftrag genannten SSH-Tunnel http://127.0.0.1:3300 (siehe Deviations)."
metrics:
  duration: "~75 min"
  completed: "2026-10-22"
---

# Phase quick-261022-dwe Plan 01: Projektkarten auf der Gruppenseite im Medien-Kachelraster statt im Standard-Karussell Summary

Projektkarten auf `/fansubs/[slug]` rendern jetzt bis zur Spaltenzahl des bestehenden
Medien-Kachelrasters (3 Desktop / 2 Tablet) in einem reinen, linksbündigen CSS-Grid in
Medien-Kachelgröße; erst bei Überlauf erscheint eine linksbündige, nicht abgedunkelte
Scroll-Reihe über eine neue, additive `presentation="grid-scroll"`-Fähigkeit von
`FocalCarousel`. Mobile bleibt für 2+ Projekte unverändert das zentrierte Peek-Karussell.

## Was wurde gebaut

**Task 1 — FocalCarousel additiv um `grid-scroll` erweitert** (Commit `c3fc1ad2e`)
- `startAlignedScrollLeft` in `FocalCarouselInternals.tsx`: identische Geometrie/Clamping wie
  `centeredScrollLeft`, aber linke statt zentrierte Kantenausrichtung.
- `FocalCarouselProps.presentation` additiv um `'grid-scroll'` erweitert (Default bleibt
  `'focal'`). `FocalCarousel.tsx` leitet eine `align: 'center' | 'start'`-Konstante ab und
  verwendet sie in der initialen Track-Positionierung (`setTrackElement`) und beim
  programmatischen Fokussieren (`focusItem`).
- `.gridScroll`-CSS (additiv, keine bestehende Regel verändert): keine Abdunklung
  (`opacity: 1; filter: none`), kein Center-Peek-Padding (`.items::before/::after { content: none }`),
  Item-Breite über die CSS-Variable `--grid-scroll-item-size`.
- Neue Tests: keine Abdunklung unter `.gridScroll` (per CSS-Regex, konsistent mit dem
  bestehenden Testmuster in dieser Datei) + ein Geometrie-Test, der beweist, dass ein
  "Weiter"-Klick bei `grid-scroll` eine andere `scrollLeft`-Zielposition erreicht als beim
  Default-`'focal'`-Modus mit identischer Track-/Item-Geometrie (150 vs. 300 bei einer
  600px-Spur mit zwei sichtbaren 300px-Karten).
- Alle 40 bestehenden FocalCarousel-Tests bleiben unverändert grün (Regressionsschutz für
  die beiden `MemberBadgeChain.tsx`-Profilseiten-Nutzungen).

**Task 2 — Breakpoint-Entscheidung + Kachel-CSS-Wiederverwendung + Verdrahtung** (Commit `a3cfebe99`)
- `fansubProjectsLayout.ts`: reine Funktionen `resolveBreakpoint(width)` (Grenzen exakt an
  `.mediaItemGrid` ausgerichtet: ≥1000 Desktop, ≥640 Tablet, sonst Mobile) und
  `decideProjectsLayout(projectCount, breakpoint)` → `{ mode, columns }`.
- `useFansubProjectsBreakpoint.ts`: Client-Hook, Start-State `'desktop'` (kein
  Hydration-Mismatch), misst `window.innerWidth` im `useEffect` und bei `resize`.
- `FansubPublicSections.module.css`: Spalten-Medienqueries aus `.mediaItemGrid` in eine neue
  `.tileColumnGrid`-Klasse ausgelagert; `.mediaItemGrid` nutzt jetzt `composes: tileColumnGrid`.
- `FansubProjectsSection.module.css`: neue `.projectTileGrid { composes: tileColumnGrid from
  './FansubPublicSections.module.css'; gap: 12px }`, ersetzt das entfernte `.bannerGrid`
  (keine verbleibende Nutzung mehr im Code).
- `FansubProjectsGrid.tsx`: wertet `decideProjectsLayout(items.length, breakpoint)` aus.
  `'grid'` → reines `.projectTileGrid`-Raster (ersetzt sowohl den alten
  Einzelprojekt-Sonderfall als auch deckt jetzt 2-3 Projekte Desktop / 2 Projekte Tablet ab).
  `'carousel-peek'` (Mobile, 2+) → unverändertes FocalCarousel ohne neue Props.
  `'scroll-strip'` (Überlauf Desktop/Tablet) → FocalCarousel mit
  `presentation="grid-scroll"` und `--grid-scroll-item-size` über `style`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Nicht-animierter Sprung ignorierte `align` fuer grid-scroll**
- **Found during:** Task 1 (beim Implementieren des `focusItem`-Nicht-Animations-Zweigs).
- **Issue:** Der ursprüngliche Code rief im Fallback (reduced motion, nicht-adjazenter Sprung,
  kein `requestAnimationFrame`) immer `positionOwnedItem(track, boundedIndex)` auf, was intern
  erneut `centeredScrollLeft` berechnet -- unabhängig vom bereits korrekt berechneten,
  align-bewussten `targetLeft`. Für `presentation="grid-scroll"` hätte das bedeutet: der
  sofortige (nicht-animierte) Sprung wäre weiterhin zentriert statt linksbündig.
- **Fix:** Fallback nutzt jetzt direkt das bereits berechnete `targetLeft` (`track.scrollTo?.(...)`
  mit Fallback auf direkte `scrollLeft`-Zuweisung) statt `positionOwnedItem` erneut aufzurufen.
  Numerisch identisch zum bisherigen Verhalten im Default-`'focal'`-Modus (gleiche Formel),
  behebt aber den Fehler für `grid-scroll`.
- **Files modified:** `frontend/src/components/ui/FocalCarousel.tsx`
- **Commit:** `c3fc1ad2e`

**2. [Rule 1 - Bug] Hook-Aufruf nach bedingtem Return (Rules of Hooks)**
- **Found during:** Task 2 (beim Verdrahten von `useFansubProjectsBreakpoint()` in
  `FansubProjectsGrid.tsx`).
- **Issue:** Die Plan-Beschreibung sah den Aufruf von `decideProjectsLayout` "NACH dem
  bestehenden `if (items.length === 0) return null`" vor. Ein Hook-Aufruf nach einem
  bedingten Return verstößt gegen die Rules of Hooks -- wechselt `items.length` zwischen
  Renders derselben Komponenteninstanz von 0 auf >0, würde sich die Hook-Aufrufreihenfolge
  ändern und React-internen Zustand korrumpieren.
- **Fix:** `useFansubProjectsBreakpoint()` wird jetzt vor dem `items.length === 0`-Check
  aufgerufen; `decideProjectsLayout` bleibt danach.
- **Files modified:** `frontend/src/components/fansubs/FansubProjectsGrid.tsx`
- **Commit:** `a3cfebe99`

**3. [Rule 2 - fehlende Korrektheit] Fehlender React-Key im neuen Raster-Pfad**
- **Found during:** Task 2 (Testlauf zeigte eine React-Warnung "Each child in a list should
  have a unique key prop").
- **Issue:** `items.map(renderProject)` im neuen `'grid'`-Zweig übergab keinen `key` an die
  gerenderten `FansubProjectBannerCard`-Elemente.
- **Fix:** `renderProject` nimmt jetzt einen optionalen `key`-Parameter entgegen; der
  `'grid'`-Zweig übergibt `item.project.id` als Key. Der FocalCarousel-Pfad bleibt
  unverändert (Keying läuft dort bereits über `getItemKey`).
- **Files modified:** `frontend/src/components/fansubs/FansubProjectsGrid.tsx`
- **Commit:** `a3cfebe99`

### Non-code deviations

**4. Playwright-Verifikation gegen direkte Linux-Adresse statt SSH-Tunnel**
- Der Auftrag verlangte Playwright-Verifikation gegen `http://127.0.0.1:3300` (SSH-Tunnel von
  Windows). Dieser Executor läuft jedoch bereits direkt auf `team4s-linux` -- Port 3300 ist
  auf diesem Host nicht gebunden (der Tunnel wird ausschließlich von der Windows-Seite
  aufgebaut und existiert nicht lokal auf der Linux-Maschine selbst; `curl` auf
  `127.0.0.1:3300` lieferte Exit-Code `000`/keine Verbindung).
- Stattdessen wurde die in CLAUDE.md explizit dokumentierte direkte Adresse
  `http://192.168.235.196:3000` verwendet (Frontend-Container-Host-Port, laut
  `docker compose ps` an `0.0.0.0:3000` gebunden). Funktional äquivalent für die
  automatisierte Sichtprüfung dieses Executors; für menschliches Browser-UAT über den
  Windows-Tunnel bleibt `127.0.0.1:3300` unverändert die korrekte Adresse.

## Playwright-Verifikation (9 Route/Breite-Kombinationen)

Browser: Chromium (Playwright 1.55.0, lokal in `frontend/node_modules` vorhanden).
Basis-URL: `http://192.168.235.196:3000` (siehe Deviation 4). Alle 9 Captures ohne
Konsole-Fehler. Screenshots liegen unter
`.planning/quick/261022-dwe-gruppenseite-projektkarten-in-medien-kac/screenshots/`
(nicht committed -- reine Verifikationsartefakte, siehe Dateinamen unten).

| Route | Breite | Beobachtung | Screenshot |
|---|---|---|---|
| `/fansubs/new-subs` (1 Projekt) | 1440 | `.projectTileGrid`, keine Karussell-Region, Kachelgröße, linksbündig | `_fansubs_new-subs_1440.png` |
| `/fansubs/new-subs` (1 Projekt) | 768 | identisch zu 1440 (Raster, keine Region) | `_fansubs_new-subs_768.png` |
| `/fansubs/new-subs` (1 Projekt) | 375 | identisch (Raster, keine Region, keine feste 320x180-Karte mehr) | `_fansubs_new-subs_375.png` |
| `/fansubs/strawhat-subs` (2 Projekte) | 1440 | `.projectTileGrid`, beide Karten nebeneinander, keine Region/Pfeile -- behebt den gemeldeten Bug (keine 718x404-Großkarte, kein Leerraum, keine abgeschnittene zweite Karte) | `_fansubs_strawhat-subs_1440.png` |
| `/fansubs/strawhat-subs` (2 Projekte) | 768 | Raster (2 Spalten Tablet, 2 Projekte passen), keine Region | `_fansubs_strawhat-subs_768.png` |
| `/fansubs/strawhat-subs` (2 Projekte) | 375 | **unverändertes** zentriertes Peek-Karussell (Region vorhanden, zweite Karte sichtbar angerissen) | `_fansubs_strawhat-subs_375.png` |
| `/fansubs/bloody-shadow` (3 Projekte, Grenzfall) | 1440 | Raster (3 == Desktop-Spaltenzahl), alle drei Karten nebeneinander, keine Region/Pfeile | `_fansubs_bloody-shadow_1440.png` |
| `/fansubs/bloody-shadow` (3 Projekte, Grenzfall) | 768 | **scroll-strip** (3 > 2 Tablet-Spalten): Karussell-Region mit Pfeilen erscheint, Karten linksbündig, keine sichtbare Abdunklung der dritten Karte | `_fansubs_bloody-shadow_768.png` |
| `/fansubs/bloody-shadow` (3 Projekte, Grenzfall) | 375 | unverändertes Peek-Karussell (Region vorhanden) | `_fansubs_bloody-shadow_375.png` |

Automatisierte Messung während derselben Playwright-Läufe (DOM-Abfrage auf Karussell-Region
und Grid-Klasse) bestätigt exakt dieselbe Einstufung wie die Sichtprüfung für alle 9
Kombinationen (`regionCount`/`gridClass` je Route/Breite protokolliert, siehe Tool-Ausgabe
dieser Session).

### `>3 Projekte`-Pfad: nur per Unit-Test verifiziert, nicht live

Per SQL-Abfrage gegen `team4sv30-db`/`team4s_v2` hat keine lokale Gruppe mehr als 3 Projekte
(Maximum: `bloody-shadow` mit 3):
```
          slug           | count
-------------------------+-------
 bloody-shadow           |     3
 generation-anime-xtreme |     2
 strawhat-subs           |     2
 ...                     |     1
```
Der `>3 Desktop`/`>2 Tablet`-Pfad (scroll-strip bei größeren Gruppen) ist daher mit
Playwright nicht gegen echte Daten nachstellbar. Das ist laut Plan explizit zulässig und
bereits über Unit-Tests abgedeckt:
- `fansubProjectsLayout.test.ts`: `decideProjectsLayout(4, 'desktop')` und
  `decideProjectsLayout(3, 'tablet')` → `'scroll-strip'`.
- `FocalCarousel.test.tsx`: `presentation="grid-scroll"`-Verhalten (keine Abdunklung,
  linksbündiger Sprung) ist unabhängig von der Projektanzahl getestet.

## Tests / Verifikation

- `npx vitest run src/components/ui/FocalCarousel.test.tsx` → 43/43 grün (40 bestehend + 3 neu).
- `npx vitest run src/components/fansubs/fansubProjectsLayout.test.ts
  src/components/fansubs/__tests__/FansubProjectsGrid.test.tsx
  src/components/fansubs/__tests__/FansubProjectsSection.test.tsx` → 28/28 grün
  (15 neue Layout-Tests + 7 Grid-Tests + 6 Section-Tests).
- Volle Suite (`npm run test`): 3694/3697 Tests grün, 3 todo, 1 Datei übersprungen (bestehend,
  nicht von diesem Plan betroffen). Zwei einzelne Durchläufe zeigten je einen Timeout in
  völlig unbeteiligten Dateien (`DiscoveryLibraryPanel.test.tsx`,
  `ReleaseVersionNotesTab.test.tsx`) -- beide liefen isoliert sofort grün und sind damit
  Last-Flakes des parallelen Gesamtlaufs, keine Regression dieses Plans. Ein dritter
  vollständiger Lauf war komplett grün (403/404 Dateien, 1 übersprungen).
- `npm run typecheck`: grün, keine Fehler.
- `wc -l` aller geänderten Produktionsdateien: alle ≤450 Zeilen (größte: 445
  `FocalCarouselInternals.tsx`, 420 `FocalCarousel.tsx`) -- kein Aufteilungs-Commit nötig.

## Commits

- `c3fc1ad2e` -- feat(quick-261022-dwe): FocalCarousel additiv um linksbündigen grid-scroll-Modus erweitern
- `a3cfebe99` -- feat(quick-261022-dwe): Projektkarten als Medien-Kachelraster statt Karussell bis zur Spaltenzahl

**Abweichung von der Plan-Vorgabe "ein Commit am Ende von Task 3":** Die Executor-Vorgaben
dieses Auftrags verlangen explizit atomare Commits pro Task direkt nach deren Verifikation
("Commit each task atomically"). Statt eines einzigen Sammel-Commits am Ende wurden daher
zwei thematisch geschlossene Commits erstellt (Task 1 nach grünem FocalCarousel-Test, Task 2
nach grünem Layout-/Grid-Test). Beide Commits sind frei von Co-Authored-By-Trailern und
wurden nicht gepusht. Task 3 selbst fügt keine neuen Produktionsdateien hinzu (reiner
Verifikationsschritt) und hat daher keinen eigenen Code-Commit.

## Known Stubs

Keine. Alle Datenpfade (Projektanzahl, Breakpoint, Kartendaten) sind vollständig verdrahtet;
keine Platzhalter-/Leerwerte wurden eingeführt.

## Threat Flags

Keine neue sicherheitsrelevante Oberfläche. Rein clientseitige Layout-Entscheidung auf
bereits öffentlichen Projektdaten (siehe Threat-Model im Plan: T-261022-dwe-01/02, beide
"accept", unverändert zutreffend).

## Self-Check: PASSED

Alle unten genannten Dateien und Commits wurden verifiziert (siehe Tool-Ausgabe dieser
Session): `fansubProjectsLayout.ts`, `fansubProjectsLayout.test.ts`,
`useFansubProjectsBreakpoint.ts` existieren; Commits `c3fc1ad2e` und `a3cfebe99` sind in
`git log` auffindbar; alle 9 Playwright-Screenshots liegen unter
`.planning/quick/261022-dwe-gruppenseite-projektkarten-in-medien-kac/screenshots/`.

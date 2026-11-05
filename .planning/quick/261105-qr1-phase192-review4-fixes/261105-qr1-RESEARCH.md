# Quick-Task 261105-qr1 — Unabhängige Verifikation von CONTEXT.md vor der Planung

**Researched:** 2026-11-05
**Scope:** Verifiziert jede technische Behauptung und jeden Lösungsschritt in
`261105-qr1-CONTEXT.md` gegen den tatsächlichen Dateistand. Kein neuer Lösungsentwurf — reine
Gegenprüfung vor `/gsd:plan-phase`.
**Gesamturteil:** Plan ist überwiegend korrekt und ungewöhnlich gründlich vorverifiziert (Guard-
Scan, fireEvent-Diffs, Zeilennummern — fast alles stimmt exakt). Es gibt aber **einen konkreten,
mittel-hohen Implementierungs-Fallstrick** (Cluster `growFirstChild` + `collapseBelow`
zweistufiges Rendering), den der Plan nicht adressiert, plus drei kleinere, niedrigrisikige
Lücken. Keiner davon ist ein Showstopper, aber der Planer sollte sie explizit als Teilschritte/
Hinweise in die Tasks aufnehmen.

---

## 1. Bestätigt korrekte Behauptungen (unabhängig verifiziert)

### 1.1 AnimeDetailHero.module.css / .tsx — Ist-Zustand (Befund 1)
Datei gelesen (150 Zeilen, aktueller Stand identisch zur CONTEXT.md-Beschreibung bis auf
vernachlässigbare Zeilenverschiebungen von ±1-2 Zeilen innerhalb der genannten Bereiche):
- `.posterWrapper` (36-40 + Mobil-Override 112-114): `width: var(...)` x3, `position:relative`,
  `overflow:visible` — bestätigt.
- `.posterMeta` (17-21): `flex:1` unconditional, Mobil-Override 116-119 (`align-items:center;
  flex:0`) — bestätigt.
- `.title` (48-50): `flex:1` — bestätigt. `.titleLogo` (52-57) — bestätigt.
- `.statsRow` (69-71) `align-items:center`, `.posterColumn` Mobil (108-110), `.genresSection`
  Mobil (125-127), `.infoCardBody` Mobil (129-131), `.badges,.tagsList,.statsRow` Mobil
  (133-137) — alle Zeilen bestätigt.
- "Nicht Teil des Befundes"-Liste (`.posterMetaCard` border-width:0, `.tagsList`
  padding/margin/list-style, `.relatedSection` min-width/overflow, Divider display:none/block,
  position:relative/z-index) — jede Zeile geprüft, Einstufung korrekt.

### 1.2 MediaFrame-Kaskade für `widthPurpose="posterHero"`
`MediaFrame.module.css:1-8` bestätigt: `.mediaFrame { width: 100%; ... }` ist die Basisregel.
Eine neue `.mediaFrameWidthPosterHero`-Klasse, **nach** dieser Basisregel im selben Stylesheet
deklariert, gewinnt bei gleicher Selektor-Spezifität (beide einfache Klassenselektoren, 0,1,0)
unabhängig von der Reihenfolge der Klassennamen in `classNames(...)` — reine
Deklarationsreihenfolge im CSS, nicht DOM-Klassenreihenfolge. Mechanismus korrekt.

### 1.3 CSS-Nesting (`& > :last-child { flex: 1; }`) — empirisch geprüft, nicht nur angenommen
Kein bestehendes `&`-Nesting irgendwo im Repo (`grep` über alle `*.module.css` ergab null
Treffer) — dies ist ein **neues Muster**, daher zusätzlich real getestet statt nur angenommen:

- **Bundler-Fakt:** `next dev`/`next build` nutzen in Next 16 standardmäßig **Turbopack**
  (verifiziert in `node_modules/next/dist/lib/bundler.js`: *"The default is turbopack when
  nothing is configured"*), welches CSS über `lightningcss` verarbeitet (natives CSS-Nesting +
  CSS-Modules-Scoping sind dort ein etabliertes, gemeinsam unterstütztes Feature-Paar).
- **Storybook nutzt jedoch explizit NICHT Turbopack**, sondern den **Webpack-Builder**
  (`@storybook/nextjs`, siehe `.storybook/main.ts`-Kommentar: *"Der `@storybook/nextjs`-Adapter
  nutzt den Webpack-Builder (nicht Vite)"*) — genau der Pfad, über den die geforderte
  Zero-Pixel-Diff-Prüfung (Playwright gegen Storybook-Varianten) läuft.
- Empirisch gegen Next.js' **tatsächliche** Webpack-CSS-Modules-Pipeline getestet (die exakten
  vendorisierten Pakete, die `next/dist/build/webpack/loaders/css-loader` nutzt:
  `postcss-modules-values`, `postcss-modules-local-by-default`,
  `postcss-modules-extract-imports`, `postcss-modules-scope`):
  ```
  Input:  .cardPublicPoster { display:flex; } .cardPublicPoster { & > :last-child { flex: 1; } }
  Output: .cardPublicPoster__HASH { display:flex; }
          .cardPublicPoster__HASH { & > :last-child { flex: 1; } }
          :export { cardPublicPoster: cardPublicPoster__HASH; }
  ```
  Die ICSS-Kette findet und hasht den äußeren Selektor korrekt, lässt die verschachtelte Regel
  strukturell unangetastet (keine Klassennamen darin, die gehasht werden müssten) — **kein
  Parse-Fehler, kein Mangling**.
- Zusätzlich gegen `next/dist/compiled/postcss-preset-env` (stage 3, `browsers: ['defaults']`,
  genau die Konfiguration aus `next/dist/build/webpack/config/blocks/css/plugins.js`) getestet:
  die Regel wird **unverändert durchgereicht** (kein Polyfill nötig, da native Browser-
  Unterstützung für CSS-Nesting seit 2023 in allen Evergreen-Browsern vorhanden ist, die
  `browserslist: 'defaults'` im Jahr 2026 ohnehin abdeckt).
- **Fazit:** Die vorgeschlagene Nesting-Syntax funktioniert technisch über beide real genutzten
  Pfade (Turbopack-Dev/Build UND Storybook-Webpack). Kein Blocker. Da es aber ein **neues,
  unpräzedentiertes Muster** im Repo ist, empfiehlt sich trotzdem die ohnehin geplante
  Zero-Pixel-Diff-Prüfung als zusätzliche Absicherung (siehe Abschnitt 3.3 für eine
  risikofreiere Alternative, falls das Team Nesting lieber vermeiden will).

### 1.4 Card.module.css — `.cardPublicPoster`/`.cardPublicHeroInfo`
Datei komplett gelesen (303 Zeilen). Zeilen 175-187 (`.cardPublicPoster` Basis), 196-213
(`.cardPublicHeroInfo` Basis), 258-270/279-288 (Mobil-Blöcke) — exakte Übereinstimmung mit den
CONTEXT.md-Zeilenangaben (~175/~258/~279).
- `Card.tsx` rendert **ein einziges** `<section>`-Element, das sowohl die Varianten-Klasse
  (`.cardPublicHeroInfo`) als auch die vom Aufrufer übergebene `className` (`.infoCard`)
  **gleichzeitig auf demselben DOM-Knoten** trägt (`classNames(...)`-Liste, Zeilen 171-190) —
  bestätigt, dass `text-align:center` von `.cardPublicHeroInfo` (statt von `.infoCardBody`,
  einen DOM-Level tiefer) exakt denselben Vererbungseffekt erzielt. Kein Zwischenelement setzt
  `text-align` zurück (`Heading.module.css`/`Text.module.css`/`Stack.module.css` enthalten kein
  `text-align`).
- `.cardPublicPoster`s Kinder nach der Migration: `[<MediaFrame>, <Stack className=posterMeta>]`
  — Stack bleibt strukturell garantiert das letzte Kind, `:last-child` trifft korrekt zu.

### 1.5 `page.performance.test.ts` — "--poster-image"-Reflexionstest
Verifiziert: `elements()` (Zeilen 46-64) traversiert generisch über `child.props.children`,
unabhängig vom Elementtyp (kein Sonderfall nur für `div`). Der `reflection`-Find (Zeile 116) sucht
generisch nach `element.props.style['--poster-image']` über **alle** gefundenen Elemente — das
Verschieben des Inline-Styles vom `<div className={posterWrapper}>` direkt auf `<MediaFrame>`
bricht diesen Test nicht, da `MediaFrame` selbst als React-Element in `all` landet, bevor
rekursiv in seine `children` abgestiegen wird.

### 1.6 AnimeTitleLogo / AnimeMediaProvider.tsx (Finding E)
- Nur **ein** echter Aufrufer (`AnimeDetailHero.tsx:68`), bestätigt per Repo-weitem Grep.
- `AnimeMediaProvider.test.tsx` enthält **keine** `className`/`titleLogo`-Assertions — Migration
  bricht keinen bestehenden Test.
- `classNames`-Utility (`@/components/ui/classNames`) wird bereits an mehreren Stellen
  **außerhalb** von `components/ui` importiert (`FansubVersionBrowser.tsx`,
  `MediaUploadCore.tsx`, `Breadcrumbs.tsx` u. a.) — der von Finding E implizierte Import in
  `AnimeMediaProvider.tsx` folgt etabliertem Muster, kein Sonderfall.

### 1.7 Guard-Schärfung — alle neun Dateien gegengeprüft
Jede der neun `GUARDED_COMPOSITE_FILES` per `grep -n -E "(width|height)\s*:"` (ohne
min-/max-Präfix) durchsucht:
- **Nur** `AnimeDetailHero.module.css` hat echte Deklarationen (Zeilen 38/44/54/113 — 54 ist
  `.titleLogo`s `width:auto`, entfällt durch Migration E; die übrigen drei entfallen durch
  Migration A).
- `EpisodeGlassCard.module.css`s Treffer (Zeilen 11-13) sitzen nachweislich **innerhalb eines
  `/* ... */`-Blockkommentars** (Datei gelesen, Zeilen 1-20) — der Guard-eigene
  `stripBlockComments()` neutralisiert sie korrekt, kein falscher Treffer möglich.
- Alle übrigen sieben Dateien: **keine** Treffer.
- Fazit: Die Behauptung "nach der Migration deklariert keine der neun Dateien mehr
  `width:`/`height:`" ist **vollständig verifiziert**, keine achte/neunte Datei würde durch die
  Verschärfung brechen.
- Der zu ändernde Selbsttest (Zeilen 422-430) wurde exakt an der zitierten Stelle gefunden,
  Umkehrung ist mechanisch korrekt (Entfernen der `var(...)`-Rückgabezeile aus
  `isSizeResetValue` macht den bisherigen Exempt-Fall zu einem echten Treffer).

### 1.8 FansubVersionBrowser.test.tsx — fireEvent-Diff (Finding 2, Teil 1)
`git diff 6a3e32769c17a59e19fc005b6a98c20201ac833b..HEAD -- frontend/src/components/fansubs/
FansubVersionBrowser.test.tsx` lokal ausgeführt:
- Bestätigt: **genau ein** neuer `describe`-Block (`'FansubVersionBrowser -- gemeinsamer
  Rhythmus-Stack...'`), **genau zwei** neue `fireEvent.click`-Aufrufe, an den im aktuellen
  Dateistand exakt **Zeile 224 und 237** (per `grep -n fireEvent.click` erneut bestätigt).
- **Testfall G** (Zeile 430, `render(stateBrowser(fansubs, 22, 'saved-secondary'))`) enthält
  zwar noch einen `fireEvent.click`, aber dieser Klick zielt auf den
  **Episoden-Ausklapp-Button** (`/Gruppenfolge/`), NICHT auf einen Gruppenwechsel-Button — die
  anschließende `assertGroup(9)`-Prüfung (aria-pressed + Gruppen-Kontext-Element) greift
  **bereits unmittelbar nach dem Render**, bevor dieser Klick überhaupt ausgeführt wird. Das
  bestätigt die CONTEXT.md-Kernbehauptung unabhängig: `initialActiveSlug` erzeugt bereits beim
  ersten Render denselben Gruppenzustand wie ein echter Klick.
- **Testfall D** (Zeilen 402-405, `render(stateBrowser())` + `assertAllSelected()`, **kein**
  Klick) bestätigt ebenfalls die zweite Kernbehauptung (2+ Gruppen ohne Parameter landen
  automatisch bei "Alle").
- `FansubVersionBrowser.tsx:147`s Logik `fansubOptions.length === 1 ? null : (initialActiveSlug
  ?? null)` wortwörtlich bestätigt.
- `fansubs[0]` = `{ id: 7, slug: 'saved-primary', name: 'Anderer Gruppenname' }` — Fix 1s
  Zuordnung (Slug ↔ Button-Name) ist korrekt.
- **Urteil:** Beide vorgeschlagenen Umschreibungen sind technisch korrekt und sauber begründet.

### 1.9 WatchlistAddButton.test.tsx — fireEvent-Diff (Finding 2, Teil 2)
`git diff` lokal ausgeführt: bestätigt, dass **jede** `fireEvent`-bezogene Diff-Zeile in dieser
Datei eine **Entfernung** ist (zwei Tests wurden komplett durch `renderHook`-Versionen ersetzt);
die fünf vom Review zitierten Zeilen (76, 79, 131, 158, 160) erscheinen in keinem Diff-Hunk —
bestätigt unverändertes Altmaterial.

Mechanismus-Prüfung (`WatchlistAddButton.tsx` + `useWatchlistAction.ts` gelesen):
- `WatchlistAddButton` setzt `key={JSON.stringify([animeID, accountIdentity, accountGeneration,
  hasAuthSession])}` auf die innere `WatchlistAction`-Komponente — ein echter
  React-Unmount/Remount-Mechanismus, kein reiner Prop-Rerender.
- `handleToggle`/`checkStatus` werden **nirgends** über Ref/Imperative-Handle nach außen gereicht
  — der einzige Zugriffsweg ist der gerenderte `<Button onClick={handleToggle}>`.
- `requestGeneration` (`useRef`) ist **pro Hook-Instanz** gekapselt; bei einem echten
  Key-Remount wird die komplette alte Fiber samt Closures verworfen, eine neue Instanz beginnt
  bei `requestGeneration.current = 0`.
- Die fünf betroffenen Testfälle (change-Kategorien `anime`/`account`/`logout`/`missing-meta`/
  `blocked-meta`) mischen bewusst **sowohl** echte Remounts (anime/logout/account ändern
  `owner`) **als auch** Nicht-Remount-Änderungen (missing-meta löst nur ein Window-Event aus,
  ohne `owner` zu ändern) — das deckt zwei verschiedene Isolations-Mechanismen gleichzeitig ab
  (Remount-bedingtes Verwerfen der alten Closure vs. instanzinterne
  `requestGeneration`-Sperre). Zwei unabhängige `renderHook()`-Aufrufe würden nur die
  **triviale** Isolation zweier komplett getrennter Hook-Instanzen beweisen, nicht die
  **tatsächliche** Garantie, dass `WatchlistAddButton`s eigene `key`-Berechnung bei genau diesen
  fünf Ereigniskategorien korrekt reagiert.
- **Eigenständiges Urteil:** Die CONTEXT.md-Begründung ist nicht nur plausibel, sondern bei
  genauerer Prüfung sogar **stärker** als dort dargestellt (die Testfälle decken zwei technisch
  unterschiedliche Isolationsmechanismen ab, nicht nur einen) — kein übersehener Weg gefunden,
  dies ohne echten DOM-Klick zu beweisen. Entscheidung, diese 5 Zeilen unverändert zu lassen, ist
  gut fundiert.

---

## 2. Korrekturen / Nachbesserungen vor Planung nötig

### 2.1 [MITTEL-HOCH] Cluster `growFirstChild` kollidiert mit Clusters zweistufigem Rendering

**Befund:** Der EINZIGE reale Aufrufsfall für `growFirstChild` (`titleRow`-Cluster in
`AnimeDetailHero.tsx:66`) setzt **gleichzeitig** `collapseBelow="md"`:
```tsx
<Cluster key="titleRow" collapseBelow="md" gap="contentPair" gapCollapsed="independentBlocks" justify="between">
```
`Cluster.tsx:128-189` zeigt: Ist `collapseBelow` (oder `float`) gesetzt, rendert Cluster
**zweistufig** — ein äußeres `Component`-Element trägt NUR `.clusterQueryContainer` (+ ggf.
`.floatControlBandRoot`), das eigentliche `display:flex`-Element ist ein **separates inneres
`<div>`** mit `classNames(styles.cluster, collapsibleMd && ..., floatControlBand && ...)`
(Zeilen 178-186). Es gibt **zwei unterschiedliche** `classNames(...)`-Aufrufstellen in der
Komponente (Zeile 153 für den Einzelstufen-Pfad, Zeile 163-171 für den äußeren
Zweistufen-Wrapper, Zeile 178-186 für das innere Flex-Element).

CONTEXT.md formuliert nur: *"`Cluster.tsx`: `growFirstChild && styles.clusterGrowFirstChild` in
die `classNames(...)`-Liste."* — ohne zu benennen, **welche** der drei Stellen gemeint ist. Da
`titleRow` über `collapseBelow="md"` IMMER den Zweistufen-Pfad nimmt, muss
`styles.clusterGrowFirstChild` zwingend in die **innere** `classNames(...)`-Liste (Zeile
178-186, das tatsächliche Flex-Element), NICHT in die äußere (Zeile 163-171, `.cluster`-lose
Container ohne `display:flex`). Würde ein Umsetzer die Klasse versehentlich auf das äußere
Element setzen, griffe der Selektor `.clusterGrowFirstChild > :first-child` dort auf das
**innere Wrapper-`<div>`** selbst (das einzige Kind des äußeren Elements) statt auf die
`<Heading>` — ein stiller, optisch schwer bemerkbarer Fehlschlag (kein Effekt, da das innere
Wrapper-`<div>` selbst kein Flex-Item eines Flex-Containers ist).

**Empfehlung für den Plan:** Task für Teil D explizit um den Hinweis ergänzen: *"Die neue Klasse
muss auf das innere Flex-Element (`classNames(styles.cluster, collapseBelow==='md' &&
styles.collapsibleMd, growFirstChild && styles.clusterGrowFirstChild, float==='controlBand' &&
styles.floatControlBand)`, Zeile ~178-186) gesetzt werden, NICHT auf den äußeren
`.clusterQueryContainer`-Wrapper (Zeile ~163-171)."* Zusätzlich: Im Einzelstufen-Pfad (Zeile
153) muss die Klasse ebenfalls ergänzt werden, falls ein künftiger Aufrufer `growFirstChild` ohne
`collapseBelow`/`float` nutzt — sonst funktioniert die Prop nur in Kombination mit den beiden
anderen Props, was nicht dokumentiert wäre.

Nebenbefund (geringeres Gewicht): Im gestapelten Mobil-Zustand von `collapsibleMd`
(`flex-direction: column` unterhalb 768px) bewirkt `flex: 1 1 0%` auf der Heading praktisch
nichts Sichtbares (Hauptachse ist dort die Höhe, kein begrenzender Container) — unschädlich,
aber als Spezifikationslücke erwähnenswert: der Effekt gilt faktisch nur oberhalb 768px.

### 2.2 [NIEDRIG-MITTEL] Präzedenz-Behauptung zu `Button.fullWidthBelowMd` ist technisch ungenau

CONTEXT.md schreibt für `Stack.alignBelowMd`: *"Analog zu `Button.fullWidthBelowMd` ...
Stack.tsx: setzt bei Angabe zusätzlich `--stack-align-below-md: <wert>` als Inline-Style"*.

Tatsächlicher Mechanismus von `Button.fullWidthBelowMd` (`Button.module.css:355-363`, verifiziert):
```css
.buttonFullWidthBelowMd { width: auto; }
@media (max-width: 767px) { .buttonFullWidthBelowMd { width: 100%; } }
```
Das ist eine **reine, hartcodierte Modifikator-Klasse** — **keine** CSS-Variable, kein
Inline-Style, kein Fallback-Mechanismus. Die vom Plan tatsächlich vorgeschlagene CSS (Inline-Var
+ `var(--x-below-md, var(--x, default))`-Kette) ist technisch einwandfrei und entspricht eher
Cards eigenem `--card-padding-override`/`--card-width-override`-Override-Hook-Muster bzw. Stacks/
Clusters eigenen bereits bestehenden `--stack-align`/`--cluster-justify`-Variablen — **nicht**
Button. Grund für den notwendigen Unterschied: `fullWidthBelowMd` ist ein reiner Boolean (zwei
feste Werte), `alignBelowMd`/`justifyBelowMd` tragen einen von 4 Werten — eine einzelne
Boolean-Modifikatorklasse kann das nicht abbilden, eine CSS-Variable schon.

**Einordnung:** Kein funktionaler Fehler (die vorgeschlagene CSS funktioniert), aber die
Architektur-Begründung zitiert das falsche Vorbild. Relevant, weil `docs/FRONTEND_ARCHITEKTUR.md`
laut Dokumentationspflicht denselben Vergleich übernehmen könnte — sollte dort NICHT als
"identisch zu `fullWidthBelowMd`" stehen, sondern korrekt als Fortführung des
Override-Hook-Musters (wie `--card-padding-override`).

### 2.3 [NIEDRIG] Story-Pflicht für `widthPurpose="posterHero"`/`alignBelowMd`/`justifyBelowMd` ist mit normalem Storybook-Setup nicht wie bei bisherigen Stories demonstrierbar

`.storybook/main.ts` lädt nur `@storybook/addon-themes`, `@storybook/addon-a11y`,
`@storybook/addon-docs` — **kein** `@storybook/addon-viewport`. Alle drei neuen Fähigkeiten
basieren laut CONTEXT.md bewusst auf echten `@media (max-width: ...)`-VIEWPORT-Abfragen (explizit
NICHT Container-Queries, siehe CONTEXT.md Begründung zu `alignBelowMd`). Anders als die
bestehenden MediaFrame-/Card-Stories (`compactPreview`, `posterFade` etc.), deren Varianten über
eine **Wrapper-`<div style={{width}}>`** demonstriert werden, wirkt eine solche
Wrapper-Breiten-Änderung **nicht** auf eine `@media`-Viewport-Abfrage — nur eine tatsächliche
Änderung der Fenster-/Iframe-Breite tut das.

Das bestehende Präzedenzbeispiel `Button.stories.tsx`s `VolleBreiteUnterhalbMd`-Story (Zeilen
244-261) hat exakt dieses Problem bereits unbemerkt: Die Story-Beschreibung behauptet, man könne
durch Ziehen am `resize:horizontal`-Rahmen "live" den Haltepunktwechsel sehen — das stimmt
technisch nicht (`resize` auf einem inneren `<div>` ändert niemals `window.innerWidth`, von dem
`@media (max-width:...)` abhängt). Die neuen Stories sollten dieses (bereits bestehende,
irreführende) Muster NICHT unreflektiert kopieren. Empfehlung für den Planer: entweder (a) die
Story-Beschreibung ehrlich auf "echtes Browserfenster/Storybook-Vorschau unter 767px/1023px
verkleinern, um den Effekt zu sehen" umformulieren, oder (b) falls eine echte Seite-an-Seite-
Demo gewünscht ist, über ein `<iframe>` mit fest gesetzter Breite lösen (ein Iframe hat seinen
eigenen, unabhängigen Viewport). Kein Blocker für die Kernfunktion, nur für die
Dokumentationsqualität der neuen Stories relevant.

### 2.4 [NIEDRIG] "redundant" ist für `.posterWrapper`s `position:relative;overflow:visible` nicht abschließend durch stilles Lesen beweisbar

CONTEXT.md stuft `position:relative`/`overflow:visible` auf `.posterWrapper` als "redundant" ein
(ersatzlose Entfernung). Geprüft: `MediaFrame.module.css:2` (`.mediaFrame { position: relative;
... }`) stellt sicher, dass `cornerBadge`/`bottomBadge` (absolut positioniert relativ zu
`.mediaFrame` selbst) unverändert korrekt positioniert bleiben — dieser Teil der
"redundant"-Einstufung ist bestätigt sicher.

Für `overflow:visible` bleibt eine Restunsicherheit: `.mediaFramePosterFade::before`
(`MediaFrame.module.css:36-49`) erzeugt einen Farbverlängerungs-Bleed-Effekt über ein `inset`
mit potenziell negativen Werten, der über die eigenen Grenzen von `.mediaFrame` hinausreichen
kann. Card selbst (`.cardPublicPoster`, Zeile 180) deklariert **`overflow: hidden`** auf der
umschließenden Karte. Ob der Bleed-Effekt nach Entfernen von `.posterWrapper`s
`overflow:visible` (das bisher zwischen `MediaFrame` und `Card` saß) exakt gleich aussieht,
hängt von den genauen Breiten-/Überlappungsverhältnissen an allen drei Haltepunkten ab — das
lässt sich aus dem CSS allein nicht abschließend beweisen (keine Browser-Rendering-Instanz
verfügbar). Keine neue Prüfung nötig, aber die ohnehin geplante Zero-Pixel-Diff-Pflicht sollte
**explizit den Poster-Rand/Bleed-Bereich** einschließen (nicht nur einen zentrierten Ausschnitt),
da genau dieser Effekt leicht aus einem zu eng zugeschnittenen Screenshot herausfallen könnte.

---

## 3. Bestätigt: keine Gotchas gefunden (gezielt negativ geprüft)

- **`catalogTaxonomy.test.ts`:** rein importbasierte Struktur-Prüfung (kein hartcodierter
  Story-Count, keine Story-Pfad-Enumeration außerhalb von Titel-Präfix-Checks). Neue
  `export const X: Story = {...}`-Einträge **innerhalb** bestehender
  `MediaFrame.stories.tsx`/`Stack.stories.tsx`/`Cluster.stories.tsx` lösen **keinen** neuen
  Import eines weiteren, selbst katalogisierten Grundbausteins aus — kein Guard-Konflikt zu
  erwarten.
- **ESLint `no-restricted-syntax`/`components/ui`-natives-Element-Verbot:** keine der
  vorgeschlagenen Änderungen führt neue native `<select>/<input>/<textarea>/<button>` ein — alle
  Änderungen sind reine `className`-/Prop-Erweiterungen bestehender Komponenten.
- **`docs/FRONTEND_ARCHITEKTUR.md`:** keine widersprüchliche Architektur-Aussage gefunden, die
  dem Plan entgegensteht (Abschnitt zu `Button.fullWidthBelowMd`/`Card.widthPurpose` existiert
  bereits und dient als Fundstelle für die Dokumentationspflicht — siehe 2.2 für die einzige
  inhaltliche Unschärfe).

---

## 4. Zusammenfassung für den Planer

| # | Befund | Schwere | Handlungsbedarf |
|---|--------|---------|------------------|
| 2.1 | `growFirstChild` braucht explizite Anweisung, WELCHES der zwei/drei `classNames(...)`-Ziele in `Cluster.tsx` es treffen muss (inneres Flex-Element bei `collapseBelow`/`float`, nicht der äußere Wrapper) | Mittel-Hoch | Plan-Task für Teil D um Datei:Zeile-genaue Anweisung ergänzen |
| 2.2 | Präzedenz-Zitat "analog zu `Button.fullWidthBelowMd`" ist technisch falsch (richtiges Vorbild: Cards `--card-*-override`-Muster) | Niedrig-Mittel | Doku-Formulierung korrigieren, Code-Mechanismus bleibt wie geplant |
| 2.3 | Neue Stories für viewport-media-query-basierte Props können nicht per Wrapper-Div seitlich demonstriert werden; bestehendes Button-Vorbild hat denselben (unbemerkten) Schönheitsfehler | Niedrig | Story-Beschreibungstext anpassen, nicht blind kopieren |
| 2.4 | "redundant"-Einstufung von `overflow:visible` nicht abschließend statisch beweisbar | Niedrig | Zero-Pixel-Diff-Scope explizit auf Poster-Bleed-Rand ausweiten |

Alle vier Punkte sind Ergänzungen/Präzisierungen, keine Widerlegungen der Grundlösung. Der Rest
von CONTEXT.md (Guard-Schärfung, beide fireEvent-Befunde, Card/MediaFrame-Kaskaden-Mechanik,
CSS-Nesting-Machbarkeit) ist unabhängig verifiziert und kann 1:1 in Tasks übersetzt werden.

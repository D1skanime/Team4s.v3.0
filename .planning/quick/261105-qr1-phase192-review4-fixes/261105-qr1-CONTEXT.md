---
task: 261105-qr1
title: Phase-192-Review Befunde 4 (unabhängiger Review, Runde 1 von 1)
type: quick
mode: default
---

# Scope-Korrektur (bindende menschliche Anweisung, nachträglich, vor Ausführung)

Dieser Auftrag wurde ursprünglich im `--full`-Modus recherchiert (siehe den vollständigen
Lösungsentwurf unten sowie `261105-qr1-RESEARCH.md`). Der Mensch hat danach, VOR jeder Ausführung,
folgende verbindliche Einschränkung nachgereicht (deckt sich mit der bereits bestehenden,
projektweiten REIHENFOLGE-Regel "erst funktioniert es, dann Tests"):

- **Vor der Live-Abnahme:** keine neuen Tests, keine Wächter-/Guard-Tests, keine Pixelvergleiche,
  keine Testsuiten starten.
- **Nur Produktcode-Befunde beheben.** Angefangene Test-/Wächterarbeit NICHT weiterführen
  (bereits Committetes aus einer früheren Runde bleibt unangetastet, aber in DIESEM Durchgang wird
  nichts Neues an Tests/Guards ergänzt).

**Daraus folgt für den unten stehenden Plan:**
- Teile A-E (MediaFrame/Card/Stack/Cluster/AnimeTitleLogo-Grundbaustein-Ergänzungen +
  AnimeDetailHero-Migration) sind reiner Produktcode -- werden wie geplant umgesetzt.
- Die "Guard-Schärfung" (Entfernen der `var(...)`-Ausnahme in
  `compositeLayoutPurity.guard.test.ts`) ist Wächter-Arbeit -- **in dieser Runde NICHT
  umgesetzt**, bewusst zurückgestellt auf nach der Live-Abnahme. Der Guard bleibt unverändert (seine
  bestehende Ausnahme lässt die neue, jetzt saubere Grundbaustein-basierte Lösung weiterhin
  durch -- kein Regressionsrisiko, nur eine noch nicht geschärfte Erkennungsregel).
- Die Story-Pflicht ("Stories ziehen mit") wird in dieser Runde **zurückgestellt** (Stories lösen
  bei Berührung potenziell den Storybook-Test-Runner aus und sind dokumentations-/katalognah genug
  am "Wächter"-Charakter, um unter dieselbe Zurückhaltung zu fallen) -- als bekannte Einschränkung
  in SUMMARY.md vermerkt, nachzuholen nach der Freigabe.
- Der verlangte Zero-Pixel-Diff-Nachweis (Playwright) entfällt ersatzlos für diese Runde
  ("keine Pixelvergleiche"). Ersatz: Sichtprüfung im echten Browser durch den Agenten selbst
  (Dev-Stack starten, Anime-Detailseite ansehen und bedienen) plus `tsc --noEmit`/Build grün --
  das ist laut Projektregel der verbindliche Nachweis vor der Abnahme.
- **Befund 2 (fireEvent in FansubVersionBrowser.test.tsx/WatchlistAddButton.test.tsx) entfällt
  komplett für diese Runde** -- reine Testdatei-Arbeit, keine Produktcode-Änderung. Wird nach der
  Freigabe nachgeholt. Die unten dokumentierte technische Analyse (welche Zeilen echte Neuzugänge
  sind, welcher Fix funktioniert, welche WatchlistAddButton-Zeilen aus welchem Grund bewusst
  unverändert bleiben sollen) bleibt als Entscheidungsgrundlage für DANN gültig, wird aber in
  diesem Durchgang nicht umgesetzt.

---

# Kontext und verbindliche Entscheidungen

Dieser Quick-Task behebt zwei [high]-Befunde eines unabhängigen Reviews (Codex) gegen Phase 192
(öffentliche Anime-Detailseite, Grundbaustein-Reinheit). Dies ist die vierte Review-Nachbesserungs-
Runde für diese Phase (nach den drei bereits in `261105-ds2-phase192-review3-fixes` behobenen
Befunden). Bestehende Hauptphase/Context/Waves bleiben unverändert; dies ist eine gezielte
Korrektur, keine Neuplanung der Phase.

Autonome Entscheidung (kein Mensch online während der Ausführung): alle technischen Details unten
sind bereits recherchiert und entschieden. Es gibt keine offene Grundsatzfrage, die eine
Rückfrage rechtfertigt.

## Befund 1 (AnimeDetailHero.module.css -- eigenes Layout-CSS)

**Zitat:** `width` in Zeilen 38, 44, 113 plus Flex-/Ausrichtungsregeln; der Guard lässt dies nur
über die Ausnahme für `width: var(...)` passieren. Posterbreite und responsive Ausrichtung müssen
als benannte Varianten von MediaFrame/Card/Stack/Cluster abgebildet werden; der Guard muss ohne
diese Umgehung geschärft werden.

### Verifizierter Ist-Zustand

Datei gelesen (`frontend/src/app/anime/[id]/AnimeDetailHero.module.css`, 150 Zeilen). Folgende
Deklarationen sind "eigenes Layout-CSS", das in Grundbausteine gehört:

1. `.posterWrapper` (Zeilen 36-46): `width: var(--media-frame-poster-width)` (Standard),
   `var(--media-frame-poster-width-medium)` (<1024px) -- umhüllt `<MediaFrame>` in
   `AnimeDetailHero.tsx:168-179`, trägt zusätzlich einen inert gewordenen `style`-Hook
   (`--poster-image`, siehe unten) sowie `position:relative;overflow:visible` (beide redundant,
   siehe unten).
2. `.posterWrapper` Mobil-Override (Zeile 112-114): `width: var(--media-frame-poster-width-compact)`.
3. `.posterMeta` (Zeile 17-21): `flex: 1` (unconditional) -- lässt den Stack (Watchlist-Button +
   Divider + Genres) die nach dem Poster-Bild verbleibende Höhe der Spalte füllen.
4. `.posterMeta` Mobil-Override (Zeile 116-119): `align-items:center; flex: 0`.
5. `.posterColumn` Mobil-Override (Zeile 108-110): `align-items: center`.
6. `.title` (Zeile 48-50): `flex: 1` -- lässt die Heading (Titel) den nach dem Logo verbleibenden
   Platz in der `justify="between"`-Cluster-Zeile füllen (wichtig für lange Anime-Titel: ohne
   `flex:1` würde die GESAMTE Cluster-Zeile umbrechen statt NUR der Titeltext intern umzubrechen).
7. `.titleLogo` (Zeile 52-57): `flex-shrink: 0; width: auto; max-height: var(...); object-fit: contain`
   -- `flex-shrink:0`/`width:auto` sind Flex-Kind-Eigenschaften (Layout), `max-height`/`object-fit`
   sind vom Guard ohnehin nicht erfasste, legitime Bildanzeige-Eigenschaften (kein `width`/`height`
   im Guard-Sinn, keine Fläche/Rahmen/Rundung).
8. `.statsRow` (Zeile 69-71): `align-items: center` (unconditional).
9. `.genresSection` Mobil-Override (Zeile 125-127): `align-items: center`.
10. `.infoCardBody` Mobil-Override (Zeile 129-131): `text-align: center`.
11. `.badges, .tagsList, .statsRow` Mobil-Override (Zeile 133-137): `justify-content: center`.

NICHT Teil dieses Befundes (geprüft, legitim, Guard erfasst sie korrekt nicht als Verstoß):
`.posterMetaCard`s `border-width:0` (dokumentierte Größenkorrektur, keine Layout-Entscheidung),
`.tagsList`s `padding:0;margin:0;list-style:none` (reiner `<ul>`-Reset, All-Zero-Ausnahme),
`.relatedSection`s `min-width:0;overflow:hidden` (min-width/overflow sind nicht im
FORBIDDEN_PATTERNS-Satz), `.dividerMobile`/`.dividerDesktop`/`.posterDivider`s `display:none|block`
(Sichtbarkeits-Umschaltung, kein `display:flex|grid`, von Divider.tsx's eigener Doku ausdrücklich
als lokale className-Nutzung erlaubt), `.posterColumn`/`.posterMeta`s `position:relative`/`z-index`
(nicht im FORBIDDEN_PATTERNS-Satz, reine Stapel-Reihenfolge für ein internes Overlay-Detail, kein
Guard-Fund).

**Toter Code entdeckt (Nebenfund, wird im selben Zug bereinigt):** `.posterWrapper`s Inline-Style
`--poster-image: url("${coverUrl}")` (`AnimeDetailHero.tsx:168`) wird von KEINER CSS-Regel gelesen
(repo-weiter Grep bestätigt: nur `page.performance.test.ts` liest diesen Wert zurück, als generische
"Reflections"-Prüfung, dass derselbe Cover-URL über mehrere Elemente hinweg konsistent verteilt
wird -- der Test prüft NUR, dass IRGENDEIN Element mit `style['--poster-image']` existiert, nicht
WELCHES). Diese Variable bleibt erhalten (wird auf das neue `<MediaFrame>`-Element verschoben,
siehe unten) -- Entfernen würde den bestehenden Test `page.performance.test.ts`s
"shares the generated display source across poster, hero, reflection and mounted rotator"-Fall
brechen, und ist ohnehin außerhalb des Befund-Umfangs (kein Layout-CSS, keine Guard-Kategorie).

### Entschiedene Lösung

**A. MediaFrame -- neue Breiten-Zweck-Prop für die Posterspalte:**

Neuer Typ `MediaFrameWidthPurpose = 'posterHero'` (ein Mitglied, analog zu Cards
`CardWidthPurpose = 'compactPreview'`), neue Prop `widthPurpose?: MediaFrameWidthPurpose` auf
`MediaFrameProps`. Anders als Cards Mechanismus (ein einzelner `var()`-Wert per Inline-Style, da
`compactPreview` KEINE Haltepunkt-Varianz braucht) braucht die Posterbreite drei
haltepunktabhängige Werte -- deshalb über eine CSS-Modifikatorklasse gelöst (identisches Muster wie
`SplitLayout.tsx`s `firstColumnWidth="poster"` -> `.columnPoster`), NICHT über einen Inline-Style
(CSS Custom Properties können keine `@media`-bedingte Werte rein über Inline-Style ausdrücken).

`MediaFrame.module.css`, neue Klasse (nach `.mediaFrame`s Basisregel, damit sie deren
`width: 100%` per Deklarationsreihenfolge bei gleicher Spezifität überschreibt):
```css
.mediaFrameWidthPosterHero {
  width: var(--media-frame-poster-width);
}
@media (max-width: 1023px) {
  .mediaFrameWidthPosterHero {
    width: var(--media-frame-poster-width-medium);
  }
}
@media (max-width: 767px) {
  .mediaFrameWidthPosterHero {
    width: var(--media-frame-poster-width-compact);
  }
}
```
`MediaFrame.tsx`: `widthPurpose === 'posterHero' && styles.mediaFrameWidthPosterHero` in die
bestehende `classNames(...)`-Liste aufnehmen. Ohne Angabe bleibt jeder bestehende Aufrufer
Zero-Pixel-Diff (keine neue Klasse gesetzt).

`AnimeDetailHero.tsx`: der `<div className={styles.posterWrapper} style={{'--poster-image':...}}>`
-Wrapper entfällt komplett. `widthPurpose="posterHero"` und
`style={{'--poster-image': \`url("${coverUrl}")\`} as CSSProperties}` wandern direkt auf das
`<MediaFrame>`-Element (MediaFrame akzeptiert bereits beliebige `style`-Merges über sein eigenes
`...style`-Spread, siehe `MediaFrame.tsx:59`). `page.performance.test.ts`s "reflection"-Suche bleibt
unverändert grün, da sie nur irgendein Element mit dieser Style-Property findet, nicht spezifisch
den Wrapper-`<div>`.

`AnimeDetailHero.module.css`: `.posterWrapper`-Regel (Zeile 36-46) UND ihr Mobil-Override
(Zeile 112-114) werden vollständig entfernt.

Story-Pflicht ("Stories ziehen mit"): `MediaFrame.stories.tsx` bekommt eine neue
`widthPurpose="posterHero"`-Story. **Korrektur nach Research:** `.storybook/main.ts` lädt KEIN
`@storybook/addon-viewport`; die neue Fähigkeit beruht (anders als Cards `compactPreview`, die rein
über eine Wrapper-`<div style={{width}}>` demonstrierbar ist) auf echten `@media`-VIEWPORT-Abfragen
-- eine Wrapper-Breitenänderung wirkt NICHT auf `@media (max-width:...)`. Die Story-Beschreibung
muss deshalb ehrlich auf "Storybook-Vorschaufenster unter 1023px/767px verkleinern, um den
Haltepunktwechsel zu sehen" hinweisen, statt (wie das bestehende, selbst leicht irreführende
Vorbild `Button.stories.tsx`s `VolleBreiteUnterhalbMd`) einen inneren `resize:horizontal`-Rahmen
als funktionierenden Live-Nachweis zu suggerieren (ändert `window.innerWidth` nicht). Gleiches gilt
für `Stack.stories.tsx`s `alignBelowMd`- und `Cluster.stories.tsx`s `justifyBelowMd`-Story.

**B. Card.module.css -- responsive Details der Einzel-Aufrufstellen-Varianten vervollständigen:**

`.cardPublicPoster` und `.cardPublicHeroInfo` sind JEWEILS nur an GENAU EINER Aufrufstelle
verwendet (grep-bestätigt: ausschließlich `AnimeDetailHero.tsx`). Card.module.css trägt für beide
Varianten BEREITS variantenspezifische, responsive Mobil-Werte direkt in der eigenen Datei
(dokumentiertes, etabliertes Muster, siehe die bestehenden Kommentare zu `.cardPublicPoster`s und
`.cardPublicHeroInfo`s Mobil-Padding-Werten in Card.module.css Zeilen 257-267/279-288). Die hier
fehlenden responsiven Details werden nach demselben Muster ergänzt, OHNE neue Props:

- `.cardPublicPoster`, Basisregel (Card.module.css ~Zeile 175): neue Zeile
  `& > :last-child { flex: 1; }` -- absorbiert `.posterMeta`s unconditional `flex:1` (der
  Stack ist strukturell IMMER das letzte Kind der Card, siehe `AnimeDetailHero.tsx:167-202`; die
  Selektor-Regel bleibt rein strukturell, referenziert NIEMALS eine komposit-spezifische
  Klasse wie `.posterMeta`, bleibt also ein generischer Bestandteil von Cards eigenem Stylesheet).
- `.cardPublicPoster`, Mobil-Block (Card.module.css ~Zeile 258): zwei neue Zeilen
  `align-items: center;` (absorbiert `.posterColumn`s Mobil-`align-items:center`) UND
  `& > :last-child { flex: 0; }` (absorbiert `.posterMeta`s Mobil-`flex:0`).
- `.cardPublicHeroInfo`, Mobil-Block (Card.module.css ~Zeile 279): neue Zeile
  `text-align: center;` -- `text-align` vererbt sich an ALLE Textnachfahren (Heading/Text/
  Stack-Kinder), absorbiert damit `.infoCardBody`s Mobil-`text-align:center` VOLLSTÄNDIG, ohne
  dass die Info-Karten-Stack selbst irgendetwas dafür braucht.

`AnimeDetailHero.module.css`: `.posterColumn`s Mobil-Block-Eintrag (Teil von Zeile 108-110),
`.posterMeta`s `flex:1`/Mobil-`flex:0` (Teile von Zeile 17-21/116-119) und `.infoCardBody`s
kompletter Mobil-Eintrag (Zeile 129-131) entfallen. `className={styles.infoCardBody}` bleibt auf
dem JSX-Element (reiner, jetzt stylingloser Hook, falls ein Test danach sucht -- prüfen,
vor Entfernen der className selbst).

**C. Stack -- neue `alignBelowMd`-Prop (responsive Ausrichtung, Haltepunkt 767px):**

**Korrektur nach Research:** NICHT "analog zu `Button.fullWidthBelowMd`" (dessen Mechanismus ist
eine reine, hartcodierte Boolean-Modifikatorklasse ohne CSS-Variable -- passt nur für einen
Zwei-Zustands-Boolean, nicht für einen 4-Werte-Enum). Das richtige, bereits etablierte Vorbild ist
Cards eigener Override-Hook (`--card-padding-override`/`--card-width-override`): eine CSS-Variable
mit Fallback-Kette, die nur bei Angabe gesetzt wird. `Stack` bekommt
`alignBelowMd?: 'start' | 'center' | 'end' | 'stretch'`, wirkt NUR unterhalb 767px (derselbe
Haltepunkt wie alle übrigen `@media(max-width:767px)`-Stellen in `AnimeDetailHero.module.css` --
NICHT Clusters 768px-Container-Query-Konvention, da dies eine reine Viewport-Media-Abfrage ist,
kein Container).

`Stack.tsx`: setzt bei Angabe zusätzlich `--stack-align-below-md: <wert>` als Inline-Style
(wie `--stack-gap`/`--stack-align`). Ohne Angabe wird die Variable nicht gesetzt (Zero-Pixel-Diff).

`Stack.module.css`: neue Regel
```css
@media (max-width: 767px) {
  .stack {
    align-items: var(--stack-align-below-md, var(--stack-align, stretch));
  }
}
```
(Fallback-Kette: erst der neue Mobil-Override, dann der normale `--stack-align`-Wert, dann der
harte Default -- identisch zum bestehenden Fallback-Stil dieser Datei.)

Aufrufstellen in `AnimeDetailHero.tsx`: `<Stack gap="independentBlocks" className={styles.posterMeta} alignBelowMd="center">`
und `<Stack gap="relatedContent" className={styles.genresSection} alignBelowMd="center">`.
`AnimeDetailHero.module.css`: `.posterMeta`s/`.genresSection`s Mobil-`align-items:center`-Zeilen
entfallen (ersetzt durch die Prop).

Story-Pflicht: `Stack.stories.tsx` bekommt eine `alignBelowMd`-Story (zwei Breiten-Varianten).

**D. Cluster -- zwei neue Props (`justifyBelowMd`, `growFirstChild`):**

`justifyBelowMd?: ClusterJustify` (identisches Muster wie Stacks `alignBelowMd` -- CSS-Variable mit
Fallback-Kette nach Cards Override-Hook-Vorbild, siehe Korrektur oben -- Haltepunkt 767px):
`Cluster.tsx` setzt bei Angabe `--cluster-justify-below-md: <JUSTIFY_KEYWORDS-Wert>`;
`Cluster.module.css`s Basisregel (`.cluster`) bekommt
```css
@media (max-width: 767px) {
  .cluster {
    justify-content: var(--cluster-justify-below-md, var(--cluster-justify, flex-start));
  }
}
```
Aufrufstellen: `.badges`-Cluster, `.tagsList`-Cluster (beide `justifyBelowMd="center"`); die
`.statsRow`-Cluster bekommt zusätzlich das bereits bestehende `align="center"` (unconditional,
KEINE neue Capability nötig) PLUS `justifyBelowMd="center"`.
`AnimeDetailHero.module.css`: `.statsRow`s `align-items:center` UND der gesamte
`.badges,.tagsList,.statsRow{justify-content:center}`-Mobil-Block entfallen.

`growFirstChild?: boolean` (einziger neuer Boolean, analog zu `bleedBelowMd`/`seamless`-Mustern):
löst GENAU den einen realen Aufrufsfall (`titleRow`-Cluster: Heading soll wachsen, Logo nicht
schrumpfen). Cluster.module.css, neue Klasse:
```css
.clusterGrowFirstChild > :first-child {
  flex: 1 1 0%;
  min-width: 0;
}
```
(`min-width:0` ist notwendig, damit der wachsende Textinhalt bei Bedarf intern umbrechen/schrumpfen
kann, statt an seinem `min-content` überzulaufen -- Standard-Flexbox-Idiom für wachsende
Text-Container, KEINE neue Eigenkategorie, die der Guard sonst flaggen würde, da `min-width:0` als
Grenze, nicht als feste Größe gilt und ohnehin außerhalb des `width-height`-Patterns liegt, das nur
`width`/`height` ohne `min-`/`max-`-Präfix erfasst.)

**Wichtig (durch Research bestätigter Fallstrick):** `Cluster.tsx` rendert bei gesetztem
`collapseBelow`/`float` ZWEISTUFIG -- ein äußeres Element trägt NUR `.clusterQueryContainer`
(+ ggf. `.floatControlBandRoot`, Zeilen ~163-171), das eigentliche `display:flex`-Element ist ein
SEPARATES inneres `<div>` mit eigener `classNames(...)`-Liste (Zeilen ~178-186). Da `titleRow`
(der einzige reale Aufrufsfall) `collapseBelow="md"` setzt, nimmt er IMMER den Zweistufen-Pfad.
`styles.clusterGrowFirstChild` MUSS deshalb in die INNERE `classNames(...)`-Liste (Zeile ~178-186,
das tatsächliche Flex-Element: `classNames(styles.cluster, collapseBelow === 'md' &&
styles.collapsibleMd, growFirstChild && styles.clusterGrowFirstChild, float === 'controlBand' &&
styles.floatControlBand)`), NICHT in die äußere (Zeile ~163-171) -- dort träfe der Selektor
`.clusterGrowFirstChild > :first-child` auf das innere Wrapper-`<div>` selbst (das einzige Kind des
äußeren Elements), ein stiller, optisch kaum bemerkbarer No-Op (das Wrapper-`<div>` ist kein
Flex-Item eines Flex-Containers). ZUSÄTZLICH muss die Klasse auch im Einzelstufen-Pfad (Zeile
~153, `classNames(styles.cluster, className)`) ergänzt werden, damit `growFirstChild` auch ohne
`collapseBelow`/`float` funktioniert (keine stillschweigende Kopplung an die beiden anderen Props).
Nebeneffekt, dokumentieren statt beheben: im gestapelten Mobil-Zustand (`collapsibleMd`s
`flex-direction:column` unterhalb 768px) hat `flex:1 1 0%` auf der Heading faktisch keine sichtbare
Wirkung (Hauptachse ist dort die Höhe, kein begrenzender Container) -- unschädlich, aber die
Fähigkeit wirkt faktisch nur oberhalb 768px, im JSDoc-Kommentar der Prop festhalten.

`Cluster.tsx`: `growFirstChild && styles.clusterGrowFirstChild` in ALLE DREI `classNames(...)`-
Aufrufstellen (Einzelstufen-Pfad Zeile ~153, inneres Flex-Element des Zweistufen-Pfads Zeile
~178-186 -- NICHT die äußere Zweistufen-Hülle Zeile ~163-171).
Aufrufstelle: `<Cluster key="titleRow" ... growFirstChild>`.
`AnimeDetailHero.module.css`: `.title{flex:1}` (Zeile 48-50) entfällt (Heading behält ihre
`className={styles.title}` NICHT mehr -- `className`-Prop auf der Heading komplett entfernen, da
nach dieser Migration keine CSS-Regel mehr für `.title` existiert; prüfen, ob ein Test danach
sucht, bevor die className entfernt wird).

Story-Pflicht: `Cluster.stories.tsx` bekommt je eine `justifyBelowMd`- und eine
`growFirstChild`-Story.

**E. AnimeTitleLogo -- eigenes, co-lokiertes Stylesheet statt komposit-lokaler className:**

`AnimeTitleLogo` (`components/anime/AnimeMediaProvider.tsx:145-161`) ist KEIN Grundbaustein
(liegt unter `components/anime/`, domänenspezifisch), aber eine eigenständige, wiederverwendbare
Komponente -- ihre intrinsische Darstellung (`flex-shrink:0; width:auto; max-height:...;
object-fit:contain`) gehört analog zu MediaFrame/ResponsiveImage in ihr EIGENES Stylesheet, nicht
in die `className` des Aufrufers. Neue Datei `AnimeMediaProvider.module.css` mit:
```css
.titleLogo {
  flex-shrink: 0;
  width: auto;
  max-height: var(--media-logo-max-height);
  object-fit: contain;
}
```
`AnimeMediaProvider.tsx`: `AnimeTitleLogo` importiert dieses Modul, kombiniert
`classNames(styles.titleLogo, className)` (className bleibt als optionaler Zusatz-Hook erhalten,
für den Fall dass ein Aufrufer zusätzliche Darstellung braucht -- Zero-Pixel-Diff für den
bestehenden Aufrufer, der jetzt NUR noch className weglässt). `AnimeDetailHero.tsx`: die
`className={styles.titleLogo}`-Prop auf `<AnimeTitleLogo>` entfällt (die Komponente bringt ihre
Darstellung jetzt selbst mit). `AnimeDetailHero.module.css`: `.titleLogo`-Regel (Zeile 52-57)
entfällt.

`AnimeMediaProvider.module.css` ist NICHT Teil von `GUARDED_COMPOSITE_FILES` (keiner der fünf
Pilot-Komposite) und braucht dort nicht ergänzt zu werden -- es ist das eigene Stylesheet einer
wiederverwendbaren Komponente, keine Komposit-Datei.

### Guard-Schärfung (verbindlich gefordert)

`compositeLayoutPurity.guard.test.ts`s `isSizeResetValue`-Funktion verliert die
`/^var\(--[\w-]+\)$/`-Ausnahme vollständig -- JEDE `width:`/`height:`-Deklaration außerhalb der
bereits bestehenden reinen Reset-Werte (`auto`, `0`, `0px`, `min-content`, `max-content`) gilt
künftig als Verstoß, auch ein `var(...)`-Verweis. Nach der obigen Migration (A-E) deklariert KEINE
der neun bewachten Dateien mehr irgendeine `width:`/`height:`-Eigenschaft (grep-bestätigt: VOR
dieser Änderung war `AnimeDetailHero.module.css` die EINZIGE der neun Dateien mit echten
`width:`/`height:`-Deklarationen; `EpisodeGlassCard.module.css`s Treffer sind nachweislich nur
Kommentartext). Die Guard-Selbsttests (`erkennt eine reine var(...)-Lesereferenz bei width/height
als legitimen Grundbaustein-Token-Verweis...`, Zeile 422-430) müssen entsprechend aktualisiert
werden: der bisherige "exempt"-Fall (`width: var(--media-frame-poster-width)` als NICHT-Verstoß)
wird zu einem ECHTEN Verstoß-Testfall umgedreht (symmetrisch zum bereits vorhandenen `width:100%`-
Verschärfungs-Testfall von `261105-ds2`). Der zweite Teil desselben Tests (kombiniertes/berechnetes
Literal wie `calc(var(...) + 4px)` ist ein Verstoß) bleibt unverändert richtig.

### Visuelle Prüfpflicht

Zero-Pixel-Diff-Nachweis (Playwright, main-Branch-Vergleich, Desktop 1440 + Mobil 390, Storybook-
Varianten der Anime-Detailseite) ist PFLICHT vor Abschluss, exakt wie in jeder vorherigen Runde
dieser Phase -- diese Migration berührt den sichtbarsten Teil der Seite (Posterbreite,
Titel-Logo-Zeile, Info-Karten-Zentrierung). Mindestens folgende Varianten explizit prüfen: Desktop
UND Mobil, mit UND ohne Titel-Logo (manche Anime haben keins, `AnimeTitleLogo` rendert dann
`null`), mit einem LANGEN Titel (prüft `growFirstChild`s Textumbruch-Verhalten tatsächlich, nicht
nur einen kurzen Titel, der keinen Unterschied zeigen würde). **Ergänzung nach Research:** der
Screenshot-Ausschnitt muss den PosterRAND/Bleed-Bereich (die farbige Verlängerung aus
`MediaFrame.module.css`s `.mediaFramePosterFade::before`) mit einschließen, nicht nur einen
zentrierten Ausschnitt -- das Entfernen von `.posterWrapper`s `overflow:visible` (jetzt redundant
zu `MediaFrame`s eigenem `position:relative`, aber beim Bleed-Effekt nicht rein statisch aus dem
CSS beweisbar) muss am tatsächlichen Rand sichtbar gegengeprüft werden.

## Befund 2 (fireEvent in Testdateien)

**Zitat:** `FansubVersionBrowser.test.tsx:224` (neuer Rhythmus-Stack-Test) und
`WatchlistAddButton.test.tsx:76,79,131,158,160` nutzen weiterhin `fireEvent.click` statt direkter
Logik-/Hook-Tests.

### FansubVersionBrowser.test.tsx -- ECHTER Befund, wird behoben

Verifiziert per `git diff <pre-phase-192-baseline>..HEAD -- frontend/src/components/fansubs/
FansubVersionBrowser.test.tsx` (Baseline-Commit `6a3e32769c17a59e19fc005b6a98c20201ac833b`, direkter
Elternvorfahr von `bb7d88f4b feat(192-01): ...`, dem ersten Phase-192-Commit): GENAU EIN neuer
`describe`-Block wurde in dieser Phase hinzugefügt (`'FansubVersionBrowser -- gemeinsamer
Rhythmus-Stack statt drei verstreuter margin-Werte'`, aktuell Zeile 202-233), mit GENAU ZWEI neuen
`fireEvent.click`-Aufrufen (aktuelle Zeilen 224, 237) -- exakt die vom Review zitierte Stelle.

Beide Aufrufe dienen NUR dazu, die Komponente VOR der eigentlichen Prüfung (Marge-Wert eines
Rhythmus-Wrappers) in einen bestimmten Gruppen-Auswahl-Zustand zu versetzen -- kein Test der
Klick-Handhabung selbst. Die Komponente bietet dafür bereits einen direkten Weg:
`FansubVersionBrowserProps.initialActiveSlug` (SSR-Initialwert, `FansubVersionBrowser.tsx:41`,
bereits dokumentiert als "SSR-Initialwert aus `searchParams.fansub`"). Ein bestehender, bereits
etablierter Test im selben File ("Testfall G: initialActiveSlug aktiviert die passende Gruppe
bereits beim ersten Render", Zeile 430) beweist, dass das Rendern MIT gesetztem `initialActiveSlug`
exakt denselben DOM-Zustand erzeugt wie ein Klick (`assertGroup(9)` prüft `aria-pressed` UND das
sichtbare `fansub-group-context`-Element).

**Konkrete Fixes:**
1. Test "trägt bei mehreren Gruppen UND aktivem Gruppen-Kontext...": `render(stateBrowser())` +
   `fireEvent.click(... 'Anderer Gruppenname')` wird zu
   `render(stateBrowser(fansubs, 22, 'saved-primary'))` (kein Klick mehr -- `'saved-primary'` ist
   `fansubs[0].fansub_group.slug`, exakt die Gruppe hinter dem Button "Anderer Gruppenname").
2. Test "trägt bei einer einzigen Gruppe ohne Gruppen-Kontext...": der `fireEvent.click(...'Alle')`
   entfällt ERSATZLOS -- der Render OHNE `initialActiveSlug` (2+ Gruppen, kein Parameter) landet
   laut `FansubVersionBrowser.tsx:147`s eigener Logik (`fansubOptions.length === 1 ? null :
   (initialActiveSlug ?? null)`) bereits automatisch im "Alle"-Zustand (ebenfalls bereits an
   anderer Stelle im selben File als "Testfall D" bewiesen, Zeile 406-409) -- der Klick war
   lediglich eine (unnötige) explizite Bestätigung eines ohnehin bereits geltenden Defaults.

Beide Umschreibungen behalten exakt dieselbe fachliche Prüfung (Marge-Wert des Rhythmus-Wrappers).

### WatchlistAddButton.test.tsx -- Befund wird NUR TEILWEISE angewandt, Rest konkret begründet falsch

Verifiziert per selbem Diff-Verfahren gegen dieselbe Baseline: ALLE `fireEvent`-Zeilen im Diff
dieser Datei sind ENTFERNUNGEN (vormalige fireEvent-Tests wurden in dieser Phase BEREITS durch
einen neuen `describe('useWatchlistAction: direkte Logiktests ohne Rendering/fireEvent', ...)`-Block
ersetzt) -- KEIN einziger NEUER `fireEvent`-Aufruf wurde in dieser Phase zu dieser Datei
hinzugefügt. Die vom Review zitierten Zeilen 76, 79 (Test "keeps unknown status fail-closed after
%s and supports retry"), 131 (die `for`-Schleife "ignores old %s %s after %s"), 158, 160 (Test
"does not let an old mutation finally enable a new pending mutation") sind laut Diff BYTE-IDENTISCH
zur Pre-Phase-192-Baseline -- unverändertes, vorbestehendes Altmaterial, keine "neu hinzugefügten
bzw. erweiterten Tests" im Sinne des ursprünglichen Auftrags.

**Zusätzlich, unabhängig vom Alters-Argument:** diese drei Tests prüfen KEINE reine
Logik/Zustandsübergang von `useWatchlistAction` selbst (dafür existiert bereits der komplette
`renderHook`-basierte Block), sondern das REMOUNT-Verhalten der ÄUSSEREN Komponente
`WatchlistAddButton` (`WatchlistAddButton.tsx:18-24`): ein `key={JSON.stringify([animeID,
accountIdentity, accountGeneration, hasAuthSession])}`-Ausdruck erzwingt bei Konto-/Anime-/
Sitzungswechsel einen ECHTEN React-Unmount+Remount der inneren `WatchlistAction`-Instanz (nicht nur
einen Prop-Rerender) -- genau DAS ist die fachliche Garantie, die diese drei Tests beweisen ("eine
veraltete, noch laufende Anfrage der ALTEN Instanz darf die neue Instanz nicht mehr beeinflussen").
`useWatchlistAction` selbst (der Hook) hat dafür zwar eine EIGENE, bereits per `renderHook`
bewiesene `requestGeneration`-Sperre INNERHALB einer Instanz -- die hier geprüfte, ZUSÄTZLICHE
Garantie (dass die `key`-Berechnung in `WatchlistAddButton.tsx` bei GENAU den fünf gelisteten
Änderungen tatsächlich einen Instanzwechsel auslöst) ist eine Eigenschaft der ÄUSSEREN Komponente,
nicht des Hooks, und `handleToggle` wird von der Komponente NICHT über eine Ref/ein Imperative-
Handle nach außen gereicht -- es gibt keinen Weg, diese konkrete Anfrage OHNE einen echten,
gerenderten Button auszulösen. Ein Ersatz durch zwei unabhängige `renderHook()`-Aufrufe (statt
`rerender`) würde nur noch beweisen, dass zwei VOLLSTÄNDIG GETRENNTE Hook-Instanzen keinen
gemeinsamen Zustand teilen (eine Trivialität, die React selbst garantiert) -- NICHT mehr, dass
`WatchlistAddButton`s eigene `key`-Berechnung bei genau diesen fünf Ereignissen (Konto-/Anime-/
Logout-/fehlende-Metadaten-/blockierter-Speicher-Wechsel) korrekt reagiert. Ein künftiger Regressions-
Fehler in genau dieser `key`-Berechnung (z. B. versehentliches Entfernen von `accountGeneration`)
würde von einer derart geschwächten Version NICHT mehr erkannt.

**Entscheidung:** Diese fünf Zeilen (76, 79, 131, 158, 160) bleiben UNVERÄNDERT -- der Befund ist
für diesen Teil nachweislich zu weit gefasst (zielt auf vorbestehendes, von dieser Phase nicht
berührtes Altmaterial, das zudem eine andere, komponentenübergreifende Garantie prüft, die sich
nicht ohne echten Verlust an Testtiefe in einen reinen Hook-Test umwandeln lässt). Diese
Begründung wird wörtlich in SUMMARY.md und VERIFICATION.md übernommen, NICHT stillschweigend
ignoriert.

## Zusammenfassung der Artefakte

- `frontend/src/components/ui/MediaFrame.tsx` / `.module.css` / `.stories.tsx` / `.test.tsx`
  (neue `widthPurpose="posterHero"`-Fähigkeit)
- `frontend/src/components/ui/Card.module.css` (responsive Details zweier Einzel-Aufrufstellen-
  Varianten vervollständigt, keine neue Prop)
- `frontend/src/components/ui/Stack.tsx` / `.module.css` / `.stories.tsx` (neue `alignBelowMd`-Prop)
- `frontend/src/components/ui/Cluster.tsx` / `.module.css` / `.stories.tsx` (neue `justifyBelowMd`-
  und `growFirstChild`-Props)
- `frontend/src/components/anime/AnimeMediaProvider.tsx` + neue
  `frontend/src/components/anime/AnimeMediaProvider.module.css`
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` / `.module.css` (Komposit, alle oben
  genannten Migrationen zusammengeführt)
- `frontend/src/app/anime/[id]/compositeLayoutPurity.guard.test.ts` (var()-Ausnahme entfernt,
  Selbsttest umgedreht)
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` (zwei Tests ohne fireEvent)
- Dokumentation: `docs/FRONTEND_ARCHITEKTUR.md` (neue Cluster-/Stack-/MediaFrame-Fähigkeiten
  kurz ergänzen, siehe CLAUDE.md "Dokumentation wächst mit dem Code")

Keine Änderung an `WatchlistAddButton.test.tsx` (Begründung oben).

## Teststrategie (gezielt, keine Vollsuite vor UAT)

- `npx vitest run` gezielt für: `MediaFrame.test.tsx`, `Card.test.tsx`, `Stack.test.tsx`,
  `Cluster.test.tsx`, alle neun von `compositeLayoutPurity.guard.test.ts` bewachten Dateien
  (mittelbar über den Guard-Testlauf selbst), `AnimeDetailHero`-nahe Tests (`page.test.tsx`,
  `AnimeDetailView.test.tsx`, `page.performance.test.ts`), `FansubVersionBrowser.test.tsx`.
- `npx tsc --noEmit`.
- Zero-Pixel-Diff (Playwright) gegen `main`, Desktop+Mobil, mit/ohne Titel-Logo, langer Titel.
- KEINE vollständige Projekt-Testsuite vor der Live-UAT (laut Auftrag); ein finaler
  `npx vitest run` (volle Suite) bleibt als zusätzliche Sicherheitsnetz-Prüfung sinnvoll, da in
  jeder vorherigen Runde dieser Phase so gehandhabt, ersetzt aber NICHT die gezielte Auswahl oben.

## Dokumentationspflicht

`docs/FRONTEND_ARCHITEKTUR.md`: die neuen Cluster-/Stack-/MediaFrame-Fähigkeiten (`growFirstChild`,
`justifyBelowMd`, `alignBelowMd`, `widthPurpose="posterHero"`) kurz in der Primitives-Beschreibung
ergänzen (gleiches Muster wie die vorherige Runde das für `fullWidthBelowMd`/`fillWidth` tat) --
OHNE Phasen-/Befund-/Plan-Nummern-Verweise (siehe CLAUDE.md "Dokumentation wächst mit dem Code"
und die in der letzten Runde korrigierte Sprachregel).

Code-Kommentare in allen oben geänderten Dateien: deutsch, korrekte Umlaute, fachlich statt
planungsverweisend (wie in der letzten Runde etabliert) -- insbesondere KEINE Verweise auf
"261105-qr1"/"Runde 4"/"Befund 1/2" im Produktionscode selbst (nur in diesem CONTEXT/SUMMARY/
VERIFICATION-Dokument).

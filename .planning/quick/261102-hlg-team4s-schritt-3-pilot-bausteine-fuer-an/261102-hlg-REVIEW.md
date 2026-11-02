---
task: 261102-hlg
reviewed: 2026-11-02T00:00:00Z
depth: thorough
reviewer: adversarial code review (gsd-code-reviewer)
range: ebf64a921..fdac0e686
files_reviewed: 25
status: fixed
outcomes:
  W1: fixed — Banner-Verdunklung in die SUMMARY-UAT-Checkliste aufgenommen (kein Code-Fix, Verhalten ist die laut Decision 2 verlangte Funktion)
  W2: fixed — Card bekam optionale tintSaturation/tintLightness/tintSurfaceAlpha/tintBorderAlpha-Props; EpisodeGlassCard übergibt für mixed UND recap die exakten Originalwerte, mit Regressionstest gegen das tatsächliche Render-Ergebnis
  W3: fixed — Info-Karten-Innenlayout in neues .infoCardBody-Element verschoben (analog ReleasePreviewRows .row-Wrapper), .infoCard setzt nur noch den Radius-Hook
  W4: fixed — --linkchip-glass-border/-hover referenzieren jetzt var(--border-on-media)/-strong statt eigener Literale
  W5: fixed — .posterDivider/.divider/.statsRow/.relatedSection nutzen jetzt var(--border-on-media)/-strong
  W6: fixed — alle genannten und weitere beim Nachprüfen gefundene englische Kommentare übersetzt
  W7: fixed — totes .edgeNavigation-CSS entfernt
  IN-01: fixed — redundantes tone="onScrim" in ReleasePreviewRow.tsx entfernt
  IN-02: no_change_needed — vorbestehend, nicht durch diesen Auftrag verursacht, außerhalb des Scopes
---

# Code Review: 261102-hlg (LinkChip/BannerSection/Card-Glas-Varianten + /anime+/anime/[id] Migration)

Reviewed by re-deriving all diffs directly from git (`git diff 857e71b49..fdac0e686 -- <file>`),
cross-checking every claim in `261102-hlg-SUMMARY.md`/`261102-hlg-PLAN.md` against the actual
committed code, running the regression/unit tests, `tsc --noEmit`, and pulling the **live,
currently-running** build (`http://192.168.235.196:3000/anime/8`) to inspect the actual compiled
CSS cascade order rather than trusting source-order assumptions.

Tests/typecheck re-run during this review (all green, confirming the SUMMARY's test claims are at
least not stale):
- `npx vitest run src/components/ui/foreignVariableOverrides.regression.test.ts src/components/ui/catalogTaxonomy.test.ts` → 79/79 passed.
- `npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx "src/app/anime/[id]/page.test.tsx" "src/app/anime/[id]/page.performance.test.ts"` → 85/85 passed.
- `npm run typecheck` → clean.

Despite green tests, several real defects and undisclosed regressions were found — green tests
here only prove the *assertions written* pass, not that the described behavior/claims are
accurate. Details below.

## Blocking Issues

None of the findings below rise to "breaks right now, must block ship" — the live site renders
and all tests pass. However, two WARNING items (W1, W2) describe *visible, user-facing* behavior
changes that were not disclosed to the human UAT reviewer despite smaller cosmetic deltas being
explicitly called out, and one (W3) describes a fragility that could silently regress the Info
Card's entire layout in a future, unrelated change. Treat W1–W3 as must-fix-or-must-disclose
before the pending Live-UAT sign-off.

## Warnings

### W1: Anime-Detailseite bekommt einen neuen, zuvor abgeschalteten 45%-Scrim über dem Banner — nicht in der UAT-Checkliste erwähnt

**File:** `frontend/src/components/ui/BannerSection.tsx:53` + `frontend/src/components/ui/BannerSection.module.css:25-30` + `frontend/src/styles/tokens/components.css` (`--overlay-scrim-bg: rgba(23, 21, 19, 0.45)`)

**Issue:** Vor dieser Migration rendert `AnimeDetailView.tsx` (Commit `857e71b49`) zwar ein
`<div className={styles.bannerOverlay} />`, aber `.bannerOverlay { display: none; }`
(`page.module.css`, entfernt in dieser Diff) macht dieses Overlay vollständig unsichtbar — die
Anime-Detailseite hatte also **gar keine** Verdunklung über dem Bannerbild. `BannerSection`
rendert dagegen **immer** einen `.scrim`-Layer (`background: var(--overlay-scrim-bg)` =
`rgba(23, 21, 19, 0.45)`), unabhängig von `withTextScrim` (das nur zwischen "moderat" und "stark"
umschaltet, es gibt keine "kein Scrim"-Option). Verifiziert gegen die laufende Instanz
(`curl http://192.168.235.196:3000/anime/8`): die Seite rendert tatsächlich
`class="BannerSection_scrim__CfrZb"` mit genau dieser Opazität. Das bedeutet: das Bannerbild der
Anime-Detailseite ist jetzt sichtbar ~45 % dunkler als vor der Migration — eine echte,
nutzersichtbare optische Änderung.

Die SUMMARY führt unter "Bekannte optische Punkte für die menschliche Live-UAT" mehrere deutlich
kleinere Deltas auf (Avatar 32px statt 36px, Episodentitel 16px statt 18px, Rückblick-Tönung),
aber **nicht** diese viel auffälligere Verdunklung. Ein Live-UAT-Reviewer, der sich auf diese
Checkliste verlässt, wird möglicherweise nicht gezielt nach dieser Änderung suchen.

**Fix:** In die UAT-Checkliste der SUMMARY (oder eine Nachtrags-Notiz) aufnehmen, dass das Banner
jetzt durchgehend ~45 % verdunkelt ist (vorher: keine Verdunklung), und explizit bestätigen
lassen, ob das gewollt ist. Falls nicht gewollt, bräuchte `BannerSectionProps` eine dritte
`withTextScrim`-Stufe (z. B. `'none' | 'moderate' | 'strong'`) statt der aktuellen
`boolean`-Zweiteilung.

### W2: Generische Tönungs-Formel reproduziert "mixed" NICHT exakt — SUMMARY/Token-Kommentar behaupten das Gegenteil

**File:** `frontend/src/styles/tokens/components.css:332-342` (Kommentar + `--card-tint-saturation`/`--card-tint-lightness`), vgl. Original in Commit `857e71b49`: `frontend/src/components/fansubs/EpisodeGlassCard.module.css:14-15` (alt)

**Issue:** Der Kommentar in `components.css` (und wortgleich in `261102-hlg-SUMMARY.md`) behauptet:
"canon(222)/filler(2)/mixed(272) reproduzieren damit exakt die bisherigen Werte (70%/62%/12%/32%),
recap(42) weicht … minimal … ab". Das ist für **mixed** nachweislich falsch. Die ursprünglichen
Werte vor dieser Migration waren:
- canon: `hsl(222 70% 62% / 12%)` / Rand `32%` → passt exakt zur neuen generischen Formel.
- filler: `hsl(2 70% 62% / 12%)` / Rand `32%` → passt exakt zur neuen generischen Formel.
- **mixed: `hsl(272 60% 64% / 12%)` / Rand `32%`** — Sättigung war **60 %**, Helligkeit **64 %**,
  NICHT 70 %/62 % wie die neue Formel liefert.
- recap: `hsl(42 75% 58% / 14%)` / Rand `34%` (korrekt als Abweichung dokumentiert).

Die neue generische Formel (70 %/62 %/12 %/32 % für alle vier Hues) ändert "mixed" von
`hsl(272 60% 64%)` (RGB 167,108,218 — gedämpftes Violett) zu `hsl(272 70% 62%)` (RGB 163,90,226 —
sichtbar satteres Violett; Grünkanal sinkt von 108 auf 90, ca. 17 % relative Änderung). Das ist
eine echte, bislang **nicht erkannte** zweite visuelle Abweichung, zusätzlich zur bereits
(korrekt) dokumentierten recap-Abweichung — aber anders als recap steht sie nirgends auf der
UAT-Checkliste, weil der Autor fälschlich annimmt, mixed sei exakt erhalten.

**Fix:** Kommentar in `components.css` und die SUMMARY korrigieren ("canon/filler reproduzieren
exakt, mixed UND recap weichen ab") und den mixed-Fall zusätzlich in die
Live-UAT-Checkliste aufnehmen. Falls die Abweichung bei mixed als zu groß empfunden wird, bleibt
als Alternative die im Research-Dokument selbst genannte Option "vier Fach-Tokens statt generischer
Formel" für genau diesen Fall.

### W3: Inkonsistente Lösung des "Cross-Modul-CSS-Spezifitätsgleichstands" — Info-Karte bleibt für `padding`/`display` exponiert, obwohl genau dieses Risiko für `border-radius` extra per Hook gelöst wurde

**File:** `frontend/src/app/anime/[id]/AnimeDetailView.tsx:137` + `frontend/src/app/anime/[id]/page.infoCard.module.css:14-22` + `frontend/src/components/ui/Card.module.css:70-92`

**Issue:** Für die Eckenrundung wurde bewusst der Hook `--card-radius-override` eingeführt, weil
(laut eigenem Kommentar) zwei Klassen aus verschiedenen CSS-Modulen, die direkt auf demselben
Element dieselbe Eigenschaft (`border-radius`) setzen, einen "Cross-Modul-Spezifitätsgleichstand"
erzeugen, dessen Gewinner "nicht zuverlässig über die Bündel-Ladereihenfolge entscheidbar" ist.

Exakt dieses Muster besteht aber unadressiert für `padding`/`display`/`flex-direction`: `<Card
variant="glass" className={styles.infoCard}>` rendert ein `<section>` mit den Klassen
`Card_card__* Card_cardGlass__* page_infoCard_infoCard__*` gleichzeitig. `.card`
(`Card.module.css:1-15`) setzt `display: grid` + `padding: var(--card-padding)`; `.cardGlass`
(`Card.module.css:75-92`) setzt `padding: 0`; `.infoCard` (`page.infoCard.module.css:14-22`) setzt
`padding: 28px; display: flex; flex-direction: column;`. Alle drei Klassen haben identische
Spezifität (0,1,0) und konkurrieren auf demselben Element um dieselben Eigenschaften — der Sieger
wird ausschließlich durch die Reihenfolge der CSS-Module im kompilierten Bundle entschieden, nicht
durch eine offizielle Prop/einen Hook.

Verifiziert gegen das laufende Build (`/_next/static/css/app/anime/%5Bid%5D/page.css`): aktuell
gewinnt `.infoCard` (steht später im Bundle, Zeile 4982 vs. `.card` Zeile 1295), die Seite sieht
also **heute** korrekt aus. Das ist aber ein Zufall der aktuellen Modul-Reihenfolge, nicht
garantiert — exakt das Risiko, das der Autor für `border-radius` selbst explizit benannt und per
Hook gelöst hat, hier aber nicht konsequent zu Ende gedacht hat. Ein zukünftiger, scheinbar
unabhängiger Refactor (z. B. Änderung der Import-Reihenfolge in `AnimeDetailView.tsx`, ein neuer
gemeinsamer Chunk, ein Next.js-Versionssprung mit anderem CSS-Modul-Bundling) könnte diese
Reihenfolge stillschweigend umdrehen und die Info-Karte auf `padding: 0`/`display: grid`
zurückfallen lassen — ohne Compile- oder Test-Fehler, nur sichtbar im Browser.

Zum Vergleich: `ReleasePreviewRow.tsx` löst dasselbe Problem korrekt über einen inneren
`<div className={styles.row}>`-Wrapper (Kommentar dort benennt das Risiko identisch), statt die
Layout-Klasse direkt auf `<Card>` zu setzen.

**Fix:** Entweder (a) dieselbe Wrapper-Technik wie bei `ReleasePreviewRow` anwenden (Layout-Inhalt
der Info-Karte in einen inneren `<div className={styles.infoCardBody}>` innerhalb von `<Card>`
verschieben, `.infoCard` selbst nur noch für Grid-Position nutzen) oder (b) `padding`/`display`
ebenfalls über generische, von `Card` gelesene Override-Hooks (`--card-padding-override`,
`--card-display-override` o. ä.) lösen, konsistent mit dem bereits etablierten Muster.

### W4: Neuer Token `--linkchip-glass-border` duplizieren denselben Wert wie `--border-on-media`, statt ihn zu referenzieren — gegen die eigene Plan-Vorgabe

**File:** `frontend/src/styles/tokens/components.css:293` (`--linkchip-glass-border: rgba(255, 255, 255, 0.15)`) vs. `components.css:347` (`--border-on-media: rgba(255, 255, 255, 0.15)`)

**Issue:** Der Plan (Task 1, `261102-hlg-PLAN.md`) verlangt ausdrücklich: "falls im Zuge von Task 3
(neue Tokens) ohnehin passende Border-Tokens entstehen (`--border-on-media`), DIESE für
`tone="glass"`s Rand verwenden statt eines weiteren Literals." `--border-on-media` wurde in Task 3
angelegt und hat exakt denselben Wert (`rgba(255, 255, 255, 0.15)`), wird aber in
`LinkChip.module.css:20` NICHT referenziert — stattdessen existiert ein zweiter, unabhängiger
Token `--linkchip-glass-border` mit identischem Wert. Beide Tokens können künftig unabhängig
geändert werden und stillschweigend auseinanderlaufen, obwohl sie laut Plan dieselbe Design-
Entscheidung repräsentieren sollen.

**Fix:** `--linkchip-glass-border: var(--border-on-media);` (und ggf. `--linkchip-glass-border-hover`
analog zu `--border-on-media-strong`, falls die Werte weiterhin übereinstimmen sollen) statt der
doppelten Literal-Deklaration.

### W5: `--border-on-media`/`--border-on-media-strong` werden nicht auf ihre eigenen Ursprungs-Selektoren zurückübertragen — Quelle und Token laufen auseinander

**File:** `frontend/src/app/anime/[id]/page.poster.module.css:38-43` (`.posterDivider`), `frontend/src/app/anime/[id]/page.infoCard.module.css:143-148` (`.divider`)

**Issue:** `components.css` begründet `--border-on-media`/`--border-on-media-strong` explizit damit,
dass die Werte "aus den heutigen `.posterDivider`/`.divider`-Trennern … übernommen" wurden. Die
beiden Token-Konsumenten, die tatsächlich jetzt `var(--border-on-media)` nutzen, sind
`ReleasePreviewRow.module.css:36` und `EpisodeGlassCard.module.css:52` — die **eigentlichen
Ursprungs-Selektoren** `.posterDivider`/`.divider` behalten aber weiterhin ihre rohen
`rgba(255, 255, 255, 0.15)`/`rgba(255, 255, 255, 0.25)`-Literale. Ändert sich der Token künftig
(z. B. im Rahmen einer globalen Kontrast-Anpassung), laufen die ursprünglichen, namensgebenden
Trenner und die neuen Verbraucher lautlos auseinander.

**Fix:** `.posterDivider`/`.divider` ebenfalls auf `var(--border-on-media)`/
`var(--border-on-media-strong)` umstellen (liegen außerhalb von `components/ui`, daher nicht vom
`foreignVariableOverrides.regression.test.ts`-Wächter erzwungen, aber fachlich dieselbe
Begründung wie bei den Glas-Tokens).

### W6: Mehrere Englische Kommentare in beim Split neu angelegten/berührten CSS-Dateien nicht ins Deutsche übersetzt

**File:** `frontend/src/app/anime/[id]/page.poster.module.css:27,96,133,160`, `frontend/src/app/anime/[id]/page.infoCard.module.css:24,48,56,91,101`, `frontend/src/app/anime/page.module.css:2`

**Issue:** CLAUDE.md "Dokumentation wächst mit dem Code" verlangt: "Englische Kommentare in der
angefassten Datei werden ins Deutsche übersetzt." `page.poster.module.css` und
`page.infoCard.module.css` sind beide NEU in dieser Diff angelegt (Task 5, 450-Zeilen-Split) —
beim Verschieben wurden mehrere englische Bestandskommentare 1:1 übernommen, z. B. "Area below
poster for watchlist button and genres", "Blurred poster extension - fills entire space below
poster", "Watchlist Button", "Title + Logo Row", "Badges", "Description", "Stats Row", "Info
Banner". `frontend/src/app/anime/page.module.css:2` ("Desktop-first: use more horizontal space
(FullHD etc.) while keeping a safe gutter.") blieb in der ebenfalls in dieser Diff geänderten Datei
unübersetzt stehen.

**Fix:** Die genannten Kommentare ins Deutsche übersetzen (fachlich, nicht nur wörtlich), wie es
bei den neu hinzugefügten Kommentaren in derselben Diff bereits korrekt gemacht wurde.

### W7: Totes CSS `.edgeNavigation` wurde beim 450-Zeilen-Split nicht erkannt/entfernt

**File:** `frontend/src/app/anime/[id]/page.infoCard.module.css:212-214`

**Issue:** Die Klasse `.edgeNavigation` (nur `border-top-color: rgba(255, 255, 255, 0.15);` in der
mobilen `@media`-Regel) hat 0 Treffer in `AnimeDetailView.tsx` — nur `.edgeNavigationOverlay` wird
dort verwendet. Das ist bereits in Commit `857e71b49` so (kein durch diese Diff neu eingeführter
Bug), aber die Task-5-Aufgabe hat explizit mehrere andere tote Klassen (`.relatedRailWrapper`,
`.relatedRailSection`, `.episodeList` u. a.) beim Verschieben identifiziert und entfernt — diese
eine wurde übersehen und 1:1 in die neue Datei übernommen. Der zugehörige Abwesenheits-Test in
`page.test.tsx:270-281` deckt nur die explizit im Plan genannten Klassennamen ab, nicht `.edgeNavigation`,
und hätte den Fund daher ohnehin nicht automatisch verhindert.

**Fix:** `.edgeNavigation`-Regel (Zeilen 211-214) ersatzlos entfernen; Abwesenheits-Regex in
`page.test.tsx` um `\.edgeNavigation\b` (ohne `Overlay`-Suffix) ergänzen, um ein erneutes
Wiederauftauchen zu verhindern.

## Info

### IN-01: Redundantes `tone="onScrim"` neben `style={mutedOnGlassTextStyle}` in `ReleasePreviewRow.tsx`, aber nicht in `EpisodeGlassCard.tsx`

**File:** `frontend/src/components/fansubs/ReleasePreviewRow.tsx:70,76,83,87,91` vs. `frontend/src/components/fansubs/EpisodeGlassCard.tsx:49,55,59`

**Issue:** `ReleasePreviewRow.tsx` setzt bei den gedämpften Zeilen sowohl `tone="onScrim"` als
auch das überschreibende `style={mutedOnGlassTextStyle}` (die `tone`-Prop ist hier wirkungslos, da
der Inline-Style garantiert gewinnt). `EpisodeGlassCard.tsx` nutzt für dieselbe Situation nur den
Inline-Style, ohne `tone`. Funktional ohne Unterschied, aber inkonsistent zwischen den beiden
gleichzeitig migrierten Geschwister-Komponenten.

**Fix:** Einheitlich nur den Inline-Style setzen (ohne das wirkungslose `tone="onScrim"`), oder
beide Dateien konsistent mit `tone="onScrim"` + Style versehen.

### IN-02: `<div>` als direktes Kind eines `<ul>` in `FansubVersionBrowser.tsx` (vorbestehend, nicht durch diese Diff verursacht)

**File:** `frontend/src/components/fansubs/FansubVersionBrowser.tsx:355-380` (`WindowedPageGroup`
rendert ein `<div data-page-id>` direkt innerhalb des `<ul>`, das wiederum `<li>`-Elemente aus
`EpisodeGlassCard` enthält)

**Issue:** HTML-technisch ist ein `<div>` als direktes Kind eines `<ul>` ungültig (erlaubt sind nur
`<li>`, `<script>`, `<template>`). Dieses Muster existiert bereits unverändert seit vor dieser
Diff (verifiziert per `git show 857e71b49`); die vorliegende Diff ändert an `FansubVersionBrowser.tsx`
nur den `<h2>` → `<Heading level={2}>`-Tausch. Da der Review-Auftrag explizit nach der
Listensemantik innerhalb dieses `<ul>` gefragt hat: der Befund besteht, ist aber kein neuer Fehler
dieser Migration. Browser/Screenreader tolerieren das Muster i. d. R. (die `<li>`-Kinder werden
trotzdem als `listitem` in den Accessibility-Baum aufgenommen), es bleibt aber technisch invalides
HTML.

**Fix (außerhalb des Scopes dieser Diff, nur zur Kenntnisnahme):** Falls `WindowedPageGroup`
künftig angefasst wird, auf ein zulässiges Wrapper-Element umstellen (z. B. `role="presentation"`
auf einem `<li>`-Wrapper statt eines rohen `<div>`, oder Höhen-Messung ohne zusätzliches
DOM-Element).

---

## Positiv verifizierte Punkte (keine Befunde)

Zur Einordnung, was im Rahmen dieses adversarialen Reviews tatsächlich geprüft und **nicht**
beanstandet wurde:
- `Card.tsx`/`Card.module.css`: die 8 bestehenden Varianten bleiben in Logik und CSS unverändert;
  `tintHue`/`glass`/`glassStrong` sind rein additiv, kein bestehender 70+-Aufrufer kann durch diese
  Änderung brechen.
- `foreignVariableOverrides.regression.test.ts` (Fremd-Variablen- und Literal-Checks) läuft
  tatsächlich grün gegen den aktuellen Code (erneut ausgeführt, nicht nur der SUMMARY vertraut);
  `--card-radius-override` wird korrekt nur gelesen, nie innerhalb von `components/ui` gesetzt.
  `hsl(var(...) ...)`-Aufrufe in `Card.module.css` enthalten ausschließlich `var()`-Argumente.
- Avatar-Fallback in `ReleasePreviewRow.tsx`: `initials('Anderer Gruppenname')` liefert korrekt
  `'AG'`; leerer/unüblicher Gruppenname fällt über Avatars eigenen `'?'`-Fallback ab, kein Crash,
  kein Layout-Sprung über die dokumentierten 32px/36px-Differenz hinaus.
  `FansubVersionBrowser.test.tsx`s "Testfall 11" wurde korrekt auf die neue, von der Decision
  verlangte Verhaltenserweiterung umgestellt (keine Test-Manipulation, um nur grün zu erscheinen).
- `DisclosureTrigger`-Adoption in `EpisodeGlassCard.tsx`: `aria-expanded` wird weiterhin korrekt
  aus `open`/`expanded` abgeleitet, `onClick`/`aria-controls` bleiben wie zuvor beim Aufrufer.
  Alle `Text`-Elemente innerhalb des `title`-Slots nutzen korrekt `as="span"` (kein ungültiges
  `<p>` innerhalb des `<button>`).
- `LinkChip`/`BannerSection`: keine ungeschützte Interpolation von Nutzereingaben in HTML/CSS;
  `href` läuft immer über `buildFilterHref()`/`URLSearchParams` (korrekt kodiert), `imageUrl`
  landet nur als `<img src>`/React-Attribut, keine `dangerouslySetInnerHTML`-Nutzung.
- `page.module.css`-Vierteilung: keine Klassennamen-Kollision zwischen den vier Teildateien (per
  Diff/Grep verifiziert), `mergeCssModules`-Priorität (`shell > poster > infoCard > episodes`) ist
  dadurch unkritisch.
- Deutsche Sprachqualität: alle NEU hinzugefügten Kommentare/Strings in dieser Diff verwenden
  korrekte Umlaute/ß (keine ae/oe/ue/ss-Ersatzschreibung gefunden) — die gefundenen Mängel (W6)
  betreffen ausschließlich unübersetzte, aus dem Bestand übernommene englische Kommentare, nicht
  neue ASCII-Ersatzschreibung.
- `npm run typecheck`, die genannten Vitest-Suiten und die Live-Antwort von
  `http://192.168.235.196:3000/anime/8` wurden während dieses Reviews erneut ausgeführt/abgerufen
  und bestätigen die SUMMARY-Behauptungen zu grünen Tests (unabhängig davon, ob die Behauptungen
  zur visuellen Treue selbst zutreffend sind, siehe W1/W2).

---

_Reviewed: 2026-11-02_
_Reviewer: Claude (adversarial code review)_
_Depth: thorough_

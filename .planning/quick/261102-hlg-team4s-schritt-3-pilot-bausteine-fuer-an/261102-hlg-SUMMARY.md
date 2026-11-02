# Quick-Task 261102-hlg: Team4S Schritt 3 -- LinkChip, BannerSection, öffentliche Card-Glas-Varianten (Tokens) + Design-System-Pflichtnutzung für /anime und /anime/[id] -- Summary

**One-liner:** Zwei neue globale Bausteine (`LinkChip`, `BannerSection`), `Card` um zwei
öffentliche Glas-Varianten + generischen Tönungs-Hook erweitert (komplett tokenbasiert),
`/anime`+`/anime/[id]` konsequent auf Design-System-Grundbausteine umgestellt, `EpisodeGlassCard`/
`ReleasePreviewRow` inhaltlich auf dieselben Bausteine migriert -- `FansubVersionBrowser` bleibt
verhaltensgleich.

**Status:** Alle 15 Tasks abgeschlossen, alle Gates grün.

## Task-Status

| Task | Name | Status | Commit |
|---|---|---|---|
| 1 | LinkChip-Grundbaustein | done | `ebf64a921` |
| 2 | BannerSection-Baustein | done | `b74790107` |
| 3 | Card-Glas-Tokens | done | `a3e287e99` |
| 4 | Card glass/glassStrong + tintHue | done | `49f3feb62` |
| 5 | page.module.css 450-Zeilen-Split | done | `845acd625` |
| 6 | AnimeDetailView Banner/Poster/Genres | done | `272a6aaba` |
| 7 | AnimeDetailView Info-Card auf Card variant="glass" | done | `cef5290e4` |
| 8 | EpisodeGlassCard auf Card + Grundbausteine | done | `d917015e9` |
| 9 | ReleasePreviewRow auf Card + Avatar | done | `ce32d3544` |
| 10 | FansubVersionBrowser h2 -> Heading | done | `ebd1af243` |
| 11 | /anime-Kopf PageHeader/ErrorState/LoadingState | done | `61de9fe2f` |
| 12 | Storybook "Im Einsatz"-Doku (Rollen/Viewport) | done | `030d85297` |
| 13 | CLAUDE.md/FRONTEND_ARCHITEKTUR.md nachgezogen | done | `31ffa354e` |
| 14 | Vollverifikation + Live-Nachweis | done | (Fixes in `34d1180f3`) |
| 15 | 261102-cb2-EINORDNUNG.md nachgeführt | done | `fdac0e686` |

## Verify-Ergebnisse (tatsächlich ausgeführt)

- `npm run typecheck`: grün (nach jedem Task einzeln geprüft, final nochmal grün).
- `npm run lint`: 220 Probleme (4 Fehler, 216 Warnungen) -- **keiner in einer von diesem Auftrag
  berührten Datei**; alle 4 Fehler + alle Warnungen liegen in nicht angefassten Admin-/Legacy-
  Dateien (`capture-responsive.cjs`, `useReleaseVersionMedia.ts`, `ReleasesFilterBar.tsx`,
  `archiv/page.tsx` u. a.), geprüft per Grep gegen die exakten Dateinamen dieses Auftrags.
- `npx vitest run` (voller Lauf): **454 von 455 Testdateien grün, 1 übersprungen
  (`VerifiedBadge.test.tsx`, bewusst `skip`, nicht von diesem Auftrag berührt), 5474 von 5477
  Tests grün, 3 `todo`.** Ein Testlauf-Durchgang zeigte `src/app/admin/fansubs/
  releaseReviews.test.tsx` als fehlgeschlagen (Testlauf-Reihenfolge-Flakiness, unrelated Admin-
  Datei) -- isoliert erneut ausgeführt: 16/16 grün. Im finalen vollen Lauf ebenfalls grün.
- `npx vitest run src/components/ui/catalogTaxonomy.test.ts
  src/components/ui/storybookDescriptionLinks.regression.test.ts
  src/components/ui/foreignVariableOverrides.regression.test.ts
  src/components/ui/processHistory.regression.test.ts`: grün (letzterer war anfangs rot, siehe
  Deviation unten, jetzt behoben).
- `npx vitest run` für alle vier `FansubVersionBrowser*.test.tsx`: grün (54 Tests, Filter-/
  Gruppenwechsel-/Windowing-Verhalten unverändert).
- `docker compose exec team4sv30-storybook npm run build-storybook`: erfolgreich (nach jedem
  relevanten Task einzeln + final nochmal).
- `docker compose exec team4sv30-storybook npx test-storybook --url http://127.0.0.1:6006 --ci`:
  **62 von 62 Testdateien grün, 317 von 317 Tests grün.** (Der im Plan vorgesehene Filter
  `-- -t "Anime-Liste|Anime-Detail"` funktioniert mit der installierten `test-storybook`-Version
  nicht wie erwartet -- `-t` ist keine unterstützte Option dieser Version, siehe Deviation unten;
  der volle, ungefilterte Lauf deckt die beiden Zielseiten vollständig mit ab.)
- 450-Zeilen-Check (`wc -l`) auf jede inhaltlich geänderte Produktionsdatei: alle unter dem Limit
  (größte: `FansubVersionBrowser.tsx` 395 Zeilen, `styles/tokens/components.css` 349 Zeilen,
  `page.poster.module.css` 242 Zeilen).
- Grep-Sweep `grep -rn "P0 MVP\|Episodes\b" frontend/src/app/anime`: 0 Treffer für "P0 MVP"; die
  `Episodes\b`-Treffer sind ausschließlich Code-Identifier (`getGroupedEpisodes`) und ein
  historischer Testname (`D-16-Bug`), keine sichtbare englische UI-Zeichenkette.
  `grep -rn "rgba(\|hsl(" .../Card.module.css`: 2 Treffer, beide `hsl(var(...) var(...) var(...) /
  var(...))`-Funktionsaufrufe mit AUSSCHLIESSLICH `var()`-Argumenten (kein Literal) -- der
  automatisierte `foreignVariableOverrides.regression.test.ts` (dessen Regex gezielt zwischen
  `rgba()` und reinem `hsl(`-Text unterscheidet) bestätigt dies als zulässig; `EpisodeGlassCard.
  module.css`/`ReleasePreviewRow.module.css`: 0 Treffer.
- **Live-Nachweis** gegen den laufenden Dev-Server:
  - `curl -s -o /dev/null -w "%{http_code}" http://192.168.235.196:3000/anime` → `200`
  - Echte Anime-ID über die laufende API ermittelt (`curl http://192.168.235.196:18092/api/v1/
    anime?page=1&per_page=5`) → `id=8` ("07-Ghost", `max_episodes: 25`).
  - `curl -s -o /dev/null -w "%{http_code}" http://192.168.235.196:3000/anime/8` → `200`
  - `curl -s http://192.168.235.196:3000/anime/8 | grep -o "P0 MVP\|[0-9]* Folgen"` → nur
    `25 Folgen` (kein "P0 MVP").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] LinkChip-Tokens vorgezogen auf Task 1 statt Task 3**
- **Found during:** Task 1
- **Issue:** Die Orchestrator-Vorgabe verlangt ausdrücklich, dass `LinkChip.module.css`/
  `BannerSection.module.css` NUR `var(--token)` referenzieren dürfen (keine Literale) --
  `foreignVariableOverrides.regression.test.ts` scannt JEDE `.module.css`-Datei in
  `src/components/ui/`, auch neue, unabhängig davon, ob der Plan-Text für diese Datei explizit
  Literale erlaubt.
- **Fix:** Die in Task 3 geplanten LinkChip-/BannerSection-Tokens bereits in Task 1/2 angelegt
  (Werte identisch zum Plan, nur zeitlich vorgezogen).
- **Files modified:** `frontend/src/styles/tokens/components.css`
- **Commit:** `ebf64a921`, `b74790107`

**2. [Rule 1 - Bug] CSS-Kommentar mit `*/`-Sequenz brach den Storybook-Build**
- **Found during:** Task 8
- **Issue:** Ein Kommentar in `EpisodeGlassCard.module.css` enthielt die Zeichenfolge
  `--card-glass-*/--card-tint-*` -- `*/` schließt einen CSS-Kommentar vorzeitig, der Rest wurde
  als ungültiges CSS geparst (`SyntaxError` im Storybook-Webpack-Build).
- **Fix:** Kommentar umformuliert, keine `*/`-Sequenz mehr enthalten.
- **Files modified:** `frontend/src/components/fansubs/EpisodeGlassCard.module.css`
- **Commit:** `d917015e9`

**3. [Rule 3 - Blocker] `ResponsiveImage` fehlte als Export in `components/ui/index.ts`**
- **Found during:** Task 6
- **Issue:** `ResponsiveImage.tsx` existiert, hatte aber keinen `export * from './ResponsiveImage'`
  in `index.ts` -- `import { ResponsiveImage } from '@/components/ui'` schlug mit TS2305 fehl.
- **Fix:** Export ergänzt.
- **Files modified:** `frontend/src/components/ui/index.ts`
- **Commit:** `272a6aaba`

**4. [Rule 1 - Bug] `elements()`-Testwalker findet Props-only-Inhalte nicht**
- **Found during:** Task 6/7
- **Issue:** `page.test.tsx`s `elements()`/`textContent()`-Helfer laufen nur über materialisierte
  `.props.children`, nicht über beliebig benannte Props. `Badge` als `MediaFrame`s `bottomBadge`-
  Prop und `ErrorState`s `title`/`description`-Props wurden dadurch für die bestehenden
  Text-Assertions unsichtbar.
- **Fix:** Neue Hilfsfunktion `posterBadgeText()` (findet `MediaFrame`, liest `bottomBadge`-Prop
  direkt) bzw. direkte Props-Prüfung (`item.props.title`) statt `textContent()`.
- **Files modified:** `frontend/src/app/anime/[id]/page.test.tsx`
- **Commit:** `272a6aaba`, `cef5290e4`

**5. [Rule 1 - Bug] `processHistory.regression.test.ts` -- D-NN-Planungsverweise in neuen
Kommentaren/Story-Beschreibungen**
- **Found during:** Task 14 (Vollverifikation)
- **Issue:** Mehrere neu geschriebene Kommentare/Story-Beschreibungen (`Card.tsx`,
  `Card.stories.tsx`, `AnimeListView.stories.tsx`, `AnimeDetailView.stories.tsx`) enthielten
  `D-05`/`D-07`/`D-08`-Kennungen -- ein repo-weiter Regressions-Wächter verbietet genau dieses
  Muster in `components/ui/*` und JEDER `*.stories.tsx`-Datei (Auftrags-/Planungs-Historie statt
  fachlicher Erklärung).
- **Fix:** D-NN-Kennungen entfernt, fachliche Erklärung blieb jeweils stehen (war bereits
  vorhanden, nur zusätzlich mit der jetzt verbotenen Kennung versehen).
- **Files modified:** `Card.tsx`, `Card.stories.tsx`, `AnimeListView.stories.tsx`,
  `AnimeDetailView.stories.tsx`
- **Commit:** `34d1180f3`

**6. [Rule 1 - Bug] Falscher Storybook-Dokumentationslink in `ReleasePreviewRow.stories.tsx`**
- **Found during:** Task 14 (Vollverifikation)
- **Issue:** `storybookDocsLink('Zusammengesetzte Bausteine/Button', 'Button')` verwies auf eine
  nicht existierende Kategorie -- `Button` ist tatsächlich unter `Grundbausteine/Button`
  katalogisiert.
- **Fix:** Link korrigiert.
- **Files modified:** `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx`
- **Commit:** `34d1180f3`

**7. [Rule 1 - Bug] `FansubVersionBrowser.test.tsx` prüfte eine durch Task 8 absichtlich
entfernte CSS-Implementierungsdetail-Signatur**
- **Found during:** Task 8
- **Issue:** Ein bestehender Test las `EpisodeGlassCard.module.css` als Rohtext und erwartete die
  literalen `--glass-*`-Variablennamen, die Task 8 gezielt entfernt (nach `Card`/Tokens
  verschoben).
- **Fix:** Testassertion auf die neue Architektur umgestellt (prüft jetzt `components.css`-Tokens
  + `EpisodeGlassCard.tsx`s Hue-Zuordnung statt der alten Variablennamen in der CSS-Datei selbst).
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Commit:** `d917015e9`

**8. [Rule 1 - Bug, von der Decision verlangte Verhaltenserweiterung] `Testfall 11` prüfte die
ALTE "kein Fallback"-Erwartung**
- **Found during:** Task 9
- **Issue:** `Avatar`s Initialen-Kürzel-Fallback (von der Decision ausdrücklich verlangt) macht
  die bisherige Testerwartung "kein Platzhalter bei fehlendem Logo" falsch -- `screen.
  getByText('Anderer Gruppenname')` fand jetzt zwei Treffer (sichtbarer Zeilentext + `Avatar`s
  `VisuallyHidden`-Name) statt einem.
- **Fix:** Testname + Assertions auf die neue, verlangte Avatar-Kürzel-Anzeige umgestellt.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`
- **Commit:** `ce32d3544`

### Architektur-/Gestaltungsentscheidungen (im Bericht begründet, wie vom Plan verlangt)

**Ebene 1 -- Kartenfläche als Grundbaustein:** `Card`-Erweiterung statt neuer Grundbaustein
("Glaskarte"), wie in `RESEARCH-CARD.md` Abschnitt 10 empfohlen und im Plan als LOCKED-
Architekturentscheidung vorgegeben: zwei neue Varianten (`glass`/`glassStrong`), generischer
`tintHue`-Hook (0-360°, Card kennt keine Episodentyp-Namen). Begründung: `Card` ist bereits der
domänenneutrale Flächen-Baustein über 70+ Verwendungsstellen hinweg, ein Parallelsystem hätte
~90 % derselben Eigenschaften dupliziert (gegen AGENTS.md/CLAUDE.md "keine zweite Kopie von
UI-Logik").

**Generischer Tönungs-Hook mit optionaler exakter Feinjustierung (nach Review-Korrektur):** `Card`
berechnet die Tönungsfarbe aus `tintHue` standardmäßig über EINE gemeinsame Formel
(`--card-tint-saturation: 70%`, `--card-tint-lightness: 62%`, `--card-tint-surface-alpha: 12%`,
`--card-tint-border-alpha: 32%`), die canon(222°)/filler(2°) exakt reproduziert. Eine erste
Umsetzung nahm fälschlich an, dies treffe auch auf "mixed" exakt zu -- eine unabhängige Code-
Review (`261102-hlg-REVIEW.md`, Befund W2) fand, dass "mixed" im Bestand abweichende Werte hatte
(Sättigung 60% statt 70%, Helligkeit 64% statt 62%) und die generische Formel dadurch eine
zweite, zuvor nicht erkannte optische Abweichung einführte. **Korrektur:** `Card` bekam vier neue,
optionale Props (`tintSaturation`/`tintLightness`/`tintSurfaceAlpha`/`tintBorderAlpha`), die die
Standardformel pro Aufruf exakt überschreiben, ohne Card selbst domänenspezifisch zu machen.
`EpisodeGlassCard` übergibt jetzt für "mixed" UND "recap" ihre jeweiligen ursprünglichen
Einzelwerte explizit -- beide Tönungen sollten dadurch wieder 1:1 wie vor diesem Auftrag
aussehen. **UAT-Punkt:** trotzdem visuell gegenprüfen.

**`<li>`-Wrapper außerhalb von `Card`, kein `as`-Prop:** wie im Plan vorgegeben -- `EpisodeGlassCard`s
`<li>` bleibt ein dünner, unstyled Wrapper außerhalb von `Card` (`data-classification` wandert
auf das `<li>`), `Card.tsx` selbst bleibt unverändert in Bezug auf polymorphe Tags.

**`--card-radius-override`-Hook für die asymmetrische Info-Karten-Rundung:** Die Info-Karte sitzt
rechts neben der Poster-Spalte innerhalb EINES gemeinsam gerundeten `heroContainer`-Rahmens und
braucht deshalb eine andere Eckenrundung (`0 24px 24px 0`/mobil `0 0 24px 24px`) als `Card`s
generischer 12px-Radius. Ein Cross-Modul-CSS-Konflikt (beide Dateien würden um dieselbe
`border-radius`-Eigenschaft konkurrieren, Gewinner abhängig von der nicht garantierten Bündel-
Ladereihenfolge) wurde durch einen neuen, generischen Override-Hook `--card-radius-override`
gelöst (analog zu `--card-tint-hue`) -- NICHT durch das von Nachtrag 5/6 verbotene
Überschreiben einer privaten Variable von außen, da dieser Hook ausdrücklich für genau diesen
Zweck in `Card.module.css` selbst gelesen (nicht gesetzt) wird.

**"Muted"-Textfarbe auf Glaskarten per Inline-Style statt Klassen-Override:** `Text`s
`tone="onScrim"` ist immer volldeckend weiß, es gibt keine gedämpfte Zwischenstufe für die
bisherigen `--glass-text-muted`-Zeilen (Episodennummer/Klassifikation/Versionszähler/Release-
Metazeilen). Ein CSS-Klassen-Override in `EpisodeGlassCard.module.css`/`ReleasePreviewRow.
module.css` hätte um dieselbe `color`-Eigenschaft wie `Text`s eigene Variantenklasse konkurriert
(Cross-Modul-Spezifitätsgleichstand). Gelöst über einen gemeinsamen Inline-Style-Konstant
(`mutedOnGlassTextStyle`, jetzt in `episodePreviewFormat.ts`, von beiden Dateien genutzt) --
gewinnt garantiert, unabhängig von Bündel-Ladereihenfolge.

**`ReleasePreviewRow`s Flex-Row-Layout in einem inneren `.row`-Wrapper statt auf `Card`s
Wurzelelement:** aus demselben Cross-Modul-Spezifitätsgrund (`Card`s `.cardGlassStrong` setzt
`display:grid`/`padding:0` für ALLE Aufrufer) lebt das Zeilen-Layout + der Innenabstand in einem
inneren `<div className={styles.row}>` statt direkt auf `<Card>` selbst.

**`EpisodeGlassCard`s Episodentitel bleibt `Text`, nicht `Heading`:** Der Plan erlaubte explizit
beide Optionen ("Episodentitel als `Heading level={3}` falls fachlich passend, sonst `Text`").
Entscheidung: `Text` (keine `Heading`), da viele wiederholte `<h3>`-Elemente pro Episode in einer
potenziell langen Liste die Screenreader-Überschriftennavigation eher verrauschen als
verbessern würden -- keine LOCKED-Vorgabe, bei Bedarf in der Live-UAT revidierbar.

### Ausgelassene/Nicht umgesetzte Punkte

Keine -- alle 15 Tasks und alle expliziten Abnahme-Pflichten wurden umgesetzt.

## Unabhängige Code-Review-Korrekturrunde (nach Task 15)

Eine unabhängige, adversariale Code-Review (`261102-hlg-REVIEW.md`) fand sieben Warnungen und
zwei Info-Hinweise, keine Blocker. Alle sieben Warnungen wurden behoben:

- **W1** (Banner-Verdunklung bisher nicht in der UAT-Checkliste): oben in die Checkliste
  aufgenommen, kein Code-Fix (die Verdunklung selbst ist die laut Decision 2 verlangte Funktion).
- **W2** (Tönungsformel reproduzierte "mixed" nicht exakt, nur "recap" war als Abweichung
  dokumentiert): `Card` bekam vier neue, optionale Feinjustierungs-Props
  (`tintSaturation`/`tintLightness`/`tintSurfaceAlpha`/`tintBorderAlpha`); `EpisodeGlassCard`
  übergibt jetzt für "mixed" UND "recap" ihre exakten ursprünglichen Werte -- beide Tönungen
  reproduzieren die bisherige Optik jetzt wieder vollständig, bei weiterhin domänenneutraler
  `Card`-API. Mit Regressionstest (`FansubVersionBrowser.test.tsx`, prüft das tatsächliche
  Render-Ergebnis statt Quelltext-Rohtext).
- **W3** (Info-Karte: `padding`/`display` direkt auf `Card` statt in einem Wrapper, derselbe
  Cross-Modul-Spezifitätsgleichstand wie beim bereits per Hook gelösten `border-radius`):
  Innenlayout in ein neues `.infoCardBody`-Element verschoben (analog zu `ReleasePreviewRow`s
  `.row`-Wrapper), `.infoCard` selbst setzt nur noch den `--card-radius-override`-Hook.
- **W4** (`--linkchip-glass-border` duplizierte `--border-on-media` als zweites Literal statt
  es zu referenzieren): auf `var(--border-on-media)`/`var(--border-on-media-strong)` umgestellt.
- **W5** (`.posterDivider`/`.divider` -- die namensgebenden Ursprungs-Selektoren von
  `--border-on-media`/`-strong` -- nutzten die neuen Tokens selbst nicht): beide auf die
  jeweiligen Tokens umgestellt; zusätzlich `.statsRow`/`.relatedSection`s Rand-Literale aus
  demselben Grund mit umgestellt.
- **W6** (mehrere beim 450-Zeilen-Split unübersetzt übernommene englische Kommentare): alle
  genannten Stellen plus weitere beim Nachprüfen gefundene (z. B. "Page Container", "Responsive
  Design", "Genres") ins Deutsche übersetzt.
- **W7** (totes CSS `.edgeNavigation`, beim Split übersehen): entfernt.
- **IN-01** (inkonsistentes `tone="onScrim"` neben wirkungslosem Inline-Style): in
  `ReleasePreviewRow.tsx` entfernt, jetzt konsistent mit `EpisodeGlassCard.tsx`.
- **IN-02** (ungültiges `<div>` als `<ul>`-Kind in `FansubVersionBrowser.tsx`): vorbestehend,
  nicht durch diesen Auftrag verursacht, nicht behoben (außerhalb des Scopes, siehe Review).

Zusätzlich im selben Durchgang behoben: mehrere bare Planungs-/Entscheidungs-Verweise
("261102-hlg", "D-05" u. ä.) in neu geschriebenen Kommentaren, die gegen die Projektregel
"Kommentare erklären fachlich, nicht historisch" verstießen -- fachlich umformuliert, ohne
Bedeutungsverlust. Voller Regressionslauf nach der Korrekturrunde: `typecheck`/`lint` unverändert
grün (220 vorbestehende Lint-Probleme, keines in berührten Dateien), volle Vitest-Suite 454/455
Dateien, 5475/5478 Tests grün (1 bewusst skip, 3 todo), `test-storybook --ci` 62/62 Suiten, 317/317
Tests grün, Live-Nachweis `/anime`+`/anime/8` erneut bestätigt (200, "25 Folgen", kein "P0 MVP").

## Bekannte optische Punkte für die menschliche Live-UAT

Rein visuelle Punkte, die automatisiert nicht abschließend geprüft werden können (kein
Screenshot-Vergleich in diesem autonomen Lauf) -- Checkliste für die abschließende Live-Abnahme:

- [ ] **Bannerhintergrund der Detailseite ist jetzt sichtbar abgedunkelt (~45 % Scrim):** vor
      diesem Auftrag war das vorhandene `.bannerOverlay` per `display: none` komplett unwirksam
      -- die Detailseite hatte faktisch GAR KEINE Verdunklung über dem Bannerbild.
      `BannerSection` rendert jetzt immer einen Scrim-Layer (das ist Teil der ursprünglichen
      Entscheidung "Bannerbild/Backdrop als Hintergrund MIT deckender Abdunklung"). Das ist die
      deutlichste optische Veränderung dieses Auftrags -- bitte in der Live-UAT gezielt
      gegenprüfen und bestätigen, dass die jetzt tatsächlich wirksame Verdunklung gewünscht ist
      (unabhängige Code-Review fand dies live bestätigt, siehe `261102-hlg-REVIEW.md` W1).
- [ ] **Info-Karte der Detailseite:** sieht auf Desktop jetzt durchgehend wie eine dunkle
      Glasfläche aus (vorher: oben hell/weiß, nach unten ausblassend zu dunkel). Das ist die
      bewusst gewollte Umstellung auf `Card variant="glass"` (LOCKED Decision 5), keine
      versehentliche Regression -- bitte in der Live-UAT bestätigen, dass die neue, durchgehend
      dunkle Optik gewünscht ist.
- [ ] **Episoden-Rückblick- und -Gemischt-Tönung (recap/mixed):** nach der Review-Korrekturrunde
      bekommen BEIDE jetzt wieder exakt ihre ursprünglichen Sättigungs-/Helligkeits-/
      Deckkraft-Werte (über `Card`s optionale `tintSaturation`/`tintLightness`/
      `tintSurfaceAlpha`/`tintBorderAlpha`-Props statt einer rein generischen Formel) -- die
      Optik sollte dadurch 1:1 wie vor diesem Auftrag aussehen; trotzdem visuell gegenprüfen.
- [ ] **`DisclosureTrigger`-Pfeilsymbol auf der Episodenkarte:** nutzt weiterhin
      `DisclosureIndicator`s Standardfarbe (`--ui-arrow`, dunkles Weinrot) -- `DisclosureIndicator`
      bietet aktuell keine "auf dunkler Fläche"-Variante. Das Symbol bleibt funktional
      sichtbar (Form/Kontrastkern durch Hintergrund), aber die Farbe selbst ist nicht an die
      neue Glasoptik angepasst. Kein Fix in diesem Auftrag (wäre eine Erweiterung von
      `DisclosureIndicator`s API, außerhalb des deklarierten Scopes) -- für einen künftigen
      Durchgang vormerken, falls in der Live-UAT als störend wahrgenommen.
- [ ] **`ReleasePreviewRow`s Avatar-Logo-Größe:** `Avatar size="sm"` ist 32px, das bisherige
      `<Image>` war 36x36px -- minimal kleiner, visuell gegenprüfen.
- [ ] **`EpisodeGlassCard`s Episodentitel-Schriftgröße:** `Text variant="body"` (16px) statt der
      bisherigen 18px -- 2px kleiner, visuell gegenprüfen.
- [ ] **Drei-Ebenen-Storybook-Katalog** (`Grundbausteine/Card` inkl. "Glas auf Hintergrund",
      `Zusammengesetzte Bausteine/EpisodenKarte`/`Release-Versionszeile`, `Im Einsatz/Öffentlich/
      Anime-Liste`+`Anime-Detail`): visuell durchklicken und bestätigen, dass alle Zustände wie
      erwartet aussehen (automatisiert nur auf Render-Erfolg + Accessibility-Smoke geprüft, siehe
      62/62 `test-storybook`-Suiten grün).

## Deferred Items (außerhalb des Scopes, nicht behoben)

- `src/app/admin/fansubs/releaseReviews.test.tsx` zeigte in EINEM vollen Testlauf eine
  Testlauf-Reihenfolge-Flakiness (isoliert + im finalen vollen Lauf beide Mal grün) -- unrelated
  Admin-Datei, nicht von diesem Auftrag berührt, nicht behoben (Scope-Grenze).
- 220 ESLint-Probleme (4 Fehler, 216 Warnungen) bestehen repo-weit bereits vor diesem Auftrag in
  nicht berührten Dateien -- nicht behoben (Scope-Grenze).
- Abschnitt "Weitere öffentliche Karten-/Glas-Flächen außerhalb dieses Auftrags" in
  `261102-cb2-EINORDNUNG.md` listet weitere Kandidatenseiten (Fansub-Hero-Scrim, Projekt-/
  Release-Detailseiten, Mitgliederprofil) für einen künftigen Seiten-Durchgang -- bewusst NICHT
  tiefenanalysiert, nur als Grep-Fund dokumentiert.

## Finale Datei-/Story-Liste

### Neue Dateien
- `frontend/src/components/ui/LinkChip.tsx`/`.module.css`/`.stories.tsx`
- `frontend/src/components/ui/BannerSection.tsx`/`.module.css`/`.stories.tsx`
- `frontend/src/app/anime/[id]/AnimeDetailView.styles.ts`
- `frontend/src/app/anime/[id]/page.poster.module.css`/`page.infoCard.module.css`/`page.episodes.module.css`
- `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx`
- `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx`

### Geänderte Dateien (Produktionscode)
- `frontend/src/styles/tokens/components.css` (neue Token-Sektionen: LinkChip, BannerSection,
  Card-Glas-Varianten + Tönungs-Hook, `--border-on-media*`)
- `frontend/src/components/ui/Card.tsx`/`.module.css`/`.stories.tsx`
- `frontend/src/components/ui/index.ts` (LinkChip/BannerSection/ResponsiveImage exportiert)
- `frontend/src/app/anime/[id]/page.module.css`, `AnimeDetailView.tsx`, `AnimeDetailView.stories.tsx`
- `frontend/src/app/anime/AnimeListView.tsx`, `AnimeListLoading.tsx`, `page.module.css`,
  `AnimeListView.stories.tsx`
- `frontend/src/components/fansubs/EpisodeGlassCard.tsx`/`.module.css`
- `frontend/src/components/fansubs/ReleasePreviewRow.tsx`/`.module.css`
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx`
- `frontend/src/components/fansubs/episodePreviewFormat.ts` (neuer geteilter
  `mutedOnGlassTextStyle`-Export)

### Geänderte Testdateien
- `frontend/src/app/anime/[id]/page.test.tsx`, `page.performance.test.ts`
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`

### Dokumentation
- `CLAUDE.md`, `docs/FRONTEND_ARCHITEKTUR.md` (28 Grundbausteine/25 Zusammengesetzte Bausteine/
  7 Im Einsatz, beide Dateien jetzt konsistent; neue Bausteine + "öffentliche Optik ist eine
  zweite offizielle Erscheinung"-Grundsatz)
- `.planning/quick/261102-cb2-team4s-storybook-grundlage-fuer-ganze-se/261102-cb2-EINORDNUNG.md`

### Storybook-Kategorien (final, real nachgezählt)
- **Grundbausteine/\*:** 28 Stories (neu: `LinkChip`)
- **Zusammengesetzte Bausteine/\*:** 25 Stories (neu: `BannerSection`, `EpisodenKarte`,
  `Release-Versionszeile`)
- **Im Einsatz/\*:** 7 Stories (unverändert in der Anzahl, zwei Pilot-Stories mit aktualisierter
  Autodocs-Beschreibung)

## Self-Check: PASSED

- `frontend/src/components/ui/LinkChip.tsx` FOUND
- `frontend/src/components/ui/BannerSection.tsx` FOUND
- `frontend/src/components/fansubs/EpisodeGlassCard.stories.tsx` FOUND
- `frontend/src/components/fansubs/ReleasePreviewRow.stories.tsx` FOUND
- `frontend/src/app/anime/[id]/AnimeDetailView.styles.ts` FOUND
- `frontend/src/app/anime/[id]/page.poster.module.css` FOUND
- Commits `ebf64a921`..`fdac0e686` FOUND in `git log --oneline`

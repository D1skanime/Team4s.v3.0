---
task: 261105-qr1
title: Phase-192-Review Befunde 4 (unabhängiger Review, Runde 1 von 1)
subsystem: ui
tags: [react, nextjs, css-modules, design-system, css-custom-properties]

requires:
  - phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
    provides: AnimeDetailHero, MediaFrame, Card, Stack, Cluster, AnimeMediaProvider, compositeLayoutPurity.guard.test.ts
provides:
  - MediaFrame widthPurpose="posterHero" (drei haltepunktabhängige Breiten-Stufen)
  - Card.module.css vervollständigte .cardPublicPoster/.cardPublicHeroInfo responsive Details (keine neue Prop)
  - Stack alignBelowMd (Override-Hook mit Fallback-Kette, 767px)
  - Cluster justifyBelowMd + growFirstChild (footgun-sicher auf Einzelstufen- UND innerem Zweistufen-Pfad platziert)
  - AnimeMediaProvider.module.css (eigenes Stylesheet für AnimeTitleLogo)
  - AnimeDetailHero.tsx/.module.css auf alle fünf Fähigkeiten migriert, keine width/height-Layout-Deklaration mehr
affects: [frontend-ui-design-system, anime-detail-page]

tech-stack:
  added: []
  patterns:
    - "MediaFrame widthPurpose als haltepunktabhängige CSS-Modifikatorklasse statt Inline-Style (drei responsive Stufen, die eine einzelne CSS Custom Property per Inline-Style nicht ausdrücken kann)"
    - "Stack/Cluster *BelowMd-Props als generischer Override-Hook (CSS-Variable mit Fallback-Kette), identisch zu Cards --card-padding-override/--card-width-override-Muster, NICHT zu Button.fullWidthBelowMds hartcodierter Boolean-Modifikatorklasse"
    - "Cluster growFirstChild auf BEIDEN Rendering-Pfaden (Einzelstufen- UND inneres Zweistufen-Flex-Element bei collapseBelow/float), NIE auf dem äußeren Zweistufen-Wrapper"

key-files:
  created:
    - frontend/src/components/anime/AnimeMediaProvider.module.css
  modified:
    - frontend/src/components/ui/MediaFrame.tsx
    - frontend/src/components/ui/MediaFrame.module.css
    - frontend/src/components/ui/Card.module.css
    - frontend/src/components/ui/Stack.tsx
    - frontend/src/components/ui/Stack.module.css
    - frontend/src/components/ui/Cluster.tsx
    - frontend/src/components/ui/Cluster.module.css
    - frontend/src/components/anime/AnimeMediaProvider.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.tsx
    - frontend/src/app/anime/[id]/AnimeDetailHero.module.css
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "growFirstChild wird in GENAU ZWEI der drei Cluster-classNames(...)-Aufrufstellen gesetzt (Einzelstufen-Pfad + inneres Zweistufen-Flex-Element), NICHT auf dem äußeren .clusterQueryContainer-Wrapper -- sonst griffe .clusterGrowFirstChild > :first-child auf das innere Wrapper-<div> selbst, ein stiller No-Op (verifiziert per grep -c == 2)."
  - "Beim Anfassen von Cluster.module.css/Cluster.tsx wurden zusätzlich mehrere vorbestehende ASCII-Umlaut-Reste aus einem früheren Phase-192-Commit (abdc87796) behoben (AEUSSERE/ausfuehrliche/Begruendung/vollstaendig/haelt/ueber/regulaer/darueberliegenden/Bloecke) -- derselbe Datei- und Komponentenbereich, den dieser Auftrag ohnehin für justifyBelowMd/growFirstChild anfasst."
  - "Drei ASCII-Umlaut-Reste in docs/FRONTEND_ARCHITEKTUR.md (Zeilen 275/277/279, 'fuer'/'kuenftiger'/'oeffentlich' u.a.) stammen nachweislich aus einem unrelated Phase-191-Commit (d401552bc, Contributions-Feature) und wurden NICHT angefasst -- außerhalb des Scopes dieses Phase-192-Nachbesserungsdurchgangs, siehe 'Bekannte Altlast' unten."

requirements-completed: []

duration: 10min
completed: 2026-11-05
---

# Phase-192-Review Befunde 4 (unabhängiger Review, Runde 1 von 1) Summary

**MediaFrame widthPurpose="posterHero" + Stack alignBelowMd + Cluster justifyBelowMd/growFirstChild ersetzen das letzte eigene Layout-CSS in AnimeDetailHero.module.css (Posterbreite, Titel-Logo-Zeile, Mobil-Zentrierung)**

## Performance

- **Duration:** ~10 min (erster bis letzter Commit)
- **Started:** 2026-11-05T12:41:35+00:00
- **Completed:** 2026-11-05T12:51:12+00:00
- **Tasks:** 5
- **Files modified:** 11 (+ 1 neu angelegt)

## Accomplishments

- `MediaFrame` kennt eine neue `widthPurpose="posterHero"`-Fähigkeit (drei haltepunktabhängige
  Breiten-Stufen: 260px/220px/160px), die exakt das bisherige `.posterWrapper`-Verhalten
  reproduziert -- `AnimeDetailHero.module.css` trägt danach keine eigene `width`-Deklaration
  mehr (bis auf die unverändert aus dem Scope ausgenommene `.posterMetaCard`
  `border-width:0`-Größenkorrektur, siehe unten).
- `Card.module.css` absorbiert die responsiven Details von `.cardPublicPoster`/
  `.cardPublicHeroInfo` (Stack-Wachstum, Mobil-Zentrierung, Mobil-`text-align`) über reines CSS,
  ohne neue Prop -- empirisch gegen Next.js' tatsächliche Turbopack- UND Storybook-Webpack-
  CSS-Modules-Pipeline verifiziertes CSS-Nesting (`& > :last-child`).
- `Stack` kennt eine neue `alignBelowMd`-Prop (CSS-Variable mit Fallback-Kette nach Cards
  `--card-padding-override`-Muster, NICHT nach `Button.fullWidthBelowMd`s hartcodierter
  Boolean-Modifikatorklasse), die `.posterMeta`/`.genresSection`s lokale Mobil-`align-items`-Regeln
  vollständig ersetzt.
- `Cluster` kennt zwei neue Props (`justifyBelowMd`, `growFirstChild`); `growFirstChild` sitzt
  korrekt auf dem Einzelstufen-Pfad UND dem inneren Flex-Element des Zweistufen-Pfads
  (`collapseBelow="md"`), NICHT auf dem äußeren `.clusterQueryContainer`-Wrapper -- der im
  Research dokumentierte Fallstrick wurde vermieden (`grep -c clusterGrowFirstChild` == `2`).
- `AnimeTitleLogo` bringt ihre intrinsische Darstellung (`flex-shrink`/`width`/`max-height`/
  `object-fit`) jetzt über ein eigenes, co-lokiertes Stylesheet mit (`AnimeMediaProvider.module.css`)
  statt über eine vom Aufrufer übergebene `className`.
- `AnimeDetailHero.tsx`/`.module.css` sind auf alle fünf Fähigkeiten migriert;
  `docs/FRONTEND_ARCHITEKTUR.md` dokumentiert alle vier neuen Primitiv-Fähigkeiten im bestehenden
  Primitives-Absatz mit dem korrekten Vorbild (Cards Override-Hook-Muster statt
  `Button.fullWidthBelowMd`).
- Finaler Typecheck (`cd frontend && npx tsc --noEmit`) ist nach allen fünf Tasks fehlerfrei.
  Es wurde zu keinem Zeitpunkt `npx vitest run` ausgeführt (bindende Scope-Einschränkung,
  siehe CONTEXT.md "Scope-Korrektur").

## Task Commits

1. **Task 1: MediaFrame widthPurpose="posterHero" + Card-Varianten vervollständigen** - `95294968a` (feat)
2. **Task 2: Stack alignBelowMd + Cluster justifyBelowMd/growFirstChild (footgun-sichere Platzierung)** - `7d3584f64` (feat)
3. **Task 3: AnimeTitleLogo -- eigenes co-lokiertes Stylesheet** - `e809d84b4` (feat)
4. **Task 4: AnimeDetailHero-Migration + Dokumentation** - `626449362` (feat)
5. **Task 5: Abschluss-Selbstprüfung (ASCII-Umlaute/Planungsverweise/Zeilenlängen/finaler Typecheck)** - `f62278585` (fix)

_Hinweis: keine TDD-Tasks, keine separate Plan-Metadaten-Commit außerhalb dieser SUMMARY (Quick-Task-Konvention)._

## Files Created/Modified

- `frontend/src/components/ui/MediaFrame.tsx` - `widthPurpose?: MediaFrameWidthPurpose` Prop + `classNames(...)`-Eintrag
- `frontend/src/components/ui/MediaFrame.module.css` - `.mediaFrameWidthPosterHero` (3 Haltepunkt-Stufen)
- `frontend/src/components/ui/Card.module.css` - `.cardPublicPoster`/`.cardPublicHeroInfo` responsive Details vervollständigt (CSS-Nesting, keine neue Prop)
- `frontend/src/components/ui/Stack.tsx` - `alignBelowMd`-Prop, `--stack-align-below-md` in beiden Render-Pfaden
- `frontend/src/components/ui/Stack.module.css` - `@media (max-width: 767px)`-Override-Hook-Regel
- `frontend/src/components/ui/Cluster.tsx` - `justifyBelowMd`/`growFirstChild`-Props, footgun-sichere Platzierung auf 2 von 3 `classNames(...)`-Stellen; pre-existing ASCII-Umlaut-Rest (`Bloecke`) behoben
- `frontend/src/components/ui/Cluster.module.css` - `@media`-Override-Hook-Regel + `.clusterGrowFirstChild > :first-child`; pre-existing ASCII-Umlaut-Reste aus Commit `abdc87796` behoben
- `frontend/src/components/anime/AnimeMediaProvider.tsx` - `AnimeTitleLogo` nutzt `classNames(styles.titleLogo, className)`
- `frontend/src/components/anime/AnimeMediaProvider.module.css` *(neu)* - `.titleLogo`-Regel
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` - Poster-Wrapper entfernt, 5 neue Props an den jeweiligen Stack/Cluster-Aufrufstellen ergänzt, pre-existing Planungsverweis-Kommentar ("192-RESEARCH.md") fachlich umformuliert
- `frontend/src/app/anime/[id]/AnimeDetailHero.module.css` - 10 migrierte Layout-Deklarationen entfernt
- `docs/FRONTEND_ARCHITEKTUR.md` - 4 neue Primitiv-Fähigkeiten im Primitives-Absatz dokumentiert

## Decisions Made

- **Beim Anfassen von Cluster.tsx/.module.css zusätzlich behoben:** mehrere vorbestehende
  ASCII-Umlaut-Ersetzungen aus einem früheren Phase-192-Commit (`abdc87796`,
  `feat(192-25): .edgeNavigationOverlay/.posterMetaCard -> Cluster float="controlBand"/Card
  bleedBelowMd`) im selben Datei-/Komponentenbereich, den dieser Auftrag ohnehin für
  `justifyBelowMd`/`growFirstChild` anfasst (`AEUSSERE`→`ÄUSSERE`, `ausfuehrliche`→`ausführliche`,
  `Begruendung`→`Begründung`, `vollstaendig`→`vollständig`, `haelt`→`hält`, `ueber`→`über`,
  `regulaer`→`regulär`, `darueberliegenden`→`darüberliegenden`, `Bloecke`→`Blöcke`).
- **Bewusst NICHT angefasst:** drei ASCII-Umlaut-Reste in `docs/FRONTEND_ARCHITEKTUR.md`
  (Zeilen 275/277/279: `fuer`, `kuenftiger`, `oeffentlich` u.a.). Per `git log -L` verifiziert:
  diese Zeilen stammen aus Commit `d401552bc` (`feat(191-36): ...`), einem vollständig
  unrelated Phase-191-Feature (Beitrags-Hinweis-Workflow), nicht aus diesem oder einem
  vorherigen Phase-192-Durchgang. Fixen hätte eine unzusammenhängende, mehrere Absätze
  umfassende Textstelle außerhalb des eigentlichen Primitives-Absatzes (Zeile 215, den dieser
  Auftrag tatsächlich bearbeitet hat) berührt -- Scope-Grenze bewusst nicht überschritten
  (siehe "Bekannte Altlast" unten).
- Die Breiten-/Ausrichtungs-/Zentrierungs-Begründung oberhalb des 767px-Mobil-Blocks in
  `AnimeDetailHero.module.css` wurde nach der Migration aktualisiert (beschreibt jetzt korrekt,
  dass die Logik in den Grundbausteinen lebt, nicht mehr lokal in dieser Datei).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Dokumentationsqualität/CLAUDE.md-Durchsetzung] Planungsverweis in AnimeDetailHero.tsx fachlich umformuliert**
- **Found during:** Task 4 (Doku-Sweep während der Migration)
- **Issue:** Der Komponentendoku-Kommentar verwies auf `192-RESEARCH.md Pitfall 3` -- ein
  Planungsartefakt-Verweis im Produktcode, verboten laut CLAUDE.md "Dokumentation wächst mit
  dem Code" (gilt beim Anfassen der Datei, unabhängig davon, ob der Verweis aus einem früheren
  Durchgang stammt).
- **Fix:** Verweis entfernt, fachliche Begründung (zwei direkte Card-Geschwister würden die
  responsive Zwei-Spalten-Logik verlieren) unverändert erhalten.
- **Files modified:** `frontend/src/app/anime/[id]/AnimeDetailHero.tsx`
- **Verification:** `grep -n "192-RESEARCH\|RESEARCH.md"` liefert keinen Treffer mehr.
- **Committed in:** `626449362` (Task 4 Commit)

**2. [Rule 2 - Dokumentationsqualität/CLAUDE.md-Durchsetzung] Pre-existing ASCII-Umlaut-Reste in Cluster.tsx/.module.css behoben**
- **Found during:** Task 5 (Abschluss-Selbstprüfung, erweiterter Sweep über die reine
  Plan-Akzeptanzkriterium-Regex hinaus, da diese nur isolierte Zwei-Buchstaben-Tokens erfasst,
  keine mid-word-Ersetzungen wie "fuer"/"haelt")
- **Issue:** Acht ASCII-Umlaut-Ersetzungen im `float="controlBand"`-Kommentarblock
  (`Cluster.module.css`) und zwei im `labelWithTrailingMeta`-Doku-Kommentar (`Cluster.tsx`),
  beide aus früheren Phase-192-Commits, in Dateien, die dieser Auftrag ohnehin für
  `justifyBelowMd`/`growFirstChild` anfasst.
- **Fix:** Alle zehn Fundstellen durch korrekte Umlaute ersetzt, keine fachliche Aussage
  verändert.
- **Files modified:** `frontend/src/components/ui/Cluster.module.css`,
  `frontend/src/components/ui/Cluster.tsx`
- **Verification:** Erweiterter mid-word-Grep (`[a-zA-Z]*(ae|oe|ue)[a-zA-Z]*`) zeigt für beide
  Dateien danach nur noch legitime Treffer (Code-Bezeichner wie `clusterQueryContainer`,
  korrekte deutsche Wörter wie `Querachsen`/`Steuerelement`/`aktuell`).
- **Committed in:** `f62278585` (Task 5 Commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 2 / CLAUDE.md-Dokumentationsdisziplin beim
Anfassen einer Datei, keine architektonischen oder funktionalen Abweichungen vom Plan).
**Impact on plan:** Keine. Beide Fixes sind reine Kommentartext-Korrekturen in Dateien, die der
Plan ohnehin ändert -- kein Scope-Creep über die fünf geplanten Tasks hinaus.

## Issues Encountered

**Literal `grep -cP` width/height-Prüfung ergibt 2, nicht 0 (erwartet, kein Befund):**
Die in Task 4 und der übergreifenden `<verification>` vorgegebene Prüfung
`grep -cP '(?<!min-)(?<!max-)\b(width|height)\s*:' AnimeDetailHero.module.css` liefert `2`
statt `0`. Beide Treffer sind die unverändert aus dem Scope dieses Befundes ausgenommene
`.posterMetaCard`-Korrektur (`border-width: 0;`, plus ihr erklärender Kommentar) -- `\b` matched
an der Bindestrich-Grenze von `border-width` genauso wie bei einem eigenständigen
`width:`-Token, obwohl der tatsächliche Komposit-Reinheits-Wächter (`isSizeResetValue`) diesen
Fall korrekt als Null-Rücksetzer exempt behandelt (`border-width: 0` ist laut CONTEXT.md
"NICHT Teil dieses Befundes", "Guard erfasst sie korrekt nicht als Verstoß"). Alle zehn
tatsächlich migrierten Layout-Deklarationen (`.posterWrapper`-Breite, `.title`-`flex`,
`.titleLogo`, `.statsRow`-`align-items`, drei Mobil-`align-items`-Stellen, `.infoCardBody`-
`text-align`, der `justify-content`-Mobil-Block) sind nachweislich entfernt (siehe
`git diff`-Bestätigung im Task-4-Commit). Kein echter Befund-1-Rückfall.

## User Setup Required

None - keine externe Dienstkonfiguration nötig.

## Bekannte, bewusst zurückgestellte Punkte (laut Scope-Korrektur in CONTEXT.md)

Diese fünf Punkte sind **keine vergessenen Aufgaben**, sondern laut der bindenden
Scope-Korrektur in `261105-qr1-CONTEXT.md` bewusst auf NACH der Live-Abnahme verschoben:

1. **Guard-Schärfung:** `compositeLayoutPurity.guard.test.ts`s `isSizeResetValue`-Funktion
   verliert in einer künftigen Runde ihre `/^var\(--[\w-]+\)$/`-Ausnahme für `width`/`height`
   vollständig. Nicht in dieser Runde umgesetzt (Wächter-/Testarbeit, vor der Live-Abnahme
   ausgeschlossen). Der Guard bleibt unverändert funktionsfähig und lässt die neue, jetzt
   grundbaustein-basierte Lösung weiterhin durch (kein Regressionsrisiko).
2. **Befund 2 (fireEvent in Testdateien):** `FansubVersionBrowser.test.tsx`/
   `WatchlistAddButton.test.tsx` wurden in dieser Runde NICHT angefasst -- reine
   Testdatei-Arbeit, komplett außerhalb des Scopes dieses Produktcode-Durchgangs.
3. **Storybook-Stories für die vier neuen Primitiv-Fähigkeiten** (`MediaFrame.stories.tsx`
   `widthPurpose="posterHero"`, `Stack.stories.tsx` `alignBelowMd`, `Cluster.stories.tsx`
   `justifyBelowMd`/`growFirstChild`): nicht ergänzt. Stories lösen potenziell den
   Storybook-Test-Runner aus und fallen laut Scope-Korrektur unter dieselbe
   Wächter-Zurückhaltung. "Stories ziehen mit" ist hier bewusst zurückgestellt.
4. **Zero-Pixel-Diff-Nachweis (Playwright):** entfällt ersatzlos für diese Runde ("keine
   Pixelvergleiche" laut Scope-Korrektur). Visuelle Bestätigung (Posterbreite, Titel-Logo-Zeile
   bei langem Titel, Info-Karten-Zentrierung auf Mobilbreite) bleibt Aufgabe der nachfolgenden
   Live-UAT durch den Menschen.
5. **Kein `npx vitest run`:** zu keinem Zeitpunkt in diesem gesamten Durchgang ausgeführt
   (weder gezielt noch vollständig) -- jede Verifikation lief ausschließlich über `grep`-Nachweise
   gegen den tatsächlichen Dateiinhalt oder `npx tsc --noEmit`.

Zusätzlich, als genuine Altlast (nicht durch diese Aufgabe verursacht, siehe "Decisions Made"):
drei ASCII-Umlaut-Reste in `docs/FRONTEND_ARCHITEKTUR.md` (Zeilen 275/277/279) aus einem
unrelated Phase-191-Commit (`d401552bc`) bleiben unangetastet -- außerhalb des Scopes dieses
Phase-192-Nachbesserungsdurchgangs.

## Next Phase Readiness

- Der einzige für diese Runde freigegebene [high]-Befund (eigenes Layout-CSS in
  `AnimeDetailHero.module.css`) ist vollständig behoben; `AnimeDetailHero.module.css` deklariert
  keine width-/height-Layout-Eigenschaft mehr.
- Live-Browser-UAT (Posterbreite auf allen drei Haltepunkten, Titel-Logo-Zeile bei langem Titel,
  Info-Karten-/Badges-/Tags-/Stats-Zentrierung auf Mobilbreite) steht als abschließende
  menschliche Prüfung noch aus (gemäß `ki-run`-Workflow, kein Zwischen-Checkpoint in diesem
  Auftrag).
- Guard-Schärfung, Befund 2, Stories und Zero-Pixel-Diff-Nachweis sind für eine Folgerunde nach
  der Live-Abnahme vorgemerkt (siehe oben).

## Self-Check: PASSED

- `frontend/src/components/ui/MediaFrame.tsx` enthält `widthPurpose`: FOUND
- `frontend/src/components/ui/MediaFrame.module.css` enthält `.mediaFrameWidthPosterHero`: FOUND
- `frontend/src/components/ui/Stack.tsx` enthält `alignBelowMd`: FOUND
- `frontend/src/components/ui/Cluster.tsx` enthält `justifyBelowMd`/`growFirstChild`: FOUND
- `frontend/src/components/anime/AnimeMediaProvider.module.css` existiert, enthält `.titleLogo`: FOUND
- `frontend/src/app/anime/[id]/AnimeDetailHero.tsx` enthält `widthPurpose="posterHero"`: FOUND
- `docs/FRONTEND_ARCHITEKTUR.md` enthält `widthPurpose?: 'posterHero'`/`alignBelowMd`/`justifyBelowMd`/`growFirstChild`: FOUND
- Commit `95294968a`: FOUND (`git log --oneline --all`)
- Commit `7d3584f64`: FOUND
- Commit `e809d84b4`: FOUND
- Commit `626449362`: FOUND
- Commit `f62278585`: FOUND
- `grep -c clusterGrowFirstChild frontend/src/components/ui/Cluster.tsx` == `2`: CONFIRMED
- `grep -A3 "styles.clusterQueryContainer," frontend/src/components/ui/Cluster.tsx | grep -c clusterGrowFirstChild` == `0`: CONFIRMED
- `cd frontend && npx tsc --noEmit`: 0 Fehler: CONFIRMED
- ASCII-Umlaut-Sweep (mid-word, über die zwölf Dateien): 0 echte Ersetzungen in den elf
  Produktcode-Dateien; 3 bekannte, unrelated Altlast-Treffer in `docs/FRONTEND_ARCHITEKTUR.md`
  (siehe "Bekannte Altlast"): CONFIRMED
- Planungsverweis-Sweep (Befund/Runde/261105-qr1/qr1-CONTEXT/qr1-RESEARCH/Phase 192) über alle
  zwölf Dateien: 0 Treffer: CONFIRMED
- `wc -l` über alle zwölf Dateien: alle ≤ 450 Zeilen (größte: `Card.module.css` 321 Zeilen): CONFIRMED
- Zu keinem Zeitpunkt wurde `npx vitest run` ausgeführt: CONFIRMED (kein Kommando-Aufruf in
  diesem gesamten Durchgang)
- `git status --short` (Code-Dateien): clean (nur `.planning/`-Artefakte untracked): CONFIRMED

---
*Task: 261105-qr1*
*Completed: 2026-11-05*

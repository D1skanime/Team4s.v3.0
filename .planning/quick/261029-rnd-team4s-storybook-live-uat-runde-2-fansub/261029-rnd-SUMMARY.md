---
phase: quick-261029-rnd
plan: 01
subsystem: frontend-ui-tooling
tags: [storybook, design-system, accessibility, typography, iconbutton, navarrow, accordion]
dependency-graph:
  requires:
    - phase: quick-261029-i1y
      provides: Storybook-Dreiteilung Grundbausteine/Zusammengesetzte Bausteine/Im Einsatz, DialogHeader/IconButton/Spinner/StatusIcon-Grundbausteine, Fansub-Hero-Kontrastmuster (Titel/Subtitle/HeroMetrics)
  provides:
    - Fansub-Hero-Status-Badge-Kontrastfix (Chip-Token-Override-Muster fortgeführt, >=4,5:1 rechnerisch und live verifiziert)
    - Modal/Drawer "Geöffnet"-Stories ohne Klick offen
    - Gemeinsames --radius-surface-Token für Card/Modal/Drawer auch mobil
    - IconButton-Variante 'ghost' + NavArrow darauf umgestellt (sm/md/lg statt default/large)
    - Accordion nutzt DisclosureIndicator statt eigenem Pfeil-Nachbau
    - Automatische Katalogprüfung (catalogTaxonomy.test.ts) gegen stillschweigende Grundbaustein-Verbünde
    - Zehn Komponenten + NavArrow nach Zusammengesetzte Bausteine/* umsortiert
    - Neue Typografie-Grundbausteine Heading (level/size getrennt) und Text (body/soft/meta/small)
    - PageHeader/SectionHeader/DialogHeader/Card pixelgleich auf Heading/Text umgestellt
    - Sechs neue "Größen und Varianten"-Übersichtsstories
    - Repo-weiter Umlaut-Sweep aller sichtbaren Story-Namen
    - Storybook stories-Glob um components/fansubs erweitert (Produktionsbug: Story wurde nie indexiert)
  affects:
    - CLAUDE.md, AGENTS.md, docs/FRONTEND_ARCHITEKTUR.md, frontend/.storybook/main.ts
tech-stack:
  added: []
  patterns:
    - "Heading/Text als geteilte Typografie-Grundbausteine: level (Tag) und size (visuelle Stufe) getrennt, variant per CSS-Variable mit Fallback überschreibbar"
    - "catalogTaxonomy.test.ts: automatische fs-basierte Prüfung gegen stillschweigende Grundbaustein-zu-Grundbaustein-Importe, mit begründeter EXCEPTIONS-Map statt stiller Duldung"
    - "IconButton variant='ghost' als Basis für visuell abweichende, aber strukturell identische Icon-Buttons (NavArrow)"
key-files:
  created:
    - frontend/src/components/ui/Heading.tsx
    - frontend/src/components/ui/Text.tsx
    - frontend/src/components/ui/catalogTaxonomy.test.ts
    - frontend/src/components/ui/typography.regression.test.ts
    - frontend/src/components/ui/TypographyOverview.stories.tsx
    - frontend/src/components/fansubs/FansubHeroSection.stories.tsx
  modified:
    - frontend/src/components/ui/Badge.module.css, "frontend/src/app/fansubs/[slug]/page.module.css" (Badge-Kontrastfix)
    - frontend/src/components/showcases/ModalInContextShowcase.tsx, ModalInContextShowcase.stories.tsx, DrawerShowcase.stories.tsx (Geöffnet-Stories)
    - frontend/src/components/ui/Card.module.css, Modal.module.css, Drawer.module.css (Radius-Token)
    - frontend/src/components/ui/IconButton.tsx, IconButton.module.css, NavArrow.tsx, NavArrow.module.css (ghost-Variante)
    - frontend/src/components/fansubs/MediaViewerStage.tsx (size="lg")
    - frontend/src/components/ui/Accordion.tsx, Accordion.module.css, frontend/eslint.config.mjs (DisclosureIndicator)
    - zehn *.stories.tsx unter components/ui (Umsortierung)
    - frontend/src/styles/globals.css (Typografie-Tokens)
    - frontend/src/components/ui/PageHeader.tsx/.module.css, SectionHeader.tsx/.module.css, DialogHeader.tsx/.module.css, Card.tsx/.module.css (Heading/Text-Migration)
    - frontend/.storybook/main.ts (stories-Glob erweitert)
    - CLAUDE.md, docs/FRONTEND_ARCHITEKTUR.md
decisions:
  - "NavArrow nach Zusammengesetzte Bausteine/NavArrow umsortiert (nicht in EXCEPTIONS aufgenommen): seine neue IconButton-Nutzung ist eine sichtbare Komposition, keine interne Implementierungsdetail wie Button->Spinner"
  - "SectionHeader ruft Heading mit size=3 fest auf, unabhängig von seinem eigenen level-Prop (2 oder 3), damit die visuelle Größe stabil bleibt, während der öffentliche level-Vertrag unverändert bleibt"
  - "SectionHeader .sectionDescription bekommt die VOLLE margin-Shorthand (margin: 6px 0 0), nicht nur margin-top, weil Text keinen eigenen margin-Reset vornimmt"
  - "Storybook stories-Glob um components/fansubs/** erweitert, da einzelne 'Im Einsatz'-Stories für bereits produktive Domänen-Komponenten direkt neben ihrer Komponente statt unter components/showcases/ liegen können"
requirements-completed: [261029-rnd-scope]
duration: 60min
completed: 2026-10-29
---

# Quick Task 261029-rnd: Storybook Live-UAT Runde 2 Summary

**Acht vom Menschen bei der ersten Live-Abnahme gefundene Befunde behoben: Fansub-Badge-Kontrastfix (live mit echten Datenbank-Daten verifiziert), Modal/Drawer-"Geöffnet"-Stories, gemeinsames Radius-Token auch mobil, IconButton-'ghost'-Variante mit NavArrow-Migration, Accordion auf DisclosureIndicator umgebaut, automatische Katalogprüfung gegen stillschweigende Grundbaustein-Kopplungen, zwei neue Typografie-Grundbausteine (Heading/Text) mit pixelgleicher Migration von PageHeader/SectionHeader/DialogHeader/Card, und ein repo-weiter Umlaut-Sweep.**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-10-29T20:27:00Z
- **Completed:** 2026-10-29T21:30:00Z
- **Tasks:** 15/15 completed
- **Files modified:** ~55 (siehe `git log --stat` der 15 Task-Commits)

## Accomplishments

- Der Status-Badge im Fansub-Hero-Banner einer aufgelösten Gruppe mit Bannerfoto ist jetzt lesbar (weißer Text auf dunkel getöntem Chip, ~9,3:1 Kontrast) — rechnerisch bewiesen UND live gegen eine echte Datenbank-Gruppe (`new-subs`, status `dissolved`, reales Bannerfoto) per Playwright-Screenshot verifiziert (computed styles `color: rgb(255,255,255)` / `background: rgba(255,255,255,.18)`).
- Modal- und Drawer-Showcases bieten je eine `Geöffnet`-Story, die ohne Klick offen startet — per Screenshot bestätigt.
- Card/Modal/Drawer nutzen auf Desktop UND in ihren Mobile-Media-Queries (außer den echten Vollbild-0-Fällen) denselben `--radius-surface`-Token; am echten Modal/Drawer bei 390×844 per Playwright bestätigt (Modal bleibt bei 0 auf Mobile, da echter Vollbild-Fall; Drawer zeigt `10px 0 0 10px`).
- `IconButton` hat eine dritte Variante `ghost`, tatsächlich in die `classNames`-Aufrufliste verdrahtet (per Test bewiesen, sonst wäre das CSS totes Gewebe geblieben). `NavArrow` rendert jetzt darüber, behält sein Aussehen/Verhalten, Größennamen sind `sm`/`md`/`lg`.
- `Accordion` nutzt `DisclosureIndicator` für sein Öffner-Symbol statt eines eigenen `▾`-Nachbaus; die native `button`-Kopfzeile bleibt mit fachlichem Kommentar begründete Ausnahme.
- Zehn Komponenten (Accordion, FocalCarousel, ThumbnailStrip, UploadFileRow, UploadDropzone, MediaSlot, Pagination, HeroMetrics, ActivationStatusIndicator, ArtworkHero) stehen jetzt unter `Zusammengesetzte Bausteine/*` mit „Besteht aus"-Hinweisen.
- Neue automatische Katalogprüfung (`catalogTaxonomy.test.ts`) lässt jeden nicht dokumentierten Grundbaustein-zu-Grundbaustein-Import unter `Grundbausteine/*` fehlschlagen — deckte während der Ausführung einen echten, vom Plan nicht vorhergesehenen Fall auf (siehe Deviations).
- Zwei neue Typografie-Grundbausteine `Heading` (level/size getrennt) und `Text` (body/soft/meta/small) — `PageHeader`/`SectionHeader`/`DialogHeader`/`Card` rendern jetzt darüber, byte-identisch zum vorherigen Aussehen (automatischer Regressionstest + volle Testsuite grün).
- Sechs neue "Größen und Varianten"-Übersichtsstories (DisclosureIndicator/Button/IconButton/Spinner/StatusIcon/Badge).
- Repo-weiter Umlaut-Sweep: kein sichtbarer Story-Name unter `components/ui/**`/`components/showcases/**` enthält mehr eine ASCII-Umlautersetzung (per vollständigem zweitem Scan bestätigt).
- CLAUDE.md/docs/FRONTEND_ARCHITEKTUR.md spiegeln den neuen Stand wider (reale Story-Zahlen 26/18/13 aus der laufenden Storybook-Instanz, nicht geschätzt).

## Task Commits

1. **Task 1: Fansub-Badge-Kontrastfix + erweiterter WCAG-Test** - `04436fe3b` (fix)
2. **Task 2: Modal/Drawer "Geöffnet"-Stories** - `6699150db` (feat)
3. **Task 3: Radius-Token-Vereinheitlichung inkl. mobil** - `c3fcc5f11` (refactor)
4. **Task 4: IconButton-Variante 'ghost' + NavArrow auf IconButton umstellen** - `bdfcdae91` (feat)
5. **Task 5: Accordion auf DisclosureIndicator umbauen** - `ab455afff` (refactor)
6. **Task 6: Zehn Komponenten nach Zusammengesetzte Bausteine/* umsortieren** - `8aff6018c` (docs)
7. **Task 7: Automatische Katalogprüfung** - `8be7bef31` (test)
8. **Task 8: Typografie-Skala-Tokens in globals.css** - `6037f43e8` (feat)
9. **Task 9: Neue Grundbausteine Heading und Text + Stories** - `9a5509565` (feat)
10. **Task 10: PageHeader/SectionHeader/DialogHeader/Card auf Heading/Text umstellen** - `cf92f407c` (refactor)
11. **Task 11: Storybook-Seite "Grundbausteine/Typografie"** - `1cad953a1` (docs)
12. **Task 12: Übersichts-Stories für sechs Bausteine** - `f05d6e4fe` (docs)
13. **Task 13: Repo-weiter Umlaut-Sweep** - `2ab7f55f7` (docs)
14. **Task 14: Dokumentation nachziehen** - `ab2439064` (docs)
15. **Task 15: Finale Vollständigkeitsprüfung + Storybook-Glob-Fix** - `9314aff34` (fix)

_Hinweis: Tasks 1, 4, 9 und 10 waren tdd="true" — jeweils per echtem RED-vor-GREEN-Zyklus nachgewiesen (Test geschrieben, Fehlschlag bestätigt, Implementierung ergänzt, Test grün). Task 7s Verifikation erfolgte durch eine zusätzliche, manuell injizierte und wieder entfernte Verletzung (Badge→Button), nicht durch einen separaten Commit._

## Files Created/Modified

- `frontend/src/components/ui/Badge.module.css`, `"frontend/src/app/fansubs/[slug]/page.module.css"` — Badge-Kontrast-Token-Override
- `frontend/src/components/fansubs/FansubHeroSection.stories.tsx` — neue Story, deckt den Kontrastfix sichtbar ab
- `frontend/src/components/showcases/ModalInContextShowcase.tsx/.stories.tsx`, `DrawerShowcase.stories.tsx` — Geöffnet-Stories
- `frontend/src/components/ui/Card.module.css`, `Modal.module.css`, `Drawer.module.css` — Radius-Token
- `frontend/src/components/ui/IconButton.tsx/.module.css/.stories.tsx/.test.tsx`, `NavArrow.tsx/.module.css/.stories.tsx` — ghost-Variante + Migration
- `frontend/src/components/fansubs/MediaViewerStage.tsx` — size="lg"
- `frontend/src/components/ui/Accordion.tsx/.module.css`, `frontend/eslint.config.mjs` — DisclosureIndicator-Umbau
- Zehn `*.stories.tsx` unter `components/ui` — Taxonomie-Umsortierung
- `frontend/src/components/ui/catalogTaxonomy.test.ts` — neue automatische Prüfung
- `frontend/src/styles/globals.css` — Typografie-Skala-Tokens
- `frontend/src/components/ui/Heading.tsx/.module.css/.stories.tsx/.test.tsx`, `Text.tsx/.module.css/.stories.tsx/.test.tsx` — neue Grundbausteine
- `frontend/src/components/ui/PageHeader.tsx/.module.css`, `SectionHeader.tsx/.module.css`, `DialogHeader.tsx/.module.css`, `Card.tsx/.module.css` — interne Migration
- `frontend/src/components/ui/typography.regression.test.ts` — Pixel-Regressionsnachweis
- `frontend/src/components/ui/TypographyOverview.stories.tsx` — neue Dokumentations-Story
- `frontend/src/components/ui/DisclosureIndicator.stories.tsx`, `Button.stories.tsx`, `IconButton.stories.tsx`, `Spinner.stories.tsx`, `StatusIcon.stories.tsx`, `Badge.stories.tsx` — Übersichts-Stories
- `frontend/.storybook/main.ts` — stories-Glob um `components/fansubs/**` erweitert
- `CLAUDE.md`, `docs/FRONTEND_ARCHITEKTUR.md` — Doku-Nachzug

## Decisions Made

- NavArrow wurde statt einer `EXCEPTIONS`-Ergänzung nach `Zusammengesetzte Bausteine/NavArrow` umsortiert, weil seine neue IconButton-Nutzung (Task 4) eine sichtbare Komposition ist, kein internes Implementierungsdetail wie `Button`→`Spinner`.
- SectionHeader ruft `Heading` immer mit `size={3}` auf, unabhängig vom eigenen `level`-Prop (2 oder 3), damit sich an SectionHeaders öffentlichem Vertrag nichts ändert, aber die visuelle Größe stabil bleibt.
- SectionHeaders `.sectionDescription` bekommt die volle `margin: 6px 0 0;`-Shorthand statt nur `margin-top`, weil `Text` bewusst keinen eigenen Margin-Reset vornimmt.
- Storybooks `stories`-Glob wurde um `components/fansubs/**` erweitert, da einzelne "Im Einsatz"-Stories für bereits produktive Domänen-Komponenten (wie `FansubHeroSection`) neben ihrer Komponente statt unter `components/showcases/` liegen können.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] NavArrow erzeugte einen vom Plan nicht vorhergesehenen echten Grundbaustein-Verbund**
- **Found during:** Task 7 (automatische Katalogprüfung)
- **Issue:** Der Plan behauptete, Button→Spinner sei "die einzige verbleibende Grundbaustein-zu-Grundbaustein-Kopplung" nach Task 6. Tatsächlich hatte Task 4 (NavArrow auf IconButton umgestellt) bereits eine zweite, echte Kopplung erzeugt: `NavArrow.tsx` importiert jetzt `IconButton`, und `IconButton.stories.tsx` existiert unter `Grundbausteine/*`. `catalogTaxonomy.test.ts` schlug dadurch korrekt mit `NavArrow.stories.tsx importiert ungeprueft: IconButton` fehl.
- **Fix:** Statt einer unehrlichen `EXCEPTIONS`-Ergänzung (NavArrows IconButton-Nutzung ist eine sichtbare Komposition, kein internes Implementierungsdetail wie Spinner) wurde `NavArrow.stories.tsx` nach `Zusammengesetzte Bausteine/NavArrow` umsortiert, mit einem "Besteht aus: IconButton."-Hinweis — konsistent mit der bereits in der `EXCEPTIONS`-Begründung selbst angelegten Unterscheidung.
- **Files modified:** `frontend/src/components/ui/NavArrow.stories.tsx`
- **Verification:** `catalogTaxonomy.test.ts` grün (25 Tests), danach durch eine manuell injizierte Verletzung (Badge→Button) bestätigt, dass der Test echte Verstöße mit korrekter Datei+Import-Fehlermeldung erkennt (danach entfernt).
- **Committed in:** `8be7bef31` (Task 7 Commit)

**2. [Rule 1 - Bug] FansubHeroSection.stories.tsx wurde von Storybook nie eingelesen**
- **Found during:** Task 15 (lebender `index.json`-Abgleich)
- **Issue:** `.storybook/main.ts`s `stories`-Glob deckte nur `src/components/ui/**` und `src/components/showcases/**` ab. Task 1 legte `FansubHeroSection.stories.tsx` aber unter `src/components/fansubs/` an — typecheck/vitest prüften die Datei zwar, aber Storybooks Dev-Server und der statische Build zeigten sie nie an. Ohne Task 15s expliziten Live-`index.json`-Abgleich wäre dieser Fehler erst beim Menschen in der Live-Abnahme aufgefallen.
- **Fix:** `stories`-Glob um `../src/components/fansubs/**/*.stories.@(ts|tsx)` erweitert, mit erklärendem Kommentar für künftige ähnliche Fälle.
- **Files modified:** `frontend/.storybook/main.ts`
- **Verification:** Storybook-Container neu gestartet, `curl http://127.0.0.1:6006/index.json` zeigt jetzt `im-einsatz-fansubherosection`; `npm run build-storybook` erzeugt `storybook-static/FansubHeroSection-stories.*.iframe.bundle.js`.
- **Committed in:** `9314aff34` (Task 15 Commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 - Bug)
**Impact on plan:** Beide Abweichungen waren notwendig, damit die im Plan behaupteten Endzustände ("Button->Spinner ist die einzige Kopplung", "Storybook zeigt die erwartete Taxonomie live") tatsächlich zutreffen. Kein Scope-Creep — beide wurden durch die im Plan selbst vorgesehenen automatischen Prüfungen (catalogTaxonomy.test.ts, Task 15s Live-index.json-Abgleich) aufgedeckt.

## Issues Encountered

- Beim Hinzufügen der "Größen und Varianten"-Übersichtsstory für `Text` kollidierte der Export-Name `Meta` mit dem gleichnamigen, aus `@storybook/nextjs` importierten Typ (`import type { Meta, StoryObj }`) — TypeScript meldete "Individual declarations in merged declaration 'Meta' must be all exported or all local." Behoben durch Umbenennung des Exports zu `MetaVariant` mit `name: 'Meta'`-Override (Task 9).
- `npm run lint` schlägt wegen vier bereits vor diesem Auftrag bestehenden, unbezogenen Fehlern (`capture-responsive.cjs`, `ReleaseVersionStoryOrderItem`-Datei, `ReleasesFilterBar.tsx`) mit Exit-Code ≠ 0 fehl — daher in Task 15 lint separat statt verkettet mit `&&` ausgeführt, sonst hätten Test/Build-Storybook nie liefen. Per `git log` bestätigt, dass diese drei Dateien von keinem Commit dieser Runde berührt wurden.

## Live-Verifikation (Befunde 1-3, visuell)

- **Befund 1 (Badge-Kontrast):** Echte Datenbank-Gruppe `new-subs` (`status='dissolved'`, reales Bannerfoto) unter `http://192.168.235.196:3000/fansubs/new-subs` abgerufen. Playwright-Screenshot + computed styles bestätigen `color: rgb(255,255,255)` auf `background: rgba(255,255,255,.18)` für den "aufgelöst"-Badge — klar lesbar, nicht nur in der Storybook-Fixture.
- **Befund 2 (Geöffnet-Stories):** `Im Einsatz/ModalInContextShowcase` → "Geöffnet" und `Im Einsatz/DrawerShowcase` → "Geöffnet" per Playwright-Screenshot bestätigt: beide starten ohne jeden Klick offen.
- **Befund 3 (Radius mobil):** `Zusammengesetzte Bausteine/Modal` → "Standard" und `Zusammengesetzte Bausteine/Drawer` → "Normal, groß" bei Viewport 390×844 per Playwright geprüft: Modal bleibt bei `border-radius: 0` (echter Vollbild-Fall, unverändert), Drawer zeigt `border-radius: 10px 0px 0px 10px` (jetzt über `var(--radius-surface)`, visuell identisch zum vorherigen Literal).
- Zusätzlich: `Zusammengesetzte Bausteine/NavArrow` ("Nächstes, groß", "Previous") und `Zusammengesetzte Bausteine/Accordion` ("Standard") per Screenshot auf unveränderte Optik geprüft — keine sichtbare Regression durch die IconButton- bzw. DisclosureIndicator-Umstellung.
- Storybooks `index.json` bestätigt die erwartete, verschobene Taxonomie live: `Grundbausteine/*` = 26 Stories, `Zusammengesetzte Bausteine/*` = 18 Stories, `Im Einsatz/*` = 13 Stories (alle in CLAUDE.md/docs/FRONTEND_ARCHITEKTUR.md mit diesen realen Zahlen dokumentiert).

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

- Alle acht vom Menschen gefundenen Befunde sind nachweislich behoben (automatisierte Tests + mindestens ein echter oder gleichwertiger visueller Nachweis pro visuellem Befund).
- Keine Regression in Typecheck/Testsuite (3938 Tests grün, 1 bewusst übersprungen)/build-storybook gegenüber dem Stand vor diesem Auftrag; die vier pre-existierenden Lint-Fehler sind nachweislich unberührt von dieser Runde.
- Keine Englisch-Text-Prüfung wurde vorgenommen (Scope-Korrektur aus CONTEXT.md eingehalten).
- Bereit für die abschließende menschliche Live-Abnahme dieses `ki-run`-Auftrags.

## Nachbesserung durch unabhängige Code-Review (nach Task 15)

Eine unabhängige Review des gesamten Diffs bestätigte: alle acht Befunde sind korrekt
umgesetzt (Badge-Kontrast-Fallback-Werte byte-identisch zum Original, Heading/Text-
Regressionstest deckt wirklich alle pixel-relevanten Werte ab, NavArrow/IconButton-CSS-
Spezifität ist tatsächlich zuverlässig unabhängig von der Modul-Bündel-Reihenfolge, kein
Befund touchiert App-h1-h3-Dateien oder führt eine Englisch-Prüfung durch). Ein echter,
behobener Befund:

- **`catalogTaxonomy.test.ts`s Import-Erkennung hatte drei reale Lücken** (nur einfache
  Anführungszeichen, kein dynamisches `import()`, keine Unterordner-Pfade) — aktuell von
  keiner Datei ausgenutzt, aber der Zweck des Tests ist gerade, *künftige* stillschweigende
  Grundbaustein-Kopplungen zu fangen. Behoben (Commit `dab2ff70d`): doppelte
  Anführungszeichen und dynamisches `import()` werden jetzt ebenfalls erkannt; die
  verbleibende Unterordner-Grenze ist als bekannte, aktuell inaktive Einschränkung
  dokumentiert statt stillschweigend offen zu bleiben.

Zwei Befunde geprüft und bewusst NICHT geändert:
- **Accordion verliert die alte Pfeil-Rotations-Animation/Akzentfarbe beim Öffnen.** Geprüft:
  `DisclosureIndicator` hat an KEINER seiner bestehenden Verwendungsstellen im gesamten Repo
  eine Rotations-Transition — es ist ein reiner Icon-Tausch (ChevronRight/ChevronDown), das
  ist sein etabliertes, konsistentes Verhalten. Eine neue Rotation nur für Accordion
  einzuführen würde Accordions Verwendung INKONSISTENT zu jeder anderen Stelle machen, die
  denselben Baustein nutzt — das widerspräche dem Zweck eines geteilten Grundbausteins. Die
  sichtbare Änderung ist eine direkte, korrekte Konsequenz von Befund 4s eigener Vorgabe
  ("für den Pfeil den vorhandenen Grundbaustein DisclosureIndicator verwenden"), kein
  Versehen.
- **`DrawerShowcase`s neue "Geöffnet"-Story ist identisch zu "Standard".** Zutreffend, aber
  bewusst so im Plan vorgesehen (Task 2: "identische Args wie Standard... zur
  Konsistenz/Auffindbarkeit mit der neuen Modal-Story") — Drawer war schon vor diesem
  Auftrag standardmäßig offen, Befund 2 verlangte aber ausdrücklich "analog eine geöffnete
  Drawer-Story" als eigenen, benannten Eintrag. Die Dopplung ist beabsichtigte
  Auffindbarkeit, kein Fehler.

Nach der Nachbesserung erneut empirisch bestätigt: `npm run typecheck` (0 Fehler),
`npm run lint` (weiterhin exakt 4 vorbestehende Fehler), `npm test -- --run` (428
Testdateien, 3938 Tests, alle grün — ein isolierter Zwischenlauf hatte einen einzelnen,
nicht mit dieser Runde zusammenhängenden Flake, der im sauberen Neulauf verschwand),
`npm run build-storybook` (Exit 0).

## Nachbesserung durch unabhängige Code-Review, Runde 2 (Commit `d1396c4a5`)

Eine zweite unabhängige Review meldete drei weitere, diesmal `high` eingestufte
Befunde — alle drei waren zutreffend und wurden behoben:

- **Card teilte den vereinbarten Radius-Token nicht.** `.card`/`.cardCompact` in
  `Card.module.css` standen weiterhin auf dem festen Literal `4px`, während
  `--radius-surface` (von `.cardNestedFlat`, Modal und Drawer genutzt) auf `10px`
  stand — die Runde-2-Vorgabe ("an die Card-Formensprache angleichen") war damit
  in die falsche Richtung umgesetzt. Behoben: `--radius-surface` in `globals.css`
  auf `4px` gesetzt (Cards eigentlichen, repo-weit dominanten Wert, nicht Modal/
  Drawers vormaligen Eigenwert) und `.card`/`.cardCompact` auf `var(--radius-surface)`
  umgestellt — jetzt teilen Card, Modal und Drawer exakt einen Token.
- **AvatarStack umging das native-`<button>`-Verbot über eine neue, als „künftiger
  Auftrag" bezeichnete ESLint-Ausnahme.** Das widerspricht der verbindlichen Regel,
  dass `components/ui`-Bausteine kein natives `<button>` verwenden dürfen, außer der
  jeweilige Baustein selbst kapselt es. Behoben: der native `<button>` für den
  Überlauf-Auslöser wurde durch `IconButton` (`variant="ghost"`, `size="sm"`) ersetzt,
  `AvatarStack.tsx` aus `UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES` entfernt. Da AvatarStack
  dadurch sichtbar einen anderen `components/ui`-Baustein komponiert, wanderte die
  Story konsequent von `Grundbausteine/AvatarStack` nach
  `Zusammengesetzte Bausteine/AvatarStack` (identisches Präzedenzmuster wie NavArrow
  in Runde 1) — `catalogTaxonomy.test.ts` hat genau diese Kopplung erkannt und bestand
  nach der Umkatalogisierung wieder (26 Tests). Die kreisrunde "+N"-Optik wurde über
  einen Element+Klasse-Selektor (`button.avatarStackOverflowButton`, Spezifität 0,1,1)
  gegen IconButtons eigene Basis-Klassen abgesichert.
- **ResponsiveImage hatte keine eigene Story.** Der Auftrag verlangt Stories für alle
  globalen `components/ui`-Bausteine; ResponsiveImage war bisher nur indirekt über
  ArtworkHero/ThumbnailStrip sichtbar. Ergänzt: `ResponsiveImage.stories.tsx` unter
  `Grundbausteine/ResponsiveImage` mit zwei Zuständen — ein über `LOCAL_IMAGE_PATTERNS`
  konfigurierter, optimierter Pfad (`/covers/placeholder.jpg`) und ein nicht
  konfigurierter Alt-Pfad, der auf den unoptimierten Fallback ausweicht statt die
  Seite mit E426/E231 abstürzen zu lassen (D-10) — die dabei sichtbare Bild-Bruch-
  Darstellung ist bewusst das native Browser-Verhalten, kein eigenes Fallback-Visual.

Erneut empirisch bestätigt: `npx tsc --noEmit` (0 Fehler), `npm run lint` (weiterhin
exakt 4 vorbestehende, unveränderte Fehler), `npm test -- --run` (428 Testdateien,
3939 Tests, alle grün), `npm run build-storybook` (Exit 0, nur vorbestehende
Asset-Größen-Warnungen). Zusätzlich per `storybook-static/index.json` live geprüft:
AvatarStack erscheint jetzt unter `Zusammengesetzte Bausteine/*`, ResponsiveImage unter
`Grundbausteine/*` mit beiden neuen Stories.

## Nachbesserung durch unabhängige Code-Review, Runde 3 (Commit `2bef7c328`)

Eine dritte unabhängige Review meldete einen `high`-Befund: mehrere `components/ui`-
Stories zeigten weiterhin englische sichtbare Namen/Inhalte (zitiert: Badge, Button,
Card, Text, UploadFileRow). Der Befund traf zu und wurde nicht nur für die vier
zitierten Dateien, sondern — nach repo-weitem Abgleich auf dasselbe Fehlermuster,
motiviert durch den Befundtext "u. a." — für **alle** betroffenen `components/ui`-
Stories behoben:

- **Sichtbare Story-Namen ohne deutsches `name:`-Override.** Rund 20 Dateien (u. a.
  DatePicker, FormField, Input, Select, SortableList, Switch, Textarea,
  UploadDropzone, YearPicker) zeigten den rohen, englischen Export-Bezeichner als
  Sidebar-Namen (`Disabled`, `Invalid`, `Ghost`, `Floating`, `Previous`, `Compact`,
  `Selectable` …). Ergänzt um deutsche `name:`-Werte.
- **Selbst-spiegelnde `name:`-Overrides mit englischem Wortanteil.** `WithActions`,
  `InfoVariante`, `OhneAction`, `VieleItems`, `DangerVariante` sowie fünf Overrides in
  `ActivationStatusIndicator.stories.tsx` (`RoleMatrixErfolg`, `RoleMatrixFehlerMitRetry`,
  `OverrideAktiv`, `OverridePending`, `OverridePersisted`, `OverrideFailed`) hatten ihr
  eigenes camelCase als `name:`-Wert übernommen statt einer echten deutschen Phrase —
  durch z. B. `'Mit Aktionen'`, `'Override: Ausstehend'` ersetzt.
- **Gerenderte Props-Inhalte.** Badge/Button/IconButton/StatusIcon rendern in ihrer
  "Größen und Varianten"-Übersichtsstory die rohen, englischen Varianten-Keys (z. B.
  `'success'`) direkt als sichtbaren Text — über neue `VARIANT_LABELS`/`TONE_LABELS`-
  Maps auf deutsche Begriffe umgestellt. `Table.stories.tsx`s Beispieldaten enthielten
  den Status `'Read-only'` — durch `'Nur Lesen'` ersetzt.
- **Bewusst unverändert:** Layout-Fachbegriffe, die selbst echte Prop-Namen der
  jeweiligen Komponente sind (`NurLeading`/`NurTrailing`, da Toolbar/ActionBar die
  Props tatsächlich `leading`/`trailing` nennen) und der Domänenbegriff `OhneArtwork`
  (in diesem Medien-/Fansub-Kontext ein etablierter Fachbegriff, keine vergessene
  Übersetzung) — analog zu den bereits akzeptierten Größen-Kürzeln `sm`/`md`/`lg` und
  `H1`–`H4`.

Ergänzter Test: `storyDisplayNames.german.test.ts` (fs-basiert, Muster analog zu
`catalogTaxonomy.test.ts`) prüft für jeden Story-Export sowohl den sichtbaren Namen
als auch großgeschriebene String-Literale im Block auf englische Wortreste — fängt
künftig genau diese beiden Fehlermuster automatisch ab. Per temporärer Verstoss-
Injektion verifiziert (Datei nach Bestätigung des Fehlschlags wieder gelöscht).

Erneut empirisch bestätigt: `npx tsc --noEmit` (0 Fehler), `npm run lint` (weiterhin
exakt 4 vorbestehende, unveränderte Fehler), `npm test -- --run` (429 Testdateien,
4275 Tests, alle grün — inklusive der 336 neuen Tests aus
`storyDisplayNames.german.test.ts`), `npm run build-storybook` (Exit 0). Zusätzlich
`storybook-static/index.json` nach dem Build programmatisch nach den zuvor
englischen sichtbaren Story-Namen durchsucht: keine Treffer mehr.

## Self-Check: PASSED

Alle acht im Summary genannten Dateien existieren (`Heading.tsx`, `Text.tsx`, `catalogTaxonomy.test.ts`,
`typography.regression.test.ts`, `TypographyOverview.stories.tsx`, `FansubHeroSection.stories.tsx`,
`.storybook/main.ts`, `NavArrow.stories.tsx`), und alle 15 genannten Task-Commit-Hashes sind im
Git-Log auffindbar.

---
*Phase: quick-261029-rnd*
*Completed: 2026-10-29*

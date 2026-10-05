---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 23
subsystem: ui
tags: [css-modules, refactoring, design-system, css]

# Dependency graph
requires:
  - phase: 174-21
    provides: Welle-4-Abschlussmessung und Baseline-Testsuite-Stand, auf dem diese CSS-Trennung aufsetzt
  - phase: 174-22
    provides: Grep-verifizierte Single-Owner-Extraktionsmethodik inkl. Compound-Selektor-Schutz und Komma-Selector-Split, direkt auf das globale ui.module.css angewendet
provides:
  - "ui.module.css reduziert von 2085 auf 219 Zeilen (-89%), 163 grep-verifizierte Single-Owner-Klassen in 26 neue per-Primitive .module.css ausgelagert"
  - "Vollstaendige class-by-class Konsumenten-Klassifikation (dead/single-owner/shared/compound-entangled) fuer alle 182 Klassen (inkl. 2 zunaechst durch Einrueckung in Media-Queries uebersehene Klassen), als Audit-Trail fuer 174-REPORT.md (D-23)"
  - "Entdeckter und korrigierter Proxy-Spread-Bug: {...sharedStyles, ...ownStyles} verliert in Vitest/jsdom alle CSS-Modul-Klassen, weil der dortige CSS-Modul-Export keine enumerable eigenen Keys hat - durch einen echten Proxy-Merge ersetzt, der in Vitest UND im Produktions-Webpack-Build korrekt funktioniert"
affects: [174-24]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grep-verifizierte Single-Owner-CSS-Modul-Extraktion: Klasse wird nur verschoben, wenn ALLE Vorkommen ueber die 28 bestaetigten .tsx-Konsumenten hinweg auf genau einen Konsumenten zeigen (Methodik aus 174-22 direkt uebernommen)"
    - "Compound-Selektor-Schutz: 3 Klassen (stateNeutral, stateDanger, stateInfo), die NUR in einem Compound-Selektor mit der geteilten Klasse .stateIcon auftreten, bleiben trotz grep-bestaetigtem Single-Owner-Status in ui.module.css, weil CSS Modules Klassennamen pro Datei haeschen und ein Split die Regel sonst lautlos wirkungslos gemacht haette"
    - "Komma-Selector-Split ueber Primitive-Grenzen: toolbar/actionBar, toolbarCluster/actionBarCluster, pageHeader/sectionHeader-Familie (5 Klassenpaare) und modalWrap/drawerWrap, modalPanel/drawerPanel sowie ein 9-Branch-Mobile-Media-Query (pageHeader, sectionHeader, toolbar, actionBar, cardHeader+cardFooter, dialogFooter, drawerHeader+drawerFooter) wurden pro Branch in die jeweilige Zieldatei aufgeteilt, Deklarationen byte-identisch depliziert"
    - "Geteilte @keyframes dupliziert statt referenziert: ui-spin (von buttonSpinner UND stateSpinner genutzt) wurde in Button.module.css und LoadingState.module.css je lokal neu deklariert, da CSS Modules @keyframes-Namen pro Datei haeschen koennen und das Projekt bereits an mehreren Stellen (EpisodeAccordion.module.css, MediaUpload.module.css, u.a.) unabhaengige @keyframes spin-Deklarationen statt einer geteilten fuehrt"
    - "Proxy-Merge statt Objekt-Spread fuer kombinierte styles: { ...sharedStyles, ...ownStyles } kopiert in Vitest/jsdom NICHTS (CSS-Modul-Exporte dort haben Object.keys() === [], nur ein get-Trap), waehrend new Proxy({}, { get: (_, p) => ownStyles[p] ?? sharedStyles[p] }) in Vitest UND im echten Next.js/Webpack-Build korrekt funktioniert"

key-files:
  created:
    - frontend/src/components/ui/AccentRule.module.css
    - frontend/src/components/ui/Accordion.module.css
    - frontend/src/components/ui/ActionBar.module.css
    - frontend/src/components/ui/AdjacentNavigation.module.css
    - frontend/src/components/ui/AvatarStack.module.css
    - frontend/src/components/ui/Badge.module.css
    - frontend/src/components/ui/Button.module.css
    - frontend/src/components/ui/Card.module.css
    - frontend/src/components/ui/DatePicker.module.css
    - frontend/src/components/ui/DisclosureIndicator.module.css
    - frontend/src/components/ui/Drawer.module.css
    - frontend/src/components/ui/EmptyState.module.css
    - frontend/src/components/ui/FormField.module.css
    - frontend/src/components/ui/HeroMetrics.module.css
    - frontend/src/components/ui/LoadingState.module.css
    - frontend/src/components/ui/Modal.module.css
    - frontend/src/components/ui/PageHeader.module.css
    - frontend/src/components/ui/Pagination.module.css
    - frontend/src/components/ui/SectionHeader.module.css
    - frontend/src/components/ui/Select.module.css
    - frontend/src/components/ui/Switch.module.css
    - frontend/src/components/ui/Table.module.css
    - frontend/src/components/ui/Tabs.module.css
    - frontend/src/components/ui/Textarea.module.css
    - frontend/src/components/ui/Toolbar.module.css
    - frontend/src/components/ui/YearPicker.module.css
  modified:
    - frontend/src/components/ui/ui.module.css
    - frontend/src/components/ui/AccentRule.tsx
    - frontend/src/components/ui/Accordion.tsx
    - frontend/src/components/ui/ActionBar.tsx
    - frontend/src/components/ui/AdjacentNavigation.tsx
    - frontend/src/components/ui/AvatarStack.tsx
    - frontend/src/components/ui/Badge.tsx
    - frontend/src/components/ui/Button.tsx
    - frontend/src/components/ui/Card.tsx
    - frontend/src/components/ui/DatePicker.tsx
    - frontend/src/components/ui/DisclosureIndicator.tsx
    - frontend/src/components/ui/Drawer.tsx
    - frontend/src/components/ui/EmptyState.tsx
    - frontend/src/components/ui/FormField.tsx
    - frontend/src/components/ui/HeroMetrics.tsx
    - frontend/src/components/ui/HeroMetrics.test.tsx
    - frontend/src/components/ui/LoadingState.tsx
    - frontend/src/components/ui/Modal.tsx
    - frontend/src/components/ui/PageHeader.tsx
    - frontend/src/components/ui/Pagination.tsx
    - frontend/src/components/ui/SectionHeader.tsx
    - frontend/src/components/ui/SectionHeader.test.tsx
    - frontend/src/components/ui/Select.tsx
    - frontend/src/components/ui/Switch.tsx
    - frontend/src/components/ui/Table.tsx
    - frontend/src/components/ui/Tabs.tsx
    - frontend/src/components/ui/Textarea.tsx
    - frontend/src/components/ui/Toolbar.tsx
    - frontend/src/components/ui/YearPicker.tsx

key-decisions:
  - "Re-verifizierter 28-Dateien-Konsumentenkreis bestaetigt unveraendert (kein Scope-Drift seit Planung); zusaetzlich bestaetigt, dass KEINE Datei ausserhalb von components/ui ui.module.css importiert und KEIN Primitiv das styles-Objekt per Prop-Drilling an Kinder weiterreicht - die vom 174-22-Gotcha gewarnte Unterzaehlung trat hier nicht auf"
  - "Klassenextraktion initial per Spaltenanfang-Regex (^\\.) durchgefuehrt, zwei einzeln eingerueckte Media-Query-Klassen (.adjacentNavPrevious, .dialogTitle) dadurch zunaechst uebersehen und per Zweitlauf mit einem einrueckungstoleranten Regex nachtraeglich gefunden und korrekt klassifiziert (adjacentNavPrevious: Single-Owner AdjacentNavigation; dialogTitle: geteilt Drawer+Modal) - vor jeder Dateiaenderung korrigiert, kein Codefehler"
  - "dialogHeader und dialogFooter trotz generischem Namen als Modal-exklusiv erkannt (grep zeigt genau 1 Konsument: Modal.tsx) - Drawer.tsx nutzt eigene drawerHeader/drawerFooter-Klassen fuer dieselbe strukturelle Rolle. Namensaehnlichkeit war hier irrefuehrend; der Grep-Zaehler war die einzige verlaessliche Entscheidungsquelle (wie das Plan selbst vorschreibt)"
  - "ErrorState.tsx und Input.tsx erhalten KEIN neues .module.css: ErrorState.tsx's einzige potenzielle Single-Owner-Klasse (stateDanger) ist Compound-Selektor-verzahnt mit der geteilten stateIcon-Klasse und bleibt in ui.module.css; Input.tsx nutzt ausschliesslich die drei geteilten control*-Klassen. Beide Dateien bleiben bei ihrem unveraenderten ui.module.css-Import (0 extrahierbare Klassen, plan-konform uebersprungen)"
  - "3 Klassen (stateNeutral, stateDanger, stateInfo) trotz grep-bestaetigtem Single-Owner-Status NICHT extrahiert, weil jede ausschliesslich als Compound-Selektor-Partner der geteilten Klasse stateIcon existiert (z. B. .stateDanger .stateIcon { ... }, keine eigenstaendige .stateDanger-Regel) - identisches Muster und identische Begruendung wie 174-22s 5 nicht extrahierte fansubEdit*-Klassen"
  - "Gemeinsame @keyframes ui-spin (genutzt von buttonSpinner UND stateSpinner, zwei verschiedenen Zieldateien) dupliziert statt in einer der beiden Dateien belassen - verifiziert gegen das bereits im Projekt etablierte Muster unabhaengiger lokaler @keyframes spin-Deklarationen in mehreren anderen .module.css-Dateien"
  - "Kritischer Laufzeitfehler in der urspruenglich geplanten { ...sharedStyles, ...ownStyles }-Merge-Strategie gefunden und behoben, BEVOR er in eine fehlerhafte Komponentendarstellung haette einfliessen koennen: ein Debug-Test zeigte, dass Vitest/jsdoms CSS-Modul-Mock Object.keys() === [] fuer jedes importierte .module.css liefert (nur ein dynamischer get-Trap, keine enumerable Keys) - ein Objekt-Spread kopiert deshalb NICHTS, und jede Komponente mit kombiniertem styles-Objekt haette in Tests (und potenziell auch in manchen Runtime-Edge-Cases) leere Klassennamen gerendert. Durch einen echten Proxy mit get-Trap ersetzt, der Property-Zugriffe korrekt an ownStyles bzw. sharedStyles weiterreicht - funktioniert nachweislich sowohl unter Vitest als auch im echten Produktions-Build (docker compose build gruen)"

requirements-completed: [D-18, D-02, D-19, D-22]

# Metrics
duration: ~110min
completed: 2026-10-05
---

# Phase 174 Plan 23: ui.module.css Single-Owner-Extraktion Summary

**163 grep-verifizierte Single-Owner-CSS-Klassen aus `ui.module.css` (2085 Zeilen) in 26 neue per-Primitive `.module.css`-Dateien extrahiert (-89% Zeilen), inklusive eines gefundenen und behobenen Proxy-Spread-Laufzeitfehlers in der kombinierten styles-Strategie.**

## Performance

- **Duration:** ~110 min
- **Started:** 2026-10-05 (im Anschluss an 174-22)
- **Completed:** 2026-10-05T21:36:00Z
- **Tasks:** 2 (Grep-Audit, Extraktion + Proxy-Merge-Fix + Finalisierung)
- **Files modified:** 55 (26 neue .module.css, 26 .tsx geaendert, 2 Test-Dateien per D-03-Ausnahme angepasst, 1 geteiltes .module.css geaendert)

## Accomplishments

- Vollstaendige, grep-belegte Klassifikation aller 182 Top-Level-Klassen in `ui.module.css` (inkl. 2 nachtraeglich per einrueckungstolerantem Zweit-Scan gefundener Media-Query-Klassen): 163 extrahiert, 14 echt geteilt (2+ Konsumenten), 3 Compound-Selektor-verzahnt mit der geteilten Klasse `stateIcon` (bewusst nicht extrahiert), 2 ohne gefundenen Konsumenten (als tot geflaggt, D-23, nicht geloescht)
- `ui.module.css`: 2085 → 219 Zeilen (ca. 47.000 → ca. 5.000 Byte), verbleibende Klassen sind alle grep-bestaetigt entweder geteilt, Compound-verzahnt oder tot
- 26 der 28 bestaetigten Konsumenten-Dateien erhalten ihr eigenes `.module.css` (2 Dateien — `ErrorState.tsx`, `Input.tsx` — haben nach Abzug der Compound-verzahnten/geteilten Klassen null extrahierbare Single-Owner-Klassen und bleiben plan-konform unveraendert)
- 7 Komma-Selektor-Paare/-Listen, die Klassen ZWEIER verschiedener Zieldateien kombinierten (toolbar/actionBar, toolbarCluster/actionBarCluster, pageHeader/sectionHeader, pageHeaderContent/sectionHeaderContent, pageHeaderActions/sectionHeaderActions, pageTitle/sectionTitle, pageDescription/sectionDescription, modalWrap/drawerWrap, modalPanel/drawerPanel, sowie ein 9-Branch-Mobile-Media-Query), wurden pro Branch in die jeweilige Zieldatei aufgeteilt, Deklarationen byte-identisch dupliziert
- Ein geteiltes `@keyframes ui-spin` (von `buttonSpinner` UND `stateSpinner` genutzt) wurde unabhaengig in `Button.module.css` und `LoadingState.module.css` neu deklariert, konsistent mit dem bereits im Projekt etablierten Muster unabhaengiger lokaler `@keyframes spin`-Deklarationen
- Ein kritischer Laufzeitfehler in der urspruenglichen `{ ...sharedStyles, ...ownStyles }`-Merge-Strategie fuer die 9 Dateien mit gemischtem Eigen-/Geteilt-Klassenbedarf (DatePicker, Drawer, EmptyState, LoadingState, Modal, PageHeader, SectionHeader, Select, Textarea) wurde per Debug-Test entdeckt (Objekt-Spread verliert alle CSS-Modul-Klassen unter Vitest, weil der CSS-Modul-Mock dort keine enumerable Keys hat) und durch einen echten `Proxy`-Merge ersetzt, der sowohl unter Vitest als auch im Produktions-Build korrekt funktioniert
- Volle Test-/Typecheck-/Lint-/Build-Gate gruen: `tsc --noEmit` (nur 8 vorbestehende, unveraenderte Baseline-Fehler in unberuehrten Dateien), `eslint .` (4 Fehler/305 Warnungen, identisch zur Baseline vor diesem Plan, keine neuen Befunde in `components/ui/`), `vitest run` (3248/3257 Tests gruen — exakt die 6 von 174-22 bereits dokumentierten, unveraenderten Baseline-Fehlschlaege in 4 unberuehrten Dateien), `docker compose build team4sv30-frontend` erfolgreich

## Task Commits

1. **Task 1: Grep-Audit aller Klassen in ui.module.css** - kein eigener Commit (reine Analyse, keine Dateiaenderung; Ergebnis fliesst in Task 2 und dieses SUMMARY)
2. **Task 2: Extraktion, Komma-Split, Proxy-Merge-Fix, Finalisierung** - `61449aed` (refactor)

**Plan metadata:** folgt (docs: complete plan)

## Files Created/Modified

### Neu erstellt (26 `.module.css`, je einer existierenden Primitive zugeordnet)
`AccentRule` (4 Klassen) · `Accordion` (8) · `ActionBar` (2) · `AdjacentNavigation` (7) · `AvatarStack` (6) · `Badge` (7) · `Button` (14 + eigenes `@keyframes ui-spin`) · `Card` (12) · `DatePicker` (23) · `DisclosureIndicator` (4) · `Drawer` (8) · `EmptyState` (1) · `FormField` (6) · `HeroMetrics` (4) · `LoadingState` (1 + eigenes `@keyframes ui-spin`) · `Modal` (6) · `PageHeader` (5) · `Pagination` (4) · `SectionHeader` (9) · `Select` (1) · `Switch` (5) · `Table` (6) · `Tabs` (6) · `Textarea` (1) · `Toolbar` (2) · `YearPicker` (11)

### Geaendert
- `ui.module.css` — 163 Single-Owner-Klassen entfernt (teils per Komma-Selector-Split); verbleibende 19 Klassen-Selektoren sind alle geteilt (14), Compound-verzahnt (3: stateNeutral/stateDanger/stateInfo je mit stateIcon) oder tot (2: breadcrumbs, datePickerClear-Familie)
- 26 `.tsx`-Dateien — Import auf das eigene neue `.module.css` umgestellt: 17 Dateien per Vollaustausch (AccentRule, Accordion, ActionBar, AdjacentNavigation, AvatarStack, Badge, Button, Card, DisclosureIndicator, FormField, HeroMetrics, Pagination, Switch, Table, Tabs, Toolbar, YearPicker — keine geteilten Klassen mehr genutzt), 9 Dateien per zusaetzlichem Proxy-Merge-Import (DatePicker, Drawer, EmptyState, LoadingState, Modal, PageHeader, SectionHeader, Select, Textarea — nutzen weiterhin mindestens eine geteilte Klasse)
- `HeroMetrics.test.tsx`, `SectionHeader.test.tsx` — Modulpfad-Anpassung (D-03-Ausnahme, siehe Deviations)

## Decisions Made

Siehe `key-decisions` im Frontmatter fuer die vollstaendige, einzeln begruendete Liste. Zusammengefasst:

- Re-Verifikation des 28-Datei-Konsumentenkreises bestaetigte keinen Scope-Drift und keine Prop-Drilling-/Fremdverzeichnis-Lecks wie bei 174-22.
- Ein einrueckungstoleranter Zweit-Scan fand 2 anfangs uebersehene Media-Query-Klassen, rechtzeitig vor jeder Extraktion korrigiert.
- `dialogHeader`/`dialogFooter` sind trotz "Dialog"-Namenskonvention tatsaechlich Modal-exklusiv (grep-bestaetigt); Namensaehnlichkeit zu Drawer war irrefuehrend.
- 3 Klassen bleiben wegen Compound-Selektor-Verzahnung mit `stateIcon` in `ui.module.css` (identisches Muster zu 174-22).
- Das geteilte `@keyframes ui-spin` wurde in beide Zieldateien dupliziert statt in einer zu verbleiben, konsistent mit bestehender Projektkonvention.
- **Wichtigster Fund:** Die urspruenglich vorgesehene `{ ...sharedStyles, ...ownStyles }`-Merge-Strategie fuer die 9 gemischt-nutzenden Dateien erwies sich als fundamental fehlerhaft unter Vitest (Objekt-Spread kopiert keine Properties von CSS-Modul-Proxys ohne enumerable Keys) und wurde durch einen echten `Proxy`-basierten Merge ersetzt.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `{ ...sharedStyles, ...ownStyles }`-Merge verliert alle CSS-Modul-Klassen unter Vitest**
- **Found during:** Task 2 (erster `vitest run` nach der Extraktion fuer die 9 gemischt-nutzenden Dateien)
- **Issue:** `HeroMetrics.test.tsx` und `SectionHeader.test.tsx` schlugen fehl, weil gerenderte Elemente KEINE Klasse enthielten, obwohl die Komponenten `styles.sectionHeaderContent` etc. korrekt aufriefen. Ein gezielter Debug-Test zeigte: `Object.keys(ownStyles)` liefert unter Vitest `[]` fuer JEDES importierte `.module.css` (der CSS-Modul-Mock implementiert nur einen dynamischen `get`-Trap ohne enumerable eigene Keys). Ein Objekt-Spread (`{...a, ...b}`) kopiert ausschliesslich enumerable eigene Properties — bei einem reinen `get`-Trap-Proxy ist das: nichts. Das urspruenglich aus 174-22 uebernommene Merge-Muster (dort bereits an 16 Stellen im Einsatz) traegt denselben latenten Fehler, wurde dort aber nie durch einen Test aufgedeckt, der `[class*="..."]` gegen eine ausschliesslich gemergte Klasse prueft.
- **Fix:** In allen 9 betroffenen Dateien (`DatePicker.tsx`, `Drawer.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `Modal.tsx`, `PageHeader.tsx`, `SectionHeader.tsx`, `Select.tsx`, `Textarea.tsx`) durch einen echten `Proxy`-Merge ersetzt: `new Proxy({} as Record<string, string>, { get: (_t, p) => ownStyles[p] ?? sharedStyles[p] })`. Ein `get`-Trap funktioniert unabhaengig von Enumerierbarkeit korrekt — verifiziert per Debug-Test unter Vitest (liefert den korrekten gehashten Klassennamen fuer sowohl eigene als auch geteilte Klassen) UND per erfolgreichem `docker compose build team4sv30-frontend` (echter Webpack-Build mit echten, nicht-proxybasierten CSS-Modul-Objekten).
- **Files modified:** `DatePicker.tsx`, `Drawer.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `Modal.tsx`, `PageHeader.tsx`, `SectionHeader.tsx`, `Select.tsx`, `Textarea.tsx`
- **Verification:** `npx vitest run src/components/ui/` → 109/109 gruen (vorher 6 Fehlschlaege in 2 Dateien); `docker compose build team4sv30-frontend` erfolgreich
- **Committed in:** `61449aed` (Task-2-Commit, vor dem eigentlichen Commit korrigiert, kein separater Fix-Commit noetig)

**2. [D-03 exception - pure import-path adjustment] `HeroMetrics.test.tsx` und `SectionHeader.test.tsx` lesen verschobene Klassen aus dem falschen File**
- **Found during:** Task 2 (vitest run nach der Extraktion)
- **Issue:** `HeroMetrics.test.tsx` importierte `styles from './ui.module.css'` um `styles.button`/`styles.buttonText` zu pruefen (jetzt in `Button.module.css`) und las zusaetzlich `ui.module.css` als Rohtext fuer eine `.buttonText`-Regex-Pruefung. `SectionHeader.test.tsx` las `ui.module.css` als Rohtext fuer eine `.sectionHeaderUnderline`-Regex-Pruefung (jetzt in `SectionHeader.module.css`). Nach der Extraktion fanden beide Dateien die jeweilige Klasse nicht mehr.
- **Fix:** Import- bzw. `readFileSync`-Pfade auf die neuen Zieldateien umgestellt (`Button.module.css` bzw. `SectionHeader.module.css`); die geprueften Formeln/Erwartungswerte blieben unveraendert — reine Modulpfad-Anpassung im Sinne der D-03-Ausnahme.
- **Files modified:** `HeroMetrics.test.tsx`, `SectionHeader.test.tsx`
- **Verification:** `npx vitest run src/components/ui/` → alle 109 Tests gruen
- **Committed in:** `61449aed`

---

**Total deviations:** 2 (1 Rule-1-Laufzeitfehler-Korrektur mit projektweiter Tragweite fuer das Merge-Muster, 1 D-03-Ausnahme mit Einzelbegruendung)
**Impact on plan:** Beide waren noetig, um die Extraktion tatsaechlich verhaltenserhaltend zu machen. Der Proxy-Merge-Fund hat potenzielle Tragweite ueber diesen Plan hinaus — siehe "Scope-Hinweis fuer Folgephasen" unten.

## Known Dead CSS (D-23, geflaggt fuer 174-REPORT.md, NICHT geloescht)

2 Klassen-Gruppen in `ui.module.css` haben keinen gefundenen Konsumenten im gesamten `frontend/src`-Baum (verifiziert per Textsuche ueber alle `.tsx`-Dateien, nicht nur die 28 Konsumenten):

- **`.breadcrumbs`** (+ `.breadcrumbs li`, `.breadcrumbs li:not(:last-child)::after`) — `PageHeader.tsx` hat zwar eine `breadcrumbs`-Prop, rendert sie aber als `ReactNode` (`{breadcrumbs}`), nie als `styles.breadcrumbs`-Klasse. Alle echten `styles.breadcrumbs`-Verwendungen im Projekt (z. B. `admin/anime/page.tsx`, `components/navigation/Breadcrumbs.tsx`) importieren ihre EIGENEN, unabhaengigen CSS-Module (`AdminStudio.module.css`, `Breadcrumbs.module.css`) — kein Bezug zu `ui.module.css`.
- **`.datePickerClear`** (+ `:hover`, `:focus-visible`, `:disabled`-Varianten) — `DatePicker.tsx` nutzt ausschliesslich `.datePickerInlineClear` (eine andere, aktiv genutzte Klasse); `.datePickerClear` selbst hat keinen einzigen Konsumenten im Projekt.

## Scope-Hinweis fuer Folgephasen (kein Fix in 174-23, nur dokumentiert)

**Der in diesem Plan gefundene Proxy-Spread-Bug betrifft potenziell auch 174-22's bereits gemergte Dateien.** 16 Dateien im `admin/fansubs/[id]/edit/`-Verzeichnis nutzen dasselbe `{ ...sharedStyles, ...X }`-Muster (z. B. `GroupMembersTab.tsx`, `NotesTab.tsx`, `FansubEditClient.tsx`). Deren Tests sind bisher gruen, weil keiner von ihnen `[class*="..."]`-Assertions gegen eine Klasse prueft, die AUSSCHLIESSLICH aus dem gemergten (nicht dem Basis-)Objekt stammt — der Fehler ist also latent vorhanden, aber unentdeckt. Eine systematische Pruefung/Korrektur aller 16 Stellen ist ausserhalb des Scopes dieses CSS-only-Plans (174-23 betrifft nur `components/ui/`) und wird hier als Befund fuer eine gezielte Folgephase oder fuer das Welle-6-Abschlussaudit (`174-REPORT.md`) vorgemerkt.

## Issues Encountered

Siehe Deviations oben. Kein ungeloestes Problem innerhalb des Scopes dieses Plans.

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

- `174-24` kann wie geplant fortfahren; der manuelle Visual-Equality-Checkpoint ist weiterhin der einzige verbleibende Korrektheitsnachweis fuer diese CSS-Trennung (keine automatisierte visuelle Regressionspruefung im Repo vorhanden)
- Vollstaendige Audit-Daten (182-Klassen-Klassifikation, Dead-Liste, Compound-Entangled-Liste) stehen fuer `174-REPORT.md` (Welle 6) bereit
- Der Proxy-Spread-Scope-Hinweis (siehe oben) sollte explizit in `174-REPORT.md`s "offene technische Schulden"-Abschnitt aufgenommen werden
- Baseline-Testfehler unveraendert (6 Tests, 4 Dateien, alle bereits vor 174-22/174-23 rot, keine Beruehrung durch dieses Plan): `cssCustomProperties.guard.test.ts` (2, der von 174-22 dokumentierte Line-Number-Drift-Bug), `PublicReleaseSurfacesShowcase.test.tsx` (1), `EpisodeImportEpisodeGroup.test.tsx` (2), `fansubprojekt/.../page.test.tsx` (1)

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

- All 26 new `.module.css` files verified present on disk (spot-checked `Button.module.css`, `SectionHeader.module.css`, `Drawer.module.css`)
- `ui.module.css` present and reduced to 219 lines as described
- Commit `61449aed` found in `git log --oneline --all`
- `docker compose build team4sv30-frontend` succeeded (production build proof)

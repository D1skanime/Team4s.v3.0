---
phase: quick-261029-i1y
plan: 01
subsystem: frontend-ui-tooling
tags: [storybook, design-system, accessibility, formfield, modal, drawer, eslint]
dependency-graph:
  requires:
    - phase: quick-261029-d3k
      provides: Storybook-Einführung (UI/*/Showcases/*-Taxonomie, 38 Primitives, 10 Showcases)
  provides:
    - Drei neue Grundbausteine (Spinner, StatusIcon, IconButton) + interne DialogHeader-Komponente
    - EmptyState/LoadingState/ErrorState auf Card+StatusIcon+Spinner umgebaut (keine zweite Karten-Formensprache mehr)
    - FormField-Autoverknüpfung (id/disabled/invalid/aria-invalid/aria-describedby) für sechs bekannte Feldtypen
    - Modal/Drawer teilen DialogHeader+IconButton, kein natives <button> mehr, gemeinsame --radius-surface/--border-subtle Tokens
    - Fansub-Hero-Banner-Kontrastfix (echter Produktionsbug, deterministisch getestet)
    - Storybook-Dreiteilung Grundbausteine/Zusammengesetzte Bausteine/Im Einsatz mit "Besteht aus"-Hinweisen
    - Neuer ESLint-Guard gegen native button/select/input/textarea unter src/components/ui/**
  affects:
    - CLAUDE.md, AGENTS.md, docs/FRONTEND_ARCHITEKTUR.md, frontend/eslint.config.mjs
tech-stack:
  added: []
  patterns:
    - "Spinner/StatusIcon als Grundbausteine für Lade-/Status-Zustände statt lokaler Keyframe-Duplikate"
    - "DialogHeader als interne, nicht exportierte geteilte Titelzeile für Modal+Drawer"
    - "FormField cloneElement-Autoverknüpfung für sechs bekannte Feldtypen (additiv, rückwärtskompatibel)"
    - "Storybook-Dreiteilung Grundbausteine/Zusammengesetzte Bausteine/Im Einsatz statt UI/Showcases"
key-files:
  created:
    - frontend/src/components/ui/Spinner.tsx
    - frontend/src/components/ui/StatusIcon.tsx
    - frontend/src/components/ui/IconButton.tsx
    - frontend/src/components/ui/DialogHeader.tsx
    - frontend/src/components/ui/FormField.test.tsx
    - frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts
    - frontend/src/components/showcases/ModalInContextShowcase.tsx
    - frontend/src/components/showcases/FormWithErrorsShowcase.tsx
  modified:
    - frontend/src/components/ui/FormField.tsx (Autoverknüpfung)
    - frontend/src/components/ui/Modal.tsx, Drawer.tsx (DialogHeader/IconButton-Refactor)
    - frontend/src/components/ui/EmptyState.tsx, ErrorState.tsx, LoadingState.tsx (Card-Umbau)
    - frontend/src/components/fansubs/FansubHeroSection.tsx, "frontend/src/app/fansubs/[slug]/page.module.css" (Kontrastfix)
    - frontend/eslint.config.mjs (neuer components/ui-Guard)
    - CLAUDE.md, AGENTS.md, docs/FRONTEND_ARCHITEKTUR.md
decisions:
  - "FormField-Autoverknüpfung nur für genau ein Kind eines der sechs bekannten Feldtypen (Input/Select/Textarea/DatePicker/YearPicker/Switch) -- jeder andere Fall rendert unverändert"
  - "Spinner in Button/App-Migrationsstellen bekommt label=\"\" (dekorativ), um den Accessible Name bestehender Buttons nicht durch einen zusätzlichen vorlesbaren Text zu verändern"
  - "Fansub-Hero-Scrim nur aktiv, wenn tatsächlich ein Bannerfoto vorhanden ist (gleiche Bedingung wie das Bannerbild selbst) -- 88% Schwarz-Opazität, rechnerisch WCAG-AA-sicher auch im Worst Case"
  - "ESLint components/ui-Button-Guard bekommt eine feste, dokumentierte Ausnahmeliste statt eines Ratchets -- Modal/Drawer stehen bewusst NICHT darauf"
requirements-completed: [261029-i1y-scope]
duration: 75min
completed: 2026-10-29
---

# Quick Task 261029-i1y: Storybook UAT Runde 1 Summary

**Acht UAT-Befunde der Storybook-Einführung behoben: Card-basierte Zustandskarten, automatische FormField-Verknüpfung, geteilter DialogHeader für Modal/Drawer, echter Fansub-Hero-Kontrastfix, deutsche Showcase-Texte, korrigierte Umlaute, dreigeteilte Storybook-Taxonomie mit neuem ESLint-Guard.**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-10-29T13:41:13Z
- **Completed:** 2026-10-29T14:55:55Z
- **Tasks:** 16/16 completed
- **Files modified:** ~115 (siehe `git log --stat` der 16 Task-Commits)

## Accomplishments

- Drei neue Grundbausteine (`Spinner`, `StatusIcon`, `IconButton`) plus die interne `DialogHeader`-Komponente konsolidieren vormals doppelt gepflegte CSS-Rezepte (Lade-Kreisel-Keyframes, Icon-Kreis-Tönung, Schließen-Button-Optik) in Team4s' globalem Design-System.
- `EmptyState`/`LoadingState`/`ErrorState` rendern jetzt über `Card` statt über ein bespokes `.stateCard`-Div — keine zweite Karten-Formensprache (14px-Radius) mehr im Produkt.
- `FormField` reicht `id`/`disabled`/`invalid`/`aria-invalid`/`aria-describedby` jetzt automatisch an ein einzelnes umschlossenes Input/Select/Textarea/DatePicker/YearPicker/Switch weiter — rückwärtskompatibel zu allen ~59 bestehenden `FormField`- und ~55 `Input`-Verwendungen (empirisch über die volle Testsuite nachgewiesen, nicht nur isolierte Unit-Tests).
- `Modal`/`Drawer` teilen sich die neue `DialogHeader`-Komponente, schließen über `IconButton` statt eines nativen `<button>`, und nutzen gemeinsame `--radius-surface`/`--border-subtle`-Tokens statt zufällig unterschiedlicher Literale.
- Echter Produktionsbug behoben: der Fansub-Hero-Banner zeigte Titel/Kennzahlen mit dunkler Schrift auf einem hellen Bannerfoto nahezu unlesbar — ein neuer, worst-case-dimensionierter Scrim sichert jetzt WCAG-AA-Kontrast (≥4,5:1) rechnerisch nachgewiesen ab, ohne die Optik ohne Bannerfoto zu verändern.
- Storybook zeigt jetzt drei Kategorien (`Grundbausteine/*`, `Zusammengesetzte Bausteine/*` mit „Besteht aus"-Hinweisen, `Im Einsatz/*`) statt `UI/*`/`Showcases/*`, inkl. zwei neuer domänenübergreifender Beispiel-Stories (Modal über einer Mock-Seite, Formular mit mehreren automatisch verknüpften Fehlerzuständen) und eines neuen, auf `components/ui/**` beschränkten ESLint-Guards gegen native `button`/`select`/`input`/`textarea`.

## Task Commits

1. **Task 1: Grundbausteine Spinner und StatusIcon** - `d695a5c11` (feat)
2. **Task 2: Grundbaustein IconButton** - `2d2c4b831` (feat)
3. **Task 3: EmptyState/LoadingState/ErrorState auf Card+StatusIcon+Spinner** - `b8cb4f993` (feat)
4. **Task 4: Vier App-Spinner-Stellen auf Spinner migrieren** - `77b20b361` (feat)
5. **Task 5: FormField-Autoverknüpfung (TDD)** - `dde4826b5` (test, RED) → `e3fcfe0a5` (feat, GREEN)
6. **Task 6: FormField-Stories + Regressionsnachweis** - `55193a678` (feat)
7. **Task 7: DialogHeader-Komponente + Modal-Refactor** - `7c34bbf86` (feat)
8. **Task 8: Drawer-Refactor** - `21dbee76e` (feat)
9. **Task 9: Fansub-Hero-Kontrastfix + WCAG-Test (TDD)** - `7d254b04c` (fix, kombiniert — siehe TDD Gate Compliance unten)
10. **Task 10: Englische Showcase-Texte übersetzt** - `981f873fc` (fix)
11. **Task 11: ASCII-Umlaute korrigiert + repo-weiter Scan** - `1d0b06412` (fix)
12. **Task 12: Storybook-Taxonomie dreigeteilt** - `2f47eadd2` (feat)
13. **Task 13: Neue "Im Einsatz"-Stories** - `56d40457d` (feat)
14. **Task 14: ESLint-Guard components/ui/\*\*** - `68a74d51a` (feat)
15. **Task 15: Doku-Updates** - `51f35c034` (docs)
16. **Task 16: Finale Vollständigkeitsprüfung** - keine Code-Änderung (reine Verifikation, siehe unten)

**Plan metadata:** wird vom Orchestrator nach diesem SUMMARY committet.

## TDD Gate Compliance

Der Plan hat `type: execute` (kein `type: tdd`), daher gilt die strikte Plan-Level-Gate-Prüfung
aus `execute-mvp-tdd.md` nicht; einzelne Tasks tragen aber `tdd="true"`:

- **Task 5** (FormField-Autoverknüpfung): korrekt als RED (`dde4826b5`, Test schlägt mit 7/10
  Fällen fehl) → GREEN (`e3fcfe0a5`, alle 10 Fälle grün) in zwei separaten Commits ausgeführt.
- **Task 9** (Fansub-Hero-Kontrastfix): Implementierung (CSS-Scrim) und der neue
  deterministische Test wurden lokal iterativ verifiziert (ein Zwischenstand schlug wegen
  doppelter `.heroBodyOnBanner`-Selektor-Blöcke in 2/6 Fällen fehl, dann behoben), aber ALS
  EIN Commit (`7d254b04c`) committet statt als getrennte RED-/GREEN-Commits. Funktional
  vollständig und verifiziert (alle 6 neuen Tests + alle 33 Fansub-Testdateien grün), aber
  prozedural keine strikte Zwei-Commit-TDD-Trennung — dokumentiert hier statt stillschweigend
  übergangen.

## Files Created/Modified

Siehe `key-files` im Frontmatter für die wichtigsten Dateien. Vollständige Liste:
`git diff d695a5c11^..HEAD --stat` (16 Task-Commits, keine Doku-Artefakte dieses Quick-Tasks
selbst committet — das übernimmt der Orchestrator).

## Decisions Made

Siehe `decisions` im Frontmatter. Zusätzlich:
- `IconButton` ist eine eigene `forwardRef`-Implementierung (nicht durch `Button` komponiert),
  weil `Button.tsx` aktuell keinen Ref weiterleitet und Modal/Drawer einen Ref auf den
  Schließen-Button für ihre bestehende Fokus-Logik benötigen.
- Der neue `components/ui`-ESLint-Guard bekam eine **feste** Ausnahmeliste
  (`UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES`), kein Ratchet wie `LEGACY_NO_RESTRICTED_SYNTAX_FILES`
  — bewusste, dokumentierte Einzelfälle statt eines wachsenden Altlast-Mechanismus.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Spinner im Button-Lade-Zustand veränderte den Accessible Name**
- **Found during:** Task 3 (volle Testsuite nach dem Card-Umbau)
- **Issue:** `Spinner`s vorlesbarer Standardtext ("Wird geladen…") wurde Teil des Accessible
  Name jedes ladenden Buttons und brach einen bestehenden namensbasierten Test
  (`AniSearchSearchCard.test.tsx`).
- **Fix:** `Button.tsx` übergibt dem `Spinner` jetzt `label=""`; der Button-eigene sichtbare
  Text bleibt die einzige Statusmeldung.
- **Files modified:** `frontend/src/components/ui/Button.tsx`
- **Verification:** volle Testsuite grün (421/422 Dateien, dann 422/422 nach Fix)
- **Committed in:** `b8cb4f993` (Task 3 commit)

**2. [Rule 3 - Blocking] IconButton.tsx fehlte in der neuen ESLint-Ausnahmeliste**
- **Found during:** Task 14 (`npm run lint` nach dem neuen components/ui-Guard)
- **Issue:** `IconButton.tsx` (Task 2) ist selbst die definierende Datei des Primitives und
  rendert notwendigerweise ein natives `<button>` — der neue Guard blockierte das.
- **Fix:** `IconButton.tsx` zur `UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES`-Liste ergänzt, analog zu
  `Button.tsx` als definierende Datei.
- **Files modified:** `frontend/eslint.config.mjs`
- **Verification:** `npm run lint` zeigt wieder nur die vier vorbestehenden, unbezogenen Fehler
- **Committed in:** `68a74d51a` (Task 14 commit)

**3. [Rule 2 - Dokumentationspflicht] Zusätzliche englische Showcase-Texte außerhalb der im Context genannten Stellen**
- **Found during:** Task 10 (Scope-Suche über ui/showcases hinaus)
- **Issue:** `PublicReleaseSurfacesShowcase.tsx` hatte dasselbe englische Muster
  ("Public Release Surfaces", "Desktop/Tablet/Mobile Releases") wie die im Context genannte
  `PublicFansubSurfacesShowcase.tsx`; `Card.stories.tsx` hatte acht englische Demo-Titel;
  `DrawerShowcase.tsx` hatte vier englische "Preview"-Platzhalter.
- **Fix:** Alle ins Deutsche übersetzt, zugehörige Testassertion in
  `PublicReleaseSurfacesShowcase.test.tsx` mitgezogen.
- **Files modified:** `PublicReleaseSurfacesShowcase.tsx`, `.test.tsx`, `Card.stories.tsx`, `DrawerShowcase.tsx`
- **Verification:** betroffene Testdateien + repo-weite Testsuite grün
- **Committed in:** `981f873fc` (Task 10 commit)

**4. [Rule 1/2 - Sprachqualität] Zusätzliche ASCII-Umlaut-Funde über die drei im Context genannten Stellen hinaus**
- **Found during:** Task 11 (repo-weiter Scan) und erneut bei der finalen Vollständigkeitsprüfung (Task 16)
- **Issue:** Sowohl in diesem Auftrag neu geschriebenen Dateien (`FormField.tsx`,
  `DialogHeader.tsx`, `IconButton.module.css`, `HeroMetrics.module.css`, `StatusIcon.module.css`,
  `FormField.test.tsx`, `FansubHeroSection.accessibility.test.ts`, `YearPicker.tsx`,
  `DatePicker.tsx`, `IconButton.test.tsx`, `LoadingState.tsx`, `eslint.config.mjs`) als auch in
  Dateien mit vorbestehenden, unberührten Codeabschnitten
  (`JellyfinSyncPanel.tsx`, `VideoPlayerModal.tsx`, `page.module.css`, `globals.css`,
  `DesignTokensShowcase.tsx`, `capture-phase151-badge-evidence.mjs`) fanden sich weitere
  ASCII-Umlaut-Substitutionen.
- **Fix:** Alle korrigiert; zwei Code-Bezeichner-Fälle (`'uebers'`-Id-Keys,
  `AutomatischVerknuepft*`-Story-Namen nach bestehender Repo-Konvention) bewusst NICHT
  angefasst (siehe `deferred-items.md`).
- **Files modified:** siehe Liste oben
- **Verification:** `grep`-Scan + volle Testsuite grün nach jeder Korrektur-Runde
- **Committed in:** `1d0b06412` (Task 11 commit)

---

**Total deviations:** 4 auto-fixed (1 Bug, 1 Blocking, 2 Dokumentationspflicht/Sprachqualität)
**Impact on plan:** Alle vier Korrekturen waren für Korrektheit, Barrierefreiheit bzw. die
explizit im Plan geforderte Sprachqualität notwendig. Kein Scope-Creep über die acht
UAT-Befunde hinaus.

## Known Stubs

Keine — alle acht Befunde sind vollständig umgesetzt, keine Platzhalter-Daten oder
unverdrahteten Komponenten eingeführt.

## Threat Flags

Keine neuen, nicht im Threat-Model erfassten Oberflächen gefunden (reine UI-Konsolidierung/
Refactoring ohne neue Backend-/API-Oberfläche, siehe Plan-Threat-Model T-261029i1y-01/02/SC).

## Issues Encountered

- **AchievementBadgeShowcase.test.tsx**-Stresstest ("mounts the full 100-item production
  FocalCarousel stress fixture") schlug in EINEM von drei vollen Testsuite-Läufen fehl, lief
  aber isoliert und in zwei weiteren vollen Läufen grün — pre-existierende, timing-abhängige
  Flakiness bei paralleler Testausführung, nicht durch diesen Auftrag verursacht, keine
  Code-Änderung erforderlich.

## Deferred Items

Siehe `.planning/quick/261029-i1y-team4s-storybook-uat-runde-1-zustandskar/deferred-items.md`
für vollständige Details:
- `npm run lint`: 4 vorbestehende, unbezogene Fehler (identisch zu 261029-d3k dokumentiert)
- 2 neue, erwartete `jsx-a11y/role-supports-aria-props`-Warnungen (kein Fehler) für
  `aria-invalid` auf DatePicker/YearPicker-Trigger-Buttons
- Pre-existierende ASCII-Umlaute in völlig unberührten Phase-191-Absätzen von
  `docs/FRONTEND_ARCHITEKTUR.md` (außerhalb des Scopes dieses Auftrags)
- `JellyfinSyncPanel.tsx` bleibt bei 607 Zeilen über dem 450-Zeilen-Limit (vorbestehend bei
  610 Zeilen, durch Task 4 um 3 Zeilen reduziert, aber nicht gesplittet — Begründung siehe Datei)

## Live-Verifikation

`docker compose up -d team4sv30-storybook` + `curl http://127.0.0.1:6006/index.json`: zeigt
live ausschließlich die drei Präfixe `Grundbausteine`, `Zusammengesetzte Bausteine`,
`Im Einsatz` (217 Einträge insgesamt) und enthält alle sechs explizit geforderten neuen
Einträge (`grundbausteine-spinner`, `grundbausteine-statusicon`, `grundbausteine-iconbutton`,
`im-einsatz-drawershowcase`, `im-einsatz-modalincontextshowcase`,
`im-einsatz-formwitherrorsshowcase`).

**Noch offen (Browser-UAT statt in diesem autonomen Lauf):** Ein echter Blick auf
`/fansubs/[slug]` mit einem Account mit Bannerfoto zur visuellen Bestätigung des
Kontrastfixes auf der echten Produktionsseite — per CONTEXT.md Befund 2 als Alternative zum
Playwright-Screenshot vorgesehen; dieser autonome `ki-run`-Auftrag legt laut AGENTS.md keine
Zwischen-Checkpoints an, die menschliche Prüfung erfolgt bei der finalen Live-UAT-Abnahme des
gesamten Jobs. Der rechnerische Kontrastnachweis (≥4,5:1 im Worst Case) ist bereits über den
neuen deterministischen Test erbracht.

## User Setup Required

None — keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness

Alle acht UAT-Befunde aus der ersten Nachbesserungsrunde sind geschlossen. Dies ist Runde 1
von 2 — eine zweite Chance ist laut Auftragsbeschreibung vorgesehen, falls die finale
Live-UAT weitere, bisher nicht erkannte Mängel aufdeckt. Die Storybook-Baseline aus
261029-d3k bleibt in ihrer Substanz (Storybook ersetzt `/dev/ui-system`, "Stories ziehen mit")
unverändert gültig.

---
*Quick Task: 261029-i1y*
*Completed: 2026-10-29*

## Nachbesserung durch unabhängige Code-Review (nach Task 16)

Eine unabhängige Review des gesamten Diffs fand vier Befunde, die eigene Nachprüfung fand
denselben Hauptbefund zusätzlich selbst. Behoben, Commits `721ea5457` und `6da83688f`:

1. **`aria-invalid` auf dem `<button>`-Trigger von DatePicker/YearPicker** verstößt gegen die
   ARIA-Spezifikation (implizite `button`-Rolle unterstützt dieses Attribut nicht; bereits
   `jsx-a11y/role-supports-aria-props`-Warnung). FormField injiziert dieses Attribut für diese
   beiden Feldtypen nicht mehr; der Fehlerzustand bleibt über die visuelle `invalid`-Klasse
   plus `aria-describedby` erkennbar.
2. **`Switch.tsx` reichte `disabled` nie als natives Button-Attribut durch** — ein per
   FormField deaktivierter Switch blieb per Tab fokussierbar. Jetzt behoben
   (`disabled={disabled}` ergänzt).
3. **Verwaiste `.dialogTitle`/`.dialogDescription`-Regeln in `ui.module.css`** (seit der
   DialogHeader-Extraktion in Task 7 nirgends mehr referenziert, `DialogHeader.module.css`
   hat eigene, identische Regeln) entfernt.
4. **`JellyfinSyncPanel.tsx` blieb nach Task 4 bei 607 Zeilen** (über dem 450-Zeilen-Limit,
   inhaltlich geändert ohne Split) — ursprünglich als bewusst deferred dokumentiert, nach
   übereinstimmendem Befund aus eigener Prüfung UND Review nachgeholt: in fünf
   Schritt-/Dialog-Komponenten plus eine Helfer-Datei aufgeteilt (Orchestrator 176 Zeilen,
   keine Datei über 216 Zeilen). Da zuvor kein Rendering-Test für diese Komponente existierte,
   wurde zuerst ein neuer Smoke-Test geschrieben (gegen die alte Implementierung grün
   verifiziert), danach der Split durchgeführt und derselbe Test erneut grün bestätigt.

**Geprüft und bewusst NICHT übernommen:** Der Review bemängelte `Gross`/`NormalGross` als
Story-Namen in zwei neuen Dateien als ASCII-Ersetzung. Das folgt exakt der bereits vor diesem
Auftrag etablierten, durchgängigen Konvention (Export-Bezeichner = `name:`-Property, z. B.
`Geoeffnet`, `MitFehler`) und existierte unverändert bereits in `Drawer.stories.tsx` — siehe
`deferred-items.md` für die vollständige Begründung. Ebenfalls geprüft und für unkritisch
befunden: eine geringe Abweichung der Spinner-Ring-Opazität (24%→20%) beim Konsolidieren
zweier bereits vor diesem Auftrag UNTEREINANDER leicht unterschiedlicher Vorlagen
(`Button.module.css` 24% vs. `LoadingState.module.css` 20%) — visuell nicht wahrnehmbar,
„exakte" Übereinstimmung mit BEIDEN alten Werten war mathematisch nie möglich.

Nach der Nachbesserung erneut empirisch bestätigt: `npm run typecheck` (0 Fehler),
`npm run lint` (weiterhin exakt 4 vorbestehende Fehler), `npm test -- --run` (424 Testdateien,
3889 Tests, alle grün), `npm run build-storybook` (Exit 0), Storybook-`index.json` weiterhin
mit den drei korrekten Kategorien.

## Nachbesserung durch unabhängige Code-Review, Runde 2 (final)

Ein zweiter unabhängiger Review fand einen echten, hochprioren Befund: `FormField.tsx`
setzte `labelHtmlFor` nur dann auf `resolvedId`, wenn die ID frisch generiert wurde
(`usesGeneratedId`). Zwei Fälle blieben dadurch fehlerhaft: (1) ein Kind mit bereits
eigener `id`, aber ohne `FormField.htmlFor` — das Label blieb unverknüpft
(`labelHtmlFor` blieb `undefined`); (2) ein widersprüchliches `FormField.htmlFor`
gegenüber einer abweichenden Kind-`id` — das Label zeigte auf das vom Aufrufer gemeinte,
aber am Feld gar nicht ankommende `htmlFor`, statt auf die tatsächliche, von `resolvedId`
bevorzugte Kind-`id`. Behoben (Commit `4b9e6a963`): `labelHtmlFor` wird für jedes bekannte
Einzelkind jetzt immer auf `resolvedId` gesetzt — die bereits korrekte Prioritätsreihenfolge
(Kind-`id` > `FormField.htmlFor` > generierte ID) bleibt unverändert, nur das Label folgt ihr
jetzt zuverlässig. Zwei neue Regressionstests (`FormField.test.tsx`) belegen beide Fälle und
schlagen nachweislich gegen den alten Code fehl. Erneut bestätigt: typecheck/lint (weiterhin
4 vorbestehende Fehler)/volle Testsuite (424 Dateien, 3891 Tests)/`build-storybook` grün.

## Self-Check: PASSED

All 11 spot-checked created files found on disk; all 16 task commit hashes found in
`git log`. Live Storybook `index.json` confirmed to expose exactly the three new category
prefixes and all six explicitly required new entries.

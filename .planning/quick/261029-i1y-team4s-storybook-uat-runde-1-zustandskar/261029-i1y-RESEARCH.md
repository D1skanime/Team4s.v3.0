# Quick Task 261029-i1y: Storybook UAT Runde 1 - Research

**Researched:** 2026-10-29
**Domain:** Team4s Frontend-Design-System (`frontend/src/components/ui`), Storybook, bestehende Komponenten
**Confidence:** HIGH für alle Datei-/Zeilen-/API-Fakten (direkt per Grep/Read gegen das Repo verifiziert durch vier parallele Explore-Agenten plus einen fünften Agenten zu Test-Infrastruktur/TypeScript-Signaturen); MEDIUM für Design-Entscheidungen, die in CONTEXT.md als "Claude's Discretion" festgehalten sind.

<user_constraints>
Siehe `261029-i1y-CONTEXT.md` — alle Entscheidungen dort sind bindend.
</user_constraints>

## Befund 1 — EmptyState/LoadingState/ErrorState

- `EmptyState.tsx`/`LoadingState.tsx`/`ErrorState.tsx` rendern `<div className={styles.stateCard} ...>`.
- `ui.module.css` `.stateCard` (14px Radius, `linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(246,248,252,.98) 100%)`, eigener Border/Schatten), `.stateIcon` (38×38, 10px Radius), `.stateNeutral .stateIcon` nutzt harte Hexwerte `#dfe6f1`/`#6d778a`, `.stateDanger`/`.stateInfo .stateIcon` sind bereits Token-basiert.
- `Card.tsx`/`Card.module.css`: 8 Varianten (`default/elevated/interactive/compact/section/flat/nested/nestedFlat`), Radien nur 4px (fast alle) und 10px (`nestedFlat`). `flat` = `linear-gradient(to bottom, #f7f9fc, #edf1f7)`, kein Schatten — nächste Entsprechung zum bisherigen Look, aber bei 4px statt 14px (das ist beabsichtigt, siehe CONTEXT.md).
- `globals.css`: `--color-error`, `--button-danger-start/mid/end`, `--color-success`, `--color-warning` existieren bereits; kein `--color-danger`-Name. `--surface-card`/`--surface-card-muted` sind generische Oberflächentokens.
- Vier Spinner-Fundstellen (exakte Pfade/CSS siehe Task-Prompts unten) in `JellyfinSyncPanel.tsx`, `EpisodeVersionActionBar.tsx`/`EpisodeVersionEditor.module.css`, `VideoPlayerModal.tsx`/`.module.css`, `MediaUploadCore.tsx`/`MediaUpload.module.css` — alle nach demselben Muster (`border-top-color` + `animation: spin`), zwei davon (`Button.module.css` `.buttonSpinner`, `LoadingState.module.css` `.stateSpinner`) sind intern bereits fast identisch (`currentColor`-Ring, `ui-spin`-Keyframe).
- `components/ui/index.ts`: flache, unsortierte Liste von 30 `export *`-Zeilen, keine Gruppierungskommentare.

## Befund 2 — Fansub-Hero-Kontrast (echter Produktionsbug)

- `PublicFansubSurfacesShowcase.tsx` rendert `<FansubHeroSection>` — dieselbe Komponente wie `frontend/src/app/fansubs/[slug]/page.tsx`. Kein Showcase-Artefakt, echter Bug.
- `PublicHeaderBackdrop.tsx`: `if (!imageUrl) return null` — der dunkle Schleier existiert NUR, wenn ein Bannerfoto vorhanden ist.
- Farben: `.title` erbt `var(--text-primary)` = `#1c1c1e`; `.subtitle` = `rgba(28,24,38,.74)`; `HeroMetrics` `dt` = `rgba(28,24,38,.64)`, `dd` = `var(--accent-deep)` = `#185fa5`. Hintergrund-Schleier: `linear-gradient(180deg, rgba(15,12,25,.28) 0%, rgba(15,12,25,.42) 55%, var(--surface-canvas) 100%)` über `filter: blur(34px) brightness(0.72)`.
- Kein bestehendes `@axe-core/playwright`; vorhandene `jest-axe`-Tests (`FocalCarousel.test.tsx`, `MemberProfileHero.test.tsx`, `FansubGroupMediaBlock.test.tsx`) laufen alle gegen jsdom ohne Rule-Einschränkung — jsdom kann `color-contrast` gegen Verläufe/Bilder nicht zuverlässig bestimmen (kein Layout-/Paint-Engine).
- Präzedenzfall für deterministische Kontrastprüfung: `frontend/src/lib/roleCatalog.accessibility.test.ts` — lokale `luminance()`/`contrast()`-Hilfsfunktionen nach der offiziellen WCAG-Relativleuchtdichte-Formel, `expect(contrast(...)).toBeGreaterThanOrEqual(4.5)`.

## Befund 3/4 — Englische Texte / Umlaute

- Bestätigt: `DesignTokensShowcase.tsx:52` `title="Design Tokens Preview"`; `PublicFansubSurfacesShowcase.tsx:62` `title="Public Fansub Surfaces"`; `PublicFansubSurfacesShowcase.tsx:73` `title="Desktop Header"`; `PublicFansubSurfacesShowcase.test.tsx:31` prüft exakt denselben String — MUSS mitgezogen werden.
- `docker-compose.yml:221-225` (Kommentar zum `team4sv30-storybook`-Service: „fuer", „fuehren", „Aufloesung", „laeuft" — per direktem Grep bestätigt, ein vorheriger Agenten-Check hatte das fälschlich nicht gefunden).
- `frontend/src/components/ui/Card.stories.tsx` enthält „Umschliesst eine ganze thematische Sektion." (SectionVariant-Story).

## Befund 5 — FormField/Input/Select/Textarea

- `FormField.tsx` (31 Zeilen): Props `label?, htmlFor?, hint?, error?, required?, disabled?, children`. Rendert `{children}` unverändert — KEIN `cloneElement`, keine ARIA-Verknüpfung, `disabled` wirkt nur auf den äußeren `aria-disabled`. Label hat `htmlFor`, aber kein eigenes `id`.
- `Input`/`Select`/`Textarea`: jeweils `forwardRef`, `extends <Tag>HTMLAttributes`, plus `invalid?: boolean` — rein visuell, kein automatisches `aria-invalid`.
- Tatsächliche Nutzung: 59 Dateien/161 Vorkommen `<FormField`, 55 Dateien/93 Vorkommen `<Input`, 49/83 `<Select`, 20/22 `<Textarea`.
- Reales Doppel-Set-Muster bestätigt in `ProfileBasicsForm.tsx`, `GroupHistoryForm.tsx`, `GroupHistRoleDialog.tsx`; reales halb-kaputtes Muster (nur `error`, kein `invalid`) bestätigt in `SegmentOverrideField.tsx`, `FansubAliasSection.tsx`.
- FormField umschließt auch Nicht-Feld-Widgets: `YearPicker`, `DatePicker`, custom Radiogroups/`ChoiceSelect`/`GroupScopeToggle`, `Switch`, `UploadDropzone` — diese Fälle dürfen durch die Autoverknüpfung NICHT brechen.
- Kein `cloneElement`-Präzedenzfall im Repo. TypeScript-Strict-Mode (`tsconfig.json`: `strict: true`) erfordert pro Feldtyp einen expliziten `as ReactElement<XProps>`-Cast; `child.type === Input`-Vergleich narrowed TypeScript NICHT automatisch.
- `DatePicker`/`YearPicker` haben bereits `id` (Pflicht-Prop), `disabled`, `invalid` — aber keinen generischen `...rest`-Spread, daher explizite Prop-Übergabe statt genereller Spread-Injektion nötig.

## Befund 6 — Spinner/StatusIcon

- Bereits doppelt vorhandene, fast identische Spinner-Logik in `Button.module.css` (`.buttonSpinner`, 14px) und `LoadingState.module.css` (`.stateSpinner`, 18px) — beide `currentColor`+`ui-spin`-Keyframe. Direkte Konsolidierungs-Vorlage für `Spinner`.
- `.stateIcon`/`.stateNeutral`/`.stateDanger`/`.stateInfo` in `ui.module.css` sind die direkte Vorlage für `StatusIcon` (38×38px, 10px Radius, tone-basierte `color-mix`-Hintergründe).
- Vier Call-Sites mit exakten CSS-Werten in den Explore-Transkripten dieses Research-Laufs (siehe Konversationshistorie dieser Session) — jede ersetzbar 1:1 ohne Verhaltensänderung.

## Befund 7 — IconButton/Modal/Drawer

- Modal: natives `<button>` an 3 Stellen (`overlayClose`, `closeButtonFloating`, `closeButton`); `.closeButton` lebt in gemeinsamer `ui.module.css`, `.closeButtonFloating` ist Modal-eigen, aber visuell identisch zu `Button`s `floating`-Variante (14px Radius) — Zufall, keine gemeinsame Quelle.
- Drawer: natives `<button>` an 2 Stellen, nutzt bereits dieselbe `ui.module.css` `.closeButton`-Klasse wie Modals Default-Variante; Drawer nutzt bereits `color-mix(..., var(--border-subtle) ...)` für Trennlinien (NICHT das Modal-Literal `rgba(45,41,38,.08)`).
- `AccentRule`: `<span aria-hidden>`, Token `--ui-line`, kein `<hr>`-Element — technisch ungeeignet als Ersatz für `border-bottom`/`border-top` auf Containern; die Token-Alternative (`var(--border-subtle)`) ist der bessere Weg, beides zu vereinheitlichen.
- `Button.tsx`: Varianten inkl. `floating` (14px Radius); `iconOnly` existiert bereits, erzwingt aber kein `aria-label`.
- Card-Radien: 4px (fast alle Varianten), 10px (`nestedFlat`, höchster Wert) — Zielwert für Modal/Drawer-Angleichung.
- Elf Fundstellen mit nativen `<button>` außerhalb der definierenden Datei (Modal, Drawer, Accordion, AvatarStack, Switch, Tabs, NavArrow, ThumbnailStrip, YearPicker×5, DatePicker×12) — vollständige Liste in CONTEXT.md unter Befund 8 übernommen in die Ausnahmeliste.

## Befund 8 — ESLint-Guard/Storybook-Taxonomie

- `uiPrimitiveGuard` in `frontend/eslint.config.mjs`: `no-restricted-syntax` mit `JSXOpeningElement[name.name='<tag>']`-Selektoren für `select/input/textarea`, Severity `error` repo-weit, VOLLSTÄNDIG `off` für `files: ['src/components/ui/**/*.{ts,tsx}']` (direktoriumsweite Ausnahme — das ist exakt die Lücke, die Befund 8 schließen soll), zusätzlich eine `warn`-Herabstufung für eine fest eingefrorene `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Liste (Ratchet-Muster, 264 Verstöße/67 Dateien Stand 2026-09-01, darf nur schrumpfen).
- Storybook-Inventar (live gegen `http://127.0.0.1:6006/index.json` verifiziert): 38 `UI/*`-Titel, 10 `Showcases/*`-Titel (Liste in CONTEXT.md übernommen).
- `CLAUDE.md`s Abschnitt „Frontend-UI (globales Design-System)" ist stellenweise veraltet (behauptet ESLint „warnt" und werde „auf error angehoben", tatsächlich bereits `error`; erwähnt `<button>` als „verboten" ohne dass dafür eine Regel existiert — wird jetzt erst durch diesen Auftrag wahr).
- `AGENTS.md` hat KEINEN identisch benannten Abschnitt; die Entsprechung ist „Team4s UI Implementation Contract" Punkt 13 (English-sprachig, prozedural, ohne die ESLint-/Verbots-Details von CLAUDE.md).
- `docs/FRONTEND_ARCHITEKTUR.md` Zeile 219: ein Absatz „Showcase/Referenz", nennt `UI/*`/`Showcases/*` — muss auf die neue Dreiteilung umgestellt werden.

## Sources

Alle Angaben direkt aus dem Repo gelesen/gegrept durch vier parallele Explore-Subagenten (2026-10-29, diese Session) plus einen fünften Subagenten für Test-Infrastruktur (`axeSetup.ts`, `vitest.config.ts`, bestehende `jest-axe`-Tests, `@types/react` Signaturen) und direkte eigene Verifikation (docker-compose.yml-Umlaute, `PublicHeaderBackdrop.tsx`, `FansubHeroSection.tsx`, `roleCatalog.accessibility.test.ts`, `Button.tsx`-Loading-Implementierung). Keine externen Quellen nötig — reine Repo-interne Konsistenzarbeit.

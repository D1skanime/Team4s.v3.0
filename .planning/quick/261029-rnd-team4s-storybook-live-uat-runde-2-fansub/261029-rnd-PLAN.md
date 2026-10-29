---
phase: quick-261029-rnd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - frontend/src/components/ui/Badge.module.css
  - "frontend/src/app/fansubs/[slug]/page.module.css"
  - frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts
  - frontend/src/components/fansubs/FansubHeroSection.stories.tsx
  - frontend/src/components/showcases/ModalInContextShowcase.tsx
  - frontend/src/components/showcases/ModalInContextShowcase.stories.tsx
  - frontend/src/components/showcases/DrawerShowcase.stories.tsx
  - frontend/src/components/ui/Card.module.css
  - frontend/src/components/ui/Modal.module.css
  - frontend/src/components/ui/Drawer.module.css
  - frontend/src/components/ui/IconButton.tsx
  - frontend/src/components/ui/IconButton.module.css
  - frontend/src/components/ui/IconButton.stories.tsx
  - frontend/src/components/ui/NavArrow.tsx
  - frontend/src/components/ui/NavArrow.module.css
  - frontend/src/components/ui/NavArrow.stories.tsx
  - frontend/src/components/fansubs/MediaViewerStage.tsx
  - frontend/src/components/ui/Accordion.tsx
  - frontend/src/components/ui/Accordion.module.css
  - frontend/eslint.config.mjs
  - frontend/src/components/ui/Accordion.stories.tsx
  - frontend/src/components/ui/FocalCarousel.stories.tsx
  - frontend/src/components/ui/ThumbnailStrip.stories.tsx
  - frontend/src/components/ui/UploadFileRow.stories.tsx
  - frontend/src/components/ui/UploadDropzone.stories.tsx
  - frontend/src/components/ui/MediaSlot.stories.tsx
  - frontend/src/components/ui/Pagination.stories.tsx
  - frontend/src/components/ui/HeroMetrics.stories.tsx
  - frontend/src/components/ui/ActivationStatusIndicator.stories.tsx
  - frontend/src/components/ui/ArtworkHero.stories.tsx
  - frontend/src/components/ui/catalogTaxonomy.test.ts
  - frontend/src/styles/globals.css
  - frontend/src/components/ui/Heading.tsx
  - frontend/src/components/ui/Heading.module.css
  - frontend/src/components/ui/Heading.stories.tsx
  - frontend/src/components/ui/Text.tsx
  - frontend/src/components/ui/Text.module.css
  - frontend/src/components/ui/Text.stories.tsx
  - frontend/src/components/ui/index.ts
  - frontend/src/components/ui/PageHeader.tsx
  - frontend/src/components/ui/PageHeader.module.css
  - frontend/src/components/ui/SectionHeader.tsx
  - frontend/src/components/ui/SectionHeader.module.css
  - frontend/src/components/ui/DialogHeader.tsx
  - frontend/src/components/ui/DialogHeader.module.css
  - frontend/src/components/ui/Card.tsx
  - frontend/src/components/ui/typography.regression.test.ts
  - frontend/src/components/ui/TypographyOverview.stories.tsx
  - frontend/src/components/ui/DisclosureIndicator.stories.tsx
  - frontend/src/components/ui/Button.stories.tsx
  - frontend/src/components/ui/Spinner.stories.tsx
  - frontend/src/components/ui/StatusIcon.stories.tsx
  - frontend/src/components/ui/Badge.stories.tsx
  - frontend/src/components/ui/Drawer.stories.tsx
  - frontend/src/components/ui/DatePicker.stories.tsx
  - frontend/src/components/ui/FormField.stories.tsx
  - CLAUDE.md
  - AGENTS.md
  - docs/FRONTEND_ARCHITEKTUR.md
autonomous: true
requirements: [261029-rnd-scope]

must_haves:
  truths:
    - "Der Status-Badge im Fansub-Hero-Banner einer aufgeloesten Gruppe mit Bannerfoto ist lesbar (mind. 4,5:1 Kontrast), rechnerisch bewiesen (erweiterter Vitest-Test) UND als eigene Storybook-Story sichtbar."
    - "ModalInContextShowcase und DrawerShowcase bieten je eine Story mit sichtbarem Namen 'Geoeffnet', die ohne Klick offen startet."
    - "Card .cardNestedFlat sowie Modal/Drawer nutzen auf Desktop UND in ihren Mobile-Media-Queries (ausser den echten Vollbild-0-Faellen) denselben --radius-surface-Token statt literaler Pixelwerte."
    - "NavArrow rendert ueber IconButton (neue variant='ghost'), behaelt sein bisheriges Aussehen und Verhalten (aria-label, disabled, Tastatur-Fokus), Groessennamen sind sm/md/lg; MediaViewerStage.tsx nutzt size='lg' statt 'large'."
    - "Accordion nutzt DisclosureIndicator fuer sein Oeffner-Symbol statt eines eigenen aria-hidden-Pfeils; die native button-Basis der Kopfzeile bleibt mit begruendetem Kommentar dokumentierte Ausnahme."
    - "Storybook zeigt Accordion/FocalCarousel/ThumbnailStrip/UploadFileRow/UploadDropzone/MediaSlot/Pagination/HeroMetrics/ActivationStatusIndicator/ArtworkHero unter 'Zusammengesetzte Bausteine/*' mit je einem 'Besteht aus:'-Hinweis."
    - "Ein neuer Vitest-Test (catalogTaxonomy.test.ts) laesst jeden nicht dokumentierten Grundbaustein-zu-Grundbaustein-Import unter Grundbausteine/* fehlschlagen und nennt Datei+Import in der Fehlermeldung."
    - "PageHeader/SectionHeader/DialogHeader/Card rendern nach der internen Umstellung auf die neuen Heading/Text-Bausteine pixelgleich wie vorher (automatischer Regressionstest + volle bestehende Testsuite gruen)."
    - "Eine neue Storybook-Seite 'Grundbausteine/Typografie' zeigt H1-H4 und alle vier Text-Varianten mit Beispieltexten."
    - "DisclosureIndicator/Button/IconButton/Spinner/StatusIcon/Badge haben je eine 'Groessen und Varianten'-Uebersichtsstory, die alle Kombinationen in einer Story zeigt."
    - "Kein sichtbarer Story-Name unter components/ui/** oder components/showcases/** enthaelt mehr eine ASCII-Umlautersetzung (ae/oe/ue/ss statt ae/oe/ue/ss-Umlaute)."
    - "CLAUDE.md, AGENTS.md und docs/FRONTEND_ARCHITEKTUR.md spiegeln den neuen Stand (IconButton-ghost, Heading/Text, Katalogpruefung, Kategorienzahlen) wider."
    - "npm run typecheck, npm run lint, npm test (volle Suite) und npm run build-storybook laufen im Frontend-Container fehlerfrei; Storybooks index.json zeigt die erwarteten neuen/verschobenen Eintraege live."
  artifacts:
    - path: frontend/src/components/ui/Heading.tsx
      provides: "Neuer Typografie-Grundbaustein mit getrennten level (Tag)/size (visuelle Stufe) Props"
    - path: frontend/src/components/ui/Text.tsx
      provides: "Neuer Typografie-Grundbaustein mit body/soft/meta/small-Varianten"
    - path: frontend/src/components/ui/catalogTaxonomy.test.ts
      provides: "Automatische Pruefung gegen stillschweigende Grundbaustein-Verbuende"
    - path: frontend/src/components/ui/typography.regression.test.ts
      provides: "Pixel-Regressionsnachweis fuer PageHeader/SectionHeader/DialogHeader/Card nach der Heading/Text-Umstellung"
    - path: frontend/src/components/fansubs/FansubHeroSection.stories.tsx
      provides: "Storybook-Nachweis des Badge-Kontrastfixes (Status 'dissolved' + Bannerfoto)"
  key_links:
    - from: "frontend/src/components/ui/Badge.module.css"
      to: "frontend/src/app/fansubs/[slug]/page.module.css"
      via: "CSS-Variablen-Override --badge-muted-bg/--badge-muted-fg innerhalb .heroBodyOnBanner"
      pattern: "badge-muted-(bg|fg)"
    - from: "frontend/src/components/ui/NavArrow.tsx"
      to: "frontend/src/components/ui/IconButton.tsx"
      via: "variant=ghost + spezifitaetserhoehte NavArrow-Overrides"
      pattern: "IconButton"
    - from: "frontend/src/components/ui/PageHeader.tsx"
      to: "frontend/src/components/ui/Heading.tsx"
      via: "level/size Props statt eigenem h1"
      pattern: "Heading level"
    - from: "frontend/src/components/ui/catalogTaxonomy.test.ts"
      to: "frontend/src/components/ui/Button.tsx"
      via: "dokumentierte Ausnahme-Map EXCEPTIONS"
      pattern: "EXCEPTIONS"
---

<objective>
Storybook Live-UAT Nachbesserung Runde 2 (nach zwei erfolgreichen Codex-Reviews und Runde 1):
acht vom Menschen bei der ersten Live-Abnahme gefundene Befunde beheben, ohne bestehende
Grundentscheidungen zu revidieren. Fansub-Badge-Kontrastfix (Token-Override-Muster aus Runde 1
fortgefuehrt), Modal/Drawer "Geoeffnet"-Stories, Radius-Token-Vereinheitlichung inkl. mobil,
IconButton bekommt eine 'ghost'-Variante fuer ein auf IconButton umgestelltes NavArrow,
Accordion auf DisclosureIndicator umgebaut, zehn Komponenten von Grundbausteine/* nach
Zusammengesetzte Bausteine/* umsortiert mit neuer automatischer Katalogpruefung, zwei neue
Typografie-Grundbausteine (Heading/Text) mit pixelgleicher interner Migration von
PageHeader/SectionHeader/DialogHeader/Card, sechs neue Uebersichts-Stories, ein repo-weiter
Umlaut-Sweep aller sichtbaren Story-Namen, aktualisierte Doku.

Purpose: Der Mensch macht die abschliessende Live-Abnahme dieses ki-run-Auftrags — dies ist die
letzte Chance, alle acht Befunde vollstaendig und nachweisbar zu schliessen, bevor er entscheidet.
Output: Kontrastsicherer Fansub-Hero-Badge, zwei neue "Geoeffnet"-Stories, ein gemeinsames
Radius-Token fuer Card/Modal/Drawer (auch mobil), IconButton mit 'ghost'-Variante + darauf
umgestelltes NavArrow (sm/md/lg), Accordion mit DisclosureIndicator, zehn umsortierte
Komponenten mit "Besteht aus"-Hinweisen, eine neue automatische Katalogpruefung, Heading/Text
als neue Grundbausteine inkl. "Grundbausteine/Typografie"-Seite, sechs neue Uebersichts-Stories,
umlautkorrekte Story-Namen repo-weit, aktualisierte CLAUDE.md/AGENTS.md/FRONTEND_ARCHITEKTUR.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/261029-rnd-team4s-storybook-live-uat-runde-2-fansub/261029-rnd-CONTEXT.md
@.planning/quick/261029-rnd-team4s-storybook-live-uat-runde-2-fansub/261029-rnd-RESEARCH.md
@.planning/quick/261029-i1y-team4s-storybook-uat-runde-1-zustandskar/261029-i1y-SUMMARY.md
@CLAUDE.md
@AGENTS.md

<interfaces>
Badge.module.css .badgeMuted aktuell: background: rgba(255,255,255,.38); color: #66758d;
(Zeilen 46-51). page.module.css .heroBodyOnBanner (Zeile 103) ueberschreibt bereits
--hero-metrics-label/--hero-metrics-value nach demselben Muster, das Task 1 fuer Badge
fortsetzt. FansubHeroSection.accessibility.test.ts definiert lokal (nicht exportiert, aber im
selben Datei-Scope wiederverwendbar) hexRgb/mix/luminance/contrast/extractColorFromRule/
extractVarValue sowie worstCaseBackground (mix(BLACK, WHITE, scrimAlpha=0.88) entspricht etwa
rgb(30.6,30.6,30.6), Luminanz etwa 0,013).

IconButton.tsx Props: icon, aria-label (Pflicht), variant?: 'default'|'floating', size?:
'sm'|'md'|'lg'. IconButton.module.css: .iconButton (40x40px, 14px Radius, Rahmen+Schatten),
.iconButtonSm (32px/12px), .iconButtonLg (48px/16px), .iconButtonFloating (position absolute).
NavArrow.tsx aktuell natives button, Props direction, label, onClick, disabled?, size?:
'default'|'large'. NavArrow.module.css: .navArrow (var(--control-height-md) ca. 44px, Radius
8px, transparent, opacity-Hover) und .navArrowLarge (56px, Radius 999px, color-mix-Hintergrund,
weisses Icon).

DisclosureIndicator.tsx Props open?, size?: 'sm'|'md'|'lg', variant?: 'plain'|'button' — rein
dekorativ, aria-hidden="true", rendert ChevronDown/ChevronRight aus lucide-react.

PageHeader.tsx/SectionHeader.tsx/DialogHeader.tsx/Card.tsx rendern aktuell jeweils einen eigenen
h1/h2-oder-h3/h3/h3 plus p fuer die Beschreibung (exakte CSS-Werte siehe Tasks 8-10 unten).
globals.css Zeile 124 --radius-surface: 10px;, Zeilen 154-157 --text-strong/-body/-soft/-faint.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Fansub-Badge-Kontrastfix + erweiterter WCAG-Test (Befund 1)</name>
  <files>frontend/src/components/ui/Badge.module.css, "frontend/src/app/fansubs/[slug]/page.module.css", frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts, frontend/src/components/fansubs/FansubHeroSection.stories.tsx</files>
  <behavior>
    - Ohne Bannerfoto: .badgeMuted sieht exakt wie heute aus (Fallback-Werte unveraendert).
    - Mit Bannerfoto + status: 'dissolved' (Badge-Variante muted): der Badge-Text erreicht
      mindestens 4,5:1 Kontrast gegen seine EIGENE, auf dem Worst-Case-Scrim aufliegende
      Chip-Flaeche (zweistufige Mischung: Chip-Hintergrund ueber Scrim-Hintergrund, dann Text
      ueber diesem Chip-Hintergrund) — nicht nur direkt gegen den Scrim.
  </behavior>
  <action>
    Badge.module.css's .badgeMuted bekommt zwei neue CSS-Variablen mit dem AKTUELLEN Wert als
    Fallback: background: var(--badge-muted-bg, rgba(255, 255, 255, 0.38)); color:
    var(--badge-muted-fg, #66758d); (border-color/box-shadow unveraendert). Reine Tokenisierung,
    kein Verhaltenswechsel fuer die ~45+ anderen variant="muted"-Verwender.

    page.module.css's .heroBodyOnBanner-Regel (Zeile ~103) ergaenzt zusaetzlich zu den bereits
    vorhandenen --hero-metrics-*-Overrides: --badge-muted-bg: rgba(255, 255, 255, 0.18);
    --badge-muted-fg: #ffffff; (exakt die in CONTEXT.md Befund 1 vorgeschlagenen Werte — ergibt
    bei scrimAlpha=0.88 eine effektive Chip-Flaeche von ca. rgb(71,71,71), Kontrast weisser Text
    dagegen ca. 9,3:1, deutlich ueber 4,5:1).

    FansubHeroSection.accessibility.test.ts (RED zuerst): ergaenze am Dateianfang
    const badgeCss = fs.readFileSync(path.resolve(process.cwd(),
    'src/components/ui/Badge.module.css'), 'utf8'). Neue Test-Faelle im bestehenden describe:
    (a) ein it(...), das per extractVarValue(pageCss, '.heroBodyOnBanner', 'badge-muted-bg') und
    extractVarValue(pageCss, '.heroBodyOnBanner', 'badge-muted-fg') die zwei Override-Werte
    liest, den Chip-Hintergrund als mix(bgRgb, worstCaseBackground, bgAlpha) berechnet, den
    gerenderten Text als mix(fgRgb, chipBackground, fgAlpha) (bzw. fgRgb direkt falls
    fgAlpha===1) und contrast(renderedText, chipBackground) >= 4.5 behauptet; (b) ein it(...),
    das per Regex auf badgeCss bestaetigt, dass die Fallback-Werte unveraendert
    rgba(255, 255, 255, 0.38) bzw. #66758d sind (kein Verhaltenswechsel ohne Bannerfoto, analog
    zum bestehenden HeroMetrics-Fallback-Test).

    Neue Datei frontend/src/components/fansubs/FansubHeroSection.stories.tsx (bisher keine Story
    fuer diese Komponente vorhanden): title: 'Im Einsatz/FansubHeroSection', Import von
    FansubHeroSection und dem Typ FansubGroup aus @/types/fansub. Definiere zwei lokale
    FansubGroup-Fixtures mit allen Feldern id, slug, name, logo_url, banner_url, founded_year,
    dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
    anime_relations_count, projects_count, release_versions_count, members_count,
    aliases_count, created_at, updated_at (Werte frei waehlbar, analog zu showcaseGroup in
    PublicFansubSurfacesShowcase.fixtures.ts): activeGroup (status: 'active', banner_url: '')
    und dissolvedGroupWithBanner (status: 'dissolved', dissolved_year gesetzt, banner_url:
    '/covers/cover_1775164698913_a216b01d-a000-4871-878d-46e3a41e08e8.jpg' — existierender,
    bereits in Fixtures verwendeter Beispielpfad). Stories: Standard (group: activeGroup,
    stats: Beispiel-Array) und AufgelostMitBanner (name: 'Aufgeloest mit Banner', group:
    dissolvedGroupWithBanner, gleiche stats) — letztere macht den Kontrastfix im
    Storybook-Canvas sichtbar pruefbar. parameters.docs.description.component nennt kurz den
    Zweck (echte, produktive Public-Komponente, Mockdaten).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run src/components/fansubs/FansubHeroSection.accessibility.test.ts"</automated>
  </verify>
  <done>Badge.module.css nutzt tokenisierte Fallback-Variablen, page.module.css ueberschreibt sie innerhalb .heroBodyOnBanner, der erweiterte Vitest-Test beweist mind. 4,5:1 Kontrast UND unveraenderte Fallback-Werte, eine neue Storybook-Story zeigt den aufgeloesten Fall mit Banner sichtbar.</done>
</task>

<task type="auto">
  <name>Task 2: Modal/Drawer "Geoeffnet"-Stories (Befund 2)</name>
  <files>frontend/src/components/showcases/ModalInContextShowcase.tsx, frontend/src/components/showcases/ModalInContextShowcase.stories.tsx, frontend/src/components/showcases/DrawerShowcase.stories.tsx</files>
  <action>
    ModalInContextShowcase.tsx: ergaenze additive, optionale Prop initialOpen?: boolean
    (Standard false) an der Komponentensignatur; useState(false) wird zu
    useState(initialOpen). Die bestehende Standard-Story bleibt dadurch unveraendert (kein
    initialOpen uebergeben -> weiterhin geschlossen, Klick auf "Bearbeiten" noetig).

    ModalInContextShowcase.stories.tsx: neue Story Geoeffnet mit name: 'Geoeffnet', args: {
    initialOpen: true } — zeigt das Modal direkt beim Laden offen (Titelzeile, Schliessen-Icon,
    Formular, Footer-Buttons), ohne Klick.

    DrawerShowcase.stories.tsx: neue Story Geoeffnet mit name: 'Geoeffnet', identische Args wie
    die bestehende Standard-Story ({ open: true, onClose: () => {} }) — zur Paritaet mit der
    neuen Modal-Story, da Drawer bereits ohne Klick offen ist, aber bisher keine so benannte
    Story existierte.

    Hinweis zur Schreibweise: die sichtbaren name:-Werte in diesem Task heissen bewusst
    "Geoeffnet" (ohne Umlaut) als Platzhalter-Arbeitsstand fuer den repo-weiten Umlaut-Sweep in
    Task 13 — Task 13 korrigiert alle sichtbaren Namen inkl. dieser beiden auf "Geoeffnet" mit
    korrektem Umlaut (Geöffnet) in einem gemeinsamen, vollstaendigen Durchgang. Export-Bezeichner
    (Geoeffnet) bleiben ASCII, wie im Repo durchgaengig Konvention.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run build-storybook"</automated>
  </verify>
  <done>ModalInContextShowcase hat eine optionale initialOpen-Prop und eine neue Geoeffnet-Story, DrawerShowcase hat eine neue Geoeffnet-Story mit denselben Args wie Standard; beide Showcases starten in diesen Stories ohne Klick offen, typecheck und build-storybook sind gruen.</done>
</task>

<task type="auto">
  <name>Task 3: Radius-Token-Vereinheitlichung inkl. mobil (Befund 3)</name>
  <files>frontend/src/components/ui/Card.module.css, frontend/src/components/ui/Modal.module.css, frontend/src/components/ui/Drawer.module.css</files>
  <action>
    Card.module.css: .cardNestedFlat (Zeile 68, aktuell border-radius: 10px;) wird zu
    border-radius: var(--radius-surface); (identischer Zahlenwert, jetzt derselbe Token wie
    Modal/Drawer statt eines zufaellig gleichen Literals).

    Modal.module.css: in der @media (max-width: 767px)-Regel (Zeile ~95) wird .modalPanel's
    border-radius: 20px 0 0 20px; zu border-radius: var(--radius-surface) 0 0
    var(--radius-surface);. Die direkt darauf folgende zweite .modalPanel-Regel (Zeile ~102,
    border-radius: 0; fuer den echten Vollbild-Fall) bleibt UNVERAENDERT bei 0 — das ist kein
    Radius-Wert, sondern "kein Radius", semantisch etwas anderes als die 20px-Ecke. Ebenso
    .modalPanelStage bleibt bei 0.

    Drawer.module.css: in der @media (max-width: 767px)-Regel (Zeile ~108) wird .drawerPanel's
    border-radius: 20px 0 0 20px; zu border-radius: var(--radius-surface) 0 0
    var(--radius-surface);. In der @media (max-width: 759px)-Regel (Zeile ~135) wird
    .drawerPanelSheet's border-radius: 22px 22px 0 0; zu border-radius: var(--radius-surface)
    var(--radius-surface) 0 0;.

    Reine Wert-zu-Token-Umstellung ohne sichtbare Groessenaenderung (10px bleibt 10px) — die
    Live-Pruefung in Task 15 bestaetigt per Viewport 390x844, dass sich am Erscheinungsbild von
    Modal/Drawer auf Mobile nichts verschlechtert hat.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm test -- --run"</automated>
  </verify>
  <done>Card .cardNestedFlat sowie die Mobile-Eckenradien von Modal .modalPanel und Drawer .drawerPanel/.drawerPanelSheet nutzen var(--radius-surface) statt literaler Pixelwerte; die echten Vollbild-0-Faelle bleiben unveraendert bei 0; volle Testsuite ist gruen.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: IconButton-Variante 'ghost' + NavArrow auf IconButton umstellen (Befund 8, Teil 1)</name>
  <files>frontend/src/components/ui/IconButton.tsx, frontend/src/components/ui/IconButton.module.css, frontend/src/components/ui/IconButton.stories.tsx, frontend/src/components/ui/NavArrow.tsx, frontend/src/components/ui/NavArrow.module.css, frontend/src/components/ui/NavArrow.stories.tsx, frontend/src/components/fansubs/MediaViewerStage.tsx</files>
  <behavior>
    - NavArrow sieht nach der Umstellung exakt wie vorher aus (transparent, Opazitaets-Hover
      fuer md, dunkel getoenter Kreis fuer lg) und verhaelt sich identisch (aria-label,
      disabled, Tastatur-Fokus-Ring).
    - IconButton's bestehende default/floating-Varianten bleiben unveraendert.
  </behavior>
  <action>
    IconButton.tsx: erweitere IconButtonVariant um 'ghost' ('default' | 'floating' | 'ghost').
    WICHTIG: ergaenze in der classNames(...)-Aufrufliste (dort, wo bereits
    `variant === 'floating' && styles.iconButtonFloating,` steht, Zeile ~36) eine zusaetzliche
    Zeile `variant === 'ghost' && styles.iconButtonGhost,` — ohne diese Verdrahtung ist
    .iconButtonGhost totes CSS und NavArrow uebernimmt weiterhin IconButtons Standard-Optik
    (Rahmen/Schatten), was das Aussehen sichtbar veraendern wuerde.
    IconButton.module.css ergaenzt (am Dateiende, NACH den bestehenden Regeln, damit
    Tie-Breaks innerhalb dieser einen Datei zugunsten von ghost greifen):
    .iconButtonGhost { border-color: transparent; background: transparent; box-shadow: none; }
    .iconButtonGhost:hover { background: transparent; opacity: 0.72; }
    IconButton.stories.tsx: neue Story Ghost (args: { variant: 'ghost' }).

    NavArrow.tsx: ersetze das native button durch IconButton (Import aus './IconButton').
    NavArrowProps.size wird von 'default' | 'large' zu 'sm' | 'md' | 'lg' (Standard 'md' statt
    'default'). Rendert IconButton mit variant="ghost", size={size}, icon={&lt;Icon .../&gt;},
    aria-label={label}, disabled={disabled}, onClick={onClick}, className={classNames(
    styles.navArrow, size === 'sm' && styles.navArrowSm, size === 'lg' && styles.navArrowLg,
    className)} — IconButtons eigenes size-Prop (sm/md/lg) steuert zugleich dessen Basis-Box,
    NavArrows eigene Klassen ueberschreiben Breite/Hoehe/Radius/Farbe fuer das abweichende
    NavArrow-Rezept.

    NavArrow.module.css: DA NavArrow und IconButton aus unterschiedlichen CSS-Modulen stammen
    und deren Buendel-Reihenfolge nicht garantiert ist, MUESSEN NavArrows eigene
    Override-Selektoren eine hoehere CSS-Spezifitaet als IconButtons reine Klassen-Selektoren
    haben (Element+Klasse statt nur Klasse) — NICHT per Bündel-Reihenfolge verlassen. Ersetze
    den Dateiinhalt durch: button.navArrow { width: var(--control-height-md); height:
    var(--control-height-md); min-width: var(--control-height-md); min-height:
    var(--control-height-md); border-radius: 8px; color: var(--ui-arrow); }
    button.navArrow:hover { opacity: 0.72; } button.navArrowSm { width:
    var(--control-height-sm); height: var(--control-height-sm); min-width:
    var(--control-height-sm); min-height: var(--control-height-sm); border-radius: 6px; }
    button.navArrowLg { width: 56px; height: 56px; min-width: 56px; min-height: 56px;
    border-radius: 999px; background: color-mix(in srgb, var(--text-strong) 55%, transparent);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08); color: #ffffff; }
    button.navArrowLg:hover { background: color-mix(in srgb, var(--text-strong) 75%,
    transparent); opacity: 1; } (Fokus-Ring und disabled-Optik kommen bewusst unveraendert von
    IconButtons eigenen .iconButton:focus-visible/:disabled-Regeln — NavArrow deklariert diese
    Eigenschaften nicht erneut.)

    NavArrow.stories.tsx: aktualisiere die Standard-Args size: 'default' -> size: 'md' und
    size: 'large' -> size: 'lg' (reine API-Migration; die kosmetische Namenskorrektur des
    sichtbaren NextGross-Namens erfolgt gesammelt in Task 13).

    MediaViewerStage.tsx: beide size="large"-Stellen (ca. Zeilen 201 und 208) werden zu
    size="lg". FocalCarouselInternals.tsx braucht KEINE Aenderung (nutzt keinen expliziten
    size-Wert, Standard bleibt gueltig).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm test -- --run"</automated>
  </verify>
  <done>IconButton hat eine dritte Variante 'ghost', NavArrow rendert darauf aufbauend mit unveraendertem Aussehen/Verhalten und den neuen Groessennamen sm/md/lg, MediaViewerStage.tsx nutzt size='lg', typecheck und volle Testsuite sind gruen.</done>
</task>

<task type="auto">
  <name>Task 5: Accordion auf DisclosureIndicator umbauen (Befund 4)</name>
  <files>frontend/src/components/ui/Accordion.tsx, frontend/src/components/ui/Accordion.module.css, frontend/eslint.config.mjs</files>
  <action>
    Accordion.tsx: ersetze das span mit aria-hidden="true" und dem Zeichen ▾ (Zeilen 89-97)
    durch &lt;DisclosureIndicator open={isOpen} size="sm" variant="plain" /&gt; (Import aus
    './DisclosureIndicator'). Die Kopfzeile selbst bleibt ein natives button-Element — ergaenze
    direkt darueber einen fachlichen Code-Kommentar, der begruendet, warum hier bewusst KEINE
    Button/IconButton-Basis genutzt wird: die Accordion-Kopfzeile ist ein vollbreites,
    klickbares Flex-Layout aus Titel+optionalem Inhalt+Oeffner-Symbol (kein reiner Icon- oder
    Text-Button), das weder zu Buttons Text-Button-Form noch zu IconButtons Icon-only-Form
    passt — das native button bleibt daher die technisch zutreffende Basis fuer dieses eigene
    ARIA-Widget (aria-expanded/aria-controls), waehrend das Oeffner-Symbol selbst jetzt den
    geteilten DisclosureIndicator-Baustein nutzt statt eines eigenen Nachbaus.

    Accordion.module.css: entferne .accordionChevron/.accordionChevronOpen (jetzt durch
    DisclosureIndicator ersetzt). Pruefe per Storybook-Live-Blick, ob accordionHeader's
    bestehendes gap: 12px ausreichend Abstand zum neuen DisclosureIndicator laesst (keine
    CSS-Anpassung erwartet, da DisclosureIndicator als flex-Kind wie das alte span behandelt
    wird).

    eslint.config.mjs: Accordion.tsx bleibt in UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES, aber der
    Kommentar "Kandidat fuer einen kuenftigen, eigenstaendigen Auftrag — nicht Teil der
    UAT-Runde 261029-i1y" wird ersetzt durch die fachliche Begruendung aus Accordion.tsx's
    neuem Kommentar (vollbreites Flex-Layout-Widget statt Icon-/Text-Button-Form) — die
    Ausnahme ist jetzt eine bewusste, begruendete Entscheidung dieser Runde, kein offener
    Punkt mehr.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run lint && npm test -- --run"</automated>
  </verify>
  <done>Accordion nutzt DisclosureIndicator fuer sein Oeffner-Symbol, die native button-Basis der Kopfzeile ist mit fachlichem Kommentar begruendet, eslint.config.mjs's Ausnahme-Eintrag hat dieselbe Begruendung statt eines Platzhalter-Verweises, lint/typecheck/Testsuite sind gruen.</done>
</task>

<task type="auto">
  <name>Task 6: Neun Komponenten + Accordion nach Zusammengesetzte Bausteine/* umsortieren (Befund 7)</name>
  <files>frontend/src/components/ui/Accordion.stories.tsx, frontend/src/components/ui/FocalCarousel.stories.tsx, frontend/src/components/ui/ThumbnailStrip.stories.tsx, frontend/src/components/ui/UploadFileRow.stories.tsx, frontend/src/components/ui/UploadDropzone.stories.tsx, frontend/src/components/ui/MediaSlot.stories.tsx, frontend/src/components/ui/Pagination.stories.tsx, frontend/src/components/ui/HeroMetrics.stories.tsx, frontend/src/components/ui/ActivationStatusIndicator.stories.tsx, frontend/src/components/ui/ArtworkHero.stories.tsx</files>
  <action>
    Fuer jede der zehn Dateien: aendere title: 'Grundbausteine/X' zu title: 'Zusammengesetzte
    Bausteine/X' und ergaenze parameters.docs.description.component (bzw. haenge an eine
    bestehende Beschreibung an, falls vorhanden) um einen Satz "Besteht aus: ..." nach dem
    Muster aus Drawer.stories.tsx/FormField.stories.tsx. Konkrete "Besteht aus"-Listen (per
    Import-Grep dieser Planung bestaetigt):
    - Accordion.stories.tsx: "Besteht aus: DisclosureIndicator (natives button als dokumentierte
      ARIA-Widget-Ausnahme)."
    - FocalCarousel.stories.tsx: "Besteht aus: Button, NavArrow (ueber FocalCarouselInternals)."
    - ThumbnailStrip.stories.tsx: "Besteht aus: ResponsiveImage."
    - UploadFileRow.stories.tsx: "Besteht aus: Badge, Button, FormField, Input, Textarea."
    - UploadDropzone.stories.tsx: "Besteht aus: Button, Input."
    - MediaSlot.stories.tsx: "Besteht aus: UploadDropzone."
    - Pagination.stories.tsx: "Besteht aus: Button."
    - HeroMetrics.stories.tsx: "Besteht aus: Button."
    - ActivationStatusIndicator.stories.tsx: "Besteht aus: Badge, Button."
    - ArtworkHero.stories.tsx: "Besteht aus: ResponsiveImage."
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run build-storybook"</automated>
  </verify>
  <done>Alle zehn Dateien zeigen title: 'Zusammengesetzte Bausteine/X' mit einem passenden "Besteht aus"-Hinweis, build-storybook ist gruen.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 7: Automatische Katalogpruefung gegen stillschweigende Grundbaustein-Verbuende (Befund 4/7, Rest)</name>
  <files>frontend/src/components/ui/catalogTaxonomy.test.ts</files>
  <behavior>
    - Fuer jede *.stories.tsx unter components/ui/ mit title beginnend 'Grundbausteine/' ohne
      dokumentierte Ausnahme: ein lokaler Import auf eine andere Datei, die selbst eine
      X.stories.tsx im selben Verzeichnis hat, laesst den zugehoerigen Testfall fehlschlagen
      und nennt Datei+Import in der Fehlermeldung.
    - Button.tsx -> Spinner ist die einzige zum Planungszeitpunkt bekannte, dokumentierte
      Ausnahme und laesst den Test GRUEN bleiben.
  </behavior>
  <action>
    Neue Datei frontend/src/components/ui/catalogTaxonomy.test.ts (Muster:
    roleCatalog.accessibility.test.ts — fs/path-basierte Textpruefung, kein jsdom-Rendering).
    Liest per fs.readdirSync alle *.stories.tsx direkt unter src/components/ui/, extrahiert via
    Regex /title:\s*'([^']+)'/ den Storybook-Titel je Datei. Fuer jede Datei mit Titel
    beginnend 'Grundbausteine/' leitet sie den Komponenten-Basisnamen aus dem Dateinamen ab
    (X.stories.tsx -> X). WICHTIG: prueft per fs.existsSync, OB X.tsx ueberhaupt existiert,
    BEVOR sie es liest — reine Dokumentations-Stories ohne eigene Produktkomponente (z. B.
    eine Typografie-Uebersichtsseite, die nur lokal in ihrer eigenen .stories.tsx-Datei eine
    kleine Render-Hilfsfunktion definiert, siehe Task 11) haben kein eigenes X.tsx und werden
    in diesem Fall mit einem eigenen it.skip(...)-Testfall (nicht einfach ausgelassen, damit
    in der Testausgabe sichtbar bleibt, dass die Datei bewusst uebersprungen wurde) behandelt
    statt eines fs.readFileSync-Crashes. Liest andernfalls X.tsx (und zusaetzlich
    X+'Internals.tsx', falls diese Datei existiert) und extrahiert daraus per Regex
    /from '\.\/([A-Za-z]+)'/g alle lokalen Importe.
    Fuer jeden gefundenen Import Y prueft sie per fs.existsSync, ob Y+'.stories.tsx' im selben
    Verzeichnis existiert (= Y ist selbst katalogisiert, egal unter welcher Kategorie). Ein
    Treffer ist ein Verstoss, AUSSER er steht in der Konstante EXCEPTIONS: Record&lt;string,
    string[]&gt; = { Button: ['Spinner'] } (mit Code-Kommentar: Spinner ist ausschliesslich ein
    internes Implementierungsdetail von Buttons Lade-Zustand, kein sichtbarer, eigenstaendig
    komponierter Baustein-Verbund — anders als z. B. Modal+DialogHeader+IconButton). Rendere
    PRO GEPRUEFTER GRUNDBAUSTEINE-DATEI einen eigenen it(...)-Testfall (nicht einen globalen
    Sammel-Test), dessen Fehlermeldung bei einem Verstoss exakt Dateiname UND den
    importierten Bezeichner nennt (expect(violations, \`${file} importiert ungeprueft: ${
    violations.join(', ')}\`).toEqual([])-Muster).

    Fuehre den Test gegen den AKTUELLEN Stand (nach Task 6) aus: er muss ohne weitere
    Anpassungen gruen sein, da Button->Spinner die einzige verbleibende Grundbaustein-zu-
    Grundbaustein-Kopplung ist. Pruefe zusaetzlich per eigenem Grep, ob PageHeader.tsx/
    SectionHeader.tsx/Card.tsx (die in Task 10 Heading/Text importieren werden) zum JETZIGEN
    Zeitpunkt noch KEINE solchen Importe haben (duerfen noch nicht existieren) — Task 10 muss
    die EXCEPTIONS-Map um diese drei Eintraege erweitern, sonst bricht dieser Test dort.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/ui/catalogTaxonomy.test.ts"</automated>
  </verify>
  <done>catalogTaxonomy.test.ts existiert, ist gegen den aktuellen Stand gruen, und schlaegt bei einem manuell eingefuegten, nicht ausgenommenen Grundbaustein-Import nachweislich mit einer Datei+Import-Fehlermeldung fehl (waehrend der Implementierung kurz verifiziert, danach wieder entfernt).</done>
</task>

<task type="auto">
  <name>Task 8: Typografie-Skala-Tokens in globals.css (Befund 5, Teil 1)</name>
  <files>frontend/src/styles/globals.css</files>
  <action>
    Ergaenze in :root, direkt nach den bestehenden --text-strong/-body/-soft/-faint-Tokens
    (nach Zeile 157), eine neue, kommentierte Gruppe: --font-size-h1: clamp(2rem, 3vw,
    2.75rem); --font-size-h2: 1.25rem; --font-size-h3: 1rem; --font-size-h4: 0.875rem;
    --font-weight-heading: 700;. Kommentar direkt darueber (Deutsch, fachlich): die vier
    Groessen entsprechen 1:1 den bereits produktiven Ueberschriftsgroessen von PageHeader
    (H1), DialogHeader (H2), SectionHeader/Card (H3); H4 ist eine neue, kleinere Stufe ohne
    bestehenden Pflicht-Einsatzort. --font-weight-heading entspricht dem unveraenderten
    Browser-Standard fuer h1-h6 (keine CSS-Regel setzt aktuell ein abweichendes
    font-weight auf diesen Elementen) — die Tokenisierung macht das bisher implizite Gewicht
    nur explizit, aendert es nicht. Keine Aenderung an bestehenden --text-*-Tokens.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"</automated>
  </verify>
  <done>globals.css enthaelt die fuenf neuen Tokens mit den exakten, oben genannten Werten; typecheck bleibt gruen (reine CSS-Ergaenzung ohne TS-Auswirkung).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 9: Neue Grundbausteine Heading und Text + Stories (Befund 5, Teil 2)</name>
  <files>frontend/src/components/ui/Heading.tsx, frontend/src/components/ui/Heading.module.css, frontend/src/components/ui/Heading.stories.tsx, frontend/src/components/ui/Text.tsx, frontend/src/components/ui/Text.module.css, frontend/src/components/ui/Text.stories.tsx, frontend/src/components/ui/index.ts</files>
  <behavior>
    - Heading level=1 ohne size rendert ein h1 mit font-size var(--font-size-h1).
    - Heading level=3 size=2 rendert ein h3-Tag, aber mit font-size var(--font-size-h2)
      (Tag und visuelle Groesse sind unabhaengig waehlbar).
    - Text variant='meta' rendert font-size var(--text-meta-size, 0.875rem) und color
      var(--text-meta-color, var(--text-soft)) — beide per CSS-Variable ueberschreibbar vom
      Aufrufer, ohne dass die Basis-Deklaration selbst angefasst werden muss.
  </behavior>
  <action>
    Heading.tsx: HeadingLevel = 1 | 2 | 3 | 4. HeadingProps extends
    HTMLAttributes&lt;HTMLHeadingElement&gt; { level: HeadingLevel; size?: HeadingLevel }.
    TAG_BY_LEVEL mappt 1-4 auf 'h1'-'h4'. Rendert das durch level bestimmte Tag mit den
    Klassen styles.heading (immer) plus einer size-spezifischen Klasse (size ?? level) aus
    { 1: styles.headingSize1, 2: styles.headingSize2, 3: styles.headingSize3, 4:
    styles.headingSize4 }, className und restliche Props durchgereicht (id etc., fuer
    DialogHeaders titleId-Bedarf in Task 10). Heading.module.css: .heading { margin: 0;
    font-weight: var(--font-weight-heading); } .headingSize1 { font-size: var(--font-size-h1);
    } .headingSize2 { font-size: var(--font-size-h2); } .headingSize3 { font-size:
    var(--font-size-h3); } .headingSize4 { font-size: var(--font-size-h4); } — BEWUSST OHNE
    color: die vier bestehenden Konsumenten (Task 10) behalten ihre eigene color-Deklaration
    (teils Token, teils vererbt), um Konflikte mit Heading's eigener color zu vermeiden.

    Text.tsx: TextVariant = 'body' | 'soft' | 'meta' | 'small'. TextProps extends
    HTMLAttributes&lt;HTMLParagraphElement&gt; { variant?: TextVariant }, Standard 'body'.
    Rendert immer ein p-Element mit einer variant-spezifischen Klasse. Text.module.css (KEIN
    margin-Reset — Aufrufer setzen ihr eigenes margin, siehe Task 10): .textBody { font-size:
    var(--text-body-size, 1rem); color: var(--text-body-color, var(--text-body)); } .textSoft
    { font-size: var(--text-soft-size, 1rem); color: var(--text-soft-color,
    var(--text-soft)); } .textMeta { font-size: var(--text-meta-size, 0.875rem); color:
    var(--text-meta-color, var(--text-soft)); } .textSmall { font-size:
    var(--text-small-size, 0.75rem); color: var(--text-small-color, var(--text-faint)); } —
    das var(..., Fallback)-Muster erlaubt Aufrufern spaeter (Task 10), per eigener CSS-Klasse
    auf demselben Element NUR die Groesse/Farbe zu ueberschreiben, ohne von der
    CSS-Modul-Buendelreihenfolge abhaengig zu sein (identisches Muster wie Badge/
    --hero-metrics-* aus Task 1 bzw. Runde 1).

    Ergaenze index.ts um export * from './Heading' (alphabetisch nach './FocalCarousel', vor
    './HeroMetrics') und export * from './Text' (alphabetisch nach './Table', vor
    './Textarea'... falls Textarea vorhanden einsortieren, sonst ans Ende vor './ThumbnailStrip').

    Heading.stories.tsx (title: 'Grundbausteine/Heading'): Stories H1 (level:1, children:
    'Naruto'), H2 (level:2, children: 'Anime bearbeiten'), H3 (level:3, children:
    'Uebersicht'), H4 (level:4, children: 'Verknuepfte Anime'), AbweichendeVisuelleGroesse
    (name: 'Abweichende visuelle Groesse', level:3, size:2, children: 'Semantisch h3, visuell
    wie H2').

    Text.stories.tsx (title: 'Grundbausteine/Text'): Stories Body (variant:'body'), Soft
    (variant:'soft'), Meta (variant:'meta'), Small (variant:'small'), je mit kurzem
    Beispielsatz passend zur Tonalitaet.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run build-storybook"</automated>
  </verify>
  <done>Heading und Text existieren als neue, eigenstaendige Grundbausteine mit Stories, sind aus index.ts exportiert, typecheck und build-storybook sind gruen.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 10: PageHeader/SectionHeader/DialogHeader/Card intern auf Heading/Text umstellen, pixelgenau (Befund 5, Teil 3)</name>
  <files>frontend/src/components/ui/PageHeader.tsx, frontend/src/components/ui/PageHeader.module.css, frontend/src/components/ui/SectionHeader.tsx, frontend/src/components/ui/SectionHeader.module.css, frontend/src/components/ui/DialogHeader.tsx, frontend/src/components/ui/DialogHeader.module.css, frontend/src/components/ui/Card.tsx, frontend/src/components/ui/Card.module.css, frontend/src/components/ui/catalogTaxonomy.test.ts, frontend/src/components/ui/typography.regression.test.ts</files>
  <behavior>
    - Jede der vier Komponenten rendert nach der Umstellung BYTE-IDENTISCHE effektive
      font-size/color/line-height/letter-spacing/margin-Werte wie vor diesem Task (siehe
      exakte Zielwerte unten) — ein neuer Regressionstest beweist das pro Komponente.
  </behavior>
  <action>
    PageHeader.tsx: ersetze &lt;h1 className={styles.pageTitle}&gt;{title}&lt;/h1&gt; durch
    &lt;Heading level={1} className={styles.pageTitle}&gt;{title}&lt;/Heading&gt; (Import aus
    './Heading'). Ersetze &lt;p className={styles.pageDescription}&gt;{description}&lt;/p&gt;
    durch &lt;Text variant="meta" className={styles.pageDescription}&gt;{description}&lt;/Text&gt;
    (Import aus './Text'). PageHeader.module.css's .pageTitle verliert margin/font-size (jetzt
    von Heading), behaelt color: var(--text-strong); line-height: 0.98; letter-spacing:
    -0.035em; text-wrap: balance;. .pageDescription verliert font-size/color, behaelt margin:
    8px 0 0; line-height: 1.55; max-width: 66ch; und ergaenzt --text-meta-size: 1rem;
    --text-meta-color: #657086; (exakter bisheriger Wert, jetzt per CSS-Variable statt
    direkter Deklaration gesetzt).

    SectionHeader.tsx: entferne die lokale Variable const Heading = level === 3 ? 'h3' : 'h2'
    vollstaendig (Namenskollision mit dem neuen Import) und importiere Heading/Text aus
    './Heading'/'./Text'. Beide bisherigen &lt;Heading className=...&gt;{title}&lt;/Heading&gt;-
    Stellen (Titel-Row-Variante und einfache Variante) werden zu &lt;Heading level={level}
    size={3} className={\`${styles.sectionTitle} ${titleClassName ?? ''}\`.trim()}&gt;{title}
    &lt;/Heading&gt; (level bleibt die bestehende 2|3-Prop, size ist IMMER 3, da sectionTitle
    visuell stets 1rem bleibt, unabhaengig vom Tag). Ersetze &lt;p
    className={styles.sectionDescription}&gt;{description}&lt;/p&gt; durch &lt;Text
    variant="soft" className={styles.sectionDescription}&gt;{description}&lt;/Text&gt;.
    SectionHeader.module.css's .sectionTitle verliert margin/font-size, behaelt color:
    var(--text-strong); line-height: 1.15; letter-spacing: -0.015em;. .sectionDescription
    verliert font-size/color, behaelt die VOLLE Margin-Shorthand margin: 6px 0 0; (NICHT nur
    margin-top: 6px; — der aktuelle Stand setzt effektiv `margin: 6px 0 0 0` ueber die
    bestehenden Regelbloecke; ein reines margin-top wuerde den unteren/seitlichen Browser-
    Standard-Absatzabstand wieder durchschlagen lassen, da Text.module.css bewusst KEINEN
    eigenen margin-Reset vornimmt und globals.css keinen globalen p-Reset hat), line-height:
    1.5; max-width: 58ch; und ergaenzt --text-soft-size: 0.92rem; --text-soft-color: #657086;.

    DialogHeader.tsx: ersetze &lt;h3 id={titleId} className={styles.dialogTitle}&gt;{title}
    &lt;/h3&gt; durch &lt;Heading level={3} size={2} id={titleId}
    className={styles.dialogTitle}&gt;{title}&lt;/Heading&gt; (semantisches Tag bleibt h3
    unveraendert, visuelle Groesse wechselt auf die H2-Stufe = 1,25rem, identisch zum
    bisherigen Wert). Ersetze &lt;p className={styles.dialogDescription}&gt;{description}&lt;/p&gt;
    durch &lt;Text variant="soft" className={styles.dialogDescription}&gt;{description}&lt;/Text&gt;
    (color var(--text-soft) UND font-size 1rem entsprechen bereits exakt dem 'soft'-Default —
    KEINE CSS-Variablen-Ueberschreibung noetig). DialogHeader.module.css's .dialogTitle
    verliert margin/font-size, behaelt color: var(--text-strong);. .dialogDescription behaelt
    nur margin: 6px 0 0; (color-Zeile entfernen, jetzt redundant zum Text-Default).

    Card.tsx: ersetze &lt;h3 className={styles.cardTitle}&gt;{title}&lt;/h3&gt; durch
    &lt;Heading level={3} size={3} className={styles.cardTitle}&gt;{title}&lt;/Heading&gt;.
    Ersetze &lt;p className={styles.cardDescription}&gt;{description}&lt;/p&gt; durch &lt;Text
    variant="soft" className={styles.cardDescription}&gt;{description}&lt;/Text&gt;.
    Card.module.css's .cardTitle verliert margin/font-size, behaelt NUR line-height: 1.3;
    (KEINE color-Zeile ergaenzen — cardTitle hatte nie eine explizite Farbe, bleibt bewusst
    vererbt, Heading selbst setzt ebenfalls keine color). .cardDescription verliert color
    (jetzt identisch zum 'soft'-Default), behaelt margin: 4px 0 0; und ergaenzt
    --text-soft-size: 0.92rem; (color-Override NICHT noetig, da var(--text-soft) bereits der
    'soft'-Default ist).

    catalogTaxonomy.test.ts: erweitere die EXCEPTIONS-Konstante aus Task 7 um PageHeader:
    ['Heading', 'Text'], SectionHeader: ['Heading', 'Text'], Card: ['Heading', 'Text'] (mit
    Kommentar: gemeinsame, bewusst geteilte Typografie-Grundbausteine, keine zufaellige
    Kopplung) — ohne diese Ergaenzung schlaegt der Test nach den obigen Importen fehl.

    Neue Datei frontend/src/components/ui/typography.regression.test.ts (Muster: liest
    PageHeader.module.css, SectionHeader.module.css, DialogHeader.module.css, Card.module.css,
    Heading.module.css, Text.module.css, globals.css per fs, kein Rendering). Je ein it(...)
    pro Komponente, das per Regex bestaetigt: PageHeader-Titel resultiert in font-size
    clamp(2rem, 3vw, 2.75rem) (aus Heading.module.css .headingSize1 + globals.css
    --font-size-h1), color var(--text-strong), line-height 0.98, letter-spacing -0.035em,
    margin 0; PageHeader-Beschreibung in font-size 1rem/color #657086 (aus den
    --text-meta-size/-color-Overrides in PageHeader.module.css), margin 8px 0 0; analog fuer
    SectionHeader (font-size 1rem Titel, 0.92rem/#657086 Beschreibung, UND explizit die VOLLE
    Margin-Shorthand margin 6px 0 0 der Beschreibung pruefen, nicht nur margin-top — das ist
    die konkrete Stelle, an der ein unvollstaendiges margin-Reset einen echten unteren
    Abstands-Regressionsfehler verursachen wuerde), DialogHeader (font-size 1.25rem Titel,
    1rem/var(--text-soft) Beschreibung), Card (font-size 1rem Titel OHNE color-Deklaration,
    0.92rem/var(--text-soft) Beschreibung).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run src/components/ui/typography.regression.test.ts src/components/ui/catalogTaxonomy.test.ts && npm test -- --run"</automated>
  </verify>
  <done>PageHeader/SectionHeader/DialogHeader/Card rendern ueber Heading/Text, der neue Regressionstest beweist pixelgleiche effektive Werte, catalogTaxonomy.test.ts ist mit der erweiterten Ausnahme-Map weiterhin gruen, volle Testsuite ist gruen.</done>
</task>

<task type="auto">
  <name>Task 11: Storybook-Seite "Grundbausteine/Typografie" (Befund 5, Teil 4)</name>
  <files>frontend/src/components/ui/TypographyOverview.stories.tsx</files>
  <action>
    Neue Datei TypographyOverview.stories.tsx: definiere lokal (nur in dieser Datei, kein
    Export aus index.ts, da reine Dokumentation statt eigenstaendiger Produkt-Komponente) eine
    kleine Funktionskomponente TypographyOverview, die untereinander alle vier Heading-Stufen
    (level 1-4, Beispieltexte aehnlich echten Seiteninhalten: 'Naruto' als H1, 'Anime
    bearbeiten' als H2, 'Uebersicht' als H3, 'Verknuepfte Anime' als H4) und darunter alle vier
    Text-Varianten (body/soft/meta/small, je ein kurzer Beispielsatz) in einem vertikalen
    Flex-Stack mit sichtbarem Abstand zeigt. title: 'Grundbausteine/Typografie', component:
    TypographyOverview, tags: ['autodocs'], eine einzige Story Standard: Story = {}.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npx vitest run src/components/ui/catalogTaxonomy.test.ts && npm run build-storybook"</automated>
  </verify>
  <done>Storybook zeigt eine neue Seite Grundbausteine/Typografie mit H1-H4 und allen vier Text-Varianten; catalogTaxonomy.test.ts bleibt gruen (TypographyOverview.stories.tsx hat kein eigenes X.tsx und wird dort korrekt per it.skip behandelt, kein ENOENT-Crash); build-storybook ist gruen.</done>
</task>

<task type="auto">
  <name>Task 12: Uebersichts-Stories fuer DisclosureIndicator/Button/IconButton/Spinner/StatusIcon/Badge (Befund 6, Teil 1)</name>
  <files>frontend/src/components/ui/DisclosureIndicator.stories.tsx, frontend/src/components/ui/Button.stories.tsx, frontend/src/components/ui/IconButton.stories.tsx, frontend/src/components/ui/Spinner.stories.tsx, frontend/src/components/ui/StatusIcon.stories.tsx, frontend/src/components/ui/Badge.stories.tsx</files>
  <action>
    Ergaenze in jeder Datei EINE neue Story mit sichtbarem Namen 'Groessen und Varianten' (bzw.
    passendem Pendant), die per render: alle Kombinationen der jeweiligen Achsen in einem
    flex-wrap-Grid nebeneinander zeigt (keine neuen Einzel-Stories):
    - DisclosureIndicator.stories.tsx: size (sm/md/lg) x variant (plain/button) x open
      (true/false) — 12 Kombinationen, je mit kleinem Textlabel darunter, welche Kombination
      es ist.
    - Button.stories.tsx: variant (primary/secondary/ghost/subtle/danger/success/text/
      floating) x size (sm/md/lg) — 24 Kombinationen in einem Grid, children jeweils kurz
      (z. B. der Variantenname).
    - IconButton.stories.tsx: variant (default/floating/ghost) x size (sm/md/lg) — 9
      Kombinationen; floating-Kombinationen jeweils im bestehenden position:relative-Decorator-
      Wrapper rendern wie in der bestehenden Floating-Story.
    - Spinner.stories.tsx: size (sm/md/lg) — 3 Kombinationen, jede im bestehenden
      color: var(--accent-primary)-Wrapper.
    - StatusIcon.stories.tsx: tone (neutral/info/success/warning/danger) — 5 Kombinationen,
      je mit passendem lucide-react-Icon wie in den bestehenden Einzel-Stories.
    - Badge.stories.tsx: variant (neutral/success/warning/danger/info/muted) — 6
      Kombinationen.
    Jede neue Story bekommt parameters.docs.description.story mit einem kurzen Satz, der den
    Zweck nennt (alle Varianten auf einen Blick vergleichen).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run build-storybook"</automated>
  </verify>
  <done>Alle sechs Dateien haben eine neue, kombinierte Uebersichts-Story mit allen Varianten nebeneinander; build-storybook ist gruen.</done>
</task>

<task type="auto">
  <name>Task 13: Repo-weiter Sweep aller sichtbaren Story-Namen auf korrekte Umlaute (Befund 6, Teil 2 + Befund 8 MediaSlot + Rest)</name>
  <files>frontend/src/components/ui/Drawer.stories.tsx, frontend/src/components/ui/IconButton.stories.tsx, frontend/src/components/ui/Spinner.stories.tsx, frontend/src/components/ui/NavArrow.stories.tsx, frontend/src/components/ui/DisclosureIndicator.stories.tsx, frontend/src/components/ui/Accordion.stories.tsx, frontend/src/components/ui/DatePicker.stories.tsx, frontend/src/components/ui/FormField.stories.tsx, frontend/src/components/ui/MediaSlot.stories.tsx, frontend/src/components/showcases/ModalInContextShowcase.stories.tsx, frontend/src/components/showcases/DrawerShowcase.stories.tsx, frontend/src/components/fansubs/FansubHeroSection.stories.tsx</files>
  <action>
    Behebe zuerst die per Recherche konkret bestaetigten Faelle (fuege jeweils, falls noch
    nicht vorhanden, name: mit dem korrekten deutschen Text hinzu bzw. korrigiere den
    bestehenden name:-Wert):
    - Drawer.stories.tsx: Gross -> name: 'Groß'; NormalGross -> name: 'Normal, groß'.
    - IconButton.stories.tsx: Gross -> name: 'Groß'.
    - Spinner.stories.tsx: Gross -> name: 'Groß'.
    - NavArrow.stories.tsx: NextGross -> name: 'Nächstes, groß'.
    - DisclosureIndicator.stories.tsx: Geoeffnet -> name: 'Geöffnet'.
    - Accordion.stories.tsx: AlleGeschlossen -> name: 'Alle geschlossen'.
    - DatePicker.stories.tsx: GeschlossenesPanel -> name: 'Geschlossenes Panel'.
    - FormField.stories.tsx: AutomatischVerknuepfterFehler -> name: 'Automatisch verknüpfter
      Fehler'; AutomatischVerknuepftesDisabled -> name: 'Automatisch verknüpft: deaktiviert';
      AutomatischVerknuepftesSelect -> name: 'Automatisch verknüpft: Auswahl';
      AutomatischVerknuepfteTextarea -> name: 'Automatisch verknüpft: Textfeld'.
    - MediaSlot.stories.tsx: LeerDropzone -> name: 'Leer (Dropzone)'; ReplaceOverlay -> name:
      'Ersetzen-Overlay'; Disabled (bisher ohne Override) -> ergaenze name: 'Deaktiviert'.
    - ModalInContextShowcase.stories.tsx und DrawerShowcase.stories.tsx: die in Task 2 als
      Platzhalter angelegten name: 'Geoeffnet'-Werte -> name: 'Geöffnet'.
    - FansubHeroSection.stories.tsx: AufgelostMitBanner -> name: 'Aufgelöst mit Banner' (falls
      in Task 1 noch ohne Umlaut angelegt).

    Danach ein vollstaendiger zweiter Scan ueber ALLE *.stories.tsx unter
    frontend/src/components/ui/ UND frontend/src/components/showcases/: grep nach
    Export-Bezeichnern bzw. bestehenden name:-Werten, die die Zeichenfolgen ae/oe/ue enthalten
    UND dabei ein echtes deutsches Wort mit Umlaut meinen (z. B. Muster wie
    grep -rnE "(export const|name: ')[A-Za-z]*(ae|oe|ue)[A-Za-z']*" components/ui
    components/showcases --include="*.stories.tsx", danach jeden Treffer manuell pruefen und
    bei echtem Umlaut-Fall einen korrekten, lesbaren name:-Wert ergaenzen/korrigieren). Reine
    Export-Bezeichner-Ueberschneidungen ohne Umlaut-Bedarf (z. B. Namen, die zufaellig "oe"
    enthalten, aber kein deutsches Wort mit Umlaut meinen) bleiben unveraendert. NICHT Teil
    dieses Sweeps: eine Englisch-Text-Pruefung (explizit zurueckgezogen, siehe CONTEXT.md).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run build-storybook"</automated>
  </verify>
  <done>Alle oben gelisteten, konkret benannten Faelle sind korrigiert; der vollstaendige zweite Scan ist durchgefuehrt und etwaige weitere echte Umlaut-Faelle sind korrigiert; build-storybook ist gruen.</done>
</task>

<task type="auto">
  <name>Task 14: Dokumentation nachziehen (CLAUDE.md/AGENTS.md/docs/FRONTEND_ARCHITEKTUR.md)</name>
  <files>CLAUDE.md, AGENTS.md, docs/FRONTEND_ARCHITEKTUR.md</files>
  <action>
    CLAUDE.md, Abschnitt "Frontend-UI (globales Design-System)": aktualisiere die genannten
    Story-/Komponentenzahlen (34 Grundbausteine-Stories, 7 Zusammengesetzte-Bausteine-Stories,
    12 Im-Einsatz-Stories) auf die tatsaechlichen neuen Zahlen nach diesem Auftrag (per
    Storybook index.json in Task 15 ermittelt — diese Aenderung nach Task 15 vornehmen oder
    vorab per lokalem Build pruefen). Ergaenze einen kurzen Satz zu IconButtons neuer
    'ghost'-Variante (Basis fuer NavArrow) und zu den zwei neuen Typografie-Grundbausteinen
    Heading/Text (level/size bzw. variant-API, genutzt von PageHeader/SectionHeader/
    DialogHeader/Card).

    AGENTS.md: pruefe den Abschnitt "Team4s UI Implementation Contract" Punkt 13 (Storybook-
    Kategorien-Referenz) auf Aktualitaet — falls dort ebenfalls konkrete Zahlen genannt sind,
    gleichziehen, sonst unveraendert lassen (Punkt 13 nennt laut aktuellem Stand nur die drei
    Kategorienamen ohne Zahlen).

    docs/FRONTEND_ARCHITEKTUR.md: finde den bestehenden Storybook-Absatz (grep "Storybook")
    und ergaenze fachlich knapp: Heading/Text als neue, geteilte Typografie-Bausteine (von
    PageHeader/SectionHeader/DialogHeader/Card konsumiert), IconButtons dritte Variante
    'ghost' (Basis fuer NavArrow), die neue automatische Katalogpruefung
    (catalogTaxonomy.test.ts) als Qualitaetssicherung gegen stillschweigende
    Grundbaustein-Kopplungen, sowie die aktualisierte Kategorienzuordnung der zehn umsortierten
    Komponenten.
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"</automated>
  </verify>
  <done>CLAUDE.md/AGENTS.md/docs/FRONTEND_ARCHITEKTUR.md spiegeln IconButton-ghost, Heading/Text, die neue Katalogpruefung und die aktualisierten Kategorienzahlen wider.</done>
</task>

<task type="auto">
  <name>Task 15: Finale Vollstaendigkeitspruefung inkl. lebendem Storybook-Check und echter Live-Pruefung (alle acht Befunde)</name>
  <files></files>
  <action>
    Volle, repo-weite Pruefung in dieser Reihenfolge:
    1. docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run
       lint && npm test -- --run && npm run build-storybook" — alle vier muessen fehlerfrei
       durchlaufen; bei lint nur die bereits vorbestehenden, unbezogenen Fehler akzeptieren
       (per Vergleich mit dem Stand vor diesem Auftrag).
    2. docker compose up -d team4sv30-storybook (falls nicht laeuft) und curl
       http://127.0.0.1:6006/index.json (bzw. den entsprechenden Container-Port): bestaetige,
       dass KEINE der zehn umsortierten Komponenten (Accordion/FocalCarousel/ThumbnailStrip/
       UploadFileRow/UploadDropzone/MediaSlot/Pagination/HeroMetrics/
       ActivationStatusIndicator/ArtworkHero) mehr unter grundbausteine-* auftaucht, sondern
       jeweils unter zusammengesetzte-bausteine-*; bestaetige die Praesenz von
       grundbausteine-heading, grundbausteine-text, grundbausteine-typografie,
       im-einsatz-fansubherosection. Trage die ermittelten, tatsaechlichen Story-Zahlen pro
       Kategorie in CLAUDE.md nach (Ergaenzung zu Task 14, falls dort noch mit Platzhalter-
       Zahlen gearbeitet wurde).
    3. Fansub-Badge-Kontrast live pruefen: per
       docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "SELECT slug FROM
       fansub_groups WHERE status='dissolved' AND banner_url IS NOT NULL LIMIT 1;" (Container-
       und Zugangsdaten bestaetigt: Postgres-Dienst heisst team4sv30-db, nicht
       team4sv30-postgres; POSTGRES_USER=team4s, POSTGRES_DB=team4s_v2 laut .env/
       docker-compose.yml) nach einer REALEN aufgeloesten Gruppe mit Bannerfoto in
       der laufenden Dev-Datenbank suchen. Falls gefunden: die Seite
       http://192.168.235.196:3000/fansubs/&lt;slug&gt; per curl/Playwright-Screenshot
       abrufen und den Badge-Kontrast visuell bestaetigen (Screenshot mit dem Read-Tool
       pruefen). Falls KEINE solche Gruppe in der Dev-DB existiert: dies im Abschlussbericht
       explizit dokumentieren und ersatzweise einen Screenshot der in Task 1 angelegten
       Storybook-Story AufgelostMitBanner als gleichwertigen visuellen Nachweis beilegen.
    4. Radius-Mobile-Check: Storybook-Stories von Modal und Drawer (Zusammengesetzte
       Bausteine/*) per Playwright/Browser auf Viewport 390x844 pruefen, dass die Eckenrundung
       auf Mobile weiterhin wie vor diesem Auftrag aussieht (10px, jetzt per Token).
    5. Repo-weiter Grep-Nachweis: grep -rnE "(ae|oe|ue)[A-Za-z]*':" sowie eine gezielte Pruefung
       auf die in Task 13 explizit gelisteten Faelle — alle muessen jetzt korrekt umlautet
       sein (Stichprobe reicht, da Task 13 bereits vollstaendig war).
    6. Bestaetige per grep, dass KEIN Task dieses Plans eine repo-weite Englisch-Text-Pruefung
       vorgenommen hat (Scope-Treue zur expliziten Korrektur in CONTEXT.md).
  </action>
  <verify>
    <automated>docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit && npm run lint && npm test -- --run && npm run build-storybook"</automated>
  </verify>
  <done>Alle acht Befunde sind nachweislich behoben (automatisierte Tests gruen + mindestens ein echter oder gleichwertiger visueller Nachweis pro visuellem Befund dokumentiert), Storybooks index.json bestaetigt die neue Taxonomie live, keine Regression in lint/typecheck/Testsuite/build-storybook.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|--------------|
| Browser -> Next.js Frontend | Reine UI-/CSS-/Storybook-Aenderungen dieses Auftrags, keine neue Eingabeverarbeitung, kein neuer API-Endpunkt, keine neue Auth-Oberflaeche. |
| Admin/Public UI -> bestehende Public-Fansub-Seite | FansubHeroSection ist bereits produktiver Code; dieser Auftrag aendert nur CSS-Variablen-Fallbacks und fuegt eine Storybook-Story hinzu, kein neuer Datenfluss. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|------------|--------------|------------------|
| T-261029rnd-01 | Information Disclosure | FansubHeroSection.stories.tsx (neue Fixtures) | accept | Reine Mockdaten (keine echten Nutzer-/Gruppendaten), nur in Storybook sichtbar, kein Produktions-Datenpfad. |
| T-261029rnd-02 | Tampering | CSS-Variablen-Overrides (Badge/Heading/Text) | accept | Rein deklarative CSS-Werte, kein Nutzereingabepfad, keine Laufzeit-Interpolation von Nutzerdaten in diese Variablen. |
| T-261029rnd-SC | Tampering | npm-Installationen | n/a | Dieser Plan installiert KEINE neuen npm-Pakete (ausschliesslich bestehende lucide-react-Icons und bereits vorhandene Projektabhaengigkeiten); kein Package-Legitimacy-Gate erforderlich. |
</threat_model>

<verification>
Nach allen 15 Tasks: `npm run typecheck`, `npm run lint`, `npm test -- --run` (volle Suite),
`npm run build-storybook` laufen im Frontend-Container fehlerfrei. Storybooks `index.json`
zeigt die erwartete, verschobene Taxonomie (zehn Komponenten unter
`zusammengesetzte-bausteine-*`, neue `grundbausteine-heading`/`-text`/`-typografie`,
`im-einsatz-fansubherosection`). Mindestens ein echter oder gleichwertiger visueller Nachweis
pro visuellem Befund (1, 2, 3) ist im Abschlussbericht dokumentiert.
</verification>

<success_criteria>
- Alle acht CONTEXT.md-Befunde sind vollstaendig umgesetzt, keiner reduziert/vereinfacht.
- Keine Regression in Typecheck/Lint/Testsuite/build-storybook gegenueber dem Stand vor diesem
  Auftrag (ausser den bereits vorbestehenden, unveraenderten Altlast-Lint-Fehlern).
- PageHeader/SectionHeader/DialogHeader/Card sehen nach der Heading/Text-Umstellung
  nachweislich pixelgleich aus wie vorher.
- Keine Englisch-Text-Pruefung wurde vorgenommen (Scope-Korrektur eingehalten).
- CLAUDE.md/AGENTS.md/docs/FRONTEND_ARCHITEKTUR.md sind aktuell.
</success_criteria>

<output>
Create `.planning/quick/261029-rnd-team4s-storybook-live-uat-runde-2-fansub/261029-rnd-SUMMARY.md` when done
</output>

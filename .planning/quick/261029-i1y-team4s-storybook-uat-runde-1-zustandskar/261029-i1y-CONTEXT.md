# Quick Task 261029-i1y: Storybook UAT Runde 1 - Nachbesserung - Context

**Gathered:** 2026-10-29
**Status:** Ready for planning

<domain>
## Task Boundary

Live-UAT der Storybook-Einführung (Quick-Task 261029-d3k) wurde abgelehnt. Acht
Befunde sind zu beheben, ohne die Grundentscheidungen aus 261029-d3k
(Storybook ersetzt `/dev/ui-system`, Pflichtregel „Stories ziehen mit") zu
revidieren:

1. EmptyState/LoadingState/ErrorState auf den globalen `Card`-Baustein
   umbauen statt bespoke `.stateCard`; Icon-Farben über Tokens.
2. Fansub-Hero-Banner: echter Kontrast-Bug (nicht nur ein Showcase-Artefakt)
   auf der dunklen Bannerfläche — Gruppenname/„gegründet"/Kennzahlen kaum
   lesbar. Mind. WCAG AA.
3. Englische Showcase-Texte ins Deutsche übersetzen.
4. ASCII-Umlaute in neuen Kommentaren/Story-Texten korrigieren.
5. `FormField` soll Fehler-/Deaktiviert-Zustand automatisch an das
   umschlossene Feld weiterreichen (`aria-describedby`, `aria-invalid`,
   sichere Label-`id`-Verknüpfung), rückwärtskompatibel zu allen
   bestehenden Verwendungen.
6. Neue Grundbausteine `Spinner` und `StatusIcon`; vier App-Stellen mit
   eigenem Lade-Kreisel darauf umstellen.
7. Neuer Baustein `IconButton`; Modal/Drawer bekommen eine gemeinsame
   Titelzeile, nutzen `IconButton` statt natives `<button>` für das ✕,
   Trennstriche über `AccentRule`/Rahmen-Token, Ecken an Card angeglichen.
8. Storybook-Dreiteilung „Grundbausteine" / „Zusammengesetzte Bausteine" /
   „Im Einsatz", „Besteht aus"-Verweise, automatische Prüfung gegen native
   Elemente unter `components/ui`.

Explizit NICHT in diesem Auftrag: ein globaler Notice-/Hinweis-Baustein für
die ~29 App-Eigenbauten (warningBox, noticeBox …) — eigener Folgeauftrag.

Dies ist eine autonome `ki-run`-Nachbesserung (Branch `ki/team4s-261029-27a5`).
Keine interaktiven Rückfragen; technische Grauzonen werden hier als
Annahmen dokumentiert.

</domain>

<decisions>
## Implementation Decisions

### Vom Menschen bereits entschieden (bindend)
- Card statt `.stateCard` für EmptyState/LoadingState/ErrorState; Icon-Farben
  über Tokens; ErrorState behält seine Fehlerfarbe über Danger-Tokens.
- Fansub-Header-Kontrast mind. WCAG AA, auf Showcase UND echter Seite.
- Showcase-Texte deutsch; Umlaute überall korrekt.
- FormField-Doppel-Set-Problem beheben, rückwärtskompatibel zu ~47-59
  FormField- und ~43-55 Input-Verwendungen (genaue Zahl: siehe Befunde).
- Neue Grundbausteine `Spinner`, `StatusIcon`; vier genannte App-Stellen
  migrieren.
- Neuer Baustein `IconButton` für Modal/Drawer-✕; gemeinsame Titelzeile;
  Trennstriche über AccentRule/Token; Ecken an Card-Formensprache angeglichen
  (ausdrücklich als Entscheidung des Menschen markiert — nicht verhandelbar).
- Storybook-Dreiteilung mit „Besteht aus"-Verweisen und „Im Einsatz"-Stories;
  automatische Prüfung gegen native Elemente unter `components/ui`.
- Kein Notice-Baustein in diesem Auftrag.

### Befund 1 — Zustands-Karten (Claude's Discretion für die technische Umsetzung)
- `EmptyState`/`LoadingState` rendern künftig über `<Card variant="flat">`
  (Standard) bzw. `<Card variant="compact">` (wenn `compact`/kompakter
  Modus gesetzt ist) statt des bespoke `.stateCard`-Divs. `Card`s
  `flat`-Variante (`#f7f9fc→#edf1f7`-Verlauf, kein Schatten, 4px Radius) ist
  bereits die naheliegendste Entsprechung zum bisherigen „fast weißen
  Verlauf, eigener Rahmen" — genau DAS ist der Punkt: der 14px-Sonderradius
  verschwindet zugunsten von Cards 4px-Formensprache, damit es keine zweite
  Kartenoptik im Produkt mehr gibt.
- `ErrorState` rendert ebenfalls über `<Card variant="flat">`; die
  Fehlerfarbe bleibt wie bisher ausschließlich am Icon-Kreis (über
  `StatusIcon`, siehe Befund 6), nicht an der Card-Fläche selbst — Card
  bekommt keinen neuen „danger"-Flächenmodus, das wäre eine große,
  unangeforderte Card-Erweiterung.
- Icon-Farben: `#dfe6f1`/`#6d778a` werden zwei neue, benannte CSS-Variablen
  in `globals.css` (z. B. `--state-icon-neutral-bg`/`--state-icon-neutral-fg`),
  mit genau diesen Werten als Startwert — keine Verhaltensänderung, nur
  Tokenisierung. `--button-danger-mid`/`--button-danger-end` (Danger) und
  `--accent-primary` (Info) sind bereits Tokens und bleiben unverändert.
- `Card` selbst (`Card.tsx`/`Card.module.css`) wird NICHT verändert — nur
  EmptyState/LoadingState/ErrorState werden umgebaut, um Card zu
  konsumieren. Kein neuer Card-`variant` wird eingeführt.

### Befund 2 — Fansub-Hero-Kontrast (Claude's Discretion, echter Produktionsbug)
- Root Cause empirisch bestätigt (nicht nur im Showcase): Sowohl die
  Storybook-Story als auch die echte Seite `frontend/src/app/fansubs/[slug]/page.tsx`
  rendern dieselbe Komponente `FansubHeroSection` — dunkle Text-Tokens
  (`#1c1c1e`, `rgba(28,24,38,.74/.64)`, `--accent-deep`) liegen auf einem
  dunklen Foto-Schleier (`rgba(15,12,25,.28–.42)` über geblurtem Foto),
  ohne eine helle Textvariante für diesen Fall.
- `PublicHeaderBackdrop` rendert NUR, wenn `bannerURL` gesetzt ist (`if
  (!imageUrl) return null`) — ohne Bannerfoto gibt es KEINEN dunklen
  Schleier, und die bisherigen dunklen Textfarben sind dort korrekt (heller
  Hintergrund). Der Fix darf deshalb NICHT pauschal helle Schrift erzwingen,
  sondern NUR wenn `bannerURL` vorhanden ist (gleiche Bedingung wie das
  bereits vorhandene `{bannerURL ? ... : null}` für das Bannerbild in
  `FansubHeroSection.tsx`).
- Da Nutzerfotos beliebig hell sein können, reicht der bestehende
  Verlaufs-Schleier (max. 42% Schwarzanteil) NICHT, um helle Schrift bei
  einem sehr hellen Foto garantiert lesbar zu machen. Lösung: Ein
  zusätzlicher, ausreichend blickdichter dunkler Schleier/Scrim direkt
  hinter `.heroBody` (dem Textblock), unabhängig vom großflächigen
  Banner-Verlauf, mit einer Opazität, die rechnerisch WCAG AA (4,5:1) auch
  im Worst Case (rein weißes Foto, Leuchtdichte 1,0) für die hellste
  verwendete Textfarbe garantiert. Herleitung (WCAG-Relativleuchtdichte-
  Formel, wie bereits in `frontend/src/lib/roleCatalog.accessibility.test.ts`
  verwendet): effektive Hintergrund-Leuchtdichte nach Schwarz-Scrim mit
  Opazität α über einem Foto mit Leuchtdichte L_foto ≈ (1-α)·L_foto. Für
  reines Weiß als Text (Leuchtdichte 1,0) und Kontrast ≥4,5: effektive
  Hintergrund-Leuchtdichte ≤ (1,05/4,5) − 0,05 ≈ 0,183. Bei L_foto=1,0 (Worst
  Case) folgt α ≥ 0,817. Mit Sicherheitsmarge (für die etwas gedämpfteren
  Metrik-Label-/Untertitel-Farben, die keine reinen Weißwerte sind) **mind.
  85–90 % Schwarz-Opazität** am Scrim direkt hinter dem Textblock ansetzen,
  nach oben hin zum Fotobereich ausblendend (kein harter Rand).
- Betroffene Texte: `.title` (Gruppenname), `.subtitle` (u. a. „gegründet
  …"), sowie `HeroMetrics`' `dt`/`dd` innerhalb dieses Heros. `HeroMetrics`
  ist ein globaler, in mehreren hellen Kontexten wiederverwendeter
  Baustein — seine `.module.css` darf NICHT global auf helle Schrift
  umgestellt werden. Stattdessen bekommen `dt`/`dd` in `HeroMetrics.module.css`
  je eine neue CSS-Variable mit dem AKTUELLEN Wert als Fallback
  (`color: var(--hero-metrics-label, rgba(28,24,38,.64))` bzw.
  `var(--hero-metrics-value, var(--accent-deep))`) — reine, verhaltensneutrale
  Tokenisierung für alle bestehenden Verwender, und `FansubHeroSection`s
  eigenes CSS-Modul überschreibt diese zwei Variablen NUR innerhalb des
  Banner-Textblocks (per Klasse auf dem umschließenden Element, nicht
  `:global()`).
- Verifikation: Ein neuer, deterministischer Vitest-Test (nach dem Muster
  von `roleCatalog.accessibility.test.ts`, lokale `luminance`/`contrast`-
  Helfer, KEIN jsdom-Rendering der Grafik — jsdom kann Verläufe/Bilder
  ohnehin nicht zuverlässig auswerten) rechnet den Worst-Case-Kontrast für
  die final gewählten Werte nach und erwartet ≥4,5. Zusätzlich: ein echter
  Blick auf die Live-Seite mit einem Account, der ein Bannerfoto hat
  (Playwright-Screenshot oder Browser-UAT-Hinweis im Abschlussbericht).

### Befund 3 — Englische Texte (Claude's Discretion, Umfang bereits ermittelt)
- Konkret bekannt: `DesignTokensShowcase.tsx` `title="Design Tokens Preview"`,
  `PublicFansubSurfacesShowcase.tsx` `title="Public Fansub Surfaces"` und
  `<PublicSurfaceFrame title="Desktop Header" ...>`, dazu der zugehörige
  Testassertion-String in `PublicFansubSurfacesShowcase.test.tsx`, der exakt
  denselben Text prüft — MUSS im selben Commit mitgezogen werden, sonst
  bricht der Test. Alle drei auf passende deutsche Formulierungen
  umstellen (z. B. „Design-Tokens-Vorschau", „Öffentliche Fansub-Flächen",
  „Desktop-Kopfbereich").
- Weiterer Scope: alle `*.stories.tsx`/`*.tsx` unter
  `frontend/src/components/showcases/` UND `frontend/src/components/ui/`
  nach weiterer englischer Prosa (Titel/Beschreibungen/Parameter-Texte, NICHT
  Bare-State-Namen wie `Standard`/`Loading`/`Empty`, die laut Projektkonvention
  als Story-Export-Namen englisch bleiben dürfen) durchsuchen und
  korrigieren.

### Befund 4 — ASCII-Umlaute (Claude's Discretion, Fundstellen bereits bestätigt)
- Bestätigt per direktem Grep (nicht nur Stichprobe): `docker-compose.yml`
  Zeilen 221–225 (Kommentar zum `team4sv30-storybook`-Service: „fuer",
  „fuehren", „Aufloesung", „laeuft"). `frontend/src/components/ui/Card.stories.tsx`
  enthält „Umschliesst eine ganze thematische Sektion." als Story-
  Beschreibung.
- Zusätzlich: vor Abschluss einen erneuten, repo-weiten Soll/Ist-Abgleich
  über ALLE in diesem UND dem vorherigen Auftrag (261029-d3k) neu
  hinzugefügten/geänderten Dateien durchführen (`git diff
  <main-vor-261029-d3k>..HEAD` als Diff-Basis), nicht nur die hier
  namentlich genannten Stellen.

### Befund 5 — FormField-Autoverknüpfung (Claude's Discretion zur Technik)
- Tatsächlicher Umfang laut Recherche: 59 Dateien mit `<FormField`
  (161 Vorkommen), 55 Dateien mit `<Input` (93 Vorkommen) — größer als die
  im UAT-Befund genannten ~47/~43, das Backward-Compat-Ziel gilt für den
  tatsächlichen, größeren Bestand.
- Technik: `FormField.tsx` generiert per `useId()` eine stabile Basis-ID,
  WENN kein `htmlFor` übergeben wurde (wird `htmlFor` übergeben — der
  heutige Normalfall — bleibt die bestehende manuelle Verknüpfung exakt
  unverändert gültig, reine Zusatzfähigkeit). `FormField` prüft per
  `isValidElement` + Vergleich von `child.type` gegen eine feste, importierte
  Liste bekannter Feld-Primitives (`Input`, `Select`, `Textarea`, `DatePicker`,
  `YearPicker`, `Switch`) UND dass genau ein einzelnes Kind vorhanden ist
  (`Children.count(children) === 1`). Nur dann per `cloneElement` (mit
  explizitem Cast auf den jeweils passenden Props-Typ, siehe Recherche zu
  TypeScript-Strict-Mode-Signaturen) injizieren:
  - `id`: vorhandene `id` am Kind gewinnt; sonst die generierte ID.
  - `disabled`: logisches ODER aus `FormField.disabled` und der bereits am
    Kind gesetzten `disabled`-Prop (keine bestehende Prop wird entwertet).
  - `invalid`: logisches ODER aus `Boolean(FormField.error)` und der bereits
    am Kind gesetzten `invalid`-Prop — bestehende Doppel-Set-Verwendungen
    bleiben unverändert korrekt; heute halb-kaputte Fälle (nur `error` ohne
    `invalid`, per Recherche in `SegmentOverrideField.tsx`/
    `FansubAliasSection.tsx` bestätigt) werden dadurch automatisch richtig.
  - `aria-invalid`: `true`, wenn der effektive `invalid`-Wert `true` ist,
    sonst unverändert/`undefined`.
  - `aria-describedby`: IDs der gerenderten Hinweis-/Fehler-`<p>`-Elemente
    (neue, stabile IDs auf Basis der Feld-ID), zusammengeführt mit einer
    bereits am Kind vorhandenen `aria-describedby` (leerzeichengetrennt,
    keine Duplikate) — nichts wird überschrieben, nur ergänzt.
  - Für JEDES andere Kind (unbekannter Komponententyp, mehrere Kinder, kein
    valides Element — z. B. `UploadDropzone`, custom Radiogroups,
    `GroupScopeToggle`/`ChoiceSelect`, mehrere Kinder) bleibt das Rendering
    exakt wie heute (reines `{children}`, keine Injektion) — Null-Risiko für
    diese bereits bestätigt existierenden Fälle.
  - Das Label bekommt `id={labelId}` NUR, wenn eine generierte ID genutzt
    wird (zusätzliche, rein additive Fähigkeit; ändert nichts an Fällen mit
    explizitem `htmlFor`).
- Stories: `FormField.stories.tsx` bekommt zusätzliche Stories, die NUR
  `error`/`disabled` am `FormField` setzen (ohne manuelles `invalid` am
  Kind) und im Beschreibungstext/per Play-Interaktion zeigen, dass
  `aria-invalid`/`aria-describedby` automatisch gesetzt werden.
- Tests: neue Unit-Tests in `FormField.test.tsx` (neue Datei, existiert noch
  nicht) prüfen für Input/Select/Textarea je: automatische `id`-Vergabe,
  `aria-describedby`-Verknüpfung zu Hinweis UND Fehler, `aria-invalid` bei
  `error`, Rückwärtskompatibilität (expliziter `htmlFor`/`invalid` bleibt
  wirksam), und dass ein FormField mit einem NICHT unterstützten Kind
  (z. B. zwei Kinder oder ein unbekannter Komponententyp) unverändert ohne
  Fehler rendert.

### Befund 6 — Spinner & StatusIcon (Claude's Discretion zur API)
- `Spinner`: Props `size?: 'sm' | 'md' | 'lg'` (Standard `'md'`), optionaler
  `label?: string` (Standard `'Wird geladen…'`), rendert
  `role="status"` mit einem visuell verborgenen, aber vorlesbaren
  Text-Knoten (`sr-only`-Pattern, in `Spinner.module.css` neu angelegt,
  analog zu bereits im Projekt vorhandenen visuell-verborgenen Mustern) plus
  dem rotierenden Ring (Promotion der bereits zweimal fast identisch
  vorhandenen `ui-spin`-Keyframe-Logik aus `Button.module.css`
  `.buttonSpinner` und `LoadingState.module.css` `.stateSpinner` — beide
  nutzen `currentColor`; `Spinner` übernimmt dieses Verhalten unverändert,
  Farbe kommt weiterhin aus dem umgebenden `color`). Größen: `sm`=14px,
  `md`=18px (deckt die bisherigen Button-/LoadingState-Maße ab), `lg`=48px
  (deckt VideoPlayerModal ab).
- `StatusIcon`: Props `tone: 'neutral' | 'info' | 'success' | 'warning' |
  'danger'` (Namen bewusst identisch zu `Badge`s bereits etablierter
  Tonalitäts-Nomenklatur), `size?: 'sm' | 'md' | 'lg'` (Standard `'md'`
  = bisherige 38×38px/10px-Radius-Optik aus `.stateIcon`), `icon: ReactNode`
  (vom Aufrufer übergebenes lucide-Icon). Promotion der bereits
  vorhandenen `.stateIcon`/`.stateNeutral`/`.stateDanger`/`.stateInfo`-Logik
  aus `ui.module.css`, ergänzt um `success`/`warning` über die bereits
  vorhandenen Tokens `--color-success`/`--color-warning`.
- Interne Verwendung: `LoadingState` und `Button` (dessen `loading`-Zustand)
  verwenden `Spinner`; `EmptyState` und `ErrorState` verwenden `StatusIcon`
  für ihren Icon-Kreis (ersetzt `.stateIcon`). `EmptyState`s Standard-Icon
  bleibt `Inbox`, `ErrorState`s bleibt `TriangleAlert`, nur die umgebende
  Kreis-Darstellung wandert zu `StatusIcon`.
- App-Migration (vier genannte Stellen, jeweils 1:1-Ersatz ohne
  Verhaltensänderung, nur visuelle Konsolidierung auf `Spinner`):
  `JellyfinSyncPanel.tsx`s `LoadingSpinner()`-Funktion/`.loadingSpinner`-CSS,
  `EpisodeVersionActionBar.tsx`s `.spinner` (aus `EpisodeVersionEditor.module.css`),
  `VideoPlayerModal.tsx`s `.spinner` (48px, ersetzt die blaue Variante durch
  `<Spinner size="lg" />`; `currentColor` muss am umgebenden Element auf die
  bisherige Akzentfarbe gesetzt bleiben, damit sich der sichtbare Farbton
  nicht ändert), `MediaUploadCore.tsx`s `Loader2`-Icon (ersetzt durch
  `<Spinner size="sm" />`, `.spinner`-Rotationsklasse in
  `MediaUpload.module.css` entfällt dadurch, da `Spinner` seine eigene
  Animation mitbringt).
- Export: `Spinner`/`StatusIcon` werden alphabetisch passend in
  `frontend/src/components/ui/index.ts` ergänzt.

### Befund 7 — IconButton & Modal/Drawer (Claude's Discretion zur Technik, Entscheidungen des Menschen zu Radius/Struktur bleiben bindend)
- `IconButton` baut auf `Button` auf (kein eigenständiges Primitiv von
  Grund auf): Props `icon: ReactNode`, `'aria-label': string` (PFLICHT,
  nicht optional — erzwingt Barrierefreiheit beim Typ), `variant?: 'default'
  | 'floating'` (bildet die bisherigen, bis auf Zufall identischen
  `.closeButton`/`.closeButtonFloating`-Rezepte ab — diese Konsolidierung
  ist der eigentliche Mehrwert: EIN Rezept statt zweier zufällig
  übereinstimmender), `size?: 'sm' | 'md' | 'lg'`. Intern:
  `<Button iconOnly variant={...} aria-label={...}>{icon}</Button>`-artige
  Komposition ODER eine eigene schlanke Implementierung, die Button-Tokens
  wiederverwendet — Detailentscheidung beim Ausführen, Hauptsache: keine
  zweite, unabhängige Farb-/Radius-Definition.
- KEIN separates `CloseButton`-Primitiv — „IconButton (bzw. CloseButton)"
  wird als Namensvorschlag für dieselbe Sache gelesen; `IconButton` ist der
  tatsächliche, wiederverwendbare Exportname (allgemeiner nutzbar als nur
  für ✕).
- Gemeinsame Titelzeile: neue interne Komponente (Vorschlag:
  `frontend/src/components/ui/DialogHeader.tsx`, NICHT im Barrel
  `index.ts` exportiert — reine Implementierungsteilung zwischen Modal und
  Drawer, kein eigenständig nutzbares Primitiv, daher auch keine eigene
  Top-Level-Story; wird in Modal/Drawer-Stories unter „Besteht aus"
  erwähnt). Props: `title`, `description?`, `onClose`, `closeLabel?`
  (Standard „Schließen"), `variant?: 'default' | 'floating'` (steuert,
  welche `IconButton`-Variante das ✕ nutzt). Modal UND Drawer rendern
  exakt dieselbe `DialogHeader`-Instanz statt eigener, paralleler JSX-Blöcke.
- Trennstriche: `.dialogHeader`/`.dialogFooter`/`.drawerHeader`/
  `.drawerFooter`s `border-bottom`/`border-top` nutzen künftig
  `var(--border-subtle)` (bereits Drawer-Konvention über `color-mix`) statt
  des literalen `rgba(45, 41, 38, 0.08)` in Modal — EIN gemeinsamer Token
  für beide statt eines Literals in Modal und eines Tokens in Drawer. Die
  `AccentRule`-Komponente selbst wird NICHT als Trennstrich in
  Modal/Drawer eingesetzt (sie ist für andere Stellen gedacht — eine
  horizontale Vollbreiten-Trennlinie mit `border`-Semantik ist hier
  technisch treffender als ein `<span>`-Balken); die Vorgabe „über AccentRule
  bzw. Rahmen-Token" wird über die Token-Alternative erfüllt.
- Eckenradius: Modals `.modalPanel` (24px) und `.modalPanelStage` sowie
  Drawers `.drawerPanel` (28px), `.drawerPanelSheet` (22px),
  `.drawerPanelLg` werden auf einen neuen, gemeinsamen Token
  `--radius-surface: 10px` umgestellt (Cards rundeste bestehende Variante,
  `.cardNestedFlat`, nutzt bereits 10px — DAS ist die Formensprache, an die
  angeglichen wird). Mobile Vollbild-Sonderfälle, die bewusst auf `0`
  springen (abgeschnittene Kante am Bildschirmrand), bleiben `0`
  (kein Radius-Wert, keine Formensprache-Frage). `Card.module.css` selbst
  wird NICHT verändert.
- Automatischer Guard (siehe Befund 8) erzwingt künftig, dass Modal/Drawer
  nicht wieder auf natives `<button>` zurückfallen können.

### Befund 8 — Storybook-Dreiteilung (Claude's Discretion zur exakten Einteilung)
- Umbenennung der Story-`title`-Präfixe:
  - Bisheriges `UI/*` → **`Grundbausteine/*`** für alle Primitives, die
    KEINE andere `components/ui`-Komponente intern importieren und rendern
    (mechanisch per Grep überprüfbar: `grep "from '\./[A-Z]" <Datei>.tsx`
    innerhalb von `components/ui/`). Nach dieser Regel + den vom Menschen
    genannten Beispielen (Button, IconButton, Input, Select, Textarea,
    Spinner, StatusIcon, AccentRule, Badge) zählen hierzu u. a.: AccentRule,
    ActionBar, ActivationStatusIndicator, AdjacentNavigation, ArtworkHero,
    AvatarStack, Badge, Button, Card, DatePicker, DisclosureIndicator,
    FocalCarousel, HeroMetrics, IconButton (neu), Input, MediaSlot,
    NavArrow, PageHeader, Pagination, SectionHeader, Select, SortableList,
    Spinner (neu), StatusIcon (neu), Switch, Table, Tabs, Textarea,
    ThumbnailStrip, Toolbar, UploadDropzone, UploadFileRow, YearPicker.
  - **`Zusammengesetzte Bausteine/*`** für Primitives, die intern eine
    ANDERE `components/ui`-Komponente importieren/rendern, UND die drei vom
    Menschen explizit genannten Fälle: FormField (mit Feld), Modal, Drawer,
    EmptyState, ErrorState, LoadingState, ConfirmDialog. Die exakte
    mechanische Prüfung (import-Grep pro Datei) entscheidet über jeden
    verbleibenden Grenzfall; bei Unklarheit zählt „komponiert sichtbar
    mehrere benannte Bausteine zu einer Einheit" als Kriterium für
    „zusammengesetzt".
  - Bisheriges `Showcases/*` → **`Im Einsatz/*`** (bestehende zehn
    domänenspezifischen Kompositionen sind bereits exakt das, was „Im
    Einsatz" meint — vollständige Beispiele im Seitenkontext). KEINE
    vierte Kategorie nötig.
  - Neu unter `Im Einsatz/*` ergänzen: (a) eine Story mit einem
    vollständigen Modal über einer realistischen Seite (Titelzeile, ✕,
    Formular mit FormField+Input/Select, Trennstriche, Footer-Buttons),
    (b) eine Drawer-Story im gleichen Geist, (c) eine Formular-Story mit
    mehreren Fehlerzuständen (nutzt die neue FormField-Autoverknüpfung aus
    Befund 5 sichtbar).
- „Besteht aus"-Verweise: Jede Story unter `Zusammengesetzte Bausteine/*`
  bekommt in ihrer `parameters.docs.description.component`
  (Autodocs-Beschreibung) einen Satz „Besteht aus: [Card](?path=/docs/...)",
  „Besteht aus: IconButton, AccentRule" usw. — als Fließtext mit den
  Namen der verwendeten Grundbausteine (Storybook-interne Doc-Links, wo
  technisch unaufwändig möglich, sonst reine Namensnennung).
- Automatische Prüfung gegen native Elemente: Erweiterung von
  `frontend/eslint.config.mjs` um einen NEUEN, auf
  `src/components/ui/**/*.tsx` beschränkten `no-restricted-syntax`-Block
  (NICHT den bestehenden, repo-weiten `uiPrimitiveGuard` verändern — das
  bliebe auf `select`/`input`/`textarea` app-weit begrenzt, wie bisher).
  Der neue Block verbietet zusätzlich natives `<button>` und wiederholt
  `<select>`/`<input>`/`<textarea>` IN DIESEM Verzeichnis, mit einer
  expliziten, dokumentierten Ausnahmeliste (nach demselben Ratchet-Prinzip
  wie `LEGACY_NO_RESTRICTED_SYNTAX_FILES`) für Dateien, in denen das native
  Element Teil der eigenen, unterschiedlichen ARIA-Widget-Semantik ist
  (nicht einfach „fauler Button-Ersatz"): `Button.tsx`, `Input.tsx`,
  `Select.tsx`, `Textarea.tsx` (definierende Dateien), `Switch.tsx`
  (`button[role=switch]` ist Switch selbst), `Tabs.tsx` (`button[role=tab]`
  ist Tabs' eigene Struktur), `NavArrow.tsx` (bereits im Code als bewusst
  native dokumentiert), `ThumbnailStrip.tsx`, `YearPicker.tsx`,
  `DatePicker.tsx` (Kalender-Navigations-/Tages-/Monats-/Jahres-Kacheln sind
  Dateninhalte dieser Widgets, kein chrome-artiger Button-Ersatz).
  `Modal.tsx`/`Drawer.tsx` werden NICHT auf die Ausnahmeliste gesetzt (das
  ✕ wird in diesem Auftrag auf `IconButton` migriert). `Accordion.tsx` und
  `AvatarStack.tsx` bleiben außerhalb des Scopes dieses bereits sehr
  großen Auftrags auf der Ausnahmeliste, mit einem Kommentar „Kandidat für
  einen künftigen, eigenständigen Auftrag — nicht Teil der UAT-Runde
  261029-i1y" (kein stillschweigendes Weglassen, sondern dokumentierte
  bewusste Nicht-Migration).

</decisions>

<specifics>
## Specific Ideas

- Vollständige Recherche-Grundlage (vier parallele Explore-Agenten,
  2026-10-29) deckte ab: FormField/Input/Select/Textarea-API und 59/55-
  Datei-Nutzung; EmptyState/LoadingState/ErrorState/Card/Tokens plus vier
  Spinner-Fundstellen; Modal/Drawer/AccentRule/Button/Card-Radien plus
  elf native-Element-Fundstellen außerhalb ihrer definierenden Datei plus
  der echte Fansub-Kontrast-Bug (gleiche Komponente `FansubHeroSection` auf
  Showcase UND echter Seite); ESLint-Guard-Mechanismus,
  Storybook-Inventar (38 `UI/*`, 10 `Showcases/*`), Doku-Fundstellen,
  bestätigte Umlaut-Fundstellen. Ein fünfter Agent bestätigte: jsdom-
  basierte `axe()`-Tests können Verläufe/Bilder nicht zuverlässig für
  `color-contrast` auswerten (kein `@axe-core/playwright` im Projekt) —
  der Fansub-Kontrast-Fix wird deshalb über eine deterministische
  WCAG-Rechenformel getestet (Präzedenzfall:
  `frontend/src/lib/roleCatalog.accessibility.test.ts`), nicht über
  gerendertes jsdom-axe.
- TypeScript-Strict-Mode-Sketch für den `cloneElement`-Ansatz in FormField
  ist bereits gegen die installierten `@types/react`-18.3.13-Signaturen
  geprüft (explizite `as ReactElement<XProps>`-Casts pro bekanntem
  Feldtyp nötig, `child.type === Input`-Vergleich narrowed den Typ NICHT
  automatisch).
- `CLAUDE.md`s Abschnitt „Frontend-UI (globales Design-System)" ist bereits
  stellenweise veraltet (behauptet, der ESLint-Guard „warnt" und werde
  „auf error angehoben", obwohl er bereits auf `error` steht; erwähnt
  `<button>` als „verboten", ohne dass dafür bisher eine Regel existierte)
  — wird im selben Auftrag korrigiert, inkl. der neuen Dreiteilung.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/quick/261029-d3k-team4s-storybook-einfuehren-und-dev-ui-s/`
  (vorangegangener Auftrag — Storybook-Einführung, bleibt in der Substanz
  bestehen, wird hier nachgebessert)
- CLAUDE.md, Abschnitt „Frontend-UI (globales Design-System)"
- AGENTS.md, „Team4s UI Implementation Contract" Punkt 13, „Dokumentation
  wächst mit dem Code"
- `docs/FRONTEND_ARCHITEKTUR.md`, Storybook-Absatz
- `frontend/src/lib/roleCatalog.accessibility.test.ts` (Kontrast-Test-Muster)
- `frontend/eslint.config.mjs` (`uiPrimitiveGuard`,
  `LEGACY_NO_RESTRICTED_SYNTAX_FILES`-Muster)

</canonical_refs>

# Quick Task 261029-rnd: Storybook Live-UAT Runde 2 - Context

**Gathered:** 2026-10-29
**Status:** Ready for planning

<domain>
## Task Boundary

Live-UAT (durch den Menschen, nicht automatisiert) der Storybook-Einführung
wurde zum zweiten Mal abgelehnt. Acht Befunde (1-8) sind vollständig zu
beheben, ohne bisherige Grundentscheidungen zu revidieren. Eine im
Auftragstext mitgelieferte Korrektur stellt klar: ein zuvor versehentlich
mitgeschickter Hinweis zur Englisch-Prüfung aller Story-Texte war für ein
ANDERES Projekt (ZA) gedacht und wird hier NICHT umgesetzt — Team4S-Stories
sind bereits deutsch, das wurde in der vorherigen Runde bereits geprüft.

Der Mensch macht morgen früh die Live-Abnahme — keine Rückfragen, jeder
Befund wird vor Abschluss selbst in Storybook bzw. der echten App verifiziert.

</domain>

<decisions>
## Implementation Decisions

### Vom Menschen bereits entschieden (bindend)
- Befund 3 (Radius): "Entscheidung des Menschen: an die Card-Formensprache
  angleichen – ein gemeinsames Radius-Token für Card, Modal und Drawer, auch
  mobil, keine festen Pixelwerte." — nicht verhandelbar, auch mobile
  Breakpoints müssen das Token nutzen.
- Befund 5 (Typografie): explizit NICHT in diesem Auftrag die ~154
  App-Dateien mit eigenen h1-h3 umzustellen — nur die vier genannten
  Bausteine (PageHeader, SectionHeader, DialogHeader, Card) intern umstellen.
- Befund 7: Button bleibt Grundbaustein, Spinner nur als internes Detail
  (in der Beschreibung erwähnt, keine Umsortierung).
- Englisch-Text-Prüfung über alle Story-Texte: NICHT umsetzen (Korrektur im
  Auftragstext — Team4S-Stories sind bereits deutsch, das war ein
  Übertragungsfehler aus einem anderen Projekt).

### Befund 1 — Fansub-Badge-Kontrast (Claude's Discretion zur Technik)
- Root Cause bestätigt: `FansubHeroSection.tsx` rendert
  `<Badge variant={statusVariant(group.status)}>` neben `group.name` in der
  Titelzeile (`.heroTitleRow`). Für `status === 'dissolved'` ist das
  `variant="muted"` → `Badge.module.css` `.badgeMuted`:
  `background: rgba(255,255,255,.38); color: #66758d;` — auf dem dunklen
  Banner-Schleier (bereits in der Vorrunde für Titel/Subtitle/HeroMetrics
  behoben, aber NICHT für das Badge) praktisch unlesbar.
- `variant="muted"` wird repo-weit (~45+ Stellen) in HELLEN Kontexten
  verwendet (Admin-Tabellen, Profilkarten, Nav-Badges) — `Badge.module.css`s
  `.badgeMuted` selbst darf NICHT global geändert werden, sonst brechen
  diese Kontexte optisch.
- Fix: Derselbe, bereits etablierte Mechanismus wie beim Titel/Subtitle-Fix
  der Vorrunde (CSS-Variablen-Override, NUR innerhalb von
  `.heroBodyOnBanner`, NICHT global) — `Badge.module.css`s `.badgeMuted`
  bekommt zwei neue CSS-Variablen mit dem AKTUELLEN Wert als Fallback
  (`background: var(--badge-muted-bg, rgba(255,255,255,.38));
  color: var(--badge-muted-fg, #66758d);`), und `page.module.css`s
  `.heroBodyOnBanner`-Klasse überschreibt diese zwei Variablen zusätzlich zu
  den bereits vorhandenen `--hero-metrics-*`-Overrides (z. B.
  `--badge-muted-bg: rgba(255,255,255,.18); --badge-muted-fg: #fff;` oder
  passende helle Werte — exakte Werte müssen den bereits bestehenden
  deterministischen Worst-Case-Kontrasttest
  `FansubHeroSection.accessibility.test.ts` erweitern/ergänzen und mind.
  4,5:1 nachweisen, nach demselben Muster wie Titel/Subtitle/HeroMetrics).
  Reine, verhaltensneutrale Tokenisierung für jeden anderen Verwender von
  `variant="muted"` (Fallback-Werte identisch zum heutigen Aussehen).
- Neue Story: `FansubHeroSection` (oder die migrierte Showcase-Variante
  `PublicFansubSurfacesShowcase`) bekommt eine zusätzliche Story/einen
  zusätzlichen Fixture-Zustand mit `status: 'dissolved'` (aufgelöst) UND
  einem Bannerfoto, damit der Kontrastfall in Storybook sichtbar prüfbar
  ist (vorher gab es dafür laut Recherche keinen expliziten Zustand).
- Verifikation: der bereits bestehende Vitest-Rechentest wird um den Badge-
  Fall erweitert (gleiche `luminance`/`contrast`-Helfer, kein jsdom-
  Rendering) UND eine echte Live-Prüfung auf `/fansubs/new-subs` (oder einer
  vergleichbaren aufgelösten Gruppe mit Bannerfoto) wird im Abschlussbericht
  dokumentiert.

### Befund 2 — Modal/Drawer "geöffnet"-Stories (Claude's Discretion)
- `ModalInContextShowcase.tsx` verwaltet `open` aktuell nur über internen
  `useState(false)` ohne Override-Möglichkeit. Ergänze eine additive,
  optionale Prop `initialOpen?: boolean` (Standard `false`, ändert nichts an
  der bestehenden `Standard`-Story), und eine neue Story `Geoeffnet`
  (`name: 'Geöffnet'`) mit `args: { initialOpen: true }`, die das Modal
  direkt beim Laden der Story offen zeigt (Titelzeile, ✕, Formular mit
  FormField+Input/Select, Trennstriche, Footer-Buttons) — ohne Klick auf
  „Bearbeiten“.
- `DrawerShowcase.stories.tsx`s bestehende `Standard`-Story übergibt bereits
  `args: { open: true, ... } }` — der Drawer ist dort schon ohne Interaktion
  offen sichtbar. Trotzdem wird zur Konsistenz/Auffindbarkeit mit der neuen
  Modal-Story eine explizite zweite Story `Geoeffnet` (`name: 'Geöffnet'`,
  identische Args wie `Standard`) ergänzt, damit beide Showcases dieselbe,
  klar benannte „offen sichtbar“-Story anbieten. Live in Storybook
  verifizieren, dass beide ohne Klick offen erscheinen.

### Befund 3 — Radius-Token-Vereinheitlichung (bindende Entscheidung, Technik: Claude's Discretion)
- `globals.css`s bereits vorhandenes `--radius-surface: 10px` (aus der
  Vorrunde) bleibt die gemeinsame Quelle; Card wird NICHT selbst geändert,
  aber `Card.module.css`s `.cardNestedFlat` (aktuell hartes `10px`) wird auf
  `var(--radius-surface)` umgestellt, damit Card tatsächlich DERSELBE Token
  ist, nicht nur ein zufällig identischer Zahlenwert — das ist der Kern des
  Befunds ("ein gemeinsames Radius-Token für Card, Modal UND Drawer").
- `Modal.module.css` Zeile ~95 (`.modalPanel` im `max-width: 767px`-Media-
  Query, aktuell `border-radius: 20px 0 0 20px;`) UND `Drawer.module.css`
  Zeilen ~108 (`.drawerPanel`-Mobile, `20px 0 0 20px`) und ~135
  (`.drawerPanelSheet`-Mobile, `22px 22px 0 0`) werden auf `var(--radius-surface)`
  umgestellt (gleiche Eckenkombinationen, nur der Zahlenwert wird zum Token
  — `var(--radius-surface) 0 0 var(--radius-surface)` bzw.
  `var(--radius-surface) var(--radius-surface) 0 0`). Die ECHTEN
  Vollbild-Sonderfälle, die auf `0` springen (Modal Zeile ~102,
  `.modalPanelStage`), bleiben `0` — das ist kein Radius-Wert, sondern
  "kein Radius", semantisch etwas anderes.
- Mobile Breakpoints weiterhin per Live-Viewport-Check (390×844) in
  Storybook UND an einer echten Modal-/Drawer-Stelle in der App bestätigen,
  dass sich am sichtbaren Erscheinungsbild nichts verschlechtert (nur der
  Pixelwert wandert zum bereits etablierten 10px-Token, der WAR bereits
  korrekt auf Desktop).

### Befund 4 & 7 — Storybook-Katalog-Umsortierung (Technik: Claude's Discretion)
- Reklassifizierung von `Grundbausteine/*` → `Zusammengesetzte Bausteine/*`
  für exakt diese zehn Dateien (bestätigt per Import-Grep):
  `Accordion` (baut eigenen Pfeil + natives `<button>` statt
  `DisclosureIndicator`+`IconButton`/`Button`), `FocalCarousel` (importiert
  `Button`+`NavArrow` transitiv über `FocalCarouselInternals.tsx`),
  `ThumbnailStrip` (`ResponsiveImage`), `UploadFileRow`
  (`Badge`+`Button`+`FormField`+`Input`+`Textarea`), `UploadDropzone`
  (`Button`+`Input`), `MediaSlot` (`UploadDropzone`), `Pagination`
  (`Button`), `HeroMetrics` (`Button`), `ActivationStatusIndicator`
  (`Badge`+`Button`), `ArtworkHero` (`ResponsiveImage`).
- `Accordion.tsx`: eigener `<span aria-hidden>▾</span>`+natives `<button>`
  wird ersetzt durch `DisclosureIndicator` (variant="plain" oder "button",
  je nach bisherigem visuellem Eindruck) für den Pfeil; die Kopfzeile selbst
  nutzt `Button`/`IconButton` als Basis statt eines eigenen eigenständigen
  `<button>`-Nachbaus (ähnlich wie Modal/Drawer in der Vorrunde auf
  `IconButton` umgestellt wurden) — ODER, falls `Button`/`IconButton`
  visuell/strukturell nicht zur vollbreiten, klickbaren Accordion-
  Kopfzeile passen (volle Breite, Flex-Layout mit Titel+Badge+Pfeil, nicht
  nur ein Icon/Text-Button), wird das explizit als begründete Ausnahme in
  der neuen Katalogprüfung (unten) dokumentiert, NICHT stillschweigend
  weiter nativ gebaut — die Entscheidung erfolgt beim Lesen von
  `Accordion.tsx` im Plan/Ausführung, mit klarer Begründung im Code-
  Kommentar, falls eine native Basis technisch zwingend bleibt.
- Jede der zehn Story-Dateien bekommt zusätzlich einen "Besteht aus: …"-Satz
  in `parameters.docs.description.component` (Muster aus der Vorrunde, mit
  den oben konkret genannten Bausteinen).
- Neue automatische Katalogprüfung (Vitest-Test, Muster wie
  `roleCatalog.accessibility.test.ts`/die ESLint-Ausnahmeliste aus der
  Vorrunde): eine neue Testdatei (z. B.
  `frontend/src/components/ui/catalogTaxonomy.test.ts`) liest per `fs` jede
  `*.stories.tsx` unter `components/ui/`, extrahiert `title:`, und für jede
  Datei mit `title` unter `Grundbausteine/*` prüft sie per Regex/Grep über
  die zugehörige(n) `.tsx`-Quelldatei(en) (inkl. gleich benannter
  `*Internals.tsx`-Hilfsdateien, z. B. für FocalCarousel), ob ein
  `import { X } from './X'` auf eine ANDERE Datei zeigt, die selbst eine
  `X.stories.tsx` im selben Verzeichnis hat (= ein anderer katalogisierter
  Baustein). Treffer außerhalb einer festen, dokumentierten
  Ausnahme-Map (z. B. `{ Button: ['Spinner'] }`, mit Begründungskommentar)
  lassen den Test fehlschlagen und benennen Datei+Import in der
  Fehlermeldung. Das ist die geforderte "automatische Katalogprüfung".

### Befund 5 — Typografie-Grundbausteine (Technik: Claude's Discretion, Skalen-Werte siehe unten)
- Neue Typo-Skala-Tokens in `globals.css` (Name-Vorschlag
  `--font-size-h1` … `--font-size-h4`, `--font-weight-heading`), kalibriert
  so, dass PageHeader/SectionHeader/Card/DialogHeader NACH der Umstellung
  PIXELGLEICH aussehen wie heute (keine Visual-Regression an diesen vier
  bereits produktiven Bausteinen) — konkret per Recherche bestätigt:
  - H1 = PageHeader `pageTitle` (`clamp(2rem, 3vw, 2.75rem)`, bereits heute
    die einzige "große Seitentitel"-Größe im Design-System).
  - H2 = DialogHeader `dialogTitle` (`1.25rem`/20px).
  - H3 = SectionHeader `sectionTitle` UND Card `cardTitle` (beide bereits
    heute identisch `1rem`/16px — SectionHeader rendert zwar wahlweise
    `<h2>` oder `<h3>` als TAG, aber IMMER in dieser einen visuellen Größe;
    das erfordert, dass der neue `Heading`-Baustein `level` (semantischer
    Tag) und `size` (visuelle Stufe, Standard = `level`) ALS ZWEI
    GETRENNTE, optionale Props unterstützt — SectionHeader ruft dann z. B.
    `<Heading level={level} size={3}>` auf, egal ob `level` 2 oder 3 ist,
    damit sich an SectionHeaders öffentlichem `level`-Prop-Vertrag nichts
    ändert, aber die Visuelle Größe stabil bleibt).
  - H4 = neue, kleinere Stufe (Vorschlag `0.875rem`/14px) für kompaktere
    Titel-Kontexte, die heute noch keinen eigenen Baustein nutzen (z. B.
    `AnimeRelations.module.css`s 14px-Kartenüberschrift aus der Recherche)
    — wird NICHT zwingend an bestehender Stelle eingesetzt, rundet nur die
    Skala auf vier Stufen ab, wie vom Menschen verlangt.
- `Text`-Baustein-Varianten (Vorschlag, kalibriert an
  PageHeader/SectionHeader/Card-Beschreibungstexten):
  `body` (Fließtext, 1rem, `--text-body`), `soft` (leise, 1rem,
  `--text-soft` — selbe Größe wie body, nur gedämpfter Ton, für Fälle wie
  SectionHeaders `sectionDescription`), `meta` (Metatext, `0.875rem`,
  `--text-soft` oder `--text-faint`, für PageHeaders `pageDescription`-
  artige Kontexte), `small` (klein, `0.75rem`, `--text-faint`).
- `Heading`/`Text` werden NEUE, eigenständige Grundbausteine (eigene
  `.tsx`+`.module.css`+`.stories.tsx`+Export in `index.ts`), KEINE
  Änderung an bestehenden globalen Text-Tokens (`--text-strong` usw.) nötig
  — die sind bereits vorhanden und werden nur konsumiert.
- Neue Storybook-Seite `Grundbausteine/Typografie`: KEINE Komponente im
  eigentlichen Sinn, sondern eine reine Dokumentations-Story (MDX-artig
  über eine einfache `.tsx`-Komponente mit `tags: ['autodocs']` oder eine
  Story mit `render:`), die H1-H4 und alle Text-Varianten nebeneinander
  zeigt, mit Beispieltexten, die den tatsächlichen Seiteninhalten ähneln
  (z. B. "Naruto" als H1-Beispiel, wie auf echten Anime-Detailseiten).
- `PageHeader`/`SectionHeader`/`DialogHeader`/`Card` werden intern auf
  `Heading`/`Text` umgestellt (ihre öffentlichen Props/API bleiben
  unverändert, nur die interne Implementierung wechselt) — mit Pixel-
  genauem Vorher/Nachher-Vergleich (Storybook-Stories dieser vier
  Bausteine müssen nach der Umstellung UNVERÄNDERT aussehen, per Live-
  Blick bestätigen).
- Explizit NICHT in diesem Auftrag: die ~154 App-Dateien mit eigenen
  `h1`-`h3` umstellen.

### Befund 6 — Übersicht-Stories + Story-Namen (Technik: Claude's Discretion)
- Neue Story "GroessenUndVarianten" (`name: 'Größen und Varianten'`) für
  `DisclosureIndicator.stories.tsx`: zeigt alle Kombinationen aus
  `size` (sm/md/lg) × `variant` (plain/button) × `open` (true/false)
  nebeneinander in einem Grid/Flex-Layout (eine einzige Story mit
  `render:`, nicht neue Einzel-Stories).
- Gleiche Prüfung + ggf. Ergänzung für `Button`, `IconButton`, `Spinner`,
  `StatusIcon`, `Badge` (laut Recherche hat KEINS der sechs genannten
  Bausteine bereits eine kombinierte Übersicht) — jeweils eine neue
  "GroessenUndVarianten"/"AlleVarianten"-Story (deutscher `name:`,
  passend zur jeweiligen Achsen-Kombination: Button nach Variante×Größe,
  IconButton nach Variante×Größe, Spinner nach Größe, StatusIcon nach Tonalität,
  Badge nach Variante).
- Repo-weiter Sweep: ALLE `*.stories.tsx` unter `components/ui/` und
  `components/showcases/` werden auf sichtbare (nicht Export-Bezeichner-)
  Story-Namen mit ASCII-Umlaut-Ersetzung geprüft — das überschreibt die in
  der Vorrunde dokumentierte Annahme ("Export-Bezeichner-mirroring ist
  exempt"), der Mensch hat das jetzt explizit korrigiert: sichtbare Namen
  MÜSSEN korrekte Umlaute haben, auch wenn der Export-Bezeichner ASCII
  bleibt (per `name:`-Override). Konkret mindestens zu korrigieren (per
  Recherche bestätigt): `Drawer.stories.tsx` `Gross`/`NormalGross` →
  `name: 'Groß'`/`'Normal, groß'`; `IconButton.stories.tsx` `Gross` →
  `'Groß'`; `Spinner.stories.tsx` `Gross` → `'Groß'`;
  `NavArrow.stories.tsx` `NextGross` → `'Nächstes, groß'`;
  `DisclosureIndicator.stories.tsx` `Geoeffnet` → `'Geöffnet'`;
  `Accordion.stories.tsx` `AlleGeschlossen` → `'Alle geschlossen'`;
  `DatePicker.stories.tsx` `GeschlossenesPanel` → `'Geschlossenes Panel'`;
  `FormField.stories.tsx` die vier `AutomatischVerknuepft*`-Namen →
  deutsche Sätze mit korrekten Umlauten (z. B. `'Automatisch verknüpfter
  Fehler'`, `'Automatisch verknüpft: deaktiviert'`, `'Automatisch
  verknüpft: Auswahl'`, `'Automatisch verknüpft: Textfeld'`). Danach einen
  vollständigen zweiten Scan (nicht nur die hier genannten) durchführen,
  um auch bislang nicht namentlich gefundene Fälle abzudecken.

### Befund 8 — NavArrow auf IconButton + Größennamen + MediaSlot-Story-Namen (Technik: Claude's Discretion)
- `NavArrow.tsx` wird auf `IconButton` umgestellt. `IconButton` selbst hat
  laut Recherche KEINEN `translateY`-Hover-Effekt (anders als `Button`) —
  das ursprüngliche Problem (geerbter Hüpf-Effekt) tritt bei `IconButton`
  gar nicht auf. Trotzdem behält `NavArrow` sein eigenes, abweichendes
  visuelles Rezept (kein Rahmen/Schatten standardmäßig, Opazitäts-Hover
  statt `IconButton`s Standard-Optik mit Rahmen/Schatten) — dafür wird
  `IconButton` um eine neue, dritte Variante ergänzt (Vorschlag:
  `variant: 'ghost'` neben `'default'`/`'floating'`): transparenter
  Hintergrund, kein Rahmen/Schatten, nur Opazitäts-/Farb-Hover — NavArrow
  nutzt `<IconButton variant="ghost" ...>` und behält so exakt sein
  heutiges Aussehen, baut aber auf dem gemeinsamen Baustein auf
  (aria-label-Erzwingung, disabled, Tastatur-Fokus-Ring etc. kommen jetzt
  von IconButton). Verhalten (aria-label, disabled, Tastatur) bleibt exakt
  wie heute.
- Größennamen: `NavArrow`s `size?: 'default' | 'large'` wird zu
  `size?: 'sm' | 'md' | 'lg'` (Standard `'md'`, ersetzt `'default'`; `'lg'`
  ersetzt `'large'`; `'sm'` ist neu, für Konsistenz mit
  DisclosureIndicator/Spinner/StatusIcon/IconButton, auch wenn aktuell kein
  Aufrufer sie braucht). Einziger betroffener Aufrufer mit explizitem
  `size="large"`: `frontend/src/components/fansubs/MediaViewerStage.tsx`
  (zwei Stellen) → `size="lg"`. `FocalCarouselInternals.tsx` nutzt keinen
  expliziten `size`-Wert (Standard) und braucht keine Änderung.
- `MediaSlot.stories.tsx`: `name: 'LeerDropzone'` → `'Leer (Dropzone)'`,
  `name: 'ReplaceOverlay'` → `'Ersetzen-Overlay'`, `Disabled` (aktuell ohne
  `name:`-Override, zeigt daher automatisch "Disabled") → ergänze
  `name: 'Deaktiviert'`. Danach denselben Maßstab (deutsche, lesbare,
  nicht zusammengeschriebene sichtbare Namen) auf ALLE übrigen
  Team4S-Stories anwenden (deckt sich mit Befund 6s repo-weitem Sweep —
  beide Befunde werden in EINEM gemeinsamen, vollständigen Durchgang über
  alle Story-Dateien erledigt, nicht zweimal getrennt).

</decisions>

<specifics>
## Specific Ideas

- Vollständige Recherche-Grundlage (drei parallele Explore-Agenten,
  2026-10-29) deckte ab: Fansub-Badge-Kontrast (Root Cause, exakte
  Farbwerte, ~45 helle Gegenbeispiele für `variant="muted"`), Radius-Werte
  in Card/Modal/Drawer/globals.css mit exakten Zeilennummern, Import-Graph
  für alle zehn umzusortierenden Komponenten (inkl. der Besonderheit, dass
  FocalCarousel seine Button/NavArrow-Abhängigkeit nur über
  `FocalCarouselInternals.tsx` hat, nicht direkt), NavArrow/IconButton-
  Hover-Verhalten, vollständige Typografie-Inventur (pageTitle/
  sectionTitle/heroTitle/cardHeading/cardTitle-Fundstellen mit exakten
  Werten), bestehende Text-Farbtokens (`--text-strong/-body/-soft/-faint`,
  `--color-text-primary/-secondary`), Abwesenheit von Font-Size-Tokens,
  vollständige Liste bereits vorhandener `name:`-Overrides, die nur den
  ASCII-Bezeichner spiegeln statt echtes Deutsch zu zeigen, Abwesenheit
  kombinierter Übersicht-Stories für DisclosureIndicator/Button/IconButton/
  Spinner/StatusIcon/Badge.
- Eigene direkte Verifikation bestätigte: SectionHeader rendert `<h2>` ODER
  `<h3>` als Tag, aber IMMER in derselben visuellen Größe (1rem) — das
  bestimmt das `level`/`size`-Split im neuen `Heading`-Baustein. Card
  rendert Titel als `<h3 className={styles.cardTitle}>` (1rem, keine
  explizite Farbe/Gewicht, erbt). ModalInContextShowcase hat aktuell keinen
  Weg, mit offenem Modal zu starten; DrawerShowcase hat das bereits (seine
  `Standard`-Story übergibt schon `open: true`).

</specifics>

<canonical_refs>
## Canonical References

- `.planning/quick/261029-i1y-team4s-storybook-uat-runde-1-zustandskar/`
  (vorangegangener Auftrag — Storybook-Einführung + UAT-Runde-1-
  Nachbesserung, bleibt in der Substanz bestehen)
- `frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts`
  (bestehendes Kontrast-Test-Muster, wird um den Badge-Fall erweitert)
- `frontend/eslint.config.mjs` (`UI_DIR_NATIVE_ELEMENT_EXEMPT_FILES`-Muster,
  Vorbild für die neue Katalogprüfungs-Ausnahme-Map)
- CLAUDE.md „Frontend-UI (globales Design-System)“, AGENTS.md „Team4s UI
  Implementation Contract“, `docs/FRONTEND_ARCHITEKTUR.md“ Storybook-Absatz

</canonical_refs>

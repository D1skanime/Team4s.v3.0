# Quick Task 261029-rnd: Storybook Live-UAT Runde 2 - Research

**Researched:** 2026-10-29
**Confidence:** HIGH für alle Datei-/Zeilen-/API-Fakten (direkt per Grep/Read gegen das Repo
verifiziert durch drei parallele Explore-Agenten plus eigene Direktprüfung); MEDIUM für
Design-Entscheidungen, in CONTEXT.md als "Claude's Discretion" festgehalten.

<user_constraints>
Siehe `261029-rnd-CONTEXT.md` — alle Entscheidungen dort sind bindend.
</user_constraints>

## Befund 1 — Fansub-Badge-Kontrast

- `/fansubs` (Listenseite) hat KEIN Status-Badge — die Seite mit dem Bug ist
  `frontend/src/app/fansubs/[slug]/page.tsx` → `FansubHeroSection.tsx` (Route `/fansubs/new-subs`
  ist ein Gruppen-Slug, keine separate Liste). `statusVariant()` mappt `dissolved` → `'muted'`.
- `Badge.module.css:46-51` `.badgeMuted`: `background: rgba(255,255,255,.38); color: #66758d;`
  (= `rgb(102,117,141)`, exakt die im Befund genannten Werte).
- Hintergrund: `PublicHeaderBackdrop` (`.heroBackdropTuning`) + der in der Vorrunde ergänzte
  Scrim `.heroBodyOnBanner::before` (`rgba(10,8,14,.88)` im Textbereich) — nur bei vorhandenem
  Bannerfoto aktiv (`bannerURL ? styles.heroBodyOnBanner : null"`).
- Die Vorrunde hat NUR `.title`/`.subtitle`/`HeroMetrics` gefixt, das `Badge` nicht berührt.
- `variant="muted"` wird ~45+ mal in HELLEN Kontexten genutzt (AdminUsersClient, AccountSecurityCard,
  AppShell-Nav, ReleaseGallery, PublicReleaseBlock u. a.) — globale `.badgeMuted`-Änderung verboten,
  nur ein Token-Override innerhalb `.heroBodyOnBanner` (Muster exakt wie beim Titel-Fix).

## Befund 2 — Modal/Drawer offene Stories

- `ModalInContextShowcase.tsx`: `useState(false)` für `open`, keine Override-Prop. `DrawerShowcase.stories.tsx`s
  `Standard`-Story übergibt BEREITS `args: { open: true, onClose: () => {} }}` — Drawer ist schon
  ohne Klick offen sichtbar; nur eine zusätzliche, klar benannte `Geoeffnet`-Story fehlt zur Parität.

## Befund 3 — Radius-Token

- `Card.module.css`: `.card`/`.cardCompact` = 4px (Zeilen 8, 20), `.cardNestedFlat` = 10px (Zeile 68, HARTKODIERT, nicht `var(--radius-surface)`).
- `Modal.module.css`: Basis `.modalPanel` nutzt bereits `var(--radius-surface)` (Zeile 25); Mobile-Media-Query
  Zeile 95: `border-radius: 20px 0 0 20px;` (Literal); Zeile 102 `.modalPanel` Vollbild: `0` (bleibt `0`);
  `.modalPanelStage` Zeile 131: `0`.
- `Drawer.module.css`: Basis `.drawerPanel`/`.drawerPanelSheet` nutzen bereits `var(--radius-surface)`
  (Zeilen 24, 54); Mobile Zeile 108 `.drawerPanel`: `20px 0 0 20px` (Literal); Zeile 135
  `.drawerPanelSheet`: `22px 22px 0 0` (Literal).
- `globals.css:118-124`: `--radius-surface: 10px` existiert bereits (Vorrunde), explizit an
  `.cardNestedFlat` angeglichen — aber `.cardNestedFlat` selbst nutzt den Token NICHT, das ist die
  Lücke, die Befund 3 meint ("ein gemeinsames Radius-Token für Card, Modal UND Drawer").

## Befund 4 & 7 — Katalog-Umsortierung

- `Accordion.tsx`: eigener `<span aria-hidden>▾</span>` in nativem `<button>` (Zeilen 77-98) statt
  `DisclosureIndicator` (`sm|md|lg` × `plain|button`, bereits vorhanden, rein dekorativ/aria-hidden,
  passt strukturell in Accordions bestehenden `<button>`).
- Bestätigter Import-Graph (Zitate siehe Konversationshistorie dieser Session):
  `FocalCarousel` → `Button`+`NavArrow` (NUR via `FocalCarouselInternals.tsx`, nicht direkt),
  `ThumbnailStrip` → `ResponsiveImage`, `UploadFileRow` → `Badge`+`Button`+`FormField`+`Input`+`Textarea`,
  `UploadDropzone` → `Button`+`Input`, `MediaSlot` → `UploadDropzone`, `Pagination` → `Button`,
  `HeroMetrics` → `Button`, `ActivationStatusIndicator` → `Badge`+`Button`, `ArtworkHero` → `ResponsiveImage`.
- `Button.tsx` importiert `Spinner` (Zeile 7) — explizite Ausnahme für die neue Katalogprüfung.

## Befund 5 — Typografie

- `PageHeader.module.css` `.pageTitle`: `clamp(2rem, 3vw, 2.75rem)`, `color: var(--text-strong)`.
- `DialogHeader.module.css` `.dialogTitle`: `1.25rem`, `color: var(--text-strong)`.
- `SectionHeader.tsx`: `level?: 2 | 3` steuert NUR den Tag (`<h2>`/`<h3>`), `.sectionTitle`-CSS
  (`1rem`, `color: var(--text-strong)`) ist für BEIDE Tags identisch — bestätigt per Direktlesen.
- `Card.tsx` Zeile 28: `<h3 className={styles.cardTitle}>`; `Card.module.css` `.cardTitle`: `1rem`,
  keine explizite Farbe (erbt).
- `globals.css` Text-Farbtokens (alle bestätigt): `--text-strong: #171513`, `--text-body: #2d2926`,
  `--text-soft: #625c56`, `--text-faint: #8c857e`, plus ältere `--color-text-primary/-secondary`
  (Alias `--text-primary`/`--text-secondary`/`--text-muted`). KEINE Font-Size-Tokens vorhanden
  (`--font-sans`/`--font-mono` sind Familien, keine Größen).
- PageHeader-Description: `color:#657086` (hartkodiert, Kandidat für Tokenisierung über `Text`),
  SectionHeader-Description: `color:#657086; font-size:.92rem`.

## Befund 6 — Übersicht-Stories + Namen

- Keines der sechs geprüften Bausteine (`DisclosureIndicator`, `Button`, `IconButton`, `Spinner`,
  `StatusIcon`, `Badge`) hat bereits eine kombinierte „alle Varianten nebeneinander"-Story — nur
  Einzel-Stories pro Zustand.
- Bestätigte Liste bestehender `name:`-Overrides, die den ASCII-Bezeichner NUR spiegeln (keine
  echte Übersetzung): `Drawer.stories.tsx` `NormalGross`/`Gross`, `IconButton.stories.tsx` `Gross`,
  `Spinner.stories.tsx` `Gross`, `NavArrow.stories.tsx` `NextGross`,
  `DisclosureIndicator.stories.tsx` `Geoeffnet`/`Geschlossen`, `Accordion.stories.tsx`
  `AlleGeschlossen`, `DatePicker.stories.tsx` `GeschlossenesPanel`, `FormField.stories.tsx` die vier
  `AutomatischVerknuepft*`-Namen.

## Befund 8 — NavArrow/IconButton/MediaSlot

- `NavArrow.tsx`: natives `<button>`, Kommentar erklärt bewusste Vermeidung von `Button`s
  `.button:hover { transform: translateY(-1px); }` (`Button.module.css:30-31`). `IconButton.module.css`
  hat laut Recherche KEIN `translateY` irgendwo — das Hüpf-Problem existiert bei `IconButton` gar
  nicht, NavArrow kann also sicher darauf aufbauen.
- `NavArrow`s `size?: 'default' | 'large'` (Zeile 13) — einziger Aufrufer mit explizitem
  `size="large"`: `MediaViewerStage.tsx` (zwei Stellen, Zeilen ~199-212). `FocalCarouselInternals.tsx`
  nutzt keinen expliziten `size`-Wert.
- `IconButton.tsx`: `variant: 'default' | 'floating'`, `size: 'sm' | 'md' | 'lg'` (bereits vorhanden).
- `MediaSlot.stories.tsx`: `LeerDropzone`(`name: 'LeerDropzone'`), `ReplaceOverlay`
  (`name: 'ReplaceOverlay'`), `Disabled` (kein `name:`-Override) — bestätigt exakt die im Befund
  genannten Fälle.

## Sources

Drei parallele Explore-Subagenten (2026-10-29, diese Session) plus eigene Direktverifikation von
`SectionHeader.tsx`, `PageHeader.tsx`, `Card.tsx` (Titel-Rendering), `ModalInContextShowcase.tsx`/
`.stories.tsx`, `DrawerShowcase.tsx`/`.stories.tsx`. Keine externen Quellen nötig.

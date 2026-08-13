---
phase: 79
slug: medien-ownership-in-ui-durchsetzen
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-06
reviewed_at: 2026-06-06
---

# Phase 79 — UI Design Contract

> Visueller und Interaktions-Contract für Phase 79 „Medien-Ownership in UI durchsetzen".
> Erstellt von gsd-ui-researcher, verifiziert von gsd-ui-checker.
> Alle user-facing Strings sind deutsch mit korrekten Umlauten (ä/ö/ü/ß) — keine ASCII-Ersetzungen (CLAUDE.md Sprachqualität).

---

## Pflicht-Constraint (UI-Checker-Gate, CLAUDE.md)

**Globales Design-System ist PFLICHT.** Jede user-facing UI dieser Phase MUSS die globalen Primitives aus `@/components/ui` nutzen:

| Bedarf in Phase 79 | Pflicht-Primitive | Verboten |
|--------------------|-------------------|----------|
| Status-Auswahl (D-01, 6 Labels) | `Select` + `FormField` | natives `<select>` |
| Kategorie-Dropdown (D-08, nur `release_version_media`) | `Select` + `FormField` | natives `<select>` |
| Owner-Hinweis-Chip (D-05) | `Badge` + `Card`/`cardNestedFlat` | Eigen-Markup-Pill |
| Beschreibung/Rechtehinweis (optional) | `Textarea` + `FormField`, `Input` + `FormField` | natives `<textarea>`/`<input>` |
| Blockier-/Fehlerzustand (D-06) | `ErrorState` | handgebauter Fehlerblock |
| Leerer/kein-Owner-Zustand | `EmptyState` | handgebauter Leerblock |
| Aktionsknöpfe | `Button` | natives `<button>` für Primitiv-Typ |

Diese Regel überstimmt jede „lokale Datei-Konsistenz". Showcase-Referenz: Route `/dev/ui-system`. ESLint `no-restricted-syntax` warnt bei nativem `<select>/<input>/<textarea>`. Ausnahme nur: die Primitive-Definitionen selbst unter `frontend/src/components/ui/`.

**Quelle:** CLAUDE.md „Frontend-UI (globales Design-System)" + 79-CONTEXT.md Canonical Refs (Design-System Pflicht) + 79-RESEARCH.md Anti-Patterns.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Brownfield — projekteigene Primitives, kein shadcn; `components.json` existiert nicht und ist nicht erwünscht) |
| Preset | not applicable |
| Component library | projekteigen `@/components/ui` (CSS-Module über `ui.module.css`, globale Tokens in `frontend/src/styles/globals.css`) |
| Icon library | `lucide-react` |
| Font | System-Stack (vom globalen `globals.css` geerbt; keine neue Schriftart in dieser Phase) |
| Styling-Konvention | CSS-Module pro Komponente; neue Komponente: `MediaOwnershipContext.module.css` (RESEARCH-Empfehlung) |

shadcn-Gate: nicht anwendbar — das Projekt hat ein verbindliches eigenes Design-System (CLAUDE.md-Pflicht). Keine Registry-Automation, keine Drittregistries. Registry-Safety-Gate entfällt.

---

## Spacing Scale

Verbindliche Tokens aus `globals.css` (`--space-*`). Werte sind Vielfache von 4. **Keine neuen Spacing-Werte erfinden** — nur diese Tokens verwenden.

| Token | Variable | Value | Usage in Phase 79 |
|-------|----------|-------|--------------------|
| xs | `--space-1` | 4px | Icon-Gap im Owner-Chip, Inline-Padding |
| sm | `--space-2` | 8px | Gap zwischen Owner-Chip-Segmenten, Badge-Innenabstand |
| md-3 | `--space-3` | 12px | Gap zwischen Pflichtfeldern (FormField-Stack) |
| md | `--space-4` | 16px | Default-Abstand zwischen Pflichtfeld-Gruppen, modalBody-gap |
| lg | `--space-5` | 24px | Sektions-Padding der Pflichtfeld-Karte |
| xl | `--space-6` | 32px | Layout-Gap zwischen Owner-Block und Upload-Bereich |

Control-Höhe: `--control-height-md` = 44px (Touch-Target für `Select`/`Input`); `--control-height-sm` = 36px (kompakte Buttons). Diese sind im jeweiligen Primitive bereits gesetzt — nicht überschreiben.

Exceptions: keine. Die Pflichtfeld-Komponente erbt die Primitive-internen Abstände (`fieldset` gap 9px, `modalBody` gap 16px); kein freies Pixel-Spacing in neuen CSS-Modulen außerhalb der `--space-*`-Skala.

---

## Typography

Verbindlich aus `ui.module.css` (Primitives setzen diese bereits). **Keine neuen Größen/Gewichte einführen.** Phase 79 nutzt ausschließlich Label-, Body- und Section-Title-Rollen.

| Role | Size | Weight | Line Height | Verwendung in Phase 79 |
|------|------|--------|-------------|------------------------|
| Field-Label | 14px | 700 (`fieldLabel`) | 1.2 | Pflichtfeld-Labels („Status", „Kategorie", „Beschreibung") |
| Body / Control | 14px | 400–500 (`control`) | 1.45 | Select-/Input-/Textarea-Werte |
| Hint / Caption | 12px | 400 (`fieldHint`) | 1.45 | Hilfetext unter Status-Dropdown, Owner-Erklärung |
| Section-Title | 16px (1rem) | 700 (`sectionTitle`/`cardTitle`) | 1.15–1.3 | Überschrift der Pflichtfeld-Karte („Owner & Sichtbarkeit") |
| Badge | 12px | 700 (`badge`) | 1 | Owner-Chip-Text, Kategorie-Read-only-Chip |

Gewichte in dieser Phase: regular (400) für Werte/Hints, bold (700) für Labels/Badges/Titel — wie vom Design-System vorgegeben. Fehlertext (`fieldError`): 12px, Farbe `#8b2742`.

---

## Color

60/30/10-Aufteilung folgt dem bestehenden Admin-Look (warmer Off-White-Canvas, weiße Karten, blauer Akzent). **Keine neuen Farben erfinden** — nur Tokens aus `globals.css`.

| Role | Token / Value | Usage |
|------|---------------|-------|
| Dominant (60%) | `--surface-canvas` `#f6f4ef` / `--surface-card` `#ffffff` | Hintergrund, Pflichtfeld-Karten-Fläche |
| Secondary (30%) | `--surface-sunken` `#f0ece5`, `cardNestedFlat`-Flächen | Owner-Block-Hintergrund, eingebettete Read-only-Bereiche |
| Accent (10%) | `--accent-primary` (= `--color-primary` `#5f84dd`) | siehe Reserved-Liste unten |
| Destructive | `--button-danger-end` `#3a0e23` / `fieldError` `#8b2742` | Blockier-Fehlermeldung (D-06), Pflichtfeld-Fehler |

Accent (`#5f84dd`) reserviert für: aktiver Status-Dropdown-Fokusring, primärer „Hochladen"-Button (`buttonPrimary`), aktiver Tab/Selektion. **Niemals** für den read-only Owner-Chip (der ist neutral/info) und nicht „für alle interaktiven Elemente".

Status-Badge-Farbsemantik (Lesezustand des 6-Werte-Status, D-01/D-02) — über vorhandene `Badge`-Varianten, keine neuen Farben:

| Status-Label (D-01) | Badge-Variante | Begründung |
|---------------------|----------------|------------|
| öffentlich | `success` (grün) | freigegeben + public |
| intern | `info` (blau) | freigegeben, nicht-öffentlich |
| in Prüfung | `warning` (gelb) | Default-Wartezustand (D-03) |
| abgelehnt | `danger` (rot) | rejected |
| archiviert | `muted` (grau) | inaktiv |
| entfernt | `neutral`/`muted` (grau) | removed |

Owner-Chip-Variante: `info` oder `neutral` (read-only Hinweis, kein Akzent-Verbrauch).

---

## Copywriting Contract

Alle Strings deutsch mit Umlauten. Platzhalter `{...}` werden zur Laufzeit gefüllt. Exakte Endtexte sind Claude's Discretion (CONTEXT.md), die folgenden sind der verbindliche Default-Contract.

### Owner-Hinweis-Chip (D-05, read-only, nie editierbar)

| Element | Copy |
|---------|------|
| Owner-Chip (Gruppe) | `Upload für: Gruppe «{name}» · Owner-Typ: Gruppe` |
| Owner-Chip (Anime) | `Upload für: Anime «{titel}» · Owner-Typ: Anime` |
| Owner-Chip (Release-Theme) | `Upload für: Release «{anime} · {gruppe}» · Owner-Typ: Release-Theme` |
| Owner-Chip (Release-Version) | `Upload für: Release-Version «{label}» · Owner-Typ: Release-Version` |
| Owner-Chip (Member) | `Upload für: Profil «{name}» · Owner-Typ: Mitglied` |
| Owner-Erklär-Hint | `Der Owner ergibt sich aus diesem Bereich und kann nicht geändert werden.` |

### Status-Feld (D-01/D-02)

| Element | Copy |
|---------|------|
| Status-Label | `Status` |
| Status-Optionen (Reihenfolge) | `intern`, `in Prüfung`, `öffentlich`, `abgelehnt`, `archiviert`, `entfernt` |
| Status-Hint (Prozessmedien) | `Neue Uploads starten in «in Prüfung» und werden im Review freigegeben.` |
| Status-Hint (Branding, D-09) | `Dieses Medium ist Teil der öffentlichen Identität und wird sofort sichtbar.` |

### Kategorie-Feld (D-08)

| Element | Copy |
|---------|------|
| Kategorie-Label | `Kategorie` |
| Kategorie read-only Hint | `Die Kategorie ergibt sich aus diesem Upload-Bereich.` |
| Kategorie-Optionen (`release_version_media`) | `Screenshot`, `Typesetting / Karaoke`, `Fun / Outtake`, `Sonstiges` |
| Kategorie-Pflicht-Fehler | `Bitte eine Kategorie auswählen.` |

### Optionale Felder

| Element | Copy |
|---------|------|
| Beschreibung-Label | `Beschreibung (optional)` |
| Beschreibung-Placeholder | `Kurze Beschreibung des Mediums …` |
| Rechtehinweis-Label | `Rechtehinweis (optional)` |

### Primary CTA & Zustände

| Element | Copy |
|---------|------|
| Primary CTA (Upload) | `Hochladen` (Prozessmedien) / `{Slot} hochladen` (Branding, z. B. „Logo hochladen") |
| Empty state heading | `Kein Owner-Kontext` |
| Empty state body | `Dieser Bereich liefert noch keinen gültigen Owner. Öffne den Upload aus der zugehörigen Gruppe, dem Anime, der Release-Version oder dem Profil.` |
| Error state — Owner blockiert (D-06) | Titel: `Upload nicht möglich` · Text: `Dieser Upload-Bereich hat keinen gültigen Owner-Kontext. Bitte lade die Seite neu oder öffne den Upload erneut aus dem zugehörigen Bereich.` |
| Pflichtfeld-Fehler (Status fehlt) | `Bitte einen Status auswählen.` |
| Upload-Erfolg (Toast) | `Medium hochgeladen.` |
| Upload-Fehler (Toast, generisch) | `Upload fehlgeschlagen. Bitte erneut versuchen.` |

### Button-Disabled-Logik (Pflichtfeld-Validierung vor dem Speichern)

Der Primary-CTA ist `disabled` (`buttonDisabled`), solange eine der folgenden Bedingungen gilt:
- Owner nicht auflösbar (`ownerResolved === false`, D-06) — zusätzlich `ErrorState` statt Formular.
- Prozessmedien: kein Status gewählt (Default „in Prüfung" ist vorbefüllt, also faktisch nie leer) **oder** keine Kategorie gewählt (`release_version_media`).
- Keine Datei ausgewählt.

Es gibt KEINE destruktiven Aktionen in Phase 79 (kein Delete/Edit-Lifecycle — Deferred). Daher keine destruktive Bestätigung nötig.

---

## Komponenten-Inventar (Surface-Contract)

Eine gemeinsame, wiederverwendbare Komponente (D-07) — `MediaOwnershipContext` — wird in alle 5 Surfaces eingebunden. Sie ist über zwei Konfigurationsschalter gemäß dem zweiklassigen Modell (D-09) parametrisiert.

### Gemeinsame Komponente: `MediaOwnershipContext`

| Prop | Werte | Bedeutung |
|------|-------|-----------|
| `ownerType` | `fansub_group \| anime \| release_theme \| release_version \| member` | Owner-Typ aus der Fläche (D-05) |
| `ownerID` | `number \| null` | Owner-ID; `null`/`<=0` ⇒ Upload blockieren (D-06) |
| `ownerLabel` | string | Anzeigename im Owner-Chip |
| `categoryMode` | `slot \| dropdown` | `slot` = read-only Chip; `dropdown` = echtes `Select` (nur `release_version_media`) |
| `categoryValue?` | string | für `slot`-Surfaces fix |
| `categoryOptions?` | `{value,label}[]` | für `dropdown`-Surfaces |
| `statusPolicy` | `immediate \| in_review` | `immediate` = Branding sofort sichtbar (D-09); `in_review` = Standard-Default (D-03) |
| `disabled?` | boolean | sperrt Felder während Upload |
| `onContextChange` | callback | liefert `{ ownerResolved, visibilityCode, reviewStatusCode, categoryValue }` |

**Visuelle Struktur (oben → unten) innerhalb der Pflichtfeld-Karte (`Card`/`cardNestedFlat`):**
1. Owner-Chip (`Badge variant="info"`, read-only) + Owner-Erklär-Hint.
2. Kategorie: read-only `Badge` (slot) ODER `Select` in `FormField` (dropdown).
3. Status: `Select` in `FormField` mit 6 Optionen (`in_review`-Policy) ODER Sofort-Sichtbar-Hint statt Dropdown (`immediate`-Policy, Branding).
4. Optional: `Textarea`/`Input` für Beschreibung/Rechtehinweis (nur Prozessmedien sichtbar, optional).
5. Bei fehlendem Owner: gesamte Karte durch `ErrorState` ersetzt (kein Formular).

### Surface-Matrix (Klasse je Surface, D-09)

| # | Surface | Komponente | `ownerType` | `categoryMode` | `statusPolicy` | Formular-Last |
|---|---------|-----------|-------------|----------------|----------------|---------------|
| 1 | Fansub Branding (Logo/Banner) | `MediaUpload.tsx` | `fansub_group` | `slot` (kind) | `immediate` | schlank (Owner+Kategorie read-only, Status-Hint statt Dropdown) |
| 2 | Anime Assets (Cover/Banner/Logo/BG/Video) | `AnimeJellyfinAssetUploadControls.tsx` | `anime` | `slot` (asset_type) | `immediate` | schlank |
| 3 | Release Theme Assets (OP/ED) | `ReleaseThemeAssetsSection.tsx` | `release_theme` | `slot` (theme_type) | `immediate`* | schlank |
| 4 | Release-Version Process Media | `ReleaseVersionMediaSection.tsx` | `release_version` | `dropdown` (4 Kategorien) | `in_review` | voll (Kategorie-Dropdown + Status + Beschreibung) |
| 5 | Member Media (Avatar/Hintergrund/Story) | `MemberAvatarCard.tsx`, `ProfileBackgroundCard.tsx` | `member` | `slot` (Slot) | `immediate` | schlank |

\* Surface 3 (Theme-Assets) ist Identity-/Branding-ähnlich; Planner bestätigt `statusPolicy` (RESEARCH A2/A3 — bei abweichender Freigaberegel eigene Policy konfigurieren). Default-Annahme: `immediate`.

**`MediaUpload.tsx` (540 Z.) muss vor Einbindung auf ≤450 Zeilen gesplittet werden** (CLAUDE.md 450-Zeilen-Limit; RESEARCH Pitfall 3).

---

## Interaction Contracts

| Interaktion | Verhalten | Quelle |
|-------------|-----------|--------|
| Owner nicht auflösbar | Formular wird NICHT gerendert; stattdessen `ErrorState`; kein `authorizedUploadXhr`-Aufruf (Guard vor Transport) | D-06, RESEARCH Pitfall 4 |
| Default-Status Prozessmedien | `Select` vorbefüllt mit „in Prüfung" (= `private`+`in_review`) | D-03 |
| Branding-Status | Kein Status-Dropdown; Sofort-Sichtbar-Hint; sendet `public`+`approved` | D-09 |
| Kategorie slot | Read-only `Badge`, kein Dropdown | D-08 |
| Kategorie dropdown | `Select`, Pflicht, Validierung vor CTA-Enable | D-08, SC |
| Status-Mapping | 6 UI-Labels → `visibility_code`+`review_status_code` (Strings); ID-Auflösung im Backend | D-01/D-02, RESEARCH Pattern 2 |
| Transport | Unverändert `authorizedUploadXhr`; gemeinsame Komponente liefert nur die Status-/Kategorie-Codes | D-07, Lock G |
| Owner-Chip | Immer read-only, nie Auswahl/Editier-Element | D-05 |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | keine | not applicable (kein shadcn im Projekt) |
| Drittregistries | keine | not applicable |

Keine externen UI-Pakete, keine Registry-Blöcke, keine neuen Abhängigkeiten (RESEARCH: „Keine neuen Pakete erforderlich"). Registry-Vetting-Gate entfällt vollständig.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS — deutsche Strings mit Umlauten, CTA/Empty/Error/Status/Kategorie definiert
- [ ] Dimension 2 Visuals: PASS — nur globale Primitives (`Select`/`FormField`/`Badge`/`Card`/`ErrorState`/`EmptyState`/`Textarea`/`Button`)
- [ ] Dimension 3 Color: PASS — 60/30/10 aus `globals.css`-Tokens, Accent reserviert, Status-Badge-Semantik gemappt
- [ ] Dimension 4 Typography: PASS — 14/16px-Rollen, 400/700-Gewichte, keine neuen Größen
- [ ] Dimension 5 Spacing: PASS — `--space-*`-Tokens (4/8/12/16/24/32), keine Ausnahmen
- [ ] Dimension 6 Registry Safety: PASS — keine Registries, kein Vetting nötig

**Approval:** pending

---

*Phase: 79-medien-ownership-in-ui-durchsetzen*
*UI-SPEC erstellt: 2026-06-06*

---
phase: 76
slug: me-contributions-dashboard-registrierte-user-vorschl-ge
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-05
reviewed_at: 2026-06-05
---

# Phase 76 — UI Design Contract

> Visueller und Interaktions-Vertrag für den Umbau von `/me/contributions` zum
> **persönlichen Beitrags- & Klärungsdashboard** (Decision 5) plus **unified
> „Vorschlagen/Melden"-Einstieg** für registrierte-User-Vorschlagsflows (Decision 6).
> Erstellt von gsd-ui-researcher, verifiziert von gsd-ui-checker.

**Sprachkontext:** Diese UI-SPEC ist auf Deutsch verfasst. Alle user-facing Strings
verwenden korrekte Umlaute (ä/ö/ü/Ä/Ö/Ü/ß) — ASCII-Ersatz (ae/oe/ue/ss) ist in
Produktcode-Strings VERBOTEN (CLAUDE.md `Sprachqualität`). Technische Bezeichner,
Tokens, Pfade und CSS-Klassen bleiben im Original.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (etabliertes Eigen-Design-System, **kein** shadcn) |
| Preset | not applicable — `components.json` nicht vorhanden (verifiziert: Glob `frontend/components.json` → keine Datei) |
| Component library | Interne globale Primitives unter `@/components/ui` (PFLICHT laut CLAUDE.md) |
| Styling | CSS Modules + globale CSS-Custom-Properties (`frontend/src/styles/globals.css`); Primitive-Styles in `frontend/src/components/ui/ui.module.css`; Bereichs-Styles ergänzend in `frontend/src/components/contributions/contributions.module.css` |
| Icon library | `lucide-react` |
| Font | Inter (`--font-sans: Inter, "Segoe UI", system-ui, sans-serif`) |

**shadcn-Gate:** Nicht anwendbar. Das Projekt hat ein vollständiges, etabliertes
Eigen-Design-System mit globalen Primitives (`Button`, `Badge`, `Card`, `Tabs`,
`Table`, `EmptyState`, `ErrorState`, `LoadingState`, `SectionHeader`, `Toolbar`,
`Drawer`, `Modal`, `FormField`, `Input`, `Select`, `Textarea`, `Pagination`,
`YearPicker` …; Quelle: `frontend/src/components/ui/index.ts`). Eine
shadcn-Initialisierung würde gegen das verbindliche Design-System (CLAUDE.md) und
gegen die Brownfield-/Reuse-Constraints (D-01) verstoßen. `Tool: none`,
Registry-Safety-Gate: nicht anwendbar.

---

## PFLICHT-Constraints (UI-Checker-Gate)

Diese fünf Constraints sind verbindlich und werden vom gsd-ui-checker geprüft.

| # | Constraint | Quelle | Durchsetzung |
|---|-----------|--------|--------------|
| C1 | **Globales Design-System Pflicht.** Jede user-facing UI in Dashboard, Inbox, Summary/Filter und Melde-Modal MUSS Primitives aus `@/components/ui` nutzen (`Button`, `Badge`, `Card`, `Modal`/`Drawer`, `Select`, `FormField`, `Input`, `Textarea`, `SectionHeader`, `EmptyState`, `ErrorState`, `LoadingState`). Handgebaute native `<button>/<input>/<select>/<textarea>` oder Eigen-Markup für einen vorhandenen Primitiv-Typ sind VERBOTEN. Lokale Datei-Konsistenz rechtfertigt KEIN Abweichen. | CLAUDE.md `Frontend-UI`; RESEARCH Befund 5, Fallstrick 6/7 | ESLint `no-restricted-syntax` (`frontend/eslint.config.mjs`); Referenz `/dev/ui-system` |
| C2 | **Pflicht-Migration zweier Altfälle.** `VisibilityDropdown.tsx` (native `<select>` + Inline-Styles) MUSS auf `Select` aus `@/components/ui` migriert werden; `ProposalForm.tsx` (handgebautes `position:fixed`-div-Modal + native `<button>`-Toggles + Inline-Style-Objekt `S`) MUSS in `Modal` aus `@/components/ui` gewrappt werden, die Scope-Karten- und Rollen-Chip-`<button>` durch `Button`-Primitive/Toggle-Chips ersetzt. | CLAUDE.md `Frontend-UI`; gefaltetes Todo `2026-06-03-contribution-dropdown…`; RESEARCH Befund 5, Fallstrick 6/7 | ESLint-Gate + Checker Dimension 2 |
| C3 | **Sprachqualität.** Deutscher UI-Text mit korrekten Umlauten; ASCII-Ersatz verboten. Gilt für alle Labels, Button-Texte, Empty-/Error-States, Placeholder, `aria-label`, Toast-/Statusmeldungen, Pflicht-Begründungs-Texte. | CLAUDE.md `Sprachqualität` | Checker Dimension 1 (Copywriting) |
| C4 | **Modularity ≤ 450 Zeilen.** Inbox, Summary+Filter, Melde-Modal und je typ-spezifisches Formular als EIGENE Komponentendateien (siehe Komponenten-Inventar), NICHT in `page.tsx`/`MyContributionsSection.tsx` stapeln. `ProposalForm.tsx` (294 Z.) und `contributions_me_handler.go` (349 Z.) proaktiv splitten, bevor Erweiterungen das Limit reißen. | CLAUDE.md `Modularity`; RESEARCH Fallstrick 4/5 | Checker / Executor |
| C5 | **Reihenfolge & Lock-H-Trennung (D-02/D-04/D-06).** Verbindliche vertikale Reihenfolge Inbox → Summary/Filter → Listen. EIN zentraler Melde-Einstieg (kein kontextueller Button anderswo). Claim ist im Melde-Modal nur **Verlinkung/Redirect**, NIE ein Schreibpfad — visuell und navigatorisch von Vorschlags-Formularen getrennt. | D-02, D-04, D-05, D-06; Lock H | Checker / Executor |

---

## Spacing Scale

Deklarierte Werte aus `frontend/src/styles/globals.css` (`--space-1..9`). Verbindlich
für alle neuen Flächen — neue Hardcode-Pixelwerte sind VERBOTEN, stattdessen Tokens.
(Hinweis: die bestehenden `contributions.module.css`-Hardcodes 6/8/10/12/14/18px
werden bei Berührung auf Tokens vereinheitlicht; neue Komponenten nutzen ausschließlich
Tokens.)

| Token | CSS-Var | Value | Usage in Phase 76 |
|-------|---------|-------|-------------------|
| xs | `--space-1` | 4px | Icon-/Badge-Gaps, Chip-Innenabstand |
| sm | `--space-2` | 8px | Gap zwischen Stat-Chips, Inbox-Item-Innenelemente, Card-Gap |
| (compact) | `--space-3` | 12px | Bestehende Ausnahme der 8-Punkt-Reihe (Card-/Listen-Gap compact) |
| md | `--space-4` | 16px | Default-Abstand Card-Padding, Formularfeld-Gap, Modal-Body-Gap |
| lg | `--space-5` | 24px | Sektions-Padding, Trennung Inbox ↔ Summary ↔ Listen-Karten |
| xl | `--space-6` | 32px | Block-Abstand zwischen den drei Dashboard-Sektionen (D-02), Page-Padding |
| 2xl | `--space-7` | 48px | Große Sektionsbrüche |
| 3xl | `--space-8` | 64px | Seiten-Ebene |
| — | `--space-9` | 80px | Selten; Seiten-Ebene |

**Exceptions:** `--space-3` (12px) ist eine bestehende, projektweite Ausnahme der
8-Punkt-Reihe und Teil des etablierten Token-Sets — nicht neu eingeführt. Touch-Target-
Mindesthöhe: `--control-height-md` = 44px (Button/Select `size="md"` — Default für
primären Melde-CTA und Inbox-Aktionen), `--control-height-sm` = 36px (Button `size="sm"`
für kompakte Inline-Aktionen und Stat-Chips). Stat-Chips müssen als interaktive Toggles
mind. 36px hoch sein.

---

## Typography

Aus `globals.css` (Body 16px/1.5) und `ui.module.css` (Primitive-Rollen). Inter,
exakt deklariert. Body-Zeilenhöhe 1.5, Überschriften 1.15–1.3.

| Role | Size | Weight | Line Height | Verwendung |
|------|------|--------|-------------|------------|
| Body | 16px | 400 (regular) | 1.5 | Fließtext, Inbox-Item-Beschreibung, Ablehngrund-/Begründungstext, Formular-Hilfetexte |
| Label | 14px | 700 (bold) | 1.1–1.3 | Button-/Badge-/Chip-Text, Feld-Label, Modal-Titel-Sekundärzeile |
| Section-Title | 16px (1rem) | 700 | 1.15 | `SectionHeader`/`Card`-Titel (Inbox, Summary, Listen), Modal-Titel |
| Page-Title (H1) | 24px (1.5rem) | 700 | 1.2 | Seitentitel „Meine Beiträge" (bestehend) |
| Meta/Hint | 12px | 700 | 1.45 | Badge-/Chip-Zähler, Feld-Hints, Status-Mini-Labels (`.badge`, `.fieldHint`) |

**Weights:** Genau zwei aktive Gewichte im Vertrag — **400 (regular)** für Body,
**700 (bold)** für Labels/Titel/Badges/Chips (entspricht dem etablierten Primitive-
System). Keine weiteren Gewichte einführen. (Die bestehende `contributionTitle` mit
`font-weight: 800` wird bei Berührung auf 700 angeglichen.)

---

## Color

60/30/10-Aufteilung aus `globals.css`. Accent ist strikt reserviert. Status-Semantik
erfolgt über `Badge`-Varianten, NICHT über freie Farbflächen.

| Role | Value | CSS-Var | Usage |
|------|-------|---------|-------|
| Dominant (60%) | `#f9f9f9` | `--bg-primary` | Seiten-/Dashboard-Hintergrund |
| Secondary (30%) | `#ffffff` | `--surface-card` (`--bg-card`) | Cards: Inbox-Container, Summary-Container, Listen-Karten, Modal-Fläche |
| Accent (10%) | `#5f84dd` | `--accent-primary` (`--color-primary`) | siehe Reserved-Liste unten |
| Destructive | `#82122c → #3a0e23` | `--button-danger-start/end` | NUR destruktive/abweisende Aktion: „Das war ich nicht" (`Button variant="danger"`) + Pflicht-Begründungs-Bestätigung. Reject ist KEIN Löschen (D-09 „löscht nichts") — danger signalisiert nur Widerspruch/Konflikt |
| Success-Signal | `#2f9b79` / `Badge variant="success"` | `--button-success-*` | „Das war ich"/Bestätigen (`Button variant="success"`); Status-Badge „Bestätigt" |
| Warning-Signal | `Badge variant="warning"` | — | Status-Badge „In Prüfung"/„Sichtbarkeit offen"; Inbox-Hinweis „braucht Aufmerksamkeit" (gedämpft, nicht alarmierend) |
| Info-Signal | `Badge variant="info"` | — | Rollen-Badges (bestehend), Status-Badge „Zugeordnet", neutrale Zähler-Chips |
| Konflikt-Signal | `Badge variant="danger"` | — | Status-Badge „Bestritten/Konflikt" und „Abgelehnt" — sparsam, nur für echte Konflikt-/Ablehn-Zustände |
| Muted | `Badge variant="muted"`/`"neutral"` | `--text-muted #6b6b70` | Inaktive/abgeschlossene Beiträge, Meta-Text |

**Accent reserved for:** ausschließlich (1) primärer „Vorschlagen/Melden"-CTA
(`Button variant="primary"`), (2) **aktiver** Zustand eines Stat-Chip-Filters
(D-12 — selektierter Chip), (3) `Button variant="subtle"`/Sprungmarken-Akzent,
(4) Fokus-Ring auf interaktiven Elementen, (5) aktiver Tab-Zustand falls Tabs für die
Listen genutzt werden. **Niemals** für Flächenfüllung, niemals pauschal für „alle
interaktiven Elemente", niemals als Status-Farbe (Status nutzt success/warning/
info/danger-Badges).

**Semantik-Regeln:**
- **Inbox-Dringlichkeit (D-03):** Items „brauchen Aufmerksamkeit", sind aber kein
  Fehler → `warning`/`info`-Badges, KEIN flächiges Rot. Echte Konflikte (disputed,
  abgelehnt) dürfen `danger` tragen.
- **„Das war ich" vs. „Das war ich nicht" (D-08/D-09):** Bestätigen = `success`,
  Widerspruch = `danger`. Beide klar als zwei distinkte Aktionen mit ausreichendem
  Abstand (`--space-2`+), damit kein Fehlklick passiert.
- **Stat-Chips als Filter (D-12):** Inaktiver Chip = `neutral`/`muted`-Optik mit
  Zähler; aktiver (gefilterter) Chip = Accent-Rahmen/-Füllung. Toggle-Zustand MUSS
  visuell eindeutig und per `aria-pressed` zugänglich sein.

---

## Komponenten-Inventar (Phase 76)

Alle aus `@/components/ui` (C1/C2). Keine neuen externen Pakete.

### Dashboard-Struktur (D-01/D-02 — verbindliche Reihenfolge)

```
<main> (page.tsx, bestehende max-width-Spalte, erweitert)
  H1 „Meine Beiträge"  +  [Vorschlagen/Melden]-Button (primär, rechts/oben)   ← D-05
  ┌─ 1. Klärungs-Inbox  „Offene Aktionen"  (Card)                             ← D-02/D-03
  ├─ 2. Summary-Aggregat + Filter  (Card, klickbare Stat-Chips)               ← D-02/D-12
  └─ 3. Mitwirkungen-Liste + Vorschläge-Liste  (Cards, client-gefiltert)      ← D-02/D-11
```

| Element | Primitive | Variante / Props | Anmerkung |
|---------|-----------|------------------|-----------|
| Seiten-Container | bestehende `<main>` in `page.tsx` | erweitert, bleibt zentrierte Spalte | D-01: erweitern, nicht ersetzen |
| Seitentitel | `<h1>` (bestehend) | Page-Title 24/700 | „Meine Beiträge" |
| Primärer Melde-CTA | `Button` | `variant="primary"`, `size="md"`, `leftIcon` (lucide `Plus`/`Megaphone`) | Öffnet das unified Melde-Modal (D-05). Einziger Einstieg (D-04) |
| Inbox-Container | `Card` | `variant="section"` | „Offene Aktionen" (D-02 zuoberst) |
| Inbox-Kopf | `SectionHeader` | `title` + `description` | Erklärt „braucht deine Aufmerksamkeit" |
| Inbox-Item (zugeordnet, D-03a) | `ContributionCard mode="pending"` (bestehend, in Inbox verdrahtet) | mit `onConfirm`/`onReject` | „Das war ich" = `Button variant="success"`; „Das war ich nicht" = `Button variant="danger"` öffnet Reject-Modal |
| Inbox-Item (disputed, D-03b) | `Card` `variant="nestedFlat"` + `Badge variant="danger"` | — | Konflikt-Hinweis + ggf. eigener `member_reason` |
| Inbox-Item (abgelehnt, D-03c) | `Card` + `Badge variant="danger"` + Ablehngrund (Body) + `Button` „Details korrigieren" | — | Sprung in Korrektur-Vorschlag (D-10) |
| Inbox-Item (Sichtbarkeit offen, D-03d) | `Card` + `Badge variant="warning"` + `Select` (Sichtbarkeit) | — | Sanfter Prompt; nutzt migrierten `VisibilityDropdown` (C2) |
| Summary-/Filter-Container | `Card` `variant="section"` | — | Summary UND Filter = dieselbe Mechanik (D-12) |
| Stat-Chip (Filter-Toggle) | `Button` `variant="subtle"`/`size="sm"` ODER `Badge` in Button-Wrapper | inaktiv = neutral; aktiv = Accent; `aria-pressed` | Achsen: Anime/Gruppe/Rolle/Zeitraum/Status (D-12). Zeigt Label + Zähler |
| Zeitraum-Filter | `YearPicker` oder `Select` | — | Achse „Zeitraum" (D-12) |
| Mitwirkungen-Liste | `Card` + `ContributionCard mode="confirmed"` | — | Bestehend; um Inbox-Verdrahtung entlastet |
| Vorschläge-Liste | `Card` + `ContributionCard mode="proposal"` | — | proposed/disputed eigene Vorschläge |
| Leere Liste (gefiltert) | `EmptyState` | `variant="default"` | Wenn Filter keine Treffer ergibt |
| Sichtbarkeits-Auswahl | `Select` (migriert aus `VisibilityDropdown`, C2) | `options`: Öffentlich / Nur intern | Ersetzt native `<select>` |

### Unified Melde-Modal (D-05/D-06)

| Element | Primitive | Variante / Props | Anmerkung |
|---------|-----------|------------------|-----------|
| Container | `Modal` (oder `Drawer`) aus `@/components/ui` | `aria-labelledby` Modal-Titel | Ersetzt handgebautes `position:fixed`-div (C2). EIN Container für alle Typen |
| Schritt 1 — Typ wählen | `FormField` + Radio-Karten als `Button`-Toggles ODER `Select` | Typen: Fehler/Korrektur, Story, Medien, Contribution, Claim | „Typ → Ziel → Feld" (D-05) |
| Schritt 2 — Zielkontext | `Select`/`FormField` | Ziele je Typ: Anime / Contribution / Gruppe / Profil | Nutzer wählt Ziel selbst (D-04) |
| Schritt 3a — Fehler/Korrektur | `FormField` + `Textarea` (Freitext, required) | — | NEU (D-06); auch Backend für „Details korrigieren" (D-10, vorbefüllt) |
| Schritt 3b — Story | `FormField` + `Textarea`/RichText | — | NEU (D-06); review-gebunden |
| Schritt 3c — Medien | `FormField` + Datei-Upload (bestehender `authorizedUploadXhr`-Seam) + Kategorie-`Select` + Sichtbarkeits-`Select` | — | NEU, größter Aufwand (D-06); Decision-8-Matrix: Owner, Kategorie, `review_status='in_review'`, `visibility='internal'` |
| Schritt 3d — Contribution | bestehender `ProposalForm` (in `Modal` gewrappt, C2) | Scope-Karten + Rollen-Chips als `Button`-Toggles | NUR INTEGRIEREN, kein Neubau (D-06) |
| Schritt 3e — Claim | `Button`/Link (`href` auf Claim-Flow) + erklärender Hinweis | — | NUR Verlinkung/Redirect — KEIN Schreibpfad (Lock H, C5). Visuell getrennt von Vorschlags-Formularen |
| Modal-Footer | `Button` `variant="secondary"` (Abbrechen) + `variant="primary"` (Senden) | — | Senden nur aktiv, wenn Pflichtfelder gefüllt |
| Erfolg/Fehler im Modal | `ErrorState` inline / Toast bzw. `role="alert"`-Banner | — | Deutsche Umlaute (C3) |

### Reject-Pflicht-Begründungs-Modal (D-09)

| Element | Primitive | Variante / Props | Anmerkung |
|---------|-----------|------------------|-----------|
| Container | `Modal` | `aria-labelledby` | Öffnet bei „Das war ich nicht" |
| Pflicht-Begründung | `FormField` (`required`) + `Textarea` | min. ~5 Zeichen (Backend `binding:"required,min=5"`) | PFLICHT (D-09) — Senden bis dahin deaktiviert |
| Footer | `Button variant="secondary"` (Abbrechen) + `variant="danger"` (Widerspruch senden) | — | „löscht nichts" → setzt Konflikt-/Reviewstatus |

---

## Copywriting Contract

Deutsch, korrekte Umlaute (C3). Verbindliche Strings:

| Element | Copy |
|---------|------|
| Seitentitel | `Meine Beiträge` |
| Primary CTA (Melde-Einstieg) | `Vorschlagen / Melden` |
| Inbox-Titel (SectionHeader) | `Offene Aktionen` |
| Inbox-Beschreibung | `Diese Punkte brauchen deine Aufmerksamkeit – bestätige Zuordnungen, kläre Widersprüche oder entscheide über die Sichtbarkeit.` |
| Inbox-Item zugeordnet (Prompt) | `Wurdest du dieser Mitwirkung zugeordnet?` |
| Aktion bestätigen | `Das war ich` |
| Aktion widersprechen | `Das war ich nicht` |
| Aktion korrigieren | `Details korrigieren` |
| Reject-Modal-Titel | `Zuordnung widersprechen` |
| Reject-Begründung-Label | `Warum trifft diese Zuordnung nicht zu?` |
| Reject-Begründung-Hint | `Die Begründung ist erforderlich und hilft dem Gruppen-Leader, den Widerspruch einzuordnen. Es wird nichts gelöscht.` |
| Reject-Senden | `Widerspruch senden` |
| Ablehngrund-Präfix (Card) | `Ablehngrund:` |
| Sichtbarkeit-Prompt (D-03d) | `Soll diese bestätigte Mitwirkung öffentlich im Profil erscheinen?` |
| Sichtbarkeit öffentlich | `Öffentlich im Member-Profil` |
| Sichtbarkeit intern | `Nur intern sichtbar` |
| Summary-Titel (SectionHeader) | `Überblick & Filter` |
| Summary-Beschreibung | `Tippe auf einen Wert, um die Listen darunter zu filtern. Erneutes Tippen hebt den Filter auf.` |
| Filter-Achsen-Labels | `Anime`, `Gruppe`, `Rolle`, `Zeitraum`, `Status` |
| Filter zurücksetzen | `Filter zurücksetzen` |
| Melde-Modal-Titel | `Vorschlagen oder melden` |
| Melde Schritt 1 Label | `Was möchtest du melden oder vorschlagen?` |
| Typ Fehler | `Fehler / Korrektur melden` |
| Typ Story | `Story vorschlagen` |
| Typ Medien | `Medien vorschlagen` |
| Typ Contribution | `Mitwirkung vorschlagen` |
| Typ Claim | `Profil beanspruchen` |
| Melde Schritt 2 Label | `Worauf bezieht sich dein Vorschlag?` |
| Melde Hinweis review-gebunden | `Dein Vorschlag wird geprüft, bevor er öffentlich erscheint. Registrierte Mitglieder können vorschlagen, aber nicht direkt veröffentlichen.` |
| Claim-Hinweis (Lock H) | `Das Beanspruchen eines Profils läuft über einen eigenen, geschützten Ablauf. Du wirst dorthin weitergeleitet.` |
| Claim-Weiterleitung-CTA | `Zum Beanspruchen-Ablauf` |
| Medien-Kategorie-Label | `Kategorie` |
| Medien-Sichtbarkeit-Hinweis | `Hochgeladene Medien sind zunächst nur intern sichtbar und werden vor der Veröffentlichung geprüft.` |
| Melde Abbrechen | `Abbrechen` |
| Melde Senden | `Zur Prüfung senden` |
| Empty state heading (gesamte Inbox leer) | `Keine offenen Aktionen` |
| Empty state body (Inbox leer) | `Es gibt gerade nichts zu klären. Neue Zuordnungen oder Rückmeldungen erscheinen hier.` |
| Empty state heading (keine Beiträge) | `Noch keine Beiträge` |
| Empty state body (keine Beiträge) | `Sobald du Mitwirkungen bestätigst oder Vorschläge einreichst, erscheinen sie hier. Nutze „Vorschlagen / Melden", um zu starten.` |
| Empty state heading (Filter ohne Treffer) | `Keine Treffer` |
| Empty state body (Filter ohne Treffer) | `Für die gewählten Filter gibt es keine Einträge. Setze die Filter zurück, um alles zu sehen.` |
| Error state (Laden fehlgeschlagen) | `Beiträge konnten nicht geladen werden.` |
| Error state (Aktion fehlgeschlagen) | `Die Aktion konnte nicht gespeichert werden. Bitte versuche es erneut.` |
| Toast Bestätigt | `Mitwirkung bestätigt.` |
| Toast Widerspruch | `Widerspruch wurde gespeichert.` |
| Toast Vorschlag gesendet | `Vorschlag zur Prüfung gesendet.` |
| aria-label Melde-CTA | `Vorschlagen oder melden öffnen` |
| aria-label Stat-Chip aktiv | `Filter aktiv: {Achse} {Wert}` |
| aria-label Stat-Chip inaktiv | `Nach {Achse} {Wert} filtern` |

**Destructive actions:** Genau EINE „abweisende" Aktion mit `danger`-Optik:
**„Das war ich nicht"** (D-09). Sie ist **kein Löschen** — der Datensatz bleibt
erhalten und wechselt in den Konflikt-/Reviewstatus. Bestätigung erfolgt über das
Reject-Pflicht-Begründungs-Modal mit erforderlichem Freitextfeld (Senden erst nach
gültiger Eingabe aktiv). Kein anderer destruktiver Pfad in Phase 76 (Claim ist nur
Verlinkung, Lock H).

---

## Zustände & Interaktion (verbindlich)

| Zustand | Darstellung |
|---------|-------------|
| Laden | `LoadingState`-Primitive (bestehend in `page.tsx`) |
| Fehler (Laden) | `ErrorState` mit „Zur Anmeldung"-Aktion (bestehend) |
| Inbox leer | `EmptyState` „Keine offenen Aktionen" |
| Keine Beiträge gesamt | `EmptyState` „Noch keine Beiträge" + Verweis auf Melde-CTA |
| Filter ohne Treffer | `EmptyState` „Keine Treffer" + „Filter zurücksetzen" |
| Stat-Chip-Toggle (D-12) | Klick setzt/löscht Filter (`useMemo`-gefilterte Liste, D-11). Aktiver Chip Accent + `aria-pressed=true`. Mehrere Achsen kombinierbar |
| „Das war ich" | `success`-Button → Confirm-Endpoint → Item verlässt Inbox, Toast |
| „Das war ich nicht" | `danger`-Button → Reject-Modal (Pflicht-Begründung) → Konfliktstatus, Toast |
| „Details korrigieren" | öffnet Melde-Modal Typ „Fehler/Korrektur" **vorbefüllt** mit Ziel = diese Contribution (D-10, EINE Korrektur-Mechanik) |
| Sichtbarkeit ändern | migrierter `Select` → Visibility-Endpoint, Inline-Status „Wird gespeichert…" / Fehlertext |
| Melde-Flow Schritt-Navigation | Typ → Ziel → typ-spezifisches Feld; Zurück möglich; Senden erst bei gültigen Pflichtfeldern |
| Medien-Upload | review-gebunden: nach Upload `review_status='in_review'`, `visibility='internal'`; Fortschritts-/Fehlerzustand sichtbar |
| Claim-Auswahl | KEIN Inline-Formular — Hinweis + Weiterleitungs-CTA (Lock H, C5) |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Eigen-Design-System `@/components/ui` | Button, Badge, Card, Modal, Drawer, Select, FormField, Input, Textarea, SectionHeader, EmptyState, ErrorState, LoadingState, YearPicker | not required (intern, kein externes Registry) |
| Third-party | keine | not applicable |

**Keine** neuen npm-Pakete, **keine** shadcn/Third-party-Registries (RESEARCH:
„Keine neuen externen Pakete erforderlich. Ausschließlich bestehender Stack").
Registry-Vetting-Gate nicht anwendbar.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (deutsch, Umlaute korrekt, alle Strings deklariert)
- [ ] Dimension 2 Visuals: PASS (nur `@/components/ui`-Primitives; `VisibilityDropdown` + `ProposalForm` migriert — keine nativen Elemente/Eigen-Modals)
- [ ] Dimension 3 Color: PASS (60/30/10, Accent reserviert, danger nur für „Das war ich nicht")
- [ ] Dimension 4 Typography: PASS (Inter, 5 Rollen, 2 Gewichte)
- [ ] Dimension 5 Spacing: PASS (nur `--space-*`-Tokens, 44/36px Touch-Targets)
- [ ] Dimension 6 Registry Safety: PASS (kein externes Registry)

**Approval:** pending

---

## UI-SPEC COMPLETE

**Phase:** 76 — `/me/contributions` Dashboard + registrierte-User-Vorschläge
**Design System:** none (etabliertes Eigen-System `@/components/ui`, kein shadcn)

### Contract Summary
- Spacing: `--space-1..9` (4/8/12/16/24/32/48/64/80); 12px bestehende Ausnahme; Touch-Targets 44/36px
- Typography: 5 Rollen (Body 16/400/1.5, Label 14/700, Section-Title 16/700, Page-Title 24/700, Meta 12/700), 2 Gewichte
- Color: Dominant `#f9f9f9`, Secondary `#ffffff`, Accent `#5f84dd` (reserviert: Melde-CTA, aktiver Filter-Chip, subtle, Fokus-Ring); danger nur für „Das war ich nicht" (D-09)
- Copywriting: 50+ Strings definiert (Dashboard, Inbox, Summary/Filter, Melde-Modal, Reject-Modal, Empty/Error, Toasts, aria-labels), deutsch mit Umlauten
- Registry: nur internes `@/components/ui`; keine Third-party

### File Created
`.planning/phases/76-me-contributions-dashboard-registrierte-user-vorschl-ge/76-UI-SPEC.md`

### Pre-Populated From
| Source | Decisions Used |
|--------|---------------|
| 76-CONTEXT.md | 12 (D-01..D-12) |
| 76-RESEARCH.md | Stack, Andockpunkte, Komponenten-Split, Befunde (created_by/fansub_group_name/Reject-reason), Fallstricke 4–7, Validation-Map |
| components.json | nein (nicht vorhanden — Eigen-System) |
| Codebase (globals.css, ui.module.css, Primitives, page.tsx, ContributionCard, VisibilityDropdown, ProposalForm) | Tokens, Varianten, Primitive-Inventar, Migrations-Altfälle |
| CLAUDE.md | 5 Pflicht-Constraints (C1–C5) |
| User input | 0 (alle Fragen durch Upstream/Codebase beantwortet) |

### Ready for Verification
UI-SPEC vollständig. gsd-ui-checker kann validieren.

---
phase: 77
slug: leader-workspace-public-preview-readiness
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-05
reviewed_at: 2026-06-05
---

# Phase 77 — UI Design Contract

> Visueller und Interaktions-Vertrag für den Leader-Workspace `/admin/fansubs/[id]/edit`:
> neuer capability-gated Tab „Veröffentlichung" mit Public-Preview (read-only, inline)
> und Public-Readiness-Checkliste (Leitfaden, kein Gate). Erstellt von gsd-ui-researcher,
> verifiziert von gsd-ui-checker.

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
| Styling | CSS Modules + globale CSS-Custom-Properties (`frontend/src/styles/globals.css`); Primitive-Styles in `frontend/src/components/ui/ui.module.css`; Tab-Styles ergänzend in `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` |
| Icon library | `lucide-react` (bereits in `page.tsx` importiert) |
| Font | Inter (`--font-sans: Inter, "Segoe UI", system-ui, sans-serif`) |

**shadcn-Gate:** Nicht anwendbar. Das Projekt hat ein vollständiges, etabliertes
Eigen-Design-System mit globalen Primitives (`Button`, `Badge`, `Card`, `Tabs`,
`Table`, `EmptyState`, `ErrorState`, `SectionHeader`, `Toolbar`, `Drawer`, `Modal`,
`FormField`, `Input`, `Select`, `Textarea`, `Pagination` …). Eine shadcn-Initialisierung
würde gegen das verbindliche Design-System (CLAUDE.md) und gegen die Brownfield-/Reuse-
Constraints verstoßen. `Tool: none`, Registry-Safety-Gate: nicht anwendbar.

---

## PFLICHT-Constraints (UI-Checker-Gate)

Diese vier Constraints sind verbindlich und werden vom gsd-ui-checker geprüft.

| # | Constraint | Quelle | Durchsetzung |
|---|-----------|--------|--------------|
| C1 | **Globales Design-System Pflicht.** Jede user-facing UI im Readiness-Tab MUSS Primitives aus `@/components/ui` nutzen (`Button`, `Badge`, `Card`, `SectionHeader`, `Tabs`, `EmptyState`, `ErrorState`, `Table`, `Toolbar`). Handgebaute native `<button>/<input>/<select>/<textarea>` oder Eigen-Markup für einen vorhandenen Primitiv-Typ sind VERBOTEN. Lokale Datei-Konsistenz rechtfertigt KEIN Abweichen. | CLAUDE.md `Frontend-UI`; RESEARCH Fallstrick 6 | ESLint `no-restricted-syntax` (`frontend/eslint.config.mjs`); Referenz `/dev/ui-system` |
| C2 | **Sprachqualität.** Deutscher UI-Text mit korrekten Umlauten; ASCII-Ersatz verboten. Gilt für Tab-Label, Checklisten-Labels, Hints, Empty-/Error-States, Button-Labels, `aria-label`. | CLAUDE.md `Sprachqualität` | Checker Dimension 1 (Copywriting) |
| C3 | **Modularity ≤ 450 Zeilen.** Readiness-Tab und Preview-Wrapper als EIGENE Komponentendateien (`ReadinessTab.tsx`, optional `ReadinessChecklist.tsx`, `PublicPreviewPanel.tsx`), NICHT in `page.tsx` (~3.800 Zeilen) stapeln. | CLAUDE.md `Modularity`; RESEARCH Fallstrick 1 | Checker / Executor |
| C4 | **Reuse statt Neubau (D-07).** Story-/Projekt-/Release-Kontext nur per Sprungmarke erreichbar machen; KEINE parallele Eigen-UI für bestehende Sektionen, KEINE neuen Editierfelder als Default. | D-07; RESEARCH FS 5 | Checker / Executor |

---

## Spacing Scale

Deklarierte Werte aus `frontend/src/styles/globals.css` (`--space-1..9`). Verbindlich
für alle neuen Flächen — neue Hardcode-Pixelwerte sind VERBOTEN, stattdessen Tokens.

| Token | CSS-Var | Value | Usage in Phase 77 |
|-------|---------|-------|-------------------|
| xs | `--space-1` | 4px | Icon-/Badge-Gaps, Inline-Abstände |
| sm | `--space-2` | 8px | Abstand Checklisten-Item-Innenelemente, Tab-Gaps |
| (compact) | `--space-3` | 12px | Bestehende Ausnahme im Token-Set (Card-Gap compact) |
| md | `--space-4` | 16px | Default-Abstand zwischen Checklisten-Items, Card-Padding |
| lg | `--space-5` | 24px | Trennung Checkliste ↔ Preview-Panel, Sektions-Padding |
| xl | `--space-6` | 32px | Block-Abstand Readiness-Tab ↔ Preview-Block |
| 2xl | `--space-7` | 48px | Große Sektionsbrüche |
| 3xl | `--space-8` | 64px | Seiten-Ebene |
| — | `--space-9` | 80px | Selten; Seiten-Ebene |

**Exceptions:** `--space-3` (12px) ist eine bestehende, projektweite Ausnahme der
8-Punkt-Reihe und Teil des etablierten Token-Sets — nicht neu eingeführt. Touch-Target
Mindesthöhe für Buttons/Sprungmarken: `--control-height-md` = 44px (Button `size="md"`),
`--control-height-sm` = 36px (Button `size="sm"` für kompakte Inline-Sprungmarken).

---

## Typography

Aus `globals.css` (Body) und `ui.module.css` (Primitive-Rollen). Inter, exakt
deklariert. Body-Zeilenhöhe 1.5, Überschriften 1.15–1.3.

| Role | Size | Weight | Line Height | Verwendung |
|------|------|--------|-------------|------------|
| Body | 16px | 400 (regular) | 1.5 | Fließtext, Checklisten-Item-Label, Hints (`--text-body`) |
| Label | 14px | 700 (bold) | 1.1–1.3 | Button-/Badge-Text, Tab-Label, Feld-Label (`.fieldLabel`, `.button`) |
| Section-Title | 16px (1rem) | 700 | 1.15 | `SectionHeader`/`Card`-Titel im Readiness-Tab (`.sectionTitle`, `.cardTitle`) |
| Meta/Hint | 12px | 700 | 1.45 | Badge-Text, Tab-Badge-Zähler, Feld-Hints (`.badge`, `.fieldHint`, `.tabBadge`) |

**Weights:** Genau zwei aktive Gewichte im Vertrag — **400 (regular)** für Body,
**700 (bold)** für Labels/Titel/Badges (entspricht dem etablierten Primitive-System;
`.button`/`.badge`/`.fieldLabel` nutzen 700). Keine weiteren Gewichte einführen.

---

## Color

60/30/10-Aufteilung aus `globals.css`. Accent ist strikt reserviert.

| Role | Value | CSS-Var | Usage |
|------|-------|---------|-------|
| Dominant (60%) | `#f9f9f9` | `--bg-primary` / `--surface-canvas #f6f4ef` | App-/Workspace-Hintergrund, Tab-Panel-Fläche |
| Secondary (30%) | `#ffffff` | `--surface-card` | Cards, Checklisten-Container, Preview-Panel-Fläche |
| Accent (10%) | `#5f84dd` | `--accent-primary` (`--color-primary`) | siehe Reserved-Liste unten |
| Destructive | `#82122c → #3a0e23` | `--button-danger-start/end` | NUR destruktive Aktionen — **in Phase 77 NICHT verwendet** (kein Löschen/Block; Readiness ist kein Gate, D-05) |
| Success-Signal | `#2f9b79` / `#246b52` | `--button-success-end` / `Badge variant="success"` | Status „erfüllt" in Readiness-Items |
| Warning-Signal | `#8a6420` | `Badge variant="warning"` | Status „fehlt/offen" in Readiness-Items (informativ, NICHT alarmierend) |
| Info-Signal | `#355481` | `Badge variant="info"` | Informative read-only Zähler (Claims/Contributions, D-06) |

**Accent reserved for:** ausschließlich (1) aktiver Tab-Zustand des „Veröffentlichung"-Tabs
(`.tabButtonActive`-Gradient, bestehend), (2) `Button variant="subtle"`-Sprungmarken-Akzent
(`buttonSubtle`/`buttonGhost` nutzen `--accent-primary`-Mix), (3) Fokus-Ring auf
interaktiven Elementen. **Niemals** für Flächenfüllung, niemals für „alle interaktiven
Elemente" pauschal, niemals als Readiness-Status-Farbe (Status nutzt success/warning/info-Badges).

**Semantik-Regel (D-05/D-06):** Readiness ist Leitfaden, kein Gate. „Fehlende" Punkte
verwenden `Badge variant="warning"` (gedämpftes Bernstein), NICHT danger/rot. Informative
Zähler (offene Claims/Contributions) verwenden `Badge variant="info"` oder `"neutral"` —
sie dürfen visuell NICHT wie ein Blocker/Fehler wirken (D-06: zählen nicht gegen „bereit").

---

## Komponenten-Inventar (Phase 77)

Alle aus `@/components/ui` (C1). Keine neuen Primitives.

| Element | Primitive | Variante / Props | Anmerkung |
|---------|-----------|------------------|-----------|
| Neuer Workspace-Tab | bestehende `MAIN_TABS`-Tab-Leiste in `page.tsx` | Eintrag `{ key: "readiness", label: "Veröffentlichung" }` | Position: ans Ende von `MAIN_TABS`, nach „Anime-Einblicke" (Discretion A4). Gating `can_edit_group \|\| can_edit_notes` (D-08) |
| Tab-Kopf im Panel | `SectionHeader` | `title` + `description` | Erklärt „Vorschau + Pflegezustand", macht „kein Gate" sichtbar |
| Readiness-Container | `Card` | `variant="section"` | Umschließt die Checkliste |
| Checklisten-Item | Komposition aus `Badge` (Status) + Text + `Button` (Sprungmarke) | — | Anatomie siehe unten |
| Status „erfüllt" | `Badge` | `variant="success"`, Icon `Check` | „erfüllt" |
| Status „fehlt" | `Badge` | `variant="warning"`, Icon `AlertCircle` | „fehlt" (informativ, kein Fehler) |
| Status „informativ" | `Badge` | `variant="info"` oder `"neutral"`, Icon `Info` | Zähler Claims/Contributions (D-06) |
| Sprungmarke | `Button` | `variant="subtle"` oder `"ghost"`, `size="sm"`, `rightIcon={<ArrowRight/>}` | `onClick` → `router.replace(?tab=…)` (D-04). KEIN nativer `<a>`/`<button>` |
| Preview-Container | `Card` | `variant="flat"` | Read-only Wrapper, `aria-label="Öffentliche Vorschau (read-only)"` |
| Preview-Inhalt | Inline-Render der Section-Komponenten | — | Phase-73-Sektionen ODER Fallback (siehe unten) |
| Fallback-Hinweis | `Badge variant="info"` + Hinweis-Text in `Card` | — | „Vorschau im Übergangsmodus" (siehe Empty/Fallback) |
| Lade-/Fehlerzustand der Zähler | `LoadingState` / `ErrorState` | — | Beim Aggregieren der List-Seams |
| Leere Preview | `EmptyState` | `variant="default"` | Wenn noch keine öffentlichen Inhalte existieren |

### Checklisten-Item-Anatomie (verbindlich)

Horizontale Zeile, Abstand `--space-2` zwischen Innenelementen, Items untereinander
`--space-3`:

```
[Status-Badge]  Label (Body 16px)            [Sprungmarke-Button →]
 success/warning  „Logo vorhanden"            „Im Medien-Tab ergänzen →"
 /info/neutral
```

- **Status-Badge links:** semantische Farbe + lucide-Icon (`Check`/`AlertCircle`/`Info`),
  `aria-label` deutsch ausgeschrieben (z. B. `aria-label="Status: fehlt"`).
- **Label Mitte:** Body 16px/400, `--text-body`. Bei informativen Zählern enthält das
  Label die Zahl: „Offene Claims: 3".
- **Sprungmarke rechts:** `Button variant="subtle" size="sm"`, `rightIcon` Pfeil. Optional
  bei „erfüllten" Items ohne Handlungsbedarf weglassen.
- **D-06-Trennung:** Informative Items (Claims/Contributions) tragen KEIN „erfüllt/fehlt"-
  Urteil, sondern `variant="info"`/`"neutral"` + neutrale Formulierung. Sie erscheinen
  visuell getrennt (eigene Unter-Gruppe „Zur Kenntnisnahme" / „Offene Posten") von den
  bewertbaren Bereitschafts-Kriterien, damit klar ist, dass sie nicht gegen „bereit" zählen.

### Readiness-Kriterienliste (aus v1.2-DISCUSSION Entscheidung 7 / Success Criterion 2)

Bewertbare Bereitschafts-Kriterien (success/warning):
1. Logo vorhanden → Sprungmarke `?tab=media`
2. Banner vorhanden → `?tab=media`
3. Kurzbeschreibung vorhanden → `?tab=basic`
4. Story/Gruppengeschichte vorhanden → `?tab=notes`
5. Mitglieder eingetragen/geprüft → `?tab=mitglieder`
6. Externe Mitwirkende geprüft → `?tab=releases` (bzw. zuständiger Tab)
7. Medien korrekt kategorisiert → `?tab=media` / `?tab=releases`
8. Öffentliche Vorschau verfügbar → entsteht inline (immer „erfüllt", solange Preview rendert)

Informative read-only Posten (info/neutral, D-06 — zählen NICHT gegen „bereit"):
9. Offene Claims: {n} → `?tab=claims`
10. Offene Contributions: {n} → `?tab=vorschlaege`

---

## Copywriting Contract

Deutsch, korrekte Umlaute (C2). Verbindliche Strings:

| Element | Copy |
|---------|------|
| Tab-Label | `Veröffentlichung` |
| Tab-Panel-Titel (SectionHeader) | `Veröffentlichung & Pflegezustand` |
| Tab-Panel-Beschreibung | `So sieht die öffentliche Fansub-Seite für anonyme Besucher aus. Die Checkliste zeigt, was noch zu pflegen ist – sie blockiert nichts und schaltet nichts frei.` |
| Primary CTA (Sprungmarke, Beispiel) | `Im Medien-Tab ergänzen →` (analog je Zieltab: `In der Gruppengeschichte ergänzen →`, `Mitglieder prüfen →`) |
| Bereich-Überschrift bewertbar | `Bereitschaft` |
| Bereich-Überschrift informativ | `Offene Posten (zur Kenntnisnahme)` |
| Status-Badge erfüllt | `erfüllt` |
| Status-Badge fehlt | `fehlt` |
| Hinweis „kein Gate" | `Hinweis: Die öffentliche Seite ist bereits live. Diese Übersicht ist ein Leitfaden, kein Freigabe-Schalter.` |
| Informativ-Zähler Claims | `Offene Claims: {n}` |
| Informativ-Zähler Contributions | `Offene Vorschläge: {n}` |
| Empty state heading (Preview ohne Inhalt) | `Noch keine öffentlichen Inhalte` |
| Empty state body | `Sobald Logo, Beschreibung und Story gepflegt sind, erscheinen sie hier in der Besucher-Vorschau. Nutze die Sprungmarken oben, um zu starten.` |
| Empty state heading (Checkliste komplett) | `Alles gepflegt` |
| Empty state body (Checkliste komplett) | `Alle Bereitschafts-Kriterien sind erfüllt. Offene Posten unten sind rein informativ.` |
| Fallback-Hinweis (Phase 73 noch nicht ausgeführt) | `Vorschau im Übergangsmodus: Bis die neue öffentliche Seite ausgerollt ist, zeigt diese Vorschau die bestehende Darstellung der Fansub-Seite.` |
| Error state (Zähler-Aggregation fehlgeschlagen) | `Pflegezustand konnte nicht vollständig geladen werden. Bitte lade die Seite neu; die Vorschau bleibt verfügbar.` |
| aria-label Preview-Wrapper | `Öffentliche Vorschau (schreibgeschützt)` |
| aria-label Status erfüllt | `Status: erfüllt` |
| aria-label Status fehlt | `Status: fehlt` |
| aria-label Status informativ | `Information` |

**Destructive actions:** KEINE in Phase 77. Der Tab ist read-only (Preview) plus
Navigation (Sprungmarken). Kein Löschen, kein Publish-/Block-Toggle (D-05). Daher
keine destruktive Bestätigung, keine `danger`-Variante.

---

## Zustände & Fallback (verbindlich)

| Zustand | Darstellung |
|---------|-------------|
| Standard (Phase 72+73 ausgeführt) | Preview rendert echte Section-Komponenten mit Besucher-Filter (`visibility='public'`, `review_status='approved'`), Checkliste aus aggregierten Seams |
| **Fallback (Phase 73 noch nicht ausgeführt — aktueller Stand)** | `PublicPreviewPanel` rendert `FansubProfileTabs` + `GroupLeaderTimeline` (bestehend), read-only; oberhalb ein `Badge variant="info"` + Fallback-Hinweis-Text (siehe Copywriting). Visuell klar als Übergangszustand markiert, ohne interne Marker (D-02) |
| Laden | `LoadingState`-Primitive während Seam-Aggregation; Preview kann unabhängig schon stehen |
| Fehler (Zähler) | `ErrorState`-Primitive im Checklisten-Bereich; Preview bleibt sichtbar |
| Leer (keine öffentlichen Inhalte) | `EmptyState` im Preview-Bereich |
| Bereit (alle Kriterien erfüllt) | `EmptyState`/Erfolgs-Hinweis „Alles gepflegt"; informative Posten weiterhin sichtbar |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| Eigen-Design-System `@/components/ui` | Button, Badge, Card, SectionHeader, Tabs, Table, EmptyState, ErrorState, LoadingState, Toolbar | not required (intern, kein externes Registry) |
| Third-party | keine | not applicable |

**Keine** neuen npm-Pakete, **keine** shadcn/Third-party-Registries (RESEARCH:
„Phase 77 installiert keine neuen externen Pakete"). Registry-Vetting-Gate nicht anwendbar.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (deutsch, Umlaute korrekt, alle Strings deklariert)
- [ ] Dimension 2 Visuals: PASS (nur `@/components/ui`-Primitives, keine nativen Elemente)
- [ ] Dimension 3 Color: PASS (60/30/10, Accent reserviert, kein danger missbräuchlich)
- [ ] Dimension 4 Typography: PASS (Inter, 4 Rollen, 2 Gewichte)
- [ ] Dimension 5 Spacing: PASS (nur `--space-*`-Tokens, 44px Touch-Targets)
- [ ] Dimension 6 Registry Safety: PASS (kein externes Registry)

**Approval:** pending

---

## UI-SPEC COMPLETE

**Phase:** 77 — Leader Workspace: Public Preview & Readiness
**Design System:** none (etabliertes Eigen-System `@/components/ui`, kein shadcn)

### Contract Summary
- Spacing: `--space-1..9` (4/8/12/16/24/32/48/64/80); 12px bestehende Ausnahme; Touch-Targets 44/36px
- Typography: 4 Rollen (Body 16/400/1.5, Label 14/700, Section-Title 16/700, Meta 12/700), 2 Gewichte
- Color: Dominant `#f9f9f9`, Secondary `#ffffff`, Accent `#5f84dd` (reserviert: aktiver Tab, subtle-Sprungmarke, Fokus-Ring); danger in Phase 77 ungenutzt (D-05)
- Copywriting: 24 Strings definiert (Tab, Status, Empty/Fallback/Error, aria-labels), deutsch mit Umlauten
- Registry: nur internes `@/components/ui`; keine Third-party

### File Created
`.planning/phases/77-leader-workspace-public-preview-readiness/77-UI-SPEC.md`

### Pre-Populated From
| Source | Decisions Used |
|--------|---------------|
| 77-CONTEXT.md | 8 (D-01..D-08) |
| 77-RESEARCH.md | Stack, Andockpunkte, Fallback-Strategie, Fallstricke, Seams |
| components.json | nein (nicht vorhanden — Eigen-System) |
| Codebase (globals.css, ui.module.css, Primitives) | Tokens, Varianten, Primitive-Inventar |
| CLAUDE.md | 4 Pflicht-Constraints (C1–C4) |
| User input | 0 (alle Fragen durch Upstream/Codebase beantwortet) |

### Ready for Verification
UI-SPEC vollständig. gsd-ui-checker kann validieren.

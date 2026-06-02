---
phase: 70
slug: tiptap-bilder-fuer-member-profilgeschichte
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-02
reviewed_at: 2026-06-02
---

# Phase 70 — UI Design Contract

> Visueller und Interaktions-Vertrag fuer die TipTap-Bild-Erweiterung der member-eigenen Profilgeschichte.
> Erzeugt von gsd-ui-researcher, verifiziert von gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (CSS-Module-Projekt — kein shadcn/Tailwind im Stack) |
| Preset | not applicable |
| Component library | none — colocated CSS Modules (`*.module.css`) + globale CSS-Custom-Properties |
| Icon library | `lucide-react` (bereits im Stack, CLAUDE.md) |
| Font | Projekt-Default (`font-family: inherit`) — keine eigene Font fuer diese Phase |

**shadcn-Gate:** Nicht anwendbar. Das Frontend nutzt durchgaengig colocated CSS Modules und globale CSS-Custom-Properties (`--accent-primary`, `--bg-*`, `--text-*`, `--radius-*`), kein Tailwind/shadcn. Eine shadcn-Initialisierung wuerde das bestehende Editor-Design (`RichTextEditor.module.css`) brechen und ist daher ausgeschlossen. **Registry-Safety: nicht anwendbar.**

**Token-Quelle (bestehend, NICHT neu definieren):** Alle Farben/Radien werden aus den vorhandenen globalen CSS-Variablen abgeleitet, exakt wie in `frontend/src/components/editor/RichTextEditor.module.css` verwendet:
- `--accent-primary` (Akzentfarbe)
- `--bg-card`, `--bg-secondary`, `--bg-primary` (Flaechen)
- `--text-primary`, `--text-secondary`, `--text-muted` (Text)
- `--radius-sm`, `--radius-md` (Radien)

---

## Spacing Scale

Deklarierte Werte (Vielfache von 4; die neuen Bild-Controls richten sich am bestehenden Toolbar-Mass aus):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-/Button-Gaps innerhalb der Node-Toolbar, Segment-Abstand L/M/R |
| sm | 8px | Toolbar-Innenabstand (bestehend `6px 8px`), Abstand Fortschritts-Label zum Balken |
| md | 16px | Standard-Abstand Fehler-/Helper-Texte (bestehend `8px 16px`) |
| lg | 24px | Abstand zwischen Bild-Node und umgebenden Absaetzen |
| xl | 32px | (nicht genutzt in dieser Phase) |
| 2xl | 48px | (nicht genutzt in dieser Phase) |
| 3xl | 64px | (nicht genutzt in dieser Phase) |

Ausnahmen (uebernommen aus bestehender Editor-Toolbar, NICHT angleichen):
- Toolbar-Button-Hoehe: **28px** (bestehend `.toolbarBtn` height) — NICHT auf das 8-Punkt-Raster zwingen.
- Toolbar-Button-min-width: **28px**, Padding `0 5px` (bestehend).
- Toolbar-Item-Gap: **2px** (bestehend `.toolbar` gap) — die neue Bild-Toolbar-Gruppe folgt exakt diesem Gap.
- Toolbar-Separator: 1px breit, 18px hoch, Margin `0 4px` (bestehend `.toolbarSep`).
- Resize-Ziehgriff: quadratisch **12px** an Bild-Eck unten rechts.

---

## Typography

Es werden KEINE neuen Schriftgroessen eingefuehrt. Die Bild-Controls erben Editor-Typografie. Deklarierte Rollen fuer die neuen UI-Elemente:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body / Helper / Fehlertext | 14px (0.85rem, bestehend `.helperText`) | 400 | 1.5 |
| Toolbar-Label / Button-Glyph | 12px (bestehend `.toolbarBtn`) | 400 | 1 |
| Fortschritts-Prozentwert | 12px | 600 (semibold, zur Hervorhebung des Live-Werts) | 1 |

Schriftgewichte gesamt: **2** — regular (400) + semibold (600). Konsistent mit bestehender Toolbar (`.toolbarMenuLabel` nutzt 600).

---

## Color

60/30/10-Aufteilung, abgeleitet aus den bestehenden globalen Variablen (NICHT neu festlegen):

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--bg-card` / `--bg-secondary` (Editor-Flaechen-Gradient, bestehend) | Editor-Content-Hintergrund, Bild-Node-Umgebung |
| Secondary (30%) | `--bg-primary` / `--text-secondary` (gedaempfte Flaechen) | Node-Toolbar-Hintergrund, Fortschritts-Balken-Spur, Helper-Flaechen |
| Accent (10%) | `--accent-primary` | siehe reservierte Liste unten |
| Destructive | nicht eingefuehrt | Es gibt in dieser Phase KEINE destruktive Farbe — Bild-Entfernen ist eine normale Editor-Aktion ohne rote Bestaetigung (siehe Copywriting) |

**Accent (`--accent-primary`) ist ausschliesslich reserviert fuer:**
1. Selektions-Outline-Ring am aktiven Bild-Node (gleiche Sprache wie `.editorShell:focus-within`: 2px Accent-Border + `0 0 0 3px color-mix(in srgb, var(--accent-primary) 12%, transparent)`).
2. Den quadratischen Resize-Ziehgriff unten rechts (akzentfarben gefuellt).
3. Den aktiven Zustand des selektierten Ausrichtungs-Segment-Buttons (L/M/R) — identisch zu `.toolbarBtnActive` (`color-mix accent 18%` Hintergrund, `accent 44%` Border).
4. Hover-Zustand der neuen Bild-Toolbar-Buttons — identisch zu `.toolbarBtn:hover` (`color-mix accent 12%`).
5. Die Fuellung des Upload-Fortschritts-Balkens (Fortschritt = Accent, Spur = Secondary).

Accent ist NICHT zu verwenden fuer: das Toolbar-Bild-Icon im Ruhezustand (erbt `--text-primary 88%` wie bestehende Buttons), Bild-Rahmen im nicht-selektierten Zustand (kein Rahmen), den Speichern-Button-Grundzustand (bestehender Profilformular-Stil).

---

## Copywriting Contract

Alle Strings mit korrekten Umlauten (ä ö ü Ä Ö Ü ß) — CLAUDE.md-Sprachqualitaet, keine ASCII-Ersetzungen.

| Element | Copy |
|---------|------|
| Primary CTA (Bild einfuegen, Toolbar-Icon) | aria-label + `title`: `Bild einfügen` |
| Ausrichtung links (Node-Toolbar) | aria-label + `title`: `Links ausrichten` |
| Ausrichtung Mitte (Node-Toolbar) | aria-label + `title`: `Zentriert ausrichten` |
| Ausrichtung rechts (Node-Toolbar) | aria-label + `title`: `Rechts ausrichten` |
| Resize-Ziehgriff | aria-label: `Bildbreite anpassen` |
| Upload-Fortschritt (pro Bild) | sichtbarer Text: `Bild wird hochgeladen … {n}%` (n = ganzzahliger Prozentwert aus `authorizedUploadXhr`-Progress-Events) |
| Speichern-Button Loading-State | bestehendes Profilformular-Label im Lade-/Disabled-Zustand (z.B. `Speichern …`) — Stil aus dem bestehenden Profil-Save-Button uebernehmen, nicht neu definieren |
| Empty state | KEINER — der Editor zeigt ohne Bild einfach den bestehenden Platzhaltertext; kein eigenes Empty-State-Element fuer das Bild-Feature |
| Fehlende lokale Vorschau (Editor) | KEINE Anzeige — Node wird kommentarlos uebersprungen, kein Platzhalter-Rahmen, kein Text (konsistent mit D-04: Read/Public ueberspringt fehlende Assets serverseitig still) |
| Error state (Upload-Fehler beim Save) | ueber die **bestehende Fehleranzeige des Profilformulars** (kein neues Fehler-UI): `Mindestens ein Bild konnte nicht hochgeladen werden. Die Geschichte wurde nicht gespeichert. Bitte erneut versuchen.` — atomarer Save-Abbruch (Research Pitfall 7), bereits hochgeladene Bilder dieses Versuchs werden serverseitig zurueckgerollt |
| Destruktive Aktion | KEINE — Bild aus dem Editor entfernen ist eine normale, reversible Editor-Operation (vor Save kein Orphan, D-14; physisches Cleanup erst beim Save, D-13). Keine Bestaetigungs-Modal, keine rote Farbe |

---

## Component & Interaction Inventory

> Prescriptive Bauteile fuer Planner/Executor. Alle visuellen Werte erben aus bestehenden Tokens/Klassen.

### 1. Toolbar-Bild-Icon (Einfuegen)
- **Icon:** `lucide-react` `Image` (NICHT der Unicode-Glyph). Erstes lucide-Icon in der sonst Unicode-Glyph-basierten Toolbar.
- **Platzierung:** Eigene Toolbar-Gruppe nach der Tabellen-Gruppe, abgetrennt durch bestehenden `.toolbarSep`.
- **Stil:** Visuell identisch zu `.toolbarBtn` — Icon-Groesse passend zu 12px-Glyph-Mass (lucide `size`/`strokeWidth` so waehlen, dass die optische Groesse den bestehenden Glyphen entspricht), Farbe `currentColor` (erbt `--text-primary 88%`), Hover wie `.toolbarBtn:hover`.
- **Label:** `aria-label="Bild einfügen"` + `title="Bild einfügen"`.
- **Verhalten:** Klick oeffnet nativen Dateiauswahl-Dialog (Akzeptanz: jpg/png/webp, kein gif — D-16); ausgewaehltes Bild wird per `URL.createObjectURL` als lokale Vorschau an der Cursor-Position als Block-Node eingefuegt (D-07, D-09).
- **Opt-in:** Nur sichtbar, wenn die Profilgeschichte-Instanz das Bild-Feature aktiviert (Prop, D-11). In allen anderen `RichTextEditor`-Instanzen NICHT gerendert.

### 2. Selektions-/Aktivzustand am Bild-Node
- Selektiertes Bild erhaelt akzentfarbenen Outline-Ring in derselben Sprache wie `.editorShell:focus-within`:
  - 2px Border `color-mix(in srgb, var(--accent-primary) 42%, var(--text-secondary))`
  - plus Glow `0 0 0 3px color-mix(in srgb, var(--accent-primary) 12%, transparent)`
- Nicht-selektiert: KEIN Rahmen (Bild liegt rahmenlos im Fluss).

### 3. Resize-Affordance (ein Eck-Ziehgriff)
- **Genau EIN** quadratischer Ziehgriff (12px), akzentfarben gefuellt (`--accent-primary`), Eck unten rechts des selektierten Bildes, abgerundet via `--radius-sm`.
- Nur bei selektiertem Bild sichtbar.
- Native HTML5-Drag-Mechanik (`onMouseDown` → `onMouseMove`), KEIN externes DnD-Paket (analog Phase-38-Entscheidung, RESEARCH Pattern 4).
- Aendert proportional die **in % gespeicherte Breite** (`width_percent`, 1–100, relativ zur Textbereichsbreite — D-09).
- `aria-label="Bildbreite anpassen"`.

### 4. Schwebende Node-Toolbar (Ausrichtung L/M/R)
- 3 Segment-Buttons: Links / Mitte / Rechts.
- Erscheint **nur bei selektiertem Bild**, schwebend oben am Bild-Node.
- Jeder Segment-Button optisch wie `.toolbarBtn`; aktiver (gewaehlter) Ausrichtungs-Button wie `.toolbarBtnActive`.
- lucide-Icons fuer L/M/R (`AlignLeft`, `AlignCenter`, `AlignRight`) konsistent zum neuen Bild-Icon-Stil.
- Setzt das Node-Attribut `alignment` (`left` | `center` | `right`, Default `center` — RESEARCH Pattern 4), Block-Level, kein Float (D-10).
- aria-labels/titles: `Links ausrichten`, `Zentriert ausrichten`, `Rechts ausrichten`.

### 5. Upload-Fortschritt pro Bild (Save-Flow)
- Beim Save (deferred Batch-Upload, D-06) zeigt der Speichern-Button den bestehenden Loading-/Disabled-State.
- ZUSAETZLICH pro aktuell hochladendem Bild eine sichtbare Prozent-Fortschrittsanzeige (`Bild wird hochgeladen … {n}%`), gespeist aus `authorizedUploadXhr`-Progress-Events.
- Balkenfuellung = `--accent-primary`, Spur = Secondary-Flaeche (`--bg-primary`/`--text-secondary`-gedaempft). Prozentwert in 12px/600.
- Bei Upload-Fehler: atomarer Save-Abbruch (RESEARCH Pitfall 7) — body_json wird NICHT persistiert, bereits hochgeladene Bilder dieses Versuchs werden serverseitig zurueckgerollt; Fehlertext erscheint in der bestehenden Fehleranzeige des Profilformulars.

### 6. Editor-Verhalten bei nicht ladbarer lokaler Vorschau
- Kommentarlos ueberspringen: der Editor zeigt nichts an, kein Platzhalter-Rahmen, kein Fehlertext (konsistent mit D-04 — Read/Public ueberspringt fehlende Assets serverseitig still).

---

## Accessibility Note

- Phase 70 fuehrt bewusst **keinen** Alt-/Caption-Text ein (D-05, Abweichung von ROADMAP-SC1) — als Contract-Gap markiert. Folge: gerenderte `<img>` haben kein `alt`-Attribut. Dies ist eine dokumentierte, bewusste Reduktion; ein spaeterer Barrierefreiheits-Ausbau ist deferred.
- Alle interaktiven Bild-Controls tragen dennoch `aria-label`/`title` (siehe Copywriting/Inventory), damit Einfuegen, Ausrichten und Resizen per Screenreader benannt sind.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| keine | keine | nicht anwendbar — kein shadcn/Registry im Stack |

Es werden keine Drittanbieter-Registries oder -Blocks verwendet. Das Bild-Icon stammt aus `lucide-react`, das bereits Teil des Produktions-Stacks ist (CLAUDE.md, RESEARCH Standard Stack). Kein neues npm-Paket.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-06-02

---
phase: 82
slug: mitwirkende-projektweit-zuordnen-und-projekt-cockpit
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-11
---

# Phase 82 — UI Design Contract

> Visueller und Interaktionsvertrag für das Projekt-Cockpit im Tab „Anime & Veröffentlichungen".
> Generiert durch gsd-ui-researcher. Wird durch gsd-ui-checker verifiziert.
> Ausführende Agenten MÜSSEN diesen Contract vor der Implementierung lesen.

---

## Design System

| Eigenschaft | Wert |
|-------------|------|
| Tool | none (kein shadcn; eigenes System) |
| Preset | not applicable |
| Component library | @/components/ui (projekt-eigene Primitives) |
| Icon library | lucide-react |
| Font | Inter, "Segoe UI", system-ui, sans-serif (--font-sans) |

**Quelle:** `frontend/src/styles/globals.css` + `frontend/src/components/ui/` — direkt verifiziert.

---

## Primäres Constraint: Globale UI-Primitives (Pflicht)

> Dieses Constraint wird vom UI-Checker als Gate geprüft. Verstöße blockieren die Abnahme.

ALLE user-facing Controls in dieser Phase MÜSSEN aus `@/components/ui` stammen:

| Benötigte Primitive | Verwendung in dieser Phase |
|---------------------|---------------------------|
| `Button` (variant: primary/secondary/ghost/subtle/danger) | Mitwirkende-Button, Einblick hinzufügen, Bearbeiten, Standard-Team übernehmen, Filterchip-Aktion |
| `Badge` (variant: neutral/success/warning/danger/muted) | Status-Badges auf Projektkarte |
| `Select` + `FormField` | Sichtbarkeit- und Status-Felder im Einblick-Formular (Migration Altfall) |
| `Input` | Suchfeld in AnimeContributionModal, Filterfelder |
| `Modal` | AnimeContributionModal (Mitwirkende zuordnen) |
| `EmptyState` | Fehlender Projekt-Einblick; leere Mitwirkenden-Liste |
| `ErrorState` | Ladefehler Einblick, API-Fehler Mitwirkende |
| `SectionHeader` | Abschnittsköpfe im aufgeklappten Projektbereich |
| `Card` | Projektstatus-Kopf im aufgeklappten Bereich |
| `Tabs` | Falls Unterstruktur im aufgeklappten Bereich nötig wird (nur bei Bedarf) |

**VERBOTEN:** Native `<select>`, `<input>`, `<textarea>`, `<button>` für Elemente, die ein Primitiv-Äquivalent haben.

**Altfall-Pflichtmigration:** `AnimeProjectNotesSection.tsx` enthält:
- `<select>` für Sichtbarkeit und Status (Z. 216–240) → MUSS auf `<Select>` + `<FormField>` migriert werden
- native `<button>` in `AnimeProjectNotePreview` (Z. 115, 121) → MUSS auf `<Button>` migriert werden

**RichText:** Projekt-Einblicke rendern via `RichTextRenderer` aus `@/components/editor`. Editor via `RichTextEditor` aus `@/components/editor`. KEINE Eigenimplementierung.

---

## Spacing Scale

Projekt-Token aus `frontend/src/styles/globals.css` (verbindlich):

| Token | Wert | Verwendung in Phase 82 |
|-------|------|------------------------|
| --space-1 | 4px | Icon-Gaps, Badge-Innen-Padding |
| --space-2 | 8px | Abstand zwischen Badges; kompakte Button-Gaps |
| --space-3 | 12px | Zeilenhöhe in Badges, vertikaler Chip-Abstand |
| --space-4 | 16px | Innen-Padding Projektkarte, Formular-Elemente |
| --space-5 | 24px | Abstand zwischen Projektkarte und Inhalt; Section-Padding |
| --space-6 | 32px | Abstand zwischen Projektstatus-Block und Releases-Liste |
| --space-7 | 48px | Nur Layout-Trenner auf Seitenebene (nicht in dieser Phase) |
| --space-8 | 64px | Nicht in dieser Phase verwendet |

**Ausnahmen:**
- Filterchip-Reihe: `gap: 0.45rem` (≈ 7px) — entspricht `.chipRow`-Pattern aus `FansubEdit.module.css` (projektbestehendes Pattern, kein Abweichen)
- Touch-Targets: Alle aktiven Button/Badge-Controls min-height `var(--control-height-sm)` = 36px; primäre Actions min-height `var(--control-height-md)` = 44px

---

## Typography

Projekt-Tokens aus `globals.css` (verbindlich; keine neuen Fonts einführen):

| Rolle | Größe | Weight | Line-Height | CSS-Token |
|-------|-------|--------|-------------|-----------|
| Body / Fließtext (Einblick-Preview) | 16px | 400 | 1.5 | body-Standard |
| Label / Metainfo (Badge-Text, Rollen, Counts) | 13–14px | 400 | 1.4 | `font-size: 0.76–0.875rem` |
| Projekttitel (h3 Anime-Karte) | ~17px (1.08rem) | 600 | 1.2 | `.fansubEditAnimeReleaseHeader h3` — bestehend |
| Sektionskopf / Projektbereich-Label | 15px (0.94rem) | 700 | 1.2 | analog `.fansubEditMembershipTitle` |

**Annahme (kein neuer Font):** Inter aus `--font-sans` ist für alle Roles verbindlich; keine Sonderfonts für Badges oder Statuszeilen.

---

## Color

Tokens aus `frontend/src/styles/globals.css` (verbindlich):

| Rolle | Wert / Token | Verwendung |
|-------|-------------|------------|
| Dominant 60% | `--surface-canvas: #f6f4ef` | Seiten-Hintergrund, Tab-Fläche |
| Secondary 30% | `--surface-card: #ffffff` + `--bg-card: #ffffff` | Projektkarten, Einblick-Block, Modal-Inhalt |
| Accent 10% | `--color-primary: #5f84dd` | Nur: primäre CTAs (Speichern, Einblick hinzufügen), aktiver Filterchip, Fokus-Outline |
| Destructive | `--color-error: #dc3545` + `--button-danger-*` | Nur: Einblick löschen (falls vorhanden) |

**Accent reserviert für:**
1. Primärer `Button` variant=primary (Einblick speichern, Zuweisung bestätigen)
2. Aktiver/ausgewählter Filterchip
3. Fokus-Ring via `--focus-ring`
4. NICHT für Status-Badges, NICHT für Tab-Labels, NICHT für Read-only-Infos

**Badge-Farben (Badge-Primitiv-Varianten):**

| Status | Badge-Variante | Semantik |
|--------|---------------|---------|
| Einblick vorhanden | `success` (--color-success: #28a745) | Positiver Pflegestatus |
| Einblick fehlt | `warning` (--color-warning: #ffc107) | Handlungsbedarf |
| Mitwirkende vorhanden (N > 0) | `neutral` | Informativ |
| Mitwirkende fehlen (N = 0) | `danger` (--color-error: #dc3545) | Kritischer Pflegemangel |
| Folgen-Zahl | `muted` | Reine Metainformation |

**Nicht-berechenbare Status:**
- „N offene Punkte": Badge wird NICHT angezeigt bis Datengrundlage existiert. Kein Fake-Wert, kein Platzhalter-Badge. (D-12)

---

## Komponentenstruktur — Cockpit-Anatomie

### Filterchip-Reihe (oben im releases-Tab, oberhalb der Projektliste)

```
[Alle] [Mitwirkende fehlen] [Einblick fehlt]   ← aktiver Chip: accent-Hintergrund
```

- Chips sind `<Button variant="ghost" size="sm">` mit aktivem Zustand via CSS-Klasse
- Chip „Offene Punkte" wird NICHT gerendert, bis Datengrundlage vorhanden (D-12)
- Layout: `.chipRow` aus `FansubEdit.module.css`

### Projektkarte (`.fansubEditAnimeReleaseCard`)

**Zusammengeklappt — `.fansubEditAnimeReleaseHeaderRow`:**

```
[Cover-Bild]  [Anime-Titel]  [Badge: N Folgen]  [Badge: Mitwirkende N]  [Badge: Einblick fehlt/vorhanden]
                                                  [Button: Mitwirkende]  [Button: Einblick / Einblick bearbeiten]
```

- Bestehender Klapptrigger (`<button>` im `fansubEditAnimeReleaseHeader`) bleibt unverändert
- Badges werden additiv nach dem Titel-Element eingefügt
- Bestehender `Button` „Mitwirkende" bleibt; neuer `Button` „Einblick" / „Einblick bearbeiten" wird daneben ergänzt
- Button-Varianten: Mitwirkende = `secondary size="sm"`, Einblick/Einblick bearbeiten = `ghost size="sm"`

**Aufgeklappt — Reihenfolge der Abschnitte:**

1. **Projektstatus-Kopf** (`Card` oder einfacher `div` mit `--surface-card-muted` Hintergrund)
   - `<SectionHeader>` mit Label „Projektstatus"
   - Zeile: Badge Mitwirkende + Badge Einblick (kompakt, lesbar)
2. **Abschnitt „Projekt-Einblick"** (inline, kein eigener Tab)
   - Wenn Einblick vorhanden: `RichTextRenderer` + `Button ghost "Bearbeiten"`
   - Wenn kein Einblick: `EmptyState` variant=compact, title="Projekt-Einblick fehlt", action=`<Button primary size="sm">Einblick hinzufügen</Button>`
   - Bearbeiten öffnet Editor (`RichTextEditor`) inline oder in Modal — Entscheidung Executor per Komplexitätsabwägung, aber KEIN nativer `<textarea>`
3. **Bestehende Releases-/Episodenliste** (unverändert, darunter)

### Mitwirkenden-Zuordnung (AnimeContributionModal — bestehend, erweitert)

- Weiterhin als `Modal` aus `@/components/ui`
- Nach members.id-Migration: Personenliste zeigt App- UND historische Member, vereinheitlicht via `member_id`
- Inline-Rollenzuweisung: `Select` aus `@/components/ui` für Rollenwahl (mehrere Rollen pro Person — D-05)
- Rolle-Vorausfüllung: operative Rollen aus Gruppenrollen (D-09, ohne Leadership-Rollen)

### Abdeckungs-Matrix (Projekt × Rolle)

- `Table` aus `@/components/ui`
- Kopfzeile: Projekttitel + konfigurierbare Rollen-Spalten (D-06)
- Zellen: Name der zugeordneten Person oder „—" (leer); Klick öffnet Inline-Zuweisung (Modal oder Popover)
- „Standard-Team übernehmen": `Button variant="secondary"` in der Tabellenzeile oder als Bulk-Action oberhalb
- Tabellen-Kontext: Nur innerhalb des aufgeklappten Projektbereichs ODER als eigenständige Ansicht unterhalb der Filterliste — Executor entscheidet nach Platzverhältnissen

---

## Copywriting Contract

| Element | Text |
|---------|------|
| Primäre CTA (Einblick anlegen) | „Einblick hinzufügen" |
| Primäre CTA (Einblick speichern) | „Speichern" |
| Sekundäre CTA (Einblick öffnen zum Bearbeiten) | „Einblick bearbeiten" |
| CTA Mitwirkende öffnen | „Mitwirkende" (bestehend, unveränderter Text) |
| CTA Standard-Team | „Standard-Team übernehmen" |
| Empty State — Kein Einblick | Titel: „Projekt-Einblick fehlt" / Beschreibung: „Noch kein Einblick für dieses Projekt vorhanden." / Action: „Einblick hinzufügen" |
| Empty State — Keine Mitwirkenden | Titel: „Keine Mitwirkenden zugeordnet" / Beschreibung: „Diesem Projekt sind noch keine Mitwirkenden zugewiesen." |
| Empty State — Keine Projekte (gefiltert) | Titel: „Keine Projekte gefunden" / Beschreibung: „Für den gewählten Filter gibt es keine Treffer." |
| Fehler Einblick laden | „Einblick konnte nicht geladen werden. Seite neu laden oder später erneut versuchen." |
| Fehler Mitwirkende laden | „Mitwirkende konnten nicht geladen werden." |
| Badge: Folgen-Zahl | „{N} Folgen" (z.B. „220 Folgen") |
| Badge: Mitwirkende vorhanden | „Mitwirkende ({N})" (z.B. „Mitwirkende (6)") |
| Badge: Keine Mitwirkenden | „Mitwirkende fehlen" |
| Badge: Einblick vorhanden | „Einblick vorhanden" |
| Badge: Einblick fehlt | „Einblick fehlt" |
| Filterchip: Alle | „Alle" |
| Filterchip: Ohne Mitwirkende | „Mitwirkende fehlen" |
| Filterchip: Ohne Einblick | „Einblick fehlt" |
| Destruktiv: Einblick löschen | Bestätigung: „Einblick löschen? Diese Aktion kann nicht rückgängig gemacht werden." / Buttons: „Abbrechen" + „Löschen" (variant=danger) |
| Abschnitt Projektstatus-Kopf Label | „Projektstatus" |
| Abschnitt Einblick Label | „Projekt-Einblick" |

**Sprachqualität:** Alle user-facing Strings verwenden korrekte deutsche Umlaute (ä, ö, ü, ß). ASCII-Ersetzungen (ae/oe/ue/ss) sind verboten. (CLAUDE.md-Pflicht)

---

## Interaktionskontrakte

### Tab-Routing / Legacy-Redirect

- `parseMainTab("anime-projekte")` → MUSS `"releases"` zurückgeben (Redirect, kein 404)
- `"anime-projekte"` wird aus `MAIN_TABS`-Array und `SectionKey`-Union entfernt
- Bestehender `?tab=releases`-Anchor bleibt der einzige Einstiegspunkt für das Cockpit

### Lazy Load vs. Eager Badge

- Badges „Einblick vorhanden/fehlt" werden LAZY geladen: sichtbar erst nach Aufklappen der Projektkarte (D-12-konform; kein N+1 im Tab-Render)
- Wenn Backend später `has_project_note: bool` in der Anime-Liste liefert: Badges können auf eager umgestellt werden — das ist eine optionale Optimierung, kein Pflicht-Feature dieser Phase
- Badges „Mitwirkende fehlen" (N = 0) sind eager berechenbar aus `contributions.length === 0`, sobald Mitwirkende geladen wurden

### Zustandsmaschine Einblick-Block

```
NICHT_GELADEN
  → onExpand → LADEN
LADEN
  → Erfolg, note != null → VORHANDEN
  → Erfolg, note == null → FEHLT
  → Fehler              → FEHLER
VORHANDEN
  → „Bearbeiten" → BEARBEITEN
BEARBEITEN
  → Speichern (Erfolg) → VORHANDEN
  → Abbrechen          → VORHANDEN
FEHLT
  → „Einblick hinzufügen" → BEARBEITEN
FEHLER
  → Retry → LADEN
```

### Mitwirkenden-Zuweisung

- Öffnen: bestehender `openAnimeContributions`-Flow in `page.tsx`
- Nach member_id-Migration: `listGroupMembers`-Aufruf liefert vereinheitlichte Liste (App + hist)
- Mehrere Rollen pro Person: Checkboxen oder Multi-Select im Modal (D-05)
- Standard-Team: Button löst Backend-Call aus, füllt leere Projekte mit Stamm-Crew (D-04)

---

## Komponenten-Inventory (Neue und zu migrierende Dateien)

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `page.tsx` | Modifizieren | MAIN_TABS: `anime-projekte` entfernen; parseMainTab erweitern; Badges + Einblick-Block in Projektkarte integrieren |
| `AnimeProjectNotesSection.tsx` | Migrieren + Refactoring | native `<select>` → `<Select>` + `<FormField>`; native `<button>` → `<Button>`; Workspace-Komponente extrahieren |
| `AnimeContributionModal.tsx` | Modifizieren | member_id statt fansub_group_member_id; vereinheitlichte Personenliste |
| `ProjectCockpitBadges.tsx` | Neu (< 450 Zeilen) | Status-Badge-Reihe für Projektkarte; hält Badge-Render-Logik aus page.tsx heraus |
| `AnimeProjectNoteWorkspace.tsx` | Neu (< 450 Zeilen) | Inline-Einblick-Bereich (Zustandsmaschine VORHANDEN / FEHLT / BEARBEITEN); nutzt RichTextRenderer + RichTextEditor |

**Splitting-Pflicht:** Alle neuen und modifizierten Dateien bleiben ≤ 450 Zeilen (CLAUDE.md).

---

## Registry Safety

| Registry | Verwendete Blöcke | Safety Gate |
|----------|-------------------|-------------|
| shadcn official | nicht verwendet (eigenes System) | not applicable |
| Drittanbieter | keine | not applicable |

Keine Registry-Vetting-Prüfung erforderlich.

---

## Annahmen (autonomer Lauf — keine Rückfragen)

| # | Annahme | Risiko bei Falschheit | Empfehlung |
|---|---------|----------------------|-----------|
| A1 | `AdminFansubAnimeEntry` hat kein `episode_count`-Feld | Badge „N Folgen" muss aus `releases.length` abgeleitet werden | Executor prüft `frontend/src/types/admin.ts` vor Implementierung |
| A2 | Keine weiteren Verweise auf `"anime-projekte"` außer `page.tsx` | Legacy-Links 404 | Research bestätigt: Grep zeigt nur page.tsx (RESEARCH.md) |
| A3 | Einblick-Bearbeitung läuft inline (kein separates Modal nötig) | Kann Modal werden wenn Platzverhältnisse schlecht | Executor entscheidet nach Live-Beurteilung; beide Ansätze sind primitiv-konform |
| A4 | Standard-Team-Funktion braucht neue Tabelle `fansub_group_default_crew` | Tabelle fehlt → Feature nicht implementierbar | Migrations-Plan in RESEARCH.md; Executor legt Migration an |
| A5 | Filterchip „Offene Punkte" wird in dieser Phase nicht angezeigt | — | D-12 bestätigt: kein Fake-Status; UI-Struktur vorbereitet aber inaktiv |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

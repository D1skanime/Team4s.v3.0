---
phase: 67
slug: release-episode-credits
status: draft
shadcn_initialized: false
preset: none
created: 2026-06-02
---

# Phase 67 — UI Design Contract

> Visueller und Interaktions-Vertrag für die drei Frontend-Flächen dieser Phase.
> Generiert von gsd-ui-researcher (AUTONOMOUS — keine Rückfragen; offene Punkte aus
> bestehenden Mustern und 67-CONTEXT.md `<specifics>` abgeleitet und als
> *inferred* markiert). Verifiziert von gsd-ui-checker.

Diese Phase **erweitert** drei bestehende Flächen — sie erfindet keine neuen Tokens:

1. **Anime-Detailseite** — `AnimeContributionsSection` / `GroupContributionBlock` um eine
   aufklappbare Versions-Detailebene erweitern (Progressive Disclosure wie Phase 64).
2. **Leader-Frontend** (`frontend/src/app/manage/groups/`) — optionales, gruppen-gefiltertes
   Release-Version-Dropdown im Contribution-Anlegen/Bearbeiten-Formular.
3. **Member-Vorschlagsformular** (`frontend/src/app/me/contributions/`) — dasselbe optionale Dropdown.

**Brownfield-Regel:** Tokens, Komponenten-Patterns und Strings folgen dem bereits etablierten
Design-System. Quellen: `frontend/src/styles/globals.css` (Custom Properties),
`frontend/src/components/ui/ui.module.css` (Form-Controls), `GroupContributionBlock.module.css`,
`AnimeContributionsSection.module.css`.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (CSS Modules + CSS Custom Properties — kein shadcn/Tailwind im Projekt) |
| Preset | not applicable |
| Component library | none (eigene Primitives unter `frontend/src/components/ui/`) |
| Icon library | `lucide-react` (CLAUDE.md). Versions-Disclosure nutzt textuellen Chevron `▾`/`▸` wie Mockup, KEIN neues Icon. |
| Font | `--font-sans` = Inter, "Segoe UI", system-ui, sans-serif |

**shadcn-Gate-Ergebnis:** Übersprungen. `components.json` nicht vorhanden, Projekt nutzt
durchgängig CSS Modules. AUTONOMOUS-Modus → keine Initialisierungs-Rückfrage. Registry-Safety
nicht zutreffend.

**Bestehende Primitives, die wiederzuverwenden sind (nicht nachbauen):**

| Primitive | Datei | Verwendung in Phase 67 |
|-----------|-------|------------------------|
| `Select` | `components/ui/Select.tsx` | Release-Version-Dropdown (beide Formulare) |
| `FormField` | `components/ui/FormField.tsx` | Label + Hint + Error-Wrapper um das Dropdown |
| `GroupContributionBlock` | `components/anime/GroupContributionBlock.tsx` | Host für die neue Versions-Detailebene |
| `roleChip` / `toggleButton` (CSS) | `GroupContributionBlock.module.css` | Rollen-Chips und Aufklapp-Trigger der Ebene 2 |

---

## Spacing Scale

Quelle: `globals.css` `--space-*`. Alle Werte sind Vielfache von 4. **Keine neuen Spacing-Werte
einführen** — diese Skala ist verbindlich.

| Token | Value | Usage in Phase 67 |
|-------|-------|-------------------|
| xs | 4px (`--space-1`) | Gap zwischen Rollen-Chips |
| sm | 8px (`--space-2`) | Gap Contributor-Liste, Chip-Innenabstand |
| md | 16px (`--space-4`) | Block-Padding (`GroupContributionBlock` = `1rem`) |
| lg | 24px (`--space-5`) | Abstand Ebene-1 → Ebene-2 (inferred) |
| xl | 32px (`--space-6`) | Section-Margin oben (`AnimeContributionsSection`) |
| 2xl | 48px (`--space-7`) | nicht in dieser Phase |
| 3xl | 64px (`--space-8`) | nicht in dieser Phase |

**Versions-Ebene-spezifisch (inferred aus Mockup):**
- Einrückung der versions-spezifischen Beiträge unter dem Episode·Version-Kopf: **16px** linker Innenabstand.
- Vertikaler Abstand zwischen Episode·Version-Gruppen: **8px** (`--space-2`).
- Abstand zwischen "Allgemein"-Block und "▾ Nach Release-Version"-Trigger: **12px** (`--space-3`).

Exceptions: keine. CSS-Module verwenden teils `rem` (0.5rem = 8px, 0.75rem = 12px, 1rem = 16px) —
das mappt 1:1 auf die 4er-Skala und bleibt zulässig (bestehende Konvention).

---

## Typography

Quelle: bestehende Contributions-CSS-Module + `ui.module.css`. **Drei Größen, zwei Gewichte** —
nicht erweitern.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Section-Heading ("Mitwirkende Gruppen") | 1.1rem (~18px) | 600 | 1.2 (inferred) |
| Gruppenname / Episode·Version-Kopf | 0.95rem (~15px) | 600 | 1.3 (inferred) |
| Body (Member-Name, Dropdown-Optionen) | 0.875rem (14px) | 400 | 1.5 (inferred) |
| Meta / Label (`(historisch)`, `Aktiv: …`, Rollen-Chip) | 0.7–0.8rem (~11–13px) | 400 | 1.45 |

**Form-Label** (Dropdown): `fieldLabel` = 13px / 700 (bestehende `FormField`-Konvention —
hier ist 700 etabliert und bleibt unverändert).

Gewichte gesamt: **400 (regular)** für Fließtext/Meta, **600 (semibold)** für Überschriften und
Namen, **700** ausschließlich für Form-Labels (Altbestand `FormField`). Keine weiteren Gewichte.

---

## Color

Das Projekt hat **zwei** koexistierende Token-Sätze: die Anime-Seiten-Komponenten nutzen
`--color-*`-Fallbacks für ein dunkles Surface, die Form-Primitives das helle `globals.css`-Theme.
Phase 67 erweitert beide Flächen jeweils **im Theme ihres Hosts** — kein neues Theme einführen.

### Anime-Detailseite (dunkle Contributions-Fläche — Quelle: `GroupContributionBlock.module.css`)

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `var(--color-surface, rgba(255,255,255,0.04))` | Block-Hintergrund |
| Secondary (30%) | `var(--color-border, rgba(255,255,255,0.1))` | Block-Rahmen, Section-Trennlinie |
| Accent (10%) | `var(--color-accent, #7c8cf8)` | Rollen-Chips, Aufklapp-Trigger ("▾ Nach Release-Version"), "Alle anzeigen" |
| Destructive | nicht in dieser Phase (Anzeige-Fläche ohne destruktive Aktionen) | — |
| Text primär | `var(--color-text-primary, #e0e0e0)` | Member-Name, Gruppenname, Episode·Version-Kopf |
| Text sekundär | `var(--color-text-secondary, #999)` | `(historisch)`, `Aktiv:`-Range, "N weitere nicht öffentlich" |

**Accent reserviert für:** Rollen-Chips (`roleChip`), den Versions-Aufklapp-Trigger und die
"Alle/Weniger anzeigen"-Buttons. **Nicht** für Member-Namen, Episode-Köpfe oder Fließtext.

### Formulare (helles Theme — Quelle: `globals.css` + `ui.module.css`)

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surface-canvas` / `--bg-card` (#fff) | Formular-Flächen |
| Secondary (30%) | `--color-border` (#e1e1e6) | Feld-Rahmen, Trennlinien |
| Accent (10%) | `--color-primary` (#5f84dd) | Fokus-Ring des Dropdowns, primärer Submit-Button |
| Destructive | `--color-error` (#dc3545) / `fieldError` (#8b2742) | Validierungsfehler D-03 (siehe Copywriting) |

**Accent reserviert für:** Fokus-State des Release-Version-`Select` und den primären
Speichern-/Vorschlagen-Button. Das optionale Dropdown selbst ist **kein** Accent-Element im
Ruhezustand (neutraler Feld-Rahmen `rgba(47,55,70,0.18)` aus `selectControl`).

---

## Copywriting Contract

Alle Strings Deutsch mit **korrekten Umlauten** (CLAUDE.md, D-11). Quelle der bestätigten Strings:
bestehende Komponenten + 67-CONTEXT.md `<specifics>`. *inferred* = von dieser Phase festgelegt.

| Element | Copy |
|---------|------|
| Section-Heading (Anime-Seite) | `Mitwirkende Gruppen` (bestehend, unverändert) |
| Ebene-1-Label pro Gruppe | `Allgemein an der Serie beteiligt:` (aus CONTEXT-Mockup) |
| Versions-Aufklapp-Trigger (geschlossen) | `▸ Nach Release-Version` (inferred — Chevron + Label aus Mockup) |
| Versions-Aufklapp-Trigger (offen) | `▾ Nach Release-Version` (inferred) |
| Episode·Version-Kopf | `Episode {episode_number} · {version}`, z. B. `Episode 1 · v1` (aus Mockup) |
| Batch-Kennzeichnung | `Episode 1 · v2 (Batch)` — Suffix `(Batch)` nur wenn Variant-Typ Batch (inferred, optional) |
| Dropdown-Feld-Label | `Release-Version (optional)` (aus Mockup) |
| Dropdown-Leeroption (Default) | `— anime-weit lassen —` (aus Mockup) |
| Dropdown-Option-Format | `Episode {episode_number} · {version}` (gefiltert auf Versionen der Gruppe) |
| Dropdown-Hint (`FormField` hint) | `Leer lassen = die Gruppe war allgemein an der Serie beteiligt.` (inferred) |
| Primary CTA Leader-Form | `Beitrag speichern` (inferred — verb + noun, an bestehendes Leader-CRUD anlehnen) |
| Primary CTA Member-Form | `Beitrag vorschlagen` (inferred — konsistent mit Phase-65-Vorschlags-Sprache) |
| Empty state heading (Versions-Ebene) | keine — Ebene-2-Trigger erscheint **nur**, wenn versions-spezifische Beiträge existieren (D-05). Kein Leerzustand. |
| Empty state (gesamter Bereich, bestehend) | `Noch keine Mitwirkenden eingetragen.` (unverändert) |
| Error state (Dropdown-Daten laden fehlgeschlagen) | `Release-Versionen konnten nicht geladen werden. Bitte später erneut versuchen.` (inferred) |
| Error state (D-03 Validierung, 422) | `Diese Gruppe war an der gewählten Release-Version nicht beteiligt. Bitte eine andere Version wählen oder anime-weit lassen.` (inferred — deckt Pitfall 5 in beiden Formularen ab) |
| Destructive confirmation | keine destruktive Aktion in dieser Phase. Das **Entfernen** der Versions-Zuordnung (D-10) erfolgt durch Zurücksetzen des Dropdowns auf `— anime-weit lassen —` und Speichern — keine Lösch-Bestätigung nötig. |

---

## Interaction Contract

Verbindlich für den Executor (über das reine Token-Set hinaus).

### Anime-Seite — Versions-Detailebene (D-05, D-06, D-07, P67-SC2)

- **Reihenfolge pro Gruppe:** zuerst Block "Allgemein an der Serie beteiligt:" (Ebene 1,
  `release_version_id IS NULL`), darunter — falls vorhanden — der aufklappbare Block
  "Nach Release-Version" (Ebene 2). Klar getrennt (D-06).
- **Sortierung Ebene 2:** Episode-Nr → Version (D-07). Innerhalb einer Version: Contributor-Reihenfolge
  wie von der API geliefert.
- **Progressive Disclosure:** Ebene-2-Block ist standardmäßig **geschlossen**, reiner Client-State
  (analog `expandedGroupId` in `AnimeContributionsSection.tsx`). Empfehlung: separater
  Toggle-State pro Gruppe für die Versions-Ebene, unabhängig vom bestehenden "Alle anzeigen".
- **Trigger:** `<button type="button">` mit `toggleButton`-Styling, Chevron-Präfix (`▸`/`▾`),
  `aria-expanded` gesetzt, `aria-controls` auf die Versions-Liste.
- **Nicht-öffentliche Contributors:** Ebene-2-Query führt dieselben Public-Filter wie Ebene 1
  (Research Security-Domain). Aggregat-Zeile "N weitere nicht öffentlich" gilt weiterhin gruppenweit,
  nicht pro Version (Pitfall 2 — keine Doppelzählung).
- **Rollen-Chips:** identisches `roleChip`-Styling auf beiden Ebenen.
- **`(historisch)`-Label:** auch in Ebene 2 für unverifizierte Member, gleiche Darstellung.

### Formulare — gruppen-gefiltertes Dropdown (D-08, D-09, D-10)

- **Abhängigkeit:** Das Release-Version-`Select` ist von der gewählten Gruppe abhängig. Optionen
  werden **serverseitig** gefiltert (`release_version_groups`-Join, Research Pattern 3) — kein
  Client-seitiges Filtern.
- **Default-Wert:** Leeroption `— anime-weit lassen —` ist vorausgewählt. Leerer Wert = `release_version_id NULL`.
- **Disabled-State:** Solange keine Gruppe gewählt ist (Leader-Form), bleibt das Dropdown disabled
  (`control:disabled`-Styling). Im Member-Form ist die Gruppe durch die Mitgliedschaft vorgegeben.
- **Nachträgliche Bearbeitung (D-10):** Beim Bearbeiten eines bestehenden Beitrags zeigt das
  Dropdown den aktuellen Wert; Zurücksetzen auf die Leeroption entfernt die Zuordnung beim Speichern.
- **Validierungsfehler (D-03):** 422 vom Backend → Fehler unter dem Feld via `FormField` `error`-Prop
  (`fieldError`-Styling, rot). Kein Toast erforderlich, aber konsistent mit bestehendem Fehler-Handling.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none (kein shadcn/Registry im Projekt) | keine | not applicable |

Keine Drittanbieter-Registry deklariert. Alle UI-Bausteine stammen aus dem projekteigenen
`components/ui/`-Satz und bestehenden Anime-/Contributions-Komponenten. Vetting-Gate entfällt.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

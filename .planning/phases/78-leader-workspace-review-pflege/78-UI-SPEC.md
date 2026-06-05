---
phase: 78
slug: leader-workspace-review-pflege
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-05
reviewed_at: 2026-06-05
---

# Phase 78 — UI Design Contract

> Visueller und Interaktionsvertrag für Phase 78: Leader Workspace – Review & Pflege.
> Generiert von gsd-ui-researcher, verifiziert von gsd-ui-checker.
>
> **Scope:** Erweiterung bestehender Domänen-Tabs in `/admin/fansubs/[id]/edit`.
> Kein neuer Tab, keine zweite Queue, kein generischer Posteingang (D-01, Lock H).

---

## Design System

| Eigenschaft | Wert |
|-------------|------|
| Tool | none (manuelles CSS-Token-System) |
| Preset | nicht zutreffend |
| Komponentenbibliothek | `@/components/ui` (custom, keine shadcn/Radix-Basis) |
| Icon-Bibliothek | `lucide-react` |
| Schriftart | Inter, "Segoe UI", system-ui, sans-serif (via `--font-sans`) |

**Quellen:** `frontend/src/styles/globals.css`, `frontend/src/components/ui/`

---

## Pflicht-Constraint: Globales Design-System

**ZWINGEND für alle neuen und geänderten Komponenten in Phase 78:**

Jede user-facing UI MUSS die globalen Primitives aus `@/components/ui` verwenden.
Native `<select>`, `<input>`, `<textarea>`, `<button>` sind für Primitivtypen, die
`@/components/ui` bereits abdeckt, **verboten**.

Verfügbare Primitives (vollständiges Inventar):

| Primitiv | Datei | Varianten |
|----------|-------|-----------|
| `Button` | `Button.tsx` | primary, secondary, ghost, subtle, danger, success; sm/md/lg |
| `Select` | `Select.tsx` | — (`invalid`, `disabled`) |
| `Textarea` | `Textarea.tsx` | — (`invalid`, `disabled`) |
| `Input` | `Input.tsx` | — |
| `Badge` | `Badge.tsx` | neutral, success, warning, danger, info, muted |
| `Card` | `Card.tsx` | section, nested (Varianten) |
| `Table` / `TableHead` / `TableBody` / `TableRow` / `TableCell` / `TableHeaderCell` | `Table.tsx` | withActions |
| `Modal` | `Modal.tsx` | — |
| `Drawer` | `Drawer.tsx` | — |
| `FormField` | `FormField.tsx` | — |
| `EmptyState` | `EmptyState.tsx` | default, withAction, compact |
| `SectionHeader` | `SectionHeader.tsx` | eyebrow, title, description |
| `Toolbar` | `Toolbar.tsx` | leading/trailing slots |
| `Tabs` | `Tabs.tsx` | — |
| `ActionBar` | `ActionBar.tsx` | — |
| `LoadingState` | `LoadingState.tsx` | — |
| `ErrorState` | `ErrorState.tsx` | — |
| `PageHeader` | `PageHeader.tsx` | — |
| `Pagination` | `Pagination.tsx` | — |

**Bekannte UI-Schuld — Pflicht-Migration in Phase 78:**
`frontend/src/components/contributions/ReviewQueue.tsx` verwendet native `<button>`,
`<textarea>` und Inline-Styles anstelle von `@/components/ui`-Primitives. Diese Datei
**muss** im Rahmen der Phase-78-Umbauten vollständig auf globale Primitives migriert
werden. Migration bedeutet: alle `<button>` → `Button`, alle `<textarea>` → `Textarea`,
alle Inline-Style-Blöcke → CSS-Modul-Klassen mit Design-Token-Variablen.

---

## Spacing Scale

Tokens aus `frontend/src/styles/globals.css` (Quelle: `--space-*`):

| Token | Wert | CSS-Variable | Verwendung |
|-------|------|-------------|------------|
| xs | 4px | `--space-1` | Icon-Abstände, Inline-Padding, Chip-Gaps |
| sm | 8px | `--space-2` | Kompakte Element-Abstände, Button-Gaps in Toolbar |
| — | 12px | `--space-3` | Filter-Toggle-Pill vertikales Padding, `.rejectExpansion`-Innenabstand |
| md | 16px | `--space-4` | Standard-Element-Abstände, Card-Padding |
| lg | 24px | `--space-5` | Abschnitt-Padding, Stack-Gaps zwischen Sektionen |
| xl | 32px | `--space-6` | Layout-Gaps zwischen Tab-Bereichen |
| 2xl | 48px | `--space-7` | Größere Abschnitts-Breaks |
| 3xl | 64px | `--space-8` | Seiten-Ebene (nicht in Review-Panels) |

Ausnahmen:
- Touch-Targets für Bestätigen/Ablehnen-Buttons: `min-height: var(--control-height-md)` = 44px (entspricht WCAG 2.5.5)
- Filter-Toggle-Pill: 12px vertikales Padding (`--space-3`)
- Nested-Card-Padding: `var(--space-4)` (16px)

---

## Typography

Tokens aus `frontend/src/styles/globals.css`:

| Rolle | Größe | Gewicht | Zeilenhöhe | CSS-Klasse / Token |
|-------|-------|---------|------------|---------------------|
| Body | 16px | 400 | 1.5 | `--text-body`, `font-size: 16px` |
| Label / Hilfstexte | 14px | 400 | 1.4 | `font-size: 0.875rem` |
| Aktions-Labels / Badge-Texte | 12px | 700 | 1.2 | `font-size: 12px; font-weight: 700` |
| Abschnitts-Überschriften | 16px | 700 | 1.2 | `SectionHeader`-Titel-Slot |

Gewichtspalette: **400** (Regular) + **700** (Bold) — ausschließlich diese zwei Gewichte.

Schriftart: `Inter, "Segoe UI", system-ui, sans-serif` via `--font-sans`.

---

## Color

Tokens aus `frontend/src/styles/globals.css`:

| Rolle | Wert / Variable | Verwendung |
|-------|-----------------|------------|
| Dominant (60 %) | `--surface-canvas: #f6f4ef` | Seiten-Hintergrund, Tab-Hintergrund |
| Sekundär (30 %) | `--surface-card: #ffffff` + `--surface-card-muted: #fbfaf8` | Cards, Panels, Nested-Cards |
| Akzent (10 %) | `--color-primary: #5f84dd` | Bestätigen-Buttons (primary), aktiver Filter-Toggle, Link-Elemente |
| Destruktiv | `--button-danger-mid: #580c22` (Dunkelweinrot) | Ablehnen-Buttons (`variant="danger"`), Einladung-zurückziehen |
| Erfolg | `--button-success-mid: #51c99d` | Bestätigen-Aktionen (`variant="success"`) |
| Fehlerhintergrund | `color-mix(in srgb, var(--color-error) 12%, transparent)` | Inline-Fehlermeldungen (analog `.inlineError` in `ClaimManagementPanel.module.css`) |
| Tabellen-Kopfzeile-Akzent | `#82122c` (Weinrot) | `border-bottom: 3px solid #82122c` auf `<thead th>` — analog `.tableWrapHeaderLineWine` |

**Akzent reserviert für (exklusive Liste):**
1. Primär-Aktions-Buttons (Bestätigen, Vorschlag annehmen)
2. Aktiver Filter-Toggle-Zustand
3. Link-Texte und CTA-Links
4. Focus-Ring (`--focus-ring: 0 0 0 3px rgba(255, 106, 61, 0.18)`)

**Destruktiv reserviert für (exklusive Liste):**
1. Claim ablehnen (`Button variant="danger"`)
2. Vorschlag ablehnen (`Button variant="danger"`)
3. Einladung zurückziehen (`Button variant="danger"`)
4. Medien-Status „abgelehnt" / „entfernt" setzen

---

## Komponenteninventar Phase 78

### Neue Komponenten (Pflicht: je eigene Datei ≤ 450 Zeilen + colocated `.module.css`)

| Datei | Tab-Host | Verantwortung |
|-------|----------|---------------|
| `ContributionsReviewSection.tsx` | `vorschlaege`-Tab | Contribution-Proposal-Review mit globalen Primitives; ersetzt/wrapet `ReviewQueue`; „Offen zuerst"-Filter (D-07) |
| `ContributionsReviewSection.module.css` | — | Colocated Styles |
| `GroupMediaReviewSection.tsx` | `media`-Tab | Sichtbarkeit/Reviewstatus-Selektoren für `fansub_group_media` (D-05/D-06) |
| `GroupMediaReviewSection.module.css` | — | Colocated Styles |

### Zu erweiternde Komponenten (bestehend)

| Datei | Erweiterung |
|-------|-------------|
| `ClaimManagementPanel.tsx` | „Nur Offene"-Filter-Toggle (D-07) als `useState<boolean>` |
| `ReviewQueue.tsx` | Vollständige Migration auf `@/components/ui`-Primitives (UI-Schuld-Behebung) |
| `ReleaseVersionMediaDrawerSummary.tsx` | Kein Umbau in Phase 78; Medienprüfung im Release-Drawer via neue `ReleaseVersionMediaReviewSection`-Komponente (separater Slot im Drawer) |

### Nicht anfassen

| Datei | Grund |
|-------|-------|
| `AnimeContributionModal.tsx` | Leader-Edit-Modal, kein Review-Modal; kein Umbau in Phase 78 (D-02) |
| `GroupMembersTab.tsx` | Strikt getrennt von Mitwirkenden (Lock H, D-02) |
| `MemberRolesTab.tsx` | Strikt getrennt von Mitwirkenden (Lock H, D-02) |
| `page.tsx` | Keine neue Logik direkt; nur Import + Tab-Bedingung ergänzen |

---

## Interaction Patterns

### Pattern 1: „Offen zuerst"-Filter-Toggle (D-07)

Anwendung in: `ClaimManagementPanel` (Erweiterung) und `ContributionsReviewSection` (neu).

**Visuell:**
- `Button variant="ghost" size="sm"` mit aktivem Zustand als `variant="subtle"` (kein eigenes Toggle-Primitiv — State via `useState<boolean>` + bedingter Variant)
- Label-Text: **„Nur offene anzeigen"** (aktiv) / **„Alle anzeigen"** (inaktiv)
- Platzierung: Rechts in der `Toolbar`-`trailing`-Slot der jeweiligen Sektion
- Standardzustand: **aktiv** (offene Posten zuerst) — der Leader sieht beim Öffnen sofort handlungsbedürftige Einträge
- Erledigte Einträge bleiben sichtbar wenn Toggle inaktiv (Audit/Historie, D-07)

**Interaktion:**
- Klick toggled `showOnlyOpen: boolean`
- Wenn `showOnlyOpen=true`: Liste filtert auf Status `'proposed'` / `'pending'`; erledigte ausgeblendet
- Wenn `showOnlyOpen=false`: Vollständige Liste; erledigte mit `Badge variant="muted"` markiert

### Pattern 2: Bestätigen/Ablehnen-Aktionsleiste (Review-Cards)

Anwendung in: `ContributionsReviewSection` (neu, Basis: `ReviewQueue`-Layout migriert).

**Aufbau der Review-Card:**
```
<Card variant="nested">
  <Toolbar leading={<Name + Badge variant="warning">In Prüfung</Badge>} />
  <p>[Anime-Titel]</p>
  <div>[Rollen-Chips als Badge variant="info"]</div>
  <p>[Notiz, italic, 3 Zeilen max]</p>
  <span>[Datum, 12px, --text-faint]</span>
  {Fehler: <p className={styles.inlineError}>…</p>}
  {rejectingId === row.id:
    <div className={styles.rejectExpansion}>
      <Textarea placeholder="Ablehngrund (optional)" rows={3} />
      <div className={styles.rejectActions}>
        <Button variant="danger" size="sm">Ablehnung bestätigen</Button>
        <Button variant="ghost" size="sm">Abbrechen</Button>
      </div>
    </div>
  }
  [Footer:]
  <div className={styles.cardFooterActions}>
    <Button variant="success" size="sm" leftIcon={<Check size={16} />}>Vorschlag bestätigen</Button>
    <Button variant="danger" size="sm" leftIcon={<X size={16} />}>Vorschlag ablehnen</Button>
  </div>
</Card>
```

**Ablehnen-Flow:**
1. Klick auf „Vorschlag ablehnen" öffnet Expansion innerhalb der Card (kein Modal)
2. `Textarea` für optionalen Ablehngrund (placeholder: „Ablehngrund (optional)")
3. „Ablehnung bestätigen" schreibt Ablehnung + entfernt Card aus Liste
4. „Abbrechen" schließt Expansion ohne Aktion

**KEIN `window.confirm()` für Bestätigen** — direkte Aktion mit sofortiger Rückmeldung.
`window.confirm()` bleibt nur für destruktive Aktionen mit irreversiblem Scope (Einladung zurückziehen, Claim ablehnen — analog `ClaimManagementPanel`).

### Pattern 3: Medien-Sichtbarkeit/Reviewstatus-Selektor (D-05/D-06)

Anwendung in: `GroupMediaReviewSection` (neu, im `media`-Tab) und als Erweiterung im Release-Drawer.

**Sichtbarkeits-Selektor:**
```tsx
<FormField label="Sichtbarkeit">
  <Select value={visibility} onChange={…}>
    <option value="intern">Intern</option>
    <option value="oeffentlich">Öffentlich</option>
  </Select>
</FormField>
```

**Reviewstatus-Selektor:**
```tsx
<FormField label="Prüfstatus">
  <Select value={reviewStatus} onChange={…}>
    <option value="in_pruefung">In Prüfung</option>
    <option value="freigegeben">Freigegeben</option>
    <option value="abgelehnt">Abgelehnt</option>
    <option value="archiviert">Archiviert</option>
    <option value="entfernt">Entfernt</option>
  </Select>
</FormField>
```

Hinweis: Genaue Enum-Werte aus Phase-72-Migrations-Schema ableiten (A1-Annahme im RESEARCH.md). Die deutschen Labels sind fix; die `value`-Attribute passen sich an die tatsächlichen DB-Enum-Werte an.

**Owner-Korrektheit-Flag (D-05):**
Wenn erkannte Owner-Inkonsistenz vorliegt, zeigen:
```tsx
<Badge variant="warning">Owner-Zuordnung prüfen</Badge>
```
Kein Umhängen, kein Edit-Feld — nur Anzeige. Owner-Umhängen ist Phase 79.

**Speichern-Aktion:**
```tsx
<Button variant="primary" size="sm" leftIcon={<Save size={16} />}>
  Änderungen speichern
</Button>
```

### Pattern 4: Phase-76-Vorschläge-Eingang (D-03/D-04) — Stub

Da Phase 76 noch nicht implementiert ist (RESEARCH.md Befund 5), erscheinen die
Routing-Slots als `EmptyState`-Platzhalter in den Domänen-Tabs.

Verwendung von `EmptyState variant="compact"` an den jeweiligen Stellen:

| Domänen-Tab | Slot-Position | EmptyState-Titel |
|-------------|---------------|-----------------|
| `media` | Unterhalb `GroupMediaReviewSection` | Noch keine Nutzer-Vorschläge |
| `notes` | Am Ende der Notizen-Sektion | Noch keine Nutzer-Vorschläge |
| `vorschlaege` | Unterhalb `ContributionsReviewSection` | Noch keine Nutzer-Vorschläge |

Diese Slots werden nach Phase-76-Implementierung durch echte Daten-Komponenten ersetzt.

### Pattern 5: Capability-Gating (D-08)

Gating-Pattern analog `canUseMainTab` — alle neuen Review-Komponenten erhalten
`capabilities: FansubGroupCapabilities` als Prop und rendern `null` wenn Berechtigung fehlt.

```tsx
// Muster (aus RESEARCH.md Befund 3)
interface ReviewSectionProps {
  groupId: number
  capabilities: FansubGroupCapabilities
}

export function ContributionsReviewSection({ groupId, capabilities }: ReviewSectionProps) {
  if (!capabilities.can_manage_members) {
    return null
  }
  // …
}
```

Kein sichtbarer „Keine Berechtigung"-Hinweis auf Tab-Ebene — Tab selbst ist bereits
via `canUseMainTab` ausgeblendet wenn Capability fehlt.

### Pattern 6: Loading / Error States

**Loading:** `<LoadingState />` Primitiv (statt inline `<p>Wird geladen…</p>`)
**Fehler:** `<ErrorState />` Primitiv (statt inline Rot-Div)
**Leer (kein Inhalt):** `<EmptyState />` Primitiv

Migration erzwungen durch `ReviewQueue.tsx`-Umbau.

---

## Copywriting Contract

**Sprachqualität-Pflicht:** Alle User-facing Strings verwenden korrekte Umlaute.
ASCII-Ersetzungen (ae/oe/ue/ss) sind verboten.

### Claim-Review (`ClaimManagementPanel`-Erweiterung)

| Element | Exakter Text |
|---------|-------------|
| Filter-Toggle aktiv | Nur offene anzeigen |
| Filter-Toggle inaktiv | Alle anzeigen |
| Leerer Zustand (keine offenen Claims) | Keine offenen Claims |
| Leerer Zustand (Beschreibung) | Alle Claims wurden bearbeitet. |
| Bestätigen-Button | Bestätigen |
| Ablehnen-Button | Ablehnen |
| Ablehnen-Confirm (window.confirm) | Claim für „{nick}" ablehnen? |
| Fehler Bestätigen | Claim konnte nicht bestätigt werden. |
| Fehler Ablehnen | Claim konnte nicht abgelehnt werden. |

### Contribution-Proposal-Review (`ContributionsReviewSection` neu)

| Element | Exakter Text |
|---------|-------------|
| Sektions-Titel | Offene Vorschläge ({n}) |
| Sektions-Beschreibung | Mitglieder-eingereichte Contributions prüfen und bestätigen oder ablehnen. |
| Filter-Toggle aktiv | Nur offene anzeigen |
| Filter-Toggle inaktiv | Alle anzeigen |
| Status-Badge auf Karte | In Prüfung |
| Bestätigen-Button | Vorschlag bestätigen |
| Ablehnen-Button | Vorschlag ablehnen |
| Ablehnen-Expansion: Textarea-Placeholder | Ablehngrund (optional) |
| Ablehnen-Expansion: Bestätigungs-Button | Ablehnung bestätigen |
| Ablehnen-Expansion: Abbrechen-Button | Abbrechen |
| Leerer Zustand Titel | Keine offenen Vorschläge |
| Leerer Zustand Beschreibung | Für diese Gruppe wurden noch keine Contributions vorgeschlagen. |
| Leerer Zustand (alle erledigt) | Alle Vorschläge wurden bearbeitet. |
| Lade-Zustand | Wird geladen… |
| Fehler Laden | Vorschläge konnten nicht geladen werden. Seite neu laden. |
| Fehler Bestätigen | Aktion fehlgeschlagen. Bitte erneut versuchen. |
| Fehler Ablehnen | Aktion fehlgeschlagen. Bitte erneut versuchen. |

### Medienprüfung (`GroupMediaReviewSection` neu)

| Element | Exakter Text |
|---------|-------------|
| Sektions-Titel | Medien prüfen |
| Sektions-Beschreibung | Sichtbarkeit und Prüfstatus der Gruppenmedien verwalten. |
| Sichtbarkeit-Label | Sichtbarkeit |
| Reviewstatus-Label | Prüfstatus |
| Status-Werte (Anzeige) | Intern · In Prüfung · Freigegeben · Abgelehnt · Archiviert · Entfernt |
| Owner-Flag Badge | Owner-Zuordnung prüfen |
| Speichern-Button | Änderungen speichern |
| Leerer Zustand Titel | Keine Medien vorhanden |
| Leerer Zustand Beschreibung | Für diese Gruppe sind noch keine Medien angelegt. |
| Fehler Speichern | Änderungen konnten nicht gespeichert werden. |
| Lade-Zustand | Medien werden geladen… |
| Toast Erfolg | Prüfstatus aktualisiert. |

### Phase-76-Vorschläge-Stub

| Element | Exakter Text |
|---------|-------------|
| EmptyState Titel (alle Tabs) | Noch keine Nutzer-Vorschläge |
| EmptyState Beschreibung | Nutzer-Vorschläge erscheinen hier, sobald Phase 76 implementiert ist. |

### Tab-Labels (bestehend, keine Änderung)

| Tab-Key | Bestehendes Label | Änderung |
|---------|-------------------|----------|
| `claims` | Claims | keine |
| `vorschlaege` | Vorschläge | keine |
| `media` | Medien | keine |

---

## Destruktive Aktionen

| Aktion | Bestätigungs-Mechanismus | Button-Variant |
|--------|--------------------------|----------------|
| Claim ablehnen | `window.confirm('Claim für "{nick}" ablehnen?')` | `danger` |
| Contribution-Vorschlag ablehnen | Inline-Expansion (Textarea + „Ablehnung bestätigen") — KEIN `window.confirm` | `danger` |
| Einladung zurückziehen | `window.confirm('Aktive Einladung zurückziehen? …')` — bereits vorhanden | `danger` |
| Medien-Status „Entfernt" setzen | Kein zusätzlicher Confirm — status-Selektor mit explizitem Opt-in | `danger` implizit via roter Badge |

---

## Layout & Kompositions-Regeln

### Datei-Limits (Modularity-Pflicht aus CLAUDE.md)

- Neue Komponenten: je ≤ 450 Zeilen pro `.tsx`-Datei
- `page.tsx` (~3.800 Zeilen): Kein neuer Logik-Code direkt — nur `import + bedingtes Render` im Tab-Switch
- Colocated `.module.css` für jede neue Komponente

### CSS-Modul-Konventionen (analog `ClaimManagementPanel.module.css`)

| Klassen-Muster | Verwendung |
|----------------|------------|
| `.reviewSection` | Root-Grid-Container, `display: grid; gap: var(--space-5)` |
| `.filterRow` | Toolbar-Zeile für Filter-Toggle, `display: flex; justify-content: flex-end` |
| `.cardStack` | Karten-Liste, `display: flex; flex-direction: column; gap: var(--space-4)` |
| `.cardFooterActions` | Footer-Aktionen pro Karte, `display: flex; justify-content: flex-end; gap: var(--space-2); padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border-subtle); background: var(--surface-card-muted)` |
| `.rejectExpansion` | Ablehnen-Expansion, `background: var(--surface-card-muted); border-radius: var(--radius-sm); padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); border: 1px solid var(--border-subtle)` |
| `.rejectActions` | Aktionszeile in Expansion, `display: flex; gap: var(--space-2); align-items: center` |
| `.inlineError` | Analog `ClaimManagementPanel.module.css:.inlineError` |
| `.tableWrapHeaderLineWine` | Tabellen-Container mit Weinrot-Kopfzeile — Reuse aus `ClaimManagementPanel.module.css` |
| `.rowActions` | Aktionen in Tabellen-Zeile, analog `ClaimManagementPanel.module.css` |
| `.mediaReviewGrid` | Medien-Karten-Grid, `display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4)` |

---

## Registry Safety

| Registry | Genutzte Blöcke | Safety Gate |
|----------|-----------------|-------------|
| shadcn official | nicht genutzt (kein shadcn) | nicht zutreffend |
| Drittanbieter | keine | nicht zutreffend |

Phase 78 nutzt ausschließlich projektinterne `@/components/ui`-Primitives und `lucide-react`. Kein dritter Registry-Import.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

## Quellen

| Quelle | Entscheidungen / Werte |
|--------|------------------------|
| `78-CONTEXT.md` | D-01..D-09, v1.2-Locks F/H/G/I/K, Scope-Grenzen |
| `78-RESEARCH.md` | Seam-Stand, Capability-Matrix, neue Endpoints, Fallstricke |
| `ClaimManagementPanel.tsx` + `.module.css` | Referenz-Layout, CSS-Klassen-Muster, Primitivnutzung |
| `ReviewQueue.tsx` | Bestehende Karten-Struktur (UI-Schuld-Stand) |
| `frontend/src/styles/globals.css` | Alle Design-Tokens (Farben, Spacing, Typografie, Radien) |
| `frontend/src/components/ui/*.tsx` | Vollständiges Primitiv-Inventar |
| `CLAUDE.md` | Pflicht-Constraints: Globales Design-System, Sprachqualität, Modularity-Limit |

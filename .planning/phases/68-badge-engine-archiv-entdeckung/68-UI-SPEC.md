---
phase: 68
slug: badge-engine-archiv-entdeckung
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-02
revised: 2026-06-02
reviewed_at: 2026-06-02
revision_reason: UI-Checker BLOCK-Fixes (Copywriting, Typography, Spacing) + FLAG (Icon-only-Buttons); CTA „Suchen" → „Archiv durchsuchen"
---

# Phase 68 — UI Design Contract

> Visual und Interaktionsvertrag für drei Frontend-Surfaces:
> 1. Öffentliche `/archiv`-Entdeckungsseite (P68-SC3)
> 2. Inline-Meilenstein-Timeline in `manage/groups/[id]` (P68-SC2)
> 3. Erweiterte Badge-Chip-Darstellung (P68-SC1)
>
> Generiert von gsd-ui-researcher, verifiziert von gsd-ui-checker.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (kein shadcn) |
| Preset | not applicable |
| Component library | Projekt-eigene UI-Komponenten aus `frontend/src/components/ui/` |
| Icon library | lucide-react |
| Font | Inter, "Segoe UI", system-ui, sans-serif (var(--font-sans)) |

**Kein shadcn.** Das Projekt verwendet handgepflegte CSS-Module und eine interne UI-Komponentenbibliothek (`Card`, `Button`, `Badge`, `EmptyState`, `ErrorState`, `LoadingState`, `Pagination`, `SectionHeader`, `Toolbar`, `Modal`, `Select`, `Input`, `YearPicker`). Keine neuen externen Pakete in Phase 68.

Registry Safety Gate: nicht anwendbar (kein shadcn, keine Third-Party-Registries).

---

## Spacing Scale

Quelle: `frontend/src/styles/globals.css` — CSS-Custom-Properties `--space-*`.

| Token | CSS-Variable | Wert | Verwendung |
|-------|-------------|------|------------|
| xs | `--space-1` | 4px | Icon-Abstände, Badge-Chip-interne Gaps, roleChip-Padding vertikal |
| sm | `--space-2` | 8px | Chip-Gaps, Zeilen-interne Abstände, MemberSearchCard-Gap |
| md | `--space-3` | 12px | Listen-Gaps, Card-interne Sektion-Abstände (**dokumentierte Ausnahme**, s. u.) |
| md+ | `--space-4` | 16px | Standard-Element-Abstände, Padding in kompakten Sektionen, MemberSearchCard-Padding |
| lg | `--space-5` | 24px | Seiten-Padding oben, Abschnitt-Gaps |
| xl | `--space-6` | 32px | Layout-Gaps zwischen Cards |
| 2xl | `--space-7` | 48px | Seiten-Bottom-Padding |
| 3xl | `--space-8` | 64px | Seiten-Bottom-Padding bei großen Viewports |

Ausnahmen:
- Touch-Ziele für Bearbeiten/Löschen-Buttons in der Meilenstein-Timeline: `min-height: var(--control-height-sm)` = 36px (konsistent mit bestehenden Buttons).
- Timeline-Zeilenpadding: 8px vertikal × 12px horizontal (entspricht dem `.roleTimelineEntry`-Pattern aus `profile.module.css`).
- Archiv-Filtereingaben: `min-height: var(--control-height-md)` = 44px (Standard-Control-Höhe).

**Dokumentierte Ausnahmen (bestehende Codebase-Tokens — nicht ändern):**
- `12px` (`--space-3`): etablierter Projekt-Token aus `globals.css`. Dieser Wert existiert bereits im gesamten Projekt und wird für Listen-Gaps, Formular-Row-Gaps und das `.roleTimelineEntry`-Pattern aus `profile.module.css` verwendet. Er ist eine bewusste, bestehende Codebase-Konstante — keine neue Abweichung vom 8-Punkt-Raster.
- `.badgeChip { padding: 4px 12px }` aus `profile.module.css`: bestehender, projektweiter Badge-Stil. Dieser Block wird in Phase 68 nicht verändert. Das 12px-horizontal-Padding ist existierender Code, der unberührt bleibt.

Neue Spacing-Werte in Phase 68 halten sich strikt an die 4-Punkt-Skala (4, 8, 16, 24, 32, 48, 64px).

---

## Typography

Quelle: `frontend/src/styles/globals.css` — `body { font-size: 16px; line-height: 1.5 }`.

**Genau 2 Font-Weights:** 400 (regular) und 700 (bold). Kein drittes Weight.

| Rolle | Größe | Weight | Line Height | Verwendung |
|-------|-------|--------|-------------|------------|
| Body | 16px | 400 | 1.5 | Fließtext, Notizen, Beschreibungen |
| Label / Meta | 14px | 400 | 1.4 | Badges, Chips, Filter-Labels, Zeitangaben, Rollen-Chips |
| Small / Muted | 13px (0.82rem) | 700 | 1.3 | Badge-Chip-Labels, Meilenstein-Jahresangaben, roleChip, historyEventType, "(historisch)"-Marker |
| Heading / Section | 16–18px | 700 | 1.3 | Abschnittsüberschriften (SectionHeader), Karten-Titel |

Anmerkung: Kein Display-Heading in Phase 68 — alle drei Surfaces sind kompakte Sektionen ohne große Überschriften.

Hinweis zu `.badgeChip { font-weight: 600 }` in `profile.module.css`: Dieser bestehende Stil wird nicht geändert (brownfield-Constraint). Die Typographie-Tabelle oben gilt für neuen Code in Phase 68. Das bestehende `.badgeChip`-CSS bleibt unberührt.

---

## Color

Quelle: `frontend/src/styles/globals.css` und `profile.module.css`.

| Rolle | CSS-Variable / Wert | Verwendung |
|-------|---------------------|------------|
| Dominant (60%) | `--surface-canvas: #f6f4ef` | Seitenhintergrund `/archiv` |
| Secondary (30%) | `--surface-card: #ffffff` / `--surface-card-muted: #fbfaf8` | Profilkarten, Meilenstein-Card-Hintergrund |
| Accent (10%) | `--color-primary: #5f84dd` | Verifiziert-Badge-Icon, Paginierungsaktiv-Zustand, primäre CTA-Buttons |
| Destructive | `--color-error: #dc3545` / `--button-danger-*` | Löschen-Button in Meilenstein-CRUD |
| Erfolg | `--color-success: #28a745` / `var(--color-success, #15803d)` | Verifiziert-Häkchen-Icon (CheckCircle, lucide) |
| Muted text | `--text-soft: #625c56` / `--text-faint: #8c857e` | Jahresangaben, Rollen-Chips-Text, leere Zustände |

Accent reserviert für:
- Verifiziert-Badge-Chip (CheckCircle-Icon, `var(--color-success, #15803d)`)
- Primäre CTA-Buttons: „+ Meilenstein hinzufügen", „Archiv durchsuchen"
- Pagination aktive Seitennummer
- Link-Hover-Zustände in der Archivliste

Badge-Chip-Farbe (konsistent mit `profile.module.css`):
- Hintergrund: `rgba(59, 130, 246, 0.12)`
- Rahmen: `rgba(59, 130, 246, 0.3)`
- Text: `#93c5fd`

---

## Copywriting Contract

Alle user-facing Strings auf Deutsch mit korrekten Umlauten (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersetzungen (ae/oe/ue/ss) sind verboten. Quelle: D-17 aus CONTEXT.md.

### Surface 1: Öffentliche Archiv-Seite `/archiv`

| Element | Text |
|---------|------|
| Seiten-Heading | „Archiv — Fansub-Mitwirkende entdecken" |
| Seiten-Beschreibung | „Durchsuche historische Beiträge von Fansub-Mitgliedern nach Rolle, Zeitraum und Gruppe." |
| Filter-Label Rolle | „Rolle" |
| Filter-Placeholder Rolle | „Alle Rollen" |
| Filter-Label Gruppe | „Gruppe" |
| Filter-Placeholder Gruppe | „Alle Gruppen" |
| Filter-Label Zeitraum von | „Von" |
| Filter-Label Zeitraum bis | „Bis" |
| Filter-Placeholder Jahr | „Jahr (z. B. 2010)" |
| Such-Button (primäre CTA) | „Archiv durchsuchen" |
| Filter-Zurücksetzen-Link | „Filter zurücksetzen" |
| Leerstand-Heading | „Keine Mitglieder gefunden" |
| Leerstand-Body | „Für die gewählten Filter wurden keine öffentlichen Beiträge gefunden. Passe die Filter an oder setze sie zurück." |
| Leerstand (ohne Filter) | „Noch keine öffentlichen Beiträge im Archiv." |
| Fehler-Heading | „Archiv konnte nicht geladen werden" |
| Fehler-Body | „Bitte Seite neu laden oder später erneut versuchen." |
| Pagination Zurück | „Zurück" |
| Pagination Weiter | „Weiter" |
| Pagination Summary | „Seite {N} von {M}" |
| Lade-Zustand | „Archiv wird durchsucht …" |
| Verifiziert-Label auf Karte | „Verifiziert" |
| Aria-Label Verifiziert-Icon | „Verifiziertes Mitglied" |
| Rollen-Chips Prefix | (kein Prefix — direkt Rollenbezeichnung, z. B. „Übersetzung", „Editing") |
| Gruppen-Chip Prefix | (kein Prefix — direkt Gruppenname) |

### Surface 2: Meilenstein-Timeline `manage/groups/[id]`

| Element | Text |
|---------|------|
| Abschnitts-Eyebrow | „Gruppen-Historie" |
| Abschnitts-Heading | „Meilensteine" |
| Abschnitts-Beschreibung | „Wichtige Ereignisse der Gruppe chronologisch festhalten." |
| Primäre CTA | „+ Meilenstein hinzufügen" |
| Erweitern-Link | „Alle {N} Einträge anzeigen" |
| Reduzieren-Link | „Weniger anzeigen" |
| Bearbeiten-Button aria-label | „Eintrag bearbeiten" |
| Löschen-Button aria-label | „Eintrag löschen" |
| Löschen-Button Label | „Löschen" |
| Leerstand-Heading | „Noch keine Meilensteine" |
| Leerstand-Body | „Füge wichtige Ereignisse wie Gründung, Leaderwechsel oder Auflösung hinzu." |
| Formular-Label Titel | „Titel *" |
| Formular-Placeholder Titel | „z. B. Gegründet, Leaderwechsel, Aufgelöst …" |
| Formular-Label Jahr | „Jahr (optional)" |
| Formular-Placeholder Jahr | „z. B. 2008" |
| Formular-Label Notiz | „Notiz (optional)" |
| Formular-Placeholder Notiz | „Zusätzliche Informationen zum Eintrag …" |
| Formular-Label Ereignistyp | „Ereignistyp" |
| Ereignistyp-Optionen | „Gründung", „Auflösung", „Pause", „Umbenennung", „Meilenstein", „Sonstiges" |
| Formular Submit-Button | **„Meilenstein speichern"** |
| Formular Abbrechen-Button | **„Bearbeitung abbrechen"** |
| Lösch-Bestätigung | „Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden." |
| Lösch-Bestätigung Bestätigen | „Endgültig löschen" |
| Lösch-Bestätigung Abbrechen (sekundäre Aktion) | **„Nicht löschen"** |
| Fehler beim Speichern | „Meilenstein konnte nicht gespeichert werden. Bitte versuche es erneut." |
| Fehler beim Löschen | „Meilenstein konnte nicht gelöscht werden. Bitte versuche es erneut." |
| Erfolg-Toast Hinzufügen | „Meilenstein hinzugefügt." |
| Erfolg-Toast Bearbeiten | „Meilenstein aktualisiert." |
| Erfolg-Toast Löschen | „Meilenstein gelöscht." |
| Validierung Pflichtfeld | „Titel ist ein Pflichtfeld." |

### Surface 3: Erweiterte Badge-Chips

| Badge-Code | Label-Text |
|------------|------------|
| `founding_member` | „★ Gründungsmitglied" (bestehend, aus `MemberBadgeChips.tsx`) |
| `historical_leader` | „♦ Historischer Leader" (bestehend) |
| `long_term_member` | „◆ 5+ Jahre Mitglied" (bestehend) |
| `first_contribution` | „✦ Erster Beitrag" |
| `productive_bronze` | „◈ Produktiv · 10+ Anime" |
| `productive_silver` | „◈ Produktiv · 25+ Anime" |
| `productive_gold` | „◈ Produktiv · 50+ Anime" |
| `all_rounder` | „⬡ Allrounder" |
| `verified` | „✓ Verifiziert" |
| Ausblenden-Button | „Ausblenden" (bestehend) |
| Fehler beim Ausblenden | „Badge konnte nicht ausgeblendet werden. Bitte versuche es erneut." (bestehend) |

---

## Surfaces — Visuelle und Interaktions-Verträge

### Surface 1: Öffentliche `/archiv`-Seite

#### Layout

```
<main class="archivPage">          /* width: min(1280px, 100% - 48px); padding: 24px 0 48px */
  <header>
    <h1>Archiv — Fansub-Mitwirkende entdecken</h1>
    <p>Beschreibungstext</p>
  </header>

  <section class="archivFilters">   /* Card variant="section", padding: 16px–24px */
    <form role="search">
      [Select Rolle]  [Select Gruppe]  [Input Jahr von]  [Input Jahr bis]
      [Button "Archiv durchsuchen" primary]  [Link/Button "Filter zurücksetzen" ghost]
    </form>
  </section>

  <section class="archivResults">
    /* LoadingState | ErrorState | EmptyState | Ergebnisraster */
    <div class="archivGrid">        /* grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px */
      <MemberSearchCard /> * N
    </div>
    <Pagination />
  </section>
</main>
```

#### MemberSearchCard-Komponente

Neue Datei: `frontend/src/components/archive/MemberSearchCard.tsx`
CSS-Modul: `frontend/src/components/archive/archive.module.css`

Layout innerhalb der Karte:

```
<article class="memberSearchCard">
  /* Card variant="nested"; padding: 16px; display: grid; gap: 8px */

  <div class="cardHeader">         /* grid; grid-template-columns: 48px 1fr; gap: 8px; align-items: center */
    <img class="cardAvatar" />     /* 48×48px, border-radius: 50%; object-fit: cover */
    <div class="cardMeta">
      <strong class="cardName" />  /* 14px, weight 700, color: var(--text-strong) */
      <VerifiedBadge />            /* nur wenn is_verified=true; bestehendes Component */
    </div>
  </div>

  <div class="cardRoles">          /* flex-wrap: wrap; gap: 4px */
    /* Maximal 3 Rollen-Chips; danach "+N weitere" */
    <span class="roleChip" />      /* 13px, weight 700; background: rgba(95,132,221,0.1); border: 1px solid rgba(95,132,221,0.25); border-radius: 999px; padding: 4px 8px */
  </div>

  <div class="cardGroups">         /* font-size: 13px; color: var(--text-soft) */
    /* Maximal 2 Gruppennahmen, Komma-separiert; danach "+ N weitere" */
  </div>

  <a href="/members/{slug}" class="cardLink">   /* "Profil ansehen" — ghost-Link, font-size: 14px */
    Profil ansehen
  </a>
</article>
```

Spacing-Werte in `MemberSearchCard` (4-Punkt-konform):
- `padding: 16px` (entspricht `--space-4`)
- `gap: 8px` (entspricht `--space-2`)
- `cardHeader gap: 8px` (entspricht `--space-2`)
- `roleChip padding: 4px 8px` (entspricht `--space-1` vertikal, `--space-2` horizontal)

#### Filter-Bar

- `Select`-Komponente aus `@/components/ui` für Rolle und Gruppe.
- Rollen-Optionen: alle 11 `context='anime_contribution'`-Rollen aus `role_definitions`. Deutsche Labels: Übersetzung, Editing, Timing, Typesetting, Encoding, Raw Provider, Qualitätskontrolle, Projektleitung, Design, Administration, Sonstiges.
- Gruppe: befüllt aus `GET /api/v1/fansubs` (bereits öffentlicher Endpunkt).
- Zeitraum: zwei `Input type="number"` mit `min="1990"`, `max="2099"`, Placeholder „Jahr (z. B. 2010)".
- Filter werden bei Klick auf „Archiv durchsuchen" angewendet — kein Auto-Submit.
- URL-State: Filter-Parameter als Query-String (`?rolle=translator&gruppe=5&von=2005&bis=2015&page=1`). Serverseitig rendered für Barrierefreiheit und SEO.
- „Filter zurücksetzen" löscht alle Parameter und navigiert zu `/archiv`.

#### Pagination

- Bestehende `Pagination`-Komponente aus `@/components/ui`.
- 20 Ergebnisse pro Seite (Offset-Pagination, `?page=N`).
- Unter 2 Seiten keine Pagination sichtbar.

#### Zustände

| Zustand | Komponente | Beschreibung |
|---------|-----------|--------------|
| Laden | `LoadingState` (aus `@/components/ui`) | Title: „Archiv wird durchsucht …" |
| Fehler | `ErrorState` (aus `@/components/ui`) | Title: „Archiv konnte nicht geladen werden", Action: „Erneut laden" |
| Leer (mit Filtern) | `EmptyState` | „Keine Mitglieder gefunden" + Beschreibung + „Filter zurücksetzen"-Link |
| Leer (ohne Filter) | `EmptyState` | „Noch keine öffentlichen Beiträge im Archiv." |
| Ergebnisse | Karten-Raster + Pagination | — |

---

### Surface 2: Inline-Meilenstein-Timeline in `manage/groups/[id]`

#### Positionierung

Neue `Card variant="section"` unterhalb der bestehenden Cards in `admin/my-groups/[id]/page.tsx`. Neue Subkomponente `GroupHistorySection.tsx` in `frontend/src/components/groups/`.

#### Layout der Sektion

```
<Card variant="section">
  <SectionHeader
    eyebrow="Gruppen-Historie"
    title="Meilensteine"
    description="Wichtige Ereignisse der Gruppe chronologisch festhalten."
  />

  <Toolbar leading={
    <Button variant="primary" size="sm" onClick={openAddForm}>
      + Meilenstein hinzufügen
    </Button>
  } />

  /* Inline-Formular (nur sichtbar beim Hinzufügen/Bearbeiten) */
  {isFormOpen && <GroupHistoryForm onSave={...} onCancel={...} entry={editTarget} />}

  /* Timeline-Liste */
  {entries.length === 0
    ? <EmptyState title="Noch keine Meilensteine" description="..." />
    : <>
        <ul class="historyList">
          {visibleEntries.map(entry => <GroupHistoryRow entry={entry} ... />)}
        </ul>

        /* Progressive Disclosure — Expander */
        {entries.length > COLLAPSE_THRESHOLD && (
          <Button variant="ghost" size="sm" onClick={toggleExpanded}>
            {isExpanded ? "Weniger anzeigen" : `Alle ${entries.length} Einträge anzeigen`}
          </Button>
        )}
      </>
  }
</Card>
```

#### Collapse-Schwelle

`COLLAPSE_THRESHOLD = 5`. Erste 5 Einträge immer sichtbar. Weitere nur nach Klick auf Expander. (Begründung: 5–15 Einträge je Gruppe realistisch; 5 deckt den Normalfall ab ohne Scroll-Aufwand.)

#### GroupHistoryRow-Layout

```
<li class="historyRow">
  /* display: flex; gap: 12px; align-items: flex-start; padding: 8px 12px;
     background: rgba(30,41,59,0.06); border: 1px solid var(--border-subtle);
     border-radius: 6px */
  /* gap: 12px und padding: 8px 12px sind bestehende Codebase-Tokens (--space-3),
     dokumentierte Ausnahmen — siehe Spacing-Sektion */

  <span class="historyYear">          /* min-width: 48px; font-size: 13px; color: var(--text-faint); flex-shrink: 0 */
    {entry.year ?? '—'}
  </span>

  <span class="historyEventType">     /* font-size: 13px; font-weight: 700; color: var(--text-soft);
                                         min-width: 100px; flex-shrink: 0 */
    {EVENT_TYPE_LABELS[entry.event_type]}
  </span>

  <span class="historyTitle">         /* font-size: 14px; color: var(--text-body); flex: 1; min-width: 0; overflow-wrap: anywhere */
    {entry.title}
    {entry.note && <span class="historyNote">— {entry.note}</span>}
                   /* font-size: 13px; color: var(--text-faint) */
  </span>

  <div class="historyRowActions">     /* display: flex; gap: 8px; flex-shrink: 0 */
    <Button variant="ghost" size="sm" aria-label="Eintrag bearbeiten">
      <Pencil size={14} />
    </Button>
    <Button variant="danger" size="sm" aria-label="Eintrag löschen">
      <Trash2 size={14} />
    </Button>
  </div>
</li>
```

#### Sortierung

Chronologisch aufsteigend nach `year` (NULL zuletzt).

#### Inline-Formular (GroupHistoryForm)

```
<form class="historyForm">
  /* background: var(--surface-card-muted); border: 1px solid var(--border-subtle);
     border-radius: 8px; padding: 16px; display: grid; gap: 12px */
  /* gap: 12px ist bestehender Codebase-Token (--space-3), dokumentierte Ausnahme */

  <FormField label="Titel *" required>
    <Input type="text" placeholder="z. B. Gegründet, Leaderwechsel, Aufgelöst …" />
  </FormField>

  <FormField label="Ereignistyp">
    <Select options={EVENT_TYPE_OPTIONS} />
  </FormField>

  <div class="historyFormRow">        /* display: grid; grid-template-columns: 1fr 1fr; gap: 12px */
    <FormField label="Jahr (optional)">
      <Input type="number" min="1990" max="2099" placeholder="z. B. 2008" />
    </FormField>
    <div />  /* Platzhalter */
  </div>

  <FormField label="Notiz (optional)">
    <Textarea placeholder="Zusätzliche Informationen …" rows={2} />
  </FormField>

  <Toolbar leading={
    <>
      <Button type="submit" variant="primary" size="sm">Meilenstein speichern</Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Bearbeitung abbrechen</Button>
    </>
  } />
</form>
```

#### Löschen-Bestätigung

Kein Navigations-Redirect. Bestätigung über `Modal` aus `@/components/ui`:
- Title: „Eintrag löschen"
- Body: „Eintrag wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
- Primäre Aktion: Button `variant="danger"` → „Endgültig löschen"
- Sekundäre Aktion: Button `variant="secondary"` → „Nicht löschen"

#### Toast-Feedback

Sofern ein Toast-System vorhanden ist (Projekt nutzt `MessageToast` aus `@/app/admin/anime/components/`), dieses verwenden. Falls nicht verfügbar: Inline-Erfolgsmeldung direkt unter dem Formular/der Timeline für 3 Sekunden.

---

### Surface 3: Erweiterte Badge-Chips

#### Designregel

Alle neuen Badges folgen exakt dem bestehenden `.badgeChip`-Pattern aus `profile.module.css`:

```css
/* Bestehend — NICHT ändern */
.badgeChip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 999px;
  font-size: 0.82rem;   /* ~13px */
  font-weight: 600;
  color: #93c5fd;
}
```

Neue Badge-Codes werden ausschließlich zur `BADGE_LABELS`-Map in `MemberBadgeChips.tsx` hinzugefügt. Kein neues CSS erforderlich.

#### Neue BADGE_LABELS-Einträge (ergänzend)

```typescript
// Bestehend (unverändert):
founding_member: '★ Gründungsmitglied',
historical_leader: '♦ Historischer Leader',
long_term_member: '◆ 5+ Jahre Mitglied',

// Neu in Phase 68:
first_contribution: '✦ Erster Beitrag',
productive_bronze:  '◈ Produktiv · 10+ Anime',
productive_silver:  '◈ Produktiv · 25+ Anime',
productive_gold:    '◈ Produktiv · 50+ Anime',
all_rounder:        '⬡ Allrounder',
verified:           '✓ Verifiziert',
```

#### Visibility-Regeln (unverändert, Phase 64)

- Eigenes Profil: `visibility !== 'hidden'` → sichtbar (also `public` + `internal`).
- Öffentliche Besucher: `visibility === 'public'` → sichtbar.
- `status === 'revoked'` → wird vom Backend nicht zurückgeliefert (oder gefiltert im Rendering).

#### Verifiziert-Badge in `MemberSearchCard`

Der `verified`-Status auf der Archiv-Suchergebnis-Karte wird **nicht** über `MemberBadgeChips` dargestellt (diese Komponente braucht vollständige Badge-Arrays mit IDs). Stattdessen: direkt `<VerifiedBadge />` aus `frontend/src/components/profile/VerifiedBadge.tsx` einbetten, wenn `is_verified=true`.

---

## Neue Dateien (Executor-Referenz)

| Datei | Beschreibung |
|-------|-------------|
| `frontend/src/app/archiv/page.tsx` | Server Component, öffentliche Archiv-Seite |
| `frontend/src/app/archiv/page.module.css` | CSS-Modul für die Archiv-Seite |
| `frontend/src/components/archive/MemberSearchCard.tsx` | Kompakte Profilkarte für Suchergebnisse |
| `frontend/src/components/archive/archive.module.css` | CSS-Modul für Archiv-Komponenten |
| `frontend/src/components/groups/GroupHistorySection.tsx` | Inline-Meilenstein-Section für manage/groups/[id] |
| `frontend/src/components/groups/groups.module.css` | CSS-Modul für Group-Komponenten |

Geänderte Dateien:
| Datei | Änderung |
|-------|---------|
| `frontend/src/components/profile/MemberBadgeChips.tsx` | `BADGE_LABELS`-Map um 6 neue Codes erweitern |
| `frontend/src/app/admin/my-groups/[id]/page.tsx` | `<GroupHistorySection />` einbetten |
| `frontend/src/lib/api.ts` | `searchArchive()`, `createGroupHistory()`, `updateGroupHistory()`, `deleteGroupHistory()` ergänzen |

---

## API-Aufrufe (Frontend-seitig)

| Funktion | Methode + Route | Auth |
|---------|----------------|------|
| `searchArchive(params)` | `GET /api/v1/archiv?rolle=&gruppe=&von=&bis=&page=` | kein Token |
| `getFansubsForFilter()` | `GET /api/v1/fansubs` (bestehend) | kein Token |
| `listGroupHistory(groupId)` | `GET /api/v1/admin/fansubs/:id/history` (bestehend) | Leader-Token |
| `createGroupHistory(groupId, payload)` | `POST /api/v1/admin/fansubs/:id/history` (bestehend) | Leader-Token |
| `updateGroupHistory(groupId, histId, payload)` | `PATCH /api/v1/admin/fansubs/:id/history/:historyId` (bestehend) | Leader-Token |
| `deleteGroupHistory(groupId, histId)` | `DELETE /api/v1/admin/fansubs/:id/history/:historyId` (neu in Phase 68) | Leader-Token |

---

## Barrierefreiheit

| Element | Anforderung |
|---------|------------|
| Archiv-Seite `<main>` | `aria-label="Archiv — Fansub-Mitwirkende entdecken"` |
| Filter-Form | `role="search"` |
| Pagination `<nav>` | `aria-label="Seitennavigation"` (bestehende Pagination-Komponente erfüllt dies bereits) |
| Verifiziert-Icon | `aria-hidden="true"` am Icon, `aria-label="Verifiziertes Mitglied"` am Wrapper (bestehende VerifiedBadge-Komponente erfüllt dies) |
| Bearbeiten-Button (Icon-only) | `aria-label="Eintrag bearbeiten"` — Icon-only ist bewusste Designentscheidung für die kompakte Timeline-Zeile; Tooltip on hover und `aria-label` sind der vollständige Accessibility-Vertrag für diese Inline-Aktionen. |
| Löschen-Button (Icon-only) | `aria-label="Eintrag löschen"` — gleiche Begründung wie Bearbeiten-Button; sichtbarer Text-Fallback ist für diese Zeilen-Aktionen nicht vorgesehen. |
| Modal-Löschbestätigung | `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` auf Modal-Title |
| Fehlermeldungen | `role="alert"` (bestehend in `MemberBadgeChips`, `ErrorState`) |
| Karten-Link | Vollständiger Link-Text „Profil ansehen" (kein Icon-only-Link) |
| Fokus-Reihenfolge Formular | Titel → Ereignistyp → Jahr → Notiz → Meilenstein speichern → Bearbeitung abbrechen |

---

## Responsive Breakpoints

| Breakpoint | Archiv-Grid | Filter-Bar |
|-----------|-------------|------------|
| ≥ 900px | `repeat(auto-fill, minmax(260px, 1fr))` (3–4 Spalten) | Einzeilig |
| 601–899px | `repeat(auto-fill, minmax(220px, 1fr))` (2 Spalten) | Zweizeilig |
| ≤ 600px | 1 Spalte | Gestapelt, Inputs 100% Breite |

Meilenstein-Timeline: keine Breakpoint-Änderung erforderlich — kompakte Listenansicht funktioniert auf allen Breiten. Ab ≤ 480px: `historyFormRow` von 2 auf 1 Spalte wechseln.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | keine (shadcn nicht initialisiert) | nicht anwendbar |
| Third-party | keine | nicht anwendbar |

Kein `components.json` vorhanden. Keine Third-Party-Registries. Safety-Gate-Prüfung nicht erforderlich.

---

## Vorausgefüllte Entscheidungen — Quellen

| Entscheidung | Quelle | Wert |
|-------------|--------|------|
| shadcn: nein | Codebase-Scan | `components.json` nicht vorhanden |
| Spacing-Scale | `globals.css --space-*` | 4 / 8 / 16 / 24 / 32 / 48 / 64px (+ dokumentierte Ausnahme 12px) |
| Typographie Body | `globals.css body` | 16px, weight 400, line-height 1.5 |
| Farb-Tokens | `globals.css :root` | `--color-primary`, `--surface-*`, `--text-*` |
| Badge-Chip-Style | `profile.module.css .badgeChip` | `rgba(59,130,246,0.12)`, border, `#93c5fd` |
| Badge-Labels bestehend | `MemberBadgeChips.tsx BADGE_LABELS` | 3 Labels übernommen |
| VerifiedBadge-Komponente | `VerifiedBadge.tsx` | CheckCircle, `var(--color-success, #15803d)` |
| Pagination-Komponente | `ui/Pagination.tsx` | Vorhanden, deutsche Labels |
| Card/Button/EmptyState etc. | `components/ui/index.ts` | Alle Komponenten vorhanden |
| D-12: Inline-Sektion | CONTEXT.md | Kein Seitenwechsel, Progressive Disclosure bei > 5 Einträgen |
| D-13: öffentliche Route | CONTEXT.md | `/archiv`, kein Auth-Gate |
| D-14: UND-Filter, alle optional | CONTEXT.md | Select + Input |
| D-15: nur öffentliche Member | CONTEXT.md | `profile_visibility='public'` im Backend |
| D-16: Profil-Karten paginiert | CONTEXT.md | 20 pro Seite, `MemberSearchCard` neu |
| D-17: Deutsch + Umlaute | CONTEXT.md / CLAUDE.md | Alle Strings deutsch |
| Pagination-Strategie | RESEARCH.md Befund 4 | Offset, 20/Seite, `?page=N` |
| MemberSearchCard neu | RESEARCH.md Befund 7 | `MemberProfileHero` zu komplex |
| Gruppen-Filter-Quelle | RESEARCH.md Befund 6 | `GET /api/v1/fansubs` (vorhanden) |
| COLLAPSE_THRESHOLD | Empfehlung (Claude's Discretion) | 5 Einträge |
| Lösch-Bestätigung | Empfehlung (Claude's Discretion) | Modal, nicht inline |

---

## Revisions-Log

| Datum | Revision | Grund |
|-------|---------|-------|
| 2026-06-02 | Initial | gsd-ui-researcher erstellt |
| 2026-06-02 | BLOCK-Fix | UI-Checker: 3 BLOCK + 1 FLAG behoben (Copywriting, Typography, Spacing, Icon-Accessibility) |

### Änderungen in dieser Revision (2026-06-02)

**BLOCK 1 — Copywriting (kontextspezifische Labels):**
- Formular Submit: „Speichern" → „Meilenstein speichern"
- Formular Abbrechen: „Abbrechen" → „Bearbeitung abbrechen"
- Modal sekundäre Aktion: „Abbrechen" → „Nicht löschen"
- Formular-Pseudocode und Copywriting-Tabelle aktualisiert.
- Fokus-Reihenfolge in Barrierefreiheits-Tabelle mit neuen Labels aktualisiert.

**BLOCK 2 — Typography (max. 2 Font-Weights):**
- Weight 600 in der Typography-Tabelle → 700 (betrifft Small/Muted: Badge-Chip-Labels, Jahresangaben, roleChip, historyEventType).
- `historyEventType` im Pseudocode: `font-weight: 600` → `font-weight: 700`.
- `roleChip` im Pseudocode: `weight 600` → `weight 700`.
- Hinweis ergänzt: `.badgeChip { font-weight: 600 }` in `profile.module.css` bleibt unberührt (brownfield-Constraint).

**BLOCK 3 — Spacing (4-Punkt-Konformität):**
- `MemberSearchCard padding: 14px` → `16px` (`--space-4`).
- `MemberSearchCard gap: 10px` → `8px` (`--space-2`).
- `roleChip padding: 2px 8px` → `4px 8px` (`--space-1` vertikal).
- `cardHeader gap: 12px` → `8px` (`--space-2`).
- Dokumentierte Ausnahmen für bestehende 12px-Tokens (`--space-3`) explizit in der Spacing-Sektion ergänzt.

**FLAG — Icon-only Bearbeiten/Löschen-Buttons:**
- Explizite Notiz in der Barrierefreiheits-Tabelle ergänzt: Icon-only ist bewusste Designentscheidung für die kompakte Timeline; `aria-label` + Tooltip sind der vollständige Accessibility-Vertrag.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

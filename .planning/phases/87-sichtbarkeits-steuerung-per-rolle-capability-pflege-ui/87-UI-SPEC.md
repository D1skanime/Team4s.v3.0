---
phase: 87
slug: sichtbarkeits-steuerung-per-rolle-capability-pflege-ui
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-18
reviewed_at: 2026-06-18
---

# Phase 87 — UI Design Contract

> Visueller und Interaktions-Vertrag für die Capability-Pflege-Oberfläche.
> Generiert von gsd-ui-researcher. Wird von gsd-ui-checker verifiziert.

---

## Scope dieser UI-SPEC

Diese Spec deckt ausschließlich die **Capability-Pflege-UI** (Plattform-Admin pflegt
`role_capabilities` — Vergeben/Entziehen von Capabilities pro Rolle). Der Backend-seitige
Lese-Pfad-Enforcement (D-01/D-02/D-03) hat kein eigenes UI und ist daher nicht Teil
dieser Spec.

---

## Design System

| Eigenschaft | Wert | Quelle |
|-------------|------|--------|
| Tool | Kein shadcn (projektspezifisches System) | Codebase-Scan: kein `components.json` |
| Preset | nicht anwendbar | — |
| Komponentenbibliothek | `@/components/ui` (projekteigen) | CLAUDE.md — PFLICHT |
| Icon-Bibliothek | `lucide-react` | CLAUDE.md / package.json |
| Schriftart | Inter, "Segoe UI", system-ui, sans-serif | `globals.css:--font-sans` |

**Pflicht-Constraint:** Ausschließlich Primitives aus `@/components/ui` verwenden.
Kein natives `<select>`, `<input>`, `<button>` oder Eigen-Markup für Typen,
die das globale System bereits anbietet. Verstöße werden von ESLint `no-restricted-syntax`
gemeldet (CLAUDE.md). Gilt für alle Dateien dieser Phase ohne Ausnahme.

---

## Spacing Scale

Deklarierte Werte (Quelle: `globals.css` — alle Vielfache von 4):

| Token | CSS-Variable | Wert | Verwendung in dieser Phase |
|-------|-------------|------|---------------------------|
| xs | `--space-1` | 4px | Icon-Abstände, Badge-Zwischenraum |
| sm | `--space-2` | 8px | Kompakte Element-Abstände, Button-Gruppen |
| md-s | `--space-3` | 12px | Abstände innerhalb von Tabellenzellen |
| md | `--space-4` | 16px | Standard-Padding (Tab-Innenraum, Modal-Body) |
| lg | `--space-5` | 24px | Abschnitt-Padding, SectionHeader-Abstand |
| xl | `--space-6` | 32px | Layout-Abstände zwischen Sektionen |
| 2xl | `--space-7` | 48px | Große Sektionsumbrüche |
| 3xl | `--space-8` | 64px | Seiten-Ebene |

Ausnahmen (begründet, beide Vielfache von 4):
- `--space-3: 12px` — bestehendes Projekt-Token aus `globals.css` für komprimierte Tabellenzellen-Abstände; kein kleineres Standard-Token zwischen 8px und 16px verfügbar, das die dichte Rolle×Action-Matrix lesbar hält. Nutzung der vorhandenen Design-System-Skala (keine neue Ad-hoc-Größe).
- `--control-height-md: 44px` — Touch-Target-Mindestgröße auf Capability-Zuweisung/Entzug-Buttons.

---

## Typography

Quelle: `globals.css` — keine neue Typografie einzuführen.

| Rolle | Größe | Gewicht | Zeilenhöhe | Verwendung |
|-------|-------|---------|------------|------------|
| Body | 16px | 400 | 1.5 | Tabelleninhalte, Modal-Beschreibungen |
| Label | 14px (0.875rem) | 400 | 1.4 | Tabellen-Header, Hilfstexte, Badge-Text |
| Heading | 20px (1.25rem) | 600 | 1.2 | Seitentitel, SectionHeader-Titel |
| Display | 28px (1.75rem) | 600 | 1.2 | PageHeader-Titel (`/admin/role-capabilities`) |

Maximal 2 Gewichte: **400 (regular)** und **600 (semibold)**. Kein 700/bold
in dieser Phase.

---

## Color

Quelle: `globals.css` — keine neuen Farben einführen, ausschließlich bestehende
CSS-Variablen referenzieren.

| Rolle | CSS-Variable | Hex | Verwendung |
|-------|-------------|-----|------------|
| Dominant (60%) | `--color-bg-light` | `#f9f9f9` | Seitenhintergrund, Drawer-Hintergrund |
| Sekundär (30%) | `--color-white` / `--bg-card` | `#ffffff` | Karten, Tabellenfläche, Modal-Hintergrund |
| Akzent (10%) | `--color-primary` | `#5f84dd` | Primäre CTA-Buttons (Capability vergeben), aktiver Tab-Indicator, Badge-Info |
| Destruktiv | `--color-error` | `#dc3545` | Nur Entzugs-Button + Entzugs-Modal-Bestätigung |
| Muted-Text | `--color-text-secondary` | `#6b6b70` | Standalone-Aktions-Label, read-only Hinweise |
| Warn | `--color-warning` | `#ffc107` | Badge für Lockout-Guard-Hinweis (falls eine Action die letzte Zuweisung verliert) |

**Akzent reserviert für:**
1. Primärer CTA-Button „Capability vergeben" (variant="primary")
2. Aktiver Zustand des Kategorie-Filters (active Badge)
3. Badge variant="info" für bereits zugewiesene Capabilities

**Destruktiv reserviert für:** ausschließlich den „Capability entziehen"-Button und den
Bestätigungs-Button im Entzugs-Modal. Kein anderer Element erhält diese Farbe.

---

## Komponenteninventar

Alle Komponenten werden ausschließlich aus `@/components/ui` importiert. Keine
Third-Party-Pakete.

| Komponente | Verwendung in Phase 87 | Vorlage |
|-----------|----------------------|---------|
| `Table`, `TableHead`, `TableBody`, `TableRow`, `TableCell`, `TableHeaderCell` | Rollen-Capability-Tabelle (Rollen × Actions) | `AdminUsersClient.tsx` |
| `Badge` | Capability-Status (zugewiesen/nicht zugewiesen), Kategorie-Labels, Standalone-Aktions-Markierung | `UserGlobalRolesTab.tsx` |
| `Button` | Capability vergeben / entziehen, Modal-Aktionen, Kategorie-Filter | `UserGlobalRolesTab.tsx` |
| `Modal` | Vergabe-Bestätigung, Entzugs-Bestätigung | `UserGlobalRolesTab.tsx` |
| `Select` | Dropdown für Kategoriefilter in der Matrix | `AdminUsersClient.tsx` |
| `SectionHeader` | Überschriften der Tabellen-Sektionen | `UserGlobalRolesTab.tsx` |
| `LoadingState` | Lade-Zustand beim Fetch der Capability-Matrix | `UserGlobalRolesTab.tsx` |
| `EmptyState` | Keine Rollen / keine Actions in einer Kategorie | `UserGlobalRolesTab.tsx` |
| `ErrorState` | Ladefehler der Matrix | `UserGlobalRolesTab.tsx` |
| `PageHeader` | Seitenheader `/admin/role-capabilities` | Konvention Admin-Seiten |

**Nicht verwenden:** `Drawer` (diese Seite ist eine eigene Route, kein Drawer).
`Tabs` optional für Kategoriefilterung (Alternative: `Select` + aktiver Badge-Filter).

---

## Seitenstruktur und Layout

**Primärer visueller Anker (Focal Point):** Der `PageHeader` „Capability-Verwaltung" (Display 28px/600, volle Breite) ist das dominante Element der Seite und etabliert die oberste Hierarchiestufe. Darunter folgt absteigend: Kategorie-Filter → Rollen×Action-Matrix-Tabelle → Zell-Aktionen (Badge/Button). Der Blick startet oben links beim Titel und wandert in die Matrix.

### Route: `/admin/role-capabilities`

```
page.tsx (Server Component, PlatformAdminGate)
  └── RoleCapabilityClient.tsx (CSR, <=450 Zeilen)
        ├── PageHeader: "Capability-Verwaltung"
        ├── Beschreibungstext: Hinweis "Änderungen wirken nach Cache-Reload sofort"
        ├── [Optional] Kategorie-Filter: Select oder Button-Gruppe
        ├── RoleCapabilityTable.tsx (<=450 Zeilen, separate Datei)
        │     └── Table: Zeilen = Rollen, Spalten = Actions (nach Kategorie gruppiert)
        │           Jede Zelle: Badge (zugewiesen) oder Button "Vergeben" (nicht zugewiesen)
        │           Standalone-Aktionen: read-only Badge "Systemaktion"
        ├── GrantCapabilityModal.tsx (oder inline, <=150 Zeilen)
        └── RevokeCapabilityModal.tsx (oder inline, <=150 Zeilen)
```

**Nav-Eintrag:** Die Admin-Übersichtsseite (`/admin/page.tsx`) bekommt einen Link
auf `/admin/role-capabilities` in der `<section className={styles.panel}>` analog zu
„Benutzer & Rechte". Linktext: „Capability-Verwaltung".

**Modulare Aufteilung (450-Zeilen-Limit):**

| Datei | Verantwortlichkeit | Max. Zeilen |
|-------|--------------------|-------------|
| `page.tsx` | Server Component, PlatformAdminGate, Metadaten | 30 |
| `RoleCapabilityClient.tsx` | State-Verwaltung, Fetching, Modal-Orchestrierung | 450 |
| `RoleCapabilityTable.tsx` | Tabellen-Rendering, Zell-Logik, Badge/Button pro Zelle | 450 |
| `GrantCapabilityModal.tsx` | Vergabe-Modal (analog `AssignModal` in `UserGlobalRolesTab`) | 100 |
| `RevokeCapabilityModal.tsx` | Entzugs-Modal mit Lockout-Hinweis (analog `RevokeModal`) | 100 |

---

## Interaktions-Vertrag

### Matrix-Ansicht (Rollen × Actions)

Die Hauptfläche zeigt eine Tabelle. Jede **Zeile = eine Rolle** (`role_definitions.code` +
`label_de`). Die **Spalten = alle Actions** (`action_definitions.code` + `label_de` +
`category`), nach Kategorie gruppiert via Spaltengruppe-Header.

Jede Zelle zeigt:
- **Zugewiesen:** `Badge variant="info"` mit Label der Action + daneben `Button variant="danger" size="sm"` „Entziehen"
- **Nicht zugewiesen:** `Button variant="secondary" size="sm"` „Vergeben"
- **Standalone-Aktion (kein `role_capabilities`-Eintrag möglich):** `Badge variant="muted"` „Systemaktion" — kein Button, nicht editierbar

### Kategorie-Filter

`Select`-Primitiv mit Optionen aus `action_definitions.category` (z.B. „release",
„fansub_group", „media"). Leeroption „Alle Kategorien". Filtert die sichtbaren Spalten
clientseitig ohne API-Call.

### Vergabe-Flow

1. Admin klickt „Vergeben" in einer Zelle (Rolle × Action noch nicht zugewiesen).
2. `GrantCapabilityModal` öffnet sich mit:
   - Titel: „Capability vergeben"
   - Beschreibung: „Soll die Capability „{action.label_de}" der Rolle „{role.label_de}" zugewiesen werden?"
   - Footer: `Button variant="secondary"` „Abbrechen" | `Button variant="primary"` „Capability vergeben"
   - Pending-State: Buttons disabled, Bestätigungs-Button zeigt „Wird verarbeitet …"
3. Bei Erfolg: Modal schließt, `loadData()` neu laden, kein Toast notwendig (Tabelle
   aktualisiert sich sichtbar — die Zelle wechselt von „Vergeben"-Button zu Badge+Entziehen).
4. Bei Fehler: Inline `<p role="alert">` im Modal, Farbe `var(--color-error)`.

### Entzugs-Flow

1. Admin klickt „Entziehen" neben einem zugewiesenen Badge.
2. `RevokeCapabilityModal` öffnet sich mit:
   - Titel: „Capability entziehen"
   - Beschreibung: „Soll die Capability „{action.label_de}" von der Rolle „{role.label_de}" entzogen werden?"
   - Footer: `Button variant="secondary"` „Abbrechen" | `Button variant="danger"` „Capability entziehen"
   - Pending-State: Buttons disabled, Bestätigungs-Button zeigt „Wird verarbeitet …"
3. Bei HTTP 409 (Lockout-Guard): Inline-Fehler im Modal:
   „Diese Capability kann nicht entzogen werden — sie ist die letzte aktive Zuweisung für diese Action."
   Kein Toast. Modal bleibt offen mit Fehlermeldung, Admin kann nur Abbrechen.
4. Bei sonstigem Fehler: Inline `<p role="alert">` mit Fehlermeldung aus API-Response.
5. Bei Erfolg: Modal schließt, `loadData()` neu laden.

### Sofort-Wirksamkeits-Hinweis

Unter dem PageHeader ein dezenter Informationstext (kein Banner, kein Toast):

> „Änderungen an Capabilities werden nach dem Cache-Reload des Servers sofort aktiv. Kein Neustart erforderlich."

Implementierung: `<p>` mit `color: var(--color-text-secondary)`, `font-size: 0.875rem`,
`margin-bottom: var(--space-4)`.

---

## Copywriting Contract

| Element | Deutsch (korrekte Umlaute) |
|---------|---------------------------|
| Seitentitel (PageHeader) | Capability-Verwaltung |
| Seitenuntertitel | Capabilities (Berechtigungen) pro Rolle vergeben oder entziehen. |
| Sofort-Wirksamkeits-Hinweis | Änderungen werden nach dem Cache-Reload des Servers sofort aktiv. Kein Neustart erforderlich. |
| Primärer CTA | Capability vergeben |
| Entzugs-CTA | Entziehen |
| Kategorie-Filter-Placeholder | Alle Kategorien |
| Vergabe-Modal-Titel | Capability vergeben |
| Vergabe-Modal-Beschreibung | Soll die Capability „{action.label_de}" der Rolle „{role.label_de}" zugewiesen werden? |
| Vergabe-Modal-Bestätigung | Capability vergeben |
| Vergabe-Pending | Wird verarbeitet … |
| Entzugs-Modal-Titel | Capability entziehen |
| Entzugs-Modal-Beschreibung | Soll die Capability „{action.label_de}" von der Rolle „{role.label_de}" entzogen werden? |
| Entzugs-Modal-Bestätigung | Capability entziehen |
| Entzugs-Pending | Wird verarbeitet … |
| Lockout-Guard-Fehler (409) | Diese Capability kann nicht entzogen werden — sie ist die letzte aktive Zuweisung für diese Action. |
| Standalone-Aktions-Badge | Systemaktion |
| Standalone-Aktions-Tooltip (aria-label) | Systemaktion — nicht über Rollen konfigurierbar |
| Leer-Zustand Titel | Keine Capabilities gefunden |
| Leer-Zustand Body | Die Capability-Matrix konnte nicht geladen werden. Seite neu laden. |
| Lade-Zustand | Wird geladen … |
| Fehler-Zustand Titel | Fehler beim Laden |
| Fehler-Zustand Body | {Fehlermeldung aus API}. Seite neu laden oder erneut versuchen. |
| Admin-Übersicht Nav-Link | Capability-Verwaltung |
| Abbrechen | Abbrechen |

**Umlaut-Pflicht:** Alle obigen Strings verwenden ä/ö/ü/Ä/Ö/Ü/ß. ASCII-Ersatz (ae/oe/ue/ss)
ist in JSX-Textknoten, Button-Labels, aria-labels und Toast-Nachrichten verboten (CLAUDE.md).

---

## Zustandsmaschine (UI States)

```
LOADING
  └─→ ERROR (Fetch fehlgeschlagen)
  └─→ READY (Matrix geladen)
         ├── GRANT_CONFIRM (Modal offen: Vergabe)
         │      ├── GRANT_PENDING (API-Call läuft)
         │      │      ├── GRANT_ERROR (409 / 5xx — Modal bleibt offen)
         │      │      └── → LOADING (Reload nach Erfolg)
         │      └── → READY (Abbrechen)
         └── REVOKE_CONFIRM (Modal offen: Entzug)
                ├── REVOKE_PENDING (API-Call läuft)
                │      ├── REVOKE_ERROR_LOCKOUT (409 — Modal bleibt, Inline-Fehler)
                │      ├── REVOKE_ERROR_OTHER (5xx — Modal bleibt, Inline-Fehler)
                │      └── → LOADING (Reload nach Erfolg)
                └── → READY (Abbrechen)
```

---

## Barrierefreiheit (A11y)

| Anforderung | Implementierung |
|-------------|----------------|
| Fehler-Feedback | `<p role="alert">` im Modal, nicht nur visuell |
| Standalone-Aktion | `aria-label="Systemaktion — nicht über Rollen konfigurierbar"` auf Badge |
| Entzugs-Button | `aria-label="Capability {action.label_de} von Rolle {role.label_de} entziehen"` |
| Vergabe-Button | `aria-label="Capability {action.label_de} der Rolle {role.label_de} zuweisen"` |
| Pending-State | Buttons `disabled` während API-Call (verhindert Doppel-Submit) |
| Modal-Fokus | Modal aus `@/components/ui` — Fokus-Trap ist Pflicht der Primitiv-Implementierung |
| Tabellen-Header | `TableHeaderCell` für alle Spalten (Rollen + Actions) |

---

## Registry Safety

| Registry | Verwendete Blöcke | Safety Gate |
|----------|-------------------|-------------|
| shadcn offiziell | keine (kein shadcn im Projekt) | nicht anwendbar |
| Third-party | keine | nicht anwendbar |

Kein shadcn, keine Third-Party-Registries. Alle Komponenten sind projektintern unter
`frontend/src/components/ui/`. Registry-Vetting-Gate: nicht erforderlich.

---

## Entscheidungen aus Upstream-Artefakten (pre-populated)

| Entscheidung | Wert | Quelle |
|--------------|------|--------|
| Nur Plattform-Admin | `PlatformAdminGate` + `requirePlatformAdminIdentity` | CONTEXT D-04, Phase-80-Muster |
| Primitives-Pflicht | `@/components/ui` ausschließlich | CONTEXT D-05, CLAUDE.md |
| Umlaut-Pflicht | ä/ö/ü/ß in allen user-facing Strings | CLAUDE.md |
| Modulare Komponenten | <=450 Zeilen pro Datei | CLAUDE.md |
| Modal-Bestätigung | `Modal` aus `@/components/ui` mit footer-Prop | RESEARCH R-03, UserGlobalRolesTab.tsx |
| Lockout-Guard | HTTP 409 + Inline-Fehler, kein Toast | CONTEXT D-07, RESEARCH R-03 |
| Standalone-Aktions-Handling | read-only Badge, kein Button | RESEARCH R-03 (Open Question 2) |
| Sofort-Wirksamkeit nach Cache-Reload | dezenter Hinweistext unter PageHeader | CONTEXT D-06 |
| Audit-Seam | Backend schreibt nach Mutation (kein Frontend-Feedback nötig) | CONTEXT D-06, RESEARCH R-03 |
| Keine neue Migration | role_capabilities + action_definitions seit 0108 vorhanden | RESEARCH (Migrations-Stand) |
| Route-Platzierung | `/admin/role-capabilities` + Nav-Eintrag in `/admin/page.tsx` | RESEARCH (Recommended Structure), Claude's Discretion |
| Schriftart / Spacing / Color | Aus `globals.css` — keine neuen Token | Codebase-Scan |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

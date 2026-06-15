---
phase: 80
slug: admin-users-user-detail-drawer-scoped-rechte
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-15
reviewed_at: 2026-06-15
---

# Phase 80 — UI Design Contract

> Designvertrag für `/admin/users` + User Detail Drawer (scoped Rechte).
> Generiert von gsd-ui-researcher, geprüft durch gsd-ui-checker.

---

## Pflicht-Constraints (nicht verhandelbar)

| Constraint | Quelle | Regel |
|------------|--------|-------|
| Globale UI-Primitives PFLICHT | CLAUDE.md | Jede user-facing UI MUSS `@/components/ui` nutzen: Drawer, Tabs, Table, Badge, Select, FormField, Button, Input, Modal, Card, Pagination. Kein natives `<select>/<input>/<textarea>/<button>`. |
| Deutscher UI-Text mit Umlauten | CLAUDE.md | Alle Labels, Buttons, Badges, Tooltips, Fehlermeldungen, Platzhalter, aria-labels in korrekt umgelautetem Deutsch (ä/ö/ü/Ä/Ö/Ü/ß). ASCII-Ersetzungen (ae/oe/ue) verboten. |
| Dateigrösse <= 450 Zeilen | CLAUDE.md | Alle Produktcode-Dateien. Tab-Komponenten müssen als eigenständige Dateien unter `tabs/` extrahiert werden. |
| Kein Monolith-Muster | CONTEXT.md D-11 | Nicht das `/admin/fansubs/[id]/edit/page.tsx`-Monolith-Muster kopieren. Modulare Drawer-Tab-Komponenten als separate Dateien. |
| read-only vs. editierbar streng trennen | CONTEXT.md D-03, D-10 | Globale Rollen, Accountstatus, Übersicht, Audit: funktional/editierbar im Drawer. Scoped Gruppen-/Release-Rechte, Contributions, Medien: read-only, verlinken in kanonische Arbeitsflächen. |
| Kein Reuse-Bruch bei Phase-82/83-Arbeitsflächen | CONTEXT.md D-15, D-16 | `/me/releases/[versionId]/workspace`-Komponenten werden VERLINKT, nicht dupliziert. |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (kein shadcn) |
| Preset | not applicable |
| Component library | Projektinternes `@/components/ui` (handgefertigt, kein Radix/shadcn) |
| Icon library | lucide-react ^0.469.0 |
| Font | Inter, "Segoe UI", system-ui, sans-serif (via `--font-sans`) |

**Quelle:** `frontend/src/styles/globals.css`, `frontend/package.json` [VERIFIED]

---

## Spacing Scale

Projektdefinierte CSS-Custom-Properties aus `globals.css` (bereits vorhanden — nicht neu definieren):

| Token | CSS-Variable | Value | Usage in Phase 80 |
|-------|-------------|-------|-------------------|
| xs | `--space-1` | 4px | Icon-Abstände, Badge-interne Padding |
| sm | `--space-2` | 8px | Kompakte Listenzeilen, Button-Icons |
| md-sm | `--space-3` | 12px | Tab-Label-Padding, Badge-Gruppen |
| md | `--space-4` | 16px | Standard-Element-Abstand, Tabellenzeilen, Formularfelder |
| lg | `--space-5` | 24px | Abschnitt-Padding im Drawer, Tab-Content-Einzug |
| xl | `--space-6` | 32px | Layout-Lücken zwischen Drawer-Abschnitten |
| 2xl | `--space-7` | 48px | Grössere Seitenabschnitte (Listenheader) |
| 3xl | `--space-8` | 64px | Seitenweite Abstände (Page-Header zu Tabelle) |

Ausnahmen: Touch-Targets für Icon-Buttons mindestens 44px Klickfläche (`--control-height-md: 44px`, bereits in globals.css definiert).

---

## Typography

Projektdefinierte Schriftgrössen aus dem bestehenden System (nicht neu definieren):

| Role | Size | Weight | Line Height | Usage in Phase 80 |
|------|------|--------|-------------|-------------------|
| Body | 16px | 400 (regular) | 1.5 | Tabellenzeilen-Inhalt, Drawer-Fliesstext |
| Label | 14px | 700 (bold) | 1 | Button-Labels, Spaltenköpfe, Tab-Beschriftungen, Badge-Text |
| Heading | 20px | 700 (bold) | 1.2 | Drawer-Titel (Benutzername), Drawer-Tab-Überschriften |
| Display | 28px | 700 (bold) | 1.2 | Page-Header „Benutzer" (via PageHeader-Primitiv) |

**Gewichte:** Nur 400 (regular) und 700 (bold). Kein Medium/500/600.

---

## Color

Projektdefinierte CSS-Custom-Properties (bereits vorhanden):

| Role | CSS-Variable | Beispielwert | Usage |
|------|-------------|--------------|-------|
| Dominant (60%) | `--surface-canvas` | `#f6f4ef` | Seitenhintergrund `/admin/users` |
| Secondary (30%) | `--surface-card` | `#ffffff` | Tabellenzeilen-Cards, Drawer-Hintergrund, Tab-Content-Bereiche |
| Accent (10%) | `--color-primary` | `#5f84dd` | Primär-CTA „Rolle vergeben", aktive Tab-Unterstriche, tiefe Links nach scoped Arbeitsflächen |
| Destructive | `--color-error` | `#dc3545` | Ausschliesslich für: „Deaktivieren"-Bestätigung, „Rolle entziehen"-Bestätigung |
| Warn | `--color-warning` | `#ffc107` | Konflikt-Badges in der Listenzeile und im Übersicht-Tab |

Accent reserviert für:
- Primär-CTA-Button „Rolle vergeben" (globale Rollen Tab)
- Button „Reaktivieren" (Accountstatus-Abschnitt, Übersicht)
- Tiefe Links zu `/admin/fansubs/[id]/edit` und `/me/releases/[versionId]/workspace`
- Aktiver Tab-Indikator im Drawer

---

## Copywriting Contract

Alle Texte auf Deutsch mit korrekten Umlauten.

### Listenebene `/admin/users`

| Element | Copy |
|---------|------|
| Page-Titel (PageHeader) | Benutzer |
| Suche Placeholder | Name oder E-Mail-Adresse suchen … |
| Filter-Label Accountstatus | Accountstatus |
| Filter-Option: alle | Alle Status |
| Filter-Option: aktiv | Aktiv |
| Filter-Option: ausstehend | Ausstehend |
| Filter-Option: deaktiviert | Deaktiviert |
| Filter-Label globale Rolle | Globale Rolle |
| Filter-Option: alle | Alle Rollen |
| Filter-Option: platform_admin | Plattform-Admin |
| Filter-Option: content_admin | Content-Admin |
| Filter-Option: user | Benutzer |
| Filter-Label Konflikte | Nur mit Konflikten |
| Sortierung Label | Sortierung |
| Sortierung Option | Letzte Aktivität |
| Leerer Zustand (keine Nutzer) | Keine Benutzer gefunden |
| Leerer Zustand Body | Passen Sie Ihre Suchkriterien an oder prüfen Sie die aktiven Filter. |
| Fehler beim Laden | Benutzerliste konnte nicht geladen werden. Bitte Seite neu laden. |

### Tabellenköpfe

| Spalte | Copy |
|--------|------|
| 1 | Benutzer |
| 2 | Status |
| 3 | Globale Rollen |
| 4 | Member-Profil |
| 5 | Gruppen |
| 6 | Leader-Kontext |
| 7 | Offene Claims |
| 8 | Beiträge |
| 9 | Medienuploads |
| 10 | Letzte Aktivität |
| 11 | Konflikte |

### Konflikt-Badge

| Element | Copy |
|---------|------|
| Badge (singular) | 1 Konflikt |
| Badge (plural, N > 1) | N Konflikte |
| Badge variant | `warning` |

### Drawer

| Element | Copy |
|---------|------|
| Drawer-Titel | Benutzer: {display_name} |
| Tab 1 | Übersicht |
| Tab 2 | Globale Rollen |
| Tab 3 | Member-Profil & Claims |
| Tab 4 | Gruppenmitgliedschaften |
| Tab 5 | Gruppenrechte |
| Tab 6 | Beiträge |
| Tab 7 | Medien |
| Tab 8 | Audit |
| Tab 9 | Streaming (Stub) |

### Drawer — Tab-Ladezustände (pro Tab, lazy)

| Element | Copy |
|---------|------|
| Ladezustand | Daten werden geladen … |
| Leerer Zustand (generisch) | Keine Einträge vorhanden. |
| Fehler beim Tab-Laden | Daten konnten nicht geladen werden. Erneut versuchen. |
| Retry-Button | Erneut versuchen |

### Drawer — Übersicht-Tab

| Element | Copy |
|---------|------|
| Abschnitt Zusammenfassung | Übersicht |
| Label globale Rollen | Globale Rollen |
| Label Gruppen | Gruppen |
| Label offene Claims | Offene Claims |
| Label offene Beiträge | Offene Beiträge |
| Label Release-Arbeitsflächen | Release-Arbeitsflächen |
| Label Mediauploads | Mediauploads |
| Label Konflikte | Konflikte |
| Abschnitt Konflikte (wenn vorhanden) | Erkannte Konflikte |
| Konflikt: offener Claim trotz Profil | Offener Claim, obwohl Member-Profil bereits verknüpft ist. |
| Konflikt: Mitglied ohne Rolle | Gruppenmitglied ohne zugewiesene Rolle. |
| Konflikt: Medien ohne Scope | Medienupload ohne gültigen Berechtigungsscope. |
| Konflikt: offener Dispute | Offener Beitrags-Streitfall. |
| Konflikt: Override auf ungültige Version | Beitrags-Override verweist auf eine gelöschte oder ungültige Release-Version. |
| Konflikt: Default/Override-Widerspruch | Projektweiter Beitrag, aber nicht im Release-Override-Satz enthalten. |
| Konflikt: Medien ohne aufgelöste Berechtigung | Medienupload ohne aufgelöste Beitrags-Berechtigung für diese Release-Version. |

### Drawer — Globale Rollen Tab (editierbar)

| Element | Copy |
|---------|------|
| Abschnitt | Aktive Rollen |
| Primär-CTA | Rolle vergeben |
| CTA Rolle entziehen | Rolle entziehen |
| Modal-Titel Vergabe | Globale Rolle vergeben |
| Modal-Titel Entzug | Globale Rolle entziehen |
| Modal-Body Entzug | Soll die Rolle „{rolle}" von {display_name} entzogen werden? |
| Bestätigung Entzug | Rolle entziehen |
| Abbruch | Abbrechen |
| Erfolg Vergabe | Rolle wurde erfolgreich vergeben. |
| Erfolg Entzug | Rolle wurde erfolgreich entzogen. |
| Guard letzter Admin | Die letzte Plattform-Admin-Rolle kann nicht entzogen werden. |
| Leerer Zustand | Diesem Benutzer sind keine globalen Rollen zugewiesen. |

### Drawer — Accountstatus (in Übersicht-Tab)

| Element | Copy |
|---------|------|
| Status: aktiv | Aktiv |
| Status: ausstehend | Ausstehend |
| Status: deaktiviert | Deaktiviert |
| CTA deaktivieren | Konto deaktivieren |
| CTA reaktivieren | Konto reaktivieren |
| Modal-Titel deaktivieren | Konto deaktivieren |
| Modal-Body deaktivieren | Das Konto von {display_name} wird deaktiviert. Der Benutzer verliert den Plattformzugang sofort. |
| Bestätigung deaktivieren | Jetzt deaktivieren |
| Abbruch | Abbrechen |
| Erfolg deaktivieren | Konto wurde deaktiviert. |
| Erfolg reaktivieren | Konto wurde reaktiviert. |
| Guard letzter Admin (deaktivieren) | Das Konto des letzten aktiven Plattform-Admins kann nicht deaktiviert werden. |

### Drawer — Member-Profil & Claims Tab (read-only)

| Element | Copy |
|---------|------|
| Abschnitt Profil | Member-Profil |
| Profilstatus: aktiv | Aktiv |
| Profilstatus: memorial | Gedenkprofil |
| Kein Profil verknüpft | Kein Member-Profil verknüpft. |
| Abschnitt Claims | Claims & Einladungen |
| Claim-Status: verifiziert | Verifiziert |
| Claim-Status: offen | Offen |
| Claim-Status: abgelehnt | Abgelehnt |

### Drawer — Gruppenmitgliedschaften Tab (read-only)

| Element | Copy |
|---------|------|
| Leerer Zustand | Keine Gruppenmitgliedschaften vorhanden. |
| Link nach Gruppe | In Gruppe öffnen |

### Drawer — Gruppenrechte Tab (read-only)

| Element | Copy |
|---------|------|
| Hinweistext | Gruppenrechte können in der jeweiligen Gruppenansicht bearbeitet werden. |
| Link Label | Gruppe bearbeiten |
| Leerer Zustand | Keine scoped Gruppenrechte vorhanden. |

### Drawer — Beiträge Tab (read-only, D-13)

| Element | Copy |
|---------|------|
| Gruppe A | Projektweite Beiträge (Standard) |
| Gruppe B | Release-spezifische Overrides |
| Gruppe C | Offene / strittige Beiträge |
| Gruppe D | Historisch / Legacy |
| Leerer Zustand | Keine Beiträge vorhanden. |
| Link zu Release-Version | Release-Version öffnen |

### Drawer — Medien Tab (read-only, D-15)

| Element | Copy |
|---------|------|
| Abschnitt | Mediauploads nach Release-Version |
| Scope-Status: gültig | Berechtigung aktiv |
| Scope-Status: ungültig | Berechtigung fehlt |
| Link zur Arbeitsfläche | Arbeitsfläche öffnen |
| Leerer Zustand | Keine Mediauploads vorhanden. |

### Drawer — Audit Tab

| Element | Copy |
|---------|------|
| Abschnitt | Aktivitätsprotokoll |
| Leerer Zustand | Keine Audit-Einträge vorhanden. |
| Ergebnis: erlaubt | Erlaubt |
| Ergebnis: verweigert | Verweigert |

### Drawer — Streaming-Grants Tab (Stub, D-04)

| Element | Copy |
|---------|------|
| Stub-Hinweis | Streaming-Grants sind in dieser Version noch nicht konfigurierbar. |

---

## Komponentenstruktur und Datei-Layout

Diese Vorgaben gelten für den Executor als Pflicht-Layout (D-11, <= 450 Zeilen pro Datei):

```
frontend/src/app/admin/users/
├── page.tsx                    — Route-Shell mit PlatformAdminGate; kein Tab-State
├── AdminUsersClient.tsx        — Filter, Tabellenstate, Drawer-Open-State
├── UserDetailDrawer.tsx        — Drawer-Wrapper + Tab-Komposition (keine Tab-Logik inline)
└── tabs/
    ├── UserOverviewTab.tsx     — Zusammenfassung + Konflikte + Accountstatus-Mutation
    ├── UserGlobalRolesTab.tsx  — Globale Rollen Assign/Revoke + Modal
    ├── UserClaimsTab.tsx       — Claims + Einladungen read-only
    ├── UserMembershipsTab.tsx  — Gruppenmitgliedschaften read-only
    ├── UserGroupRightsTab.tsx  — Scoped Rechte read-only + Deep Links
    ├── UserContributionsTab.tsx — Phase-83-Contributions read-only, gruppiert
    ├── UserMediaTab.tsx        — Medien-Uploads read-only, release-version-scoped
    └── UserAuditTab.tsx        — Audit-Timeline read-only
```

Jede Tab-Datei importiert ausschliesslich `@/components/ui`-Primitives. Kein inline-JSX für Elemente, die als Primitiv existieren.

---

## Interaction Contracts

### Listenebene

| Interaction | Verhalten |
|-------------|-----------|
| Suche (Name/E-Mail) | Debounced 300ms, Server-seitige Query, URL-State für Teilen |
| Filter Accountstatus | Select-Primitiv, sofortiger Reload, URL-State |
| Filter Globale Rolle | Select-Primitiv, sofortiger Reload, URL-State |
| Filter „Nur mit Konflikten" | Checkbox oder Toggle, sofortiger Reload |
| Sortierung | Standardmässig „Letzte Aktivität absteigend"; kein weiteres UI-Sort nötig für v1 |
| Pagination | `Pagination`-Primitiv, server-seitig, Seite in URL-State |
| Tabellenzeile klicken | Öffnet Drawer für diesen Benutzer |
| Conflict-Badge in Zeile | Visueller Hinweis via `Badge variant="warning"`, kein eigenständiger Klickziel |

### Drawer

| Interaction | Verhalten |
|-------------|-----------|
| Drawer öffnen | Right-Slide-Over via `Drawer`-Primitiv; kein Full-Screen auf Desktop |
| Drawer schliessen | × Icon oben rechts (`aria-label="Drawer schließen"` — sofern die `@/components/ui/Drawer`-Primitive das Schließen-Icon nicht bereits intern mit Accessibility-Label rendert); ESC-Taste; Klick ausserhalb |
| Tab wechseln | `Tabs`-Primitiv; Tab-Daten werden erst beim ersten Aktivieren geladen (D-09) |
| Tab lazy load | Ladezustand: `LoadingState`-Primitiv; Fehler: `ErrorState`-Primitiv mit Retry |
| Tab leer | `EmptyState`-Primitiv |
| Globale Rolle vergeben | Button öffnet `Modal`-Primitiv mit `Select` für Rollenwahl + Bestätigung |
| Globale Rolle entziehen | Button pro Rolle öffnet `Modal`-Primitiv mit Bestätigungstext |
| Accountstatus deaktivieren | Button „Konto deaktivieren" öffnet `Modal`-Primitiv mit Bestätigung |
| Accountstatus reaktivieren | Button „Konto reaktivieren" ohne Modal (nicht destruktiv), direkte Mutation |
| Deep Link Gruppe | `<a>`-Link oder Button „In Gruppe öffnen" → `/admin/fansubs/[id]/edit` neuer Tab |
| Deep Link Release-Arbeitsfläche | Button „Arbeitsfläche öffnen" → `/me/releases/[versionId]/workspace` neuer Tab |
| Streaming-Grants-Tab | Stub: kein Button, kein Formular, nur Hinweistext |

### Mutation-Feedback

| Zustand | Feedback |
|---------|----------|
| Mutation in Progress | Button disabled + Lade-Indikator (Spinner im Button) |
| Mutation Erfolg | Toast-Benachrichtigung mit Erfolgstext; Drawer-Daten für betroffenen Tab neu laden |
| Mutation Fehler | Fehlermeldung inline im Modal (kein globaler Toast für Fehler) |
| Last-Admin-Guard | Inline-Fehler im Modal, Modal bleibt offen |

---

## Tabellenspaltendefinition

Reihenfolge und Inhalt gemäss D-05 (alle Aggregate müssen vertreten sein):

| # | Spalte | Inhalt | Notiz |
|---|--------|--------|-------|
| 1 | Benutzer | Avatar + display_name + E-Mail (kompakt gestapelt) | Erste Spalte, breiteste |
| 2 | Status | `Badge` (success=aktiv, warning=ausstehend, danger=deaktiviert) | |
| 3 | Globale Rollen | Comma-Liste oder Badge-Gruppe (max. 2 sichtbar, Rest „+N") | |
| 4 | Member-Profil | Grüner Haken / Strich; ggf. Profilname | |
| 5 | Gruppen | Anzahl-Zahl + kompakte Gruppenlogos (max. 3, Rest „+N") | |
| 6 | Leader-Kontext | Anzahl Gruppen, in denen Leader | |
| 7 | Offene Claims | Zahl; `Badge variant="warning"` wenn > 0 | |
| 8 | Beiträge | Offene Beiträge / Gesamt (z.B. „2/14") | |
| 9 | Medien | Anzahl Uploads | |
| 10 | Letzte Aktivität | Relatives Datum (z.B. „vor 3 Tagen") | |
| 11 | Konflikte | `Badge variant="warning"` mit Zahl; leer wenn 0 | Letzte Spalte |

**Compact-Regel:** Alle Spalten in eine Zeile; keine Wrap-Zeilen im Table-Body. Bei sehr schmalen Viewports können Spalten 6–9 mit einem horizontalen Scroll ausgeblendet werden.

---

## Drawer Übersicht-Tab — Layout

```
[Status-Badge] [display_name]            [Konto deaktivieren / Reaktivieren Button]

Zusammenfassung
┌─────────────────────────────────────────────────────────┐
│ Globale Rollen  │ Gruppen │ Claims │ Beiträge            │
│ 2               │ 3       │ 1      │ 14                  │
├─────────────────────────────────────────────────────────┤
│ Release-Arbeitsflächen │ Medien │ Konflikte             │
│ 5                      │ 12     │ 2                     │
└─────────────────────────────────────────────────────────┘

Erkannte Konflikte  [Badge warning "2 Konflikte"]
─────────────────────────────────────────────────
• Offener Claim, obwohl Member-Profil bereits verknüpft ist.
• Beitrags-Override verweist auf eine gelöschte oder ungültige Release-Version.
```

Kompakt-Zahlen als Stat-Grid, Konflikte als bulleted Liste darunter.

---

## Drawer Beiträge-Tab — Gruppierungsstruktur (D-13)

```
Projektweite Beiträge (Standard)
─────────────────────────────────────────────────
Anime: [Titel]    Gruppe: [Gruppenname]    Rollen: Übersetzer, Timer

Release-spezifische Overrides
─────────────────────────────────────────────────
Anime: [Titel]    Release-Version: [ID/Name]    Rollen: Übersetzer

Offene / strittige Beiträge
─────────────────────────────────────────────────
[falls vorhanden]

Historisch / Legacy
─────────────────────────────────────────────────
[via fansub_group_member_id, read-only]
```

Jede Gruppe als eigener Abschnitt via `SectionHeader`-Primitiv. Leere Gruppen werden ausgeblendet.

---

## Drawer Medien-Tab — Gruppierungsstruktur (D-15)

```
[Anime-Titel] — [Release-Version-Name]
─────────────────────────────────────────────────
[Vorschaubild / Medientyp]  Hochgeladen: [Datum]
Berechtigung: [Badge success "Berechtigung aktiv" / Badge warning "Berechtigung fehlt"]
[Button "Arbeitsfläche öffnen" → /me/releases/[versionId]/workspace]
```

Gruppiert nach Anime, dann Release-Version. Berechtigung wird aus Phase-83-Auflösung abgeleitet (resolved read-only, D-14).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | keine (shadcn nicht initialisiert) | nicht anwendbar |
| Drittanbieter | keine | nicht anwendbar |

Keine neuen externen Pakete für Phase 80. Alle benötigten Abhängigkeiten sind bereits im Projekt vorhanden. [Quelle: RESEARCH.md Package Legitimacy Audit]

---

## Quellennachweis (Pre-populated from)

| Quelle | Entscheidungen / Felder |
|--------|------------------------|
| CONTEXT.md | D-01 bis D-19: alle Edit-/read-only-Scopes, Tab-Reihenfolge, Konflikt-Typen, Reuse-Vorgaben |
| RESEARCH.md | Stack, Primitives-Bestätigung, Phase-83-Auflösung, SQL-Pattern, Accountstatus-Authority |
| globals.css | Spacing-Scale (--space-1 bis --space-8), Farbvariablen, Kontroll-Höhen |
| ui.module.css | Button-Grössen, Typografie-Defaults |
| Badge.tsx | Verfügbare Varianten: neutral/success/warning/danger/info/muted |
| CLAUDE.md | Pflicht-UI-Primitives, Umlaut-Regel, 450-Zeilen-Limit |
| Nutzer-Input | keiner nötig — alle Design-Entscheidungen durch Upstream-Artefakte beantwortet |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

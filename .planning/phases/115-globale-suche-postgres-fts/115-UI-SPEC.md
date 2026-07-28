---
phase: 115
slug: globale-suche-postgres-fts
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-28
reviewed_at: 2026-07-28
---

# Phase 115 — UI Design Contract: Globale Suche

> Visueller und Interaktions-Vertrag für die Frontend-Oberfläche der globalen Suche
> (Anime + Fansubgruppen). Erzeugt von gsd-ui-researcher, verifiziert von gsd-ui-checker.
>
> Scope = **Teilphase C** aus 115-RESEARCH.md Punkt 12 (Frontend-Suchoberfläche). Backend/
> Migrationen (`GET /api/v1/search`, Trigram-/`unaccent`-Indizes, Titel-Fix) sind **nicht**
> Teil dieses UI-Vertrags, werden hier aber als Datenquelle vorausgesetzt.

---

## Locked Project Constraints (NICHT verhandelbar — aus ./CLAUDE.md)

Diese drei Regeln sind gesetzt und werden vom UI-Checker als Gate geprüft. Sie sind **keine**
offenen Fragen:

1. **Globales Design-System ist PFLICHT.** Jedes user-facing UI-Element MUSS die Primitives aus
   `@/components/ui` nutzen (`Button`, `Input`, `Select`, `FormField`, `Tabs`, `Drawer`, `Card`,
   `Badge`, `Pagination`, `EmptyState`, `ErrorState`, `LoadingState`, `PageHeader`, `SectionHeader`
   …). Referenz-Showcase: Route `/dev/ui-system`. Handgebaute native `<select>`, `<input>`,
   `<textarea>`, `<button>` oder Eigen-Markup für einen bereits vorhandenen Primitiv-Typ sind
   **verboten**. Lokale Datei-Konsistenz rechtfertigt KEIN Abweichen.
   → **`frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowserFilters.tsx` ist eine
   BESTEHENDE VERLETZUNG** (rohe `<input>`/`<button>`, Zeilen 56–73) und darf NICHT als
   Pattern/Analog für die neue Suchoberfläche dienen.
2. **Sprachqualität — Umlaute.** Alle deutschen user-facing Strings (JSX-Text, Button-Labels,
   Fehlermeldungen, Placeholder, `aria-label`, Toasts) MÜSSEN korrekte Umlaute verwenden
   (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersatz (ae/oe/ue/ss) ist **verboten** in user-facing Strings.
3. **Modularität — 450-Zeilen-Limit.** Produktionsdateien ≤ 450 Zeilen. Die Suchseite ist in
   kleinere Komponenten aufzuteilen (Suchfeld, Vorschlagsliste, Ergebnisliste, Filterleiste,
   Filter-Drawer, Hooks) statt in einer Monolithdatei.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | **none** — hauseigenes CSS-Modul-Design-System (`@/components/ui`, `ui.module.css`) |
| Preset | not applicable |
| Component library | keine externe (kein shadcn/Radix/Tailwind); eigene Primitives über CSS-Modules |
| Icon library | `lucide-react` (^0.469.0) |
| Font | Inter (`--font-sans`: Inter, "Segoe UI", system-ui, sans-serif) |

**shadcn-Gate:** übersprungen. `components.json` nicht vorhanden und durch CLAUDE.md-Pflicht auf
`@/components/ui` **bewusst ausgeschlossen** — shadcn-Init würde gegen die gesetzte Projekt-Konvention
verstoßen. Registry-Safety-Gate: nicht anwendbar (keine Registry).

**Design-Tokens sind bereits definiert** in `frontend/src/styles/globals.css` (`:root`) und
`ui.module.css`. Es werden **keine neuen Tokens erfunden** — die Suche verwendet ausschließlich
vorhandene CSS-Variablen. Alle unten deklarierten Werte sind aus diesen Dateien abgeleitet.

---

## Spacing Scale

Vorhandene Tokens aus `globals.css` (`--space-*`), alle Vielfache von 4:

| Token | Variable | Value | Usage in der Suche |
|-------|----------|-------|--------------------|
| xs | `--space-1` | 4px | Icon-Gaps, Chip-Innenabstand |
| sm | `--space-2` | 8px | Abstand Label↔Feld, Chip-Gaps |
| — | `--space-3` | 12px | Kompakte Listenzeilen (Vorschlagszeile) |
| md | `--space-4` | 16px | Standard-Elementabstand, Card-Padding |
| lg | `--space-5` | 24px | Abschnitts-Padding, Ergebniskarten-Gap |
| xl | `--space-6` | 32px | Layout-Gaps, Seiten-vertikal |
| 2xl | `--space-7` | 48px | Große Abschnittsbrüche |
| 3xl | `--space-8` | 64px | Seiten-Rand vertikal |

Zusätzliche Layout-Tokens: Container-Breite über `--public-page-max-width` (1360px, ab 1600px:
1480px) + `--public-page-gutter`. Touch-Targets: Control-Höhen `--control-height-sm/md/lg`
(36/44/52px) — mobile Filter-Buttons und Suchfeld mindestens `--control-height-md` (44px).

Exceptions: `--space-3` (12px) ist ein bestehender Token außerhalb des reinen 8-Punkt-Rasters,
zulässig für kompakte Vorschlagszeilen (bereits im System etabliert).

---

## Typography

Basis: `body { font-size: 16px; line-height: 1.5 }`, `.eyebrow { 14px, uppercase, letter-spacing 0.08em }`.
Genau **2 Gewichte** (400 regular, 600 semibold), **4 Rollen**:

| Role | Size | Weight | Line Height | Usage in der Suche |
|------|------|--------|-------------|--------------------|
| Body | 16px | 400 | 1.5 | Vorschlags-/Ergebnistext, Beschreibungen |
| Label | 14px | 600 | 1.3 | Gruppen-Header ("Anime"/"Fansubgruppen"), Filter-Labels, Eyebrow (uppercase) |
| Heading | 20px | 600 | 1.2 | Abschnittsüberschrift, Tab-Titel-Kontext |
| Display | 28px | 600 | 1.2 | Seitentitel „Suche" (PageHeader) |

Sekundärtext (Trefferzahlen, Meta, Jahr/Typ) nutzt `--text-soft`/`--text-faint` bei 14px/400.

---

## Color

**Visueller Fokuspunkt:** Das zentrale Suchfeld ist der primäre visuelle Anker der Seite —
Blickfang Nr. 1 oben, vor Tabs/Filtern/Ergebnissen. Executor darf die visuelle Priorität nicht
raten: Suchfeld dominiert das obere Drittel, alles Weitere ordnet sich darunter unter.

60/30/10-Aufteilung, ausschließlich vorhandene Tokens:

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surface-canvas` #f6f4ef | Seiten-Hintergrund der Suchseite |
| Secondary (30%) | `--surface-card` #ffffff | Ergebniskarten, Vorschlags-Dropdown, Filter-Drawer, Nav-Drawer |
| Accent (10%) | `--color-primary` #5f84dd | siehe Reserved-Liste unten |
| Destructive | `--color-error` #dc3545 | **In dieser Phase NICHT verwendet** — keine destruktiven Aktionen in der Suche |

Accent (`--color-primary` #5f84dd) ist **ausschließlich** reserviert für:
- primären „Suchen"-Button (`Button variant="primary"`),
- aktiven Tab-Indikator auf der Ergebnisseite (Anime / Fansubgruppen / Alle),
- Fokus-/Aktiv-Zustand des zentralen Suchfelds und des aktiven Nav-Eintrags „Suche",
- ausgewählte (aktive) Filter-Chips,
- Hervorhebung des aktiv per Tastatur markierten Vorschlags in der Dropdown-Liste.

Accent ist **NICHT** für „alle interaktiven Elemente" — sekundäre Buttons, inaktive Chips,
Trefferzahl-Badges und Meta-Text bleiben neutral (`--text-soft`, `--border-subtle`,
`Badge variant="neutral"`/`"muted"`). Fokus-Ringe nutzen die vorhandenen Tokens
`--focus-ring`/`--focus-outline`.

---

## Copywriting Contract

Alle Strings Deutsch mit korrekten Umlauten (Constraint 2). `{query}` = eingegebener Suchbegriff.

| Element | Copy |
|---------|------|
| Seitentitel (PageHeader) | „Suche" |
| Suchfeld-Placeholder | „Anime oder Fansubgruppe suchen …" |
| Suchfeld aria-label | „Suchbegriff eingeben" |
| Primary CTA | „Suchen" |
| Vorschlags-Gruppe 1 (Header) | „Anime" |
| Vorschlags-Gruppe 2 (Header) | „Fansubgruppen" |
| Vorschlag „alle anzeigen" | „Alle Treffer für „{query}" anzeigen" |
| Ergebnis-Tab 1 | „Alle" |
| Ergebnis-Tab 2 | „Anime" |
| Ergebnis-Tab 3 | „Fansubgruppen" |
| Trefferzahl-Format | „{n} Treffer" (Singular: „1 Treffer") |
| Filter zurücksetzen | „Filter zurücksetzen" |
| Filter anwenden (mobil) | „Filter anwenden" |
| Filter öffnen (mobil) | „Filter" |
| Filter-Chip entfernen (aria-label) | „Filter {name} entfernen" |
| Empty — Initialzustand (Heading) | „Wonach suchst du?" |
| Empty — Initialzustand (Body) | „Gib einen Anime-Titel oder eine Fansubgruppe ein, um loszulegen." |
| Empty — keine Treffer (Heading) | „Keine Treffer für „{query}"" |
| Empty — keine Treffer (Body) | „Prüfe die Schreibweise oder versuche einen kürzeren bzw. alternativen Begriff." |
| Empty — zu kurz (Body) | „Bitte gib mindestens 2 Zeichen ein." |
| Error state (Heading) | „Suche nicht verfügbar" |
| Error state (Body) | „Die Suche konnte gerade nicht ausgeführt werden. Bitte versuche es in einem Moment erneut." |
| Loading state (Heading) | „Suche läuft" |
| Loading state (Body) | „Passende Anime und Fansubgruppen werden geladen." |
| Nav-Eintrag Label | „Suche" |

**Fehlerzustand-Umsetzung:** vorhandenen Helper `getErrorStateCopy(error, { defaultTitle:
'Suche nicht verfügbar', defaultDescription: '…' })` aus `@/components/ui/ErrorState` nutzen —
er behandelt 403 bereits separat („Keine Berechtigung"). Kein eigenes Fehler-Mapping neu bauen.

**Destruktive Aktionen:** keine in dieser Phase. Suche ist rein lesend (kein Löschen/Ändern),
daher keine Bestätigungsdialoge.

---

## Component Inventory (nur Primitives aus `@/components/ui`)

| Screen-Element | Primitiv | Contract |
|----------------|----------|----------|
| Zentrales Suchfeld | `Input` (+ `FormField` bei Bedarf) | `lucide-react` Such-Icon inline; Placeholder + aria-label gemäß Copy; Debounce siehe Interaktion |
| Vorschlags-Dropdown | `Card` als Container + Liste | zwei Gruppen (`SectionHeader`/Label je Gruppe), Trefferzahl je Gruppe als `Badge variant="neutral"` |
| Ergebnis-Tabs | `Tabs` (`TabItem[]`) | `id`=`alle`/`anime`/`fansub`, `label` gemäß Copy, `badge`=Trefferzahl (`Badge`) |
| Ergebniskarte | `Card` | Titel (Body/600), Meta (Jahr/Typ bzw. Slug) in `--text-soft`; klickbar → Detailseite |
| Filter-Chips | `Badge` (aktiv = accent) + `Button variant="ghost/secondary"` zum Entfernen | aktive Filter als entfernbare Chips über der Ergebnisliste; icon-only Entfernen-Button trägt `aria-label` „Filter {name} entfernen" (siehe Copywriting) |
| Filter-Steuerung | `Select`, `YearPicker`/`DatePicker`, `FormField` | Genre, Tag, Typ/Format, Jahr-von/-bis, Status, Fansubgruppe (Verfügbarkeit gegen Datenmodell, D-06) |
| Mobile Filter | `Drawer` (`variant="side"` oder Bottom-Sheet) | Öffnen via `Button` „Filter"; Footer mit „Filter anwenden" + „Filter zurücksetzen" |
| Paginierung | `Pagination` (`currentPage`, `totalPages`, `onPageChange`) | pro Tab; Seitenzustand in URL |
| Leerzustände | `EmptyState` | zwei Varianten (Initial / keine Treffer), Copy oben |
| Ladezustand | `LoadingState` | während laufender Suche/Suggestions |
| Fehlerzustand | `ErrorState` + `getErrorStateCopy` | inkl. Retry-`action` (`Button` „Erneut versuchen") |
| Seitengerüst | `PageHeader` / `SectionHeader` | Titel „Suche", konsistent mit öffentlichen Seiten |

Neue Client-Utilities (kein Primitiv, aber wiederverwendbar, ≤450 Z.): `useDebouncedSearch`-Hook
(Debounce + `AbortController` + URL-`searchParams`-Sync), gemäß 115-RESEARCH.md Punkt 9.

---

## Interaction Contract

| Verhalten | Contract |
|-----------|----------|
| Search-as-you-type | Vorschläge ab **≥ 2 Zeichen**; Debounce **250 ms** vor Request |
| Request-Abbruch | jeder neue Tastendruck bricht den vorherigen Request via `AbortController` ab (keine veralteten Ergebnisse) |
| Gruppierte Vorschläge | getrennt „Anime" / „Fansubgruppen", je Gruppe begrenzt (z. B. max 5), + „Alle Treffer anzeigen"-Zeile |
| URL-Suchzustand | `q`, aktiver `type`/Tab, Filterwerte und `page` in `useSearchParams` gespiegelt → Ergebnisse sind per Link teilbar; Reload stellt Zustand wieder her |
| Tastaturbedienung | Suchfeld → ↓/↑ navigiert Vorschläge, Enter aktiviert markierten Vorschlag bzw. löst Vollsuche aus, Esc schließt Dropdown; Fokusführung sichtbar über `--focus-ring` |
| Fokus-Management | beim Schließen des Dropdowns/Drawers Fokus zurück auf auslösendes Element; Drawer trappt Fokus (Primitiv-Verhalten) |
| Trefferzahlen | pro Entitätstyp/Tab als `Badge`; nur anzeigen, wenn Backend sie liefert (D-06: „sofern mit vertretbarem Aufwand") |
| Sichtbarkeit | Suche ist im **anonymen UND authentifizierten** Zustand erreichbar (siehe Nav-Aktivierung); Backend filtert Sichtbarkeit (Anime `status<>disabled`), aufgelöste Fansubgruppen (`dissolved`) **erscheinen** (D-11) |
| Kein Layout-Shift | Ladezustand ersetzt Ergebnisbereich flächengleich (kein Springen der Filterleiste) |

---

## Navigation Activation Contract (`AppShell.tsx`)

AppShell ist **eine einzige responsive Komponente** (ein Slide-in-Drawer, kein getrenntes
Desktop-/Mobile-Rendering) — eine Nav-Änderung wirkt automatisch auf beide Formfaktoren.
Der „Suche"-Eintrag MUSS in **beiden** Nav-Gruppen bereitgestellt werden:

| Ort | Ist-Zustand (verifiziert) | Soll |
|-----|---------------------------|------|
| `AppShellAnonNavGroups` (anonym, `AppShell.tsx:189–190`) | toter Eintrag „Suche", `disabled: true, badge: 'bald'` | aktivieren: `href: '/suche'`, `disabled`+`badge` entfernen, `current`-Erkennung ergänzen |
| `AppShellNavGroups` (authentifiziert, `AppShell.tsx:120–124`) | **KEIN** „Suche"-Eintrag vorhanden | neuen Eintrag „Suche" ergänzen: `href: '/suche'`, `current: isCurrent(currentPath, '/suche')` |

- Route: **`/suche`** (deutschsprachig, konsistent mit `/anime`, `/members/ranking`).
- Icon: `Search` aus `lucide-react` (Größe 17, passend zum bestehenden `AppShellNavItem`-Muster);
  ersetzt den Platzhalter-`Compass` des toten Eintrags.
- Label: „Suche". Kein `badge`, kein `disabled` mehr.
- Nav-Item-Shape unverändert (`AppShellNavItem = { label, href?, icon, current?, disabled?, badge? }`).

---

## Accessibility

- Suchfeld mit `aria-label` „Suchbegriff eingeben"; Vorschlags-Dropdown als `role="listbox"`
  mit `aria-activedescendant` für Tastaturmarkierung (Combobox-Muster).
- Trefferzahlen und Zustandswechsel (Laden/Leer/Fehler) über `aria-live="polite"` ankündigen.
- Filter-Drawer: fokussierbar, schließbar per Esc, sichtbarer Fokus-Ring (`--focus-outline`).
- Touch-Targets ≥ 44px (`--control-height-md`) für Suchfeld und mobile Filter-Buttons.
- Farbkontrast: Body-Text `--text-body` auf `--surface-card`/`--surface-canvas` erfüllt WCAG AA;
  Accent nur für Zustände, nie als alleiniger Bedeutungsträger (immer + Text/Icon).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| — (keine Registry / kein shadcn) | keine | not applicable |

Kein shadcn und keine Drittanbieter-Registry im Einsatz. Alle Komponenten stammen aus dem
hauseigenen `@/components/ui`. Registry-Vetting-Gate entfällt.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS (2 FLAGs behoben — Fokuspunkt explizit, Chip-Entfernen `aria-label` ergänzt)
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS (nicht anwendbar — keine Registry)
- [x] Project-Gate: nur `@/components/ui`-Primitives (keine nativen `<input>/<button>/<select>`): PASS
- [x] Project-Gate: korrekte Umlaute in allen user-facing Strings: PASS
- [x] Project-Gate: 450-Zeilen-Limit (Aufteilung vorgeschrieben): PASS

**Approval:** approved (gsd-ui-checker, 2026-07-28)

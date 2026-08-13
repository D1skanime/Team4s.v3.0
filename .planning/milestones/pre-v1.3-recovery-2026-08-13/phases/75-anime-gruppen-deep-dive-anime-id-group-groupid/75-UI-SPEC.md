---
phase: 75
slug: anime-gruppen-deep-dive-anime-id-group-groupid
status: approved
shadcn_initialized: false
preset: none
created: 2026-06-05
reviewed_at: 2026-06-05
---

# Phase 75 — UI Design Contract

> Visual- und Interaktionsvertrag fuer den narrativen Umbau der oeffentlichen Route
> `/anime/[id]/group/[groupId]` (Anime-Gruppen-Deep-Dive). Read-only.
> Erzeugt von gsd-ui-researcher, verifiziert von gsd-ui-checker.
>
> **Konsistenz-Anker:** Diese Seite ist das Decision-13-Ziel der Phase-73-Projektkarten.
> Look & Feel, Sektions-Nav, Empty States und die Member-vs-Mitwirkende-Trennung
> spiegeln `73-UI-SPEC.md` (`/fansubs/[slug]`). Tokens und Primitive werden uebernommen,
> NICHT neu erfunden. Bewusste Abweichung: **Menschen (Team & Mitwirkende) kommen VOR
> Releases** (D-02), und der **Themes-Abschnitt (OP/ED/Middle)** ist hier ein eigener Kern.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (massgeschneidertes internes CSS-Variablen-System) |
| Preset | nicht anwendbar |
| Component library | `@/components/ui` — internes Primitive-Set (Button, Card, Badge, SectionHeader, EmptyState, Pagination, PageHeader …) |
| Icon library | `lucide-react` |
| Font | System-Schriftstapel (erbt vom globalen CSS; kein custom Font-Import) |

**Pflicht-Constraint (CLAUDE.md, hartes UI-Checker-Gate):** Jede user-facing UI MUSS Primitive
aus `@/components/ui` verwenden (`Button`, `Card`, `Badge`, `SectionHeader`, `EmptyState`,
`Pagination`, `FormField`, `Input`, `Select` …). Handgebaute native `<button>`, `<select>`,
`<input>`, `<textarea>` sind ausserhalb von `frontend/src/components/ui/` verboten, wenn ein
Pendant im Primitive-Set existiert. Die "closest-analog"-Regel darf das globale UI NIE
ueberstimmen. Referenz-/Showcase-Route: `/dev/ui-system`.

**Migrations-Hinweis (RESEARCH.md / CONTEXT.md Code-Insights):** Die bestehende
`/releases`-Subpage (`frontend/src/app/anime/[id]/group/[groupId]/releases/page.tsx`) nutzt noch
native `<input type="text">`. Wird die Subpage in dieser Phase angefasst, MUSS auf
`@/components/ui/Input` migriert werden (sonst eigener UI-Politur-Schritt — deferred).

**shadcn-Gate:** `components.json` wurde nicht gefunden (bestaetigt bereits in Phase 73).
Das Projekt verwendet kein shadcn — das interne Primitive-Set erfuellt dieselbe Funktion.
Kein shadcn-Init noetig. Registry-Safety-Gate: nicht anwendbar.

---

## Spacing Scale

Quelle: Verifiziert aus `ui.module.css` und uebernommen aus `73-UI-SPEC.md` (gemeinsame Token-Basis).
Werte sind Vielfache von 4.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-Gaps, Inline-Abstaende, Rollen-Tag-Innenabstand |
| sm | 8px | Kompakte Elementabstaende (Chip-Gap, Badge-Padding, Rollen-Tag-Gap) |
| md | 16px | Standard-Elementabstand, Card-Innenabstand, Galerie-Tile-Gap |
| lg | 24px | Hero-Padding, Panel-Padding, Abstand Kopf↔Inhalt im Abschnitt |
| xl | 32px | Vertikaler Rhythmus ZWISCHEN Haupt-Abschnitten (Section-zu-Section) |
| 2xl | 48px | Seiten-Innenabstand unten, Abstand Hero↔erster Abschnitt |
| 3xl | 64px | Grosser Seiten-Level-Abstand (nicht in Phase 75 aktiv) |

**Sektions-Rhythmus (verbindlich):** Jeder der sieben Abschnitte (Hero, Story, Team, Releases,
Themes, Medien, Backlinks) ist durch **32px (xl)** vertikalen Abstand getrennt; Abstand vom Hero
zum ersten Inhaltsabschnitt **48px (2xl)**. Innerhalb eines Abschnitts: **24px (lg)** zwischen
Abschnittskopf und Inhaltsblock, **16px (md)** zwischen Karten/Galerie-Tiles.

Ausnahmen:
- Sticky-Nav Chip-Leiste (Mobil): `overflow-x: auto; white-space: nowrap; gap: 8px`
- Sticky-Nav Desktop: `position: sticky; top: <globale Header-Hoehe>` — Top-Abstand erbt vom
  bestehenden globalen Header (kein neuer Token)
- Lesebreite Fliesstext-Abschnitte (Story): `width: min(780px, 100% - 48px)` — analog Phase 73
- Inhaltsbreite Raster-Abschnitte (Team, Releases, Themes, Medien): `width: min(1280px, 100% - 48px)`
  — erbt aus bestehendem `page`-Layout

---

## Typography

Quelle: Verifiziert aus `ui.module.css`; uebernommen aus `73-UI-SPEC.md` (identische Hierarchie).
**Deklariert: 4 Groessen-Rollen, 2 Gewichte (400 regular, 600 semibold).** Display/primaere
Buttons erben 700 vom bestehenden UI-System-Token — kein eigenes Gewicht in Phase 75 deklariert.

| Rolle | Groesse | Gewicht | Zeilenhoehe | Anwendung in Phase 75 |
|-------|---------|---------|-------------|-----------------------|
| Body | 16px | 400 | 1.5 | Fliesstext (Story, Empty-State-Beschreibung, Meta-Info, Theme-Beschreibung) |
| Label | 14px | 400 | 1.4 | Sekundaer-Infos: Rollen-Tags, Version-Labels (v1/v2, TV/BD), Datumsangaben, Breadcrumb, Galerie-Caption, Badge-Text |
| Heading | 18–24px | 600 | 1.25 | Abschnittskoepfe (`SectionHeader`), Block-Titel ("Team-Beteiligte", "Externe Mitwirkende", OP/ED/Middle-Gruppentitel), Personen-Namen in Karten (18px) |
| Display | 28px | (erbt 700) | 1.2 | Anime/Gruppen-Name im Hero — erbt vom bestehenden `.title`-Token |

**Spezifische Typo-Zuordnung (verbindlich):**
- **Section-Headings:** ausschliesslich `SectionHeader`-Primitive (eyebrow + title) — keine ad-hoc
  `<h2>`/`<h3>` mit Inline-Styles.
- **Personen-Namen** (Team & Externe Mitwirkende): Heading 18px / 600.
- **Rollen-Tags** (aggregierte Rollen je Person, D-08): Label 14px / 400, via `Badge` variant `muted`/`neutral`.
- **Release-Titel:** Heading 18px / 600; **Version-Labels** (v1/v2, TV/BD): Label 14px / 400 via `Badge`.
- **Theme-Titel:** Heading 18px / 600; **Theme-Typ** (OP/ED/Middle): Label 14px / 400 via `Badge`.

---

## Color

Quelle: Verifiziert aus `ui.module.css` CSS-Variablen; uebernommen aus `73-UI-SPEC.md`.
60/30/10-Verteilung identisch zur Schwesterseite.

| Rolle | Value / Token | Verwendung |
|-------|--------------|------------|
| Dominant (60%) | `var(--color-white)` / heller Flaechen-Gradient | Seitenhintergrund, Card-Flaechen, Panel-Koerper |
| Sekundaer (30%) | `var(--border-subtle)` / `var(--surface-card)` | Karten-Raender, Sticky-Nav-Hintergrund, Chip-Leiste, Galerie-Tile-Rahmen |
| Akzent (10%) | `var(--accent-primary)` | Reserviert — siehe vollstaendige Liste unten |
| Gedaempft | `var(--text-muted)` | Empty-State-Text, ungeclaimt-Hinweise, Caption-Text, Periode-Hinweis |
| Destructive | `var(--button-danger-*)` | Nicht in Phase 75 aktiv (read-only Seite, keine destruktiven Aktionen) |

**Akzent reserviert fuer (vollstaendige Liste — niemals "alle interaktiven Elemente"):**
1. Aktiver Abschnitts-Chip in der Sticky-Nav (Desktop und Mobil) — `aria-current` Zustand
2. Externe Links / Deep-Link-Verlinkungen (Rueckverlinkung zu Gruppe und Anime, Link zu `/releases`)
3. Verlinkte (geclaimte) Personen-Namen → `/members/[slug]`
4. Primary-`Button`-Primitive (z. B. "Alle Releases ansehen"-CTA)

**Team-vs-Extern visuelle Abgrenzung (D-07 — zwei getrennte Bloecke):**
- "Team-Beteiligte": `Card` variant `elevated` oder `section` (leicht akzentuierter Gradient,
  `cardSection` mischt 10% `accent-primary`). Prominenter Block.
- "Externe Mitwirkende": **abgesetzter** Block, `Card` variant `flat` (neutraler, ruhiger,
  ohne Akzent-Gradient) + sichtbarer Trenner/Abstand (lg/24px) vor dem Block. Eine Contribution
  erscheint NIE im Team-Block.

**Ungeclaimte Personen (D-09):** Name als neutraler `<span>` in `var(--text-body)` — KEIN
Akzent, KEIN Cursor-Pointer. Optional dezenter Badge `variant="muted"` ist NICHT erforderlich
(anders als Phase-73 "unbestaetigt"; hier reicht: kein Link).

---

## Komponentenverzeichnis

Pflicht-Primitive pro Abschnitt (Quelle: CLAUDE.md, RESEARCH.md Befund 7).
Reuse-Komponenten sind markiert.

| Abschnitt (Anker) | Verwendete Primitive / Reuse |
|-------------------|------------------------------|
| Sticky-Nav (`GroupSectionsNav`, Desktop + Mobil-Chips) | `Button` (variant `ghost` inaktiv / `subtle` aktiv) als Nav-Chips; keine nativen `<button>` |
| Hero (`#` / Seitenkopf) | `Card` (variant `default`), `SectionHeader`/`PageHeader` fuer Anime+Gruppen-Name & Stats; **Reuse:** `Breadcrumbs`, `GroupEdgeNavigation` |
| Story (`#story`) | **Reuse:** `CollapsibleStory` (`components/groups/`); `EmptyState` (variant `compact`) bei fehlender Story |
| Team & Mitwirkende (`#team`) | `Card` (`elevated`/`section` Team-Block, `flat` Extern-Block), `Badge` (`muted`/`neutral`) fuer Rollen-Tags, Next.js `<Link>` fuer geclaimte Namen, `EmptyState` je Block |
| Releases (`#releases`) | `Card` (variant `interactive`) fuer Highlight-Karten, `Badge` fuer Version-Labels (v1/v2, TV/BD), Primary-`Button`/`<Link>` "Alle Releases ansehen", `EmptyState` |
| OP/ED/Middle Themes (`#themes`) | `Card` (variant `section`) je Theme, `Badge` fuer Theme-Typ, Asset-Tiles (siehe Galerie-Tile-Spezifikation), `EmptyState` |
| Release-Einblicke / Medien (`#medien`) | `Card` (variant `section`) als Galerie-Container, Galerie-Tiles, `EmptyState`; **Reuse:** `GroupAssetShowcase` wo passend |
| Backlinks / Rueckverlinkung | `Card` (variant `flat`) mit externem Link-Icon aus `lucide-react`; `<Link>` zu `/fansubs/[slug]` und `/anime/[id]` |
| Leere Zustaende (alle Abschnitte) | `EmptyState`-Primitive (variant `compact`) |
| Abschnittskoepfe (alle Abschnitte) | `SectionHeader`-Primitive (eyebrow + title) |

---

## Card-Layout-Spezifikationen

| Karten-Typ | Variante | Inhalt / Aufbau |
|-----------|----------|-----------------|
| **Personen-Karte (Team-Beteiligte)** | `Card` `elevated`/`section` | Name (Heading 18/600, Link wenn geclaimt) + aggregierte Rollen-Tags (`Badge muted`, Label 14/400, gap 8px). Optional Avatar falls Datenquelle liefert. Padding 16px (md). |
| **Personen-Zeile (Externe Mitwirkende)** | `Card` `flat` oder Listenzeile | Name (Heading 18/600, Link wenn geclaimt) + aggregierte Rollen-Tags. Visuell ruhiger als Team-Block, neutraler Hintergrund. Abgesetzt durch lg-Abstand + Trenner. |
| **Release-Highlight-Karte** | `Card` `interactive` | Release-/Episoden-Titel (Heading 18/600), Version-Label(s) als `Badge` (v1/v2, TV/BD — D-11), `released_at` (Label 14/400). Hover: translateY(-2px) (bereits in `ui.module.css`). KEINE unzuverlaessigen Badge-Flags (`has_op`/`has_ed`/`karaoke_count` sind laut RESEARCH Befund 1 noch Dummy-Werte — nicht anzeigen). |
| **Theme-Karte (OP/ED/Middle)** | `Card` `section` | Gruppiert nach Typ (OP/ED/Middle als Block-Ueberschrift + `Badge` Typ). Theme-Titel (Heading 18/600), Segment-/Timing-Bezug als Label 14/400. Visuelle Asset-Einblicke als Tiles (nur sichtbar/freigegeben, D-13). Read-only — KEINE Player-/Timing-Editoren. |
| **Galerie-Tile (Medien & Theme-Assets)** | Bild-Tile in Grid | Quadratisches/16:9-Thumbnail, `border-radius: 8px`, Rahmen `var(--border-subtle)`. Pflicht `alt`-Text (siehe A11y). Optional Caption (Label 14/400, `var(--text-muted)`). Grid: `repeat(auto-fill, minmax(160px, 1fr))`, gap 16px (md). |

---

## Interaktionsvertraege

### Sticky-Nav (D-04) — `GroupSectionsNav.tsx` (`'use client'`)

Anker-IDs (RESEARCH Befund 6, verbindlich):
`#story` · `#team` · `#releases` · `#themes` · `#medien`
(Hero und Backlinks sind keine Sprungmarken in der Nav.)

**Desktop:**
- `position: sticky; top: <globale Header-Hoehe>` (CSS-Variable aus bestehendem Layout)
- Horizontale `flex`-Reihe mit Anker-Links zu den fuenf Sprungmarken
- Aktiver Abschnitt via `IntersectionObserver` erkannt, mit Akzentfarbe hervorgehoben
- `scroll-behavior: smooth` fuer Anker-Sprung

**Mobil:**
- `overflow-x: auto; white-space: nowrap` — horizontal scrollbare Chip-Leiste, dieselben Anker
- gap: 8px (sm) zwischen Chips
- Dieselbe Highlight-Logik wie Desktop

**Zustandsuebergaenge:**
- Inaktiver Chip: `Button` variant `ghost`
- Aktiver Chip: `Button` variant `subtle` (10% Akzent-Hintergrund) + `aria-current="true"`
- Transition: 120ms ease (erbt aus `.button`-Klasse)

### Team vs. Mitwirkende (D-07/D-08/D-09)

- Zwei getrennte, visuell abgesetzte Bloecke; externe Block kommt NACH dem Team-Block,
  durch lg-Abstand + Trenner getrennt.
- Rollen pro Person **aggregiert ueber das Projekt** (z. B. "Timer, Typesetter") als Tag-Reihe.
  Pro-Version-Aufschluesselung gehoert in die `/releases`-Tiefe — hier NICHT.
- Verlinkung: `member_slug !== null` → `<Link href="/members/{slug}">` (Akzent). `null` → neutraler
  `<span>`, kein Link.

### Releases-Highlights (D-10/D-11)

- Wenige kuratierte Karten (Empfehlung 3–5 neueste/wichtigste; exakte Zahl = Planner/Executor-Diskretion).
- Mehrere Release-Versionen je Release sichtbar machen, wo Daten es hergeben (Version-Label-Badges).
- Primary-CTA "Alle Releases ansehen" verlinkt auf die bestehende `/releases`-Subpage (D-03).

### Themes OP/ED/Middle (D-12/D-13)

- Gruppiert nach Typ (OP/ED/Middle). Jede Gruppe mit Typ-Ueberschrift.
- Visuelle Asset-Einblicke nur fuer sichtbare/freigegebene Assets
  (`visibility='public' AND review_status='approved'`, Phase-72-Projektion).
- Strikt read-only: kein Player, keine Timing-Editoren, kein Karaoke-Editor.

### Medien-Galerie / Release-Einblicke (D-14/D-15)

- Galerie der oeffentlichen `release_version_media` dieser Gruppe/dieses Anime, klar beschriftet.
- Strikt nur `visibility='public' AND review_status='approved'`.
- Leerer Datenstand → Abschnitt bleibt sichtbar mit `EmptyState` (NICHT ausblenden).

### Empty States (D-05/D-15)

- Jeder Abschnitt bleibt in der DOM praesent (Anker stabil — Sticky-Nav-Sprungmarken duerfen nie ins Leere zeigen).
- `EmptyState` variant `compact` mit phasenspezifischem Text (siehe Copywriting).
- Kein Abschnitt wird bei leerem Datenstand aus der Sticky-Nav entfernt.

---

## Responsive Verhalten

| Breakpoint | Verhalten |
|-----------|-----------|
| < 640px (Mobil) | Alle Abschnitte einspaltig gestapelt in fester Reihenfolge (D-02); Sticky-Nav als horizontale scrollbare Chip-Leiste; Personen-Karten 1 Spalte; Galerie 2 Tiles/Reihe |
| 640px–1024px (Tablet) | Personen-Karten 2 Spalten; Release-Highlights 2 Spalten; Galerie-Tiles `minmax(140px,1fr)`; Themes 1 Spalte |
| > 1024px (Desktop) | Personen-Karten 3 Spalten; Release-Highlights 3 Spalten; Galerie-Tiles `minmax(160px,1fr)`; Sticky-Nav als horizontale Zeile |

Lesebreite: Story-Fliesstext max. 780px zentriert; Raster-Abschnitte (Team, Releases, Themes,
Medien) nutzen die volle 1280px-Seitenbreite.

---

## Accessibility (A11y)

| Aspekt | Regel |
|--------|-------|
| Landmark-Struktur | Jeder der sieben Abschnitte ist ein `<section>` mit eindeutiger `id` (Anker) und zugehoeriger Ueberschrift via `aria-labelledby` auf den Section-Heading verweisend |
| Heading-Hierarchie | Genau eine `<h1>` (Anime+Gruppen-Name im Hero); Abschnittskoepfe `<h2>` (via `SectionHeader`); Block-Titel (Team-Beteiligte/Externe/OP/ED/Middle) `<h3>`; keine uebersprungenen Ebenen |
| Sektions-/Anker-Navigation | Sticky-Nav als `<nav aria-label="Abschnitte">`; aktiver Chip `aria-current="true"`; Anker-Links sind echte `<a href="#…">` (per Tastatur erreichbar) |
| Skip-Verhalten | Sprungmarken funktionieren ohne JS (echte Anker); `scroll-behavior: smooth` rein visuell |
| alt-Text Asset-Tiles | Jedes Galerie-/Theme-Asset-Tile braucht beschreibenden `alt` (z. B. "Release-Einblick: {Episodentitel}" / "OP-Asset: {Theme-Titel}"). Rein dekorative Tiles: `alt=""`. Korrekte Umlaute. |
| Link-Unterscheidbarkeit | Geclaimt vs. ungeclaimt: geclaimte Namen sind echte Links (fokussierbar, Akzent); ungeclaimte sind reiner Text — kein irrefuehrender Cursor/Hover |
| Fokus-Sichtbarkeit | `:focus-visible` Ring erbt aus `.button`/globalen Tokens — nicht entfernen |

---

## Copywriting Contract

Sprache: **Deutsch mit korrekten Umlauten** (ä, ö, ü, Ä, Ö, Ü, ß). ASCII-Ersetzungen
(ae/oe/ue/ss) sind in user-facing Strings **verboten** (CLAUDE.md Sprachqualitaet). Gilt fuer
JSX-Textknoten, Button-Labels, Empty-States, aria-labels, Platzhalter, alt-Texte.

| Element | Kopie |
|---------|-------|
| Sticky-Nav Anker: Story | „Geschichte" |
| Sticky-Nav Anker: Team | „Beteiligte" |
| Sticky-Nav Anker: Releases | „Releases" |
| Sticky-Nav Anker: Themes | „OP/ED/Middle" |
| Sticky-Nav Anker: Medien | „Medien" |
| Abschnittskopf: Story | „Projektgeschichte" |
| Abschnittskopf: Team & Mitwirkende | „Beteiligte am Projekt" |
| Block-Titel: App-Member | „Team-Beteiligte" |
| Block-Titel: externe Personen | „Externe Mitwirkende" |
| Abschnittskopf: Releases | „Releases & Versionen" |
| Abschnittskopf: Themes | „OP / ED / Middle" |
| Theme-Gruppentitel | „Opening", „Ending", „Middle" |
| Abschnittskopf: Medien | „Release-Einblicke" |
| Abschnittskopf: Rueckverlinkung | „Mehr entdecken" |
| Primary CTA (Releases) | „Alle Releases ansehen" |
| Deep-Link: zur Gruppe | „Zur Gruppenseite" |
| Deep-Link: zum Anime | „Zur Anime-Seite" |
| Empty State — Story fehlt | Titel: „Noch keine Projektgeschichte" / Text: „Fuer dieses Projekt wurde bisher keine Geschichte hinterlegt." |
| Empty State — Team-Beteiligte fehlen | Titel: „Noch keine Team-Beteiligten" / Text: „Fuer dieses Projekt sind noch keine Team-Mitglieder erfasst." |
| Empty State — Externe Mitwirkende fehlen | Titel: „Keine externen Mitwirkenden" / Text: „Fuer dieses Projekt sind noch keine externen Mitwirkenden hinterlegt." |
| Empty State — Releases fehlen | Titel: „Noch keine Releases" / Text: „Fuer dieses Projekt sind noch keine oeffentlichen Releases vorhanden." |
| Empty State — Themes fehlen | Titel: „Noch keine OP/ED/Middle" / Text: „Fuer dieses Projekt sind noch keine Theme-Einblicke freigegeben." |
| Empty State — Medien fehlen | Titel: „Noch keine Release-Einblicke" / Text: „Fuer dieses Projekt sind bisher keine oeffentlichen Medien freigegeben." |
| Fehlerfall — API nicht erreichbar | Kein technischer Fehlertext oeffentlich; Empty-State greift; keine Stack Traces sichtbar |

> Hinweis zur Korrektur-Disziplin: Die ASCII-Schreibweisen in dieser Tabelle (z. B. „Fuer",
> „ansehen") sind Platzhalter im Spec-Dokument. Im **Produktcode** MUESSEN sie als korrekte
> Umlaute erscheinen: „Für", „Beteiligte", „Geschichte", „Release-Einblicke" etc. Der Executor
> setzt alle user-facing Strings mit echten Umlauten.

Keine destruktiven Aktionen in Phase 75 (reine Read-Seite). Destructive Confirmation: nicht anwendbar.

---

## Pflicht-Labels (LOCKED — D-02 / D-07 / D-14)

Diese Labels sind verbindlich und konsistent mit Phase 73:

- „Team-Beteiligte" (App-Member-Block)
- „Externe Mitwirkende" (Contributions-Block)
- „Release-Einblicke" (Medien-Galerie, identisch zur Phase-73-Beschriftung)
- „OP / ED / Middle" bzw. „Opening" / „Ending" / „Middle" (Theme-Gruppen)

Abweichende Schreibweisen (z. B. „externe Mitarbeitende", „Team-Mitwirkende") sind verboten.

---

## Sicherheits-Constraints (aus RESEARCH.md)

| Constraint | Regel |
|-----------|-------|
| Medien-/Theme-Asset-Sichtbarkeit (D-13/D-15) | Nur Rows mit `visibility='public' AND review_status='approved'` rendern (Phase-72-Projektion) |
| Keine Admin-Endpoints oeffentlich | NIE `getReleaseVersionMedia` (Admin) oder Admin-Theme-Routen auf der oeffentlichen Seite aufrufen — neue oeffentliche Seams nutzen (RESEARCH Pitfall 1) |
| Kein `dangerouslySetInnerHTML` ungefiltert | Projektstory: falls `anime_fansub_project_notes.body_html` konsumiert wird, sanitisierte/vertrauenswuerdige Quelle voraussetzen; sonst Plaintext via `CollapsibleStory` |
| Generische Fehlerbehandlung | `try/catch` in `page.tsx`, generische Meldungen; keine Stack Traces oeffentlich |
| Keine ad-hoc-Fetches | Alle API-Aufrufe ueber `frontend/src/lib/api.ts` (Lock K) |
| Period-Feld nicht anzeigen | `group.period` ist im Backend `nil` — nur anzeigen wenn nicht-null (RESEARCH Pitfall 5) |

---

## Datei-Grenzen (CLAUDE.md ≤ 450 Zeilen)

Jede neue/umgebaute Komponentendatei max. 450 Zeilen. Empfohlene Aufteilung (RESEARCH Befund 7):

| Komponente | Rolle |
|-----------|-------|
| `page.tsx` | Fetch-Orchestrierung + Layout-Shell (~150 Zeilen) |
| `GroupSectionsNav.tsx` | Sticky-Nav (Desktop + Mobil-Chips), `'use client'` (~80 Zeilen) |
| `sections/HeroSection.tsx` | Hero + Stats + Breadcrumbs/Edge-Nav |
| `sections/StorySection.tsx` | Projektstory (`CollapsibleStory`) |
| `sections/TeamSection.tsx` | Team-Beteiligte + Externe Mitwirkende (ggf. Sub-Komponenten je Block) |
| `sections/ReleasesSection.tsx` | Highlights + CTA zu `/releases` |
| `sections/ThemesSection.tsx` | OP/ED/Middle gruppiert |
| `sections/MediaSection.tsx` | Release-Einblicke-Galerie |
| `sections/BacklinksSection.tsx` | Rueckverlinkung Gruppe + Anime |

Alle Section-Komponenten erhalten vorberechnete Daten als Props vom Server Component `page.tsx`
— kein Client-Side-Fetch in den Sections (Lock K).

---

## Registry Safety

| Registry | Genutzte Bloecke | Safety Gate |
|----------|------------------|------------|
| shadcn official | keine | nicht anwendbar — Projekt nutzt kein shadcn |
| dritte Registries | keine | nicht anwendbar |

Keine Third-Party-Registries in Phase 75. Das interne `@/components/ui`-Set wird direkt genutzt.
Vetting-Gate: nicht erforderlich.

---

## Pre-Population-Quellen

| Quelle | Entscheidungen uebernommen |
|--------|----------------------------|
| 75-CONTEXT.md D-01..D-15 | 15 Locked Decisions (narrative Scroll-Seite, Abschnittsreihenfolge, Team-vs-Mitwirkende-Trennung, Releases-Highlights, Themes, Medien-Galerie, Empty States) |
| 75-RESEARCH.md | Standard-Stack, Section-Splitting (Befund 7), Anker-IDs (Befund 6), Reuse-Inventar, Anti-Patterns, Pitfalls, Visibility-Gate |
| 73-UI-SPEC.md (Schwesterseite, approved) | Spacing-Tokens, Farb-60/30/10, Typo-Hierarchie, Sticky-Nav-Muster, Empty-State-Pattern, Card-Varianten-Zuordnung |
| ui.module.css (VERIFIED) | Button-/Card-Varianten, Akzent-/Border-Tokens, Transition-Werte |
| Card.tsx (VERIFIED) | Verfuegbare Card-Varianten (default/elevated/interactive/section/flat/…) |
| `@/components/ui`-Inventar (VERIFIED via Glob) | Button, Card, Badge, SectionHeader, EmptyState, Pagination, PageHeader vorhanden |
| CLAUDE.md | Sprachqualitaet (Umlaute), Primitive-Pflicht (UI-Checker-Gate), Datei-Grenze 450 Zeilen |
| User-Input in dieser Session | 0 (alle Fragen durch Upstream-Artefakte beantwortet) |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

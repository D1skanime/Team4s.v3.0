---
phase: 75-anime-gruppen-deep-dive-anime-id-group-groupid
plan: "02"
subsystem: frontend-ui
tags:
  - next-js-server-component
  - react-client-component
  - intersection-observer
  - section-nav
  - component-split
dependency_graph:
  requires:
    - 75-01 (GroupContributorsResponse, GroupThemesResponse, GroupReleaseMediaResponse types from groupContributors.ts)
  provides:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.tsx (refactored orchestrator ≤145 lines)
  affects:
    - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
tech_stack:
  added: []
  patterns:
    - Server Component orchestrator (page.tsx ≤150 lines, all fetches + graceful degradation)
    - Client Component IntersectionObserver sticky nav (GroupSectionsNav)
    - Section extraction (HeroSection + StorySection als eigene Dateien)
    - Button variant ghost/subtle für aktive/inaktive Nav-Chips (kein nativer button)
    - EmptyState + SectionHeader Primitive-Kombination per Abschnitt
key_files:
  created:
    - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.module.css
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/page.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/page.module.css
decisions:
  - "HeroSection erhält groupAssetsError als Prop (statt rein groupAssetsResponse); Fehlerbox-Rendering bleibt im hero-Kontext"
  - "StorySection hat id='story' auf eigenem div-Wrapper (Anchor ID im section-Component selbst)"
  - "GroupContributorsResponse-Stub in page.tsx entfernt — stattdessen wird Plan 03 die Fetches direkt verdrahten ohne Vorhaltedeklarationen"
  - "Banner_url/images-Felder kommen aus groupAsset.ts (nicht group.ts) — HeroSection importiert GroupAssetsResponse aus @/types/groupAsset"
metrics:
  duration: "14min"
  completed_date: "2026-06-05"
  tasks: 2
  files: 6
---

# Phase 75 Plan 02: Seitenstruktur-Refaktor — Orchestrator + HeroSection + StorySection + SectionsNav

page.tsx auf ≤145-Zeilen-Orchestrator verschlankt; HeroSection und StorySection als eigenständige Dateien extrahiert; GroupSectionsNav als Client Component mit IntersectionObserver und Button-Primitives aus @/components/ui implementiert.

## Was gebaut wurde

**Task 1: HeroSection + StorySection extrahiert (D-01, D-02, A)**

- `sections/HeroSection.tsx` (155 Zeilen): Vollständige Migration des bestehenden Hero-Blocks aus page.tsx — Breadcrumbs, Zurück-Link, heroShell (Backdrop, Poster, Info-Panel mit Eyebrow/Title/Stats/Actions), GroupEdgeNavigation und bedingte GroupAssetShowcase. Props-Interface: `group, anime, groupID, animeID, heroBackdropUrl, infoPanelBackgroundUrl, posterImage, heroStyle, infoPanelStyle, breadcrumbItems, navigationGroups, groupAssetsResponse, groupAssetsError, releaseEpisodes`.
  - `GroupAssetsResponse` korrekt aus `@/types/groupAsset` importiert (mit `banner_url` + `images` Feldern)
  - Threat T-75-02-02: `group.period` via Optional Chaining (`period?.start || period?.end`) gesichert

- `sections/StorySection.tsx` (28 Zeilen): Dünner Wrapper mit `projectNotesHtml || story || null`-Logik. Wenn Inhalt vorhanden: `SectionHeader` + `CollapsibleStory`. Bei null: `SectionHeader` + `EmptyState variant="compact"` mit korrekten Umlauten. Wrapper-div hat `id="story"` für Sticky-Nav-Anker.

**Task 2: GroupSectionsNav + page.tsx-Refaktor + page.module.css (D-01, D-02, D-04, A)**

- `GroupSectionsNav.tsx` (55 Zeilen): `'use client'`-Komponente. `NAV_SECTIONS` als const-Array mit `{id, label}` für 5 Abschnitte. `useEffect` mit `IntersectionObserver` (rootMargin: '-40% 0px -55% 0px'). `Button` aus `@/components/ui` als Nav-Chips — kein nativer `<button>`. `variant="subtle"` für aktiven Chip, `variant="ghost"` für inaktive. `aria-label="Abschnitte"` auf `<nav>`, `aria-current="true"` auf aktivem Chip.

- `GroupSectionsNav.module.css` (12 Zeilen): `position: sticky; top: var(--header-height, 64px); z-index: 10; overflow-x: auto; white-space: nowrap` für Desktop/Mobil-Kompatibilität.

- `page.tsx` refaktoriert auf 145 Zeilen: Alle bestehenden Fetches + graceful-degradation-Muster beibehalten. `HeroSection`, `GroupSectionsNav`, `StorySection` importiert und mit berechneten Props bedient. Vier Platzhalter-Divs (`#team`, `#releases`, `#themes`, `#medien`) für Plan-03-Verdrahtung.

- `page.module.css` erweitert: `.storySection` (padding: 24px 0) und `.sectionShell` (padding: 32px 0; border-top) hinzugefügt; keine bestehenden Styles entfernt.

## Verifikation

| Kriterium | Ergebnis |
|-----------|----------|
| `npm run typecheck` (Phase-78-Worktree mit neuen Dateien) | PASS — 0 neue Fehler; 4 pre-existierende Phase-78-Fehler unverändert |
| `npm run build` (Phase-78-Worktree mit neuen Dateien) | PASS — Build exitiert 0 |
| page.tsx ≤ 150 Zeilen | PASS — 145 Zeilen |
| GroupSectionsNav nur Button-Primitive (kein nativer button) | PASS |
| Fünf Anker-IDs im Layout (#story, #team, #releases, #themes, #medien) | PASS |
| Alle user-facing Strings mit korrekten Umlauten | PASS |
| Keine Datei > 450 Zeilen | PASS (HeroSection 155, StorySection 28, GroupSectionsNav 55, page.tsx 145) |

## Abweichungen vom Plan

### Auto-korrigierte Typ-Abweichung

**[Rule 1 - Bug] GroupAssetsResponse aus groupAsset.ts statt group.ts**
- **Gefunden während:** Task 1 (HeroSection-Implementierung)
- **Problem:** `group.ts` definiert `GroupAssetsResponse` mit einem anderen `episodes`-Typ (ohne `images`-Feld), während `GroupAssetShowcase` und der bestehende code `GroupEpisodeAssets` aus `groupAsset.ts` verwenden (mit `images`-Feld und `banner_url` in Hero). Beide Definitionen existieren parallel.
- **Fix:** HeroSection importiert `GroupAssetsResponse` aus `@/types/groupAsset` (korrekte Quelle mit `images`-Feldern)
- **Dateien:** `sections/HeroSection.tsx`
- **Commit:** `690aa7e1`

**[Rule 3 - Strukturell] Stub-Variablen aus page.tsx entfernt**
- **Gefunden während:** Task 2 (150-Zeilen-Limit)
- **Problem:** Die vom Plan vorgesehenen `_contributorsData`, `_themesData`, `_releaseMediaData` Stub-Variablen brachten page.tsx auf >150 Zeilen.
- **Fix:** Stubs entfernt — Plan 03 verdrahtet die echten Fetches direkt ohne Vorhaltedeklarationen. TypeScript-Imports für `GroupContributorsResponse` etc. ebenfalls entfernt (werden in Plan 03 wieder hinzugefügt). Kein Funktionalitätsverlust, da die Variablen in Plan 02 nur `void` wären.
- **Commit:** `830cb254`

## Known Stubs

| Stub | Datei | Zeile | Grund |
|------|-------|-------|-------|
| `projectNotesHtml={null}` | `page.tsx` | ~133 | Plan 03 verdrahtet `getGroupProjectNotes`-API-Call; `group.story` bleibt als Fallback aktiv |
| `<div id="team" className={styles.sectionShell} />` | `page.tsx` | ~134 | Plan 03 ersetzt durch `<TeamSection teamMembers={...} externalContributors={...} />` |
| `<div id="releases" className={styles.sectionShell} />` | `page.tsx` | ~135 | Plan 03: ReleasesSection |
| `<div id="themes" className={styles.sectionShell} />` | `page.tsx` | ~136 | Plan 03: ThemesSection |
| `<div id="medien" className={styles.sectionShell} />` | `page.tsx` | ~137 | Plan 03: MediaSection |

Diese Stubs verhindern das Plan-02-Ziel nicht (Strukturgerüst + Navigation). Anker-IDs sind bereits DOM-präsent, sodass Sticky-Nav-Sprungmarken funktionieren. Plan 03 verdrahtet die Daten.

## Threat Flags

Keine neuen Bedrohungsflächen außerhalb des Plan-02-Threat-Modells:
- T-75-02-01: CollapsibleStory rendert Inhalt als Text — kein `dangerouslySetInnerHTML`; sicher für HTML-Strings (nur Text wird angezeigt)
- T-75-02-02: `group.period?.start || group.period?.end` Guard in HeroSection implementiert

## Self-Check: PASSED

Dateien erstellt:
- frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx: FOUND
- frontend/src/app/anime/[id]/group/[groupId]/sections/StorySection.tsx: FOUND
- frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.tsx: FOUND
- frontend/src/app/anime/[id]/group/[groupId]/GroupSectionsNav.module.css: FOUND

Commits:
- 690aa7e1 (Task 1 — HeroSection + StorySection): FOUND
- 830cb254 (Task 2 — GroupSectionsNav + page.tsx refactor): FOUND

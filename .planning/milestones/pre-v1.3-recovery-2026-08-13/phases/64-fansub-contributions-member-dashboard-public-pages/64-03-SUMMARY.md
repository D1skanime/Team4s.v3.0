---
phase: 64-fansub-contributions-member-dashboard-public-pages
plan: "03"
subsystem: frontend-public-contributions
tags:
  - public-routes
  - fansub-profile
  - anime-detail
  - contributions
  - leader-timeline
dependency_graph:
  requires:
    - 64-01
  provides:
    - GroupLeaderTimeline component
    - AnimeContributionsSection component
    - GroupContributionBlock component
    - getFansubContributions API helper
    - getAnimeContributions API helper
  affects:
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/app/anime/[id]/page.tsx
tech_stack:
  added: []
  patterns:
    - Client Component with useEffect for async public fetch
    - Progressive Disclosure (compact 3 / expand all)
    - Aggregation-only for hidden contributors (no names)
key_files:
  created:
    - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
    - frontend/src/components/fansubs/GroupLeaderTimeline.module.css
    - frontend/src/components/anime/AnimeContributionsSection.tsx
    - frontend/src/components/anime/AnimeContributionsSection.module.css
    - frontend/src/components/anime/GroupContributionBlock.tsx
    - frontend/src/components/anime/GroupContributionBlock.module.css
  modified:
    - frontend/src/types/contributions.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/app/anime/[id]/page.tsx
decisions:
  - GroupLeaderTimeline placed directly in page.tsx before FansubProfileTabs — keine Tab-Änderung nötig
  - AnimeContributionsSection als 'use client' mit useEffect — kein separater Server-Fetch in page.tsx
  - Bei Fehler in getFansubContributions/getAnimeContributions: stiller Skip, kein Absturz
metrics:
  duration: 12min
  completed_date: "2026-06-02"
  tasks: 2
  files: 10
---

# Phase 64 Plan 03: Public Contributions — Leader-Timeline und Anime-Seite Summary

Public-Contributions-Bereich mit Leader-Timeline auf Fansub-Profilseite und Mitwirkenden-Rollen-Chips auf Anime-Detailseite, inklusive Privacy-Aggregation für nicht öffentliche Members.

## Tasks

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | API-Helpers für Public Contributions und Typen-Erweiterung | e93ad127 | Abgeschlossen |
| 2 | GroupLeaderTimeline, Anime-Contributions-Komponenten und Seitenintegration | 019308f7 | Abgeschlossen |

## Was wurde gebaut

### Typen (`contributions.ts`)
Fünf neue öffentliche Typen ergänzt:
- `PublicAnimeContribution` — einzelner Mitwirkender mit Rollen-Codes/Labels, Jahresbereich, Verifikationsstatus
- `PublicFansubLeaderEntry` — Leader-Timeline-Eintrag mit `status`-Feld für `(historisch)`-Kennzeichnung
- `PublicGroupContributionsResponse` — Antwort von `/fansubs/:id/contributions`
- `AnimeContributionGroup` — Gruppe mit contributors-Liste und `hidden_contributor_count`
- `PublicAnimeContributionsResponse` — Antwort von `/anime/:id/contributions`

### API-Helpers (`api.ts`)
- `getFansubContributions(fansubID)` — GET `/api/v1/fansubs/:id/contributions`, kein Auth-Token, revalidate 60s
- `getAnimeContributions(animeID)` — GET `/api/v1/anime/:id/contributions`, kein Auth-Token, revalidate 60s

### Komponenten
- **GroupLeaderTimeline** — Listet Leader-Einträge mit Jahresbereich und Rollenbezeichnung; `status === 'historical'` ergibt `(historisch)`-Label; leer → freundliche Meldung
- **GroupContributionBlock** — Pro-Gruppe-Block: Gruppenname, Aktivzeitraum, max. 3 Mitwirkende in Kompaktansicht, Rollen-Chips, `(historisch)` bei `is_verified === false`, aggregierter "(N weitere nicht öffentlich)"-Hinweis, "Alle anzeigen"-Toggle
- **AnimeContributionsSection** — Client-Komponente mit useState/useEffect; lädt Contributions für animeID; kein Render bei Fehler oder leerem State

### Seitenintegrationen
- `/fansubs/[slug]`: `GroupLeaderTimeline` direkt in `page.tsx` nach Gruppen-Header, vor `FansubProfileTabs`; bei Fehler wird Timeline übersprungen
- `/anime/[id]`: `AnimeContributionsSection` im contentArea, vor CommentSection; kein Fehler-Crash bei API-Ausfall

## Deviations from Plan

Keine — Plan exakt wie geschrieben umgesetzt.

## Threat Mitigations

| Threat | Maßnahme |
|--------|----------|
| T-64-03-01 — Info Disclosure hidden_contributor_count | `hidden_contributor_count > 0` rendert nur Anzahl als String "(N weitere nicht öffentlich)" — kein Name, kein Link |
| T-64-03-02 — Info Disclosure GroupContributionBlock | `member_display_name` aus der API gerendert; `member_slug` wird im aktuellen UI nicht als Link verwendet — kein persönlicher Link wenn slug null |

## Self-Check: PASSED

Erstellte Dateien vorhanden:
- `frontend/src/components/fansubs/GroupLeaderTimeline.tsx` ✓
- `frontend/src/components/anime/AnimeContributionsSection.tsx` ✓
- `frontend/src/components/anime/GroupContributionBlock.tsx` ✓

Commits vorhanden:
- e93ad127 (Task 1) ✓
- 019308f7 (Task 2) ✓

TypeScript: `npx tsc --noEmit` — keine Fehler ✓

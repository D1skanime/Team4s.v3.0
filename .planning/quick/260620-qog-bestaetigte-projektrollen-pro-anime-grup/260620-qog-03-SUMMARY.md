---
phase: quick-260620-qog
plan: "03"
subsystem: frontend/contributions
tags: [grouping, accordion, anime-card, typescript, contributions]
dependency_graph:
  requires: [260620-qog-02]
  provides: [anime-grouping-ui, accordion-episode-ranges]
  affects: [frontend/src/components/contributions, frontend/src/types/contributions]
tech_stack:
  added: []
  patterns: [useMemo-grouping, sort_index-range-building, ui-primitives]
key_files:
  created:
    - frontend/src/components/contributions/AnimeGroupCard.tsx
  modified:
    - frontend/src/types/contributions.ts
    - frontend/src/components/contributions/MyContributionsSection.tsx
    - frontend/src/components/contributions/contributions.module.css
decisions:
  - Alphabetische Sortierung der Anime-Gruppen nach Titel (de-Locale) statt created_at (stabiler für Nutzer)
  - buildEpisodeRanges() direkt in AnimeGroupCard.tsx (226 Zeilen, kein externes .helpers.ts nötig)
  - VisibilityDropdown pro Accordion-Zeile (nicht auf Karten-Ebene) — direkter Bezug zum Beitrag
  - role_labels[0] bevorzugt gegenüber ROLE_LABELS-Map-Lookup (Backend liefert aufgelöste Labels)
metrics:
  duration: "~30min"
  completed: "2026-06-20"
  tasks_completed: 2
  tasks_total: 3
  files_changed: 4
---

# Phase quick-260620-qog Plan 03: Frontend Anime-Gruppierung mit Accordion Summary

**One-liner:** MyContributionsSection gruppiert confirmed-Beiträge nach anime_id in AnimeGroupCard-Karten mit sort_index-basierter Folgen-Bereichsbildung (Folge X–Y) und Arbeitsfläche-Link je Accordion-Zeile.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T3a | Typ erweitern + AnimeGroupCard erstellen | 071b93c5 | contributions.ts, AnimeGroupCard.tsx, contributions.module.css |
| T3b | MyContributionsSection umstellen + Tests anpassen | 84711fea | MyContributionsSection.tsx |
| T3c | Live-UAT gegen Dev-Server :3000 | — | Checkpoint: awaiting human verification |

## What Was Built

**MeAnimeContribution-Typ** um zwei optionale Felder erweitert:
- `episode_number?: string | null`
- `episode_sort_index?: number | null`

**AnimeGroupCard.tsx** (neu, 226 Zeilen):
- Props: `animeId`, `animeTitle`, `contributions[]`, `onVisibilityChange`
- `buildEpisodeRanges()`: gruppiert Beiträge nach Primärrolle, fasst aufeinanderfolgende `sort_index`-Werte (lückenlos) zur gleichen Rolle zu "Folge X–Y" zusammen
- Label-Logik: `anime-weit: Rolle` | `Folge X: Rolle` | `Folge X–Y: Rolle`
- Accordion über `useState(false)` via `Button` aus `@/components/ui`
- Rollen-Badges via `Badge` aus `@/components/ui`
- Arbeitsfläche-Link (`Button href`) nur wenn `release_version_id !== null`
- `VisibilityDropdown` pro Accordion-Zeile erhalten

**MyContributionsSection.tsx** (überarbeitet, 71 Zeilen):
- `useMemo`-Gruppierung nach `anime_id` → `Map<number, { title, items }>`
- Alphabetische Sortierung per `localeCompare('de')`
- SectionHeader: "Bestätigte Projektrollen (N Animes)"
- Rendert `AnimeGroupCard` statt `ContributionCard`

**contributions.module.css**: Neue CSS-Klassen `.accordionList`, `.accordionRow`, `.accordionLabel` hinzugefügt.

## Verification

### Automated (passed)
- `npx tsc --noEmit`: fehlerfrei (kein Output)
- `npx vitest run src/components/contributions/`: **21/21 Tests grün** (7 Test-Dateien)
  - ContributionCard.test.tsx: 2 Tests grün (rückwärtskompatibel, makeContribution() ohne episode-Felder)
  - ProposalForm.test.tsx: 5 Tests grün
  - ReportModal.test.tsx: 5 Tests grün
  - ContributionSummary.test.tsx: 3 Tests grün
  - ContributionInbox.test.tsx: 3 Tests grün
  - ReviewQueue.test.tsx: 2 Tests grün
  - reportTargets.test.ts: 1 Test grün

### Manual (T3c — awaiting)
Live-UAT gegen Dev-Server :3000 als ao-leader — Checkpoint offen.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — alle Felder werden aus dem Backend-Response bezogen (episode_number, episode_sort_index aus Plan 01 implementiert).

## Threat Flags

Keine neuen Trust-Boundary-Surfaces eingeführt. Bestehende Threat-Register-Einträge T-qog-03 und T-qog-04 abgedeckt:
- Accordion zeigt nur eigene Contributions des eingeloggten Members
- href-Link zu /me/releases/[id]/workspace basiert auf backend-authentifizierter release_version_id

## Self-Check

- [x] AnimeGroupCard.tsx existiert: `frontend/src/components/contributions/AnimeGroupCard.tsx`
- [x] MyContributionsSection.tsx überarbeitet: `frontend/src/components/contributions/MyContributionsSection.tsx`
- [x] contributions.ts erweitert: `frontend/src/types/contributions.ts`
- [x] Commit 071b93c5 existiert (T3a)
- [x] Commit 84711fea existiert (T3b)
- [x] Alle Dateien ≤ 450 Zeilen (226 / 71 / 207)

## Self-Check: PASSED

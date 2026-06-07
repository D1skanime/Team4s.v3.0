---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: "11"
type: execute
subsystem: frontend
tags: [gap-closure, fansub, uat-fix, highlights, contributors]
dependency_graph:
  requires: ["73-10"]
  provides: ["UAT-12-fix", "UAT-5-fix"]
  affects: ["frontend/src/app/fansubs/[slug]/page.tsx", "frontend/src/components/fansubs/FansubHighlightsSection.tsx"]
tech_stack:
  added: []
  patterns:
    - "Single source of truth: projects.length als Zähler für Highlights und Projects-Sektion"
    - "historische Mitglieder in teamMemberNames für Badge-Vergleich"
key_files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubHighlightsSection.tsx
    - frontend/src/app/fansubs/[slug]/page.tsx
decisions:
  - "animeProjectCount als optionaler Prop — fällt defensiv auf null zurück, Kachel wird weggelassen (filter entfernt null-Werte)"
  - "contributions-Prop bleibt in FansubHighlightsSection erhalten, da member_count weiterhin daraus gelesen wird"
  - "teamMemberNames = [...members, ...historical] — FansubContributorsSection prüft case-insensitiv gegen dieses Set"
metrics:
  duration: "5min"
  completed_date: "2026-06-07"
  tasks: 2
  files: 2
---

# Phase 73 Plan 11: UAT-12 + UAT-5 Gap-Closure Summary

**One-liner:** Projektzähler in Höhepunkte-Kachel auf `projects.length` umgestellt und historische Mitglieder in teamMemberNames aufgenommen.

## Was wurde gebaut

Zwei verbleibende UAT-Befunde aus Round 2 behoben:

**UAT-12 (major):** Die Höhepunkte-Kachel "Anime-Projekte" zeigte bisher `contributions.anime_count` (zählt auch nicht-öffentliche Beiträge). Die Projekte-Sektion lud nur öffentliche Anime via `getAnimeList`. Der Widerspruch entstand, weil beide Quellen unterschiedliche Mengen zählten. Fix: `FansubHighlightsSection` erhält jetzt einen optionalen Prop `animeProjectCount?: number`, den `page.tsx` mit `projects.length` befüllt. Höhepunkte-Kachel und Projekte-Sektion zeigen nun exakt dieselbe Zahl.

**UAT-5 (minor):** Das Badge "auch Mitglied" fehlte bei Angeldust in der Mitwirkenden-Sektion, weil `teamMemberNames` nur aus `domainProjection.members` (aktive Mitglieder) gebildet wurde. Angeldust steht in `domainProjection.historical`. Fix: `teamMemberNames` enthält jetzt Display-Namen aus beiden Listen.

## Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | FansubHighlightsSection — animeProjectCount-Prop einführen | d7f83aa2 | FansubHighlightsSection.tsx |
| 2 | page.tsx — animeProjectCount und erweitertes teamMemberNames | 7c618e2d | page.tsx |

## Deviations from Plan

None — Plan wurde exakt wie beschrieben umgesetzt.

## Known Stubs

None — beide Felder sind echte Datenbindungen (kein Placeholder-Text, keine leeren Fallbacks im UI-Pfad).

## Threat Flags

Keine neuen Trust Boundaries eingeführt. Entspricht dem Threat Model des Plans (T-73-11-01 und T-73-11-02 beide `accept`).

## Self-Check: PASSED

- FOUND: frontend/src/components/fansubs/FansubHighlightsSection.tsx
- FOUND: frontend/src/app/fansubs/[slug]/page.tsx
- FOUND: .planning/phases/73-public-fansub-page-fansubs-slug-erweitern/73-11-SUMMARY.md
- FOUND: d7f83aa2 (Task 1 commit)
- FOUND: 7c618e2d (Task 2 commit)
- tsc --noEmit: 0 Fehler

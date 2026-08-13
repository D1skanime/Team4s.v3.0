---
phase: 73-public-fansub-page-fansubs-slug-erweitern
plan: "07"
subsystem: frontend/fansubs
tags: [gap-closure, naming, ux, fansub-page]
dependency_graph:
  requires: []
  provides: [konsistente-gruppenleitung-benennung]
  affects: [FansubSectionNav, GroupLeaderTimeline, fansubs-slug-page]
tech_stack:
  added: []
  patterns: [IntersectionObserver-id-alignment, section-id-nav-link]
key_files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubSectionNav.tsx
    - frontend/src/components/fansubs/GroupLeaderTimeline.tsx
    - frontend/src/app/fansubs/[slug]/page.tsx
decisions:
  - "Fallback-Eintrag fuer Ballelboy wird nicht implementiert: FansubGroup-Typ hat kein fansub_lead_name-Feld und die leere leader_timeline ist korrekte Datenlage. Korrekter Empty-State-Text loest das verwirrende Wording."
metrics:
  duration: 5min
  completed_date: "2026-06-07"
  tasks_completed: 2
  files_changed: 3
---

# Phase 73 Plan 07: Gruppenleitung-Benennung Konsistenz Summary

**One-liner:** Nav-Label, section-id und Empty-State-Text auf 'Gruppenleitung' vereinheitlicht (war: 'Timeline', 'timeline', 'Gruppenhistorie').

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | FansubSectionNav — 'timeline' → 'gruppenleitung' | 10f17aa0 | FansubSectionNav.tsx |
| 2 | GroupLeaderTimeline + page.tsx — konsistente id und Empty-State | 54442eed | GroupLeaderTimeline.tsx, page.tsx |

## Changes Made

### Task 1: FansubSectionNav.tsx
- `SECTION_IDS`: `'timeline'` → `'gruppenleitung'`
- `SECTION_LABELS`: `timeline: 'Timeline'` → `gruppenleitung: 'Gruppenleitung'`
- Abgeleiteter Typ `SectionId` automatisch aktualisiert (kein manueller Eingriff)
- Kein `'timeline'` mehr in der Datei

### Task 2: GroupLeaderTimeline.tsx
- Empty-State-Text: `'Noch keine Gruppenhistorie eingetragen.'` → `'Noch keine Gruppenleitung eingetragen.'`
- h2-Heading `'Gruppenleitung'` bleibt unverändert (war bereits korrekt)

### Task 2: page.tsx (fansubs/[slug]/page.tsx)
- `<section id="timeline"` → `<section id="gruppenleitung"`
- Alle drei Verknüpfungen jetzt konsistent: Nav-Button-ID → getElementById → section-id → IntersectionObserver target.id

## Deviations from Plan

Keine — Plan exakt so implementiert wie beschrieben. Der fansub_lead-Fallback wurde bewusst NICHT implementiert (Design-Entscheidung im Plan dokumentiert: kein fansub_lead_name-Feld im Typ; leere leader_timeline ist korrekte Datenlage).

## Threat Surface Scan

Keine neuen sicherheitsrelevanten Oberflächen eingeführt — reine UI-Umbenennung ohne Daten- oder Auth-Pfade (konsistent mit T-73-07-01 accept-Disposition).

## Known Stubs

Keine stubs. Empty-State mit echtem Text ("Noch keine Gruppenleitung eingetragen.") — keine Placeholder-Daten.

## Verification Steps (live, dev-server :3000)

1. `/fansubs/animeownage` laden
2. Nav zeigt "Gruppenleitung" statt "Timeline"
3. Klick auf "Gruppenleitung" scrollt zur section mit h2 "Gruppenleitung"
4. Sektion zeigt "Noch keine Gruppenleitung eingetragen." (nicht "Gruppenhistorie")
5. IntersectionObserver hebt "Gruppenleitung" hervor beim Scrollen zur Sektion

## Notes

- `node_modules` nicht installiert in diesem Checkout — `tsc --noEmit` konnte nicht automatisch ausgeführt werden. Verifikation erfolgte durch Code-Level-Reasoning: alle Typen konsistent, Record vollständig, keine Runtime-Fehler erwartet.
- User verifiziert live auf Dev-Server :3000.

## Self-Check: PASSED

- [x] `FansubSectionNav.tsx` enthält `'gruppenleitung'` in SECTION_IDS und SECTION_LABELS, kein `'timeline'`
- [x] `GroupLeaderTimeline.tsx` Empty-State: "Noch keine Gruppenleitung eingetragen."
- [x] `page.tsx` section id="gruppenleitung"
- [x] Commit 10f17aa0 existiert (Task 1)
- [x] Commit 54442eed existiert (Task 2)

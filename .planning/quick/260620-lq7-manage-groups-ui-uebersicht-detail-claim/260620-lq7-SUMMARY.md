---
phase: quick-260620-lq7
plan: "01"
subsystem: frontend/my-groups
tags: [copy, ux, admin, my-groups]
dependency_graph:
  requires: []
  provides: [manage-groups-copy-cleanup, manage-groups-design-system]
  affects: []
tech_stack:
  added: []
  patterns: [design-system-primitives, copy-cleanup]
key_files:
  modified:
    - frontend/src/app/admin/my-groups/page.tsx
    - frontend/src/app/admin/my-groups/[id]/page.tsx
decisions:
  - "Leere description-Props ('') statt Weglassen des Props — SectionHeader akzeptiert optionales description, leerer String ist sicher und vermeidet Prop-Warnings"
  - "Geschützte Toolbar-Badge-Strings (Testziele) bleiben exakt erhalten"
metrics:
  duration: "~5 Minuten"
  completed: "2026-06-20"
---

# Phase quick-260620-lq7 Plan 01: My-Groups Copy Cleanup Summary

**One-liner:** Rechte-/Historik-/Claim-Jargon aus Übersichts- und Detailseite entfernt, durch knappe freundliche Labels ersetzt.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Übersicht (page.tsx) Copy bereinigen | e225d04e | frontend/src/app/admin/my-groups/page.tsx |
| 2 | Detail ([id]/page.tsx) Copy bereinigen | e225d04e | frontend/src/app/admin/my-groups/[id]/page.tsx |

## Changes Made

### Übersicht (page.tsx)

| Element | Alt | Neu |
|---------|-----|-----|
| PageHeader description | "Gruppen, bei denen dein Konto aktiv mitwirkt oder historisch verknüpft ist. Historische Links sind Kontext und geben keine Rechte." | "Deine aktiven Fansub-Gruppen und historischen Beteiligungen." |
| LoadingState description | "Team4s lädt Mitgliedschaften, historische Links und Gruppenrechte." | "Einen Moment bitte." |
| SectionHeader "Gruppenkontext" description | "Diese Werte werden aus eigenen Gruppen und historischen Links zusammengezogen." | "" |
| SectionHeader "Schnellzugriff" description | "Direkte Wege zu deinem Profil und den Gruppen, für die aktive Rechte vorliegen." | "" |
| SectionHeader "Eigene Fansub-Gruppen" description | "Nur Gruppen mit aktiven Rechten öffnen Detailbereiche. Historische Beteiligungen bleiben als Kontext sichtbar." | "Gruppen mit aktiver Mitgliedschaft können geöffnet werden." |
| EmptyState description | "Für diesen Account sind noch keine App-Mitgliedschaften oder historischen Gruppenlinks sichtbar." | "Noch keine Gruppen verknüpft." |

### Detail ([id]/page.tsx)

| Element | Alt | Neu |
|---------|-----|-----|
| LoadingState description | "Team4s lädt den konkreten Gruppen- und Release-Kontext." | "Einen Moment bitte." |
| PageHeader description | "Release-, Medien- und Notizbereiche öffnen nur mit passenden Gruppenrechten. Historische Links bleiben Kontext und geben keine Rechte." | "Releases, Medien und deine Beteiligungen in dieser Gruppe." |
| SectionHeader eyebrow | "Rechte" | "Status" |
| SectionHeader title | "Berechtigungen und Kontext" | "Gruppenübersicht" |
| SectionHeader description | "Gruppenrechte kommen aus Team4s. Historische Rollen stehen daneben, erzeugen aber keine Rechte." | "" |
| SectionHeader "Historische Rollen" description | "Diese Daten erklären den Gruppenkontext, vergeben aber keine App-Rechte." | "" |
| EmptyState title | "Keine historischen Rollen für diese Gruppe" | "Keine Beteiligungen" |
| EmptyState description | "Der Gruppenzugriff basiert weiterhin ausschließlich auf App-Mitgliedschaften und Gruppenrechten." | "" |
| SectionHeader "Release-Kontexte" description | "Nur Release-Versionen dieser Gruppe werden angezeigt; Kooperationen bleiben erkennbar." | "Release-Versionen dieser Gruppe." |

### Unverändert gelassen (Testziele)

- Toolbar-Badge "Historische Links geben keine Rechte" (page.tsx) — Vitest-Ziel L145
- Toolbar-Badge "Historische Links sind Kontext" ([id]/page.tsx) — Vitest-Ziel L132
- Tabellen-Badge "Keine App-Rechte" ([id]/page.tsx) — Vitest-Ziel L133

## Verification Results

```
TypeScript:  npx tsc --noEmit         → keine Fehler (kein Output)
Vitest:      5/5 Tests grün
  - src/app/admin/my-groups/page.test.tsx      3/3
  - src/app/admin/my-groups/[id]/page.test.tsx 2/2
ESLint:      npx eslint ...            → keine Fehler (kein Output)
Zeilenzahl:  page.tsx 308 Z., [id]/page.tsx 431 Z. — beide ≤450
```

## Deviations from Plan

None - Plan exakt wie beschrieben ausgeführt.

## Known Stubs

None.

## Threat Flags

None — reine Copy-Änderung, keine neuen Vertrauensgrenzen.

## Self-Check: PASSED

- [x] frontend/src/app/admin/my-groups/page.tsx existiert und ist geändert
- [x] frontend/src/app/admin/my-groups/[id]/page.tsx existiert und ist geändert
- [x] Commit e225d04e vorhanden
- [x] 5 Vitest-Tests grün
- [x] TypeScript sauber
- [x] ESLint sauber
- [x] Beide Dateien ≤450 Zeilen

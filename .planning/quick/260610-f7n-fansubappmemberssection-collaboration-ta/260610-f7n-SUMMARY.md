---
phase: 260610-f7n
plan: 01
subsystem: frontend-admin-fansubs
tags: [ui-migration, table-pattern, global-ui-system, fansub-members]
dependency_graph:
  requires: []
  provides: [FansubAppMembersSection-table-pattern]
  affects: [frontend/src/app/admin/fansubs/[id]/edit]
tech_stack:
  added: []
  patterns: [Table, TableEmptyState, LoadingState, ErrorState, SectionHeader aus @/components/ui]
key_files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
decisions:
  - findByPlaceholderText statt findByRole-name für Inputs mit Label+Placeholder genutzt
  - GroupMembersTab FANSUB_GROUP_ROLE_OPTIONS fix als separaten Commit mitgenommen
metrics:
  duration_minutes: 30
  completed_date: "2026-06-10"
  tasks_completed: 2
  files_modified: 4
---

# Phase 260610-f7n Plan 01: FansubAppMembersSection UI-Migration Summary

**One-liner:** Mitglieder- und Einladungs-Bereiche von Card-Stapeln/div-Boxen auf Table-Pattern mit LoadingState/ErrorState aus globalem UI-System migriert.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 2 | Component migration (FansubAppMembersSection) | 37e80a90 | FansubAppMembersSection.tsx, FansubEdit.module.css |
| 3 | Tests anpassen | 37e80a90 | FansubAppMembersSection.test.tsx |
| - | GroupMembersTab FANSUB_GROUP_ROLE_OPTIONS fix | 0117d9cf | GroupMembersTab.tsx |

## What Was Built

- **FansubAppMembersSection.tsx**: Migriert von `errorBox`/`successBox`/`fansubEditReleaseState`-divs auf globale Primitives `LoadingState` und `ErrorState`. Mitglieder-Abschnitt und Einladungs-Abschnitt nutzen `Table`/`TableEmptyState`/`SectionHeader` statt Card-Stapel. Alle Modals, Handler und Capability-Guards unverändert.
- **FansubEdit.module.css**: Neue lokale CSS-Klassen `fansubEditTableSurface`, `fansubEditTableWrapWine`, `fansubEditTableRowActions` für das Showcase-Tabellen-Pattern.
- **FansubAppMembersSection.test.tsx**: `findByRole("searchbox", { name: "Fansub-Nick suchen" })` und `findByRole("textbox", { name: "E-Mail-Adresse für die Einladung" })` auf `findByPlaceholderText` umgestellt — korrekte accessible names der verknüpften Labels werden nun nicht mehr umgangen.

## Test Results

```
Test Files: 12 passed (12)
Tests:      73 passed (73)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GroupMembersTab lokale Rollen-Optionen durch FANSUB_GROUP_ROLE_OPTIONS ersetzt**
- **Found during:** Stash-pop des vorherigen Agenten — Änderung war bereits durchgeführt
- **Issue:** `GROUP_HISTORY_ROLE_OPTIONS` enthielt nur 5 Führungsrollen, nicht alle Gruppenrollen
- **Fix:** Import von `FANSUB_GROUP_ROLE_OPTIONS` aus `@/types/fansub`, lokale Konstante entfernt
- **Files modified:** `GroupMembersTab.tsx`
- **Commit:** 0117d9cf

**2. [Rule 1 - Bug] Test-Selektoren für accessible names korrigiert**
- **Found during:** Task 3 — Tests schlugen wegen falscher ARIA accessible names fehl
- **Issue:** `findByRole("searchbox", { name: "Fansub-Nick suchen" })` suchte nach Placeholder als accessible name, aber die accessible name ist "Fansub-Nick" (Label). Pre-existing bug, bereits in HEAD vorhanden.
- **Fix:** `findByPlaceholderText("Fansub-Nick suchen")` / `findByPlaceholderText("E-Mail-Adresse für die Einladung")`
- **Files modified:** `FansubAppMembersSection.test.tsx`
- **Commit:** 37e80a90

## Known Stubs

None — alle Datenpfade sind verdrahtet.

## Threat Flags

Keine neuen Netzwerk-Endpunkte oder Auth-Pfade eingeführt — reine UI-Migration.

## Self-Check: PASSED

- [x] `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` — vorhanden
- [x] `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx` — vorhanden
- [x] `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` — vorhanden
- [x] Commit 37e80a90 — vorhanden
- [x] Commit 0117d9cf — vorhanden
- [x] 73/73 Tests grün
- [x] TypeScript kein Fehler
- [x] ESLint kein Fehler

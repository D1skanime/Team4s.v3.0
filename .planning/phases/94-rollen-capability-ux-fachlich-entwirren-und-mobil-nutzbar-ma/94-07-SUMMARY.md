---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "07"
subsystem: frontend-admin-fansub
tags: [refactor, split, component-extraction, line-limit]
dependency_graph:
  requires: []
  provides:
    - GroupHistRoleDialog (extrahierter historischer Rollen-Dialog, bereit für Plan 08 D-07/D-09)
    - FansubAppMemberEditorPanel (extrahiertes aktives Editor-Panel, bereit für Plan 08 D-10)
  affects:
    - GroupMembersTab (reduziert von 1209 auf 173 Zeilen)
    - FansubAppMembersSection (reduziert von 1064 auf 432 Zeilen)
tech_stack:
  added: []
  patterns:
    - Custom Hook (useGroupMembersTab, useGroupMembersClaimActions) für State-/Handler-Extraktion
    - Props-Drilling als Extraktion-Strategie für verhaltensneutrale Splits
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersHistTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberFormModals.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMemberRequestsTable.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersClaimActions.ts
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberAddModal.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersOverview.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
decisions:
  - "GroupMembersTab: Custom-Hook-Extraktion (useGroupMembersTab + useGroupMembersClaimActions) gewählt, da State/Handler eng gekoppelt und nicht durch Props-Übergabe trennbar"
  - "FansubAppMembersSection: FansubAppMembersOverview fasst Mitglieder-Übersicht und Einladungs-Tabelle zusammen (kohäsiv), FansubAppMemberAddModal kapselt Choice- und Haupt-Modal"
  - "Alle neuen Dateien <= 450 Zeilen; verhaltensneutrale Extraktion ohne Semantik-/Textänderung"
metrics:
  duration: 40min
  completed: "2026-06-30T09:34:23Z"
  tasks_completed: 2
  files_created: 9
  files_modified: 2
---

# Phase 94 Plan 07: Komponenten-Split vor fachlichen Änderungen — Summary

**Eine-Zeile-Zusammenfassung:** GroupMembersTab (1209 Z.) und FansubAppMembersSection (1064 Z.) durch Custom Hooks und Unterkomponenten auf je ≤ 450 Zeilen reduziert, bereit für Plan-08-Fachänderungen.

## Erledigte Tasks

### Task 1: Historischen Rollen-Dialog aus GroupMembersTab.tsx extrahieren

- **Commit:** `154454ab`
- **Ergebnis:** 6 neue Dateien; GroupMembersTab.tsx von 1209 auf 173 Zeilen reduziert
- **Neue Dateien:**
  - `GroupHistRoleDialog.tsx` (159 Z.) — Rollen-Modal mit Select-Primitiv, bereit für Plan 08 D-07/D-09
  - `GroupMembersHistTable.tsx` (316 Z.) — historische Mitglieder-Tabelle
  - `GroupMemberFormModals.tsx` (221 Z.) — Mitglied-Anlegen/Bearbeiten/Löschen-Modals
  - `GroupMemberRequestsTable.tsx` (110 Z.) — Neuanlage-Anträge-Tabelle
  - `useGroupMembersTab.ts` (366 Z.) — State und Handler als Custom Hook
  - `useGroupMembersClaimActions.ts` (186 Z.) — Claim/Einladungs-Logik

### Task 2: Aktives Mitglieder-Editor-Panel aus FansubAppMembersSection.tsx extrahieren

- **Commit:** `79f49f98`
- **Ergebnis:** 3 neue Dateien; FansubAppMembersSection.tsx von 1064 auf 432 Zeilen reduziert
- **Neue Dateien:**
  - `FansubAppMemberEditorPanel.tsx` (194 Z.) — Rollen/Medienrechte-Editor-Modal, bereit für Plan 08 D-10
  - `FansubAppMemberAddModal.tsx` (291 Z.) — App-Mitglied-Hinzufügen + Einladungs-Modal
  - `FansubAppMembersOverview.tsx` (312 Z.) — Mitglieder-Übersicht und Einladungs-Tabelle

## Zeilenzahlen nach Split

| Datei | Vorher | Nachher |
|-------|--------|---------|
| GroupMembersTab.tsx | 1209 | 173 |
| FansubAppMembersSection.tsx | 1064 | 432 |
| GroupHistRoleDialog.tsx (neu) | — | 159 |
| GroupMembersHistTable.tsx (neu) | — | 316 |
| GroupMemberFormModals.tsx (neu) | — | 221 |
| GroupMemberRequestsTable.tsx (neu) | — | 110 |
| useGroupMembersTab.ts (neu) | — | 366 |
| useGroupMembersClaimActions.ts (neu) | — | 186 |
| FansubAppMemberEditorPanel.tsx (neu) | — | 194 |
| FansubAppMemberAddModal.tsx (neu) | — | 291 |
| FansubAppMembersOverview.tsx (neu) | — | 312 |

## Deviationen vom Plan

### Auto-ausgelagerte Zusatzblöcke (Rule 2 — CLAUDE.md 450-Zeilen-Limit)

**1. Weitere Extraktion über den Rollen-Dialog hinaus (GroupMembersTab)**
- **Gefunden bei:** Task 1 — nach Dialog-Extraktion hatte die Datei noch 907 Zeilen
- **Lösung:** Tabelle, Modals und gesamte Logik in eigene Dateien + Custom Hooks ausgelagert
- **Begründung:** Plan erlaubt explizit "weiteren kohäsiven Block... bis das Limit hält"

**2. Weitere Extraktion über das Editor-Panel hinaus (FansubAppMembersSection)**
- **Gefunden bei:** Task 2 — Editor-Panel-Extraktion allein hätte das Limit nicht erreicht
- **Lösung:** FansubAppMemberAddModal + FansubAppMembersOverview zusätzlich extrahiert
- **Begründung:** Plan erlaubt explizit weitere Extraktion bis das 450-Z.-Limit gilt

## Verhalten und Labels

Keine Verhaltens- oder Textänderungen. Reine strukturelle Verschiebung. TypeScript-Check ohne neue Fehler.

## Threat-Scan

Keine neuen Netzwerk-Endpunkte, Auth-Pfade oder Schema-Änderungen eingeführt. Nur UI-Refactoring.

## Known Stubs

Keine. Alle Unterkomponenten erhalten echte Daten via Props.

## Self-Check: PASSED

- GroupHistRoleDialog.tsx: vorhanden, enthält Select-Primitiv aus @/components/ui
- FansubAppMemberEditorPanel.tsx: vorhanden, kapselt aktive Rollen-/Medienrechte-Sektionen
- GroupMembersTab.tsx: 173 Zeilen ≤ 450
- FansubAppMembersSection.tsx: 432 Zeilen ≤ 450
- GroupHistRoleDialog.tsx: 159 Zeilen ≤ 450
- FansubAppMemberEditorPanel.tsx: 194 Zeilen ≤ 450
- Commits 154454ab und 79f49f98 existieren
- TypeScript-Check sauber (keine neuen Fehler)

---
phase: 63-fansub-contributions-leader-frontend
plan: "02"
subsystem: frontend
tags: [typescript, react, fansub, group-members, member-roles, admin-ui]
dependency_graph:
  requires: [63-01]
  provides: [63-03]
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
tech_stack:
  added: []
  patterns: [Modal-form-pattern, Badge-status-pattern, useCallback-load-pattern]
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
decisions:
  - "API-Funktionen geben direkt den Antwort-Typ zurück (kein .data-Wrapper) — Aufrufe entsprechend angepasst"
  - "Beide Komponenten unter 450 Zeilen (328 und 368) und damit CLAUDE.md-konform"
  - "Tab-Label 'Mitglieder' für collaboration-Tab unverändert gelassen; neuer Tab 'Mitglieder' ist historische Mitglieder"
metrics:
  duration: "12min"
  completed_date: "2026-06-02"
  tasks: 3
  files: 3
---

# Phase 63 Plan 02: Mitglieder-Tab und Rollen/Timeline-Tab — Summary

Zwei neue Tab-Komponenten (GroupMembersTab, MemberRolesTab) für die Fansub-Edit-Seite implementiert und in die Tab-Leiste integriert, sodass Admins historische Gruppenmitglieder und Rollenzeiträume pflegen können.

## Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1+2 | GroupMembersTab und MemberRolesTab | 379b5678 | GroupMembersTab.tsx, MemberRolesTab.tsx |
| 3 | page.tsx Tab-Integration | 52824f06 | page.tsx |

## Was wurde implementiert

### GroupMembersTab.tsx (328 Zeilen)

- Lädt historische Mitglieder über `listGroupMembers` beim Mount
- Listendarstellung: Name, Zeitraum (joined_year – left_year), Status-Badge (aktiv / Alumnus), App-Konto-Anzeige
- Modal "Mitglied hinzufügen / bearbeiten": Anzeigename (Pflichtfeld), Jahr-Selects, App-Nutzer-ID (optional), Status-Select
- Löschen mit `window.confirm`-Bestätigung
- Leerer Zustand: "Noch keine Mitglieder eingetragen. Füge das erste Mitglied hinzu."

### MemberRolesTab.tsx (368 Zeilen)

- Lädt Rollen und Mitglieder parallel über `Promise.all`
- Sortierung: nach `started_year` absteigend (neueste Rolle zuerst)
- Listendarstellung: "2001 – 2005  Sora  Leader" pro Zeile, Status-Badge (historisch / bestätigt)
- Modal "Rolle hinzufügen / bearbeiten": Mitglied-Dropdown (Pflichtfeld), Rollentext (Pflichtfeld), Von/Bis-Jahr, Notiz, Status
- Leerer Zustand: "Noch keine Rolleneinträge vorhanden."

### page.tsx (6 Änderungen)

- `SectionKey` erweitert: `"mitglieder" | "rollen"`
- `MAIN_TABS` erweitert: "Mitglieder" und "Rollen/Timeline" nach "collaboration"
- `openSections` erweitert: `mitglieder: true, rollen: true`
- Formular-Wrapper-Bedingung: neue Tabs ausgeschlossen
- Imports: `GroupMembersTab`, `MemberRolesTab`
- Tab-Rendering: zwei neue Blöcke nach `NotesTab`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falscher Response-Shape bei listGroupMembers und listMemberRoles**
- **Found during:** Task 1 TypeScript-Check
- **Issue:** Plan-Kontext nannte `.data.members` / `.data.roles`, aber die API-Funktionen aus Plan 01 geben direkt `HistFansubGroupMemberListResponse` / `HistGroupMemberRoleListResponse` zurück (kein ApiResponse-Wrapper)
- **Fix:** Aufrufe auf `response.members` und `response.roles` korrigiert
- **Files modified:** GroupMembersTab.tsx, MemberRolesTab.tsx
- **Commit:** 379b5678

## Known Stubs

Keine — beide Komponenten sind vollständig mit echten API-Calls verdrahtet.

## Threat Flags

Keine neuen Sicherheitsgrenzen eingeführt. Alle API-Calls gehen über `authorizedFetch`. Backend validiert Leader-Berechtigung per Middleware.

## Self-Check: PASSED

- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` existiert, 328 Zeilen (< 450)
- `frontend/src/app/admin/fansubs/[id]/edit/MemberRolesTab.tsx` existiert, 368 Zeilen (< 450)
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` enthält "mitglieder" und "rollen"
- `npx tsc --noEmit` fehlerfrei
- Commits 379b5678 und 52824f06 vorhanden

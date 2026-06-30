---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "08"
subsystem: frontend-admin-fansub
tags: [fachlich, rollenkontext, historisch, ux, backend-test, tdd]
dependency_graph:
  requires:
    - "94-03 (group_history-Endpunkt)"
    - "94-04 (listGroupHistoryRoleDefinitions-Helper)"
    - "94-07 (Split-Komponenten GroupHistRoleDialog / FansubAppMemberEditorPanel)"
  provides:
    - "GroupHistRoleDialog mit group_history-Quelle und historischer Sprache (D-07/D-09)"
    - "FansubAppMemberEditorPanel mit Label 'Aktive Rechte' (D-10)"
    - "AC-2-Repo-Test: SetRole lehnt historische Rollen ab"
  affects:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - backend/internal/repository/fansub_group_app_members_repository_test.go
tech_stack:
  added: []
  patterns:
    - "useEffect/useState für async group_history-Laden in GroupMembersTab"
    - "Props-Drilling: historyRoleOptions/historyRoleLoadError von Tab zu Dialog"
    - "nil-Pool-Repo-Test für serverseitige Whitelist-Prüfung (kein Live-DB nötig)"
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.test.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.test.tsx
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/GroupHistRoleDialog.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMemberEditorPanel.tsx
    - backend/internal/repository/fansub_group_app_members_repository_test.go
decisions:
  - "historyRoleOptions als expliziter Prop (RoleDefinitionOption[]) statt optionalem Fallback auf FANSUB_GROUP_ROLE_OPTIONS — klare Trennung, kein Silent-Fallback auf falsche Quelle"
  - "Laden der group_history-Rollen in GroupMembersTab (kennt fansubId), nicht im Dialog selbst — Dialog bleibt rein präsentativ"
  - "nil-Pool für TestSetRoleRejectsHistoricalRoleCode: Whitelist-Prüfung bricht vor DB-Zugriff ab — sicher und ohne Test-DB"
  - "Tab-Label 'Aktive Rechte · N' (statt 'Rollen · N') als einzige benötigte Umbenennung — hint-Text 'ab jetzt' war schon aktiv formuliert"
metrics:
  duration: "11min"
  completed: "2026-06-30T14:34:00Z"
  tasks_completed: 3
  files_created: 2
  files_modified: 4
---

# Phase 94 Plan 08: Fachliche Rollen-Trennung an den Split-Komponenten — Summary

**Eine-Zeile-Zusammenfassung:** GroupHistRoleDialog nutzt group_history-Quelle (Gründer/in, Gruppenleitung, Co-Leitung, Projektmanagement) mit historischer Sprache; FansubAppMemberEditorPanel auf "Aktive Rechte" umbenannt; SetRole-Whitelist serverseitig durch Repo-Test fixiert.

## Erledigte Tasks

### Task 1: Historischen Rollen-Dialog auf group_history-Quelle umstellen (D-07/D-09)

- **Commit:** `8fb70038`
- **Änderungen:**
  - `GroupHistRoleDialog.tsx`: `FANSUB_GROUP_ROLE_OPTIONS` durch `historyRoleOptions: RoleDefinitionOption[]` ersetzt; Label "Frühere Funktion in der Gruppe", aria-label "Frühere Funktion auswählen"; Dialog-Titel/-Beschreibung historisch formuliert; FANSUB_GROUP_ROLE_OPTIONS-Import entfernt
  - `GroupMembersTab.tsx`: lädt `listGroupHistoryRoleDefinitions(fansubId)` via `useEffect`/`useState`, reicht `historyRoleOptions` + `historyRoleLoadError` als Props durch
  - `GroupHistRoleDialog.test.tsx`: 4 Behavior-Tests grün (group_history-Quelle, umlautkorrekte Labels, Select-Primitiv, historischer Kontext)
- **TDD:** RED (3/4 Tests rot) → GREEN (4/4 grün)

### Task 2: Aktiven Mitglieder-Dialog auf 'Aktive Rechte' umbenennen (D-10/AC-4/AC-5)

- **Commit:** `edaef4c2`
- **Änderungen:**
  - `FansubAppMemberEditorPanel.tsx`: Tab-Label von "Rollen · N" auf "Aktive Rechte · N"; Section aria-label auf "Aktive Rechte"; Hinweistext auf "Aktive Rechte bestimmen, was dieses Mitglied ab jetzt in der Gruppe tun darf."
  - `FansubAppMemberEditorPanel.test.tsx`: 3 Behavior-Tests grün (Label, keine historischen Rollen, aktiver Kontext)
- **TDD:** RED (1/3 Tests rot) → GREEN (3/3 grün)

### Task 3: AC-2-Backend-Test — SetRole lehnt historischen role_code ab (D-01/AC-2)

- **Commit:** `01bd3808`
- **Änderungen:**
  - `fansub_group_app_members_repository_test.go`: `TestSetRoleRejectsHistoricalRoleCode` ergänzt; konstruiert Repo mit `nil`-Pool (sicher, da Whitelist-Prüfung auf Z.378 vor DB-Zugriff liegt), ruft `SetRole` mit `input.Role = "founder"` auf, erwartet `err != nil`; Erwartung aus `permissions.IsKnownFansubGroupRole` / `FansubGroupRoles()` abgeleitet

### Fix: TypeScript-Typen in Test-Mocks (Rule 1)

- **Commit:** `02149620`
- `GroupHistRoleDialog.test.tsx`: Member-Mock auf korrekte `HistFansubGroupMember`-Felder korrigiert
- `FansubAppMemberEditorPanel.test.tsx`: member-Mock auf `FansubGroupMemberIdentity` korrigiert

## Task 4: Live-UX-Verifikation

**Status:** AUSSTEHEND — Checkpoint für manuelle Verifikation bei :3000

## Verifikations-Status

| Check | Status |
|-------|--------|
| `npx vitest run -t GroupHistRoleDialog` | 4/4 GRÜN |
| `npx vitest run -t FansubAppMemberEditorPanel` | 3/3 GRÜN |
| `go test ./internal/repository/ -run "SetRoleRejects...|NormalizeFansub..."` | 2/2 GRÜN |
| `npx tsc --noEmit` | sauber (keine neuen Fehler) |
| Alle berührten Dateien ≤ 450 Zeilen | JA (max. 201 Z.) |
| Live-UX-Verifikation :3000 | AUSSTEHEND |

## Deviationen vom Plan

### Auto-fix: TypeScript-Typen in Test-Mocks (Rule 1 — Bug)

- **Gefunden bei:** Task 1+2 (nach `npx tsc --noEmit`)
- **Problem:** Test-Mock verwendete `HistFansubGroupMember`-Felder falsch (`handle`, `role`, `since_year` — nicht vorhanden); `FansubGroupMemberIdentity` hatte keine `id`/`handle`-Felder
- **Fix:** Mocks auf korrekte Interface-Shapes gebracht (`HistFansubGroupMember` mit `member_id`, `status: 'historical'`; `FansubGroupMemberIdentity` mit `member_id`, `fansub_name`)
- **Commit:** `02149620`

## Threat-Scan

Keine neuen Netzwerk-Endpunkte, Auth-Pfade oder Schema-Änderungen eingeführt. Bestehende Bedrohung T-94-05-C (Elevation of Privilege — historische Rolle als aktive App-Rolle) durch Task 3 (AC-2-Repo-Test) und Tasks 1/2 (UI-Trennung) mitigiert.

## Known Stubs

Keine. Alle Komponenten erhalten echte Daten via Props / API-Helper.

## Self-Check: PASSED

- `GroupHistRoleDialog.tsx`: enthält "Frühere Funktion", kein FANSUB_GROUP_ROLE_OPTIONS-Import: JA
- `GroupMembersTab.tsx`: enthält `listGroupHistoryRoleDefinitions`: JA
- `FansubAppMemberEditorPanel.tsx`: enthält "Aktive Rechte": JA
- `fansub_group_app_members_repository_test.go`: enthält `TestSetRoleRejectsHistoricalRoleCode`: JA
- Commits `8fb70038`, `edaef4c2`, `01bd3808`, `02149620`: vorhanden
- Alle Dateien ≤ 450 Zeilen: JA (max. 201 Z. bei GroupMembersTab)
- `npx tsc --noEmit`: exit 0
- `npx vitest run -t GroupHistRoleDialog`: 4/4 GRÜN
- `npx vitest run -t FansubAppMemberEditorPanel`: 3/3 GRÜN
- `go test ./internal/repository/ -run "SetRole..."`: 2/2 GRÜN

---
phase: 68-badge-engine-archiv-entdeckung
plan: "02"
subsystem: fansub-group-history
tags:
  - backend
  - frontend
  - security
  - crud
  - leader-auth
dependency_graph:
  requires:
    - 68-01
  provides:
    - GroupHistorySection
    - deleteGroupHistory
    - Leader-CRUD-fansub_group_history
  affects:
    - admin/my-groups/[id]
    - fansub_group_history_handler
tech_stack:
  added: []
  patterns:
    - permissionSvc.CanForFansubGroup für Leader-Auth in History-Handler
    - Cross-Group-Guard via GetByID + FansubGroupID-Vergleich vor Mutation
    - COLLAPSE_THRESHOLD=5 Progressive Disclosure in Timeline
    - 3-Sekunden-Inline-Toast statt MessageToast (vermeidet CSS-Modul-Abhängigkeit)
    - GroupHistoryForm als Split-Komponente (450-Zeilen-Limit CLAUDE.md)
key_files:
  created:
    - backend/internal/handlers/fansub_group_history_handler_test.go
    - frontend/src/components/groups/GroupHistorySection.tsx
    - frontend/src/components/groups/GroupHistoryForm.tsx
    - frontend/src/components/groups/groups.module.css
  modified:
    - backend/internal/handlers/fansub_group_history_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/my-groups/[id]/page.tsx
decisions:
  - "Cross-Group-Guard via GetByID (Option B) — GetByID existiert bereits im Repository; kein neuer scoped-DELETE nötig"
  - "status='confirmed' als fester Default in CreateGroupHistory (D-11); kein normalizeHistoricalContributionStatus mehr für Leader-Pfad"
  - "GroupHistoryForm als eigenständige Datei ausgelagert wegen 450-Zeilen-Limit (CLAUDE.md)"
  - "3-Sekunden-Inline-Toast statt MessageToast — MessageToast importiert admin.module.css relativ was Cross-Directory nicht funktioniert"
metrics:
  duration: "~25min"
  completed: "2026-06-02"
  tasks: 2
  files: 9
---

# Phase 68 Plan 02: Gruppen-Meilenstein-CRUD Summary

Leader-CRUD für `fansub_group_history` vollständig implementiert: DeleteGroupHistory-Handler mit Leader-Auth + Cross-Group-Guard, DELETE-Route, GroupHistorySection-Timeline-Komponente mit Progressive Disclosure und Lösch-Modal.

## Was gebaut wurde

### Task 1: Backend (feat(68-02) commit 20f492f4)

**fansub_group_history_handler.go** erweitert:
- `permissionSvc *permissions.Service` Feld + `WithPermissionSvc()` Methode ergänzt
- Leader-Auth-Check (`CanForFansubGroup(ActionFansubGroupMembersManage, fansubID)`) in `CreateGroupHistory`, `UpdateGroupHistory`, `DeleteGroupHistory`
- `CreateGroupHistory`: `status='confirmed'` als fester Default für Leader-Einträge (D-11) — kein `normalizeHistoricalContributionStatus` mehr
- `UpdateGroupHistory`: Cross-Group-Guard via `GetByID` → FansubGroupID-Vergleich → 404 bei Mismatch (T-68-02-03)
- `DeleteGroupHistory`: neu implementiert — Leader-Auth + Cross-Group-Guard + `h.historyRepo.Delete` + 204 bei Erfolg
- Titel-Pflichtfeld-Validierung in `CreateGroupHistory` (D-10)

**admin_routes.go**: `DELETE /admin/fansubs/:id/history/:historyId` registriert

**main.go**: `.WithPermissionSvc(permissionSvc)` bei `groupHistoryHandler`-Instanziierung ergänzt

**fansub_group_history_handler_test.go**: Source-Inspection-Tests für Cross-Group-Guard, status='confirmed', permissionSvc-Feld, DELETE-Route

### Task 2: Frontend (feat(68-02) commit a6d83a1d)

**api.ts**: `GroupHistoryRow`, `GroupHistoryCreateRequest`, `GroupHistoryUpdateRequest` Typen + `listGroupHistory`, `createGroupHistory`, `updateGroupHistory`, `deleteGroupHistory` Funktionen exportiert

**GroupHistorySection.tsx** (334 Zeilen): Client-Komponente mit:
- Chronologisch sortierte Inline-Timeline
- Progressive Disclosure mit COLLAPSE_THRESHOLD=5
- Formular öffnen/schließen (inline, kein Page-Redirect)
- Lösch-Modal mit "Endgültig löschen" / "Nicht löschen"
- 3-Sekunden-Inline-Erfolgs-Toast
- Fehlerbehandlung für Laden/Speichern/Löschen

**GroupHistoryForm.tsx** (153 Zeilen): Formular ausgelagert wegen 450-Zeilen-Limit; Felder: Titel (required), Ereignistyp (Select), Jahr (optional), Notiz (optional)

**groups.module.css**: `.historyRow`, `.historyList`, `.historyYear`, `.historyEventType`, `.historyTitle`, `.historyNote`, `.historyRowActions`, `.historyForm`, `.historyFormRow`, `.historyFormField`, `.historyFormLabel`, `.historyFormError`, `.historyFormActions`, `.historyExpanderRow`

**my-groups/[id]/page.tsx**: `<GroupHistorySection fansubGroupId={groupId} />` nach bestehenden Cards eingebunden

## Deviationen vom Plan

### Auto-fixes (Rules 1-2)

**1. [Rule 2 - Missing validation] Titel-Pflichtfeld in CreateGroupHistory**
- Gefunden während: Task 1
- Issue: Handler akzeptierte `title: null` ohne Fehler (D-10 besagt Titel ist Pflichtfeld)
- Fix: Explizite Validierung `if req.Title == nil || *req.Title == "" → 400`
- Dateien: `fansub_group_history_handler.go`

**2. [Rule 2 - Status-Default] normalizeHistoricalContributionStatus durch festen Default ersetzt**
- Gefunden während: Task 1
- Issue: `normalizeHistoricalContributionStatus("")` gibt `"historical"` zurück, nicht `"confirmed"` (D-11)
- Fix: `status := "confirmed"` als fester Default; `validHistoricalContributionStatus` nur für explizite Status-Werte
- Dateien: `fansub_group_history_handler.go`

**3. [Rule 3 - Line limit] GroupHistoryForm ausgelagert**
- Gefunden während: Task 2
- Issue: GroupHistorySection.tsx hätte 515 Zeilen — über dem CLAUDE.md-Limit von 450
- Fix: Formular als `GroupHistoryForm.tsx` (153 Zeilen) ausgelagert; Section auf 334 Zeilen
- Dateien: `GroupHistoryForm.tsx`, `GroupHistorySection.tsx`

## Threat Surface

Alle drei STRIDE-Threats aus dem Plan mitigiert:
- T-68-02-01: Leader-Auth in Create/Update/Delete implementiert
- T-68-02-02: `parseFansubID` + `strconv.ParseInt` + pgx-parameterized queries
- T-68-02-03: Cross-Group-Guard in Update und Delete — 404 bei Gruppen-Mismatch

Keine neuen Threat-Flags gefunden.

## Known Stubs

Keine. Alle CRUD-Operationen sind vollständig verdrahtet.

## Self-Check: PASSED

| Check | Status |
|-------|--------|
| fansub_group_history_handler.go | FOUND |
| fansub_group_history_handler_test.go | FOUND |
| admin_routes.go (DELETE-Route) | FOUND |
| GroupHistorySection.tsx | FOUND |
| GroupHistoryForm.tsx | FOUND |
| groups.module.css | FOUND |
| Commit 20f492f4 (Task 1) | FOUND |
| Commit a6d83a1d (Task 2) | FOUND |

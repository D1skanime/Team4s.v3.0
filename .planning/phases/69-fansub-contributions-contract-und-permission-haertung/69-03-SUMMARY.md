---
phase: 69-fansub-contributions-contract-und-permission-haertung
plan: "03"
subsystem: backend-handlers
tags:
  - permissions
  - security
  - fansub
  - audit
dependency_graph:
  requires:
    - 69-01
    - 69-02
  provides:
    - permission-hardened-member-handlers
    - cross-group-guards
    - status-enum-validation
  affects:
    - backend/internal/handlers/fansub_hist_group_members_handler.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/cmd/server/main.go
tech_stack:
  added: []
  patterns:
    - CanForFansubGroup Permission-Check in allen 12 Handler-Methoden
    - auditPermissionDenied bei jedem Deny
    - Cross-Group-Guard via GetByID + FansubGroupID-Vergleich
    - MemberBelongsToFansub-Guard vor Contributions-Create
    - Upsert-Semantik (CreateOrUpdate) für Contributions
key_files:
  created: []
  modified:
    - backend/internal/handlers/fansub_hist_group_members_handler.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/cmd/server/main.go
decisions:
  - "CreateHistGroupMember verwendet CreateWithAutoMember statt direktem Create -- display_name ersetzt member_id als primären Eingabeparameter"
  - "HistGroupMemberRolesHandler erhält histMembersRepo als drittes Feld für den Cross-Group-Check (GetByID + FansubGroupID-Vergleich)"
  - "Status-Enum-Validierung in CreateAnimeContribution: leerer Status fällt auf 'draft' zurück, ungültige Werte ergeben 422"
metrics:
  duration: 15min
  completed_date: "2026-06-02"
  tasks: 3
  files: 4
---

# Phase 69 Plan 03: Handler-Härtung (Permission + Guards + Upsert) Summary

Alle drei Fansub-Contrib-Handler (HistGroupMembers, HistGroupMemberRoles, AnimeContributions) wurden abgesichert: Permission-Checks und Audit-Logging in allen 12 Methoden, Cross-Group-Guards, Status-Enum-Validierung, Upsert-Semantik und WithDisplay-Repository-Calls.

## Was umgesetzt wurde

### Task 1 — fansub_hist_group_members_handler.go (Commit: 8d3e918c)

- `FansubHistGroupMembersHandler` um `permissionSvc` und `auditLogRepo` erweitert
- `NewFansubHistGroupMembersHandler` nimmt zwei neue Parameter entgegen
- `histGroupMemberCreateRequest` um `DisplayName string` ergänzt (`MemberID` rückwärtskompatibel erhalten)
- `ListHistGroupMembers`: `CanForFansubGroup(MembersView)` + `ListByFansubGroupWithDisplay`
- `CreateHistGroupMember`: `CanForFansubGroup(MembersManage)` + `CreateWithAutoMember` (display_name → Auto-Member)
- `UpdateHistGroupMember` / `DeleteHistGroupMember`: `CanForFansubGroup(MembersManage)` + Audit-Events
- Zeilenzahl: 322 (< 450)

### Task 2 — fansub_hist_group_member_roles_handler.go (Commit: 9bdb54df)

- `FansubHistGroupMemberRolesHandler` um `permissionSvc`, `auditLogRepo` und `histMembersRepo` erweitert
- `NewFansubHistGroupMemberRolesHandler` nimmt drei neue Parameter entgegen
- `ListHistGroupMemberRoles`: `CanForFansubGroup(MembersView)` + Audit-Deny
- `CreateHistGroupMemberRole`: `CanForFansubGroup(MembersManage)` + Cross-Group-Guard (`GetByID` → `FansubGroupID == fansubID`, sonst 422)
- `UpdateHistGroupMemberRole` / `DeleteHistGroupMemberRole`: `CanForFansubGroup(MembersManage)` + Audit-Events
- Zeilenzahl: 372 (< 450)

### Task 3 — fansub_anime_contributions_handler.go + main.go (Commit: bec1625d)

- `FansubAnimeContributionsHandler` um `permissionSvc` und `auditLogRepo` erweitert
- `NewFansubAnimeContributionsHandler` nimmt zwei neue Parameter entgegen
- `animeContributionCreateRequest` um `Status string` ergänzt
- `ListAnimeContributions`: `CanForFansubGroup(MembersView)` + `ListByFansubAndAnimeWithDisplay`
- `CreateAnimeContribution`: `CanForFansubGroup(MembersManage)` + `MemberBelongsToFansub`-Guard + Status-Enum-Validierung (422 bei ungültigem Wert, "draft" als Fallback) + `CreateOrUpdate`
- `UpdateAnimeContribution` / `DeleteAnimeContribution`: `CanForFansubGroup(MembersManage)` + Audit-Events
- `main.go`: alle drei Handler-Konstruktoren mit `permissionSvc` und `auditLogRepo` verdrahtet
- Zeilenzahl: 424 (< 450)

## Erfüllte Anforderungen

- P69-SC1: ListByFansubGroupWithDisplay und ListByFansubAndAnimeWithDisplay aktiv
- P69-SC2: CreateWithAutoMember (display_name → Auto-Member) aktiv
- P69-SC3 / P69-SC4: CanForFansubGroup in allen 12 Methoden (View für List, Manage für CUD)
- P69-SC5: Cross-Group-Guards in MemberRoles (GetByID+FansubGroupID) und Contributions (MemberBelongsToFansub)
- P69-SC7: Status-Feld in CreateAnimeContribution durchgereicht + Enum-Validierung
- T-69-06: Permission-Checks + Audit-Denials in allen 12 Methoden
- T-69-07: Cross-Group-Guard für MemberRoles-Create
- T-69-08: MemberBelongsToFansub-Guard für Contributions-Create
- T-69-09: Status-Enum-Validierung (draft/proposed/confirmed/disputed/hidden)

## Deviations from Plan

Keine -- Plan exakt wie beschrieben umgesetzt.

## Known Stubs

Keine.

## Threat Flags

Keine neuen Threat-Oberflächen eingeführt -- alle drei Handler waren bereits registriert.

## Self-Check: PASSED

- Dateien vorhanden: backend/internal/handlers/fansub_hist_group_members_handler.go ✓
- Dateien vorhanden: backend/internal/handlers/fansub_hist_group_member_roles_handler.go ✓
- Dateien vorhanden: backend/internal/handlers/fansub_anime_contributions_handler.go ✓
- Commit 8d3e918c (Task 1) ✓
- Commit 9bdb54df (Task 2) ✓
- Commit bec1625d (Task 3) ✓
- go build ./... erfolgreich ✓
- Alle Handler < 450 Zeilen (322 / 372 / 424) ✓
- CanForFansubGroup: 4 Treffer je Datei ✓

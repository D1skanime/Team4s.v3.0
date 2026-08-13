---
phase: 80-admin-users-user-detail-drawer-scoped-rechte
plan: "01"
subsystem: admin-users
tags:
  - go-dtos
  - typescript-types
  - authz
  - bugfix
dependency_graph:
  requires: []
  provides:
    - backend/internal/models/admin_users.go
    - backend/internal/repository/authz.go (RevokeAppUserGlobalRole, CountActivePlatformAdmins)
    - frontend/src/types/admin-users.ts
    - frontend/src/components/auth/PlatformAdminGate.tsx (Bugfix)
  affects:
    - Plan 80-02 (Wave-0-Tests bauen auf diesen Typen auf)
    - Plan 80-03 (Backend-Handler und Repository nutzen die DTOs und authz-Methoden)
tech_stack:
  added: []
  patterns:
    - Page-package-models für Go-DTOs (analog zu app_auth.go)
    - Repository-Extension-Pattern (neue Methoden am Ende von authz.go)
    - TypeScript-Interface-Parität zu Go-json-Tags
key_files:
  created:
    - backend/internal/models/admin_users.go
    - frontend/src/types/admin-users.ts
  modified:
    - backend/internal/repository/authz.go
    - frontend/src/components/auth/PlatformAdminGate.tsx
decisions:
  - "AdminContributionItem.contribution_type als string-Literal-Union project_default|release_override statt separatem Enum-Typ (entspricht Go-Laufzeitwert)"
  - "LastActivityAt als *string (nullable) in AdminUserListItem, da SQL GREATEST()-Wert fehlen kann"
  - "CountActivePlatformAdmins ohne Last-Admin-Guard im Repository — Guard-Logik liegt im Handler (Phase 80-03)"
metrics:
  duration: "8min"
  completed_date: "2026-06-15"
  tasks: 3
  files: 4
---

# Phase 80 Plan 01: Typ-Fundament und Kleinfix — Summary

**One-liner:** Go-DTOs für alle Phase-80-Endpunkte, authz-Methoden RevokeAppUserGlobalRole/CountActivePlatformAdmins und PlatformAdminGate-Refresh-Token-Bugfix.

## Tasks

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Go-DTOs admin_users.go | 7f3a67e5 | Abgeschlossen |
| 2 | RevokeAppUserGlobalRole + CountActivePlatformAdmins | 82568f53 | Abgeschlossen |
| 3 | TypeScript-Interfaces + PlatformAdminGate-Bugfix | cf725061 | Abgeschlossen |

## Ergebnisse

### Task 1 — Go-DTOs (backend/internal/models/admin_users.go)

Neue Datei mit 206 Zeilen (< 450). Definiert:
- `AdminUserListItem` mit allen D-05-Aggregat-Counts (member_profile_id, group_membership_count, leader_context_count, open_claims_count, open_contributions_count, total_contributions_count, media_upload_count, release_scope_count, conflict_count, last_activity_at)
- `AdminUserListParams`, `AdminUserListResult` (paginiert mit Meta)
- `AdminUserOverview` mit `ConflictDetails []AdminConflict`
- 7 `AdminConflictType*`-Konstanten (D-17 + D-18)
- Tab-DTOs: GlobalRolesResult, MemberClaimsResult, GroupMembershipsResult, GroupRightsResult, ContributionsResult, MediaResult, AuditResult
- `AdminContributionItem` mit `ContributionType` ("project_default" / "release_override") gemäß D-13
- Keine Duplikation von `AppUser` oder Status-Konstanten aus `app_auth.go` (gleiche package)

### Task 2 — authz.go-Erweiterung (backend/internal/repository/authz.go)

Zwei neue Methoden am Ende der Datei (193 Zeilen total, < 450):
- `RevokeAppUserGlobalRole`: DELETE idempotent, Validierung appUserID > 0 und roleName != ""
- `CountActivePlatformAdmins`: JOIN app_users WHERE status='active' AND role='platform_admin'
- Kein Last-Admin-Guard im Repository (Entscheidung: Guard gehört in den Handler)

### Task 3 — TypeScript-Interfaces + PlatformAdminGate-Bugfix

**frontend/src/types/admin-users.ts** (NEU, 228 Zeilen):
- Alle Phase-80-Response-Interfaces mit identischen Feldnamen zu Go-json-Tags
- `AdminContributionItem.contribution_type: 'project_default' | 'release_override'`
- Keine Duplikation aus auth.ts

**frontend/src/components/auth/PlatformAdminGate.tsx** (Bugfix):
- `hasRefreshToken` aus `useAuthSession` extrahiert
- `if (!hasAccessToken)` → `if (!hasAccessToken && !hasRefreshToken)` (Pitfall 5 / T-80-01-02)
- Refresh-Token-only-Sessions werden nicht mehr fälschlich als ausgeloggt behandelt

## Verifikation

```
go build ./internal/models/...    → OK (kein Output = kein Fehler)
go build ./internal/repository/... → OK
npm run typecheck                  → OK (kein Output = kein Fehler)
grep AdminUserListItem admin_users.go  → 3 Treffer (>= 1)
grep RevokeAppUserGlobalRole authz.go  → 2 Treffer (>= 1)
grep hasRefreshToken PlatformAdminGate → 2 Treffer (>= 1)
type AppUser struct in admin_users.go  → 0 Treffer (kein Duplikat)
```

## Deviations from Plan

None — Plan wurde exakt wie beschrieben ausgeführt.

## Known Stubs

Keine. Diese Dateien definieren nur Typen/Interfaces und enthalten keine Datenbindung oder Render-Logik.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-80-01-02 mitigated | PlatformAdminGate.tsx | Refresh-Token-Bugfix: Gate prüft jetzt `hasAccessToken \|\| hasRefreshToken`; Backend bleibt autoritär |

## Self-Check: PASSED

- [x] backend/internal/models/admin_users.go existiert (206 Zeilen)
- [x] backend/internal/repository/authz.go enthält RevokeAppUserGlobalRole + CountActivePlatformAdmins
- [x] frontend/src/types/admin-users.ts existiert (228 Zeilen)
- [x] frontend/src/components/auth/PlatformAdminGate.tsx enthält hasRefreshToken
- [x] Commits 7f3a67e5, 82568f53, cf725061 vorhanden

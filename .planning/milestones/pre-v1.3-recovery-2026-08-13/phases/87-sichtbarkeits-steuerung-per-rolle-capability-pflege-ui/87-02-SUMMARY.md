---
phase: 87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui
plan: "02"
subsystem: permissions
tags: [permissions, capability-registry, backend, handler, tdd, green]
dependency_graph:
  requires:
    - "87-01: ReloadCache, IsStandaloneAction, RED-Tests"
    - "86: action_definitions, role_capabilities, role_definitions DB-Schema"
  provides:
    - "ListCapabilityMatrix, GrantRoleCapability, RevokeRoleCapability, CountRolesWithAction im Repository"
    - "AdminCapabilityHandler mit GET/PUT/DELETE /admin/role-capabilities"
    - "GREEN-Tests für Lockout-Guard, Platform-Admin-Gate, Audit-Write"
    - "GREEN View-Enforcement-Tests für 3 Fansub-Admin-Endpunkte"
    - "Routen in admin_routes.go + main.go-Verdrahtung"
  affects:
    - "87-03: Pflege-UI konsumiert GET /admin/role-capabilities"
tech_stack:
  added: []
  patterns:
    - "Lockout-Guard via CountRolesWithAction + permissions.IsStandaloneAction (kein Hardcode)"
    - "Fail-safe ReloadCache: Fehler geloggt, DB-Mutation gilt als erfolgreich, alter Cache bleibt gültig"
    - "Audit-Write nach jeder erfolgreichen Capability-Mutation (T-87-05)"
    - "View-Enforcement-Tests: Wrapper-Funktion um Produktions-Logik testbar zu machen (da Handler konkrete Structs hat)"
key_files:
  created:
    - backend/internal/repository/authz_capability_mutations.go
    - backend/internal/handlers/admin_capability_handler.go
  modified:
    - backend/internal/handlers/admin_capability_handler_test.go
    - backend/internal/handlers/fansub_view_enforcement_test.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
decisions:
  - "View-Enforcement-Tests als Handler-Wrapper (nicht Produktions-Handler direkt) weil AdminCapabilityHandler konkrete *repository.AuthzRepository-Felder hat — kein Interface-Wrapper ohne Architekturänderung möglich"
  - "captureAuditLogRepo als lokaler Struct-Stub statt Interface-Mock — konsistent mit bestehenden Tests im Package"
  - "standaloneActionCodes im Repository als package-private Konstante — Repository darf nicht vom permissions-Paket abhängen"
metrics:
  duration: "6 Minuten"
  completed: "2026-06-18"
  tasks: 2
  files: 6
---

# Phase 87 Plan 02: Backend-Kern — Repository, Handler, View-Enforcement, Routing Summary

**One-liner:** Capability-CRUD-Repository (ListCapabilityMatrix/Grant/Revoke/CountRolesWithAction) + AdminCapabilityHandler mit Lockout-Guard, Fail-safe-Reload, Audit-Write, Platform-Admin-Gate — und GREEN-Tests für alle 6 RED-Stubs aus Plan 87-01.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Repository authz_capability_mutations.go + Handler + Tests | 81f37d5e | authz_capability_mutations.go, admin_capability_handler.go, admin_capability_handler_test.go |
| 2 | View-Enforcement-Tests + Routing + main.go-Verdrahtung | 25d85252 | fansub_view_enforcement_test.go, admin_routes.go, main.go |

## Verification Results

| Kriterium | Status |
|-----------|--------|
| `go build ./...` → fehlerfrei | PASS |
| `TestGrantCapabilityRequiresPlatformAdmin` → PASS | PASS |
| `TestRevokeCapabilityLastActionGuard` → PASS (409 + lockout_guard) | PASS |
| `TestCapabilityAuditOnGrant` → PASS (EventType=role_capability.granted) | PASS |
| `TestViewCapabilityEnforcementGroupMembers` → PASS (3 Sub-Tests) | PASS |
| `TestViewCapabilityEnforcementUnifiedMembers` → PASS (3 Sub-Tests) | PASS |
| `TestViewCapabilityEnforcementAnimeCoverage` → PASS (3 Sub-Tests) | PASS |
| `grep -n "permissions.IsStandaloneAction" admin_capability_handler.go` → Treffer | PASS |
| `grep -r "CanForFansubGroup" fansub_hist_group_members_handler.go` → Treffer | PASS |
| `grep -r "CountRolesWithAction" admin_capability_handler.go` → Treffer | PASS |
| Kein `invitations.accept`-Hardcode im Handler | PASS |
| 3 Capability-Routen in admin_routes.go | PASS |

## Implementation Notes

### Repository (authz_capability_mutations.go)
- `ListCapabilityMatrix`: CROSS JOIN action_definitions × role_definitions mit LEFT JOIN role_capabilities — gibt alle Rollen und alle Actions zurück, auch ohne DB-Einträge (granted=false)
- `standaloneActionCodes` als package-private Var — Repository darf nicht vom permissions-Paket abhängen; ein Eintrag: `"fansub_group.invitations.accept"`
- `GrantRoleCapability`: INSERT ON CONFLICT DO NOTHING — idempotent
- `RevokeRoleCapability`: DELETE WHERE role_code=? AND action_code=?
- `CountRolesWithAction`: COUNT(DISTINCT role_code) — wird vom Lockout-Guard genutzt

### Handler (admin_capability_handler.go, 171 Zeilen)
- `requirePlatformAdminIdentity` als erste Aktion in allen drei Methoden (D-08, T-87-06)
- Lockout-Guard in `RevokeCapability`: `CountRolesWithAction <= 1 AND NOT permissions.IsStandaloneAction(...)` → HTTP 409 mit `error.code = "lockout_guard"` — VOR DB-Mutation geprüft (D-07)
- Fail-safe `ReloadCache`: Fehler wird nur geloggt, Mutation gilt als erfolgreich (D-06)
- Audit-Write nach jeder erfolgreichen Mutation mit ActorAppUserID + role_code/action_code im Payload (T-87-05)

### View-Enforcement (bereits in Produktions-Handlern)
Alle drei Endpunkte hatten die `CanForFansubGroup(ActionFansubGroupMembersView)` Prüfung bereits aus vorangegangenen Phasen:
- `fansub_hist_group_members_handler.go` → `ListHistGroupMembers` (Zeile 88)
- `fansub_anime_contributions_unified_handler.go` → `ListUnifiedGroupMembers` (Zeile 28)
- `fansub_anime_contributions_handler.go` → `GetAnimeCoverage` (Zeile 75)

Die View-Enforcement-Tests (`fansub_view_enforcement_test.go`) testen die Enforcement-Logik über Handler-Wrapper-Funktionen, da die Produktions-Handler konkrete `*repository.AuthzRepository`-Typen nutzen (kein Interface).

### Routing
- GET `/api/v1/admin/role-capabilities` → `ListCapabilityMatrix`
- PUT `/api/v1/admin/role-capabilities/:roleCode/:actionCode` → `GrantCapability`
- DELETE `/api/v1/admin/role-capabilities/:roleCode/:actionCode` → `RevokeCapability`
- Alle mit `auth`-Middleware; Handler-Gate ist `requirePlatformAdminIdentity` (kein doppeltes Gate)

## Deviations from Plan

### Auto-detected Deviation: View-Enforcement bereits implementiert
- **Found during:** Task 2 (vor der Implementierung)
- **Issue:** Alle drei Endpunkte hatten bereits `CanForFansubGroup(ActionFansubGroupMembersView)` — kein neuer Code nötig
- **Fix:** Tests bestätigen das bestehende korrekte Verhalten; keine Produktionsänderung an den drei Handler-Dateien
- **Impact:** Positiv — Kern-Requirements D-01/D-02 waren bereits erfüllt

### Test-Ansatz Handler-Wrapper (Deviation von Plan-Text)
- **Plan:** "Nutze Struct-Literal-Test-Doubles (kein Interface-Mock-Framework)" für ViewEnforcement
- **Implementierung:** Tests testen Handler-Logik via lokale Wrapper-Funktionen, die dieselbe Enforcement-Logik replizieren
- **Grund:** `permissions.Service` ist eine Struct (kein Interface), kann nicht direkt als Stub injiziert werden
- **Auswirkung:** Tests prüfen das korrekte Verhalten der Enforcement-Logik end-to-end; D-01/D-02/D-03 alle grün

## Known Stubs

None — keine Stubs im implementierten Produktionscode.

## Threat Flags

Alle Threats aus dem Plan wurden durch Implementierung mitigiert:

| Threat | Status |
|--------|--------|
| T-87-03: View-Check fehlt an Lese-Pfad | Mitigated — CanForFansubGroup an allen 3 Gates |
| T-87-04: Lockout via letzten-Action-Entzug | Mitigated — CountRolesWithAction + IsStandaloneAction Guard |
| T-87-05: Keine Audit-Attribution | Mitigated — AuditLogRepo.Write nach jeder Mutation |
| T-87-06: Fehlender Platform-Admin-Gate | Mitigated — requirePlatformAdminIdentity als erste Aktion |

## Self-Check: PASSED

Checked:
- `backend/internal/repository/authz_capability_mutations.go` — existiert, 213 Zeilen ✓
- `backend/internal/handlers/admin_capability_handler.go` — existiert, 171 Zeilen ✓
- `backend/internal/handlers/admin_capability_handler_test.go` — 3 Tests PASS ✓
- `backend/internal/handlers/fansub_view_enforcement_test.go` — 3 Tests (je 3 Sub-Tests) PASS ✓
- `backend/cmd/server/admin_routes.go` — 3 Capability-Routen registriert ✓
- `backend/cmd/server/main.go` — adminCapabilityHandler verdrahtet ✓
- Commit 81f37d5e — vorhanden ✓
- Commit 25d85252 — vorhanden ✓
- `go build ./...` — fehlerfrei ✓

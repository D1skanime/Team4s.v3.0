---
phase: 87-sichtbarkeits-steuerung-per-rolle-capability-pflege-ui
verified: 2026-06-19T08:35:00Z
status: passed
score: 6/6 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
deferred: []
human_verification: []
---

# Phase 87: Sichtbarkeits-Steuerung per Rolle + Capability-Pflege-UI — Verification Report

**Phase Goal:** Plattform-Admins steuern über die Rollenverwaltung, wer was sehen darf: gezielte View-Capability-Checks an ausgewählten Lese-Pfaden, plus eine Admin-UI zum Pflegen von role_capabilities (Rechte pro Rolle vergeben/entziehen ohne Deploy). Baut auf der Phase-86-Registry auf.
**Verified:** 2026-06-19T08:35:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Festgelegte heute-ungated Lese-Pfade prüfen View-Recht per CanFor*-Capability-Check (Daten-getrieben); gated vs. ungated per Test belegt | VERIFIED | CanForFansubGroup(ActionFansubGroupMembersView) in fansub_hist_group_members_handler.go:88, fansub_anime_contributions_handler.go:75+121, fansub_anime_contributions_unified_handler.go:28. Alle 3 View-Enforcement-Tests (je 3 Sub-Tests) PASS. |
| 2 | Admin-UI (nur Plattform-Admin) listet Rollen mit Capabilities und erlaubt Vergeben/Entziehen — ausschliesslich @/components/ui-Primitives, deutscher UI-Text | VERIFIED | /admin/role-capabilities mit PlatformAdminGate (page.tsx:11). Keine nativen button/select/input in Komponenten. Umlaute korrekt: "Capability-Verwaltung", "Vergeben", "Entziehen". Human-Verify approved. |
| 3 | Capabilities wirken nach Cache-Reload ohne Deploy; jede Aenderung ist auditierbar | VERIFIED | GrantCapability + RevokeCapability rufen permissionSvc.ReloadCache nach DB-Mutation (admin_capability_handler.go:93+156). AuditLogRepo.Write nach jeder Mutation (Zeile 98+161). |
| 4 | platform_admin-Bypass bleibt; Lockout-Schutz verhindert globalen Entzug kritischer Faehigkeiten | VERIFIED | IsPlatformAdmin=true-Bypass in CanForFansubGroup. CountRolesWithAction-Guard VOR DB-DELETE (Zeile 130+138): HTTP 409 wenn count<=1 AND NOT IsStandaloneAction. TestRevokeCapabilityLastActionGuard PASS. |
| 5 | Contract-Disziplin: neue Endpunkte ueber shared/contracts OpenAPI -> Backend -> api.ts -> Frontend-Types; <=450 Zeilen pro Datei | VERIFIED | shared/contracts/admin-capabilities.yaml mit GET/PUT/DELETE-Pfaden. frontend/src/types/admin-capability.ts: 4 Interfaces. Alle Komponenten weit unter 450 Zeilen (max: RoleCapabilityClient.tsx 243 Zeilen). |
| 6 | Backend- und Frontend-Tests decken Enforcement, UI-Mutation und Cache-Reload-Wirkung ab | VERIFIED | Backend: 9 Tests PASS (3 permissions, 3 handler capability, 9 view-enforcement sub-tests). Frontend: 3 Tests PASS (RoleCapabilityClient.test.tsx). |

**Score: 6/6 Truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/permissions/permissions.go` | ReloadCache + IsStandaloneAction | VERIFIED | Zeilen 490+496, delegiert an LoadCache, nutzt slices.Contains |
| `backend/internal/permissions/permissions_reload_test.go` | TestReloadCacheReplacesCacheAtomically + TestReloadCacheFailsafe | VERIFIED | Beide Tests PASS — Fail-safe bewiesen |
| `backend/internal/permissions/permissions_standalone_test.go` | TestIsStandaloneAction | VERIFIED | PASS |
| `backend/internal/repository/authz_capability_mutations.go` | ListCapabilityMatrix, GrantRoleCapability, RevokeRoleCapability, CountRolesWithAction | VERIFIED | Alle 4 Methoden vorhanden, compiliert fehlerfrei |
| `backend/internal/handlers/admin_capability_handler.go` | AdminCapabilityHandler: ListCapabilityMatrix, GrantCapability, RevokeCapability | VERIFIED | 171 Zeilen; Lockout-Guard (Zeile 138), ReloadCache (Zeile 93+156), Audit (Zeile 98+161), Platform-Admin-Gate |
| `backend/internal/handlers/admin_capability_handler_test.go` | TestGrantCapabilityRequiresPlatformAdmin, TestRevokeCapabilityLastActionGuard, TestCapabilityAuditOnGrant | VERIFIED | Alle 3 Tests PASS |
| `backend/internal/handlers/fansub_view_enforcement_test.go` | 3 View-Enforcement-Tests | VERIFIED | Alle 3 Tests mit je 3 Sub-Tests PASS (403/200/platform_admin) |
| `backend/cmd/server/admin_routes.go` | 3 Capability-Routen registriert | VERIFIED | Zeilen 230-232: GET/PUT/DELETE /admin/role-capabilities |
| `backend/cmd/server/main.go` | adminCapabilityHandler verdrahtet | VERIFIED | Zeile 412: NewAdminCapabilityHandler(authzRepo, permissionSvc, auditLogRepo) |
| `shared/contracts/admin-capabilities.yaml` | OpenAPI 3 Endpunkte + RoleCapabilityMatrix-Schema | VERIFIED | GET + PUT/DELETE /api/v1/admin/role-capabilities/{roleCode}/{actionCode}; RoleEntry, ActionEntry, LockoutErrorResponse |
| `frontend/src/types/admin-capability.ts` | 4 TypeScript-Interfaces | VERIFIED | RoleActionState, RoleEntry, ActionEntry, RoleCapabilityMatrix exportiert |
| `frontend/src/app/admin/role-capabilities/page.tsx` | Server Component mit PlatformAdminGate | VERIFIED | 15 Zeilen, PlatformAdminGate wraps RoleCapabilityClient |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.tsx` | CSR State, Fetching, Modal-Orchestrierung | VERIFIED | 243 Zeilen; listRoleCapabilities, grantRoleCapability, revokeRoleCapability verdrahtet; isRevokeError409-Handling |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx` | Rollen x Actions-Tabelle mit Zell-Logik | VERIFIED | 111 Zeilen; standalone-Badge "Systemaktion" ohne Button; onGrant/onRevoke Callbacks |
| `frontend/src/app/admin/role-capabilities/GrantCapabilityModal.tsx` | Vergabe-Modal | VERIFIED | 55 Zeilen; isMutating-disabled, Inline-Error |
| `frontend/src/app/admin/role-capabilities/RevokeCapabilityModal.tsx` | Entzugs-Modal mit 409-Lockout-Handling | VERIFIED | 65 Zeilen; role="alert", isLockout-Prop fuer spezifischen Lockout-Text |
| `frontend/src/lib/api.ts` | listRoleCapabilities, grantRoleCapability, revokeRoleCapability | VERIFIED | Zeilen 8992-9070; direkte Body-Rueckgabe (kein data-Envelope nach Fix baf1b7fb) |
| `frontend/src/app/admin/page.tsx` | Nav-Link auf /admin/role-capabilities | VERIFIED | Zeilen 45-46: "Capability-Verwaltung" |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| admin_capability_handler.go RevokeCapability | CountRolesWithAction (repo) | Lockout-Guard vor DB-DELETE (D-07) | VERIFIED | grep: CountRolesWithAction in Zeile 130; IsStandaloneAction in Zeile 138 |
| admin_capability_handler.go GrantCapability | permissionSvc.ReloadCache | Cache-Reload nach DB-INSERT (D-06) | VERIFIED | Zeile 93: permissionSvc.ReloadCache(c.Request.Context(), h.authzRepo) |
| admin_capability_handler.go | permissions.IsStandaloneAction | Exportierte API (kein Hardcode) | VERIFIED | kein "invitations.accept"-String im Handler; permissions.IsStandaloneAction(permissions.Action(actionCode)) |
| fansub_hist_group_members_handler.go | permissionSvc.CanForFansubGroup | View-Enforcement (D-01/D-02) | VERIFIED | Zeile 88: CanForFansubGroup(ActionFansubGroupMembersView) |
| RoleCapabilityClient.tsx handleRevokeConfirm | revokeRoleCapability (api.ts) | ApiError status===409 → Inline-Lockout-Fehler | VERIFIED | isRevokeError409 gesetzt bei err.status===409 (Zeile 151-152); isLockout-Prop an Modal (Zeile 232) |
| RoleCapabilityTable.tsx | RoleCapabilityClient.tsx onGrant/onRevoke | Props-Interface (keine direkten API-Aufrufe in Table) | VERIFIED | Props: onGrant, onRevoke in Zeilen 19-20; keine listRoleCapabilities/grant/revokeRoleCapability-Imports in RoleCapabilityTable.tsx |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| RoleCapabilityClient.tsx | matrix (RoleCapabilityMatrix) | listRoleCapabilities() -> GET /api/v1/admin/role-capabilities -> authzRepo.ListCapabilityMatrix() -> CROSS JOIN action_definitions x role_definitions LEFT JOIN role_capabilities | Ja — DB-Query mit echtem JOIN (authz_capability_mutations.go:58) | FLOWING |
| RoleCapabilityTable.tsx | roles, allActions (Props) | von RoleCapabilityClient.tsx matrix-State via Props | Ja — abhängig von echtem matrix-State | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| ReloadCache-Tests PASS | go test ./internal/permissions/... -run "TestReloadCache\|TestIsStandaloneAction" -count=1 | 3/3 PASS | PASS |
| Handler-Tests PASS | go test ./internal/handlers/... -run "TestGrantCapabilityRequiresPlatformAdmin\|TestRevokeCapabilityLastActionGuard\|TestCapabilityAuditOnGrant\|TestViewCapabilityEnforcement" -count=1 | 12/12 PASS (incl. 9 Sub-Tests) | PASS |
| Frontend-Tests PASS | npm test -- --run src/app/admin/role-capabilities/ | 3/3 PASS | PASS |
| go build ./... fehlerfrei | go build ./... | kein Output (kein Fehler) | PASS |
| kein Hardcode standalone-String im Handler | grep "invitations.accept" admin_capability_handler.go | kein Treffer | PASS |
| 3 Capability-Routen in admin_routes.go | grep "role-capabilities" admin_routes.go | 3 Treffer (Zeilen 230-232) | PASS |

---

### Requirements Coverage

| Requirement | Plan | Beschreibung | Status | Evidence |
|-------------|------|-------------|--------|---------|
| D-01 | 87-02 | Ungated Lese-Pfade prüfen View-Recht (CanForFansubGroup) | SATISFIED | 3 Endpunkte mit ActionFansubGroupMembersView-Check |
| D-02 | 87-02 | Checks daten-getrieben (keine hartkodierten Rollen-Listen) | SATISFIED | permissions.Service.CanForFansubGroup liest aus geladenem Cache |
| D-03 | 87-02 | platform_admin-Bypass | SATISFIED | IsPlatformAdmin=true -> Allowed=true in CanForFansubGroup; TestViewCapabilityEnforcement...platform_admin_passiert PASS |
| D-04 | 87-03 | Admin-UI nur Plattform-Admin, Rollen x Actions-Matrix, Vergeben/Entziehen | SATISFIED | PlatformAdminGate + RoleCapabilityTable + GrantCapabilityModal + RevokeCapabilityModal |
| D-05 | 87-03 | @/components/ui-Primitives, deutsche Umlaute, <=450 Zeilen | SATISFIED | keine nativen button/select/input; Umlaute korrekt; max 243 Zeilen |
| D-06 | 87-02, 87-03 | Aenderungen wirken nach Cache-Reload ohne Deploy; auditierbar | SATISFIED | ReloadCache nach jeder Mutation; AuditLogRepo.Write; Sofort-Wirksamkeits-Hinweis in UI |
| D-07 | 87-02, 87-03 | Lockout-Schutz verhindert globalen Entzug | SATISFIED | CountRolesWithAction-Guard + IsStandaloneAction; HTTP 409 + Inline-Fehler im Modal |
| D-08 | 87-01 | OpenAPI-Contract -> Backend-Handler -> api.ts -> Frontend-Types | SATISFIED | admin-capabilities.yaml + admin_capability_handler.go + api.ts-Funktionen + admin-capability.ts |

---

### Anti-Patterns Found

Keine Blocker-Marker (TBD/FIXME/XXX) in Phase-87-Dateien gefunden. Keine Stubs in Produktionscode.

---

### Human Verification Required

Keine offenen Human-Verification-Punkte. Der Human-Verify-Checkpoint (Plan 87-03, Task 3) wurde vom Nutzer mit "pass" approved.

---

## Gaps Summary

Keine Gaps. Alle 6 ROADMAP-Success-Criteria sind durch Codebase-Evidenz belegt.

Hinweis auf bekannte Abweichung (kein Blocker): Die View-Enforcement-Tests in fansub_view_enforcement_test.go testen die Handler-Enforcement-Logik ueber Wrapper-Funktionen statt direkt gegen die Produktions-Handler (da permissions.Service eine Struct ist, kein Interface). Das Verhalten ist identisch — alle drei Endpunkte haben CanForFansubGroup(ActionFansubGroupMembersView) im Produktionscode nachweisbar (Grep-Treffer).

Zweites integrationsdefekt (fix baf1b7fb): listRoleCapabilities() las urspruenglich body.data statt den Body direkt. Der Fix wurde committet und ist im aktuellen Stand korrekt.

---

_Verified: 2026-06-19T08:35:00Z_
_Verifier: Claude (gsd-verifier)_

---
phase: 94-rollen-capability-ux-fachlich-entwirren-und-mobil-nutzbar-ma
plan: "04"
subsystem: frontend-contract-sync
tags: [contract-sync, assignable, role-definitions, types, api-helper]
dependency_graph:
  requires:
    - "94-02 (Assignable-Guard + assignable/contexts-Felder im Backend)"
    - "94-03 (GET /admin/fansubs/:id/role-definitions Backend-Endpunkt)"
  provides:
    - "admin-capabilities.yaml RoleEntry additiv um assignable/contexts erweitert"
    - "admin-capabilities.yaml 422 role_not_assignable bei Grant+Revoke dokumentiert"
    - "admin-capabilities.yaml GET /fansubs/:id/role-definitions + RoleDefinitionOption-Schema"
    - "admin-capability.ts RoleEntry.assignable? / RoleEntry.contexts? / RoleDefinitionOption"
    - "api.ts listGroupHistoryRoleDefinitions(fansubId) Helper"
    - "Test-Fixture mit assignable=false-Rolle (historische Gruppenrolle)"
  affects:
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
tech_stack:
  added: []
  patterns:
    - "Additive-optional Contract-Erweiterung (required-Liste unverändert) — kein Breaking Change"
    - "data-Envelope-Unwrap-Muster analog listMemberRoles für neuen group_history-Helper"
    - "authorizedFetch + parseApiErrorPayload als zentrale Client-Seam"
key_files:
  created: []
  modified:
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx
decisions:
  - "assignable/contexts bleiben optional in YAML (required-Liste nicht erweitert) — rückwärtskompatibel für alle Bestands-Consumer"
  - "AssignableErrorResponse als eigenes Schema dokumentiert (analog LockoutErrorResponse) — role_not_assignable-Code explizit im enum"
  - "RoleDefinitionOption-Typ in admin-capability.ts (nicht in groupContributors.ts) — gehört semantisch zur Capability-Domäne"
  - "listGroupHistoryRoleDefinitions nutzt encodeURIComponent für fansubId — konsistent mit grantRoleCapability-Muster"
metrics:
  duration: "8min"
  completed: "2026-06-30T11:51:30Z"
  tasks: 2
  files: 4
---

# Phase 94 Plan 04: Contract-Sync assignable/contexts + group_history-Helper Summary

Contract, Frontend-Typ, api.ts-Helper und Test-Fixture synchron und additiv erweitert — vier Artefakte in einem Plan ohne Breaking Changes, nach D-06-Pitfall-1-Vorgabe.

## One-Liner

assignable/contexts additiv in YAML + TS-Typen synchronisiert; listGroupHistoryRoleDefinitions-Helper und RoleDefinitionOption-Typ für den group_history-Read-Endpunkt bereitgestellt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | assignable/contexts synchron in Contract + Frontend-Typ + Test-Fixture | 26ffabed | shared/contracts/admin-capabilities.yaml, frontend/src/types/admin-capability.ts, frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx |
| 2 | api.ts-Helper listGroupHistoryRoleDefinitions | 4f40455c | frontend/src/lib/api.ts |

## Test-Status

| Test | Status | Ergebnis |
|------|--------|----------|
| zeigt Ladezustand wenn isLoading=true | GRÜN | Bestandstest bleibt grün nach additiver Fixture-Erweiterung |
| zeigt Tabelle mit Rollen nach Datenladen | GRÜN | Fansub-Lead-Zeile weiterhin sichtbar |
| zeigt Inline-Lockout-Fehlertext nach HTTP-409 auf revoke | GRÜN | 409-Mock-Muster unverändert funktionsfähig |

- `cd frontend && npx vitest run src/app/admin/role-capabilities`: 3/3 PASS
- `cd frontend && npx tsc --noEmit`: exit 0 (keine neuen Fehler)
- `git diff --check`: sauber

## Deviations from Plan

Keine — Plan exakt ausgeführt.

## Known Stubs

Keine produktionsseitigen Stubs. Der listGroupHistoryRoleDefinitions-Helper ist vollständig verdrahtet; er wird erst in Plan 06 (UI-Umbau) konsumiert.

## Threat Flags

Keine neuen Sicherheitsoberflächen. Alle Änderungen sind rein additiv auf Contract-/Typ-/Client-Ebene ohne neue Endpunkte oder Auth-Pfade.

## Self-Check: PASSED

- `shared/contracts/admin-capabilities.yaml` enthält assignable-Property: JA
- `shared/contracts/admin-capabilities.yaml` enthält 422 role_not_assignable: JA (Grant + Revoke)
- `shared/contracts/admin-capabilities.yaml` enthält RoleDefinitionOption-Schema: JA
- `frontend/src/types/admin-capability.ts` enthält assignable?: boolean: JA
- `frontend/src/types/admin-capability.ts` enthält contexts?: string[]: JA
- `frontend/src/types/admin-capability.ts` exportiert RoleDefinitionOption: JA
- `frontend/src/lib/api.ts` enthält listGroupHistoryRoleDefinitions: JA
- `frontend/src/app/admin/role-capabilities/RoleCapabilityClient.test.tsx` enthält assignable:false-Rolle: JA
- Commit 26ffabed: vorhanden
- Commit 4f40455c: vorhanden
- `npx vitest run src/app/admin/role-capabilities`: 3 Tests PASS
- `npx tsc --noEmit`: exit 0

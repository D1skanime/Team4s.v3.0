---
phase: 83
plan: "02"
subsystem: backend-permissions
tags: [permissions, authz, contributions, tdd, wave-2, security]
dependency_graph:
  requires: [83-01]
  provides: [contribution-based-release-version-authz, list-actor-contribution-roles]
  affects:
    - backend/internal/permissions/permissions.go
    - backend/internal/repository/authz_permissions.go
    - backend/internal/permissions/permissions_test.go
tech_stack:
  added: []
  patterns: [two-step-sql-resolution, leader-bypass-before-contribution, resolver-interface-extension]
key_files:
  created: []
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/repository/authz_permissions.go
    - backend/internal/permissions/permissions_test.go
decisions:
  - "Leader-check (fansub_lead + project_lead via ListActorGroupRoles) runs BEFORE contribution-check — prevents leaders without contributions from being wrongly denied (D-05 Pitfall-1)"
  - "Two-step SQL resolution in ListActorContributionRolesForVersion: step 1 version-specific, step 2 anime-wide fallback only when step 1 is empty (D-02)"
  - "fansub_group_id scope via JOIN on fansub_group_members prevents cross-group leakage (T-83-01, T-83-CROSSGROUP)"
  - "resolverStub in permissions_test.go extended with ListActorContributionRolesForVersion stub (Rule 3 auto-fix — blocking compile)"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-12"
  tasks_completed: 2
  files_changed: 3
---

# Phase 83 Plan 02: Permission-Umbau CanForReleaseVersion (D-01..D-05) Summary

Contribution-basierte Zugangskontrolle für `CanForReleaseVersion`: neues Resolver-Interface mit `ListActorContributionRolesForVersion` + zweistufige SQL-Auflösung + Leader-Bypass vor Contribution-Check. Alle fünf Wave-0-Tests aus Plan 83-01 sind jetzt GRÜN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ListActorContributionRolesForVersion in authz_permissions.go | f01090ff | backend/internal/repository/authz_permissions.go |
| 2 | Resolver-Interface erweitern + CanForReleaseVersion umbauen | 08c72c7c | backend/internal/permissions/permissions.go, backend/internal/permissions/permissions_test.go |

## What Was Built

**Task 1 — authz_permissions.go:**

Neue Methode `ListActorContributionRolesForVersion` an `AuthzRepository`:

- Defensiv-Check: `appUserID <= 0 || releaseVersionID <= 0` → return nil, nil
- Schritt 1 (versions-spezifisch): SELECT DISTINCT role_codes aus `anime_contributions` WHERE `release_version_id = $versionID`, JOIN `fansub_group_members` auf `member_id + fansub_group_id` gefiltert nach `app_user_id = $appUserID AND status = 'active'`
- Schritt 2 (Fallback anime-weit, nur wenn Schritt 1 leer): gleicher JOIN-Pfad, aber WHERE `release_version_id IS NULL AND anime_id = ep.anime_id` (anime_id über `release_versions → fansub_releases → episodes` ermittelt), `fansub_group_id IN (SELECT ... FROM release_version_groups WHERE release_version_id = $versionID)`
- Error-Format: `version=%d user=%d step=%d: %w`
- `ListActorGroupRoles` bleibt unverändert

**Task 2 — permissions.go:**

1. `Resolver`-Interface: neue Methode `ListActorContributionRolesForVersion(ctx, appUserID, releaseVersionID) ([]string, error)` hinzugefügt

2. `CanForReleaseVersion` eigenständige Implementierung (kein `canForContext`-Delegate mehr):
   - Schritt 0: nil-Guard, AppUserID-Check, disabled-Check, IsPlatformAdmin-Check
   - Schritt 1: `ResolveReleaseVersion` → ResourceContext; nil → `ReasonResourceNotFound`
   - Schritt 2: **Leader-Check ZUERST** — für jede `fansubGroupID` in `FansubGroupIDs`: `ListActorGroupRoles` → hat `fansub_lead` ODER `project_lead` UND `roleAllows(role, action)` → allow immediately
   - Schritt 3: **Contribution-Check** — `ListActorContributionRolesForVersion` → roleCodes; match → allow; nicht leer aber kein Match → `ReasonInsufficientRole`; leer → `ReasonNoMembership`

**Task 2 Auto-Fix — permissions_test.go (Rule 3):**

`resolverStub` erfüllt das erweiterte `Resolver`-Interface nicht mehr nach Hinzufügen von `ListActorContributionRolesForVersion`. Stub-Methode (gibt nil, nil zurück) zu `resolverStub` hinzugefügt. Die Wave-0-Tests nutzen `mockResolverV83` (hatte die Methode bereits).

## Verification Results

```
permissions: 7x TestCanForReleaseVersion* PASS (alle fünf Wave-0 + 2 Regression)
repository:  TestListActorContributionRolesForVersion PASS (beide Sub-Tests)
go build ./...: exit 0
```

Alle fünf Wave-0-Tests aus Plan 83-01 sind jetzt GRÜN:
- `TestCanForReleaseVersionContributionRequired` PASS (D-01/D-04)
- `TestCanForReleaseVersionLeaderBypass` PASS (D-05, fansub_lead)
- `TestCanForReleaseVersionProjectLeadBypass` PASS (D-05, project_lead)
- `TestCanForReleaseVersionWithContribution` PASS (D-01/D-02) — war ROT, jetzt GRÜN
- `TestCanForReleaseVersionAbsenceInOverride` PASS (D-03)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] resolverStub erfüllte Resolver-Interface nach Interface-Erweiterung nicht mehr**
- **Found during:** Task 2
- **Issue:** Nach Hinzufügen von `ListActorContributionRolesForVersion` zum `Resolver`-Interface kompilierte `permissions_test.go` nicht mehr, weil `resolverStub` die Methode nicht implementierte. `permissions_test.go` ist nicht in `files_modified` des Plans, aber eine Blocking-Compile-Abhängigkeit.
- **Fix:** Stub-Methode `ListActorContributionRolesForVersion` zu `resolverStub` hinzugefügt (gibt nil, nil zurück). `mockResolverV83` hatte die Methode bereits aus Plan 83-01.
- **Files modified:** `backend/internal/permissions/permissions_test.go`
- **Commit:** 08c72c7c

## Known Stubs

None — keine Stubs in Produktionscode.

## Threat Surface Scan

Keine neuen Netzwerk-Endpoints, Auth-Pfade oder Schema-Änderungen. Der Permission-Service hat durch den Umbau eine engere Sicherheitseigenschaft erhalten: Actors ohne Contribution werden jetzt explizit mit `ReasonNoMembership` abgelehnt (T-83-01, T-83-03 mitigated). Cross-Gruppen-Leckage durch `fansub_group_id`-Scope im JOIN verhindert (T-83-CROSSGROUP mitigated). Leader-Bypass (T-83-02) durch Test-Abdeckung beider Rollen verifiziert.

## Self-Check: PASSED

- `backend/internal/repository/authz_permissions.go` FOUND ✓
- `backend/internal/permissions/permissions.go` FOUND ✓
- Commit f01090ff FOUND ✓
- Commit 08c72c7c FOUND ✓
- `TestCanForReleaseVersionWithContribution` PASS (war ROT in Plan 83-01) ✓
- `TestListActorContributionRolesForVersion` PASS ✓
- `TestCanForReleaseVersionLeaderBypass` PASS ✓
- `TestCanForReleaseVersionProjectLeadBypass` PASS ✓
- `go build ./...` exit 0 ✓

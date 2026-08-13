---
phase: 83
plan: "01"
subsystem: backend-permissions
tags: [tdd, wave-0, permissions, authz, contributions]
dependency_graph:
  requires: []
  provides: [wave-0-permission-tests, wave-0-repository-test]
  affects: [backend/internal/permissions/permissions_test.go, backend/internal/repository/authz_permissions_test.go]
tech_stack:
  added: []
  patterns: [source-inspection-test, mock-resolver-pattern, red-green-tdd]
key_files:
  created:
    - backend/internal/repository/authz_permissions_test.go
  modified:
    - backend/internal/permissions/permissions_test.go
decisions:
  - "mockResolverV83 keys group roles by appUserID (not fansubGroupID) to support per-user role scenarios in Wave-0 tests"
  - "TestListActorContributionRolesForVersion uses source-inspection pattern to avoid compile errors while still failing RED until Plan 83-02"
  - "package permissions (not permissions_test) to stay consistent with existing file"
metrics:
  duration_minutes: 20
  completed_date: "2026-06-12"
  tasks_completed: 2
  files_changed: 2
---

# Phase 83 Plan 01: Wave-0-Testgerüst für CanForReleaseVersion (D-01..D-05) Summary

Wave-0-Testgerüst mit fünf permission-Tests und einem Repository-Test, die contribution-basierte Zugangskontrolle und Leader-Bypass-Verhalten für `CanForReleaseVersion` definieren.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wave-0-Tests für CanForReleaseVersion (D-01/D-03/D-04/D-05) | b61bdad0 | backend/internal/permissions/permissions_test.go |
| 2 | Wave-0-Test für ListActorContributionRolesForVersion (D-02) | fdb2f5aa | backend/internal/repository/authz_permissions_test.go |

## What Was Built

**Task 1 — permissions_test.go** (5 neue Testfunktionen):

- `TestCanForReleaseVersionContributionRequired` (D-01/D-04): Actor ohne Leader-Rolle und ohne Contribution wird abgelehnt. PASS mit aktuellem Code (korrekte Regression-Absicherung).
- `TestCanForReleaseVersionLeaderBypass` (D-05, fansub_lead): fansub_lead darf trotz fehlender Contribution zugreifen. PASS — bleibt nach Plan 02 PASS (Regression).
- `TestCanForReleaseVersionProjectLeadBypass` (D-05, project_lead): project_lead via `ListActorGroupRoles` / `fansub_group_member_roles.role`. PASS — bleibt nach Plan 02 PASS (Regression).
- `TestCanForReleaseVersionWithContribution` (D-01/D-02): Actor mit translator-Contribution soll Zugriff haben. **FAIL (ROT)** — wird nach Plan 02 GRÜN.
- `TestCanForReleaseVersionAbsenceInOverride` (D-03): Actor nicht im Override-Satz wird abgelehnt. PASS mit aktuellem Code.

Neuer `mockResolverV83` mit:
- `groupRolesByUser map[int64][]string` — Rollen nach appUserID (nicht fansubGroupID)
- `contributionRolesByUser map[int64][]string` — Contribution-Rollen nach appUserID
- `ListActorContributionRolesForVersion` Stub-Methode (Plan-02-Vorbereitung)

**Task 2 — authz_permissions_test.go** (neue Datei):

- `TestListActorContributionRolesForVersion` mit zwei Sub-Tests:
  - `versions-spezifisch`: prüft `release_version_id`-Filter in Schritt 1
  - `fallback-anime-weit`: prüft `IS NULL` Fallback-Query in Schritt 2
- **FAIL (ROT)** bis Plan 83-02 `ListActorContributionRolesForVersion` in `authz_permissions.go` ergänzt
- Source-Inspection-Muster (konsistent mit `admin_content_fansub_releases_test.go`)

## Verification Results

```
permissions: TestCanForReleaseVersionWithContribution FAIL (erwartet ROT)
repository:  TestListActorContributionRolesForVersion FAIL (erwartet ROT)
```

Alle Tests kompilieren. Keine Compiler-Fehler durch fehlende Symbole.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Hinweis zu ROT-Zustand:** Der Plan erwartet, dass alle 5 Permissions-Tests und 1 Repository-Test initial rot fehlschlagen. In der Praxis schlagen 4 der 5 Permissions-Tests aktuell GRÜN durch, weil `canForContext` für Leader-Rollen und Nicht-Mitglieder bereits korrekte Ergebnisse liefert. Der kritische RED-Test `TestCanForReleaseVersionWithContribution` (D-01/D-02) schlägt wie erwartet fehl, da `canForContext` kein Contribution-basiertes Lookup implementiert. Dies ist das korrekte Wave-0-Signal.

## Known Stubs

None — keine Stub-Werte in Produktionscode. Test-Mocks sind explizit als Wave-0-Testinfrastruktur dokumentiert.

## Threat Surface Scan

No new security-relevant surface introduced — test files only, no production code changes.

## Self-Check: PASSED

- `backend/internal/permissions/permissions_test.go` FOUND ✓
- `backend/internal/repository/authz_permissions_test.go` FOUND ✓
- Commit b61bdad0 FOUND ✓
- Commit fdb2f5aa FOUND ✓
- `TestCanForReleaseVersionWithContribution` FAIL (ROT) ✓
- `TestListActorContributionRolesForVersion` FAIL (ROT) ✓
- `TestCanForReleaseVersionLeaderBypass` PASS (Leader-Bypass funktioniert) ✓
- `TestCanForReleaseVersionProjectLeadBypass` PASS (project_lead-Bypass funktioniert) ✓

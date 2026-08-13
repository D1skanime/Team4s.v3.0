---
phase: 83
plan: "03"
subsystem: backend-repository
tags: [repository, anime_contributions, d-13, tdd, wave-2, migration]
dependency_graph:
  requires: [83-02]
  provides: [get-member-roles-for-version-on-anime-contributions, d13-consistency]
  affects:
    - backend/internal/repository/release_version_notes_repository.go
    - backend/internal/handlers/admin_content_release_version_notes.go
    - backend/internal/repository/release_version_notes_repository_test.go
tech_stack:
  added: []
  patterns: [two-step-sql-resolution, source-inspection-test, legacy-db-field-bridge]
key_files:
  created: []
  modified:
    - backend/internal/repository/release_version_notes_repository.go
    - backend/internal/handlers/admin_content_release_version_notes.go
    - backend/internal/repository/release_version_notes_repository_test.go
decisions:
  - "GetMemberRolesForVersion zweistufig: zuerst versions-spezifisch (release_version_id = $1), dann anime-weit (IS NULL) — analog zu ListActorContributionRolesForVersion (D-02)"
  - "loadValidMemberRoleKeysForVersion delegiert jetzt an GetMemberRolesForVersion (kein doppelter Query-Pfad)"
  - "BulkNoteInput.RoleCode string fuer Validierung hinzugefuegt; RoleID int64 bleibt als Legacy-DB-Feld fuer release_version_notes.role_id (INT NOT NULL FK)"
  - "releaseVersionMemberRoleKey signatur geaendert auf (memberID int64, roleCode string) — Format %d:%s"
  - "Pre-existing test failures (TestContributionUpsert_FourColumnConflict, TestPhase69AnimeContributionMutationsUseRouteScope) sind aus Phase-83-Scope ausgeschlossen"
metrics:
  duration_minutes: 25
  completed_date: "2026-06-12"
  tasks_completed: 1
  files_changed: 3
---

# Phase 83 Plan 03: GetMemberRolesForVersion auf anime_contributions (D-13) Summary

GetMemberRolesForVersion und loadValidMemberRoleKeysForVersion von Legacy-Tabelle release_member_roles auf anime_contributions + anime_contribution_roles migriert (zweistufige Aufloesung analog Plan 83-02).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| RED | TestGetMemberRolesForVersion (failing) | 0a90eb5a | backend/internal/repository/release_version_notes_repository_test.go |
| GREEN | GetMemberRolesForVersion auf anime_contributions | d8e7999e | backend/internal/repository/release_version_notes_repository.go, backend/internal/handlers/admin_content_release_version_notes.go, backend/internal/repository/release_version_notes_repository_test.go |

## What Was Built

**MemberRoleForVersion-Struct (D-13):**

Felder `RoleID int64` und `RoleName string` entfernt. Neues Feld `RoleCode string` hinzugefuegt. `RoleLabel string` bleibt (kommt jetzt aus `role_definitions.label_de`).

**GetMemberRolesForVersion — Zweistufige Aufloesung:**

- Schritt 1 (versions-spezifisch): `SELECT DISTINCT ac.member_id, m.nickname, acr.role_code, rd.label_de FROM anime_contributions ac ... WHERE ac.release_version_id = $1 AND ac.fansub_group_id IN (SELECT fansub_group_id FROM release_version_groups WHERE release_version_id = $1)`
- Schritt 2 (Fallback anime-weit, nur wenn Schritt 1 leer): `WHERE ac.release_version_id IS NULL AND ac.anime_id = fr.anime_id AND ac.fansub_group_id IN (...)`
- Kein Join mehr auf `release_member_roles` oder `contributor_roles`
- `release_version_groups`-Scope verhindert Cross-Gruppen-Leckage (T-83-01)

**releaseVersionMemberRoleKey:**

Format von `%d:%d` (memberID:roleID) auf `%d:%s` (memberID:roleCode) umgestellt.

**loadValidMemberRoleKeysForVersion:**

Delegiert jetzt an `GetMemberRolesForVersion` und baut die Map aus `(mr.MemberID, mr.RoleCode)` Paaren. Kein separater Query mehr — einheitlicher Aufloesung-Pfad.

**BulkNoteInput (Rule 3 auto-fix):**

`RoleCode string` hinzugefuegt fuer Contributor-Validierung gegen anime_contributions. `RoleID int64` bleibt als Legacy-DB-Feld (release_version_notes.role_id ist NOT NULL FK -> contributor_roles — Schema-Aenderung nicht im Scope).

**Handler-Update (Rule 3 auto-fix):**

`bulkNoteItemRequest.RoleCode string` als Required-Feld hinzugefuegt. `BulkNoteInput.RoleCode` wird aus Request befuellt.

**TDD-Testabdeckung:**

`TestGetMemberRolesForVersion` mit 5 Sub-Tests:
- `verwendet-anime_contributions`: FROM anime_contributions, kein release_member_roles
- `fallback-anime-weit`: release_version_id IS NULL in Fallback-Query
- `struct-role-code`: MemberRoleForVersion.RoleCode vorhanden, kein RoleID
- `key-format-string`: %d:%s Key-Format
- `release_version_groups-scope`: Gruppen-Scope-Filter

## Verification Results

```
go build ./...: exit 0
TestGetMemberRolesForVersion: 5/5 PASS
TestReleaseVersionNotesRepositoryMethodSignatures: PASS
TestReleaseVersionNotesRepository_ContributorGuardSourceInvariants: PASS
TestCanForReleaseVersion*: alle 7 PASS (keine Regression)
release_member_roles: kein String mehr in GetMemberRolesForVersion-Implementierung
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] BulkNoteInput.RoleID int64 vs releaseVersionMemberRoleKey(int64, string) Typkonflikt**
- **Found during:** GREEN-Implementierung
- **Issue:** Nach Umstellung von `releaseVersionMemberRoleKey` auf `(int64, string)` kompilierte `BulkUpsertReleaseVersionNotes` nicht mehr — `note.RoleID` (int64) ist kein gueltiger String-Argument.
- **Fix:** `BulkNoteInput.RoleCode string` als neues Feld hinzugefuegt fuer Validierung. `RoleID int64` bleibt fuer DB-INSERT (release_version_notes.role_id NOT NULL FK). `BulkUpsertReleaseVersionNotes` verwendet jetzt `releaseVersionMemberRoleKey(note.MemberID, note.RoleCode)`.
- **Files modified:** `backend/internal/repository/release_version_notes_repository.go`, `backend/internal/handlers/admin_content_release_version_notes.go`
- **Commit:** d8e7999e

**2. [Rule 3 - Blocking] Handler-Request-Struct fehlte RoleCode-Feld**
- **Found during:** GREEN-Implementierung
- **Issue:** `bulkNoteItemRequest` hatte kein `RoleCode string`-Feld, daher wuerde `BulkNoteInput.RoleCode` immer leer sein — Validierung wuerde immer mit `ErrInvalidReleaseVersionContributorContext` scheitern.
- **Fix:** `RoleCode string` als Required-Feld zu `bulkNoteItemRequest` hinzugefuegt. Handler befuellt `BulkNoteInput.RoleCode` aus Request.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_notes.go`
- **Commit:** d8e7999e

## Pre-existing Failures (Out of Scope)

Zwei Tests in `backend/internal/repository/` schlagen seit vor Plan 83-03 fehl (verifiziert durch Stash-Test):

- `TestContributionUpsert_FourColumnConflict` (anime_contributions_inputs_test.go:38)
- `TestPhase69AnimeContributionMutationsUseRouteScope` (phase69_context_scoping_test.go:81)

Diese Fehler sind nicht durch Plan-83-03-Aenderungen verursacht und liegen ausserhalb des Scope dieses Plans.

## Known Stubs

None — keine Stubs in Produktionscode.

## Threat Surface Scan

Keine neuen Netzwerk-Endpoints, Auth-Pfade oder Schema-Aenderungen. T-83-01 (Information Disclosure via GetMemberRolesForVersion) ist mitigiert durch den `release_version_groups`-Scope-Filter in beiden Queries. T-83-LEGACY: `release_member_roles`-Tabelle bleibt unveraendert bestehen — kein DROP, kein Datenleck (Tabelle wird nicht mehr gelesen).

## TDD Gate Compliance

- RED-Commit: 0a90eb5a (test(83-03): add failing tests...) — 5 Sub-Tests scheiterten erwartungsgemaess
- GREEN-Commit: d8e7999e (feat(83-03): migrate GetMemberRolesForVersion...) — alle 5 Sub-Tests PASS

## Self-Check: PASSED

- `backend/internal/repository/release_version_notes_repository.go` FOUND
- `backend/internal/handlers/admin_content_release_version_notes.go` FOUND
- `backend/internal/repository/release_version_notes_repository_test.go` FOUND
- Commit 0a90eb5a FOUND (RED)
- Commit d8e7999e FOUND (GREEN)
- `TestGetMemberRolesForVersion` 5/5 PASS
- `go build ./...` exit 0
- Kein `release_member_roles` mehr in GetMemberRolesForVersion-Implementierung

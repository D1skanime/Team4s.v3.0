---
phase: 95-rollenmodell-entwirren-gruppen-vs-projekt-ebene-techadmin-gf
plan: "03"
subsystem: backend
tags: [security, role-model, go-backend, whitelist, tdd, handler]
dependency_graph:
  requires:
    - 95-01 (groupHistoryDialogRoleWhitelist auf kanonische Codes, IsGroupHistoryWhitelistRole-Basis)
  provides:
    - IsGroupHistoryWhitelistRole() Methode auf HistGroupMemberRolesRepository (D-13)
    - CR-01 geschlossen: CreateHistGroupMemberRole nutzt Whitelist-Check statt DB-Context-Check
    - WR-02 geschlossen: ListHistGroupMemberRoles hat Cross-Group-Guard (GetByID + FansubGroupID)
    - D-10 Auto-Archivierung: SetRole(Enable=false) schreibt fail-open hist_group_member_roles-Eintrag
  affects:
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/repository/fansub_group_app_members_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go
    - backend/internal/repository/hist_group_member_roles_whitelist_test.go
    - backend/internal/repository/fansub_group_app_members_auto_archive_test.go
tech_stack:
  added: []
  patterns:
    - Source-Inspection-Tests analog zu fansub_group_history_handler_test.go (konkrete Repo-Typen ohne Interface)
    - Fail-open INSERT nach DELETE (D-10): Fehler beim hist-Lookup nicht propagieren
    - 2-Hop-Join via member_claims für hist-Member-Linkage (Linkage A1)
    - ON CONFLICT DO NOTHING für Idempotenz bei Doppel-Entzug
key_files:
  created:
    - backend/internal/repository/hist_group_member_roles_whitelist_test.go
    - backend/internal/repository/fansub_group_app_members_auto_archive_test.go
  modified:
    - backend/internal/repository/hist_group_member_roles_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/repository/fansub_group_app_members_repository.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler_test.go
decisions:
  - "CR-01 (D-13): IsGroupHistoryWhitelistRole-Slice-Check ersetzt RoleCodeExistsForContext-DB-Aufruf im Create-Handler — kein DB-Round-Trip mehr für Rollenkode-Validierung"
  - "WR-02 (D-14): Cross-Group-Guard via histMembersRepo.GetByID + FansubGroupID-Vergleich vor ListByMember — Information-Disclosure verhindert"
  - "D-10: Auto-Archivierung ist fail-open: wenn hist-Member-Link nicht gefunden wird, ist der DELETE trotzdem erfolgreich; kein Fehler-Return"
  - "Source-Inspection-Tests statt Gin-Mock-Tests: FansubHistGroupMemberRolesHandler hält konkrete Repo-Typen (kein Interface) — Mock-basierte Verhaltens-Tests brauchen Interface-Refactor (Regel 4 deferred)"
  - "2-Hop-Join für D-10-Linkage: fansub_group_members.app_user_id → member_claims.app_user_id (claim_status='verified') → member_claims.member_id → hist_fansub_group_members.member_id"
metrics:
  duration: "10min"
  completed_date: "2026-06-30"
  tasks_completed: 2
  files_changed: 6
---

# Phase 95 Plan 03: CR-01/WR-02 Security-Fixes + D-10 Auto-Archivierung — Zusammenfassung

**Ergebnis:** Drei sicherheitskritische Lücken geschlossen — CR-01 (Write-Bypass), WR-02 (Cross-Group-Scope-Leck) und D-10 (Auto-Archivierung beim Rollen-Entzug) — alle Tests grün, `go build ./...` sauber.

## Abgeschlossene Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 (RED) | Wave-0-Tests + IsGroupHistoryWhitelistRole | f1bfb042 | 4 Dateien |
| 2 (GREEN) | CR-01/WR-02 Handler-Fixes + D-10 Auto-Archivierung | 17af21a3 | 2 Dateien |

## Gelieferte Artefakte

### `IsGroupHistoryWhitelistRole` (hist_group_member_roles_repository.go)

Neue Methode nach `ListGroupHistoryRoleDefinitions`:
```go
func (r *HistGroupMemberRolesRepository) IsGroupHistoryWhitelistRole(code string) bool {
    for _, c := range groupHistoryDialogRoleWhitelist {
        if c == code { return true }
    }
    return false
}
```
Pure Slice-Iteration über die 6 kanonischen Codes (`founder`, `fansub_lead`, `co_leader`, `project_lead`, `techadmin`, `gfxler`). Kein DB-Aufruf, kein Error-Return.

### CR-01 Fix (fansub_hist_group_member_roles_handler.go)

`CreateHistGroupMemberRole` — der `RoleCodeExistsForContext`-DB-Aufruf (inkl. Error-Handling) wurde ersetzt durch:
```go
if !h.rolesRepo.IsGroupHistoryWhitelistRole(req.RoleCode) {
    c.JSON(422, gin.H{"error": gin.H{"message": "ungültiger role_code für group_history-Kontext"}})
    return
}
```
Kein DB-Round-Trip mehr für Rollenkode-Validierung. `translator` → 422 garantiert.

### WR-02 Fix (fansub_hist_group_member_roles_handler.go)

`ListHistGroupMemberRoles` — Cross-Group-Guard vor `ListByMember` eingefügt:
```go
memberRow, err := h.histMembersRepo.GetByID(c.Request.Context(), memberID)
// ErrNotFound → 404, Serverfehler → 500
if memberRow.FansubGroupID != fansubID {
    c.JSON(422, gin.H{"error": gin.H{"message": "mitglied gehört nicht zu dieser fansubgruppe"}})
    return
}
```

### D-10 Auto-Archivierung (fansub_group_app_members_repository.go)

`SetRole(Enable=false)`-Pfad — vor DELETE: `created_at` lesen; nach DELETE: fail-open INSERT:
```sql
-- 2-Hop-Join für hist-Member-Linkage:
SELECT hfgm.id FROM hist_fansub_group_members hfgm
JOIN member_claims mc ON mc.member_id = hfgm.member_id AND mc.claim_status = 'verified'
JOIN fansub_group_members fgm ON fgm.app_user_id = mc.app_user_id
WHERE fgm.id = $1 AND hfgm.fansub_group_id = $2 LIMIT 1

-- INSERT mit ON CONFLICT DO NOTHING:
INSERT INTO hist_group_member_roles
(hist_fansub_group_member_id, role_code, started_year, ended_year, status, visibility)
VALUES ($1, $2, $3, $4, 'ended', 'internal')
ON CONFLICT DO NOTHING
```

### Test-Dateien

| Datei | Tests | Status |
|-------|-------|--------|
| `hist_group_member_roles_whitelist_test.go` | TestGroupHistoryWhitelist (11 Subtests) | PASS |
| `fansub_group_app_members_auto_archive_test.go` | TestAutoArchive (Skip, DB nötig) + TestAutoArchiveSignature | PASS |
| `fansub_hist_group_member_roles_handler_test.go` | TestCreateHistGroupMemberRoleWhitelistReject (CR-01) + TestListHistGroupMemberRolesCrossGroupGuard (WR-02) + TestCR01WR02AutoArchiveSourceInspection (D-10) | PASS |

## Abweichungen vom Plan

### Dokumentiert [Architektur-Beobachtung] Handler-Datei 17 Zeilen über Limit

**Gefunden in:** Task 2

**Problem:** `fansub_hist_group_member_roles_handler.go` hat jetzt 467 Zeilen (Limit: 450). Die Datei hatte vor Plan 95-03 bereits 444 Zeilen; der WR-02-Block (+23 Zeilen für Guard + Cross-Group-Check) hat das Limit überschritten.

**Entscheidung:** Kein Split in diesem Plan — sicherheitskritischer Code (WR-02/D-14) muss kohärent bleiben. Ein Split würde eine architektonische Entscheidung erfordern (Regel 4). Deferred in `deferred-items.md`.

**Dateien:** `backend/internal/handlers/fansub_hist_group_member_roles_handler.go` (467 Zeilen)

### Auto-Fix [Regel 2 - Sicherheit] TestAutoArchive als Skip + Integrations-Dokumentation

**Gefunden in:** Task 1

**Problem:** Der Plan verlangte `TestAutoArchive` mit "Mock/Stub" oder `t.Skip`. Da `FansubGroupAppMemberRepository` keinen Interface-Abstraktionspunkt hat und ein vollständiger DB-Mock komplex wäre, wurde die Source-Inspection-Strategie gewählt (analog zu `fansub_group_history_handler_test.go`).

**Fix:** `TestAutoArchive` mit `t.Skip("requires DB")` + Inline-Dokumentation der D-10-Invarianten; `TestCR01WR02AutoArchiveSourceInspection` als Source-Inspection-Test im Handler-Paket für die D-10-Verifikation.

## Verifikation

- `go build ./...` — grün (0 Fehler)
- `go test ./...` — 11/11 Pakete PASS
- `TestGroupHistoryWhitelist` — 11/11 Subtests PASS
- `TestCreateHistGroupMemberRoleWhitelistReject` — PASS (CR-01/D-13)
- `TestListHistGroupMemberRolesCrossGroupGuard` — PASS (WR-02/D-14)
- `TestCR01WR02AutoArchiveSourceInspection` — PASS (D-10)
- `grep "RoleCodeExistsForContext" handler.go` → 0 Treffer (ersetzt)
- `grep "IsGroupHistoryWhitelistRole" handler.go` → 2 Treffer (Kommentar + Aufruf)
- `grep "hist_group_member_roles" repository.go` → INSERT-Statement (D-10)

## Known Stubs

Keine — alle Implementierungen sind vollständig. TestAutoArchive ist als Integrations-Skip markiert (DB erforderlich), enthält aber die vollständigen D-10-Invarianten als Dokumentation.

## Threat Flags

Keine neuen Sicherheitsflächen eingeführt. Plan 03 schließt bestehende Lücken:
- T-95-03-T (Tampering CR-01): IsGroupHistoryWhitelistRole-Check aktiv, 'translator' → 422
- T-95-03-ID (Information Disclosure WR-02): Cross-Group-Guard aktiv, fremde member_id → 422
- T-95-03-EoP (D-10 Auto-Archiv): INSERT übernimmt role aus validiertem SetRole-Aufruf; ON CONFLICT DO NOTHING

## Self-Check: PASSED

- [x] `backend/internal/repository/hist_group_member_roles_whitelist_test.go` existiert
- [x] `backend/internal/repository/fansub_group_app_members_auto_archive_test.go` existiert
- [x] Commit f1bfb042 existiert (Task 1 — RED)
- [x] Commit 17af21a3 existiert (Task 2 — GREEN)
- [x] `IsGroupHistoryWhitelistRole` in hist_group_member_roles_repository.go vorhanden
- [x] `RoleCodeExistsForContext` aus Handler entfernt (0 Treffer)
- [x] Cross-Group-Guard in ListHistGroupMemberRoles vorhanden
- [x] D-10 INSERT in fansub_group_app_members_repository.go vorhanden
- [x] `go build ./...` grün
- [x] `go test ./...` grün (11/11 Pakete)

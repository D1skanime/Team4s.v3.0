---
phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
plan: "04"
subsystem: database
tags: [go, postgresql, repository, transactions, delegation, audit]

requires:
  - phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
    provides: Additive Review-Foundation und immutable PostgreSQL-Verträge aus Plan 107-02
  - phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
    provides: Tx-bindbare Authz- und Membership-Identitätsauflösung aus Plan 107-03
provides:
  - Tx-gebundene Membership-Locks mit vollständigen serverseitigen Policy-Snapshots
  - Idempotente direkte Review-Grants und -Revokes mit exaktem Changed-Signal
  - Typisierte immutable Review-Audit-Events für App-User und Systemakteure
  - Getrennte scrub-fähige Reject- und Override-Reason-Texte
affects: [107-06, 107.1-release-pruefworkspace]

tech-stack:
  added: []
  patterns:
    - Caller-owned DBTX ohne Repository-Transaktionslifecycle
    - RowsAffected-basierte Mutationserkennung für Audit-only-on-change
    - Strukturierte immutable Audit-Eltern mit getrennten löschbaren Freitextkindern

key-files:
  created:
    - backend/internal/repository/review_delegation_repository.go
    - backend/internal/repository/review_delegation_repository_test.go
    - backend/internal/repository/review_audit_repository.go
    - backend/internal/repository/review_audit_repository_test.go
  modified: []

key-decisions:
  - "Die aktive Grant-Zeile verwendet den in Migration 0134 kanonischen created_at-Zeitpunkt; Actor-Attribution wird nicht dupliziert, sondern verpflichtend im immutable Audit desselben Caller-Tx gespeichert."
  - "ReviewAuditRepository exponiert ausschließlich die sieben Foundation-Eventcodes; spätere Source-/Cleanup-Codes des Schemas bleiben außerhalb von Phase 107."
  - "Systemakteure besitzen weder App-User- noch Member-ID; App-User-Akteure benötigen eine positive App-User-ID und dürfen optional einen positiven Member-Snapshot tragen."

patterns-established:
  - "LockMembership sperrt exakt fansub_group_members FOR UPDATE und liefert Group-, App-User-, Member-, Status- und verified-Claim-Snapshots in einem Read."
  - "GrantAction und RevokeAction geben ausschließlich RowsAffected()==1 als changed=true zurück; erfolgreiche No-ops bleiben schreibfrei für den späteren Audit-Caller."
  - "InsertReason akzeptiert Freitext nur an der separaten reject|override-Seam und kopiert ihn weder in strukturierte Zeilen noch in Fehler."

requirements-completed: [P107-SC1, P107-SC4, P107-SC6]

duration: 9min
completed: 2026-07-23
---

# Phase 107 Plan 04: Tx-gebundene Delegation und immutable Audit Summary

**Kanonische Membership-Locks und Changed-Signale ermöglichen atomare Grant/Revokes, während typisierte Audit-Eltern unveränderlich und ihre Reject-/Override-Gründe separat löschbar bleiben.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-23T14:12:28Z
- **Completed:** 2026-07-23T14:21:56Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `ReviewDelegationRepository` bindet Pool oder Caller-Transaktion über das vorhandene `DBTX`, sperrt exakt eine Membership `FOR UPDATE` und liefert alle Policy-Snapshots ohne zweiten Group-/Member-Lookup.
- Grant und Revoke mutieren ausschließlich das kanonische Membership/Action-Paar, melden tatsächliche Änderungen über `RowsAffected()==1` und bewahren Grants bei Membership-Inaktivität bis zum expliziten Revoke.
- `ReviewAuditRepository` validiert einen geschlossenen Foundation-Eventkatalog, korrekte App-User-/System-Actor-Shapes, vollständige Target-Snapshots und einen expliziten Zeitpunkt.
- Reject- und Override-Gründe werden ausschließlich in `review_reason_texts` geschrieben; Fehler enthalten den Body nicht, Gründe sind unabhängig löschbar und das strukturierte Parent-Audit bleibt DB-seitig unveränderlich.
- Read-Pfade erzeugen keine Auditzeile und alle Repositorymethoden bleiben frei von Begin-, Commit- oder Rollback-Ownership.

## Task Commits

TDD-Aufgaben wurden mit getrennten RED- und GREEN-Commits ausgeführt:

1. **Task 1 RED: Delegations-Repository-Verträge** - `6f2128af` (test)
2. **Task 1 GREEN: Tx-gebundene Membership-Delegation** - `7aa245df` (feat)
3. **Task 2 RED: Typisierte Audit-/Reason-Verträge** - `00914319` (test)
4. **Task 2 RED-Korrektur: Argumentpositionen des Fake-DB-Vertrags** - `e0eda179` (test)
5. **Task 2 GREEN: Immutable Audit- und Reason-Repositories** - `f69c3f0b` (feat)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `backend/internal/repository/review_delegation_repository.go` - Membership-Snapshot-Lock sowie idempotente Grant-/Revoke-Mutationen mit Changed-Signal.
- `backend/internal/repository/review_delegation_repository_test.go` - Fake-DB- und PostgreSQL-Verträge für Lock, No-op, Inaktivität und fehlenden Repository-Lifecycle.
- `backend/internal/repository/review_audit_repository.go` - Typisierte strukturierte Event-, Actor-, Reason- und read-only Event-Seams.
- `backend/internal/repository/review_audit_repository_test.go` - Validation, Systemactor, Reason-Separation, Disclosure-, Immutability- und Read-Boundary-Verträge.

## Decisions Made

- Migration 0134 bleibt als abgeschlossene Schemaautorität unverändert. Die aktive Grant-Tabelle speichert ihren vorhandenen `created_at`; Actor und fachlicher Zeitpunkt der tatsächlichen Zustandsänderung gehören in das verpflichtende immutable Audit im selben Service-Tx.
- `ReviewAuditEventInput` verlangt positive Group-/Revision-Snapshots und kanonisiert Source-Type/-Key vor dem Insert; Systemakteure dürfen keine synthetische Identität tragen.
- Der optionale `GetEvent`-Pfad ist absichtlich read-only und dient späterer Verifikation ohne Read-Audit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Grant-Spalten gegen die abgeschlossene Migration 0134 ausgerichtet**
- **Found during:** Task 1 (Membership-gebundene Grant/Revoke-Repositories implementieren)
- **Issue:** Der Plantext nannte `granted_by_app_user_id` und `granted_at`, während die in Plan 107-02 abgeschlossene kanonische Tabelle ausschließlich das Grant-Paar plus `created_at` besitzt. Ein Insert in die genannten Spalten wäre gegen die reale Migration nicht ausführbar; ein Edit der historischen Migration ist durch AGENTS.md verboten.
- **Fix:** `GrantAction` schreibt ausschließlich das kanonische Paar und verwendet dessen schemaeigenes `created_at`. Actor-Attribution und fachlicher Mutationszeitpunkt bleiben an der bereits vorgeschriebenen immutable Audit-Seam im selben Caller-Tx; es wurde keine parallele Spalte oder Migration erfunden.
- **Files modified:** `backend/internal/repository/review_delegation_repository.go`, `backend/internal/repository/review_delegation_repository_test.go`
- **Verification:** Live-PostgreSQL Grant/Idempotent/Inactive/Revoke-Vertrag und vollständige Backend-Suite sind grün.
- **Committed in:** `7aa245df`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** Die Korrektur erhält den bereits migrierten Schema- und Auditvertrag, ohne historische Migration oder neue Datenautorität zu eröffnen.

## Issues Encountered

- Im RED-Test für strukturierte Auditargumente waren drei Slice-Indizes um eins verschoben. Der Test blieb gegen die fehlende Produktion weiterhin rot, wurde vor GREEN korrigiert und als eigener Testcommit `e0eda179` festgehalten.

## Verification

- `go test ./internal/repository -run 'TestPhase107ReviewDelegation.*(Lock|Grant|Revoke|Idempotent|Inactive)' -count=1` - PASS, ohne DB-Opt-in kompilierbar und mit disposable PostgreSQL vollständig ausgeführt.
- `go test ./internal/repository -run 'TestPhase107ReviewAudit.*(Event|SystemActor|Reason|Immutable|ReadBoundary)' -count=1` - PASS, ohne DB-Opt-in kompilierbar und mit disposable PostgreSQL vollständig ausgeführt.
- `go test ./internal/permissions ./internal/repository -run 'TestPhase107' -count=10` mit isolierter PostgreSQL-16-Datenbank - PASS.
- `go test ./internal/repository -count=1` - PASS.
- `go test ./...` mit `TEAM4S_PHASE107_TEST_DSN` - PASS.
- `go vet ./internal/repository` - PASS.
- `go vet ./...` - PASS.
- `git show --check` für alle fünf Task-Commits - PASS.
- `git diff --check 25e880ef..HEAD -- <vier Plan-107-04-Dateien>` - PASS.
- Keine Service-, Handler-, UI-, Contract-, Domainadapter-, Cleanup- oder Phase-107.1-Datei wurde verändert.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 107-06 kann Membership-Lock, Grant/Revoke, mandatory Audit und separate Reasons über denselben Caller-Tx orchestrieren.
- `changed=false` ist die eindeutige Grundlage dafür, wiederholte Grant-/Revoke-No-ops ohne Audit zu committen.
- Es bestehen keine offenen Blocker; `grep.exe.stackdump` und Phase 107.1 blieben unangetastet.

## Self-Check: PASSED

- Alle vier Implementierungs-/Testdateien und diese Summary existieren.
- Die Task-Commits `6f2128af`, `7aa245df`, `00914319`, `e0eda179` und `f69c3f0b` sind in der Git-Historie vorhanden.
- Keine geplante Datei fehlt; keine unerwartete Löschung oder ungetrackte generierte Datei wurde erzeugt.

---
*Phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus*
*Completed: 2026-07-23*

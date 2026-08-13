---
phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
plan: "02"
subsystem: database
tags: [postgresql, migrations, review, audit, immutability, capabilities, points]

requires:
  - phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
    provides: Phase-107 PostgreSQL-Harness und rote Schema-/Immutability-/Down-Verträge aus Plan 107-01
  - phase: 106-member-gamification-punktefundament
    provides: Unicode-Kanonisierung, unveränderliche Punktregeln und append-only `point_ledger_entries`
provides:
  - Fünf additive Foundation-Tabellen für direkte Review-Grants, Entscheidungen, Audit, Reasons und source-globale Credit-Slots
  - Drei typisierte Review-Actions für `fansub_lead` ohne Plattform-Admin-Rollenseed oder Delegationskette
  - Fail-closed Down-Migration mit leerem Up→Down→Up und Schutz bestehender Review-/Ledger-Historie
affects: [107-03, 107-04, 107-05, 107-06, 107.1-release-pruefworkspace]

tech-stack:
  added: []
  patterns:
    - PostgreSQL-erzwungene Append-only-Guards für Decision, Audit und source-globale Credit-Slots
    - Getrennte löschbare Reason-Kinder bei unveränderlichen strukturierten Audit-Eltern
    - Transaktionaler fail-closed Rückbau vor jeder Mutation

key-files:
  created:
    - database/migrations/0134_review_foundation.up.sql
    - database/migrations/0134_review_foundation.down.sql
  modified:
    - backend/internal/migrations/phase107_review_foundation_test.go

key-decisions:
  - "Review-Credit-Slots werden source-global durch `(source_type, source_key, credit_slot)` begrenzt und verweisen ausschließlich auf das bestehende `point_ledger_entries`."
  - "Strukturierte Decisions, Audit-Events und Credit-Slots sind gegen UPDATE, DELETE und TRUNCATE geschützt; nur getrennte Reason-Kinder bleiben gezielt löschbar."
  - "Der Down-Pfad entfernt die Foundation ausschließlich ohne Grants, Review-Historie oder Ledgerbuchungen und stellt den kurz deaktivierten Punktregel-Trigger vor Commit wieder her."

patterns-established:
  - "Review-Historie verwendet Snapshot-FKs ohne löschende Kaskaden; nur aktive Membership-Grants dürfen mit ihrer Membership verschwinden."
  - "Feste Punktregeln werden bei semantischem Seed-Konflikt abgebrochen statt aktualisiert."

requirements-completed: [P107-SC1, P107-SC2, P107-SC3, P107-SC4, P107-SC5, P107-SC6]

duration: 8min
completed: 2026-07-23
---

# Phase 107 Plan 02: Additive Review Foundation Summary

**PostgreSQL 16 erzwingt typisierte Review-Grants, First-Decision-Wins-Historie, scrub-fähige Reason-Texte und genau einen Reject-/Confirm-Credit-Slot pro stabiler Quelle.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-23T13:43:13Z
- **Completed:** 2026-07-23T13:51:39Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Migration 0134 ergänzt exakt fünf Foundation-Tabellen, drei typisierte `review.*.decide`-Actions für `fansub_lead` und die unveränderliche Punktregel `review.decision` Version 1 mit Wert 1.
- Decisions und Credit-Slots besitzen unabhängige Source-Uniqueness; Decision, Audit und Credit-Slot verweigern DB-seitig UPDATE, DELETE und TRUNCATE.
- Ablehnungs- und Override-Gründe bleiben getrennte Unicode-nichtleere Kindzeilen, die ohne Veränderung der strukturierten Decision-/Audit-Historie gelöscht werden können.
- Der Down-Pfad prüft sämtliche Foundation- und zugehörigen Ledgerdaten vor der ersten Mutation, entfernt Trigger vor Tabellen und löscht nur die exakten Phase-107-Seeds.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrationskette prüfen und additive Review-Foundation anlegen** - `8dc04815` (feat)
2. **Task 2: Datenbewussten Down-Pfad und reale PostgreSQL-Verträge abschließen** - `0d6e3f1f` (feat)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `database/migrations/0134_review_foundation.up.sql` - Erstellt die fünf Tabellen, Capability-/Rule-Seeds, Unicode-Checks, Foreign Keys, Unique-Verträge und Mutation-Guards.
- `database/migrations/0134_review_foundation.down.sql` - Verweigert belegte Rückbauten und entfernt eine leere Foundation in sicherer Abhängigkeits- und Triggerreihenfolge.
- `backend/internal/migrations/phase107_review_foundation_test.go` - Erlaubt im Ledger-Boundary-Scanner neben der kanonischen Tabelle auch den bereits separat geforderten FK-Spaltennamen.

## Decisions Made

- Direkte Grants verwenden ausschließlich die drei typisierten Review-Actions und hängen per Composite Primary Key an der kanonischen `fansub_group_members`-Membership.
- `platform_admin` bleibt der bestehende globale Permission-Bypass und erhält weder eine Rollen-Capability noch eine Punkteempfänger-Annahme.
- Historische strukturierte FKs verwenden kein `ON DELETE CASCADE`; die einzige Löschkaskade bleibt die aktive Grant-Zeile unter ihrer Membership.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widersprüchlichen Ledger-Boundary-Test korrigiert**
- **Found during:** Task 2 (Datenbewussten Down-Pfad und reale PostgreSQL-Verträge abschließen)
- **Issue:** Der Plan-01-Up-Vertrag verlangte die exakte FK-Spalte `point_ledger_entry_id`, während der Boundary-Scanner jedes `*ledger*`-Token außer `point_ledger_entries` ablehnte. Kein SQL-Artefakt konnte beide Assertions erfüllen.
- **Fix:** Der Scanner erlaubt jetzt genau die kanonische Tabelle und den bereits verpflichtenden FK-Spaltennamen; andere Ledger-Namen bleiben verboten.
- **Files modified:** `backend/internal/migrations/phase107_review_foundation_test.go`
- **Verification:** Statischer und realer `TestPhase107`-Migrationslauf sind vollständig grün.
- **Committed in:** `8dc04815` (Teil des Task-1-Commits vor dem Task-2-Commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** Die Korrektur beseitigt ausschließlich einen logisch widersprüchlichen Testguard; Produktionsscope und Ledger-Autorität bleiben unverändert.

## Issues Encountered

- Der im Plan notierte PowerShell-DSN-Ausdruck `$dbName?sslmode=disable` wurde von PowerShell als Variablenname fehlinterpretiert. Der reale Gate-Lauf verwendete die eindeutige Form `${dbName}?sslmode=disable`; Datenbankname, Guard und Tests liefen danach wie vorgesehen.
- Das PostgreSQL-16-Image musste beim ersten Gate-Lauf lokal geladen werden. Anschließende disposable Datenbankläufe waren erfolgreich.

## Verification

- Erwarteter RED-Gate: `go test ./internal/migrations -run 'TestPhase107MigrationUpContract' -count=1` - FAIL ausschließlich wegen fehlender `0134_review_foundation.up.sql`.
- GREEN Up-Vertrag: derselbe Befehl nach Task 1 - PASS.
- Statische Migration-/Boundary-Verträge: `go test ./internal/migrations -run 'TestPhase107' -count=1` - PASS.
- Disposable PostgreSQL 16: `go test -v ./internal/migrations -run 'TestPhase107' -count=1` mit `TEAM4S_PHASE107_TEST_DSN` - PASS, einschließlich populated Down fail-closed, leerem Up→Down→Up, Decision-/Audit-/Credit UPDATE/DELETE/TRUNCATE, Reason-Scrub und unabhängigen Reject-/Confirm-Slots.
- `go test ./internal/testsupport -count=1` - PASS.
- `go vet ./internal/testsupport ./internal/migrations` - PASS.
- `git diff --check 8dc04815^..HEAD -- <Phase-107-Planpfade>` - PASS.
- Historische Migrationen 0131–0133 - unverändert.

## Known Stubs

None. Die Migrationen enthalten keine Platzhalter oder später zu verdrahtenden Datenwerte.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 107-03 kann die typisierten Actions und membership-gebundenen Direct Grants in die bestehende Permission Engine integrieren.
- Plan 107-04/05 können Decision-, Audit- und Credit-Repositories gegen die jetzt real verifizierten DB-Verträge implementieren.
- Es bestehen keine offenen Blocker; Phase 107.1 und historische Migrationen wurden nicht verändert.

## Self-Check: PASSED

- Beide Migrationsartefakte und diese Summary existieren.
- Die Task-Commits `8dc04815` und `0d6e3f1f` sind in der Git-Historie vorhanden.

---
*Phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus*
*Completed: 2026-07-23*

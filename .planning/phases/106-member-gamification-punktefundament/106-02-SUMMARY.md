---
phase: 106-member-gamification-punktefundament
plan: "02"
subsystem: database
tags: [postgresql, migrations, append-only, ledger, reversals]
requires:
  - phase: 106-member-gamification-punktefundament
    provides: PostgreSQL fixture and RED migration contracts from Plan 106-01
provides:
  - Immutable versioned point-rule catalog without productive seeds
  - Append-only member point ledger with database-validated award snapshots
  - Direct reversal invariants and guarded FK-driven context nulling
affects: [106-03, 106-04, member-gamification]
tech-stack:
  added: []
  patterns: [database-enforced append-only history, snapshot validation trigger, disposable PostgreSQL migration gate]
key-files:
  created:
    - database/migrations/0131_member_point_foundation.up.sql
    - database/migrations/0131_member_point_foundation.down.sql
  modified:
    - backend/internal/migrations/phase106_member_points_test.go
key-decisions:
  - "Optionaler Actor-, Gruppen- und Release-Version-Kontext darf nur durch echte verschachtelte ON DELETE SET NULL-Aktionen mit nachgewiesen verschwundenem Parent genullt werden."
  - "Awards und direkte Stornos werden vor INSERT vollständig gegen Regel beziehungsweise Original-Award validiert."
patterns-established:
  - "Append-only Tabellen erlauben keine direkten UPDATE-/DELETE-Mutationen; Korrekturen sind neue Gegenbuchungen."
  - "Disposable Migrationstests verwenden ausschließlich eine zufällig benannte team4s_phase106_test_* Datenbank."
requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]
duration: 12min
completed: 2026-07-22
---

# Phase 106 Plan 02: Unveränderliches Punktefundament Summary

**Versionierter PostgreSQL-Regelkatalog und append-only Member-Punktebuch mit exakten Award-Snapshots, direkten Gegenbuchungen und abgesicherter FK-Kontextnullung**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-07-22
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `point_rules` hält ausschließlich positive, versionierte Werte in den Kategorien `fansub_work` und `platform_contribution`; UPDATE und DELETE werden durch PostgreSQL abgewiesen.
- `point_ledger_entries` bindet Verdienste zwingend an `members`, speichert den vollständigen Regel-Snapshot und validiert Awards sowie direkte Stornos vor dem Insert.
- Direkte Ledger-Mutationen sind gesperrt. Die drei optionalen Kontext-FKs dürfen nur bei echter verschachtelter Parent-Löschung von non-null auf null wechseln, wobei der Guard das Verschwinden jedes betroffenen Parents prüft.
- Up -> Down -> Up sowie Append-only-, Parent-Delete- und Reversal-Invarianten wurden auf PostgreSQL 16 in einer danach gelöschten disposable Datenbank bewiesen.

## Task Commits

1. **Task 1: Migrationskette prüfen und beide unveränderlichen Tabellen anlegen** - `9e8b3b26` (feat)
2. **Task 2: Reversiblen Down-Pfad und disposable PostgreSQL-Wave-Gate abschließen** - `464abdfc` (feat)
3. **Verifikationsfix: Boundary-Cleanup-Prüfung auf SQL-Artefakte begrenzen** - `1f735980` (fix)

## Files Created/Modified

- `database/migrations/0131_member_point_foundation.up.sql` - Regelkatalog, Ledger, Constraints, Immutabilitäts-, Snapshot- und Mutations-Trigger.
- `database/migrations/0131_member_point_foundation.down.sql` - Transaktionaler Rückbau ausschließlich der neuen Indizes, Trigger, Funktionen und Tabellen.
- `backend/internal/migrations/phase106_member_points_test.go` - Boundary-Scan verbietet Cleanup-Domainobjekte in Migrationen, ohne legitime Fixture-Bereinigung zu blockieren.

## Decisions Made

- Der Ledger-Guard akzeptiert eine FK-bedingte Nullung nur bei `pg_trigger_depth() > 1`, exakt unveränderten Restspalten und `NOT EXISTS` für jeden betroffenen OLD-Parent.
- Reversal-spezifische Actor-, Reason- und Zeitfelder bleiben Eigenschaften des Stornobefehls; Member, Source, Regel-Snapshot und Domain-Kontext müssen dem Original-Award entsprechen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Boundary-Test unterschied Fixture-Lifecycle nicht von Domain-Cleanup**
- **Found during:** Planweite Verifikation nach Task 2
- **Issue:** `TestPhase106MigrationBoundary` verbot `cleanup` auch in `phase106_postgres.go`, obwohl die Fixture zwingend `t.Cleanup` für die isolierten Schemas verwendet.
- **Fix:** Das allgemeine Domain-Wortset bleibt für alle Phase-106-Artefakte aktiv; `cleanup` wird gezielt nur für die SQL-Migrationsdateien verboten.
- **Files modified:** `backend/internal/migrations/phase106_member_points_test.go`
- **Verification:** `go test ./internal/migrations -run 'TestPhase106' -count=1` gegen disposable PostgreSQL ist grün.
- **Committed in:** `1f735980`

**Total deviations:** 1 auto-fixed (1 bug).
**Impact on plan:** Keine Produkt- oder Schemaänderung; der Test bildet die beabsichtigte Phasengrenze nun ohne Fehlalarm ab.

## Issues Encountered

- Der zunächst fehlschlagende `TestPhase106MigrationBoundary` wurde als Phase-106-Testdefekt behoben; es verbleibt kein relevanter Testfehler.

## Known Stubs

None.

## User Setup Required

None - die disposable Testdatenbank wurde automatisiert erzeugt und garantiert wieder gelöscht.

## Next Phase Readiness

- Plan 106-03 kann Repository und Service auf dem nun DB-erzwungenen Rule-/Ledger-Vertrag aufbauen.
- Keine produktiven Regeln, Consumer-Anbindungen, Review-Pfade, Ranglisten oder Medienstrukturen wurden vorweggenommen.

## Self-Check: PASSED

- Beide geplanten Migrationsdateien existieren.
- Beide Task-Commits (`9e8b3b26`, `464abdfc`) und der Verifikationsfix (`1f735980`) sind im Git-Verlauf vorhanden.
- Die vollständige Suite `go test ./internal/migrations -run 'TestPhase106' -count=1` ist grün.
- Das PostgreSQL-16-Live-Gate für Up -> Down -> Up, Append-only-Verhalten und Reversal-Invarianten ist grün und die zufällige Testdatenbank wurde gelöscht.
- `git diff --check` ist grün; fremde Änderungen an `.planning/STATE.md` und `grep.exe.stackdump` blieben unangetastet.

---
*Phase: 106-member-gamification-punktefundament*
*Completed: 2026-07-22*

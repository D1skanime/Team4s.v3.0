---
phase: 106-member-gamification-punktefundament
plan: "01"
subsystem: database-testing
tags: [postgresql, pgx, migrations, append-only, ledger, reversals]
requires:
  - phase: 103-release-playback-entitlements
    provides: Existing migration-test and PostgreSQL contract patterns
provides:
  - Opt-in PostgreSQL fixture guarded to dedicated Phase-106 test databases
  - Schema-isolated migration harness without public-schema fallback
  - RED migration contracts for versioned rules, append-only ledger entries, and direct reversals
affects: [106-02, 106-03, 106-04, member-gamification]
tech-stack:
  added: []
  patterns: [dedicated test database guard, random schema isolation, static-plus-live migration contracts]
key-files:
  created:
    - backend/internal/testsupport/phase106_postgres.go
    - backend/internal/testsupport/phase106_postgres_test.go
    - backend/internal/migrations/phase106_member_points_test.go
  modified: []
key-decisions:
  - "Phase-106-Integrationstests lesen ausschließlich TEAM4S_PHASE106_TEST_DSN und überspringen ohne Opt-in."
  - "Der Migrationsvertrag bleibt bis Plan 106-02 absichtlich rot und darf nur am fehlenden Artefakt 0131_member_point_foundation scheitern."
patterns-established:
  - "Doppelter Datenbankguard: geparster DSN-Name vor dem Connect und current_database() danach."
  - "Jeder Live-Test arbeitet in einem zufälligen, pgx-gequoteten Schema mit exklusivem search_path."
requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]
duration: 13min
completed: 2026-07-22
---

# Phase 106 Plan 01: PostgreSQL- und Migrationsverträge Summary

**Opt-in PostgreSQL-16-Testisolation mit doppeltem Datenbankguard sowie kompilierbare RED-Verträge für versionierte Punktregeln, append-only Ledger und direkte Stornos**

## Performance

- **Duration:** 13 min
- **Started:** 2026-07-22T20:04:00Z
- **Completed:** 2026-07-22T20:17:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `TEAM4S_PHASE106_TEST_DSN` ist die einzige zulässige Verbindungsquelle; normale Entwicklungs-, Template- und Standarddatenbanken werden vor dem Connect abgewiesen.
- Ein zufälliges, validiertes Schema und ein exklusiver Search Path kapseln Fixture, FK-Voraussetzungen und Cleanup ohne Zugriff auf `public` oder Anwendungsschemas.
- Statische und echte PostgreSQL-Verträge schreiben Rule-Snapshots, Append-only-Verhalten, kontrollierte FK-Nullung und Cross-Row-Stornoidentität vor.
- Die Wave bleibt erwartungsgemäß rot: Der fokussierte Up-Test kompiliert und scheitert ausschließlich an der noch fehlenden Migration `0131_member_point_foundation.up.sql`.

## Task Commits

1. **Task 1: Dedizierte opt-in PostgreSQL-Testdatenbank hart absichern** - `637c4ddf` (test)
2. **Task 2: Kompilierbare Migrations-, Append-only- und Reversal-Verträge rot schreiben** - `c1921ce5` (test)

## Files Created/Modified

- `backend/internal/testsupport/phase106_postgres.go` - Guarded PostgreSQL-Pool, Schema-Isolation, Fixture-Prerequisites und SQL-Datei-Helfer.
- `backend/internal/testsupport/phase106_postgres_test.go` - Unit-Verträge für DSN-Auswahl, Datenbank-/Schemanamen und `public.`-Zielschutz.
- `backend/internal/migrations/phase106_member_points_test.go` - Statische und Live-Verträge für Up/Down/Up, Immutabilität, FK-Nullung und Stornos.

## Decisions Made

- Die Fixture besitzt absichtlich keinen Fallback auf `DATABASE_URL`, `.env` oder Anwendungspools.
- Live-Tests werden ohne explizite Test-DSN übersprungen; statische Tests bleiben davon unabhängig und liefern die Nyquist-RED-Grenze.
- Boundary-Scans bleiben auf die Phase-106-Migration und Fixture-Dateien beschränkt, damit spätere Consumer-Pläne nicht blockiert werden.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Keine fachlichen Blocker. Die fehlende Migration ist der geplante RED-Zustand und kein Ausführungsfehler.

## Known Stubs

None.

## User Setup Required

None - die PostgreSQL-Live-Tests sind bewusst opt-in; ohne dedizierte Testdatenbank bleiben sie sicher übersprungen.

## Next Phase Readiness

- Plan 106-02 kann die Migration `0131_member_point_foundation` direkt gegen die festgeschriebenen Verträge implementieren.
- Für Live-Verifikation muss eine explizit erzeugte Datenbank mit Namen `team4s_phase106_test_[a-z0-9]+` über `TEAM4S_PHASE106_TEST_DSN` bereitgestellt werden.

## Self-Check: PASSED

- Alle drei geplanten Dateien existieren.
- Beide Task-Commits (`637c4ddf`, `c1921ce5`) sind im Git-Verlauf vorhanden.
- `go test ./internal/testsupport -count=1` ist grün.
- `TestPhase106MigrationUpContract` ist rot und nennt ausschließlich die fehlende Datei `0131_member_point_foundation.up.sql` als Ursache.
- `git diff --check` ist grün; fremde Änderungen an `.planning/STATE.md` und `grep.exe.stackdump` blieben unangetastet.

---
*Phase: 106-member-gamification-punktefundament*
*Completed: 2026-07-22*

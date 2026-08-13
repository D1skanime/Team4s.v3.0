---
phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
plan: "01"
subsystem: testing
tags: [go, postgresql, migrations, review, audit, immutability]

requires:
  - phase: 106-member-gamification-punktefundament
    provides: Versionierte Punktregeln, append-only Point-Ledger und das sichere Phase-106-PostgreSQL-Harness
provides:
  - Dediziertes Phase-107-PostgreSQL-Harness mit gemeinsamem Phase-106-Sicherheitskern
  - Kompilierbare Schema-, Seed-, Down-, Immutability- und Boundary-Verträge für Migration 0134
  - Erwartungsgemäß roter Nyquist-Gate ausschließlich für das noch fehlende 0134-Artefakt
affects: [107-02, 107-03, 107-04, 107-05, 107-06, 107.1-release-pruefworkspace]

tech-stack:
  added: []
  patterns:
    - Parametrisierter opt-in PostgreSQL-Test-Guard mit phasenspezifischen DSN-, Datenbank- und Schema-Grenzen
    - Test-first Migrationsverträge mit bewusstem RED-Gate vor Produktionsschema

key-files:
  created:
    - backend/internal/testsupport/phase107_postgres.go
    - backend/internal/testsupport/phase107_postgres_test.go
    - backend/internal/migrations/phase107_review_foundation_test.go
  modified:
    - backend/internal/testsupport/phase106_postgres.go

key-decisions:
  - "Phase 106 und 107 verwenden genau einen privaten PostgreSQL-Öffnungskern; nur Konfiguration und Prerequisite-Callback sind phasenspezifisch."
  - "Wave 1 enthält keine Produktionsmigration oder Produktionstypen; der Migrationsvertrag bleibt ausschließlich wegen 0134_review_foundation erwartungsgemäß rot."

patterns-established:
  - "Neue Phasen-Harnesses erweitern den gemeinsamen Guard über dedizierte Wrapper, statt DSN-/Search-Path-Sicherheit zu kopieren."
  - "Review-Foundation-Verträge prüfen fünf Tabellen, unabhängige Decision-/Credit-Uniqueness und unterschiedliche Immutability-Regeln für strukturierte Eltern versus löschbare Reason-Texte."

requirements-completed: [P107-SC1, P107-SC2, P107-SC3, P107-SC4, P107-SC5, P107-SC6]

duration: 8min
completed: 2026-07-23
---

# Phase 107 Plan 01: Review Foundation Contracts Summary

**Ein isoliertes PostgreSQL-16-Testziel und ausführbare Wave-1-Verträge fixieren Review-Entscheidungen, Audit, Reason-Scrubbing und source-globale Credit-Slots vor der noch fehlenden Migration 0134.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-23T13:31:11Z
- **Completed:** 2026-07-23T13:39:04Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Phase 106 und Phase 107 nutzen denselben privaten Öffnungskern mit Runtime-Datenbankprüfung, exklusivem Search-Path und hartem Public-Schema-Guard.
- Das Phase-107-Harness akzeptiert ausschließlich `TEAM4S_PHASE107_TEST_DSN`, `team4s_phase107_test_*` und `phase107_*` und provisioniert nur die minimalen Permission-/Identity-/Point-Voraussetzungen.
- Sieben kompilierbare Phase-107-Migrationstests fixieren die fünf erlaubten Tabellen, drei Review-Actions, fail-closed Seeds/Down, immutable Decision/Audit/Credit-Slots, separat löschbare Reasons und die verbotenen Assignment-/Consumer-Grenzen.
- Der vorgeschriebene RED-Gate scheitert ausschließlich mit `Phase-107 artifact missing: 0134_review_foundation.up.sql`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Dediziertes Phase-107-PostgreSQL-Harness aus dem Phase-106-Guard extrahieren** - `be259d84` (test)
2. **Task 2: Migrations- und Boundary-Verträge erwartungsgemäß rot schreiben** - `f024c839` (test)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `backend/internal/testsupport/phase106_postgres.go` - Extrahiert den parametrisierten, privaten Öffnungskern ohne Änderung des öffentlichen Phase-106-Vertrags.
- `backend/internal/testsupport/phase107_postgres.go` - Definiert den dedizierten Phase-107-Wrapper, Minimal-Prerequisites und unveränderte Anwendung von 0131 bis 0133.
- `backend/internal/testsupport/phase107_postgres_test.go` - Beweist DSN-, Datenbank-, Schema-, Public-Target- und Phasenisolation.
- `backend/internal/migrations/phase107_review_foundation_test.go` - Definiert Schema-, Live-, Down-, Immutability-, Reason-, Credit- und Boundary-Verträge für 0134.

## Verification

- `go test ./internal/testsupport -run 'TestPhase10(6|7).*(DSN|DatabaseGuard|Schema|Public|Isolation)' -count=1` — PASS
- `go test ./internal/testsupport -count=1` — PASS
- `go test ./internal/migrations -run '^$' -count=1` — PASS (kompiliert alle Migrationstests)
- `go vet ./internal/testsupport ./internal/migrations` — PASS
- Vorgeschriebener `TestPhase107MigrationUpContract`-Gate — EXPECTED RED, ausschließlich fehlendes `0134_review_foundation.up.sql`
- `git show --check` für beide Task-Commits — PASS

## Decisions Made

- Der bestehende Phase-106-Wrapper bleibt die öffentliche Kompatibilitätsseam; die neue Wiederverwendung liegt ausschließlich unterhalb dieses Wrappers.
- Das Phase-107-Harness führt 0131, 0132 und 0133 unverändert nach minimalem Prerequisite-Aufbau aus und erzeugt keine Release-, Media-, Anime-, Assignment- oder Uploadtabellen.
- Der Wave-1-Vertrag verwendet keine Phase-107-Produktionstypen und darf vor Plan 107-02 nicht grün werden.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Das fehlende 0134-Artefakt und der daraus resultierende einzelne rote Vertrag sind der beabsichtigte Abschlusszustand dieses Plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 107-02 kann die Migration `0134_review_foundation.up.sql` und den fail-closed Down-Pfad gegen die jetzt fixierten Verträge implementieren.
- Für diesen Wave-1-Plan ist kein Docker-/Live-DB-Gate erforderlich; die späteren Pläne verwenden das neue `TEAM4S_PHASE107_TEST_DSN`-Harness.

## Self-Check: PASSED

- Alle vier Implementierungs-/Testdateien und diese Summary sind vorhanden.
- Beide atomaren Task-Commits `be259d84` und `f024c839` sind in der Git-Historie vorhanden.

---
*Phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus*
*Completed: 2026-07-23*

---
phase: 109-ranglisten-und-punkteprojektionen
plan: 01
subsystem: database
tags: [postgres, plpgsql, go, testify, tdd-red, migrations, gamification]

# Dependency graph
requires:
  - phase: 106-member-gamification-punktefundament
    provides: append-only Punktebuch (point_ledger_entries, point_rules), Migration 0131, Test-Helper (readPhase106Migration, requireSQLContains, requireOrder, assertPhase106TableExists, testsupport.OpenPhase106Postgres/ApplySQLFile)
provides:
  - RED-Migrations-Contract-Test fuer die kuenftige Migration 0139 (member_point_totals-Tabelle + AFTER-INSERT-Trigger + Guard-Trigger)
  - RED-Repository-Test fuer das kuenftige MemberPointTotalsRepository (Concurrency, Retry-Idempotenz, Reversal, Ranking-Tie-Break, snake_case-JSON-Contract)
  - Verbindliche Abnahmekriterien (D-01/D-05/D-06) fuer Plan 109-02
affects: [109-02-persistierte-summenfortschreibung, 109-03-lese-endpunkt]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AFTER INSERT-Aggregat-Trigger auf einer fremden append-only-Tabelle als einziger Fortschreibungspfad einer materialisierten Summe (kein Service-seitiges Increment)"
    - "Migrations-Contract-Tests via whitespace-normalisiertem String-Contains + Reihenfolge-Check (requireSQLContains/requireOrder), wiederverwendet aus Phase 106"

key-files:
  created:
    - backend/internal/migrations/phase109_member_point_totals_test.go
    - backend/internal/repository/member_point_totals_repository_test.go
  modified: []

key-decisions:
  - "Migrationsnummer 0139 unmittelbar vor Implementierung erneut geprueft (ls database/migrations | sort | tail) -- 0138 bleibt hoechste vorhandene Nummer, keine Kollision mit einem parallelen GSD-Lauf."
  - "Migrations-Helper (readPhase106Migration, phase106MigrationPath, requireSQLContains, requireOrder, assertPhase106TableExists) direkt aus phase106_member_points_test.go wiederverwendet (selbes Package migrations) statt Kopie."
  - "Repository-Test seedet fuer den Ranking-Tie-Break-Test zusaetzlich eine zweite point_rules-Zeile (id=102, point_value=5), da RulePointValue durch validate_point_ledger_insert gegen die tatsaechliche Regel geprueft wird -- ein Member mit 5 Punkten war ohne eigene Regel nicht erzeugbar."

patterns-established:
  - "Pattern 1: AFTER INSERT-Trigger als einziger Schreibpfad fuer eine aggregierte, transaktional konsistente Summe ueber einer bestehenden append-only-Tabelle."
  - "Pattern 2: Guard-Trigger (pg_trigger_depth() = 0 -> RAISE EXCEPTION) verhindert direkte Anwendungs-Writes auf eine trigger-gepflegte Summentabelle."
  - "Pattern 3: MemberPointRankingRow traegt explizite snake_case JSON-Struct-Tags, verifiziert durch eine dedizierte json.Marshal-Assertion statt reiner Go-Feldnamen-Pruefung."

requirements-completed: [GAM-01, GAM-02, GAM-03, GAM-04, GAM-05]

# Metrics
duration: 35min
completed: 2026-07-27
---

# Phase 109 Plan 01: RED-Testfundament fuer Ranglisten-Punktprojektion Summary

**Zwei neue Testdateien legen die verbindlichen Abnahmekriterien (D-01/D-05/D-06) fuer die noch nicht existierende Migration 0139 und das noch nicht existierende MemberPointTotalsRepository fest -- beide schlagen kontrolliert und dokumentiert fehl (RED), ohne Produktivcode zu veraendern.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-07-27T12:50:00Z
- **Completed:** 2026-07-27T13:25:00Z
- **Tasks:** 2 / 2 completed
- **Files modified:** 2 (beide neu angelegt)

## Accomplishments
- `backend/internal/migrations/phase109_member_point_totals_test.go`: Contract-Tests fuer Up (Tabellen-/Trigger-Reihenfolge, Pflicht-Fragmente, Verbot von `insert into point_ledger_entries` und `on delete cascade`), Down (Trigger/Funktion vor Tabelle, kein Antasten von `point_ledger_entries`) sowie ein Live-Up-Down-Up-Test gegen eine isolierte Postgres-Fixture.
- `backend/internal/repository/member_point_totals_repository_test.go`: Concurrency-Test (zwei parallele, unterschiedliche Awards summieren korrekt), Retry-Test (identischer idempotency_key erhoeht die Summe nur einmal), Reversal-Test (Award+Reversal faellt netto auf 0 zurueck), Ranking-Test (absteigende Sortierung mit `member_id ASC`-Tie-Break bei Punktgleichstand) sowie ein dedizierter JSON-Feldnamen-Test, der snake_case-Struct-Tags erzwingt.
- Beide Dateien kompilieren/verhalten sich exakt wie geplant im RED-Zustand: Migrationstest laeuft und scheitert an fehlender SQL-Datei; Repository-Test/-Paket scheitert bereits beim `go vet`/`go test`-Build mit `undefined: NewMemberPointTotalsRepository` / `undefined: MemberPointRankingRow`.
- Bestehende Regressions-/Boundary-Tests (`TestPointServicePhase106Boundary`, `TestPhase107ReviewServiceBoundary`, `TestPhase106MigrationBoundary`) bleiben unveraendert gruen.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrations-Contract-Test fuer 0139 (RED)** - `a0da8419` (test)
2. **Task 2: Repository-Test fuer Concurrency/Reversal/Ranking/JSON-Contract (RED)** - `3d67250a` (test)

**Plan metadata:** (dieser Commit folgt separat nach diesem Summary)

## Files Created/Modified
- `backend/internal/migrations/phase109_member_point_totals_test.go` - Migrations-Contract-Tests (Up/Down/Live-Up-Down-Up) fuer die kuenftige Migration 0139
- `backend/internal/repository/member_point_totals_repository_test.go` - Concurrency-, Retry-, Reversal-, Ranking- und JSON-Feldnamen-Tests fuer das kuenftige MemberPointTotalsRepository

## Decisions Made
- Migrationsnummer 0139 direkt vor der Implementierung erneut per Verzeichnislisting geprueft (Pitfall 4) -- keine Kollision, Nummer bleibt wie in RESEARCH/PATTERNS vorgesehen.
- Bestehende, generische Migrations-Test-Helfer aus `phase106_member_points_test.go` direkt wiederverwendet (gleiches Package `migrations`), keine Duplikate angelegt.
- Fuer den Ranking-Tie-Break-Test wurde eine zusaetzliche `point_rules`-Zeile mit `point_value=5` testlokal eingefuegt, weil `validate_point_ledger_insert` (0131) den `point_value` einer Award-Buchung gegen die tatsaechlich referenzierte Regel prueft -- ohne eigene Regel waere ein Member mit 5 Punkten (statt 10) nicht regelkonform erzeugbar gewesen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan-Verify-Kommando fuer Task 2 haette RED nicht sichtbar gemacht**
- **Found during:** Task 2 (Verifikation)
- **Issue:** Das im Plan angegebene `<automated>`-Verify-Kommando fuer Task 2 (`go build ./internal/repository/... 2>&1 | grep -q "undefined: ..."`) haette bei tatsaechlicher Ausfuehrung fehlgeschlagen (falsch-negativ), weil `go build` in Go grundsaetzlich keine `_test.go`-Dateien kompiliert -- die undefinierten Symbole tauchen dort nie auf.
- **Fix:** RED-Zustand stattdessen mit `go vet ./internal/repository/...` und `go test ./internal/repository/... -run TestMemberPointTotals` verifiziert (beide kompilieren Testdateien und zeigen exakt die erwarteten `undefined: NewMemberPointTotalsRepository` / `undefined: MemberPointRankingRow`-Fehler). Kein Code geaendert, nur die tatsaechlich aussagekraeftige Verifikationsmethode verwendet.
- **Files modified:** keine (nur Verifikationsvorgehen)
- **Verification:** `go vet ./internal/repository/...` und `go test ./internal/repository/... -run TestMemberPointTotals` zeigen beide den erwarteten Build-Fehler; `go build ./internal/repository/...` allein liefert exit 0 (kein Testfile-Build) und ist damit als alleiniges Verify-Kommando fuer diesen RED-Nachweis ungeeignet.
- **Committed in:** kein separater Commit noetig (reine Verifikationskorrektur, kein Produktivcode/Testcode betroffen)

---

**Total deviations:** 1 auto-fixed (1 Bug-Fix in der Verifikationsmethode, kein Codewechsel)
**Impact on plan:** Kein Einfluss auf Testinhalt oder RED-Zustand selbst -- lediglich die Nachweis-/Verifikationsmethode wurde korrigiert, da das im Plan genannte `go build`-Kommando fuer Go-Testdateien strukturell keine Aussagekraft hat.

## Issues Encountered
- Keine blockierenden Probleme. Beide Dateien liessen sich exakt nach den in PATTERNS.md/RESEARCH.md vorgegebenen Helfern und Konventionen anlegen.

## User Setup Required
None - keine externe Service-Konfiguration noetig. Live-Postgres-Tests (`TestPhase109MigrationLiveUpDownUp`) uebersprangen erwartungsgemaess mangels gesetzter `TEAM4S_PHASE106_TEST_DSN`-Umgebungsvariable (bestehendes, akzeptiertes Projektverhalten, kein neuer Blocker).

## Next Phase Readiness
- Plan 109-02 hat jetzt exakte, ausfuehrbare Abnahmekriterien fuer Migration 0139 und `MemberPointTotalsRepository` (inkl. Struct-Tags-Contract) -- die Implementierung muss lediglich beide Testdateien auf GREEN bringen, ohne `point_service.go`, `point_ledger_repository.go`, `review_service.go` oder Review-Repositories anzufassen.
- Kein Produktivcode wurde in diesem Plan veraendert; Boundary-Schutz fuer Phase 106/107 bleibt vollstaendig intakt.

---
*Phase: 109-ranglisten-und-punkteprojektionen*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: backend/internal/migrations/phase109_member_point_totals_test.go
- FOUND: backend/internal/repository/member_point_totals_repository_test.go
- FOUND: .planning/phases/109-ranglisten-und-punkteprojektionen/109-01-SUMMARY.md
- FOUND commit: a0da8419 (Task 1)
- FOUND commit: 3d67250a (Task 2)
- FOUND commit: 5008290e (Summary)

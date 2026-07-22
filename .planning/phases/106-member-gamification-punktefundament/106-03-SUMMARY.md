---
phase: 106-member-gamification-punktefundament
plan: "03"
subsystem: database
tags: [go, pgx, postgres, idempotency, append-only-ledger]
requires:
  - phase: 106-01
    provides: guarded Phase-106 PostgreSQL fixture and point foundation schema
  - phase: 106-02
    provides: database-enforced immutable rules and ledger invariants
provides:
  - exact read-only point rule lookup by code and version
  - race-safe idempotent award and reversal repository operations
  - guarded PostgreSQL concurrency, lost-response, and rollback coverage
affects: [phase-107-review, phase-108-source-adapters, phase-109-point-aggregation]
tech-stack:
  added: []
  patterns: [shared DBTX transaction binding, insert-first conflict arbitration, full semantic retry comparison]
key-files:
  created:
    - backend/internal/repository/point_rules_repository.go
    - backend/internal/repository/point_rules_repository_test.go
    - backend/internal/repository/point_ledger_repository.go
    - backend/internal/repository/point_ledger_repository_test.go
  modified:
    - backend/internal/repository/audit_logs.go
key-decisions:
  - "Rule-Lookups akzeptieren ausschließlich den expliziten Code-plus-Version-Ref; Latest- und Aktivierungslogik bleibt außerhalb des Repositorys."
  - "Award- und Storno-Retries konvergieren nur bei vollständiger semantischer Gleichheit; recorded_at ist als DB-Buchungszeit der einzige ausgeschlossene Vergleichswert."
  - "Stornos übernehmen Identität, Source, Regel-Snapshot und Kontext per INSERT SELECT aus dem gesperrten Original-Award."
patterns-established:
  - "Insert-first: PostgreSQL-Constraints entscheiden Rennen, anschließend wird die persistierte Zeile vollständig verglichen."
  - "Transaktionsbindung: WithDB bindet dieselben Repositorys ohne zweite DB-Abstraktion an pgx.Tx."
requirements-completed: [GAM-02, GAM-03, GAM-04, GAM-05]
duration: 8min
completed: 2026-07-22
---

# Phase 106 Plan 03: Rule- und Ledger-Repositorys Summary

**Explizite versionierte Rule-Refs und append-only Punktebuchungen mit PostgreSQL-arbitrierter Award-/Storno-Idempotenz**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-22T19:56:42Z
- **Completed:** 2026-07-22T20:04:39Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Die bestehende `DBTX`-Naht unterstützt nun `QueryRow`, sodass Rule- und Ledger-Repositorys sowohl Pool als auch `pgx.Tx` verwenden.
- `PointRulesRepository.GetByRef` liest ausschließlich eine explizite, unveränderliche Code-/Versionsreferenz und mappt Validierungs- sowie Not-found-Fehler stabil.
- Award- und Storno-Inserts nutzen `ON CONFLICT DO NOTHING RETURNING`, laden bei Konflikten die bestehende Buchung und akzeptieren nur semantisch identische Retries.
- Storno-Caller können keine geerbten Member-, Source-, Regel-, Wert- oder Kontextfelder liefern; `INSERT SELECT` kopiert sie aus dem Original-Award.
- Guarded PostgreSQL-Tests belegen parallele Konvergenz, Lost-response-Retries, Mismatch-Konflikte, Reversal-of-reversal-Ablehnung und Rollback-Eigentum.

## Task Commits

1. **Task 1 RED: RuleRef-Vertrag** - `fb1fb91b` (test)
2. **Task 1 GREEN: Expliziter Rule-Lookup** - `fd426c3b` (feat)
3. **Task 2 RED: Ledger-Vertrag** - `6953edbb` (test)
4. **Task 2 GREEN: Idempotente Awards und Stornos** - `6e1c3366` (feat)

## Files Created/Modified

- `backend/internal/repository/audit_logs.go` - gemeinsame `DBTX`-Naht um `QueryRow` erweitert.
- `backend/internal/repository/point_rules_repository.go` - exakter, read-only Code-/Versions-Lookup.
- `backend/internal/repository/point_rules_repository_test.go` - Validierungs-, Not-found-, Exact-ref- und API-Grenztests.
- `backend/internal/repository/point_ledger_repository.go` - append-only Award-/Storno-Schreibpfade und Retry-Vergleiche.
- `backend/internal/repository/point_ledger_repository_test.go` - schnelle Vertrags- und guarded PostgreSQL-Concurrency-Tests.

## Decisions Made

- `recorded_at` wird bei Retry-Vergleichen nicht verglichen, da es die serverseitige Buchungszeit der bereits persistierten Zeile ist; alle fachlichen Felder einschließlich `effective_at` werden verglichen.
- `GetForUpdate` bleibt öffentlich am internen Repository für spätere service-eigene Validierung; das Storno selbst leitet geerbte Daten zusätzlich atomar per `INSERT SELECT` ab.
- Es wurden keine Handler, Aggregate, Listen, Badge-, Review-, Media- oder HTTP-Verträge hinzugefügt.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Verification

- `go test ./internal/repository -run 'TestPoint(Rules|Ledger).*(Validation|ExactRef|NotFound|Boundary|SQLContract|RetryComparison|ErrorMapping)' -count=1` — PASS
- Guarded disposable PostgreSQL gate for `TestPointLedgerPostgres.*(Award|Reversal|Concurrent|LostResponse|Rollback)` — PASS
- `go test ./internal/repository -count=1` — PASS
- `go vet ./internal/repository` — PASS
- `git diff --check` — PASS

## Next Phase Readiness

- Phase 107 kann Review- und Vier-Augen-Regeln auf die transaktionsbindbaren Repositorys setzen.
- Phase 108 kann bestätigte Quellen über serverseitig abgeleitete Awards anbinden, ohne Ledger- oder Rule-Policy zu duplizieren.
- Keine Blocker bekannt.

## Self-Check: PASSED

- Alle fünf deklarierten Key-Dateien existieren.
- Alle vier Task-Commits sind in der Git-Historie vorhanden.
- Sämtliche Task- und Plan-Verifikationen bestanden.

---
*Phase: 106-member-gamification-punktefundament*
*Completed: 2026-07-22*

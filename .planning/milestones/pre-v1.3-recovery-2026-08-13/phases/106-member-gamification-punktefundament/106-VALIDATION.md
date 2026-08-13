---
phase: 106
slug: member-gamification-punktefundament
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-22
updated: 2026-07-22
---

# Phase 106 — Validation Strategy

> Task-genaues Nyquist-Mapping für die vier finalen Pläne. `nyquist_compliant` und `wave_0_complete` bleiben bis zur ausgeführten, grünen Wave 0 bewusst `false`.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + vorhandenes `testify`; PostgreSQL 16 für Constraints und Parallelität |
| **Fast feedback** | Pro Task ein benannter Unit-/Static-Subset ohne Docker; Ziel < 30 Sekunden |
| **Live database** | Nur explizit erzeugte `team4s_phase106_test_<random>`-Datenbank plus zufälliges Schema |
| **Compose service** | `team4sv30-db` |
| **Full suite** | `cd backend; go test ./...` |

## Sampling Rate

- **Nach jedem Task:** ausschließlich der in der Tabelle genannte schnelle Unit-/Static-Befehl.
- **Nach Wave 2:** disposable PostgreSQL Up -> Down -> Up samt Append-only-/Cross-Row-Triggern.
- **Nach Wave 3:** disposable PostgreSQL Award-/Reversal-Retry- und Concurrency-Suite.
- **Nach Wave 4:** gesamte Phase-106-Live-Suite einschließlich caller-owned Transaction-Atomicity.
- **Vor `$gsd-verify-work`:** `go test ./...`, `go vet ./...`, `git diff --check` und ein frischer disposable PostgreSQL-Gate.
- **Maximale fokussierte Task-Latenz:** 30 Sekunden; Docker-/Concurrency-Gates sind zusätzliche Wave-Verifikation und kein Per-Task-Feedbackpfad.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 106-01-01 | 106-01 | 1 | GAM-05 / D-09 | T-106-01 | Nur explizite Phase-106-Test-DSN; falsche DB-Namen und `public` werden abgewiesen | unit/static | `cd backend; go test ./internal/testsupport -run 'TestPhase106.*(DSN|DatabaseGuard|Schema|Public)' -count=1` | pending |
| 106-01-02 | 106-01 | 1 | GAM-01..05 / D-01..10 | T-106-02..04 | Kompilierbarer erwarteter RED-Vertrag für Migration, Parent-Wegfall-gebundene FK-Nullung, lebender-Parent-Nested-Gegenprobe, Award-Rule-Snapshot und Cross-Row-Storno | expected-red static | `cd backend; $output = go test ./internal/migrations -run 'TestPhase106MigrationUpContract' -count=1 2>&1; if ($LASTEXITCODE -eq 0) { throw 'Wave-0 migration contract must be RED before the Up migration exists' }; if (($output -join "`n") -notmatch '0131_member_point_foundation') { $output; throw 'unexpected Wave-0 failure' }` | pending |
| 106-02-01 | 106-02 | 2 | GAM-01..04 / D-01/D-04/D-06/D-07 | T-106-05..07 | Up-SQL enthält alle FKs/Snapshots, Award-Rule- und Reversal-BEFORE-INSERT-Prüfung sowie den direkten UPDATE/DELETE blockierenden Guard mit `NOT EXISTS` für jeden genullten OLD-Parent; Live-Test beweist echte FK-Löschung und weist den exakt geformten Nested-Versuch bei lebendem Parent ab | static + wave integration | `cd backend; go test ./internal/migrations -run 'TestPhase106MigrationUpContract' -count=1` | pending |
| 106-02-02 | 106-02 | 2 | GAM-05 / D-03/D-05/D-08..10 | T-106-08 | Down entfernt nur Phase-106-Objekte; Wave-Gate beweist Up/Down/Up in disposable DB | static + wave integration | `cd backend; go test ./internal/migrations -run 'TestPhase106MigrationDownContract' -count=1` | pending |
| 106-03-01 | 106-03 | 3 | GAM-03 / D-04 | T-106-09 | Exakter RuleRef-Lookup ohne Latest-/Activation-/Mutation-API | unit/static | `cd backend; go test ./internal/repository -run 'TestPointRules.*(Validation|ExactRef|NotFound|Boundary)' -count=1` | pending |
| 106-03-02 | 106-03 | 3 | GAM-02 / D-04 | T-106-09..12 | Award und Reversal sind insert-first, idempotent und mismatch-sicher | unit/static + wave integration | `cd backend; go test ./internal/repository -run 'TestPointLedger.*(Validation|SQLContract|RetryComparison|ErrorMapping)' -count=1` | pending |
| 106-04-01 | 106-04 | 4 | GAM-01/GAM-03 / D-01/D-02/D-04 | T-106-13..14 | CreditInTx besitzt Caller-Tx nicht; Credit-Wrapper besitzt eigene Tx; Wert serverseitig; RewardKind-/Source-/Member-/Slot-Key delimiter-sicher, regelversionsstabil und slot-trennend | unit + wave integration | `cd backend; go test ./internal/services -run 'TestPointServiceCredit.*(Validation|RuleRef|Idempotency|InTx|Standalone)' -count=1` | pending |
| 106-04-02 | 106-04 | 4 | GAM-02/GAM-04/GAM-05 / D-03/D-05..10 | T-106-15..16 | ReverseInTx und Retry sind korrekt; Boundary-Test scannt nur Phase-106-Artefakte | unit/static + wave integration | `cd backend; go test ./internal/services -run 'TestPointService(Reverse|Phase106Boundary).*(Validation|InTx|Standalone|Retry|Boundary|Error)' -count=1` | pending |

## Disposable PostgreSQL Wave Gate

Jedes Live-Gate verwendet denselben sicheren Ablauf:

1. `docker compose up -d team4sv30-db`.
2. Zufälligen Namen `team4s_phase106_test_<guid>` erzeugen.
3. Mit `docker compose exec -T team4sv30-db createdb -U team4s <name>` genau diese DB anlegen.
4. `TEAM4S_PHASE106_TEST_DSN` nur für den Testprozess auf diese DB setzen.
5. Tests ausführen; SKIP ist Fehler.
6. Im `finally` die Variable entfernen und nur bei bestätigtem Präfix mit `dropdb -U team4s --force <name>` löschen.

Die Wave-spezifischen vollständigen PowerShell-Befehle stehen in den `<verification>`-Abschnitten von 106-02, 106-03 und 106-04. Kein Befehl zeigt auf `team4s_v2`, `postgres`, `public` oder eine persistente Entwicklungsdatenbank.

## Wave 0 Requirements

- [ ] `backend/internal/testsupport/phase106_postgres.go` — harter DB-/Schema-Guard
- [ ] `backend/internal/migrations/phase106_member_points_test.go` — Up/Down, direkte Mutation, echte Parent-Delete-FK-Nullung, exakt geformter Nested-Versuch bei lebendem Parent, Award-Rule-Snapshot, Cross-Row-Storno und enge Boundary
- [ ] `backend/internal/repository/point_rules_repository_test.go` — expliziter RuleRef
- [ ] `backend/internal/repository/point_ledger_repository_test.go` — Award-/Reversal-Retry, Lost Response und Concurrency
- [ ] `backend/internal/services/point_service_credit_test.go` — CreditInTx/standalone, RewardKind-/Slot-Key-Vertrag und gemeinsame Domaintransaktion
- [ ] `backend/internal/services/point_service_reverse_test.go` — ReverseInTx/standalone und Retry
- [ ] `backend/internal/services/point_service_boundary_test.go` — nur Phase-106-Artefakte

## Manual-Only Verifications

Keine. Phase 106 exponiert weder UI noch öffentlichen HTTP-Write-Pfad.

## Validation Sign-Off

- [x] Alle acht realen Task-IDs und Waves sind abgebildet.
- [x] Jeder Task besitzt einen fokussierten automatisierten Befehl.
- [x] PostgreSQL-Concurrency, Up -> Down -> Up sowie echter FK-Delete gegen nachgeahmte Nested-Nullung bei lebendem Parent liegen zusätzlich an Wave-Gates.
- [x] Normale Entwicklungsdatenbank und `public` sind durch Guards ausgeschlossen.
- [ ] Wave 0 ausgeführt und grün.
- [ ] Frontmatter-Nyquiststatus nach erfolgreicher Wave-0-Ausführung auf grün setzen.

**Approval:** pending execution

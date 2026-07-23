---
phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
plan: "05"
subsystem: database
tags: [go, postgresql, repository, concurrency, review, points]

requires:
  - phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
    provides: Immutable Review-Foundation und source-globale Credit-Slot-Constraints aus Plan 107-02
  - phase: 106-member-gamification-punktefundament
    provides: Tx-gebundener PointService mit regelversionsstabilen, servergenerierten Idempotenzschlüsseln
provides:
  - INSERT-first First-Decision-Wins-Arbiter pro Source, StableKey und Revision
  - Tx-gebundene source-globale Reject-/Confirm-Credit-Slots mit PostgreSQL-Advisory-Lock
  - Reale Barrier-Tests für parallele Reviewer, Revisionen und unabhängige konkrete Quellen
affects: [107-06, 107.1-release-pruefworkspace, 108-bestehende-beitragsquellen]

tech-stack:
  added: []
  patterns:
    - PostgreSQL-Unique plus INSERT-first für unveränderliche First-Decision-Wins-Semantik
    - Versionierter interner Advisory-Lock-Token plus vollständige Textspalten-Unique als Business-Identität
    - Lock, Recheck, PointService-Award und Slot-Link im identischen Caller-Tx

key-files:
  created:
    - backend/internal/repository/review_decision_repository.go
    - backend/internal/repository/review_decision_repository_test.go
    - backend/internal/repository/review_credit_repository.go
    - backend/internal/repository/review_credit_repository_test.go
  modified: []

key-decisions:
  - "Jeder Decision-Verlierer erhält ErrConflict, auch ein inhaltlich identischer Retry desselben Actors; vorhandene Decisions werden nie als Erfolg zurückgeladen."
  - "Der Advisory-Lock-Token wird intern, versioniert und längengerahmt aus SourceType, StableKey und reject|confirm erzeugt; die vollständige Unique-Constraint bleibt alleinige Business-Identität."
  - "ReviewCreditRepository exponiert ausschließlich LockSlot, HasSlot und InsertSlot; PointService.CreditInTx bleibt alleiniger Award-Schreiber und kein Review-API akzeptiert eigene Idempotenzschlüssel."

patterns-established:
  - "ReviewDecisionRepository validiert und normalisiert Source-/Actor-/Kategorie-Snapshots, besitzt aber keinen Begin-/Commit-/Rollback-Lifecycle."
  - "ReviewCreditRepository prüft den source-globalen Slot erst unter pg_advisory_xact_lock und verknüpft danach die echte Decision- und Point-Ledger-ID append-only."

requirements-completed: [P107-SC2, P107-SC4, P107-SC5, P107-SC6]

duration: 12min
completed: 2026-07-23
---

# Phase 107 Plan 05: First-Decision-Wins und source-globale Review-Credits Summary

**PostgreSQL linearisiert immutable Review-Entscheidungen pro Source-Revision und begrenzt Prüfpunkte reviewerübergreifend auf genau einen Reject- sowie einen späteren Confirm-Slot pro stabiler Quelle.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-23T14:25:44Z
- **Completed:** 2026-07-23T14:37:17Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `ReviewDecisionRepository.InsertDecision` verwendet `INSERT ... ON CONFLICT (source_type, source_key, source_revision) DO NOTHING RETURNING`; jeder Verlierer einschließlich Same-Actor-Retry erhält stabil `ErrConflict`.
- Decision-Inputs und -Rows bewahren Review-Art, strukturierte Ablehnungskategorie, Gruppe, Reviewer-App-User/-Member, Override-Flag und PostgreSQL-genauen Entscheidungszeitpunkt.
- `ReviewCreditRepository` erzeugt den versionierten Advisory-Lock-Token ausschließlich intern und koordiniert `LockSlot` → `HasSlot` → `PointService.CreditInTx` → `InsertSlot` im Caller-Tx.
- Reject und Confirm sind unabhängige source-globale Slots ohne Revision im Unique-Key; verschiedene konkrete StableKeys bleiben unabhängig.
- Reale PostgreSQL-Barrieren liefen je zehnmal für Decision- und Credit-Konkurrenz sowie anschließend als vollständige aktuelle Phase-107-Suite.

## Task Commits

TDD-Aufgaben wurden mit getrennten RED- und GREEN-Commits ausgeführt:

1. **Task 1 RED: First-Decision-Wins-Verträge** - `4f78b6c4` (test)
2. **Task 1 GREEN: Tx-gebundenes Decision-Repository** - `35961536` (feat)
3. **Task 2 RED: Source-globale Credit-Slot-Verträge** - `e5528fa4` (test)
4. **Task 2 GREEN: Advisory-Lock und immutable Credit-Slot-Verknüpfung** - `8f798bb7` (feat)
5. **Task 2 Boundary-Korrektur: literal-freier Ledger-Scan** - `5b8b1c81` (test)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `backend/internal/repository/review_decision_repository.go` - Typisierte Decision-Snapshots, Validierung und INSERT-first-Konfliktarbiter.
- `backend/internal/repository/review_decision_repository_test.go` - Same-Actor-, Independent- und echte Confirm-vs-Reject-Barrier-Verträge.
- `backend/internal/repository/review_credit_repository.go` - Interner Advisory-Lock-Key, Slot-Recheck und append-only Decision-/Ledger-Link.
- `backend/internal/repository/review_credit_repository_test.go` - PointService-basierte Concurrent-, Reject/Confirm-, Across-Revisions-, Independent- und Boundary-Verträge.

## Decisions Made

- Source-Type, StableKey und strukturierte Reject-Kategorie werden ausschließlich nach dem bestehenden Unicode-Whitespace-Vertrag kanonisiert; keine ID, Kategorie oder Zeit wird erfunden.
- Der Decision-Arbiter lädt nach Konflikt absichtlich keine bestehende Zeile. Dadurch kann kein Retry fachliche Seiteneffekte erneut als Erfolg ausführen.
- Der Advisory-Hash ist nur ein Serialisierungsverteiler. Identität und Kollisionssicherheit bleiben bei `UNIQUE (source_type, source_key, credit_slot)`.
- Credit-Tests rufen den bestehenden `PointService.CreditInTx` ohne Caller-Key auf und verknüpfen ausschließlich dessen reale `point_ledger_entries.id`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Concurrent-Decision-Testergebnis atomar gepaart**
- **Found during:** Task 1 (INSERT-first First-Decision-Wins-Repository)
- **Issue:** Getrennte Row- und Error-Channels konnten Ergebnisse verschiedener Goroutines bei ungünstigem Scheduling falsch paaren.
- **Fix:** Jede Goroutine sendet Row und Error gemeinsam in einer Ergebnisstruktur.
- **Files modified:** `backend/internal/repository/review_decision_repository_test.go`
- **Verification:** Confirm-vs-Reject-Barrier lief zehnmal mit exakt einem Winner und einem `ErrConflict`.
- **Committed in:** `35961536`

**2. [Rule 3 - Blocking] Boundary-Test ohne verbotene SQL-Literale oder Caller-Key-Abfrage**
- **Found during:** Gesamtverifikation nach Task 2
- **Issue:** Der negative Source-Scan fand seine eigenen verbotenen SQL-Literale im Test; eine Ledger-Zählquery erwähnte außerdem unnötig die Idempotenzspalte.
- **Fix:** Negative Literale werden im Test quelltextseitig getrennt zusammengesetzt; Awards werden über servergenerierte Source-/Entry-Snapshots gezählt.
- **Files modified:** `backend/internal/repository/review_credit_repository_test.go`
- **Verification:** Vier-Dateien-Source-Scan ist leer und der vollständige Credit-Live-Gate lief erneut zehnmal.
- **Committed in:** `5b8b1c81`

**3. [Rule 3 - Blocking] GSD-Requirement-Tracking mit aktuellem Planned-Status synchronisiert**
- **Found during:** Plan-Closeout
- **Issue:** `requirements.mark-complete` erkennt nur `Pending`, während die aktuellen Phase-107-Traceability-Zeilen `Planned` verwendeten und deshalb als nicht gefunden meldete.
- **Fix:** Die vier exakt im Plan deklarierten Requirement-Zeilen wurden im bestehenden Traceability-Format auf `Complete` gesetzt.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `P107-SC2`, `P107-SC4`, `P107-SC5` und `P107-SC6` stehen jeweils genau einmal mit Status `Complete`.
- **Committed in:** Plan-Metadatencommit

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking issues).
**Impact on plan:** Die Korrekturen betreffen ausschließlich die Zuverlässigkeit der geplanten Tests, Boundary-Gates und GSD-Traceability; Produktionsscope und Repository-Verträge bleiben unverändert.

## Issues Encountered

- Ein initialer `gofmt`-Aufruf verwendete einmal den Backend-relativen Pfad vom Repository-Root und fand die Datei deshalb nicht. Der korrekte Root-relative Pfad wurde direkt ausgeführt; keine Datei blieb unformatiert.
- `state.update-progress` meldete, dass das erwartete Body-Feld im aktuellen STATE-Format fehlt; `state.advance-plan` aktualisierte den kanonischen Frontmatter-Zähler dennoch korrekt auf 413 abgeschlossene Pläne.

## Verification

- `go test ./internal/repository -run 'TestPhase107ReviewDecision.*(FirstWins|Concurrent|SameActor|Independent)' -count=10` mit disposable PostgreSQL 16 - PASS.
- `go test ./internal/repository -run 'TestPhase107ReviewCredit.*(Concurrent|RejectConfirm|AcrossRevisions|Independent|NoLedgerInsert)' -count=10` mit disposable PostgreSQL 16 - PASS; nach Boundary-Korrektur erneut PASS.
- `go test ./internal/testsupport ./internal/migrations ./internal/permissions ./internal/repository -run 'TestPhase107' -count=10` mit disposable PostgreSQL 16 - PASS.
- `go test ./...` mit `TEAM4S_PHASE107_TEST_DSN` - PASS.
- `go vet ./...` - PASS.
- `git diff --check 199dcdde..HEAD -- <vier Plan-107-05-Dateien>` und `git show --check` für alle fünf Task-Commits - PASS.
- Source-Scan der vier Plan-Dateien - kein direktes Ledger-INSERT, kein Slot-UPDATE/-DELETE, keine Assignment-/Reservation-Namen, keine alten Ledgernamen und kein Caller-Idempotenzschlüssel.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 107-06 kann Decision, Adaptermutation, mandatory Audit, PointService und Credit-Slot über denselben Caller-Tx orchestrieren.
- Die Repository-Grenze belegt genau einen Reject plus optional einen späteren Confirm pro stabiler Source über Reviewer und Revisionen hinweg.
- Es bestehen keine offenen Blocker; `grep.exe.stackdump` und Phase 107.1 blieben unangetastet.

## Self-Check: PASSED

- Alle vier Plan-Artefakte und diese Summary existieren.
- Die fünf Task-/TDD-Commits `4f78b6c4`, `35961536`, `e5528fa4`, `8f798bb7` und `5b8b1c81` sind in der Git-Historie vorhanden.

---
*Phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus*
*Completed: 2026-07-23*

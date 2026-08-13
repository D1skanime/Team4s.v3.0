---
status: partial
phase: 109-ranglisten-und-punkteprojektionen
source: [109-VERIFICATION.md]
started: 2026-07-27T13:30:38Z
updated: 2026-07-27T13:30:38Z
---

## Current Test

[awaiting human testing — Docker/Postgres muss laufen; TEAM4S_PHASE106_TEST_DSN setzen]

## Tests

### 1. Live Up/Down/Up der Migration 0139
expected: PASS — Migration 0139 ist auf frischer 0131-Basis symmetrisch up->down->up migrierbar; `member_point_totals` existiert danach.
command: `cd backend && go test ./internal/migrations/... -run TestPhase109MigrationLiveUpDownUp -v`
result: [pending]

### 2. Trigger-Concurrency (parallele Awards summieren korrekt)
expected: PASS — zwei parallele InsertAward fuer denselben Member summieren sich korrekt (20 Punkte); AFTER-INSERT-Trigger feuert transaktionskonsistent fuer beide Inserts.
command: `cd backend && go test ./internal/repository/... -run TestMemberPointTotalsPostgresConcurrentAwardsSumCorrectly -v`
result: [pending]

### 3. Retry-Idempotenz (kein Doppelzaehlen)
expected: PASS — zweimaliger InsertAward mit identischem IdempotencyKey erhoeht total_points genau einmal (ON CONFLICT DO NOTHING feuert den Trigger beim Retry nicht erneut).
command: `cd backend && go test ./internal/repository/... -run TestMemberPointTotalsPostgresRetrySameAwardDoesNotDoubleCount -v`
result: [pending]

### 4. Reversal senkt die Summe (D-06)
expected: PASS — Award (+10) gefolgt von Reversal (-10) faellt total_points netto auf 0 zurueck.
command: `cd backend && go test ./internal/repository/... -run TestMemberPointTotalsPostgresReversalLowersTotal -v`
result: [pending]

### 5. Ranking-Sortierung + Tie-Break + Page-Bounds (D-01)
expected: PASS — Rangliste total_points DESC, member_id ASC (Gleichstand: kleinere ID zuerst); Page-Bounds-Klemmung (page<1->1, page>1000->1000) wirft keinen Fehler.
command: `cd backend && go test ./internal/repository/... -run TestMemberPointTotalsRankingOrderAndTieBreak -v` und `-run TestMemberPointTotalsRankingPageBounds -v`
result: [pending]

### 6. Guard-Trigger blockiert echten Direkt-Write (CR-01-Fix, offene Luecke WR-01)
expected: Fehler "member_point_totals is maintained exclusively by the point_ledger_entries trigger" — der Guard blockiert Direktzugriff wirksam nach dem Fix (pg_trigger_depth() <= 1).
command: Gegen laufende Postgres-Instanz mit angewendeter 0139: `UPDATE member_point_totals SET total_points = 999 WHERE member_id = 1;` (bzw. INSERT/DELETE) direkt ausfuehren und Exception erwarten. Es existiert dafuer noch KEIN automatisierter Test (WR-01) — empfohlen: einen Repository-Test ergaenzen, der den Direkt-Write versucht und die Exception asserted.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps

- WR-01 (aus 109-REVIEW.md, offen): Kein automatisierter Test deckt das tatsaechliche Guard-Verhalten (Direkt-Write -> Exception) ab. Empfehlung: Test ergaenzen, sobald Docker verfuegbar ist, dann Test 6 automatisiert statt manuell.

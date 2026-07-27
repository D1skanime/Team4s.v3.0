---
phase: 109
slug: ranglisten-und-punkteprojektionen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-27
---

# Phase 109 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Quelle: 109-RESEARCH.md (Validation Architecture + Security Domain).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `stretchr/testify` (`require`) |
| **Config file** | keine zentrale Config; Test-DSN über Env-Variable pro Phase (Muster wie `phase106_member_points_test.go`) |
| **Quick run command** | `go test ./backend/internal/migrations/... ./backend/internal/repository/... -run TestPhase109 -v` |
| **Full suite command** | `go test ./backend/... -v` |
| **Estimated runtime** | ~30–60 s (Integration gegen echtes Postgres) |

---

## Sampling Rate

- **After every task commit:** `go test ./backend/internal/migrations/... ./backend/internal/repository/... -run TestPhase109 -v`
- **After every plan wave:** `go test ./backend/... -v`
- **Before `/gsd:verify-work`:** Full suite grün, **inklusive** der bestehenden Regressions-/Boundary-Tests `TestPointServicePhase106Boundary` und `TestPhase107ReviewServiceBoundary`
- **Max feedback latency:** ~60 s

---

## Per-Task Verification Map

> Task-IDs werden vom Planner vergeben. Diese Map bindet die Phase-Anforderungen (D-01, D-05, D-06)
> an konkrete automatisierte Kommandos; der Nyquist-Auditor/Executor füllt Task-IDs + Status nach.

| Req | Behavior | Threat Ref | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-----------|-------------------|-------------|--------|
| D-05/D-06 | Award-Insert erhöht `member_point_totals.total_points` in derselben TX; Reversal senkt sie | — | integration (echtes Postgres) | `go test ./backend/internal/repository/... -run TestMemberPointTotalsPostgres -v` | ❌ W0 | ⬜ pending |
| D-06 | Zwei parallele identische Award-Requests (idempotent) erhöhen die Summe nur einmal | T-109-DoS | integration (Concurrency) | `go test ./backend/internal/repository/... -run TestMemberPointTotalsPostgresConcurrent -v` | ❌ W0 | ⬜ pending |
| D-01 | `ListRanking` liefert Members absteigend nach `total_points` mit stabilem Tie-Break | T-109-tamper | unit/integration | `go test ./backend/internal/repository/... -run TestMemberPointTotalsRanking -v` | ❌ W0 | ⬜ pending |
| Migrations-Contract | Neue Migration legt Tabelle + Trigger in korrekter Reihenfolge an; Down räumt symmetrisch auf; Up-Down-Up idempotent | — | migration test | `go test ./backend/internal/migrations/... -run TestPhase109Migration -v` | ❌ W0 | ⬜ pending |
| Boundary/Regression | `point_service.go` / `point_ledger_repository.go` / `review_service.go` bleiben unverändert und bestehen ihre Boundary-Tests (keine `"ranking"`/`"member_points"`-Tokens) | — | regression | `go test ./backend/internal/services/... -run 'TestPointServicePhase106Boundary|TestPhase107ReviewServiceBoundary' -v` | ✅ vorhanden | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/migrations/phase109_member_point_totals_test.go` — Migrations-Contract (Up/Down/Idempotenz) für Tabelle + Trigger (D-05/D-06)
- [ ] `backend/internal/repository/member_point_totals_repository_test.go` — Concurrency/Idempotenz (kein Doppelzählen) und Ranking-Sortierung inkl. Tie-Break (D-01/D-06)
- [ ] Kein neues Test-Framework nötig — bestehendes `testsupport`-Muster direkt wiederverwendbar

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| — | — | Alle Phase-Verhalten haben automatisierte Verifikation | All phase behaviors have automated verification. |

---

## Security Domain (aus RESEARCH.md)

- **V4 Access Control (schwach):** Falls der Lese-Endpunkt öffentlich ist, nur `member_id`, Anzeigename/Slug, `total_points` ausliefern — **kein** `actor_app_user_id`, keine internen Ledger-Details (D-04 verbietet Aufschlüsselung ohnehin).
- **V5 Input Validation:** `page`-Query-Parameter Bounds-prüfen (analog `member_archive_repository.go`: `page < 1 → 1`, `page > 1000 → 1000`).
- **T-109-tamper (SQL Injection):** ausschließlich `pgx`-Parameter (`$1`,`$2`) für `LIMIT`/`OFFSET`, keine String-Interpolation.
- **T-109-DoS:** strukturell entschärft durch D-05 — keine Laufzeit-Aggregation, nur indizierter `SELECT` gegen `member_point_totals`.
- **Information Disclosure (historische Members):** falls öffentlich, `profile_visibility='public'`-Bedingung erwägen (siehe Open Question 2 im RESEARCH).

---

## Validation Sign-Off

- [ ] Alle Tasks haben `<automated>` verify oder Wave-0-Dependencies
- [ ] Sampling-Kontinuität: keine 3 aufeinanderfolgenden Tasks ohne automatisierten Verify
- [ ] Wave 0 deckt alle MISSING-Referenzen
- [ ] Keine Watch-Mode-Flags
- [ ] Feedback-Latenz < 60 s
- [ ] `nyquist_compliant: true` im Frontmatter gesetzt

**Approval:** pending

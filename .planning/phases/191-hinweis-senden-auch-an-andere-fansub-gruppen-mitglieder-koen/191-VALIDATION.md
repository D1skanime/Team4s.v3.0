---
phase: 191
slug: hinweis-senden-auch-an-andere-fansub-gruppen-mitglieder-koen
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-10-23
---

# Phase 191 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `go test` (Backend) / `vitest` (Frontend) |
| **Config file** | `backend/go.mod` / `frontend/vitest.config.ts` |
| **Quick run command** | `go test ./internal/...` / `npm run test` |
| **Full suite command** | `go test ./...` / `npm run test` |
| **Estimated runtime** | ~60 Sekunden |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for the layer touched (Backend oder Frontend)
- **After every plan wave:** Run the full suite command for both Backend und Frontend
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 120 Sekunden

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement/D-NN | Test-Typ | Automatisiertes Kommando | Status |
|---|---|---|---|---|---|---|
| 191-01 Task 1 | 191-01 | 1 | D-02/D-04/D-06/D-07/D-08 | integration (migrate up/down round-trip) | `cd backend && go run ./cmd/migrate status \| grep -c "0187_fansub_group_hints"` | ⬜ pending |
| 191-01 Task 2 | 191-01 | 1 | D-02/D-04/D-07 | integration (real Postgres fixture) | `cd backend && go build ./... && go vet ./...` (plus `go test ./backend/internal/repository/... -run FansubGroupHint -v`) | ⬜ pending |
| 191-02 Task 1 | 191-02 | 1 | D-02 | unit (renderHook, logic-level) | `npm --prefix frontend run test -- useFansubGroupSearch` | ⬜ pending |
| 191-02 Task 2 | 191-02 | 1 | D-02/D-08 | regression (typecheck + existing tests) | `npm --prefix frontend run typecheck && npm --prefix frontend run test -- episode-versions` | ⬜ pending |
| 191-03 Task 1 | 191-03 | 2 | D-04 | unit (fake Redis store) | `cd backend && go test ./internal/middleware/... -run RateLimit -v` | ⬜ pending |
| 191-03 Task 2 | 191-03 | 2 | D-04/D-06/D-07 | integration (httptest + Fake-Repo) | `cd backend && go test ./internal/handlers/... -run FansubGroupHint -v` | ⬜ pending |
| 191-04 Task 1 | 191-04 | 3 | D-01/D-03/D-05/D-06 | integration (httptest + Fake-Repo) | `cd backend && go test ./internal/handlers/... -run FansubGroupHintsReview -v` | ⬜ pending |
| 191-04 Task 2 | 191-04 | 3 | D-01 | build/route-registration check | `cd backend && go build ./...` | ⬜ pending |
| 191-05 Task 1 | 191-05 | 4 | D-01/D-03/D-05/D-07 | integration (httptest + Fake-Repo) | `cd backend && go test ./internal/handlers/... -run "FansubGroupHint" -v` | ⬜ pending |
| 191-05 Task 2 | 191-05 | 4 | D-01/D-08 | build + YAML-parse | `cd backend && go build ./... && python3 -c "import yaml; yaml.safe_load(open('shared/contracts/fansub-group-hints.yaml'))"` | ⬜ pending |
| 191-06 Task 1 | 191-06 | 5 | D-08 | typecheck | `npm --prefix frontend run typecheck` | ⬜ pending |
| 191-06 Task 2 | 191-06 | 5 | D-06/D-07/D-08 | unit (mocked fetch) | `npm --prefix frontend run test -- fansub-group-hints && npm --prefix frontend run typecheck` | ⬜ pending |
| 191-07 Task 1 | 191-07 | 6 | D-06 | unit (logic/DOM assertions) | `npm --prefix frontend run test -- ProposalForm.toggles` | ⬜ pending |
| 191-07 Task 2 | 191-07 | 6 | D-02/D-06/D-07 | unit (logic-level, extracted pure functions) | `npm --prefix frontend run test -- ProposalForm && npm --prefix frontend run typecheck` | ⬜ pending |
| 191-07 Task 3 | 191-07 | 6 | UI-SPEC A6 (D-06 workflow) | unit | `npm --prefix frontend run test -- MyProposalsSection` | ⬜ pending |
| 191-08 Task 1 | 191-08 | 6 | D-01/D-03/D-06 | unit (logic-level, extracted pure functions) | `npm --prefix frontend run test -- FansubGroupHintsReviewSection` | ⬜ pending |
| 191-08 Task 2 | 191-08 | 6 | D-06 | typecheck + composition check | `npm --prefix frontend run typecheck` | ⬜ pending |
| 191-09 Task 1 | 191-09 | 6 | D-01/D-08 | typecheck + unit | `npm --prefix frontend run typecheck && npm --prefix frontend run test -- useFansubGroupHintsListFilters` | ⬜ pending |
| 191-09 Task 2 | 191-09 | 6 | D-01/D-03/D-07 | unit (logic-level, extracted pure functions) | `npm --prefix frontend run test -- FansubGroupHintsAdminClient` | ⬜ pending |
| 191-10 Task 1 | 191-10 | 7 | D-08 | full-suite regression | `scripts/test-backend.sh && npm --prefix frontend run test && npm --prefix frontend run typecheck` | ⬜ pending |
| 191-10 Task 2 | 191-10 | 7 | D-01/D-03/D-04/D-07 | manual (blocking checkpoint, live UAT) | see Manual-Only Verifications below | ⬜ pending |

Nyquist-Prüfung: Jede Task hat ein funktionierendes `<automated>`-Kommando außer der letzten
Task (191-10 Task 2), die ein explizit deklariertes, blockierendes
`checkpoint:human-verify` ist (kein automatisierter Ersatz möglich — Live-UAT mit echten
Konten). Die vorausgehende Task (191-10 Task 1) hat ein automatisiertes Kommando, also gibt es
keine drei aufeinanderfolgenden Tasks ohne automatisierte Prüfung.

---

## Wave 0 Requirements

Keine zusätzliche Test-Fixture-Infrastruktur nötig über das hinaus, was die Pläne selbst in
Wave 1 aufbauen: Plan 191-01 Task 2 liefert `backend/internal/testsupport/phase191_postgres.go`
(reale Postgres-Fixture für die Repository-Tests) als Voraussetzung für alle späteren
Backend-Handler-Tests, die stattdessen Fake-Repositories nutzen (kein Postgres-Zugriff in den
Handler-Tests nötig). Kein separates Redis-Test-Doppel nötig — Plan 191-03 Task 1 nutzt den
bereits bestehenden Fake-In-Memory-Store aus `comment_rate_limit_test.go`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live-UAT mit echten Konten (Leader-Entscheid, Plattform-Admin-Entscheid, Rollenfeld, 409-Doppel-Hinweis, mobile Breite) | D-01/D-03/D-04/D-07 | Erfordert echte Rollenzuweisung + visuelle Prüfung der Formulare laut UI-SPEC, keine direkten INSERTs erlaubt | Siehe `191-HUMAN-UAT.md` (von Plan 191-10 zu erstellen); Checkliste bereits in Plan 191-10 Task 2's `<how-to-verify>` festgehalten |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-10-23

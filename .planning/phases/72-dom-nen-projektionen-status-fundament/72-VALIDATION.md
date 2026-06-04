---
phase: 72
slug: dom-nen-projektionen-status-fundament
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-04
---

# Phase 72 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | Go `testing` + testify (`github.com/stretchr/testify`); Repo-Tests unter `backend/internal/repository/*_test.go` |
| **Framework (Frontend)** | Vitest 3 (`^3.2.4`) |
| **Config file** | Backend: keine (Go-Toolchain). Frontend: `frontend/vitest.config.ts` |
| **Quick run command (Go)** | `cd backend && go test ./internal/repository/... -run <TestName>` |
| **Quick run command (FE)** | `cd frontend && npx vitest run <pattern>` |
| **Typecheck (FE)** | `cd frontend && npm run typecheck` |
| **Full suite command (Go)** | `cd backend && go test ./...` |
| **Full suite command (FE)** | `cd frontend && npm test` (= `vitest run`) |
| **Migrate-Roundtrip (Plan 01 only)** | `cd backend && go run ./cmd/migrate up && go run ./cmd/migrate down 1 && go run ./cmd/migrate up` (gegen docker-compose PostgreSQL 16) |
| **Estimated runtime (quick)** | ~5–15 Sekunden je gezieltem `-run`/Vitest-Pattern |

**Test-Ansatz (Blocker-2-Entscheidung):** Die load-bearing Invarianten werden ausschließlich
über das **no-DB Source-Fragment-Pattern** aus `backend/internal/repository/runtime_authority_test.go`
geprüft (`readBackendSource`/`readRepositorySource` + `strings.Contains`). Es gibt KEINE
`t.Skip`-Escape-Hatches und KEINEN neuen Test-DB-Pool. `test_helpers.go` (hard-skip Placeholder)
wird NICHT als Seam für Phase-72-Tests genutzt. Der einzige DB-berührende Schritt ist der
manuelle/Verify-Migrate-Roundtrip in Plan 01 (kein Go-Test-Skip beteiligt).

---

## Sampling Rate

- **After every task commit:** Run quick command der betroffenen Projektion
  (`go test ./internal/repository/... -run <TestName>`) bzw. `npx vitest run v12-projection-contract` + `npm run typecheck`.
- **After every plan wave:** `cd backend && go test ./...` und (ab Wave 3) `cd frontend && npm test`.
- **Before `/gsd:verify-work`:** Beide Full-Suites grün + Migrate-Roundtrip (up→down→up) sauber.
- **Max feedback latency:** ~15 Sekunden (Source-Fragment-Tests laufen ohne DB-Bootstrap).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 72-01-01 | 01 | 1 | Schema (J/G, 0096) | T-72-01-01 | Content-/Technik-Status unangetastet; nur additive Felder | unit (Go, no-DB source-fragment) | `cd backend && go test ./internal/repository/... -run TestV12StatusFoundation` | ❌ W0 (erstellt von 72-01-01) | ⬜ pending |
| 72-01-02 | 01 | 1 | J / G / D-01 / D-03 (Schema) | T-72-01-02 | dispute_state nicht in UNIQUE; up→down→up sauber | unit + integration (Migrate-Roundtrip) | `cd backend && go run ./cmd/migrate up && go run ./cmd/migrate down 1 && go run ./cmd/migrate up && go test ./internal/repository/... -run TestV12StatusFoundation` | ✅ (SQL erstellt von 72-01-02; Test aus 72-01-01) | ⬜ pending |
| 72-02-01 | 02 | 2 | A/Sep, D-01, H | T-72-02-03 | drei getrennte FROM-Mengen; keine UNION; dispute_state ≠ Content-status; claimed derived | unit (Go, no-DB source-fragment) | `cd backend && go test ./internal/repository/... -run TestProjection` | ❌ W0 (erstellt von 72-02-01) | ⬜ pending |
| 72-02-02 | 02 | 2 | A, H, D-03 | T-72-02-01 / T-72-02-02 | $N-Parameter; WHERE-Visibility-Gate; no-envelope; GET-only | unit (Go, no-DB source-fragment) + build | `cd backend && go build ./... && go test ./internal/repository/... -run TestProjection` | ✅ (Repo/Handler erstellt von 72-02-02; Test aus 72-02-01) | ⬜ pending |
| 72-03-01 | 03 | 2 | G, I, D-03 | T-72-03-01 / T-72-03-04 | fünf Ownership-Achsen; parametrisierter owner-scope-WHERE (IDOR); media_assets.status ≠ Review | unit (Go, no-DB source-fragment) | `cd backend && go test ./internal/repository/... -run TestMediaProjection` | ❌ W0 (erstellt von 72-03-01) | ⬜ pending |
| 72-03-02 | 03 | 2 | G, I, D-03 | T-72-03-01 / T-72-03-03 | owner_member_id = $N; FK-Lookup-Joins; no-envelope; GET-only | unit (Go, no-DB source-fragment) + build | `cd backend && go build ./... && go test ./internal/repository/... -run TestMediaProjection` | ✅ (Repo/Handler erstellt von 72-03-02; Test aus 72-03-01) | ⬜ pending |
| 72-04-01 | 04 | 3 | K | T-72-04-01 | jedes DTO-Feld dokumentiert; gepinnte Pfade; kein {"data"}-Envelope | contract (YAML lint/parse) | `cd frontend && npx --yes @redocly/cli@latest lint ../shared/contracts/openapi.yaml \|\| node -e "require('js-yaml').load(require('fs').readFileSync('../shared/contracts/openapi.yaml','utf8'))"` | ✅ (openapi.yaml vorhanden, append) | ⬜ pending |
| 72-04-02 | 04 | 3 | K, A | T-72-04-02 / T-72-04-03 | 1:1 snake_case Spiegel; Enum-Parität; api.ts-Seam (kein ad-hoc-Fetch) | type/contract (Vitest) + typecheck | `cd frontend && npx vitest run v12-projection-contract && npm run typecheck` | ❌ W0 (Test + Typen erstellt von 72-04-02) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Requirement-Coverage:** A (72-02, 72-04), G (72-01, 72-03), H (72-02), I (72-03), J (72-01), K (72-04).
D-Entscheidungen: D-01 (72-01/72-02), D-03 (72-01/72-02/72-03), D-05 GET-only-Grenze (alle Plans), D-06 memorial Lesewert (72-01/72-02).

---

## Wave 0 Requirements

Das bestehende Source-Fragment-Pattern (`runtime_authority_test.go` → `readBackendSource`/`readRepositorySource`)
deckt alle load-bearing Phase-72-Invarianten OHNE neuen Test-Seam ab. KEIN Test-DB-Pool-Helper nötig;
`test_helpers.go` bleibt unangetastet.

Die Wave-0-Testdateien (RED vor Implementierung), die innerhalb der Plans erzeugt werden:
- [ ] `backend/internal/repository/v12_status_foundation_migration_test.go` (72-01-01) — up-Statements, down-Mirror, Negativ-Invarianten gegen 0096 SQL-Text; zusätzlich kleiner Migrations-Pfad-Helper (löst `database/migrations/` relativ zur Testdatei via `runtime.Caller`).
- [ ] `backend/internal/repository/domain_projection_repository_test.go` (72-02-01) — drei getrennte FROM-Mengen, kein UNION, dispute_state≠status, claimed-derived, FK-Lookup-Joins.
- [ ] `backend/internal/repository/media_ownership_projection_repository_test.go` (72-03-01) — fünf Ownership-Achsen, FK-Lookup-Joins, owner_member_id-Quelle, parametrisierter owner-scope-WHERE (IDOR).
- [ ] `frontend/src/types/__tests__/v12-projection-contract.test.ts` (72-04-02) — Enum-Parität + Feldsatz gegen OpenAPI; bestehende `frontend/src/types/*.ts` + Vitest-Config vorhanden, keine Installation nötig.

*Kein Framework-Install: Go-Toolchain, PostgreSQL 16 (docker-compose) und Vitest 3 sind verfügbar (RESEARCH §Environment Availability).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| down.sql spiegelt up.sql 1:1 (Diff-Sichtprüfung) | Schema (72-01) | Source-Fragment deckt Vorhandensein, nicht visuelle Symmetrie; Roundtrip-Verify deckt Funktion | `git diff` / Side-by-Side von up.sql vs down.sql; jede ADD hat genau ein DROP |

*Alle übrigen Phase-Behaviors haben automatisierte Verifikation (Source-Fragment + Migrate-Roundtrip + Vitest/typecheck).*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (jeder Task hat ein automated command)
- [x] Wave 0 covers all MISSING references (alle vier Wave-0-Testdateien gelistet; kein t.Skip)
- [x] No watch-mode flags (`vitest run`, nicht watch; `go test` einmalig)
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-06-04
</content>

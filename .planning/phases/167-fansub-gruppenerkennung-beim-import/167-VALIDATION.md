---
phase: 167
slug: fansub-gruppenerkennung-beim-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-23
---

# Phase 167 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go native `testing` + `github.com/stretchr/testify` (backend); Vitest 3 (frontend, config `frontend/vitest.config.ts`) |
| **Config file** | none for backend (`go test ./...`) — `frontend/vitest.config.ts` for frontend |
| **Quick run command** | `cd backend && go test ./internal/importutil/... -run TestDeriveFansubGroupName -v` |
| **Full suite command** | `cd backend && go test ./...` and `cd frontend && npm test` |
| **Estimated runtime** | ~30-60s backend unit, +integration suite when `TEAM4S_PHASE167_TEST_DSN` is set |

---

## Sampling Rate

- **After every task commit:** `go test ./internal/importutil/... ./internal/repository/... ./internal/handlers/... -run <relevant>` plus targeted `npx vitest run <changed files>`
- **After every plan wave:** full `go test ./...` (backend) + `npm test` (frontend) + integration suite if `TEAM4S_PHASE167_TEST_DSN` is exported
- **Before `/gsd:verify-work`:** Full suite green (including the real-DB integration tests — D-10 explicitly requires these not be skipped)
- **Max feedback latency:** ~60s (unit); integration suite run once per wave, not per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | REQ-167-01..06, 18 | — | Parser returns correct group/version for all 13 real filenames incl. both failure cases; denylist applies uniformly | unit (table-driven) | `go test ./internal/importutil/... -run TestDeriveFansubGroupName -v` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-167-07..09 | T-167-SQLi | Batch match resolves name/slug/alias in one query, parameterized (no string concat) | unit + integration | `go test ./internal/repository/... -run TestResolveFansubGroupMatches -v` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-167-10..12 | — | No `INSERT INTO fansub_groups` fires from filename fallback; trigram suggestion only | unit + integration | `go test ./internal/repository/... -run TestApplyDoesNotAutoCreateGroup -v` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-167-13..15 | T-167-IDOR | Alias auto-learned on manual assign; conflict hint, no silent reassignment | unit (httptest+fake) + integration | `go test ./internal/handlers/... -run TestLearnFansubAlias -v` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-167-16..17 | T-167-IDOR | Alias CRUD + reassign visible in group admin UI, audited via existing `auditLogRepo.Write` shape | unit + frontend component test | `go test ./internal/handlers/... -run TestFansubAlias -v`; `npx vitest run <alias tab test>` | ⚠️ partial | ⬜ pending |
| TBD | TBD | TBD | REQ-167-19 | — | Real-DB alias uniqueness + write-path proof (`UNIQUE(normalized_alias)`) | integration | `TEAM4S_PHASE167_TEST_DSN=... go test ./internal/repository/... -run Phase167Alias -v` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-167-20 | — | Constant query count for N-file preview (query_counter) | integration | `TEAM4S_PHASE167_TEST_DSN=... go test ./internal/repository/... -run Phase167QueryBudget -v` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REQ-167-21 | — | Double-episode filenames documented, no assignment regression | unit (verify existing coverage) | `go test ./internal/repository/... -run TestEpisodeImportAutoassign -v` | ⚠️ verify | ⬜ pending |
| TBD | TBD | TBD | REQ-167-22 | — | UI primitives, umlauts, file-size budget (no growth on already-oversized files) | manual | `wc -l backend/internal/handlers/admin_episode_import.go frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` | ❌ no automated gate | ⬜ pending |
| TBD | TBD | TBD | REQ-167-23 | — | Handler tests use httptest+fake, not source-inspection | unit | covered by REQ-167-13..17 test files | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/importutil/fansub_group_test.go` — new file, table-driven, covers REQ-167-01..06 and REQ-167-18 (version detection may live in same file/package or sibling `fansub_release_version.go`+`_test.go`)
- [ ] `backend/internal/testsupport/phase167_postgres.go` — new file, `OpenPhase167Postgres`, gated by `TEAM4S_PHASE167_TEST_DSN`, covers REQ-167-19/20 prerequisite
- [ ] `backend/internal/repository/phase167_fansub_match_test.go` (or similar) — covers REQ-167-07..12, 19, 20
- [ ] `backend/internal/handlers/phase167_fansub_learn_test.go` (or similar, httptest+fake per `fansub_project_resolver_handler_test.go` precedent) — covers REQ-167-13..17, 23
- [ ] Verify existing coverage for REQ-167-16 (re-grep `fansub_group_aliases_test.go`/`fansub_aliases_test.go`) and REQ-167-21 (`episode_import_repository_autoassign_test.go` double-episode coverage) before assuming Wave 0 gaps

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Production file size budget (≤450 lines, no growth on already-oversized files) | REQ-167-22 | No automated line-count gate exists in this repo today | `wc -l backend/internal/handlers/admin_episode_import.go frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` before and after the phase; new files must stay ≤450 lines, the two named files must not grow |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s (unit tier)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

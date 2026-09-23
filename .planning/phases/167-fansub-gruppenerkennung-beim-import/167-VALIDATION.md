---
phase: 167
slug: fansub-gruppenerkennung-beim-import
status: planned
nyquist_compliant: true
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
| 167-01-T1 | 01 | 1 | REQ-167-01..06 | T-167-ReDoS (Plan 01) | Parser returns correct group for all 13 real filenames incl. both failure-case corrections; denylist applies to every candidate bracket, not just the fallback branch | unit (table-driven) | `cd backend && go test ./internal/importutil/... -run TestDeriveFansubGroupName -v` | ❌ W0 | ⬜ pending |
| 167-01-T2 | 01 | 1 | REQ-167-18 | — | `v2`/`v3`/`v4` detected incl. glued-to-bracket case (`[C281B950]v4`), pre-fills release version | unit (table-driven) | `cd backend && go test ./internal/importutil/... -run TestDeriveReleaseVersion -v` | ❌ W0 | ⬜ pending |
| 167-02-T1 | 02 | 1 | REQ-167-19 (prereq) | — | New isolated Postgres fixture compiles, fail-closed DB/schema-name guard present | build | `cd backend && go build ./internal/testsupport/...` | ❌ W0 | ⬜ pending |
| 167-02-T2 | 02 | 1 | REQ-167-07, REQ-167-11 | T-167-SQLi (Plan 02) | Batch match query built with parameterized `= ANY($1::text[])`, normalization expression copied byte-for-byte from `0140_search_foundation` | unit (SQL builder) | `cd backend && go test ./internal/repository/... -run TestBuildFansubGroupBatchMatchQuery -v` | ❌ W0 | ⬜ pending |
| 167-02-T3 | 02 | 1 | REQ-167-07, REQ-167-08, REQ-167-19, REQ-167-20 | T-167-SQLi (Plan 02) | Real-DB exact-match tiers (alias/name/slug) resolve correctly; constant query count via `query_counter.go` regardless of file count | integration | `TEAM4S_PHASE167_TEST_DSN=... go test ./internal/repository/... -run TestResolveFansubGroupMatches -v` | ❌ W0 | ⬜ pending |
| 167-03-T1 | 03 | 1 | REQ-167-14 | — | `ReassignAlias` repository method compiles, atomic single UPDATE | build | `cd backend && go build ./internal/repository/...` | ❌ W0 | ⬜ pending |
| 167-03-T2 | 03 | 1 | REQ-167-15, REQ-167-16 | T-167-IDOR (Plan 03) | Reassign handler checks `CanForFansubGroup` against BOTH source and destination group before moving an alias | build | `cd backend && go build ./...` | ❌ W0 | ⬜ pending |
| 167-03-T3 | 03 | 1 | REQ-167-17, REQ-167-23 | T-167-IDOR (Plan 03) | httptest+fake (not source-inspection) proves reassign audit-logs `fansub_group_alias.reassigned` and rejects cross-group actor without dest permission | unit (httptest+fake) | `cd backend && go test ./internal/handlers/... -run TestReassignFansubAlias -v` | ❌ W0 | ⬜ pending |
| 167-04-T1 | 04 | 1 | REQ-167-08, REQ-167-09, REQ-167-11, REQ-167-12, REQ-167-18 | — | Additive display-only contract fields (origin, suggestions, version-source) added to TS type + `admin-content.yaml`, no server round-trip | build (typecheck) | `cd frontend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 167-04-T2 | 04 | 1 | REQ-167-15, REQ-167-16 | — | `reassignFansubAlias` API client calls `PATCH .../aliases/:aliasId/reassign`, follows existing `ApiError`/`authorizedFetch` idiom | build (typecheck) | `cd frontend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 167-05-T1 | 05 | 2 | REQ-167-08 (prereq) | — | Additive Go model fields compile | build | `cd backend && go build ./internal/models/...` | ❌ W0 | ⬜ pending |
| 167-05-T2 | 05 | 2 | REQ-167-07, REQ-167-08, REQ-167-09, REQ-167-18, REQ-167-22 | — | `enrichEpisodeImportPreviewFansubData` wired into preview without growing `admin_episode_import.go` (new file only) | build | `cd backend && go build ./...` | ❌ W0 | ⬜ pending |
| 167-05-T3 | 05 | 2 | REQ-167-07, REQ-167-08, REQ-167-11, REQ-167-12 | — | Preview enrichment resolves origin/suggestions/version correctly per fixture case | unit | `cd backend && go test ./internal/handlers/... -run TestEnrichEpisodeImportPreviewFansubData -v` | ❌ W0 | ⬜ pending |
| 167-06-T1 | 06 | 3 | REQ-167-10, REQ-167-13 | — | Filename auto-create fallback removed from `resolveImportFansubSelection`; `maybeLearnFansubGroupAlias` added | build | `cd backend && go build ./internal/repository/...` | ❌ W0 | ⬜ pending |
| 167-06-T2 | 06 | 3 | REQ-167-17 | — | Learned-alias accumulator threaded to apply result; audit logged in handler | build | `cd backend && go build ./...` | ❌ W0 | ⬜ pending |
| 167-06-T3 | 06 | 3 | REQ-167-10, REQ-167-13, REQ-167-14, REQ-167-15, REQ-167-19, REQ-167-20, REQ-167-21 | — | Real-DB proof: no `INSERT INTO fansub_groups` fires from fallback; alias learned exactly once; conflicting alias not silently reassigned; double-episode filenames documented | integration | `TEAM4S_PHASE167_TEST_DSN=... go test ./internal/repository/... -run "TestApplyDoesNotAutoCreateFansubGroup\|TestApplyLearnsNewAliasForExplicitGroup\|TestApplyDoesNotReassignConflictingAlias" -v` | ❌ W0 | ⬜ pending |
| 167-07-T1 | 07 | 2 | REQ-167-08, REQ-167-09, REQ-167-11, REQ-167-12, REQ-167-15, REQ-167-22 | T-167-DoS (batch size, covered at Plan 02/05 boundary) | `FansubGroupOriginHint` renders origin/suggestion/conflict states with `@/components/ui` primitives, German umlauts | frontend unit | `cd frontend && npx vitest run src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx` | ❌ W0 | ⬜ pending |
| 167-07-T2 | 07 | 2 | REQ-167-08, REQ-167-09, REQ-167-18 | — | Wired into `EpisodeImportMappingRow`; release-version-manual override tracked without regressing existing native controls | build (typecheck) | `cd frontend && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 167-08-T1 | 08 | 2 | REQ-167-16 | — | `FansubAliasSection` component: list/add/delete/reassign, all via `@/components/ui` primitives with confirm dialogs on destructive actions | frontend unit | `cd frontend && npx vitest run src/app/admin/fansubs/[id]/edit/FansubAliasSection.test.tsx` | ❌ W0 | ⬜ pending |
| 167-08-T2 | 08 | 2 | REQ-167-16, REQ-167-17, REQ-167-22 | — | Wired into `FansubDetailsTab`; new audit event types (`.learned`/`.reassigned`) get human-readable German translations in change history | frontend unit | `cd frontend && npx vitest run src/app/admin/changes/ChangeEntryTranslator.test.ts` | ❌ W0 | ⬜ pending |
| — | — | — | REQ-167-23 | — | Handler tests use httptest+fake, not source-inspection (cross-cutting rule, not a separate task) | unit | covered by 167-03-T3 and 167-05-T3 | — | ⬜ pending |

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

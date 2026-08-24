---
phase: 139
slug: scalable-user-admin-projections
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-24
---

# Phase 139 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Go `testing` + `testify` (real-Postgres tier gated by phase-specific DSN env var, SKIP if unset) · Frontend: Vitest 3 |
| **Config file** | Backend: none (stdlib `go test`) · Frontend: `frontend/vitest.config.ts` |
| **Quick run command (backend, scoped)** | `docker exec team4sv30-backend sh -c "cd /app && go test ./internal/repository/... ./internal/handlers/... -run AdminUsers"` |
| **Quick run command (frontend, scoped)** | `docker exec team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users"` |
| **Full suite command (backend)** | `docker exec team4sv30-backend sh -c "cd /app && go test ./..."` |
| **Full suite command (backend, real-Postgres tier)** | `docker exec team4sv30-backend sh -c "cd /app && TEAM4S_PHASE139_TEST_DSN=<disposable dsn> go test ./internal/repository/... ./internal/testsupport/..."` |
| **Full suite command (frontend)** | `docker exec team4sv30-frontend sh -c "cd /app && npx vitest run"` |
| **Estimated runtime** | ~60-90s scoped, ~5-8min full suite (both stacks) |

---

## Sampling Rate

- **After every task commit:** Run scoped backend (`-run AdminUsers`) + scoped frontend (`src/app/admin/users`)
- **After every plan wave:** Run full backend suite (SKIP-tier included) + full frontend suite, PLUS the real-Postgres tier with a disposable `TEAM4S_PHASE139_TEST_DSN` (executor creates/drops it manually per the documented Phase 137/138 convention)
- **Before `/gsd:verify-work`:** Full suite must be green, accounting for the corrected pre-existing baseline below
- **Max feedback latency:** ~90 seconds (scoped run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 139-03 Task 2 | 139-03 | Wave 2 | UADM-02 | V4/V5 | Contributions grouped by anime+project, standard shown once | integration (real Postgres) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run TestListUserContributionsGroupsByAnimeAndProject` | ✅ `admin_users_contributions_query_test.go` | ✅ green |
| 139-03 Task 2 (+139-06 Task 3 live seed) | 139-03 (automated) / 139-06 (live F-03 seed) | Wave 2 / Wave 5 | UADM-03 | V4/V5 | Only semantic deviations flagged as override (F-03 seeded fixtures) | integration (real Postgres) + live seed data | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run 'TestListUserContributionsOverrideDetectionIndependentButIdentical|TestListUserContributionsOverrideDetectionIndependentAndDifferent'` (automated); live: `scripts/seed-phase139-contribution-fixtures.mjs` produced 2 real `release_crew_snapshots` rows in `team4s_v2` (release_version_id 1 identical, 2 differing) for Task 2's manual walkthrough | ✅ `admin_users_contributions_query_test.go` + `scripts/seed-phase139-contribution-fixtures.mjs` | ✅ green |
| 139-03 Task 2 | 139-03 | Wave 2 | UADM-04 | — | Identical version assignments collapse into ranges | integration (real Postgres) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run 'TestListUserContributionsRangeCollapse|TestListUserContributionsRangeBreaksOnDeviation'` | ✅ `admin_users_contributions_query_test.go` | ✅ green |
| 139-04 Task 1 (+139-09 Task 2) | 139-04 (backend) / 139-09 (frontend) | Wave 3 / Wave 6 | UADM-05 | V4 | Media grouped by anime/project/release, links to canonical workspace | integration + frontend component | backend: `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run TestGetUserMediaGroupsByReleaseOrEpisode`; frontend: `npx vitest run src/app/admin/users/tabs/UserMediaTab` | ✅ `admin_users_media_query_test.go` + `UserMediaTab.test.tsx` | ✅ green |
| 139-05 Task 2 / 139-06 Task 1-2 / 139-07 Task 2-3 | 139-05 / 139-06 / 139-07 | Wave 4 / Wave 5 / Wave 5 | UADM-06 | V4/V5 | Filterable/paginable at scale, consistent counts, no eager rights fan-out (Overview + Rights tabs) | integration (real Postgres, high-volume fixture) + frontend component | backend: `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run 'TestPhase139ContributionsQueryBudgetIsConstant|TestPhase139MediaQueryBudgetIsConstant|TestPhase139RightsSummaryQueryBudgetIsConstant|TestPhase139ContributionsPaginationDriftAtScale|TestPhase139MediaPaginationDriftAtScale|TestGetUserRightsSummaryBatchesAcrossGroups'`; frontend: `npx vitest run src/app/admin/users/tabs/UserOverviewTab src/app/admin/users/tabs/UserGroupRightsTab` (exactly-once/never-called + lazy single-group fetch assertions) | ✅ `admin_users_query_budget_test.go`, `admin_users_rights_summary_query_test.go`, `UserOverviewTab.test.tsx`, `UserGroupRightsTab.test.tsx` | ✅ green |
| 139-07 Task 2 / 139-08 Task 1 / 139-09 Task 1 | 139-07 / 139-08 / 139-09 | Wave 5 / Wave 6 / Wave 6 | UADM-07 | — | Tabs state informational vs. actionable | frontend component (text assertion) | `npx vitest run src/app/admin/users/tabs` (SectionHeader "Informativ"/"Aktionsfähig" banner assertions in UserContributionsTab.test.tsx/UserMediaTab.test.tsx/UserGroupRightsTab.test.tsx) | ✅ all three tab test files | ✅ green |
| 139-08 Task 2 / 139-09 Task 2 (automated) + 139-10 Task 2 (manual) | 139-08 / 139-09 / 139-10 | Wave 6 / Wave 7 | UADM-08 | — | Container-query responsive, keyboard-safe, no overflow | frontend component (partial, matchMedia/jsdom cannot assert real CSS) + manual/UAT | `npx vitest run` (partial) + live browser walkthrough at `http://127.0.0.1:3300` (139-10 Task 2, container-query resize + keyboard-tab checks) | ✅ `contributionsTab.module.css`, `mediaTab.module.css` | ⚠️ Partial — automated portion green; manual portion is 139-10 Task 2 (human checkpoint, pending) |
| 139-06 Task 1-2 | 139-06 | Wave 5 | QUAL-06 | V4/V5 | Query-count gate, no N+1, pagination-drift protection | integration (real Postgres, `queryCounter`) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run 'TestPhase139ContributionsQueryBudgetIsConstant|TestPhase139MediaQueryBudgetIsConstant|TestPhase139RightsSummaryQueryBudgetIsConstant|TestPhase139ContributionsPaginationDriftAtScale|TestPhase139MediaPaginationDriftAtScale'` | ✅ `admin_users_query_budget_test.go` | ✅ green |

*Verified live 2026-08-24 (139-10 Task 1): every automated command above was re-run in full against the real Docker stack (`team4sv30-backend`/`team4sv30-frontend`) and against the disposable `TEAM4S_PHASE139_TEST_DSN=team4s_phase139_test_r03` fixture. All Phase-139-owned tests pass GREEN; UADM-08's real CSS container-query overflow behavior remains the sole item requiring 139-10 Task 2's live human checkpoint (jsdom cannot assert real viewport/overflow behavior — matches this codebase's established `useIsMobile()` test convention).*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/internal/testsupport/phase139_postgres.go` — new disposable-DB harness (mirrors `phase137_postgres.go`), covers `anime_contributions`/`anime_contribution_roles`/`release_crew_snapshots`/`release_versions`/`fansub_releases`/`episodes`/`release_version_groups`/`release_version_media`/`media_assets`/`media_files` (139-01, uses the full real 151-pair migration chain instead of hand-assembled tables)
- [x] `backend/internal/repository/admin_users_contributions_query_test.go` — covers UADM-02/03/04, including the F-03 `independent`-identical vs. `independent`-different fixture pair (139-03, 9 integration tests, all green)
- [x] `backend/internal/repository/admin_users_media_query_test.go` — covers UADM-05 (139-04, 7 integration tests, all green)
- [x] `backend/internal/repository/admin_users_query_budget_test.go` — covers QUAL-06 (constant-query-budget gate, few-vs-many fixture, mirrors `member_profile_query_budget_test.go`) (139-06, 3 query-budget + 2 pagination-drift tests, all green)
- [x] Frontend: `UserContributionsTab.test.tsx` full rewrite (139-08, 9/9 green, closes the pre-existing Phase-136 fixture bug rather than reproducing it)
- [x] Frontend: `UserMediaTab.test.tsx` (139-09, net-new, 12/12 green — confirmed no prior file existed)
- [x] Frontend: new test coverage for the F-01 Overview-tab batched-summary fetch replacing the fan-out (139-07, `UserOverviewTab.test.tsx` exactly-once/never-called regression test)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Status |
|----------|-------------|------------|-------------------|--------|
| Container-query graceful degradation / no horizontal overflow at narrow widths | UADM-08 | jsdom cannot assert real CSS container-query/overflow behavior; codebase convention mocks `matchMedia`, not real viewport | Resize browser at `http://127.0.0.1:3300` to narrow admin user detail tabs, confirm no page-level horizontal scroll and filters/pagination remain keyboard-operable | ⬜ pending — 139-10 Task 2 (human checkpoint) |
| Live override-detection UAT (F-03) | UADM-03 | `release_crew_snapshots` had 13 live rows, all `inherited`, zero `independent` before this phase — no real deviation existed to click through | 139-06 built and ran `scripts/seed-phase139-contribution-fixtures.mjs`, an idempotent, API-driven seed script producing exactly one `independent`-but-identical row (release_version_id=1) and one real `independent`-and-different row (release_version_id=2) in the live `team4s_v2` database via the real `PUT /admin/release-versions/:versionId/contributions/effective` endpoint. Confirmed via direct `psql` query. 139-10 Task 2's live walkthrough uses this exact seeded pair. | ✅ done (139-06) — live UI confirmation via 139-10 Task 2 (human checkpoint) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** Task 1 (automated full-regression triage) complete 2026-08-24, zero Phase-139 regressions found against the 139-RESEARCH.md baseline (backend 65 FAIL lines unchanged across 3 packages; frontend 15 failed files/43 failed tests unchanged from the post-139-08/139-09 state; `internal/permissions`/`internal/services` fully green; all 25 Phase-139-owned backend integration tests + 83 admin/users frontend tests green). D01/D27 scope-boundary check clean (58 touched files across 139-01..139-09, none outside Phase 139's stated scope). UADM-08's live container-query/keyboard checkpoint (139-10 Task 2) remains pending human sign-off.

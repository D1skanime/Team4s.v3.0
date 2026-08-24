---
phase: 139
slug: scalable-user-admin-projections
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD | TBD | TBD | UADM-02 | V4/V5 | Contributions grouped by anime+project, standard shown once | integration (real Postgres) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run TestListUserContributionsGrouped` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | UADM-03 | V4/V5 | Only semantic deviations flagged as override (F-03 seeded fixtures) | integration (real Postgres) | `-run TestListUserContributionsOverrideDetection` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | UADM-04 | — | Identical version assignments collapse into ranges | unit/integration | `-run TestContributionRangeCollapse` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | UADM-05 | V4 | Media grouped by anime/project/release, links to canonical workspace | integration + frontend component | backend `-run TestGetUserMediaGrouped`; frontend `npx vitest run src/app/admin/users/tabs/UserMediaTab` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | UADM-06 | V4/V5 | Filterable/paginable at scale, consistent counts, no eager rights fan-out (Overview + Rights tabs) | integration (high-volume fixture) | `-run TestListUserContributionsPaginationDrift` / `TestListUserContributionsQueryBudget` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | UADM-07 | — | Tabs state informational vs. actionable | frontend component (text assertion) | `npx vitest run src/app/admin/users/tabs` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | UADM-08 | — | Container-query responsive, keyboard-safe, no overflow | frontend component (partial) + manual/UAT | `npx vitest run` (partial, matchMedia-mocked convention) | ⚠️ Partial — manual verification required | ⬜ pending |
| TBD | TBD | TBD | QUAL-06 | V4/V5 | Query-count gate, no N+1, pagination-drift protection | integration (real Postgres, `queryCounter`) | `TEAM4S_PHASE139_TEST_DSN=... go test ./internal/repository/... -run TestPhase139.*QueryBudget` | ❌ Wave 0 | ⬜ pending |

*Task IDs/Plan/Wave columns are TBD until the planner assigns concrete plan/task numbers — this table's rows are the mandatory requirement→test bindings the planner must fill in.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/testsupport/phase139_postgres.go` — new disposable-DB harness (mirrors `phase137_postgres.go`), covers `anime_contributions`/`anime_contribution_roles`/`release_crew_snapshots`/`release_versions`/`fansub_releases`/`episodes`/`release_version_groups`/`release_version_media`/`media_assets`/`media_files`
- [ ] `backend/internal/repository/admin_users_contributions_query_test.go` (or similar) — covers UADM-02/03/04, including the F-03 `independent`-identical vs. `independent`-different fixture pair
- [ ] `backend/internal/repository/admin_users_media_query_test.go` — covers UADM-05
- [ ] `backend/internal/repository/admin_users_query_budget_test.go` — covers QUAL-06 (constant-query-budget gate, few-vs-many fixture, mirrors `member_profile_query_budget_test.go`)
- [ ] Frontend: `UserContributionsTab.test.tsx` full rewrite (already red on unrelated Phase-136 grounds — must cleanly separate pre-existing failure from new assertions)
- [ ] Frontend: `UserMediaTab.test.tsx` (does not exist today — confirm net-new vs. rewrite before planning)
- [ ] Frontend: new test coverage for the F-01 Overview-tab batched-summary fetch replacing the fan-out

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Container-query graceful degradation / no horizontal overflow at narrow widths | UADM-08 | jsdom cannot assert real CSS container-query/overflow behavior; codebase convention mocks `matchMedia`, not real viewport | Resize browser at `http://127.0.0.1:3300` to narrow admin user detail tabs, confirm no page-level horizontal scroll and filters/pagination remain keyboard-operable |
| Live override-detection UAT (F-03) | UADM-03 | `release_crew_snapshots` has 13 live rows, all `inherited`, zero `independent` — no real deviation exists to click through today | Either run the seed-script extension (mirrors `scripts/seed-member-profile-fixtures.mjs`) to create a demo project with a real `independent`-and-different row via `PUT /admin/release-versions/:versionId/contributions/effective`, then verify "Nur Abweichungen" shows it — or, if the planner decides this stays automated-only, explicitly record that decision here instead of leaving it silent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

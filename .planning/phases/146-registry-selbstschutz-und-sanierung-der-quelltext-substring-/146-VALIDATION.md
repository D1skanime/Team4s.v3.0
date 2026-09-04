---
phase: 146
slug: registry-selbstschutz-und-sanierung-der-quelltext-substring-
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-04
updated: 2026-09-04
---

# Phase 146 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Requirements are TBD for
> this phase (Nacharbeit, kein v1.4-Mapping) — Success Criteria 1-8 from `.planning/ROADMAP.md`
> (lines 889-898) stand in for REQ-IDs below, per `146-CONTEXT.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | Go stdlib `testing` + `stretchr/testify` (assert/require) |
| **Framework (frontend)** | Vitest 3 + `@testing-library/react` |
| **Config file (backend)** | none (stdlib `go test`, no config file) |
| **Config file (frontend)** | `frontend/vitest.config.ts` |
| **Quick run command (backend, no DB)** | `cd backend && go test ./internal/handlers/... ./internal/permissions/... -run Capability` |
| **Quick run command (frontend)** | `cd frontend && npm run test -- RoleCapabilityDetail` |
| **Full suite command (backend)** | `cd backend && go test ./...` (Postgres-backed tests self-skip without `TEAM4S_PHASE*_TEST_DSN`) |
| **Full suite command (frontend)** | `cd frontend && npm run test` |
| **Estimated runtime** | ~60-120s backend (with DSN set), ~30-60s frontend |

---

## Sampling Rate

- **After every task commit:** Run the relevant quick-run command above for whichever criterion the task closes.
- **After every plan wave:** Full backend + frontend suite (`go test ./...` with `TEAM4S_PHASE145_TEST_DSN` set locally; `npm run test`).
- **Before `/gsd:verify-work`:** Full suite green (both languages), plus a manual confirmation that `TEAM4S_PHASE145_TEST_DSN`-gated tests were actually executed (not silently skipped) at least once during the phase — there is no CI in this repo to catch a permanently-skipped test.
- **Max feedback latency:** ~120 seconds (full backend suite with DB).

---

## Per-Task Verification Map

| Plan-Task ID | Wave | Criterion | Threat Ref | Secure/Correct Behavior | Test Type | Automated Command | Status |
|---------|------|-----------|------------|--------------------------|-----------|-------------------|--------|
| 146-01-T1/T2/T3 | 1 (Block 1) | Criterion 3, 4 | T-146-01, T-146-02 | ListGroupHistoryRoleDefinitions excludes group_member; MembershipBaselineActionCodes is the single Go source, anti-drift-tested | unit + integration (real Postgres) | `TEAM4S_PHASE145_TEST_DSN=... go test ./internal/repository/... -run "TestReservedPseudoRole\|TestMembershipBaselineMigrationSeeds"` | ⬜ pending |
| 146-02-T1/T2 | 1 (Block 1) | Criterion 2 | T-146-03, T-146-04 | Reserved role shows exactly 3 badged/protected rows across all 8 categories | unit (RTL, real 38-action fixture) | `npm run test -- RoleCapabilityDetail` | ⬜ pending |
| 146-03-T1/T2/T3 | 2 (Block 1) | Criterion 1 (+D-16) | T-146-05, T-146-06, T-146-07 | Revoking a baseline action is unconditionally rejected; granting a non-baseline action to group_member is rejected | unit (httptest + fake repo) | `go test ./internal/handlers/... -run MembershipBaseline` | ⬜ pending |
| 146-04-T1/T2/T3 | 3 (Block 2) | Criterion 5, 6, 7 | T-146-08, T-146-09 | D-08 filter rule locked; 3 files remediated to real calls | unit + integration | `go test ./internal/handlers/... ./internal/repository/... -run "RoleDefinitionsRouter\|RoleCatalogRepository\|RoleDefinitionsContext"` | ⬜ pending |
| 146-05-T1/T2 | 3 (Block 2) | Criterion 5, 6 | T-146-10 | Catalog-guard claims proven via real Postgres calls | integration (real Postgres) | `go test ./internal/repository/... -run "TestHistGroupMemberRoles\|TestResolvePendingRolesToActive"` | ⬜ pending |
| 146-06-T1/T2 | 3 (Block 2) | Criterion 5, 6 | T-146-11 | Canonical-slug claims proven via real Postgres calls | integration (real Postgres) | `go test ./internal/repository/... -run "TestArchiveUsesCanonicalStoredMemberSlug\|TestMemberPointTotalsRankingUsesCanonicalStoredSlug"` | ⬜ pending |
| 146-07-T1/T2 | 3 (Block 2) | Criterion 5, 6 | T-146-12, T-146-13 | Alias permission guard proven via httptest; redundant SQL-contract loop removed | unit + integration | `go test ./internal/handlers/... ./internal/repository/... -run "TestFansubAliasMutationsUseGroupEditPermission\|TestPointLedger"` | ⬜ pending |
| 146-08-T1/T2/T3 | 3 (Block 2) | Criterion 5, 6 | T-146-14 | Content-handler permission/rollback/call-sequencing claims proven via real httptest + fake repos | unit (httptest + fake repo) | `go test ./internal/handlers/... -run "TestAdminContentFansubNotes\|TestReleaseThemeAsset\|TestReplaceReleaseVersionMediaFile"` | ⬜ pending |
| 146-09-T1 | 3 (Block 2) | Criterion 5, 6 | T-146-15 | IDOR-resistance + graceful-empty-state proven via real handler/Postgres calls | unit + integration | `go test ./internal/handlers/... -run TestDashboardMeHandler` | ⬜ pending |
| 146-10-T1 | 3 (Block 2) | Criterion 5, 6 | T-146-16 | Vary/resolver/route-registration claims proven via real requests | unit (httptest) | `go test ./internal/handlers/... -run TestPhase128PublicMemberAccessMatrix` | ⬜ pending |
| 146-11-T1/T2/T3 | 3 (Block 2) | Criterion 5, 6 | T-146-17 | All 14 os.ReadFile call sites replaced with real Postgres/httptest proofs | unit + integration | `go test ./internal/repository/... -run TestReleaseVersionMedia` | ⬜ pending |
| 146-12-T1/T2/T3 | 3 (Block 2) | Criterion 5, 6 | T-146-18 | All 15 os.ReadFile call sites replaced with real httptest proofs | unit (httptest) | `go test ./internal/handlers/... -run TestReleaseVersionMedia` | ⬜ pending |
| 146-13-T1/T2/T3 | 4 (Block 2) | Criterion 6, 7, 8 | T-146-19, T-146-20 | ≤36/53 measured, ratchet guard catches new violations, remainder documented per file | unit (meta/self-test) | `go test ./internal/testquality/... -v` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/internal/handlers/admin_capability_handler_test.go` — new tests for both the Criterion 1 revoke guard and the D-16 grant guard (146-03-T3)
- [x] `backend/internal/repository/membership_baseline_registry_test.go` — extended for Criterion 3's 4th query and Criterion 4's anti-drift assertion (146-01-T3)
- [x] New Go file for Criterion 7's ratchet-guard test — `backend/internal/testquality/source_substring_guard_test.go` (146-13-T2), modeled on `frontend/eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` shape, enforced via `go test`
- [x] `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` — new fixture exercising the real 38-action shape across all 8 categories (146-02-T2)
- [x] Per-file Wave 0 gap for each locked security-relevant Block-2 file — sized individually across Plans 146-04 through 146-12, one task group per file/file-cluster

---

## Manual-Only Verifications

| Behavior | Criterion | Why Manual | Test Instructions |
|----------|-----------|------------|-------------------|
| `TEAM4S_PHASE145_TEST_DSN`-gated tests actually ran (not silently skipped) at least once during the phase | 3, 4 | No CI exists to catch a permanently-skipped test; SKIP-not-FAIL is the established project convention | Set `TEAM4S_PHASE145_TEST_DSN` locally, run `go test ./backend/internal/repository/... -v -run TestReservedPseudoRoleExcludedFromPickers` and `-run TestMembershipBaselineMigrationSeedsExactlyThreeActions`, confirm neither line prints `SKIP` |
| Ratchet guard actually catches a new violation | 7 | Requires a temporary, deliberately-reverted scratch-file injection during implementation (146-13-T2) — not a permanent automated check of the guard's own negative case | During 146-13-T2, temporarily add a fake presence-style `os.ReadFile` file outside the exception list, confirm `TestNoNewSourceSubstringTests` fails, then remove it before committing |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planning complete — 13 plans across 4 waves (Block 1: waves 1-2, Block 2: waves 3-4)

---
phase: 146
slug: registry-selbstschutz-und-sanierung-der-quelltext-substring-
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-04
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

| Task ID | Wave | Criterion | Threat Ref | Secure/Correct Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|-----------|------------|--------------------------|-----------|-------------------|-------------|--------|
| TBD-C1 | 1 (Block 1) | Criterion 1 | — (operational-safety, not access-control; see CONTEXT D-13) | Revoking a baseline action from `group_member` is rejected server-side via a real mutation-path call, unconditionally, regardless of `CountRolesWithAction`; existing lockout guard unchanged for all other roles | unit (httptest + fake repo) | `go test ./backend/internal/handlers/... -run TestRevokeCapabilityMembershipBaseline` | ❌ Wave 0 (new test, extend `admin_capability_handler_test.go`) | ⬜ pending |
| TBD-C1b | 1 (Block 1) | Criterion 1 (extension, D-16/D-17) | — | Granting a non-baseline action to `group_member` is rejected server-side with a speaking, accurate German message — new action-specific guard, NOT a blanket `NOT reserved` filter on `LoadCapabilityRoles` (which would make the role fully uneditable, see D-17's trap) | unit (httptest + fake repo) | `go test ./backend/internal/handlers/... -run TestGrantCapabilityMembershipBaseline` | ❌ Wave 0 (new test) | ⬜ pending |
| TBD-C2 | 1-2 (Block 1) | Criterion 2 | — | Capability matrix shows exactly 3 interactive baseline rows for `group_member` across ALL 8 categories (not just the 2 opened during Phase 145 UAT), each with `Badge variant="info"` + `Lock` + „Geschützt" + `aria-describedby`; rejected attempt surfaces the German rejection message via the existing `mutationError` path | unit (RTL, real 38-action fixture) | `npm run test -- RoleCapabilityDetail` | ⚠️ existing "keine Sonderbehandlung" test rewritten + new real-action-count test (D-19) | ⬜ pending |
| TBD-C3 | 1 (Block 1) | Criterion 3 | — | All 4 role-picker queries (3 existing Phase-145 siblings + `ListGroupHistoryRoleDefinitions`) exclude the reserved pseudo-role | integration (real Postgres) | `TEAM4S_PHASE145_TEST_DSN=... go test ./backend/internal/repository/... -run TestReservedPseudoRoleExcludedFromPickers` | ⚠️ existing test file, extend with one new assertion | ⬜ pending |
| TBD-C4 | 1 (Block 1) | Criterion 4 | — | Migration seed, Go validator, TS filter, and the new Grant/Revoke guards (D-16/D-17) all derive from or are anti-drift-tested against one authoritative Go source | integration (real Postgres, anti-drift) | `TEAM4S_PHASE145_TEST_DSN=... go test ./backend/internal/repository/... -run TestMembershipBaselineMigrationSeedsExactlyThreeActions` | ⚠️ existing test's literal needs to compare against the new exported Go var | ⬜ pending |
| TBD-C5/6 | 2 (Block 2) | Criteria 5-6 | — | Security-relevant test files (count locked as Block 2's first task per D-08) replace `os.ReadFile`+`strings.Contains` presence assertions with real calls; absence checks and self-testing files (migrations) remain exempt; ≤36/53 files still read `.go` source afterward | mixed (unit + integration, file by file) | per-file — see `.planning/notes/2026-09-04-messung-substring-tests.md` for the candidate list | ❌ Wave 0 per file | ⬜ pending |
| TBD-C7 | 2 (Block 2) | Criterion 7 | — | New scanner test fails `go test ./...` if a new, non-allow-listed file adds the forbidden `os.ReadFile(...".go")` + `strings.Contains` pattern; allow-list is frozen and shrink-only (modeled on `LEGACY_NO_RESTRICTED_SYNTAX_FILES`) | unit (meta/self-test) | `go test ./backend/... -run TestNoNewSourceSubstringTests` (name TBD by planner) | ❌ Wave 0 (net-new file, no in-repo Go precedent) | ⬜ pending |
| TBD-C8 | 2 (Block 2) | Criterion 8 | — | Remaining substring-test debt documented with a named reason per file (not a silent gap) | docs (not automated) | n/a | ❌ Wave 0 (new doc) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs above are placeholders (`TBD-*`) — the planner assigns real plan/task IDs; this table's
row set and criterion mapping must be preserved when translating to concrete tasks.*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/admin_capability_handler_test.go` — new test proving Criterion 1's revoke guard fires with `countRolesWithAction` stubbed high (16+), independent of the lockout guard
- [ ] `backend/internal/handlers/admin_capability_handler_test.go` — new test proving the Criterion 1/D-16 grant guard rejects a non-baseline action for `group_member`
- [ ] `backend/internal/repository/membership_baseline_registry_test.go` — extend for Criterion 3's 4th query and Criterion 4's anti-drift assertion
- [ ] New Go file for Criterion 7's ratchet-guard test (no existing precedent in this repo — modeled on `frontend/eslint.config.mjs`'s `LEGACY_NO_RESTRICTED_SYNTAX_FILES` shape, enforced via `go test` not CI since no CI pipeline exists)
- [ ] `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` — new fixture exercising the real 38-action shape across all 8 categories, proving exactly 3 switches render for `group_member` (D-19)
- [ ] Per-file Wave 0 gap for each locked security-relevant Block-2 file, sized individually once the file list is locked per Block 2's first task (D-08)

---

## Manual-Only Verifications

| Behavior | Criterion | Why Manual | Test Instructions |
|----------|-----------|------------|-------------------|
| `TEAM4S_PHASE145_TEST_DSN`-gated tests actually ran (not silently skipped) at least once during the phase | 3, 4 | No CI exists to catch a permanently-skipped test; SKIP-not-FAIL is the established project convention | Set `TEAM4S_PHASE145_TEST_DSN` locally, run `go test ./backend/internal/repository/... -v -run TestReservedPseudoRoleExcludedFromPickers` and `-run TestMembershipBaselineMigrationSeedsExactlyThreeActions`, confirm neither line prints `SKIP` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

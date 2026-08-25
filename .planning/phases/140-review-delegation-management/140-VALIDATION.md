---
phase: 140
slug: review-delegation-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-25
---

# Phase 140 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Go `testing` + `testify` (real-Postgres integration style, `TEAM4S_PHASE1xx_TEST_DSN` gated) · Frontend: Vitest 3 (`frontend/vitest.config.ts`), React Testing Library |
| **Config file** | Backend: none (env-var gated) · Frontend: `frontend/vitest.config.ts` |
| **Quick run command (backend, scoped)** | `docker compose exec -T team4sv30-backend go test ./internal/services/... ./internal/repository/... ./internal/handlers/... -run ReviewDelegation` |
| **Quick run command (frontend, scoped)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs/ReviewDelegationSection.test.tsx"` |
| **Full suite command (backend)** | `docker compose exec -T team4sv30-backend go test ./...` (with `TEAM4S_PHASE1xx_TEST_DSN` set) |
| **Full suite command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` |
| **Estimated runtime** | ~60-90s scoped, ~5-8min full suite (both stacks) |

---

## Sampling Rate

- **After every task commit:** Run scoped backend (`-run ReviewDelegation`) + scoped frontend (`ReviewDelegationSection.test.tsx`)
- **After every plan wave:** Run full backend suite + full frontend suite, diffed against the Phase-139 baseline (`.planning/phases/139-scalable-user-admin-projections/139-BASELINE.md` — 43 red frontend tests/15 files, ~29 backend failures from nil `permissions.Service.LoadCache`) to isolate new regressions
- **Before `/gsd:verify-work`:** Full suite green modulo the pre-existing baseline
- **Max feedback latency:** ~90 seconds (scoped run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | RDEL-01 | V4/V13 | GET returns real target's granted delegations + eligibility context, group-scoped, 404/neutral on foreign pair | integration (real Postgres) | `go test ./internal/handlers/... -run TestAdminReviewDelegationHandler_Get` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | RDEL-02 | V4/V5 | Leader can grant/revoke each of the three delegable actions independently via single PUT with boolean intent | integration (real Postgres) | `go test ./internal/handlers/... -run TestAdminReviewDelegationHandler_Mutate` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | RDEL-03 (grant-side removal) | V4 | `GuidedGrantFlow` / `CategoryTable` no longer offers `review.*.decide` for grant; new dedicated section renders distinctly, no shared call to `mutateCapabilityOverride` for grant | frontend unit (Vitest + RTL) | `npx vitest run src/app/admin/users/tabs/ReviewDelegationSection.test.tsx`; regression: `npx vitest run src/app/admin/users/tabs/GuidedGrantFlow.test.tsx src/app/admin/users/tabs/CategoryTable.test.tsx` (assert review actions absent from grant path) | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | RDEL-03 (deny-side preserved) | V4 | Personal user-deny for the three review actions remains available and functional in the generic override UI, unchanged; effective-allow source (delegation vs. override) is recognizable and links to the dedicated section | frontend unit + integration | `npx vitest run src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx` (regression, still offers review actions); provenance-source assertion in `ReviewDelegationSection.test.tsx` / `CategoryTable.test.tsx` | ❌ Wave 0 | ⬜ pending |
| TBD | TBD | TBD | RDEL-04 | V4/V5 | Idempotent grant/revoke, audit event written, cross-group/ineligible-target rejection — already covered at service layer | integration (real Postgres) — **service layer already exists**; new HTTP-boundary tests for auth wiring + request/response mapping | `go test ./internal/services/... -run TestPhase107ReviewServiceGrantRevokeDelegationNoOpAudit` (existing, 4 sibling tests); new: `go test ./internal/handlers/... -run TestAdminReviewDelegationHandler_.*Ineligible` | ✅ service tests exist (`review_service_test.go:86-215`) / ❌ handler tests Wave 0 | ⬜ pending |

*Task IDs/Plan/Wave columns are TBD until the planner assigns concrete plan/task numbers — this table's rows are the mandatory requirement→test bindings the planner must fill in.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/testsupport/phase140_postgres.go` — new composed migration-chain fixture combining 0134 (review foundation) with 0108/0146/0150 (capability catalog + overrides), since neither `OpenPhase107Postgres` nor `OpenPhase137Postgres` alone carries every table this phase's handler tests need (see 140-RESEARCH.md Pitfall 1) — or a documented decision to extend one of the existing harnesses instead
- [ ] `backend/internal/handlers/admin_review_delegation_handler_test.go` — new handler-level integration tests (auth wiring against `ActionFansubGroupMembersManage`, BOLA/cross-group rejection, eligibility-rejection surfaced as HTTP status)
- [ ] `frontend/src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` — new component test (net-new file, confirm during planning)
- [ ] Regression coverage confirming `GuidedGrantFlow`/`CategoryTable` no longer expose a grant control for `review.*.decide`, while `GuidedRevokeFlow` still does for deny

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin can trace an effective review-allow back to its source (delegation vs. pre-existing personal override) and reach the "Prüf-/Freigabe-Rechte" section from wherever the generic override UI still shows the review row | RDEL-03 | Cross-component discoverability/UX judgment is not reliably assertable via jsdom text-matching alone | Log into the admin member editor at `http://127.0.0.1:3300` for a member with a live delegation grant, confirm the effective-rights/override view labels the source and links to the dedicated section rather than presenting an unexplained missing grant control |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

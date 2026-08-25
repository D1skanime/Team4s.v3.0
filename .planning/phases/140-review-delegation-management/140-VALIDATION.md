---
phase: 140
slug: review-delegation-management
status: planned
nyquist_compliant: true
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
| 140-01 Task 1 | 140-01 | Wave 1 | RDEL-01 | V4/V13 | Non-locking repository read returns eligibility snapshot + granted action codes for a real target membership | integration (real Postgres) | `docker compose exec -T team4sv30-backend go test ./internal/repository/... -run ReviewDelegation -v` | ❌ Wave 0 — new in 140-01 | ⬜ pending |
| 140-01 Task 2 | 140-01 | Wave 1 | RDEL-01 / RDEL-02 / RDEL-04 | V4/V13 | GET projects snapshot into the 3 fixed delegable actions with neutral 404 on foreign pair; PUT validates action_code, resolves target from path only, delegates to existing `services.ReviewService`; handler authorizes with `ActionFansubGroupMembersManage` matching the service's internal gate | integration (stub-tested handler) | `docker compose exec -T team4sv30-backend go test ./internal/handlers/... -run "ReviewDelegation\|AdminReviewDelegationHandler" -v` | ❌ Wave 0 — new in 140-01 | ⬜ pending |
| 140-02 Task 1 | 140-02 | Wave 2 | RDEL-01 / RDEL-02 | — | Handler is actually reachable: routes registered behind auth middleware, nil-guarded, wired in `main.go` | build/vet (compile-time reachability) | `docker compose exec -T team4sv30-backend go build ./... && docker compose exec -T team4sv30-backend go vet ./...` | ❌ Wave 0 — new in 140-02 | ⬜ pending |
| 140-02 Task 2 | 140-02 | Wave 2 | RDEL-01 / RDEL-02 | V13 | GET/PUT paths + DTO schemas documented in the shared OpenAPI contract, matching the routed literal path | contract validation (YAML schema check) | `python3 -c "import yaml; d = yaml.safe_load(open('shared/contracts/admin-capabilities.yaml')); assert '/api/v1/admin/fansubs/{id}/app-members/{appUserId}/review-delegations' in d['paths']; assert 'ReviewDelegationRow' in d['components']['schemas']; print('ok')"` | ❌ Wave 0 — new in 140-02 | ⬜ pending |
| 140-03 Task 1 | 140-03 | Wave 1 | RDEL-01 / RDEL-02 | — | TS types + `getReviewDelegations`/`mutateReviewDelegation` API client functions, type-safe end to end | typecheck | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` | ❌ Wave 0 — new in 140-03 | ⬜ pending |
| 140-03 Task 2 | 140-03 | Wave 1 | RDEL-01 / RDEL-02 / RDEL-03 | V4 | Dedicated "Prüf-/Freigabe-Rechte" section renders 3 delegable rows with eligibility-aware disabled state, Switch grant/revoke with optimistic update + inline error/revert, mounted as a sibling in `GroupSection.tsx` | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs/ReviewDelegationSection.test.tsx src/app/admin/users/tabs/GroupRolesSection.test.tsx src/app/admin/users/tabs/UserGroupRightsTab.test.tsx"` | ❌ Wave 0 — new in 140-03 | ⬜ pending |
| 140-03 Task 3 | 140-03 | Wave 1 | RDEL-03 (grant-side removal + deny-side preserved) | V4 | `CapabilityDetailRow` grant affordance removed for the 3 review actions (explanatory note + jump-link to the dedicated section); `showRevoke`/deny path explicitly untouched and regression-tested | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/users/tabs/CapabilityDetailRow.test.tsx src/app/admin/users/tabs/GuidedGrantFlow.test.tsx src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx src/app/admin/users/tabs/UserGroupRightsTab.test.tsx"` | ❌ Wave 0 — new in 140-03 | ⬜ pending |
| — (existing, unchanged) | — | — | RDEL-04 | V4/V5 | Idempotent grant/revoke, audit event written, cross-group/ineligible-target rejection — already covered at service layer, not rebuilt by this phase | integration (real Postgres) | `docker compose exec -T team4sv30-backend go test ./internal/services/... -run TestPhase107ReviewServiceGrantRevokeDelegation` (existing, 4 sibling tests, unchanged by this phase) | ✅ already exists (`review_service_test.go:86-215`) | ✅ green (pre-existing) |

*Task IDs/Plan/Wave now reflect the finalized PLAN.md files (140-01, 140-02, 140-03); this table was synced after the plan-checker's Wave 0/`TBD` warning.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] **Deviation from the originally-flagged Pitfall 1, documented per this file's own escape hatch:** Plan 140-01 does NOT build a new `testsupport/phase140_postgres.go` composed-migration harness. Instead it reuses the existing `openPhase107ReviewRepositoryPool` helper already present in `review_delegation_repository_test.go` (composes `OpenPhase107Postgres` + manual migration 0134 apply), because the handler layer (Plan 140-01 Task 2) is stub-tested rather than real-Postgres-integration-tested — mirroring `admin_effective_rights_handler_test.go`'s established convention — and the one new repository method (Task 1) is fully coverable by that existing helper. `140-PATTERNS.md` still lists the new-harness file as an "exact match" classification from before this decision; that entry is stale and superseded by this plan-level decision, not a contradiction to resolve.
- [ ] `backend/internal/handlers/admin_review_delegation_handler_test.go` — new handler-level tests (auth wiring against `ActionFansubGroupMembersManage`, BOLA/cross-group rejection, eligibility-rejection surfaced as HTTP status) — 140-01 Task 2
- [ ] `frontend/src/app/admin/users/tabs/ReviewDelegationSection.test.tsx` — new component test (net-new file) — 140-03 Task 2
- [ ] `frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx` — new regression coverage confirming the grant control is removed for `review.*.decide` while `GuidedRevokeFlow` still offers deny — 140-03 Task 3

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin can trace an effective review-allow back to its source (delegation vs. pre-existing personal override) and reach the "Prüf-/Freigabe-Rechte" section from wherever the generic override UI still shows the review row | RDEL-03 | Cross-component discoverability/UX judgment is not reliably assertable via jsdom text-matching alone | Log into the admin member editor at `http://127.0.0.1:3300` for a member with a live delegation grant, confirm the effective-rights/override view labels the source and links to the dedicated section rather than presenting an unexplained missing grant control |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (verified by gsd-plan-checker against 140-01/02/03)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (harness deviation documented above, not a gap)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** plan-level sign-off complete 2026-08-25 (gsd-plan-checker: 0 blockers). Task-level status (⬜/✅) updates during `/gsd:execute-phase 140`.

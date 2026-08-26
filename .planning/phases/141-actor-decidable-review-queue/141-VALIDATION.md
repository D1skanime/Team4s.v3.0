---
phase: 141
slug: actor-decidable-review-queue
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-26
---

# Phase 141 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Backend: Go `testing` + `testify` (real-Postgres integration style, `TEAM4S_PHASE107_TEST_DSN` gated, via `testsupport.OpenPhase107Postgres`) · Frontend: Vitest 3 (`frontend/vitest.config.ts`), React Testing Library |
| **Config file** | Backend: none (env-var gated) · Frontend: `frontend/vitest.config.ts` |
| **Quick run command (backend, scoped)** | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/handlers ./internal/repository ./internal/services -run 'ReleaseReview' -count=1 -v"` |
| **Quick run command (frontend, scoped)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/fansubs --reporter=basic"` |
| **Full suite command (backend)** | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./... -count=1"` |
| **Full suite command (frontend)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run --reporter=basic"` |
| **Estimated runtime** | ~60-90s scoped, ~5-8min full suite (both stacks) |

---

## Sampling Rate

- **After every task commit:** Run scoped backend (`-run 'ReleaseReview'`) + scoped frontend (`src/app/admin/fansubs`)
- **After every plan wave:** Run full backend suite + full frontend suite, diffed against the Phase-139 baseline (`.planning/phases/139-scalable-user-admin-projections/139-BASELINE.md` — ~43 red frontend tests/15 files, ~24-29 backend `internal/handlers` failures from nil `permissions.Service.LoadCache`) to isolate new regressions — do not chase or fix the pre-existing baseline
- **Before `/gsd:verify-work`:** Full suite green modulo the pre-existing baseline
- **Max feedback latency:** ~90 seconds (scoped run)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 141-01 Task 1 | 141-01 | Wave 1 | RQUE-01 / RQUE-04 (Pitfall 1 / QUAL-06) | T-141-03 | `permissions.Service.ResolveGroupRights` resolved once per request (request-scoped only, no cross-request cache — L-01 stays resolved, not reopened), replacing the redundant 2-4x `CanReviewForFansubGroup` calls | integration / unit | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/handlers -run 'ReleaseReview' -count=1 -v"` | ❌ Wave 0 — new in 141-01 | ⬜ pending |
| 141-01 Task 2 | 141-01 | Wave 1 | RQUE-05 (D11/D08 decision guard) | T-141-02 | `services.ReviewService.Decide`'s transaction-scoped re-check (capability, self-review, pending-state) remains authoritative under a concurrent mid-flight delegation revoke — resolves deterministically to 403 or 409, never a double-apply | integration (real Postgres, concurrency) | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/services -run 'ReleaseReview' -count=1 -v"` | ❌ Wave 0 — new in 141-01 | ⬜ pending |
| 141-02 Task 1/2 | 141-02 | Wave 2 | RQUE-02 / RQUE-03 / D15 | T-141-01 | `releaseReviewQueuePredicates` gains the two-signal self-exclusion predicate (submitter_app_user_id + verified member IDs), a new `view=own` scope with capability-gate bypass (D10), corrected newest-first sort (D15), and `allowed_types` echo | build/vet + integration | `docker compose exec -T team4sv30-backend sh -c "cd /app && go build ./... && go test ./internal/repository ./internal/handlers -run 'ReleaseReview' -count=1 -v"` | ❌ Wave 0 — new in 141-02 | ⬜ pending |
| 141-02 Task 3 | 141-02 | Wave 2 | RDEL-05 / RQUE-02 / RQUE-06 / D15 | T-141-01/T-141-03 | `TestPhase141RevokedDelegationImmediateEffect` (grant→observe→revoke→observe gone, list/counts/decide, no restart — closes RDEL-05/L-01's required deliverable), `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` (closes RQUE-02/L-02), `TestReleaseReviewQueueNeverIncludesContributionSourceType` (explicit RQUE-06 guard) | integration (real Postgres) | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/repository -run 'ReleaseReview' -count=1 -v"` | ❌ Wave 0 — new in 141-02 | ⬜ pending |
| 141-03 Task 1/2 | 141-03 | Wave 3 | RQUE-02 / RQUE-04 / RQUE-05 (D04) | T-141-02 | Existence-then-authorize split for Detail/Next (Pattern 3) closes the 403-vs-404 gap; actor identity threaded through Detail/Next/Decide-precheck; `release_review_handler.go` stays ≤450 lines | build/vet | `docker compose exec -T team4sv30-backend sh -c "cd /app && go build ./..."` | ❌ Wave 0 — new in 141-03 | ⬜ pending |
| 141-03 Task 3 | 141-03 | Wave 3 | RQUE-02 / RQUE-04 / RQUE-05 (D04/D05) | T-141-02 | `TestReleaseReviewDetailNextShareListPredicateBuilder` (List/Detail/Next agree, closes Pitfall 3/RQUE-04), `TestReleaseReviewDetailOwnSubmissionReturns403` (closes D04), `TestReleaseReviewNextNeverReturnsActorsOwnSubmission` (closes D05 combination, never silent `{"data": null}`) | integration + handler stub | `docker compose exec -T team4sv30-backend sh -c "cd /app && go test ./internal/repository ./internal/handlers -run 'ReleaseReview' -count=1 -v"` | ❌ Wave 0 — new in 141-03 | ⬜ pending |
| 141-04 Task 1/2 | 141-04 | Wave 4 | RQUE-01 / RQUE-03 / RQUE-04 | — | TS types extend `ReleaseReviewView` with `'own'`, `useReleaseReviewLane` hook centralizes list/counts/filter derivation for reuse by both the queue and own-pending lanes | typecheck | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` | ❌ Wave 0 — new in 141-04 | ⬜ pending |
| 141-05 Task 1/2 | 141-05 | Wave 5 | RQUE-02 / RQUE-03 / D01 / D03 | T-141-04 | `OwnPendingReviewsSection.tsx` renders the actor's own pending submissions with zero decision actions; `Tabs` wrapper separates "Zu prüfen" (accent badge) from "Wartet auf Fremdprüfung" (muted badge) with independent badge counts per UI-SPEC | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/fansubs --reporter=basic"` | ❌ Wave 0 — new in 141-05 | ⬜ pending |
| 141-05 Task 3 | 141-05 | Wave 5 | RQUE-02 / RQUE-03 / D01 / D07 | T-141-04 | `OwnPendingReviewsSection.test.tsx` (new file, zero prior coverage) — no Approve/Reject controls rendered, no reviewer-identity leakage (D07), status-only copy | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run OwnPendingReviewsSection.test.tsx --reporter=basic"` | ❌ Wave 0 — new in 141-05 | ⬜ pending |
| 141-06 Task 1/2 | 141-06 | Wave 5 | RQUE-01 / D06 / D10 / D13 | — | Always-zero "Mitwirkungen" badge removed (Pitfall 4); actionable filters omit (not disable) types the actor can't review (D10); neutral empty-state copy locked verbatim: "Aktuell keine Prüfungen für dich offen." (D13) | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run ReleaseReviewsSection.test.tsx --reporter=basic"` | ❌ Wave 0 — new in 141-06 | ⬜ pending |
| 141-07 Task 1/2 | 141-07 | Wave 5 | RQUE-05 (D04/D05/D08) | T-141-02 | `NextReviewControl` handles resolving/available/exhausted/error states cleanly (D05 — Next ends cleanly, never a dead click); review-detail page renders a distinct, non-generic 403 branch (not the misleading default admin-contact copy) and a 409 conflict panel for already-decided items | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run page.test.tsx --reporter=basic"` | ❌ Wave 0 — new in 141-07 | ⬜ pending |
| 141-07 Task 3 | 141-07 | Wave 5 | RQUE-05 (D04/D05/D08) | T-141-02 | Detail-page regression tests for the 403/409/next-exhausted states, exact German copy from UI-SPEC asserted | frontend unit (Vitest + RTL) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run page.test.tsx --reporter=basic"` | ❌ Wave 0 — new in 141-07 | ⬜ pending |

*Task IDs synced to the finalized PLAN.md files (141-01 through 141-07) after gsd-plan-checker sign-off (0 blockers, 4 non-blocking warnings — see 141-checker return, 2026-08-26), mirroring Phase 140's own VALIDATION.md convention.*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/internal/repository/release_review_query_repository_test.go` — `TestPhase141RevokedDelegationImmediateEffect` (real-Postgres, grant → observe → revoke → observe gone, single test, no restart) — closes RDEL-05/L-01 — planned in 141-02 Task 3
- [x] `backend/internal/repository/release_review_query_repository_test.go` — `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` — closes RQUE-02/L-02 — planned in 141-02 Task 3
- [x] `backend/internal/handlers/release_review_handler_test.go` — `TestReleaseReviewDetailOwnSubmissionReturns403` — closes D04 — planned in 141-03 Task 3
- [x] `backend/internal/handlers/release_review_handler_test.go` — `TestReleaseReviewNextNeverReturnsActorsOwnSubmission` — closes D05 combination — planned in 141-03 Task 3
- [x] `backend/internal/repository/release_review_query_repository_test.go` — `TestReleaseReviewDetailNextShareListPredicateBuilder` — closes Pitfall 3 / RQUE-04 — planned in 141-03 Task 3
- [x] `backend/internal/repository/release_review_query_repository_test.go` — `TestReleaseReviewQueueNeverIncludesContributionSourceType` — explicit RQUE-06 regression guard — planned in 141-02 Task 3
- [x] `backend/internal/services/review_service_test.go` (or sibling) — concurrent revoke-vs-decide race test — planned in 141-01 Task 2 ("Decision-guard concurrency regression under mid-flight revoke")
- [x] `frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.test.tsx` — new component, zero existing coverage — planned in 141-05 Task 3
- [x] `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.test.tsx` — extended for D10 filter scoping and D13 empty-state copy — planned in 141-06 Task 2

All Wave 0 deliverables are covered by a named task in the finalized plans (gsd-plan-checker confirmed, 2026-08-26). Checkboxes above track planning coverage, not yet execution — flip to reflect actual green test runs during `/gsd:execute-phase 141`.

---

## Manual-Only Verifications

*None identified yet — Phase 141's behaviors (queue visibility, filters, empty state, own-pending lane, 403/409 responses) are all server-side-driven and assertable via integration/handler/component tests. If UI-SPEC or the planner surfaces a genuine cross-component discoverability check (e.g. mirroring Phase 140's provenance-label item), add it here before plan-checker sign-off.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (verified by gsd-plan-checker against 141-01 through 141-07)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** plan-level sign-off complete 2026-08-26 (gsd-plan-checker: 0 blockers, 4 non-blocking warnings — file-size gate added to 141-03 Task 2, frontend test-name looseness accepted as-is given itemized behavior lists, this doc's own frontmatter/task-ID sync was the 3rd warning and is resolved by this edit, baseline-note coverage accepted as non-blocking). Task-level status (⬜/✅) updates during `/gsd:execute-phase 141`.

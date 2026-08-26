---
phase: 141
slug: actor-decidable-review-queue
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD (RDEL-05/L-01) | TBD | TBD | RDEL-05 | V4 | Revoked specialized delegation loses effect on list, counts, and decision in the same request cycle — no cache/restart needed | integration (real Postgres) | `go test ./internal/... -run TestPhase141RevokedDelegationImmediateEffect` | ❌ Wave 0 | ⬜ pending |
| TBD (Pitfall 1 / QUAL-06) | TBD | TBD | RQUE-01 / RQUE-04 | — | `ResolveGroupRights` resolved once per request, not 2-4x, closing the N+1 found in research | integration / unit | `go test ./internal/handlers -run TestReleaseReviewHandlerResolvesGroupRightsOnce` (or equivalent single-resolution regression test) | ❌ Wave 0 | ⬜ pending |
| TBD (RQUE-02, list/counts) | TBD | TBD | RQUE-02 | V4 | List and Counts exclude the actor's own submissions (two-signal: app_user_id match OR verified member-claim match), mirroring `review_service.go`'s decision-time definition of "own" | integration (real Postgres) | `go test ./internal/repository -run TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` | ❌ Wave 0 | ⬜ pending |
| TBD (D04, Detail 403) | TBD | TBD | RQUE-02 / RQUE-05 | V4 | Detail returns 403 (not 200, not 404) for an existing review that is the actor's own submission or otherwise not actor-decidable | handler stub | `go test ./internal/handlers -run TestReleaseReviewDetailOwnSubmissionReturns403` | ❌ Wave 0 | ⬜ pending |
| TBD (D05, Next) | TBD | TBD | RQUE-02 / RQUE-04 | V4 | "Next" never resolves to the actor's own submission or a non-decidable review | handler stub | `go test ./internal/handlers -run TestReleaseReviewNextNeverReturnsActorsOwnSubmission` | ❌ Wave 0 | ⬜ pending |
| TBD (Pitfall 3, RQUE-04) | TBD | TBD | RQUE-04 | — | Detail/Next share one predicate builder with List/Counts (not three hand-rolled WHERE clauses) | integration (real Postgres) | `go test ./internal/repository -run TestReleaseReviewDetailNextShareListPredicateBuilder` | ❌ Wave 0 | ⬜ pending |
| TBD ("Wartet auf Fremdprüfung") | TBD | TBD | RQUE-03 / D01 / D03 | V4 | New `view=own` scope returns only the actor's own pending submissions, no decision actions rendered, capability gate bypassed per D10 | handler stub + frontend component | `go test ./internal/handlers -run TestReleaseReviewOwnPending` / `npx vitest run OwnPendingReviewsSection.test.tsx` | ❌ Wave 0 | ⬜ pending |
| TBD (RQUE-06 explicit guard) | TBD | TBD | RQUE-06 | — | `review_sources`/queue query never includes a contribution-review source row, even if a future third UNION branch is added | integration (regression guard) | `go test ./internal/repository -run TestReleaseReviewQueueNeverIncludesContributionSourceType` | ❌ Wave 0 | ⬜ pending |
| TBD (D11/D08, decision guard) | TBD | TBD | RQUE-05 | V4 | Decision-time re-authorization (capability, self-review, pending-state) inside the transaction remains authoritative; concurrent decide-vs-revoke race resolves deterministically to 403 or 409, never a double-apply | integration (real Postgres, concurrency) | `go test ./internal/services -run TestReleaseReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke` (extends existing `TestReleaseReviewDecisionMapsStableConflictWithoutRetry` pattern) | ❌ Wave 0 | ⬜ pending |
| TBD (D13, empty state) | TBD | TBD | RQUE-01 / D13 | — | Neutral empty state copy exact match: "Aktuell keine Prüfungen für dich offen." — no leakage of global/other-actor work | frontend unit (Vitest + RTL) | `npx vitest run ReleaseReviewsSection.test.tsx` (extended) | ❌ Wave 0 | ⬜ pending |
| TBD (D10, filters) | TBD | TBD | RQUE-01 | — | Actionable filters show only review types the backend returned as actor-usable; own-pending lane filters are capability-independent | frontend unit (Vitest + RTL) | `npx vitest run ReleaseReviewsSection.test.tsx` (extended) | ❌ Wave 0 | ⬜ pending |

*Task IDs are placeholders (`TBD`) — this table must be synced to the finalized PLAN.md task IDs once plans are created, mirroring Phase 140's own VALIDATION.md convention (see its footnote after plan-checker sync).*

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/repository/release_review_query_repository_test.go` — `TestPhase141RevokedDelegationImmediateEffect` (real-Postgres, grant → observe → revoke → observe gone, single test, no restart) — closes RDEL-05/L-01
- [ ] `backend/internal/repository/release_review_query_repository_test.go` — `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts` — closes RQUE-02/L-02
- [ ] `backend/internal/handlers/release_review_handler_test.go` — `TestReleaseReviewDetailOwnSubmissionReturns403` — closes D04
- [ ] `backend/internal/handlers/release_review_handler_test.go` — `TestReleaseReviewNextNeverReturnsActorsOwnSubmission` — closes D05 combination
- [ ] `backend/internal/repository/release_review_query_repository_test.go` — `TestReleaseReviewDetailNextShareListPredicateBuilder` — closes Pitfall 3 / RQUE-04
- [ ] `backend/internal/repository/release_review_query_repository_test.go` — `TestReleaseReviewQueueNeverIncludesContributionSourceType` — explicit RQUE-06 regression guard
- [ ] `backend/internal/services/review_service_test.go` (or sibling) — concurrent revoke-vs-decide race test extending `TestReleaseReviewDecisionMapsStableConflictWithoutRetry`
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.test.tsx` — new component, zero existing coverage
- [ ] `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.test.tsx` — extended for D10 filter scoping and D13 empty-state copy

---

## Manual-Only Verifications

*None identified yet — Phase 141's behaviors (queue visibility, filters, empty state, own-pending lane, 403/409 responses) are all server-side-driven and assertable via integration/handler/component tests. If UI-SPEC or the planner surfaces a genuine cross-component discoverability check (e.g. mirroring Phase 140's provenance-label item), add it here before plan-checker sign-off.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending — draft written from 141-RESEARCH.md's Validation Architecture section before plans exist; re-sync task IDs and flip `nyquist_compliant: true` once PLAN.md files are finalized and pass gsd-plan-checker.

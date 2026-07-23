---
phase: 107
slug: best-tigung-delegation-und-ablehnungslebenszyklus
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-23
---

# Phase 107 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` with the existing PostgreSQL integration harness; Vitest and Testing Library for frontend behavior |
| **Config file** | `backend/go.mod`, `frontend/vitest.config.ts`, `frontend/package.json` |
| **Quick run command** | `cd backend && go test ./internal/services ./internal/handlers ./internal/repository -run 'Review|Delegation|Cleanup|Tombstone'` |
| **Full suite command** | `cd backend && go test ./...` plus `cd frontend && npm test -- --run && npm run typecheck && npm run lint` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the narrow test command named in that task and `git diff --check`.
- **After every plan wave:** Run `cd backend && go test ./...`; for frontend waves also run `cd frontend && npm test -- --run && npm run typecheck && npm run lint`.
- **Before `$gsd-verify-work`:** Full backend/frontend suite, migration up/down tests and the concurrency matrix must be green.
- **Max feedback latency:** 180 seconds for ordinary task checks; PostgreSQL race repetition may run longer at the phase gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 107-W0-01 | TBD | 0 | P107-SC1 | T-107-01, T-107-02 | Typed delegation is group-scoped, requires confirmed membership and cannot be re-delegated | service/DB | `cd backend && go test ./internal/services ./internal/repository -run 'ReviewDelegation|ReviewPermission'` | ❌ W0 | ⬜ pending |
| 107-W0-02 | TBD | 0 | P107-SC2 | T-107-01 | Self-review fails; only a platform admin can override with a non-whitespace reason | service/handler | `cd backend && go test ./internal/services ./internal/handlers -run 'SelfReview|Override'` | ❌ W0 | ⬜ pending |
| 107-W0-03 | TBD | 0 | P107-SC3 | T-107-03, T-107-04 | Parallel/retried decisions create one effective decision and at most one work/review credit | PostgreSQL integration | `cd backend && go test ./internal/repository ./internal/services -run 'Review.*(Concurrent|Idempotent|Points)' -count=10` | ❌ W0 | ⬜ pending |
| 107-W0-04 | TBD | 0 | P107-SC4 | T-107-05 | Rejection stays private, records category plus reason, permits edit/resubmit and awards no work credit | repository/handler | `cd backend && go test ./internal/repository ./internal/handlers -run 'Reject|Resubmit'` | ⚠ partial | ⬜ pending |
| 107-W0-05 | TBD | 0 | P107-SC5 | T-107-06, T-107-07 | Injected clock enforces 90-day/5-hour retention; tombstone excludes texts/files and file failures remain retryable | service/DB | `cd backend && go test ./internal/services ./internal/repository -run 'ReviewCleanup|Tombstone'` | ❌ W0 | ⬜ pending |
| 107-W0-06 | TBD | 0 | P107-SC6 | T-107-03, T-107-04, T-107-06 | Confirm/reject, cleanup/resubmit, reversal and repeated-worker races resolve deterministically | PostgreSQL concurrency | `cd backend && go test ./internal/repository ./internal/services -run 'Review.*Race|Review.*Retry' -count=10` | ❌ W0 | ⬜ pending |
| 107-W0-07 | TBD | 0 | AUTH | T-107-08 | A valid refresh session can load and execute protected review actions without a current access token | frontend | `cd frontend && npm test -- --run api.auth-refresh.test.ts ContributionsReviewSection.test.tsx` | ⚠ partial | ⬜ pending |
| 107-W0-08 | TBD | 0 | CONTRACT | T-107-02 | OpenAPI, backend DTOs, frontend types and API helper expose identical typed lifecycle fields and status handling | contract | `cd backend && go test ./internal/handlers -run 'Review.*Contract' && cd ../frontend && npm test -- --run api.test.ts` | ⚠ partial | ⬜ pending |

### Threat references

- **T-107-01:** forged actor or self-review privilege escalation.
- **T-107-02:** cross-group IDOR or capability-scope bypass.
- **T-107-03:** duplicate point award/reversal through retries.
- **T-107-04:** concurrent confirm/reject produces conflicting effective decisions.
- **T-107-05:** rejected content becomes public or earns contribution points.
- **T-107-06:** cleanup races with edit/resubmit.
- **T-107-07:** client-controlled or domain-confused media deletion.
- **T-107-08:** protected UI treats a refresh-only session as logged out or bypasses the central API client.

---

## Wave 0 Requirements

- [ ] `backend/internal/repository/review_lifecycle_repository_test.go` — PostgreSQL migration, transition, idempotency and concurrency coverage.
- [ ] `backend/internal/services/review_lifecycle_service_test.go` — permission, self-review, override, points and membership-lifetime policy matrix.
- [ ] `backend/internal/services/review_cleanup_test.go` — injected clock, retention, tombstone and retry-outbox behavior.
- [ ] `backend/internal/handlers/contribution_review_handler_test.go` — typed payloads and deterministic `400/403/404/409` contracts.
- [ ] Focused frontend tests for delegation, override warning, rejection/resubmit, scoped loading/errors and refresh-only authentication.
- [ ] Migration up/down coverage for delegations, assignments, decisions, tombstones, cleanup jobs and point-rule seeds.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Review and delegation controls are discoverable in the canonical group workspace | P107-SC1, P107-SC2 | Navigation and product fit need live shared-flow review | Open `/admin/fansubs/[id]/edit` through the visible app navigation; verify delegation, queue, rejection and override controls are present there and no leader-review flow was added to `/admin/my-groups/[id]`. |
| Override warning and private rejected-content workflow are understandable | P107-SC2, P107-SC4 | Warning hierarchy and progressive disclosure are visual/interaction qualities | Trigger the platform-admin override and rejection flows in the in-app browser; verify the warning is prominent, German strings use correct umlauts, and rejected text/media remain private and editable. |

---

## Validation Sign-Off

- [x] All planned behaviors have an automated target or explicit Wave 0 dependency.
- [x] Sampling continuity target: no three consecutive implementation tasks without automated verification.
- [x] Wave 0 identifies all currently missing test files and fixtures.
- [x] Commands use no watch-mode flags.
- [x] Ordinary feedback latency target is below 180 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** pending

---
phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
fixed_at: 2026-07-23T16:06:57Z
review_path: .planning/phases/107-best-tigung-delegation-und-ablehnungslebenszyklus/107-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 107: Code Review Fix Report

**Fixed at:** 2026-07-23T16:06:57Z  
**Source review:** `.planning/phases/107-best-tigung-delegation-und-ablehnungslebenszyklus/107-REVIEW.md`  
**Iteration:** 2

**Summary:**

- Findings in scope: 2
- Fixed: 2
- Skipped: 0
- Phase completion state: unchanged

## Fixed Issues

### WR-01: Externally owned compatible point-rule history prevents an otherwise safe rollback

**Files modified:** `database/migrations/0134_review_foundation.down.sql`, `backend/internal/migrations/phase107_review_foundation_test.go`  
**Commit:** 23c1e7fe  
**Status:** fixed: requires human verification  
**Applied fix:** The immutable-ledger rollback precondition now applies only when `review.decision|1` is recorded as migration-owned. Live PostgreSQL coverage proves that externally owned compatible rule/history survives a successful Down, while history against a 0134-owned rule still fails closed before any Phase-107 table or seed is removed.

### WR-02: Field-validation table tests pass without exercising any field validation

**Files modified:** `backend/internal/repository/review_decision_repository_test.go`, `backend/internal/repository/review_credit_repository_test.go`  
**Commit:** b9734b8e  
**Applied fix:** Decision and credit-key validation tables now use non-nil DBTX fakes and assert that malformed inputs return `ErrValidation` before any query or exec. Removing an individual field validator now reaches the fail-on-database seam and fails the affected table case instead of being masked by nil-repository validation.

## Verification

- Focused live PostgreSQL `TestPhase107MigrationLiveUpDownUp` — PASS, including external-owned history preservation and migration-owned history rejection.
- Focused decision/credit validation tests — PASS.
- Required ordinary and platform-admin target-attribution service tests — PASS.
- All `TestPhase107` tests across testsupport, permissions, migrations, repository, and services with disposable PostgreSQL and `-count=10` — PASS.
- Migration Up/Down/Up — PASS in the focused run and all 10 repeated Phase-107 runs.
- `go vet ./...` — PASS.
- Repository-wide `git diff --check` — PASS.
- `go test ./...` — FAIL only in three unrelated source-invariant tests: `TestFansubNotesRepository_ScopedMutationSourceInvariants`, `TestMemberProfileRepositorySourceInvariants`, and `TestGetPublicReleaseDetail_NotFoundPathChecksErrNoRowsBeforeUse`. No unrelated source was modified.

## Remaining Issues

The two iteration-2 review warnings are fixed. Phase 107 was not marked complete. The unrelated full-suite source-invariant failures remain outside this review-fix scope.

---

_Fixed: 2026-07-23T16:06:57Z_  
_Fixer: the agent (gsd-code-fixer)_  
_Iteration: 2_

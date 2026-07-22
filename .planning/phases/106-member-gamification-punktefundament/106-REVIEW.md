---
phase: 106-member-gamification-punktefundament
reviewed: 2026-07-22T21:53:54Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/internal/testsupport/phase106_postgres.go
  - backend/internal/testsupport/phase106_postgres_test.go
  - backend/internal/migrations/phase106_member_points_test.go
  - database/migrations/0131_member_point_foundation.up.sql
  - database/migrations/0131_member_point_foundation.down.sql
  - backend/internal/repository/point_rules_repository.go
  - backend/internal/repository/point_rules_repository_test.go
  - backend/internal/repository/point_ledger_repository.go
  - backend/internal/repository/point_ledger_repository_test.go
  - backend/internal/repository/audit_logs.go
  - backend/internal/services/point_service.go
  - backend/internal/services/point_service_credit_test.go
  - backend/internal/services/point_service_reverse_test.go
  - backend/internal/services/point_service_boundary_test.go
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 106: Code Review Report

**Reviewed:** 2026-07-22T21:53:54Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

The fix commit genuinely resolves prior findings CR-01, CR-02, CR-03, WR-01, WR-02, and WR-03 with focused regression coverage. WR-04 is only partially resolved: the database rejects empty and space-padded rule codes, but PostgreSQL's one-argument `btrim` does not remove tabs or newlines. The same incomplete whitespace check is used for reversal reasons and permanent ledger identifiers. A disposable PostgreSQL 16 probe confirmed that both a tab-only immutable rule code and a tab-only reversal reason are accepted.

The remaining Phase-106 behavior passed focused unit/static tests and the live PostgreSQL suite, including Up/Down/Up, TRUNCATE rejection, snapshot validation, FK-context nulling, award/reversal retry, concurrency, rollback, and caller-owned transaction atomicity.

## Prior Finding Re-verification

| Prior finding | Result | Evidence |
|---|---|---|
| CR-01 — TRUNCATE bypass | Resolved | Statement-level guards exist for both tables; live `ledger_truncate` and `rule_truncate` tests assert the append-only errors. |
| CR-02 — NULL reversal reason | Resolved for NULL | The shape constraint explicitly requires `reversal_reason IS NOT NULL`; the live NULL-reason test asserts `chk_point_ledger_entry_shape`. The separate whitespace-only bypass is reported below. |
| CR-03 — PostgreSQL timestamp precision | Resolved | Award and reversal inputs canonicalize to UTC microseconds; unit and live retry/concurrency tests use sub-microsecond timestamps. |
| WR-01 — invalid snapshot-test SQL | Resolved | Snapshot cases now bind valid INSERT values and assert `award snapshot does not match point rule`. |
| WR-02 — incomplete public-schema guard | Resolved | Guard and tests cover quoted `"public".` targets and CREATE/ALTER/DROP SCHEMA forms. |
| WR-03 — late fixture cleanup | Resolved | Idempotent cleanup is registered before schema verification and prerequisite creation. |
| WR-04 — canonical rule codes | Incomplete | Space-only cases are covered, but tab/newline-only and tab/newline-padded codes still pass the database constraint. |

## Critical Issues

### CR-01: Whitespace-only audit reasons and immutable identifiers still pass PostgreSQL constraints

**File:** `database/migrations/0131_member_point_foundation.up.sql:5,34-35,47,52`

**Issue:** The constraints use one-argument `btrim`, which removes ordinary space characters but not tabs or newlines. Consequently, direct SQL can insert an immutable rule with `rule_code = E'\t'`, and can append a reversal with `reversal_reason = E'\t'`; whitespace-only source and idempotency fields are accepted for the same reason. Go rejects these values with `strings.TrimSpace`, so the database and application canonicalization contracts diverge. The rule becomes permanently unreachable through `GetByRef`, while the reversal has no meaningful audit reason despite the database being the final repudiation guard. The current regression cases cover `''`, `'   '`, and space-padded codes only. A PostgreSQL 16 probe against the current 0131 migration returned `1|1` for accepted tab-only rule and reversal rows.

**Fix:** Use a whitespace-aware predicate consistently in 0131 and the 0132 hardening migration, then add live tests for tab/newline-only and padded values. For example:

```sql
CHECK (
    rule_code ~ '[^[:space:]]'
    AND rule_code !~ '^[[:space:]]|[[:space:]]$'
)

-- For fields that need only be nonblank, including reversal_reason:
CHECK (reversal_reason IS NOT NULL AND reversal_reason ~ '[^[:space:]]')
```

Apply the same canonical/nonblank policy to `source_type`, `source_key`, and `idempotency_key`, matching the Go boundary. Regression tests should execute syntactically valid inserts with `E'\t'`, `E'\n'`, and padded variants and assert the intended constraint name.

## Checks Executed

- `go test ./internal/testsupport ./internal/migrations ./internal/repository ./internal/services -count=1` — passed (DB tests skipped without opt-in DSN).
- Disposable PostgreSQL 16: `go test ./internal/testsupport ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase106|TestPoint' -count=1 -v` — passed; disposable database removed.
- `go vet ./internal/testsupport ./internal/migrations ./internal/repository ./internal/services` — passed.
- `git diff --check` — passed before writing this report.
- Disposable PostgreSQL whitespace probe — reproduced the active finding (`tab_rule_count=1`, `tab_reason_count=1`); disposable database removed.

---

_Reviewed: 2026-07-22T21:53:54Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

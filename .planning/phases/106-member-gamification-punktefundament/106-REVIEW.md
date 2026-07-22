---
phase: 106-member-gamification-punktefundament
reviewed: 2026-07-22T21:22:37Z
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
  critical: 3
  warning: 4
  info: 0
  total: 7
status: issues_found
---

# Phase 106: Code Review Report

**Reviewed:** 2026-07-22T21:22:37Z
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

The Phase 106 foundation has three release-blocking correctness gaps in its core guarantees: `TRUNCATE` bypasses both append-only protections, direct SQL can persist a reversal without a reason, and retries with valid sub-microsecond timestamps are falsely rejected after PostgreSQL normalizes the persisted timestamp. The review also found unreliable migration tests and weaknesses in the disposable-database safety guard and immutable rule validation.

## Critical Issues

### CR-01: Append-only triggers allow complete ledger and rule deletion with TRUNCATE

**File:** `database/migrations/0131_member_point_foundation.up.sql:20-22,156-158`
**Issue:** Both immutability triggers cover only row-level `UPDATE OR DELETE`. PostgreSQL does not fire row-level DELETE triggers for `TRUNCATE`, so a role with table ownership or `TRUNCATE` privilege can execute `TRUNCATE point_ledger_entries, point_rules` and erase the entire audit history. This is a direct data-loss path through the database layer that is supposed to be the final append-only arbiter. The live tests exercise UPDATE and DELETE but never TRUNCATE.
**Fix:** Add statement-level `BEFORE TRUNCATE` triggers for both tables (or revoke `TRUNCATE` from every runtime role and test that privilege contract), and add a PostgreSQL test proving truncation is rejected.

```sql
CREATE TRIGGER point_rules_reject_truncate
BEFORE TRUNCATE ON point_rules
FOR EACH STATEMENT EXECUTE FUNCTION reject_point_rule_mutation();

CREATE TRIGGER point_ledger_reject_truncate
BEFORE TRUNCATE ON point_ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION guard_point_ledger_mutation();
```

The trigger functions must handle `TG_OP = 'TRUNCATE'`, and the Down migration must remove the new triggers.

### CR-02: A reversal with NULL reason passes the database constraint

**File:** `database/migrations/0131_member_point_foundation.up.sql:45-49`
**Issue:** `reversal_reason` is nullable, and the reversal branch checks only `btrim(reversal_reason) <> ''`. For NULL, that expression evaluates to NULL; PostgreSQL CHECK constraints accept both TRUE and NULL. The BEFORE INSERT trigger does not separately require a reason. Direct SQL can therefore append an otherwise valid reversal with `reversal_reason = NULL`, violating the mandatory audit-reason and repudiation contract. The live test covers whitespace but not NULL.
**Fix:** Make non-nullness explicit in the reversal branch and add a direct PostgreSQL regression test.

```sql
(entry_kind = 'reversal'
 AND reversal_of_entry_id IS NOT NULL
 AND reversal_reason IS NOT NULL
 AND btrim(reversal_reason) <> ''
 AND point_value < 0)
```

### CR-03: Identical retries fail for timestamps finer than PostgreSQL precision

**File:** `backend/internal/repository/point_ledger_repository.go:222-239`
**Issue:** Award and reversal retry comparisons use exact `time.Time.Equal` against the caller's original `EffectiveAt`. PostgreSQL stores `timestamptz` at microsecond precision, while Go accepts nanosecond precision. A first insert with, for example, non-zero sub-microsecond nanoseconds succeeds and returns the database-normalized timestamp; replaying the identical command then reaches the conflict path and compares that persisted value to the unnormalized input, producing `ErrConflict`. This breaks the promised identical-retry and lost-response behavior for valid Go timestamps. All current tests use timestamps with zero nanoseconds, so they cannot detect it.
**Fix:** Canonicalize `EffectiveAt` to PostgreSQL precision before both insertion and comparison, and test award and reversal retries with a timestamp containing sub-microsecond nanoseconds.

```go
func postgresTime(t time.Time) time.Time {
	return time.UnixMicro(t.UnixMicro()).UTC()
}

input.EffectiveAt = postgresTime(input.EffectiveAt)
```

Apply the same canonicalization consistently to `PointAwardInput` and `PointReversalInput`.

## Warnings

### WR-01: Award snapshot tests reject invalid SQL instead of exercising the trigger

**File:** `backend/internal/migrations/phase106_member_points_test.go:263-270`
**Issue:** `assertAwardMutationRejected` replaces the column name `point_value` with fragments such as `rule_code_snapshot = 'wrong'`. The resulting INSERT column list is syntactically invalid, so every case passes merely because PostgreSQL reports a syntax error. These tests do not prove that the rule-snapshot trigger rejects a valid INSERT with a wrong code, version, category, or value.
**Fix:** Build syntactically valid INSERT statements and mutate the corresponding VALUES expressions. Assert the expected trigger error/message or SQLSTATE so unrelated syntax/FK failures cannot satisfy the contract.

### WR-02: The public-schema guard misses destructive executable forms

**File:** `backend/internal/testsupport/phase106_postgres.go:19-22,140-143`
**Issue:** `publicTargetPattern` does not recognize schema operations or quoted identifiers. Inputs such as `DROP SCHEMA public CASCADE`, `ALTER SCHEMA public ...`, and `CREATE TABLE "public".x (...)` pass validation and are then executed by `ApplySQLFile`. The dedicated database limits blast radius, but the helper's claimed hard guard can still destroy or mutate its public schema.
**Fix:** Reject schema DDL and quoted public qualification explicitly, with tests for DROP/ALTER SCHEMA and `"public".` forms. Prefer a strict allowlist of the known Phase-106 object names over an incomplete denylist.

### WR-03: Fixture cleanup is registered after a fatal setup step

**File:** `backend/internal/testsupport/phase106_postgres.go:93-105`
**Issue:** `createPhase106Prerequisites` can call `t.Fatalf` before `t.Cleanup` is registered. Any setup failure at that point leaks both pools and the randomly created schema, making subsequent database tests less isolated and leaving disposable state behind.
**Fix:** Register cleanup immediately after the schema and scoped pool are successfully created, before running schema checks or prerequisite creation. Keep cleanup idempotent so early manual cleanup remains safe.

### WR-04: Immutable rule rows can be permanently unusable

**File:** `database/migrations/0131_member_point_foundation.up.sql:3-10`
**Issue:** `rule_code` is only `NOT NULL`; blank and surrounding-whitespace codes are accepted. The Go lookup trims the requested code and rejects blanks, while the database then forbids updating or deleting the inserted row. Direct catalog insertion can therefore create an unreachable permanent rule version such as `' work '` or `''`.
**Fix:** Enforce the same canonical rule-code contract in PostgreSQL.

```sql
rule_code TEXT NOT NULL
  CHECK (rule_code <> '' AND rule_code = btrim(rule_code))
```

Add migration and repository tests covering blank and surrounding-whitespace rule codes.

---

_Reviewed: 2026-07-22T21:22:37Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

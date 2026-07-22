---
phase: 106-member-gamification-punktefundament
reviewed: 2026-07-22T22:34:44Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/internal/testsupport/phase106_postgres.go
  - backend/internal/testsupport/phase106_postgres_test.go
  - backend/internal/migrations/phase106_member_points_test.go
  - database/migrations/0131_member_point_foundation.up.sql
  - database/migrations/0131_member_point_foundation.down.sql
  - database/migrations/0132_member_point_foundation_review_hardening.up.sql
  - database/migrations/0132_member_point_foundation_review_hardening.down.sql
  - database/migrations/0133_member_point_whitespace_hardening.up.sql
  - database/migrations/0133_member_point_whitespace_hardening.down.sql
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
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 106: Code Review Report

**Reviewed:** 2026-07-22T22:34:44Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Commit `7eb975cf` fixes the reported ASCII whitespace cases: disposable PostgreSQL 16 tests rejected TAB-, LF- and CRLF-only or padded `rule_code`, `source_type`, `source_key`, `idempotency_key`, and `reversal_reason` values. A clean database that had already applied the historical 0131/0132 migrations also accepted 0133 and enforced those checks.

The hardening is not complete, however. PostgreSQL 16 under the image's `C.UTF-8` locale does not classify U+00A0 NO-BREAK SPACE as `[[:space:]]`, so the final constraints still accept whitespace-only immutable identifiers and reversal reasons that Go rejects with `strings.TrimSpace`. In addition, 0133 cannot upgrade an allowed historical database state containing one of the values the old constraints admitted, and the edited historical migrations no longer form a consistent down-migration lineage.

## Prior Finding Re-verification

| Prior finding | Result | Evidence |
|---|---|---|
| CR-01 — ordinary-space-only constraints admitted TAB/LF/CRLF | Resolved for the reported ASCII cases | The focused PostgreSQL 16 suite passed every new TAB/LF/CRLF-only and padded case for all five fields. |
| CR-01 — database and Go whitespace contracts agree | Still incomplete | A direct PostgreSQL 16 insert probe against the current 0131 constraints returned `nbsp_accepted|1|1|1` for a U+00A0-only rule, award identifiers, and reversal reason. |
| 0133 clean historical upgrade | Pass | Historical pre-fix 0131 + 0132 followed by current 0133 rejected TAB/LF values in a disposable PostgreSQL 16 schema. |
| 0133 historical upgrade with formerly permitted data | Fail | Adding `chk_point_rules_rule_code_canonical` failed because a pre-0133 TAB-only rule violated the new validated constraint. |

## Critical Issues

### CR-01: Unicode whitespace-only values still bypass the database constraints

**Classification:** BLOCKER
**File:** `C:\Users\admin\Documents\Team4s\database\migrations\0133_member_point_whitespace_hardening.up.sql:6,17-19,27`
**Also affected:** `database/migrations/0131_member_point_foundation.up.sql:5,34-35,47,52`; `database/migrations/0132_member_point_foundation_review_hardening.up.sql:7,17-19,27`

**Issue:** The fix assumes PostgreSQL's POSIX `[[:space:]]` class matches Go's `strings.TrimSpace`. It does not under PostgreSQL 16's `C.UTF-8` locale: `U&'\00A0' ~ '[[:space:]]'` returned `false`. Direct inserts using only U+00A0 NO-BREAK SPACE therefore succeeded for `rule_code`, all three permanent ledger identifiers, and `reversal_reason` (`nbsp_accepted|1|1|1`). Go rejects the same value. This recreates the original integrity defect: an immutable rule can be unreachable through the application, idempotency/source identifiers can be meaningless, and a reversal can have no meaningful audit reason.

**Fix:** Define one explicit PostgreSQL whitespace set that matches Go's Unicode White Space handling and use it for both canonical and nonblank checks. For example, centralize the character set and require `value = btrim(value, <unicode-whitespace-set>) AND value <> ''` for canonical identifiers and `btrim(reversal_reason, <unicode-whitespace-set>) <> ''` for the reason. Include U+0085, U+00A0, U+1680, U+2000–U+200A, U+2028/U+2029, U+202F, U+205F, and U+3000 in addition to ASCII whitespace. Add live U+00A0-only and padded regression cases for all five fields.

### CR-02: 0133 cannot upgrade every schema state allowed by historical 0131/0132

**Classification:** BLOCKER
**File:** `C:\Users\admin\Documents\Team4s\database\migrations\0133_member_point_whitespace_hardening.up.sql:3-28`

**Issue:** Historical 0131/0132 allowed TAB/LF-only identifiers and reasons. 0133 immediately adds validated constraints, which scan existing rows. A disposable PostgreSQL 16 database built from the actual pre-fix migrations accepted a TAB-only immutable rule, then failed 0133 with `check constraint "chk_point_rules_rule_code_canonical" ... is violated by some row`. Thus an already-migrated database that exercised the defect cannot deploy the fix. The migration is transactional and fails closed, but it provides neither an explicit compatibility precondition nor an approved remediation path; immutable rule and ledger triggers also prevent ordinary correction of those rows.

**Fix:** Add a precondition that detects every incompatible row before replacing constraints and raises a precise error naming table, field, and remediation requirement. Then implement or document an approved data-remediation migration that preserves ledger semantics; do not silently trim or invent identifiers. Add two live upgrade fixtures using the historical migration text: one clean database that succeeds and one formerly valid dirty database that proves the chosen fail/repair contract.

## Warnings

### WR-01: Editing 0131/0132 makes the migration lineage inconsistent with 0133 down

**Classification:** WARNING
**File:** `C:\Users\admin\Documents\Team4s\database\migrations\0133_member_point_whitespace_hardening.down.sql:3-25`
**Also affected:** `database/migrations/0131_member_point_foundation.up.sql:5,34-35,47,52`; `database/migrations/0132_member_point_foundation_review_hardening.up.sql:3-28`; `database/migrations/0132_member_point_foundation_review_hardening.down.sql:7-22`

**Issue:** Project rules prohibit editing historical migrations. The commit nevertheless rewrites 0131/0132 to the strict predicates while 0133 down restores their old `btrim` predicates. Consequently, rolling a fresh install from version 133 back to version 132 does not produce the schema declared by the current 0132 up file. A live probe confirmed the strict predicates before 0133 down and then accepted a TAB-only rule, a TAB/LF-only source/idempotency tuple, and a CRLF-only reason afterward (`fresh_after_0133_down_accepts|1|1|1`). The existing Up/Down/Up test misses this because it asserts only the final re-up state.

**Fix:** Restore 0131 and 0132 to their committed historical contents and keep the whitespace correction solely in 0133. Then assert the exact constraint definitions after each migration boundary, not only after the final Up, so fresh installs and already-applied databases follow the same versioned lineage.

## Checks Executed

- Disposable PostgreSQL 16: `go test ./internal/testsupport ./internal/migrations ./internal/repository ./internal/services -run 'TestPhase106|TestPoint' -count=1 -v` — passed; container removed.
- Historical clean upgrade probe: pre-fix 0131 → pre-fix 0132 → current 0133 — passed and rejected TAB/LF test values; container removed.
- Historical dirty upgrade probe: pre-fix 0131/0132 with a TAB-only rule → current 0133 — failed on the new validated rule-code constraint; container removed.
- Fresh migration-boundary probe: current 0131 → 0132 → 0133 → 0133 down — constraint definitions regressed and TAB/LF/CRLF-only rows were accepted; container removed.
- Unicode whitespace probe: current 0131 accepted U+00A0-only rule/source/key/idempotency/reason values (`nbsp_accepted|1|1|1`); container removed.
- `go vet ./internal/testsupport ./internal/migrations ./internal/repository ./internal/services` — passed.
- `git diff --check 54b02e5518a2fd7bc0cfee368116ede00a7d313a..HEAD` for all 18 scoped files — passed.

---

_Reviewed: 2026-07-22T22:34:44Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_

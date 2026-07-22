BEGIN;

DROP TRIGGER IF EXISTS point_ledger_reject_truncate ON point_ledger_entries;
DROP TRIGGER IF EXISTS point_ledger_guard_mutation ON point_ledger_entries;
DROP TRIGGER IF EXISTS point_ledger_validate_insert ON point_ledger_entries;
DROP FUNCTION IF EXISTS guard_point_ledger_mutation();
DROP FUNCTION IF EXISTS validate_point_ledger_insert();
DROP INDEX IF EXISTS uq_point_ledger_direct_reversal;
DROP TABLE IF EXISTS point_ledger_entries;

DROP TRIGGER IF EXISTS point_rules_reject_truncate ON point_rules;
DROP TRIGGER IF EXISTS point_rules_immutable ON point_rules;
DROP FUNCTION IF EXISTS reject_point_rule_mutation();
DROP TABLE IF EXISTS point_rules;

COMMIT;

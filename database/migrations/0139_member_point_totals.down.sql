BEGIN;

DROP TRIGGER IF EXISTS member_point_totals_guard_direct_write ON member_point_totals;
DROP TRIGGER IF EXISTS point_ledger_apply_member_total ON point_ledger_entries;
DROP FUNCTION IF EXISTS guard_member_point_totals_mutation();
DROP FUNCTION IF EXISTS apply_point_ledger_entry_to_member_total();
DROP TABLE IF EXISTS member_point_totals;

COMMIT;

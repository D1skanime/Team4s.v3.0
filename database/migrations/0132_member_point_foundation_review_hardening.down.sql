BEGIN;

DROP TRIGGER IF EXISTS point_ledger_reject_truncate ON point_ledger_entries;
DROP FUNCTION IF EXISTS reject_point_ledger_truncate();

DROP TRIGGER IF EXISTS point_rules_reject_truncate ON point_rules;

ALTER TABLE point_ledger_entries
    DROP CONSTRAINT IF EXISTS chk_point_ledger_entry_shape;
ALTER TABLE point_ledger_entries
    ADD CONSTRAINT chk_point_ledger_entry_shape CHECK (
        (entry_kind = 'award' AND reversal_of_entry_id IS NULL AND reversal_reason IS NULL AND point_value > 0)
        OR
        (entry_kind = 'reversal' AND reversal_of_entry_id IS NOT NULL AND btrim(reversal_reason) <> '' AND point_value < 0)
    );

ALTER TABLE point_rules
    DROP CONSTRAINT IF EXISTS chk_point_rules_rule_code_canonical;

COMMIT;

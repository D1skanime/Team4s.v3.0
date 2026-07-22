BEGIN;

ALTER TABLE point_rules
    DROP CONSTRAINT IF EXISTS chk_point_rules_rule_code_canonical;
ALTER TABLE point_rules
    ADD CONSTRAINT chk_point_rules_rule_code_canonical
    CHECK (rule_code <> '' AND rule_code = btrim(rule_code));

ALTER TABLE point_ledger_entries
    DROP CONSTRAINT IF EXISTS chk_point_ledger_entry_shape;
ALTER TABLE point_ledger_entries
    ADD CONSTRAINT chk_point_ledger_entry_shape CHECK (
        (entry_kind = 'award' AND reversal_of_entry_id IS NULL AND reversal_reason IS NULL AND point_value > 0)
        OR
        (entry_kind = 'reversal' AND reversal_of_entry_id IS NOT NULL AND reversal_reason IS NOT NULL AND btrim(reversal_reason) <> '' AND point_value < 0)
    );

DROP TRIGGER IF EXISTS point_rules_reject_truncate ON point_rules;
CREATE TRIGGER point_rules_reject_truncate
BEFORE TRUNCATE ON point_rules
FOR EACH STATEMENT EXECUTE FUNCTION reject_point_rule_mutation();

CREATE FUNCTION reject_point_ledger_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'point ledger is append-only';
END;
$$;

DROP TRIGGER IF EXISTS point_ledger_reject_truncate ON point_ledger_entries;
CREATE TRIGGER point_ledger_reject_truncate
BEFORE TRUNCATE ON point_ledger_entries
FOR EACH STATEMENT EXECUTE FUNCTION reject_point_ledger_truncate();

COMMIT;

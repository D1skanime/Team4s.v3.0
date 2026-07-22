BEGIN;

ALTER TABLE point_ledger_entries
    DROP CONSTRAINT IF EXISTS chk_point_ledger_source_type_canonical,
    DROP CONSTRAINT IF EXISTS chk_point_ledger_source_key_canonical,
    DROP CONSTRAINT IF EXISTS chk_point_ledger_idempotency_key_canonical;
ALTER TABLE point_ledger_entries
    ADD CONSTRAINT point_ledger_entries_source_type_check CHECK (btrim(source_type) <> ''),
    ADD CONSTRAINT point_ledger_entries_source_key_check CHECK (btrim(source_key) <> ''),
    ADD CONSTRAINT point_ledger_entries_idempotency_key_check CHECK (btrim(idempotency_key) <> '');

ALTER TABLE point_ledger_entries
    DROP CONSTRAINT IF EXISTS chk_point_ledger_entry_shape;
ALTER TABLE point_ledger_entries
    ADD CONSTRAINT chk_point_ledger_entry_shape CHECK (
        (entry_kind = 'award' AND reversal_of_entry_id IS NULL AND reversal_reason IS NULL AND point_value > 0)
        OR
        (entry_kind = 'reversal' AND reversal_of_entry_id IS NOT NULL AND reversal_reason IS NOT NULL AND btrim(reversal_reason) <> '' AND point_value < 0)
    );

ALTER TABLE point_rules
    DROP CONSTRAINT IF EXISTS chk_point_rules_rule_code_canonical;
ALTER TABLE point_rules
    ADD CONSTRAINT chk_point_rules_rule_code_canonical
    CHECK (rule_code <> '' AND rule_code = btrim(rule_code));

COMMIT;

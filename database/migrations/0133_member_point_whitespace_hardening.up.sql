BEGIN;

CREATE FUNCTION phase106_trim_unicode_whitespace(value TEXT) RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
    SELECT btrim(
        value,
        U&'\0009\000A\000B\000C\000D\0020\0085\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000'
    )
$$;

DO $$
DECLARE
    incompatible_fields TEXT;
BEGIN
    SELECT string_agg(field_name, ', ' ORDER BY field_name)
    INTO incompatible_fields
    FROM (
        SELECT 'point_rules.rule_code' AS field_name
        WHERE EXISTS (
            SELECT 1 FROM point_rules
            WHERE rule_code = '' OR rule_code <> phase106_trim_unicode_whitespace(rule_code)
        )
        UNION ALL
        SELECT 'point_ledger_entries.source_type'
        WHERE EXISTS (
            SELECT 1 FROM point_ledger_entries
            WHERE source_type = '' OR source_type <> phase106_trim_unicode_whitespace(source_type)
        )
        UNION ALL
        SELECT 'point_ledger_entries.source_key'
        WHERE EXISTS (
            SELECT 1 FROM point_ledger_entries
            WHERE source_key = '' OR source_key <> phase106_trim_unicode_whitespace(source_key)
        )
        UNION ALL
        SELECT 'point_ledger_entries.idempotency_key'
        WHERE EXISTS (
            SELECT 1 FROM point_ledger_entries
            WHERE idempotency_key = '' OR idempotency_key <> phase106_trim_unicode_whitespace(idempotency_key)
        )
        UNION ALL
        SELECT 'point_ledger_entries.reversal_reason'
        WHERE EXISTS (
            SELECT 1 FROM point_ledger_entries
            WHERE reversal_reason IS NOT NULL
              AND phase106_trim_unicode_whitespace(reversal_reason) = ''
        )
    ) AS incompatible;

    IF incompatible_fields IS NOT NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'check_violation',
            MESSAGE = '0133 incompatible historical data in ' || incompatible_fields || '; approved remediation is required before retry; do not silently trim or invent identifiers or reversal reasons',
            DETAIL = 'The named table fields contain empty, Unicode-whitespace-only, or leading/trailing Unicode-whitespace values that violate the new point-field contract.',
            HINT = 'Remediate the identified rows with an approved data migration that preserves immutable point-rule and ledger identity; do not silently trim or invent identifiers or reversal reasons.';
    END IF;
END;
$$;

ALTER TABLE point_rules
    DROP CONSTRAINT IF EXISTS chk_point_rules_rule_code_canonical;
ALTER TABLE point_rules
    ADD CONSTRAINT chk_point_rules_rule_code_canonical
    CHECK (rule_code <> '' AND rule_code = phase106_trim_unicode_whitespace(rule_code));

ALTER TABLE point_ledger_entries
    DROP CONSTRAINT IF EXISTS point_ledger_entries_source_type_check,
    DROP CONSTRAINT IF EXISTS point_ledger_entries_source_key_check,
    DROP CONSTRAINT IF EXISTS point_ledger_entries_idempotency_key_check,
    DROP CONSTRAINT IF EXISTS chk_point_ledger_source_type_canonical,
    DROP CONSTRAINT IF EXISTS chk_point_ledger_source_key_canonical,
    DROP CONSTRAINT IF EXISTS chk_point_ledger_idempotency_key_canonical;
ALTER TABLE point_ledger_entries
    ADD CONSTRAINT chk_point_ledger_source_type_canonical CHECK (source_type <> '' AND source_type = phase106_trim_unicode_whitespace(source_type)),
    ADD CONSTRAINT chk_point_ledger_source_key_canonical CHECK (source_key <> '' AND source_key = phase106_trim_unicode_whitespace(source_key)),
    ADD CONSTRAINT chk_point_ledger_idempotency_key_canonical CHECK (idempotency_key <> '' AND idempotency_key = phase106_trim_unicode_whitespace(idempotency_key));

ALTER TABLE point_ledger_entries
    DROP CONSTRAINT IF EXISTS chk_point_ledger_entry_shape;
ALTER TABLE point_ledger_entries
    ADD CONSTRAINT chk_point_ledger_entry_shape CHECK (
        (entry_kind = 'award' AND reversal_of_entry_id IS NULL AND reversal_reason IS NULL AND point_value > 0)
        OR
        (entry_kind = 'reversal' AND reversal_of_entry_id IS NOT NULL AND reversal_reason IS NOT NULL AND phase106_trim_unicode_whitespace(reversal_reason) <> '' AND point_value < 0)
    );

COMMIT;

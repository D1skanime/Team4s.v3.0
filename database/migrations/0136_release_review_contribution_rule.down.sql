BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM point_rules rule
        JOIN point_ledger_entries entry ON entry.rule_id = rule.id
        WHERE rule.rule_code = 'release.contribution'
          AND rule.rule_version = 1
    ) THEN
        RAISE EXCEPTION '0136 release contribution rule contains ledger history and cannot be removed';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'release.contribution'
          AND rule_version = 1
          AND (
              category <> 'platform_contribution'
              OR point_value <> 1
          )
    ) THEN
        RAISE EXCEPTION '0136 release.contribution version 1 no longer matches its seeded contract';
    END IF;
END;
$$;

ALTER TABLE review_foundation_seed_ownership
    DISABLE TRIGGER review_foundation_seed_ownership_guard_mutation;
ALTER TABLE point_rules DISABLE TRIGGER point_rules_immutable;

DELETE FROM point_rules
WHERE rule_code = 'release.contribution'
  AND rule_version = 1
  AND category = 'platform_contribution'
  AND point_value = 1
  AND EXISTS (
      SELECT 1
      FROM review_foundation_seed_ownership owned
      WHERE owned.seed_kind = 'point_rule'
        AND owned.seed_key = 'release.contribution|1'
        AND owned.created_by_migration
  );

DELETE FROM review_foundation_seed_ownership
WHERE seed_kind = 'point_rule'
  AND seed_key = 'release.contribution|1';

ALTER TABLE point_rules ENABLE TRIGGER point_rules_immutable;
ALTER TABLE review_foundation_seed_ownership
    ENABLE TRIGGER review_foundation_seed_ownership_guard_mutation;

COMMIT;

BEGIN;

DO $$
BEGIN
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
        RAISE EXCEPTION 'release.contribution version 1 conflicts with the required platform_contribution point value 1';
    END IF;
END;
$$;

INSERT INTO review_foundation_seed_ownership (
    seed_kind,
    seed_key,
    created_by_migration
)
VALUES (
    'point_rule',
    'release.contribution|1',
    NOT EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'release.contribution'
          AND rule_version = 1
    )
);

INSERT INTO point_rules (rule_code, rule_version, category, point_value)
VALUES ('release.contribution', 1, 'platform_contribution', 1)
ON CONFLICT (rule_code, rule_version) DO NOTHING;

COMMIT;

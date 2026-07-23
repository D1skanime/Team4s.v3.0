BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM fansub_group_member_review_capabilities)
       OR EXISTS (SELECT 1 FROM review_decisions)
       OR EXISTS (SELECT 1 FROM review_audit_events)
       OR EXISTS (SELECT 1 FROM review_reason_texts)
       OR EXISTS (SELECT 1 FROM review_credit_slots)
       OR EXISTS (
           SELECT 1
           FROM point_ledger_entries ple
           JOIN point_rules pr ON pr.id = ple.rule_id
           WHERE pr.rule_code = 'review.decision'
             AND pr.rule_version = 1
       ) THEN
        RAISE EXCEPTION '0134 review foundation contains history and cannot be removed';
    END IF;

    IF (
        SELECT count(*)
        FROM review_foundation_seed_ownership
    ) <> 7
       OR EXISTS (
           SELECT 1
           FROM (
               VALUES
                   ('action_definition', 'review.text.decide'),
                   ('action_definition', 'review.image.decide'),
                   ('action_definition', 'review.contribution.decide'),
                   ('role_capability', 'fansub_lead|review.text.decide'),
                   ('role_capability', 'fansub_lead|review.image.decide'),
                   ('role_capability', 'fansub_lead|review.contribution.decide'),
                   ('point_rule', 'review.decision|1')
           ) AS expected(seed_kind, seed_key)
           WHERE NOT EXISTS (
               SELECT 1
               FROM review_foundation_seed_ownership actual
               WHERE actual.seed_kind = expected.seed_kind
                 AND actual.seed_key = expected.seed_key
           )
       ) THEN
        RAISE EXCEPTION '0134 seed ownership proof is incomplete';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM point_rules
        WHERE rule_code = 'review.decision'
          AND rule_version = 1
          AND (
              category <> 'platform_contribution'
              OR point_value <> 1
          )
    ) THEN
        RAISE EXCEPTION '0134 review.decision version 1 no longer matches its seeded contract';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM role_capabilities rc
        JOIN review_foundation_seed_ownership owned
          ON owned.seed_kind = 'action_definition'
         AND owned.seed_key = rc.action_code
         AND owned.created_by_migration
        WHERE rc.role_code <> 'fansub_lead'
    ) THEN
        RAISE EXCEPTION '0134-created review actions are used by additional roles';
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS review_reason_texts_guard_update ON review_reason_texts;
DROP TRIGGER IF EXISTS review_reason_texts_reject_truncate ON review_reason_texts;
DROP TRIGGER IF EXISTS review_reason_texts_validate_contract ON review_reason_texts;
DROP TRIGGER IF EXISTS review_audit_events_validate_contract ON review_audit_events;
DROP TRIGGER IF EXISTS review_audit_events_guard_mutation ON review_audit_events;
DROP TRIGGER IF EXISTS review_audit_events_reject_truncate ON review_audit_events;
DROP TRIGGER IF EXISTS review_credit_slots_validate_contract ON review_credit_slots;
DROP TRIGGER IF EXISTS review_credit_slots_guard_mutation ON review_credit_slots;
DROP TRIGGER IF EXISTS review_credit_slots_reject_truncate ON review_credit_slots;
DROP TRIGGER IF EXISTS review_decisions_guard_mutation ON review_decisions;
DROP TRIGGER IF EXISTS review_decisions_reject_truncate ON review_decisions;
DROP TRIGGER IF EXISTS review_foundation_seed_ownership_guard_mutation ON review_foundation_seed_ownership;
DROP TRIGGER IF EXISTS review_foundation_seed_ownership_reject_truncate ON review_foundation_seed_ownership;

DROP FUNCTION IF EXISTS reject_review_reason_update();
DROP FUNCTION IF EXISTS reject_review_reason_truncate();
DROP FUNCTION IF EXISTS validate_review_reason_contract();
DROP FUNCTION IF EXISTS validate_review_audit_event_contract();
DROP FUNCTION IF EXISTS validate_review_credit_slot_contract();
DROP FUNCTION IF EXISTS reject_review_append_only_mutation();
DROP FUNCTION IF EXISTS reject_review_append_only_truncate();

DROP TABLE IF EXISTS review_reason_texts;
DROP TABLE IF EXISTS review_audit_events;
DROP TABLE IF EXISTS review_credit_slots;
DROP TABLE IF EXISTS review_decisions;
DROP TABLE IF EXISTS fansub_group_member_review_capabilities;

DELETE FROM role_capabilities
WHERE role_code = 'fansub_lead'
  AND EXISTS (
      SELECT 1
      FROM review_foundation_seed_ownership owned
      WHERE owned.seed_kind = 'role_capability'
        AND owned.seed_key = 'fansub_lead|' || role_capabilities.action_code
        AND owned.created_by_migration
  );

DELETE FROM action_definitions
WHERE EXISTS (
    SELECT 1
    FROM review_foundation_seed_ownership owned
    WHERE owned.seed_kind = 'action_definition'
      AND owned.seed_key = action_definitions.code
      AND owned.created_by_migration
);

ALTER TABLE point_rules DISABLE TRIGGER point_rules_immutable;
DELETE FROM point_rules
WHERE rule_code = 'review.decision'
  AND rule_version = 1
  AND category = 'platform_contribution'
  AND point_value = 1
  AND EXISTS (
      SELECT 1
      FROM review_foundation_seed_ownership owned
      WHERE owned.seed_kind = 'point_rule'
        AND owned.seed_key = 'review.decision|1'
        AND owned.created_by_migration
  );
ALTER TABLE point_rules ENABLE TRIGGER point_rules_immutable;

DROP TABLE IF EXISTS review_foundation_seed_ownership;

COMMIT;

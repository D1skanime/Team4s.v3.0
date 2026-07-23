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
END;
$$;

DROP TRIGGER IF EXISTS review_reason_texts_guard_update ON review_reason_texts;
DROP TRIGGER IF EXISTS review_reason_texts_reject_truncate ON review_reason_texts;
DROP TRIGGER IF EXISTS review_audit_events_guard_mutation ON review_audit_events;
DROP TRIGGER IF EXISTS review_audit_events_reject_truncate ON review_audit_events;
DROP TRIGGER IF EXISTS review_credit_slots_guard_mutation ON review_credit_slots;
DROP TRIGGER IF EXISTS review_credit_slots_reject_truncate ON review_credit_slots;
DROP TRIGGER IF EXISTS review_decisions_guard_mutation ON review_decisions;
DROP TRIGGER IF EXISTS review_decisions_reject_truncate ON review_decisions;

DROP FUNCTION IF EXISTS reject_review_reason_update();
DROP FUNCTION IF EXISTS reject_review_reason_truncate();
DROP FUNCTION IF EXISTS reject_review_append_only_mutation();
DROP FUNCTION IF EXISTS reject_review_append_only_truncate();

DROP TABLE IF EXISTS review_reason_texts;
DROP TABLE IF EXISTS review_audit_events;
DROP TABLE IF EXISTS review_credit_slots;
DROP TABLE IF EXISTS review_decisions;
DROP TABLE IF EXISTS fansub_group_member_review_capabilities;

DELETE FROM role_capabilities
WHERE role_code = 'fansub_lead'
  AND action_code IN (
      'review.text.decide',
      'review.image.decide',
      'review.contribution.decide'
  );

DELETE FROM action_definitions
WHERE code IN (
    'review.text.decide',
    'review.image.decide',
    'review.contribution.decide'
);

ALTER TABLE point_rules DISABLE TRIGGER point_rules_immutable;
DELETE FROM point_rules
WHERE rule_code = 'review.decision'
  AND rule_version = 1
  AND category = 'platform_contribution'
  AND point_value = 1;
ALTER TABLE point_rules ENABLE TRIGGER point_rules_immutable;

COMMIT;

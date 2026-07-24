BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM release_role_credit_lifecycles)
       OR EXISTS (SELECT 1 FROM project_note_credit_lifecycles)
       OR EXISTS (
            SELECT 1
            FROM point_ledger_entries entry
            JOIN point_rules rule ON rule.id = entry.rule_id
            WHERE rule.rule_version = 1
              AND rule.rule_code IN (
                  'release_role_work',
                  'project_text_first_author'
              )
       ) THEN
        RAISE EXCEPTION '0137 contribution source rollback refused: durable credit lifecycle or ledger history exists';
    END IF;
END;
$$;

DROP TABLE project_note_credit_lifecycles;
DROP TABLE release_role_credit_lifecycles;
DROP TABLE release_crew_snapshots;

ALTER TABLE point_rules DISABLE TRIGGER point_rules_immutable;

DELETE FROM point_rules
WHERE rule_version = 1
  AND (
      (rule_code = 'release_role_work'
          AND category = 'fansub_work'
          AND point_value = 1)
      OR
      (rule_code = 'project_text_first_author'
          AND category = 'platform_contribution'
          AND point_value = 5)
  );

ALTER TABLE point_rules ENABLE TRIGGER point_rules_immutable;

COMMIT;

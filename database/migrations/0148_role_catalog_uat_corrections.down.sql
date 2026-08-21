-- Migration 0148 rollback: restore the pre-UAT-correction catalog state.

BEGIN;

UPDATE role_definitions AS role
SET contexts = backup.contexts,
    assignable = backup.assignable
FROM migration_0148_role_catalog_backup AS backup
WHERE backup.role_code = role.code;

INSERT INTO contributor_roles (name, label, description)
SELECT 'karaoke_fx', contributor_label, contributor_description
FROM migration_0148_role_catalog_backup
WHERE role_code = '__contributor_role_karaoke_fx__'
  AND contributor_existed
ON CONFLICT (name) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;

DELETE FROM contributor_roles
WHERE name = 'karaoke_fx'
  AND EXISTS (
      SELECT 1
      FROM migration_0148_role_catalog_backup
      WHERE role_code = '__contributor_role_karaoke_fx__'
        AND NOT contributor_existed
  );

DROP TABLE migration_0148_role_catalog_backup;

COMMIT;

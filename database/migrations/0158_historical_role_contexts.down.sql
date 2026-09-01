-- Revert the historical-catalog contexts introduced by migration 0158.
BEGIN;

UPDATE role_definitions AS role
SET contexts = backup.contexts
FROM migration_0158_historical_role_context_backup AS backup
WHERE backup.role_code = role.code;

DROP TABLE migration_0158_historical_role_context_backup;

COMMIT;

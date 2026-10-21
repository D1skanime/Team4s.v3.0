-- Migration 0186 rollback: setzt role_definitions.label_de fuer 'editor' zurueck auf 'Edit'.
BEGIN;
UPDATE role_definitions SET label_de = 'Edit' WHERE code = 'editor';
COMMIT;

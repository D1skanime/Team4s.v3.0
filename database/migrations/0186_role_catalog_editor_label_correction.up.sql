-- Migration 0186: korrigiert role_definitions.label_de fuer 'editor' von 'Edit' auf 'Editing'.
BEGIN;
UPDATE role_definitions SET label_de = 'Editing' WHERE code = 'editor';
COMMIT;

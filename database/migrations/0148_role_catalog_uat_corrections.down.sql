-- Migration 0148 rollback: restore the pre-UAT-correction catalog state.

BEGIN;

DELETE FROM contributor_roles
WHERE name = 'karaoke_fx';

UPDATE role_definitions
SET contexts = array_remove(contexts, 'fansub_group'),
    assignable = false
WHERE code IN (
    'translator', 'editor', 'timer', 'typesetter', 'encoder',
    'raw_provider', 'quality_checker', 'designer'
);

COMMIT;

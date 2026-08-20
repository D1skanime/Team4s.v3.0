-- Migration 0147 rollback: restore the pre-correction artwork semantic.

UPDATE role_definitions
SET icon_key = 'other'
WHERE code IN (
    'translator', 'editor', 'timer', 'typesetter', 'encoder',
    'raw_provider', 'quality_checker', 'project_lead', 'designer',
    'admin', 'other'
);

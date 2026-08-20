-- Migration 0147: converge established contribution-role artwork metadata.
--
-- Some disposable runtimes applied 0146 before its icon-key correction was
-- present. This migration repairs that recorded state without rewriting
-- already-applied migration history.

UPDATE role_definitions
SET icon_key = 'user'
WHERE code IN (
    'translator', 'editor', 'timer', 'typesetter', 'encoder',
    'raw_provider', 'quality_checker', 'project_lead', 'designer',
    'admin', 'other'
);

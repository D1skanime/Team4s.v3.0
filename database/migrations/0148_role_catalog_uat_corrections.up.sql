-- Migration 0148: correct UAT-visible role assignment metadata and the
-- FK-backed legacy note-role identity seam without granting capabilities.

BEGIN;

UPDATE role_definitions
SET contexts = CASE
        WHEN 'fansub_group' = ANY(contexts) THEN contexts
        ELSE array_append(contexts, 'fansub_group')
    END,
    assignable = true
WHERE code IN (
    'translator', 'editor', 'timer', 'typesetter', 'encoder',
    'raw_provider', 'quality_checker', 'designer'
);

UPDATE role_definitions
SET contexts = array_remove(contexts, 'fansub_group'),
    assignable = false
WHERE code IN ('admin', 'other');

INSERT INTO contributor_roles (name, label, description)
VALUES (
    'karaoke_fx',
    'Karaoke-FX',
    'Schreibe kurz, was du bei Karaoke-Effekten, Animationen und visueller Songgestaltung umgesetzt hast.'
)
ON CONFLICT (name) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description;

COMMIT;

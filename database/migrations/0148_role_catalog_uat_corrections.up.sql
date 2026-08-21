-- Migration 0148: correct UAT-visible role assignment metadata and the
-- FK-backed legacy note-role identity seam without granting capabilities.

BEGIN;

-- Preserve the exact 0147-era state so Down can restore deployments that
-- already customized these catalog rows or carried a legacy karaoke_fx role.
CREATE TABLE migration_0148_role_catalog_backup (
    role_code TEXT PRIMARY KEY,
    contexts TEXT[],
    assignable BOOLEAN,
    contributor_existed BOOLEAN,
    contributor_label VARCHAR(100),
    contributor_description TEXT
);

INSERT INTO migration_0148_role_catalog_backup (role_code, contexts, assignable)
SELECT code, contexts, assignable
FROM role_definitions
WHERE code IN (
    'translator', 'editor', 'timer', 'typesetter', 'encoder',
    'raw_provider', 'quality_checker', 'designer', 'admin', 'other'
)
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO migration_0148_role_catalog_backup (
    role_code,
    contributor_existed,
    contributor_label,
    contributor_description
)
SELECT
    '__contributor_role_karaoke_fx__',
    EXISTS (SELECT 1 FROM contributor_roles WHERE name = 'karaoke_fx'),
    (SELECT label FROM contributor_roles WHERE name = 'karaoke_fx'),
    (SELECT description FROM contributor_roles WHERE name = 'karaoke_fx')
ON CONFLICT (role_code) DO NOTHING;

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

-- Migration 0149: make role_definitions the sole label and palette authority.
BEGIN;
ALTER TABLE role_definitions DROP CONSTRAINT chk_role_definitions_color_key;
ALTER TABLE role_definitions ADD CONSTRAINT chk_role_definitions_color_key CHECK (color_key ~ '^#[0-9A-F]{6}$' OR color_key ~ '^[a-z0-9_]+$');
UPDATE role_definitions AS rd
SET label_de = metadata.label_de, color_key = metadata.color_key
FROM (VALUES
 ('fansub_lead', 'Fansub-Leitung', '#183B7C'), ('founder', 'Gründer', '#8C4A16'),
 ('co_leader', 'Co-Leitung', '#0F766E'), ('techadmin', 'Technik-Admin', '#475569'),
 ('gfxler', 'GFX', '#7E22CE'), ('project_lead', 'Projektleitung', '#0369A1'),
 ('translator', 'Übersetzung', '#27664F'), ('editor', 'Edit', '#6D3F83'),
 ('timer', 'Timing', '#C26A2E'), ('typesetter', 'Typesetting', '#7B3C4E'),
 ('karaoke_fx', 'Karaoke-FX', '#A16207'), ('encoder', 'Encoding', '#506B91'),
 ('raw_provider', 'Raw-Bereitstellung', '#A04444'), ('quality_checker', 'Qualitätsprüfung', '#6B7F2A'),
 ('designer', 'Design', '#B23A78')
) AS metadata(code, label_de, color_key)
WHERE rd.code = metadata.code;
COMMIT;

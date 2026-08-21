-- Migration 0149 rollback: restore exact 0148-era role catalog metadata.
BEGIN;
UPDATE role_definitions AS rd SET label_de = metadata.label_de, color_key = metadata.color_key
FROM (VALUES
 ('fansub_lead', 'Fansub-Leitung', 'other', '#183B7C'), ('founder', 'Gründer', 'other', '#8C4A16'),
 ('co_leader', 'Co-Leitung', 'other', '#0F766E'), ('techadmin', 'Technik-Admin', 'other', '#475569'),
 ('gfxler', 'GFX', 'other', '#7E22CE'), ('project_lead', 'Projektleitung', 'other', '#0369A1'),
 ('translator', 'Übersetzung', 'other', '#27664F'), ('editor', 'Edit', 'other', '#6D3F83'),
 ('timer', 'Timing', 'other', '#C26A2E'), ('typesetter', 'Typesetting / FX', 'other', '#7B3C4E'),
 ('karaoke_fx', 'Karaoke-FX', 'creative', '#A16207'), ('encoder', 'Encoding', 'other', '#506B91'),
 ('raw_provider', 'Raw-Bereitstellung', 'other', '#A04444'), ('quality_checker', 'Qualitätsprüfung', 'other', '#6B7F2A'),
 ('designer', 'Design', 'other', '#B23A78')
) AS metadata(code, label_de, color_key, corrected_color_key)
WHERE rd.code = metadata.code;
ALTER TABLE role_definitions DROP CONSTRAINT chk_role_definitions_color_key;
ALTER TABLE role_definitions ADD CONSTRAINT chk_role_definitions_color_key CHECK (color_key ~ '^[a-z0-9_]+$');
COMMIT;

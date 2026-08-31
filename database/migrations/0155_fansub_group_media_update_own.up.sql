-- Migration 0155: Every active fansub role may describe its own group-media upload.
-- Broad fansub_group_media.update remains required for review, visibility, category,
-- ordering and editing another member's media.
BEGIN;

INSERT INTO action_definitions (code, label_de, category, sort_order)
VALUES ('fansub_group_media.update_own', 'Eigene Gruppenmedien beschreiben', 'gruppe', 125)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code)
SELECT code, 'fansub_group_media.update_own'
FROM role_definitions
WHERE assignable = TRUE
  AND contexts @> ARRAY['fansub_group']::TEXT[]
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;

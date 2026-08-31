BEGIN;

INSERT INTO action_definitions (code, label_de, category, sort_order)
VALUES (
    'anime_fansub_project.timeline.update',
    'Projektzeitraum bearbeiten',
    'veroeffentlichungen',
    235
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code)
VALUES ('project_lead', 'anime_fansub_project.timeline.update')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;

-- Migration 0116: Split historical member management capabilities from generic member management.
-- Historical role definitions remain non-permission-bearing; these actions are granted only
-- through active/capability-bearing roles such as fansub_lead.

BEGIN;

INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('fansub_group.historical_members.manage', 'Historische Mitglieder verwalten', 'gruppe', 42),
    ('fansub_group.historical_roles.manage',   'Historische Rollen verwalten',      'gruppe', 44),
    ('fansub_group.historical_members.link',   'Historische Mitglieder verknüpfen', 'gruppe', 46)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('fansub_lead', 'fansub_group.historical_members.manage'),
    ('fansub_lead', 'fansub_group.historical_roles.manage'),
    ('fansub_lead', 'fansub_group.historical_members.link')
ON CONFLICT DO NOTHING;

COMMIT;

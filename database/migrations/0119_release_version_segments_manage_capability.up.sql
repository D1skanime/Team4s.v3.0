-- Migration 0119: Release-Version-Segmente als eigene vergebbare Capability.
-- Erlaubt berechtigten Gruppenrollen, OP/ED/Insert/Outro-Timings fuer eigene Release-Versionen zu pflegen.

INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('release_version.segments.manage', 'OP/ED-Segmente verwalten', 'release', 85)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

INSERT INTO role_capabilities (role_code, action_code) VALUES
    ('fansub_lead', 'release_version.segments.manage'),
    ('project_lead', 'release_version.segments.manage'),
    ('timer', 'release_version.segments.manage')
ON CONFLICT DO NOTHING;

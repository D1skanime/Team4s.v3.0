-- Migration 0173: make all-member release-note visibility an assignable capability.

BEGIN;

INSERT INTO action_definitions (
    code, label_de, category, sort_order, description_de, help_text_de, user_overridable
) VALUES (
    'release_version.notes.view_all',
    'Alle Release-Notizen anzeigen',
    'veroeffentlichungen',
    260,
    'Alle Notizen einer Release-Version unabhängig vom Mitglied anzeigen.',
    'Standardmäßig nur für die Fansub-Leitung. Kann über die Rollenverwaltung weiteren Rollen gegeben werden.',
    true
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de,
    user_overridable = EXCLUDED.user_overridable;

INSERT INTO role_capabilities (role_code, action_code)
VALUES ('fansub_lead', 'release_version.notes.view_all')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;

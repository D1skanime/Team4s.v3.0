-- Migration 0085: role_definitions lookup table with seed data.
-- Also retrofits FK from hist_group_member_roles.role_code → role_definitions(code).

-- Schritt 1: role_definitions anlegen
CREATE TABLE IF NOT EXISTS role_definitions (
    code       TEXT PRIMARY KEY,
    label_de   TEXT NOT NULL,
    contexts   TEXT[] NOT NULL DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0
);

-- Schritt 2: Operative Rollen (contexts = anime_contribution)
INSERT INTO role_definitions (code, label_de, contexts, sort_order) VALUES
    ('translator',      'Übersetzung',        ARRAY['anime_contribution'], 10),
    ('editor',          'Editing',            ARRAY['anime_contribution'], 20),
    ('timer',           'Timing',             ARRAY['anime_contribution'], 30),
    ('typesetter',      'Typesetting / FX',   ARRAY['anime_contribution'], 40),
    ('encoder',         'Encoding',           ARRAY['anime_contribution'], 50),
    ('raw_provider',    'Raw-Bereitstellung', ARRAY['anime_contribution'], 60),
    ('quality_checker', 'Qualitätsprüfung',   ARRAY['anime_contribution'], 70),
    ('project_lead',    'Projektleitung',     ARRAY['anime_contribution', 'group_history'], 80),
    ('designer',        'Design',             ARRAY['anime_contribution'], 90),
    ('admin',           'Administration',     ARRAY['anime_contribution'], 100),
    ('other',           'Sonstiges',          ARRAY['anime_contribution'], 110)
ON CONFLICT (code) DO UPDATE SET
    label_de   = EXCLUDED.label_de,
    contexts   = EXCLUDED.contexts,
    sort_order = EXCLUDED.sort_order;

-- Schritt 3: Historische Gruppenrollen (contexts = group_history)
INSERT INTO role_definitions (code, label_de, contexts, sort_order) VALUES
    ('founder',         'Gründer/in',        ARRAY['group_history'],                     1),
    ('leader',          'Gruppenleitung',     ARRAY['group_history'],                     2),
    ('co_leader',       'Co-Leitung',         ARRAY['group_history'],                     3),
    ('project_manager', 'Projektmanagement',  ARRAY['group_history', 'anime_contribution'], 75)
ON CONFLICT (code) DO UPDATE SET
    label_de   = EXCLUDED.label_de,
    contexts   = EXCLUDED.contexts,
    sort_order = EXCLUDED.sort_order;

-- Schritt 4: FK role_code → role_definitions(code) in hist_group_member_roles nachrüsten
ALTER TABLE hist_group_member_roles
    ADD CONSTRAINT fk_hist_group_member_roles_role_code
    FOREIGN KEY (role_code) REFERENCES role_definitions(code) ON DELETE RESTRICT;

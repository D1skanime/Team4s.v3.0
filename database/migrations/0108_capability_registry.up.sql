-- Migration 0108: Capability-Registry — action_definitions + role_capabilities.
-- Legt Tabellen und Seed aus der Go-roleMatrix (behavior-preserving, D-01/D-02/D-03) an.
-- Abhängigkeiten: 0085/0100 (role_definitions für fansub_lead und alle anderen Rollen)

BEGIN;

-- Schritt 1: action_definitions anlegen (D-01)
CREATE TABLE IF NOT EXISTS action_definitions (
    code       TEXT PRIMARY KEY,
    label_de   TEXT NOT NULL,
    category   TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

-- Schritt 2: role_capabilities anlegen (D-02)
-- FK ON DELETE CASCADE: wird role_definitions- oder action_definitions-Zeile gelöscht,
-- fallen zugehörige role_capabilities-Zeilen automatisch weg.
CREATE TABLE IF NOT EXISTS role_capabilities (
    role_code   TEXT NOT NULL REFERENCES role_definitions(code) ON DELETE CASCADE,
    action_code TEXT NOT NULL REFERENCES action_definitions(code) ON DELETE CASCADE,
    PRIMARY KEY (role_code, action_code)
);

-- Schritt 3: action_definitions seeden — alle 18 Action-Konstanten aus permissions.go (Pitfall 2: Accept muss enthalten sein)
-- ON CONFLICT DO UPDATE macht die Migration idempotent.
INSERT INTO action_definitions (code, label_de, category, sort_order) VALUES
    ('fansub_group.edit',                  'Gruppe bearbeiten',             'gruppe',   10),
    ('fansub_group.links.manage',          'Links verwalten',               'gruppe',   20),
    ('fansub_group.members.view',          'Mitglieder anzeigen',           'gruppe',   30),
    ('fansub_group.members.manage',        'Mitglieder verwalten',          'gruppe',   40),
    ('fansub_group.invitations.view',      'Einladungen anzeigen',          'gruppe',   50),
    ('fansub_group.invitations.create',    'Einladungen erstellen',         'gruppe',   60),
    ('fansub_group.invitations.cancel',    'Einladungen abbrechen',         'gruppe',   70),
    ('fansub_group.invitations.accept',    'Einladung annehmen',            'gruppe',   80),
    ('fansub_group.notes.write',           'Gruppennotizen schreiben',      'gruppe',   90),
    ('anime_fansub_project.notes.write',   'Projektnotizen schreiben',      'projekt',  10),
    ('release.view',                       'Release anzeigen',              'release',  10),
    ('release_version.view',               'Release-Version anzeigen',      'release',  20),
    ('release_version_media.view',         'Medien anzeigen',               'release',  30),
    ('release_version_media.upload',       'Medien hochladen',              'release',  40),
    ('release_version_media.update',       'Medien bearbeiten',             'release',  50),
    ('release_version_media.delete',       'Medien löschen',                'release',  60),
    ('release_version_media.delete_own',   'Eigene Medien löschen',         'release',  70),
    ('release_version.notes.write',        'Release-Notizen schreiben',     'release',  80)
ON CONFLICT (code) DO UPDATE SET
    label_de   = EXCLUDED.label_de,
    category   = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order;

-- Schritt 4: role_capabilities seeden — exakt aus roleMatrix (behavior-preserving, D-03)
-- platform_admin bekommt KEINEN Eintrag (globaler Bypass, kein roleMatrix-Eintrag, T-86-02).
-- fansub_group.invitations.accept hat KEINEN role_capabilities-Eintrag (Pitfall 2 aus Research).
-- ON CONFLICT DO NOTHING macht die Migration idempotent.
INSERT INTO role_capabilities (role_code, action_code) VALUES
    -- fansub_lead (16 Actions)
    ('fansub_lead', 'fansub_group.edit'),
    ('fansub_lead', 'fansub_group.links.manage'),
    ('fansub_lead', 'fansub_group.members.view'),
    ('fansub_lead', 'fansub_group.members.manage'),
    ('fansub_lead', 'fansub_group.invitations.view'),
    ('fansub_lead', 'fansub_group.invitations.create'),
    ('fansub_lead', 'fansub_group.invitations.cancel'),
    ('fansub_lead', 'fansub_group.notes.write'),
    ('fansub_lead', 'anime_fansub_project.notes.write'),
    ('fansub_lead', 'release.view'),
    ('fansub_lead', 'release_version.view'),
    ('fansub_lead', 'release_version_media.view'),
    ('fansub_lead', 'release_version_media.upload'),
    ('fansub_lead', 'release_version_media.update'),
    ('fansub_lead', 'release_version_media.delete'),
    ('fansub_lead', 'release_version.notes.write'),
    -- project_lead (13 Actions)
    ('project_lead', 'fansub_group.edit'),
    ('project_lead', 'fansub_group.links.manage'),
    ('project_lead', 'fansub_group.members.view'),
    ('project_lead', 'fansub_group.invitations.view'),
    ('project_lead', 'fansub_group.notes.write'),
    ('project_lead', 'anime_fansub_project.notes.write'),
    ('project_lead', 'release.view'),
    ('project_lead', 'release_version.view'),
    ('project_lead', 'release_version_media.view'),
    ('project_lead', 'release_version_media.upload'),
    ('project_lead', 'release_version_media.update'),
    ('project_lead', 'release_version_media.delete'),
    ('project_lead', 'release_version.notes.write'),
    -- designer (6 Actions)
    ('designer', 'release.view'),
    ('designer', 'release_version.view'),
    ('designer', 'release_version_media.view'),
    ('designer', 'release_version_media.upload'),
    ('designer', 'release_version_media.update'),
    ('designer', 'release_version_media.delete_own'),
    -- editor (5 Actions)
    ('editor', 'release.view'),
    ('editor', 'release_version.view'),
    ('editor', 'fansub_group.notes.write'),
    ('editor', 'anime_fansub_project.notes.write'),
    ('editor', 'release_version.notes.write'),
    -- translator (3 Actions)
    ('translator', 'release.view'),
    ('translator', 'release_version.view'),
    ('translator', 'release_version.notes.write'),
    -- timer (3 Actions)
    ('timer', 'release.view'),
    ('timer', 'release_version.view'),
    ('timer', 'release_version.notes.write'),
    -- typesetter (3 Actions)
    ('typesetter', 'release.view'),
    ('typesetter', 'release_version.view'),
    ('typesetter', 'release_version.notes.write'),
    -- encoder (7 Actions)
    ('encoder', 'release.view'),
    ('encoder', 'release_version.view'),
    ('encoder', 'release_version_media.view'),
    ('encoder', 'release_version_media.upload'),
    ('encoder', 'release_version_media.update'),
    ('encoder', 'release_version_media.delete_own'),
    ('encoder', 'release_version.notes.write'),
    -- raw_provider (2 Actions)
    ('raw_provider', 'release.view'),
    ('raw_provider', 'release_version.view'),
    -- quality_checker (4 Actions)
    ('quality_checker', 'release.view'),
    ('quality_checker', 'release_version.view'),
    ('quality_checker', 'release_version_media.view'),
    ('quality_checker', 'release_version.notes.write')
ON CONFLICT DO NOTHING;

COMMIT;

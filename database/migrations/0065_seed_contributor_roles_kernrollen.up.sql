-- Migration 0065: contributor_roles — Spalten hinzufügen und 11 Kernrollen seedden
-- Tabelle hatte bisher nur: id BIGSERIAL, name VARCHAR(80), created_at TIMESTAMPTZ

-- Spalten label und description hinzufügen falls nicht vorhanden
ALTER TABLE contributor_roles
    ADD COLUMN IF NOT EXISTS label VARCHAR(100) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

-- Test-Daten ersetzen: Tabelle leeren (CASCADE löscht auch release_member_roles, member_episode_notes)
TRUNCATE contributor_roles CASCADE;

-- 11 Kernrollen einfügen (lowercase name, korrektes Label, Hilfetext aus CONTEXT.md)
INSERT INTO contributor_roles (name, label, description) VALUES
    ('translator',     'Übersetzung',        'Schreibe kurz, was an der Übersetzung dieser Version besonders war: Dialogstil, Begriffe, Songtexte, Schilder...'),
    ('editor',         'Editing',            'Schreibe kurz, was du sprachlich verbessert hast: Lesbarkeit, Stil, Charakterstimmen...'),
    ('timer',          'Timing',             'Schreibe kurz, was am Timing besonders war: Dialog-Timing, Karaoke-Timing, Lesbarkeit...'),
    ('typesetter',     'Typesetting / FX',   'Schreibe kurz, was du visuell umgesetzt hast: Signs, Overlays, Fonts, Karaoke-FX...'),
    ('encoder',        'Encoding',           'Schreibe kurz, was an dieser technischen Ausgabe besonders war: 8bit/10bit, MP4/MKV...'),
    ('raw_provider',   'Raw-Bereitstellung', 'Schreibe kurz, was zur Quelle wichtig ist: Herkunft, Qualität, Probleme, bessere Quelle...'),
    ('quality_checker','Qualitätsprüfung',   'Schreibe kurz, worauf bei der Prüfung geachtet wurde: Übersetzung, Timing, Encoding...'),
    ('project_lead',   'Projektleitung',     'Schreibe kurz, warum diese Version veröffentlicht wurde: Koordination, Ziel, Re-Release...'),
    ('designer',       'Design',             'Schreibe kurz, welche visuellen Elemente du beigesteuert hast: Banner, Logos, Vorschaubilder...'),
    ('admin',          'Administration',     'Schreibe kurz, was organisatorisch wichtig war: Archivierung, Upload, Metadaten...'),
    ('other',          'Sonstiges',          'Nutze dieses Feld nur wenn der Beitrag nicht zu den Standardrollen passt.');

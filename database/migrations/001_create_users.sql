-- Migration: 001_create_users
-- Zweck: Basis-User-Tabelle fuer lokales Auth (ersetzt wcf4_user)
-- Nur Portal-relevante Felder, kein WCF/WoltLab

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_banned BOOLEAN NOT NULL DEFAULT false,
    ban_reason TEXT,

    -- Profile
    avatar_url VARCHAR(512),
    profile_description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,

    -- Legacy-Referenz fuer Migration
    legacy_wcf_user_id INTEGER
);

-- Rollen-System
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-Rollen-Zuordnung
CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by BIGINT REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Standard-Rollen aus Legacy-System (settings.php)
INSERT INTO roles (name, description) VALUES
    ('admin', 'Vollzugriff auf alle Funktionen'),
    ('moderator', 'Moderation von Kommentaren und Inhalten'),
    ('registered', 'Registrierter Benutzer'),
    ('anime_create', 'Kann Anime anlegen'),
    ('anime_modify', 'Kann Anime bearbeiten'),
    ('anime_delete', 'Kann Anime loeschen'),
    ('anime_status', 'Kann Anime-Status aendern'),
    ('stream_create', 'Kann Streams/Episoden anlegen'),
    ('stream_modify', 'Kann Streams/Episoden bearbeiten'),
    ('stream_delete', 'Kann Streams/Episoden loeschen'),
    ('stream_status', 'Kann Stream-Status aendern'),
    ('comment_modify', 'Kann Kommentare bearbeiten'),
    ('comment_delete', 'Kann Kommentare loeschen'),
    ('fansub_create', 'Kann Fansub-Projekte anlegen'),
    ('fansub_modify', 'Kann Fansub-Projekte bearbeiten'),
    ('fansub_delete', 'Kann Fansub-Projekte loeschen'),
    ('private', 'Zugriff auf private/lizenzierte Inhalte'),
    ('raw_proc', 'RAW-Bearbeitung'),
    ('translate_proc', 'Uebersetzung'),
    ('time_proc', 'Timing'),
    ('typeset_proc', 'Typesetting'),
    ('logo_proc', 'Logo'),
    ('edit_proc', 'Editing'),
    ('karatime_proc', 'Kara-Timing'),
    ('karafx_proc', 'Kara-FX'),
    ('qc_proc', 'Quality Check'),
    ('encode_proc', 'Encoding')
ON CONFLICT (name) DO NOTHING;

-- Indizes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_legacy_id ON users(legacy_wcf_user_id);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- Trigger fuer updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

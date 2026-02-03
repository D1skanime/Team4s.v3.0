-- Team4s v3.0 - Database Initialization
-- Dieses Script wird beim ersten Start von PostgreSQL ausgefuehrt

-- ============================================
-- 001: Users & Roles
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_banned BOOLEAN NOT NULL DEFAULT false,
    ban_reason TEXT,
    avatar_url VARCHAR(512),
    profile_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    legacy_wcf_user_id INTEGER
);

CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by BIGINT REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Standard-Rollen
INSERT INTO roles (name, description) VALUES
    ('admin', 'Vollzugriff auf alle Funktionen'),
    ('moderator', 'Moderation von Kommentaren und Inhalten'),
    ('registered', 'Registrierter Benutzer'),
    ('anime_create', 'Kann Anime anlegen'),
    ('anime_modify', 'Kann Anime bearbeiten'),
    ('anime_delete', 'Kann Anime loeschen'),
    ('stream_create', 'Kann Streams/Episoden anlegen'),
    ('stream_modify', 'Kann Streams/Episoden bearbeiten'),
    ('stream_delete', 'Kann Streams/Episoden loeschen'),
    ('comment_modify', 'Kann Kommentare bearbeiten'),
    ('comment_delete', 'Kann Kommentare loeschen'),
    ('private', 'Zugriff auf private/lizenzierte Inhalte')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 002: Anime
-- ============================================

DO $$ BEGIN
    CREATE TYPE anime_status AS ENUM ('disabled', 'ongoing', 'done', 'aborted', 'licensed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE anime_type AS ENUM ('tv', 'ova', 'film', 'bonus', 'special', 'ona', 'music');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('anime', 'hentai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS anime (
    id BIGSERIAL PRIMARY KEY,
    anisearch_id VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    type anime_type NOT NULL DEFAULT 'tv',
    content_type content_type NOT NULL DEFAULT 'anime',
    status anime_status NOT NULL DEFAULT 'disabled',
    year SMALLINT,
    max_episodes SMALLINT NOT NULL DEFAULT 0,
    genre VARCHAR(255),
    source VARCHAR(255),
    description TEXT,
    cover_image VARCHAR(255),
    folder_name VARCHAR(255),
    sub_comment VARCHAR(255),
    stream_comment VARCHAR(255),
    is_self_subbed BOOLEAN NOT NULL DEFAULT false,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    legacy_anime_id INTEGER
);

CREATE TABLE IF NOT EXISTS anime_relations (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    related_anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    relation_type VARCHAR(32) NOT NULL DEFAULT 'related',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_relation UNIQUE (anime_id, related_anime_id),
    CONSTRAINT no_self_relation CHECK (anime_id <> related_anime_id)
);

-- ============================================
-- 003: Episodes
-- ============================================

DO $$ BEGIN
    CREATE TYPE episode_status AS ENUM ('disabled', 'private', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS episodes (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    episode_number VARCHAR(6) NOT NULL,
    title VARCHAR(255),
    filename VARCHAR(255),
    stream_links TEXT[],
    status episode_status NOT NULL DEFAULT 'disabled',
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    raw_proc SMALLINT NOT NULL DEFAULT 0 CHECK (raw_proc >= 0 AND raw_proc <= 100),
    translate_proc SMALLINT NOT NULL DEFAULT 0 CHECK (translate_proc >= 0 AND translate_proc <= 100),
    time_proc SMALLINT NOT NULL DEFAULT 0 CHECK (time_proc >= 0 AND time_proc <= 100),
    typeset_proc SMALLINT NOT NULL DEFAULT 0 CHECK (typeset_proc >= 0 AND typeset_proc <= 100),
    logo_proc SMALLINT NOT NULL DEFAULT 0 CHECK (logo_proc >= 0 AND logo_proc <= 100),
    edit_proc SMALLINT NOT NULL DEFAULT 0 CHECK (edit_proc >= 0 AND edit_proc <= 100),
    karatime_proc SMALLINT NOT NULL DEFAULT 0 CHECK (karatime_proc >= 0 AND karatime_proc <= 100),
    karafx_proc SMALLINT NOT NULL DEFAULT 0 CHECK (karafx_proc >= 0 AND karafx_proc <= 100),
    qc_proc SMALLINT NOT NULL DEFAULT 0 CHECK (qc_proc >= 0 AND qc_proc <= 100),
    encode_proc SMALLINT NOT NULL DEFAULT 0 CHECK (encode_proc >= 0 AND encode_proc <= 100),
    raw_proc_by BIGINT REFERENCES users(id),
    translate_proc_by BIGINT REFERENCES users(id),
    time_proc_by BIGINT REFERENCES users(id),
    typeset_proc_by BIGINT REFERENCES users(id),
    logo_proc_by BIGINT REFERENCES users(id),
    edit_proc_by BIGINT REFERENCES users(id),
    karatime_proc_by BIGINT REFERENCES users(id),
    karafx_proc_by BIGINT REFERENCES users(id),
    qc_proc_by BIGINT REFERENCES users(id),
    encode_proc_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    legacy_episode_id INTEGER
);

-- ============================================
-- 004: Social (Comments, Ratings, Watchlist, Messages)
-- ============================================

CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_to_id BIGINT REFERENCES comments(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_by BIGINT REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    legacy_comment_id INTEGER
);

CREATE TABLE IF NOT EXISTS ratings (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 0 AND rating <= 10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_anime_rating UNIQUE (user_id, anime_id)
);

DO $$ BEGIN
    CREATE TYPE watchlist_status AS ENUM ('watching', 'done', 'break', 'planned', 'dropped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS watchlist (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status watchlist_status NOT NULL DEFAULT 'watching',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_anime_watchlist UNIQUE (user_id, anime_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    deleted_by_sender BOOLEAN NOT NULL DEFAULT false,
    deleted_by_recipient BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    legacy_message_id INTEGER
);

-- ============================================
-- 005: Fansub Workflow
-- ============================================

DO $$ BEGIN
    CREATE TYPE fansub_role AS ENUM (
        'raw', 'translate', 'time', 'typeset', 'logo',
        'edit', 'karatime', 'karafx', 'qc', 'encode'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS attendants (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anime_id BIGINT REFERENCES anime(id) ON DELETE CASCADE,
    episode_id BIGINT REFERENCES episodes(id) ON DELETE CASCADE,
    role fansub_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT attendant_has_target CHECK (
        anime_id IS NOT NULL OR episode_id IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS fansub_groups (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    logo_url VARCHAR(512),
    website_url VARCHAR(512),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anime_fansub_groups (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, group_id)
);

-- ============================================
-- Indizes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_legacy_id ON users(legacy_wcf_user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

CREATE INDEX IF NOT EXISTS idx_anime_title ON anime(title);
CREATE INDEX IF NOT EXISTS idx_anime_status ON anime(status);
CREATE INDEX IF NOT EXISTS idx_anime_type ON anime(type);
CREATE INDEX IF NOT EXISTS idx_anime_content_type ON anime(content_type);
CREATE INDEX IF NOT EXISTS idx_anime_year ON anime(year);
CREATE INDEX IF NOT EXISTS idx_anime_legacy_id ON anime(legacy_anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_relations_anime ON anime_relations(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_relations_related ON anime_relations(related_anime_id);

CREATE INDEX IF NOT EXISTS idx_episodes_anime ON episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
CREATE INDEX IF NOT EXISTS idx_episodes_number ON episodes(anime_id, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_legacy_id ON episodes(legacy_episode_id);

CREATE INDEX IF NOT EXISTS idx_comments_anime ON comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_reply ON comments(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ratings_anime ON ratings(anime_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime ON watchlist(anime_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist(user_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendants_user ON attendants(user_id);
CREATE INDEX IF NOT EXISTS idx_attendants_anime ON attendants(anime_id);
CREATE INDEX IF NOT EXISTS idx_attendants_episode ON attendants(episode_id);
CREATE INDEX IF NOT EXISTS idx_attendants_role ON attendants(role);
CREATE INDEX IF NOT EXISTS idx_anime_fansub_groups_anime ON anime_fansub_groups(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_fansub_groups_group ON anime_fansub_groups(group_id);

-- ============================================
-- Trigger fuer updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_anime_updated_at ON anime;
CREATE TRIGGER update_anime_updated_at
    BEFORE UPDATE ON anime FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_episodes_updated_at ON episodes;
CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
    BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_watchlist_updated_at ON watchlist;
CREATE TRIGGER update_watchlist_updated_at
    BEFORE UPDATE ON watchlist FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fansub_groups_updated_at ON fansub_groups;
CREATE TRIGGER update_fansub_groups_updated_at
    BEFORE UPDATE ON fansub_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Test-Daten
-- ============================================

-- Test-User (Passwort: "test123" als bcrypt-Hash)
INSERT INTO users (username, email, password_hash) VALUES
    ('admin', 'admin@team4s.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.Z6y6bqXOxP0RQKyqMO'),
    ('testuser', 'test@team4s.local', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.Z6y6bqXOxP0RQKyqMO')
ON CONFLICT (username) DO NOTHING;

-- Admin-Rolle zuweisen
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Registered-Rolle fuer testuser
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'testuser' AND r.name = 'registered'
ON CONFLICT DO NOTHING;

-- Test-Anime
INSERT INTO anime (title, type, content_type, status, year, max_episodes, genre, description) VALUES
    ('Attack on Titan', 'tv', 'anime', 'done', 2013, 25, 'Action, Drama, Fantasy', 'In einer Welt, in der die Menschheit in Staedten lebt, die von riesigen Mauern umgeben sind, um sich vor gigantischen menschenfressenden Titanen zu schuetzen.'),
    ('Death Note', 'tv', 'anime', 'done', 2006, 37, 'Mystery, Psychological, Thriller', 'Ein Schueler findet ein uebernatuerliches Notizbuch, mit dem er jeden toeten kann, dessen Namen er hineinschreibt.'),
    ('Steins;Gate', 'tv', 'anime', 'done', 2011, 24, 'Sci-Fi, Thriller', 'Ein selbsternannter verrueckter Wissenschaftler entdeckt eine Methode, Nachrichten in die Vergangenheit zu schicken.')
ON CONFLICT DO NOTHING;

-- Test-Episoden
INSERT INTO episodes (anime_id, episode_number, title, status, stream_links) VALUES
    (1, '1', 'To You, in 2000 Years', 'public', ARRAY['https://example.com/stream1']),
    (1, '2', 'That Day', 'public', ARRAY['https://example.com/stream2']),
    (2, '1', 'Rebirth', 'public', ARRAY['https://example.com/stream3']),
    (3, '1', 'Prolog', 'public', ARRAY['https://example.com/stream4'])
ON CONFLICT DO NOTHING;

-- ============================================
-- Fertig
-- ============================================

SELECT 'Database initialized successfully!' AS status;

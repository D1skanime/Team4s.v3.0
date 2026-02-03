-- Migration: 004_create_social
-- Zweck: Kommentare, Ratings, Watchlist, Nachrichten

-- Kommentare (ersetzt anmi1_comment)
CREATE TABLE IF NOT EXISTS comments (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Reply/Quote
    reply_to_id BIGINT REFERENCES comments(id) ON DELETE SET NULL,

    -- Inhalt
    message TEXT NOT NULL,

    -- Moderation
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_by BIGINT REFERENCES users(id),
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Legacy-Referenz
    legacy_comment_id INTEGER
);

-- Ratings (ersetzt anmi1_rating)
CREATE TABLE IF NOT EXISTS ratings (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Rating 0-10
    rating SMALLINT NOT NULL CHECK (rating >= 0 AND rating <= 10),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ein Rating pro User/Anime
    CONSTRAINT unique_user_anime_rating UNIQUE (user_id, anime_id)
);

-- Watchlist (ersetzt anmi1_watch)
CREATE TYPE watchlist_status AS ENUM ('watching', 'done', 'break', 'planned', 'dropped');

CREATE TABLE IF NOT EXISTS watchlist (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status
    status watchlist_status NOT NULL DEFAULT 'watching',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ein Eintrag pro User/Anime
    CONSTRAINT unique_user_anime_watchlist UNIQUE (user_id, anime_id)
);

-- Nachrichten/Empfehlungen (ersetzt anmi1_message)
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Inhalt
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,

    -- Status
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Loeschung (Soft-Delete pro Seite)
    deleted_by_sender BOOLEAN NOT NULL DEFAULT false,
    deleted_by_recipient BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Legacy-Referenz
    legacy_message_id INTEGER
);

-- Indizes
CREATE INDEX idx_comments_anime ON comments(anime_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_reply ON comments(reply_to_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

CREATE INDEX idx_ratings_anime ON ratings(anime_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);

CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_watchlist_anime ON watchlist(anime_id);
CREATE INDEX idx_watchlist_status ON watchlist(user_id, status);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, is_read);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Trigger fuer updated_at
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at
    BEFORE UPDATE ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_updated_at
    BEFORE UPDATE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

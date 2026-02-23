DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anime_type') THEN
        CREATE TYPE anime_type AS ENUM ('tv', 'film', 'ova', 'ona', 'special', 'bonus');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'anime_status') THEN
        CREATE TYPE anime_status AS ENUM ('disabled', 'ongoing', 'done', 'aborted', 'licensed');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
        CREATE TYPE content_type AS ENUM ('anime', 'hentai');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS anime (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    type anime_type NOT NULL DEFAULT 'tv',
    content_type content_type NOT NULL DEFAULT 'anime',
    status anime_status NOT NULL DEFAULT 'disabled',
    year SMALLINT,
    max_episodes SMALLINT,
    cover_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anime_title ON anime (title);
CREATE INDEX IF NOT EXISTS idx_anime_status ON anime (status);
CREATE INDEX IF NOT EXISTS idx_anime_content_type ON anime (content_type);

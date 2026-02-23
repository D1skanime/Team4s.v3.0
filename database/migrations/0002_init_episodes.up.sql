DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'episode_status') THEN
        CREATE TYPE episode_status AS ENUM ('disabled', 'private', 'public');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS episodes (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    episode_number TEXT NOT NULL,
    title TEXT,
    status episode_status NOT NULL DEFAULT 'private',
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON episodes (anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_anime_id_id ON episodes (anime_id, id);

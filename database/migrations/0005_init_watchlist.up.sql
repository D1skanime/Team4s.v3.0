CREATE TABLE IF NOT EXISTS watchlist_entries (
    id BIGSERIAL PRIMARY KEY,
    user_name VARCHAR(80) NOT NULL,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_name, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_created_at
    ON watchlist_entries (user_name, created_at DESC, id DESC);

ALTER TABLE watchlist_entries
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

ALTER TABLE watchlist_entries
    DROP CONSTRAINT IF EXISTS watchlist_entries_user_name_anime_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_watchlist_entries_user_id_anime_id
    ON watchlist_entries (user_id, anime_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id_created_at
    ON watchlist_entries (user_id, created_at DESC, id DESC);

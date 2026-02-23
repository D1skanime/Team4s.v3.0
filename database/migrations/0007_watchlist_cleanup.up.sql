DELETE FROM watchlist_entries
WHERE user_id IS NULL;

DROP INDEX IF EXISTS idx_watchlist_user_created_at;

ALTER TABLE watchlist_entries
    DROP CONSTRAINT IF EXISTS watchlist_entries_user_name_anime_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_watchlist_entries_user_id_anime_id
    ON watchlist_entries (user_id, anime_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id_created_at
    ON watchlist_entries (user_id, created_at DESC, id DESC);

ALTER TABLE watchlist_entries
    ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE watchlist_entries
    DROP COLUMN IF EXISTS user_name;

DROP INDEX IF EXISTS idx_watchlist_user_id_created_at;
DROP INDEX IF EXISTS uq_watchlist_entries_user_id_anime_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'watchlist_entries_user_name_anime_id_key'
    ) THEN
        ALTER TABLE watchlist_entries
            ADD CONSTRAINT watchlist_entries_user_name_anime_id_key UNIQUE (user_name, anime_id);
    END IF;
END $$;

ALTER TABLE watchlist_entries
    DROP COLUMN IF EXISTS user_id;

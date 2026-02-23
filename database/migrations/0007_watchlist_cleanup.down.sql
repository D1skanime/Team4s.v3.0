ALTER TABLE watchlist_entries
    ADD COLUMN IF NOT EXISTS user_name VARCHAR(80);

UPDATE watchlist_entries
SET user_name = 'uid-' || user_id::text
WHERE user_name IS NULL
   OR btrim(user_name) = '';

ALTER TABLE watchlist_entries
    ALTER COLUMN user_name SET NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_watchlist_user_created_at
    ON watchlist_entries (user_name, created_at DESC, id DESC);

ALTER TABLE watchlist_entries
    ALTER COLUMN user_id DROP NOT NULL;

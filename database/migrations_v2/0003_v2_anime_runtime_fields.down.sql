ALTER TABLE anime
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS max_episodes,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS content_type;

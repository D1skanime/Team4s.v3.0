DROP INDEX IF EXISTS idx_episodes_legacy_episode_id;

ALTER TABLE episodes
    DROP COLUMN IF EXISTS legacy_episode_id,
    DROP COLUMN IF EXISTS encode_proc,
    DROP COLUMN IF EXISTS qc_proc,
    DROP COLUMN IF EXISTS karafx_proc,
    DROP COLUMN IF EXISTS karatime_proc,
    DROP COLUMN IF EXISTS edit_proc,
    DROP COLUMN IF EXISTS logo_proc,
    DROP COLUMN IF EXISTS typeset_proc,
    DROP COLUMN IF EXISTS time_proc,
    DROP COLUMN IF EXISTS translate_proc,
    DROP COLUMN IF EXISTS raw_proc,
    DROP COLUMN IF EXISTS stream_links_legacy,
    DROP COLUMN IF EXISTS stream_links,
    DROP COLUMN IF EXISTS filename;

DROP INDEX IF EXISTS idx_anime_anisearch_id;
DROP INDEX IF EXISTS idx_anime_legacy_anime_id;

ALTER TABLE anime
    DROP COLUMN IF EXISTS legacy_anime_id,
    DROP COLUMN IF EXISTS anisearch_id,
    DROP COLUMN IF EXISTS folder_name,
    DROP COLUMN IF EXISTS is_self_subbed,
    DROP COLUMN IF EXISTS stream_comment,
    DROP COLUMN IF EXISTS sub_comment,
    DROP COLUMN IF EXISTS source;


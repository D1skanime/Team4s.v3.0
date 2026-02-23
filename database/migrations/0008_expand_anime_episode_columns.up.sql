-- Keep schema aligned with the columns used by runtime code (admin, episodes, legacy mapping).

ALTER TABLE anime
    ADD COLUMN IF NOT EXISTS source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sub_comment TEXT,
    ADD COLUMN IF NOT EXISTS stream_comment TEXT,
    ADD COLUMN IF NOT EXISTS is_self_subbed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS anisearch_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS legacy_anime_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_anime_legacy_anime_id ON anime (legacy_anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_anisearch_id ON anime (anisearch_id);

ALTER TABLE episodes
    ADD COLUMN IF NOT EXISTS filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stream_links TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS stream_links_legacy TEXT,
    ADD COLUMN IF NOT EXISTS raw_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS translate_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS time_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS typeset_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS logo_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS edit_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS karatime_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS karafx_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qc_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS encode_proc SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS legacy_episode_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_episodes_legacy_episode_id ON episodes (legacy_episode_id);


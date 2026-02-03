-- Migration: 003_create_episodes
-- Zweck: Episoden/Streams (ersetzt anmi1_episode)

CREATE TYPE episode_status AS ENUM ('disabled', 'private', 'public');

CREATE TABLE IF NOT EXISTS episodes (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,

    -- Basis-Daten
    episode_number VARCHAR(6) NOT NULL,
    title VARCHAR(255),
    filename VARCHAR(255),

    -- Stream-Links (Array fuer mehrere Links)
    stream_links TEXT[],

    -- Status
    status episode_status NOT NULL DEFAULT 'disabled',

    -- Statistiken
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,

    -- Fansub-Prozess-Status (0-100%)
    raw_proc SMALLINT NOT NULL DEFAULT 0 CHECK (raw_proc >= 0 AND raw_proc <= 100),
    translate_proc SMALLINT NOT NULL DEFAULT 0 CHECK (translate_proc >= 0 AND translate_proc <= 100),
    time_proc SMALLINT NOT NULL DEFAULT 0 CHECK (time_proc >= 0 AND time_proc <= 100),
    typeset_proc SMALLINT NOT NULL DEFAULT 0 CHECK (typeset_proc >= 0 AND typeset_proc <= 100),
    logo_proc SMALLINT NOT NULL DEFAULT 0 CHECK (logo_proc >= 0 AND logo_proc <= 100),
    edit_proc SMALLINT NOT NULL DEFAULT 0 CHECK (edit_proc >= 0 AND edit_proc <= 100),
    karatime_proc SMALLINT NOT NULL DEFAULT 0 CHECK (karatime_proc >= 0 AND karatime_proc <= 100),
    karafx_proc SMALLINT NOT NULL DEFAULT 0 CHECK (karafx_proc >= 0 AND karafx_proc <= 100),
    qc_proc SMALLINT NOT NULL DEFAULT 0 CHECK (qc_proc >= 0 AND qc_proc <= 100),
    encode_proc SMALLINT NOT NULL DEFAULT 0 CHECK (encode_proc >= 0 AND encode_proc <= 100),

    -- Letzte Bearbeiter pro Prozess
    raw_proc_by BIGINT REFERENCES users(id),
    translate_proc_by BIGINT REFERENCES users(id),
    time_proc_by BIGINT REFERENCES users(id),
    typeset_proc_by BIGINT REFERENCES users(id),
    logo_proc_by BIGINT REFERENCES users(id),
    edit_proc_by BIGINT REFERENCES users(id),
    karatime_proc_by BIGINT REFERENCES users(id),
    karafx_proc_by BIGINT REFERENCES users(id),
    qc_proc_by BIGINT REFERENCES users(id),
    encode_proc_by BIGINT REFERENCES users(id),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Legacy-Referenz
    legacy_episode_id INTEGER
);

-- Indizes
CREATE INDEX idx_episodes_anime ON episodes(anime_id);
CREATE INDEX idx_episodes_status ON episodes(status);
CREATE INDEX idx_episodes_number ON episodes(anime_id, episode_number);
CREATE INDEX idx_episodes_legacy_id ON episodes(legacy_episode_id);

-- Trigger fuer updated_at
CREATE TRIGGER update_episodes_updated_at
    BEFORE UPDATE ON episodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

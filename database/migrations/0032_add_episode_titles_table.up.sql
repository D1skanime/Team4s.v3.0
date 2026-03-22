-- Migration 0032: Add episode_titles table (Phase B)
-- Enables multilingual episode titles similar to anime_titles

CREATE TABLE episode_titles (
    id BIGSERIAL PRIMARY KEY,
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_episode_title_lang UNIQUE (episode_id, language_id)
);

CREATE INDEX idx_episode_titles_episode ON episode_titles(episode_id);
CREATE INDEX idx_episode_titles_language ON episode_titles(language_id);

COMMENT ON TABLE episode_titles IS 'Multilingual episode titles';

-- Backfill existing German titles from episodes.title
-- language_id 3 = German (de)
INSERT INTO episode_titles (episode_id, language_id, title)
SELECT id, 3, title
FROM episodes
WHERE title IS NOT NULL AND title != ''
ON CONFLICT (episode_id, language_id) DO NOTHING;

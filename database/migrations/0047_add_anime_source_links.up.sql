CREATE TABLE IF NOT EXISTS anime_source_links (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (anime_id, source),
    CONSTRAINT uq_anime_source_links_source UNIQUE (source)
);

CREATE INDEX IF NOT EXISTS idx_anime_source_links_anime_id
    ON anime_source_links (anime_id);

INSERT INTO anime_source_links (anime_id, source)
SELECT anime.id, anime.source
FROM anime
WHERE anime.source IS NOT NULL
  AND btrim(anime.source) <> ''
ON CONFLICT (anime_id, source) DO NOTHING;

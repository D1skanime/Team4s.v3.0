CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS languages (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS title_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS anime_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS genres (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS relation_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS media_types (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS anime (
    id BIGSERIAL PRIMARY KEY,
    anime_type_id BIGINT REFERENCES anime_types(id),
    anisearch_id BIGINT UNIQUE,
    year SMALLINT,
    description TEXT,
    folder_name TEXT,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_by BIGINT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_anime_slug ON anime(slug);

CREATE TABLE IF NOT EXISTS anime_titles (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    title TEXT NOT NULL,
    title_type_id BIGINT NOT NULL REFERENCES title_types(id),
    UNIQUE (anime_id, language_id, title_type_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_title_anime ON anime_titles(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_title_language ON anime_titles(language_id);

CREATE TABLE IF NOT EXISTS anime_genres (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    genre_id BIGINT NOT NULL REFERENCES genres(id),
    PRIMARY KEY (anime_id, genre_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_genre_anime ON anime_genres(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_genre_genre ON anime_genres(genre_id);

CREATE TABLE IF NOT EXISTS anime_relations (
    source_anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    target_anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    relation_type_id BIGINT NOT NULL REFERENCES relation_types(id),
    PRIMARY KEY (source_anime_id, target_anime_id, relation_type_id),
    CONSTRAINT chk_no_self_relation CHECK (source_anime_id <> target_anime_id)
);

CREATE INDEX IF NOT EXISTS idx_target_anime ON anime_relations(target_anime_id);
CREATE INDEX IF NOT EXISTS idx_relation_type ON anime_relations(relation_type_id);

CREATE TABLE IF NOT EXISTS media_assets (
    id BIGSERIAL PRIMARY KEY,
    media_type_id BIGINT NOT NULL REFERENCES media_types(id),
    file_path TEXT NOT NULL,
    caption TEXT,
    mime_type TEXT NOT NULL,
    format TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_by BIGINT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_media_asset_type ON media_assets(media_type_id);

CREATE TABLE IF NOT EXISTS media_external (
    id BIGSERIAL PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    external_id TEXT NOT NULL,
    external_type TEXT NOT NULL,
    metadata JSONB,
    UNIQUE (provider, external_id, external_type)
);

CREATE INDEX IF NOT EXISTS idx_media_external_media ON media_external(media_id);
CREATE INDEX IF NOT EXISTS idx_media_external_provider ON media_external(provider);
CREATE INDEX IF NOT EXISTS idx_media_external_external ON media_external(external_id);

CREATE TABLE IF NOT EXISTS media_files (
    id BIGSERIAL PRIMARY KEY,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,
    storage_id TEXT NOT NULL,
    path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    size BIGINT
);

CREATE INDEX IF NOT EXISTS idx_media_file_media ON media_files(media_id);
CREATE INDEX IF NOT EXISTS idx_media_file_storage ON media_files(storage_id);

CREATE TABLE IF NOT EXISTS anime_media (
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (anime_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_media_anime ON anime_media(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_media_media ON anime_media(media_id);

-- Parent anchors for later slices. These tables intentionally only establish IDs
-- so the requested media link tables can exist in the fresh v2 bootstrap now.
CREATE TABLE IF NOT EXISTS episodes (
    id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS fansub_groups (
    id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS fansub_releases (
    id BIGSERIAL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS episode_media (
    episode_id BIGINT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (episode_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_episode_media_episode ON episode_media(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_media_media ON episode_media(media_id);

CREATE TABLE IF NOT EXISTS fansub_group_media (
    group_id BIGINT NOT NULL REFERENCES fansub_groups(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_fansub_group_media_group ON fansub_group_media(group_id);
CREATE INDEX IF NOT EXISTS idx_fansub_group_media_media ON fansub_group_media(media_id);

CREATE TABLE IF NOT EXISTS release_media (
    release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE,
    media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (release_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_release_media_release ON release_media(release_id);
CREATE INDEX IF NOT EXISTS idx_release_media_media ON release_media(media_id);

INSERT INTO languages (code)
VALUES
    ('de'),
    ('en'),
    ('ja'),
    ('romaji')
ON CONFLICT (code) DO NOTHING;

INSERT INTO title_types (name)
VALUES
    ('main'),
    ('official'),
    ('short'),
    ('synonym'),
    ('romaji'),
    ('japanese')
ON CONFLICT (name) DO NOTHING;

INSERT INTO anime_types (name)
VALUES
    ('TV'),
    ('OVA'),
    ('ONA'),
    ('Movie'),
    ('Special'),
    ('Bonus'),
    ('Web')
ON CONFLICT (name) DO NOTHING;

INSERT INTO media_types (name)
VALUES
    ('poster'),
    ('banner'),
    ('background'),
    ('logo'),
    ('preview'),
    ('screenshot'),
    ('avatar'),
    ('thumbnail'),
    ('karaoke_background'),
    ('video')
ON CONFLICT (name) DO NOTHING;

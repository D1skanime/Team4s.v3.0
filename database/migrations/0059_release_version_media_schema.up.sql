-- Migration 0059: Release-Version-Media schema foundation
-- Neue Tabelle release_version_media + status-Spalten in media_assets/media_files

-- 1. Neue Tabelle: release_version_media
CREATE TABLE release_version_media (
    id                   BIGSERIAL PRIMARY KEY,
    release_version_id   BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    media_asset_id       BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
    category             VARCHAR(30) NOT NULL,
    caption              TEXT NULL,
    sort_order           INT NOT NULL DEFAULT 0,
    is_preview_candidate BOOLEAN NOT NULL DEFAULT false,
    uploaded_by_user_id  BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ,
    deleted_at           TIMESTAMPTZ NULL,
    deleted_by_user_id   BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT chk_rvm_category
        CHECK (category IN ('screenshot', 'typesetting_karaoke', 'fun_outtake', 'other')),
    CONSTRAINT chk_rvm_preview_category
        CHECK (is_preview_candidate = false OR category IN ('screenshot', 'typesetting_karaoke'))
);

-- Indexe fuer release_version_media
CREATE INDEX idx_rvm_release_version ON release_version_media(release_version_id);
CREATE INDEX idx_rvm_media_asset     ON release_version_media(media_asset_id);
CREATE INDEX idx_rvm_category        ON release_version_media(category);
CREATE INDEX idx_rvm_public          ON release_version_media(release_version_id, category)
    WHERE deleted_at IS NULL;

-- 2. status-Spalte in media_assets
ALTER TABLE media_assets
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready';

ALTER TABLE media_assets
    ADD CONSTRAINT chk_media_assets_status
        CHECK (status IN ('processing', 'ready', 'failed', 'deleted'));

CREATE INDEX idx_media_assets_status ON media_assets(status);

-- 3. status-Spalte in media_files
ALTER TABLE media_files
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready';

ALTER TABLE media_files
    ADD CONSTRAINT chk_media_files_status
        CHECK (status IN ('processing', 'ready', 'failed', 'missing', 'deleted'));

CREATE INDEX idx_media_files_status ON media_files(status);

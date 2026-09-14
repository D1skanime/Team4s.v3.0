-- Title describes this release-version media relation, independently of its caption.
ALTER TABLE release_version_media
    ADD COLUMN title TEXT NULL,
    ADD CONSTRAINT release_version_media_title_length CHECK (title IS NULL OR char_length(title) <= 200);

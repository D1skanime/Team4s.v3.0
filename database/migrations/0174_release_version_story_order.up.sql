-- Migration 0174: canonical mixed release-version story order.
-- This is an order projection only. Media and Kara retain their existing ownership.

ALTER TABLE release_version_media
    ADD CONSTRAINT uq_release_version_media_id_version UNIQUE (id, release_version_id);

CREATE TABLE release_version_story_order (
    release_version_id       BIGINT NOT NULL REFERENCES release_versions(id) ON DELETE CASCADE,
    item_type                VARCHAR(10) NOT NULL,
    release_version_media_id BIGINT NULL,
    theme_segment_id         BIGINT NULL,
    sort_order               INT NOT NULL,
    CONSTRAINT pk_release_version_story_order
        PRIMARY KEY (release_version_id, item_type, sort_order),
    CONSTRAINT uq_release_version_story_order_position
        UNIQUE (release_version_id, sort_order),
    CONSTRAINT chk_release_version_story_order_type
        CHECK (item_type IN ('media', 'kara')),
    CONSTRAINT chk_release_version_story_order_target
        CHECK (
            (item_type = 'media' AND release_version_media_id IS NOT NULL AND theme_segment_id IS NULL)
            OR (item_type = 'kara' AND release_version_media_id IS NULL AND theme_segment_id IS NOT NULL)
        ),
    CONSTRAINT chk_release_version_story_order_nonnegative
        CHECK (sort_order >= 0),
    CONSTRAINT fk_story_order_media_same_version
        FOREIGN KEY (release_version_media_id, release_version_id)
        REFERENCES release_version_media (id, release_version_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_story_order_kara_same_version
        FOREIGN KEY (theme_segment_id, release_version_id)
        REFERENCES theme_segment_assignments (theme_segment_id, release_version_id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_release_version_story_order_media
    ON release_version_story_order (release_version_id, release_version_media_id)
    WHERE item_type = 'media';

CREATE UNIQUE INDEX uq_release_version_story_order_kara
    ON release_version_story_order (release_version_id, theme_segment_id)
    WHERE item_type = 'kara';

INSERT INTO release_version_story_order (release_version_id, item_type, release_version_media_id, sort_order)
SELECT rvm.release_version_id, 'media', rvm.id,
       ROW_NUMBER() OVER (PARTITION BY rvm.release_version_id ORDER BY rvm.sort_order, rvm.id) * 10
FROM release_version_media rvm
WHERE rvm.deleted_at IS NULL;

INSERT INTO release_version_story_order (release_version_id, item_type, theme_segment_id, sort_order)
SELECT tsa.release_version_id, 'kara', tsa.theme_segment_id,
       (COALESCE(media.max_order, 0) + ROW_NUMBER() OVER (
           PARTITION BY tsa.release_version_id ORDER BY ts.start_time NULLS LAST, tsa.theme_segment_id
       )) * 10
FROM theme_segment_assignments tsa
JOIN theme_segments ts ON ts.id = tsa.theme_segment_id
LEFT JOIN (
    SELECT release_version_id, MAX(sort_order) / 10 AS max_order
    FROM release_version_media
    WHERE deleted_at IS NULL
    GROUP BY release_version_id
) media ON media.release_version_id = tsa.release_version_id;

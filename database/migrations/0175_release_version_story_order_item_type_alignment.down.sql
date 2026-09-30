-- Revert the Phase 171 story-order discriminator alignment.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'release_version_story_order'
          AND column_name = 'item_type'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'release_version_story_order'
          AND column_name = 'item_kind'
    ) THEN
        ALTER TABLE release_version_story_order RENAME COLUMN item_type TO item_kind;
    END IF;
END
$$;

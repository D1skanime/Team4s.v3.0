-- Migration 0175: align the persisted story-order discriminator with the canonical contract.
-- The disposable runtime database may have received the earlier item_kind variant
-- before Phase 171 was finalized. No media or segment rows are changed.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'release_version_story_order'
          AND column_name = 'item_kind'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'release_version_story_order'
          AND column_name = 'item_type'
    ) THEN
        ALTER TABLE release_version_story_order RENAME COLUMN item_kind TO item_type;
    END IF;
END
$$;
